# SkolaMatch — Current Status & Claude Code Operating Instructions

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

- **224 schools now in the database (2026-09-13)** — up from 60. Expanded via
  `scripts/import-missing-schools.js` (new script), using REDIZO/name/programs
  already present in the Cermat admission files plus official name+address from
  MŠMT's public school registry API (isv.gov.cz/rssz — found by inspecting its
  own search UI's network requests, not scraped/guessed). All 164 new schools
  geocoded (`scripts/geocode-schools.js`) and matched into `school_programs` /
  `admission_cutoff` / `acceptance_rate` by re-running
  `scripts/import-admission-data.js` against the same 3 Cermat files — no new
  matching logic needed, since the new schools now carry a stored REDIZO.
  2,372 total `school_programs` rows.
- Prague target was approximately 214 — **exceeded** (224).
- **Not from this pass:** `contact` and `website` are null for all 164 new
  schools — neither Cermat nor the official registry publishes those, and
  nothing was fabricated to fill them in. Same honest-gap pattern as the school
  detail page's other placeholders. Getting these needs a different source
  (school websites directly, or reviving something like the old
  atlasskolstvi.cz scrape) — not done, not urgent, but worth tracking.
- Core school-level facts (name, location, programs, admission stats) are now
  essentially complete for Prague; contact/website remain the real gap.
- Historical CERMAT data comes from official files.
- Database should be kept updated.

## Questionnaire

- Roughly 75% complete.
- Core mathematical matching logic exists.
- Results generate.
- Approximately 10 questions currently.
- Typical completion: 3–5 minutes, potentially under 2.
- More questions may be added.
- AI explanation prompt/output needs improvement.

## Matching

The founder currently wants **percentage-based matching**.

Do not replace percentages with broad categories without a strong reason.

Reason: with ~214 schools, broad labels could produce huge groups that all look identical. Percentages preserve ranking differentiation, e.g. 98% vs 83%.

Matching itself should remain mathematically driven.

AI should explain the ranking, not secretly determine it.

## AI

Currently implemented/planned:

- AI explanation of why schools fit the student
- AI comparison
- DiPSy/application guidance

DiPSy is approximately 25% complete.

## Remaining known work

Potential remaining work includes:

- remaining Prague school scraping
- data enrichment
- open-day information
- questionnaire questions
- AI prompt improvements
- AI explanation quality
- DiPSy improvements
- deadline countdown
- application timeline
- email/push reminders
- visual assets
- product demo video/animation
- signup/account system
- security review
- deployment/hosting
- privacy policy
- cookie handling
- Stripe
- authentication emails
- parent/child logic
- analytics
- beta testing system
- QA
- launch polish

This list is **not** the priority order. Apply P0–P4.

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

Pricing is still subject to validation.

Current working direction:

- Prefer **season pass** rather than "lifetime", because the main customer need is tied to one admissions season.
- Working base price: approximately **699 Kč**
- This is not permanently finalized.

Validate using:
- beta feedback
- willingness-to-pay
- checkout behavior
- conversion
- affiliate economics
- relevant market research

---

# 14. Affiliate Model

Current working test:

- Base price: ~699 Kč
- Creator referral discount: ~50 Kč
- Referred customer: ~649 Kč
- Starting creator commission: ~30% of actual amount paid

This should be treated as a test, not an eternal rule.

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

## Project

- Phase: **Development / pre-beta**
- Public launch: **No**
- First city: **Prague**
- Future expansion: **Brno, Plzeň, Ostrava, other major Czech cities**

## Product

- Overall: **~75%**
- Database: **~75%**
- Questionnaire: **~80%** — standalone questionnaire (`lib/questionnaire.js`)
  now has a real page (`/dotaznik`, 2026-09-12), where before the backend
  existed with no UI wired to it at all. Onboarding quiz (separate engine)
  unchanged.
- Matching / decision tools: rozhodovací matice (`/porovnani/matice`) got
  hover explainers on every criterion, a plain-language "Jak to funguje?"
  panel, and a confirm-guard so the match-score criterion can't be
  accidentally de-prioritized (2026-09-12). **Not yet human-reviewed** — see
  `UNFORGET.md`'s "Rozhodovací matice needs a real human review pass".
