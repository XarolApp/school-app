# Backend deployment review — 2026-10-07

> Snapshot of the first pass, with partial coverage. Some items were subsequently fixed or clarified; use [REPORT.md](REPORT.md), [continuation findings](continuation-findings.md) and the handoff for current status. Do not implement a historical finding without re-reading current source.


Scope: all 3,328 lines of `server.js`, all 1,376 lines of `supabase-setup.sql`, every authored line in `lib/**` and `tests/**`, root manifests/config examples/deployment config, and all 538 lines of plan 009. Exact per-file hashes and coverage are in `backend-coverage.json`. This reviewer made **no application, database, Stripe or configuration mutations**.

**Verdict:** deterministic tests pass, but the payment implementation is not ready for real billing. A beta restricted to confirmed `beta` accounts has explicit Stripe isolation; its main backend blockers are inconsistent match scores, nontransactional shortlist replacement, signed-in review-report/schema incompatibility, dependency advisories and operational limits. Parent review owns dependency remediation and live-service evidence. Do not equate a test Stripe key or a passing mocked test with a working real payment lifecycle.

## Verification and limits

- `npm test`: 122 passed, 0 failed, 0 skipped. Tests use mocks for Stripe/PostgREST and do not execute a fresh/repeated SQL installation.
- Reproduced with the actual matching module: school 3 scores **100** among cutoffs `[40,60,80]`, but **79** when scored alone for `{typ:'gymnazium',selektivita_vyzva:'vyzva'}`.
- Reproduced `sanitizeEvent({name:'result_view',path:'/skoly',props:{schools:[null]}})` throwing `TypeError` instead of rejecting the event.
- Parsed every generated district coordinate: 22 unique districts, 22 rings, 16,115 finite coordinate pairs, all within their declared bounding boxes, finite projection values, frontend district-ID parity. The 311 KB numeric literal on `lib/pragueDistricts.js:18` was structurally validated, not manually inspected coordinate by coordinate. All other lines were read normally. Frontend shapes are deliberately simplified, so coordinate equality is not expected.
- Parent's read-only service check reports all 26 declared tables present; anonymous HEAD responses exposed zero rows for sampled private tables; email confirmation is required; Stripe uses a test key with an active CZK 249 monthly price and an enabled HTTPS webhook. See `services.json` for precise evidence. These observations do not prove all RLS policies, RPC grants, webhooks, bucket policies or deployed environment variables are correct.
- No real charges, customer creation, mail sends, database writes, account deletion or live migration were performed. Payment concurrency and SQL findings below are established from implementation boundaries; reproduce against an isolated database/Stripe test project before enabling money.

## Findings that affect the beta

### B01 — P1: Identical schools receive different match percentages across pages

**Evidence:** `lib/matching.js:864–873`; `server.js:1258–1259`, `1293`, `1335`, `1352`, `1651`. Confidence **high**. Category correctness. Effort M; change risk medium.

Selectivity is a percentile calculated from the argument `schools`, while list/detail/comparison/favorites/picks pass different subsets. A school can be 100% on search and 79% when opened, with unchanged answers/data. This is a real score inconsistency, independent of CSS or display rounding. `tests/server-boundaries.test.cjs` substitutes a fake scorer and cannot detect it.

**Remediation:** compute a catalogue-wide selectivity context once and pass it consistently, or store a stable catalogue-derived selectivity per school. Add an actual-scorer regression asserting one school's score is unchanged for list/detail/comparison/favorites/picks. **Architecture followup; do not silently change scoring policy during a wording fix.**

### B02 — P1: Favorites, picks and onboarding omit inputs required by the shared scorer

**Evidence:** `server.js:1020`, `1026`, `1271–1274`, `1346`, `1645`; scoring consumes per-program and extracted detail fields in `lib/matching.js`. Confidence **high**. Correctness; effort S/M; risk low/medium.

Favorites fetch only `schools (*)`; picks omit `school_extracted_details`; onboarding saves scores without `school_programs`. The same answers are therefore evaluated against different tuition/ownership/program/activity/canteen inputs. Onboarding also omits the list's merged-school exclusion, so an obsolete school can enter its saved top 20. These problems remain even after B01 is fixed.

**Remediation:** centralize a canonical school-scoring projection/enrichment and use it at all scoring call sites; exclude merged predecessors from recommended identities while retaining their intentionally inherited admission history. Test a school with private/public obors and extracted activity values across all endpoints. The missing joins and merged filter are **certain simple bugs**, but shared scoring tests should accompany the fix.

### B03 — P1: Replacing application picks can erase the previous shortlist or exceed three rows

