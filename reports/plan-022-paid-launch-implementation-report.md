# Plan 022 — Paid-launch implementation report

This is the cumulative implementation and verification record for
[`plans/022-paid-launch-chunks.md`](../plans/022-paid-launch-chunks.md). It is
intended for an independent Opus review after all implementation chunks are
complete. It records repository evidence only; no live Stripe or production
Supabase actions are authorized by this report.

## Status

| Chunk | Scope | State |
|---|---|---|
| 0 | Founder decisions and legal/operator gates | Chunk 3 map/access decision recorded; other founder answers/verification pending |
| 1 | Purchase ledger, checkout idempotency, replay-safe webhooks | Implemented locally; awaiting review and founder SQL application |
| 2 | Season charge claims, cancellation, SCA, and purchase-linked refunds | Implemented locally; disposable SQL verification and independent review pending |
| 3 | Paid catalogue boundary and resumable onboarding | Implemented locally; SQL disposable-database and browser verification pending |
| 4 | Ordinary access trial starts at first confirmed sign-in | Implemented locally; SQL not run in a disposable database |
| 5 | Atomic application-pick saves | Implemented locally; SQL not run in a disposable database |
| 6 | Explanation cache race | Implemented locally; SQL not run in a disposable database |
| 7 | Account-switch state isolation | Implemented locally; unit-tested, no two-tab browser run |
| 8 | Account erasure completeness | Implemented locally; SQL not run in a disposable database |
| 9 | Manual school-fact corrections | Founder/manual |

## Chunk 1 — Purchase ledger and checkout idempotency

**Implementation:** `migrations/2026-10-16-paid-purchase-ledger.sql`, the
mirrored purchase-ledger block in `supabase-setup.sql`, `server.js`, and the
purchase-ledger/server-boundary tests.

**Verification recorded:** root suite 218/218; targeted server boundary suite
76/76; disposable PGlite fresh migration, rerun, setup parity, RLS/grants,
pending-checkout uniqueness and webhook replay/order checks passed; frontend
lint and build passed with a pre-existing large-chunk warning. No live database,
Stripe account, or customer was touched.

**Limit:** SQL has not been applied or verified in production, the code has not
been pushed, and Stripe test-mode acceptance remains a separate founder gate.

## Chunk 2 — Season charge, cancellation, SCA, and refunds

**Implementation:** `migrations/2026-10-22-season-charge-lifecycle.sql`, the
mirrored final block of `supabase-setup.sql`, `server.js`,
`frontend/src/pages/SubscriptionExpired.jsx`, `frontend/src/lib/stripeClient.js`,
`frontend/src/api.js`, `frontend/vercel.json`, and focused boundary tests.

- Due season charges are atomically claimed with `FOR UPDATE SKIP LOCKED` and a
  persisted per-purchase idempotency key. Existing active season purchases get
  the legacy key in explicit UTC ISO-8601 millisecond format, matching the old
  worker's `Date.toISOString()` key so ambiguous in-flight attempts can replay.
- Cancellation intent is persisted before a pending season PaymentIntent is
  canceled. The worker reconciles stale processing claims, SCA states and
  cancellation/charge races; successful charges after cancellation are refunded
  against that exact PaymentIntent. Monthly cancellation also writes its intent
  to the purchase before retrieving or updating the Stripe subscription.
- Declined, action-required and transient season-charge outcomes are persisted
  separately. The authenticated status endpoint returns a client secret only
  after verifying the PaymentIntent's `purchase_id` and `app_user_id` metadata;
  Stripe secret-key operations remain on the server. The Settings/expired-plan
  UI supports completing SCA or canceling.
- Withdrawal records intent before Stripe calls and refunds only the PaymentIntent
  attached to the user's latest eligible purchase. It no longer scans a
  customer's recent payments. Refund failures remain retryable and the UI
  distinguishes pending, failed and completed states. The purchase ledger stores
  the latest invoice PaymentIntent, which is the charge used by the current
  30-day withdrawal-window calculation; Opus should verify this matches the
  intended refund policy if multiple monthly invoices can fall within that window.
- The schema migration is mirrored in `supabase-setup.sql`; static tests check
  the mirror, state machine, grants, worker claim, ownership guard and exact-
  purchase refunds.

