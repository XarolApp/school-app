const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const season = require('../lib/season');

const root = join(__dirname, '..');
const migration = readFileSync(join(root, 'migrations/2026-10-28-revenue-model.sql'), 'utf8');
const setup = readFileSync(join(root, 'supabase-setup.sql'), 'utf8');
const server = readFileSync(join(root, 'server.js'), 'utf8');

const at = (iso) => new Date(iso);
const DAY = 86400000;

const noon = (iso) => at(iso + 'T12:00:00+01:00');

test('season price v3: 499 until 22 Dec, falls after, flat 149 from 9 Feb, nothing after 30 Jun', () => {
  assert.equal(season.seasonPriceCzk(noon('2026-11-01')), 499);
  assert.equal(season.seasonPriceCzk(noon('2026-12-22')), 499);
  assert.equal(season.seasonPriceCzk(noon('2026-12-23')), 494);
  assert.equal(season.seasonPriceCzk(noon('2027-01-15')), 333);
  assert.equal(season.seasonPriceCzk(noon('2027-02-01')), 221);
  assert.equal(season.seasonPriceCzk(noon('2027-02-08')), 165);
  assert.equal(season.seasonPriceCzk(noon('2027-02-09')), 149);
  assert.equal(season.seasonPriceCzk(noon('2027-02-23')), 149);
  assert.equal(season.seasonPriceCzk(at('2027-07-01T00:00:00+02:00')), null);
  assert.equal(season.onSale(at('2027-07-01T00:00:00+02:00')), false);
});

test('season price is one value per Prague day and never rises, 1 Nov to 30 Jun', () => {
  assert.equal(season.seasonPriceCzk(at('2027-01-15T00:01:00+01:00')), season.seasonPriceCzk(at('2027-01-15T23:59:00+01:00')));
  let previous = Infinity;
  for (let t = at('2026-10-31T23:00:00Z').getTime(); t <= at('2027-06-30T12:00:00Z').getTime(); t += DAY / 24) {
    const price = season.seasonPriceCzk(new Date(t));
    assert.ok(price <= previous, `price rose at ${new Date(t).toISOString()}`);
    assert.ok(price >= season.SPRING_PRICE && price <= season.SEASON_CAP);
    previous = price;
  }
});

test('season is 0.9 x monthly total + 49 inside the clamp, and always cheaper than monthly + spring', () => {
  for (let t = at('2026-11-01T00:00:00+01:00').getTime(); t < at('2027-02-09T00:00:00+01:00').getTime(); t += DAY / 24) {
    const now = new Date(t);
    const price = season.seasonPriceCzk(now);
    const total = season.monthlyMaxTotalCzk(at(season.pragueDay(now) + 'T12:00:00+01:00'));
    const raw = Math.round(0.9 * total + 49);
    assert.equal(price, Math.min(499, Math.max(149, raw)), now.toISOString());
    assert.ok(price < total + season.SPRING_PRICE, `season not cheaper than monthly + spring on ${now.toISOString()}`);
  }
});

test('monthly quote: 249 up front, single charge when under a month is left, closed from 9 Feb', () => {
  assert.deepEqual(season.monthlyQuote(noon('2026-11-01')), { totalCzk: 938, singleCharge: false, firstChargeCzk: 249 });
  assert.equal(season.monthlyQuote(noon('2026-11-18')).totalCzk, 787);
  assert.deepEqual(season.monthlyQuote(noon('2027-02-01')), { totalCzk: 173, singleCharge: true, firstChargeCzk: 173 });
  assert.ok(season.monthlyQuote(at('2027-02-08T23:00:00+01:00')));
  assert.equal(season.monthlyQuote(at('2027-02-09T00:00:00+01:00')), null);
  assert.equal(season.monthlyAvailable(noon('2027-02-08')), true);
  assert.equal(season.monthlyAvailable(noon('2027-02-09')), false);
});

test('trial window follows monthly; referral constants', () => {
  assert.equal(season.trialAvailable(noon('2027-02-08')), true);
  assert.equal(season.trialAvailable(noon('2027-02-09')), false);
  assert.equal(season.REFERRAL_DISCOUNT, 100);
  assert.equal(season.WITHDRAWAL_DAYS, 14);
});

