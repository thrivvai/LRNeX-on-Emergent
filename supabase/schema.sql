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