**Verification recorded:** root suite 250/250; focused Chunk 2/server boundary
suite 92/92; `node --check server.js`; frontend lint (no errors; existing
warnings remain) and production build passed; `git diff --check` passed. Setup
and migration mirror check passed.

**Not demonstrated:** Chunk 2 SQL was not run in a disposable PostgreSQL
database. This machine has no available `psql`, `postgres`, Docker or installed
PGlite package; an isolated package install attempt stalled and was stopped.
Do not apply this migration to production yet. No browser SCA flow or live Stripe
test was run, and the public `VITE_STRIPE_PUBLISHABLE_KEY` must be configured
before an SCA test. The one-PI purchase field represents the latest linked
invoice/season charge; Opus should review whether the plan's “charge(s)” language
requires a separate multi-charge ledger for recurring monthly purchases.

## Chunk 3 — Paid catalogue boundary and resumable onboarding

**Founder decision recorded:** Signed-in accounts without paid access may
continue onboarding. The landing map stays exactly as it is. A map dot may open
the existing factual, view-only school detail card; map list/count presentation
does not change. The full catalogue and paid actions remain access-gated.

**Implementation:** `migrations/2026-10-22-paid-catalogue-boundary.sql` and its
repeatable-schema mirror in `supabase-setup.sql`; `server.js`;
`frontend/src/api.js`, `frontend/src/components/AuthContext.jsx`,
`frontend/src/components/ProtectedRoute.jsx`,
`frontend/src/pages/SchoolDetail.jsx`,
`frontend/src/components/schoolDetail/SchoolActions.jsx`,
`frontend/src/pages/onboarding/OnboardingFlow.jsx`, and
`frontend/src/pages/onboarding/screens/CreateAccount.jsx`.

- Anonymous and signed-in no-access visitors receive the same allowlisted map
  projection, including the district and program admission fields used by the
  current map and nickname helper. A map-dot detail request returns the regular
  factual school card in view-only mode. `Landing.jsx` was not changed. Full `?ids=` reads
  (comparison) remain blocked unless the caller has active access.
- An authenticated incomplete account can load the school catalogue needed by
  onboarding using the server-checked `scope=onboarding` exception. It cannot
  use that scope to access comparison or other paid routes. Paid school details
  still include match scores; the onboarding-only list does not expose them.
- `onboarding_progress` stores only the authenticated owner's validated step,
  quiz answers, role, intents, commitment, form-of-address preference and plan.
  The table has RLS enabled and explicit client privilege revocation. On login,
  an unfinished account is routed to its saved step, and the flow restores the
  saved answers. Checkout completion marks the account complete only after a
  matching active purchase has been recorded by the verified Stripe webhook.
- The migration adds an idempotency marker and backfills accounts that existed
  at first application as already complete, preventing a rerun from granting
  completion to later signups. It can run only after the purchase-ledger schema
  from Chunk 1.
- New accounts created in the onboarding flow keep an email-bound local draft
  until confirmation; once authenticated, progress is sent to the server. The
  email remains unique in Supabase Auth, so starting another signup with the
  same address does not create a second account. A different browser/device
  cannot recover pre-confirmation local-only draft data until it has been saved
  under an authenticated session.

**Verification recorded:** root suite 259/259; focused server-boundary suite
89/89 and Chunk 3 SQL contract tests 3/3. They cover anonymous and
signed-in no-access map detail, the public map projection, the incomplete-account
catalogue exception, comparison rejection, saved-progress validation/owner
binding and Checkout completion. Static SQL checks cover setup/migration
contracts, service-only privileges, purchase/user binding and the rerun marker.
`node --check server.js`, frontend lint (warnings remain, no errors), production
build and `git diff --check` pass. The build reports the existing large-chunk
warning.

**Not demonstrated:** this machine has no `psql`, `postgres`, Docker or installed
PGlite, so the SQL has not been run in a disposable database and must not be
applied to production yet. Vite rendered the localhost app shell, but no backend
is listening on port 5001, so the landing map stays at “Načítám…” and map/detail
and resume journeys were not visually verified. No live Supabase/Stripe
traffic, payment, or deployment was used.
Apply the Chunk 3 migration after Chunks 1 and 2, then verify with:

```sql
select count(*) filter (where onboarding_completed_at is null) as incomplete_accounts,
  (select count(*) from public.onboarding_progress p join public.users u on u.id=p.user_id
    where u.onboarding_completed_at is not null) as completed_with_draft
from public.users;
```

