/** Shared application types for the Supabase-backed D2D pilot. */
export type PilotRole = "admin" | "instructor" | "researcher" | "viewer";
export type Judgment = "matches" | "partly_matches" | "does_not_match" | "insufficient_context";
export * from "./_core/errors";
