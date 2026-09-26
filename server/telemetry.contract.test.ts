import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PILOT_EVENT_TYPES, HEARTBEAT_INTERVAL_MS, IDLE_THRESHOLD_MS } from "../shared/pilot";

describe("D2D telemetry reliability contract", () => {
  it("includes answer, item-boundary, lifecycle, and delivery events", () => {
    expect(PILOT_EVENT_TYPES).toEqual(expect.arrayContaining([
      "answer_selected",
      "answer_changed",
      "answer_finalized",
      "assessment_item_entered",
      "assessment_item_exited",
      "active_interval_started",
      "active_interval_ended",
      "page_hidden",
      "page_frozen",
      "heartbeat",
    ]));
    expect(IDLE_THRESHOLD_MS).toBe(60_000);
    expect(HEARTBEAT_INTERVAL_MS).toBe(15_000);
  });

  it("keeps the raw event stream append-only and idempotent", () => {
    const migration = readFileSync("supabase/migrations/20260926100000_telemetry_reliability.sql", "utf8");
    expect(migration).toContain("learning_events_event_id_key");
    expect(migration).toContain("learning_events_append_only");
    expect(migration).toContain("learning_events_are_append_only");
    expect(migration).toContain("assessment_responses_client_revision_key");
  });
});