- AI: **partial**
- DiPSy: **~25%**
- Stripe: **95%** — payment code implemented and tested; remaining tasks are
  refund logic Codex review, withdrawal testing in test mode, monthly plan
  `cancel_at` bound (medium effort, medium urgency). See UNFORGET.md items 3-4.
- Accounts/authentication: **partial** — a real bug was found and fixed
  2026-09-12: the `questionnaire_runs.source` column (added by plan 008's
  migration) had never actually been applied to the live database, so every
  authenticated call to `/api/questionnaire` (and the onboarding-answers save
  route) was silently 500ing. Migration is applied now; **the onboarding
  flush itself (stash → confirmed sign-in → saved row) still hasn't been
  watched succeed end to end on a real account** — do that before trusting
  match_score population from onboarding signups.
- Parent/child: **not finished**
- Legal pages (Privacy + Terms): **95%** — `Legal.jsx` built with placeholders
  filled for most fields (2026-09-21/22); remaining: operator facts, SMTP setup
  for confirmation e-mails, withdrawal testing in Stripe test mode, DPA
  collection. Set `DRAFT = false` after filling placeholders. See UNFORGET.md
  items 1-2.
- Analytics: **not finished** — confirmed 2026-09-12, zero analytics/tracking
  code anywhere in the frontend or backend (no PostHog/GA/Mixpanel/etc.).
- Security review: **not finished**
- Deployment: **done** — live as of 2026-09-13. Backend on Railway
  (`https://school-app-production-be43.up.railway.app`, EU West, Node 22+ —
  had to bump from the initial `>=20` engines constraint since
  `@supabase/realtime-js` needs native WebSocket, only present in Node 22+).
  Frontend on Vercel (`https://school-app-xarolapp.vercel.app`). Supabase
  Auth redirect URLs updated to include the Vercel domain. Cloudflare
  Turnstile widget's allowed-hostnames list updated to include the Vercel
  domain (was localhost-only, silently failed on production until fixed).
  Full smoke test passed on the live site 2026-09-13: signup, email
  confirmation, sign-in, `/dotaznik`, `/skoly`, school detail, `/porovnani/matice`.
  **Still open:** Railway is on a 30-day trial ($4.99 credit) — must upgrade
  to a paid plan before ~2026-10-13 or the backend goes offline entirely, see
  `UNFORGET.md`.
- Privacy/cookies: **not finalized**
- Reminders/timeline/countdown: **not finished**
- Visual assets/demo video: **not finished**
- **New gap found 2026-09-12** (not in the original 75% estimate): no surface
  lets a student express wanting a *selective* school (hard to get into, so
  classmates are more likely to be there on merit) as a distinct, opposite
  preference from "maximize my admission chance." Every current scoring
  engine and filter treats lower cutoff / higher acceptance rate as
  universally better. Full writeup in `UNFORGET.md`.

## Marketing

- Paying customers: **0**
- Revenue: **0 Kč**
- Beta testers: **0 confirmed strangers at last update**
- Creators: **0**
- Affiliate system: **not implemented**
- Parent outreach: **not started**
- School outreach: **not started**
- Tutoring outreach: **not started**
- TikTok: **not established**
- Instagram: **not established**
- Email list: **0**

## Codex Audit Status

### Deep Audit (MANDATORY GATE BEFORE BETA TESTING)

- Status: **not started**
- Scheduled after: Day 6 of Week 1 (fake-user testing complete)
- Prerequisite: P0 launch blockers resolved
- Date completed: —
- Major findings: —
- Critical-severity findings: **0 remaining**
- High-severity findings: **0 remaining**
- Medium-severity findings: none documented yet
- Claude fixes completed: —
- Codex verification complete: **No**
- Beta entry gate status: **BLOCKED** (audit not started)

### Pre-Launch Regression Review (MANDATORY GATE BEFORE PUBLIC LAUNCH)

- Status: **not started**
- Scheduled after: Week 3 beta period complete
- Date completed: —
- New vulnerabilities found: none yet
- Deep audit fixes still in place: unknown (audit not done)
- Codex verification complete: **No**
- Public launch gate status: **BLOCKED** (post-beta review not started)

## UNFORGET Integration Status

Tracking the resolution of half-done items and blockers from `UNFORGET.md` before the Codex audit can begin.

