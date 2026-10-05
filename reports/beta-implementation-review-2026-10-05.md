# Plan 019 — implementation handoff for Claude Code review

Date: 2026-10-05. Repository: `school-app`, branch `main`.
Implementation revision to review: `1c58bf9` (last code commit: `02067ad`).
Status: **partial implementation, not ready to launch**. Build-order steps 2–9
were implemented and pushed. Work stopped before step 10 on a specification/data
conflict, as the founder explicitly required. No independent review has run yet.

## Copy-paste review request

> Review the plan 019 implementation described in
> `reports/beta-implementation-review-2026-10-05.md` independently. Read AGENTS.md,
> the approved plan, plan 016 and beta_testing_logic first; read the design/UI
> rules before reviewing frontend behavior. Follow AGENTS.md's model gate for a
> Claude review (Opus 5.5 low; raise effort only if the task warrants it).
>
> Review steps 2–9 for correctness, privacy, security, migration safety,
> regressions, accessibility and fidelity to the approved decisions. Inspect the
> actual code and SQL rather than treating this report as proof. Run the root
> tests, frontend lint/build, and any safe local checks needed to substantiate
> findings. Never read or print .env. Do not apply SQL to production, create live
> testers, send email, call Stripe or spend OpenRouter credits for this review.
>
> Report findings first, ordered by severity, with concrete file:line references,
> impact, reproduction or reasoning, and a suggested fix. Separate confirmed
> defects from missing verification and the intentionally unfinished steps
> 10–12. Review the Matching conflict and say whether it actually requires a
> plan change, or whether the approved data model can support the requested
> metrics without misleading comparisons. Do not silently decide the founder's
> pending choice. This is a review request; do not implement fixes or resume the
> remaining steps without a further instruction.

## 1. Authoritative inputs and constraints

Read in this order:

1. `AGENTS.md` (same project rules as `CLAUDE.md`).
2. `plans/019-beta-feedback-and-analytics.md`. Section 2 decisions are approved;
   do not reopen them as product choices.
3. `plans/016-beta-testing-program.md` and `docs/beta_testing_logic.md`.
4. `design/DESIGN.md`, `docs/sources/claude_code_ui_ux_guide.md`, and
   `frontend/src/design/tokens.js` before UI review.
5. The newest plan 019 entry in `UNFORGET.md` for the stopped-work state.

Required invariants:

- Extend the existing `subscription_status = 'beta'` access model and original
  atomic `submit_beta_feedback` RPC. Confirmed email, rolling access and program
  cutoff remain mandatory. Ordinary paid/developer access cannot rescue beta.
- Testers must never reach a real Stripe call. They must be able to walk the
  five paywall screens with the beta payment replacement.
- Only beta visitors/accounts may send analytics. Ordinary users send zero
  events. No third-party analytics, new cookies or fingerprinting.
- Fixed event allowlist; server rejects unknown event names and props over 2 KB.
  No passwords, email or questionnaire answer/body point values in events.
- New tables have RLS and no browser policies; privileged writes remain on the
  server or the explicitly scoped AI generator scripts. Private screenshots use
  server-issued signed URLs.
- html2canvas is the only approved new direct dependency. Load it dynamically
  only for marked-place feedback; mask inputs, textareas and `[data-private]`;
  preview and removal precede upload/submission.
- Czech student copy uses tykání; parent copy uses vykání. Existing design
  tokens, ObKit, Modal, shared ui.css and named Lucide imports apply.
- Future admin authorization must use the separate server-only `ADMIN_EMAILS`.
  Admin charts must be plain SVG and each table must offer properly escaped CSV.
- The future Legal.jsx beta section must preserve DRAFT and all remaining
  `[DOPLNIT]` placeholders.

## 2. Exact commit scope

| Build step | Commit | Implemented change |
|---|---|---|
| 2 | `c378a06` | Delimited private beta analytics schema and Storage bucket |
| 3 | `43eab68` | OpenRouter usage/cost ledger in questionnaire and generators |
| 4 | `76aaa1e` | Beta-only queue, instrumentation, validation, event RPC/checklist |
| 5 | `743befd` | Required role and beta notice before signup |
| 6 | `210f1c0` | Six instruction screens, help entry and checklist |
| 7 | `fc376d2` | General, marked-place and editable-text feedback; masked capture |
| 8 | `0d22c11` | Six limited micro questions, warning and soft access gate |
| 9 | `02067ad` | Required closing questionnaire and private optional review |
| Handoff | `1c58bf9` | Plan status and stopped-work entry in UNFORGET |

