-- Paid-launch chunk 3: keep unfinished accounts in onboarding and expose the
-- full school catalogue only to active accounts or the authenticated flow.

alter table public.users
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.onboarding_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  step_id text not null check (
    step_id in ('welcome','role','stakes','calculating','reveal','commitment','proof',
      'hodnota','cesta','ucet','plan','zkusebni','platba','hotovo')
    or step_id ~ '^q([1-9]|1[01])$'
  ),
  role text check (role is null or role in ('student','parent')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  intents jsonb not null default '[]'::jsonb check (jsonb_typeof(intents) = 'array'),
  commitment text check (commitment is null or commitment in ('maximalne','hodne','zjistuji')),
  gender text check (gender is null or gender in ('m','f','u')),
  plan_id text not null default 'season' check (plan_id in ('season','monthly')),
  updated_at timestamptz not null default now()
);

alter table public.onboarding_progress enable row level security;
revoke all on public.onboarding_progress from public, anon, authenticated;
grant all on table public.onboarding_progress to service_role;

-- Preserve every account that existed when this schema was first applied.
-- The marker makes this safe when supabase-setup.sql is run again: future
-- signups remain incomplete until a verified checkout completes onboarding.
create table if not exists public.paid_launch_schema_markers (
  marker text primary key,
  applied_at timestamptz not null default now()
);
alter table public.paid_launch_schema_markers enable row level security;
revoke all on public.paid_launch_schema_markers from public, anon, authenticated;
grant all on table public.paid_launch_schema_markers to service_role;

do $$
begin
  if not exists (
    select 1 from public.paid_launch_schema_markers
     where marker = '2026-10-22-paid-catalogue-boundary'
  ) then
    update public.users
       set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
     where onboarding_completed_at is null;
    insert into public.paid_launch_schema_markers(marker)
    values ('2026-10-22-paid-catalogue-boundary');
  end if;
end;
$$;

create or replace function public.complete_paid_onboarding(
  p_user_id uuid,
  p_purchase_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_purchase_id is null then
    return false;
  end if;

  -- Stripe can replay the verified Checkout event after the purchase later
  -- ends. Keep this RPC idempotent once this matching account was completed.
  if exists (
    select 1 from public.users u
      join public.purchases p on p.user_id = u.id
     where u.id = p_user_id
       and u.onboarding_completed_at is not null
       and p.id = p_purchase_id
       and p.plan in ('season','monthly')
  ) then
    delete from public.onboarding_progress where user_id = p_user_id;
    return true;
  end if;

  update public.users u
     set onboarding_completed_at = coalesce(u.onboarding_completed_at, now())
   where u.id = p_user_id
     and exists (
       select 1 from public.purchases p
        where p.id = p_purchase_id
          and p.user_id = p_user_id
          and p.status = 'active'
          and p.plan in ('season','monthly')
     )
     and u.subscription_status in ('trialing','active','season','past_due');

  if not found then
    return false;
  end if;

  delete from public.onboarding_progress where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.complete_paid_onboarding(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_paid_onboarding(uuid, uuid) to service_role;

-- Verify after applying (expected: zero incomplete legacy accounts, with no
-- progress row belonging to an already completed account).
select
  count(*) filter (where onboarding_completed_at is null) as incomplete_accounts,
  (select count(*) from public.onboarding_progress p
    join public.users u on u.id = p.user_id
    where u.onboarding_completed_at is not null) as completed_with_draft
from public.users;
