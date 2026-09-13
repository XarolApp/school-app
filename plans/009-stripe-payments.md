# 009 — Stripe payments (both plans, real money)

**Created:** 2026-09-13 via `/plan-then-build` (Opus planning → Sonnet implementation)
**Base commit:** `d436994`
**Replaces:** the `⚠️ SCAFFOLDING` payment block in `server.js` and
`mockStartSubscription` in `frontend/src/api.js`.

---

## 0. Decisions already made — do not re-litigate

Four questions were put to the founder before this plan was written. The answers
are binding on the implementation:

1. **Founder is under 18.** Stripe requires an account holder with full legal
   capacity (18 in ČR), and selling to consumers in ČR needs a trade licence.
   → **Everything in this plan is built and tested against Stripe TEST MODE**,
   which requires no verification, no entity and no age check. Going live is
   gated on a parent/guardian (or an s.r.o. with an adult jednatel) owning the
   account. **No code change is needed to go live later** — only swapping the
   env vars from `sk_test_…` to `sk_live_…`. Do not build anything that assumes
   live keys exist.
2. **Season pass keeps its 3-day trial exactly as designed.** The founder
   explicitly rejected changing the paywall structure. See §1 for how this is
   achieved without a scheduled job.
3. **The one-time 30% offer is disabled**, not rebuilt. See §7.
4. **Both plans ship**, including the one-click cancellation endpoint that
   `pricing.js` marks as `BLOCKING for real billing on the recurring plan`.

---

## 1. The core architectural decision — both plans are Stripe subscriptions

The season pass is presented to the user as a one-time payment, and it genuinely
results in **exactly one charge followed by expiry**. But it is implemented as a
Stripe *subscription*, because that is the only way to get the behaviour the
paywall already promises:

> card saved now → nothing charged → 3 days pass → cancellable with no charge →
> auto-charge 690 Kč on day 4

Stripe Checkout `mode: 'subscription'` with `subscription_data.trial_period_days: 3`
does all of that natively. Stripe runs the timer, performs the charge, and — this
is the part a homemade cron job gets wrong — handles EU strong customer
authentication at the trial-to-paid transition.

**A one-time `mode: 'payment'` session charges immediately and cannot express
this. Do not use it.**

To honour the "nic se neobnovuje" promise, the subscription is given an absolute
`cancel_at` timestamp, so it charges once and then terminates.

### Why `cancel_at` and not `cancel_at_period_end`

`cancel_at_period_end` cancels at the end of the *current* period. During a trial
the current period **is the trial**, so setting it at creation would cancel the
subscription at trial end and the customer would never be charged at all. That is
a silent revenue bug that would look like everything worked.

`cancel_at` is an absolute timestamp and has no such ambiguity. Set it from the
webhook immediately after `checkout.session.completed` (see §4), not in the
Checkout session params — `subscription_data.cancel_at` support varies by pinned
API version, and the webhook path is deterministic on every version.

### Resulting shape of each plan

| | season | monthly |
|---|---|---|
| Stripe mode | `subscription` | `subscription` |
| Stripe Price interval | **yearly**, 690 Kč | monthly, 249 Kč |
| `trial_period_days` | `3` | *(none)* |
| `cancel_at` | season end (§2) | *(none — it recurs)* |
| Net effect | one charge, then expires | recurs until cancelled |
| `subscription_status` once paid | `'season'` | `'active'` |

The season Price **must be a recurring yearly price, not a one-time price.** This
is counterintuitive and is the single most likely thing to get wrong in the Stripe
dashboard. The yearly interval is deliberately much longer than the season so that
no second invoice is ever scheduled anywhere near `cancel_at`.

Because both plans are subscriptions, there is **one** checkout code path, **one**
webhook handler and **one** cancel endpoint. Do not fork them.

---

## 2. Season end date

Copy in `pricing.js` promises `přístup do konce března`. Implement as a helper in
`server.js` (the frontend `pricing.js` is ESM under `frontend/` and cannot be
imported by the CommonJS backend — do not try):

