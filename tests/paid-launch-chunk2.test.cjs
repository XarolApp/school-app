const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const migration = readFileSync(join(root, 'migrations/2026-10-22-season-charge-lifecycle.sql'), 'utf8');
const setup = readFileSync(join(root, 'supabase-setup.sql'), 'utf8');
const server = readFileSync(join(root, 'server.js'), 'utf8');

test('chunk 2 migration is mirrored in the canonical repeatable setup', () => {
  assert.ok(setup.includes(migration.trim()));
  assert.match(migration, /add column if not exists season_charge_status/);
  assert.match(migration, /where plan = 'season'\s+and status = 'active'/);
  assert.match(migration, /for update of p skip locked/);
  assert.match(migration, /season_charge_idempotency_key = coalesce\(p\.season_charge_idempotency_key, 'season:' \|\| p\.id::text\)/);
  assert.match(migration, /to_char\(u\.season_charge_due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS\.MS"Z"'\)/);
  assert.match(migration, /old worker key/);
  assert.match(migration, /cancel_requested_at is null/);
  for (const rpc of [
    'claim_due_season_charges', 'set_season_charge_state', 'request_season_charge_cancel',
    'finish_season_charge_cancel', 'set_purchase_refund_state',
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${rpc}\\(`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${rpc}\\(`));
  }
});

test('season worker uses the atomic claim RPC and purchase-stable Stripe key', () => {
  const worker = server.slice(server.indexOf('async function chargeDueSeasonPasses()'), server.indexOf("app.get('/api/subscription/season-charge'"));
  assert.match(worker, /rpc\('claim_due_season_charges'/);
  assert.match(worker, /stripe\.paymentIntents\.retrieve\(purchase\.stripe_payment_intent_id\)/);
  assert.match(worker, /stripe\.paymentIntents\.search\(/);
  assert.match(worker, /idempotencyKey: purchase\.season_charge_idempotency_key/);
  assert.match(worker, /state === 'requires_action'/);
  assert.match(worker, /refundCanceledSeasonPurchase/);
  assert.doesNotMatch(worker, /from\('users'\)[\s\S]*?\.lte\('season_charge_due_at'/);
});

test('withdrawal never scans a customer time window and refunds the linked intent only', () => {
  const withdrawal = server.slice(server.indexOf('async function withdrawPlanForUser'), server.indexOf("app.post('/api/subscription/withdraw'"));
  assert.match(withdrawal, /stripe_payment_intent_id/);
  assert.match(withdrawal, /stripe\.refunds\.list\(\{ payment_intent: paymentIntentId, limit: 100 \}\)/);
  assert.match(withdrawal, /payment_intent: paymentIntentId/);
  assert.doesNotMatch(withdrawal, /paymentIntents\.list/);
  assert.match(withdrawal, /refundStatus/);
  assert.match(withdrawal, /idempotencyKey: `withdraw:\$\{purchase\.id\}:attempt:\$\{attempt\}`/);
});

test('SCA status endpoint is authenticated and returns only the owned intent client secret', () => {
  const route = server.slice(server.indexOf("app.get('/api/subscription/season-charge'"), server.indexOf('\nif (stripe) {', server.indexOf("app.get('/api/subscription/season-charge'")));
  assert.match(route, /requireAuth/);
  assert.match(route, /\.eq\('user_id', req\.user\.id\)/);
  assert.match(route, /intent\.metadata\?\.purchase_id !== purchase\.id/);
  assert.match(route, /intent\.metadata\?\.app_user_id !== req\.user\.id/);
  assert.match(route, /response\.clientSecret = intent\.client_secret/);
  assert.doesNotMatch(route, /stripe_secret|STRIPE_SECRET_KEY/);
});

