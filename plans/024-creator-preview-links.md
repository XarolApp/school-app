# Plan 024 — Creator preview links (affiliate outreach)

Status: planned 2026-10-22 (Opus, with founder Q&A). Not implemented.
Implementer: Codex GPT-6 Luna (or Sonnet). Reviewer: separate pass.

## Goal

The founder messages content creators to recruit them into the affiliate programme. Each
creator gets a personal link like **`https://www.stredninamiru.cz/pro/<random-code>`**.
Opening it:

- gets them past the closed-site gate,
- signs them into **their own** pre-filled demo account. They never type a code, email or
  password,
- shows the **whole app with no paywall, no trial counter and no beta feedback prompts**.

Normal users can't get in this way. A forwarded link stops working after the 2nd device.

## Founder decisions (2026-10-22 — settled, do not re-derive)

| Topic | Decision |
|---|---|
| First screen | A **ready demo account**: results already filled in, onboarding skipped. Filming the product is out of scope for now. |
| Demo data | **One template answer set, copied into each creator's own account.** Creators never see each other's data. |
| URL | `/pro/<code>`. The code is long and random. |
| Devices | **2 devices per link.** A 3rd device is refused. The founder can reset devices in admin. |
| Lifetime | **Until revoked.** No expiry. |
| Paywall | **Skipped completely.** No prices are shown and Stripe is never reached. |
| Badge | A small **"Náhled pro tvůrce"** tag in the nav. |
| 3rd device | A polite page: *"Tento odkaz už je aktivní na jiných zařízeních. Napiš nám na info@stredninamiru.cz a přidáme ti další."* The attempt is counted in admin. |
| Invalid / unknown code | The normal closed-site gate page, which reveals nothing. |
| Re-entry | Reopening the link on an already approved device signs the creator back in. If they wipe all cookies, that device counts as a new one. |
| Revoke | **Sign out and block, but keep the data.** Restoring brings the account back intact. |
| Stats | **Excluded from the beta/admin stats.** A separate admin tab shows creator activity. |
| Management | A new **"Tvůrci"** tab in `/admin`. |

## Design decisions (made here; the implementer follows them)

1. **A new `subscription_status = 'creator'`.** Do not reuse `developer`: that status is
   driven by an env email list, can't be revoked per person, and isn't excluded from
   anything. `creator` access is valid only while the account's `creator_links` row is not
   revoked.
2. **The creator account is a real Supabase Auth user** created by the server:
   - email `tvurce+<first 8 chars of link id>@stredninamiru.cz`, so any stray email lands
     in the founder's inbox;
   - `email_confirm: true`;
   - a random 32-byte password that is never stored or shown.

   The link is the only way in.
3. **Sign-in without a password.** The server calls
   `supabase.auth.admin.generateLink({ type: 'magiclink', email })`. This sends no email
   and returns `properties.hashed_token`. The browser then calls
   `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` and gets a normal session.
   Everything downstream (`requireAuth`, RLS, AuthContext) keeps working unchanged.
4. **Device binding happens in the Vercel Edge middleware**, not in the SPA, for two reasons:
   - The device id must be an **HttpOnly** cookie on `stredninamiru.cz`, which page
     JavaScript can't read or copy.
   - The API lives on Railway (a different origin), so it can't set that cookie.

   The middleware also sets the existing gate cookie (`sm_access`) in the same response.
5. **The middleware → API call is authenticated with a shared secret** (`CREATOR_CLAIM_SECRET`,
   set on both Vercel and Railway). The claim endpoint refuses any call without the secret.
   There is one exception, for local development, described in step 4.
6. **Only a SHA-256 hash of the link code is stored.** Consequences:
   - The full link is shown **once**, when it is created.
   - Admin offers "Nový odkaz" (rotate) instead of "Kopírovat". Rotating replaces the code,
     so the old link stops working. The account, its data and approved devices stay.
