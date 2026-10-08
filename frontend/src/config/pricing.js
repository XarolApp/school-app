/**
 * Střední na míru — pricing & trial configuration.
 *
 * Frontend source for price, plan and purchase-trial strings. Backend prices,
 * Stripe Price configuration and contractual terms must be reconciled separately.
 * Nothing about money may be hardcoded in a component. If you need a number
 * here that does not exist, add it here first.
 *
 * Prices locked 2026-09-21: season 690 Kč (one-time), monthly 249 Kč.
 * Historical research below explains the product decision; its market figures
 * and regulatory hypotheses are not current legal/provider verification.
 *
 * ---------------------------------------------------------------------------
 * PLAN STRUCTURE — ruling C-8, third and current revision (2026-08-23)
 * ---------------------------------------------------------------------------
 * Source: docs/sources/pricing_research.md (RevenueCat / Adapty 2025-2026,
 * plus a dedicated 2026-08-23 follow-up on single-lifetime-use apps). Read
 * both sections before changing anything below.
 *
 * The weekly plan is DROPPED and must not be reintroduced:
 *   - weekly converts well largely because users lose track of a small
 *     recurring charge, which is the mechanism EU regulators are targeting;
 *   - weekly 6-month retention rarely exceeds ~10% vs 20-40% for monthly;
 *   - six renewal decisions across a Sept-March decision reads as predatory to
 *     a parent and produces six chances to churn.
 *
 * The test axis is COMMITMENT SHAPE, not duration:
 *   Sezónní přístup — one-time payment after a 3-day free trial, covers the
 *                     whole Sept-March season
 *   Měsíční        — recurring, cancel any time, without a trial
 *
 * Pre-selected: SEZÓNNÍ PŘÍSTUP (one-time). This flipped from the first build
 * (which pre-selected Měsíční) after the follow-up research came back:
 *   - Střední na míru is not "seasonal-recurring" like a fitness app — a given user
 *     goes through this exactly once in their life. Recurring billing solves
 *     a renewal problem this product does not have.
 *   - Gen Z (proxy for the teen persona) shows the highest "paying for
 *     something no longer used" rate of any generation; the parent persona
 *     (the more likely actual payer) skews the other way — disciplined,
 *     recurring-fatigued, and more likely to read an unexplained monthly
 *     charge tied to a one-off decision as "one more subscription to
 *     remember to cancel." One-time is the better fit for the payer, even
 *     though the teen is the one clicking through the quiz.
 *   - Real-world precedent: UWorld (exam prep — the closest analog: bounded,
 *     high-stakes, single-event use) sells fixed-window access passes that
 *     expire and do NOT auto-renew, not subscriptions. That is the model to
 *     copy, including how it is described (see windowLabel/terms below — this
 *     must read as "access through a deadline," never as "lifetime access").
 *   - Your acquisition channel (influencer/affiliate) is paid on realized
 *     revenue, not upfront CPI, which removes the usual reason recurring
 *     billing is needed to amortize acquisition cost. Re-open this decision
 *     if paid CPI ads (Meta/Google) are ever added as a channel.
 *
 * MĚSÍČNÍ is kept, not cut, and is NOT just "the cheaper option" — its job is
 * absorbing distrust from someone who has never heard of Střední na míru and wants
 * an easy exit before committing to the full price. Frame it that way in any
 * copy you write for it, not as a discount/decoy tier.
 */

// --- PRICES (Kč) — locked 2026-09-21 ---
const MONTHLY_PRICE_CZK = 249;
const SEASON_PRICE_CZK = 690; // one-time, whole season

/** Historical Sept-March denominator; the unqualified daily display is FE-10. */
const SEASON_DAYS = 212;

/**
 * Whole months in the Sept-March decision window. Used ONLY to build the
 * "ušetříš X %" comparison on the plan screen, which must be checkable:
 * SEASON_PRICE vs MONTHLY_PRICE x SEASON_MONTHS. See savingsVsMonthly().
 */
const SEASON_MONTHS = 7;

// --- TRIAL -------------------------------------------------------------------
// Ruling C-1 (revised by the user 2026-08-23): compressed 3-day trial.
// Dnes -> 2. den připomenutí -> 3. den platba.
// NOTE for the user: pricing_research.md flags 3 days as the highest Day-0/1
// "rushed cancellation" risk, and questions whether 3 days is enough time to
// run the quiz, visit dny otevřených dveří and feel the value. Kept at 3 per
// explicit instruction; lengthening is a one-constant change here.
export const TRIAL_DAYS = 3;

