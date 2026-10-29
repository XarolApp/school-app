# Plan 025 — independent cloud review, 28 October 2026

Branch `review/plan-025`: `521aa8b` (plan 025 v3) and `f0a8d1d` (fixes for the plan 022 cloud
review). I checked them against `plans/025-revenue-and-payments-launch.md` §0–§13 and the founder
handoff (`docs/handouts/plan-025-cloud-handoff.md`). No production Supabase or Stripe was touched,
and email/reminder copy and `TRIAL_REMINDER_IMPLEMENTED` were left alone.

**Result: 2 findings (0 high, 0 medium, 2 low). both fixed (finding 1 in `3972e8b`, finding 2 in `21589f8`).** The
money paths the handoff asks about (amounts, double charges, webhook replay/ordering, access without
payment, refunds, monthly after 22 Feb, trial abuse, a parent's card reaching a child) had no
higher-severity defect I could show.

## Findings

### 1. LOW — fixed: the hourly cleanup could fail a one-click monthly that was still waiting for 3-D Secure

- **Where:** `server.js` `failStalePendingPurchases` (called from `chargeDueSeasonPasses`).
- **What happened:** the cleanup marks every non-trial `pending` purchase without a Checkout session
  `failed` after 2 hours. A one-click monthly (`monthlySavedCardPurchase`) whose card needs
  3-D Secure is left `pending` with `stripe_subscription_id` set, and the Stripe subscription stays
  `incomplete` and payable for about 23 hours. If the person finishes 3-D Secure after 2 hours (for
  example from Stripe's "confirm your payment" email), `customer.subscription.updated(active)` asks
  the ledger for `failed → active`. The ledger refuses that step and returns `stale`, so the
  customer is billed 249 Kč a month until 22 Feb with no access. Unlike a season PaymentIntent,
  there is no orphan refund for this case.
- **Fix:** the cleanup now skips rows with a `stripe_subscription_id`. Stripe's own
  `incomplete_expired` update still fails them (`purchaseStatusFromStripe`).
- **Test:** `tests/server-boundaries.test.cjs`, last test. It fails without the fix (119/120) and
  passes with it.

### 2. LOW — fixed in `21589f8`: a withdrawal racing the hourly refund sweep can refund in full

- **Where:** `server.js` `withdrawPlanForUser`. It sets `status='withdrawn', refund_status='pending'`
  first and only later computes and stores `refund_amount_minor`, after several Stripe calls.
  `chargeDueSeasonPasses`'s refund sweep picks up `withdrawn` + `pending` rows and calls
  `refundCanceledSeasonPurchase`, which refunds everything when `refund_amount_minor` is null.
- **Scenario:** the hourly worker runs inside that 1–2 second window, or the process dies in it.
  The pro-rata deduction (§4.7) is lost and the full remaining amount is refunded. The odds are
  small and the loss is limited to the deduction (days used), never more than the person paid.
- **Fix (`21589f8`):** `withdrawPlanForUser` now retrieves the PaymentIntent and computes the quote before the first write, and stores `refund_amount_minor` in the same update that sets `refund_status='pending'`, so the sweep never sees `pending` without the amount. Test: last test in `tests/server-boundaries.test.cjs` (fails without the fix). The sweep itself was not changed: a null amount is legitimate for a pre-access season cancellation (full refund) and cannot be told apart from the old gap.
- **Why it was not fixed in the first review:** the clean fix moves the quote (PaymentIntent retrieve plus
  `withdrawalQuote`) before the first status write, and that reorders the whole withdrawal money
  path. That is more than a targeted change. Suggested fix: compute and store `refund_amount_minor`
  in the same update that sets `refund_status='pending'`.

## Plan 022 findings — verification of the fixer's claims

| # | Claim | Verified |
|---|---|---|
| 1 | Fixed in `f0a8d1d` (`incomplete` → `pending`) | Yes. The ledger allows `pending → active`; the test checks the mapping. |
| 2 | Fixed in `f0a8d1d` (`2026-10-28-ledger-clock-fix.sql`) | Yes. The new function is the plan 025 version of `apply_stripe_purchase_event` plus only the clock changes (diffed), so it does not undo plan 025. The mirror is byte-for-byte in `supabase-setup.sql`. **Applied by the founder in Supabase on 2026-10-29.** |
| 3 | Already fixed by `521aa8b` | Yes. `discard()` retrieves the session and returns `false` on `complete`; both callers return `CHECKOUT_PROCESSING` instead of failing the row. |
| 4 | Already fixed by `521aa8b` | Yes. `claim_due_season_charges` returns `price_amount_minor` and the worker charges `purchase.price_amount_minor`. |

## Scope of `521aa8b` against the handoff's file list

- All "belongs" files are present. Nothing from `skills-lock.json`, `reports/**`, `seedance-demo/`,
  `Claude outputs/`, `.agents/`, `.claude/skills/`, `scripts/import-admission-data.js` or
  `docs/skolamatch_90_point_context.md` is in the commit.
- Four files the handoff lists as "leave out" are in it, but each change is plan 025 work, so I see
  nothing to remove:
  - `SearchFilters.jsx` and `search.css`: the §6.2 "Loni zbyla volná místa" filter and the §6.1
    dates card styles.
  - `Prihlaska.jsx`: the §6.3 "Skutečné body z přijímaček" label.
  - `BetaClosingQuestionnaire.jsx`: one copy line, "konce března" → "30. června 2027", matching the
    new access end.
- "Unsure" files: `AdmissionDatesCard.jsx`, `admissionDates.js` and `Search.jsx` are §6. `Cesta.jsx`
  is the same access-end copy change. `main.jsx` adds the §4.8 `?pozvanka=` capture. All belong.

## Checked with no finding

- `lib/season.js`: prices, `monthlyQuote`, `springAddOnCzk` and `proRataOwedMinor` match §2. The
  invariant tests pass.
- Checkout:
  - immediate start, `confirmPriceCzk`, `TRIAL_NOT_AVAILABLE` and `MONTHLY_CLOSED` are all enforced;
  - payment mode is used without a trial;
  - the `singleCharge` anchor is set;
  - sessions get a 1-hour `expires_at`;
  - a pending row is reused when the price or terms change, and expired otherwise.
- Saved-card routes: the same `onsession:<purchase>` key on a double click; a second monthly is
  blocked through `subscriptions.list`; on extend, the old monthly is cancelled only after
  `payment_intent.succeeded`, and the `customer.subscription.deleted` that follows cannot expire the
  new season (only newer *active* purchases outrank).
- Parent card: `savedCardFor` requires the fingerprint of the person's own `self` purchase, and
  non-trial parent payments do not write the customer or card onto the child. The season *trial*
  path still writes them, because the scheduled charge needs them, but the fingerprint rule keeps
  them out of one-click.
- Trial abuse: one trial per account and per card fingerprint, enforced at checkout and in the
  setup webhook. The webhook replay path re-runs the follow-ups.
- Refunds:
  - the orphan refund on a failed one-click purchase;
  - withdrawal pro rata with the express-request rule;
  - refund kinds tagged, so referral/orphan refunds are not mistaken for the withdrawal;
  - referral payouts capped at the referrer's net paid, never self or same card.
- SQL:
  - all new functions are security definer, revoked from `public/anon/authenticated` and granted to
    `service_role`; RLS is on for the new tables;
  - `supabase-setup.sql` runs fresh and twice in PGlite;
  - main's schema plus all migrations up to `ledger-clock-fix`, applied twice, gives the same
    functions/columns/RLS/grants as `supabase-setup.sql`;
  - the only rerun error is re-running the *older* chunk-2 migration after `revenue-model.sql`
    (return type changed), which never happens when migrations are applied once in order.

## Commands and results

| Command | Result |
|---|---|
| `git checkout -B review/plan-025 origin/review/plan-025` | head `f0a8d1d` |
| `npm ci && npm test` (root), before the fix | 313/313 pass |
| `cd frontend && npm ci && npm run lint && npm run build`, before the fix | 0 errors (12 existing warnings), built |
| New test against the old `failStalePendingPurchases` | fails (119/120 in `server-boundaries`) |
| After the fix: `npm test` | **314/314 pass** |
| After the fix: `npm run lint` / `npm run build` | 0 errors (12 existing warnings) / built |
| `node --check server.js`, `git diff --check` | clean |
| PGlite 0.2.17: `supabase-setup.sql` fresh + rerun; migrations vs setup diff | pass; parity |

Not done (cannot be done from a cloud session): Stripe test clocks, real card or 3-D Secure runs,
browser checks of the paywall with a signed-in account.

## Only the founder can do

1. **Apply `migrations/2026-10-28-ledger-clock-fix.sql`** in Supabase (SQL editor). It is safe to
   run twice. Verify with:
   `select pg_get_functiondef(p.oid) like '%v_moves_purchase%' and pg_get_functiondef(p.oid) like '%v_has_patch%' from pg_proc p where p.proname='apply_stripe_purchase_event' and p.pronamespace='public'::regnamespace;` → `true`.
   Deploy the `f0a8d1d` server change together with this migration or after it. This review's fix
   needs no SQL.
2. **The three Stripe test-clock runs (§4.4 gate)** on your Mac with your test keys:
   - start the backend, the frontend and `stripe listen --forward-to localhost:5001/webhooks/stripe`,
     with no `--events` filter so `invoice.created` arrives;
   - in the Stripe test dashboard, create a test clock at 18 Nov 2026 12:00, 1 Feb 2027 12:00 and
     22 Jan 2027 10:00;
   - buy monthly with card 4242 on a customer attached to each clock, and advance each clock past
     22 Feb;
   - write down every invoice amount and whether the last one came from Stripe's proration or our
     credit.

   Expected:

   | Clock | Expected invoices |
   |---|---|
   | 18 Nov | 249 / 249 / 249 / ~40, then `canceled` |
   | 1 Feb | one ~191, then `canceled` |
   | 22 Jan | 249, then the 22 Feb renewal credited to 0 |

3. **The localhost test script** `docs/handouts/plan-025-founder-test.md`: browser checks of the
   paywall, Settings, the cancel/restore screens and ParentPay with a signed-in account, plus case 9
   (3-D Secure card `4000 0025 0000 3155`).
4. ~~Decide on finding 2~~ — fixed (see above).
5. Push to `main` only after 1–3 pass. Nothing in this review was pushed to `main`.
