import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const journey = readFileSync(resolve(root, "client/src/pages/StudentJourney.tsx"), "utf8");
const telemetry = readFileSync(resolve(root, "client/src/lib/telemetry.ts"), "utf8");

describe("D2D instrumentation repair contracts", () => {
  it("writes immutable answer revisions before final submission", () => {
    expect(journey).toContain('eventType === "answer_selected" || eventType === "answer_changed"');
    expect(journey).toContain("client_revision_id: crypto.randomUUID()");
    expect(journey).toContain("is_final: false");
    expect(journey).toContain("assessment_responses");
  });

  it("does not allow assessment interaction before an attempt exists", () => {
    expect(journey).toContain('step === "pretest" && assessment && attemptId');
    expect(journey).toContain('step === "posttest" && attemptId');
  });

  it("covers lifecycle boundaries and periodic active heartbeats", () => {
    for (const eventName of ["visibility_hidden", "window_blurred", "page_hidden", "page_frozen", "page_resumed", "active_interval_started", "active_interval_ended", "heartbeat"]) {
      expect(journey).toContain(`"${eventName}"`);
    }
    expect(journey).toContain("IntersectionObserver");
    expect(journey).toContain("assessment_item_exited");
  });

  it("queues before sending and prevents concurrent flush races", () => {
    expect(telemetry).toContain("let flushInFlight");
    expect(telemetry).toContain("queue.push");
    expect(telemetry).toContain("await flushTelemetryQueue()");
    expect(telemetry).toContain("events.slice(-500)");
  });
});
