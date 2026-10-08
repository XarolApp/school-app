# SkolaMatch — Current Status & Claude Code Operating Instructions

> **Verified update — 7 October 2026, Codex review ongoing:** the founder clarified that valid trial, paid or beta access is required for premium catalogue/search and decision tools. Landing/onboarding remain public, **including school details opened from a landing-map dot**. Preserve functional auth/legal/account management and approved scoped share/payment journeys. The current app does not fully enforce this matrix; implementation belongs in the deployment handoff.
>
> **Founder clarification, 7 October:** ordinary accounts’ three-day access trial must start at first confirmed sign-in (current signup-trigger behavior is still awaiting implementation). Beta is free in exchange for feedback; its payment screens are previews only, without Stripe or a purchase trial.
>
> **8 October service update:** full file-by-file deployment review is **not finished**. Codex is continuing solo. The recorded 127-test/lint/build checks precede subsequent plan 020 edits. Live read-only checks now confirm 223 raw /217 visible schools, 26 tables, 48-hour beta access and cutoff **18 October at 23:59 Europe/Prague**. `beta_profile.role_note` is present and the local OpenRouter key authenticates (HTTP 200). Table/column presence and anonymous zero rows do not verify migrations/RLS/grants; key authentication does not verify generation or deployed credentials. Test a disposable fresh-install/rerun before a reviewed live schema update. Real billing remains blocked by payment lifecycle, communication and legal/operator gates. See [current report](../reports/deployment-review-2026-10-07/REPORT.md) and [ordered handoff](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md); earlier logs below retain their dated evidence and are not current release approval.

## Purpose

This is the **living operational state** of SkolaMatch.

Use it together with:

1. `skolamatch_90_point_context.md` — business/product context and strategic decisions.
2. `skolamatch_full_launch_marketing_plan_v2.md` — launch roadmap and execution strategy.
3. This file — the actual current state of the project.

This file is mutable. Claude Code should update it as the project changes.

---

# 1. Claude Code Role

You are the execution and project-management agent for SkolaMatch.

Your job is to:

- understand the business from the 90-point context;
- understand the launch strategy from the launch plan;
- inspect the actual codebase when development status matters;
- use this file to determine the current state;
- decide what the founder should do **next**;
- give concrete, executable tasks;
- prioritize launch speed, customer value, and revenue;
- keep this file updated.

Do not merely repeat the roadmap. Turn it into an execution plan based on reality.

---

# 2. Source-of-Truth Hierarchy

When information conflicts, use:

1. **Actual codebase / deployed product** — what is technically implemented.
2. **This file** — current progress, metrics, blockers, and recent decisions.
3. **90-point context** — business/product context and strategic constraints.
4. **Launch Marketing Plan V2** — intended roadmap.

If the roadmap says something is complete but the codebase/status says it is not, trust reality.

If new evidence suggests the roadmap should change, explain the reason before changing the strategy.

---

# 3. The Most Important Rule: Always Plan From Current Reality

Never restart the launch plan from Day 1.

If the founder says:

> "It's Day 3. What should I do?"

you must:

1. Read this file.
2. Read the relevant part of the launch plan.
3. Check what has already been completed.
4. Check blockers and dependencies.
5. Inspect the codebase if development status matters.
6. Consider the time available.
7. Select the highest-value unfinished work.
8. Give exact actions.
9. Give a short preview of tomorrow.

The roadmap is a **map**, not a rigid checklist.

---

# 4. Daily Execution Format

When the founder gives you a day and available time, respond with something like:

## Today — Day X

### Priority 1 — [specific task]
**Time:** X minutes

**Why:** [reason this is currently high priority]

**Do exactly this:**
1. ...
2. ...
3. ...

**Definition of done:**
- ...
- ...

### Priority 2 — ...
**Time:** ...

### Priority 3 — ...
**Time:** ...

### If you finish early
- ...

### Do NOT work on today
- ...

## Tomorrow preview

- Priority 1: ...
- Priority 2: ...
- Priority 3: ...

The founder should be able to start working immediately without asking what a vague task means.

---

# 5. Time Capacity

Default:

- Weekdays: approximately **5 hours/day**
- Weekends: approximately **6 hours/day when available**

Do not automatically recommend sacrificing sleep.

