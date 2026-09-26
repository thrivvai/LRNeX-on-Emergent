-- D2D telemetry reliability sprint
-- Adds idempotent client revision/event keys and protects the raw event stream.

alter table public.assessment_responses
  add column if not exists client_revision_id uuid default gen_random_uuid();

update public.assessment_responses
set client_revision_id = gen_random_uuid()
where client_revision_id is null;

alter table public.assessment_responses
  alter column client_revision_id set not null;

create unique index if not exists assessment_responses_client_revision_key
  on public.assessment_responses(client_revision_id);

create index if not exists assessment_responses_attempt_item_revision_idx
  on public.assessment_responses(attempt_id, item_id, revision_number);

create unique index if not exists learning_events_event_id_key
  on public.learning_events(event_id);

create index if not exists learning_events_session_sequence_idx
  on public.learning_events(session_id, event_seq);

create index if not exists learning_events_attempt_item_time_idx
  on public.learning_events(attempt_id, item_id, occurred_at_client);

create or replace function app.prevent_learning_event_mutation()
returns trigger
language plpgsql
set search_path to 'public', 'app'
as $$
begin
  raise exception 'learning_events_are_append_only';
end;
$$;

drop trigger if exists learning_events_append_only on public.learning_events;
create trigger learning_events_append_only
before update or delete on public.learning_events
for each row execute function app.prevent_learning_event_mutation();

comment on column public.assessment_responses.client_revision_id is
  'Client-generated idempotency key for one immutable answer revision.';
comment on table public.learning_events is
  'Append-only raw research telemetry. Derived intervals must be recomputable from this stream.';
