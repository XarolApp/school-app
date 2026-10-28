-- Plan 025: revenue model (daily season price, spring pass, trial abuse, referral, restore).
-- Mirrored byte-for-byte in supabase-setup.sql. Idempotent; apply by hand, never from an agent.

-- purchases: provenance of every price and consent, one trial per purchase
alter table public.purchases drop constraint if exists purchases_plan_check;
alter table public.purchases
  add constraint purchases_plan_check check (plan in ('season', 'monthly', 'spring'));
alter table public.purchases
  add column if not exists trial boolean not null default false,
  add column if not exists card_fingerprint text,
  add column if not exists immediate_start_consent_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists discount_kind text check (discount_kind is null or discount_kind in ('referral', 'switch_credit')),
  add column if not exists discount_minor integer not null default 0 check (discount_minor >= 0),
  add column if not exists cancel_reason text check (cancel_reason is null or cancel_reason in ('price', 'not_needed', 'other')),
  add column if not exists needs_payment_confirmation boolean not null default false,
  add column if not exists referrer_user_id uuid references public.users(id) on delete set null,
  add column if not exists refund_amount_minor integer check (refund_amount_minor is null or refund_amount_minor >= 0);

create index if not exists purchases_card_fingerprint_idx
  on public.purchases (card_fingerprint) where card_fingerprint is not null;

-- one trial per account
alter table public.users add column if not exists season_trial_used_at timestamptz;

-- Every season purchase made through setup mode so far was a trial.
update public.purchases set trial = true
 where plan = 'season' and stripe_setup_intent_id is not null and trial = false
   and needs_payment_confirmation = false and stripe_payment_intent_id is null;
update public.users u
   set season_trial_used_at = p.first_trial
  from (select user_id, min(created_at) as first_trial from public.purchases where trial group by user_id) p
 where p.user_id = u.id and u.season_trial_used_at is null;

-- one trial per card (service role only)
create table if not exists public.trial_card_fingerprints (
  fingerprint text primary key,
  user_id uuid references public.users(id) on delete set null,
  used_at timestamptz not null default now()
);
alter table public.trial_card_fingerprints enable row level security;
revoke all on table public.trial_card_fingerprints from public, anon, authenticated;
grant all on table public.trial_card_fingerprints to service_role;

-- referral (service role only)
create table if not exists public.referral_codes (
  user_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  referred_purchase_id uuid not null unique references public.purchases(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'capped', 'void')),
  void_reason text,
  reward_minor integer not null default 0,
  stripe_refund_id text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on table public.referral_codes, public.referrals from public, anon, authenticated;
grant all on table public.referral_codes, public.referrals to service_role;

-- Only trial purchases enter the scheduled-charge state machine.
create or replace function public.prepare_season_charge()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.plan = 'season'
     and new.trial
     and new.status = 'active'
     and new.stripe_setup_intent_id is not null
     and new.season_charge_status = 'not_due'
     and new.cancel_requested_at is null then
    new.season_charge_status := 'ready';
  end if;
  return new;
end;
$$;

-- The charge uses the price locked at checkout, so the claim returns it.
drop function if exists public.claim_due_season_charges(timestamptz);
create function public.claim_due_season_charges(p_now timestamptz default now())
returns table (
  purchase_id uuid,
  user_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text,
  season_charge_due_at timestamptz,
  attempt_number integer,
  stripe_payment_intent_id text,
  season_charge_idempotency_key text,
  price_amount_minor integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select p.id
      from public.purchases p
      join public.users u on u.id = p.user_id
     where p.plan = 'season'
       and p.status = 'active'
       and p.season_charge_status in ('ready', 'retryable', 'processing')
       and (p.season_charge_status <> 'processing'
            or p.season_charge_claimed_at < p_now - interval '30 minutes')
       and p.cancel_requested_at is null
       and u.plan_id = 'season'
       and u.subscription_status = 'trialing'
       and u.season_charge_due_at <= p_now
       and u.stripe_customer_id is not null
       and u.stripe_payment_method_id is not null
     order by u.season_charge_due_at, p.created_at
     for update of p skip locked
     limit 50
  ), claimed as (
    update public.purchases p
       set season_charge_status = 'processing',
           season_charge_claimed_at = p_now,
           season_charge_attempts = p.season_charge_attempts + 1,
           season_charge_idempotency_key = coalesce(p.season_charge_idempotency_key, 'season:' || p.id::text),
           updated_at = p_now
      from candidates c
     where p.id = c.id
     returning p.id, p.user_id, p.season_charge_attempts,
               p.stripe_payment_intent_id, p.season_charge_idempotency_key, p.price_amount_minor
  )
  select c.id, c.user_id, u.stripe_customer_id, u.stripe_payment_method_id,
         u.season_charge_due_at, c.season_charge_attempts, c.stripe_payment_intent_id,
         c.season_charge_idempotency_key, c.price_amount_minor
    from claimed c
    join public.users u on u.id = c.user_id;
end;
$$;

