# 016 — School beta testing program

**Status:** Planned; implementation has not started. Continue with GPT-6 Sol xhigh after the planning handoff is accepted. Independent review: GPT-6 Sol high; escalate payment/schema/security findings to GPT-6 Astra high.

**Source:** `docs/beta_testing_logic.md`. User requested implementation on 2026-09-26 and confirmed GPT-6 Astra high for planning. **Email verification remains required for testers**, explicitly confirmed by the user. The program end date and external feedback form URL were explicitly deferred and are recorded at the top of `UNFORGET.md`. Their absence must not block implementation: leave enrollment and renewal disabled until a future end date is configured; omit the external link until supplied.

## 1. Current behavior and scope

- `server.js` already has a shared `BETA_ACCESS_CODE` redemption endpoint, and `subscription_status = 'beta'` grants permanent API access through `hasPaidStatus` / `paidAccessActive`. The redemption endpoint unconditionally updates the status despite its comment claiming to preserve paying users. Replace this path; leaving it in place would bypass the requested renewal rules.
- `supabase-setup.sql` permits `beta`, but `has_access(uid)` currently does not recognize it. Its early status constraint also excludes beta before a later block includes it, so rerunning against existing beta rows is unsafe. Consolidate the status constraint when changing this section.
- `handle_new_user()` creates the public profile at auth signup, before email confirmation, with a three-day trial. `requireAuth` always rejects unconfirmed email. Keep that rule.
- `AuthContext.signUp` already handles CAPTCHA, duplicate accounts and confirmation. The onboarding answer stash actually uses **localStorage**, with an email binding, to bridge confirmation tabs. The beta invitation code can use **sessionStorage** as the spec requests because durable school attribution will already be in the account created by the database trigger.
- `requireAccess` protects questionnaire, favorites, picks and share creation. School browsing, details, comparison and some account-data management routes are currently public or only require authentication. Preserve those boundaries; this task does not put a new paywall on public school data.
- The frontend has two real checkout callers: `Platba.submit` and `SubscriptionExpired.handleSubscribe`. `PAYMENTS_MOCKED` is display copy, not a working charge guard.
- `frontend/middleware.js` gates the entire Vercel site behind `SITE_ACCESS_KEY`. A plain school invitation currently cannot reach the SPA. Integrate invitations with this gate.
- Existing work in `frontend/package.json`, its lockfile, `frontend/src/App.jsx`, `frontend/src/pages/landing2/`, and untracked reports/routing notes belongs to other work. Recheck the live working tree before every edit/commit and preserve it. `App.jsx` changed during planning; add beta routes/providers around the current tree, not an older snapshot.

Use the existing design system and onboarding visual language as the source spec explicitly requests: `design/DESIGN.md`, existing tokens, `ObKit`, `Modal`, and `styles/ui.css`. Do not introduce fonts, icons, animations, a UI dependency, screenshots, dashboards or form webhooks.

## 2. Resolved implementation choices

1. **Reuse `subscription_status = 'beta'` as the authoritative tester marker.** Do not add a second mutable `is_tester` flag. Return derived `isTester` from `/api/me`; use it in UI. A tester is evaluated before trial, paid access, or developer-email fallback.
2. **Enroll only when a new auth account is created.** A validated school code is sent as `beta_school_code` in signup metadata. The database trigger validates it again and atomically creates the tester profile. No client-controlled dates/status, delayed browser enrollment, or conversion of an existing paying/developer account. Existing-account errors continue to use current duplicate-signup behavior.
3. **One small database settings row is the program configuration.** Use `beta_program_settings` with `singleton boolean primary key default true check (singleton)`, nullable `ends_at timestamptz`, `access_hours integer not null default 48 check (access_hours between 1 and 168)`, and nullable `feedback_form_url text`. `ends_at` is the spec's `BETA_PROGRAM_ENDS_AT`. Keeping it in the database lets signup, atomic renewal, RLS and the API consult the same cutoff, without divergent JavaScript/SQL constants. Do not add an admin UI or a second environment-variable authority. Missing/null/past cutoff disables enrollment, renewal and tester access; it does not break ordinary accounts.
4. **The rolling deadline is creation/submission time plus the configured hours.** It is not additive. Effective access ends at the earlier of that deadline and the program cutoff. At exact equality the account is expired. A trial timestamp or old paid timestamp cannot override a beta denial.
5. **Only accepted in-app feedback renews.** No renewal on sign-in, guidance, code validation, preview completion, profile refresh, or external-form navigation. After the program ends, reject renewal submissions and show an ended-program message.
6. **Preserve unattributed legacy testers honestly.** Existing `beta` accounts get a rolling deadline once, if missing, with nullable school attribution. Do not invent a school or assign them to a new school's code. New tester signups always have a valid school code. Redeeming the old code returns 410 and cannot change access.
7. **Billing remains inaccessible even when beta access expires.** A tester never becomes a normal expired-trial buyer. Normal payment/profile state must be resolved before showing a real payment action.