The founder is willing to temporarily "lock in" for 1–2 weeks if necessary. Recommend more than 5 hours only when a real launch-critical deadline justifies it.

---

# 6. Priority System

Use this order unless evidence strongly suggests otherwise.

### P0 — Launch blockers
Anything preventing a stranger from safely using and paying.

Examples:
- broken core flow
- payment
- authentication
- entitlement/access control
- critical security issue
- severe data problem
- critical bug
- required legal/privacy issue

### P1 — Conversion/trust blockers
Anything substantially hurting purchase likelihood or trust.

Examples:
- confusing onboarding
- weak paywall
- unclear value proposition
- bad checkout
- poor mobile UX
- misleading/unclear AI output
- missing trust elements

### P2 — Revenue acquisition
Work that can directly produce customers.

Examples:
- beta recruitment
- creator outreach
- affiliate recruitment
- TikTok content
- parent outreach
- tutoring-company outreach
- school/community distribution
- landing-page optimization

### P3 — Product delight / retention
Examples:
- reminders
- deadlines
- parent sharing
- better comparisons
- improved AI explanations
- additional useful school information

### P4 — Nice-to-have
Anything that can safely wait.

---

# 7. Marketing Must Be Actual Work

Never give vague tasks like:

- "work on marketing"
- "research TikTok"
- "think about outreach"
- "improve social media"

Turn them into measurable actions.

For example:

> Find 20 relevant Czech creators, record their contact method, send the approved outreach message, and log every result.

Or:

> Create 3 faceless TikTok concepts, write hooks, produce/post the first video, and record views/clicks.

Every marketing task should have:
- quantity;
- action;
- target;
- definition of done.

---

# 8. Beta Tester Acquisition

Do **not** assume 20–50 real testers will appear automatically.

The target is an outcome. Claude must build the acquisition pipeline needed to reach it.

Potential sources:

- faceless TikTok
- Instagram
- student communities
- parent communities
- creator outreach
- tutoring companies
- school/community contacts
- direct outreach
- friends only as supplementary testers

Track:

- contacted
- replied
- agreed
- actually used product
- completed core flow
- feedback received
- bugs found
- testimonial permission
- would pay
- willingness-to-pay feedback

---

# 9. Never Pretend Acquisition Is Guaranteed

Do not say:

> "Post 3 TikToks and you will get 50 testers."

Instead treat every channel as a measurable experiment.

If one channel performs poorly, activate or improve another.

The founder currently has no established audience, so acquisition must be built from scratch.

---

# 10. Business Context

Known current direction:

- Initial market: **Prague**
- Future markets: **Brno, Plzeň, Ostrava, other major Czech cities**
- Primary model: **B2C**
- Main users: Czech 9th graders and their parents
- Product: structured secondary-school selection platform
- Important features: matching, school database, school pages, comparison, AI explanations, DiPSy/application guidance, favorites, parent sharing
- Goal: make money while genuinely helping students choose better schools
- Bootstrapped business
- Very limited initial marketing budget
- Affiliate/commission acquisition is attractive because it reduces upfront cash requirements
- School partnerships are strategically interesting but should not unnecessarily delay B2C launch

For full context, read the 90-point file.

---

# 11. Current Product State

Last known founder estimate:

**Overall: ~75% complete**

The product is not publicly launched yet.

## Database

Read-only snapshot, **7 October 2026**: 223 raw `schools` rows, **217 visible**
(six merged duplicates), 2,374 programme rows, programme years 2024–2026. Four
visible schools have older admission summaries. All 217 have coordinates; this
does not establish completeness against the official school register or correctness
of every record. Three-year cutoff coverage is not universal. See
`reports/deployment-review-2026-10-07/catalogue-quality.json`.

The September expansion from 60 to 224 was a historical import, not today's visible
count. Contact/website and extracted-data coverage have changed since that import;
do not reuse its "all 164 missing" assessment without a new query. Keep provenance,
source year and unknown values explicit. The import/update pipeline itself is under
review; do not rerun destructive importers against production during the audit.

## Questionnaire

Source snapshot, **8 October 2026**: standalone `QUESTIONS` contains 31 definitions;
the onboarding flow has 11 question slots, with conditional visibility. These are
separate engines. Completion times and overall percentages below are historical
founder estimates, not measured acceptance evidence. Core deterministic scoring and
stored results exist; cross-surface consistency, AI quality and final runtime
verification remain in the deployment handoff. Plan 020's model/prompt/explanation
changes are being implemented in another process and need independent review.