7. **The device limit is enforced in one Postgres function** (`claim_creator_device`) that
   locks the link row. Two devices opening the link at the same moment can't both become
   device #2.
8. **No expiry column.** "Until revoked" is the decision. Add `expires_at` only if the
   founder asks.
9. **A revoked creator is blocked in two layers:**
   - `accessStateFor` returns 403 `CREATOR_REVOKED` immediately.
   - The Auth user is banned (`ban_duration: '876000h'`), so their refresh token dies and
     the next refresh signs them out.

   Restoring unbans the user (`ban_duration: 'none'`).

## Flow

```
Creator opens https://www.stredninamiru.cz/pro/<code>
  └─ Vercel middleware (frontend/middleware.js), BEFORE the gate check:
       device = cookie sm_creator_device || new random 32 bytes (hex)
       POST {API}/api/creator/claim   header X-Creator-Claim-Secret
            body {token:<code>, device, userAgent}
       ├─ 200 {tokenHash} → 303 to /pro/prihlaseni#t=<tokenHash>
       │                     Set-Cookie sm_access (gate) + sm_creator_device (400 days)
       ├─ 409 (device limit) → polite "already active on other devices" HTML page
       ├─ 404 (unknown/revoked) → normal gatePage()
       └─ anything else → small "Zkus to prosím za chvíli" HTML page, status 503
  └─ SPA /pro/prihlaseni (CreatorSignIn.jsx, outside Layout):
       read #t, history.replaceState to strip the fragment,
       sign out any existing session, setRememberMe(true),
       supabase.auth.verifyOtp({token_hash, type:'magiclink'}), refreshProfile(),
       navigate('/dotaznik', {replace:true})   ← shows the pre-filled top-10 results
```

## Implementation steps

### 1. Migration — `migrations/2026-10-22-creator-links.sql`, mirrored in `supabase-setup.sql`

- Add `'creator'` to `users_subscription_status_check`. Update **both** places in
  `supabase-setup.sql`: the table definition around line 46 and the drop/add constraint
  around line 610.
- Create the tables (RLS enabled, **no policies**, so they are service-role only;
  `revoke all ... from anon, authenticated`):

```sql
create table if not exists public.creator_links (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  note text check (note is null or char_length(note) <= 200),
  token_hash text not null unique,
  user_id uuid not null unique references public.users(id) on delete cascade,
  max_devices smallint not null default 2 check (max_devices between 1 and 5),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_opened_at timestamptz,
  last_active_at timestamptz,
  open_count integer not null default 0,
  blocked_attempts integer not null default 0,
  last_blocked_at timestamptz
);
create table if not exists public.creator_devices (
  link_id uuid not null references public.creator_links(id) on delete cascade,
  device_hash text not null,
  user_agent text check (user_agent is null or char_length(user_agent) <= 200),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (link_id, device_hash)
);
```

- Add the function `public.claim_creator_device(p_token_hash text, p_device_hash text, p_user_agent text)`:
  - `returns table(result text, user_id uuid)`, `security definer`,
    `set search_path = public`.
  - Execute is granted to `service_role` only and revoked from public, anon and authenticated.
  - Logic:
    1. `select ... from creator_links where token_hash = p_token_hash for update`.
    2. Missing link → `('not_found', null)`. Revoked link → `('revoked', null)`.
    3. If the device row exists → update `last_seen`.
    4. Otherwise, if `count(*) < max_devices` → insert the device.
    5. Otherwise → increment `blocked_attempts`, set `last_blocked_at = now()`, return
       `('blocked', null)`.
    6. On success: `open_count += 1`, `last_opened_at = now()`, return `('ok', user_id)`.
- Verify query for the founder, to run after applying:
  ```sql
  select (select count(*) from information_schema.tables where table_schema='public' and table_name in ('creator_links','creator_devices')) as tables_2, (select pg_get_constraintdef(oid) like '%creator%' from pg_constraint where conname='users_subscription_status_check') as status_ok, (select count(*) from pg_proc where proname='claim_creator_device') as fn_1;
  ```
  It should return `2 | true | 1`.

