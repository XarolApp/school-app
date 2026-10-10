# UNFORGET

Single ledger for all deferred work on Střední na míru — paused plans, pending decisions,
audit findings, "come back to this later" items. See
`.claude/skills/unforget/SKILL.md` for the format and workflow this file follows.

**Every session must log new deferred work here, not in CLAUDE.md or DESIGN.md.**
Those files describe current architecture and locked-in decisions; this file is
the only place open questions and TODO-shaped items belong. See CLAUDE.md's
"Keeping This File Useful" section for the full instruction.

Migrated 2026-08-28 from CLAUDE.md's "DECISIONS YOU NEED TO MAKE", "WHAT NEEDS TO
BE BUILT NEXT", parts of "What's NOT Built Yet", and the "Pending" list under
"Design system update — DESIGN.md rewritten".

## Beta launch readiness — state on 2026-10-10 (read this first)

**Done (verified or pushed):** single-code access gate (`pristuptestovaciverze`) and one
internal `beta_schools` row (`PRISTUPTESTOVACIVERZE`, ZŠ Jesenicova, never shown to
testers); beta end 18 Oct 2026 23:59 Prague; all test accounts and the `TEST`/`KOD_SKOLY`
codes deleted (only the admin account remains); plan-020 catch-up SQL applied
(`migrations/2026-10-09-plan020-catchup.sql`); every app page needs a signed-in account,
signed-out visitors get a view-only school page; Registrace CTAs; testers start with the
questionnaire; delete-account verified end to end on the live database; match
percentages identical on every page (verified live); pros/cons regenerated for all 223
rows with Luna on flex; AI explanation ("Proč tahle shoda") on the questionnaire and
school page; Railway/Vercel/Supabase/Turnstile variables checked by the founder.

**Legal decisions of 10 Oct (see `docs/legal-decisions-2026-10-10.md`):** beta tracking is
now explicit consent (wording in `BetaEnrollment.jsx`, `Legal.jsx` §8–9); school reviews
stay off; sharing links stay off; feedback/closing answers/private reviews deleted by
**18 Oct 2027**; DPIA screened as not required for one school. Not a legal sign-off.
School e-mail: `docs/beta-school-email-draft.md`.

**Still open before / right after the school e-mail**
- [ ] **Railway upgrade to Hobby (founder, 11 Oct).** Trial ends about 13 Oct.
- [ ] Founder phone test with a fresh tester account on the live site, then delete it.
- [ ] Founder verifies the vendor facts in the decisions doc, D5 (Supabase region, Brevo
      owner, OpenRouter logging, operator agrees to be named) and writes the dates there.
- [ ] Reminder: **delete feedback, closing answers and private reviews by 18 Oct 2027**
      (manual; no job exists).
- [ ] Parents cannot read the privacy page without the gate code. Either put the code in the
      forwarded text (done) or serve legal pages ungated — the SPA assets are gated too, so
      that needs a separate static page.
- [ ] A one-click "stop recording my usage" switch in Nastavení (withdrawal is by e-mail now).
- [ ] Before sharing links are re-enabled: privacy text for result/payment links and
      pre-account snapshots (LEGAL-03). Before school reviews are re-enabled: notice and
      action workflow (LEGAL-02).
- [ ] Before real payments: IČO / adult operator (none today), Brevo account moved to Václav,
      day-2 reminder e-mail, season `past_due` dead end, Stripe SDK upgrade (HANDOFF-PLAN
      T2/T3 of the 2026-10-07 review).

## More sign-in and verification options — founder request 2026-10-10

- [ ] **SMS verification** (if possible): confirm the account by a code sent as an SMS
      instead of, or next to, the e-mail link. Check Supabase phone auth (needs an SMS
      provider such as Twilio/MessageBird/Vonage, per-message cost, Czech numbers, minors'
      phone numbers as personal data in the privacy text). Decide whether SMS replaces or
      supplements the e-mail confirmation; `requireAuth` currently demands a confirmed e-mail.
- [ ] **Social sign-in: Google, Apple, etc.** ("Pokračovat přes Google/Apple"). Supabase
      OAuth providers; Apple is required if any social login ships in the iOS app. Needs
      redirect URLs, provider consoles, privacy-text update, and a decision on how a social
      account gets the role/beta enrolment and the confirmed-e-mail rule (the provider's
      verified e-mail should count). Interacts with the Turnstile and confirm-email screens
      (`ConfirmEmailWaiting.jsx`), which social sign-in would skip.

## Match percentages: onboarding result screen can still disagree with the app — 2026-10-10

The app's pages (school list, school page, comparison, matrix, questionnaire result) now
all score against one cached full catalogue and agree (verified live 2026-10-10: 73 % on
every page; before, the school page said 65 %). The **onboarding result screen** (`Reveal`,
`TopMatchCard`, `frontend/src/lib/matching.js`) is a separate engine in the browser with
its own dimensions, so a student can see one percentage there and another in the app for
the same school. Same open problem as the earlier B01/B02 findings.
- **Options:** (a) score the onboarding answers on the server with the same engine, and
  show that number; (b) keep two engines but stop showing a percentage on the onboarding
  result (a band like "Silná shoda" only); (c) tell the student the numbers differ.
- **Needs:** a founder choice; (a) is cleanest but the quiz answers do not map one-to-one
  onto the questionnaire questions.

## AI explanations: make them more detailed — 2026-10-10

Today a "Proč tahle shoda" explanation is 1–2 short sentences (about 260 characters,
`SYSTEM_PROMPT` in `lib/questionnaire.js`). The founder wants more detail. Ideas: 3–4
sentences or short bullets that name the specific obory, which answers matched and which
did not, and how the school compares on admission difficulty. Constraints to keep: only
facts from the signals and school data, no numbers the student gave (points stay private),
no predictions of acceptance, tykání/vykání and gender forms. More text means more output
tokens, so re-estimate the cost (about 0.006 Kč per explanation now) and the loading time,
and let the cards expand ("Zobrazit víc") so the top 10 stays scannable.

## Founder backlog from the 2026-10-08 request — implementation underway, acceptance open

Plan `plans/020-beta-launch-batch.md` builds the rest of that request. These items were
explicitly "log only":

- **Přihláška: suggest the order (feature).** Propose a DiPSy ordering of the 1–3 picked
  schools (dream / realistic / safe, from the student's points vs. each obor's cutoff) and
  explain why. Only suggest; the student decides. Needs `decision_profile.jpz_points`, or
  falls back to acceptance rate.
- **Questionnaire: form of study (denní / dálková / distanční / kombinovaná).** Add a
  question and a `forma` dimension so the unused personality answers count. For example,
  `povaha = extrovert` or `novy_kolektiv = pohoda` lowers distance/remote programmes, and
  `introvert` does not penalise them. Cermat's `school_programs` already carries the
  form per obor (search has a "forma" facet). Today `povaha`, `novy_kolektiv`, `motivace`,
  `soucasna_skola` and `velikost` change no score; plan 020 uses those structured
  profile answers to personalise the AI sentence. `poznamka` is excluded from AI
  and scoring: the founder confirmed on 9 October that it stays private context.
- **Micro-animations across the site.** The compare bar's slide-down (plan 020) is the
  pattern: short (150–250 ms), transform/opacity only, and off under
  `prefers-reduced-motion`. Candidates: toasts, favourite toggle, adding to the
  přihláška, filter chips, opening the accordions.
- **Remember filters and the search text across sessions.** `/skoly` filters, view and
  query already survive a reload *in the same tab* (`sessionStorage`
  `snm.search.filters` / `snm.search.view`). Not done: keeping them when the tab is
  closed or on another device (`localStorage` or the profile). Decide whether a closed
  tab should forget them (privacy on a shared school computer).
- **Comparison: data we do not have for any school.** Removed from `/porovnani`
  instead of showing "zatím doplňujeme":
  - Public-transport commute (dojezd MHD). Also removed from the matrix.
  - Where graduates go (VŠ placement / employment). `vs_pokracuje_pct` exists for only 4
    schools; `vs_uplatneni` is free text.
  - Club count (`pocet_krouzku` is 0 rows, unusable).
  - Dormitory (`ma_koleje` exists for only 6 schools).
  
  Bring each one back as a comparison row once coverage is real.

## Pre-beta deep review 2026-10-07 — what is still open
- **Found:** 2026-10-07, full-repo review by Claude Code (Opus 5.5) in parallel with Codex
- **Urgency:** P0 items block the beta; the rest are ranked in the report
- **Release/context:** [`reports/claude-review-2026-10-07/REPORT.md`](reports/claude-review-2026-10-07/REPORT.md) (findings + manual checks) and [`HANDOFF-PLAN.md`](reports/claude-review-2026-10-07/HANDOFF-PLAN.md) (tasks for the next agent); Codex's parallel review is in `reports/deployment-review-2026-10-07/`

Founder-only items before testers (refreshed with read-only evidence from 8 October; details in the current Codex report):
- [ ] Verify a fresh installation and repeat execution in a disposable database, compare deployed functions/grants with the intended schema, then apply only the reviewed missing migration. All 26 application tables and `beta_profile.role_note` were present on 8 October; that does not prove `capture_beta_profile()` or the complete enrollment flow works.
- [ ] Confirm the intended beta end date. The live cutoff is now **18 October 2026 at 23:59 Europe/Prague** (`2026-10-18T21:59:00Z`), with 48-hour rolling access; the earlier 12 October test value is superseded.
- [ ] Confirm invitation coverage for every intended school. The fresh 10 October read-only check finds one cohort code matching `PRISTUPTESTOVACIVERZE`, replacing the 8 October two-code snapshot. The production shared-code entry previously displayed ZŠ Jesenicova and the updated deadline; neither entry nor metadata proves signup/confirmation/feedback renewal.
- [ ] Verify Railway OpenRouter credentials and one controlled generation independently. Local authentication returned 200 on 8 October and the configured provider-prefixed model was present in the catalogue; the previous local 401/prefix finding is superseded. This does not prove generation, cost attribution or deployed credentials.
- [ ] Railway: `NODE_ENV=production` and a real `BETA_TICKET_SECRET`; Supabase redirect allowlist must include `/email-overen*`, `/prihlaseni*`, `/nove-heslo` on the www domain.

## Paid vs free gating — founder decision 2026-10-07, not implemented
- **Found:** 2026-10-07 review (landing/FAQ copy and App.jsx routes disagreed)
- **Urgency:** high before public/paid launch; invited beta testers must retain free full tools and pass a separate zero-Stripe acceptance test
- **Risk of NOT fixing:** copy promises free things that should be paid (and vice versa); after the 3-day trial a normal account keeps the whole database, comparison and matrix for free.
- **Effort:** medium (routes + server gating + all copy) — task T1 in the handoff plan

Decision: only the landing page and the onboarding (with its result preview and its map) are free. The founder clarified in Codex that school details opened from landing-map dots remain public. Premium tools — `/skoly`, `/porovnani`, the matrix, `/dotaznik`, `/prihlaska`, favourites — need valid trial, paid or beta access. Auth/legal pages, account management and scoped share/parent links must retain the access needed for their function. Current routes expose `/skoly`, `/skoly/:id`, `/porovnani`, `/porovnani/matice` publicly; a production anonymous `GET /api/schools` returned the 217-school rich catalogue on 8 October. Preserve public detail/onboarding needs with an explicit endpoint/data-shape access matrix, rather than gating school reads wholesale. All copy that says "databáze škol zdarma" (landing2 FAQ + pricing, Home.jsx, SignUp.jsx, Settings, paywall UNLOCKS) must change in the same release.

## Normal trial clock and beta preview — founder decision 2026-10-07
- **Found:** 2026-10-07, founder clarification during the deployment review.
- **Urgency:** normal-account access change before public launch; beta separation is a beta acceptance gate.
- **Risk of NOT fixing:** delayed confirmation consumes the ordinary trial; confusing trial types could charge or block a feedback-only tester.
- **Effort:** medium; schema/access-state migration with concurrency and existing-account policy, not a wording patch.

