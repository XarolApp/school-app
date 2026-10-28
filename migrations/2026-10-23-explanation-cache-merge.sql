-- Paid-launch chunk 6: cache one on-demand explanation without overwriting the others.

create or replace function public.cache_questionnaire_reason(
  p_user_id uuid, p_run_id bigint, p_school_id text, p_answers jsonb, p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_run_id is null or p_answers is null
     or p_school_id is null or p_school_id !~ '^[0-9]{1,15}$'
     or p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 2000 then
    return false;
  end if;
  -- One key merged into the stored map: two schools generated in parallel both
  -- stay cached. The answers must still be the ones the sentence was written
  -- for, so a re-score or consent withdrawal in between is never overwritten.
  update public.questionnaire_runs r
     set extra_reasons = coalesce(r.extra_reasons, '{}'::jsonb)
                         || jsonb_build_object(p_school_id, p_reason)
   where r.id = p_run_id
     and r.user_id = p_user_id
     and r.answers = p_answers;
  return found;
end;
$$;
revoke all on function public.cache_questionnaire_reason(uuid, bigint, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.cache_questionnaire_reason(uuid, bigint, text, jsonb, text) to service_role;

-- Verify after applying (expected: function exists, clients cannot call it).
select to_regprocedure('public.cache_questionnaire_reason(uuid, bigint, text, jsonb, text)') is not null as function_exists,
  has_function_privilege('authenticated', 'public.cache_questionnaire_reason(uuid, bigint, text, jsonb, text)', 'execute') as client_can_call;