### 2. Demo template — `lib/creatorDemo.js`

- Export `CREATOR_DEMO_ANSWERS` in **onboarding answer format**, so that it passes
  `validateOnboardingAnswers` from `lib/onboardingAnswers.js`:
  ```js
  { focus: ['it', 'prirodni'], future: 'vysoka', studyType: 'nevim', language: 'hodne',
    practice: 'obojí', certainty: 'spis', priority: 'obojí', districts: ['5', '13'],
    points: 70, gain: 'plus5', reserve: 'vyvazene' }
  ```
  If any value is rejected by the validator, fix the value. Do not change the validator.
- Refactor: move the body of `POST /api/me/onboarding-answers` in `server.js`
  (validate → translate → fetchAllSchools → scoreSchools → insert run → setDefaultRun) into
  `async function saveOnboardingRun(userId, rawAnswers)`. The endpoint becomes a thin
  wrapper that keeps exactly the same responses. Creator creation calls the same function,
  so there is one scoring path and no copy.
- After the run is saved, insert its **top 3** `school_id`s into `favorites` for that user,
  so `/ulozene` isn't empty.

### 3. Server — new `lib/creatorLinks.js`, registered from `server.js`

Follow the `registerBetaAdmin(app, db, guards)` pattern. Export
`registerCreatorLinks(app, db, { requireAuth, requireAdmin, saveOnboardingRun })`.

**`POST /api/creator/claim`** (no user auth):

- Secret check:
  - If `CREATOR_CLAIM_SECRET` is set, the `X-Creator-Claim-Secret` header must match it
    (constant-time compare). Otherwise → 403.
  - If the secret is **unset** and `NODE_ENV === 'production'` → 403.
  - If it is unset outside production → allowed. This is the local-dev path.
- Validate the body:
  - `token` matches `/^[A-Za-z0-9_-]{40,64}$/`;
  - `device` matches `/^[a-f0-9]{64}$/`;
  - `userAgent` is truncated to 200 characters.

  Any failure → 404.
- Call the RPC with `sha256(token)` and `sha256(device)` (hex).
  - `not_found` or `revoked` → 404 `{}`.
  - `blocked` → 409 `{}`.
  - `ok`:
    1. Look up the email with `db.auth.admin.getUserById(user_id)`.
    2. Call `generateLink({type:'magiclink', email})`.
    3. Return `{ tokenHash: data.properties.hashed_token }`.
  - Any thrown error → 503.
- `Cache-Control: no-store`. The global `/api/` rate limiter already applies; add nothing
  extra. The code is 256 bits, so guessing it is pointless.

**Admin routes**, all behind `[requireAuth, requireAdmin]`:

- `GET /api/admin/creators`: one row per link with id, name, note, created_at,
  revoked_at, last_opened_at, last_active_at, open_count, blocked_attempts,
  last_blocked_at, max_devices, and `devices: [{first_seen, last_seen, user_agent}]`.
  Never return `token_hash`.
- `POST /api/admin/creators {name, note?}`:
  1. Generate the token: `crypto.randomBytes(32).toString('base64url')` (43 characters).
  2. `db.auth.admin.createUser({ email, password: randomBytes(32).hex, email_confirm: true, user_metadata: { name } })`.
     The signup trigger creates a `trialing` `users` row.
  3. `update users set subscription_status='creator', trial_expires_at=now()`.
  4. Insert the `creator_links` row.
  5. `saveOnboardingRun(userId, CREATOR_DEMO_ANSWERS)`, then the favourites.
  6. Return `{ url: CREATOR_LINK_BASE + '/pro/' + token }`.

  The email uses the link id, so generate the id first with `crypto.randomUUID()`. If any
  step after `createUser` fails, delete the auth user
  (`db.auth.admin.deleteUser`; the cascade removes the rows) and return 503. A
  half-created creator must not linger.

  `CREATOR_LINK_BASE` is an env var defaulting to `https://www.stredninamiru.cz`.
