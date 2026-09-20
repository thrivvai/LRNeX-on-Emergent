import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const requestSchema = z.object({ attemptId: z.string().uuid() });
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
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
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_attempt_id" }, 400);

  const { data: attempt, error: attemptError } = await admin.from("assessment_attempts").select("id, program_id, cohort_id, scholar_id, assessment_id, status").eq("id", parsed.data.attemptId).maybeSingle();
  if (attemptError || !attempt) return json({ error: "attempt_not_found" }, 404);
  const { data: scholar } = await admin.from("scholars").select("auth_user_id").eq("id", attempt.scholar_id).maybeSingle();
  const { data: membership } = await admin.from("program_memberships").select("role").eq("program_id", attempt.program_id).eq("user_id", userData.user.id).eq("status", "active").maybeSingle();
  const isOwner = scholar?.auth_user_id === userData.user.id;
  const isStaff = Boolean(membership && ["admin", "instructor", "researcher"].includes(membership.role));
  if (!isOwner && !isStaff) return json({ error: "not_authorized" }, 403);

  const { data: responses } = await admin.from("assessment_responses").select("item_id, response_value, revision_number, is_final").eq("attempt_id", attempt.id).order("revision_number", { ascending: false });
  const latest = new Map<string, { response_value: unknown; is_final: boolean }>();
  for (const response of responses ?? []) if (!latest.has(response.item_id)) latest.set(response.item_id, response);
  const itemIds = [...latest.keys()];
  const { data: keys } = await admin.from("assessment_answer_keys").select("item_id, answer_key").in("item_id", itemIds.length ? itemIds : ["00000000-0000-4000-8000-000000000000"]);
  const keyMap = new Map((keys ?? []).map((key) => [key.item_id, key.answer_key?.correct]));
  const { data: accommodations } = await admin.from("accommodation_profiles").select("code, score_policy, settings").eq("scholar_id", attempt.scholar_id).eq("active", true);
  const abstainer = (accommodations ?? []).find((profile) => profile.score_policy === "abstain");

  let score: number | null = null;
  let band = "insufficient_data";
  let abstained = false;
  let abstentionReason: string | null = null;
  if (abstainer) {
    band = "abstained";
    abstained = true;
    abstentionReason = `accommodation:${abstainer.code}`;
  } else if (keyMap.size > 0) {
    const correct = [...keyMap.entries()].filter(([itemId, expected]) => latest.get(itemId)?.response_value === expected).length;
    score = Math.round((correct / keyMap.size) * 100);
    band = score >= 80 ? "secure" : score >= 50 ? "building" : "emerging";
  } else {
    abstained = true;
    abstentionReason = "insufficient_answer_key_context";
  }

  const { error: updateError } = await admin.from("assessment_attempts").update({ status: "submitted", score, score_status: abstained ? "abstained" : "scored", submitted_at_server: new Date().toISOString(), result_metadata: { accommodationPolicies: accommodations ?? [], scoredItemCount: keyMap.size } }).eq("id", attempt.id);
  if (updateError) return json({ error: "score_write_failed" }, 500);
  const { data: result, error: resultError } = await admin.from("confidence_results").insert({ program_id: attempt.program_id, cohort_id: attempt.cohort_id, scholar_id: attempt.scholar_id, result_type: "confidence_band", band, score, abstained, abstention_reason: abstentionReason, derivation_version: "behavior-band-0", signal_snapshot: { responseCount: latest.size, scoredItemCount: keyMap.size, accommodationPolicies: accommodations ?? [] } }).select("id, band, score, abstained, abstention_reason").single();
  if (resultError) return json({ error: "result_write_failed" }, 500);
  return json({ result });
});
