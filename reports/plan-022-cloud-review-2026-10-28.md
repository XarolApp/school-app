# Plan 022 — independent cloud review, 28 October 2026

Scope: the two commits in `origin/main..review/plan-022` — `cf33dc2` (backend,
schema, tests) and `a189570` (frontend) — checked against
`plans/022-paid-launch-chunks.md` chunks 1–8 and
`reports/plan-022-paid-launch-implementation-report.md`. Chunk 9 (manual school
facts) and plan 025 are out of scope. No code, migration or test was changed; no
production Supabase or Stripe was touched.

**Result: 4 findings** (1 high, 2 medium, 1 low). All are in the Stripe/ledger
paths of chunks 1–2. Findings 1 and 2 were reproduced by executing the branch's
real SQL in a disposable PGlite (Postgres 16) database, not inferred from mocks.
Chunks 3–8 had no verifiable defects.

## Findings

### 1. HIGH — Monthly purchase marked `failed` at Checkout can never become `active` (chunk 1)

- **Where:** `server.js:4068-4072` (`purchaseStatusFromStripe` maps `incomplete` → `failed`),
  used at `server.js:4156`; the transition table in `apply_stripe_purchase_event`,
  `supabase-setup.sql:1870` (`migrations/2026-10-16-paid-purchase-ledger.sql`, same `case`):
  `when 'failed' then p_purchase_status in ('failed', 'refunded')`.
- **Scenario:** this is the path the code says it supports (comment at `server.js:4267-4268`,
  report "monthly 3-D Secure completes onboarding on `customer.subscription.updated`").
  `checkout.session.completed` retrieves the subscription while it is still `incomplete` →
  purchase `pending → failed`, profile `subscription_status = 'canceled'`. When the
  subscription turns active, `customer.subscription.updated` asks for `failed → active`, which
  the table refuses: the RPC returns `stale`, so **neither the purchase nor the profile patch
  is applied**, and `complete_paid_onboarding` returns `false`. The customer is billed monthly
  and has no access; nothing cancels the subscription.
- **Reproduced (PGlite, branch `supabase-setup.sql`):**
  `checkout.session.completed(failed)` → `applied`; `customer.subscription.updated(active)` →
  `stale`; purchase stays `failed`, user `canceled`, `complete_paid_onboarding` → `false`.
- **Fix:** map `incomplete` to `pending` (not `failed`) — only `incomplete_expired` is final —
  or allow `failed → active` when the event's subscription id equals the purchase's. Add an
  SQL-level test for this sequence; the current JS tests mock the RPC and cannot catch it.

### 2. MEDIUM — Events with an empty profile patch advance the account's event clock and starve later-delivered real updates (chunk 1)

- **Where:** `apply_stripe_purchase_event`, `supabase-setup.sql:1908-1923` (migration, same
  `update public.users … stripe_last_event_created`), plus the user-level stale check before it.
  Callers that send an empty patch with a user id: `invoice.paid` (`server.js:4286-4306`).
- **Scenario:** monthly renewal. `customer.subscription.updated` (created at the period
  boundary, carries the new `access_expires_at`) fails once with a 500 — e.g. a transient
  Supabase error in `findStripePurchase` before the RPC, so the event id is never recorded.
  `invoice.paid` (created ~1 h later, empty patch) is applied and sets
  `users.stripe_last_event_created` to its later timestamp. Stripe's retry of
  `subscription.updated` is now older than the clock → `stale` → the new period end is
  dropped and the paying subscriber loses access at the old `access_expires_at`.
- **Reproduced (PGlite):** after `invoice.paid(t=4600, {})`, the retried
  `customer.subscription.updated(t=1000, access_expires_at=2026-12-28)` returns `stale`;
  `access_expires_at` stays `2026-11-28`.
- **Fix:** only advance `users.stripe_last_event_created` (and the purchase clock) when the
  event actually changes that row; and for subscription events, re-retrieve the subscription
  from Stripe and apply its current state instead of relying on event-timestamp ordering.

### 3. MEDIUM — Switching payer context marks a completed Checkout as `failed`; its late webhook is then ignored (chunk 1)

- **Where:** `server.js:3606-3618` (`createTrackedCheckout`): the `sessions.expire` error is
  swallowed (`catch { /* already closed */ }`) and the purchase is set to `failed` without
  checking the session's status.
