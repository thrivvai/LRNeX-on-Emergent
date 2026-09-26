export const PILOT_APP_VERSION = "d2d-pilot-0.3.0";

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

export const ACCESS_CODE_MIN_LENGTH = 10;
export const ACCESS_CODE_MAX_LENGTH = 32;
export const REDEMPTION_RATE_LIMIT = { maxFailures: 3, windowSeconds: 900 } as const;

export function normalizeAccessCode(value: string) {
  return value.trim().toUpperCase().replaceAll("-", "");
}

export function isPlausibleAccessCode(value: string) {
  const normalized = normalizeAccessCode(value);
  return normalized.length >= ACCESS_CODE_MIN_LENGTH && normalized.length <= ACCESS_CODE_MAX_LENGTH && /^[A-Z0-9]+$/.test(normalized);
}

export type ScoreConfiguration = {
  thresholds: { building: number; secure: number };
  bands: { emerging: string; building: string; secure: string; insufficient: string; abstained: string };
  minimum_scored_items: number;
};

export function bandForConfiguredScore(score: number | null, config: ScoreConfiguration) {
  if (score === null || Number.isNaN(score)) return config.bands.insufficient;
  if (score >= config.thresholds.secure) return config.bands.secure;
  if (score >= config.thresholds.building) return config.bands.building;
  return config.bands.emerging;
}

export function shouldAbstainFromAccommodation(policy: string | null | undefined) {
  return policy === "abstain";
}