Step 1 was already done in `8f375ee` and was not reimplemented.

**Concurrent work to exclude:** `a922587` changes questionnaire matching per obor,
its tests, and the simulation JSON/Markdown reports. It is not part of this beta
implementation. A raw `git diff 8f375ee..1c58bf9` includes it, so prefer inspecting
the explicit commits above. Read the scorer as current integration context, but
do not attribute that change to this implementation.

Useful commands:

```sh
git show c378a06
git show 43eab68
git show 76aaa1e
git show 743befd
git show 210f1c0
git show fc376d2
git show 0d22c11
git show 02067ad
git show 1c58bf9
```

Unrelated untracked root/report directories existed before this work. They were
not staged. Do not broadly add them or treat them as part of the review.

## 3. Implementation map

### Step 2 — SQL and compatibility

`supabase-setup.sql:797` starts the BETA ANALYTICS BLOCK; it ends at line 1130
at the review revision. Later steps extended this same block.

- New tables: `beta_events`, `beta_profile`, `beta_closing_answers`,
  `beta_reviews`, `ai_usage_log`; RLS enabled, no browser policies introduced.
- Extended `beta_feedback`: kind, marked-element metadata, screenshot path,
  before/after text, status, private note, tester-facing reply and source.
- Legacy feedback types are mapped; existing testers receive a profile with
  role `jine` and no notice timestamp, then complete the notice in-app.
- New beta signups require `beta_role` and `beta_notice_accepted` auth metadata;
  `capture_beta_profile()` creates the profile after public.users insertion.
- `submit_beta_feedback_details()` wraps the original renewal RPC and updates
  extended metadata in the same SQL transaction.
- Private `beta-screenshots` bucket permits PNG/JPEG up to 1,572,864 bytes.
- `purge_beta_events()` deletes raw events after ends_at plus six months. The
  backend calls it at startup and daily. Feedback/closing/reviews are retained.
- `record_beta_events()` joins eligible anonymous history, writes the batch and
  updates checklist state under locks. `core_completed_at` supports closing
  timing. Micro and closing functions are detailed below.

**Not verified:** SQL execution, idempotent reapplication, live trigger/RPC
behavior, role permissions and concurrent transactions in real PostgreSQL.
No migration was applied to Supabase. Local backend logs reported missing beta
RPCs; live beta testing is therefore unavailable, rather than completed.

### Step 3 — AI usage

- `lib/aiUsage.js`: wraps OpenRouter HTTP calls, reads usage from a cloned JSON
  response and writes token counts, returned cost, status and a safe error.
  Unknown usage/cost stays null; ledger failures do not break scoring.
- `lib/questionnaire.js`: forwards an outcome callback for the explanation call.
- `server.js:2372`: logs with user/model, then associates the saved run_id and
  marks an unusable questionnaire explanation outcome unsuccessful.
- Both OpenRouter paths in `scripts/extract-school-details.js` and the call in
  `scripts/generate-school-proscons.js` use the wrapper. Google paths are unchanged.

No real generator or paid OpenRouter request was run for verification.

### Step 4 — beta tracking

- `frontend/src/lib/betaTrack.js`: injectable tracker, local anonymous invitation
  state with 24-hour expiry, session ID, queue capped at 40 events, 10-second
  flush and hidden-page sendBeacon. A resolved ordinary account clears/disables
  its beta context. Normal visitors do not create tracker storage in the unit test.
- `BetaTracking.jsx` binds auth/profile state, navigation/visibility timing,
  session/device/theme data, sanitized error categories and rage clicks.
- Instrumentation is in `api.js`, `searchPrefs.js`, Search, SchoolDetail,
  SchoolActions, Questionnaire, Matice, OnboardingFlow and Reveal.
- `lib/betaAnalytics.js`: allowlist/per-event keys, size check, token-route
  redaction, error categorization and private field stripping.