Expected immediately after migration: both values are `0`. New signups made
after the marker is written remain incomplete until verified Checkout completion.

## Chunks 4–8 (2026-10-23)

Migrations, in the order to apply after chunks 1–3: `2026-10-23-trial-starts-at-first-signin.sql`,
`2026-10-23-atomic-application-picks.sql`, `2026-10-23-explanation-cache-merge.sql`,
`2026-10-23-account-erasure-archive-undo.sql` (each also mirrored in `supabase-setup.sql`,
each ends with a verify query). Root suite 273/273, `node --check server.js`, frontend lint
(warnings only) and build pass. None of the SQL has run in a disposable database.

- **4 Trial start.** `users.trial_expires_at` becomes nullable; the signup trigger leaves it
  empty for ordinary accounts; `start_ordinary_trial(uuid)` (service-only) sets 3 days once, only
  for a `trialing` row with no window. `server.js` calls it from `accessStateFor` and `/api/me`
  (`ensureTrialStarted`). Existing accounts, paid, beta, creator and developer rows are untouched.
  Chunk 0 decision 2 (keep existing windows) was applied as the recommended default.
  **Founder decision 2026-10-27 (option A): the ordinary free trial is dropped as a product feature; access follows a confirmed purchase.** The chunk 4 code is kept but inert.
  Note: since chunk 3, an account without a completed purchase is blocked by the onboarding gate,
  so the ordinary trial only matters for accounts that completed onboarding without paying.
- **5 Picks.** `save_application_picks(uuid, jsonb)` locks per account, requires visible schools,
  at most 3, unique schools, and that `obor_kkov` exists in `school_programs` for that school, then
  replaces only visible picks. `PUT /api/picks` is now one RPC call. An obor that left the
  catalogue in the 9th-grade filter now returns `INVALID_PROGRAM` (400) instead of silently saving.
- **6 Explanations.** `cache_questionnaire_reason(...)` merges one key (`extra_reasons || {id: text}`)
  and only when the run's answers still equal the ones the sentence was written for. The handler
  shares one model call per run+school through an in-memory map.
- **7 Account switch.** `api.js` drops a response (`ACCOUNT_CHANGED`) if the signed-in account
  changed during the request; `AuthContext` reports the account on every auth change including
  `adoptStoredSession`; `useDraft` resets mounted drafts when the owner changes; `usePicks`
  reloads per user. Other hooks that fetch once with `[]` dependencies were not audited.
- **8 Erasure.** Screenshots are listed page by page (offset) before any removal.
  `archive_beta_contributions` now returns the ids it created; if `deleteUser` fails and the
  account still exists, the server removes that copy (`remove_beta_archive_rows`). Residual: a
  server crash between archive and delete still leaves a copy.

## Fixes after manual testing (2026-10-27)

- Picks RPC: variable `kkov` renamed `v_kkov` (it clashed with column `p.kkov`); the 23 Oct picks migration must be re-run.
- Signed-in accounts skip the `ucet` signup step and no longer see "Mám účet" (the half-finished-account trap, which also let a second email be signed up while a first was signed in).
- Stripe now returns to `/onboarding/hotovo`, which waits (polls `/api/me`, about 60 s) for the webhook to unlock the account; an `ALREADY_SUBSCRIBED` reply on the paywall goes to the same wait.
- Compare selection, recent schools and saved filters are stored per account (`searchPrefs.js`), fixing the shortlist leaking between accounts.
- Commitment screen reworded to an outcome question (stored values unchanged) and anchored to the top; the trial CTA reads "Začít zkušební období" with the charge stated underneath (legal wording needs review).
- Review fixes: monthly 3-D Secure completes onboarding on `customer.subscription.updated`; view-only school detail not cached; checkout reuse respects student vs parent context.

## Decision: no free ordinary trial (2026-10-27)

The founder chose option A. Access follows a confirmed purchase; the season pass's own
3-day card-saved trial is the only trial. The chunk 4 `trial_expires_at` start remains
in the code but gives nothing to an account that has not finished onboarding.

## Review notes for Opus

- Review each implementation against the plan's acceptance criteria and source,
  not just these status labels.
- Distinguish deterministic mocks/disposable-database checks from live Stripe,
  deployment, legal, and operational verification.
- The repository may contain unrelated concurrent edits. The chunk implementer
  must preserve them and keep the final diff scoped to owned paths.
