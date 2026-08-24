# School Selection App — Project Context

## The Problem This Solves

In the Czech Republic, when 9th graders need to pick a high school (*střední škola*),
there's no single good place to research options. The one directory site that lists
all schools (atlasskolstvi.cz) is old and clunky, and doesn't help students figure out
which school actually fits them. Students end up manually digging through dozens of
individual school websites, or asking ChatGPT one-off questions with no real structure.

## The Product

An app + website (branded **ŠkolaMatch** — see onboarding agent below). The mobile
app is the intended primary surface at launch; the web app is being built first and
remains a full second surface (see "Platform Strategy"). It:
1. Provides a clean, searchable database of high schools — location, programs,
   admission requirements, contact info — all in one place
2. Offers an AI-powered questionnaire — student answers questions about interests,
   grades, and preferences, app suggests best-fit schools, ranked by match
3. Lets students save favorites and compare schools

## Monetization Plan

- **Both students and parents are buyers** — this is a deliberate, corrected decision,
  not an assumption. Teenagers will pay ~250 Kč / ~10 USD for help with a decision this
  consequential (same demographic pays for Spotify, Duolingo Super). Parents also pay,
  independently. Neither is a funnel into the other — see the onboarding agent section
  below for how this is implemented in the flow.
- **Pricing structure — settled through three passes of research, not guessed.**
  Pass 1 (2026-08-23): recurring monthly + weekly. Pass 2 (same day): dropped weekly
  — it converts well specifically because users lose track of a small recurring
  charge, the exact mechanism the EU Digital Fairness Act targets, worse where the
  payer may be a minor — landed on monthly-pre-selected + season-secondary. Pass 3
  (same day, follow-up research specifically on single-lifetime-use apps): **flipped
  the default to season.** ŠkolaMatch is used exactly once per person, ever — it
  isn't "seasonal-recurring" the way a fitness app is, so recurring billing solves a
  renewal problem this product doesn't have. Real-world precedent: UWorld (exam prep,
  the closest analog) sells fixed-window passes that expire, not subscriptions.
  **Current, final structure: Sezónní přístup (one-time, pre-selected, fixed-window
  framing — never "lifetime access") + Měsíční (recurring, secondary, framed as the
  trust/easy-exit option for an unfamiliar brand, not a discount decoy).** Two plans,
  not more — Hick's Law makes extra tiers cost conversion at the worst possible
  moment. Re-open this decision only if paid CPI ad acquisition (Meta/Google) is ever
  added — that changes the CAC math this rests on. See agent ruling C-8 for full
  reasoning, and `docs/sources/pricing_research.md` for both research passes.
  Already implemented in `frontend/src/config/pricing.js`.
- **Parental confirmation required at payment on the student branch.** New requirement
  from the same research — before the (mocked) charge completes, the student-side
  paywall must show an explicit parental-confirmation checkpoint, not a silent charge
  on a parent's saved method. Real UI, not a stub — see C-8.
- **3-day free trial**, then billing begins. A day-2 reminder email is **mandatory**
  before real billing goes live — see agent ruling C-1. Research flags 3-day trials as
  carrying the highest Day-0/Day-1 rushed-cancellation risk of any trial length; kept
  as-is per the user's explicit choice, watch conversion data rather than silently
  lengthening it. Note `feature-brainstorm.md` rates one-time purchase 🔥 and monthly
  ✅ — written before the recurring decision, now partially superseded (one-time is
  back in the mix per the research, weekly never was and stays out).
- **Exact prices are not yet fixed.** They live as named constants in a single config
  module (`frontend/src/config/pricing.js`) so they can change in one place.
- Schools may pay for visibility/partnerships once the platform has real users
- Promotion via teenage TikTok/Instagram influencers (affiliate model)

---

## Quick Start — Running the App Locally

**No root `package.json` exists yet.** `server.js` currently runs on globally-available
or ad-hoc-installed packages. If `node server.js` fails with `MODULE_NOT_FOUND` for
`express`, `cors`, `dotenv`, or `@supabase/supabase-js`, that's why — see
"Known Issues" below. This is priority #2 in the MVP scope list.

**Backend** (from repo root):
```bash
node server.js
```
Starts on `http://localhost:5000`. Reads `SUPABASE_URL`, `SUPABASE_KEY`, `PORT` from
`.env` (exists locally, gitignored, not committed — ask the user if you need a value
from it, never print its contents to chat or logs).