- `server.js:457` issues an HMAC-signed invitation ticket for a valid active
  school invitation and anonymous UUID. `POST /api/beta/events` verifies the
  ticket or confirmed beta account; a normal authenticated account is rejected.
  Anonymous history joins only when ticket school matches tester school.
- Search text survives only when it is a known school-name substring. Other
  query text is removed; query length/results remain available.

### Steps 5–6 — enrollment and instruction flow

- `BetaEnrollment.jsx` and `lib/betaEnrollment.js`: required role choices and
  notice acknowledgment; code-bound enrollment state in sessionStorage for 24h.
- BetaLanding, SignUp and AuthContext pass/validate the metadata without changing
  access grants. Direct beta signup also presents the required fields.
- `BetaInstructions.jsx`: six screens, automatically ticked task checklist and
  a CSS three-step feedback demonstration with reduced-motion support.
- BetaTools adds a persistent `?` help entry, fetches own beta state every 15s,
  and acknowledges guidance separately from renewal.

### Step 7 — feedback

- `BetaFeedbackSheet.jsx` uses Modal with three modes and kind chips. Drafts,
  busy/errors, successful expiry display and own status/reply list are included.
- Marked mode supports pointer selection and a keyboard-accessible element
  chooser; stores structural selector, public text, rect and viewport.
- Text mode edits a selected leaf in place, saves before/after and restores the
  actual page content on save/cancel/cleanup.
- `betaCapture.js` dynamically imports html2canvas after the explicit capture
  action in marked mode. It masks the cloned DOM, excludes beta tools, captures
  the visible viewport, produces JPEG, and enforces the size limit.
- The preview has an “Odebrat snímek” action. Upload occurs only on submission.
  `api.js` requests a signed URL, PUTs the blob and submits the private path.
- `POST /api/beta/feedback/screenshot-url` checks tester, active program, MIME
  and size, then issues an owner/UUID path. Feedback submission checks path
  ownership and Storage object MIME/size before calling the details RPC.
- `feedbackDetails()` ignores caller source/status/admin fields. Legacy feedback
  bodies without kind still use the original RPC.
- Layout account email and Settings account name/email gained `[data-private]`.

### Step 8 — micro questions and gate

- `BetaMicroQuestions.jsx`: six triggers from persisted checklist, bottom card,
  skippable, optional explanation, rating/text/yes-no answers and renewal status.
- `submit_beta_micro()` serializes a claim/answer/skip per tester. The JSON state
  enforces one question per session and one claim per question. Skip consumes
  the opportunity but does not renew. A real answer calls the original renewal
  transaction through the details wrapper with source `micro`.
- BetaTools renders the warning in the last 12h of effective access.
- `BetaSoftGate.jsx` replaces BetaPaused's old feedback-button-only entry with a
  rotating question and a 20-character minimum. `POST /api/beta/gate` writes
  source `gate` through the same atomic renewal wrapper.
- No new suspension/account status or alternative payment access model was added.

### Step 9 — closing and optional review

- `BetaClosingQuestionnaire.jsx`: four required screens plus a separate optional
  review screen; role prefilled, NPS/helpfulness/features, four price amounts,
  payer/plan, token-based previews of all four actual palettes, future/change
  text and four feature ratings. Publication checkbox starts unticked.
- `lib/betaClosing.js`: timing reference and validated/allowlisted payload. The
  server derives anonymous review labels and age category. Grade 8 is under15,
  grade 9 unknown; parent/teacher adult. No exact date of birth is collected.
- `beta_closing_deadline()`: core features plus signup day two, or two days
  before program cutoff; a newly registered tester's deadline cannot precede
  signup. `sync_beta_closing()` persists an eligible deadline.
- `closingStateFor()` is used by `/api/me` and shared API entitlement checks.
  A due questionnaire blocks access after 24 hours; failures fail closed.
- `has_access()` is redefined inside the analytics block with the same closing
  deadline condition to cover direct RLS-protected favorites operations.
- `submit_beta_closing()` atomically stores answers, optional private review and
  completion time. It does not publish reviews or call Stripe. It does not
  renew the rolling feedback deadline; an expired rolling window still needs
  feedback after closing completion.

## 4. API additions/changes