## Matching

The founder currently wants **percentage-based matching**.

Do not replace percentages with broad categories without a strong reason.

Reason: with a catalogue of hundreds of schools, broad labels could produce huge groups that all look identical. Percentages preserve ranking differentiation, e.g. 98% vs 83%.

Matching itself should remain mathematically driven.

AI should explain the ranking, not secretly determine it.

## AI

A model writes explanation sentences for the standalone questionnaire; scoring is
JavaScript. Comparison/matrix and application guidance are implemented as deterministic
product tools, not established AI comparison services. Prompt/model improvements and
on-demand detail explanations are in plan 020; verify the final implementation and
provider route before reporting them complete. The old "DiPSy 25%" estimate is not a
current measured readiness metric.

## Remaining known work

Use the current deployment handoff and UNFORGET for open work. Signup, authentication,
legal pages, deployment, beta instrumentation and Stripe code now exist; listing them
as wholly unbuilt would be stale. Their end-to-end, security, privacy and operational
acceptance is not complete. Distinguish no-charge beta gates from paid-launch gates
and optional product improvements. This is not the priority order; apply P0–P4.

---

# 12. Product Value

The paid user should be able to use the product to:

- receive personalized school recommendations;
- browse the Prague school database;
- open school pages;
- see structured school information;
- find open-day information;
- save favorite schools;
- compare schools;
- use AI explanations;
- use DiPSy/application guidance;
- share information with parents;
- use other implemented decision-support features.

The product is not simply an "AI school recommender."

Its value is making the entire school-selection process faster, clearer, and more informed.

---

# 13. Pricing

Prices **locked 2026-09-21** (`frontend/src/config/pricing.js`): **Sezónní přístup
690 Kč** one-time (3-day trial, then one charge; access to 31 March) and **Měsíční
249 Kč** (charged immediately, no trial). Still validate with beta feedback.

Current working direction:

- Prefer **season pass** rather than "lifetime", because the main customer need is tied to one admissions season.

Validate using:
- beta feedback
- willingness-to-pay
- checkout behavior
- conversion
- affiliate economics
- relevant market research

---

# 14. Affiliate Model

Historical, unapproved economics example: 699 Kč base, 50 Kč discount, 649 Kč net and 30% creator commission. The actual season price is now 690 Kč; no implemented affiliate offer or approved replacement economics was established by the review. Recalculate and approve a concrete offer before publishing those example amounts.

Referral attribution should persist through:
- link click
- onboarding
- signup
- return visits where technically possible
- checkout

Do not lose the creator's attribution merely because the user leaves and returns.

Do not offer extreme commissions without evidence they improve acquisition enough to justify them.

---

# 15. Launch Sequence

Intended sequence:

### Phase 1 — Critical development
Make the product safe and usable for strangers.

### Phase 2 — Beta acquisition/testing
Recruit real students/parents and test the product.

### Phase 3 — Soft launch
Begin accepting real customers with an early-launch offer.

### Phase 4 — Public launch
Scale acquisition after the funnel and product have been validated.

Do not delay unnecessarily for perfection.

The product is seasonal, so launch timing matters.

---

# 16. Analytics

Before meaningful public acquisition, track at least:

1. landing visit
2. CTA click
3. onboarding start
4. onboarding completion
5. recommendation shown
6. school page opened
7. paywall viewed
8. checkout started
9. payment completed
10. account created
11. product activated
12. key feature usage

Also track acquisition source/campaign/creator when possible.

Use the actual technology stack to determine implementation.

---

# 17. Beta Testing

Friends can find early bugs, but real strangers are required for honest validation.

Beta should test:

### Product
- Do users understand it?
- Is matching useful?
- Is data trustworthy?
- Is anything confusing?
- Are there bugs?

### Value
- Does it save time?
- Does it make school selection easier?
- Would they use it for a real decision?

### Monetization
- Would they pay?
- How much?
- What stops them?
- Does the paywall feel fair?

---

# 18. Parent Strategy

Parents are an important payer audience.

Potential channels:

- parent-focused landing copy
- direct parent outreach
- creator referrals
- school/community distribution
- tutoring partnerships
- trusted recommendations

School-distributed recommendations may be especially valuable because parents can trust communication coming from their child's school.

However, school partnerships should not block B2C launch.

---

# 19. School Partnerships

Potential model:

School sends parents/students an offer to use SkolaMatch.

The school does not necessarily need to pay for every student.

Possible referral/partnership economics can be tested later.

Important ethical rule:

**Schools must never be able to pay for better rankings or recommendations.**

Do not compromise recommendation integrity.

---

# 20. Content Strategy

Founder wants to remain anonymous online.

Content can be:

- faceless
- screen recordings
- UI demonstrations
- text-based videos
- educational videos
- AI-assisted editing
- trend-driven content

Do not build a strategy dependent on founder face/voice.

---

# 21. Acquisition Priority

Test:

1. Faceless TikTok
2. Creator/affiliate outreach
3. Direct outreach
4. Parent communities
5. Student communities
6. Tutoring companies
7. School partnerships
8. SEO/organic search
9. Paid ads later

Do not spend significant money on paid acquisition before conversion economics are understood.

---

# 22. Revenue Goals

Current goals:

- Meaningful success: **100,000 Kč**
- Strong first season: **500,000+ Kč**
- Longer-term: **1,000,000+ Kč first-year revenue**

These are targets, not forecasts.

Always distinguish measured results from assumptions.

---

# 23. Current Marketing State

Last known:

- no established business audience
- no meaningful paying customer base
- no meaningful prior marketing results
- TikTok/Instagram business presence not established
- creator partnerships: 0
- parent outreach: not started
- tutoring outreach: not started
- school outreach: not started
- email list: not established
- affiliate system: not implemented

Founder is willing to contact approximately:
- 200 parents
- 100 TikTok creators
- many tutoring companies

Founder is willing to learn and execute faceless TikTok/content marketing.

---

# 24. Current Status Dashboard

Update this section whenever new information is confirmed.

## Project and product — verified review checkpoint, 8 October 2026

- Phase: development / restricted no-charge beta preparation. Deployment exists;
  release acceptance is incomplete. First city remains Prague.
- Percentage estimates such as "75% product" or "95% payments/legal" are historical
  guesses. They must not replace the concrete open gates in the deployment report.
- Catalogue: 217 visible schools in the dated 7 October read-only snapshot above.
- Matching/questionnaires: implemented, with consistency and input/projection findings
  still open. The matrix and comparison are being changed under plan 020; review the
  final diffs and UI before calling them accepted.
- Stripe: test mode was verified on 7 October. Real billing remains blocked by
  duplicate-purchase, charge/cancel race, stale event, recovery/refund and communication
  findings. This is architectural work, not just a key swap or remaining 5%.
- Accounts/authentication: signup, confirmation, recovery and onboarding flush exist.
  New 8 October form/draft/confirmation changes require re-review and runtime checks.
  Ordinary trial start at first confirmed sign-in is an approved, pending change.
- Beta: free for feedback; paywall preview cannot require payment or create a purchase
  trial. Instrumentation, feedback/closing/admin and access windows exist. Latest SQL,
  authenticated isolation, Storage lifecycle, child/privacy decisions and complete
  enrollment/feedback/expiry acceptance remain to verify. A live profile row or event
  is not proof a real external tester completed the journey.
- Plan 020 records a single shared site/enrollment code. Its phases are in progress
  in another process. The live cutoff was rechecked on **8 October: 18 October at
  23:59 Europe/Prague**, with 48-hour rolling access. `beta_profile.role_note` is
  present. Recheck the final deployed enrollment/gate configuration before inviting
  testers. These observations do not establish completed migrations or grant safety.
- Legal pages: published (`DRAFT = false`). Operator name/address, non-VAT wording and
  Brevo are filled. Business entitlement/IČO applicability, vendors/DPAs, optional
  analytics storage, moderation, durable confirmations and minor-contract/refund
  decisions remain open. Publication does not mean legal approval.
- Deployment: frontend Vercel (`www.stredninamiru.cz`), backend Railway. The new
  single-code frontend gate has source/tests; actual production gate, redirects,
  headers, CAPTCHA and provider configuration still need final verification. Check
  Railway billing/availability in the dashboard; the earlier trial-expiry estimate
  around 13 October is not a verified current billing state.
