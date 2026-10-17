-- Behavioral RLS checks for 20261017000000_scholar_write_context.sql.
-- Run after all migrations, on a local replay or an isolated Supabase test project; never on the live pilot.
-- Each case writes as the `authenticated` role with JWT claims set the way Supabase sets them, then the
-- whole transaction rolls back. A failed check raises, so `psql -v ON_ERROR_STOP=1` exits non-zero.
begin;

-- Fixtures, inserted as the table owner (RLS does not apply). Scholars A and B share program P1 and
-- cohort C1; C2 is another cohort in P1; P2/C3 is another program.
insert into public.programs (id, name, slug) values
  ('a1000000-0000-4000-8000-000000000001', 'Test Program 1', 'test-program-1'),
  ('a1000000-0000-4000-8000-000000000002', 'Test Program 2', 'test-program-2');
insert into public.cohorts (id, program_id, name, code) values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'C1', 'T-C1'),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'C2', 'T-C2'),
  ('a2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'C3', 'T-C3');
insert into public.scholars (id, program_id, pseudonym, auth_user_id) values
  ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Test A', 'a4000000-0000-4000-8000-000000000001'),
  ('a3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Test B', 'a4000000-0000-4000-8000-000000000002');
insert into public.enrollments (program_id, cohort_id, scholar_id, status) values
  ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'active'),
  ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 'active');