/**
 * Czech plural agreement for the trial length. `den` takes three forms and
 * TRIAL_DAYS is a tunable constant, so this cannot be hardcoded in copy:
 * 1 -> "1 den", 2-4 -> "3 dny", 5+ -> "7 dní". Getting this wrong ("prvních 3
 * dní") reads as machine-translated on the exact screen where a Czech parent
 * is deciding whether we look legitimate.
 */
export function trialDaysPhrase() {
  if (TRIAL_DAYS === 1) return '1 den';
  if (TRIAL_DAYS < 5) return `${TRIAL_DAYS} dny`;
  return `${TRIAL_DAYS} dní`;
}

/** "První 3 dny zdarma" / "Prvních 7 dní zdarma". */
export function trialFreeLabel() {
  return TRIAL_DAYS < 5
    ? `První ${TRIAL_DAYS} dny zdarma`
    : `Prvních ${TRIAL_DAYS} dní zdarma`;
}

/**
 * Trial reminder delivery is not implemented. Only enable this flag after the
 * scheduler, cancellation-aware retries and actual mailbox delivery are verified.
 * Founder policy requires a day-2 reminder before real seasonal billing; the
 * current UI does not promise it. Other mail/confirmation code is not proof that
 * this reminder exists. See the deployment payment handoff.
 */
export const TRIAL_REMINDER_IMPLEMENTED = false;

/**
 * Settings and POST /api/subscription/cancel implement self-service cancellation:
 * during a trial it stops the scheduled charge, otherwise monthly cancellation
 * is scheduled for period end. This flag describes the implemented UI/API, not
 * proof of a safe payment lifecycle, durable confirmation delivery or compliance.
 * Cancellation/charge races and refund recovery remain paid-launch gates.
 */
export const ONE_STEP_CANCELLATION_IMPLEMENTED = true;

/**
 * Optional extra guarantee badge is disabled. This is not the actual withdrawal
 * cutoff: Terms and server withdrawal currently grant 30 days. Do not shorten
 * that benefit or infer a 14-day implementation from this unused badge flag.
 * Statutory/commercial calendar boundaries need the legal/payment handoff review.
 */
export const REFUND_GUARANTEE_DAYS = 0;

// --- PLANS -------------------------------------------------------------------
/**
 * Copy fields that read differently to a teenager and to a parent are objects
 * keyed by role, not strings. §0.2 is not only about the screens — a plan card
 * that says "nic si nemusíš pamatovat zrušit" to a parent breaks vykání on the
 * single screen where an adult is deciding whether to trust us with money.
 * Use planCopy(plan, role, field) to read them.
 */
export const PLANS = [
  {
    id: 'season',
    name: 'Sezónní přístup',
    priceCzk: SEASON_PRICE_CZK,
    billing: 'one_time',
    periodDays: SEASON_DAYS,
    periodLabel: 'do konce přihlašovacího období',
    priceSuffix: 'jednorázově',
    // Fixed-window pass framing (UWorld precedent) — an explicit end point,
    // never "lifetime" or open-ended access. See ruling C-8 note above.
    windowLabel: 'přístup do konce března',
    /** What literally happens to the money. Factual, not persuasive. */
    terms: {
      student:
        'Zaplatíš jednou. Přístup ti běží do konce března a pak skončí — nic se neobnovuje.',
      parent:
        'Jednorázová platba. Přístup je časově omezený do konce března, pak skončí. Nic se automaticky neobnovuje.',
    },
    /** Why a user would pick this one. Persuasive, but true. */
    pitch: {
      student: 'Zaplatíš jednou a máš klid až do přihlášek. Nic ti pak z účtu neodchází.',
      parent:
        'Jedna platba na celé rozhodovací období. Žádné opakované strhávání, na které byste museli myslet.',
    },
    ctaLabel: {
      student: `Vyzvednout si moje ${trialDaysPhrase()} zdarma`,
      parent: `Vyzvednout ${trialDaysPhrase()} zdarma pro dítě`,
    },
    // Founder decision: a three-day purchase trial only on the seasonal plan.
    // Ordinary-account access trial and beta feedback access are separate flows.
    hasTrial: true,
    recommended: true,
  },
  {
    id: 'monthly',
    name: 'Měsíční',
    priceCzk: MONTHLY_PRICE_CZK,
    billing: 'recurring',
    periodDays: 30,
    periodLabel: 'měsíc',
    priceSuffix: '/ měsíc',
    windowLabel: 'obnovuje se každý měsíc',
    terms: {
      student: 'Platí se každý měsíc, dokud to nezrušíš.',
      parent: 'Platba se opakuje každý měsíc, dokud ji nezrušíte.',
    },
    // Trust/easy-exit framing, not a cheaper decoy — see ruling C-8 note above.
    // Deliberately names the distrust out loud instead of pretending it away.
    pitch: {
      student: 'Neznáš nás a nechceš dát všechno hned? Začni měsíčně a skonči, kdykoli budeš chtít.',
      parent:
        'Pokud nás zatím neznáte a chcete si to nejdřív vyzkoušet: měsíční varianta se dá kdykoli ukončit.',
    },
    ctaLabel: {
      student: 'Pokračovat s měsíčním',
      parent: 'Pokračovat s měsíčním',
    },
    // No trial here any more — see the note on the season plan above.
    // Its exit is cancellation, not a free window, and the plan card says so.
    hasTrial: false,
    recommended: false,
  },
];