## 3. Database implementation

Edit canonical `supabase-setup.sql`, using a clearly delimited, self-contained beta migration block that can also be copied to the Supabase SQL editor for an existing installation. Document the block boundaries in the runbook; do not maintain a second divergent SQL schema file.

### Tables and columns

- `beta_schools`: `code text primary key`, `school_name text not null`, `created_at timestamptz not null default now()`. Codes are uppercase ASCII, 3–32 characters, matching `^[A-Z0-9][A-Z0-9_-]{2,31}$`; names are trimmed, 1–160 characters.
- `beta_program_settings`: the singleton described above, seeded with `ends_at = null`, `access_hours = 48`, `feedback_form_url = null` using `ON CONFLICT DO NOTHING`. Reapplying the schema must never overwrite configured settings. Validate a configured form as an absolute HTTPS URL in the API before exposing it.
- Add nullable `users.tester_school_code` referencing `beta_schools(code)`, `tester_access_until timestamptz`, and `tester_guidance_seen_at timestamptz` using `ADD COLUMN IF NOT EXISTS`.
- `beta_feedback`: identity primary key; `user_id uuid not null references auth.users(id) on delete cascade`; nullable `school_code` FK for historical unattributed testers only; `type text` constrained to `bug/idea/comment`; `page_url text`; `message text`; `created_at timestamptz default now()`. Message must be trimmed and 10–4000 characters. Path must start with one `/`, have at most 512 characters, and contain no query, fragment, scheme or control characters. Add an index on `(user_id, created_at desc)` for per-account queries and cascading deletion.
- Enable RLS on every new table, with no anon/authenticated table policies. The server reads/writes through service_role. No client UPDATE on the public users profile; leave `PATCH /api/me`'s existing allowlist intact.

### Signup trigger

- Update `handle_new_user()` after the required tables/columns exist. Missing beta metadata uses the current normal signup path without changes.
- Supplied beta metadata must be a nonempty string, normalized and validated against `beta_schools`. Read the settings row and require a future cutoff. Reject invalid/closed beta signup rather than silently creating a billable normal account.
- For valid beta signup, insert status `beta`, the verified code and `tester_access_until = database time + access_hours`. Set `trial_expires_at` to creation time for beta accounts, so an accidental normal trial check cannot extend them. Leave guidance timestamp null. Ignore any client metadata proposing a role, deadline, guidance timestamp or paid status.
- Confirmation is still required before any authenticated API operation. A confirmation opened days later may lead to the paused-access page; the 48-hour clock starts at creation, as specified.

### Access and feedback transaction

- Update `has_access(uid)` with a **CASE**: beta requires both rolling deadline and singleton cutoff in the future (and a verified auth email); non-beta retains the existing trial/developer/paid logic. Never OR the normal trial branch around beta expiry.
- Add `submit_beta_feedback(p_user_id uuid, p_type text, p_page_url text, p_message text)`, a `SECURITY DEFINER` function with a fixed search path and fully qualified table references. Revoke execution from PUBLIC, anon and authenticated; grant only service_role.
- Within the function, lock the user's row, confirm `beta` status and verified email, read current settings, then take the current database time **after acquiring the lock**. Validate all inputs again and require a future cutoff. Derive school attribution from the locked profile, never a request field. Insert feedback and set the rolling deadline to that time plus `access_hours` in the same transaction. Return feedback id and new deadline. Any insert/update failure rolls back both changes; serialize concurrent submissions through the row lock. Never accept a caller-supplied current time or deadline.
- Guidance acknowledgement is an idempotent conditional profile update (`tester_guidance_seen_at IS NULL`), not feedback and not a renewal.

### Existing installation safety

