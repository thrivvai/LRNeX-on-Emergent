-- Fix the development-only demo access code.
-- D2D-DEMO-01 normalizes to 9 characters and fails the 10-character minimum.
-- D2D-DEMO-001 normalizes to D2DDEMO001 (10 characters).
update public.scholar_access_codes
set code_hash = 'c3c91dcd7d6d3e2382bc3f5da4fb57a080aaa7e03987587c21f2334877103bde',
    redemption_count = 0,
    max_redemptions = 25,
    revoked_at = null,
    expires_at = null
where code_hash = 'e3322c6c8a549841cee9124ab1f7679760153a6b1c6284a92db2f67a16564373';

update public.scholars
set auth_user_id = null,
    updated_at = now()
where id = '33333333-3333-4333-8333-333333333333';