- **Scenario:** the student completes a monthly Checkout; before its webhook is applied (normal
  delivery delay, or a retry), the parent opens the payment link for the same plan
  (`checkoutContext = 'parent'`). `hasLivePlan` is still false, the pending purchase has the
  other context, `expire` throws because the session is `complete`, and the purchase is marked
  `failed`. The student's `checkout.session.completed` then hits `failed → active` → `stale`
  (see finding 1) → the Stripe subscription bills with no access, and the parent can pay a
  second time. This is exactly the plan's "late completion of a replaced checkout" acceptance
  case; for subscription mode it is not handled. Pay links are off while `SHARING_ENABLED` is
  unset, so it is reachable once sharing is turned on.
- **Fix:** before marking the purchase failed, `retrieve` the session; if `complete`, return
  the existing `CHECKOUT_PROCESSING` 409 (as the same-context branch at `server.js:3630-3635` already
  does). Separately, when a completed subscription Checkout matches a non-pending purchase,
  cancel/refund the orphaned subscription or flag it rather than dropping it as `stale`.

### 4. LOW — The season charge ignores the price locked on the purchase (chunk 2)

- **Where:** `server.js:4459` charges `SEASON_PRICE_CZK * 100`; `claim_due_season_charges`
  (`migrations/2026-10-22-season-charge-lifecycle.sql`, mirrored in `supabase-setup.sql`) does not
  return `purchases.price_amount_minor`.
- **Scenario:** the purchase records the price shown at Checkout (`server.js:3484`, `3577`,
  `3685`), but the day-3 charge uses whatever the constant is when the worker runs. A price
  change deployed during someone's 3-day trial (or for an already-active legacy purchase)
  charges a different amount than the one in their Checkout text and ledger row. Prices are
  locked at 690 Kč today, so there is no current overcharge; this is a gap against the
  requirement that the charged price be the one locked on the purchase.
- **Fix:** return `p.price_amount_minor` (and `currency`) from `claim_due_season_charges` and
  use it as the PaymentIntent amount.

## Checked with no finding

- Chunk 1 checkout reuse (unique pending index + 23505 retry, stable `snm-checkout:<purchase>`
  key), duplicate-event short-circuit, RLS/grants on `purchases`/`stripe_webhook_events`.
- Chunk 2 atomic claim (`FOR UPDATE SKIP LOCKED`, 30-minute stale reclaim, persisted
  idempotency key, metadata search before re-create), cancel intent persisted before Stripe,
  SCA client secret only after `purchase_id`/`app_user_id` metadata check, refunds limited to
  the purchase's PaymentIntent.
- Chunk 3 public projection vs full/onboarding modes, `?ids=` requires full access,
  `withMatchScores` still runs for full access, `onboarding_progress` RLS/revokes and the
  rerun marker.
- Chunk 4 `start_ordinary_trial` once-only update; Chunk 5 `save_application_picks` (lock,
  visibility, programme ownership, hidden picks kept, `v_kkov` rename); Chunk 6 per-key merge
  guarded by unchanged answers plus in-memory de-duplication; Chunk 7 `ACCOUNT_CHANGED` drop,
  draft wipe listeners, per-user picks reload; Chunk 8 paged screenshot listing and archive
  undo.
- Every new SQL function is `security definer`, revoked from `public, anon, authenticated`
  and granted only to `service_role`.
- Schema sync: main's `supabase-setup.sql` + the seven migrations (applied twice) produce the
  same functions, columns, RLS flags and client grants as the branch's `supabase-setup.sql`.
  The only body difference, `complete_paid_onboarding`, is whitespace/comment-only.

## Commands run and results

| Command | Result |
|---|---|
| `git fetch origin main review/plan-022`; `git log origin/main..review/plan-022` | 2 commits: `a189570`, `cf33dc2` |
| `npm test` (root, `node --test tests/*.test.*`) | **277/277 pass** (a first run showed 1 failure, `tests/decision-data.test.mjs` `ERR_MODULE_NOT_FOUND` for `frontend/node_modules/vite`, because frontend dependencies were not yet installed; it passes after `cd frontend && npm ci`) |
| `cd frontend && npm run lint` | 0 errors, existing warnings only |
| `cd frontend && npm run build` | built; existing large-chunk warning |
| PGlite 0.2.17 (scratch dir): branch `supabase-setup.sql` fresh + rerun | both pass |
| PGlite: main `supabase-setup.sql` + 7 migrations, applied twice; catalog diff vs branch setup | idempotent; no drift except whitespace in `complete_paid_onboarding` |
| PGlite: ledger RPC sequences for findings 1 and 2 | both reproduced as described |

Not done: no live Stripe test-mode run, no browser run, no concurrency test (PGlite is
single-connection, so `SKIP LOCKED` and the advisory lock were checked by reading only).