| Endpoint | Access/behavior |
|---|---|
| GET /api/beta/schools/:code | Existing invitation lookup plus signed anon ticket |
| POST /api/beta/events | Confirmed beta token or signed active invitation; batch validation |
| GET /api/beta/me | Confirmed beta; own profile/checklist/micro state/status/replies |
| POST /api/beta/profile | Confirmed beta; role/notice update only while timestamp is null |
| POST /api/beta/feedback | Existing auth/limiter; original or extended atomic feedback RPC |
| POST /api/beta/feedback/screenshot-url | Confirmed beta plus active program and image validation |
| POST /api/beta/micro | Confirmed beta; claim, answer or skip through dedicated atomic RPC |
| POST /api/beta/gate | Confirmed beta; at least 20 chars, source gate |
| POST /api/beta/closing | Confirmed beta; validated required answers and optional private review |

Beta access state from `/api/me` now also supplies closingDueAt, closingDoneAt
and closingPaused. New beta routes can be used while rolling access is expired
so feedback/closing can restore the appropriate condition. Program cutoff is
still checked by the write RPCs.

## 5. Verification performed and its limits

Historical implementation checks, not a new independent review:

- Root `npm test` and frontend `npm run lint` passed after each completed step.
- Last root result: **97 tests passed, zero failures**.
- Last lint: **zero errors, eight existing warnings**.
- Frontend `npm run build` passed. html2canvas was emitted as a separate dynamic
  chunk (~199 kB). Vite retains its existing large-main-chunk warning.
- Focused tests cover allowlist/props/private stripping, signed ticket validity,
  unique-school/five-paywall checklist rules, ordinary users sending zero events,
  server rejection of normal accounts, feedback metadata ownership, AI usage and
  failure logging, closing timing/payload and micro/gate handler arguments.
- Existing Stripe boundary tests continued to pass: beta checkout rejection,
  stale webhook avoidance, scheduler exclusion and beta access precedence.

**Test limitations:** the server-boundaries harness executes registered handlers
with mocked Supabase/Stripe responses. It does not execute SQL transactions,
Storage or a real signup. Closing timing tests exercise the JS reference helper,
not the SQL function. Micro/gate tests prove handler routing/arguments, not actual
renewal or locking. The simulation determinism test requested by section 11 has
not been added. No admin guard/CSV tests exist because admin is not implemented.

Browser checks performed in Chrome:

- Actual school search loaded with the existing database; no console errors at
  that initial check.
- At 390 × 844: enrollment role/notice layout, including parent role selection.
- Temporary isolated preview: instruction screens/checklist/feedback animation.
- Temporary isolated feedback preview: choose marked heading, prepare screenshot,
  inspect masking of an input and `[data-private]` email, remove screenshot,
  edit a heading, save and verify original DOM text restored while before/after
  appears in the sheet. Preview was not submitted to the real API.

Temporary `frontend/beta-preview.html` was removed and never committed. Owned
development servers were stopped and the temporary viewport override reset.
The user's existing dev server was not stopped. HMR logged transient context/
circular-initialization errors during edits; a final whole-app cold-load browser
pass has not run, even though the production build passed.

**Not performed:** actual fresh tester registration/login, email confirmation,
signed Storage upload/read, SQL renewal, all five paywalls end to end, micro/gate/
closing/review interaction end to end, desktop flow, admin with seed data or the
final privacy grep. Do not describe the required full browser verification as done.

## 6. Review priorities and open checks

These are review targets, not confirmed defects or a substitute for independent
findings:

1. **SQL first:** idempotency, trigger metadata requirements and migration of
   existing testers; function grants/search_path, absence of client policies,
   atomicity and common user/profile lock ordering; concurrent event/micro/
   feedback/closing requests; rollback and repeated submissions.
2. **Access consistency:** API vs RLS cutoff/closing timing, exact boundaries,
   settings/profile outages, legacy core checklist without timestamp, recently
   registered testers near cutoff, closing plus expired rolling access. Compare
   the JS test reference to the actual SQL implementation.
3. **Tracking identity races:** login/logout/account switch while a flush is in
   flight, failure requeue after identity changes, anonymous join timing, Strict
   Mode, storage unavailable, token refresh and Beacon rejection. The current
   normal-user test does not cover every asynchronous identity transition.