- Before migrating legacy beta rows, check for beta profiles with any Stripe customer/subscription/payment-method/setup-intent identifier or scheduled charge. Report counts, not personal data. If present, stop that migration and inspect the affected billing state; do not erase billing identifiers or silently cancel charges. The old redemption endpoint could have converted a paid user. Resolve any active billing before calling those accounts safe testers.
- Backfill missing legacy beta deadlines once, with `WHERE subscription_status = 'beta' AND tester_access_until IS NULL`. Rerunning must not renew existing testers. The unset program cutoff still denies access.
- Ensure all status-check definitions permit `beta` from the first applicable block, instead of temporarily narrowing the constraint.
- Preserve full-script fresh-install order. The existing `ALTER school_reviews/review_reports ADD moderation_reason/reason` appears before those tables are created; move those two additive alterations below the table declarations if needed to execute the canonical schema on an empty test database. No broader schema rewrite.

## 4. Backend and API changes (`server.js`)

Keep routes flat in the existing file. Add only small local helpers for reading beta settings and evaluating beta access, reused by `requireAccess` and `/api/me`.

| Route | Auth | Behavior |
|---|---|---|
| `GET /api/beta/schools/:code` | Public | Validate/normalize code, fetch one school and settings. Unknown code: 404. Known code: school name/code, `programEndsAt`, `accessHours`, `programActive`, optional validated form URL. Known closed programs still return the school so existing testers can follow their invitation to log in. DB failure: 503, never falsely treat it as an invalid code. |
| `POST /api/beta/feedback` | `requireAuth`, per-user limiter | Validate body, call the transaction RPC once with `req.user.id`. No `requireAccess`, since expired testers must be able to renew. Return 201 with id/deadline. Non-tester: 403; closed program: 410; malformed data: 400; DB failure: 500. |
| `POST /api/beta/guidance-seen` | `requireAuth` | Require tester profile; set timestamp only if null. Return 204, including repeat acknowledgements. Do not alter access. |
| `POST /api/me/redeem-beta-code` | `requireAuth` | Return 410 with a link-invitation explanation. Remove `BETA_ACCESS_CODE` and its legacy limiter/grant logic. |

- Feedback limiter: key by authenticated user id, 10 submissions per hour, so students behind one school IP do not share this small quota. Keep the existing general API limiter.
- Expand `PROFILE_COLUMNS` and `/api/me` response with tester columns, `isTester`, `betaProgramEndsAt`, `betaAccessHours`, `betaProgramActive`, `betaFeedbackFormUrl`, `effectiveAccessUntil`, and `serverNow`. For beta, `subscribed` and `trialActive` are false, `trialDaysLeft` is zero, `canWithdraw` is false, and `hasAccess` is computed solely from both deadlines.
- In `requireAccess`, load the profile and handle beta **before** the developer email allowlist shortcut. Denied beta responses remain 402 but use `BETA_ACCESS_EXPIRED` or `BETA_PROGRAM_ENDED`, not `PAYMENT_REQUIRED`. Unconfigured settings deny beta access; errors never grant it. Preserve existing normal-account behavior.
- `/api/me` must not promote a beta profile to developer just because its email is allowlisted. Explicit beta status takes precedence.
- Remove beta from `hasPaidStatus` / permanent `paidAccessActive` logic.

### Enforce no Stripe charges

- In `/api/checkout`, fetch the authoritative billing profile, fail if it cannot be read, and reject status `beta` with 403 / `BETA_CHECKOUT_DISABLED` **before every Stripe call**, regardless of expiry, trial dates, cancellation flags, plan selection or missing Stripe configuration. Test both plans and missing/unreadable profiles.
- Guard both checkout-completed webhook branches against beta profiles before retrieving Stripe objects or scheduling billing. All webhook profile updates must exclude status `beta`, so later Stripe events cannot turn testers back into normal paid/trial profiles. Keep normal webhook retries/errors intact.
- `chargeDueSeasonPasses` already queries `trialing`, but retain an explicit defensive status check on the selected rows before creating a PaymentIntent and conditional non-beta writes. New tester accounts cannot have a previously issued checkout session because enrollment occurs only at signup; retiring later redemption removes the old conversion race.
- Do not block legitimate cancellation/withdrawal/deletion operations on normal accounts. Do not use live money during verification. Log any impossible legacy beta billing event for operator investigation without creating further charges.

