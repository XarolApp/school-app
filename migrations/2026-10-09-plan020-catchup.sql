-- Plan 020 catch-up: only the statements added to supabase-setup.sql since 92e5e0c.
-- Re-runnable. Copied verbatim from supabase-setup.sql; that file stays the source of truth.
begin;
alter table public.users add column if not exists gender text;
alter table public.users drop constraint if exists users_gender_check;
alter table public.users add constraint users_gender_check
  check (gender is null or gender in ('m', 'f'));
-- Explanations requested after the original run are cached by school id.
alter table public.questionnaire_runs
  add column if not exists extra_reasons jsonb not null default '{}'::jsonb;

alter table public.beta_feedback add column if not exists reply_read_at timestamptz;
alter table public.beta_reviews add column if not exists consent_text_version text;
alter table public.beta_reviews add column if not exists consent_at timestamptz;
-- The former checkbox did not describe the channels, shortening, or withdrawal
-- terms in version 2026-10-08. Require fresh consent before any old review can
-- be selected for publication under the expanded permission.
update public.beta_reviews
set consent_publish=false, consent_text_version=null, consent_at=null, selected_by_admin=false
where consent_publish and consent_text_version is distinct from '2026-10-08';
alter table public.ai_usage_log drop constraint if exists ai_usage_log_source_check;
alter table public.ai_usage_log add constraint ai_usage_log_source_check
  check (source in ('questionnaire','proscons','extract','explain'));
create or replace function public.submit_beta_closing(p_user_id uuid,p_answers jsonb,p_review jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.users u join auth.users a on a.id=u.id where u.id=p_user_id
    and u.subscription_status='beta' and a.email_confirmed_at is not null for update of u;
  if not found then raise exception 'Beta required.' using errcode='42501'; end if;
  if not exists(select 1 from public.beta_program_settings where singleton and ends_at>clock_timestamp()) then
    raise exception 'Program ended.' using errcode='55000'; end if;
  perform 1 from public.beta_profile where user_id=p_user_id and closing_done_at is null for update;
  if not found then raise exception 'Already completed.' using errcode='23505'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>24000 then
    raise exception 'Answers invalid.' using errcode='22023'; end if;
  insert into public.beta_closing_answers(user_id,answers) values(p_user_id,p_answers);
  if p_review is not null then
    if (p_review->>'consent_publish')::boolean and p_review->>'consent_text_version' is distinct from '2026-10-08' then
      raise exception 'Review consent version invalid.' using errcode='22023';
    end if;
    insert into public.beta_reviews(user_id,stars,body,consent_publish,consent_text_version,consent_at,display_label,age_group)
    values(p_user_id,(p_review->>'stars')::integer,p_review->>'body',(p_review->>'consent_publish')::boolean,
      case when (p_review->>'consent_publish')::boolean then p_review->>'consent_text_version' else null end,
      case when (p_review->>'consent_publish')::boolean then clock_timestamp() else null end,
      p_review->>'display_label',p_review->>'age_group')
    on conflict(user_id) do update set stars=excluded.stars,body=excluded.body,consent_publish=excluded.consent_publish,
      consent_text_version=excluded.consent_text_version,consent_at=excluded.consent_at,
      display_label=excluded.display_label,age_group=excluded.age_group,selected_by_admin=false,created_at=clock_timestamp();
  end if;
  update public.beta_profile set closing_done_at=clock_timestamp() where user_id=p_user_id;
end;
$$;
revoke all on function public.submit_beta_closing(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_beta_closing(uuid,jsonb,jsonb) to service_role;
create or replace function public.submit_beta_review(p_user_id uuid,p_review jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.users u join auth.users a on a.id=u.id where u.id=p_user_id
    and u.subscription_status='beta' and a.email_confirmed_at is not null for update of u;
  if not found then raise exception 'Beta required.' using errcode='42501'; end if;
  if not exists(select 1 from public.beta_program_settings where singleton and ends_at>clock_timestamp()) then
    raise exception 'Program ended.' using errcode='55000'; end if;
  perform 1 from public.beta_profile where user_id=p_user_id and consent_tracking_at is not null for update;
  if not found then raise exception 'Beta notice required.' using errcode='42501'; end if;
  if jsonb_typeof(p_review) is distinct from 'object'
    or (p_review->>'consent_publish')::boolean and p_review->>'consent_text_version' is distinct from '2026-10-08' then
    raise exception 'Review invalid.' using errcode='22023';
  end if;
  insert into public.beta_reviews(user_id,stars,body,consent_publish,consent_text_version,consent_at,display_label,age_group)
  values(p_user_id,(p_review->>'stars')::integer,p_review->>'body',(p_review->>'consent_publish')::boolean,
    case when (p_review->>'consent_publish')::boolean then p_review->>'consent_text_version' else null end,
    case when (p_review->>'consent_publish')::boolean then clock_timestamp() else null end,
    p_review->>'display_label',p_review->>'age_group')
  on conflict(user_id) do update set stars=excluded.stars,body=excluded.body,consent_publish=excluded.consent_publish,
    consent_text_version=excluded.consent_text_version,consent_at=excluded.consent_at,
    display_label=excluded.display_label,age_group=excluded.age_group,selected_by_admin=false,created_at=clock_timestamp();
end;
$$;
revoke all on function public.submit_beta_review(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_beta_review(uuid,jsonb) to service_role;
commit;
