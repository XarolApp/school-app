-- Chunk 2 of plan 022: claim season charges, serialize cancellation and track refunds.
-- Apply only after review; never run this against production from an agent.

alter table public.purchases
  add column if not exists season_charge_status text not null default 'not_due'
    check (season_charge_status in ('not_due', 'ready', 'processing', 'requires_action', 'declined', 'retryable', 'succeeded', 'canceled')),
  add column if not exists season_charge_claimed_at timestamptz,
  add column if not exists season_charge_attempts integer not null default 0 check (season_charge_attempts >= 0),
  add column if not exists season_charge_error_code text check (season_charge_error_code is null or char_length(season_charge_error_code) <= 80),
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists season_charge_idempotency_key text,
  add column if not exists refund_status text not null default 'none'
    check (refund_status in ('none', 'pending', 'failed', 'succeeded')),
  add column if not exists refund_attempts integer not null default 0 check (refund_attempts >= 0),
  add column if not exists stripe_refund_id text;

create index if not exists purchases_due_season_charge_idx
  on public.purchases (season_charge_status, season_charge_claimed_at)
  where plan = 'season' and status = 'active';

-- Existing completed setup sessions have not yet entered this state machine.
update public.purchases
   set season_charge_status = 'ready', updated_at = now()
 where plan = 'season'
   and status = 'active'
   and stripe_setup_intent_id is not null
   and season_charge_status = 'not_due'
   and cancel_requested_at is null;

-- Keep the exact old worker key on already-active purchases so an ambiguous
-- pre-migration request is replayed under the same Stripe key. New purchases
-- get a key derived from their immutable purchase id when claimed below.
update public.purchases p
   set season_charge_idempotency_key = 'season:' || p.user_id::text || ':' ||
       to_char(u.season_charge_due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  from public.users u
 where u.id = p.user_id
   and p.plan = 'season'
   and p.status = 'active'
   and p.season_charge_idempotency_key is null
   and u.season_charge_due_at is not null;

create or replace function public.prepare_season_charge()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.plan = 'season'
     and new.status = 'active'
     and new.stripe_setup_intent_id is not null
     and new.season_charge_status = 'not_due'
     and new.cancel_requested_at is null then
    new.season_charge_status := 'ready';
  end if;
  return new;
end;
$$;

drop trigger if exists purchases_prepare_season_charge on public.purchases;
create trigger purchases_prepare_season_charge
before insert or update of status, stripe_setup_intent_id on public.purchases
for each row execute function public.prepare_season_charge();

create or replace function public.claim_due_season_charges(p_now timestamptz default now())
returns table (
  purchase_id uuid,
  user_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text,
  season_charge_due_at timestamptz,
  attempt_number integer,
  stripe_payment_intent_id text,
  season_charge_idempotency_key text
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
               p.stripe_payment_intent_id, p.season_charge_idempotency_key
  )
  select c.id, c.user_id, u.stripe_customer_id, u.stripe_payment_method_id,
         u.season_charge_due_at, c.season_charge_attempts, c.stripe_payment_intent_id,
         c.season_charge_idempotency_key
    from claimed c
    join public.users u on u.id = c.user_id;
end;
$$;

create or replace function public.set_season_charge_state(
  p_purchase_id uuid,
  p_state text,
  p_payment_intent_id text default null,
  p_error_code text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_state text := p_state;
begin
  if p_state not in ('processing', 'requires_action', 'declined', 'retryable', 'succeeded', 'canceled') then
    raise exception 'Invalid season charge state';
  end if;
  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if not found or v_purchase.plan <> 'season' then return 'not_found'; end if;
  if v_purchase.cancel_requested_at is not null and p_state in ('requires_action', 'declined', 'retryable') then
    v_state := 'canceled';
  end if;
  if v_purchase.season_charge_status in ('succeeded', 'canceled')
     and v_state not in ('succeeded', v_purchase.season_charge_status) then
    return v_purchase.season_charge_status;
  end if;
  update public.purchases
     set season_charge_status = v_state,
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
         season_charge_error_code = left(p_error_code, 80),
         season_charge_claimed_at = case when v_state = 'processing' then now() else null end,
         updated_at = now()
   where id = p_purchase_id;
  return v_state;
end;
$$;

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
       set plan_id = null, subscription_status = 'canceled',
           season_charge_due_at = null, stripe_payment_method_id = null
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
     set plan_id = null, subscription_status = 'canceled',
         season_charge_due_at = null, stripe_payment_method_id = null
   where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
  return 'canceled';
end;
$$;

create or replace function public.set_purchase_refund_state(
  p_user_id uuid,
  p_purchase_id uuid,
  p_state text,
  p_refund_id text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  if p_state not in ('pending', 'failed', 'succeeded') then raise exception 'Invalid refund state'; end if;
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id
   for update;
  if not found then return 'not_found'; end if;
  if v_purchase.refund_status = 'succeeded' then return 'succeeded'; end if;
  update public.purchases
     set status = 'withdrawn',
         refund_status = p_state,
         refund_attempts = refund_attempts + case when p_state = 'pending' and p_refund_id is null then 1 else 0 end,
         stripe_refund_id = coalesce(p_refund_id, stripe_refund_id),
         updated_at = now()
   where id = p_purchase_id;
  return p_state;
end;
$$;

revoke all on function public.prepare_season_charge() from public, anon, authenticated;
revoke all on function public.claim_due_season_charges(timestamptz) from public, anon, authenticated;
revoke all on function public.set_season_charge_state(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.request_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_purchase_refund_state(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_due_season_charges(timestamptz) to service_role;
grant execute on function public.set_season_charge_state(uuid, text, text, text) to service_role;
grant execute on function public.request_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.finish_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.set_purchase_refund_state(uuid, uuid, text, text) to service_role;

-- Verify: charge-state counts; no client policies or function grants.
-- select season_charge_status, count(*) from public.purchases where plan='season' group by 1 order by 1;
-- select tablename, count(*) as policies from pg_policies where schemaname='public' and tablename='purchases' group by tablename;
-- select proname, has_function_privilege('anon', p.oid, 'execute') as anon_exec, has_function_privilege('authenticated', p.oid, 'execute') as user_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('claim_due_season_charges','set_season_charge_state','request_season_charge_cancel','finish_season_charge_cancel','set_purchase_refund_state');
