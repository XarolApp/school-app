begin;

alter table public.users drop constraint if exists users_subscription_status_check;
alter table public.users add constraint users_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'season', 'past_due', 'canceled', 'expired', 'developer', 'beta', 'creator'));

create table if not exists public.creator_links (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  note text check (note is null or char_length(note) <= 200),
  token_hash text not null unique,
  user_id uuid not null unique references public.users(id) on delete cascade,
  max_devices smallint not null default 2 check (max_devices between 1 and 5),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_opened_at timestamptz,
  last_active_at timestamptz,
  open_count integer not null default 0,
  blocked_attempts integer not null default 0,
  last_blocked_at timestamptz
);

create table if not exists public.creator_devices (
  link_id uuid not null references public.creator_links(id) on delete cascade,
  device_hash text not null,
  user_agent text check (user_agent is null or char_length(user_agent) <= 200),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (link_id, device_hash)
);

alter table public.creator_links enable row level security;
alter table public.creator_devices enable row level security;
revoke all on table public.creator_links, public.creator_devices from public, anon, authenticated;
grant all on table public.creator_links, public.creator_devices to service_role;

create or replace function public.claim_creator_device(
  p_token_hash text,
  p_device_hash text,
  p_user_agent text
)
returns table(result text, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.creator_links%rowtype;
  v_device_exists boolean;
  v_device_count integer;
begin
  select * into v_link
  from public.creator_links
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  if v_link.revoked_at is not null then
    return query select 'revoked'::text, null::uuid;
    return;
  end if;

  select exists (
    select 1 from public.creator_devices
    where link_id = v_link.id and device_hash = p_device_hash
  ) into v_device_exists;

  if v_device_exists then
    update public.creator_devices
    set last_seen = now()
    where link_id = v_link.id and device_hash = p_device_hash;
  else
    select count(*)::integer into v_device_count
    from public.creator_devices
    where link_id = v_link.id;

    if v_device_count >= v_link.max_devices then
      update public.creator_links
      set blocked_attempts = blocked_attempts + 1,
          last_blocked_at = now()
      where id = v_link.id;
      return query select 'blocked'::text, null::uuid;
      return;
    end if;

    insert into public.creator_devices (link_id, device_hash, user_agent)
    values (v_link.id, p_device_hash, left(p_user_agent, 200));
  end if;

  update public.creator_links
  set open_count = open_count + 1,
      last_opened_at = now()
  where id = v_link.id;

  return query select 'ok'::text, v_link.user_id;
end;
$$;

revoke all on function public.claim_creator_device(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_creator_device(text, text, text) to service_role;

-- Verify: two tables, creator status accepted, and the atomic claim RPC exists.
-- select (select count(*) from information_schema.tables where table_schema='public' and table_name in ('creator_links','creator_devices')) as tables_2,
--        (select pg_get_constraintdef(oid) like '%creator%' from pg_constraint where conname='users_subscription_status_check' and conrelid='public.users'::regclass) as status_ok,
--        (select count(*) from pg_proc where proname='claim_creator_device' and pronamespace='public'::regnamespace) as fn_1;

commit;
