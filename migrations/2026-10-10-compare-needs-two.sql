-- Checklist "Porovnání" counts only when 2+ schools were being compared. Re-runnable.
-- Copied from supabase-setup.sql, which stays the source of truth.

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
    select p.checklist into v_checklist from public.beta_profile p where p.user_id = p_user_id and p.consent_tracking_at is not null and p.tracking_paused_at is null for update;
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
      when 'search' then case when coalesce((v_event->'props'->>'length')::numeric,0)>0 then 'vyhledavani' else null end when 'compare_open' then case when coalesce((v_event->'props'->>'count')::numeric,0)>=2 then 'porovnani' else null end
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
revoke all on function public.record_beta_events(uuid,text,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.record_beta_events(uuid,text,text,jsonb,boolean) to service_role;
