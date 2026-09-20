import { describe, expect, it } from "vitest";
import { confidenceBandForScore, normalizeAccessCode, PILOT_EVENT_TYPES, shouldAbstainFromAccommodation } from "../shared/pilot";

describe("D2D pilot research contracts", () => {
  it("normalizes human-entered access codes before hashing", () => {
    expect(normalizeAccessCode(" d2d-demo-01 ")).toBe("D2DDEMO01");
  });

  it("uses behavior bands as supporting context, not a false precision score", () => {
    expect(confidenceBandForScore(null)).toBe("insufficient_data");
    expect(confidenceBandForScore(49)).toBe("emerging");
    expect(confidenceBandForScore(50)).toBe("building");
    expect(confidenceBandForScore(80)).toBe("secure");
  });

  it("abstains when accommodation policy requires it", () => {
    expect(shouldAbstainFromAccommodation("abstain")).toBe(true);
    expect(shouldAbstainFromAccommodation("context_only")).toBe(false);
  });

  it("keeps active and away telemetry event names explicit", () => {
    expect(PILOT_EVENT_TYPES).toEqual(expect.arrayContaining([
      "visibility_hidden",
      "visibility_visible",
      "idle_started",
      "idle_ended",
    ]));
  });
});
