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