**Frontend** (from `frontend/`):
```bash
cd frontend
npm install   # only needed once / after dependency changes
npm run dev
```
Starts on `http://localhost:5173`. Reads `VITE_API_BASE_URL` from env if set, otherwise
defaults to `http://localhost:5000` (see `frontend/src/api.js`).

**Run both** in separate terminal tabs/panes — they don't share a process.

**Verifying changes:** always start the dev server and check the running app in a
browser before reporting frontend work as done — do not ask the user to check manually
themselves. Use the browser pane / preview tools for this.

---

## Current Tech Stack

- **Backend:** Node.js + Express (`server.js`), no root `package.json` yet (see Known Issues)
- **Database:** Supabase (PostgreSQL)
- **Frontend:** React 19 + Vite 8 + React Router 7, in `frontend/` (Vite, not CRA/Next)
- **Frontend linting:** `oxlint` (`npm run lint` inside `frontend/`) — not ESLint
- **AI:** Claude API (planned for the questionnaire matching logic — not built yet)
- **Scraping:** n8n + Firecrawl + Gemini 2.5 Flash Lite (external workflow, not in this repo)
- **Payments:** Stripe (planned, not integrated yet)
- **Mobile app:** planned before public launch, framework not yet chosen. Intended
  primary surface — see "Platform Strategy" directly below.

## Platform Strategy

ŠkolaMatch ships on two surfaces and both matter:

- **Mobile app** — the intended *primary* surface at launch. Not built yet, framework
  undecided. Most usage is expected here, matching the acquisition channel (Czech
  teenage TikTok/Instagram influencers — overwhelmingly mobile traffic).
- **Web** — being built first, and permanently first-class, not a landing page.
  Desktop browser matters especially for the parent persona (researching on a laptop)
  and for students on school computers.

**What this means for anything built now:**
- The onboarding/quiz/paywall flow will eventually need to exist, or hand off
  sensibly, on both. Don't bake web-only assumptions into the flow's state model.
- Quiz answers live in `sessionStorage` — deliberate GDPR minimisation, but it also
  means state does not survive a device switch. Web→app handoff is an open design
  problem, not a solved one.
- The visual system in `docs/sources/design_system.md` was designed 390px-mobile-first,
  which suits the app; desktop web layout is still undesigned.
- Framework choice is open. React Native would allow reusing the existing React
  components and the `matching.js` / `schoolFeatures.js` scoring engine — a reason to
  prefer it, not a decision yet.

## Supabase Schema

Table: `schools`
| Column | Type |
|---|---|
| id | int8 (primary) |
| created_at | timestamptz |
| name | text |
| location | text |
| programs | text |
| contact | text |
| website | text |

RLS is currently **disabled** for development/testing. **Do not enable RLS without
telling the user first** — it's an intentional dev-time choice, but it needs a real
policy before any real user data (auth, quiz answers, payments) touches this project.

---

## Repo Map

```
school-app/
├── .env                        # Supabase creds + PORT — gitignored, never commit
├── .gitignore
├── CLAUDE.md                   # this file
├── README.md                   # currently near-empty
├── server.js                   # Express backend, root-level, no package.json yet
├── .claude/
│   ├── agents/
│   │   └── onboarding-architect.md   # scoped subagent — see below
│   └── settings.local.json
├── docs/
│   └── sources/
│       ├── claude_code_ui_ux_guide.md   # REQUIRED READING before any frontend work — see below
│       ├── onboarding.md                 # archival — fully merged INTO onboarding-architect.md
│       ├── feature-brainstorm.md         # full feature roadmap/ratings — REQUIRED READING before proposing new features or scope — see below
│       └── pricing_research.md            # 2025/2026 subscription pricing + EU minor-payment research — read before touching pricing/plan structure
└── frontend/
    ├── package.json             # React 19, Vite 8, React Router 7, oxlint
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               # route table — add new routes here
        ├── App.css / index.css
        ├── api.js                # fetch helpers, talks to backend on :5000
        ├── components/
        │   └── Layout.jsx        # nav + <Outlet/>, wraps every route
        └── pages/
            ├── Home.jsx
            ├── Search.jsx
            ├── SchoolDetail.jsx
            └── SignUp.jsx
```

