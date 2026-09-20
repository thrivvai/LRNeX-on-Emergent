# D2D persisted vertical slice

## Scope

This slice implements the first complete D2D pilot journey: a pseudonymous student enters with a teacher-issued access code, completes a pretest, works through the FAST-aligned **The Money You Pay** lesson, completes a posttest, receives a supporting confidence band or an explicit abstention, and makes the result available to a role-scoped staff evidence view.

The seeded content is explicitly pilot draft content derived from Whitney’s supplied materials. It is not a validated assessment instrument and must receive instructor review before research claims are made from it.

## Authentication and authorization

Students use a Supabase anonymous session plus a teacher-issued access code. The code is normalized in the client, hashed in the Edge Function, and redeemed through an atomic, row-locked Postgres function. The code is never stored in plaintext. Redemption binds the anonymous Supabase user to a pseudonymous scholar record and prevents replay beyond the configured redemption limit.

Staff use Supabase email OTP. Staff queries are scoped by `program_id` and active membership role. The dashboard does not fall back to mock records when the user lacks a membership; it shows an explicit access-scoped state instead.

Before student testing, enable **Anonymous Sign-Ins** in Supabase Auth. This is an Auth dashboard configuration prerequisite, not a client-side workaround.

## Research telemetry

The student client writes append-only events with an event ID, sequence number, client timestamp, server receipt timestamp, session ID, app version, lesson/attempt context, and JSON payload. Visibility changes, window blur/focus, and sixty-second idle boundaries are recorded as explicit events. Active intervals should be derived from these boundaries during analysis; the system does not pretend that a single duration field represents learning.

## Scoring and accommodations

The scorer runs server-side and reads answer keys that are not exposed through student RLS policies. It writes a confidence result with a derivation version and signal snapshot. An active accommodation profile with `score_policy = 'abstain'` forces an abstained result. The pilot’s score is supporting context, not the primary measure of growth. Teacher judgment is stored as an idempotent, auditable one-click record keyed to the teacher, scholar, lesson, and attempt context.

## Demo seed

The demo cohort is `DEMO-01`, the pseudonym is `Scholar A-01`, and the non-production student access code is `D2D-DEMO-01`. Replace this seed with instructor-approved pilot records before live research use.

## Verification completed

The D2D WebDev project passes TypeScript validation and nine Vitest tests. Supabase reports all public tables with RLS enabled and no security-advisor lints. Both deployed Edge Functions reject unauthenticated requests with HTTP 401. The live schema contains the seeded program, cohort, learner, lesson, and two assessments.
