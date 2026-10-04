# Plan 018 — Parent ↔ child share links: make every "share with…" button real

- **Status:** IMPLEMENTED — code, local checks and review fixes done; Supabase SQL applied 2026-10-04 (3 tables, RLS on). Browser two-device and Stripe test-mode checks remain before rollout
- **Planner:** Claude Opus 5.5 · **Implementer:** Codex (GPT-6 Luna max, or Sonnet 5 high)
  · **Reviewer:** a separate pass, using the hard-review row because this touches payments
- **Base commit:** `8c78840`
- **Closes:** the `UNFORGET.md` entry "Full share-with-parent link — deferred until
  parent/child accounts are decided", plus the 2026-09-21 "Still open" bullet about a
  device-handoff flow where the parent pays (item 9 under the paywall legal entry)

## 1. Problem

Every parent/child share button in the app either fakes the send or is disabled:

| # | Where | Label (student / parent) | What it does today |
|---|---|---|---|
| A | `QuizQuestion.jsx` → `ParentHandoffNudge` (parent branch, first quiz question) | — / "Poslat odkaz dítěti" | `disabled`, marked "Zatím nefunguje" |
| B | `Reveal.jsx` `share()` | "Poslat rodičům" / "Sdílet s dítětem" | shares `window.location.origin` (the homepage) plus the name of the top school |
| C | `Plan.jsx` (uses `useHandoffShare`) | "Ať to zaplatí rodič" / "Poslat odkaz dítěti" | shares the homepage |
| D | `Platba.jsx` (uses `useHandoffShare`) | "Sdílet s rodičem" / — | shares the homepage |
| E | `/dotaznik` (`Questionnaire.jsx`) | none | there is no share button at all |
| F | `/prihlaska` → `/sdileni/:token` | "share shortlist" | **already real** (`shortlist_shares`); leave it alone |
| G | `SchoolActions.jsx` "Sdílet školu" | — | **already real**: a public school URL on an ungated page; leave it alone |

`useHandoffShare` in `paywallKit.jsx` and the copy in `Reveal.jsx` both say that
nothing fakes a send. Sharing the homepage while saying "here are my results" is
exactly such a fake.

## 2. Decisions (settled by the founder; do not re-litigate)

1. **There is one account, and it belongs to the child.** There is still no
   parent/child account linking. A parent who receives a link **never gets a
   session, never gets app access, and never sees app navigation.** Every page a
   link opens is a standalone page outside `Layout`, just like `SdileniView`.
2. **The child pays through the parent ("Ať to zaplatí rodič", C/D).**
   - The student creates a **payment link**. The parent opens it with **no account**,
     picks a plan and pays on Stripe, and the **student's** account becomes active.
   - The same link then acts as the **parent's management page**: it shows the plan's
     state and has Cancel and Withdraw buttons, because the payer holds that right.
   - The parent gets nothing else.
3. **The parent sends the questionnaire to the child (A).**
   - The child opens the link and **takes over the whole onboarding as a student** on
     their own device: their own answers, results and account. From the paywall the
     child can then send the payment link back.
   - While the link is active, **the parent's onboarding is locked** on the parent's
     device. The parent can press "Chci dotazník vyplnit sám", which **deactivates
     the link** and unlocks their flow.
4. **The parent branch's paywall button "Poslat odkaz dítěti" (C, parent side) is
   removed.** Instead, the parent branch's **signup step** (`CreateAccount.jsx`)
   carries a recommendation: create the account with the **child's name and e-mail**,
   because the child is who will mostly use it.
5. **Results links are read-only (B, E).** The recipient sees results only. They
   **mirror the owner's entitlement at view time**, so a link can never bypass the
   paywall:
   - The owner has access (trial, paid, developer or beta): the recipient sees the
     **top 10** with percentages and reasons.
   - Otherwise: the recipient sees **the #1 school only** plus "a further N schools"
     as locked, with the line "Zbytek pořadí se zobrazí, až bude účet aktivní."