**Before building or editing ANY frontend UI (components, pages, styling, layout —
not just onboarding), read [`docs/sources/claude_code_ui_ux_guide.md`](docs/sources/claude_code_ui_ux_guide.md) first.**
It's the psychological-principles source (dopamine loops, IKEA effect, cognitive load,
emotional design levels, etc.) merged into the onboarding agent, but its UI/UX guidance
applies to the whole app, not just onboarding screens — general search/browse/detail
pages should feel like the same product as the onboarding flow, not a different app
bolted on. This is a standing instruction, not a one-time read — re-check it whenever a
frontend task starts a new session or touches a part of the UI you haven't touched yet
this session.

`docs/sources/onboarding.md` is archival only — its content is fully merged into
`.claude/agents/onboarding-architect.md`. No need to read it directly; consult the
agent file instead when the task is onboarding/quiz/paywall-specific.

**Before proposing new features, scope additions, or a build-order decision, read
[`docs/sources/feature-brainstorm.md`](docs/sources/feature-brainstorm.md).** It's an
exhaustive, pre-rated feature list (🔥 build early / ✅ build eventually / 🟡 marginal /
❌ skip, with reasoning for each) covering search & discovery, AI features, the Czech
admissions process, monetization, growth/virality, B2B, legal/GDPR, and a recommended
5-phase build order. Checking it first prevents re-deriving a feature idea (or its
rating) from scratch, and prevents suggesting something already marked ❌ with a stated
reason (e.g. leaderboards, social feeds, display ads — all explicitly rejected as
harmful or low-value for a minors-focused product). If a task touches "what should we
build next" in any form, this file is the first thing to check, not CLAUDE.md's shorter
MVP list — that list is the current build target; this file is the full backlog behind it.

**Design tokens live in JS, not CSS — this is deliberate and load-bearing.**
`frontend/src/design/tokens.js` is the single source of truth for every colour,
font, radius, spacing value and type size. React Native cannot read CSS variables
but *can* import a JS module, so keeping tokens in JS is what makes the visual
system portable to the mobile app (see "Platform Strategy").

- `tokens.js` → hand-edited. Add new tokens here, never in a stylesheet.
- `tokens.css` → **auto-generated, do not hand-edit.** Regenerate after any token
  change with `npm run tokens` (from `frontend/`).
- The generator emits both the new token names (`--surface`, `--ink2`, `--ok`, …)
  and legacy aliases (`--text`, `--accent-bg`, …) that the existing stylesheets
  already consume, which is why the palette swap didn't require rewriting
  `onboarding.css`'s 1,200 lines. Prefer the new names in anything new.
- Fonts (Newsreader + Hanken Grotesk) load from Google Fonts in `index.html`.
- **Never hardcode a colour or radius** in a component or stylesheet.

**Mobile preview:** `http://localhost:5173/mobile-preview.html` renders the live
app inside a 390×844 phone frame (dev tooling only, `frontend/public/`).

**Conventions already in place — follow them, don't reinvent:**
- Pages live in `frontend/src/pages/`, shared UI in `frontend/src/components/`, both
  registered as routes in `App.jsx`.
- API calls go through `frontend/src/api.js` — add new fetch helpers there, don't
  scatter raw `fetch()` calls through page components.
- Backend routes are flat in `server.js` (`GET /api/schools`, `GET /api/schools/:id`).
  No router files, no controllers/ directory yet — don't introduce that layer until the
  route count actually justifies it.
- Error handling pattern already established: `api.js` throws on non-ok response,
  pages catch and show a plain "Failed to fetch" message. Match this, don't add a new
  error-handling abstraction without discussing it first.

---

## What's Already Built

1. **Backend server** (`server.js`) — Express, connected to Supabase via `.env`.
   - `GET /` — health check
   - `GET /test-db` — confirms Supabase connection, queries `schools` table
   - `GET /api/schools` — returns all schools
   - `GET /api/schools/:id` — returns one school by ID

2. **n8n scraping workflow** (separate from this codebase, runs independently):
   - Scrapes atlasskolstvi.cz directory (Prague region, pages 1-3) via Firecrawl
   - AI extraction (Gemini 2.5 Flash Lite) pulls `{name, url}` pairs from each page
   - Aggregates + splits into ~60 individual school items
   - Loops through each school's individual profile page, scrapes it via Firecrawl
   - AI extraction pulls structured `{name, location, programs, contact, website}`
   - Validates required fields (name, location not empty)
   - Inserts into Supabase `schools` table
   - Logs result (Success/Needs Review) to a Google Sheet for tracking

3. **GitHub repo:** `school-app` under account `XarolApp`