insert into public.lessons (id, program_id, slug, title, framework_phase, content_version, status) values
  ('a5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'test-l1', 'L1', 'Notice', 'test-1', 'published'),
  ('a5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'test-l2', 'L2', 'Notice', 'test-1', 'published');
insert into public.assessments (id, program_id, kind, title, version, scoring_version, status) values
  ('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'pretest', 'S1', 'v1', 'v1', 'published'),
  ('a6000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'pretest', 'S2', 'v1', 'v1', 'published');
insert into public.assessment_items (id, program_id, assessment_id, item_order, objective_code, prompt, item_version) values
  ('a7000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 1, 'T.1', 'Q1', 'v1');
-- Scholar B's attempt: the target of the score-poisoning case.
insert into public.assessment_attempts (id, program_id, cohort_id, scholar_id, assessment_id, attempt_number) values
  ('a8000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000001', 1);

-- Runs one statement as an authenticated user; 'denied' means RLS rejected it (SQLSTATE 42501).
-- Any other error propagates, so a broken fixture cannot pass as a denial.
create function pg_temp.as_user(p_uid uuid, p_statement text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  set local role authenticated;
  begin
    execute p_statement;
    reset role;
    return 'allowed';
  exception when insufficient_privilege then
    reset role;
    return 'denied';
  end;
end;
$$;

create function pg_temp.insert_event(p_uid uuid, p_scholar uuid, p_program uuid, p_cohort uuid, p_attempt uuid default null, p_lesson uuid default null)
returns text language sql as $$
  select pg_temp.as_user(p_uid, format(
    'insert into public.learning_events (event_id, program_id, cohort_id, scholar_id, session_id, event_seq, event_type, occurred_at_client, app_version, attempt_id, lesson_id)
     values (gen_random_uuid(), %L, %L, %L, %L, 0, %L, now(), %L, %L, %L)',
    p_program, p_cohort, p_scholar, 'test-session', 'heartbeat', 'test', p_attempt, p_lesson));
$$;

create function pg_temp.insert_attempt(p_uid uuid, p_id uuid, p_scholar uuid, p_program uuid, p_cohort uuid, p_assessment uuid)
returns text language sql as $$
  select pg_temp.as_user(p_uid, format(
    'insert into public.assessment_attempts (id, program_id, cohort_id, scholar_id, assessment_id, attempt_number) values (%L, %L, %L, %L, %L, 1)',
    p_id, p_program, p_cohort, p_scholar, p_assessment));
$$;

create function pg_temp.insert_response(p_uid uuid, p_scholar uuid, p_program uuid, p_cohort uuid, p_attempt uuid, p_revision int)
returns text language sql as $$
  select pg_temp.as_user(p_uid, format(
    'insert into public.assessment_responses (program_id, cohort_id, scholar_id, attempt_id, item_id, response_value, revision_number)
     values (%L, %L, %L, %L, %L, %L, %s)',
    p_program, p_cohort, p_scholar, p_attempt, 'a7000000-0000-4000-8000-000000000001', '"new_balance"', p_revision));
$$;

create function pg_temp.upsert_progress(p_uid uuid, p_scholar uuid, p_program uuid, p_cohort uuid, p_lesson uuid)
returns text language sql as $$
  select pg_temp.as_user(p_uid, format(
    'insert into public.lesson_progress (program_id, cohort_id, scholar_id, lesson_id, status, content_version) values (%L, %L, %L, %L, %L, %L)
     on conflict (scholar_id, lesson_id, content_version) do update set status = excluded.status',
    p_program, p_cohort, p_scholar, p_lesson, 'in_progress', 'test-1'));
$$;

do $$
declare
  ua constant uuid := 'a4000000-0000-4000-8000-000000000001';
  ub constant uuid := 'a4000000-0000-4000-8000-000000000002';
  nobody constant uuid := 'a4000000-0000-4000-8000-000000000009';
  sa constant uuid := 'a3000000-0000-4000-8000-000000000001';
  sb constant uuid := 'a3000000-0000-4000-8000-000000000002';
  p1 constant uuid := 'a1000000-0000-4000-8000-000000000001';
  p2 constant uuid := 'a1000000-0000-4000-8000-000000000002';
  c1 constant uuid := 'a2000000-0000-4000-8000-000000000001';
  c2 constant uuid := 'a2000000-0000-4000-8000-000000000002';
  c3 constant uuid := 'a2000000-0000-4000-8000-000000000003';
  l1 constant uuid := 'a5000000-0000-4000-8000-000000000001';
  l2 constant uuid := 'a5000000-0000-4000-8000-000000000002';
  s1 constant uuid := 'a6000000-0000-4000-8000-000000000001';
  s2 constant uuid := 'a6000000-0000-4000-8000-000000000002';
  att_a constant uuid := 'a8000000-0000-4000-8000-000000000001';
  att_b constant uuid := 'a8000000-0000-4000-8000-000000000002';
begin
  -- learning_events
  assert pg_temp.insert_event(ua, sa, p1, c1) = 'allowed', 'event in own program and cohort is allowed';
  assert pg_temp.insert_event(ua, sa, p1, c2) = 'denied', 'event labeled with a cohort the scholar is not enrolled in is denied';
  assert pg_temp.insert_event(ua, sa, p2, c3) = 'denied', 'event labeled with another program is denied';
  assert pg_temp.insert_event(ua, sb, p1, c1) = 'denied', 'event claiming another scholar is denied';
  assert pg_temp.insert_event(nobody, sa, p1, c1) = 'denied', 'event from a user bound to no scholar is denied';
  assert pg_temp.insert_event(ua, sa, p1, c1, att_b) = 'denied', 'event referencing another scholar''s attempt is denied';
  assert pg_temp.insert_event(ua, sa, p1, c1, null, l2) = 'denied', 'event referencing another program''s lesson is denied';
  assert pg_temp.insert_event(ua, sa, p1, c1, null, l1) = 'allowed', 'event referencing a lesson in the program is allowed';

  -- assessment_attempts and assessment_responses
  assert pg_temp.insert_response(ua, sa, p1, c1, att_b, 9) = 'denied', 'response injected into another scholar''s attempt is denied';
  assert pg_temp.insert_attempt(ua, gen_random_uuid(), sa, p1, c1, s2) = 'denied', 'attempt on another program''s assessment is denied';
  assert pg_temp.insert_attempt(ua, gen_random_uuid(), sa, p1, c2, s1) = 'denied', 'attempt labeled with an unenrolled cohort is denied';
  assert pg_temp.insert_attempt(ua, att_a, sa, p1, c1, s1) = 'allowed', 'attempt in own context is allowed';
  assert pg_temp.insert_response(ua, sa, p1, c1, att_a, 1) = 'allowed', 'response to own attempt is allowed';
  assert pg_temp.as_user(ua, format('update public.assessment_responses set attempt_id = %L where attempt_id = %L', att_b, att_a)) = 'denied',
    'moving an own response onto another scholar''s attempt is denied';

  -- lesson_progress, including the upsert path the client uses
  assert pg_temp.upsert_progress(ua, sa, p1, c1, l1) = 'allowed', 'progress insert in own context is allowed';
  assert pg_temp.upsert_progress(ua, sa, p1, c1, l1) = 'allowed', 'progress upsert (conflict update) in own context is allowed';
  assert pg_temp.upsert_progress(ua, sa, p1, c1, l2) = 'denied', 'progress on another program''s lesson is denied';
  assert pg_temp.upsert_progress(ua, sa, p1, c2, l1) = 'denied', 'progress labeled with an unenrolled cohort is denied';

  -- an enrollment that is no longer active stops writes
  update public.enrollments set status = 'paused' where scholar_id = sb;
  assert pg_temp.insert_event(ub, sb, p1, c1) = 'denied', 'event from a scholar whose enrollment is paused is denied';

  raise notice 'scholar write-context behavior: 19 checks passed';
end;
$$;

-- The four tables declare exactly these policies, and lesson_progress has its foreign key and upsert key.
do $$
begin
  assert (select array_agg(policyname::text order by policyname) from pg_policies where schemaname = 'public' and tablename = 'assessment_attempts')
    = array['attempts_self_insert','attempts_self_select','attempts_staff_select','attempts_staff_write'], 'assessment_attempts policy set';
  assert (select array_agg(policyname::text order by policyname) from pg_policies where schemaname = 'public' and tablename = 'assessment_responses')
    = array['responses_self_insert','responses_self_select','responses_self_update','responses_staff_select'], 'assessment_responses policy set';
  assert (select array_agg(policyname::text order by policyname) from pg_policies where schemaname = 'public' and tablename = 'learning_events')
    = array['events_self_insert','events_staff_select'], 'learning_events policy set';
  assert (select array_agg(policyname::text order by policyname) from pg_policies where schemaname = 'public' and tablename = 'lesson_progress')
    = array['progress_self_insert','progress_self_select','progress_self_update','progress_staff_select'], 'lesson_progress policy set';
  assert exists (select 1 from pg_constraint where conrelid = 'public.lesson_progress'::regclass and conname = 'lesson_progress_lesson_id_fkey'), 'lesson_progress lesson FK';
  assert exists (select 1 from pg_constraint where conrelid = 'public.lesson_progress'::regclass and conname = 'lesson_progress_scholar_id_lesson_id_content_version_key'), 'lesson_progress upsert key';
  raise notice 'scholar write-context structure: 6 checks passed';
end;
$$;

rollback;
