-- Scholar write context: a scholar's own writes must carry the scholar's own context.
--
-- The self-write policies on assessment_attempts, assessment_responses, learning_events, and
-- lesson_progress checked only app.is_own_scholar(scholar_id). The client also supplies program_id,
-- cohort_id, and parent references (attempt_id, lesson_id, assessment_id), and none of those were
-- checked. A scholar could therefore:
--   * label their own rows with another cohort or program, corrupting per-cohort reporting;
--   * insert a response into another scholar's attempt, which the scorer reads by attempt_id alone,
--     and so poison that scholar's score; and
--   * start an attempt on another program's assessment and use the scorer as an answer-key oracle.
-- The predicates below require the scholar's active enrollment to match the claimed program and cohort,
-- and every parent reference to belong to the same scholar or program.
--
-- The migration also declares the complete policy set for these four tables (the repo baseline lacked the
-- lesson_progress policies and the staff policies already live), the lesson_progress foreign key and
-- upsert key that live already has, and an expiry for the development demo access code. It is idempotent:
-- on the live project the two constraints already exist and are left untouched.

-- Predicates ---------------------------------------------------------------------------------------

create or replace function app.is_own_scholar_context(p_scholar_id uuid, p_program_id uuid, p_cohort_id uuid)
returns boolean language sql stable security definer set search_path to 'public', 'app' as $$
  select exists (
    select 1
    from public.scholars s
    join public.enrollments e on e.scholar_id = s.id
    where s.id = p_scholar_id
      and s.auth_user_id = auth.uid()
      and s.status = 'active'
      and s.program_id = p_program_id
      and e.program_id = p_program_id
      and e.cohort_id = p_cohort_id
      and e.status = 'active'
  );
$$;

create or replace function app.attempt_belongs_to_scholar(p_attempt_id uuid, p_scholar_id uuid)
returns boolean language sql stable security definer set search_path to 'public', 'app' as $$
  select exists (select 1 from public.assessment_attempts a where a.id = p_attempt_id and a.scholar_id = p_scholar_id);
$$;

create or replace function app.lesson_in_program(p_lesson_id uuid, p_program_id uuid)
returns boolean language sql stable security definer set search_path to 'public', 'app' as $$
  select exists (select 1 from public.lessons l where l.id = p_lesson_id and l.program_id = p_program_id);
$$;

create or replace function app.assessment_in_program(p_assessment_id uuid, p_program_id uuid)
returns boolean language sql stable security definer set search_path to 'public', 'app' as $$
  select exists (select 1 from public.assessments a where a.id = p_assessment_id and a.program_id = p_program_id);
$$;

-- assessment_attempts ------------------------------------------------------------------------------

drop policy if exists attempts_self_insert on public.assessment_attempts;
create policy attempts_self_insert on public.assessment_attempts for insert to authenticated
  with check (app.is_own_scholar_context(scholar_id, program_id, cohort_id) and app.assessment_in_program(assessment_id, program_id));
drop policy if exists attempts_self_select on public.assessment_attempts;
create policy attempts_self_select on public.assessment_attempts for select to authenticated
  using (app.is_own_scholar(scholar_id));
drop policy if exists attempts_staff_select on public.assessment_attempts;
create policy attempts_staff_select on public.assessment_attempts for select to authenticated
  using (app.is_program_member(program_id));
drop policy if exists attempts_staff_write on public.assessment_attempts;
create policy attempts_staff_write on public.assessment_attempts for update to authenticated
  using (app.has_program_role(program_id, array['admin','instructor']::text[]))
  with check (app.has_program_role(program_id, array['admin','instructor']::text[]));

-- assessment_responses -----------------------------------------------------------------------------

drop policy if exists responses_self_insert on public.assessment_responses;
create policy responses_self_insert on public.assessment_responses for insert to authenticated
  with check (app.is_own_scholar_context(scholar_id, program_id, cohort_id) and app.attempt_belongs_to_scholar(attempt_id, scholar_id));
drop policy if exists responses_self_select on public.assessment_responses;
create policy responses_self_select on public.assessment_responses for select to authenticated
  using (app.is_own_scholar(scholar_id));
drop policy if exists responses_self_update on public.assessment_responses;
create policy responses_self_update on public.assessment_responses for update to authenticated
  using (app.is_own_scholar(scholar_id))
  with check (app.is_own_scholar_context(scholar_id, program_id, cohort_id) and app.attempt_belongs_to_scholar(attempt_id, scholar_id));
drop policy if exists responses_staff_select on public.assessment_responses;
create policy responses_staff_select on public.assessment_responses for select to authenticated
  using (app.is_program_member(program_id));

-- learning_events ----------------------------------------------------------------------------------

drop policy if exists events_self_insert on public.learning_events;
create policy events_self_insert on public.learning_events for insert to authenticated
  with check (
    app.is_own_scholar_context(scholar_id, program_id, cohort_id)
    and (attempt_id is null or app.attempt_belongs_to_scholar(attempt_id, scholar_id))
    and (lesson_id is null or app.lesson_in_program(lesson_id, program_id))
  );
drop policy if exists events_staff_select on public.learning_events;
create policy events_staff_select on public.learning_events for select to authenticated
  using (app.is_program_member(program_id));

-- lesson_progress ----------------------------------------------------------------------------------

drop policy if exists progress_self_insert on public.lesson_progress;
create policy progress_self_insert on public.lesson_progress for insert to authenticated
  with check (app.is_own_scholar_context(scholar_id, program_id, cohort_id) and app.lesson_in_program(lesson_id, program_id));
drop policy if exists progress_self_select on public.lesson_progress;
create policy progress_self_select on public.lesson_progress for select to authenticated
  using (app.is_own_scholar(scholar_id));
drop policy if exists progress_self_update on public.lesson_progress;
create policy progress_self_update on public.lesson_progress for update to authenticated
  using (app.is_own_scholar(scholar_id))
  with check (app.is_own_scholar_context(scholar_id, program_id, cohort_id) and app.lesson_in_program(lesson_id, program_id));
drop policy if exists progress_staff_select on public.lesson_progress;
create policy progress_staff_select on public.lesson_progress for select to authenticated
  using (app.is_program_member(program_id));

-- Progress must reference a real lesson, and the client's upsert targets this key. Live already has both.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.lesson_progress'::regclass and conname = 'lesson_progress_lesson_id_fkey') then
    alter table public.lesson_progress
      add constraint lesson_progress_lesson_id_fkey foreign key (lesson_id) references public.lessons(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.lesson_progress'::regclass and conname = 'lesson_progress_scholar_id_lesson_id_content_version_key') then
    alter table public.lesson_progress
      add constraint lesson_progress_scholar_id_lesson_id_content_version_key unique (scholar_id, lesson_id, content_version);
  end if;
end;
$$;

-- Demo access code ---------------------------------------------------------------------------------

-- The development code D2D-DEMO-001 was seeded with no expiry. Give it a bounded window from whenever this
-- migration runs (a relative window, so a fresh replay doesn't start out expired). Extend it deliberately,
-- and revoke it before any real pilot use:
--   update public.scholar_access_codes set expires_at = now() + interval '90 days' where code_hash = '<hash>';
--   update public.scholar_access_codes set revoked_at = now() where code_hash = '<hash>';
update public.scholar_access_codes
set expires_at = now() + interval '90 days'
where code_hash = 'c3c91dcd7d6d3e2382bc3f5da4fb57a080aaa7e03987587c21f2334877103bde'
  and expires_at is null;
