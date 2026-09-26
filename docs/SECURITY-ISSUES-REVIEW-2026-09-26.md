# D2D Migration and Security Issues Review

**Review date:** 2026-09-26
**Scope:** Issues #5 and #7–#12 against the current migrations, Edge Functions, source contracts, and checked-in artifacts.

## Executive decision

**Do not use additional student data, redeem further live access codes, or generate/serve additional confidence scores until the release blockers below are corrected and verified in a fresh deployed Supabase environment.**

Issue #8 is closed for the reviewed scope. Issue #11 is mostly closed and non-blocking. Issues #5, #7, #9, #10, and #12 remain open or partially closed.

## Findings by issue

| Issue | Status | Finding |
|---|---|---|
| #5 — migrations/RLS/functions/seeds | **Open / critical** | The fresh migration chain is not reproducible: baseline policies reference tables created only in the later hardening migration, and policy names are recreated. The complete RLS set is not in versioned migrations. The schema also lacks important relationship/cross-program integrity constraints. The demo seed contains a known reusable credential. The SECURITY DEFINER redemption boundary accepts a caller-supplied user ID without deriving it from `auth.uid()`. |
| #7 — redemption rate limiting/entropy | **Partially closed / critical** | The access-code generator is strong: cryptographic randomness and approximately 80 bits of entropy at the default length. The rate-limit Edge Function calls app-schema RPCs without an explicit schema configuration, separates admission from failure recording, ignores failure-record errors, and trusts client-forwarded IP headers. |
| #8 — legacy MySQL/Drizzle/Manus OAuth | **Closed for reviewed scope** | The old runtime, dependencies, and named paths are removed. Add broader dependency/import scanning as preventive CI hardening. |
| #9 — type-safe/idempotent scoring | **Partially closed / critical** | Database uniqueness and upsert provide an idempotency foundation. However, an existing result is returned before ownership/program authorization; answer/key JSON is asserted rather than runtime-validated; array answer semantics are universally sorted; and missing/invalid responses can distort the denominator. |
| #10 — versioned confidence thresholds | **Partially closed / critical** | Thresholds are server-side, but an existing version can be updated and results do not retain a canonical configuration snapshot/hash. Threshold ordering and range validity are not fully enforced. |
| #11 — unused integrations/template code | **Mostly closed / non-blocking** | Executable AI, voice, image, map, and template integration paths are gone. A generated video asset reference remains; decide whether its provenance is in scope. |
| #12 — real security-boundary tests | **Partially closed / critical** | The current pgTAP file checks object existence and privileges, while the integration cases are comments. It does not prove cross-program RLS isolation, protected writes, score-result confidentiality, rate-limit behavior, or concurrent redemption. |

## Required order of remediation

1. **Freeze score and redemption use.** Invalidate or remove any known demo credential from pilot data and prevent production execution of demo-only seed data.
2. **Rebuild migrations from empty state.** Create tables before policies; remove duplicate policy creation; commit the complete RLS policy set; add foreign keys and same-program integrity checks or validated server-side writes.
3. **Repair redemption boundaries.** Derive identity from `auth.uid()`, restrict direct function execution, make rate-limit admission/failure/redemption atomic and fail closed, explicitly resolve the secured RPC schema, and use only trusted server-derived IP information.
4. **Repair scorer authorization and typing.** Authorize attempt ownership/program membership before every result lookup; validate response, item, choice, and answer-key shapes at runtime; define ordered versus unordered answer semantics; and calculate the denominator from validated scorable responses.
5. **Make scoring reproducible.** Make configuration versions immutable, validate threshold ordering/ranges, and persist a canonical configuration and answer-key/content snapshot or hash with each result.
6. **Run deployed integration tests.** In an isolated Supabase test project, exercise anon/authenticated/service roles across multiple programs and scholars. Assert allowed and denied RLS reads/writes, protected mutations, result confidentiality, rate-limit windows/429 behavior, concurrent redemption, and idempotent replay.
7. **Retain source contracts as supplemental tests.** Add CI checks to prevent deleted integrations from returning.

## Release gate

The pilot is not security-signed-off until the full migration chain applies cleanly to an empty project and the deployed integration suite passes. Source-text contract tests are useful regression checks but are not evidence that the live RLS and authorization boundaries work.