## 5. Invitation, signup and prelaunch gate

- New `frontend/src/pages/BetaLanding.jsx`; register `/beta/:code` outside `Layout` in the current `App.jsx`. Use existing onboarding layout primitives. Show school name, a short explanation, 48-hour renewal rule, mandatory email confirmation, no-card/no-payment message and one signup CTA. Include loading, invalid code, unavailable backend and program closed/unconfigured states. Program dates/hours come from the API. No placeholder deadline or form URL.
- New `frontend/src/lib/pendingBetaCode.js`: normalize code, safely read/write/clear a sessionStorage invitation record (short expiry, e.g. 24 hours). URL is authoritative on entry; explicit invalid invitation must never fall back to an older stored code. Clear after successful signup and on sign-out. Storage is only navigation context, never access authority.
- `SignUp.jsx`: read `?beta=CODE`, validate against lookup, use beta-specific copy and CTA; block beta submission while lookup is unresolved or closed. Pass the validated code to `AuthContext.signUp`. Preserve CAPTCHA, consent, duplicate detection and all normal signup behavior. If trigger rejection follows a successful preflight, recheck invitation state and show an honest error; never retry as a normal signup.
- `AuthContext.signUp`: include only the optional normalized `beta_school_code` alongside existing metadata. For beta, confirmation redirect is `/beta/CODE?potvrzeno=1`; the database profile already carries attribution, so opening the email on a different device works. Do not depend on a sessionStorage stash to grant tester status after confirmation.
- Preserve beta context through `AuthTabs` links and `Login` resend-confirmation options. Extend `resendConfirmation` with an optional safe beta redirect; normal users retain the existing redirect. A duplicate normal account is not promoted by signing in with an invitation in the URL.
- On a confirmed beta landing, wait for auth/profile resolution before continuing to `/skoly` or `/predplatne`; show guidance from the global beta UI. A signed-in non-tester sees an explanation and an ordinary continue/sign-out choice, not a signup that changes their current account.
- `frontend/middleware.js`: after existing valid-key/cookie handling, recognize exactly `/beta/:code`. Validate the invitation against the trusted backend origin from deployment configuration (`VITE_API_BASE_URL`, with URL validation and no request-supplied host). On a known school, issue the existing HttpOnly/Secure/SameSite cookie and redirect to the same pathname/query. This works even after the program ends so confirmed testers can still manage their account. Unknown codes/unavailable backend get a small accessible invitation error page without granting the cookie. Use a bounded fetch timeout. Never send `SITE_ACCESS_KEY` to the backend or client JavaScript. Verify confirmation fragment/query survives this redirect in a real browser. Do not broadly exempt arbitrary paths from the site gate.
- Document the required Supabase auth redirect allowlist for `/beta/*` and the Vercel runtime API-origin setting. Keep `noindex` for invitation pages.

## 6. Frontend access state, feedback and guidance

### Authentication and expiry

- `api.js`: add lookup, feedback and guidance helpers. On a beta-specific 402, emit one scoped access-expiry notification carrying the session user id used for that request; do not change unrelated error handling.
- `AuthContext`: expose `isTester` and profile-loading/error state, derive client beta access from the server-issued effective deadline and server time, schedule refresh/invalidation at the deadline, and refresh on window focus/visible-tab return. Expired UI must become locked even before the next successful fetch. Guard against an old profile request resolving into a different signed-in user; clear stale profiles on identity changes. A failed profile request cannot display a real purchase action for an unknown tester.
- `ProtectedRoute`: retain `/predplatne` as the denial route and preserve intended pathname in state for post-feedback return. Its existing email-confirmation gate stays before access checks. A beta-specific 402 from an action on a public page should also lead to the beta paused state, without a full reload or losing the global feedback draft.

### One shared beta UI