export const DEFAULT_PLAN_ID = 'season';

// --- ONE-TIME OFFER (ruling C-9) --------------------------------------------
// Shown on the FIRST paywall view only and never again. The discount is
// genuine: when it expires the price simply returns to full — the product
// itself never becomes unavailable, and the copy must never imply it does.
export const ONE_TIME_OFFER = {
  discountPercent: 30, // PLACEHOLDER
  windowMinutes: 15,
  planId: 'season', // applies to the one-time seasonal price
};

/**
 * OFF for real payments (plan 009). A client-side entitlement can be reset by
 * clearing cookies or opening an incognito window, which makes the "jen teď,
 * jednorázově" claim false in practice. Shown to minors that is a DSA Art. 25
 * dark-pattern problem, not a rough edge — so it stays off until eligibility
 * and expiry are issued and enforced server-side (tracked in UNFORGET.md).
 * Every consumer of ONE_TIME_OFFER below must check this flag and degrade to
 * "full price, no countdown" — never to a broken or empty element.
 */
export const ONE_TIME_OFFER_ENABLED = false;

// --- PAYMENTS ----------------------------------------------------------------
/**
 * Both plans use server-created Stripe Checkout rather than a frontend mock.
 * Local configuration is test mode. This flag does not detect deployed key mode,
 * authorize live billing or govern free beta preview access. Adult operator/
 * provider verification, lifecycle/refund fixes, reminder delivery and end-to-end
 * test-mode acceptance are required before live billing; key swapping is insufficient.
 */
export const PAYMENTS_MOCKED = false;

// --- Helpers -----------------------------------------------------------------
export function getPlan(planId) {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}

/** Reads a role-keyed plan copy field. Falls back to the student voice. */
export function planCopy(plan, role, field) {
  const value = plan?.[field];
  if (!value) return '';
  if (typeof value === 'string') return value;
  return role === 'parent' ? value.parent : value.student;
}

/** The plan that carries the free trial, if any — used to surface the trial
 *  as a reason to consider the secondary plan when the default has none. */
export function trialPlan() {
  return PLANS.find((p) => p.hasTrial) || null;
}

/**
 * Cancellation / exit terms. NEVER hardcode this in a component: what we are
 * allowed to claim depends on ONE_STEP_CANCELLATION_IMPLEMENTED, and the whole
 * point of that flag is that exactly one place decides.
 * @returns {{text:string, unbuilt:boolean}}
 */