- Analytics: beta-only first-party implementation exists; normal-user acquisition
  attribution/funnel analytics is not automatically implemented by beta tracking.
- Parent sharing, application tools and saved schools exist. Payment-link management,
  synchronization and final device acceptance remain under review.
- Native mobile application is not built. Browser viewport checks do not establish
  real iOS Safari/Android compatibility.

## Marketing

No fresh verified acquisition/revenue metrics were supplied during this review.
Earlier records reported zero paying customers/creator partnerships and no established
social audience. Treat those as dated last-known values, not a new live measurement.
A school-cohort rollout is now being prepared; confirm actual participants/outreach
with the founder before giving acquisition advice.

## Codex audit status

- Deep audit: **in progress**, begun 7 October; continuing solo, no new subagents.
- Complete file-by-file read and final changed-file review: **not complete**.
- Findings: payment lifecycle, beta/schema/access, matching, data-loss, privacy,
  moderation, service and mobile readability issues are documented. Zero remaining
  critical/high findings has **not** been established.
- Recorded 127-test/lint/build results are dated snapshots, not verification of later
  plan 020 changes. Run final checks against a stable reviewed tree.
- Beta gate: **not cleared**. Use the concrete acceptance gates in the
  [report](../reports/deployment-review-2026-10-07/REPORT.md) and
  [handoff](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).
- Public-launch regression review: pending after beta and resolution of paid gates.

## Current blockers and decisions

- Prices are settled: 690 Kč season, 249 Kč monthly; season is first/default, with
  three-day deferred charging, monthly charges immediately. Do not reopen them from
  old placeholder checklists.
- First confirmed sign-in starts the ordinary-account access trial: approved,
  implementation/migration pending. Beta feedback windows are separate.
- Email confirmation is implemented and historically tested; current cross-browser,
  resend, second-device and recovery behavior still needs final acceptance.
- AI prompt/provider identity and real output need review. The local credential now
  authenticates (HTTP 200, 8 October) and the configured identifier has a provider
  prefix. Generation, provider route and deployed credentials remain unverified.
- Matching consistency, premium access matrix and transaction-safe application picks
  are unresolved review work. Public landing-map school detail remains intentional.
- Payment checkbox removal is deliberate; no current parental payment checkpoint
  should be assumed from old docs. Minor contracting/evidence remains a counsel task.
- Data coverage is partial and purpose-specific. Maturita, tuition, meals and clubs
  have extraction/import paths; the old all-zero table is obsolete. Use a current
  aggregate query and source review before claiming a value or universal coverage.

The dated Day 1/Day 2 tables and logs below are historical snapshots, not current
release recommendations. Their older counts, architecture and completion percentages
are superseded by this checkpoint and the current audit.

### Day 1 P0 Audit (launch plan §12 "DAY 1 — Launch Audit + Critical Path")

Run 2026-09-12 against the real codebase, not assumed from the roadmap.

