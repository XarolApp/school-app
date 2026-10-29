# Plan 022 cloud-review findings — fixes on `review/plan-025`, 28 October 2026

Source: `origin/review/plan-022:reports/plan-022-cloud-review-2026-10-28.md`. Each finding was re-checked
against `review/plan-025` (plan 022 commits + `521aa8b`, plan 025 v3), which is the code that will launch.
Findings 1 and 2 were reproduced against the real `supabase-setup.sql` in a disposable PGlite 0.2.17
(Postgres 16) database; no Supabase or Stripe was touched.

| # | Severity | Status | Where | Test |
|---|---|---|---|---|
| 1 | High | **Fixed** | `server.js` `purchaseStatusFromStripe` (`incomplete` → `pending`) | `finding 1…` |
| 2 | Medium | **Fixed** (SQL applied by the founder 2026-10-29) | `migrations/2026-10-28-ledger-clock-fix.sql`, mirrored at the end of `supabase-setup.sql` | `finding 2…` |
| 3 | Medium | **Not applicable** — already fixed by `521aa8b` | `server.js` `createTrackedCheckout` → `discard()` | `finding 3…` (guard) |
| 4 | Low | **Not applicable** — already fixed by `521aa8b` | season worker, `amount: purchase.price_amount_minor` | `finding 4…` (guard) |

Tests: `tests/plan-022-review-fixes.test.cjs`.

## 1. Fixed — incomplete subscription no longer becomes `failed`
`purchaseStatusFromStripe` mapped `incomplete` to `failed`; the ledger has no `failed → active` step, so the later
`customer.subscription.updated(active)` returned `stale` and the customer was billed without access. Now
`incomplete` → `pending` (a 3-D Secure payment in flight); only `incomplete_expired` is `failed`. The ledger already
allows `pending → active`. PGlite sequence `checkout.session.completed(incomplete)` then
`customer.subscription.updated(active)`: before `applied, stale`, purchase `failed`, user `canceled`;
after `applied, applied`, purchase `active`, user `active`.

## 2. Fixed — empty-patch events no longer move the event clocks
`apply_stripe_purchase_event` set `users.stripe_last_event_created` and `purchases.last_stripe_event_created` on every
event, including `invoice.paid` (empty patch, status already `active`), so a retried older `subscription.updated`
was dropped and the new period end lost. Now the user clock moves only when the profile patch is non-empty, and the
purchase clock only when the status changes, access dates are supplied, or a patch is present. PGlite sequence
`invoice.paid(t=4600)` then retried `subscription.updated(t=3000, access 2026-12-28)`: before `stale`, access stays
`2026-11-28`; after `applied`, access `2026-12-28`. Not done: the report's second suggestion (re-retrieve the
subscription from Stripe instead of event ordering) — the clock fix removes the reported failure and that would be a
larger behaviour change.

## 3. Not applicable — `521aa8b` already handles it
`discard()` (`server.js` ~3800) calls `expire` (error swallowed), then **retrieves the session and returns `false`
when `status === 'complete'`**; both callers then return the 409 `CHECKOUT_PROCESSING` instead of marking the purchase
`failed`. No change; a source-level guard test was added. (The remaining idea — cancelling an orphaned subscription
when a completed Checkout hits a non-pending purchase — is not needed once the purchase is never wrongly failed.)

## 4. Not applicable — `521aa8b` already handles it
The worker uses `amount: purchase.price_amount_minor` from `claim_due_season_charges` (`server.js` ~5607–5611) with an
integer guard, and `SEASON_PRICE_CZK` no longer appears in the charge. Guard test added.

## Commands and results
| Command | Result |
|---|---|
| Baseline `npm ci && npm test` (root, after `frontend` `npm ci`) | 309/309 pass (a first run before frontend deps showed 1 failure, `decision-data` needing `frontend/node_modules/vite`) |
| Baseline `frontend` `npm run lint` / `npm run build` | 0 errors, existing warnings / built |
| New tests against the old code (`server.js` + `supabase-setup.sql` stashed) | findings 1 and 2 **fail**; 3 and 4 pass |
| New tests against the fix | 4/4 pass |
| PGlite scenarios (`supabase-setup.sql`) before / after | F1 `applied, stale` → `applied, applied`; F2 `applied, stale` → `applied, applied` |
| Old `supabase-setup.sql` + new migration applied twice | idempotent; verify query true |
| After: `npm test` | **313/313 pass** |
| After: `frontend` `npm run lint` / `npm run build` | 0 errors / built |

## SQL the founder must apply
`migrations/2026-10-28-ledger-clock-fix.sql` (idempotent `create or replace function`, grants unchanged). Verify:

```sql
select pg_get_functiondef(p.oid) like '%v_moves_purchase%' and pg_get_functiondef(p.oid) like '%v_has_patch%'
  as clock_only_on_change
from pg_proc p where p.proname = 'apply_stripe_purchase_event' and p.pronamespace = 'public'::regnamespace;
-- expect true
```
Deploy the `server.js` change (finding 1) only together with, or after, this migration; the migration alone is safe.
Email/reminder promises and `TRIAL_REMINDER_IMPLEMENTED` were not touched.