4. **React frontend** (`frontend/`) — Vite + React Router
   - Pages: Home, Search, School Detail, Sign Up
   - Navigation bar + Layout wrapping all pages
   - Basic styling (colors, buttons, forms)
   - `api.js` fetch helper with graceful "Failed to fetch" error handling
   - Verified working on localhost:5173

5. **Onboarding agent** (`.claude/agents/onboarding-architect.md`) — a scoped subagent
   for onboarding, quiz flow, paywall, pricing and conversion work only. Merges
   `claude_code_ui_ux_guide.md` (psychological principles) and `onboarding.md`
   (onboarding structure) into one non-conflicting instruction set, with explicit
   conflict rulings, ŠkolaMatch constraints (dual persona, zero-shame, EU minors),
   and a canonical 23-screen flow spec. Invoke with the Agent tool using
   `subagent_type: "onboarding-architect"`. **Do NOT use it for general feature work**
   (search, school detail pages, auth, backend endpoints, scraping) — only for
   onboarding/quiz/paywall/conversion surfaces.

   Key product decisions encoded in it — treat these as settled, don't re-litigate
   them without the user raising it:
   - **Both students and parents are buyers.** The onboarding asks "Kdo jsi?"
     up front and branches voice (tykání/vykání), proof type, motion level and
     price framing. Both branches end at a real purchase — neither is a funnel
     into the other. Track conversion by role separately.
   - **Zero-shame UX** — never guilt, shame, or fear-based copy aimed at a 15-year-old.
     Skipped quiz answers never penalize score.
   - **One-time paywall offer** is allowed on the first paywall view only, with
     server-side entitlement so it genuinely never reappears — a cookie/localStorage
     implementation would make the "one-time" claim false and cross into EU
     dark-pattern territory (DSA Art. 25) given the audience is minors.

7. **Onboarding flow + paywall** (`frontend/src/pages/onboarding/`) — the full
   23-screen ŠkolaMatch flow, built 2026-08-23. Payment is MOCKED.
   - **Step controller:** `OnboardingFlow.jsx` + `steps.js`, step id lives in the
     URL (`/onboarding/:stepId`), routes registered outside `Layout` in `App.jsx`.
   - **Role fork** at screen 2 branches voice, proof, motion, price framing and
     question phrasing. Role in `localStorage`, switchable mid-flow without
     losing answers. Quiz answers are client state (`sessionStorage`) only —
     nothing about a minor is written to Supabase during onboarding.
   - **Scoring:** `frontend/src/lib/matching.js` + `schoolFeatures.js`.
     Deterministic, auditable, no AI in the numbers. Features are derived from
     the only columns that exist (`name`, `location`, `programs`), each with a
     `known` flag; unknown or unanswered components are dropped and the weights
     renormalised, so **skips lower confidence, never score**. Results are shown
     as BANDS + "shoda podle: …", never a fake percentage. Explanation sentences
     are template-based with a `TODO(claude-api)` where the Claude call goes.
   - **Pricing config:** `frontend/src/config/pricing.js` — every price, plan and
     trial string. All prices are PLACEHOLDERS. Plans are **Měsíční (recurring,
     pre-selected, 3-day trial)** and **Sezónní přístup (one-time)**. Weekly was
     dropped mid-build per `docs/sources/pricing_research.md` — do not add it back.
   - **Parental confirmation** step on the student-branch checkout before the
     (mocked) charge. Real UI, not a stub.
   - **One-time offer** entitlement is a dev stub in `lib/offerEntitlement.js`
     using localStorage, with a header explaining why that is NOT production safe.
   - **Social proof** (`config/socialProof.js`) is deliberately empty — no invented
     user counts or testimonials. Proof screens fall back to methodology claims
     that are true today, and switch over automatically when real data is added.
   - **Demo fallback:** `lib/demoSchools.js` (fictional names, "(ukázka)") is used
     when `/api/schools` returns empty (Supabase paused) and the UI says so.

## What's NOT Built Yet (MVP Scope)

Estimated ~45 hours remaining, in priority order:

1. **Modern design system** — upgrade frontend styling (colors, fonts, spacing) so all new pages look polished automatically (~2h)
2. **Fix backend project setup** — add root `package.json`, `npm install` the deps
   `server.js` already imports (`express`, `cors`, `dotenv`, `@supabase/supabase-js`),
   confirm `node server.js` runs clean from a fresh clone (~1h)