Start the ordinary three-day access trial at the first confirmed sign-in. Current code starts it at signup. Implement once-only atomic initialization and define treatment of existing accounts; do not reset trials on refresh/reconfirmation or modify paid/beta/developer access. Beta stays free in exchange for feedback, and payment screens are only an optional feedback preview: no Stripe, monetary paywall or purchase trial. See section 0 of the [Codex handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

## Codex deployment review — continuing solo, 2026-10-07
- **Found:** 2026-10-07, source review plus read-only Supabase/Stripe/OpenRouter checks.
- **Urgency:** beta gates and separate real-money blockers; full line-by-line coverage remains unfinished.
- **Risk of NOT fixing:** broken first-run beta enrollment, unstable recommendations/shortlists, unresolved child analytics/retention and payment lifecycle failures.
- **Effort:** multiple focused tasks; see the report and handoff as they are completed.
- **Release/context:** `reports/deployment-review-2026-10-07/REPORT.md`, backend/frontend/legal findings and coverage ledgers.

Fix commit `14cce20` is pushed: optional quiz score validation/keyboard behavior, feedback privacy masks/redaction, corrected admission dates, unknown programme facts, language explanations, share headings and malformed telemetry validation. At that checkpoint the root tests passed 127/127 and frontend lint/build passed; these are dated results, not validation of all later concurrent commits. No live charges, mail, schema changes or production data writes were performed.

Read-only refresh on **8 October**: 217 visible schools from 223 raw rows; all 26 application tables and `beta_profile.role_note` present; beta cutoff 18 October at 23:59 Prague with 48-hour rolling access and two school codes; local OpenRouter authentication returned 200 with a provider-prefixed catalogue model. Stripe remains in test mode. Anonymous zero-row smoke tests and the private screenshot bucket check do not prove authenticated cross-account isolation, RPC definitions/grants, mail delivery or a successful tester journey. See `services-2026-10-08.json`, `production-http-2026-10-08.json` and `production-api-2026-10-08.json` in the report folder. Backend B01–03/B06–08 and payment P01–08 remain, subject to current-source revalidation. LEGAL-06's initial 14-day implementation claim was retracted: code actually grants 30 days, so the extended promise needs clarification rather than a presumed statutory-breach fix.

New beta integration gate: `SchoolMap.jsx` invites a home address and directly calls public Nominatim. The provider limits aggregate application traffic to 1 request/second and prohibits submitting personal data. Choose an approved provider/input policy before a classroom cohort; legal text already names OSMF, so the issue is operational/privacy suitability, not a missing recipient name. Additional current findings and acceptance tests are in `reports/deployment-review-2026-10-07/continuation-findings.md` and the handoff (account-scoped search state, mixed-year comparison, feedback draft context and missing map pins).

New browser beta gate: the landing hero scales the whole UI to fit. At 667×375, its paragraph renders at about 6.5px and its CTA is 25px high. Use a readable scrolling layout, then verify short/landscape windows and zoom (C09). Provide keyboard/non-WebGL access to public map-dot school details (C10). The normal trial clock decision is logged above. Concurrent auth/beta/matching/schema edits are being deferred and must be re-reviewed; earlier coverage/build evidence is not final validation of those new versions.

## Continuing deployment review — newly deferred work, 8–9 October 2026

- **C19 publication gate:** no beta testimonial is approved for publication merely by grade-derived age, a checkbox or an omitted name. Review child/guardian authority, effective text anonymity, consent/licence/withdrawal evidence and every renderer/export before adding quotes. Current `TESTIMONIALS` is empty; Phase 9's consent/version/selection controls are implementation evidence, not legal approval. See the current deployment handoff.
- **Found:** current-source review, synthetic browser checks and read-only service probes; full coverage is still in progress.
- **Urgency:** shortlist/draft integrity before beta; deployment headers before exposure; payment and maintenance gates before their respective use.
- **Risk of NOT fixing:** failed reads can erase saved picks, shared-browser drafts can cross account boundaries, and operational batch/reset failures can lose data or strand billing.
- **Effort:** focused tasks with ownership checks; see the linked findings and acceptance tests.

- **C12:** define and verify compatible production security headers; the shared-code gate had HSTS but lacked explicit CSP, framing, MIME, referrer and permissions policies. Check authenticated caching separately.
- **C13–C16:** `5c097aa` fixes the failed-initial-picks-read overwrite in source: actions remain disabled after failure, and a toggle fetches the current list first. Retry, immutable account ownership and concurrent/versioned writes remain open. Re-key private drafts and parent-link requests by account/token; bind every onboarding-flush write and completion to its original owner. The synthetic delayed A-save / switch-to-B reproduction issues the next gender update under B and clears the current stash. See the runnable reproduction and C16 handoff; no real account was changed.
- **C17 fixed:** the closing questionnaire now requires an active beta program before opening. Synthetic browser checks confirm the ended state has no dialog and active/overdue still opens it; real cutoff/device acceptance remains open.
- **S01–S13:** harden account-reset, admission import, cache/extraction scope and partial-failure behavior before reuse; align pros/cons generation with the visible school projection and source years. Extraction and Google diagnostic bugs were fixed in `06c704c` and `86be63a`, but existing stored canteen candidates still need source review. Dry runs can make paid model calls and write usage accounting; corrected wording does not make them side-effect free.
- **Production/operator checks:** verify Railway billing continuity and dashboard configuration, support-inbox access, authenticated RLS/RPC/Storage isolation, real phone/browser confirmation, feedback renewal and the optional beta paywall preview with zero Stripe calls.

Details: [continuation findings](reports/deployment-review-2026-10-07/continuation-findings.md), [maintenance findings](reports/deployment-review-2026-10-07/script-findings.md) and [handoff plan](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md). These remain open; presence in this ledger is not approval to change product/legal policy without the resolved founder decisions.

## Church schools: tuition shown as unknown — review the extracted data
- **Found:** 2026-10-07 review; founder decision the same day
- **Urgency:** medium
- **Effort:** small–medium

The comparison table shows "Zjistit u školy" when a církevní school lacks a supported tuition classification. The matrix binary public/private tuition criterion leaves that classification unknown; its separate tuition-amount criterion can use a known extracted amount. Earlier code classified church schools as paid while backend `lib/matching.js` treated them as free. The founder believes `school_extracted_details` has tuition text for each church school — check `tuition_czk_per_year` / `skolne_poplatky` for every `zrizovatel` "církevní" school, then use the real value in `comparisonRows.js`, `decisionMatrix.js` and `lib/matching.js` `isPaid()` consistently.

## Plan 019: SQL reapplication and live rollout checks — 2026-10-05
- **Found:** 2026-10-05, continuing the approved beta feedback/analytics plan.
- **Urgency:** high (beta rollout)
- **Risk of fixing now:** schema, privacy and access changes need focused verification.
- **Risk of NOT fixing:** new API runs against outdated SQL; live privacy/access/Storage behavior remains unverified.
- **Effort:** medium (configuration, database and real-service verification)
- **Release/context:** plan 019 beta rollout

Founder resolved Matching: full rankings in a dedicated private table (plan §6,
commit a039c63). Claude independently reviewed steps 2–9 in
`reports/beta-implementation-claude-review-2026-10-05.md`; phase A addresses findings
1–10 before phase B. Steps 2–12 are now implemented and pushed through c8e632e.
Final checks: 121 root tests pass, frontend lint passes with 8 existing warnings,
production build passes. Actual Chrome student/parent flows and nine admin tabs
were checked at 390px and desktop using synthetic local services: normal account
0 event requests/rows, Stripe 0 calls, all 39 CSV exports pass. SQL logic
assertions and mocked API tests do not verify PostgreSQL/Storage transactions.

Historical checkpoint: the founder reported applying the then-current SQL and
a five-table count on 5 October. Read-only checks on 8 October found all 26
application tables, including `beta_rankings`; neither count verifies current
functions, grants, constraints or isolation. Do not blindly reapply the whole
file to production. Verify a fresh installation and repeat execution in a
disposable database, inspect the deployed definitions, and prepare a reviewed
migration containing only the missing changes.

Still pending: verify beta_rankings + all six private tables' RLS/no client
policies + service-only function grants + NULL/past closing deadlines; real
signup metadata/confirmation and private signed Storage upload/read/cleanup;
verify ADMIN_EMAILS, production BETA_TICKET_SECRET, intended cutoff/school
codes and SMTP; independent review of continuation; legal check before
publicly using under-15 reviews. Preserve beta's original exclusive
rolling/cutoff access and zero Stripe calls. The Matching conflict is resolved.
Review handoff and exact SQL queries:
`reports/beta-implementation-completion-2026-10-05.md`.

## Plan 018 rollout tests — Stripe test mode and two devices — 2026-10-05
- **Found:** 2026-10-05, after the Supabase tables were applied (3 tables, RLS on).
- **Urgency:** high — must pass before the Plan 018 server is deployed to live
- **Effort:** about an hour; needs Stripe TEST keys in the local `.env`
- **Release/context:** [`plans/018-parent-child-share-links.md`](plans/018-parent-child-share-links.md) §8

**Stripe test mode (test keys and test card 4242… only; never live keys):**
- [ ] Student on Plan/Platba presses "Ať to zaplatí rodič"; link is copied and the waiting panel shows.
- [ ] Parent opens it with no session, sees plan cards and no app nav, pays with the test card.
- [ ] Parent returns to "Platba se zpracovává…", then to the manage state.
- [ ] Student tab, refocused, moves to `hotovo`; `/skoly` has access.
- [ ] `checkout.session.completed` for a season (setup-mode) pay-link checkout contains a non-null `customer`. `customer_creation: 'always'` was added in the refactor but is unverified.
- [ ] Parent cancels via the link; the student's Settings reflects it.
- [ ] Fresh link and plan: parent withdraws; refund happens and the student loses access.
- [ ] Check the first finding in "Plan 018 review" below: after a parent payment, does a later own purchase by the student reuse the parent's customer, receipts or saved card?
- [ ] Ended plan: the parent link shows checkout again, not "aktivní".

**Two-device scenarios (normal window plus a private window):**
- [ ] Quiz handoff: parent presses "Poslat odkaz dítěti"; lock screen shows; child opens the link; parent refocuses and sees "otevřelo"; child reaches Reveal; parent sees the done state.
- [ ] Parent presses "Chci dotazník vyplnit sám"; parent continues; the link then shows "Odkaz už neplatí".
- [ ] Opening the child link in the parent's own browser shows "Tento odkaz je pro vaše dítě".
- [ ] Reveal link before an account shows #1 plus the locked count, with only the top bar.
- [ ] `/dotaznik` results link: top 10 with reasons; set `trial_expires_at` in the past on a test account and the same link drops to 1 row plus locked; "Zrušit" gives 404.
- [ ] Parent signup tip shows on the parent branch only.
- [ ] All three standalone pages (`/vysledky`, `/platba-rodice`, `/od-rodice`) at 390px and 1280px, light and dark.

## Plan 018 review: three findings left open — 2026-10-04
- **Found:** 2026-10-04, review of the plan 018 commits (`67ada25`…`7ff9a68`).
  Findings 1, 3 and 4 of that review were fixed. These three were deferred.
- **Urgency:** #1 before live payments; #2 and #3 low
- **Effort:** #1 small–medium; #2 small; #3 trivial

1. **A parent payment replaces the child's Stripe customer (needs a test-mode check).**
   - The pay-link checkout deliberately skips the saved customer, so Stripe
     creates a new one carrying the parent's e-mail, and the webhook overwrites
     `users.stripe_customer_id` with it.
   - If the student later buys again themselves, `createCheckoutForUser`
     reuses that customer. Receipts would then go to the parent, and Checkout
     *may* offer the parent's saved card. The saved-card part is unconfirmed;
     check it in Stripe test mode during the plan 018 checkout run.
   - The student's earlier customer is orphaned: `DELETE /api/me` only deletes
     the current one. That leaves a GDPR erasure gap at Stripe.
   - Fix options: record that a customer came from a pay link and never reuse
     it for the account's own checkout; or have the webhook delete the replaced
     customer when `object.customer` differs and the old one has no live plan.
2. **`GET /api/shared-results/:token` is expensive per anonymous hit.**
   - `buildRunResult` scores every school, with programmes and extracted
     details, on each visit. `shareLimiter` (30/h/IP) bounds it for now.
   - Cache the computed top 10 per run if share-link traffic grows.
3. **The billing refactor dropped explanatory comments** in
   `cancelPlanForUser` / `createCheckoutForUser` (server.js):
   - why cancelling a season pass before its charge writes
     `subscription_status` itself (there is no Stripe event to react to);
   - why a subscription still in its trial is cancelled outright rather than
     at period end;
   - what `client_reference_id` is for (it ties the session back to the
     account in the webhook).

   Restore them from `git show 67ada25^:server.js`.

## Onboarding matching bias — fixes still to do — 2026-10-05
- **Found:** 2026-10-04, `scripts/simulate-matching.mjs` (5,000 random answer sets, report `reports/matching-simulation-2026-10-04.md`, "Onboarding" section). The `/dotaznik` scorer was fixed the same day (`a922587`); the onboarding scorer was deliberately left alone.
- **Urgency:** medium (testers see the onboarding result first; fix before or early in the beta)
- **Risk of fixing now:** changes what the reveal shows; re-run the simulation and `tests/onboarding-ranking.test.mjs` after any change.
- **Risk of NOT fixing:** the same broad schools keep showing up as the free #1 on the reveal, and single-obor lycea almost never do.
- **Effort:** small–medium
- **Release/context:** beta (plan 019); compare with real tester results in `/admin → Matching`

Body: `frontend/src/lib/matching.js` already scores per obor (best obor wins), so it does not have the whole-list keyword bug. What the simulation still shows:
1. **Breadth advantage.** Rank correlates with number of obory (−0.52) and program text length (−0.65). Best-of-N over many obory inflates the max even when each obor is an average fit: school 14 (31 obory) is in the top 10 for 25.3 % of answer sets, 141 (34 obory) 20.7 %, 180 (19) 21.4 % — fair share is ~4.6 %. Decide whether that is wanted ("more options really is better") or should be damped (e.g. compare best obor only, tie-break by `focusDepth` as today, no extra credit for count).
2. **Single-obor lycea sink.** 188 Waldorfské lyceum (bottom 10 in 34 %), 203 Naše lyceum (24 %), 37 Kombinované lyceum (24 %, while it is #1 in `/dotaznik`). Check how `deriveFeatures` (`frontend/src/lib/schoolFeatures.js`) types a lyceum and which focus it derives; likely it gets neither the gymnázium nor the odborná credit.
3. **Single-obor gymnázia low** (113 Mensa, 148 ARCUS, 127 Trojské, 144/140/114 state gymnázia): check the general-academic credit (`f.general && academic → 0.35`) against the per-obor scores of specialised schools.
4. The simulation feeds the onboarding scorer the newest year's rows only (`latestYearOnly`), not server.js's merged `slimProgramsForList`; confirm this does not change features before trusting the numbers.
5. The report used synthetic answers, and the current simulation uses biased random-comparator sampling for multi-select choices. Its figures are exploratory, not a calibrated fairness benchmark or evidence of real student preferences. An equal ~4.6% top-ten share is a reference calculation, not an expected correct outcome. Re-run against the current server projection with a reproducible sampler and inspect real consented beta results before changing weights.

## Beta round 3 — apply SQL, then re-check the checklist live — 2026-10-08

- **Root cause of "Co vyzkoušet never ticks":** the live `record_beta_events`
  failed on every signed-in batch (`42P01 missing FROM-clause entry for table
  "record_beta_events"` — the variable was qualified with the function name).
  The round-3 investigation reported no signed-in events at that checkpoint.
  The local preview fakes this RPC in JS, which is why it looked fine there.
  A source fix is in `supabase-setup.sql`; current live event counts alone do
  not establish whether the deployed function is fixed. Inspect its deployed
  definition and apply a reviewed missing migration after disposable-database
  verification, then tick one item with a tester account and confirm a
  `beta_events` row with that tester's `user_id` appears.
- Same SQL: `submit_beta_micro` is now the 10-second quick rating per feature;
  it stores feedback but **does not renew access**. Also adds
  `decision_profile.jpz_expected_gain`.
- Still unchecked on a real phone: the reward pop-up placement above the
  floating beta buttons, and the theme-switch circle animation on iOS Safari.

## Sharing with parent/child: test before re-enabling — 2026-10-08

Every "share with parent/child" button (results link, payment link "Ať to
zaplatí rodič", quiz handoff "Poslat odkaz dítěti", Reveal share, Přihláška
"Ukázat rodičům") is disabled with a "zatím nefunguje" note via
`SHARING_ENABLED` in `frontend/src/config/features.js`, and the item was
removed from the beta checklist. Before flipping it back: test each link end to
end on two devices (create, open as recipient, revoke, payment-link checkout in
Stripe test mode) — see "Plan 018 rollout tests" below — then set the flag to
`true` and put `['sdileni', …]` back in `BetaInstructions.jsx` `tasks`.

## Questionnaire: address + km radius instead of only districts — 2026-10-08

Founder idea: let the student type an address (home) and pick how far the
school may be (a km circle), as `/skoly`'s SchoolMap already does, instead of
or next to the district map. Needs a geocoder decision (same as SchoolMap) and
a scoring rule in both `lib/matching.js` engines (distance from coordinates;
schools without coordinates must not be penalised).

## Founder to-do: sanity-check the numbers in onboarding and the paywall — 2026-10-08

The founder wants to read through the onboarding flow and the five paywall
screens and check that every number shown there (school counts, prices,
percentages, "X škol", trial days) actually makes sense and matches reality.

## Beta round 2 (feedback sheet, persistence, saved schools) — SQL + real-tester re-check — 2026-10-07
- **Found:** 2026-10-07, founder's second beta-readiness list
- **Urgency:** high — the SQL must run before the deploy reaches testers (the new feedback kind is rejected by the old constraint)
- **Effort:** small
- **Release/context:** `supabase-setup.sql` (`beta_feedback_kind_check`, `submit_beta_feedback_details`), `BetaFeedbackSheet.jsx`, `ConfirmEmailWaiting.jsx`, `AuthContext.jsx`, `/ulozene`

- [ ] Inspect the deployed feedback-kind constraint and `submit_beta_feedback_details()` against the current intended schema. The old constraint rejected "Nepřehledné" feedback; apply any missing changes through a reviewed, disposable-database-verified migration, then submit that kind with a real tester account.
- [ ] Set `RESEND_COOLDOWN_SECONDS` in `frontend/src/lib/pendingConfirmation.js` to Supabase's **Minimum interval per user** (Authentication → Emails → SMTP Settings). It is 60 s here because that is Supabase's default; the founder has not confirmed the live value.
- [ ] Real tester, real phone: (a) confirmation link opened on a phone while the sign-up tab is on a laptop (cross-device cannot auto-continue, so "Pokračovat v tomto okně" must work); (b) drag-to-mark on a touch screen (`touch-action: none` overlay) and the html2canvas capture on iOS Safari; (c) after finishing the questionnaire the "Dotazník" box ticks within a few seconds; (d) tab-away and back no longer closes the first-run guide or wipes a half-filled questionnaire.
- [ ] The "checklist does not tick" report could not be reproduced with a real tester account. Causes fixed: profile refreshes switched `profileLoading` on (tracker dropped events, pages unmounted) and the checklist was only re-read every 60 s. If it still fails live, look in `beta_events` for the tester's `q_finish` rows first.
- [ ] Drafts are kept in `sessionStorage` (per tab): questionnaire answers, guide step, feedback text, review text, closing questionnaire, search filters, matrix weights, saved-school notes. Settings forms and passwords are deliberately NOT kept.
- [ ] The Resend button on the "check your inbox" screen needs a Turnstile token like every other auth call, so a widget appears there. If that looks odd to testers, drop the widget and allow resend only through the login page.

## Questionnaire: "Kdy by měla škola začínat?" removed — collect the data and bring it back — 2026-10-07
- **Found:** 2026-10-07, founder decision
- **Urgency:** low
- **Effort:** medium (needs real data first)
- **Release/context:** `lib/questionnaire.js` (`zacatek`, removed from `BASE_QUESTIONS` and `SECTIONS`), `lib/matching.js` comment, `school_extracted_details.zacatek_hodin`

The only answers were "doesn't matter" and "it matters, but we can't consider it yet", which is a promise we cannot keep. Removed from the standalone `/dotaznik` (31 questions now; the onboarding quiz never had it, so the landing counts are unchanged and are computed from the data anyway). Old runs that stored `zacatek` are unaffected: the validator ignores unknown keys.

To bring it back: extract school start times (the scraper already fills `school_extracted_details.zacatek_hodin` for some schools), add a weighted `zacatek` dimension to `lib/matching.js` that drops schools with no data instead of penalising them, then restore the question with real options (e.g. "co nejdřív / klidně později") and update `SECTIONS`, the tests and `plans/017`.

## Beta tester flow rework — apply SQL, then re-check with a real tester account — 2026-10-06
- **Found:** 2026-10-06, after rewriting the tester instructions, landing page and confirmation flow
- **Urgency:** high — the SQL must run before this deploy reaches testers who pick "Jiné"
- **Effort:** small
- **Release/context:** `supabase-setup.sql` (`beta_profile.role_note` + `capture_beta_profile`), `/email-overen`, `BetaInstructions.jsx`

- [ ] `beta_profile.role_note` was present live on 8 October. Inspect `capture_beta_profile()` and its grants before preparing any missing migration; verify a tester selecting "Jiné" can save and reload the note. Column presence alone does not close this gate.
- [ ] End-to-end with a real throwaway tester e-mail: sign up from `/beta/TEST`, click the link in a second tab and check that it says "E-mail je ověřený" and the first tab moves on by itself. Then try the link on a phone, where the tab can't move on, so "Pokračovat v tomto okně" has to work.
- [ ] As that tester: the first-run guide can't be closed with Escape or a backdrop click; **?** opens the one-screen reference; the paywall preview banner reads correctly. These were checked only on a stand-in page, because no tester session was available locally.

## Brevo SMTP account is in the founder's name — move to Václav before launch — 2026-10-05
- **Found:** 2026-10-05, founder decision while setting up custom SMTP
- **Urgency:** high — blocks the real public/paid launch, not beta
- **Effort:** small (about 30 minutes plus DNS re-verification)
- **Release/context:** Supabase custom SMTP via Brevo free tier; `Legal.jsx` names Václav Kadlec as data controller

For beta testing the founder (a minor) opens the Brevo account in his own name.
That conflicts with the legal documents: the privacy policy names Václav Kadlec
as the data controller, and Brevo's terms expect an adult account holder who can
contract and sign the DPA. This is accepted for beta only.

Before the real launch:
- [ ] Transfer the Brevo account to Václav Kadlec (change the holder and company
      profile), or have him create a new account. With a new account, re-verify
      `stredninamiru.cz` (Brevo's DKIM/DMARC records) and generate a new SMTP key.
- [ ] Václav accepts Brevo's terms and the DPA; keep a copy.
- [ ] If the SMTP key changed, update it in Supabase → Authentication → Emails → SMTP Settings.
- [ ] Add the founder as a user on Václav's account, or record how access is shared.
- [ ] Re-test the sign-up confirmation and password-reset e-mails.
- [ ] Ship this together with the adult-owned live Stripe account (same holder for both).

## Operator and mail details filled; legal/account verification still required
- `Legal.jsx` has operator/contact details and `DRAFT = false`; it no longer lacks a named operator. Historical 6 October records say Brevo auth mail and domain authentication were tested.
- Verify the actual adult operator/account holder, lawful business/tax/invoicing status, monitored contact mailbox, vendor agreements and current SMTP/DNS settings before the applicable launch. The founder's accepted risk about starting paid without a živnost is a recorded decision, not a legal approval or a substitute for this check.
- Retain the proposed separate support mailbox as a founder/operations decision; do not replace the working `info@stredninamiru.cz` contact until the new mailbox is created and monitored. Moderation/rights responses also need an operated procedure.

## Merged / renamed schools break the REDIZO import — 2026-09-30
- **Found:** 2026-09-30, while asking why 10 schools had no 2026 admission data.
- **Urgency:** medium
- **Risk of fixing now:** none; the `merged_into` column (supabase-setup.sql) and server.js support are in.
- **Risk of NOT fixing:** every yearly import, a merged or renamed school comes back as a new REDIZO, matches nothing, and leaves a dead duplicate row with old numbers.
- **Effort:** small (print unmatched REDIZOs in `scripts/import-admission-data.js`, then set `merged_into` by hand)
- **Release/context:** run after each yearly Cermat import

Body: handled on 2026-09-30 by `schools.merged_into` — ids 211, 216, 217, 218 (FOSTRA Aspira/Pontia/Europea/Meda, merged into FOSTRA International id 7 on 2025-09-01), 208 (KUDYKAMPUS, re-registered as id 226) and 115 (Hotelová škola a Gymnázium Radlická, merged into Smíchovská SPŠ id 110 on 2026-01-01). Still open: id 215 FOSTRA Digita (no merger record found, not in 2026 Cermat, no 2026 website listing; 2025 had 16 applicants and 0 accepted, so it may never have run), id 189 "Střední odborné učiliště" (Ministry of Justice school, evening courses, no applicant data; arguably should be hidden from 9th graders), ids 212 Přírodní škola and 213 AVIDA (open, no 4-year gymnázium admission in 2026 Cermat; correctly just "starší data").

## Questionnaire: schools without Cermat data, and scoring per obor — 2026-09-30
- **Found:** 2026-09-30, after plan 017 (`selektivita` / `rezerva` dimensions in `lib/matching.js`) shipped and the obor filters landed on `/skoly`.
- **Effort:** medium — touches the scorer, the questions, and the server-side list data.
- **Not done yet:**
  1. **Schools with no Cermat data.** `selektivita` and `rezerva` return `null` when `schools.admission_cutoff` is missing, so such a school is scored only on the other dimensions. A student who entered points and wants "jistota" can then see an unknown school ranked above schools known to be safe, with nothing telling them its hranice is unknown. Decide the rule: show a visible "hranice neznámá" note on the result, push these schools below schools with known data, or exclude them from the reserve part of the ranking. Also check how many schools this affects and whether any can be matched by `scripts/backfill-redizo.js`.
  2. **Questionnaire is school-level, not obor-level.** The difficulty and reserve dimensions use the school's average `admission_cutoff`, so a school with one easy and one hard obor reads as medium. The questionnaire should score the obor the student actually wants: match the chosen `oblasti` / `typ` to the school's obory, and use that obor's own hranice, míst, přihlášky and přijato (as the `/skoly` filters and `/prihlaska` already do). Same idea for the onboarding quiz's `reserve` component, which already prefers the obor's cutoff when it has one.
  3. **Other obor-related inputs worth adding at the same time:** tie `rezerva` to the best-fitting obor per school (like the onboarding engine's `bestObor`), and surface which obor a match and its hranice refer to in the result text.
- **Why it matters:** hranice, počet míst and přijato z přihlášených only mean something per obor; the school average hides the number a student actually competes against.

## Search filters — form of study misses 12 obory — 2026-09-29
- **Found:** 2026-09-29, while adding the obor / hranice / míst / forma filters to `/skoly`.
- **Effort:** small.
- **What:** `slimProgramsForList` in `server.js` merges rows of the same obor in the latest year into one entry (key has no `forma_vzdelavani`), so an obor offered in two forms (e.g. denní + dálková, 12 such obor groups in the 2026 Cermat file) keeps only the FIRST row's form. The forma filter therefore can't find the second form of those 12.
- **Fix:** add `forma_vzdelavani` to that key, then check `frontend/src/lib/schoolPrograms.js` (`groupKey`) still counts the same way. Left alone because that function has uncommitted work from another session.

## Places for 2027 (míst 2027) are not in the database — only in scraped text — 2026-09-30
- **Found:** 2026-09-30, while adding the "Míst" sort to `/skoly`.
- **Urgency:** low
- **Effort:** medium
- **Release/context:** none. Would let `/skoly` show and sort by next year's places.

The 30 September snapshot described **Míst 2026** coverage as 222 of 223 raw schools; this is not a current visible-school coverage count. No structured "míst 2027" field exists: `school_extracted_details` has no such column and `scripts/extract-school-details.js` doesn't ask for it. A rough text scan of `scripts/data/scraped-schools` found about **10 of 220** pages that state a 2027/2028 intake in words (e.g. "budeme přijímat 48 žáků", "přijmeme 180 uchazečů do 6 tříd"). Extracting it would need a new nullable column plus a prompt field (count and obor, with a quoted sentence as the existing fields require), and the page must be re-scraped after the 2027 intake is published, since most schools haven't announced it yet.

## School 29 hand-added programmes — verify provenance and admission facts
- On 29 September, two programme rows were inserted manually for school 29, with some characteristics copied from other schools sharing KKOV. This historical action does not verify that school's own language, qualification, form or JPZ requirement.
- The old “only school with zero programme rows” statement preceded the insertion and is superseded: the 8 October probe found rows for every visible school.
- Verify REDIZO/source matching and each hand-added characteristic against the school's current official material, and keep unknown capacity/applications/admitted/cutoff unknown until sourced. Check extracted-source coverage separately.
- A future import must preserve or transactionally replace the reviewed dataset; do not rely on the current delete-before-insert script as a safe reconciliation path (S02/S03).

## Questionnaire expansion (plan 017) — follow-ups — 2026-09-28
- **Found:** 2026-09-28, while building plan 017 (weights layer, difficulty and tuition questions).
- **Effort:** small each.
- **Not done yet:**
  1. **Weight numbers are first guesses.** `WEIGHT_RULES` factors, the `RESERVE_CURVES` and `PAID_PENALTY` in `lib/matching.js` were chosen by reasoning, not tuned on real students. Re-check with a handful of real answer sets.
  2. **Questionnaire uses the school-average cutoff**, not the per-obor one, so a school with one hard and one easy obor reads as medium. Precise per-obor risk stays on `/prihlaska`.
  3. **"What bothers you at your current school"** twin of `soucasna_skola` was skipped to keep the list short. Add the same way (multi, no free text) if wanted.
  4. **`povolani` free-text follow-up** ("what career?") still depends on the open-text decision above.
  5. **Fast questionnaire** still to build; the standalone list currently has 31 questions, most optional. The weight-only questions are the natural candidates for the fast version's core.
  6. **`selektivita_tezka: jedno`** adds no direction instead of zeroing the whole dimension (deviation from plan 017's draft), so a "challenge" answer to the other question is not silently ignored.

## Standing rule: verify and migrate schema before matching code — updated 2026-10-09

On 2026-09-28 every account was locked out of `requireAccess` routes
(questionnaire, favourites, …) with `column users.tester_school_code does not
exist`. Cause: commit `bf24ef2` (beta program) shipped server.js code reading new
`users.tester_*` columns and `beta_*` tables, but the live Supabase was never
re-run with the updated `supabase-setup.sql`. The file itself was complete — an
audit the same day found every table, column, filter and RPC server.js uses
declared in it — so this was a process gap, not a schema bug.

**Current rule:** any commit that changes `supabase-setup.sql` requires a
disposable-database fresh-install and rerun check, then a reviewed migration for
the actual missing live changes **before** matching code is deployed or run
against the shared database. Do not paste the whole current setup file into
production merely because it is intended to be repeatable; the deployment
review has not verified its latest functions, grants and isolation behavior.
Local configuration can point to the shared Supabase project, so localhost alone
is not a database sandbox. Agents must identify the schema change, migration,
rollback/backup approach and read-only verification queries in their handoff.

Still open: this relies on memory. A cheap guard would be a startup check in
server.js that selects the newest expected columns once and logs a loud error
naming the missing migration. Not built — decide whether it is worth it.

## Beta cutoff configured; external form remains optional — verified 2026-10-08
- Earlier missing-date blocker is superseded: live settings have a cutoff of **18 October 2026, 23:59 Europe/Prague**, a 48-hour rolling feedback window, and no external feedback-form URL.
- Do not restore the earlier 12 October deadline. Only accepted in-app feedback renews access; an external form would not.
- Still open: signed-in cutoff/renewal/closing acceptance and the latest migration/function/grant verification. Beta is free for feedback and its payment screens are previews only.

## Landing variants exist; ordinary A/B measurement is not established
- Current routes: the map-led B landing is `/`; `/nova` redirects there; `/stara` retains A as a reference.
- Both variants need final browser/device and copy acceptance. The deployment review records unreadable short-viewport hero scaling (C09), keyboard/non-WebGL map access (C10), and unsupported completeness/hour claims (C06).
- Beta interaction tracking is not proof of a working ordinary visitor A/B assignment, conversion metric or consent policy. Agree the experiment and measurement before comparing conversion.

## Landing page: two unverified pieces of copy — 2026-09-26
- **Found:** 2026-09-26, landing rebuild (commit `7240e30`, `frontend/src/pages/Home.jsx`).
- **Urgency:** Medium — both are shown publicly on the first page a parent sees.
- **Founder quote (section 10):** the quote text and the name are my draft, marked `[Návrh textu]` / `[Jméno]` with a `TODO(founder)` comment. Replace them with your own words and name, or delete the section. Don't ship brackets.
- **"asi 4 minuty":** an estimate for the 8-question quiz, not measured. It appears in 3 places: the hero fineprint, the `FACTS` strip, and the final CTA title ("Za čtyři minuty…"). Time a few real runs (student and parent branch), then fix all 3 or drop the number.
- **Effort:** Small.

## Mobile layout checks still owed (375×812) — 2026-09-26

Done already and not repeated here: top of `/skoly` (list, toolbar, sort sheet
trigger, compare bar, map toolbar), top of the school detail page (hero, fact
tiles, action bar, tooltip position), top of `/porovnani` (table widths).
Screenshots of anything below the first screen came back blank in the Browser pane,
so those parts were only checked by measuring positions, or not at all:

- **School detail, below the fold:** obor cards + trend bars, "Kde to je" map,
  reviews list and review form, one-column Praktické informace (5c887ab/604514b),
  report-error dialog, similar schools, and an info tooltip actually shown.
- **`/skoly` on phone:** the sort bottom sheet opened; the filter sheet with the new
  Zřizovatel and Další groups; the map card with 4 stat cells plus the compare/save
  buttons; the compare bar sitting over the map.
- **`/porovnani` below the fold:** Škola section and pros/cons rows at 96px + 152px
  columns; the Rozhodovací matice and Moje přihláška tabs on phone.
- **Tablet width 601–860px:** nothing checked at this width after the 2026-09-26
  changes (practical-info grid is 2 columns there, list rows switch layout at 860).
- **Other pages never checked on phone this session:** `/nastaveni` (Vzhled theme
  cards), `/dotaznik`, home, sign-in/up.

## Regenerate school pros/cons with --force (wording fix) — 2026-09-26

Cached `school_ai_summary` pros/cons still say things like "Škola má pouze 19 míst
pro aktuální rok." The generator fed the model fields named `mista_aktualni_rok` /
`prihlasky_aktualni_rok`, and it echoed that wording, but those numbers are from the
past admission round (2026). The field names were fixed in
`scripts/generate-school-proscons.js` (commit 6836ab0: `rok_prijimacek`,
`mista_v_prijimackach`, `prihlasky_v_prijimackach`), but existing rows only change
when regenerated.

**To do (founder go-ahead, costs API credits):**
`node scripts/generate-school-proscons.js --dry-run --limit 5` to eyeball the wording,
then `node scripts/generate-school-proscons.js --force`. Not run yet, deliberately.

## Structured school-life extraction — dated coverage and source checks
- The six columns were extracted for all **219 cached schools** on 26 September. That is cache scope, not the 217 visible-school count. The ledger's later September snapshot recorded meals 108, dorm 6, club categories 189, teaching-style tags 79, university continuation 4 and explicit club count 0; earlier notes use different counts. Recompute current approved coverage before using any figure in product copy.
- Lunch/club/teaching-style inputs are connected to matching; dorm/university continuation remain display-only and explicit club count is unusable. Source/programme/year and uncertainty review remains required.
- A verbatim evidence quote alone does not prove its interpretation. Canteen-negation/unsafe preservation bugs were fixed in `06c704c`; review existing 118/146/228 candidate records before changing data (S09).
- Historical stale/broken-source candidates: 26, 142, 47, 157, 226 and 145; recheck current URLs/cache manifests first, then refresh only approved scope, filter and reconcile base/structured facts. School 98's bot-check must not be bypassed. Do not run a paid full scrape/extraction from these old instructions.

## /skoly redesign (plan 013): untested checks + one founder call — 2026-09-24
- **Found:** 2026-09-24, Claude review of plan 013 (`9d9026b`). The redesigned /skoly
  page is built and measured, but three of the plan's browser checks were never run.
- **Not tested yet:**
  - **Keyboard-only pass** (plan 013 §13 check 13). Tab order search → filter buttons →
    field tiles → sort → Seznam/Mapa → rows (checkbox, name, star) → pagination, with a
    visible focus ring on every stop. The anonymous session showed no favourite star, so
    the star stop is untested too.
  - **Reduced motion** (check 14). With `prefers-reduced-motion: reduce` emulated, no
    popover animation, chevron rotation, row background transition or press scale.
  - **Dark scheme** (check 15). With `prefers-color-scheme: dark` emulated, everything
    readable and nothing left in a light-only colour. Re-run this after plan 014 lands,
    because 014 changes every colour anyway.
- **Founder call needed:** on a 390px phone the legend above the list ("Hranice je…
  Přijato je… Míst je… Shoda říká…") is still ~6 lines (113px). Options: (a) keep it
  always visible, which is DESIGN.md's rule that consequential interpretation stays
  inline, or (b) on phones only, collapse it to a one-line "Jak číst čísla" toggle.
  Judge it on a real phone, not the emulator.
- **Known marginal:** with schools selected for comparison, the fixed compare bar covers
  the first school name on a 390×844 phone (name at y=790, bar at y=791). Not a bug, but
  worth a look during the phone check above.

## Theme picker step in onboarding — deferred until themes ship in Settings
- **Decided:** 2026-09-24, founder. Colour themes (Značka default, Smrk,
  Zvýrazňovač, Terakota) plus a system/light/dark mode setting are built first in
  Nastavení → Vzhled only, per `plans/014-colour-themes.md`. The founder also wants a
  "Vyber si barvy" step in the onboarding flow, so the student customises the app
  early (IKEA effect, `docs/sources/claude_code_ui_ux_guide.md` video 2).
- **Not done yet:** the onboarding step. It is an onboarding change, so design it
  through the `onboarding-architect` agent: where in the 23-screen flow it sits (it
  must not delay the quiz or the paywall), whether it appears for the parent branch
  too, and how the choice made before an account exists is saved (a local choice that
  plan 014's first sign-in sync then writes to the account).
- **Depends on:** plan 014 being built and verified.

## Two schools have a website but can't be scraped by either scraper
- **Found:** 2026-09-23, while chasing the 17 schools missing from Phase 1's
  markdown cache. Of the 4 with a stored `website`, 2 couldn't be recovered by
  either `scrape-schools.js` (Firecrawl — out of credits at the time) or
  `scrape-schools-free.js` (plain fetch + Turndown), for reasons independent of
  which scraper is used:
  - **ID 15**, Akademie systémové gastronomie (`akademiesg.cz`) — the site
    returns `HTTP 403` even with a real browser User-Agent, i.e. it blocks
    non-interactive requests outright. Firecrawl (with credits) might get past
    this via its headless-browser rendering; the free scraper cannot.
  - **ID 94**, Gymnázium Postupická (`postupicka.cz`) — the site itself returns
    `HTTP 500`. This is broken on the school's end, not a scraping problem; no
    scraper will succeed until they fix their server.
  - (The 3rd of the original 4, ID 199 Gymnázium Livingston, was recovered — its
    issue was an invalid/self-signed TLS cert, fixed by re-running
    `scrape-schools-free.js` once with `NODE_TLS_REJECT_UNAUTHORIZED=0`.)
- **Founder said they can get this data manually** for these two schools
  (skolne/obědy/kroužky/maturita/uplatnění — whatever's findable by visiting the
  site directly in a browser, where a human can click through a bot-check that
  a scraper can't). If done, the values can be written directly into
  `school_extracted_details` for school_id 15 and 94 (or a small one-off script
  can insert them) — no code change needed, this isn't blocked on tooling.
- **Not done yet:** manual lookup itself.

## tuition_czk_per_year priced the wrong program level (VOŠ, not SŠ) — FIXED 2026-09-23, one caveat left
- **Fixed:** extraction prompt now says SŠ tuition only and to ignore VOŠ pages; a
  code guard (`isPublicSchool` + `stripPublicTuition` in
  `scripts/extract-school-details.js`) nulls tuition for public schools on every
  run; `--fix-public-tuition` applied the same rule to stored rows (10 schools
  cleaned: 67, 71, 74, 89, 91, 114, 122, 125, 158, 183). A full re-extraction was
  deliberately NOT done — the model is nondeterministic and a dry run lost fields
  (e.g. school 72: 5 → 0).
- **Caveat:** Cermat's per-program `zrizovatel` can disagree with reality (school 8,
  Obchodní akademie Praha s. r. o., is labelled public but charges real tuition).
  The guard treats any s.r.o./o.p.s./a.s. name as private for that reason. If
  another mislabelled school turns up, that heuristic is the place to look.

## Two of the 223 Prague schools are structurally unlike the rest — one may not belong in the database at all
- **Found:** 2026-09-23, while tracking down the 14 schools with no `website`
  stored (websites were found and scraped for 12 of the 14 — see the schools
  table for `id` in 115, 127, 145, 176, 204, 211, 215, 216, 217, 218, 222, 226).
  The other 2 are different in kind, not just missing data:
  - **ID 189**, "Střední odborné učiliště" (REDIZO 651036101, address Soudní
    988/1, Nusle) is **Vězeňská služba ČR's (Prison Service) internal
    vocational school**, run by the Ministry of Justice, teaching people
    currently serving prison sentences across 9 in-prison training centres. It
    has no public website and cannot have one that matters to this app — a 9th
    grader cannot apply here. Worth deciding whether this belongs in the
    `schools` table at all, or should be filtered out / flagged as not a real
    V9 option, since it will otherwise sit forever as "missing data" that isn't
    actually missing, just inapplicable.
  - **ID 227**, "Klinická univerzitní škola EduVia" (REDIZO 691020035,
    Kolovraty) is a **brand-new school founded by Charles University's Faculty
    of Education, opening for its first cohort in the 2026/2027 school year.**
    It has no website of its own yet — only a subpage on the faculty's site
    (`eduvia.pedf.cuni.cz`), which is about the founding, not a normal school
    site with admissions/tuition/programs content a scraper could usefully
    read. This one genuinely will get a real site eventually; re-check in a
    future term rather than treating the current gap as a scraping failure.
- **Not done yet:** a decision on ID 189 (exclude vs. keep-and-label), and a
  reminder to re-check ID 227 once EduVia's own site exists.

## School-details extraction exists; provenance and refresh acceptance remain open
- The September “only dry runs / not yet extracted / SQL absent” snapshot is superseded. Base extraction was rerun on all **219 cached schools** on 26 September, and six structured fields were extracted from that cache. This cache scope differs from 223 raw / 217 visible database schools.
- `school_extracted_details` has prose, number/boolean fields and the six structure columns. The matrix reads extracted tuition and maturita rates; school-life inputs are also connected. A connected field is not evidence that its source is current or accurate.
- Remaining work: review source/programme level, null/filler handling, cached URL/scope and dated coverage. Quote/plausibility checks do not prove factual correctness. See S03/S08–S12 in the deployment report.
- Canteen-negation and failed preservation-query guards are fixed (`06c704c`); existing candidate records 118/146/228 still need school-source review before any correction. Base refreshes must reconcile dependent structured fields.
- Dry runs may make paid provider calls and write usage accounting. Use a disposable project for acceptance; do not launch a paid full batch solely to resolve this ledger item.

## Structured extraction — deliberately NOT pursued: hodiny za předmět (hours per subject)
- **Found:** 2026-09-22, founder asked about extracting weekly hours per subject
  alongside tuition/admission/pedagogy — considered and rejected, logging the
  reasoning so it isn't silently re-proposed later.
- **Why not:** (1) school **marketing** websites (what's scraped today) essentially
  never publish a weekly-hours-per-subject table — that lives in the official ŠVP
  (školní vzdělávací program) curriculum document, a different source entirely,
  not part of the current Firecrawl scrape target. (2) Even if found, it isn't one
  number per school — it varies by obor/year/subject, so it doesn't fit
  `school_extracted_details`'s one-row-per-school shape; it would need something
  closer to a new `school_programs`-shaped table (per-obor granularity), a real
  project of its own. (3) Pushed to "give a number," a model is far more likely to
  fabricate a plausible standard-curriculum hour count than admit it doesn't know
  — the exact failure mode this whole pipeline exists to avoid.
- **Revisit if:** there's a specific plan to scrape/parse official ŠVP curriculum
  PDFs as a separate source, at which point this would be its own extraction
  pipeline and its own table, not an addition to `school_extracted_details`.

## Start-time preference removed; reintroduction needs useful data and options
- The standalone `zacatek` question was removed in the October work; its former zero-weight/no-op state is historical.
- `zacatek_hodin` is a display/source field, not a complete preference model. Reintroducing a scored question requires the preferred time, programme/day context, verified coverage and a defined scoring contract.
- Keep this deferred with the 7 October founder request; do not restore the old question because an extracted field exists.

## Shared beta access code — retired 2026-09-26
- **Status:** Replaced by plan 016's school-specific invitation links, required email confirmation, rolling access renewal through in-app feedback, and a configured program cutoff.
- **Compatibility:** `POST /api/me/redeem-beta-code` now returns `410`; remove any remaining references to `BETA_ACCESS_CODE` when updating deployment settings. The beta migration and settings are not applied to the live database yet.

## Season charge, cancellation and account deletion — paid-launch lifecycle gate
- The earlier “microsecond / mostly closed / low urgency” characterization was not supported by a concurrency test.
- A scheduler and cancellation/deletion can overlap. Deleting a Stripe customer after a payment was claimed or created does not prove that no charge succeeded, that a refund succeeded, or that billing references remain recoverable.
- Resolve purchase identity, atomic charge/cancel claims and reconciliation together with P01/P02/P06–P08. Use disposable accounts and test-mode Stripe; do not reproduce deletion/charge races against production.

## Monthly plan: auto-stop billing at 31 March (proposed 2026-09-22)
- **Found:** 2026-09-22, founder idea during minors/legal discussion — not yet built
- **Urgency:** Medium — legal upside (bounds a minor's commitment, closer to season's fixed-term shape, strengthens the §31 maturity-presumption argument) and product upside (removes "forgot to cancel" fear, likely nudges marginal monthly buyers toward season since the real ceiling becomes visible: up to ~1743 Kč worst case vs 690 Kč locked in)
- **Risk of fixing now:** None; deferred only by founder choice to finish the current legal batch first
- **Effort:** Medium — Stripe subscription needs `cancel_at` set to 31 March at creation (mirrors how the season scheduler already bounds its charge), copy changes in `pricing.js`, paywall screens, and `Legal.jsx` Terms §4/§7, and a decision on whether/how a user can resubscribe after March
- **Release/context:** `server.js` checkout session creation for `plan_id: 'monthly'`; `frontend/src/config/pricing.js`; `Legal.jsx`

Also decide: does this apply retroactively to subscriptions already running, or only new ones from the day it ships?

## Codex review requested: refund/withdrawal payment-tracking logic (2026-09-22)
- **Found:** 2026-09-22, founder asked for independent verification before relying on it
- **Urgency:** High — this is money-moving code (automatic Stripe refunds)
- **Risk of fixing now:** None; review only
- **Effort:** Small — read-only review
- **Release/context:** `server.js` — `withdrawalWindowEnd()`, `canWithdraw()`, `POST /api/subscription/withdraw`, and every webhook handler that writes `plan_started_at` / `last_paid_at`

What to check:
1. Is `plan_started_at` / `last_paid_at` actually set correctly on every path that creates a charge — `checkout.session.completed` (both `mode: 'setup'` and `mode: 'subscription'`), `payment_intent.succeeded` (webhook AND the synchronous result inside `chargeDueSeasonPasses()`)? Any path that charges money but skips these columns would let `canWithdraw()` silently return false when it should be true, or silently leave a stale date after a retry.
2. `WITHDRAWAL_DAYS` is now 30 (was 14) — is the 14-day statutory minimum still satisfied for every case, including a monthly renewal (which does NOT get a fresh window — is that actually correct per the general 14-day withdrawal rule, or does an extended 30-day *policy* window change that)?
3. `POST /api/subscription/withdraw`'s refund loop lists every Stripe PaymentIntent since `plan_started_at` and refunds all succeeded ones. For monthly, could this ever run when MORE than one charge exists inside the 30-day window (e.g. a plan changed mid-cycle, a manual re-bill), and if so would it over-refund?
4. Idempotency: is a double-click / retried `/withdraw` call provably safe (no double refund, no double DB write)?
5. The `since` buffer (`-3600` seconds) on the PaymentIntent list query — is an hour enough slack, and could it accidentally pull in an unrelated older charge on the same Stripe customer if they ever had a previous, separate plan?

## Accessibility follow-ups from 2026-09-22 legal audit
- **Found:** 2026-09-22, founder-requested legal/compliance checklist review
- **Urgency:** Low — not legally required at micro-enterprise size (see existing Accessibility Act entry), good practice only
- **Effort:** Small
- **Release/context:** whenever real school photos are added; design tokens for color

1. **Alt text** — no real `<img>` tags exist yet (checked: only a code comment references adding one). The moment real school photos ship, every one needs descriptive `alt` text.
2. **Color contrast** — not verified. Run the actual rendered colors from `frontend/src/design/tokens.js` through a contrast checker (e.g. WebAIM) before or shortly after launch, especially text-on-terracotta/moss accent combinations.

## Launch legal checklist — no lawyer, so transparency by default (2026-09-21)
- **Found:** 2026-09-21, founder cannot afford a lawyer before launch; legal pages rewritten with no lawyer placeholders and the most consumer-friendly option wherever the law leaves a choice
- **Urgency:** Launch blockers (each item below)
- **Risk of NOT fixing:** ČOI fines (up to 5 M Kč for consumer-law breaches), GDPR complaints to ÚOOÚ, refund disputes
- **Effort:** Small to medium each; most are operational, not code
- **Release/context:** `Legal.jsx` (Terms + Privacy), Stripe dashboard, an inbox for the operator e-mail

Before real money, do ALL of these:
1. **Operator facts** — fill every `[DOPLNIT]` in `Legal.jsx`: adult/company name, IČO, address, e-mail, VAT payer or not, Supabase region, e-mail provider. Then set `DRAFT = false`. The same adult must own the live Stripe account and keys.
2. **Withdrawal process (Terms §6)** — one inbox that gets the operator e-mail; on a request: refund in the Stripe dashboard within 14 days, cancel the subscription, set the account to canceled. Same for the "minor paid without parent consent → full refund" promise (§7). `REFUND_GUARANTEE_DAYS` stays 0.
3. **Withdrawal button — BUILT 2026-09-21; legally mandatory from 1 Jan 2027** (Act 159/2026 Sb., per Cowork research `docs/legal-research/01-…`; verify the effective-date article on e-sbirka.cz). `POST /api/subscription/withdraw` + Settings "Odstoupit od smlouvy" → confirm details (name, e-mail, plan, date) → "Potvrdit odstoupení od smlouvy". Stops billing, refunds every payment since the plan started (idempotent), ends access. Still to do: (a) test in Stripe test mode: monthly, season before charge, season after charge; (b) Stripe dashboard → turn ON "Email customers about refunds"; (c) the acknowledgement e-mail with date/time on a durable medium (item 4, needs SMTP); (d) the enacted Czech button labels were only reported by secondary sources — check them.
4. **Every e-mail that law requires but the app does not yet send — all blocked on the SMTP provider (item 5).** None of this exists today: there is no outgoing-mail code beyond Supabase Auth's own confirmation/reset e-mails. Build in this order once SMTP is chosen:
   - **Order confirmation (§1824, durable medium)** — after `checkout.session.completed`, e-mail the account holder: the terms as they stood at purchase (link + timestamp is enough, a PDF is not required), the plan, price, charge date, and the withdrawal form. Stripe's own receipt (once turned on, see item 10) is not a substitute — it doesn't carry the terms.
   - **Withdrawal acknowledgement (§1830a point 4)** — `POST /api/subscription/withdraw` must e-mail an acknowledgement of receipt with the exact date and time of the request, "without undue delay". The endpoint already returns this data (`at`, `refundedCzk`) — just needs a mailer call added.
   - **Review report outcome (DSA Art. 16(4)-(5))** — confirm receipt of a report immediately (in-app receipt already ships), then e-mail the reporter the decision once a human resolves the hold, with redress info.
   - **Review moderation notice (DSA Art. 17)** — the in-app statement of reasons already covers "at the latest when imposed"; an e-mail copy is good practice but not required since the reason is visible in the app immediately.
   - **Season-pass pre-charge reminder** — not a legal requirement, but see the existing UNFORGET entry on Supabase's 2/hour cap; bundle this mailer work with that one.
5. **Custom SMTP + re-enable Supabase e-mail confirmation** (existing entries).
6. **Processor agreements (DPAs)** — accept the standard online DPAs of Supabase, Stripe, Vercel, Railway, OpenRouter, Cloudflare; keep a simple record of processing activities (Art. 30) and a data-breach plan (notify ÚOOÚ within 72 h).
7. **Order button** now reads "Objednat s povinností platby" (Platba.jsx, SubscriptionExpired.jsx) — do not rename it back. **2026-09-22: the payment checkbox is removed entirely** (both screens, both plans) — founder decision: since self-attestation gave no real legal protection anyway (a lying minor's claim survives §581 regardless of what was ticked), keep the friction-free checkout and rely on the refund promise (item 9) instead. `paymentConsent` is gone from `api.js`/`server.js`/tests.
8. **Inactive accounts** are not auto-deleted (stated honestly in the policy); add an automatic rule later.
9. **Minors, both plans, 2026-09-22 decision:** founder chose to let under-18s buy either plan and treat the refund promise as the mitigation instead of gating by age. Both plans now carry the same rule (Terms §7): no age/consent check at checkout, full refund within 30 days of payment if a parent objects, pro-rata after that. **Known residual risk, accepted deliberately:** an adult can falsely claim to have been a minor to invoke this refund path; there is no way to disprove it. The self-service withdrawal button (item 3) now uses a 30-day window for everyone (see below), which delivers the "full refund within 30 days" half automatically; the pro-rata-after-30-days half stays a manual Stripe-dashboard calculation — for a monthly plan, pro-rate only the days remaining in the CURRENT billing cycle, never earlier already-billed months (those were already delivered and had their own closed window).
   - **Refund abuse by minors:** the season-pass "use it all season then refund near the end" loophole is closed by the 30-day/pro-rata structure — refunding after the DiPSy deadline returns almost nothing.
   - **Built in plan 018 (parent pays via link); whether this changes the §31 contract-capacity analysis needs a human/legal look.**
10. **Season charge vs account deletion** — mostly closed by deleting the Stripe customer before the user row; only a microsecond window remains.
11. **Accessibility Act** — micro-enterprises are exempt; revisit if the company grows.
12. **DSA follow-ups (Cowork file 06):** review authors see the statement of reasons in-app (Art. 17); report form asks for reason + good faith (Art. 16). **2026-09-22: reporting no longer requires an account** — `POST /api/reviews/:id/report` is `optionalAuth`, `review_reports.user_id` is nullable (run the SQL below), anonymous reports still rate-limited by IP via `reviewLimiter`. Still missing: receipt/outcome e-mails to the reporter and the author need SMTP; Art. 11 contact point in Terms §9 needs the operator e-mail; DSC in Czechia will be ČTÚ (Czech implementing law still pending).
13. **Re-check the law before launch** — the withdrawal-button status (now known: 1 Jan 2027), ČOI ADR details, and the age-of-consent rule (15) can change.

## Privacy policy + terms — Codex fact-check and open placeholders
- **Found:** 2026-09-21, drafted from what the code actually does; 14-day withdrawal right added 2026-09-21
- **Urgency:** Medium — Codex review and placeholder fill before launch
- **Risk of fixing now:** None; the 14-day withdrawal right is EU law, not a promise — we're just stating it clearly
- **Risk of NOT fixing:** Selling with incomplete terms (operator info missing) or undeclared processors
- **Effort:** Small — fill `[DOPLNIT]` placeholders, Codex fact-check, launch ready (no lawyer needed for the 14-day statement itself — it's the law)
- **Release/context:** `frontend/src/pages/Legal.jsx` (routes `/obchodni-podminky`, `/ochrana-osobnich-udaju`, footer links in `Layout.jsx`). Account deletion now deletes Stripe customer. Signup has age/consent checkbox.

Set `DRAFT = false` in `Legal.jsx` after Codex report and placeholders filled.
- **OPERATOR — add BEFORE LAUNCH:** name/firma, IČO, address, e-mail, VAT status. Must be an adult or company. Placeholders `[DOPLNIT]` in both pages; same adult holds live Stripe keys.
- **14-day withdrawal right:** now stated plainly as EU law (no checkbox, no digital-exemption attempt). Compliant as-is; users have the right, most won't use it. Codex should verify the wording matches the Directive.
- **Minors:** signup has required checkbox "15+ or parental consent, I accept terms" and stores `accepted_terms_at`. Self-declaration only (not verified by age); this is a reasonable baseline for a student product, but a lawyer should confirm before real-money launch. The checkbox is not trying to remove consumer protections, just documenting consent.
- **OpenRouter/Gemini:** Codex to verify quiz answers can't carry personal data to the model (policy says name/email never sent).
- **Supabase region, inactive-account retention, SMTP provider name, payment data retention** — fill from actual setup.

## Production test of the season-pass scheduled charge
- **Found:** 2026-09-21, after the first live-site test-mode purchase
- **Urgency:** Launch blocker — must pass before live Stripe keys
- **Risk of fixing now:** None; deferred only to prioritise legal pages.
- **Risk of NOT fixing:** The webhook and card-save path is proven on production, but the Railway scheduler charging 690 Kč when `season_charge_due_at` arrives has only been proven locally.
- **Effort:** Small — set `season_charge_due_at` to a past time for the test account in Supabase, wait for the scheduler, confirm exactly one 690 Kč test charge, `season` status, access until 31 March
- **Release/context:** Stripe test-mode matrix; run on production (Railway) with `sk_test_*` keys

The test account `vojtech.kadlec@montetrida.cz` currently holds a saved SetupIntent with a
charge due 2026-09-24 (the scheduler will charge it on its own then — the test can just
observe that). Also re-run the no-double-charge check after a Railway restart.

## UI consolidation plan 012 — implementation and signed-in verification pending
- **Found:** 2026-09-21, browser-first UI audit with `/codex-plan-then-build`
- **Urgency:** High for mobile search/detail usability; implement after plan approval
- **Risk of fixing now:** Shared CSS and dialog behavior affect questionnaire/onboarding consumers; an unbounded library migration would enlarge the change substantially.
- **Risk of NOT fixing:** Mobile filters delay results, detail contact links crowd the fixed action bar, empty map results lose recovery, and dialog focus behavior remains incomplete.
- **Effort:** Medium–large, four bounded implementation chunks
- **Release/context:** Existing search, school detail, auth, settings and shared UI quality

The handoff is [plan 012](plans/012-ui-system-consolidation.md). It includes exact
files, resolved design decisions, browser evidence and verification requirements.
It is **proposed, not implemented**. Colors and UI dependencies remain unchanged.
Signed-in settings and confirmation dialogs were inspected in source only because
the audit browser was anonymous; their visual/keyboard checks must be completed
with a suitable development/test session during implementation. Keep the matrix's
separate confirmation migration under its existing review gate below.

## Search map labels overlap; map resize needs a separate check
- **Found:** 2026-09-21, plan 012 browser audit of `/skoly` map view
- **Urgency:** Medium — map usability on mobile/tablet
- **Risk of fixing now:** Marker grouping/selection and Leaflet sizing require a focused map check and could distract from the existing-system consolidation.
- **Risk of NOT fixing:** Dense results are difficult to identify; viewport changes can leave part of the map without tiles.
- **Effort:** Medium; reproduce sizing separately before deciding the label solution
- **Release/context:** Search map; deliberately outside plan 012 except for zero-result recovery

With 223 schools at 768×1024, many full-name labels overlapped into a dense pile.
Changing viewport size also left partially filled map tiles. Inspect
`frontend/src/components/SchoolMap.jsx` marker labels and container resize handling;
verify `invalidateSize` on actual layout changes before choosing a clustering or
selected-label design. Do not infer that this needs a replacement map library.
Recheck filtered results, selected school, fullscreen and mobile/desktop transitions.

## Audit follow-up: current-state documents need deliberate consolidation
- **Found:** 2026-09-20 during the repository cleanup review
- **Urgency:** Medium — resolve before relying on the repository docs as an agent handoff
- **Risk fixing now:** Editing instruction and source-of-truth documents casually could change future agent behavior, erase useful historical context, or hide a real product decision.
- **Risk NOT fixing:** Agents can load conflicting or stale guidance and plan from incorrect product status, especially around payments, design provenance, and completed work.
- **Effort:** Medium; requires a focused documentation pass and one source-of-truth decision
- **Release/context:** Documentation reliability, future Claude Code/Codex collaboration, and launch planning

Potentially dangerous cleanup is intentionally deferred until it can be reviewed as a
single change:

- ~~Reconcile `AGENTS.md` and `CLAUDE.md`.~~ Done 2026-09-21: synchronized current guidance, separated only agent-specific paths/invocation notes, and removed obsolete historical sections.
- Review stale `PROJECT-OVERVIEW.md`, the near-empty root `README.md`, `docs/skolamatch-current-status.md`, and `plans/README.md`; decide which is authoritative before rewriting or deleting anything.
- Mark or replace `plans/009-stripe-payments.md`, which describes a materially superseded payment architecture. Keep the payment safety warning until the current implementation has its own verified plan.
- Decide whether the design provenance copies under `design/system/uploads/` and `design/Logo Concepts Refinement Request/uploads/` should remain, be normalized, or be archived. They may be useful source material even where they duplicate current design files.
- Review `.codex/agents/onboarding-architect.toml` and the imported `.agents/skills/` copies before committing or adapting them; they can affect how future agents act and currently include local/tool-specific assumptions.

---

## 🚨🚨🚨 STOP. DO NOT GO LIVE WITH STRIPE UNTIL THIS IS DONE. 🚨🚨🚨
- **Found:** 2026-09-13, founder request, explicit and urgent
- **Urgency:** MAXIMUM — this is the single highest-consequence item in this
  entire file. Everything else in UNFORGET.md is a product/UX gap. This one is
  "real families get charged real money incorrectly and we get sued for it."
- **Effort:** a real testing session, not a quick look — hours, not minutes
- **Release/context:** plan 009 (`plans/009-stripe-payments.md`), the whole
  payment surface: `server.js`'s `/api/checkout`, `/api/subscription/cancel`,
  `handleStripeWebhook`, and every place `subscription_status` /
  `access_expires_at` get written or read

**The founder's own words, verbatim reasoning, kept because it matters:** a bug
almost anywhere else in this app is annoying. A bug in the payment path is not —
if a family gets **double-charged**, or charged after they cancelled, or charged
a wrong amount, that is not a bug report, that is a **lawsuit risk**, real money
taken from real parents' cards without consent. This is categorically different
from every other item in this file and must be treated that way.

**Before a single real (`sk_live_`) key ever goes into Railway, do ALL of this —
not a spot check, an actual deep review:**

- [ ] Write and run a verification matrix for the **current** implementation
  (plan 009's subscription-based season design is superseded): Stripe test mode
  + CLI, SetupIntent completion, advancing past `season_charge_due_at`, the
  off-session PaymentIntent, webhook retries and access expiry — not just "it
  looked fine in the dashboard."
- [ ] Specifically hammer on the **double-charge scenarios**: does clicking
  "buy" twice in a row ever create two subscriptions for one person? Does a
  webhook retry (Stripe resends on any non-200 response) ever cause a second
  write that bills twice? Does cancelling *during* the exact moment a webhook is
  in flight leave the account in a state where it still gets charged anyway?
- [ ] Specifically verify **cancellation actually stops future money movement**
  — cancel a season pass during its trial, confirm `season_charge_due_at` is
  cleared, then run the scheduler and prove no PaymentIntent is created. Cancel
  a monthly plan and confirm the next renewal genuinely does not fire.
- [ ] Verify the season scheduler creates exactly one PaymentIntent, survives a
  process restart/database retry through its stable idempotency key, and grants
  access only through the intended March 31 boundary.
- [ ] Have a second person (ideally an adult who will eventually own the real
  Stripe account per plan 009 §11) look at the flow with fresh eyes before real
  money is ever involved. A founder who has stared at this code for hours will
  miss things a stranger won't.
- [ ] Only after all of the above: read plan 009 §11's "before real money"
  checklist (adult account owner, trade licence, VAT, refund process, legal
  pages) — that list is necessary but is NOT a substitute for this technical
  review. Passing §11 and skipping this checklist is not safe to launch on.

**This item does not get removed from this file until it has actually been done,
not until it has been remembered.** Checking a box above without actually running
the test it describes defeats the entire point of writing this down.

---

## Rebrand decision needs founder reconciliation — September proposal, current brand unchanged

**9 October:** the current site/domain use Střední na míru; founder confirmation was requested about whether the September rebrand remains intended. Keep the history below as a proposal/decision record until answered; do not rename product/domain or erase the decision unilaterally.
- **Found:** 2026-09-13, founder decision
- **Urgency:** medium — doesn't block current work (Stripe test-mode products,
  deployment) since none of that depends on the brand name, but should happen
  before real users/schools see the product, and definitely before the domain
  purchase or the Stripe business name are finalized
- **Effort:** medium — mostly find-and-replace, but touches many surfaces and
  needs a careful pass, not a blind sed
- **Release/context:** the name "Střední na míru" was always a placeholder (CLAUDE.md
  says so explicitly). Founder considered "Moje střední", "Škola pro mě", "Vyber
  si školu", "Kam dál?", "Škola na míru" and settled on **"Kam na střední?"** —
  it's literally the question the target user (a 9th grader or parent) already
  has in mind, reads naturally in speech for word-of-mouth/creator-driven
  acquisition, and doesn't lock the product into one narrow framing the way
  "Moje střední" would.

**What "done" looks like — surfaces that need the rename:**
- `CLAUDE.md` — "branded **Střední na míru**" and every other mention throughout
  (this file references the name dozens of times as the project's identity)
- Every doc in `docs/` (`skolamatch_current_status.md`,
  `skolamatch_90_point_context.md`, `skolamatch_full_launch_marketing_plan_v2.md`)
  — filenames themselves reference the old name, worth considering whether to
  rename the files too or just their content, given they're referenced by path
  elsewhere
- User-facing copy in the frontend (page titles, `index.html`, any literal
  "Střední na míru" string in onboarding/paywall copy — grep for it, don't assume
  the list above is exhaustive)
- The eventual custom domain purchase (founder is buying one specifically to
  drop the `.vercel.app` suffix — should reflect the new name, not the old one)
- The Stripe business name, once an adult owns the account and it goes live
  (not urgent today — test mode doesn't care what anything is called)
- `plans/README.md` / `UNFORGET.md`'s own historical entries can keep saying
  "Střední na míru" where they're describing past decisions — this is a rename of
  the *current* identity, not a rewrite of history

---

## Pricing logic, discounts and offers need a proper pass — not just the one-time offer

**Current qualification, 9 October:** the 249/690 prices and season-first structure are settled. This entry retains discount/affiliate proposals; DSA applicability is a legal assessment, not a proved violation from a countdown alone.
- **Found:** 2026-09-13, while planning Stripe (plan 009)
- **Urgency:** medium — nothing is broken or live, but it blocks charging at full
  intent, and one piece of it (the offer) had to be switched off to ship payments
- **Effort:** medium — part product decision, part backend work
- **Release/context:** `frontend/src/config/pricing.js`, plan 009 §7

Plan 009 **disables the one-time 30% first-view offer** (`ONE_TIME_OFFER_ENABLED
= false`) rather than shipping it, because its entitlement was a localStorage
stub: clearing cookies or opening an incognito window resurfaced it, which makes
the "jen teď, jednorázově" claim false in practice. Shown to minors that is a DSA
Art. 25 dark-pattern problem, not a rough edge. The unused localStorage prototype
was removed on 2026-09-19; the disabled offer constants remain as the product decision.

But the founder's own framing was broader than that one flag: **the pricing model
as a whole is not yet what they want.** Things in this area that are known-unsettled:

- **The one-time offer itself** — needs a real server-side entitlement before it
  can be honestly shown: `one_time_offers(user_id pk, offer_id, granted_at,
  expires_at, consumed_at)` plus `POST /api/offers/one-time/claim` and
  `GET /api/offers/one-time/status`, with the server as the only thing that decides
  eligibility. This needs a fresh implementation if the offer survives the product
  decision; there is no client entitlement module to revive.
- **Prices are settled** — 249 Kč monthly / 690 Kč season, locked on 21 September. Verify frontend/server/Stripe/terms agreement rather than reopening them.
- **Withdrawal/guarantee** — the optional badge is disabled (`REFUND_GUARANTEE_DAYS = 0`); actual Terms/server withdrawal is 30 days. Applicable statutory and voluntary calendar/renewal boundaries still need qualified review.
- **Discount / affiliate mechanics generally** — the launch plan leans on
  influencer affiliates paid on realized revenue, but there is no promo-code,
  referral-attribution or affiliate-payout concept anywhere in the code or in
  `pricing.js`. Stripe supports promotion codes natively; nothing uses them.
- **Parent payer / child account** — plan 018 implements scoped links; sharing remains disabled until end-to-end acceptance. The account, payer and management/revocation boundaries still need verification.

**What "done" looks like:** a deliberate sit-down on the pricing model — real
numbers, whether discounts/promo codes exist at all and in what form, how
affiliates get attributed and paid, and what the refund window actually is —
followed by the server-side entitlement if the one-time offer survives that
conversation. Until then payments ship at full price with no offer, which is the
honest default.

---

## School catalogue completeness and merge review — historical Atlas candidates
- The 13 September Atlas comparison was a candidate list, not an official-register completeness proof. Do not delete school rows or assign REDIZOs from fuzzy names alone.
- Read-only 8 October checks found **223 raw rows, 217 visible schools, six merged rows and no duplicate non-null REDIZO**. Old duplicate-row/collision claims are superseded; merged rows still own programmes and need explicit import/projection handling.
- Previously flagged possible omissions included OA Dušní, Vinohradská and Hovorčovická, Akademie VŠEM, Gymnázia Čakovice / Na Pražačce / Botičská / Budějovická / Na Vítězné pláni, Meridian and SRAZ. Reconcile each against current rows, addresses, official register status and REDIZO before calling it missing or adding it.
- Atlas absence, Cermat inclusion and one school website each cover different scopes; none alone proves every currently active Prague secondary school/campus is represented. See C06/S02/S06/S12. Founder confirmation of the landing completeness claim remains pending.

## Railway billing/runway — verify current dashboard before beta
- The 13 September deployment recorded a 30-day limited trial and $4.99 credit. Those are historical values, not a verified current plan or expiry date.
- The production backend answered the read-only 8 October health probe. This proves availability at that moment, not paid billing, remaining credits, restart resilience or continued service through beta.
- Founder/manual check: confirm the actual plan, remaining usage/credits, payment method and any trial deadline in Railway. Resolve runway before inviting testers. No upgrade, charge or infrastructure migration was performed by this audit.

## Selectivity preference — partly implemented; cross-surface behavior still needs review
- The standalone questionnaire now asks `selektivita_vyzva` and `selektivita_tezka`; `lib/matching.js` has a weighted selectivity dimension. The former “no input anywhere” claim is superseded.
- Onboarding, matrix, search sorting and comparison still need a deliberate shared interpretation. Do not assume a preference in one scorer controls every surface, or treat a historical cutoff as an admission probability.
- Review wording for students who want challenge versus lower entry difficulty, and test contradictory/skipped answers, missing/older cutoffs and the same school with the same data. Preserve neutral detail explanations; do not infer student quality or teaching quality solely from a cutoff.

## Rozhodovací matice needs a real human review pass
- **Found:** 2026-09-12, user request right after the tooltip/confirm-dialog/
  "jak to funguje" additions landed
- **Urgency:** medium — the tool is live and usable, but nobody has actually
  sat with it and judged whether it's *right*, only whether it runs
- **Effort:** unknown until someone actually does the review — could be "looks
  fine" or could be a real redesign, depending on what falls out
- **Release/context:** applies to `/porovnani/matice` (`Matice.jsx`,
  `decisionMatrix.js`, `decision.css`) as it stands after plan 007 and
  today's tooltip/explainer/confirm-dialog additions

The user's explicit ask: take a proper look at the whole matrix, not just
whether each individual piece works. Three things named specifically:

1. **How well the tool actually behaves** — does the ranking feel right when
   you actually use it with real schools and real weights? Does the Zásadní
   confirm-dialog guard feel helpful or annoying in practice? Does the
   "gap"/"weak spot" callout logic (`gapNote`/`weakNote` in `Matice.jsx`)
   trigger at sensible moments, or does it fire too often / too rarely /
   with confusing phrasing?
2. **Are the explanatory notes good enough** — the per-criterion tooltips
   (`CRITERIA[].tooltip` in `decisionMatrix.js`) and the new "Jak to funguje?"
   panel were written by Claude reasoning about what should be clear, never
   checked against an actual person reading them cold. Same category of gap
   as the "AI feature prompts need real human editing" entry above, but for
   UI copy instead of AI-generated prose.
3. **Do things like "typ školy" actually match your real plans** — the `typ`
   criterion ("Typ školy odpovídá mým plánům") is explicitly a crude
   placeholder today: it only checks whether the school offers a maturitní
   obor, because there's no real "what are you planning" input yet (see its
   comment in `decisionMatrix.js`). Worth asking, criterion by criterion,
   whether what's actually being measured matches what the label promises,
   or whether some of them are placeholders that have quietly become
   permanent.

**What "done" looks like:** the user (or someone else) actually uses the
matrix with real comparisons for a while, and either signs off on it as-is or
comes back with specific things to fix — not a generic "looks fine" without
having exercised it.

---

## AI explanations and pros/cons need a real Czech/source-quality acceptance pass
- On-demand school explanations are implemented (plan 020 Phase 5); questionnaire submission saves deterministic scores without requiring a generation call. The October code default is `openai/gpt-6-luna`; deployment environment/provider settings still need controlled generation verification.
- `scripts/generate-school-proscons.js` is built. Its output is cached by school, not generated on every page load. The earlier “not built” and Gemini-only claims describe old snapshots.
- A human should judge actual Czech output for teenager/parent voice, evidence, absent data, programme focus and meaningful tradeoffs. Validate each prompt/model route separately; JSON shape and a 200 authentication probe do not establish quality.
- See S11/S12 for paid dry-run/accounting side effects, catalogue/year/focus scope and cache fingerprints. Do not rerun the whole paid corpus until these input contracts are verified.

## Fix school suggestions
- **Found:** 2026-09-09, user request
- **Urgency:** medium

User flagged this needs fixing — no further explanation given, user says
they'll understand the context when it comes back up.

---

## School detail page §4 marginal (🟡) features not built
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low
- **Effort:** each is its own small-to-medium feature
- **Release/context:** feature-brainstorm.md §4; explicitly deferred per the
  user's instruction to build 🔥/✅ only, skip 🟡

- **Virtual 360° tour** — 🟡, expensive to produce; a school would have to
  supply it, we have no pipeline to make one.
- **Notable alumni** — 🟡, no data source and no way to verify a claim like
  this without real risk of getting it wrong about a named person.
- **School news / announcements feed** — 🟡, "only if schools maintain it" —
  no school-side posting surface exists yet (that's §9, B2B/school-side).

---

## Q&A section (ask current students) deferred
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low
- **Effort:** medium — schema/moderation mostly reusable from reviews
- **Release/context:** feature-brainstorm.md §4 ✅; deferred per explicit user decision

Reviews shipped for real (see CLAUDE.md → "User-generated content"); Q&A did
not, on purpose — it doubles the moderation surface and needs current
students actually answering to be worth anything, which reviews alone don't
prove exists yet. When this gets built, reuse `school_reviews`'s moderation
shape (word filter → held, report → held) rather than inventing a new one —
a question/answer thread just needs one more table (`school_questions`,
`school_answers`) following the same `requireAuth`-only, no-client-RLS-policy
pattern as reviews.

---

## Review verification has no mechanism
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low
- **Effort:** depends on which option — manual is trivial, the others are real features
- **Release/context:** every review currently reads "Neověřeno"; `verified`
  exists on `school_reviews` but nothing sets it to true yet

Options to decide later, not decided now:
1. **Manual** — you flip `verified` by hand in Supabase for reviews you have
   some independent reason to trust. Zero engineering, does not scale.
2. **School-domain e-mail** — a reviewer whose account email matches the
   school's own domain (from `schools.website`) gets auto-verified. Cheap,
   but only works for staff/students with a school email, not parents.
3. **School-claimed profile** — ties into the §9 B2B "claimed profile badge"
   feature: a school that has claimed its profile can verify specific
   reviews itself. The most correct long-term answer, but depends on B2B
   tooling that doesn't exist yet.

---

## Comparison and decision tools — built; final acceptance remains
- `/porovnani`, `/porovnani/matice` and application picks exist and are linked from search/detail. The September no-op/unbuilt claim is superseded.
- Remaining gates are scoring/projection/year consistency, meaningful matrix criteria, account ownership, initial-load recovery and transactional/versioned shortlist replacement (B01–B03/C02/C03/C13–C16). `5c097aa` prevents the original failed-initial-read overwrite; it does not close the other gates.
- Browser checks already exercised the synthetic comparison/matrix and corrected language-of-instruction wording. They do not replace real-account, keyboard, missing-data and device acceptance or the founder's matrix-quality review.

## Parent/child share links — built in plan 018

One account still belongs to the child; no link creates a session or grants app
access. Results links are read-only and mirror the owner's entitlement when
opened. Before an account exists, Reveal creates a 30-day snapshot containing
one school, its score, the fitting-school count and role. A parent payment link
lets the parent pay for and manage only the child's plan. A parent can also send
a seven-day questionnaire handoff; the child answers locally on their own device,
and the parent's onboarding stays locked until the child finishes or the parent
revokes the link. No email delivery was added.

- **Human review:** `frontend/src/pages/Legal.jsx`'s privacy policy must explain
  bearer-link access, that the payment page shows the child's first name, and
  the `share_links`, `quiz_handoffs` and `result_snapshots` data. The implementer
  did not write policy language.
- **Cleanup:** there is no job for expired `quiz_handoffs`, `result_snapshots` or
  payment `share_links`. They are filtered at read time; add periodic deletion if
  these tables grow.
- **Payment-link revocation:** deleting a payment link removes the parent's
  ability to cancel or withdraw through it. The student can still cancel in
  Settings.

## Parent sharing remains disabled; app-content email delivery is not implemented
- Sharing features are built but `SHARING_ENABLED` remains false pending the two-device/payment-link acceptance gates. Do not re-enable them from an old copy-link instruction.
- Supabase Auth confirmation/reset mail and custom SMTP are separate from application-content messages, receipts and trial reminders. Auth mailbox success does not demonstrate those app email jobs exist.
- If direct email sharing is approved later, assess recipient verification, bearer-link privacy and retention. Copying a bearer link can also disclose child data to anyone who receives it; it is not inherently exempt from this assessment. Keep scoped revocation and payer-management limitations explicit.

## Missing or sparse school details — verify each field's actual source
- Scraped/extracted tuition, maturita results, meals, accommodation, clubs and teaching-style fields exist; the former “no data at all” statement is superseded. Coverage and programme/year applicability vary, and a website-derived number is not an official uniform dataset.
- The matrix's maturita/tuition criteria are connected; university continuation and dorm facts remain display-only pending coverage/meaning review. Unknowns must remain unknown, with useful provenance and dates.
- School photos/video, director identity, alumni/outcomes and a verified uniform official maturita/university-destination import still need source and licence decisions. Do not infer university placement from maturita success or charge zero tuition merely because a school is church-run.
- See extraction tasks and S03/S09/S10/S12 before scraping or changing stored school facts. Do not mirror the current delete-before-insert admission importer until its data-loss gate is resolved.

## Minor privacy and payment contracting — qualified review still required
- Czech law sets the Article 8 information-society consent threshold at **15**, as [ÚOOÚ explains](https://uoou.gov.cz/verejnost/zakladni-prirucka-k-ochrane-udaju). School grade alone does not establish age. Article 8 concerns consent-based processing in its defined scope; it is not universal permission for every child-data use or a payment-capacity rule. [GDPR Article 8](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng).
- The checkout parental-confirmation checkbox was deliberately removed on **22 September**. Account creation has its age/guardian acknowledgment; a parent-payment link is built but disabled pending testing. Do not restore the historical checkbox or treat a parent's card as proof of the contracting party/authority.
- Before real billing, get Czech consumer/contract/privacy review of minor contracting, operator identity, consent evidence, durable terms and the voluntary 30-day withdrawal promise. The no-charge beta also needs its child-data/telemetry assessment.
- The Digital Fairness Act is a legislative initiative in the [Commission's 2026 work programme](https://commission.europa.eu/document/download/aa8d20ed-148f-4eaa-b8ea-92be7acdaee6_en?filename=CWP_2026_explained-version6_0.pdf), scheduled for Q4 2026. This schedule is not an enacted blanket autoplay/countdown ban or a compliance approval of this site. Existing consumer/privacy rules remain separate.

## Pricing settled; lifecycle and disclosure checks remain before billing
- Prices locked 21 September: **690 Kč season**, one time after a three-day purchase trial; **249 Kč monthly**, immediate recurring charge with no purchase trial. Season remains preselected.
- `REFUND_GUARANTEE_DAYS = 0` disables an extra badge. It is not the actual withdrawal cutoff: Terms/server currently grant **30 days**. Do not shorten this from an old 3-day placeholder.
- The ordinary access trial has a separate approved first-confirmed-sign-in change pending; beta has neither a paid nor a commercial free-trial requirement.
- Verify season dates, daily/savings denominators and UI/server/Stripe/terms consistency, cancellation/refund integrity, operator and emails before live keys. Commercial prices are not awaiting another founder decision.

## Multi-page paywall — decisions deferred out of the 2026-09-05 redesign

**Current qualification, 9 October:** prices/plan order are settled, the checkout parental checkbox is removed, and cancellation UI/API exists. `perDayCzk()` rounding is a formatting choice, not a confirmed bug; the material issue is its fixed seasonal denominator and date clarity (FE-10). Testimonials require explicit publication consent, human selection and free-beta disclosure. Video/countdown work remains a proposal and must satisfy reduced motion/accessibility and applicable law.
- **Found:** 2026-09-05, designing the 5-screen paywall
  (`design/paywall-multipage/`, artifact `7b40dacd`)
- **Urgency:** medium — none of these block the design proposal, all block go-live
- **Risk of fixing now:** the one-time offer specifically was deferred by explicit
  user instruction — do not reintroduce it without them raising it
- **Effort:** mixed, per item
- **Release/context:** blocks Stripe go-live alongside the pricing decisions above

1. **One-time discount offer — judgement deliberately postponed.** The user asked
   for it to be left out of the multi-page paywall and revisited later. Its disabled
   configuration remains in `pricing.js` (ruling C-9); the unsafe localStorage
   entitlement prototype was deleted as dead code. The open question is whether a 15-minute
   countdown belongs on a paywall aimed at minors at all: the Mobbin survey files
   manufactured countdowns as its headline anti-pattern, and
   `pricing_research.md` §4 puts countdown-plus-minors in the DSA Art. 25 zone.
   Note the discount itself is genuine (the price returns to normal, the product
   never becomes unavailable), which is what keeps it arguable rather than settled.
   **Decide before Stripe go-live; until then it stays out of the flow.**

2. **Real user reviews on the paywall, once there are real users.** Deliberately
   nothing today: `frontend/src/config/socialProof.js` is empty on purpose and the
   paywall says out loud that we don't publish invented reviews. Once the app has
   launched and genuine reviews exist, fill `STUDENTS_HELPED` and `TESTIMONIALS` —
   the count line and an attributed quote then appear above the method claims with
   no component change. Per the Mobbin survey, a review must carry a **named
   attribution and a source** to do any work; a bare five-star row is worth nothing.
   Both persona branches need their own quotes (student and parent read different
   proof — authority for the parent, peer for the student).

3. **Card-gated trial contradicts our own research — accepted knowingly.**
   `pricing_research.md` §4 records that the Digital Fairness Act direction "would
   restrict collecting payment details upfront purely to gate a trial." Not binding
   law, and it is the industry norm — but the audience here is minors, which is the
   exact combination §4 flags. Built per the user's explicit instruction. Revisit if
   the DFA is adopted, or if a Czech consumer-law review ever happens.

4. **Trial placement — resolved in code, still needs real-user validation.** The
   trial is on Sezónní and Měsíční has no trial. Season Checkout saves the payment
   method and the server schedules one PaymentIntent three days later; monthly is
   a normal recurring subscription. Do not flip the flags independently of those
   backend semantics.

5. **`/api/schools*` must be gated once the free tier is gone.** CLAUDE.md records
   it as *deliberately* ungated because the onboarding quiz reads school data before
   an account exists. With no free browsing that reasoning partly lapses — but the
   quiz still runs pre-account, so the gate has to distinguish "quiz scoring a
   session" from "browsing the database". **`withMatchScores` must survive whatever
   query replaces it**, or every match percentage in the app disappears silently.

6. **`perDayCzk()` formats money to one decimal.** `pricing.js` uses `toFixed(1)`,
   producing "3,3 Kč" where Czech prices want "3,30 Kč". Cosmetic, one character,
   but it sits on the largest number on the plan card.

7. **Video paywall — recommended, not built.** A 15–20s silent looping screen
   capture (ranked list scrolling, then one explanation card expanding) on the value
   screen would carry the "what am I actually buying" job better than any copy, and
   the Mobbin survey backs showing the artefact over describing it. Not built
   because the video has to be recorded, not coded. If the user records one, it
   drops into screen 1 above the headline. Keep it silent, autoplay, looping, with a
   static poster frame — no audio, no controls, no fake UI.

---

## Stripe live activation — prohibited until payment gates pass
- Checkout, webhooks, cancellation/withdrawal and the season scheduler exist, but unresolved P01–P09 defects mean the remaining work includes code/architecture as well as operational verification.
- The 8 October read-only probe confirmed test mode, an active CZK 249 monthly Price and an enabled webhook. Charges/payout eligibility and missing support details still need account-owner verification; no live-money acceptance was established. Season deliberately has no Stripe Price.
- Complete purchase/concurrency/event/refund/recovery tests, legal/operator review, durable confirmations and the founder-required day-2 reminder before enabling live keys. Beta must remain outside Stripe.

## Billing delivery and consumer review — project release requirements
- A **day-2 seasonal trial reminder is mandatory by founder/project policy before real billing**, and `TRIAL_REMINDER_IMPLEMENTED` remains false. This ledger does not assert a universal EU rule prescribing that exact email/day for every contract.
- `ONE_STEP_CANCELLATION_IMPLEMENTED` is true: Settings and the API contain self-service cancellation. That flag is not evidence of race safety, refund integrity, durable confirmation delivery or legal compliance.
- Qualified Czech consumer review must settle the applicable disclosures, contracting, withdrawal and cancellation requirements. Implement verified reminder/confirmation delivery with retries and cancellation-aware scheduling; see payment handoff sections 6–7.

## Supabase custom SMTP configured; cohort mailbox acceptance remains
- The former built-in-mailer-only launch blocker is superseded: the founder/Claude review recorded Brevo delivery and mandatory confirmation, and the read-only auth settings report email confirmation enabled.
- Still verify current SMTP credentials/ownership, SPF/DKIM/DMARC, sender/redirect templates, provider/Supabase rate limits and enough simultaneous confirmation/reset deliveries for a classroom cohort. Existing messages do not prove every browser/device/recovery flow or deliverability.
- Auth SMTP does not implement app-content receipts or the day-2 reminder. Do not use `reset-test-account.js` against the shared database as a workaround; S01 records its billing/environment hazard.

## Duplicate checkout completion — P1 paid-launch gate
- Two sessions created before either completes can both be paid; an already-subscribed check alone does not reserve a purchase. Completion can overwrite the tracked subscription and strand another billable object.
- This is not safely resolved by a lone “cancel and refund the newer subscription” branch; failures, ordering, season/monthly overlap and identity need one purchase lifecycle with reconciliation.
- Implement and test P01 with the rest of P02–P08 before live billing. No real duplicate purchase was performed by this audit.

## Subscription cancellation — implemented path, safety and confirmations open
- Settings and `/api/subscription/cancel` exist. Monthly cancellation is intended for period end; an uncharged season trial is intended to stop its scheduled PaymentIntent.
- Do not call the full lifecycle verified from a historical successful click: P02/P03/P05/P08 retain cancellation/charge, event-ordering, recovery and refund concerns.
- Test actual access/cancellation states and webhook ordering, and deliver a dated durable confirmation with the correct payer and access end. Treat copy/UI polish separately from money-integrity blockers.

## Search data — no fabricated district fallback; remaining interpretation checks
- Search uses stored admission/programme/extracted facts. Codex removed the deterministic invented district fallback (`f098f6c`); missing geography/admissions remain unknown. Commute time is unavailable, not a real routing metric.
- All 217 visible live schools had coordinates in the 8 October probe, but this does not establish address/building precision or official catalogue completeness.
- Data-source/year/qualification wording and missing-data cases received fixes/browser checks. Scoring/projection consistency, programme focus/form and refresh provenance remain B01/B02/C03/S03/S07/S12; do not declare every rendered statistic correct from this pipeline description.

## Saved filter presets / recently viewed are localStorage-only
- **Found:** 2026-09-08
- **Urgency:** low
- **Effort:** medium — needs a `data/users/<id>/...`-shaped table + RLS if moved to Supabase

`frontend/src/lib/searchPrefs.js` stores recently-viewed school ids and saved
filter presets in `localStorage`, per-device. This was a deliberate choice
(matches the GDPR-minimisation stance already used for quiz answers), not an
oversight — but it means a visitor loses this state on a different device or
after a browser wipe. Revisit if/when account-backed state becomes the norm
elsewhere in the app.

---

## Public-transit commute requires a provider, licence and accuracy decision
- Current map radius is straight-line distance, not MHD travel time. Keep unavailable commute controls honest; do not substitute haversine distance under a transit label.
- Evaluate current Google Routes TRANSIT capabilities/billing/terms or self-hosted OpenTripPlanner with PID GTFS before implementation. The old $200/month Google Maps credit estimate is obsolete: [Google replaced it with per-SKU free usage caps on 1 March 2025](https://developers.google.com/maps/billing-and-pricing/faq).
- Verify storage/caching permissions, departure/arrival/date context, costs, privacy and service reliability. District-centre precomputation is an approximation, not a personalised home-to-school journey. Founder/provider choice remains pending.

## Cermat admission data — first-round decision retained; coverage varies
- The 58/60-school and 697-row figures describe the 8 September snapshot, not the current catalogue. Read-only 8 October: 217 visible schools have programme rows, four have only older admission summaries, and 650 active programme cards cover available years 2024–2026. Cutoff coverage: 248 none, 27 one year, 39 two, 336 at least three.
- Therefore not every school/obor has a three-year cutoff. Show the actual source years and missing values; do not assume absence means no first-round participation.
- Retain the founder's choice not to blend second-round leftover-capacity results into the first-round difficulty metric. Review official blank/suppression semantics and transactional/year-safe import before future refreshes (S02/S03).
- Future annual source availability must be checked; the old “final / no fourth year to add” statement was a dated observation, not a permanent limit.

## Local API configuration — macOS override, production fail-fast gate
- Code defaults to `http://localhost:5000`, matching the general backend default. On this MacBook, AirPlay commonly occupies 5000, so local `.env` uses backend 5001 and matching `VITE_API_BASE_URL`.
- This machine-specific override is not a universal code bug. Do not hardcode 5001 into production or commit secrets.
- Production must have the intended HTTPS API configured at build time; a missing variable must not silently send deployed clients to localhost. Verify deployment environment and build/runtime checks before release.

## Historical paywall mockup — do not ship unsourced promises
- The August mockup's 199 Kč, June end date and question/screen counts are historical design values. Current commercial values come from `pricing.js` and must agree with backend/Stripe/terms; current flow counts come from the flow/question data.
- The source-less 38% statistic must remain unpublished unless a suitable source is verified. Social proof is empty until real consented, selected evidence exists.
- Cancellation and 30-day withdrawal paths exist; payment integrity, durable delivery and date/savings denominators are still release gates. Do not use a mockup badge as proof they work.
- Admission probability from school grades, personalised commute and reliable email deadline reminders must not be promised without the relevant implemented/verified data/service. Richer stored programme/extracted data exists but does not establish those particular capabilities.

## Post-launch proposals — distinguish improvements from existing features
- Better matching: structured admission/programme/school-life inputs and weighted scorers already exist. Calibration, unknown-data treatment, projection parity and real-user validation remain improvements/gates depending on the defect.
- Priority support: application picks and risk analysis exist. Any broader DiPSy optimiser needs the official preference-order contract; it must not recommend placing an easier school first as a tactic. Founder ordering wording clarification remains pending.

## School media and score presentation — current decisions and remaining checks
- School photos/video and director identity still need verified source/licence/data decisions. Earlier brainstorm assertions that these assets had already been scraped were corrected; don't add stock assets as school evidence.
- Standalone results and post-signup surfaces display deterministic server percentages. Current Reveal also displays a frontend percentage and its band; the earlier “band only, never percentage” instruction is superseded by current presentation.
- The independent engines/input projections can disagree. Define and test the intended contract (B01/B02), explain the heuristic and avoid suggesting admission probability. Presentation similarity is not proof of scoring parity.

## Landing-page ambient animation — spec written, NOT implemented
- **Found:** 2026-08-28
- **Urgency:** low — explicitly gated, do not build without the user re-raising it
- **Risk of fixing now:** user was explicit this needs their trigger + Claude Design's dedicated animation tool, not a normal frontend pass
- **Effort:** medium, mostly asset-dependent (CSS-only is cheap; a Lottie/Rive character loop needs a designed asset first)
- **Release/context:** landing page only, cosmetic — not blocking anything

Full spec lives in `DESIGN.md` under "Motion — landing page (úvodní stránka)",
grounded in `docs/sources/landing_animation_research.md`. Summary: one small
ambient autoplay loop (CSS gradient/shape drift by default, or a small Lottie/
Rive idle character loop if a designed asset exists), slow and unvarying, never
scroll/hover/click-triggered, never a mascot or confetti pre-signup, always
disabled under `prefers-reduced-motion`.

**Gate, repeated from DESIGN.md because it matters:** build this ONLY when the
user explicitly triggers it, using Claude Design's dedicated animation tool —
not as part of routine frontend/UI work, not hand-authored CSS by a general
session.

---

## Logo design concepts — save direction references for later
- **Found:** 2026-09-17, user request to remember across sessions
- **Urgency:** low — visual reference only, no code dependency
- **Effort:** n/a — just documentation
- **Release/context:** branding direction, to be revisited later

User created 14 logo concept artboards (canvas-based design system, Concepts 01–14) across two design rounds (abstract marks, explanatory marks). Each tested at multiple sizes (40px email avatar, 32px favicon, 16px browser tab) with variants for light/dark backgrounds.

**Key reference to maintain:**
- Concept 14 (Logotyp) — the wordmark + measuring-line system, with three square-mark variants (E: "na míru" text, F: single "m" letter, G: dark-mode versions) designed specifically for email profile pictures and Chrome site logos.
- Instagram saved posts and personal notes per school — the user plans to track research/inspiration per school using Instagram saves + custom notes. This is a personal reference system outside the codebase; mention it back in future sessions when the branding gets revisited.

**Do not delete the logo design files.** They live as `.dc.html` artboards in `design/logo-concepts/` (moved out of the repo root 2026-09-19) and are registered in `design/logo-concepts/canvas.json`. Refer back to them when the time comes to finalize the visual identity.

---

## On-demand explanations built; generation and saved-run acceptance pending
- Plan 020 Phase 5 added generation for existing runs/school reasons and UI actions. Submission no longer has to generate explanations; old saved runs with empty reasons are not limited to retaking the questionnaire.
- Code default is now `openai/gpt-6-luna`; local/deployed environment values can override it. The historical Sonnet/Gemini-specific `.env` assertion is not current configuration evidence.
- Verify configured provider/model, real Czech outputs, cache/run/account ownership, existing/onboarding runs, retries and paid usage accounting. A prefixed model identifier and successful auth probe do not prove those paths work.

## Matrix shared dialog adopted; retain interaction acceptance
- Current `Matice.jsx` imports and uses `ConfirmDialog`; the former duplicate-dialog migration task is superseded.
- Keep keyboard/focus/Escape, scroll locking, narrow viewport and meaningful-weight confirmation in the final matrix acceptance. This does not close its ranking/data-quality or founder review tasks.

## Questionnaire form options still use a solid accent fill when selected
- **Found:** 2026-09-19, plan 011
- **Urgency:** low
- **Effort:** small

`.qz-option.is-on` in `pages/questionnaire.css` fills the chosen option solid
terracotta. `tokens.js`'s semantic rule 3 says selection is a 1.5px accent border
+ `accentSoft` fill, never a solid accent fill. Left alone because plan 011
scoped the design work to results / history / dialogs and kept the question form
unchanged. Fix when the form itself is redesigned.

---

## Match percentage: curve exponent and band thresholds are a first guess
- **Found:** 2026-09-19, reworking the match scale
- **Urgency:** low — the shape is measured and sane, but nobody has used it for real yet
- **Effort:** small (two constants), but needs real users to judge
- **Release/context:** `lib/matching.js` `displayScore` / `DISPLAY_EXPONENT`,
  `frontend/src/lib/decisionMatrix.js` `matchBand` and `MATCH_GAP`

The displayed match percentage is now `100 * (1 - (1 - raw/100)^1.4)` — an
absolute, monotone curve over the raw weighted average, never relative to the
other results. 1.4 was chosen by measuring five student profiles against the
real 223-school database: it lifts a typical best match from ~80 to ~90, keeps
the bottom of the list visibly low, and leaves only genuinely near-perfect
schools (raw >= 98) at 100 %. Rejected alternatives and why, so they are not
re-proposed: normalising against the best available school made every student's
top result read 98 % whether it covered nearly everything or barely half;
multiplier-plus-clamp produced 83 schools tied at "100 %" for a humanities
profile; a plain gamma curve inflated the worst school in the database to 28 %.

Still to check against real usage:
- **The exponent.** 1.4 is a judgement call, not a derived constant.
- **`matchBand` thresholds** (85 / 60) were moved up to suit the curve. They are
  arithmetic guesses about where "silná" and "střední" should sit.
- **`MATCH_GAP = 15`** (what counts as "notably better" in the matrix) was tuned
  against the old raw scale. The curve compresses the top, so a 15-point gap is
  now a bigger real difference than it was and the callout will fire less often.

**Measured floor, worth keeping:** the worst best-match any answer combination
can produce is about **59 %** (raw 47) — found by sampling ~9,000 answer sets
plus hill-climbing, so it is an empirical bound, not a proof. That historical sample is not a universal minimum for all future answers, projections or datasets. A lower result needs investigation, not an automatic assertion that the scorer is broken.

---

## Two district adjacency tables now exist and must agree
- **Found:** 2026-09-19
- **Urgency:** low
- **Effort:** small

`lib/pragueDistricts.js` gained `CORE_ADJACENCY` / `OUTER_TO_CORE` /
`districtHops` so the server scorer can grade the `casti` dimension by distance
(same district 1.0, neighbour 0.65, two away 0.35, further 0.2) instead of the
old all-or-nothing rule that cost an otherwise perfect school 20 of 113 weight
for being one district over. `frontend/src/lib/schoolFeatures.js` already had a
byte-identical copy driving "Podobné školy". They are duplicated deliberately
(server CommonJS vs browser ESM) and the offline district-generator regression now checks all 484 pairs against both
current backend and frontend behavior. Keep the tables in step when changing them.
The generator now preserves these helpers/exports; it previously erased them on
regeneration. This is a module-contract check, not proof of real-world adjacency
or authoritative boundary freshness.

---

## Onboarding visual overhaul — founder trigger still required
- The machine-move/laptop-access premise is historical; the MacBook and browser preview now work. Onboarding has received further implementation/visual changes since August, so “plain complete 23-screen version” is not a current acceptance claim.
- Preserve the founder's instruction not to start an unsolicited broad design overhaul. Fix confirmed wording/usability defects and finish the requested browser/device audit; any larger redesign needs a concrete proposal and founder direction.

## Release audits — current full-project review is underway
- Claude and Codex reviews have run; this solo exhaustive continuation is still in progress. The old “server never reviewed / onboarding need not be rechecked” assertion is superseded.
- Review the current changed source, not only old reports. Revalidate payment/security boundaries before enabling billing or applying RLS/migrations, and test connected onboarding/paywall/account behavior after changes.
- `older-version` is a reference branch, not a pending laptop-folder merge. Port any wanted piece deliberately; do not merge divergent product histories as a routine audit task.

## Historical laptop snapshot already removed
- `schoool-app-laptop-progress/` was deleted. Earlier source is retained on `older-version` and in Git history; there is no duplicate snapshot folder to clean up.
- Do not delete current design/logo/reference artifacts based on this old housekeeping item. Review any future removal against imports and the founder's retained-reference decisions.

## True `?limit=&offset=` pagination — needed at national scale, not built

**Current qualification, 9 October:** 223 is the raw-row snapshot; 217 are currently visible. The scorer now reads structured inputs, so preserve full projection/parity when implementing server filtering. National-scale pagination remains deferred.
- **Found:** pre-2026-08-27; narrowed to this scope 2026-09-17 (plan 010)
- **Urgency:** low — not urgent at 223 schools, only matters past ~1300
  (national scale, once the product expands past Prague)
- **Effort:** large — real server-side filtering, sorting and facet counting,
  which means reviewing the core of `Search.jsx` and onboarding-quiz
  scoring off the client
- **Release/context:** must exist before expanding past Prague to other Czech
  cities (CLAUDE.md's "Geographic Scope for V1")

Plan 010 (below, Resolved) fixed the two problems that were bundled under the
old "Backend pagination" entry: the silent 1000-row truncation cliff, and the
843 KB payload every list page downloaded. What's left is genuine `?limit=
&offset=` with server-side filtering/sorting/facets — deliberately not built
now because `Search.jsx` does all 13 filters, per-option counts and sorting
client-side, and the onboarding quiz scores the whole catalogue in the
browser. Building this means rearchitecting both, which isn't worth it while
Prague-only and pre-launch.

**If this gets built:** `withMatchScores` (server.js) must survive whatever
query replaces `fetchAllSchools`/`LIST_SELECT` — see CLAUDE.md's `/api/schools*`
trap note. It already survives plan 010 unmodified because the server scorer
now also reads structured programme/extracted inputs. Preserve the complete current projection and test B01/B02 parity rather than retaining the old text-only assumption.

---

## `ObKit.jsx` / `auth.css` primitives predate the real design-system template
- **Found:** 2026-08-31 (file-mtime comparison, at user's request)
- **Urgency:** medium
- **Risk of fixing now:** none identified yet — not started
- **Risk of NOT fixing:** the app's hand-built components (`ObKit.jsx`,
  `auth.css`'s `.btn`/`.input`/`.panel`/etc.) diverge further from the real
  design system the longer both exist in parallel
- **Effort:** large — replacing these means restyling onboarding + auth pages
- **Release/context:** sequence AFTER the spacing/typography migration above,
  not simultaneously — both are app-wide visual changes and doing them at once
  makes any regression much harder to attribute

`frontend/src/components/onboarding/ObKit.jsx` and `frontend/src/auth.css` were
last touched 2026-08-27. `design/system/` (the real Claude Design output, with
actual `Button`/`Input`/`Checkbox`/`Card`/`Chip`/`Divider`/`MatchIndicator`/
`Tooltip` component code) was created 2026-08-30 — three days later. Per the
user's own rule (if the real template is newer, prefer it over hand-built
equivalents), these should eventually be replaced by the real template
components rather than the other way around. Not started — sequence this after
the spacing/typography migration lands and is verified stable.

## Navigation responsiveness — historical overflow, current acceptance pending
- The 12 September 113px overflow measurement describes an older nav. Current layout has responsive behavior; plan 020 is changing shared navigation again, so the old “zero responsive handling” statement is superseded.
- Recheck the released current version at 320/375px, landscape, enlarged text, keyboard and zoom, with signed-in beta/account controls and long Czech labels. Do not mark this closed solely from source media queries or one desktop check.

## Frontend and server scoring can disagree — define the intended contract
- Onboarding uses `frontend/src/lib/matching.js`; post-signup surfaces use `lib/matching.js` with translated saved answers. Both currently display percentages in some surfaces, but remain independently implemented.
- Translation and similar curves do not prove equal pointwise scores or rankings. Review the same school/answers/full data across surfaces and document any deliberate difference (B01/B02).
- The original September note called this an accepted tradeoff. The current deployment request requires explicit assessment of confusing numbers; do not silently unify weights or close the consistency gate from that old characterization.

## Onboarding `sport` focus has no server-side matching area
- **Found:** 2026-09-11/12, building `lib/onboardingAnswers.js` (plan 008)
- **Urgency:** low
- **Release/context:** dropped silently on save, not surfaced to the user

The onboarding quiz's `focus` question offers `sport` as an option
(`frontend/src/lib/schoolFeatures.js` FOCUS_CATEGORIES), but the server
matching engine's `AREA_KEYWORDS` (`lib/matching.js`) has no `sport` entry —
there's no keyword family in the scraped `programs` text to match it against.
`lib/onboardingAnswers.js`'s translation table drops `sport` rather than
mapping it to something misleading. Add a `sport` area + keywords to
`lib/matching.js` if sport-focused schools start mattering enough to justify it
(the database currently has very few, if any).

## Onboarding stash is device-local; account ownership and handoff remain open
- `pendingOnboardingAnswers` uses browser local storage before a session exists. The same browser flushes a matching confirmed email; another device cannot recover that local stash automatically.
- Email confirmation/resumption is implemented, but that does not transfer answers between devices. A confirm-on-another-device journey still needs a designed recovery/handoff choice.
- C16 additionally reproduces a session-switch write/clear race in the flush. Fix immutable account/stash ownership and stale completion handling before claiming this path verified; do not treat same-tab confirmation as a complete solution.

## Responsive/browser acceptance — implementations exist, full pass still required
- Multiple components now have responsive styles; the August “no component adaptation” claim is superseded. Local checks already cover several desktop and 320–390px journeys.
- Complete the current released screens across phone portrait/landscape, tablet, short desktop, zoom/text enlargement, touch/keyboard, reduced motion, dark/light/native controls and supported browsers. Check errors/loading/empty/long-content states as well as happy paths.
- C09 hero scaling and C08 narrow header are recorded findings; compare-bar/modal fixes from plan 020 require final revalidation. Real iOS Safari/Android/browser/device acceptance remains separate from the local synthetic browser.

## onboarding.css still on the old spacing/type scale
- **Found:** 2026-08-31, during the site-wide spacing/typography migration (plan 005)
- **Urgency:** medium — deliberately deferred, not forgotten
- **Risk of fixing now:** the work would be discarded; onboarding is slated for a
  full /design redesign against design/system, which will restyle it natively
- **Risk of NOT fixing:** onboarding renders on a different spacing and type scale
  than the rest of the site until that redesign happens. Visible only if a user
  moves between onboarding and the main app in one session.
- **Effort:** large on its own (130 spacing values + ~10 display-type decisions);
  near-zero if folded into the planned redesign
- **Release/context:** do this AS PART OF the onboarding redesign, not before it

Plan 005 migrated `index.css`, `App.css`, `auth.css`, and `search.css` onto the
design system's real scales (`--space-*`, `--fs-*`, emitted from `tokens.js`).
`onboarding.css` was explicitly excluded by the user: it holds 130 of the 246
hardcoded spacing values and nearly all the hard display-type calls, and hand-migrating
it now would be thrown away by the redesign.

It also carries the only genuinely hard typography problem: the template's scale
offers just 22/28/38/72 above 18px, and its 72px display is unusable on onboarding's
390px mobile-first screens. **The template has no documented mobile type steps** —
that gap needs resolving in `design/DESIGN.md` before or during the redesign, not
guessed at.

Known pre-existing bug in that file, already tracked as `plans/003`: `.ob-title`
*shrinks* 32px → 30px at the 640px breakpoint (`onboarding.css:107` vs `:1168`).
Fold that fix into the redesign rather than patching it separately.

## Theme visual/contrast acceptance — partially checked, complete pass still owed
- Browser preview works on the MacBook. Current light scheme, search/missing-data detail/comparison/matrix and several narrow screens have been inspected; the old “no screen seen / tools blocked” statement is superseded.
- Finish all palettes and light/dark/system modes, text/control contrast, error/disabled/selected states and native controls on a dark OS. The duplicate base color-scheme override was fixed (`bd8629d`); this does not establish all-theme acceptance.
- Use current portable tokens and `design/DESIGN.md`; the warm-paper/Fraunces snapshot and old bundle sizes in Resolved are historical.

## Old landing mockup gaps — apply only to the retained A/reference design
- The September photo-placeholder/ambient-loop/footer observations concerned the earlier A landing. Current `/` is the map-led B landing; `/stara` retains A.
- Do not add a hero photograph or ambient animation to the current page merely to satisfy this old mockup. Preserve the founder's animation/design trigger and image-rights requirements if A is revisited.
- Audit the actual public landing links/footer, responsive readability, school-dot access, count/completeness claims and WebGL fallback. See C06/C09/C10 and the current browser evidence.

## Resolved

**Historical completion log:** dated entries below preserve what was done then. Their model, font, bundle-size, school-count, scoring-projection and browser-tool descriptions are not current deployment evidence. Current read-only facts and unresolved gates appear above and in the deployment report.

*(Move items here with a date + one-line note when they're actually done, rather than deleting them.)*

- **Supabase email confirmation re-enabled** — verified 2026-10-07 (Claude review):
  the live project's public `/auth/v1/settings` reports `mailer_autoconfirm: false`,
  and Brevo SMTP sends the confirmation mails. Was "Re-enable Supabase email
  confirmation before production" (found 2026-09-21).
- **Two schools without admission data** — resolved by 2026-10-07: every one of the
  217 visible schools now has `school_programs` rows (4 have only pre-2026 rows:
  ids 189, 212, 213, 215 — shown as "starší data").

- **Questionnaire results, run history, unlimited runs, AI-optional** — done
  2026-09-19 (plan 011, `archive/plans/011-questionnaire-results-history.md`). `/dotaznik`
  was a flat list of 8 rows that ignored most of what its backend already
  supported. Now: a results screen (top 10 with reasoning, expandable to the
  full current school ranking), a run history (rename, set as default, archive — the backend's two
  409 refusals are shown up front as a disabled button, not after the click), and
  two confirm dialogs (before retaking; after submitting, offering to keep the
  previous run as default). Backend: submitting no longer 503s without an
  OpenRouter key — scores are computed and saved regardless, and a failed or
  absent AI call degrades to empty sentences; the monthly quota (and its dead
  helpers) is gone, the burst limiter and `requireAccess` stay; the onboarding run
  is now flagged default explicitly instead of only looking default by way of the
  "newest wins" fallback; `model` and `source` are exposed on runs so the UI can
  tell why a sentence is missing. Cost was measured before removing the cap:
  ~1.5k input / ~0.8k output tokens per run, ~$0.0005 on Gemini 2.5 Flash Lite.
  Verified against a stateful mock of the API (the real authenticated routes
  could not be exercised without a login — see the follow-up above) at 1280px
  and 375px, with and without AI, including empty state, expand, rename, archive,
  set-default and both dialogs.

- **Questionnaire follow-up review after Claude Code** — done 2026-09-19/20.
  Reviewed the final component/API/server/scoring path, added deterministic
  validation and no-AI tests, restored the promised Prague map, corrected skip
  copy, hardened database failures, and verified form/results/history at 390px
  and 1280px with no horizontal overflow.

- **Onboarding email-confirmation handoff** — done 2026-09-19. Signup now pauses
  on a clear confirmation screen; the confirmation URL carries a validated local
  `/onboarding/plan` continuation through Login, so an unconfirmed account never
  reaches a checkout call that can only answer 401.

- **Onboarding paywall to access/payment seam** — connected in code 2026-09-19.
  `Platba.jsx` calls `/api/checkout`; webhooks write access state; the unsafe
  localStorage one-time-offer entitlement was removed. Live activation and the
  full real-money verification remain open above.

- **`/api/schools` payload slimming + 1000-row truncation cliff** — done
  2026-09-17 (plan 010, `archive/plans/010-schools-payload-slimming.md`). The list
  endpoint used to nest every raw `school_programs` row (2372 rows across 223
  schools, one row per obor per imported year) plus `school_ai_summary`,
  measured at **843 KB per load** on six surfaces including the onboarding
  quiz on phones. It now collapses `school_programs` to one entry per obor
  (latest year only) carrying just the 7 fields list pages actually read
  (`maturitni`, `jpz_povinna`, `typ_skoly`, `jazyk_studia`, `kkov`,
  `zrizovatel`, `kapacita`) — **measured 215 KB, a 75% cut**, with zero
  rewrite of `Search.jsx`'s client-side filtering/sorting/facets. A new
  `GET /api/schools?ids=1,2,3` (≤50 ids) returns full per-obor rows +
  `school_ai_summary` for `/porovnani` and `/porovnani/matice`, which only
  ever need a handful of schools. `fetchAllSchools()` also pages the
  underlying query in 1000-row chunks so PostgREST's silent truncation cliff
  can't bite once the school count grows past Prague — verified by
  temporarily lowering the page size to 50 and confirming all 223 rows came
  back with no duplicates across the boundary. `withMatchScores` needed no
  changes at that September snapshot. Current scoring also reads programme/extracted facts, so projection parity needs B01/B02 acceptance; the old text-only assumption must not guide a rewrite.
  **Side effect, intentional:** summing `kapacita` over the old nested rows
  double/triple-counted capacity for schools with multiple imported years —
  **211 of 223 schools** had an inflated "volných míst" number feeding the
  "Aspoň N míst" search filter. Collapsing to one row per obor fixed this;
  verified live against a school's own detail page (Evropská akademie:
  90+30+10 = 130 míst 2026, matching what search now shows, vs. the old
  summed-across-years figure). If capacity-filter results look different from
  before, this is why — not a regression.

- **School Detail Pages — still minimal** — done 2026-09-08. Rebuilt from
  feature-brainstorm.md §4: real per-obor breakdown with a 3-year Cermat
  trend, a single static map pin, real reviews (see CLAUDE.md → "User-
  generated content"), and honest placeholders for the eight §4 items with
  no real data source. See CLAUDE.md's "What's Already Built" item 10 for
  the full description, and the new entries above for what's still open
  (Q&A, review verification, the comparison view, maturita data).
- **App palette neutrals migrated to DESIGN.md's warm paper ramp** — done
  2026-09-04, in `frontend/src/design/tokens.js` (+ `npm run tokens`). The
  2026-08-28 pass had taken the accent and the fonts but left the neutrals on the
  older cooler ramp, which broke DESIGN.md's outright rule against `#FFFFFF` and
  `#000000` in two places (`--surface`, `--acc-ink`). Both light and dark
  palettes were replaced wholesale from DESIGN.md → Colour / Dark mode.
  Two judgement calls worth knowing about:
  **(a)** DESIGN.md names only two paper values but the app's scale has three
  levels, and the file says explicitly *"Surface is the page and any raised
  content; Neutral sits a half-step down for cards and rows."* So `bg` and
  `surface` are both `#FAF6EF` and `surface2` is `#F1ECE3` — raised content
  separates by hairline, not by a brighter fill, which is that same file's
  elevation rule. The alternative was inventing a paper value above Surface, and
  the only thing above Surface is white.
  **(b)** DESIGN.md's dark block does not name an `ink2` or a `line2`; both were
  interpolated inside its own ramp rather than carried over from the retired cool
  palette. Also warm-tinted the two box-shadows, which were mixed from a cool
  near-black. `npx vite build` green; CSS 46.43 kB. **The visual check is still
  owed** — see the open item above.

- **Site-wide spacing and typography migration to design/system's real scale** —
  done 2026-09-04 (plan `005-spacing-typography-migration.md`). The app previously
  had **no** spacing or font-size CSS variables at all and `tokens.js`'s scales
  silently disagreed with the template's (app `space.md` was 12, template's is 16);
  the template's scale was adopted as canonical per the user's 2026-08-31 call.
  Phase A emitted `--space-*` / `--fs-*` from `tokens.js` (once in `:root`, not
  per-theme); Phases B and C migrated `index.css`, `App.css`, `auth.css` and
  `search.css`. Verified: no hardcoded `font-size` px in any of the four, only 8
  documented spacing exceptions left (1–2px hairlines, the `-1px` sr-only clip, the
  derived 36px icon inset, the 88px sticky-bar clearance), each var emitted exactly
  once, `npm run lint` clean (4 pre-existing `only-export-components` warnings),
  build succeeds, and three consecutive `npm run tokens` runs are byte-identical.
  `onboarding.css` was deliberately excluded and is **still open above** — see
  "onboarding.css still on the old spacing/type scale". Two deliberate deviations
 from the plan as written are recorded in `archive/context/CONTEXT-HANDOFF.md` (`search.css` 26px →
  28px to preserve a heading level, and `.ss-row` → `--row-pad-dense` per DESIGN.md's
  density rule).
- **Reorganized design files into `design/` folder** — done 2026-08-31.
  `DESIGN.md` moved from repo root to `design/DESIGN.md`; the Claude Design
  template moved from `Škola Match system design (new)/` to `design/system/`;
  the finished Search wireframe archived to
  `design/archive/school-search-wireframe/`; design-specific research docs
  moved from `docs/sources/` to `design/research/`. Every reference updated
  (`CLAUDE.md`, `docs/sources/README.md`, `DESIGN.md` itself). The redundant
  `ui_kits/skolamatch/Search.jsx` mockup deleted — superseded by the real
  implementation. See `CLAUDE.md`'s "Design system — `design/` folder" section.
- **Widened `.app-content` from 960px to 1280px** — done 2026-08-31, matching
  `design/DESIGN.md`'s stated content width, with real breakpoint media queries
  added (there were none before). Verified live at 1600px (1280px content, 64px
  padding) and 375px (16px padding, no real overflow). See the responsive-design
  entry above for what's still not done.
- **Fixed site-wide font drift (Newsreader/Hanken Grotesk → Fraunces/Public
  Sans)** — done 2026-08-31. `design/DESIGN.md` and `tokens.js`'s own comments
  already specified Fraunces + Public Sans; `index.html` and `tokens.js`'s
  `webOnly` export had never been updated to match. Fixed both, regenerated
  `tokens.css`, verified both fonts actually load (not falling back).
- **Apply DESIGN.md colors to tokens.js** — done 2026-08-28. `tokens.js` now
  has terracotta `#AD4F2A` / moss `#4F7143`, Fraunces + Public Sans fonts.
  `npm run tokens` was run, `tokens.css` regenerated. Site renders in the new
  palette.
- **Supabase setup + schools seeded** — done, confirmed 2026-08-28.
  `schoolCount: 60` after a backend restart to pick up fresh `.env`.
- **Developer email full-access bypass** — confirmed working 2026-08-28. Logic
  was already fully implemented from the earlier laptop merge (`server.js`
  `DEVELOPER_EMAILS` allowlist, auto-promotion to `subscription_status:
  'developer'` on first `/api/me` call); just needed a backend restart to pick
  up the `.env` addition.

## Public-transit travel time to school (commute questions deferred until this exists) — 2026-09-24
- **Found:** 2026-09-24, questionnaire brainstorm. "How far will you commute" and "do transit connections matter" were approved as good questions but cut from the first build: nothing in the app knows how long a bus/tram/metro ride to a school takes (`SchoolMap.jsx` only does straight-line radius).
- **Urgency:** Medium — a real differentiator for a Prague school picker, but not a launch blocker.
- **Effort:** Small — one-off precompute script + one lookup table.
- **Plan (cheapest):** precompute a district×school matrix instead of live per-user routing. 22 správní obvody (`lib/pragueDistricts.js`) × 223 schools = 4,906 elements, fixed weekday arrival ~7:30. Google Routes API `computeRouteMatrix` TRANSIT: 100 elements/request → ~50 requests; $5–10 per 1,000 elements with 5,000–10,000 free/month, so likely $0 (verify which tier transit bills under). Store minutes in a table, score by time bucket. Re-run each December when PID timetables change.
- **Check first:** Google Maps ToS restricts storing/caching API results beyond a short window — confirm before persisting durations. Fallback with no such restriction: OpenTripPlanner self-hosted on PID's open GTFS (free data, costs hosting), or Golemio API.
- **Not done yet:** everything above; no questions were added to the questionnaire for this.

## Optional free-text note is private saved context — founder decision 2026-10-09
- The standalone questionnaire has `poznamka` (“Chceš něco doplnit?”), optional and capped at 500 characters. It is stored with the user's run; `describeAnswers()` explicitly excludes text fields from external AI prompts. It does not drive numeric scoring.
- The founder confirmed that this purpose should stay unchanged. The hint now explicitly explains private context, storage with the answers, no score effect and no language-model transmission. Include the note in account ownership, access, retention and erasure verification.
- The original “not built / decide whether to collect” snapshot is superseded. Any future AI interpretation or cross-run reuse is a separate privacy/product/scoring decision, with minimisation, retention, erasure, prompt-boundary and evidence checks.
- Do not forward the stored child-authored text to a provider or let it change scores solely because an old brainstorm lists those options.

## Offer a "fast questionnaire" and a "full questionnaire" — 2026-09-24
- **Found:** 2026-09-24, same session. The standalone list now has 31 questions; a shorter path and a full path are still wanted.
- **Urgency:** Medium — decide together with the weighted-questions redesign, since which questions are "fast" depends on which ones carry the most weight.
- **Effort:** Medium.
- **To decide:** which questions belong in the fast version (likely the ones that most change the ranking: school type, interests, location, and any weight-setting questions); whether a fast run can be upgraded to a full one later without starting over; how results show lower confidence for a fast run (the scorer already drops unanswered components and renormalises weights; skipping can raise or lower a score when remaining weights renormalise, and ranking/confidence can change); and whether the onboarding quiz, `/dotaznik` or both get the choice.
- **Not done yet:** everything above.

## Concurrent on-demand explanation cache writes lose entries — deployment review C21, 2026-10-09

- **Priority:** P2, AI cost/reliability; coordinated backend/database fix.
- **Reproduced:** the actual `/api/questionnaire/explain/:schoolId` handler with synthetic services returns two successful different-school explanations, then a whole-object JSON cache replacement erases one entry. `node reports/deployment-review-2026-10-07/reproduce-explanation-cache-race.cjs`; no live writes or model calls.
- **Plan:** atomically merge a single cache key under the original account/run, coordinate same-school generation, and define evidence/model/grammatical cache validity. Preserve ownership and usage attribution.
- **Acceptance:** concurrent distinct/same-school misses, deletion/default/owner changes during generation, provider/cache failures and retry costs. An atomic merge alone does not deduplicate model calls. See the deployment continuation findings and handoff; the 157 passing automated tests do not cover this race.


## Quiz wording/evidence follow-up — deployment review C22, 2026-10-09

Confirmed score/weight, historical-admission, commute and local/account-storage wording defects are corrected, along with the reproduced parent unknown-answer reassurance. Scoring/thresholds/answer keys/order policy are unchanged. Continue the same-pattern review of standalone-questionnaire admission text, risk band naming, confidence/data-coverage wording and unsupported most-common-answer/teen-development/labour-market statements. Verify evidence before altering uncertain claims. Preserve C20's private note purpose and finish the B01/B02/C03 data/score contract plus account/persistence acceptance separately. See `reports/deployment-review-2026-10-07/continuation-findings.md` C22 and its desktop/375×812 actual-component evidence; real-device/full-beta-flow acceptance is still open.

## Payment copy review checkpoint — 10 October 2026
- C23's unverified “payment received”/paid-parent labels, Stripe-information claim and parent beta-preview voice/summary wording are corrected. Actual-component synthetic desktop/phone checks verify local free-preview completion; checkout/polling/sharing handlers and pricing calculations are unchanged.
- P01–P08, P04 calendar/delayed-charge boundaries and C02/C15 account/token ownership remain open. Preserve the statutory 14-day Terms summary and implemented wider 30-day withdrawal benefit; legal/commercial calendar approval is still required before real billing.
- Evidence and acceptance tasks: [current report](reports/deployment-review-2026-10-07/REPORT.md), [handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

## Trial, keyboard and calculation-loading review — 10 October 2026
- C24: fixed monthly selection falsely showing seasonal trial terms; C25: fixed Plan custom-radio arrow selection/focus and Tab stop. Actual-component browser checks and lint/build pass. Full router/beta/Stripe acceptance remains open.
- C26 deferred: calculation timers display all tasks as complete while school data is still loading. Reproduced with an empty, pending catalogue in the actual component. Reconcile truthful progress/pending/error/retry behavior and reduced-motion delay without changing matching.
- Complete same-pattern custom-radio keyboard checks in Search/BetaReward and the remaining full source reads; preserve C06/FE-10 evidence questions and the paid-launch lifecycle/calendar gates. [Handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

- **10 October solo review:** C27’s CAPTCHA resend starvation is fixed and checked using actual components with synthetic services; real mailbox/CAPTCHA acceptance remains. BetaReward now also has standard radio keyboard behavior (C25). C16 additionally reproduces a late A-token 401 signing out B before B’s deferred profile load, and upstream auth 503 → API 401 → local logout; coordinate immutable owner/session/error classification rather than disabling auth checks.
- **Beta privacy release gates remain:** the 10 October checkbox/retention product decisions are not legal sign-off. Resolve mandatory observation versus optional tracking, equally easy withdrawal/actual collection stop, child/guardian evidence and account-linked church-school preference risk screening. Sharing is disabled in frontend controls, not all server endpoints. Corrected factual notes live in `docs/legal-decisions-2026-10-10.md`; D5 vendor/operator facts, cleanup and full journeys still need acceptance. Founder tracking-choice answer is pending.


## Search/map deployment review follow-up — 10 October 2026
- C28 fixes all-2026 admission claims/hidden older-year context, blank no-data explanation years and “Zobrazit 1 škola” grammar. Search’s custom sort radios now support arrows, wrap, focus and one Tab stop (C25). Actual desktop/phone checks and lint/build pass; scoring, filters and dataset are unchanged. Settings radio acceptance remains.
- C29 remains a beta UI gate: actual map capacity explanation is visibly off-screen at 375px (left -144.75px); document width is 405px. Read all shared Hint consumers and implement/verify viewport collision handling across phone, landscape/fullscreen, long content and large text. Marker Enter behavior needs real-browser confirmation before a separate diagnosis.
- Preserve C01 geocoder privacy/request-policy and C03 mixed-year filter metadata gates. Include Search/FavoriteButton account/request ownership and late map lookup/geolocation callbacks in the existing C02/C16 lifecycle plan. See deployment continuation findings and handoff; no production data or external requests were changed.


## Settings ownership and account erasure — deployment review, 10 October 2026
- C30’s empty-name edit and expired-trial label are fixed; actual desktop/phone checks and lint/build pass. Settings native radios work without changes.
- C02/C16: actual Settings fixture and callback reproduce A’s queued appearance save executing as B after an account switch; A’s unsaved name remains in B’s form. Bind/cancel queued operations by immutable session/owner, reset each owner’s forms/messages/secret fields and test late success/error/refresh. Resetting the Promise ref alone is insufficient.
- C31 is a beta erasure gate: DELETE /api/me does not remove screenshots synchronously; orphan cleanup waits until object age exceeds 24h and a successful maintenance run. AI usage records retain nullable-owner run/error/model/time data. Verify actual signed-upload/legacy ownership, define bounded retryable erasure and retained-data rules, and reconcile the all-data-removed notices. Disposable tests must cover uploads, partial Stripe/Storage/Auth failure, retries and foreign-object rejection. No live erasure was attempted. [Handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).


## Decision/saved-note deployment review — 10 October 2026
- C28/C22: corrected comparison’s all-2026 intro, historic acceptance “chance”, matrix source/proportion wording and weight-button names/selected states. C33: fixed first-row personal-fit claim when match scores are missing/excluded. Arithmetic/criteria IDs/weights/thresholds are unchanged. Actual desktop/phone checks, 17 decision-data tests and lint/build pass.
- C03 mixed-year capacity/ratio provenance remains: an older school’s capacity still appears under a newer global row year. Resolve per-field/year/obor provenance coherently and retain visible uncertainty.
- C32: actual SavedCard callback with delayed synthetic save erases a newer unsaved edit and labels the old body saved. Bind operations to owner/school/edit revision; preserve newer text/drafts, order/coalesce writes and exercise failure/retry/empty-delete/removal/unmount/account switch. Coordinate existing C02/C14/C16 and shortlist concurrency work. [Handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).


## Beta renewal contract — founder confirmed 10 October 2026
- Only accepted messages through the main feedback form or access gate renew the rolling window, capped by the program end. Quick ratings do not renew; preview views, events and closing answers are not renewal. C34 fixes Settings/guidance and plan 019 copy; actual desktop/phone checks and lint/build pass.
- Independent metadata confirms 48 hours, one intended cohort code, cutoff 18 October at 23:59 Prague and exposed role-note/consent timestamp fields. Do not restore obsolete missing-role-note/12 October tasks. Metadata/source function parity do not approve current grants/policies, disposable reruns, enrollment, consent or erasure. [Handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).


## Landing/result deployment review — 10 October 2026
- C35/C36 fixed commercial-free database, disabled sharing/browser-only answer/cancellation copy, signed-out looping browse link, admission-year wording, Czech result count agreement and match-confidence label. Role tabs support standard arrows/Home/End/focus/one Tab stop. Actual desktop/phone fixtures and lint/build pass; scores, routes and payments are unchanged.
- C09 still blocks beta UI acceptance: current 812×375 hero scale renders about 6px body and 4px chip text. Implement readable short-height/landscape reflow and verify large text/zoom/all steps. C10 lacks a keyboard/non-WebGL alternative for public dot-detail access; C11 data/detail retry/cache/motion ownership also remain. Extend C02/C16 to admin open feedback/forms/revealed e-mails.
- Inactive Home still has founder photography/byline placeholders; do not restore it without content/product/browser acceptance. Public metadata improvements and archive/removal of inactive demo code are suggestions; closed-beta indexing remains a policy choice. [Handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).


## Theme contrast and older plans — deployment review, 10 October 2026
- C38: actual Oranžová-light beta guide uses 16px/600 accent text on the soft accent background at 4.2959:1. Plan 014's all-text-pairs pass claim is withdrawn. Review actual semantic text/background/control usages across all eight modes and accessible appearance recovery; coordinate palette changes through shared tokens, regenerate/verify parity and inspect rendered states. This is a confirmed pair/usage discrepancy, not whole-site compliance or legal acceptance. Palette/source behavior is unchanged; [evidence and handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).
- Plans 012–015 and 017 now flag historical fonts, four-school limits, native sorting, dated school/test counts and implemented questionnaire work. Do not reimplement old features or blindly rerun historical SQL. Current source/design/report/owner/service acceptance govern further work.


## Pipeline command scope — deployment review, 10 October 2026
- S14 fixed: malformed/missing/nonpositive/noninteger limits no longer fall back to whole-catalogue work in five scripts; missing/blank/flag school selectors and model values fail before work where supported. Sixteen actual-script offline regressions and all 173 repository tests pass, without paid calls or real writes. Preserve the CLI guards; dry runs still may call paid models/write usage logs, and S11/S12 input identity/provenance, cache refresh, partial-failure and regeneration acceptance remain open. [Handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

- S15 fixed: district regeneration now preserves `districtHops`/`toCoreDistrict`, which the matching engine requires. An actual-generator offline test reproduces the old missing-export failure and checks all 484 pairs against both current engines; no network or real regeneration. All 16,115 stored lookup points and all 22 label memberships pass local structural checks. Generated geometry freshness/building accuracy/edge policy, invalid external boundary sets and attribution acceptance still require review before a future boundary refresh; see the deployment handoff.

- S17 fixed: each parsed/matched admission run refreshes the local unmatched report, including clearing obsolete names when none remain. Offline actual-source tests pass; all 176 root tests pass. The checked-in report/Atlas name list remain historical evidence, not current missing schools. S02/S03 atomic import and provenance remain open. S16 external geometry validation/provenance is required before future boundary refreshes.
