-- D2D auth hardening: anonymous students may access only scholar-scoped content.
-- Staff/program membership helpers must never treat an anonymous Auth session as staff.
-- This preserves the pilot's anonymous student flow while preventing staff-side reads/writes.

create or replace function app.has_program_role(p_program_id uuid, p_roles text[])
returns boolean
language sql
stable security definer
set search_path = public, app
as $$
  select case
    when coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then false
    else exists (
      select 1 from public.program_memberships pm
      where pm.program_id = p_program_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
        and pm.role = any(p_roles)
    )
  end;
$$;

create or replace function app.is_program_member(p_program_id uuid)
returns boolean
language sql
stable security definer
set search_path = public, app
as $$
  select case
    when coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then false
    else app.has_program_role(p_program_id, array['admin','instructor','researcher','viewer']::text[])
  end;
$$;