3. **Connect frontend to backend** — test data flow from Supabase → backend → frontend (~2h)
4. **Search & Filter enhancement** — currently basic, make it better (~8h)
5. **School Detail Pages** — currently skeleton, add full info display (~12h)
6. **Sign Up & Login** — wire to Supabase Auth (~10h)
7. **AI Questionnaire** — 10 questions → Claude API matches student to best-fit schools (~10h) — build this LAST
8. **Onboarding flow** — build via the `onboarding-architect` subagent, not general-purpose
   work; see canonical 23-screen spec in that agent file. Sits logically between #6 and #7
   since the quiz IS the onboarding's core, but the agent scope covers the surrounding
   funnel (role fork, paywall, trial framing) that #7 alone doesn't.
9. **Payments** — Stripe integration for the paywall built in #8 (not yet scoped/estimated)

Explicitly OUT of MVP scope (post-launch): Reviews/ratings, open-ended AI chat
assistant.

**The mobile app is NOT out of scope — it is planned before public launch, and it is
intended to be the PRIMARY surface.** (Corrected 2026-08-24; an earlier version of
this file wrongly listed it as post-launch.) The build order is web-first because
that is what exists today, but the end state is a mobile app as the main way people
use ŠkolaMatch, with the browser as a fully working secondary surface — not a stub.
Nothing built now should assume web is the only client. See "Platform Strategy".

## Known Issues / Traps

- **No root `package.json`.** `server.js` imports `express`, `cors`, `dotenv`,
  `@supabase/supabase-js` but there's no root `node_modules` or lockfile in this repo
  snapshot. Running `node server.js` on a fresh checkout will throw `MODULE_NOT_FOUND`.
  Fix before relying on backend automation — don't just `npm install` ad hoc packages
  without also committing a `package.json`.
- **`cd` matters.** `server.js` lives at repo root, not in `frontend/`. Running it from
  inside `frontend/` throws `Cannot find module '.../frontend/server.js'`.
- **RLS is disabled.** Fine for now, but don't build auth or payments features that
  assume any row-level protection exists — it doesn't yet.
- **`.env` is real and gitignored** — never read it into chat output, never commit it,
  never suggest committing it "just for now."

---

## Working Constraints

- Solo developer — no budget to hire, doesn't want collaborators right now
- Limited daily hours (school + gym + soccer training take up most of the day,
  roughly 2-4 hours/day available for this project)
- Prefers building and testing one feature at a time rather than large untested
  batches of code
- Wants direct, honest technical feedback — flag bad approaches immediately,
  suggest better alternatives rather than being diplomatically vague

## Geographic Scope for V1

Prague only, targeting ~50-60 schools initially. Expansion to other Czech cities
planned for later phases once the Prague version is validated with real users.

---

---

## 🎯 DECISIONS YOU NEED TO MAKE (before charging real money)

**Pick these three and we can move forward:**

1. **Exact prices** — Season pass: ? Kč (placeholder: 690). Monthly: ? Kč (placeholder: 249).
2. **Keep 3-day trial or change it?** — Research says 3 days is risky; people cancel before feeling value. Or extend to 5-7 days?
3. **Which plan shows first?** — Currently: Season Pass (one-time, pre-selected) then Monthly (recurring). Keep this or flip?
4. **Refund guarantee final number.** Set to **3 days (2026-08-24) as a testing placeholder**, not a committed number — see the blocker note below.

**Three items in `pricing.js` are pre-launch blockers. The paywall currently tells users
the truth about each — flip/finalize only when genuinely built:**
- `TRIAL_REMINDER_IMPLEMENTED` (`false`) — blocks honest recurring billing
- `ONE_STEP_CANCELLATION_IMPLEMENTED` (`false`) — blocks recurring billing; EU requirement
- `REFUND_GUARANTEE_DAYS` (`3`, placeholder) — **displaying this to a real paying user
  with no actual refund process behind it is not safe.** Do not go live with real
  payments until both a final number is chosen and a working refund process exists.
  14 days (EU distance-selling floor) is the benchmark to reconsider against.

---

## 🚀 WHAT NEEDS TO BE BUILT NEXT

**Must do before launch (legal requirement):**
- Stripe integration — make the payment button actually charge
- Email reminders — send a message before the trial ends (EU law requirement)
- Cancellation screen — let people actually cancel their subscription (EU law requirement)
- Czech lawyer review — have a Czech consumer-law lawyer check it's legal before you charge anyone

