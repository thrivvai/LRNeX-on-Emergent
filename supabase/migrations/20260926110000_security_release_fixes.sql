-- D2D release fixes: atomic redemption, immutable configuration, reproducible results.

-- The app schema function is an internal implementation detail. Only the
-- service-role Edge Function may call it; the public atomic wrapper below is
-- the only redemption entry point for the pilot.
revoke all on function app.redeem_access_code(text, uuid) from public;
grant execute on function app.redeem_access_code(text, uuid) to service_role;

create or replace function app.redeem_access_code(p_code_hash text, p_auth_user_id uuid)
returns table(program_id uuid, cohort_id uuid, scholar_id uuid, pseudonym text)
language plpgsql security definer set search_path to 'public','app'
as $$
declare
  v_code public.scholar_access_codes%rowtype;
  v_scholar public.scholars%rowtype;
begin
  if p_code_hash is null or length(p_code_hash) <> 64 or p_auth_user_id is null then
    raise exception 'invalid_redemption_request' using errcode='22023';
  end if;
  -- When called with a user JWT, never permit the caller to bind another user.
  -- The service-role Edge Function has no auth.uid() and passes the verified ID.
  if auth.uid() is not null and auth.uid() <> p_auth_user_id then
    raise exception 'redemption_identity_mismatch' using errcode='42501';
  end if;
  select * into v_code from public.scholar_access_codes
   where code_hash=p_code_hash and revoked_at is null
     and (expires_at is null or expires_at>now())
     and redemption_count<max_redemptions
   order by created_at desc limit 1 for update;
  if not found then raise exception 'invalid_or_expired_code' using errcode='P0002'; end if;
  select * into v_scholar from public.scholars where id=v_code.scholar_id for update;
  if not found then raise exception 'scholar_not_found' using errcode='P0002'; end if;
  if v_scholar.auth_user_id is not null and v_scholar.auth_user_id<>p_auth_user_id then raise exception 'code_already_bound' using errcode='42501'; end if;
  update public.scholar_access_codes set redemption_count=redemption_count+1 where id=v_code.id;
  update public.scholars set auth_user_id=p_auth_user_id,updated_at=now() where id=v_scholar.id;
  return query select v_code.program_id,v_code.cohort_id,v_scholar.id,v_scholar.pseudonym;
end;
$$;

-- One transaction owns admission, failed-attempt recording, and redemption.
-- This prevents concurrent guesses from all passing a separate status check.
create or replace function public.redeem_access_code_rate_limited(
  p_code_hash text,
  p_auth_user_id uuid,
  p_session_key_hash text,
  p_ip_key_hash text,
  p_max_failures integer default 3,
  p_window_seconds integer default 900
)
returns table(status text, retry_after_seconds integer, program_id uuid, cohort_id uuid, scholar_id uuid, pseudonym text)
language plpgsql security definer set search_path to 'public','app'
as $$
declare
  v_allowed boolean;
  v_retry integer;
  v_error text;
  v_result record;
begin
  select rl.allowed,rl.retry_after_seconds into v_allowed,v_retry
    from app.rate_limit_status(p_session_key_hash,p_ip_key_hash,p_max_failures,p_window_seconds) as rl;
  if not v_allowed then
    return query select 'too_many_attempts',v_retry,null::uuid,null::uuid,null::uuid,null::text;
    return;
  end if;
  if p_code_hash is null then
    perform app.record_rate_limit_failure(p_session_key_hash,p_ip_key_hash,p_max_failures,p_window_seconds);
    return query select 'invalid_code_format',0,null::uuid,null::uuid,null::uuid,null::text;
    return;
  end if;
  begin
    select * into v_result from app.redeem_access_code(p_code_hash,p_auth_user_id);
  exception when others then
    v_error := case when sqlerrm in ('invalid_or_expired_code','code_already_bound','scholar_not_found') then sqlerrm else 'redemption_failed' end;
  end;
  if v_error is not null then
    perform app.record_rate_limit_failure(p_session_key_hash,p_ip_key_hash,p_max_failures,p_window_seconds);
    return query select v_error,0,null::uuid,null::uuid,null::uuid,null::text;
    return;
  end if;
  return query select 'ok',0,v_result.program_id,v_result.cohort_id,v_result.scholar_id,v_result.pseudonym;
end;
$$;
revoke all on function public.redeem_access_code_rate_limited(text,uuid,text,text,integer,integer) from public;
grant execute on function public.redeem_access_code_rate_limited(text,uuid,text,text,integer,integer) to service_role;

-- Existing configuration versions cannot be rewritten. Create a new version
-- for any material scoring change.
create or replace function app.prevent_score_configuration_mutation()
returns trigger language plpgsql set search_path to 'public','app' as $$
begin
  if new.program_id <> old.program_id or new.version <> old.version
     or new.score_scale_max <> old.score_scale_max or new.thresholds <> old.thresholds
     or new.bands <> old.bands or new.minimum_scored_items <> old.minimum_scored_items then
    raise exception 'score_configuration_version_immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists score_configuration_immutable on public.score_configurations;
create trigger score_configuration_immutable before update on public.score_configurations
for each row execute function app.prevent_score_configuration_mutation();

create or replace function app.validate_score_configuration()
returns trigger language plpgsql set search_path to 'public','app' as $$
declare
  building numeric := (new.thresholds->>'building')::numeric;
  secure numeric := (new.thresholds->>'secure')::numeric;
begin
  if building < 0 or secure <= building or secure > new.score_scale_max then
    raise exception 'invalid_score_thresholds';
  end if;
  return new;
exception when invalid_text_representation then
  raise exception 'invalid_score_thresholds';
end;
$$;
drop trigger if exists score_configuration_valid on public.score_configurations;
create trigger score_configuration_valid before insert or update on public.score_configurations
for each row execute function app.validate_score_configuration();

alter table public.confidence_results add column if not exists config_snapshot jsonb;
alter table public.confidence_results add column if not exists config_snapshot_hash text;
alter table public.confidence_results add column if not exists answer_key_snapshot_hash text;