```js
/**
 * End of the access window for a season pass: 31 March 23:59:59 Europe/Prague,
 * the first one strictly after `from`.
 *
 * Guard: the charge lands ~3 days after checkout (trial), so a purchase made in
 * late March would otherwise compute a cancel_at that falls BEFORE the charge —
 * Stripe would cancel the subscription before it ever billed. If the computed
 * end is less than 30 days after `from`, roll to the following year.
 */
function seasonEndsAt(from = new Date()) { /* … */ }
```

Returns a `Date`. Pass to Stripe as a Unix timestamp (`Math.floor(d.getTime()/1000)`).

Edge case accepted as-is: buying in April yields ~11 months of access. The product
is seasonal (Sept–March) so this is a non-case in practice; do not add complexity
for it.

---

## 3. Schema migration

Add to `supabase-setup.sql` (idempotent, as the rest of that file is):

```sql
alter table public.users add column if not exists access_expires_at timestamptz;
alter table public.users add column if not exists plan_id text;
```

- **`access_expires_at`** — when paid access ends. Written only by the webhook.
- **`plan_id`** — `'season'` or `'monthly'`. Needed by the Settings UI to decide
  whether a cancel button is even meaningful.

### Why `access_expires_at` must exist

`hasPaidStatus('season')` currently returns `true` forever. Nothing anywhere
records when a season pass ends. If a single `customer.subscription.deleted`
webhook is ever missed — and webhooks do get missed — that account keeps full
access permanently, silently, with no way to notice. Storing the expiry makes
access **self-enforcing** rather than webhook-dependent.

> ⚠️ **This migration must actually be run in the Supabase SQL editor.** Plan 008
> was marked DONE with its migration written but never applied, and every
> `/api/questionnaire*` call silently 500'd for a full day as a result. Writing
> the SQL into this file is not the same as running it. Do not mark this plan
> done until the columns are confirmed present in the live database.

---

## 4. Backend — `server.js`

### 4.1 Env vars

Replace the single `STRIPE_PRICE_ID` with two:

```
STRIPE_PRICE_ID_SEASON=price_…
STRIPE_PRICE_ID_MONTHLY=price_…
```

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` stay as they are. Update
`.env.example` and `DEPLOY.md`'s Railway variable list to match.

The existing `stripe` client init (line ~46) and the raw-body webhook mount
(line ~149, `express.raw`) are both already correct. **Do not touch the raw-body
mounting** — Stripe signs the exact bytes it sent, and parsing the body before
signature verification breaks it.

### 4.2 `POST /api/checkout` — rewrite

Accepts `{ planId, returnTo }`.

```
1. 503 STRIPE_NOT_CONFIGURED if !stripe or the relevant price env var is missing.
2. planId must be 'season' | 'monthly'. Anything else → 400.
3. Validate returnTo: must match /^\/[A-Za-z0-9\-_/]*$/ — a relative path only.
   Reject absolute URLs and protocol-relative (//evil.com) outright; default to
   '/skoly' when absent. This is an open-redirect guard, not a nicety.
4. Read the user's stripe_customer_id + email from `users`.
5. Create the session:
     mode: 'subscription'
     line_items: [{ price: <the plan's price id>, quantity: 1 }]
     customer / customer_email (as the current code already does)
     client_reference_id: req.user.id
     subscription_data: {
       metadata: { plan_id: planId, app_user_id: req.user.id },
       ...(planId === 'season' ? { trial_period_days: 3 } : {}),
     }
     success_url: `${FRONTEND_URL}${returnTo}?platba=ok`
     cancel_url:  `${FRONTEND_URL}/predplatne`
6. Respond { url: session.url }.
```

`trial_period_days: 3` must stay in sync with `TRIAL_DAYS` in
`frontend/src/config/pricing.js` and with the database trigger's 3 days. Add a
comment at the literal saying so — this is the third place that number lives.

Keep `checkoutLimiter` and `requireAuth`. Do **not** add `requireAccess`: a user
whose trial has lapsed is exactly the person who needs to reach checkout.

### 4.3 `POST /api/subscription/cancel` — new

`requireAuth` only — **never `requireAccess`**. An account whose payment lapsed
must still be able to cancel, and this follows the existing rule already stated in
CLAUDE.md: routes that let someone manage their own data need only `requireAuth`.

```
1. 503 if !stripe.
2. Load stripe_subscription_id + plan_id. If absent → 400, nothing to cancel.
3. Retrieve the subscription from Stripe.
4. If sub.status === 'trialing':
     stripe.subscriptions.cancel(id)   // immediate; never charged
     → { cancelled: 'immediately', accessUntil: null }
   Else:
     stripe.subscriptions.update(id, { cancel_at_period_end: true })
     → { cancelled: 'at_period_end', accessUntil: <current_period_end ISO> }
5. Do NOT write subscription_status here. The webhook is the only writer of
   payment state (see 4.4). Stripe will emit customer.subscription.updated and
   the status will follow from there.
```

Returning `accessUntil` lets the UI say "máš přístup do 14. října" instead of an
unqualified "zrušeno", which is what stops a cancellation feeling like an instant
loss of something already paid for.

### 4.4 Webhook — rewrite `handleStripeWebhook`

Signature verification stays exactly as-is. Handle four event types:

**`checkout.session.completed`**
```
- subscriptionId = session.subscription
- planId = session.metadata?.plan_id ?? (retrieve subscription).metadata.plan_id
- If planId === 'season': stripe.subscriptions.update(subscriptionId,
    { cancel_at: <seasonEndsAt() as unix ts> })
  Capture the returned subscription object (it now carries cancel_at).
  Otherwise retrieve the subscription.
- Write to users where id = session.client_reference_id:
    stripe_customer_id, stripe_subscription_id, plan_id,
    subscription_status: mapStatus(sub.status, planId),
    access_expires_at: accessEndsAt(sub)
```

**`customer.subscription.updated`** and **`customer.subscription.deleted`**
```
- planId = sub.metadata.plan_id
- Match the row by stripe_subscription_id (preferred — a customer can in principle
  have more than one) falling back to stripe_customer_id.
- deleted → subscription_status 'expired', access_expires_at = now()
- updated → mapStatus(sub.status, planId), access_expires_at = accessEndsAt(sub)
```

**`invoice.payment_failed`** → `subscription_status: 'past_due'`, leave
`access_expires_at` alone (Stripe retries; do not revoke access on the first
failure).

Two helpers:

```js
// Access ends at whichever comes first: the scheduled cancellation, or the end
// of the period actually paid for.
function accessEndsAt(sub) {
  const cancelAt = sub.cancel_at ? sub.cancel_at * 1000 : null;
  const periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : null;
  const ms = cancelAt && periodEnd ? Math.min(cancelAt, periodEnd)
           : (cancelAt ?? periodEnd);
  return ms ? new Date(ms).toISOString() : null;
}

function mapStatus(stripeStatus, planId) {
  switch (stripeStatus) {
    case 'trialing': return 'trialing';
    case 'active':   return planId === 'season' ? 'season' : 'active';
    case 'past_due':
    case 'unpaid':   return 'past_due';
    default:         return 'canceled'; // incomplete, incomplete_expired, canceled, paused
  }
}
```

**Idempotency:** every operation above is an idempotent `UPDATE` that sets fields
to absolute values, so Stripe's retries are safe without an event-dedup table. Do
not add one.

Always respond `200` once handled. A non-2xx makes Stripe retry, and retrying a
handler that already succeeded is how duplicate side effects appear.

### 4.5 Access checks

`hasPaidStatus()` keeps its current shape. Add the expiry check in **both** places
that decide access, and keep them identical:

```js
function paidAccessActive(profile) {
  if (!hasPaidStatus(profile.subscription_status)) return false;
  if (profile.subscription_status === 'developer') return true;   // never expires
  if (!profile.access_expires_at) return true;                    // legacy rows
  return new Date(profile.access_expires_at) > new Date();
}
```

- `requireAccess` (line ~209): select `access_expires_at` too; replace
  `hasPaidStatus(profile.subscription_status)` with `paidAccessActive(profile)`.
- `GET /api/me` (line ~266): same substitution for `subscribed`; add
  `access_expires_at` and `plan_id` to `PROFILE_COLUMNS` so the frontend can
  render the real end date.

---

## 5. Frontend — `frontend/src/api.js`

```js
export function createCheckoutSession({ planId, returnTo } = {}) {
  return request('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, returnTo }),
  });
}

export function cancelSubscription() {
  return request('/api/subscription/cancel', { method: 'POST' });
}
```

**Delete `mockStartSubscription` entirely** along with its TODO block. Leaving a
mock purchase path next to a real one is how a mock gets shipped.

---

## 6. Frontend — `frontend/src/config/pricing.js`

Three flags flip. Each has a comment in the file explaining the condition under
which it may flip; update those comments to record that the condition is now met,
rather than silently changing the value.

- `PAYMENTS_MOCKED = false` — real Stripe Checkout sessions now exist.
- `ONE_STEP_CANCELLATION_IMPLEMENTED = true` — **only after §4.3 and §9 both
  exist.** If the cancel endpoint or the Settings button is not finished, leave
  this `false`; it drives user-visible copy that would otherwise become a lie.
- `REFUND_GUARANTEE_DAYS` — **leave at 3, unchanged.** The file says not to flip
  `PAYMENTS_MOCKED` until a real refund process exists; in test mode no real money
  moves, so this is fine for now. It is listed in §11 as a pre-live blocker.

---

## 7. Disable the one-time offer

Add to `pricing.js`:

```js
/**
 * The first-view 30% offer is OFF. The entitlement behind it was a localStorage
 * stub (lib/offerEntitlement.js) — clearing cookies resurfaced it, which makes
 * the "jen teď, jednorázově" claim false in practice. Shown to minors that is a
 * DSA Art. 25 problem, not a rough edge. Re-enable only alongside a server-side
 * entitlement. See UNFORGET.md.
 */
export const ONE_TIME_OFFER_ENABLED = false;
```

Then:
- `discountedPriceCzk(plan)` → return `plan.priceCzk` unchanged when the flag is
  false.
- `claimOneTimeOffer()` and `getOneTimeOfferStatus()` in
  `frontend/src/lib/offerEntitlement.js` → return
  `{ eligible: false, expiresAt: null, consumed: false, granted: false }` when the
  flag is false, before touching `localStorage` at all.

**Grep for every consumer** of `ONE_TIME_OFFER`, `discountedPriceCzk`,
`claimOneTimeOffer` and `getOneTimeOfferStatus` and confirm each one degrades to
"no offer, full price, no countdown" — not to a broken or empty element. Do not
delete the code; it is a working prototype for when the server-side version is
built.

---

## 8. Frontend — the purchase surfaces

### 8.1 `pages/onboarding/screens/Platba.jsx`

Keep everything about consent. The checkbox still gates the CTA (ruling C-8's
parental confirmation), the copy stays, the handoff-to-parent link stays.

Replace the payment body when `PAYMENTS_MOCKED === false`:

- Remove the three inert card `<input>`s. Card fields belong to Stripe's hosted
  page; rendering dead lookalikes next to a real payment is worse than rendering
  nothing. Replace with a short line: card details are entered on Stripe's own
  secure page, we never see them — which is now true rather than aspirational.
- `submit()` becomes:
  ```js
  const { url } = await createCheckoutSession({
    planId: plan.id,
    returnTo: '/skoly',
  });
  window.location.href = url;
  ```
- Drop `setPurchased(true)` / `goNext()` from this path — the purchase is no
  longer confirmed in-browser. Stripe redirects back and the webhook decides.
- On error, leave the user on the screen with a readable message and
  `setWorking(false)`. Special-case `STRIPE_NOT_CONFIGURED` →
  "Platby zatím nejsou spuštěné."
- The `PAYMENTS_MOCKED &&` mock-notice block now renders nothing; leave the
  conditional in place.

Keep the whole mocked branch intact behind the flag so the flow stays runnable
with no Stripe keys configured.

### 8.2 `pages/SubscriptionExpired.jsx` (`/predplatne`)

Currently calls `createCheckoutSession()` with no plan. Two changes:

**Plan choice.** Render both plans from `PLANS` with `DEFAULT_PLAN_ID` preselected,
and pass the chosen `planId` into `createCheckoutSession({ planId, returnTo: '/skoly' })`.
Use the existing `planCopy` / `formatCzk` / `cancellationTerms` helpers — no new
price strings.

**Return handling.** Nothing currently reads `?platba=ok`. Webhooks are
asynchronous, so a user can land back here *before* their status has been written,
see "trial expired" again, and reasonably conclude the payment failed.

```
On mount, if searchParams has platba=ok:
  - render "Ověřujeme platbu…" instead of the paywall
  - call refreshProfile() immediately, then every 2s, max 5 attempts
  - the existing `if (hasAccess) return <Navigate to="/skoly" replace />`
    then fires on its own as soon as the profile updates
  - after 5 failed attempts: "Platba se zpracovává. Za chvíli obnov stránku —
    pokud se nic nezmění, ozvi se nám." Never claim the payment failed; it very
    likely succeeded and is just mid-flight.
```

`refreshProfile` already exists on the auth context (`AuthContext.jsx` line ~293).

---

## 9. Frontend — `pages/Settings.jsx` cancellation UI

In the existing `Předplatné` section:

1. Add `season: 'Sezónní přístup'` to `SUBSCRIPTION_LABELS` — `'season'` is a
   valid `subscription_status` that currently renders as "Neznámý stav".
2. When `profile.access_expires_at` is set, show it: "Přístup do 31. března".
3. Show a **Zrušit předplatné** button only when cancelling is meaningful:
   - `plan_id === 'monthly'` and status is `'active'` or `'past_due'`, or
   - status is `'trialing'` **and** `stripe_subscription_id` is set (a season
     pass inside its 3-day trial — cancelling here prevents the charge).
   - Never for a season pass that has already been charged: nothing recurs, so
     there is nothing to cancel. `cancellationTerms()` already returns the right
     copy for that case ("Jednorázová platba — není co rušit").
4. Clicking it opens an inline confirm (reuse the `openForm` pattern already used
   by the delete-account section — do not add a new dialog abstraction), then
   calls `cancelSubscription()`, then `refreshProfile()`, then toasts the result
   using the returned `accessUntil`:
   - `immediately` → "Zrušeno. Nic ti nebude strženo."
   - `at_period_end` → "Zrušeno. Přístup ti běží do {date}."

---

## 10. Verification

**Cannot be verified by reading code. All of it requires the Stripe CLI.**

Local setup: `stripe login`, then
`stripe listen --forward-to localhost:5001/webhooks/stripe` (port 5001, per
CLAUDE.md's macOS AirPlay note). That command prints a `whsec_…` — put it in
`.env` as `STRIPE_WEBHOOK_SECRET` and restart the backend.

Test cards: `4242 4242 4242 4242` succeeds; `4000 0025 0000 3155` forces 3-D
Secure; `4000 0000 0000 9995` declines.

| # | Check | Expected |
|---|---|---|
| 1 | Migration applied | `access_expires_at` + `plan_id` exist on `users` in the live DB |
| 2 | Buy season | Redirects to Stripe; card accepted; **0 Kč charged today** |
| 3 | After season checkout | `plan_id='season'`, `subscription_status='trialing'`, `stripe_subscription_id` set, `access_expires_at` ≈ next 31 March |
| 4 | Stripe dashboard, season sub | Trial ends in 3 days; `cancel_at` set to the season end |
| 5 | Advance a test clock past trial end | One 690 Kč invoice paid; status → `'season'`; **no second invoice scheduled before `cancel_at`** |
| 6 | Advance the clock past `cancel_at` | `customer.subscription.deleted` fires; status → `'expired'`; `/api/schools` for that account → 402 |
| 7 | Cancel during season trial | Immediate cancel; **no charge ever appears**; toast says nothing will be taken |
| 8 | Buy monthly | Charged 249 Kč immediately; status → `'active'`; `access_expires_at` ≈ +1 month |
| 9 | Cancel monthly | `cancel_at_period_end` true in Stripe; access persists until the date shown; toast names that date |
| 10 | 3-D Secure card | Authentication prompt appears and completes; status still lands correctly |
| 11 | Declined card | User returns to `cancel_url`; no access granted; no partial row written |
| 12 | Return-before-webhook | Land on `/predplatne?platba=ok` → "Ověřujeme platbu…" → auto-redirect to `/skoly` once the webhook lands |
| 13 | `returnTo` open-redirect | `returnTo: 'https://evil.com'` and `returnTo: '//evil.com'` are both rejected by the route |
| 14 | No Stripe keys | Unset `STRIPE_SECRET_KEY`; checkout answers 503 and the UI shows "Platby zatím nejsou spuštěné" rather than crashing |
| 15 | Expired access, own data | An account past `access_expires_at` can still reach `/api/me`, remove favourites and cancel — only school-data routes 402 |
| 16 | Offer disabled | No countdown or discounted price anywhere; full price shown on every paywall surface |
| 17 | Lint + build | `npm run lint` and `npm run build` clean in `frontend/`; `node --check server.js` passes |

Check 15 is the one most likely to be broken by accident and the most damaging if
it is — locking a user out of cancelling is both a trust failure and, for the
recurring plan, a regulatory one.

---

## 11. Manual steps — founder only, cannot be automated

### Now, to test (no legal requirements, no verification)

1. Create a Stripe account at stripe.com. **Stay in TEST MODE** (toggle, top
   right). Test mode needs no business details and no bank account.
2. Products → add two products, both **recurring**:
   - *Sezónní přístup* — 690 CZK, billing period **yearly**
   - *Měsíční* — 249 CZK, billing period **monthly**
   The season one being yearly-recurring rather than one-time is what makes the
   3-day trial possible. It will still only ever charge once (§1).
3. Copy both Price IDs (`price_…`) and the test secret key (`sk_test_…`).
4. Railway → Variables → add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_SEASON`,
   `STRIPE_PRICE_ID_MONTHLY`. Redeploy.
5. Stripe → Developers → Webhooks → add endpoint
   `https://school-app-production-be43.up.railway.app/webhooks/stripe`, events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`. Copy the signing
   secret (`whsec_…`) → Railway as `STRIPE_WEBHOOK_SECRET`. Redeploy.
6. Run the §3 SQL in the Supabase SQL editor. **Confirm the columns exist
   afterwards** — do not assume.

### Before real money — all blocking, none of them code

7. **An adult must own the Stripe account.** A parent/guardian as account holder,
   or an s.r.o. with an adult jednatel. This is the long-pole item; start it early.
8. **Trade licence** (živnostenské oprávnění) for selling to consumers in ČR.
9. **VAT/DPH.** `Platba.jsx` states "Ceny jsou včetně DPH." That is a legal claim
   and must be true of the prices actually configured in Stripe.
10. **A real refund process** for `REFUND_GUARANTEE_DAYS` — a documented promise
    the founder will honour manually from the Stripe dashboard is sufficient, but
    it must exist before the guarantee is shown to a paying customer.
11. **Privacy policy and terms pages** — already a P0 gap in the Day 1 audit, and
    charging money without them is worse than browsing without them.
12. Final prices confirmed (249 / 690 are still marked PLACEHOLDER in
    `pricing.js`). Changing them later means creating new Stripe Prices and
    swapping two env vars — no code change.

---

## 12. Out of scope

- Trial reminder emails (`TRIAL_REMINDER_IMPLEMENTED` stays `false` — no email
  infrastructure exists; do not promise what does not exist).
- Server-side one-time-offer entitlement (§7, deferred to `UNFORGET.md`).
- Stripe Customer Portal (the §4.3 endpoint covers the one-click cancellation
  requirement without it).
- Invoices/receipts beyond Stripe's own automatic emails.
- Refund automation — manual from the dashboard.
