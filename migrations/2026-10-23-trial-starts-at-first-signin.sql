-- Paid-launch chunk 4: the ordinary access trial starts at the first confirmed
-- sign-in instead of at signup. Existing accounts keep their trial_expires_at.
-- Apply after the chunk 3 migration.

alter table public.users alter column trial_expires_at drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  beta_code text;
  beta_hours integer;
  beta_ends_at timestamptz;
  beta_exists boolean;
  beta_invite_supplied boolean;
begin
  beta_invite_supplied := coalesce(new.raw_user_meta_data ? 'beta_school_code', false);
  if beta_invite_supplied then
    if jsonb_typeof(new.raw_user_meta_data -> 'beta_school_code') <> 'string'
      or btrim(coalesce(new.raw_user_meta_data ->> 'beta_school_code', '')) = '' then
      raise exception 'Beta invitation is invalid.' using errcode = '22023';
    end if;
    beta_code := upper(btrim(new.raw_user_meta_data ->> 'beta_school_code'));
    if beta_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then
      raise exception 'Beta invitation is invalid.' using errcode = '22023';
    end if;

    select s.ends_at, s.access_hours
      into beta_ends_at, beta_hours
      from public.beta_program_settings s
      where s.singleton = true
      for share;
    if not found or beta_ends_at is null or beta_ends_at <= clock_timestamp() then
      raise exception 'Beta program is closed.' using errcode = '55000';
    end if;

    select exists(select 1 from public.beta_schools s where s.code = beta_code)
      into beta_exists;
    if not beta_exists then
      raise exception 'Beta invitation is invalid.' using errcode = '22023';
    end if;

    insert into public.users (
      id, email, name, trial_expires_at, subscription_status,
      tester_school_code, tester_access_until
    ) values (
      new.id, new.email, nullif(new.raw_user_meta_data ->> 'name', ''),
      clock_timestamp(), 'beta', beta_code,
      clock_timestamp() + make_interval(hours => beta_hours)
    );
  else
    insert into public.users (id, email, name, trial_expires_at, subscription_status)
    values (
      new.id,
      new.email,
      nullif(new.raw_user_meta_data ->> 'name', ''),
      null,
      'trialing'
    );
  end if;
  return new;
end;
$$;

-- The ordinary trial starts once, at the first confirmed authenticated request
-- (server.js requireAuth), so a delayed e-mail confirmation cannot consume it.
-- Only an untouched trialing row with no window yet is updated; creator, beta,
-- developer and paid rows and existing accounts keep their current values.
create or replace function public.start_ordinary_trial(p_user_id uuid)
returns timestamptz
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.users u
     set trial_expires_at = clock_timestamp() + interval '3 days'
   where u.id = p_user_id
     and u.trial_expires_at is null
     and u.subscription_status = 'trialing'
  returning u.trial_expires_at;
$$;
revoke all on function public.start_ordinary_trial(uuid) from public, anon, authenticated;
grant execute on function public.start_ordinary_trial(uuid) to service_role;

-- Verify after applying (expected: is_nullable = YES, function exists).
select
  (select is_nullable from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='trial_expires_at') as is_nullable,
  to_regprocedure('public.start_ordinary_trial(uuid)') is not null as function_exists;
