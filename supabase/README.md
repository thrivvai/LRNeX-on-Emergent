# D2D Supabase project notes

The D2D pilot database is hosted in the connected Supabase project. The schema was applied through the Supabase connector and is intentionally not represented by the WebDev template's Drizzle/MySQL migration files.

The live migration sequence is:

1. `d2d_pilot_foundation`
2. `pin_trigger_function_search_path`
3. `secure_student_code_redemption`
4. `scholar_scoped_content_reads`
5. `seed_d2d_demo_journey_v2`
6. `idempotent_teacher_judgments`
7. `seed_d2d_admin_allowlist`
8. `deny_client_staff_allowlist_reads`
9. `expose_service_role_redemption_wrapper`

The deployed functions are mirrored under `supabase/functions/`:

- `redeem-student-access-code`
- `score-assessment-attempt`
- `bootstrap-staff-membership`

No Supabase keys, service-role credentials, or environment files belong in this repository. Project configuration and secrets remain managed by the WebDev/Supabase environments.

The seeded non-production student code is `D2D-DEMO-01`. The allowlisted pilot admins are `wramirez@diapers2deposits.com` and `xavier@thrivvai.com`.