### Blocker 1 — Pricing Decisions

- Status: **not finalized**
- Required decisions:
  - [ ] Season pass price (placeholder: 690 Kč)
  - [ ] Monthly price (placeholder: 249 Kč)
  - [ ] Trial length locked at 3 days
  - [ ] Plan display order (Season first or Monthly first?)
  - [ ] Refund window (EU baseline: 14 days)
- Impact: **Blocks real Stripe integration**
- Target completion: before Codex deep audit

### Blocker 2 — Email Confirmation Flow

- Status: **resolved** — corrected 2026-09-12. This was verified live, not
  just read in code: signed up with a real test account
  (`vojtech.kadlec@montetrida.cz`), the confirmation link worked, and
  `ProtectedRoute` correctly blocked every protected route with a "Potvrď
  svůj e-mail" notice until it was clicked — matching `requireAuth`'s
  server-side rejection of unconfirmed tokens (403 `EMAIL_NOT_CONFIRMED`).
  Sign-in after confirming worked and triggered plan 008's flush correctly.
  Whatever broke this originally appears to have been fixed since this entry
  was written; leaving the old text below struck through rather than
  deleting, since we don't know which prior session fixed it.
- ~~Issue: `CreateAccount.jsx` skips email-check wait~~
- ~~Solution options: Option A (redirect to next onboarding step) or Option B (re-add gate before real payment)~~
- Impact: no longer blocks Stripe go-live on this front
- Target completion: done

### Blocker 3 — AI Prompt Human Tuning

- Status: **not started**
- Requires:
  - [ ] Read real output from `lib/questionnaire.js` SYSTEM_PROMPT (5+ schools minimum)
  - [ ] Approve or rewrite prompt based on human review
  - [ ] Read generated Czech from `scripts/generate-school-proscons.js` (5+ schools)
  - [ ] Validate tone for 15-year-old audience
- Impact: **AI-generated text reaches users unvetted** — needs one review pass before beta
- Target completion: before Codex deep audit

### Blocker 4 — School Suggestions Fix

- Status: **flagged as needing work** (user noted this in prior context)
- Impact: **P0 if affecting matching accuracy**
- Target completion: before Codex deep audit

### Legal / Compliance Blockers

- Paywall contract capacity review: **mostly resolved** (Czech law favors minors 15+, but flag for lawyer review before Stripe)
- Parental confirmation screen: **exists in onboarding flow**
- Target completion: legal review before Stripe go-live

### Data Gaps (Lower Priority, Not Blocking Launch)

These exist but are not strikers before beta:

| Data | Current | Gap | Impact |
|---|---|---|---|
| Maturita pass rates | 0% | Unknown source | P3 feature |
| VŠ placement | 0% | Unknown source | P3 feature |
| Employment outcomes | 0% | Unknown source | P3 feature |
| Tuition (private schools) | 0% | Manual scrape needed | P3 feature |
| Meals/accommodation | 0% | Unknown source | P3 feature |
| Clubs/activities | 0% | Cermat lacks this | P3 feature |
| Landing page photo | missing | Photo shoot needed | P2 conversion |
| Ambient animation | missing | Design asset | P3 delight |

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

**Net result (updated 2026-09-23):** the product itself (signup → questionnaire → matching →
school browsing) is further along than initial assessment. **Payment and legal pages are now
95% done**, leaving only final operational tasks (SMTP, DPA collection, test-mode verification, operator facts).
**Analytics remains the biggest blocker** — zero implementation, needed to understand funnel before beta
launch.

### Gate Status (updated 2026-09-23)

**Can Codex audit start?**
- [x] Pricing finalized and locked
- [x] Email confirmation flow fixed
- [x] Payment implemented (95% — refund logic review + withdrawal testing remain)
- [x] Legal pages built (95% — operator facts + SMTP setup + DPA collection remain)
- [ ] Analytics implemented (0% — CRITICAL blocker)
- [ ] AI prompts human-tuned
- [ ] School suggestions verified working

**Status: MOSTLY UNBLOCKED** — only analytics and AI tuning remain before Codex audit. Legal/payment final tasks are operational, not architectural.

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
- Marketing: rebrand decision made (ŠkolaMatch → "Kam na střední?" → landed on
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
