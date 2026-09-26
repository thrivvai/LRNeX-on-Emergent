import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const RATE_MAX_FAILURES = 3;
const RATE_WINDOW_SECONDS = 900;
const requestSchema = z.object({ code: z.string().trim().toUpperCase().min(10).max(32).regex(/^[A-Z0-9-]+$/) });

function json(body: unknown, status = 200, retryAfter?: number) {
  const headers = { ...corsHeaders, "Content-Type": "application/json" } as Record<string, string>;
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "function_misconfigured" }, 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing_authentication" }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.slice("Bearer ".length));
    if (userError || !userData.user) return json({ error: "invalid_authentication" }, 401);
    if (!userData.user.is_anonymous) return json({ error: "student_session_required" }, 403);

    const sessionKey = await sha256(`session:${userData.user.id}`);
    const ipKey = await sha256(`ip:${requestIp(req)}`);
    const { data: rateStatus, error: rateError } = await admin.rpc("rate_limit_status", {
      p_session_key_hash: sessionKey,
      p_ip_key_hash: ipKey,
      p_max_failures: RATE_MAX_FAILURES,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (rateError) {
      console.error("[redeem-student-access-code] rate_status_failed", { code: rateError.code });
      return json({ error: "redemption_unavailable" }, 503);
    }
    const status = Array.isArray(rateStatus) ? rateStatus[0] : rateStatus;
    if (status && status.allowed === false) return json({ error: "too_many_attempts" }, 429, status.retry_after_seconds);

    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      await admin.rpc("record_rate_limit_failure", { p_session_key_hash: sessionKey, p_ip_key_hash: ipKey, p_max_failures: RATE_MAX_FAILURES, p_window_seconds: RATE_WINDOW_SECONDS });
      return json({ error: "invalid_code_format" }, 400);
    }
    const codeHash = await sha256(parsed.data.code.replaceAll("-", ""));
    const { data, error } = await admin.rpc("redeem_access_code", { p_code_hash: codeHash, p_auth_user_id: userData.user.id });
    if (error) {
      const safeErrors = new Set(["invalid_or_expired_code", "code_already_bound", "scholar_not_found"]);
      const safeCode = safeErrors.has(error.message) ? error.message : "redemption_failed";
      if (safeCode !== "redemption_failed") {
        await admin.rpc("record_rate_limit_failure", { p_session_key_hash: sessionKey, p_ip_key_hash: ipKey, p_max_failures: RATE_MAX_FAILURES, p_window_seconds: RATE_WINDOW_SECONDS });
      }
      console.error("[redeem-student-access-code] rpc_failed", { code: error.code, safeCode });
      return json({ error: safeCode }, safeCode === "redemption_failed" ? 500 : 400);
    }
    const enrollment = Array.isArray(data) ? data[0] : data;
    if (!enrollment?.scholar_id || !enrollment?.program_id || !enrollment?.cohort_id) {
      console.error("[redeem-student-access-code] empty_rpc_result");
      return json({ error: "redemption_failed" }, 500);
    }
    return json({ scholar: { id: enrollment.scholar_id, pseudonym: enrollment.pseudonym, programId: enrollment.program_id, cohortId: enrollment.cohort_id } });
  } catch (error) {
    console.error("[redeem-student-access-code] unhandled", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "redemption_failed" }, 500);
  }
});
