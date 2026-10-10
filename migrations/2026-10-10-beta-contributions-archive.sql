-- Keep beta feedback/reviews anonymously after account deletion unless the user opts out.
-- Re-runnable. Copied from supabase-setup.sql, which stays the source of truth.

-- Anonymous archive of beta contributions (founder decision 2026-10-10). On account
-- deletion, unless the user ticks "delete my feedback and reviews too", the server
-- copies feedback, closing answers and the website review here without the account
-- id, school code, screenshots, coordinates or admin notes; the originals then go
-- with the account cascade. Free text may still mention the writer: treat the
-- archive as minimised, not as guaranteed anonymous. No client policy.
create table if not exists public.beta_contributions_archive (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('feedback','closing','review')),
  content jsonb not null,
  created_on date,
  archived_at timestamptz not null default now()
);
alter table public.beta_contributions_archive enable row level security;
create or replace function public.archive_beta_contributions(p_user_id uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer := 0; v_rows integer;
begin
  insert into public.beta_contributions_archive(kind, content, created_on)
  select 'feedback', jsonb_strip_nulls(jsonb_build_object('type', f.type, 'kind', f.kind, 'page_url', f.page_url,
    'message', f.message, 'selector', f.selector, 'element_text', f.element_text,
    'text_before', f.text_before, 'text_after', f.text_after, 'status', f.status)), f.created_at::date
  from public.beta_feedback f where f.user_id = p_user_id;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  insert into public.beta_contributions_archive(kind, content, created_on)
  select 'closing', c.answers, c.created_at::date from public.beta_closing_answers c where c.user_id = p_user_id;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  insert into public.beta_contributions_archive(kind, content, created_on)
  select 'review', jsonb_strip_nulls(jsonb_build_object('stars', r.stars, 'body', r.body, 'consent_publish', r.consent_publish,
    'consent_text_version', r.consent_text_version, 'consent_at', r.consent_at, 'age_group', r.age_group,
    'selected_by_admin', r.selected_by_admin)), r.created_at::date
  from public.beta_reviews r where r.user_id = p_user_id;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  return v_count;
end;
$$;
revoke all on function public.archive_beta_contributions(uuid) from public, anon, authenticated;
grant execute on function public.archive_beta_contributions(uuid) to service_role;

-- Verify: should return 1 row.
-- select proname from pg_proc where proname = 'archive_beta_contributions';
