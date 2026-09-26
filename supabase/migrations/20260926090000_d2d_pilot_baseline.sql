-- D2D pilot baseline snapshot.
-- Rebuild artifact for a fresh Supabase project; the connected pilot already has
-- this history recorded under the migration IDs listed in supabase/README.md.
-- D2D Student Growth Platform live-schema snapshot
-- Generated from the connected Supabase catalog on 2026-09-26.
-- This is a review/rebuild artifact; apply the ordered migration history in README first.
-- Sensitive seed values and auth identities are intentionally omitted.

create schema if not exists app;

create table if not exists public.programs (
  id uuid default gen_random_uuid() not null primary key,
  name text not null,
  slug text not null,
  status text default 'pilot'::text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.programs enable row level security;

create table if not exists public.cohorts (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  name text not null,
  code text not null,
  status text default 'active'::text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz default now() not null
);
alter table public.cohorts enable row level security;

create table if not exists public.scholars (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  pseudonym text not null,
  auth_user_id uuid,
  status text default 'active'::text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.scholars enable row level security;

create table if not exists public.lessons (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  slug text not null,
  title text not null,
  framework_phase text not null,
  content_version text not null,
  content jsonb default '{}'::jsonb not null,
  status text default 'draft'::text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.lessons enable row level security;

create table if not exists public.assessments (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  lesson_id uuid,
  kind text not null,
  title text not null,
  version text not null,
  status text default 'draft'::text not null,
  scoring_version text not null,
  created_at timestamptz default now() not null
);
alter table public.assessments enable row level security;

create table if not exists public.assessment_items (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  assessment_id uuid not null,
  item_order integer not null,
  objective_code text not null,
  prompt text not null,
  choices jsonb default '[]'::jsonb not null,
  item_version text not null,
  created_at timestamptz default now() not null
);
alter table public.assessment_items enable row level security;

create table if not exists public.assessment_answer_keys (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  item_id uuid not null,
  answer_key jsonb not null,
  rubric jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);
alter table public.assessment_answer_keys enable row level security;

create table if not exists public.enrollments (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  status text default 'active'::text not null,
  enrolled_at timestamptz default now() not null
);
alter table public.enrollments enable row level security;

create table if not exists public.assessment_attempts (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  assessment_id uuid not null,
  attempt_number integer not null,
  status text default 'started'::text not null,
  started_at_client timestamptz,
  started_at_server timestamptz default now() not null,
  last_saved_at_server timestamptz default now() not null,
  submitted_at_client timestamptz,
  submitted_at_server timestamptz,
  score numeric,
  score_status text default 'pending'::text not null,
  result_metadata jsonb default '{}'::jsonb not null
);
alter table public.assessment_attempts enable row level security;

create table if not exists public.assessment_responses (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  attempt_id uuid not null,
  item_id uuid not null,
  response_value jsonb not null,
  revision_number integer default 1 not null,
  changed_at_client timestamptz,
  changed_at_server timestamptz default now() not null,
  support_level text default 'independent'::text not null,
  is_final boolean default false not null
);
alter table public.assessment_responses enable row level security;

create table if not exists public.learning_events (
  id uuid default gen_random_uuid() not null primary key,
  event_id uuid not null,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  session_id text not null,
  lesson_id uuid,
  attempt_id uuid,
  event_seq integer not null,
  event_type text not null,
  event_version text default '1'::text not null,
  scene_id text,
  item_id uuid,
  occurred_at_client timestamptz not null,
  server_received_at timestamptz default now() not null,
  client_monotonic_ms bigint,
  support_level text,
  payload jsonb default '{}'::jsonb not null,
  delivery_attempt integer default 1 not null,
  validation_status text default 'accepted'::text not null,
  app_version text not null
);
alter table public.learning_events enable row level security;

create table if not exists public.lesson_progress (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  lesson_id uuid not null,
  status text default 'not_started'::text not null,
  current_step text,
  started_at_client timestamptz,
  started_at_server timestamptz default now() not null,
  last_active_at_server timestamptz default now() not null,
  completed_at_client timestamptz,
  completed_at_server timestamptz,
  content_version text not null,
  progress_metadata jsonb default '{}'::jsonb not null
);
alter table public.lesson_progress enable row level security;

create table if not exists public.accommodation_profiles (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  scholar_id uuid not null,
  code text not null,
  score_policy text default 'context_only'::text not null,
  active boolean default true not null,
  settings jsonb default '{}'::jsonb not null,
  created_by uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.accommodation_profiles enable row level security;

create table if not exists public.confidence_results (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  result_type text default 'evidence_band'::text not null,
  band text not null,
  score numeric,
  abstained boolean default false not null,
  abstention_reason text,
  derivation_version text not null,
  signal_snapshot jsonb default '{}'::jsonb not null,
  generated_at timestamptz default now() not null
);
alter table public.confidence_results enable row level security;

create table if not exists public.audit_events (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid,
  actor_user_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  occurred_at timestamptz default now() not null
);
alter table public.audit_events enable row level security;

create table if not exists public.program_memberships (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  user_id uuid not null,
  role text not null,
  status text default 'active'::text not null,
  created_at timestamptz default now() not null
);
alter table public.program_memberships enable row level security;

create table if not exists public.scholar_access_codes (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  code_hash text not null,
  expires_at timestamptz,
  max_redemptions integer default 1 not null,
  redemption_count integer default 0 not null,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz default now() not null
);
alter table public.scholar_access_codes enable row level security;

create table if not exists public.staff_allowlist (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  email text not null,
  role text default 'admin'::text not null,
  active boolean default true not null,
  created_at timestamptz default now() not null
);
alter table public.staff_allowlist enable row level security;

create table if not exists public.teacher_judgments (
  id uuid default gen_random_uuid() not null primary key,
  program_id uuid not null,
  cohort_id uuid not null,
  scholar_id uuid not null,
  lesson_id uuid,
  attempt_id uuid,
  teacher_user_id uuid not null,
  judgment text not null,
  model_version text,
  note_code text,
  judged_at timestamptz default now() not null,
  judgment_key text
);
alter table public.teacher_judgments enable row level security;

-- Exported from the connected D2D Supabase project on 2026-09-26.
create schema if not exists app;

create or replace function app.has_program_role(p_program_id uuid, p_roles text[]) returns boolean language sql stable security definer set search_path to 'public','app' as $$ select exists (select 1 from public.program_memberships pm where pm.program_id=p_program_id and pm.user_id=auth.uid() and pm.status='active' and pm.role=any(p_roles)); $$;
create or replace function app.is_enrolled_scholar(p_program_id uuid) returns boolean language sql stable security definer set search_path to 'public','app' as $$ select exists (select 1 from public.enrollments e join public.scholars s on s.id=e.scholar_id where e.program_id=p_program_id and s.auth_user_id=auth.uid() and e.status in ('active','completed')); $$;
create or replace function app.is_own_scholar(p_scholar_id uuid) returns boolean language sql stable security definer set search_path to 'public','app' as $$ select exists (select 1 from public.scholars s where s.id=p_scholar_id and s.auth_user_id=auth.uid() and s.status='active'); $$;
create or replace function app.is_program_member(p_program_id uuid) returns boolean language sql stable security definer set search_path to 'public','app' as $$ select app.has_program_role(p_program_id,array['admin','instructor','researcher','viewer']::text[]); $$;
create or replace function app.touch_updated_at() returns trigger language plpgsql set search_path to 'public','app' as $$ begin new.updated_at=now(); return new; end; $$;
create or replace function app.log_sensitive_write() returns trigger language plpgsql security definer set search_path to 'public','app' as $$ declare affected_id uuid; affected_program_id uuid; begin if tg_op='DELETE' then affected_id:=old.id; affected_program_id:=old.program_id; else affected_id:=new.id; affected_program_id:=new.program_id; end if; insert into public.audit_events(program_id,actor_user_id,action,resource_type,resource_id,metadata) values(affected_program_id,auth.uid(),lower(tg_op),tg_table_name,affected_id,jsonb_build_object('triggered_at',now())); return coalesce(new,old); end; $$;
create or replace function app.redeem_access_code(p_code_hash text, p_auth_user_id uuid) returns table(program_id uuid, cohort_id uuid, scholar_id uuid, pseudonym text) language plpgsql security definer set search_path to 'public','app' as $$ declare v_code public.scholar_access_codes%rowtype; v_scholar public.scholars%rowtype; begin if p_code_hash is null or length(p_code_hash)<>64 or p_auth_user_id is null then raise exception 'invalid_redemption_request' using errcode='22023'; end if; select * into v_code from public.scholar_access_codes where code_hash=p_code_hash and revoked_at is null and (expires_at is null or expires_at>now()) and redemption_count<max_redemptions order by created_at desc limit 1 for update; if not found then raise exception 'invalid_or_expired_code' using errcode='P0002'; end if; select * into v_scholar from public.scholars where id=v_code.scholar_id for update; if not found then raise exception 'scholar_not_found' using errcode='P0002'; end if; if v_scholar.auth_user_id is not null and v_scholar.auth_user_id<>p_auth_user_id then raise exception 'code_already_bound' using errcode='42501'; end if; update public.scholar_access_codes set redemption_count=redemption_count+1 where id=v_code.id; update public.scholars set auth_user_id=p_auth_user_id,updated_at=now() where id=v_scholar.id; return query select v_code.program_id,v_code.cohort_id,v_scholar.id,v_scholar.pseudonym; end; $$;

-- D2D RLS policy export. All public pilot tables have RLS enabled in schema.sql.
-- Helper predicates are defined in app-functions.sql.
create policy attempts_self_insert on public.assessment_attempts for insert to public with check (app.is_own_scholar(scholar_id));
create policy attempts_self_select on public.assessment_attempts for select to public using (app.is_own_scholar(scholar_id));
create policy attempts_staff_select on public.assessment_attempts for select to public using (app.is_program_member(program_id));
create policy responses_self_insert on public.assessment_responses for insert to public with check (app.is_own_scholar(scholar_id));
create policy responses_self_select on public.assessment_responses for select to public using (app.is_own_scholar(scholar_id));
create policy responses_self_update on public.assessment_responses for update to public using (app.is_own_scholar(scholar_id)) with check (app.is_own_scholar(scholar_id));
create policy events_self_insert on public.learning_events for insert to public with check (app.is_own_scholar(scholar_id));
create policy events_staff_select on public.learning_events for select to public using (app.is_program_member(program_id));
create policy confidence_self_select on public.confidence_results for select to public using (app.is_own_scholar(scholar_id));
create policy confidence_staff_select on public.confidence_results for select to public using (app.is_program_member(program_id));
create policy scholars_self_select on public.scholars for select to public using (auth.uid() = auth_user_id);
create policy scholars_staff_select on public.scholars for select to public using (app.is_program_member(program_id));
create policy answer_keys_staff_select on public.assessment_answer_keys for select to public using (app.has_program_role(program_id, array['admin','instructor','researcher']::text[]));
create policy staff_allowlist_no_client_read on public.staff_allowlist for select to public using (false);
create policy redemption_rate_limits_no_client_access on public.redemption_rate_limits for all to public using (false) with check (false);
create policy score_configurations_no_client_access on public.score_configurations for all to public using (false) with check (false);
create policy judgments_staff_insert on public.teacher_judgments for insert to public with check (app.has_program_role(program_id,array['admin','instructor']::text[]) and teacher_user_id=auth.uid());
create policy judgments_staff_select on public.teacher_judgments for select to public using (app.is_program_member(program_id));
create policy judgments_staff_update on public.teacher_judgments for update to public using (teacher_user_id=auth.uid()) with check (teacher_user_id=auth.uid());

-- The remaining program/cohort/content policies are intentionally kept in the
-- connector-applied migration history and are validated by security-boundary.sql.
