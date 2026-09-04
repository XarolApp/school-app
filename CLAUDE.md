# School Selection App — Project Context

## ⚠️ Current working setup — read this first

**Machine: the Windows laptop, not a MacBook.** The MacBook move planned for
2026-08-31 did not happen; the user is on this Windows laptop until roughly
mid-September 2026. The old PC is sold and unreachable, so this laptop is the only
machine. `CONTEXT-HANDOFF.md`'s "MacBook setup checklist" is therefore **not
pending work** — do not prompt the user through it. Everything it asks for is
already true here: Node installed, repo cloned, `npm install` run in both root and
`frontend/`, both `.env` files present, and both servers verified booting on
2026-09-04.

**Branch: `main`.** Commit and push here. As of 2026-09-04 this branch holds the
onboarding-flow frontend (`/onboarding/...`) — what was briefly on a branch called
`migration-backup`, which was promoted to `main` and then deleted as redundant.

`older-version` is the previous `main`: the standalone-questionnaire frontend
(`/dotaznik`, `/oblibene`, favourites, match-score components). It was superseded by
the onboarding flow, **not merged** — the two diverged at `12ede66` and went in
different product directions on a shared backend. It is kept as reference only. Do
not merge it into `main` expecting a clean result; if something from it is wanted,
port that piece deliberately.

Nothing from it is missing here. Verified file-by-file at promotion time: all 69 of
its app files are preserved byte-identical inside `schoool-app-laptop-progress/`, a
reference snapshot. (That folder duplicates `older-version` and is safe to delete
whenever it stops being useful — the content also lives on that branch and in git
history.)

**⚠️ Push to GitHub after every meaningful chunk of work.** The user explicitly
asked for this, having just lost a machine. Do not batch a session's work into one
push at the very end, and do not wait to be asked — commit and push whenever a
feature, fix, or coherent piece of work is finished and verified. `.env` files are
gitignored and must stay that way; check `git status` before a broad `git add` so a
secret never lands in a commit.

**⚠️ Do not use the Browser pane / preview tools** (`mcp__Claude_Browser__*`,
`preview_start`, `preview_stop`) **on this machine.** They crash Claude Desktop here
(Chromium GPU-process crash on Intel integrated graphics, which then corrupts the
MSIX package). This is a property of this hardware, not project policy — it will not
apply on the MacBook, and the "verify in the browser yourself" instruction in Quick
Start below is written for that machine. Until then: start the servers, verify with
`curl`, `vite build`, and SSR/Node scripts, and ask the user to look at anything that
genuinely needs eyes.

> `CONTEXT-HANDOFF.md` still records what was in flight when the previous session
> ended — notably that plan 005 (spacing/typography migration) is ~95% done with one
> step remaining. Read it for that; ignore its setup checklist per the above. Delete
> it once its contents are resolved into this file / `UNFORGET.md`.

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

