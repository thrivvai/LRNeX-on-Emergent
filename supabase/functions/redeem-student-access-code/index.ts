import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const requestSchema = z.object({ code: z.string().trim().toUpperCase().min(6).max(24).regex(/^[A-Z0-9-]+$/) });
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "invalid_code_format" }, 400);
    const codeHash = await sha256(parsed.data.code.replaceAll("-", ""));
    const { data, error } = await admin.rpc("redeem_access_code", { p_code_hash: codeHash, p_auth_user_id: userData.user.id });
    if (error) {
      console.error("[redeem-student-access-code] rpc_failed", { code: error.code, message: error.message });
      const safeErrors = new Set(["invalid_or_expired_code", "code_already_bound", "scholar_not_found"]);
      const safeCode = safeErrors.has(error.message) ? error.message : "redemption_failed";
      return json({ error: safeCode }, safeCode === "redemption_failed" ? 500 : 400);
    }
    const enrollment = Array.isArray(data) ? data[0] : data;
    if (!enrollment?.scholar_id || !enrollment?.program_id || !enrollment?.cohort_id) {
      console.error("[redeem-student-access-code] empty_rpc_result", { dataShape: Array.isArray(data) ? "array" : typeof data });
      return json({ error: "redemption_failed" }, 500);
    }
    return json({ scholar: { id: enrollment.scholar_id, pseudonym: enrollment.pseudonym, programId: enrollment.program_id, cohortId: enrollment.cohort_id } });
  } catch (error) {
    console.error("[redeem-student-access-code] unhandled", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "redemption_failed" }, 500);
  }
});