**Evidence:** `server.js:1678–1701`; `supabase-setup.sql:340–353`. Confidence **high**. Data integrity; effort M; risk medium.

The endpoint deletes the whole set and then inserts in a separate request. An integer school ID that does not exist passes validation, causing an FK error after the old set is gone. Network/process failure after deletion has the same result. Two tabs can interleave delete/delete/insert/insert and leave a union exceeding three rows or repeated priority values. The comments claiming there is no intermediate state are false.

**Remediation:** use a service-role-only transactional RPC replacing the set under a per-user row/advisory lock. Validate school existence/merged state and chosen obor before committing; enforce uniqueness of `(user_id,priority)` with deferred or whole-transaction semantics. Test failed insertion rollback and two concurrent replacements using PostgreSQL. **Architecture followup**, not merely adding a client debounce.

### B04 — P1: Authenticated review reports conflict with the canonical partial unique index

**Evidence:** `server.js:1590`; `supabase-setup.sql:313–317`. Confidence **high** for canonical schema; deployed index definition unverified. Moderation/correctness; effort S; risk low.

Signed-in reporting uses `upsert(...,{onConflict:'review_id,user_id'})`. The only declared matching unique index has `WHERE user_id IS NOT NULL`. A plain PostgreSQL `ON CONFLICT (review_id,user_id)` cannot infer that partial index without its predicate, producing `42P10`; anonymous insertion does not have this path. A signed-in tester cannot submit the report that drives moderation.