- New `frontend/src/components/BetaTools.jsx`, mounted inside auth/toast providers **around the routes**, outside `Layout`. It owns the floating button, feedback `Modal`, first-login guidance and a small `useBetaFeedback` context for opening the same form from the paused page/settings. No second auth/session system.
- Render only for a resolved, verified tester; do not require active access. Hide first-login guidance during password recovery. Reset drafts and any in-flight display state when user identity changes.
- Guidance: show once when `tester_guidance_seen_at` is null, and acknowledge only after actually displaying it. Guard duplicate in-flight requests by user id. On failure retain the retryable unseen state; never renew access. Four concrete tasks: run `/dotaznik`, inspect/save/compare schools, inspect the safe paywall preview, leave feedback. Optional school-review wording must only invite a review of a school they actually know.
- Feedback form uses native type select (`bug`, `idea`, `comment`), labelled textarea with the same length limits as the server, and pathname captured at opening. Never attach query strings, full URLs, screenshots or user identity supplied by the browser. Preserve text on request failure, disable duplicate submit while pending, and clear only after accepted success.
- On success, immediately apply/refresh the authoritative deadline. If on the paused page, continue to the remembered safe internal destination or `/skoly`; elsewhere stay on the current page and confirm renewal. The optional external form uses the configured HTTPS URL, no automatic personal-data prefill, and explicit copy that it **does not renew access**. No URL means no dead link.
- After the hard cutoff, show that the program has ended and disable in-app submission/renewal. Account settings and deletion remain reachable. An external form link may remain available.
- Add `frontend/src/components/beta.css` (or one equivalently scoped stylesheet) using existing tokens. Reserve space for the floating button on mobile so it cannot cover `.ob-actions`, compare bars or other sticky actions; account for safe-area insets. Reuse native `Modal` focus/Escape behavior. Check light/dark and 390px/desktop.

### Paused and billing surfaces

- Add `frontend/src/pages/BetaExpired.jsx`, rendered from the `/predplatne` route's existing component after resolved auth/email checks and **before** mounting normal payment UI/hooks. It shows paused vs ended/configuration-unavailable copy, deadline, feedback CTA, settings/sign-out and no purchase controls.
- Isolate normal `usePostCheckoutVerification` inside the normal paywall child (or explicitly disable it for testers). A tester arriving with `?platba=ok` must not see “payment received” or a payment-verification loop.
- Remove legacy redemption forms/import/state from `Settings.jsx` and `SubscriptionExpired.jsx`. Settings shows beta status, effective deadline, feedback and a reusable guidance/help entry; trial/renew-plan controls do not appear for testers. Suppress `Layout`'s ordinary trial countdown for beta accounts.

## 7. Safe onboarding/paywall preview

- `OnboardingFlow.jsx`: for resolved testers reaching `hodnota/cesta/plan/zkusebni/platba`, present a short beta state: no payment needed, continue testing, or inspect payment screens. Use a query marker such as `?betaPreview=1` only for navigation intent; it grants nothing and is ignored for non-testers.
- For preview entry without a stored role, ask student/parent using existing role controls in this state before entering the preview. Avoid the normal role guard losing the requested preview step. Preserve preview intent centrally in `goTo`/`goToStep`, including back navigation. Skip `ucet` only during a verified tester preview.
- Save a verified tester's completed onboarding quiz at the actual transition from the final quiz question, using `saveOnboardingAnswers(cleanedAnswers)`. Detect completion via `STEPS[stepIndex].questionIndex` and `QUESTIONS.length`, not the presence of answers. The untouched state contains default answers, and sessionStorage may hold an old partial quiz. Save in an effect after that transition so the final question's same-event `setAnswer` (including skip) is reflected, bind pending work to the current user, and offer retry on failure. The endpoint's `already_saved` / `nothing_to_score` responses are terminal successes; it already guarantees one onboarding run per account. A direct preview must never trigger this save.
- When opting into preview, retain the five existing screens beneath a persistent banner explaining that displayed prices/trial terms are examples and do not apply to this beta account. Reuse the existing shared chrome/flow wrapper. No redesign of normal pricing.
- `CreateAccount.jsx`: verified tester accounts must not be asked to sign up again. Use a signed-in continue state if reached outside preview; completed quiz persistence is handled by the preceding transition. Do not save empty preview answers or overwrite an existing questionnaire default.
- `Platba.jsx`: require resolved authenticated profile before allowing real checkout. If tester, `submit` completes the preview locally before the `createCheckoutSession` call; CTA says “Dokončit ukázku bez placení”. Do not set paid status, create a checkout session, collect payment details or renew the clock. Keep a server rejection handler as defense against a stale normal profile.
- `Activated.jsx`: beta completion copy must say preview/testing, not purchase or renewed access. Provide a path back to schools and feedback. Check both student and parent preview routes and both plans.