6. **Results shared before an account exists (B on Reveal) use a server snapshot.**
   - Only these are stored: the top school's id, its percentage, the count of schools
     that fit, and the role. **No answers.**
   - The link expires after 30 days and has no revoke UI.
   - The snapshot always shows the free tier (#1 plus a locked count), the same as
     the Reveal screen itself.
7. **No checkbox on the parent payment page.** The founder decision of 2026-09-22
   (`UNFORGET.md` item 7) removed payment checkboxes. Under the button, use a plain
   sentence in the pattern Platba already uses: "Objednáním potvrzujete, že jste
   rodič nebo zákonný zástupce, a souhlasíte s obchodními podmínkami…".

## 3. Schema — append one delimited block to `supabase-setup.sql`

Put it after the `shortlist_shares` block. It must be idempotent, like the rest of
the file. Enable RLS on all three tables and add **no client policies at all**:
`server.js` with the service role is the only reader and writer, the same as
`school_programs`.

```sql
-- Plan 018: parent <-> child links. server.js (service_role) only — no client policy.

-- Account-owned links. kind='results' shows the owner's DEFAULT questionnaire
-- run live; kind='payment' lets someone without an account pay for, and then
-- manage, the owner's plan.
create table if not exists public.share_links (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('results', 'payment')),
  created_at timestamptz not null default now(),
  expires_at timestamptz            -- payment: checkout allowed only before this; null = never
);
create index if not exists share_links_user_idx on public.share_links (user_id, kind);
alter table public.share_links enable row level security;

-- Parent -> child questionnaire handoff, before any account exists. Holds NO
-- personal data and NO answers: the child's answers stay on the child's device.
create table if not exists public.quiz_handoffs (
  token text primary key,           -- goes in the child's URL
  owner_secret text not null,       -- stays on the parent's device; authorises status/revoke
  status text not null default 'active' check (status in ('active', 'opened', 'completed', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  completed_at timestamptz
);
alter table public.quiz_handoffs enable row level security;

-- Pre-account results snapshot (Reveal). Free tier only: one school + a count.
create table if not exists public.result_snapshots (
  token text primary key,
  role text not null check (role in ('student', 'parent')),
  top_school_id bigint not null references public.schools (id) on delete cascade,
  top_score int not null check (top_score between 0 and 100),
  fitting_count int not null check (fitting_count between 0 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.result_snapshots enable row level security;
```

- **Do not migrate or rename `shortlist_shares`.** It is live and correct.
- `schools.id` is `bigint generated always as identity` (confirmed), hence `bigint` above.
- Rows that have expired are filtered at read time. There is no cleanup job; log it
  in `UNFORGET.md` (see §9).
- After the SQL, add a verification query for the founder to run, per their memory
  rule:
  ```sql
  select table_name from information_schema.tables
  where table_schema='public' and table_name in ('share_links','quiz_handoffs','result_snapshots');
  -- expect 3 rows
  ```

## 4. Backend — `server.js`

All tokens are `crypto.randomBytes(16).toString('base64url')`, the same as
`/api/shares`. The secret for a token that doesn't exist and for one that was
revoked or has expired returns the **same 404 body** (no token oracle), as
`GET /api/shared/:token` already does. Every public route uses a rate limiter.

### 4.1 New limiter

`anonLinkLimiter`: 20 per hour per IP, with the same options and message as
`shareLimiter`. It is used **only** by the unauthenticated *create* routes
(`POST /api/handoffs`, `POST /api/result-snapshots`). The public read routes use
the existing `shareLimiter`. The public money routes use the existing
`checkoutLimiter`.

### 4.2 Refactor first (no behaviour change)

- Extract the body of `POST /api/checkout`, from the plan validation through
  `res.json({ url })`, into
  `async function createCheckoutForUser({ userId, email, planId, successPath, cancelPath })`.
  It returns `{ status, body }` and keeps every existing check in order:
  - read the profile;
  - beta returns 403 `BETA_CHECKOUT_DISABLED`;
  - no Stripe returns 503;
  - the `ALREADY_SUBSCRIBED` 409.
- Inside it, `email` is used only where `req.user.email` is used today
  (`customer_email` when there's no `stripe_customer_id`). **Passing
  `email: undefined` must make Stripe ask the payer for their e-mail**, which is
  what the parent path wants: the receipts go to the parent.
- `successPath` and `cancelPath` replace the hard-coded `safeReturnTo` /
  `'/predplatne'`. The existing route passes `sanitizeReturnTo(returnTo)` and
  `'/predplatne'`, so it behaves exactly as before.
- Extract the bodies of `/api/subscription/cancel` and `/api/subscription/withdraw`
  into `cancelPlanForUser(userId)` and `withdrawPlanForUser(userId)`, each returning
  `{ status, body }`. The existing routes become thin wrappers around them.
- Run `npm test` after this step. The existing `server-boundaries` tests must pass
  unchanged. That is the proof the refactor didn't change behaviour.

### 4.3 Account-owned links (`share_links`)

| Route | Guard | Behaviour |
|---|---|---|
| `POST /api/share-links` body `{ kind }` | `decisionLimiter, requireAuth`, plus `requireAccess` **only when `kind==='results'`** | See the rules below. Returns `201 { token, kind, expires_at }`. |
| `GET /api/share-links` | `requireAuth` | The caller's own rows: `token, kind, created_at, expires_at`, newest first. |
| `DELETE /api/share-links/:token` | `requireAuth` | Hard delete where `user_id` matches the caller, then `204`. The same pattern as `/api/shares/:token`. |

Rules for `POST /api/share-links`:
- `kind==='payment'`:
  - Refuse beta accounts with 403 `BETA_CHECKOUT_DISABLED`.
  - Refuse accounts that already have a plan with 409 `ALREADY_SUBSCRIBED`, using
    the same condition as checkout. Factor that condition into
    `hasLivePlan(profile)` and call it in both places.
  - **Delete the caller's previous payment link first**, so only one payment link is
    ever active.
  - Set `expires_at = now + 7 days`.
  - It is *not* gated on `requireAccess`, because a lapsed account is exactly the
    one that needs it.
- `kind==='results'`: no expiry. Several links are allowed, the same as shortlist
  shares.
- Any other kind returns 400.

### 4.4 Public results view

`GET /api/shared-results/:token` uses `shareLimiter` and no auth.

1. Look the token up in `share_links` with `kind='results'`.
   - If it is found, load the owner's default run with
     `scoringRunQuery(user_id, '*')` (signature: `(userId, columns)`, returns the
     default non-archived run, or newest).
   - Run `buildRunResult(run)`.
   - Decide `hasAccess` by reading the owner's `users` row and applying **the same
     logic as `requireAccess`**: beta through `betaAccessState`, the developer email
     check, the trial, then `paidAccessActive`. Extract that logic into
     `async function accessStateFor(userId, email)` returning
     `{ hasAccess, httpStatus, body }`, and have `requireAccess` call it too. Do
     **not** write a second copy. The developer email comes from
     `auth.admin.getUserById` (`supabase.auth.admin.getUserById(user_id)`). If that
     call fails, treat the owner as *no access*: fail closed toward the free tier,
     never toward the full list.
   - If the owner has no run, return 404 with the same body as below.
2. Otherwise look it up in `result_snapshots` where `expires_at > now()`.
3. Otherwise return 404 `{ error: 'Odkaz nenalezen nebo vypršel.' }`.

The response is a **strict allowlist**, identical in shape for both sources:

```js
{
  source: 'account' | 'snapshot',
  role: 'student' | 'parent' | null,   // snapshot only; account → null
  created_at,                           // run.created_at or snapshot.created_at
  fitting_count: number | null,         // snapshot only
  locked_count: number,                 // how many further schools exist but are hidden
  top: [ { rank, school: { id, name, district }, score /* 0–100 int */, reason /* '' if none */ } ],
}
```

- Account source with `hasAccess` true: `top` holds ranks 1–10 from
  `buildRunResult(...).matches.slice(0, 10)`. The score is
  `Math.round(match.score)`, the reason is `match.reason || ''`, and
  `locked_count: 0`.
- Account source with `hasAccess` false: `top` holds rank 1 only, and
  `locked_count = matches.length - 1`.
- Snapshot source: `top` holds a single row built from `top_school_id` (name and
  district read fresh from `schools` and passed through `withDistricts`),
  `score: top_score`, `reason: ''`, `locked_count: max(fitting_count - 1, 0)`.
- **Never return** answers, `jpz_points`, the run label, the owner's name, e-mail,
  id, or subscription state. Add a comment on the route stating this, the same as
  the `/api/shared/:token` comment.

### 4.5 Public payment-link routes

All four routes resolve `share_links` where `kind='payment'`. A link that is
missing or deleted returns 404 `{ error: 'Odkaz nenalezen nebo byl zrušen.' }`.

| Route | Guard | Behaviour |
|---|---|---|
| `GET /api/pay-links/:token` | `shareLimiter` | See below. |
| `POST /api/pay-links/:token/checkout` body `{ planId }` | `checkoutLimiter` | If `expires_at <= now`, return 410 `{ code: 'PAY_LINK_EXPIRED' }`. Otherwise call `createCheckoutForUser({ userId: link.user_id, email: undefined, planId, successPath: '/platba-rodice/' + token, cancelPath: '/platba-rodice/' + token })`. Add `?platba=ok` to the success URL exactly as today. |
| `POST /api/pay-links/:token/cancel` | `checkoutLimiter` | `cancelPlanForUser(link.user_id)`. Works after expiry, because expiry only blocks *buying*. |
| `POST /api/pay-links/:token/withdraw` | `checkoutLimiter` | `withdrawPlanForUser(link.user_id)`. Works after expiry. |

`GET /api/pay-links/:token` returns:

```js
{
  for_name: string | null,   // FIRST WORD of users.name only; null if unset. Never the e-mail.
  checkout_open: boolean,    // expires_at > now && !hasLivePlan(profile)
  expires_at,
  plan: null | {             // present when the owner has a plan (plan_id set)
    plan_id, subscription_status, access_expires_at, cancel_at_period_end,
    can_withdraw: canWithdraw(profile),
  },
}
```

Do **not** return anything else from the profile.

**Webhook: no change.** `client_reference_id` is still the student's id, so
`handleStripeWebhook` activates the student's row as it does today.

**Verify in Stripe test mode** that a season (`mode:'setup'`) checkout started with
`customer_email` omitted still yields a non-null `object.customer` in
`checkout.session.completed`. If it is null, add `customer_creation: 'always'` to
the setup-mode session **only when `email` is undefined**. Record which case
applied in the commit message.

### 4.6 Quiz handoff routes (`quiz_handoffs`)

| Route | Guard | Behaviour |
|---|---|---|
| `POST /api/handoffs` | `anonLinkLimiter`, no auth | Insert `{ token, owner_secret, expires_at: now + 7 days }`. Return `201 { token, ownerSecret }`. |
| `GET /api/handoffs/:token` with header `X-Owner-Secret` | `shareLimiter` | The token and secret must both match, otherwise 404. Return `{ status }`, where `status` is `'expired'` if `expires_at <= now` and the row is still active or opened. |
| `POST /api/handoffs/:token/revoke` with header `X-Owner-Secret` | `shareLimiter` | Set `status='revoked'`, then `204`. The same 404 rules apply. |
| `POST /api/handoffs/:token/open` | `shareLimiter`, no auth (this is the child) | See below. |
| `POST /api/handoffs/:token/complete` | `shareLimiter`, no auth (the child) | Only from `opened`: set `status='completed'`, `completed_at=now`, then `204`. Any other state also returns `204` without changing anything (idempotent and quiet). |

`POST /api/handoffs/:token/open`:
- Allowed only when the status is `active` or `opened` and the link hasn't expired:
  set `status='opened'` and set `opened_at` if it is null, then return `204`.
- Otherwise return 404 `{ error: 'Odkaz už neplatí.' }`.
- Reopening on the same device is allowed. That keeps a reload from breaking.

**Revoking never touches a child who has already opened the link.** Their quiz is
local state on their own device with no link to the parent, so they continue as an
ordinary student onboarding. Revoking only stops *new* opens, and it unlocks the
parent. This is deliberate; say so in a comment.

### 4.7 Pre-account snapshot

`POST /api/result-snapshots` uses `anonLinkLimiter` and no auth. The body is
`{ role, topSchoolId, topScore, fittingCount }`.

- Validate it: `role` must be student or parent, and the other three must be
  integers within the CHECK ranges. `topSchoolId` must exist in `schools`.
  Anything invalid returns 400.
- Insert the row with `expires_at = now + 30 days` and return `201 { token }`.
- A forged snapshot can only show one real school with a made-up percentage under
  our "výsledek dotazníku" heading. That is accepted as harmless; note it in the
  route comment.

## 5. Frontend — shared pieces

### 5.1 `frontend/src/api.js`

Add helpers using the existing `request()` idiom. Public routes use plain `fetch`,
like `fetchSharedShortlist`.

```
createShareLink(kind) · fetchShareLinks() · deleteShareLink(token)
fetchSharedResults(token)                                  // public
fetchPayLink(token) · startPayLinkCheckout(token, planId)  // public
cancelViaPayLink(token) · withdrawViaPayLink(token)        // public
createHandoff() · fetchHandoffStatus(token, ownerSecret) · revokeHandoff(token, ownerSecret)
openHandoff(token) · completeHandoff(token)                // public
createResultSnapshot({ role, topSchoolId, topScore, fittingCount })  // public
```

### 5.2 `frontend/src/lib/shareLink.js`: one share primitive

```js
/** Web Share where it exists, clipboard otherwise. Resolves 'shared' | 'copied';
 *  rejects on failure. A cancelled share sheet (AbortError) resolves 'cancelled'. */
export async function shareUrl({ title = 'Střední na míru', text, url }) { … }
```

Every button in this plan uses it. Delete `useHandoffShare` from `paywallKit.jsx`;
it is replaced, not kept alongside. Leave `Prihlaska.jsx`'s own clipboard code as
it is (out of scope).

### 5.3 Labels by role

Outside onboarding, the role comes from `localStorage['skolamatch.role']`
(`ROLE_KEY` in `OnboardingFlow.jsx`). Export it from there. Do not copy the string.

- Parent: "Sdílet s dítětem".
- Student: "Poslat rodičům".
- Unknown: "Sdílet výsledky".

### 5.4 Standalone pages

These are registered in `App.jsx` **outside `<Layout>`**, next to `/sdileni/:token`.
They have no nav and no `ProtectedRoute`. Each has a "Střední na míru" top bar like
`SdileniView` and reuses its `dp-share-*` classes from `decision.css` where they fit.
New styles go in the same file under a `/* Plan 018 */` heading, using tokens only.

| Route | Page | Purpose |
|---|---|---|
| `/vysledky/:token` | `pages/SharedResults.jsx` | Read-only results (§6.3). |
| `/platba-rodice/:token` | `pages/ParentPay.jsx` | Parent pays for and manages the plan (§6.2). |
| `/od-rodice/:token` | `pages/HandoffStart.jsx` | The child's entry point into the quiz (§6.1). |

Czech, user-facing, standalone routes are consistent with `/sdileni`. Don't rename
them later; links will be in people's chats.

## 6. Frontend — each button

### 6.1 A — Parent sends the questionnaire to the child

**`QuizQuestion.jsx` `ParentHandoffNudge`:**
- Enable the button and remove the "Zatím nefunguje" span and the INERT comment.
  Replace that comment with a short description of the real mechanism.
- On click:
  1. `createHandoff()`.
  2. Save `{ token, ownerSecret, url }` to `localStorage['skolamatch.handoff.owner']`.
  3. `shareUrl({ text: 'Vyplň si prosím dotazník ke střední škole — stačí otevřít odkaz.', url: origin + '/od-rodice/' + token })`.
  4. The flow is now locked (see the next block). The lock screen shows immediately
     **even if sharing failed**, because the link exists. The lock screen has its own
     "Poslat odkaz znovu".

**`OnboardingFlow.jsx`: the parent lock.**
- If `skolamatch.handoff.owner` exists, call `fetchHandoffStatus` on mount and on
  `visibilitychange` when the page becomes visible.
- While the request is in flight, render nothing new (keep the current step hidden
  behind a lightweight "Načítám…").
- Then, by status:
  - **`active` / `opened`:** render `<HandoffLock>`, a new component in
    `components/onboarding/HandoffLock.jsx` built with `ObScreen`/`ObButton`,
    *instead of* the step. It contains:
    - title: "Dotazník teď vyplňuje vaše dítě";
    - body: "Až ho dokončí, výsledky i účet bude mít u sebe. Výsledky nebo odkaz k
      platbě vám pak může poslat.";
    - a status line: "Dítě odkaz zatím neotevřelo" or "Dítě odkaz otevřelo";
    - "Poslat odkaz znovu", which calls `shareUrl` with the stored url;
    - "Zkontrolovat znovu", which refetches;
    - a secondary button, "Chci dotazník vyplnit sám", with a one-line warning:
      "Odkaz tím přestane platit." Pressing it calls `revokeHandoff`, removes the
      key, and the flow continues at the current step.
  - **`completed`:** the same component in its done state:
    - title: "Dítě dotazník vyplnilo";
    - body: "Výsledky i účet má u sebe. Pokud chce, pošle vám výsledky nebo odkaz k
      platbě.";
    - buttons: "Začít vlastní dotazník" (removes the key and goes to
      `goToStep('welcome')`) and "Zavřít" (link to `/`).
  - **`revoked` / `expired` / a 404:** remove the key silently and continue normally.
  - **A network error:** stay locked and show the error with a "Zkusit znovu" button.
    Never unlock because of an outage.

**`pages/HandoffStart.jsx` (`/od-rodice/:token`): the child.**
- Call `openHandoff(token)` on mount.
- On success:
  - Set `localStorage[ROLE_KEY] = 'student'`.
  - Set `localStorage['skolamatch.handoff.child'] = token`.
  - **Clear** the onboarding answers in sessionStorage (`ANSWERS_KEY`; export it as
    well). This device may have stale answers, and the child starts fresh.
  - Render an intro:
    - "Rodič ti poslal dotazník";
    - "Pár otázek o tom, co tě baví a kam chceš. Odpovídej podle sebe — výsledky i
      účet budou tvoje.";
    - a button "Začít", which navigates to `/onboarding/stakes`.
- On 404: show "Odkaz už neplatí" with the body "Rodič ho zrušil, nebo vypršel. Můžeš
  si dotazník vyplnit i bez něj.", plus a button "Začít dotazník" that goes to
  `/onboarding/welcome`.

**`Reveal.jsx` on mount:** if `skolamatch.handoff.child` exists, call
`completeHandoff(token)` once (ignore errors), then remove the key. This is the
moment the parent's lock switches to "completed".

### 6.2 C / D — "Ať to zaplatí rodič" (student) → parent pays

**New `components/ParentPayHandoff.jsx`.** It is used on `Plan.jsx` and `Platba.jsx`
(student branch only) and on `SubscriptionExpired.jsx`. Read that file first; place
it next to its buy button with the same "beside, never instead of" rule.

- Props: `{ voice }` for tykání/vykání, and `{ variant: 'ghost' | 'inline' }` to
  match the current Plan button or the Platba inline link.
- **When it is shown:** only when the user is signed in, is **not** a tester
  (`isTester` from `useAuth()`), and the parent branch is **not** active. Plan and Platba are
  only reachable after `ucet`, so an account exists. If not signed in, render
  nothing.
- **On click:** `createShareLink('payment')` → `shareUrl({ text: 'Můžeš mi prosím
  zaplatit přístup do Střední na míru? Platí se přes odkaz, účet pro tebe zakládat
  nemusíš.', url: origin + '/platba-rodice/' + token })`.
- **Then it shows a waiting panel in place of the button:**
  - "Čekáme na platbu od rodiče. Odkaz platí 7 dní.";
  - "Poslat znovu";
  - "Zrušit odkaz", which calls `deleteShareLink(token)` and goes back to the
    button;
  - "Rodič už zaplatil", which calls `refreshProfile()`.
- **On mount:** load the user's existing payment link with
  `fetchShareLinks().filter(kind==='payment' && not expired)`. If one exists, start
  in the waiting state, so revisiting the page shows the truth.
- **Activation:**
  - Also call `refreshProfile()` on `visibilitychange` when the page becomes visible.
  - When the profile shows access from payment (`subscription_status` and plan
    fields as `AuthContext` already exposes them; reuse whatever `hasAccess`/paid
    helper the profile already uses, never a new rule), go to:
    - `goToStep('hotovo')` inside onboarding;
    - `navigate('/skoly')` on `/predplatne`.
- **Errors:** `BETA_CHECKOUT_DISABLED` and `ALREADY_SUBSCRIBED` show the server's
  message.

Remaining edits for C/D:
- `Plan.jsx`: replace `useHandoffShare` with `<ParentPayHandoff>` **on the student
  branch only**. On the parent branch, **delete the button** (decision 4).
- `Platba.jsx`: the student branch's "Platí ti to rodič? · Sdílet s rodičem" uses
  `<ParentPayHandoff variant="inline">`. Leave the parent branch's
  "Účet je pro vaše dítě" text as it is.

**`pages/ParentPay.jsx` (`/platba-rodice/:token`): the parent.** It calls
`fetchPayLink(token)` and renders by state. All copy uses vykání.

1. **404:** "Odkaz nenalezen nebo byl zrušen." No link into the app.
2. **`checkout_open`** (buy):
   - Heading: "Přístup pro {for_name || 'vaše dítě'}".
   - The two plan cards come from `config/pricing.js`. Reuse its existing
     helpers and copy (`planCopy` etc.); no amount is hardcoded. Season is
     pre-selected, per the pricing decision.
   - The trial and cancellation lines come from the same config.
   - The button "Objednat s povinností platby" calls
     `startPayLinkCheckout(token, planId)` and then
     `window.location.assign(url)`.
   - Under it (decision 7): "Objednáním potvrzujete, že jste rodič nebo zákonný
     zástupce, a souhlasíte s <a href='/obchodni-podminky'>obchodními podmínkami</a>
     včetně práva odstoupit."
   - One line: "Účet ani přihlášení nepotřebujete. Aplikaci bude používat vaše dítě
     na svém účtu."
   - `PAYMENTS_MOCKED` / 503: the same honest "platby zatím nejsou nastavené" note
     the Platba screen uses.
3. **`?platba=ok` in the URL and `plan` still null** (the webhook hasn't arrived
   yet): "Platba se zpracovává…". Refetch every 3 s, up to 10 times, then show
   "Zkontrolovat znovu".
4. **`plan` present** (manage):
   - Heading: "Přístup pro {for_name || 'vaše dítě'} je aktivní".
   - The plan name, "platí do {access_expires_at}", and a cancelled-at-period-end
     notice when `cancel_at_period_end` is set.
   - "Zrušit předplatné" behind a `ConfirmDialog` (exists at
     `components/ConfirmDialog.jsx`) calls `cancelViaPayLink`.
   - When `can_withdraw` is true, "Odstoupit od smlouvy a vrátit peníze" behind a
     `ConfirmDialog` calls `withdrawViaPayLink`.
   - After either action, refetch.
   - Copy and the dialog texts follow `Settings.jsx`'s existing cancel/withdraw
     section. Read it and reuse the strings so the two surfaces say the same thing.
5. **Expired, no plan:** "Odkaz vypršel. Požádejte dítě o nový." (`checkout_open`
   false, `plan` null.)

### 6.3 B / E — Read-only results

**`Reveal.jsx` (pre-account; B):**
- Replace `share()` with: `createResultSnapshot({ role, topSchoolId:
  top.school.id, topScore: toPercent(top.score), fittingCount: fitting })`, then
  `shareUrl({ text, url: origin + '/vysledky/' + token })`. Keep the current role
  `text` strings.
- **If the user is signed in AND has a default run on the server** (a returning
  account reaching Reveal), still use the snapshot. It is the simplest correct
  thing, and the account link lives on `/dotaznik`.
- Keep the existing `shareState` notes.
- Remove the old homepage-sharing code.

**`Questionnaire.jsx` (`/dotaznik`, results header; E):**
- Add a secondary button with the §5.3 label, beside "Vyplnit znovu", visible only
  when `active` exists. On click: `createShareLink('results')` → `shareUrl(...)`
  with the url `/vysledky/{token}` and the text "Moje výsledky dotazníku ze Střední
  na míru — jen ke čtení."
- Under it, a small list of the user's results links in the same shape as
  Prihlaska's share list (created date and "Zrušit" → `deleteShareLink`). Copy the
  layout pattern, not the code; the list uses `fetchShareLinks()` filtered to
  `kind==='results'`.
- A line under the button: "Odkaz ukazuje vaše/tvoje výchozí výsledky — když
  změníš výchozí běh, změní se i to, co rodič uvidí. Nic jiného z aplikace s ním
  nepoužije." (Use the voice by role.)

**`pages/SharedResults.jsx` (`/vysledky/:token`):** it calls `fetchSharedResults`.

- The top bar is the same as `SdileniView`.
- Header:
  - `source==='snapshot'`: "Výsledek dotazníku" plus "Z pražských škol sedí
    {fitting_count}. Nejvíc:".
  - `source==='account'`: "Výsledky dotazníku".
  - Followed by "vyplněno {date}".
- Rows: rank, school name linking to `/skoly/:id` (the public page; that is fine
  and already ungated), district, "{score} % shoda", and the reason when non-empty.
  Never invent text for an empty reason.
- If `locked_count > 0`: a muted locked row reading "a dalších {locked_count}
  škol — zbytek pořadí se zobrazí, až bude účet aktivní." **No pay button here.**
  Paying goes only through the child's payment link, because this page has no
  authority over any account.
- Footer disclaimer: "Jen ke čtení. Odkaz nedává přístup do aplikace." Plus a
  neutral CTA "Vyplnit vlastní dotazník" → `/onboarding/welcome`.
- 404: the same layout as `SdileniView`'s not-found state.

### 6.4 Parent signup recommendation (decision 4)

In `CreateAccount.jsx`, **parent branch only**, above the name/e-mail fields, add a
quiet notice. Use an existing notice/microcopy class; don't invent one.

> **Tip:** Doporučujeme založit účet na jméno a e-mail vašeho dítěte — aplikaci bude
> nejspíš používat hlavně ono. Za přístup pak můžete zaplatit vy.

The field labels themselves don't change.

### 6.5 Settings: one place to see every link

`Settings.jsx` gets a section titled "Sdílené odkazy" listing
`fetchShareLinks()`:
- a type ("Výsledky dotazníku" / "Odkaz k platbě pro rodiče");
- the created date;
- "platí do" for payment links;
- "Zrušit" → `deleteShareLink`.

Empty state: "Žádné sdílené odkazy." Shortlist links stay on `/prihlaska`; don't
merge them in.

Add one honest line for payment links: "Když odkaz k platbě zrušíte, rodič přes něj
už nebude moct předplatné spravovat — zrušit ho pak můžeš ty tady v Nastavení."

## 7. Out of scope (do not touch)

- `shortlist_shares`, `Prihlaska.jsx`, `SdileniView.jsx`, `/api/shares*`.
- `SchoolActions.jsx` "Sdílet školu". It is already real, and school pages are
  public for everyone.
- Account linking, family plans, multiple children, parent accounts.
- E-mail delivery of links (still copy/share-sheet only; see the existing
  `UNFORGET.md` entry).
- The Stripe webhook, `chargeDueSeasonPasses`, pricing values, the matching
  engines.
- `Matice.jsx`, `Activated.jsx`, whose checklist item "Ukaž výsledky rodičům" stays
  a checkbox.

If the work seems to need any of these, stop and report.

## 8. Verification

**Automated.** Add to `tests/server-boundaries.test.cjs`, using its existing
harness and no real Stripe:

1. `POST /api/share-links {kind:'payment'}`:
   - a beta account gets 403;
   - an account with a live plan gets 409;
   - a second link deletes the first.
2. `POST /api/pay-links/:token/checkout`:
   - an expired link gets 410;
   - a valid link calls Stripe with `client_reference_id` = the **owner's** id and
     **no** `customer_email`.
3. `GET /api/pay-links/:token` returns only the allowlisted keys. Assert there is no
   `email` and no `id`.
4. `GET /api/shared-results/:token`:
   - an owner without access gets exactly 1 row with `locked_count = n-1`;
   - an owner with access gets 10 rows;
   - the response never contains `answers`;
   - a failure in `getUserById` gives the free tier.
5. Handoffs:
   - `open` on revoked or expired gets 404;
   - `complete` only moves `opened → completed`;
   - status and revoke with the wrong secret get 404.
6. `requireAccess` still behaves the same after the `accessStateFor` extraction. The
   existing beta and developer tests cover this and must stay green.

Then run:
```bash
npm test
cd frontend && npm run lint && npx vite build
```
Lint should show only the pre-existing warnings.

**Manual, in the browser.** Use the Browser pane and verify it yourself. Use two
contexts: a normal tab, plus a second tab or private window as the "other device".
Stripe is test mode only.

1. **Payment link.** On the student branch, create an account, reach Plan, and press
   "Ať to zaplatí rodič". The URL is copied and the waiting panel shows.
   - Open the URL in a second context with no session. You see the plan cards and no
     app nav.
   - Pay with `4242…`. You return to the manage state.
   - Back in the student tab, focusing it moves to `hotovo`, and `/skoly` has
     access.
   - On the parent page, cancel. The student's Settings reflects it.
2. **Withdraw** with a fresh link and plan: the refund happens, and the student loses
   access.
3. **Quiz handoff.** On the parent branch, press "Poslat odkaz dítěti" on the first
   question. The lock screen shows.
   - Open the link in the second context: "Rodič ti poslal dotazník" in tykání,
     starting at `stakes`.
   - The parent tab, refocused, shows "Dítě odkaz otevřelo".
   - The child reaches Reveal. The parent tab shows the done state.
   - Repeat, but press "Chci dotazník vyplnit sám". The parent continues, and opening
     the link fresh shows "Odkaz už neplatí".
4. **Reveal snapshot** before an account: the link shows #1 plus the locked count,
   and only the top bar.
5. **`/dotaznik` results link:**
   - On an account with access, the link shows the top 10 with reasons.
   - Expire the account's trial in Supabase (set `trial_expires_at` in the past on a
     test account). The same link now shows 1 row plus locked.
   - "Zrušit" kills it with a 404.
6. **Parent signup tip:** it shows on the parent branch only.
7. Check every new page at **390px and 1280px**, in light and dark mode.

## 9. Bookkeeping, done by the implementer in the same commit series

**`CLAUDE.md` and `AGENTS.md` (keep both equivalent):**
- Add `share_links`, `quiz_handoffs` and `result_snapshots` to the Supabase schema
  table.
- Add the three public routes to the Repo Map / routes note.
- Add one paragraph under "What's Already Built" stating the rule: links never give
  a session or app access; results links mirror the owner's entitlement live; the
  payment link is the parent's only surface.

**`UNFORGET.md`:**
- **Close** "Full share-with-parent link — deferred…", summarising the decisions in
  §2.
- **Update** item 9's "Still open… device-handoff" bullet to "built in plan 018
  (parent pays via link); whether this changes the §31 contract-capacity analysis
  needs a human/legal look."
- **Add:** the privacy policy (`Legal.jsx`, Ochrana osobních údajů) must mention
  share links. The parent payment page shows the child's first name to whoever holds
  the link, and the snapshot and handoff tables exist. This is **for human review,
  not written by the implementer.**
- **Add:** there is no cleanup job for expired `quiz_handoffs`, `result_snapshots`
  and payment `share_links`. They are filtered at read time; add a periodic delete
  if the tables grow.
- **Add:** revoking a payment link removes the parent's ability to cancel through
  it. The student can still cancel in Settings.

**`plans/README.md`:** add row 018.

**Commit and push** after each coherent stage: the refactor plus tests, then the
schema plus backend, then each frontend button group. Commit only the files from
this plan; another session edits this tree.

**Before deploying:** run the §3 SQL block in the Supabase SQL editor, along with its
verification query.
