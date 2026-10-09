-- Historical beta round 3 excerpt — 2026-10-08, for an existing installation.
-- Compare with the current canonical schema and verify in a disposable database
-- before any reviewed live migration. This is not the complete latest schema.
-- 1) Fixes record_beta_events (it failed on every signed-in batch, so the
--    "Co vyzkoušet" checklist never ticked).
-- 2) submit_beta_micro = the 10-second quick rating; stores feedback but does
--    NOT renew beta access.
-- 3) decision_profile.jpz_expected_gain (Přihláška: expected extra points).
-- Function text matches supabase-setup.sql on 2026-10-10. That comparison does
-- not prove live bodies/grants; existing function privileges must be verified.

alter table public.decision_profile add column if not exists jpz_expected_gain smallint
  check (jpz_expected_gain between 0 and 100);

create or replace function public.record_beta_events(
  p_user_id uuid, p_anon_id text, p_session_id text, p_events jsonb, p_join boolean
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
-- v_ prefix: a bare `checklist` collides with beta_profile.checklist, and
-- qualifying it with the function name is invalid here (42P01 on every
-- signed-in batch, which is why no checklist box ever ticked before 2026-10-08).
declare v_checklist jsonb; v_event jsonb; v_key text; v_events jsonb := p_events;
begin
  if p_user_id is not null then
    perform 1 from public.users where id = p_user_id and subscription_status = 'beta' for update;
    if not found then raise exception 'Beta account required.' using errcode = '42501'; end if;
    select p.checklist into v_checklist from public.beta_profile p where p.user_id = p_user_id and p.consent_tracking_at is not null for update;
    if not found then raise exception 'Beta profile missing.' using errcode = '42501'; end if;
    v_checklist := coalesce(v_checklist, '{}'::jsonb);
    if p_join then
      select v_events || coalesce(jsonb_agg(jsonb_build_object('name',e.name,'props',e.props)), '[]'::jsonb)
        into v_events from public.beta_events e where e.anon_id = p_anon_id and e.user_id is null;
      update public.beta_events set user_id = p_user_id where anon_id = p_anon_id and user_id is null;
    end if;
  end if;
  insert into public.beta_events(user_id,anon_id,session_id,name,path,props)
  select p_user_id,p_anon_id,p_session_id,value->>'name',value->>'path',value->'props' from jsonb_array_elements(p_events);
  if p_user_id is null then return; end if;
  for v_event in select value from jsonb_array_elements(v_events) loop
    v_key := case v_event->>'name'
      when 'q_finish' then 'dotaznik' when 'result_view' then 'dotaznik'
      when 'search' then case when coalesce((v_event->'props'->>'length')::numeric,0)>0 then 'vyhledavani' else null end when 'compare_open' then 'porovnani'
      when 'matrix_weight' then 'matice' when 'prihlaska_pick' then 'prihlaska'
      when 'theme_change' then 'tema' when 'share_create' then 'sdileni' else null end;
    if v_key is not null then v_checklist := jsonb_set(v_checklist, array[v_key], 'true'::jsonb); end if;
    if v_event->>'name' = 'school_open' and v_event->'props'->'id' is not null then
      v_checklist := jsonb_set(v_checklist, '{school_ids}', (select jsonb_agg(distinct value) from jsonb_array_elements(
        coalesce(v_checklist->'school_ids','[]'::jsonb) || jsonb_build_array(v_event->'props'->'id'))));
      v_checklist := jsonb_set(v_checklist, '{detail}', to_jsonb(jsonb_array_length(v_checklist->'school_ids') >= 3));
    end if;
    if v_event->>'name' = 'paywall_view' then
      v_checklist := jsonb_set(v_checklist, '{paywall_screens}', (select jsonb_agg(distinct value) from jsonb_array_elements(
        coalesce(v_checklist->'paywall_screens','[]'::jsonb) || jsonb_build_array(v_event->'props'->'screen'))));
      v_checklist := jsonb_set(v_checklist, '{platby}', to_jsonb(v_checklist->'paywall_screens' @> '["hodnota","cesta","plan","zkusebni","platba"]'::jsonb));
    end if;
  end loop;
  if v_checklist @> '{"dotaznik":true,"detail":true}'::jsonb and
    (v_checklist @> '{"porovnani":true}'::jsonb or v_checklist @> '{"matice":true}'::jsonb) and not v_checklist ? 'core_completed_at' then
    v_checklist := jsonb_set(v_checklist,'{core_completed_at}',to_jsonb(clock_timestamp()));
  end if;
  update public.beta_profile set checklist = v_checklist where user_id = p_user_id;
end;
$$;

create or replace function public.submit_beta_micro(
  p_user_id uuid, p_id text, p_session text, p_action text, p_answer text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare state jsonb; checks jsonb; v_school text;
begin
  select u.tester_school_code into v_school from public.users u join auth.users a on a.id=u.id
    where u.id=p_user_id and u.subscription_status='beta' and a.email_confirmed_at is not null for update of u;
  if not found then raise exception 'Beta required.' using errcode='42501'; end if;
  if not exists(select 1 from public.beta_program_settings where singleton and ends_at>clock_timestamp()) then
    raise exception 'Program ended.' using errcode='55000'; end if;
  select micro_asked, checklist into state, checks from public.beta_profile where user_id=p_user_id for update;
  if not found or p_id not in ('dotaznik','vyhledavani','detail','porovnani','matice','prihlaska','tema','platby')
    or p_action not in ('answer','skip') then
    raise exception 'Micro invalid.' using errcode='22023'; end if;
  state := coalesce(state,'{}'::jsonb);
  if state->p_id->>'done'='true' then raise exception 'Already answered.' using errcode='23505'; end if;
  if not coalesce((checks->>p_id)::boolean,false) then raise exception 'Feature not tried.' using errcode='22023'; end if;
  if p_action='answer' then
    if char_length(btrim(coalesce(p_answer,''))) not between 1 and 1500 then
      raise exception 'Answer required.' using errcode='22023'; end if;
    insert into public.beta_feedback(user_id, school_code, type, page_url, message, kind, source)
    values (p_user_id, v_school, 'comment', '/beta/rychle/'||p_id, 'Rychlé hodnocení · '||p_id||' · '||btrim(p_answer), 'obecne', 'micro');
  end if;
  state := jsonb_set(state,array[p_id],jsonb_build_object('done',true,'skipped',p_action='skip','at',clock_timestamp()));
  update public.beta_profile set micro_asked=state where user_id=p_user_id;
  return jsonb_build_object('micro_asked',state);
end;
$$;

-- Verify (should return: true | true | true):
select
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='decision_profile' and column_name='jpz_expected_gain') as has_gain_column,
  pg_get_functiondef('public.record_beta_events(uuid,text,text,jsonb,boolean)'::regprocedure) like '%v_checklist%' as events_fixed,
  pg_get_functiondef('public.submit_beta_micro(uuid,text,text,text,text)'::regprocedure) like '%Rychlé hodnocení%' as quick_rating;
