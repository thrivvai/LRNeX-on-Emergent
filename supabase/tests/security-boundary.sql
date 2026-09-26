-- Run in an isolated Supabase test project after applying all migrations.
-- This file is intentionally not runnable against the live pilot database.
begin;
select plan(12);

select has_table('public', 'scholars', 'scholars table exists');
select has_table('public', 'learning_events', 'learning_events table exists');
select has_table('public', 'redemption_rate_limits', 'rate-limit ledger exists');
select has_table('public', 'score_configurations', 'score configuration table exists');
select policies_are('public', 'scholars', array['scholars_self_select','scholars_staff_select','scholars_admin_instructor_write'], 'scholar policies are present');
select policies_are('public', 'assessment_answer_keys', array['answer_keys_admin_instructor_write','answer_keys_staff_select'], 'answer-key policies are present');
select policies_are('public', 'redemption_rate_limits', array['redemption_rate_limits_no_client_access'], 'rate-limit ledger is client-denied');
select policies_are('public', 'score_configurations', array['score_configurations_no_client_access'], 'score configuration is client-denied');
select function_privs_are('app', 'redeem_access_code', array['text','uuid'], 'public', '{}', 'redemption RPC is not callable by public');
select function_privs_are('app', 'rate_limit_status', array['text','text','integer','integer'], 'public', '{}', 'rate-limit status is not callable by public');
select triggers_are('public', 'scholars', array['scholars_audit','scholars_touch_updated_at'], 'scholar audit and timestamp triggers exist');
select triggers_are('public', 'confidence_results', array['confidence_audit'], 'confidence results are audited');

select * from finish();
rollback;

-- Integration runner cases (executed with JWT fixtures, not in this transaction):
-- 1. scholar A can select only scholar A, attempts, responses, events, progress, and results.
-- 2. scholar A cannot select scholar B or answer keys.
-- 3. program-A instructor cannot select program-B records.
-- 4. anon/authenticated cannot insert directly into enrollments or bind scholars.
-- 5. a student cannot update confidence_results, accommodations, or teacher_judgments.
-- 6. repeated scorer calls return one confidence result per source_attempt_id/derivation_version.
-- 7. three invalid code attempts return 429; a fourth request remains blocked until the window expires.
-- 8. a valid code is atomic under concurrent redemption and cannot exceed max_redemptions.
