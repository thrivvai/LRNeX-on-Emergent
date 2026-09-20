import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const requestSchema = z.object({}).strict();
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
  if (userError || !userData.user?.email) return json({ error: "invalid_authentication" }, 401);
  const body = await req.json().catch(() => ({}));
  if (!requestSchema.safeParse(body).success) return json({ error: "invalid_request" }, 400);
  const email = userData.user.email.trim().toLowerCase();
  const { data: allowlist, error: allowlistError } = await admin.from("staff_allowlist").select("program_id,role").eq("email", email).eq("active", true).limit(1).maybeSingle();
  if (allowlistError) return json({ error: "allowlist_lookup_failed" }, 500);
  if (!allowlist) return json({ error: "staff_not_allowlisted" }, 403);
  const { error: membershipError } = await admin.from("program_memberships").upsert({ program_id: allowlist.program_id, user_id: userData.user.id, role: allowlist.role, status: "active" }, { onConflict: "program_id,user_id" });
  if (membershipError) return json({ error: "membership_write_failed" }, 500);
  await admin.from("audit_events").insert({ program_id: allowlist.program_id, actor_user_id: userData.user.id, action: "bootstrap_membership", resource_type: "program_memberships", metadata: { email, role: allowlist.role } });
  return json({ programId: allowlist.program_id, role: allowlist.role, email });
});
