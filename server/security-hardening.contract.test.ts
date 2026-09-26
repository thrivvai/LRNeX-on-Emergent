import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migration = readFileSync(resolve(root, "supabase/migrations/20260926091000_d2d_hardening_foundation.sql"), "utf8");
const redeem = readFileSync(resolve(root, "supabase/functions/redeem-student-access-code/index.ts"), "utf8");
const scorer = readFileSync(resolve(root, "supabase/functions/score-assessment-attempt/index.ts"), "utf8");

 describe("D2D security hardening contracts", () => {
  it("keeps the new sensitive tables behind RLS and service-role functions", () => {
    expect(migration).toContain("alter table public.redemption_rate_limits enable row level security");
    expect(migration).toContain("alter table public.score_configurations enable row level security");
    expect(migration).toContain("grant execute on function app.rate_limit_status");
    expect(migration).toContain("grant execute on function app.record_rate_limit_failure");
  });

  it("enforces stronger access-code validation and a three-failure window", () => {
    expect(redeem).toContain("RATE_MAX_FAILURES = 3");
    expect(redeem).toContain("RATE_WINDOW_SECONDS = 900");
    expect(redeem).toContain(".min(10)");
    expect(redeem).toContain("rate_limit_status");
    expect(redeem).toContain("record_rate_limit_failure");
    expect(redeem).toContain("}, 429");
  });

  it("uses server-owned configuration and an idempotency key for scoring", () => {
    expect(scorer).toContain("score_configurations");
    expect(scorer).toContain("source_attempt_id");
    expect(scorer).toContain("onConflict: \"source_attempt_id,derivation_version\"");
    expect(scorer).toContain("canonical(value");
    expect(scorer).toContain("sameAnswer");
  });

  it("does not leave the old template persistence/auth stack in the project", () => {
    expect(existsSync(resolve(root, "drizzle"))).toBe(false);
    expect(existsSync(resolve(root, "server/routers.ts"))).toBe(false);
    expect(existsSync(resolve(root, "server/_core/oauth.ts"))).toBe(false);
    expect(existsSync(resolve(root, "client/src/lib/trpc.ts"))).toBe(false);
  });
});
