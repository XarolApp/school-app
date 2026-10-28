-- Chunk 1 of plan 022: purchase ledger and atomic, replay-safe Stripe events.
-- Apply only after review; never run this against production from an agent.

alter table public.users
  add column if not exists stripe_last_event_created bigint not null default 0;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null check (plan in ('season', 'monthly')),
  checkout_context text not null default 'self' check (checkout_context in ('self', 'parent')),
  price_amount_minor integer not null check (price_amount_minor > 0),
  currency text not null check (currency = 'czk'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed')),
  stripe_checkout_session_id text,
  stripe_setup_intent_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  access_starts_at timestamptz,
  access_ends_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  last_stripe_event_created bigint not null default 0
);

create unique index if not exists purchases_one_pending_per_user_plan
  on public.purchases (user_id, plan)
  where status = 'pending';
create unique index if not exists purchases_stripe_checkout_session_unique
  on public.purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists purchases_stripe_setup_intent_unique
  on public.purchases (stripe_setup_intent_id)
  where stripe_setup_intent_id is not null;
create unique index if not exists purchases_stripe_payment_intent_unique
  on public.purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists purchases_stripe_subscription_unique
  on public.purchases (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists purchases_user_created_idx
  on public.purchases (user_id, created_at desc);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  outcome text not null default 'processing'
    check (outcome in ('processing', 'applied', 'duplicate', 'stale', 'unmatched', 'ignored')),
  processed_at timestamptz
);

alter table public.purchases enable row level security;
alter table public.stripe_webhook_events enable row level security;
revoke all on table public.purchases, public.stripe_webhook_events from public, anon, authenticated;
grant all on table public.purchases, public.stripe_webhook_events to service_role;

create or replace function public.apply_stripe_purchase_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_purchase_id uuid,
  p_purchase_status text,
  p_checkout_session_id text,
  p_setup_intent_id text,
  p_payment_intent_id text,
  p_subscription_id text,
  p_access_starts_at timestamptz,
  p_access_ends_at timestamptz,
  p_profile_patch jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_user public.users%rowtype;
  v_inserted_event text;
  v_status_allowed boolean := true;
  v_profile_eligible boolean := true;
  v_status text;
  v_updated_user uuid;
begin
  if p_event_id is null or length(p_event_id) = 0
     or p_event_type is null or length(p_event_type) = 0
     or p_event_created is null or p_event_created < 0 then
    raise exception 'Invalid Stripe event identity';
  end if;
  if coalesce(jsonb_typeof(p_profile_patch), 'object') <> 'object' then
    raise exception 'Stripe profile patch must be a JSON object';
  end if;
  if exists (
    select 1
      from jsonb_object_keys(coalesce(p_profile_patch, '{}'::jsonb)) as k(key)
     where key not in (
       'subscription_status', 'trial_expires_at', 'stripe_customer_id',
       'stripe_payment_method_id', 'stripe_setup_intent_id',
       'stripe_subscription_id', 'plan_id', 'season_charge_due_at',
       'plan_started_at', 'last_paid_at', 'access_expires_at',
       'cancel_at_period_end'
     )
  ) then
    raise exception 'Stripe profile patch contains a protected field';
  end if;
  if p_purchase_status is not null and p_purchase_status not in
     ('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed') then
    raise exception 'Invalid purchase status';
  end if;

  insert into public.stripe_webhook_events(event_id, event_type, event_created)
  values (p_event_id, p_event_type, p_event_created)
  on conflict (event_id) do nothing
  returning event_id into v_inserted_event;

  if v_inserted_event is null then
    return 'duplicate';
  end if;

  if p_purchase_id is not null and p_user_id is null then
    select user_id into p_user_id from public.purchases where id = p_purchase_id;
  end if;

  if p_user_id is not null then
    select * into v_user
      from public.users
     where id = p_user_id
     for update;
    if not found or v_user.subscription_status = 'beta' then
      update public.stripe_webhook_events
         set outcome = 'ignored', processed_at = now()
       where event_id = p_event_id;
      return 'ignored';
    end if;
    if p_event_created < v_user.stripe_last_event_created then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  if p_purchase_id is not null then
    select * into v_purchase
      from public.purchases
     where id = p_purchase_id
     for update;

    if not found or (p_user_id is not null and v_purchase.user_id <> p_user_id) then
      update public.stripe_webhook_events
         set outcome = 'unmatched', processed_at = now()
       where event_id = p_event_id;
      return 'unmatched';
    end if;

    if p_event_created < v_purchase.last_stripe_event_created
       or (p_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id <> p_checkout_session_id) then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;

    if p_purchase_status is not null then
      v_status_allowed := case v_purchase.status
        when 'pending' then p_purchase_status in ('pending', 'active', 'canceled', 'failed')
        when 'active' then p_purchase_status in ('active', 'canceled', 'withdrawn', 'refunded')
        when 'canceled' then p_purchase_status in ('canceled', 'withdrawn', 'refunded')
        when 'withdrawn' then p_purchase_status in ('withdrawn', 'refunded')
        when 'failed' then p_purchase_status in ('failed', 'refunded')
        when 'refunded' then p_purchase_status = 'refunded'
        else false
      end;
      if not v_status_allowed then
        update public.stripe_webhook_events
           set outcome = 'stale', processed_at = now()
         where event_id = p_event_id;
        return 'stale';
      end if;
    end if;

    v_status := case when p_purchase_status is not null and v_status_allowed
      then p_purchase_status else v_purchase.status end;

    update public.purchases
       set status = v_status,
           stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
           stripe_setup_intent_id = coalesce(p_setup_intent_id, stripe_setup_intent_id),
           stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
           stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
           access_starts_at = coalesce(p_access_starts_at, access_starts_at),
           access_ends_at = coalesce(p_access_ends_at, access_ends_at),
           completed_at = case when v_status = 'active' then coalesce(completed_at, now()) else completed_at end,
           updated_at = now(),
           last_stripe_event_created = p_event_created
     where id = p_purchase_id;

    v_profile_eligible := not exists (
        select 1 from public.purchases newer
         where newer.user_id = v_purchase.user_id
           and newer.id <> v_purchase.id
           and newer.created_at > v_purchase.created_at
           and newer.status in ('pending', 'active')
      );
  end if;

  if p_user_id is not null and v_profile_eligible then
    update public.users as u
       set (subscription_status, trial_expires_at, stripe_customer_id,
            stripe_payment_method_id, stripe_setup_intent_id, stripe_subscription_id,
            plan_id, season_charge_due_at, plan_started_at, last_paid_at,
            access_expires_at, cancel_at_period_end, stripe_last_event_created) = (
         select patched.subscription_status, patched.trial_expires_at, patched.stripe_customer_id,
                patched.stripe_payment_method_id, patched.stripe_setup_intent_id,
                patched.stripe_subscription_id, patched.plan_id, patched.season_charge_due_at,
                patched.plan_started_at, patched.last_paid_at, patched.access_expires_at,
                patched.cancel_at_period_end, p_event_created
           from jsonb_populate_record(u, p_profile_patch) as patched
       )
     where u.id = p_user_id
       and u.subscription_status <> 'beta'
       and u.stripe_last_event_created <= p_event_created
     returning id into v_updated_user;

    if v_updated_user is null then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  update public.stripe_webhook_events
     set outcome = 'applied', processed_at = now()
   where event_id = p_event_id;
  return 'applied';
end;
$$;

revoke all on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) to service_role;

-- Verify: returns two rows, with zero policies on the ledger tables.
-- select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('purchases','stripe_webhook_events');
-- select proname from pg_proc where proname='apply_stripe_purchase_event';