| P0 question | Answer | Evidence |
|---|---|---|
| Can a stranger register? | **Yes** | Verified live this session — real signup with email confirmation |
| Can a stranger log in? | **Yes** | Verified live this session |
| Does questionnaire work? | **Yes** | Both standalone (`/dotaznik`, new 2026-09-12) and onboarding quiz produce results |
| Does matching work? | **Yes** | Deterministic scoring, both engines |
| Does the result make sense? | **Partially** | Works mechanically; AI explanation prompt unreviewed (Blocker 3), matrix unreviewed by a human (UNFORGET) |
| Does the school database work? | **Yes, partial coverage** | 60/~214 Prague schools, real Cermat data |
| Are all school pages usable? | **Yes** | Rebuilt 2026-09-08, honest placeholders for missing data |
| Does payment work? | **Yes, 95% done** | `/api/checkout` + webhook handling implemented; refund logic needs Codex review, withdrawal needs Stripe test-mode verification |
| Does payment unlock the product? | **Yes** | Trial access works (DB trigger + `requireAccess`); paid unlock is implemented via Stripe webhooks |
| Is premium access secure? | **Yes, for what exists** | Server-side `requireAccess` + RLS; nothing paid to bypass yet since Stripe isn't wired |
| Does analytics work? | **No — confirmed 0%** | Grepped for PostHog/GA/Mixpanel/etc. — nothing anywhere in the codebase |
| Can the product be deployed? | **No deployment config exists** | No Dockerfile/vercel.json/netlify.toml/Procfile/fly.toml found anywhere in the repo |
| Are basic legal/privacy requirements handled? | **95% done** | Privacy + Terms pages built in `Legal.jsx`; remaining: operator facts, SMTP for confirmation e-mails, DPA collection, withdrawal testing |
| Are emails working? | **Yes, for auth** | Confirmation + reset emails verified working live this session. No other transactional emails (e.g. the mandatory day-2 trial reminder from CLAUDE.md's pricing section) exist yet |

**Historical net result (2026-09-23; superseded by the October checkpoint):** the product itself (signup → questionnaire → matching →
school browsing) is further along than initial assessment. **Payment and legal pages are now
95% done**, leaving only final operational tasks (SMTP, DPA collection, test-mode verification, operator facts).
**Beta analytics is implemented (2026-10-05).** Before beta rollout, apply the
reviewed incremental SQL migration after disposable fresh-install/rerun checks, configure server-only admin/ticket settings and program dates,
and complete live Supabase/Storage verification and independent review. Normal
user tracking remains intentionally disabled. See
`reports/beta-implementation-completion-2026-10-05.md`.

### Historical gate assessment (2026-09-23; superseded)

**Can Codex audit start?**
- [x] Pricing finalized and locked
- [x] Email confirmation flow fixed
- [x] Payment implemented (95% — refund logic review + withdrawal testing remain)
- [x] Legal pages built (95% — operator facts + SMTP setup + DPA collection remain)
- [ ] Analytics implemented (0% — CRITICAL blocker)
- [ ] AI prompts human-tuned
- [ ] School suggestions verified working

**Historical assessment withdrawn:** the October audit is already in progress and found architectural payment and other release gates. Do not use the old "mostly unblocked" assessment or its requirement to finish analytics before auditing.

---

# 25. Daily Log

Keep this concise.

## Day 1 (2026-09-12)
- Status: Development work logged here; marketing work done in parallel via
  ChatGPT (the founder's separate marketing workflow), corrected into this
  log 2026-09-13 after being wrongly recorded as "none yet"
- Completed:
  - Fixed mobile nav overflow (hamburger menu below 768px)
  - Rozhodovací matice redesign (plan 007): labelled per-criterion rows, match
    score as a criterion, rank badges, weak-spot callouts
  - Plan 008: onboarding quiz answers now save to the account on first
    confirmed sign-in (via a localStorage stash + flush), so match_score can
    populate from an onboarding signup, not just the standalone questionnaire
  - Built `/dotaznik` — the standalone questionnaire had a backend
    (`lib/questionnaire.js`) but no frontend page anywhere on `main` until today
  - Matrix: hover tooltips per criterion, "Jak to funguje?" explainer panel,
    confirm-guard on de-prioritizing the match-score criterion
- Marketing: built a spreadsheet of 25 Prague elementary schools with contact
  emails, for a B2C beta-recruitment strategy — one outreach email to each
  school asking them to forward a beta-test invite to their 9th graders.
  Not yet sent (site wasn't deployed yet at the time).
- Bugs: found and fixed a real P0-adjacent one — `questionnaire_runs.source`
  column (part of plan 008's schema) had never been applied to the live
  Supabase project despite the plan being marked DONE, so every
  `/api/questionnaire*` call was silently failing with a blank 500. Root
  cause: a migration written but never run. Fixed; see `plans/README.md`'s
  correction note on plan 008.
- Decisions: none new
- Blockers:
  - Onboarding-flush end-to-end still unverified on a real account (see above)
  - Rozhodovací matice needs a human review pass before it's trusted as "done"
  - New: "selectivity as a preference" is missing across the whole product
    (questionnaire, onboarding quiz, matrix, search/filters, comparison) —
    see `UNFORGET.md`
- Next step: this file's own Day 1 checklist (§12 "DAY 1 — Launch Audit +
  Critical Path" in the launch plan) hasn't been run yet — the work above was
  reactive (bug fixes + a UI gap the founder pointed out), not the audit
  itself. Do the audit next: walk through every P0 question in that section
  against the real app and record answers here.

## Day 2 (2026-09-13)
- Status: Development-heavy day; marketing again fell short of the plan's ~2h/day target
- Completed:
  - Deployed to production: Railway (backend, EU West, Node bumped to 22+ for
    Supabase realtime's WebSocket requirement) + Vercel (frontend). Full smoke
    test passed live: signup, email confirmation, sign-in, `/dotaznik`,
    `/skoly`, school detail, `/porovnani/matice`.
  - Plan 009: real Stripe payments implemented for both plans (code done,
    **not yet tested** — see UNFORGET.md's maximum-urgency warning before any
    live key goes in). Season pass built as a Stripe subscription with a 3-day
    trial + absolute `cancel_at` so it still charges exactly once.
  - Prague school database expanded from 60 → 224 schools (target was ~214),
    via a new official-registry-backed script — see "Database" section above.
- Marketing: rebrand decision made (Střední na míru → "Kam na střední?" → landed on
  "Střední na míru" after two rounds of collision-checking — Kam na střední's
  domain was taken, Školio collided with an existing school-management SaaS).
  Not yet executed in the codebase. No content published, no creator/parent
  outreach sent today — this is the second day running marketing hours went
  to something not on the Week 1 plan's checklist.
- Bugs: none new (yesterday's `questionnaire_runs.source` bug stays fixed)
- Decisions: new brand name locked in ("Střední na míru"); Stripe test-mode
  account will be the founder's own, since he's under 18 and can't legally
  hold a live one — going live needs a parent/guardian or an s.r.o.
- Blockers:
  - Railway is on a 30-day trial ($4.99 credit) — must upgrade before ~2026-10-13
  - Stripe payment code is untested — deep manual review required before trusting it, per UNFORGET.md
  - Rebrand decided but not executed anywhere in the codebase yet
  - Marketing outreach (creator/parent contacts, content, TikTok/IG accounts) still at zero across two days
- Next step: per the launch plan's Day 3 (§14), Stripe testing is now the
  priority development task; marketing needs to actually execute the Day
  1/Day 2 checklist items that have been skipped twice — content + outreach,
  not more planning

Continue adding days.

Do not turn this into a diary.

---

# 26. Decision Log

| Date | Decision | Reason | Status |
|---|---|---|---|
| — | Prague first | Largest initial opportunity and founder familiarity | Active |
| — | B2C first | Fastest path to initial revenue | Active |
| — | Percentage matching retained | Preserves ranking differentiation across ~214 schools | Active |
| — | Season pass preferred | Customer need is tied to one admissions season | Testing |
| — | Faceless content | Founder wants anonymity | Active |
| — | Affiliate acquisition favored | Limited upfront marketing cash | Active |

When a strategic decision changes, record:
- previous decision
- new decision
- reason
- evidence

---

# 27. Updating This File

Whenever the founder reports meaningful progress, update this file.

Examples:

"Stripe is finished."

→ Update Stripe to 100%, update blockers and daily log.

"I got 12 testers."

→ Update tester count, acquisition pipeline, daily log, and next beta target.

"5 TikToks produced 300 visitors and zero sales."

→ Record content output, traffic, conversion result, and investigate the funnel.

Never invent metrics.

If a number is approximate, keep it approximate.

---

# 28. Handling Unknowns

If status is unknown:

1. Inspect the codebase if possible.
2. If still unknown, say it is unknown.
3. Ask the founder only if it materially changes the next action.
4. If you can still make a useful plan, state the assumption and proceed.

Do not repeatedly ask questions that the codebase can answer.

Do not block execution with unnecessary questionnaires.

---

# 29. Do Not Optimize for Busyness

The goal is not to fill every hour.

The goal is:

1. launch on time;
2. get real users;
3. get first paying customers;
4. discover conversion blockers;
5. improve the product;
6. scale working acquisition channels.

Choose the highest-leverage work, not the largest number of tasks.

---

# 30. Do Not Overbuild Before Validation

The founder can build quickly with AI.

This creates a risk of endless development.

Once P0 blockers are solved, push toward real users.

Do not spend weeks polishing features that can be validated later if the core product is already safe and credible enough to test.

---

# 31. Seasonal Urgency

The target user is a 9th grader making an important school decision.

Therefore:

**Every unnecessary launch delay has potential economic cost.**

When choosing between:
- a perfect feature that can wait;
- getting a credible product into real users' hands;

prefer the second when the product is safe and useful enough.

---

# 32. Launch Readiness Audit

Before recommending public launch, verify:

## Product
- [ ] Core onboarding works
- [ ] Matching works
- [ ] Database is sufficiently complete
- [ ] School pages work
- [ ] Paywall works
- [ ] Payment works
- [ ] Entitlements work
- [ ] Accounts work
- [ ] Mobile experience acceptable
- [ ] Critical bugs resolved

## Trust
- [ ] Data sources handled appropriately
- [ ] AI limitations communicated
- [ ] No misleading claims
- [ ] Privacy/security basics addressed
- [ ] Support route exists

## Analytics
- [ ] Funnel events
- [ ] Acquisition attribution
- [ ] Checkout tracking
- [ ] Payment confirmation
- [ ] Error monitoring where practical

## Marketing
- [ ] At least one acquisition channel active
- [ ] Beta/customer acquisition pipeline
- [ ] Creator outreach system
- [ ] Landing page ready
- [ ] Launch offer ready
- [ ] Referral tracking if applicable

## Operations
- [ ] Transactional emails
- [ ] Refund/cancellation process
- [ ] Customer support
- [ ] Data-update process

Do not require every P3 feature before launch.

---

# 33. Core Strategic Principles

Protect these:

### Honest recommendations
Schools cannot buy better rankings.

### Useful product
The product must genuinely save time and improve decision quality.

### Marketing cannot permanently fix weak value
If conversion is poor, investigate the product/funnel.

### Revenue matters
The short-term business objective is generating revenue.

### Data-driven iteration
Build → test → measure → improve.

### Fast execution
Avoid unnecessary delays.

### Bootstrap economics
Prefer low-upfront-cost acquisition until revenue exists.

### Seasonal urgency
Launch while the decision is still relevant.

---

# 34. If the Founder Asks "What Do I Do Today?"

Do not answer with generic advice.

Determine:

- current day
- available hours
- current phase
- unfinished P0/P1 work
- acquisition pipeline
- relevant roadmap tasks
- actual codebase state

Then give:

1. exact first task;
2. exact second task;
3. exact third task;
4. time allocation;
5. definition of done;
6. what not to work on;
7. tomorrow preview.

---

# 35. If the Founder Says "I Finished X"

Immediately:

1. update this file;
2. identify what X unblocked;
3. choose the next highest-priority action;
4. tell the founder what to do next.

Do not simply congratulate them.

---

# 36. If the Founder Has Only 1–2 Hours

Compress the plan.

Prefer:
- one P0 task;
- or one high-leverage acquisition task;
- or one P0 + one small acquisition task.

Do not create an unrealistic mini-checklist.

---

# 37. If the Founder Has 5–6 Hours

Create a full workday schedule with:
- development where necessary;
- actual marketing/outreach;
- testing/measurement;
- short breaks only if useful.

Do not make every day 100% development.

After P0 blockers are sufficiently controlled, maintain meaningful marketing execution every week.

---

# 38. The Launch Plan Is Executable

`skolamatch_full_launch_marketing_plan_v2.md` is both:

- the strategic roadmap;
- the intended execution plan.

If the founder asks for a plan and the roadmap does not contain enough tactical detail, **generate the tactical plan yourself from the roadmap, this status file, and the 90-point context**.

Do not respond with:

> "See the plan."

Instead explain exactly what to do.

---

# 39. Recommended Daily Command

The founder can use:

> "It is Day X. I have Y hours. Read the current status, the launch plan, and the codebase. Tell me exactly what I should do today in priority order. Do not give me generic advice. Give me the first task I should start right now, how to do it, what counts as done, and what I should do tomorrow."

This is the preferred operating mode.

---

# 40. Final Operating Rule

At any moment, Claude should be able to answer:

> **"Given where SkolaMatch actually is right now, what is the highest-value thing I should do next to launch and generate revenue?"**

The answer must combine:

- actual project state;
- business context;
- launch roadmap;
- current evidence;
- available time;
- dependencies;
- expected revenue impact.

Do not merely describe what should happen.

**Tell the founder what to do, in what order, why it matters, how to do it, and what "done" means.**

Then update this file so the next decision starts from the new reality.