test('extend price is the spring price plus monthly payments still due before the deadline', () => {
  assert.equal(season.springAddOnCzk(season.DEADLINE), 149);
  const extra = season.springAddOnCzk(at('2027-02-18T12:00:00+01:00')) - 149;
  assert.ok(extra >= 35 && extra <= 45, `unexpected ${extra}`);
  assert.equal(season.springAddOnCzk(at('2027-02-23T00:00:00+01:00')), 149);
});

test('pro-rata amount owed counts from the payment', () => {
  const paidAt = '2026-11-10T10:00:00Z';
  const accessEndsAt = '2027-06-30T21:59:59Z';
  const half = new Date((new Date(paidAt).getTime() + new Date(accessEndsAt).getTime()) / 2);
  const args = { paidMinor: 50000, paidAt, accessEndsAt };
  assert.equal(season.proRataOwedMinor({ ...args, now: at('2026-11-09T00:00:00Z') }), 0);
  assert.equal(season.proRataOwedMinor({ ...args, now: half }), 25000);
  assert.equal(season.proRataOwedMinor({ ...args, now: at('2027-08-01T00:00:00Z') }), 50000);
});

test('the revenue migration is mirrored in the canonical setup and covers every new rule', () => {
  assert.ok(setup.includes(migration.trim()));
  assert.match(migration, /check \(plan in \('season', 'monthly', 'spring'\)\)/);
  assert.match(migration, /create table if not exists public\.trial_card_fingerprints/);
  assert.match(migration, /create table if not exists public\.referrals/);
  assert.match(migration, /referred_user_id uuid not null unique/);
  // Only trial purchases enter the scheduled-charge machine; the charge carries its locked price.
  assert.match(migration, /new\.trial\s+and new\.status = 'active'/);
  assert.match(migration, /price_amount_minor integer\s*\)/);
  // Cancelling a trial keeps the saved card; restoring puts the charge back in the queue.
  assert.doesNotMatch(migration.slice(migration.indexOf('request_season_charge_cancel')), /stripe_payment_method_id = null/);
  assert.match(migration, /season_charge_status = 'ready'/);
  for (const rpc of ['restore_season_charge', 'claim_due_season_charges']) {
    assert.match(migration, new RegExp(`grant execute on function public\\.${rpc}\\(`));
  }
});

test('no price, deadline or 30-day refund promise survives outside lib/season.js and the Stripe Price', () => {
  assert.doesNotMatch(server, /SEASON_PRICE_CZK|MONTHLY_PRICE_CZK|seasonEndsAt/);
  assert.doesNotMatch(server, /WITHDRAWAL_DAYS = 30/);
  assert.match(server, /purchase\.price_amount_minor/);
  assert.match(server, /idempotencyKey: 'referral:' \+ referral\.id/);
});

test('every purchase route requires the express request for immediate start', () => {
  assert.match(server, /code: 'IMMEDIATE_START_REQUIRED'/);
  assert.match(server.slice(server.indexOf('async function createCheckoutForUser')), /immediateStart !== true/);
  for (const fn of ['seasonSavedCardPurchase', 'extendMonthly', 'monthlySavedCardPurchase']) {
    const body = server.slice(server.indexOf(`async function ${fn}`), server.indexOf(`async function ${fn}`) + 900);
    assert.match(body, /immediateStart !== true/, fn);
  }
});

test('schema rerun safety: the old claim function is dropped before chunk 2, the ledger guard ignores pending purchases', () => {
  const dropAt = setup.indexOf('drop function if exists public.claim_due_season_charges(timestamptz);');
  const chunk2At = setup.indexOf('create or replace function public.claim_due_season_charges(');
  assert.ok(dropAt > -1 && dropAt < chunk2At, 'old signature must be dropped before the chunk-2 definition');
  assert.match(migration, /newer\.status = 'active'/);
  assert.match(migration, /needs_payment_confirmation = false and stripe_payment_intent_id is null/);
});
