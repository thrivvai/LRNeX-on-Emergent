export const PILOT_APP_VERSION = "d2d-pilot-0.2.0";

export const PILOT_EVENT_TYPES = [
  "assessment_started",
  "assessment_submitted",
  "lesson_opened",
  "lesson_step_viewed",
  "lesson_completed",
  "visibility_hidden",
  "visibility_visible",
  "idle_started",
  "idle_ended",
] as const;

export type PilotEventType = (typeof PILOT_EVENT_TYPES)[number];

export function normalizeAccessCode(value: string) {
  return value.trim().toUpperCase().replaceAll("-", "");
}

export function confidenceBandForScore(score: number | null) {
  if (score === null || Number.isNaN(score)) return "insufficient_data" as const;
  if (score >= 80) return "secure" as const;
  if (score >= 50) return "building" as const;
  return "emerging" as const;
}

export function shouldAbstainFromAccommodation(policy: string | null | undefined) {
  return policy === "abstain";
}
