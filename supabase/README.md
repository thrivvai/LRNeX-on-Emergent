# D2D Supabase source of truth

Supabase Auth and Supabase Postgres are the only supported identity and persistence systems for the D2D pilot. Manus WebDev hosts the application shell; it does not own student identity, authorization, or research records.

The connected project already contains the following applied migration history, captured from Supabase on 2026-09-26: `d2d_pilot_foundation`, `pin_trigger_function_search_path`, `secure_student_code_redemption`, `scholar_scoped_content_reads`, `seed_d2d_demo_journey_v2`, `idempotent_teacher_judgments`, `seed_d2d_admin_allowlist`, `deny_client_staff_allowlist_reads`, and `expose_service_role_redemption_wrapper`.

The repository now contains a live catalog snapshot in `schema.sql`, the RLS policy export in `rls.sql`, the application function definitions in `app-functions.sql`, the new additive migration in `migrations/20260926091000_d2d_hardening_foundation.sql`, and security tests in `tests/security-boundary.sql`. The original connector-applied migration IDs are preserved above because the connector exposes their history but not their original SQL bodies. The additive hardening migration is the first migration in this branch that can be replayed directly from source.

The hardening migration adds a service-role-only redemption rate-limit ledger, 3 failures per 15 minutes per session/IP key, versioned score configurations, and a unique source-attempt/derivation key for idempotent score results. Raw codes, raw IP addresses, service-role credentials, and environment files do not belong in this repository.

The seeded student code remains development-only: `D2D-DEMO-01`. Production pilot codes must be randomly generated, normalized before hashing, and at least 10 characters after normalization. The allowlisted pilot admins are `wramirez@diapers2deposits.com` and `xavier@thrivvai.com`.
