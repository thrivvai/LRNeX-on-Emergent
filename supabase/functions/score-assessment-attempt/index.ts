import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const requestSchema = z.object({ attemptId: z.string().uuid() });
const configSchema = z.object({
  version: z.string().min(1),
  score_scale_max: z.coerce.number().positive(),
  thresholds: z.object({ building: z.coerce.number(), secure: z.coerce.number() }),
  bands: z.object({ emerging: z.string(), building: z.string(), secure: z.string(), insufficient: z.string(), abstained: z.string() }),
  minimum_scored_items: z.coerce.number().int().positive(),
});

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value.trim());
  if (Array.isArray(value)) return `[${value.map(canonical).sort().join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return "undefined";
}
function sameAnswer(actual: unknown, expected: unknown, itemType?: string) {
  if (itemType === "numeric" && (typeof actual === "number" || typeof actual === "string") && (typeof expected === "number" || typeof expected === "string")) {
    const a = Number(actual); const e = Number(expected);
    return Number.isFinite(a) && Number.isFinite(e) && a === e;
  }
  return canonical(actual) === canonical(expected);
}
function bandForScore(score: number | null, config: z.infer<typeof configSchema>) {
  if (score === null || Number.isNaN(score)) return config.bands.insufficient;
  if (score >= config.thresholds.secure) return config.bands.secure;
  if (score >= config.thresholds.building) return config.bands.building;
  return config.bands.emerging;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "function_misconfigured" }, 500);
  const authHeader = req.headers.get("Authorization"); if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing_authentication" }, 401);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(authHeader.slice("Bearer ".length));
  if (userError || !userData.user) return json({ error: "invalid_authentication" }, 401);
  const parsed = requestSchema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return json({ error: "invalid_attempt_id" }, 400);

  const { data: attempt, error: attemptError } = await admin.from("assessment_attempts").select("id, program_id, cohort_id, scholar_id, assessment_id, status").eq("id", parsed.data.attemptId).maybeSingle();
  if (attemptError || !attempt) return json({ error: "attempt_not_found" }, 404);
  const { data: configRow, error: configError } = await admin.from("score_configurations").select("version,score_scale_max,thresholds,bands,minimum_scored_items").eq("program_id", attempt.program_id).eq("active", true).maybeSingle();
  const config = configSchema.safeParse(configRow);
  if (configError || !config.success) return json({ error: "score_configuration_unavailable" }, 503);
  const derivationVersion = config.data.version;

  // Authorize before any result read: this function uses the service-role client (RLS-bypassing),
  // so this check is the only access gate. Must run before the idempotency short-circuit below,
  // otherwise a non-owner could read another scholar's confidence result for an already-scored attempt.
  const { data: scholar } = await admin.from("scholars").select("auth_user_id").eq("id", attempt.scholar_id).maybeSingle();
  const { data: membership } = await admin.from("program_memberships").select("role").eq("program_id", attempt.program_id).eq("user_id", userData.user.id).eq("status", "active").maybeSingle();
  const isOwner = scholar?.auth_user_id === userData.user.id;
  const isStaff = Boolean(membership && ["admin", "instructor", "researcher"].includes(membership.role));
  if (!isOwner && !isStaff) return json({ error: "not_authorized" }, 403);

  const { data: existing } = await admin.from("confidence_results").select("id,band,score,abstained,abstention_reason,derivation_version").eq("source_attempt_id", attempt.id).eq("derivation_version", derivationVersion).maybeSingle();
  if (existing) return json({ result: existing, idempotent: true });

  const { data: responses, error: responseError } = await admin.from("assessment_responses").select("item_id,response_value,revision_number,is_final").eq("attempt_id", attempt.id).order("revision_number", { ascending: false });
  if (responseError) return json({ error: "responses_unavailable" }, 500);
  const latest = new Map<string, { response_value: JsonValue; is_final: boolean }>();
  for (const response of responses ?? []) if (!latest.has(response.item_id)) latest.set(response.item_id, response as { response_value: JsonValue; is_final: boolean });
  const itemIds = [...latest.keys()];
  const { data: items } = await admin.from("assessment_items").select("id,choices").in("id", itemIds.length ? itemIds : ["00000000-0000-4000-8000-000000000000"]);
  const itemTypeById = new Map((items ?? []).map((item) => [item.id, (item.choices as { type?: string } | null)?.type]));
  const { data: keys, error: keyError } = await admin.from("assessment_answer_keys").select("item_id,answer_key").in("item_id", itemIds.length ? itemIds : ["00000000-0000-4000-8000-000000000000"]);
  if (keyError) return json({ error: "answer_key_unavailable" }, 500);
  const keyMap = new Map((keys ?? []).map((key) => [key.item_id, key.answer_key as { correct?: JsonValue; item_type?: string }]));
  const { data: accommodations } = await admin.from("accommodation_profiles").select("code,score_policy,settings").eq("scholar_id", attempt.scholar_id).eq("active", true);
  const abstainer = (accommodations ?? []).find((profile) => profile.score_policy === "abstain");

  let score: number | null = null; let band = config.data.bands.insufficient; let abstained = false; let abstentionReason: string | null = null; let correct = 0;
  if (abstainer) { band = config.data.bands.abstained; abstained = true; abstentionReason = `accommodation:${abstainer.code}`; }
  else if (keyMap.size >= config.data.minimum_scored_items) {
    for (const [itemId, key] of keyMap) if (key && Object.prototype.hasOwnProperty.call(key, "correct") && latest.has(itemId) && sameAnswer(latest.get(itemId)!.response_value, key.correct, key.item_type ?? itemTypeById.get(itemId))) correct += 1;
    score = Math.round((correct / keyMap.size) * config.data.score_scale_max);
    band = bandForScore(score, config.data);
  } else { abstained = true; band = config.data.bands.abstained; abstentionReason = "insufficient_answer_key_context"; }

  const resultPayload = { program_id: attempt.program_id, cohort_id: attempt.cohort_id, scholar_id: attempt.scholar_id, source_attempt_id: attempt.id, result_type: "confidence_band", band, score, abstained, abstention_reason: abstentionReason, derivation_version: derivationVersion, signal_snapshot: { responseCount: latest.size, scoredItemCount: keyMap.size, correctItemCount: correct, accommodationPolicies: accommodations ?? [] } };
  const { error: updateError } = await admin.from("assessment_attempts").update({ status: "submitted", score, score_status: abstained ? "abstained" : "scored", submitted_at_server: new Date().toISOString(), result_metadata: { scoringVersion: derivationVersion, scoredItemCount: keyMap.size } }).eq("id", attempt.id);
  if (updateError) return json({ error: "score_write_failed" }, 500);
  const { data: result, error: resultError } = await admin.from("confidence_results").upsert(resultPayload, { onConflict: "source_attempt_id,derivation_version" }).select("id,band,score,abstained,abstention_reason,derivation_version").single();
  if (resultError) return json({ error: "result_write_failed" }, 500);
  return json({ result, idempotent: false });
});