- `POST /api/admin/creators/:id/rotate`: new token and new hash. Returns `{url}`.
- `POST /api/admin/creators/:id/reset-devices`: deletes the link's `creator_devices` rows.
- `POST /api/admin/creators/:id/revoke`: sets `revoked_at = now()` and calls
  `db.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })`.
- `POST /api/admin/creators/:id/restore`: sets `revoked_at = null` and calls
  `updateUserById(user_id, { ban_duration: 'none' })`.
- Validate `:id` as a UUID; anything else → 400.

**Access rule changes in `server.js`:**

- `accessStateFor`, **before** the `isDeveloperEmail` branch: if
  `profile.subscription_status === 'creator'`, read
  `creator_links.revoked_at, last_active_at` by `user_id`.
  - No row, or `revoked_at` set → `{ hasAccess:false, httpStatus:403, body:{ error:'Náhled pro tvůrce byl ukončen.', code:'CREATOR_REVOKED' } }`.
  - Otherwise → `hasAccess: true`. If `last_active_at` is null or older than 10 minutes,
    fire-and-forget an update setting it to `now()`. That is the "last active" column in
    admin, with no extra tracking.
- `GET /api/me` (around line 810): add `isCreator: profile.subscription_status === 'creator'`.
  For a creator:
  - `hasAccess` comes from the same creator check;
  - `trialActive: false`, `subscribed: false`, `canWithdraw: false`, `trialDaysLeft: 0`.

  Easiest is to reuse `accessStateFor` for that branch rather than duplicating the lookup.
- `POST /api/checkout` and any other Stripe-creating route: return 403 for
  `subscription_status === 'creator'`. Creators must never reach Stripe.
- Grep `server.js` for any other `subscription_status` comparison that would misbehave for
  an unknown status, for example the developer auto-promotion near line 790. Make sure
  `creator` is never overwritten.

### 4. Edge middleware — `frontend/middleware.js`

- Add a constant `API_ORIGIN = process.env.WAITLIST_API_URL || 'https://school-app-production-be43.up.railway.app'`
  and use it for both the waitlist proxy and the claim call.
