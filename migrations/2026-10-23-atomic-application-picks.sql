-- Paid-launch chunk 5: application picks are saved in one transaction.
-- A failed insert keeps the old list; concurrent saves queue per account;
-- picks on hidden schools survive a save.

create or replace function public.save_application_picks(p_user_id uuid, p_picks jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pick jsonb;
  sid bigint;
  v_kkov text;
  pos integer := 0;
  seen bigint[] := '{}';
begin
  if p_user_id is null or p_picks is null or jsonb_typeof(p_picks) <> 'array' then
    raise exception 'Invalid picks' using errcode = '22023', hint = 'INVALID_PICKS';
  end if;
  if jsonb_array_length(p_picks) > 3 then
    raise exception 'Too many picks' using errcode = '22023', hint = 'TOO_MANY_PICKS';
  end if;

  -- Two saves for one account queue here, so the stored list is always one
  -- complete request, never a mix of two.
  perform pg_advisory_xact_lock(hashtextextended('application_picks:' || p_user_id::text, 0));

  for pick in select value from jsonb_array_elements(p_picks) loop
    if jsonb_typeof(pick) <> 'object' or (pick ->> 'school_id') !~ '^[0-9]{1,15}$' then
      raise exception 'Invalid pick' using errcode = '22023', hint = 'INVALID_PICKS';
    end if;
    sid := (pick ->> 'school_id')::bigint;
    if sid = any(seen) then
      raise exception 'Duplicate school' using errcode = '22023', hint = 'INVALID_PICKS';
    end if;
    seen := seen || sid;
    if not exists (
      select 1 from public.schools s
       where s.id = sid and s.merged_into is null and s.hidden_reason is null
    ) then
      raise exception 'School unavailable' using errcode = '22023', hint = 'SCHOOL_UNAVAILABLE';
    end if;
    v_kkov := nullif(pick ->> 'obor_kkov', '');
    if v_kkov is not null and not exists (
      select 1 from public.school_programs p where p.school_id = sid and p.kkov = v_kkov
    ) then
      raise exception 'Programme does not belong to school' using errcode = '22023', hint = 'INVALID_PROGRAM';
    end if;
  end loop;

  -- Picks on a hidden school are kept (never deleted); only visible picks are replaced.
  delete from public.application_picks ap
   where ap.user_id = p_user_id
     and exists (
       select 1 from public.schools s
        where s.id = ap.school_id and s.merged_into is null and s.hidden_reason is null
     );

  for pick in select value from jsonb_array_elements(p_picks) loop
    pos := pos + 1;
    insert into public.application_picks (user_id, school_id, priority, obor_kkov, obor_nazev)
    values (
      p_user_id,
      (pick ->> 'school_id')::bigint,
      pos,
      left(nullif(pick ->> 'obor_kkov', ''), 40),
      left(nullif(pick ->> 'obor_nazev', ''), 200)
    );
  end loop;
  return pos;
end;
$$;
revoke all on function public.save_application_picks(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_application_picks(uuid, jsonb) to service_role;

-- Verify after applying (expected: one row, function exists, not callable by clients).
select to_regprocedure('public.save_application_picks(uuid, jsonb)') is not null as function_exists,
  has_function_privilege('authenticated', 'public.save_application_picks(uuid, jsonb)', 'execute') as client_can_call;
