import { describe, expect, it } from "vitest";
import { bandForConfiguredScore, normalizeAccessCode, PILOT_EVENT_TYPES, shouldAbstainFromAccommodation } from "../shared/pilot";

describe("D2D pilot research contracts", () => {
  it("normalizes human-entered access codes before hashing", () => {
    expect(normalizeAccessCode(" d2d-demo-01 ")).toBe("D2DDEMO01");
  });

  it("uses behavior bands as supporting context, not a false precision score", () => {
    const config = { thresholds: { building: 50, secure: 80 }, bands: { emerging: "emerging", building: "building", secure: "secure", insufficient: "insufficient_data", abstained: "abstained" }, minimum_scored_items: 1 };
    expect(bandForConfiguredScore(null, config)).toBe("insufficient_data");
    expect(bandForConfiguredScore(49, config)).toBe("emerging");
    expect(bandForConfiguredScore(50, config)).toBe("building");
    expect(bandForConfiguredScore(80, config)).toBe("secure");
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