**Remediation:** use a regular unique index on `(review_id,user_id)` (ordinary NULL-distinct semantics still permit anonymous reports), or an RPC with matching conflict predicate. Verify deployed indexes first and test repeated signed-in reports plus multiple anonymous reports against real PostgreSQL. **Certain simple schema/API compatibility bug.** [PostgreSQL conflict-index inference](https://www.postgresql.org/docs/18/sql-insert.html).

### B05 — P1: Re-running the advertised idempotent SQL removes `review_reports`' primary key

**Evidence:** `supabase-setup.sql:313–314`. Confidence **high**. Migration/data integrity; effort S; risk medium.

First installation drops the old composite PK and adds `id ... PRIMARY KEY`. On the next run, line 313 drops that new `review_reports_pkey`; `ADD COLUMN IF NOT EXISTS id ... PRIMARY KEY` skips because `id` already exists. The table is then left without any primary key. Merely confirming that the table exists does not detect this drift.

**Remediation:** drop only the legacy composite PK after checking its definition, then separately ensure the `id` PK exists. Run fresh install and two consecutive reruns in a disposable Supabase/PostgreSQL database, asserting constraints and grants. Do not reapply the current SQL to production as a diagnostic. **Certain simple migration bug; live repair requires a reviewed migration.**

### B06 — P1 for school-group testing: Shared-IP limits can block an entire classroom

**Evidence:** `server.js:225–231`, `251–265`, global mount `303`. Confidence **high** for configured thresholds; actual classroom size/network unverified. Availability; effort S; risk medium.

Global API allowance is 300 requests per IP per 15 minutes; questionnaire is 15 per IP/hour and review/report allowance 5 per IP/hour. Individual feedback quotas correctly use account IDs, but the earlier global IP limiter still applies. Thirty school testers behind one NAT need only ten API calls each to exhaust the global allowance; the sixteenth questionnaire submission in an hour is rejected regardless of account.

**Remediation:** retain a coarse outer IP abuse budget and key authenticated product-action limits by user ID after authentication, with safe anonymous limits. Load-test the expected class size through one forwarded IP and verify Railway proxy trust before launch. **Policy/capacity decision**, record expected beta group size before selecting thresholds.

### B07 — P2: A malformed result telemetry item throws a server error

**Evidence:** `lib/betaAnalytics.js:31–33`. Confidence **high**, locally reproduced. Robustness; effort XS; risk low.

`schools:[null]` dereferences `v.id` before checking that `v` is an object. A malformed event becomes a TypeError/500 rather than a discarded event; the batch may lose valid neighbors. This endpoint accepts caller-supplied JSON.

**Remediation:** require non-null plain object elements before field access; test null, primitives, arrays and a valid result item. **Certain simple bug.** Search other array validators for the same missing element guard after fixing.

### B08 — P2: A valid points-only onboarding result is discarded before JPZ synchronization

**Evidence:** `lib/onboardingAnswers.js:140–142`, `155–158`; `server.js:1014–1015`, `1063`. Confidence **high** for control flow; product intention needs confirmation. Correctness; effort S; risk low.

`points`, `gain` and `reserve` translate to real admission-risk inputs, but `isScoreable` considers only six preference keys. A student choosing “nevím”/skipping preferences while entering exam points receives `nothing_to_score` before `syncJpzPoints`, so their valid points are not persisted into decision tools. Some ranking semantics may deliberately avoid points-only matching; points persistence need not depend on that choice.

**Remediation:** always validate and synchronize entered points independently of whether a matching run should be saved. Ask founder whether reserve/points alone should create a run. **Confirmed data-loss path, policy-dependent ranking fix.**

## Blockers before real payments

These are P1 release blockers for **money activation**. They need not prevent an isolated free beta if non-beta signup/payment access is actually disabled and production holds no live payment credentials.

### P01 — P1: Multiple Checkout sessions can create unmanaged duplicate monthly subscriptions

**Evidence:** `server.js:2737–2779`, `2828–2839`, `3082–3121`; only one subscription ID is stored. Confidence **high**. Money integrity; effort L; risk high.

Two tabs can request Checkout before either completion webhook updates the profile. Both sessions complete and create subscriptions. The second completion overwrites `stripe_subscription_id`; cancellation/account deletion then manages only the last one while the first continues billing. A previously issued session can also complete after another plan became active. The profile check at session creation is not a purchase reservation.

**Remediation:** persist purchase/session records and a per-account active checkout reservation, reuse/expire stale sessions, correlate fulfillment to an expected purchase, and reconcile/cancel/refund any duplicate Stripe subscription. Test simultaneous requests, two completions in either order and a late completion after a replacement plan. **Architecture followup.**

### P02 — P1: Cancellation or withdrawal can race the season worker and still charge

**Evidence:** `server.js:2875–2888`, `2980–2989`, `3238–3271`. Confidence **high**. Money integrity; effort L; risk high.

The worker reads due accounts into memory. Cancellation/withdrawal can clear the schedule and return success before the worker reaches `paymentIntents.create` using that stale row. The conditional update after payment does not prevent the charge; the season success webhook can then restore access. The user was told cancellation was immediate.

**Remediation:** introduce a durable purchase/charge state machine with atomically claimed work, explicit cancellation intent and compensating refund/reconciliation for the unavoidable external-payment race. Test controlled interleavings before claim, after claim and after Stripe success. **Architecture followup; re-reading just once narrows but does not close the race.**

### P03 — P1: Old or reordered signed events overwrite newer payment decisions

**Evidence:** `server.js:3035–3078`, `3131–3157`, `3161–3184`. Confidence **high**. Money/access integrity; effort L; risk high.

Season success/failure is correlated only by `app_user_id`, not the current purchase/PaymentIntent. An old success replay after withdrawal grants season access again; an old failure can downgrade a later paid plan. Setup deduplication compares only the currently stored SetupIntent, so A→B→late-A schedules A again. For monthly plans, an older `subscription.updated` delivered after deletion can reactivate the same stored subscription. These writes are absolute values, but that does not make their business effects order-independent.

**Remediation:** persist processed event IDs and purchase identity; ignore events for superseded/canceled/refunded purchases; reconcile subscription changes from the latest Stripe object instead of stale snapshot status. Test duplicate events after withdrawal, A/B/A setup completion, old payment failure after replacement, and updated-after-deleted delivery. [Stripe documents unordered and duplicate delivery](https://docs.stripe.com/webhooks#event-ordering). **Architecture followup.**

### P04 — P1: Season trial is measured from opening Checkout instead of completing it

**Evidence:** `server.js:3059–3062`, `3074`; season text at `2807–2809`. Confidence **high**. Billing timing; effort S/M; risk medium.

`object.created` is the Checkout Session's creation timestamp, despite the variable name `checkoutCompletedAt`. A payer who leaves Checkout open for hours receives fewer than three days after payment-method confirmation and may be charged earlier than promised. `plan_started_at` is also backdated. Tests currently encode the wrong timestamp.

**Remediation:** persist the first verified completion time from the completion event (or verified SetupIntent completion history) and keep it stable on retries; base trial and contract time on that value. Test session created yesterday and completed today. [Stripe defines Checkout `created` as object creation time](https://docs.stripe.com/api/checkout/sessions/object). **Certain bug, but choose and document the contractual clock deliberately.**

### P05 — P1: Any season charge error permanently strands the account

**Evidence:** `server.js:154–156`, `2875–2892`, `3273–3284`; eligibility `3241–3244`. Confidence **high**. Payment recovery; effort M/L; risk high.

All Stripe exceptions—including temporary network/5xx errors and off-session authentication requirements—set `past_due`. The worker only retries `trialing`, but leaves `season_charge_due_at` in place; `hasLivePlan` then blocks Checkout. Cancellation only handles season `trialing`, and there is no subscription ID to cancel. The user cannot complete authentication, change the card or restart purchase through these routes. Leaving `requires_action` for a webhook does not cause the customer to authenticate.

**Remediation:** persist the PaymentIntent/attempt identity; distinguish temporary failures, declines and SCA; retry safely; provide an authenticated recovery flow and explicit cancellation for pending/failed season purchases. Test network timeout, 500, decline and `authentication_required`. [Stripe's off-session guidance](https://docs.stripe.com/payments/save-and-reuse). **Architecture followup.**

### P06 — P1: Stripe idempotency keys alone do not make season charging permanently exactly-once

**Evidence:** `server.js:3266–3269`, `3301–3305`; no durable PaymentIntent ID on the purchase/profile. Confidence **high** for failure scenario. Money integrity; effort M/L; risk high.

After a successful charge, a prolonged failure to save the profile plus an unavailable webhook leaves the due row eligible. A retry after Stripe has pruned the idempotency record can create another charge with the same key. Comments claim stability across database retries without a retention limit; that guarantee is stronger than Stripe offers.

**Remediation:** persist a durable purchase ID and the created PaymentIntent, reconcile Stripe by purchase identity before any new create, and route ambiguous timeouts to reconciliation. Test an ambiguous successful payment followed by >24 hours of failed persistence. [Stripe can prune idempotency records after at least 24 hours](https://docs.stripe.com/api/idempotent_requests). **Architecture followup; combine with P02/P05 rather than add another independent queue.**

### P07 — P1: Withdrawal refunds are selected by customer/time instead of purchase identity

**Evidence:** `server.js:2960–2973`. Confidence **high**. Refund integrity; effort M; risk high.

Withdrawal lists every succeeded PaymentIntent for the customer's last purchase start minus one hour. It does not require the current plan/purchase, subscription or app metadata. If the same customer has a recent previous purchase, replacement or another charge, withdrawing this contract can refund that unrelated payment as well. The design already supports plan replacements, making time overlap plausible.

**Remediation:** refund only ledger-recorded charges belonging to the withdrawn purchase; handle partial/already-refunded amounts and pagination explicitly. Tests should include an unrelated succeeded intent within the lookback hour. **Architecture followup, depends on durable purchase records.**

### P08 — P1: Partial withdrawal failure can make the promised retry impossible

**Evidence:** `server.js:2940–2955`, `2969–2975`, `2978–3001`, `3175–3184`; `canWithdraw` checks status. Confidence **high**. Refund recovery; effort M/L; risk high.

The function cancels the Stripe subscription before refunding. If the deletion webhook writes `expired` and then the refund call fails transiently, the next withdrawal request can fail `canWithdraw` even though the first response explicitly instructed the payer to retry. Refund progress is not persisted independently of access status. Also `refund.amount` is reported as refunded without checking refund status, although refunds may be pending/failed.

**Remediation:** persist a withdrawal request and per-charge refund state before cancellation; keep it resumable independent of entitlement status; distinguish requested/pending/succeeded refund amounts in the response/UI and reconcile refund events. Test cancellation webhook before refund failure, repeated requests and pending refunds. **Architecture followup.**

### P09 — P1 if webhook API version is newer: Monthly expiration parsing assumes the pre-Basil schema

**Evidence:** root lock pins Stripe `15.12.0`; `server.js:187–192`, `2905–2907`, `3167`, `3198–3200`. Confidence **high** for compatibility requirement; configured endpoint API version requires verification. Deployment/configuration; effort S/M; risk medium.

The SDK is pinned to an older API shape, but snapshot webhook JSON uses the endpoint's independently configured API version. Basil removed subscription-level `current_period_end`; this implementation then stores NULL and treats an active NULL-expiry account as legacy perpetual access (`149`). Newer invoice subscription nesting also needs checking. Test-key connectivity and six subscribed events do not verify payload compatibility.

**Remediation:** verify/pin endpoint payload API version to the implemented contract, explicitly version the Stripe client, or add a tested adapter/upgrade for newer shapes. Do not blindly upgrade the SDK during an advisory fix. Add fixture tests for the configured endpoint version and fail closed on a newly paid row with no paid-through date. [Stripe period-field migration](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end). **Configuration check first; implementation followup if mismatch exists.**

## Documentation corrections and manual confirmations

1. **Plan 009 is materially stale**, not an executable current implementation plan: `32–82`, `173–187`, `438–440`, `468–471`, `500–507` describe season as a Stripe subscription with `trial_period_days` and four webhooks. Actual season code uses SetupIntent + local scheduled one-time PaymentIntent and six handled event types. Mark it explicitly superseded and link the current payment design; rewrite its manual tests around the actual worker. Do not merely mark it DONE.
2. `server.js:161–168` describes Stripe cancel_at/subscription mechanics for season that no longer exist. `supabase-setup.sql:340–343` and `server.js:1662–1664` falsely describe nontransactional replacement as having no intermediate state. Fix alongside the underlying implementation or clearly document the limitation.
3. `lib/pragueDistricts.js:3–7` promises identical simplification to the frontend; frontend generated header says rendered paths are simplified while backend uses unsimplified rings. Correct the generator's comment template and regenerate after verifying boundary intent. Numeric structure passed; OSM/geographic truth was not independently resurveyed.
4. Beta cleanup at `supabase-setup.sql:960–966` deletes only events/rankings after cutoff+6 months. Confirm privacy notices distinguish feedback, closing surveys, profiles, testimonials and attached screenshots, whose retention is separate. Screenshots without feedback become cleanup-eligible at 24 hours, but the worker runs every 24 hours, giving nearly 48 hours in practice (`server.js:3320–3327`, SQL `1149`). Legal reviewer should decide whether wording promises an exact deadline.
5. Ordinary account trial starts in the signup trigger before email confirmation (`supabase-setup.sql:651`). A delayed confirmation may consume the full trial. Confirm intended policy before changing it; this is separate from P04's definite season purchase timing bug.
6. Season Checkout for a brand-new **direct** payer supplies `customer_email` without explicit customer creation (`server.js:2784–2800`), while parent payment links request `customer_creation:'always'`. Verify in Stripe test mode that direct setup completion returns a customer, attaches its PaymentMethod and supports the later off-session charge. Existing unit mocks always supply customer IDs and do not prove it. Do not use a live card.
7. Verify Stripe dashboard receipt settings and a mandatory day-2 reminder. There is no reminder scheduler/email provider in this owned source. Confirm existing external automation instead of claiming it is absent everywhere.
8. Verify webhook signing secret matches the deployed endpoint, raw-body signatures are accepted, test payload API version, actual delivery status, proxy trust, deployment environment `NODE_ENV`, CORS frontend URL, storage bucket rules, function EXECUTE grants and own-row RLS using dedicated test accounts. Parent's anonymous HEAD checks are a useful smoke test but not a cross-account/RPC isolation test.
9. Test signup-confirmation, reset-password and parent payment-link journeys in staging, including mail links opened on a second device. This reviewer did not send mail or create accounts.
10. Decide expected beta cutoff and restore/renewal policy with founder. Live cutoff reported by parent is 2026-10-12T21:10:23Z with a 48-hour rolling window; treat this as a real operational value requiring confirmation, not an automatically correct deadline.

## Handoff plan

**Stage 1 — free beta integrity (one source owner at a time):** fix B07; apply B02 canonical enrichment; address B01 stable selectivity; implement B03 transactional replacement; repair B04/B05 in a disposable database first; update associated comments/docs; confirm B06 classroom limits and configured cutoff. Parent handles dependency advisories and stale project documentation. Run root tests plus actual matching endpoint parity and SQL install/rerun/concurrency tests.

**Stage 2 — payment foundation:** create a minimal durable purchase/attempt/refund ledger and state machine covering P01/P02/P03/P05/P06/P07/P08 together. Each purchase needs its own identity, Stripe IDs, agreed price/currency, creation/completion timestamps, cancellation/withdrawal state and entitlement boundary. Do not solve each by adding disconnected booleans to `users`. Review schema/flows before implementation; money semantics are not a simple wording correction.

**Stage 3 — payment boundary fixes and staging evidence:** implement P04 contractual completion clock and P09 version adapter/pinning; configure reminder/receipts; run Stripe test clocks or controlled test fixtures for duplicate checkouts, both completion orders, delayed/duplicate/out-of-order webhooks, cancel-versus-worker, temporary declines/SCA, refund failure/resume and database outage beyond idempotency retention. Record test evidence and current schema/API versions.

**Stage 4 — launch approval:** run cross-account RLS/RPC tests, mobile/browser journeys with real email confirmation, a classroom-NAT capacity check, and manual founder/legal/business confirmations. Keep live Stripe keys disabled until these payment blockers and mandatory legal/reminder inputs are resolved.
