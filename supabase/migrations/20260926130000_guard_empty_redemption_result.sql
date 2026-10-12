-- Defense-in-depth: never let an empty redemption result bypass the rate limiter.
--
-- app.redeem_access_code currently RAISES on every failure path (invalid_or_expired_code,
-- scholar_not_found, code_already_bound, invalid_redemption_request), so the wrapper's
-- exception handler already records a rate-limit failure for each bad attempt -- this is
-- NOT an exploitable bypass today. The wrapper's success path, however, trusts that any
-- non-raising call returned a bound scholar row. If a future change to app.redeem_access_code
-- ever returned an empty row instead of raising, the wrapper would fall through to 'ok' with
-- null ids and record NO failure -- silently reopening the brute-force path this ledger closes.
--
-- Treat a null program/cohort/scholar id from a non-raising call as a failed attempt: record
-- the rate-limit failure and return 'redemption_failed'. Only the guard block is new; the rest
-- of the function is unchanged. create-or-replace preserves the existing execute grants
-- (service_role only, set in 20260926091500_expose_rate_limit_wrappers.sql).
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
  -- Guard: a non-raising call that did not bind a scholar is still a failed attempt.
  -- (Only reached when no exception was raised, so v_result was assigned by SELECT INTO.)
  if v_error is null and (v_result.program_id is null or v_result.cohort_id is null or v_result.scholar_id is null) then
    v_error := 'redemption_failed';
  end if;
  if v_error is not null then
    perform app.record_rate_limit_failure(p_session_key_hash,p_ip_key_hash,p_max_failures,p_window_seconds);
    return query select v_error,0,null::uuid,null::uuid,null::uuid,null::text;
    return;
  end if;
  return query select 'ok',0,v_result.program_id,v_result.cohort_id,v_result.scholar_id,v_result.pseudonym;
end;
$$;