-- Cancelling a trial keeps the saved card, so "Obnovit" needs no card entry.
create or replace function public.request_season_charge_cancel(p_user_id uuid, p_purchase_id uuid)
returns table(result text, payment_intent_id text, charge_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found then
    return query select 'not_found'::text, null::text, null::text;
    return;
  end if;
  if v_purchase.season_charge_status = 'succeeded' then
    return query select 'already_charged'::text, v_purchase.stripe_payment_intent_id, v_purchase.season_charge_status;
    return;
  end if;
  if v_purchase.season_charge_status = 'canceled' then
    return query select 'canceled'::text, v_purchase.stripe_payment_intent_id, v_purchase.season_charge_status;
    return;
  end if;

  update public.purchases
     set cancel_requested_at = coalesce(cancel_requested_at, now()),
         season_charge_status = case
           when season_charge_status in ('not_due', 'ready', 'retryable', 'declined') then 'canceled'
           else season_charge_status
         end,
         updated_at = now()
   where id = p_purchase_id;

  if v_purchase.season_charge_status in ('not_due', 'ready', 'retryable', 'declined') then
    update public.users
       set plan_id = null, subscription_status = 'canceled', season_charge_due_at = null
     where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
    return query select 'canceled'::text, v_purchase.stripe_payment_intent_id, 'canceled'::text;
    return;
  end if;

  return query select 'cancellation_requested'::text, v_purchase.stripe_payment_intent_id,
                      v_purchase.season_charge_status;
end;
$$;

create or replace function public.finish_season_charge_cancel(p_user_id uuid, p_purchase_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found then return 'not_found'; end if;
  if v_purchase.season_charge_status = 'succeeded' and v_purchase.refund_status <> 'succeeded' then return 'already_charged'; end if;
  update public.purchases
     set season_charge_status = 'canceled', cancel_requested_at = coalesce(cancel_requested_at, now()), updated_at = now()
   where id = p_purchase_id;
  update public.users
     set plan_id = null, subscription_status = 'canceled', season_charge_due_at = null
   where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
  return 'canceled';
end;
$$;

-- Undo a trial cancellation while the trial is still running: same charge date,
-- same locked price, no new trial. Returns restored | too_late | no_card | not_found.
create or replace function public.restore_season_charge(p_user_id uuid, p_purchase_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_user public.users%rowtype;
begin
  select * into v_user from public.users where id = p_user_id for update;
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found or v_user.id is null then return 'not_found'; end if;
  if v_purchase.status <> 'active' or not v_purchase.trial
     or v_purchase.cancel_requested_at is null
     or v_purchase.season_charge_status <> 'canceled'
     or v_purchase.stripe_payment_intent_id is not null
     or v_user.subscription_status <> 'canceled'
     or exists (
       select 1 from public.purchases newer
        where newer.user_id = p_user_id and newer.id <> p_purchase_id
          and newer.created_at > v_purchase.created_at
          and newer.status in ('pending', 'active')
     ) then
    return 'not_found';
  end if;
  if v_purchase.access_ends_at is null or v_purchase.access_ends_at <= now() + interval '5 minutes' then
    return 'too_late';
  end if;
  if v_user.stripe_payment_method_id is null then return 'no_card'; end if;

  update public.purchases
     set cancel_requested_at = null, season_charge_status = 'ready', updated_at = now()
   where id = p_purchase_id;
  update public.users
     set plan_id = 'season', subscription_status = 'trialing',
         season_charge_due_at = v_purchase.access_ends_at
   where id = p_user_id;
  return 'restored';
end;
$$;

-- A spring pass is a paid purchase like any other.
create or replace function public.complete_paid_onboarding(p_user_id uuid, p_purchase_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_purchase_id is null then return false; end if;
  if exists (
    select 1 from public.users u join public.purchases p on p.user_id = u.id
     where u.id = p_user_id and u.onboarding_completed_at is not null
       and p.id = p_purchase_id and p.plan in ('season','monthly','spring')
  ) then
    delete from public.onboarding_progress where user_id = p_user_id;
    return true;
  end if;
  update public.users u
     set onboarding_completed_at = coalesce(u.onboarding_completed_at, now())
   where u.id = p_user_id
     and exists (
       select 1 from public.purchases p where p.id = p_purchase_id
         and p.user_id = p_user_id and p.status = 'active' and p.plan in ('season','monthly','spring')
     )
     and u.subscription_status in ('trialing','active','season','past_due');
  if not found then return false; end if;
  delete from public.onboarding_progress where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.prepare_season_charge() from public, anon, authenticated;
revoke all on function public.claim_due_season_charges(timestamptz) from public, anon, authenticated;
revoke all on function public.request_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.restore_season_charge(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_paid_onboarding(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_due_season_charges(timestamptz) to service_role;
grant execute on function public.request_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.finish_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.restore_season_charge(uuid, uuid) to service_role;
grant execute on function public.complete_paid_onboarding(uuid, uuid) to service_role;

-- The webhook ledger function: only a newer ACTIVE purchase outranks an event (plan 025 review fix).
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

    -- Only a newer ACTIVE purchase outranks this event; a pending one (an unfinished
    -- one-click switch, an open Checkout) must not freeze a paying account.
    v_profile_eligible := not exists (
        select 1 from public.purchases newer
         where newer.user_id = v_purchase.user_id
           and newer.id <> v_purchase.id
           and newer.created_at > v_purchase.created_at
           and newer.status = 'active'
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

-- Verify: expect purchase_cols = 10, new_tables = 3, fns = 1, claim_returns_price = true and guard_active_only = true.
-- select (select count(*) from information_schema.columns where table_schema='public' and table_name='purchases'
--          and column_name in ('trial','card_fingerprint','immediate_start_consent_at','terms_version','discount_kind','discount_minor','cancel_reason','needs_payment_confirmation','referrer_user_id','refund_amount_minor')) as purchase_cols,
--        (select count(*) from information_schema.tables where table_schema='public' and table_name in ('trial_card_fingerprints','referral_codes','referrals')) as new_tables,
--        (select count(*) from pg_proc where proname='restore_season_charge' and pronamespace='public'::regnamespace) as fns,
--        (select pg_get_function_result(p.oid) like '%price_amount_minor%' from pg_proc p where p.proname='claim_due_season_charges' and p.pronamespace='public'::regnamespace) as claim_returns_price,
--        (select pg_get_functiondef(p.oid) like '%newer.status = ''active''%' from pg_proc p where p.proname='apply_stripe_purchase_event' and p.pronamespace='public'::regnamespace) as guard_active_only;