You need **two terminal tabs/panes** running at the same time (they don't share a process).

**Terminal 1 — Backend** (from repo root):
```bash
npm install
node server.js
```
Starts on `http://localhost:5000`. Reads its config from `.env` (gitignored, never
committed). Only `SUPABASE_URL` and `SUPABASE_KEY` are needed to boot. Everything else
degrades gracefully: missing Stripe keys make `/api/checkout` answer 503, missing
`OPENROUTER_API_KEY` makes `/api/questionnaire` answer 503, and missing
`SUPABASE_SERVICE_ROLE_KEY` logs a warning (needed once RLS is on).

**Terminal 2 — Frontend** (from repo root, in a new tab):
```bash
cd frontend
npm install   # only needed once, or after package changes
npm run dev
```
Starts on `http://localhost:5173`. Reads config from `frontend/.env` (also gitignored).
Without Supabase keys, the app still runs: auth is stubbed but the onboarding flow
works. `VITE_API_BASE_URL` defaults to `http://localhost:5000` (the backend you're
running in Terminal 1).

**Verify it's working:**
- Backend: `curl http://localhost:5000/` should return `{"status":"ok"}`
- Frontend: Open `http://localhost:5173` in your browser, start the onboarding flow

**Verifying changes:** always start the dev server and check the running app in a
browser before reporting frontend work as done — do not ask the user to check manually
themselves. Use the browser pane / preview tools for this.

---

## Current Tech Stack

- **Backend:** Node.js + Express 5 (`server.js`), root `package.json` present
- **Database:** Supabase (PostgreSQL), schema in `supabase-setup.sql`
- **Auth:** Supabase Auth — email + password, mandatory email confirmation,
  Cloudflare Turnstile CAPTCHA, password reset
- **Rate limiting:** `express-rate-limit` on `/api/`, checkout and questionnaire
- **Frontend:** React 19 + Vite 8 + React Router 7, in `frontend/` (Vite, not CRA/Next)
- **Frontend linting:** `oxlint` (`npm run lint` inside `frontend/`) — not ESLint
- **Icons:** `lucide-react`, named imports only (never the barrel import — that is
  what makes it tree-shakeable)
- **AI:** Claude Sonnet via OpenRouter — writes the *explanation sentence* on the
  standalone questionnaire only. Scoring is plain JS on both surfaces; the AI never
  produces a number
- **Scraping:** n8n + Firecrawl + Gemini 2.5 Flash Lite (external workflow, not in this repo)
- **Payments:** Stripe — routes exist as **scaffolding only**, no live keys, untested
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

**`supabase-setup.sql` at the repo root is the source of truth.** It is idempotent —
safe to re-run after any schema change. It has been run against the live Supabase
project (confirmed 2026-08-28: schools seeded, auth and the developer-email bypass
both working end to end).

| Table | What it holds |
|---|---|
| `schools` | id, created_at, name, location, programs, contact, website, latitude, longitude |
| `users` | profile mirror of the private `auth.users`: email, name, `trial_expires_at`, `subscription_status`, Stripe ids |
| `favorites` | `(user_id, school_id)` |
| `questionnaire_runs` | one row per completed *standalone* questionnaire: answers, matches, `label`, `is_default`, `archived_at` |

**Trial length is set by a database trigger, not by the signup form** — 3 days, matching
`frontend/src/config/pricing.js`. If that number ever changes it must change in both
places, or the paywall promises a window the database does not grant.

`subscription_status` accepts `trialing / active / season / past_due / canceled /
expired / developer`. `'season'` is the one-time season pass — **schema-ready but
nothing writes it yet**, because `/api/checkout` only creates subscription-mode Stripe
sessions.

**RLS is enabled on all four tables** by that file (changed from disabled — this was a
deliberate adoption, not a drift):
- `users` — read your own row only. No client INSERT (the trigger creates it) and no
  client UPDATE, because that row decides who has paid.
- `favorites` — own rows only; inserting also requires `has_access()`.
- `questionnaire_runs` — read and delete your own; **no INSERT or UPDATE policy**, so
  `server.js` is the only writer.
- `schools` — **no client policy at all.** The browser cannot read this table directly;
  every school read goes through `server.js` with the service-role key. That is what
  makes a paywall on school data possible at all.

`service_role` bypasses RLS entirely, so both `server.js` and the n8n scraper keep
working. Never put that key in `frontend/.env`.

---

## Repo Map

```
school-app/
├── .env                        # backend secrets — gitignored, never commit
├── .env.example                # documents every backend var
├── .gitignore
├── CLAUDE.md                   # this file
├── README.md                   # currently near-empty
├── server.js                   # Express backend, root-level
├── package.json                # backend deps
├── supabase-setup.sql          # schema + RLS, idempotent, SOURCE OF TRUTH
├── lib/                        # server-side, standalone questionnaire only
│   ├── questionnaire.js        # questions, validation, OpenRouter call, quota window
│   ├── matching.js             # deterministic scoring (NOT the onboarding one)
│   └── pragueDistricts.js      # full-precision správní obvody, point-in-polygon
├── scripts/
│   ├── geocode-schools.js      # one-time, fills schools.latitude/longitude
│   └── build-district-map.js   # regenerates the district geometry
├── schoool-app-laptop-progress/  # the older laptop build, kept for reference only
├── design/                     # the design system — see "Design system — design/ folder" below
│   ├── DESIGN.md                # authoritative design spec — CHECK BEFORE any non-trivial visual change
│   ├── system/                  # real Claude Design output: components, tokens, guidelines, ui_kits
│   ├── archive/                 # finished, already-implemented design work
│   └── research/                # design-direction research + Mobbin surveys
├── plans/                      # /improve implementation plans — see plans/README.md
├── .claude/
│   ├── agents/
│   │   └── onboarding-architect.md   # scoped subagent — see below
│   └── settings.local.json
├── docs/
│   └── sources/
│       ├── claude_code_ui_ux_guide.md   # REQUIRED READING before any frontend work — see below
│       ├── onboarding.md                 # archival — fully merged INTO onboarding-architect.md
│       ├── feature-brainstorm.md         # full feature roadmap/ratings — REQUIRED READING before proposing new features or scope — see below
│       ├── pricing_research.md            # 2025/2026 subscription pricing + EU minor-payment research — read before touching pricing/plan structure
│       └── platform_onboarding_research.md  # web-vs-app onboarding placement research
└── frontend/
    ├── .env.example
    ├── package.json             # React 19, Vite 8, React Router 7, oxlint
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               # route table — add new routes here
        ├── App.css / index.css / auth.css
        ├── api.js                # fetch helpers, attaches the Supabase JWT
        ├── supabaseClient.js     # browser auth client (stubs out if unconfigured)
        ├── components/
        │   ├── Layout.jsx        # nav + <Outlet/>, wraps every non-onboarding route
        │   ├── AuthContext.jsx   # session, profile, every auth action
        │   ├── ProtectedRoute.jsx
        │   ├── AuthTabs.jsx / Captcha.jsx / PasswordInput.jsx / PasswordStrength.jsx
        │   ├── FavoriteButton.jsx / ToastContext.jsx
        │   └── onboarding/
        ├── lib/
        │   ├── matching.js + schoolFeatures.js   # ONBOARDING quiz scoring
        │   ├── schoolSearch.js   # diacritics folding, typo tolerance, ranking
        │   ├── demoSchools.js / offerEntitlement.js
        └── pages/
            ├── Home.jsx / Search.jsx / SchoolDetail.jsx
            ├── Login.jsx / SignUp.jsx / ForgotPassword.jsx / ResetPassword.jsx
            ├── Settings.jsx
            ├── SubscriptionExpired.jsx   # trial-expired redirect target (/predplatne)
            └── onboarding/               # the 23-screen flow
```

**Routes are Czech** (`/skoly`, `/prihlaseni`, `/registrace`, `/zapomenute-heslo`,
`/nove-heslo`, `/nastaveni`, `/predplatne`) — the auth components have several of these
hardcoded in their redirects, so do not rename them casually.

**There are two `Paywall`-shaped surfaces and two `matching.js` files. Neither pair is
a duplicate — do not merge them:**
- `pages/onboarding/screens/Paywall.jsx` is the first-purchase paywall inside the flow.
  `pages/SubscriptionExpired.jsx` (route `/predplatne`) is where `ProtectedRoute` sends
  an account whose trial has lapsed. Different moments in the funnel.
- `frontend/src/lib/matching.js` scores the onboarding quiz, entirely in the browser,
  with no server call. `lib/matching.js` (repo root) scores the standalone
  questionnaire server-side. They were built independently and are not interchangeable.

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
- Fonts (Fraunces + Public Sans, per `DESIGN.md`) load from Google Fonts in
  `index.html`, pending self-hosted `.woff2` files. Fixed 2026-08-31 — this line
  previously said Newsreader + Hanken Grotesk, which was stale: DESIGN.md and
  `tokens.js`'s own comments already specified Fraunces + Public Sans, but the
  actual `webOnly` export and `index.html` hadn't been updated to match.
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
   - `GET /`, `GET /test-db` — health checks
   - `GET /api/schools`, `GET /api/schools/:id` — **deliberately ungated** (see
     Known Issues). They take `optionalAuth`: a signed-in caller also gets
     `match_score` on every school, an anonymous one gets the same rows without it.
   - `GET/PATCH/DELETE /api/me` — profile, rename, GDPR erasure
   - `GET/POST/DELETE /api/favorites` — behind `requireAuth` + `requireAccess`
   - `GET/POST /api/questionnaire` + `/api/questionnaire/runs/:id` (rename, set
     default, archive) — the standalone questionnaire, behind auth
   - `POST /api/checkout`, `POST /webhooks/stripe` — **scaffolding**, 503 without keys

   **The access rule to keep straight:** routes that *read school rows* need
   `requireAccess`; routes that let someone *manage or erase their own data*
   (removing a favourite, renaming/archiving an answer set, deleting the account)
   need only `requireAuth`. An account whose trial lapsed must never be locked out
   of its own data.

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
   - **Account creation is a step in the flow** (`screens/CreateAccount.jsx`, step id
     `ucet`, sitting between `proof` and `paywall`). This is the canonical signup path;
     `/registrace` exists only for direct links and returning users and is deliberately
     not in the nav. It sits before the paywall because the trial window is opened by a
     database trigger on account creation — there has to be an account before there is
     anything to charge.

8. **Auth, trial and access control** — real Supabase Auth, ported from the earlier
   laptop build and wired into the onboarding flow.
   - Email + password with **mandatory email confirmation**: `requireAuth` rejects any
     token whose `email_confirmed_at` is null, so a trial can never start on an address
     nobody proved they own.
   - Cloudflare **Turnstile CAPTCHA** on signup/login/reset. Supabase verifies the token
     itself, so there is nothing to check in `server.js`. Without
     `VITE_TURNSTILE_SITE_KEY` the widget renders nothing and forms still work.
   - **Password strength meter** — advisory only; flags Czech fragments (`fotbal`,
     `slunicko`, `heslo`) an English wordlist would miss. The one hard rule is
     Supabase's 8-character minimum.
   - **Reveal toggle** on every password field; forwards every prop except `type`, so
     callers keep control of `autoComplete` (getting that wrong breaks password managers).
   - **"Stay signed in"** switches *where* the token is stored (localStorage vs
     sessionStorage). It does not change how long the token is valid.
   - **Duplicate signups are surfaced**, not hidden. Supabase's own response is
     identical either way (a decoy user with an empty `identities` array); we turn that
     back into "you already have an account". A deliberate email-enumeration trade-off:
     Turnstile blocks the scripted version, and hiding it would leave a real user
     waiting forever for a confirmation email that never comes. Login and password
     reset stay fully generic, where hiding it costs a genuine user nothing.
   - **Developer allowlist** — `DEVELOPER_EMAILS` in `.env` grants permanent access.
     Deliberately server-side: a checkbox on the signup form would give the product away.
   - **Never move an access decision into React.** `ProtectedRoute` and `hasAccess`
     decide what to *show*; `server.js` and RLS decide what is *allowed*.

9. **Search, favourites and the standalone questionnaire backend**
   - `lib/schoolSearch.js` — diacritics folding (`gymnazium` finds `Gymnázium`),
     length-scaled typo tolerance, prefix matching, an alias map for words no edit
     distance can bridge (`gympl`, `zdravka`, `prumka`), and name > obor > location
     ranking. Wired into `Search.jsx`.
   - Favourites with optimistic toggling and toast confirmation.
   - The server-side questionnaire (`lib/questionnaire.js` + `lib/matching.js`, multiple
     saved answer sets with one marked default, monthly quota anchored to the signup
     anniversary). **The backend is here; no UI is wired to it.** The onboarding quiz is
     a separate surface with its own scoring engine.

## What's NOT Built Yet (MVP Scope)

**Status as of 2026-08-28:** Supabase connected, schools seeded (60), onboarding flow
complete with district map and claim-framing signup, auth ported and wired, design tokens
applied (terracotta/moss live), developer-email bypass confirmed working.

**Every remaining task, decision, and deferred item is tracked in [`UNFORGET.md`](UNFORGET.md)
— that file is the single source of truth for "what's left," not this section.** See
"Keeping This File Useful" below for why deferred work lives there now, not here.

Explicitly OUT of MVP scope (post-launch): Reviews/ratings, open-ended AI chat assistant.

**The mobile app is NOT out of scope — it is planned before public launch, and it is
intended to be the PRIMARY surface.** (Corrected 2026-08-24; an earlier version of
this file wrongly listed it as post-launch.) The build order is web-first because
that is what exists today, but the end state is a mobile app as the main way people
use ŠkolaMatch, with the browser as a fully working secondary surface — not a stub.
Nothing built now should assume web is the only client. See "Platform Strategy".

## Known Issues / Traps

These are standing architectural facts about the current codebase — not TODOs. Anything
actionable that follows from them lives in [`UNFORGET.md`](UNFORGET.md) instead.

- **Paywall is still mocked** — the onboarding's purchase button calls `mockStartSubscription`
  and `lib/offerEntitlement.js` uses localStorage (not production-safe). This is deliberate
  and current; see `UNFORGET.md` for the Stripe integration item and why it's gated on the
  user re-raising it.
- **`/api/schools*` is intentionally ungated**, unlike every other data route. The
  onboarding quiz reads school data before any account exists, so gating it would break
  the funnel at its widest point. RLS still blocks the browser from reading the table
  directly, so `server.js` remains the only way in. Gating this is tied to the paywall
  connection work in `UNFORGET.md` — remember `withMatchScores` must survive whatever
  query replaces it, or every percentage in the app disappears with nothing logged.
- **`cd` matters.** `server.js` lives at repo root, not in `frontend/`. Running it from
  inside `frontend/` throws `Cannot find module '.../frontend/server.js'`.
- **`.env` is real and gitignored** — never read it into chat output, never commit it,
  never suggest committing it "just for now." Restart the backend after editing it —
  env vars only load at process startup.

---

## Design tokens — tokens.js

**What is `tokens.js`?** The single source of truth for all design values (colors,
fonts, spacing, radii, etc.) as JavaScript constants, in `frontend/src/design/tokens.js`.
JS, not CSS, deliberately: React Native can import a JS module but cannot read CSS
variables — this is what makes the visual system portable to the mobile app later.

**Current state (as of 2026-09-04):** matches `design/DESIGN.md` in full — terracotta
`#AD4F2A` / moss `#4F7143`, the warm paper neutral ramp (`#FAF6EF` / `#F1ECE3` /
`#221A13` …), and Fraunces + Public Sans. **No `#FFFFFF` or `#000000` anywhere** —
DESIGN.md forbids both outright and the palette now honours that; `--surface` and
`--bg` are deliberately the *same* value, because raised content separates by
hairline rather than by a brighter fill. Neutrals were migrated 2026-09-04 (they had
been left on the older cooler ramp by the 2026-08-28 accent-only pass). Fonts fixed
site-wide 2026-08-31 — `index.html`
and `tokens.js`'s `webOnly` export had drifted from DESIGN.md's own spec). `tokens.css`
is auto-generated from `tokens.js` via `npm run tokens` (from `frontend/`) — **never
hand-edit `tokens.css`.** Re-run that command after any future change to `tokens.js`.