4. **Privacy completeness:** event names/keys and byte limits in JS and SQL,
   browser-only vs server-only sanitization, paths/selectors/error leakage,
   whether every account/private display in real pages has adequate masking,
   known-school search matching and retention behavior when settings change.
5. **Screenshots:** masking real inputs/textareas/private containers, large/long
   pages, scrolling/rect alignment, third-party images, mobile selection,
   MIME/size metadata from the installed Storage SDK, upload success followed
   by feedback failure, retries/orphans and cancellation during capture/upload.
   Check the explicit prepare-preview-send interaction against the approved copy.
6. **Micro questions:** actual eligibility and persisted session limits, retries,
   skip vs answer, shared feedback limiter consumption, Strict Mode remounts,
   whether a claimed question can vanish before display, modal/closing conflicts.
7. **Frontend state/accessibility:** failed beta fetch/retry UX, guidance notice
   enforcement, draft loss on profile refresh or modal remount, stale-user async
   outcomes, focus restoration/edit cleanup, touch/keyboard/reduced motion,
   banners and both student/parent voices on actual pages.
8. **AI outcomes:** missing usage, HTTP failures, malformed/semantically unusable
   successful payloads, response parsing failures in both generator paths,
   association to saved run and ledger DB failure. Ledger success is not proof
   that a usable AI result was produced.
9. **Regression protection:** tester payment entry points, parent payment links,
   stale Stripe objects, non-beta analytics and ordinary users' access/signup.
   Existing boundary tests are useful but do not replace the final browser run.

## 7. Stopping conflict and unfinished scope

Plan section 6 specifies only top 10 school IDs/ranks in `result_view`. Section 9
asks for per-school average rank, spread, top/bottom frequency and simulation vs
real testers. Current `requestMatches()` slices to REASON_COUNT before saving
the standalone run. The onboarding persistence endpoint stores translated
standalone-scorer answers; those cannot faithfully reconstruct the original
onboarding scorer's full ranking. A conditional top-10 mean is not comparable
to the simulation's full-population mean, and unseen schools' bottom ranks are
unknown.

The founder was asked to choose between:

- Extending the plan with privacy-preserving full-ranking aggregate statistics
  from both scorers, without saving answer values or Cermat points in events.
- Limiting real analytics to observed top-10 statistics, explicitly marking
  missing metrics and avoiding the misleading mean-rank comparison.

**No answer has been received at this report revision.** Do not infer approval
from the founder's request for this review report.

Still unimplemented:

- Step 10: `/admin`, its nine tabs/charts/tables, server `requireAdmin`,
  `ADMIN_EMAILS` documentation, replies/moderation/signed screenshot viewing,
  newest simulation loading, aggregation and CSV exports.
- Step 11: Legal.jsx “Beta testování” privacy section. DRAFT/placeholders were
  not changed. This missing section alone prevents treating the partial feature
  as ready for rollout.
- Step 12: full fresh-tester flow at phone and desktop widths; seeded admin;
  final no-Stripe/no-normal-events/privacy checks; remaining focused tests.
- Independent review and fixes arising from it.

## 8. Deployment prerequisites and SQL reminder

Before deploying/running the new backend against the target Supabase database,
**the founder must paste the entire `supabase-setup.sql` into the Supabase SQL
editor**, including both the existing beta block and the new analytics block.
Do not apply only a copied fragment. This has not been done during implementation.
SQL should be independently reviewed and the remaining required work completed
before rollout.

Plan section 5 verification query (expected result: **5**):

```sql
select count(*) from information_schema.tables
where table_name in (
  'beta_events','beta_profile','beta_closing_answers',
  'beta_reviews','ai_usage_log'
);
```

That count alone does not verify functions, grants, policies, trigger behavior or
Storage settings; review/check those separately in an isolated environment.

Existing plan 016 prerequisites also remain: real ends_at, school codes and
working outgoing confirmation email. ADMIN_EMAILS local/production configuration
belongs to unfinished step 10. Lawyer review is needed before the first public
use of an under-15 review. No review publication feature exists in this partial
implementation and none of the beta reviews are automatically public.
