# Plan 025 — handoff for a cloud review session (read this first, no other context needed)

You are a fresh session. Do the steps below in order. Anything you cannot do from a cloud environment, stop and
tell the founder exactly what to do (they are a solo founder, Czech, wants plain direct language, no lawyer budget:
never answer "ask a lawyer", minimise legal risk yourself).

## What this is
Střední na míru: React/Vite frontend (`frontend/`), Express backend (`server.js`), Supabase, Stripe. Plan 025
(`plans/025-revenue-and-payments-launch.md`) is the revenue/payments model for the 1 Nov 2026 launch. Version **v3** is
implemented on the branch `review/plan-025`. Read the plan top to bottom (especially §0, §2, §4, §4.11, §13).

Fixed rules (founder): monthly never charges after 22 Feb 2027; paid access ends 30 Jun 2027; spring alone never below
149 Kč; season = clamp(0.9 × monthly-until-22-Feb + 49, 149, 499), flat 149 from 9 Feb; monthly closed from 9 Feb;
monthly bills on the purchase anniversary, last period prorated; "Prodloužit do 30. 6." for live monthly users from
1 Feb = 149 Kč + any monthly payment still due. Do NOT edit email/reminder promises or the `TRIAL_REMINDER_IMPLEMENTED`
flag (the founder builds emails).

## Current state (verified 2026-10-28 on the founder's Mac)
- `npm test` (repo root): 309 pass, 0 fail. `cd frontend && npm run lint` 0 errors (12 old warnings), `npm run build` ok.
- The migration `migrations/2026-10-28-revenue-model.sql` was applied by the founder in Supabase and its verify query
  returned the expected values.
- NOT done: the three Stripe test-clock runs (plan §4.4 gate; need the founder's Stripe TEST keys) and the founder's
  localhost test script (`docs/handouts/plan-025-founder-test.md`). Nothing is pushed to `main`.

## Your job
1. Install and run the checks: `npm ci && npm test` (root), `cd frontend && npm ci && npm run lint && npm run build`.
   Report the exact results. If something fails, say so with the output; do not hide it.
2. **Review** the implementation against the plan. Look for real bugs, not style: money amounts, double charges,
   webhook replay/ordering, access granted without payment, refunds, a monthly charge after 22 Feb, trial abuse,
   a parent's card reaching a child's account, SQL that is not safe to run twice (`supabase-setup.sql`). Key files:
   `lib/season.js`, `server.js` (search: `createCheckoutForUser`, `monthlySavedCardPurchase`, `extendMonthly`,
   `reserveSavedCardPurchase`, `abandonPendingPurchases`, `savedCardFor`, `creditLastMonthlyPeriod`, `handleStripeWebhook`,
   `setupFollowUps`, `refundOrphanPayment`, `settleReferrals`, `withdrawPlanForUser`), `migrations/2026-10-28-revenue-model.sql`,
   `supabase-setup.sql`, `tests/revenue-025.test.cjs`, `tests/server-boundaries.test.cjs` (bottom: plan 025 v3 tests),
   frontend `components/SubscriptionManager.jsx`, `components/SavedCardBuy.jsx`, `lib/usePrices.js`, `pages/onboarding/screens/{Plan,Platba,Zkusebni,Activated}.jsx`,
   `pages/{Settings,SubscriptionExpired,ParentPay,Legal}.jsx`.
3. Fix what you find (small, targeted changes + a test for each), re-run all checks.
4. Commit to the branch `review/plan-025` only (push with `git push origin HEAD:review/plan-025`). Never push to `main` (a push to `main` deploys to production). Never commit `.env`
   or any secret. Stage explicit files, never `git add -A`.
5. Write your findings and what you changed into `reports/plan-025-cloud-review.md` (commit it too).

## Things only the founder can do — ask them, do not guess
- Run SQL in Supabase (you cannot reach their database). If you change any SQL, give them the migration text plus a
  one-line verify query, and mirror it byte-for-byte in `supabase-setup.sql` (a test checks the mirror).
- The Stripe test-clock runs (plan §4.4 gate / test script case 6) and any real card test. They need Stripe test keys
  and the Stripe CLI on their Mac. Give them the exact steps; do not ask for keys in chat.
- Browser checks of the paywall (needs a signed-in account and the Supabase/Stripe env).
- Deciding anything about price, copy, or legal wording that is not already settled in the plan.

## Files that belong to plan 025 (the commit on `review/plan-025` contains these)
Modified: `server.js`, `supabase-setup.sql`, `migrations/2026-10-22-season-charge-lifecycle.sql`,
`tests/server-boundaries.test.cjs`, `CLAUDE.md`, `AGENTS.md`, `UNFORGET.md`, `docs/skolamatch_current_status.md`,
`plans/README.md`, `frontend/src/api.js`, `frontend/src/config/pricing.js`, `frontend/src/pages/{Legal,ParentPay,Settings,SubscriptionExpired}.jsx`,
`frontend/src/pages/onboarding/screens/{Activated,Plan,Platba,Zkusebni}.jsx`.
New: `lib/season.js`, `migrations/2026-10-28-revenue-model.sql`, `plans/025-revenue-and-payments-launch.md`,
`tests/revenue-025.test.cjs`, `docs/handouts/plan-025-founder-test.md`, `docs/handouts/plan-025-cloud-handoff.md`,
`frontend/src/components/{SavedCardBuy,SubscriptionManager}.jsx`, `frontend/src/lib/{payFlow,referral,usePrices}.js`.
Also included (spring value §6, referral capture, copy): `frontend/src/components/{AdmissionDatesCard,SearchFilters,BetaClosingQuestionnaire}.jsx`, `frontend/src/config/admissionDates.js`, `frontend/src/pages/{Search,Prihlaska}.jsx`, `frontend/src/pages/search.css`, `frontend/src/pages/onboarding/screens/Cesta.jsx`, `frontend/src/main.jsx`.
Not plan 025, left out: `scripts/import-admission-data.js`, `skills-lock.json`, `docs/skolamatch_90_point_context.md`,
`reports/**`, `seedance-demo/`, `Claude outputs/`, `.agents/`, `.claude/skills/`.

## Models (project rule in CLAUDE.md)
Review/debugging: Opus 5.5 at low effort. Implementing fixes: Sonnet 5.5 medium/high.