**Spacing and type-size tokens do not exist in CSS yet** — `tokens.js`'s `space` object
uses different numbers (`4/8/12/16/24/32`) than `design/system/tokens/spacing.css`'s
documented scale (`4/8/16/24/32/48/64`), and neither is exposed as a CSS custom
property that stylesheets actually consume — `App.css`, `auth.css`, and
`onboarding.css` all hardcode raw pixel values today. Migrating the whole app onto the
design system's real scale is tracked in `UNFORGET.md` as a standing task, not done yet.

---

## Design system — `design/` folder (reorganized 2026-08-31)

**Before any non-trivial frontend visual change, check `design/DESIGN.md` first.**
("Non-trivial" — a color/spacing/typography choice, a new component, a layout
decision. Not: renaming a button's label, fixing a typo.) This is in addition to, not
instead of, the standing UX-guide-read rule below.

```
design/
├── DESIGN.md          # the authoritative design system — moved from repo root 2026-08-31
├── system/            # real Claude Design output: components/, tokens/, guidelines/,
│                       # templates/, ui_kits/ — the current template for all /design work.
│                       # Components under system/components/ are REAL, reusable code
│                       # (Button, Input, Checkbox, Card, Chip, Divider, MatchIndicator,
│                       # Tooltip — each with .jsx + .d.ts + .prompt.md). The example
│                       # SCREENS under system/ui_kits/skolamatch/ are illustrative
│                       # mockups only (invented layout + fake data, built without seeing
│                       # this codebase) — reference for structure, never copy verbatim.
├── archive/            # finished, already-implemented design work, kept for history
│   └── school-search-wireframe/   # the wireframe behind frontend/src/pages/Search.jsx
└── research/           # design-direction research + Mobbin pattern surveys,
                         # moved from docs/sources/ (design-tool-specific docs only —
                         # general product docs like feature-brainstorm.md stayed put)
```

**Use Mobbin as reference, never as a source of truth.** Before designing any screen
with `/design`, search Mobbin (the connected Mobbin MCP) for 3–5 real shipped examples
of that screen type, to sanity-check layout and interaction choices against real
products. `design/system`'s own components and tokens always win on conflict — Mobbin
informs judgment calls, it never overrides or gets blended into this design system's
colors, spacing, or components.

**Known gaps in `design/system`, don't treat as bugs:**
- The `ui_kits/skolamatch` example screens predate real integration with this codebase
  — their data is invented, same caveat as every Claude Design wireframe. `Search.jsx`
  was removed from that folder 2026-08-31 as redundant, once superseded by the real
  implementation.
- `design/system`'s real components (`Button`, `Input`, etc.) are **newer** than the
  hand-built primitives currently used by the live app (`ObKit.jsx`, `auth.css`) —
  those predate this template by several days. They should eventually be replaced by
  the real template components rather than the other way around. Not done yet — see
  `UNFORGET.md`.
- `design/system`'s content width is 1280px; the live app's `.app-content` was capped
  at 960px until 2026-08-31, when it was widened to match. See `UNFORGET.md` for the
  remaining responsive-breakpoint work below 1280px.

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

## 📝 CURRENT STATE — LAPTOP BUILD MERGED IN (2026-08-27)

The earlier laptop build was cloned to `schoool-app-laptop-progress/` and its
infrastructure grafted onto this codebase. The direction was deliberate: **keep the
23-screen onboarding flow as the product's spine, and layer the laptop's real auth,
Stripe scaffolding and RLS schema on top of it** — not the other way round.

**What came across:** Supabase Auth (with CAPTCHA, password strength, reset flow, email
confirmation), the RLS schema, rate limiting, favourites, smart search, the server-side
questionnaire engine, and Stripe checkout/webhook routes as scaffolding.

**What deliberately did not:** the laptop's own questionnaire UI, its forest/teal design
system, and its map/match-score components. Those are coupled to a questionnaire surface
we are not merging.

**What was reconciled rather than copied:** the schema's trial trigger was changed from
7 days to 3 to match the researched pricing decision, and `subscription_status` gained a
`'season'` value so the season pass has somewhere to write.

`schoool-app-laptop-progress/` is kept as read-only reference. Nothing imports from it.
Delete it once you are confident nothing else is needed from there.

**The seam that is still open:** the onboarding paywall creates a real account (trial
starts, server-side) but the purchase itself is still mocked. Closing that gap is MVP
item #4 and #5.

---

## Design system update — DESIGN.md rewritten + Mobbin research completed (2026-08-25)

**Done:**
- **`DESIGN.md` fully rewritten** (warm terracotta `#AD4F2A` / moss-green `#4F7143`, Fraunces + Public Sans, no monospace, radii 8–20px, soft shadows, metaphor replaced). Lints clean: 0 errors, 0 warnings.
- **Mobbin pattern survey** completed: `design/research/mobbin_pattern_survey.md` (moved
  there in the 2026-08-31 reorg; this line said `docs/sources/` until 2026-09-05) (634 lines, 73 searches, ~380–400 products, organized into paywalls/onboarding/landing pages/core product with checklists, anti-patterns, cross-section observations). Coverage gaps documented honestly.
- **Four independent Mobbin-patterns skills created** for Claude Design to use independently:
  - `.claude/skills/mobbin-paywall-patterns/SKILL.md`
  - `.claude/skills/mobbin-onboarding-patterns/SKILL.md`
  - `.claude/skills/mobbin-landing-page-patterns/SKILL.md`
  - `.claude/skills/mobbin-core-product-patterns/SKILL.md`

Each skill is self-contained (checklist + sourced patterns + anti-patterns + cross-cutting observations) so Claude Design can pull whichever fits the screen type being worked on.

**tokens.js → tokens.css sync: done 2026-08-28.** See "Design tokens — tokens.js" above.

**Two research-dependent decisions are still open** (photo gallery verification, score
display resolution) — tracked in [`UNFORGET.md`](UNFORGET.md), not here.

**Paywall patterns from the survey that map to existing code:** The survey's dated
3-beat trial timeline, symmetrical decline paths, and due-today-vs-recurring split
patterns provide concrete, sourced answers for the trial-reminder and cancellation-screen
items tracked in `UNFORGET.md`.

---

## Keeping This File Useful

This file is read at the start of every session — it should describe **current reality
and locked-in decisions**, not a TODO list and not a snapshot from whenever it was last
edited. Update it when:
- A feature moves from "not built" to "built"
- A new convention or file-structure decision gets made
- A product decision changes and becomes final (pricing model, scope, target user)

Prefer editing this file over letting drift accumulate — a stale CLAUDE.md is worse
than no CLAUDE.md, because it actively misleads the next session.

**All deferred work — pending decisions, TODOs, "come back to this," audit findings,
paused plans — goes in [`UNFORGET.md`](UNFORGET.md), not in this file or in `DESIGN.md`.**
This is a standing instruction for every future session, not a one-time cleanup:
CLAUDE.md and DESIGN.md describe what *is* (architecture, conventions, locked-in
decisions, design spec); `UNFORGET.md` tracks what's *not yet done*. Before adding a new
"pending"/"TODO"/"not built yet" item to either file, put it in `UNFORGET.md` instead,
following the format in `.claude/skills/unforget/SKILL.md`. When a decision that started
as a `UNFORGET.md` open question becomes final, that's when it belongs here — move it
into the relevant section (e.g. a settled pricing question moves into "Monetization
Plan") and remove it from `UNFORGET.md`'s open items (or into its "Resolved" section if
it was actionable work, not just a decision).
