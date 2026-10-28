// Plan 025: the one place where the 2026/27 season's dates and prices live.
// server.js imports it and GET /api/prices serves the numbers to the frontend,
// so the browser never holds a price of its own. Next season: new dates here.

const DEADLINE = new Date('2027-02-22T23:59:59+01:00'); // end of applications
const ACCESS_END = new Date('2027-06-30T23:59:59+02:00'); // end of every paid access this season
const DEADLINE_DAY = '2027-02-22'; // Prague calendar date of DEADLINE

const SEASON_CAP = 499; // Kč, the season price never exceeds this
const SEASON_FACTOR = 0.9; // season without spring is 10 % cheaper than monthly
const SPRING_BONUS = 49; // Kč added to the discounted monthly total for the spring part
const SPRING_PRICE = 149; // Kč: floor of the season price, the spring pass, the extend base
const MONTHLY_PRICE = 249;
const LAST_CALL_DAYS = 14; // this many days or fewer left: no monthly, no trial, flat SPRING_PRICE
const SPRING_ADDON_FROM = new Date('2027-02-01T00:00:00+01:00'); // monthly users may extend from here
const MIN_CHARGE_CZK = 15; // Stripe's CZK minimum
const SEASON_TRIAL_DAYS = 3;
const REFERRAL_DISCOUNT = 100; // Kč off the friend's season price
const REFERRAL_REWARD = 100; // Kč refunded to the referrer per qualifying friend
const REFERRAL_MIN_PRICE = 249;
const REFERRAL_SETTLE_DAYS = 14;
const WITHDRAWAL_DAYS = 14;
const GUARDIAN_REFUND_DAYS = 30;
const TERMS_VERSION = '2026-11-01';

const DAY_MS = 86400000;

const pragueFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit',
});

// 'YYYY-MM-DD' of the Prague calendar day containing `now`.
function pragueDay(now = new Date()) {
  return pragueFormat.format(now);
}

// Calendar days from today (Prague) to the deadline day, counting both ends:
// 114 on 1 Nov 2026, 1 on the deadline day, 0 from the day after. The price
// therefore changes at Prague midnight, not at 23:00 UTC.
function daysLeft(now = new Date()) {
  const [y, m, d] = pragueDay(now).split('-').map(Number);
  const [dy, dm, dd] = DEADLINE_DAY.split('-').map(Number);
  const diff = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(y, m - 1, d)) / DAY_MS);
  return Math.max(0, diff + 1);
}

const onSale = (now = new Date()) => now <= ACCESS_END;
const lastCall = (now = new Date()) => daysLeft(now) <= LAST_CALL_DAYS;
const monthlyAvailable = (now = new Date()) => onSale(now) && !lastCall(now);
const trialAvailable = monthlyAvailable;

function isSpring(now = new Date()) {
  return onSale(now) && daysLeft(now) === 0;
}

// Same day next month, clamped to the month's last day (31 Jan -> 28 Feb).
function addMonth(date, months = 1) {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next;
}

// What the monthly plan costs at most if bought now: every full period before
// the deadline, plus the last one charged only for the days up to it.
function monthlyMaxTotalCzk(now = new Date()) {
  let start = now;
  let total = 0;
  for (let i = 0; i < 12 && start < DEADLINE; i += 1) {
    const end = addMonth(now, i + 1);
    if (end <= DEADLINE) total += MONTHLY_PRICE;
    else total += MONTHLY_PRICE * (DEADLINE - start) / (end - start);
    start = end;
  }
  return Math.round(total);
}

// Season: 90 % of what monthly would cost until the deadline plus the spring
// bonus, within [SPRING_PRICE, SEASON_CAP]. Flat SPRING_PRICE in the last
// LAST_CALL_DAYS and after the deadline. Computed at Prague noon so it is one
// price for the whole Prague day; it only ever falls. null once nothing is on sale.
function seasonPriceCzk(now = new Date()) {
  if (!onSale(now)) return null;
  if (lastCall(now)) return SPRING_PRICE;
  const noon = new Date(pragueDay(now) + 'T12:00:00+01:00');
  const raw = Math.round(SEASON_FACTOR * monthlyMaxTotalCzk(noon) + SPRING_BONUS);
  return Math.min(SEASON_CAP, Math.max(SPRING_PRICE, raw));
}

// null when monthly is closed. singleCharge: less than a month left, so one
// payment for the days up to the deadline and nothing after.
function monthlyQuote(now = new Date()) {
  if (!monthlyAvailable(now)) return null;
  const totalCzk = monthlyMaxTotalCzk(now);
  const singleCharge = addMonth(now, 1) > DEADLINE;
  return { totalCzk, singleCharge, firstChargeCzk: singleCharge ? totalCzk : MONTHLY_PRICE };
}

// "Prodloužit do 30. 6." for a live monthly: the spring price plus every
// monthly payment still due before the deadline (usually none).
function springAddOnCzk(periodEnd) {
  const end = new Date(periodEnd);
  return SPRING_PRICE + (end < DEADLINE ? monthlyMaxTotalCzk(end) : 0);
}

// Withdrawal inside 14 days after an express request for immediate start: the
// consumer pays for the time used. Elapsed time counts from the payment, so
// free trial days are never charged.
function proRataOwedMinor({ paidMinor, paidAt, accessEndsAt, now = new Date() }) {
  const start = new Date(paidAt).getTime();
  const end = new Date(accessEndsAt).getTime();
  if (!(end > start)) return paidMinor;
  const share = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  return Math.round(paidMinor * share);
}

module.exports = {
  DEADLINE, ACCESS_END, SEASON_CAP, SEASON_FACTOR, SPRING_BONUS, SPRING_PRICE, MONTHLY_PRICE,
  LAST_CALL_DAYS, SPRING_ADDON_FROM, MIN_CHARGE_CZK, SEASON_TRIAL_DAYS, REFERRAL_DISCOUNT,
  REFERRAL_REWARD, REFERRAL_MIN_PRICE, REFERRAL_SETTLE_DAYS, WITHDRAWAL_DAYS, GUARDIAN_REFUND_DAYS,
  TERMS_VERSION, pragueDay, daysLeft, seasonPriceCzk, isSpring, onSale, monthlyAvailable,
  trialAvailable, monthlyMaxTotalCzk, monthlyQuote, springAddOnCzk, proRataOwedMinor,
};
