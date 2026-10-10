-- Adds the "dotaz" feedback kind. Re-runnable; copied from supabase-setup.sql.
alter table public.beta_feedback drop constraint if exists beta_feedback_kind_check;
alter table public.beta_feedback add constraint beta_feedback_kind_check check (kind in ('bug','navrh','funkce','text','neprehledne','chvala','dotaz','obecne'));

create or replace function public.submit_beta_feedback_details(
  p_user_id uuid, p_type text, p_page_url text, p_message text, p_details jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if p_details is null or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 12000
    or coalesce(p_details ->> 'kind', 'obecne') not in ('bug','navrh','funkce','text','neprehledne','chvala','dotaz','obecne')
    or coalesce(p_details ->> 'source', 'button') not in ('button','micro','gate')
    or (p_details ->> 'source' = 'gate' and char_length(btrim(p_message)) < 20) then
    raise exception 'Feedback metadata is invalid.' using errcode = '22023';
  end if;
  result := public.submit_beta_feedback(p_user_id, p_type, p_page_url, p_message);
  update public.beta_feedback set
    kind = coalesce(p_details ->> 'kind', 'obecne'),
    source = coalesce(p_details ->> 'source', 'button'),
    selector = left(p_details ->> 'selector', 512),
    element_text = left(p_details ->> 'element_text', 120),
    rect = p_details -> 'rect', viewport = p_details -> 'viewport',
    screenshot_path = p_details ->> 'screenshot_path',
    text_before = left(p_details ->> 'text_before', 2000),
    text_after = left(p_details ->> 'text_after', 2000)
  where id = (result ->> 'id')::bigint;
  return result;
end;
$$;