**After launch (to make more money):**
- Better school matching — add real data (grades needed, spot count, etc.) so scores are actually useful
- Priority optimizer — help students rank their top 3 schools for the Czech DiPSy system (this is the killer feature nobody else has)

**Promises the Claude Design mockup makes that the product cannot yet keep.**
The 2026-08-24 visual mockup (`docs/sources/design_system.md`) invented plausible
product copy. The *visual system* is good and is what we're porting; these specific
claims are NOT to be ported until the thing behind them exists. Recorded here so they
aren't forgotten — do not build them now.

Blocking before real payments (false trust signals on a payment screen):
- Mockup shows **"Vrácení do 14 dnů"** — `REFUND_GUARANTEE_DAYS` is `null`, no refund
  process exists. Needs a real policy + process before this string can appear.
- Mockup shows **"Zrušíte kdykoli do dalšího zúčtování"** —
  `ONE_STEP_CANCELLATION_IMPLEMENTED` is `false`. This exact claim was deliberately
  removed from `Paywall.jsx` on 2026-08-24; needs a real cancel control first.

Needs real data or a real source before it can ship:
- Mockup's **"38 %" statistic** (students who'd choose differently) is labelled
  "Zdroj: doplnit" in the mockup itself — an invented number on the credibility
  screen. Find a real citable Czech source or drop the stat. Relatedly,
  `config/socialProof.js` is still deliberately empty.
- Mockup's outcome bullets promise **admission-chance estimates from pololetí grades**,
  **commute times ("22 minut od tebe")**, and **deadline reminders**. Supabase holds
  only `name`, `location`, `programs`, `contact`, `website`, and there is no email
  system. These are roadmap features — see "better school matching" above.

Cosmetic mismatches to reconcile when porting:
- Mockup says 199 Kč monthly; `pricing.js` says 249. **`pricing.js` is the source of
  truth**, always.
- Mockup says season runs to 30. 6. 2027; config's window is end of March.
- Mockup says "osm otázek" / "3 / 8" / "Krok 1 ze 3"; the real flow is 10 quiz
  questions inside 23 screens.

**Run the `/improve` skill before these milestones** — it's a read-only codebase
audit (finds bugs/security/perf/tech-debt issues, produces a plan, never edits code
itself). Use it as a pre-transition checkpoint, not on a schedule:
- Before wiring real Stripe payments (highest priority — money + real card flows)
- Before re-enabling Supabase RLS (security-boundary change)
- Before doing serious work on `server.js` — it hasn't had a critical pass since
  the initial package.json fix (4 flat routes, no validation, no rate limiting)
- Before merging in the questionnaire/features from the user's laptop once accessible
- **Not** needed right now on the onboarding/paywall — that already got a dedicated
  deep pass from the onboarding-architect agent (2026-08-23/24), found and fixed 4
  real bugs. Re-auditing it now would mostly re-surface already-tracked gaps.

**Waiting on the user (not a coding task):**
- **Big visual/graphic design pass on the onboarding.** Deliberately not done yet —
  the user has an already-built site (with a questionnaire + other features) on their
  laptop they're waiting to get access to, and wants to do the visual redesign once
  that's available rather than designing twice. Current onboarding is functionally
  complete (all 23 screens, both branches, real scoring) but visually plain by design
  — built to the UX guide's structural/psychological rules, not final visual polish.
  Do not start a design overhaul on this proactively; wait for the user to say the go-ahead.

---

## 📝 CURRENT STATE — ONBOARDING IS STANDALONE

The onboarding flow built 2026-08-23 is complete and working, but it's its own thing
right now — not connected to your existing questionnaire or other features yet. You
mentioned you have a questionnaire + other features already built on your laptop that
are waiting to be fixed/accessible. Once those are ready, the integration task is to
wire this onboarding paywall into the results of your existing questionnaire (they
currently use the same scoring engine, but the UI flows are separate).

---

## Keeping This File Useful

This file is read at the start of every session — it should describe **current reality**,
not a snapshot from whenever it was last edited. Update it when:
- A feature moves from "not built" to "built"
- A new convention or file-structure decision gets made
- A blocker gets fixed (or a new one gets found)
- A product decision changes (pricing model, scope, target user)
- **A decision lands and needs to be locked in** — move it from the "DECISIONS YOU NEED TO MAKE" section to the Monetization Plan section once it's final

Prefer editing this file over letting drift accumulate — a stale CLAUDE.md is worse
than no CLAUDE.md, because it actively misleads the next session.
