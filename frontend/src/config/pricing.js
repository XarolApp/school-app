/**
 * ŠkolaMatch — pricing & trial configuration.
 *
 * SINGLE SOURCE OF TRUTH for every price, plan and trial string in the app.
 * Nothing about money may be hardcoded in a component. If you need a number
 * here that does not exist, add it here first.
 *
 * !!! ALL PRICES BELOW ARE PLACEHOLDERS !!!
 * The user has not fixed final pricing (confirmed 2026-08-23). Change the
 * constants in this file and every price surface updates.
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
 *   Sezónní přístup — one-time payment, covers the whole Sept-March season
 *   Měsíční        — recurring, cancel any time, with a 3-day free trial
 *
 * Pre-selected: SEZÓNNÍ PŘÍSTUP (one-time). This flipped from the first build
 * (which pre-selected Měsíční) after the follow-up research came back:
 *   - ŠkolaMatch is not "seasonal-recurring" like a fitness app — a given user
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
 * absorbing distrust from someone who has never heard of ŠkolaMatch and wants
 * an easy exit before committing to the full price. Frame it that way in any
 * copy you write for it, not as a discount/decoy tier.
 */

// --- PLACEHOLDER PRICES (Kč) -------------------------------------------------
const MONTHLY_PRICE_CZK = 249; // PLACEHOLDER
const SEASON_PRICE_CZK = 690; // PLACEHOLDER — one-time, whole season

/** Sept-March application window, used only for the honest daily breakdown. */
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
 * §0.4 + C-1 are binding: only promise a reminder that actually exists.
 * There is no e-mail/notification system in this codebase yet, so this flag is
 * false and the paywall timeline renders WITHOUT the day-2 reminder promise.
 * Flip to true ONLY once the reminder is genuinely implemented and sent.
 *
 * Target cadence when it is built (docs/sources/pricing_research.md §3, which
 * is also close to what the Digital Fairness Act direction would mandate):
 *   1. same-day activation nudge,
 *   2. reminder ~1 day before the trial ends,
 *   3. morning-of: "zkušební období dnes končí, platba proběhne / zrušit můžeš".
 * Unreminded charges are what turn into refunds, chargebacks and 1-star reviews.
 */
export const TRIAL_REMINDER_IMPLEMENTED = false;

/**
 * §0.4 again, same standard as TRIAL_REMINDER_IMPLEMENTED: only promise a
 * cancellation mechanism that actually exists.
 *
 * There is no account settings screen, no subscription record and no cancel
 * endpoint in this codebase, so "zrušit jedním kliknutím" would be an invented
 * promise on the one surface where an invented promise is most expensive.
 * pricing_research.md §4 flags the EU Digital Fairness Act's one-step
 * cancellation requirement ("cancellation button" of equivalent ease to
 * sign-up, plus a termination confirmation) as a pre-launch compliance item,
 * not a later cleanup — and it applies to the MĚSÍČNÍ plan, whose entire
 * reason to exist under C-8 is being the easy exit.
 *
 * Flip to true only when: a cancel control exists, it is at most one screen
 * deep, it takes effect without a support conversation, and it sends a
 * confirmation. Until then the paywall says out loud that we do not promise it.
 * BLOCKING for real billing on the recurring plan.
 */
export const ONE_STEP_CANCELLATION_IMPLEMENTED = false;

/**
 * Refund window for the ONE-TIME plan, in days.
 *
 * Why this constant exists at all: pricing_research.md (2026-08-23 update, §1)
 * found one-time purchases convert far better at the point of decision (12.1%
 * vs 2.2%) but carry ~1.7x the refund rate (5.8% vs 3.4%), and that regret on
 * a one-time payment lands immediately rather than gradually. Its explicit
 * recommendation is to build a visible, generous refund guarantee INTO the
 * one-time option — "a cost of the model, not a sign it's wrong for you."
 * The same section names the one-time model's core psychological weakness for
 * an unknown brand: "the money's gone if it disappoints."
 *
 * Now that Sezónní přístup is the pre-selected default (C-8 third revision),
 * the default plan has no exit at all — no trial, no cancellation, nothing.
 * A stated refund window is the only thing that can absorb that.
 *
 * 3 = a TESTING placeholder the user chose (2026-08-24), not a committed
 * number. 14 (the EU distance-selling floor) remains the benchmark to
 * reconsider against once a real number is picked.
 *
 * PRE-LAUNCH BLOCKER, same class as TRIAL_REMINDER_IMPLEMENTED and
 * ONE_STEP_CANCELLATION_IMPLEMENTED above: this is fine to display in dev/
 * testing, but showing a refund promise to a real paying user with no actual
 * refund process behind it is not safe. Do not flip PAYMENTS_MOCKED to false
 * until BOTH the final number is chosen AND a working refund process exists.
 */
export const REFUND_GUARANTEE_DAYS = 3;

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
    /**
     * THE TRIAL LIVES HERE, NOT ON MĚSÍČNÍ — flipped 2026-09-05 with the
     * approved 5-screen paywall design (design/paywall-multipage-extract4/,
     * annotation "cena"). Two reasons, both already written down elsewhere in
     * this repo before the design existed:
     *  1. pricing_research.md §2 — a trial belongs on the LONGER commitment.
     *     Put it on the cheap recurring tier and users simply trial the cheap
     *     tier instead of buying the one you actually want them on.
     *  2. The comment block at the top of this file already complains that
     *     Sezónní, as the pre-selected default, has NO exit of any kind ("no
     *     trial, no cancellation, nothing") and leans entirely on
     *     REFUND_GUARANTEE_DAYS to absorb that. A trial absorbs it better:
     *     nothing has been charged yet, so there is nothing to claw back.
     * Měsíční does NOT lose its C-8 job of absorbing distrust — it keeps it in
     * its own shape ("skončíš, kdy budeš chtít"), which is a different kind of
     * exit, not a weaker one. Do not give both plans a trial.
     */
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

// --- PAYMENTS ----------------------------------------------------------------
/**
 * No payment provider is integrated. The checkout button simulates success.
 * While this is true the paywall MUST say so on screen — a "Platba zabezpečená
 * přes Stripe" badge sitting over a fake button is a false trust signal, and a
 * false trust signal is the one thing that cannot be walked back with a parent.
 * Flip to false only once a real Stripe Checkout session is created server-side.
 */
export const PAYMENTS_MOCKED = true;

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
        ? 'Jednorázová platba — není co vypovídat. Nic se automaticky neobnovuje.'
        : 'Jednorázová platba — není co rušit. Nic se ti samo neobnoví.',
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
  if (plan.id !== ONE_TIME_OFFER.planId) return plan.priceCzk;
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
