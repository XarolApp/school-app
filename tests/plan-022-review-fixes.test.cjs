const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const migration = readFileSync(join(root, 'migrations/2026-10-28-ledger-clock-fix.sql'), 'utf8');
const setup = readFileSync(join(root, 'supabase-setup.sql'), 'utf8');
const server = readFileSync(join(root, 'server.js'), 'utf8');

function loadPurchaseStatusFromStripe() {
  const match = server.match(/function purchaseStatusFromStripe\(status\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'purchaseStatusFromStripe not found');
  return new Function(`${match[0]}; return purchaseStatusFromStripe;`)();
}

test('finding 1: a monthly subscription still incomplete (3-D Secure) stays pending, not failed', () => {
  const map = loadPurchaseStatusFromStripe();
  assert.equal(map('incomplete'), 'pending');
  assert.equal(map('incomplete_expired'), 'failed');
  assert.equal(map('active'), 'active');
  assert.equal(map('trialing'), 'active');
  assert.equal(map('canceled'), 'canceled');
  // The ledger lets a pending purchase become active, so the later subscription.updated lands.
  assert.match(setup, /when 'pending' then p_purchase_status in \('pending', 'active', 'canceled', 'failed'\)/);
});

test('finding 2: events that change nothing do not move the user or purchase event clocks', () => {
  assert.ok(setup.includes(migration.trim()), 'migration must be mirrored byte-for-byte in supabase-setup.sql');
  assert.match(migration, /v_has_patch boolean := coalesce\(p_profile_patch, '\{\}'::jsonb\) <> '\{\}'::jsonb/);
  assert.match(migration, /case when v_has_patch then p_event_created else u\.stripe_last_event_created end/);
  assert.match(migration, /case when v_moves_purchase\s+then p_event_created else last_stripe_event_created end/);
  assert.doesNotMatch(migration, /^\s*last_stripe_event_created = p_event_created\s*$/m);
  assert.match(migration, /grant execute on function public\.apply_stripe_purchase_event\(/);
});

test('finding 3: replacing a checkout never abandons one the customer already completed', () => {
  const discard = server.slice(server.indexOf('const discard = async (row)'), server.indexOf('const processing = {'));
  assert.match(discard, /sessions\.retrieve\(row\.stripe_checkout_session_id\)/);
  assert.match(discard, /session\.status === 'complete'\) return false/);
  assert.ok(discard.indexOf("return false") < discard.indexOf("status: 'failed'"));
  assert.match(server, /if \(!\(await discard\(purchase\)\)\) return processing;/);
});

test('finding 4: the season charge uses the price locked on the purchase', () => {
  const worker = server.slice(server.indexOf("rpc('claim_due_season_charges'"));
  const charge = worker.slice(0, worker.indexOf('paymentIntents.create') + 400);
  assert.match(charge, /amount: purchase\.price_amount_minor/);
  assert.doesNotMatch(charge, /SEASON_PRICE_CZK/);
});
