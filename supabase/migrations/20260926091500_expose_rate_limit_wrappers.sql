-- Expose only service-role wrappers; the underlying app functions remain private.
create or replace function public.rate_limit_status(p_session_key_hash text, p_ip_key_hash text, p_max_failures integer default 3, p_window_seconds integer default 900)
returns table(allowed boolean, retry_after_seconds integer)
language sql security definer set search_path to 'public','app'
as $$ select * from app.rate_limit_status(p_session_key_hash, p_ip_key_hash, p_max_failures, p_window_seconds); $$;

create or replace function public.record_rate_limit_failure(p_session_key_hash text, p_ip_key_hash text, p_max_failures integer default 3, p_window_seconds integer default 900)
returns void
language sql security definer set search_path to 'public','app'
as $$ select app.record_rate_limit_failure(p_session_key_hash, p_ip_key_hash, p_max_failures, p_window_seconds); $$;

revoke all on function public.rate_limit_status(text,text,integer,integer) from public;
revoke all on function public.record_rate_limit_failure(text,text,integer,integer) from public;
grant execute on function public.rate_limit_status(text,text,integer,integer) to service_role;
grant execute on function public.record_rate_limit_failure(text,text,integer,integer) to service_role;