- Add the branch **right after the `/__waitlist` block, before the gate check**:
  `if (/^\/pro\/[A-Za-z0-9_-]{40,64}$/.test(url.pathname) && request.method === 'GET')`.
  - Read or create the device id. The cookie is `sm_creator_device`, value is 64 hex
    characters, created with `crypto.getRandomValues`.
  - POST to the claim endpoint with the secret header, plus `X-Forwarded-For` passed
    through like the waitlist proxy does.
  - Branch on the status exactly as in the Flow section.
  - Device cookie: `sm_creator_device=<id>; Path=/; Max-Age=34560000; HttpOnly; Secure; SameSite=Lax`.
  - Gate cookie: `setAccessCookie(await accessCookieValue(normalizeAccessKey(process.env.SITE_ACCESS_KEY)))`,
    sent only when `SITE_ACCESS_KEY` is set.
  - Send two `Set-Cookie` headers by building a `Headers` object and calling `append`
    twice. A plain object can't hold two of them.
  - Every response gets `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, so
    the code isn't leaked in a Referer.
- The blocked page reuses the existing gate page's inline CSS. Add a small
  `messagePage(title, text, status)` helper next to `gatePage`. Do not build a template
  system.
- `/pro/prihlaseni` must pass the gate. It does, because the gate cookie was just set on
  the 303 response.

**Local dev.** Vite doesn't run the middleware. Add SPA route `/pro/:token`
(`CreatorClaimDev.jsx`), which exists only for local development:

1. Read or create a device id in `localStorage` (`snm.creator.devDevice`).
2. POST `/api/creator/claim` directly through `api.js`.
3. On `{tokenHash}`, `navigate('/pro/prihlaseni#t=' + tokenHash)`.

In production the middleware answers `/pro/<code>` first and the backend refuses
secretless calls, so this page is unreachable there. On a non-ok response it shows the
same invalid/blocked texts.

### 5. Frontend

- **`App.jsx`**: register `/pro/prihlaseni` → `CreatorSignIn` and `/pro/:token` →
  `CreatorClaimDev`, both outside `Layout` and outside `ProtectedRoute`. Declare
  `/pro/prihlaseni` first.
- **`pages/CreatorSignIn.jsx`**: implements the Flow above, with a loading spinner.
  - On a `verifyOtp` error, show: *"Odkaz se nepodařilo otevřít. Otevři prosím znovu
    odkaz ze zprávy."*
  - Always strip the fragment before doing anything else.
  - Sign out first, so a previously signed-in account on that browser can't leak state
    into the creator session (Chunk 7 class of bug).
- **`AuthContext.jsx`**: expose `isCreator: Boolean(profile?.isCreator)`.
- **`Layout.jsx`**:
  - When `isCreator`, render a small tag "Náhled pro tvůrce" next to the nav brand. Use
    the existing `badge` class and tokens only, with no new colours.
  - The trial pill already hides because `trialDaysLeft` is 0. Confirm it.
- **Onboarding paywall skip** (`pages/onboarding/OnboardingFlow.jsx`): when `isCreator` and
  the current step id is one of `hodnota`, `cesta`, `plan`, `zkusebni`, `platba` or `ucet`,
  `<Navigate to="/dotaznik" replace />`. Creators can still retake the quiz itself.
- **`pages/SubscriptionExpired.jsx`**: when `profile?.isCreator` (revoked), render only:
  - *"Náhled pro tvůrce byl ukončen. Pokud jde o omyl, napiš nám na info@stredninamiru.cz."*
  - a sign-out button.

  No plans or prices.
- **`ProtectedRoute.jsx`**: no change. The revoked case already lands on `/predplatne`.
- **`pages/Settings.jsx`**: when `isCreator`:
  - show the badge "Tvůrce" where the "Vývojář"/"Beta tester" badge is (line ~1043);
  - hide the plan, cancel and withdraw blocks;
  - hide email change, password change and **account deletion**. The account is
    founder-managed demo data; deleting it would orphan the link.

  Theme and palette settings stay.
- **Beta UI**: `BetaTools`, `BetaTracking` and the feedback inbox gate on `isTester`, so
  creators get none of them. Only confirm it; change nothing.
- **`pages/Admin.jsx`**: add a "Tvůrci" tab. The admin page currently has fixed beta tabs;
  add this one alongside and load it from `/api/admin/creators`.
  - Form: Jméno (required) and Poznámka (e.g. @handle) → "Vytvořit odkaz". Show the
    returned URL once, in a read-only input with a "Kopírovat" button (clipboard API) and
    the line *"Odkaz se zobrazí jen teď. Když ho ztratíš, vytvoř nový."*
  - Table columns: Jméno, Poznámka, Vytvořeno, Naposledy otevřeno, Naposledy aktivní,
    Otevření, Zařízení (`n/max`, with user agents in a `title` tooltip), Odmítnutá
    zařízení, Stav (Aktivní/Zrušeno).
  - Row actions: "Nový odkaz" (confirm(), then show the URL the same way), "Resetovat
    zařízení" (confirm()), "Zrušit" / "Obnovit".
  - Add `api.js` helpers next to the existing admin ones.

### 6. Stats exclusion

`lib/betaAdmin.js` already loads users with `.eq('subscription_status','beta')` (around
line 68), so creators are excluded automatically.

- Grep `lib/betaAdmin.js`, `lib/betaAdminRoutes.js` and any admin revisit/retention query
  (commit d80d611) for user, run, favourite or event queries **not** filtered to beta
  users.
- Where one exists, exclude user ids whose status is `creator`.
- If none exist, record that in the PR description.

### 7. Env and docs

- **Railway**: `CREATOR_CLAIM_SECRET` (32+ random characters) and `CREATOR_LINK_BASE`
  (optional).
- **Vercel** (frontend project, NOT `VITE_`-prefixed): the same `CREATOR_CLAIM_SECRET`.
- Add both to `.env.example` and `frontend/.env.example` with one-line comments.
- **`CLAUDE.md` and `AGENTS.md`**:
  - add `'creator'` to the `subscription_status` list;
  - add one line on creator links;
  - add the two tables to the schema table.
- **`UNFORGET.md`**: one line noting that filming/affiliate tracking for creators is
  deferred (founder: "later").

## Tests — `tests/creator-links.test.cjs`

Use the same style as `tests/server-boundaries.test.cjs` (look at how it fakes `db`/Supabase).

1. Claim without the secret header → 403 when the secret is set; → 403 in production
   when it is unset.
2. Claim with an unknown token → 404, and no `generateLink` call.
3. RPC returns `blocked` → 409. RPC returns `ok` → 200 with `tokenHash`.
4. `accessStateFor` for a `creator` profile:
   - an active link → access;
   - a revoked link → 403 `CREATOR_REVOKED`;
   - no link row → 403.
5. `POST /api/checkout` as a creator → 403.
6. The `CREATOR_DEMO_ANSWERS` template passes `validateOnboardingAnswers` and
   `isScoreable(translateOnboardingAnswers(...))`.
7. Every admin creator route without an admin email → 403.

Run `npm test` at the root, then `npm run lint` and `npm run build` in `frontend/`.

## Manual verification (localhost; the implementer does this, not the founder)

Prerequisites: the migration is applied to a **non-production** database, or test against
local only.

1. Sign in as an admin email at `/admin`, open the Tvůrci tab and create "Test tvůrce".
   Copy the URL and swap the host for `localhost:5173`.
2. Open the URL in a fresh browser profile. Expected:
   - it lands on `/dotaznik` with top-10 results;
   - the nav shows "Náhled pro tvůrce";
   - there is no trial pill, no feedback button and no beta prompts;
   - `/ulozene` has 3 schools.
3. Visit `/onboarding/plan`. It redirects to `/dotaznik`.
4. Settings shows "Tvůrce", with no delete, password or plan blocks.
5. Open the link in a second profile (OK), then a third (blocked text). Admin shows 2
   devices and 1 refused.
6. Reset devices, then the third profile works.
7. Revoke. On the next navigation the creator sees the "Náhled byl ukončen" page. Restore,
   reopen the link, and the same data is back.
8. Rotate. The old URL gives the invalid response and the new one works on an already
   approved device.
9. Check the network tab: no request to Stripe, and the `/pro/...` code never appears in a
   Referer.

The production middleware path (HttpOnly cookie, 303, gate cookie) can only be verified on
a Vercel preview with both env vars set. Do that before merging.

## Push rules

This touches auth, access rules and the database, so it is **not** a small change.

- Commit on a branch and **do not push to `main`**.
- Hand the founder:
  1. the migration and its verify query;
  2. the two env vars (Railway + Vercel);
  3. localhost steps 1–8 above.
- Push only after the founder confirms.

## Known limits (accepted)

- A creator can still screen-record the app or hand over a whole unlocked device. No link
  scheme prevents that; the 2-device cap plus per-creator revoke bounds the damage, and
  every link is traceable to one named creator.
- A determined creator could copy their HttpOnly device cookie out of devtools and send it
  along with the link. That still counts as one of their two devices, and the founder sees
  `last_seen` and user agents in admin.
- The gate cookie a creator receives is the same shared tester cookie, so it outlives a
  revoke. It only opens the landing, login and signup, which are already reachable with
  the public beta code. The gate is a distribution barrier, not security (see CLAUDE.md).

## Out of scope

- Filming mode, affiliate codes and commission tracking (founder: later).
- Link expiry.
- Self-service device approval.