## 8. Verification required during implementation

Use the existing `node:test`/VM handler harness in `tests/server-boundaries.test.cjs`, extending it to record the actual middleware chain, auth result, RPC calls and Stripe checkout calls. Do not add a testing framework. Preserve all existing test cases. Use synthetic data only and no real Stripe requests.

1. Active/expired/equal-boundary/invalid-deadline beta access; program cutoff wins over a future rolling deadline and future normal trial; missing config denies; beta beats developer allowlist. Normal trial/paid/developer behavior remains intact.
2. Verified new beta signup and attribution; invalid/closed invite abort; normal signup remains normal; spoofed metadata cannot choose dates/status; confirmation is mandatory; legacy migration reapplication does not renew.
3. Valid feedback while access is paused restores access; invalid/non-tester/unconfirmed submission fails; request user/school/deadline spoofing is ignored/rejected. Guidance and invite lookup never renew. Hard cutoff denies feedback.
4. Database integration in a disposable Postgres/Supabase test database: run the beta migration twice; verify service-only function grants/RLS; force the feedback insert or profile update to fail and prove neither write persists; submit concurrent feedback and verify no additive renewal. Do not claim JS mocks prove transaction atomicity. If no test DB is available, leave exact transaction-rollback SQL checks in the runbook and report that limit.
5. Both checkout plans for active/expired/ended testers create **zero Stripe checkout calls**; missing profile fails closed; stale checkout-completed events cannot schedule a tester charge; billing scheduler never creates a tester PaymentIntent. Normal billing boundary tests still pass.
6. Middleware validates only the configured backend, valid school links receive the gate cookie, invalid/error lookups do not, existing gate behavior still works, and query/confirmation fragment survive.

Commands after implementation:

```sh
node --test tests/server-boundaries.test.cjs
node --check server.js
npm --prefix frontend run lint
npm --prefix frontend run build
git diff --check
```

Run any new focused tests with their concrete filenames as well. Broaden testing only for a real uncovered interaction/failure. Start backend on local port 5001 and frontend on 5173 using the existing local configuration. Before starting the server, ensure verification cannot trigger real scheduled Stripe charges; use a separate process environment with Stripe disabled or test credentials and a test database.

Perform an actual browser pass at 390×844 and desktop: valid/invalid/disabled invitation, email confirmation in another tab/device context, first and repeat login, feedback success/error while expired, hard end, direct paywall URLs and both preview roles/plans, profile-loading failure, unknown-user/normal-account regression, no sticky-control overlap, keyboard dialog operation, and return from a hidden tab after expiry. Inspect network calls to prove no tester preview creates checkout. Browser mocks may cover timing and error states but are not live Supabase verification; label them accurately.

## 9. Documentation, rollout and completion

- Add `docs/beta_testing_operations.md`: how to run the canonical beta SQL block, preflight legacy accounts, set the singleton cutoff/window/form URL, insert school codes with parameterized SQL/literals, construct `/beta/CODE` links, query feedback by school/user, and configure the confirmation redirect allowlist/site gate. Include aggregate preflight queries and the disposable-database atomicity checks. No admin dashboard.
- Update `docs/beta_testing_logic.md` implementation status and the confirmed email-verification decision. Update `plans/README.md`, the relevant `UNFORGET.md` legacy beta entry and current status only as implementation/verification actually completes. Update shared architecture facts in **both** `AGENTS.md` and `CLAUDE.md` after code exists.
- Remove obsolete `BETA_ACCESS_CODE` instructions from `.env.example`. Document the authoritative database settings and existing trusted frontend API origin instead. Keep all real credentials/site keys out of commits and tool output.
- Schema/config deployment and enabling the real cohort are distinct: implement with cutoff null, apply the migration with the program disabled, deploy compatible server/frontend, then configure the user-provided deadline and school codes. Do not invent an end date or silently enable a live cohort. The external form URL remains a tracked pending input, not a dummy link.
- Commit and push coherent verified chunks on `main`, staging only owned changes. The planning chunk may contain this plan, the spec decision clarification and the deferred-input ledger; do not stage the concurrent landing work.
- Final delivery must distinguish code complete, checks run, database migration applied/not applied, program disabled pending the end date, and optional external form link still pending. Do not call the full feature ready for schools until schema/runtime checks and cutoff configuration are complete.
