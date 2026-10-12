import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const RATE_MAX_FAILURES = 3;
const RATE_WINDOW_SECONDS = 900;
const requestSchema = z.object({ code: z.string().trim().toUpperCase().min(10).max(32).regex(/^[A-Z0-9-]+$/) });
function json(body: unknown, status = 200, retryAfter?: number) { const headers = { ...corsHeaders, "Content-Type": "application/json" } as Record<string, string>; if (retryAfter) headers["Retry-After"] = String(retryAfter); return new Response(JSON.stringify(body), { status, headers }); }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function requestIp(req: Request) { return req.headers.get("cf-connecting-ip") ?? "unknown"; }

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL"); const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "function_misconfigured" }, 500);
    const authHeader = req.headers.get("Authorization"); if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing_authentication" }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.slice("Bearer ".length));
    if (userError || !userData.user) return json({ error: "invalid_authentication" }, 401);
    if (!userData.user.is_anonymous) return json({ error: "student_session_required" }, 403);
    const sessionKey = await sha256(`session:${userData.user.id}`);
    const ipKey = await sha256(`ip:${requestIp(req)}`);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    const normalizedCode = parsed.success ? parsed.data.code.replaceAll("-", "") : "";
    const codeHash = normalizedCode.length >= 10 ? await sha256(normalizedCode) : null;
    const { data: result, error } = await admin.rpc("redeem_access_code_rate_limited", {
      p_code_hash: codeHash, p_auth_user_id: userData.user.id, p_session_key_hash: sessionKey, p_ip_key_hash: ipKey,
      p_max_failures: RATE_MAX_FAILURES, p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (error) { console.error("[redeem-student-access-code] atomic_rpc_failed", { code: error.code }); return json({ error: "redemption_unavailable" }, 503); }
    const row = Array.isArray(result) ? result[0] : result;
    if (row?.status === "too_many_attempts") return json({ error: row.status }, 429, Number(row.retry_after_seconds ?? 900));
    if (row?.status !== "ok") return json({ error: row?.status ?? "redemption_failed" }, row?.status === "redemption_failed" ? 500 : 400);
    return json({ scholar: { id: row.scholar_id, pseudonym: row.pseudonym, programId: row.program_id, cohortId: row.cohort_id } });
  } catch (error) {
    console.error("[redeem-student-access-code] unhandled", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "redemption_failed" }, 500);
  }
});
