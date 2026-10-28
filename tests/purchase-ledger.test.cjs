const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const migration = readFileSync(join(__dirname, '../migrations/2026-10-16-paid-purchase-ledger.sql'), 'utf8');
const setup = readFileSync(join(__dirname, '../supabase-setup.sql'), 'utf8');
const setupStart = setup.indexOf('-- Plan 022: paid purchase ledger and replay-safe Stripe events');
const setupBlock = setup.slice(setupStart);

test('paid purchase migration is mirrored in the repeatable setup file', () => {
  assert.ok(setupBlock.startsWith('-- Plan 022: paid purchase ledger and replay-safe Stripe events\n'));
  assert.ok(setupBlock.includes(migration.slice(migration.indexOf('alter table public.users')).trim()));
});

test('purchase ledger keeps one pending attempt per user and plan across payer contexts', () => {
  assert.match(migration, /create table if not exists public\.purchases/);
  assert.match(migration, /status in \('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed'\)/);
  assert.match(migration, /create unique index if not exists purchases_one_pending_per_user_plan[\s\S]*?on public\.purchases \(user_id, plan\)[\s\S]*?where status = 'pending'/);
  assert.match(migration, /stripe_checkout_session_id text/);
  assert.match(migration, /stripe_setup_intent_id text/);
  assert.match(migration, /stripe_payment_intent_id text/);
  assert.match(migration, /stripe_subscription_id text/);
});

test('webhook event de-duplication, monotonic purchase transitions and profile writes are atomic', () => {
  assert.match(migration, /event_id text primary key/);
  assert.match(migration, /on conflict \(event_id\) do nothing[\s\S]*?return 'duplicate'/);
  assert.match(migration, /p_event_created < v_purchase\.last_stripe_event_created/);
  assert.match(migration, /when 'failed' then p_purchase_status in \('failed', 'refunded'\)/);
  assert.match(migration, /where u\.id = p_user_id[\s\S]*?and u\.stripe_last_event_created <= p_event_created/);
  assert.match(migration, /v_profile_eligible := not exists/);
  assert.match(migration, /security definer[\s\S]*?set search_path = public, pg_temp/);
});

test('purchase and webhook tables are service-role only with RLS enabled', () => {
  for (const table of ['purchases', 'stripe_webhook_events']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.purchases, public\\.stripe_webhook_events from public, anon, authenticated`));
  }
  assert.match(migration, /revoke all on function public\.apply_stripe_purchase_event/);
  assert.match(migration, /grant execute on function public\.apply_stripe_purchase_event[\s\S]*?to service_role/);
});
