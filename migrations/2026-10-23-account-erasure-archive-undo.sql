-- Paid-launch chunk 8: a failed account deletion can remove its own archive copy.
-- Apply after migrations/2026-10-10-beta-contributions-archive.sql.

-- Returns the ids it created so a failed account deletion can take its own copy
-- back out (remove_beta_archive_rows) instead of leaving a duplicate for the retry.
drop function if exists public.archive_beta_contributions(uuid);
create function public.archive_beta_contributions(p_user_id uuid)
returns bigint[] language plpgsql security definer set search_path = public, pg_temp as $$
declare v_ids bigint[] := '{}'; v_new bigint[];
begin
  with ins as (
    insert into public.beta_contributions_archive(kind, content, created_on)
    select 'feedback', jsonb_strip_nulls(jsonb_build_object('type', f.type, 'kind', f.kind, 'page_url', f.page_url,
      'message', f.message, 'selector', f.selector, 'element_text', f.element_text,
      'text_before', f.text_before, 'text_after', f.text_after, 'status', f.status)), f.created_at::date
    from public.beta_feedback f where f.user_id = p_user_id
    returning id
  ) select coalesce(array_agg(id), '{}') into v_new from ins;
  v_ids := v_ids || v_new;
  with ins as (
    insert into public.beta_contributions_archive(kind, content, created_on)
    select 'closing', c.answers, c.created_at::date from public.beta_closing_answers c where c.user_id = p_user_id
    returning id
  ) select coalesce(array_agg(id), '{}') into v_new from ins;
  v_ids := v_ids || v_new;
  with ins as (
    insert into public.beta_contributions_archive(kind, content, created_on)
    select 'review', jsonb_strip_nulls(jsonb_build_object('stars', r.stars, 'body', r.body, 'consent_publish', r.consent_publish,
      'consent_text_version', r.consent_text_version, 'consent_at', r.consent_at, 'age_group', r.age_group,
      'selected_by_admin', r.selected_by_admin)), r.created_at::date
    from public.beta_reviews r where r.user_id = p_user_id
    returning id
  ) select coalesce(array_agg(id), '{}') into v_new from ins;
  return v_ids || v_new;
end;
$$;
revoke all on function public.archive_beta_contributions(uuid) from public, anon, authenticated;
grant execute on function public.archive_beta_contributions(uuid) to service_role;
create or replace function public.remove_beta_archive_rows(p_ids bigint[])
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rows integer;
begin
  delete from public.beta_contributions_archive where id = any(coalesce(p_ids, '{}'));
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke all on function public.remove_beta_archive_rows(bigint[]) from public, anon, authenticated;
grant execute on function public.remove_beta_archive_rows(bigint[]) to service_role;

-- Verify after applying (expected: both functions exist; clients cannot call them).
select to_regprocedure('public.archive_beta_contributions(uuid)') is not null as archive_exists,
  to_regprocedure('public.remove_beta_archive_rows(bigint[])') is not null as undo_exists,
  has_function_privilege('authenticated', 'public.remove_beta_archive_rows(bigint[])', 'execute') as client_can_call;