export function cancellationTerms(plan, role) {
  const parent = role === 'parent';
  if (plan.billing !== 'recurring') {
    return {
      text: parent
        ? 'Platbu lze během zkušebního období zrušit v Nastavení. Po zaplacení se přístup automaticky neobnovuje.'
        : 'Platbu během zkušebního období zrušíš v Nastavení. Po zaplacení se přístup sám neobnoví.',
      unbuilt: false,
    };
  }
  if (ONE_STEP_CANCELLATION_IMPLEMENTED) {
    return {
      text: parent
        ? 'Zrušit lze kdykoli jedním kliknutím v účtu, bez volání a bez psaní podpoře.'
        : 'Zrušíš kdykoli jedním kliknutím v účtu. Nikomu nemusíš nic vysvětlovat.',
      unbuilt: false,
    };
  }
  return {
    text: parent
      ? 'Zrušení na jedno kliknutí zatím nemáme hotové, takže ho neslibujeme. Opakované platby spustíme až s ním.'
      : 'Rušení na jedno kliknutí ještě nemáme hotové, tak ho neslibujeme. Opakované platby spustíme až s ním.',
    unbuilt: true,
  };
}

/** Refund guarantee line for the one-time plan, or null if no policy exists. */
export function refundTerms(plan, role) {
  if (!REFUND_GUARANTEE_DAYS || plan.billing === 'recurring') return null;
  return role === 'parent'
    ? `Do ${REFUND_GUARANTEE_DAYS} dnů vracíme peníze bez vysvětlování.`
    : `Do ${REFUND_GUARANTEE_DAYS} dnů ti peníze vrátíme, i bez důvodu.`;
}

/**
 * Czech decimal comma. Daily micro-cost framing (§1.5).
 * TWO decimals, not one: toFixed(1) renders 690/212 as "3,3 Kč", and a money
 * amount with one decimal place reads as a rendering bug on the exact screen
 * where the user is deciding whether we look like a real company.
 */
export function perDayCzk(plan) {
  const perDay = plan.priceCzk / plan.periodDays;
  return perDay.toFixed(2).replace('.', ',');
}

export function formatCzk(amount) {
  return `${Math.round(amount).toLocaleString('cs-CZ')} Kč`;
}

export function discountedPriceCzk(plan) {
  if (!ONE_TIME_OFFER_ENABLED || plan.id !== ONE_TIME_OFFER.planId) return plan.priceCzk;
  return Math.round(plan.priceCzk * (1 - ONE_TIME_OFFER.discountPercent / 100));
}

/**
 * The "ušetříš X %" badge on the season card, WITH the numbers that produce it.
 *
 * A savings badge nobody can check is just a claim. Babbel's pattern (and the
 * one the approved design copies) is badge + a footnote naming both sides of
 * the comparison and admitting where it does not hold. Everything the footnote
 * needs comes out of this one function so the badge and the footnote can never
 * drift apart.
 *
 * @returns {{percent:number, referenceCzk:number, months:number,
 *            monthlyCzk:number, seasonCzk:number}}
 */
export function savingsVsMonthly() {
  const season = getPlan('season');
  const monthly = getPlan('monthly');
  const referenceCzk = monthly.priceCzk * SEASON_MONTHS;
  return {
    percent: Math.round((1 - season.priceCzk / referenceCzk) * 100),
    referenceCzk,
    months: SEASON_MONTHS,
    monthlyCzk: monthly.priceCzk,
    seasonCzk: season.priceCzk,
  };
}

// --- TRIAL TIMELINE DATES ----------------------------------------------------
/**
 * The trial rail shows REAL dates, not "za 3 dny". A concrete date is the one
 * thing that makes a trial checkable by the person paying — and it is what a
 * user needs in order to put it in a calendar, which matters more than usual
 * here because TRIAL_REMINDER_IMPLEMENTED is false and nobody is going to
 * remind them.
 *
 * Day numbering follows the approved design: today is day 1 and is free, the
 * reminder lands on day TRIAL_DAYS (the last free day), and the charge falls on
 * day TRIAL_DAYS + 1 — i.e. three FULL free days, not two.
 */
export const TRIAL_REMINDER_DAY_NUMBER = TRIAL_DAYS;
export const TRIAL_CHARGE_DAY_NUMBER = TRIAL_DAYS + 1;

function addDays(from, days) {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** Last free day — when the reminder would be sent, once one exists. */
export function trialReminderDate(from = new Date()) {
  return addDays(from, TRIAL_DAYS - 1);
}

/** First day money can move. */
export function trialChargeDate(from = new Date()) {
  return addDays(from, TRIAL_DAYS);
}

/** "8. září" — the form a Czech reader expects in a sentence, not 08.09.2026. */
export function formatCzDate(date) {
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
}
