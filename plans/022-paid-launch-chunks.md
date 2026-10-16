# 022 — Paid-launch work in small chunks (from the 14 Oct deployment review)

Source: `reports/deployment-review-2026-10-07/FINAL-RELEASE-CHECKLIST.md` and
`HANDOFF-PLAN.md`. This plan replaces "hand the whole HANDOFF-PLAN to an agent".
The beta ends 18 October 2026 23:59, so beta-only gates are dropped; the goal is
a safe **paid** launch.

## Rules for every chunk (give these to the agent each time)

- Do **one chunk per session**. Read `CLAUDE.md`/`AGENTS.md`, `git status` and
  `reports/deployment-review-2026-10-07/COORDINATION.md` first; never stage other
  agents' files.
- Never run SQL, migrations, scripts or tests against the production Supabase
  project or live Stripe. Write migrations as files under `supabase/` (or the
  existing migrations folder) plus the same change in `supabase-setup.sql`, with a
  one-line verify query. The founder applies them.
- Do not change prices (690/249 Kč), trial lengths, scoring weights, or any
  founder decision listed in the checklist's "Decisions to preserve".
- Do not push. Finish with: tests/lint/build output, and exact localhost steps
  for the founder. Push only after the founder approves (and after any migration
  is applied live).
- If the chunk turns out to need a decision not written here, stop and ask.

## Do NOT do (even though the review mentions it)

- Anything under C44 / design-export / logo / motion / canvas / historical
  paywall drafts, simulation baselines (C57), marketing assets, handouts.
- Re-running paid extraction or pros/cons, re-importing Cermat, or "fixing" school
  facts automatically (S10/S18 are founder/manual — see chunk 9).
- Re-applying any historical patch (`numeric-shape-guard-2026-10-13.patch`) or
  any fix the checklist lists as already done.
- Turning on live Stripe keys.

## Chunk 0 — founder decisions (no agent)

Answer before the related chunk starts:
1. Access matrix (chunk 3): confirm signed-in users **without** access may still
   do onboarding (it needs school data in the browser), and what the landing map
   may show anonymously (name, coordinates, type only?).
2. Existing ordinary accounts when the trial start moves (chunk 4): keep their
   current `trial_expires_at` as is? (Recommended: yes.)
3. Legal/operator items from the checklist's manual list (seller details, DPAs,
   minors/refund wording, day-2 reminder sender). Needed before chunk 2 ships.

## Chunk 1 — purchase ledger + checkout idempotency (P01, P02, P05)

Files: `server.js` (checkout + `/webhooks/stripe`), new migration +
`supabase-setup.sql`, `tests/`.
- Add a `purchases` table: user_id, plan, price/currency, status
  (`pending|active|canceled|withdrawn|refunded|failed`), Stripe checkout/setup/
  payment-intent/subscription ids, access window, created/completed timestamps.
  Service-role only (RLS on, no client policy).
- `/api/checkout` reuses an open pending checkout for the same account+plan
  instead of creating a second one.
- Webhooks: record processed `event.id` (unique) and ignore repeats; apply
  state only forward (an old event can't undo a newer state).
Acceptance: tests for double-click checkout, duplicate webhook, out-of-order
webhook (A/B/A), late completion of a replaced checkout.

## Chunk 2 — season charge, cancellation and refunds (P03, P06, P07, P08)

Files: scheduled season-charge worker in `server.js` (or its lib), withdrawal
route, migration.
- Claim each due charge atomically (`update … where status='pending' returning`)
  so two workers can't charge twice; persist cancel intent before calling Stripe.
- Use a stable Stripe idempotency key per purchase; store ambiguous attempts and
  reconcile before retrying.
- Separate decline / SCA required / temporary error; SCA gives the user a way to
  finish or cancel.
- Refund only the charge(s) linked to the withdrawn purchase; show pending vs done.
Acceptance: cancel before/during/after charge, timeout, decline, SCA, refund
failure + retry, unrelated recent charge not refunded.

## Chunk 3 — paid catalogue boundary (B01/B02, founder access decision)

Files: `server.js` (`/api/schools`, `/api/schools/:id`, `withMatchScores`),
`frontend/src/pages/landing2/Landing.jsx`, `lib/useSchoolCount.js`,
`OnboardingFlow.jsx`, `ProductScreens.jsx`.
- Anonymous `/api/schools` returns a **public projection** only (fields agreed in
  chunk 0). Full data requires `requireAccess` (plus the onboarding exception).
- Keep: landing map dots, the landing count, view-only detail from a map dot,
  onboarding scoring. `withMatchScores` must still run for signed-in users or
  every percentage disappears silently.
Acceptance: real HTTP tests for anonymous / signed-in no access / trial / paid /
expired / beta; browser check of landing, map-dot detail, onboarding, search.

## Chunk 4 — ordinary trial starts at first confirmed sign-in (C07)

Files: signup trigger + new function in migration, `requireAccess`/profile code,
`AuthContext.jsx` display only.
- Trigger stops setting `trial_expires_at`; a once-only server function sets it on
  the first confirmed authenticated request (`where trial_expires_at is null`).
- Existing accounts untouched (per chunk 0). Paid/beta/developer unaffected.
Acceptance: delayed confirmation still gets 3 full days; parallel first requests
set one window; later sign-ins/password reset don't extend it.

## Chunk 5 — application picks can't be lost (B03, C53)

Files: `server.js` picks routes (~line 1940), migration with a service-only RPC.
- One transaction per save: validate school IDs are visible and programmes belong
  to them, max 3, unique priorities, lock per user, replace visible picks; hidden
  picks are kept.
Acceptance: failed insert keeps the old list; two concurrent saves leave one valid
list; hidden school pick survives a save.

## Chunk 6 — explanation cache race (C21)

Files: `server.js` explain route, migration with a per-key `jsonb` merge RPC
(`extra_reasons = extra_reasons || jsonb_build_object(key, value)`), optional
in-memory "already generating" map keyed by run+school.
Acceptance: two schools generated in parallel both stay cached; same school twice
calls the AI once. Use `lazy-explanation-cache-boundaries-2026-10-14.cjs` as the
before-state.

## Chunk 7 — account switch doesn't leak state (C02, C16, C14)

Files: `AuthContext.jsx`, `api.js`, `usePicks.js`, `useDraft` and its callers.
- Bump an account revision synchronously on every auth change; responses from an
  older revision are dropped; drafts are keyed by user id.
Acceptance: A signs out, B signs in in the same tab, A's late response doesn't
appear for B; drafts of A not shown to B.

## Chunk 8 — account erasure completeness (C31, C46)

Files: `DELETE /api/me` in `server.js` (~line 953), contribution archive code.
- Page through all screenshots (not only the first 1000); if a retry switches to
  "delete contributions", remove any archive copy made by the failed first try.
Acceptance: >1000 objects, failure at each step then retry, no archive copy left
after a successful delete choice.

## Chunk 9 — school facts (founder/manual, not an agent batch)

School 132 (Prague tuition 199,100 Kč vs Ostrava data), school 89 old citation,
corrupted scrapes 168/195, schools 15/94 with no scraped text. Check official
pages, then correct those fields by hand or with a reviewed single-school run.

## Later / optional

Order summary + Checkout-completion anchoring + day-2 reminder + receipts (P04,
P09 — required before charging, schedule after chunk 2), geocoder provider
(C01), navigation focus trap (C25), comparison year labels (C03), admin stats
consent (C56), quick-feedback typed fields (C50/C51, only if beta returns).
