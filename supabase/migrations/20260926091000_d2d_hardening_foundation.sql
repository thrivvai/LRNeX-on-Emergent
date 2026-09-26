-- D2D hardening foundation
-- Issues: #7, #9, #10
-- This migration is intentionally additive. The original live schema migrations are
-- captured separately in 20260926090000_d2d_pilot_baseline.sql.

create schema if not exists app;

create table if not exists public.redemption_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('session', 'ip')),
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, key_hash)
);

alter table public.redemption_rate_limits enable row level security;
create policy redemption_rate_limits_no_client_access
  on public.redemption_rate_limits for all to public
  using (false) with check (false);

create table if not exists public.score_configurations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  version text not null,
  score_scale_max numeric not null default 100 check (score_scale_max > 0),
  thresholds jsonb not null default '{"building":50,"secure":80}'::jsonb,
  bands jsonb not null default '{"emerging":"emerging","building":"building","secure":"secure","insufficient":"insufficient_data","abstained":"abstained"}'::jsonb,
  minimum_scored_items integer not null default 1 check (minimum_scored_items >= 1),
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (program_id, version)
);

create unique index if not exists score_configurations_one_active_per_program
  on public.score_configurations(program_id) where active;

alter table public.score_configurations enable row level security;
create policy score_configurations_no_client_access
  on public.score_configurations for all to public
  using (false) with check (false);

alter table public.confidence_results
  add column if not exists source_attempt_id uuid references public.assessment_attempts(id) on delete set null;

create unique index if not exists confidence_results_attempt_derivation_key
  on public.confidence_results(source_attempt_id, derivation_version)
  where source_attempt_id is not null;

create or replace function app.touch_rate_limit_updated_at()
returns trigger
language plpgsql
set search_path to 'public', 'app'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.rate_limit_status(
  p_session_key_hash text,
  p_ip_key_hash text,
  p_max_failures integer default 3,
  p_window_seconds integer default 900
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path to 'public', 'app'
as $$
declare
  v_now timestamptz := now();
  v_key text;
  v_row public.redemption_rate_limits%rowtype;
begin
  if p_max_failures < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_configuration' using errcode = '22023';
  end if;

  foreach v_key in array array[p_session_key_hash, p_ip_key_hash] loop
    if v_key is null or length(v_key) = 0 then
      continue;
    end if;
    select * into v_row
      from public.redemption_rate_limits
     where key_hash = v_key
     for update;
    if found and v_row.blocked_until is not null and v_row.blocked_until > v_now then
      return query select false, greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer);
      return;
    end if;
    if found and v_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now then
      update public.redemption_rate_limits
         set failed_attempts = 0, blocked_until = null, window_started_at = v_now, updated_at = v_now
       where id = v_row.id;
    end if;
  end loop;
  return query select true, 0;
end;
$$;

create or replace function app.record_rate_limit_failure(
  p_session_key_hash text,
  p_ip_key_hash text,
  p_max_failures integer default 3,
  p_window_seconds integer default 900
)
returns void
language plpgsql
security definer
set search_path to 'public', 'app'
as $$
declare
  v_now timestamptz := now();
  v_key text;
  v_scope text;
  v_row public.redemption_rate_limits%rowtype;
begin
  if p_max_failures < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_configuration' using errcode = '22023';
  end if;
  foreach v_key in array array[p_session_key_hash, p_ip_key_hash] loop
    if v_key is null or length(v_key) = 0 then
      continue;
    end if;
    v_scope := case when v_key = p_session_key_hash then 'session' else 'ip' end;
    insert into public.redemption_rate_limits(scope, key_hash, window_started_at, failed_attempts, last_attempt_at, updated_at)
    values (v_scope, v_key, v_now, 1, v_now, v_now)
    on conflict (scope, key_hash) do update
      set failed_attempts = case
            when public.redemption_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
            else public.redemption_rate_limits.failed_attempts + 1
          end,
          window_started_at = case
            when public.redemption_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
            else public.redemption_rate_limits.window_started_at
          end,
          blocked_until = case
            when public.redemption_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then null
            when public.redemption_rate_limits.failed_attempts + 1 >= p_max_failures then v_now + make_interval(secs => p_window_seconds)
            else public.redemption_rate_limits.blocked_until
          end,
          last_attempt_at = v_now,
          updated_at = v_now;
  end loop;
end;
$$;

revoke all on function app.rate_limit_status(text, text, integer, integer) from public;
revoke all on function app.record_rate_limit_failure(text, text, integer, integer) from public;
grant execute on function app.rate_limit_status(text, text, integer, integer) to service_role;
grant execute on function app.record_rate_limit_failure(text, text, integer, integer) to service_role;

create trigger redemption_rate_limits_touch_updated_at
before update on public.redemption_rate_limits
for each row execute function app.touch_rate_limit_updated_at();

insert into public.score_configurations(program_id, version, thresholds, bands, minimum_scored_items, active, notes)
values (
  '11111111-1111-4111-8111-111111111111'::uuid,
  'behavior-band-0',
  '{"building":50,"secure":80}'::jsonb,
  '{"emerging":"emerging","building":"building","secure":"secure","insufficient":"insufficient_data","abstained":"abstained"}'::jsonb,
  1,
  true,
  'Pilot prototype configuration. This is supporting context, not a final behavioral confidence definition.'
)
on conflict (program_id, version) do update set
  thresholds = excluded.thresholds,
  bands = excluded.bands,
  minimum_scored_items = excluded.minimum_scored_items,
  active = excluded.active,
  notes = excluded.notes;
