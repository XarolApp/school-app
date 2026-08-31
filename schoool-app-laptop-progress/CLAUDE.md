# 📋 Session Handoff — Read Once, Then Delete This Section

You are picking this project up on a device that has never run it before (or
resuming after a gap). This section exists to save you the archaeology of
reconstructing recent state from git log and conversation history. It is
scratch, not documentation: **once you have read it, delete this entire
section — from the `# Session Handoff` heading down to the horizontal rule
below — in the same session, before doing anything else the user asked for.**
Everything durable is already in the sections below; nothing here should be
re-added once removed.

**Repo state as of this note:** everything is committed and pushed to
`origin/main` (GitHub: `XarolApp/school-app`); working tree was clean when this
was written. There is no half-finished code sitting uncommitted anywhere — the
most recent work (an interactive district-picker map for the questionnaire's
location question, covering all 22 Prague *správní obvody*, a "select
all = don't care" shortcut, and a couple of small UX fixes to it) shipped and
was verified before being pushed. If you run `git status` and see it isn't
clean, that's new since this note — treat it as this session's own in-progress
work, not a resumption of something old.

**What is NOT on GitHub, and has to be recreated by hand on this device:**
- Root `.env` — `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `PORT`, `FRONTEND_URL`, `DEVELOPER_EMAILS`, `STRIPE_SECRET_KEY`,
  `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `TRUST_PROXY`,
  `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`. Values come from the Supabase
  project dashboard (Settings → API) and the OpenRouter dashboard
  (openrouter.ai/keys); Stripe's three are unset until Stripe go-live (Open
  Task below).
- `frontend/.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_API_BASE_URL`, `VITE_TURNSTILE_SITE_KEY`.
- `node_modules/` in both the root and `frontend/` — run `npm install` in
  each; nothing else is needed to reconstruct them.
- Neither file's *absence* is a code problem. Do not try to reverse-engineer
  values from the code — ask the user for them, or have them paste in their
  existing copies from another machine.

**The live Supabase database already has the current schema** —
`supabase-setup.sql` was confirmed against it directly this session (queried
`questionnaire_runs.label`/`is_default`/`archived_at` and got real rows back),
so there is no pending migration to run. Re-run the file only after a future
schema change; it is idempotent.

**The Browser-pane ban two lines below is device-specific, not project
policy.** It exists because of a GPU crash on the machine this was written on
(Intel integrated graphics + Claude Desktop's Chromium process). If this is a
different machine, that failure mode may simply not apply here — form your own
judgment (or ask the user) about whether the Browser pane is safe to use on
this hardware, rather than inheriting the restriction unquestioned. If you
confirm it's fine here, update or remove that note instead of routing around
it silently.

**Where to look next:** the `## Open Tasks` section near the bottom of this
file is the real, current backlog (three items right now, none blocking, none
urgent). There is no other pending direction beyond what's written there —
if the user hasn't given you a new task yet, that list plus asking them is
the right next move, not guessing at unstated priorities.

---

# Important
- **Do not use the Browser pane / preview tools** (`mcp__Claude_Browser__*`,
  `preview_start`, `preview_stop`). They crash Claude Desktop on this machine
  (Chromium GPU-process crash on Intel integrated graphics, which then corrupts
  the MSIX package). The enforced block lives in `~/.claude/settings.json` under
  `permissions.deny` — this note is only a reminder, not the block itself.
  To check the app in a browser, tell the user to run it and look themselves.
- **⚠️ CRITICAL SCALING ISSUE:** When the database approaches ~1000 schools (Brno + Ostrava added),
  Supabase's PostgREST silently truncates responses. See "CRITICAL: Supabase PostgREST Row Limit"
  section at the bottom. Read it before expanding beyond Prague.

# School Selection App — Project Context

## The Problem This Solves

In the Czech Republic, when 9th graders need to pick a high school (*střední škola*),
there's no single good place to research options. The one directory site that lists
all schools (atlasskolstvi.cz) is old and clunky, and doesn't help students figure out
which school actually fits them. Students end up manually digging through dozens of
individual school websites, or asking ChatGPT one-off questions with no real structure.

## The Product

An app + website that:
1. Provides a clean, searchable database of high schools — location, programs,
   admission requirements, contact info — all in one place
2. Offers an AI-powered questionnaire — student answers questions about interests,
   grades, and preferences, app suggests best-fit schools, ranked by match
3. Lets students save favorites and compare schools

## Monetization Plan

**Paid-only with 7-day free trial**
- No free tier — all features (search, favorites, questionnaire) require payment after trial
- €/month subscription (monthly recurring) — pricing TBD
- Rationale: monopoly in Czech market (no competitors), parents proven to pay for
  school questionnaires, higher revenue per user vs freemium model
- Trial duration: 7 days
- After trial expires: user must pay to continue; all features gated
- Payment via Stripe (monthly billing, auto-renewal)

## Current Tech Stack

- **Backend:** Node.js + Express (`server.js`)
- **Database:** Supabase (PostgreSQL)
- **Frontend:** React 19 + Vite + React Router (fully built and styled)
- **AI:** Claude Sonnet 5 via OpenRouter — writes the explanation next to each
  questionnaire match. The ranking and percentage are plain JS (`lib/matching.js`),
  not AI
- **Scraping:** n8n + Firecrawl + Gemini 2.5 Flash Lite (completed; 60 Prague schools in database)

## Supabase Schema

Defined in `supabase-setup.sql` (run it in the Supabase SQL Editor).

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
| latitude | float8 (null until geocoded) |
| longitude | float8 (null until geocoded) |

Table: `users` (profile; the account itself lives in Supabase's private `auth.users`)
| Column | Type |
|---|---|
| id | uuid (FK → auth.users) |
| email | text |
| name | text |
| trial_expires_at | timestamptz |
| subscription_status | text (trialing/active/past_due/canceled/expired) |
| stripe_customer_id | text |
| stripe_subscription_id | text |

Table: `favorites`
| Column | Type |
|---|---|
| user_id | uuid (FK → auth.users) |
| school_id | int8 (FK → schools) |

RLS is **enabled** on all three tables:
- `users` — read own row only; no client INSERT (a trigger creates it) and no
  client UPDATE (only Stripe webhooks via service_role change subscription state)
- `favorites` — own rows only; inserting also requires `has_access()`
- `schools` — **no client policy at all**, so the browser cannot read schools
  directly. All school data flows through `server.js`, which checks the trial
  first. This is what makes the paywall real.

`service_role` bypasses RLS — used by `server.js` and required by the n8n scraper.

## Security Model (important)

The paywall is enforced in **two places, neither of them the browser**:
1. `server.js` verifies the Supabase JWT on every request and checks
   trial/subscription before returning school data (401 / 402 otherwise)
2. Postgres RLS policies, so even a direct Supabase REST call is blocked

Frontend gating (`ProtectedRoute`, `hasAccess`) only decides what to *show*.
Never move an access decision into React — anything the browser knows, a user
can edit. Trial length is set by a database trigger, not by the signup form.

## What's Already Built

1. **Backend server** (`server.js`) — Express server running locally on port 5000,
   connected to Supabase via `.env` credentials (`SUPABASE_URL`, `SUPABASE_KEY`, `PORT`)
   - `GET /` — health check
   - `GET /test-db` — confirms Supabase connection, queries `schools` table

2. **n8n scraping workflow** (separate from this codebase, runs independently) — **COMPLETED, all 60 Prague schools scraped and in Supabase**:
   - Scrapes atlasskolstvi.cz directory (Prague region, pages 1-3) via Firecrawl
   - AI extraction (Gemini 2.5 Flash Lite) pulls `{name, url}` pairs from each page
   - Aggregates + splits into individual school items
   - Loops through each school's individual profile page, scrapes it via Firecrawl
   - AI extraction pulls structured `{name, location, programs, contact, website}`
   - Validates required fields (name, location not empty)
   - Inserts into Supabase `schools` table
   - Logs result (Success/Needs Review) to a Google Sheet for tracking
   - Uses `service_role` key (RLS is enabled on `schools`, so the scraper must
     bypass it to insert — check this if future scrape runs start failing silently)

3. **GitHub repo:** `school-app` under account `XarolApp`

## What's Already Built (Continued)

4. **React frontend** (`frontend/`) — Built with Vite + React Router, "Clean & Trustworthy" design
   - **Pages:** Home, Search, School Detail, Sign Up (all fully styled)
   - **Design system:** Token-based (colors, typography, spacing, shapes, shadows, all in `index.css`)
     - Forest/teal palette with green-biased neutrals
     - Source Serif 4 (headlines) + IBM Plex Sans (UI) with full Czech diacritics
     - Type scale, spacing scale, 3-level elevation (shadows)
     - Full dark theme (OS preference + manual toggle)
     - All contrast ratios pass WCAG AA (4.85:1 minimum)
   - **Layout:** Sticky header with nav + active route highlighting, site footer, responsive
     - Nav links sit next to the brand; account controls (sign out + avatar) are
       pushed right by `margin-left: auto` on `.site-header-actions`
     - **Account avatar** — a circular initials button is the right-most item in
       the header and links to `/nastaveni`. Initials come from `profile.name`
       (two words) or the e-mail's first letter; `toUpperCase` preserves Czech
       diacritics, so "Šárka Nováková" gives "ŠN", not "SN". There is no longer
       a "Nastavení" text link in the nav.
   - **Home:** Hero with match preview cards, stat strip, 3-step explainer
   - **Search:** See section 9 below
   - **School Detail:** Full info display with program tags, contact details, website link (normalizes missing https://)
     - **Location snapshot** (`components/SchoolMap.jsx`) — a still map, no
       library and no API key. It is a block of plain `<img>` tiles shifted so
       the school's coordinate sits dead centre, with the frame's
       `overflow: hidden` doing the cropping. Nothing listens for a pointer, so
       there is nothing to pan and no scroll-trap on a phone. The maths is
       Web Mercator and is verified: the pixel position round-trips back to the
       original lat/lon
     - **The frame is measured (`ResizeObserver` + `useLayoutEffect`), and the
       tile range is derived from where its edges land in world pixels** — so
       the block covers the frame exactly at any size and overshoots by at most
       one tile on each side. `useLayoutEffect` rather than `useEffect` because
       it runs before paint, so the first frame already has tiles instead of
       flashing an empty box. App.css is therefore the *only* place the map's
       size is decided; there is deliberately no size constant in the JSX to
       keep in step with it
     - Two bugs got here first, both worth not repeating. **A fixed 3×3 tile
       block** against a full-width frame left grey gutters that *moved from
       school to school* — how far off-centre the block sits depends on where
       inside its own tile a coordinate happens to fall, so it looked random.
       Replacing the constants with a measurement is what actually fixed it;
       the intermediate version (constants + a `max-width` cap) only worked as
       long as someone kept both sides in sync by hand
     - **⚠️ `.school-map` needs `width: 100%`, and it is not redundant.**
       `.detail-section` is a column flex container, and a flex item in one
       sizes to its own *content* unless told otherwise — so the block
       collapsed to the width of the "Otevřít větší mapu" link beneath the map
       and dragged the frame down to ~155px. `margin-inline: auto` made it
       worse by cancelling the stretch outright. `.auth-layout`,
       `.settings-layout` and `.questionnaire-layout` all pair their
       `max-width` with `width: 100%` for exactly this reason — follow that
       pattern for any new constrained block
     - Verified by running the real block maths against every geocoded school
       at eleven frame widths (280px phone → 2560px ultrawide), checking all
       four edges: 583 combinations, zero gaps. Costs 4–9 tiles on a phone and
       10–18 on a typical desktop, which is what any OSM-based map on the page
       would fetch anyway
     - Rejected the `openstreetmap.org/export/embed.html` iframe, the other
       keyless option — it carries OSM's own header bar and zoom buttons, which
       would need `pointer-events: none` and would still sit there looking like
       broken controls
     - **⚠️ Tiles come from OSM's donated public servers.** Their usage policy
       asks heavy users to run their own tile server and reserves the right to
       block callers without notice. Fine while this is small; a deliberate
       "make it properly reliable later" trade. `TILE_URL` in `SchoolMap.jsx`
       is the whole migration surface — repoint it at a paid or self-hosted
       renderer and nothing else changes. The attribution line is required by
       that policy, not decoration, so do not remove it
     - Dark mode dims the tiles (OSM ships one light raster, no dark
       counterpart). The rule is written **twice**, matching `index.css`'s
       cascade: a `prefers-color-scheme` query for "OS is dark and the visitor
       never chose", plus `:root[data-theme='dark']` for the manual toggle.
       Dropping either one leaves half the dark-mode users with a glaring map
     - Renders `null` unless both coordinates are present — same absence rule
       as `MatchScore`, so an ungeocoded school simply has no map rather than a
       pin in the wrong place. `float8` is checked with `Number.isFinite`, not
       a null test, so a malformed row cannot reach the arithmetic
     - **Seeded by `scripts/geocode-schools.js`** — one-time, run it after the
       `alter table` in `supabase-setup.sql` and again when the scraper adds a
       city. Uses Nominatim (OSM's geocoder): free, no account, but its policy
       requires an identifying User-Agent and max one request per second, both
       enforced in the script, so 60 schools take about a minute. Skips schools
       that already have coordinates, so a re-run costs one request per *new*
       school. Names the failures at the end rather than counting them — a
       vague address is fixed by hand in the Supabase table editor, and nothing
       overwrites a row that already has both values. Writes with
       `service_role` because RLS grants the browser nothing on `schools`.
       **All 60/60 schools are geocoded as of this session**
     - `queriesFor()` has a third fallback (`withoutCadastralName`) for one
       specific address shape: `Street N/N, <cadastral name>, NNN NN Praha N` —
       Prague's historical neighbourhood name (Vršovice, Stodůlky, Chodov, ...)
       sitting between the street and the numbered postal district. Nominatim's
       parser fails on that whole three-part shape rather than degrading
       gracefully; dropping just the cadastral-name segment and keeping the
       postal code + "Praha N" resolved all 7 schools that hit this on the
       first pass, each within meters of the same building. Re-add this kind
       of fallback if a future scrape produces addresses in a new shape that
       fails outright rather than falling back on its own
     - No `server.js` change was needed: both school endpoints already
       `select('*')`, so the columns flow through on their own
   - **Sign Up:** Form with labels, autocomplete hints, field validation
   - **API helper** to fetch from backend with error handling
   - Verified working on localhost:5173; production build succeeds (46.9 kB CSS,
     8.3 kB gzipped — includes motion system, toasts and the district map)
   - The long-standing "Home overflows at 375px" note is now item 3 of Open
     Tasks: it could not be reproduced analytically and needs a human to look,
     since the browser tools are blocked here.

5. **Backend setup** (`package.json` + dependencies)
   - Express, CORS, dotenv, @supabase/supabase-js installed and running on port 5000

6. **Backend API endpoints** (updated `server.js`)
   - `GET /` — health check
   - `GET /test-db` — confirms Supabase connection
   - `GET /api/schools` — returns all schools (tested, verified data flow Supabase → backend → frontend)
   - `GET /api/schools/:id` — returns one school by ID

7. **Auth, trial and paywall** (`supabase-setup.sql`, `server.js`, `frontend/src/`)
   - Supabase Auth signup/login; session persists across reloads
   - 7-day trial set server-side by a Postgres trigger
   - Backend `requireAuth` + `requireAccess` middleware; schools return 401/402 without access
   - `ProtectedRoute` + Paywall page; trial countdown banner in the header
   - Favourites (save/remove, own-rows-only via RLS)
   - Stripe Checkout + webhook wired; degrades to a clear message until keys are added
   - Duplicate signups detected via Supabase's empty `identities` array (a repeat
     signup is not an error — Supabase's own response is a decoy user, identical
     either way). We deliberately turn that back into a visible "you already have
     an account, log in instead" message — hiding it would mean an existing user
     submits the form and waits forever for a confirmation e-mail that never
     comes. This *is* an email-enumeration trade-off, made on purpose: Turnstile
     CAPTCHA already blocks the scripted/bulk version of that attack, and login +
     password reset stay fully generic since hiding those costs a real user
     nothing. Revisit only if abuse shows up in practice
   - Password reset: `resetPasswordForEmail` → emailed link → `updateUser`
   - Supabase auth errors translated to Czech in `AuthContext.jsx`
   - Czech routes: `/prihlaseni`, `/registrace`, `/zapomenute-heslo`,
     `/nove-heslo`, `/predplatne`, `/skoly`, `/oblibene`

8. **Signup/login hardening**
   - **Email confirmation required.** `requireAuth` rejects any token whose
     `email_confirmed_at` is null (403 `EMAIL_NOT_CONFIRMED`), so the trial can
     never start on an address nobody proved they own. `ProtectedRoute` shows a
     "confirm your email" screen rather than the paywall, and Login offers a
     resend button when sign-in fails for that reason.
   - **Rate limiting** (`express-rate-limit`): 300 requests / 15 min per IP on
     `/api/`, 10 / hour on `/api/checkout`. Note this protects *this* server
     only — signup and login go from the browser straight to Supabase, so those
     limits live in the Supabase dashboard instead.
   - **CAPTCHA**: Cloudflare Turnstile on signup, login and password reset.
     Supabase verifies the token itself, so there is nothing to check in
     `server.js`. Absent `VITE_TURNSTILE_SITE_KEY` the widget renders nothing
     and the forms still work, which is what keeps local dev usable.
   - **Password strength meter** (`PasswordStrength.jsx`) — advisory only; the
     one hard rule is Supabase's 8-character minimum. Flags common fragments
     including Czech ones (`fotbal`, `slunicko`, `heslo`) that an English
     wordlist would miss.
   - **Reveal toggle** (`PasswordInput.jsx`) — used by every password field in
     the app (login, signup, reset, and all three in Settings); there are no
     raw `type="password"` inputs left. It forwards every prop except `type`,
     so callers keep control of `autoComplete` — `current-password` vs
     `new-password` differs per field and getting it wrong breaks password
     managers. The toggle stays in the tab order on purpose: it is the only way
     a keyboard-only user can reach it.
   - **"Stay signed in"** switches *where* the token is stored — localStorage
     when checked, sessionStorage (cleared when the tab closes) when not. It
     does not change how long the token is valid.

## Developer Accounts

`DEVELOPER_EMAILS` in the root `.env` is a comma-separated allowlist. Listed
accounts get `subscription_status = 'developer'` — unlimited access, no trial
expiry. `server.js` promotes them on `/api/me`, and `has_access()` honours the
status so RLS agrees.

This is deliberately **not** a checkbox on the signup form. Any control the
browser can set, a visitor can set too — a "I'm a developer" checkbox would hand
the whole product away for free. The grant has to be decided server-side.

## Environment Variables

Root `.env` (backend): `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`PORT`, `FRONTEND_URL`, `DEVELOPER_EMAILS`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
`STRIPE_WEBHOOK_SECRET`, `TRUST_PROXY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`

`OPENROUTER_MODEL` is set to `anthropic/claude-sonnet-5`. It selects only the
model that *writes the Czech explanation* — the match percentage is computed in
`lib/matching.js`, so changing this changes wording and never ranking. Without
`OPENROUTER_API_KEY` the questionnaire returns 503 and the page says so plainly,
which keeps the rest of the app usable.

`TRUST_PROXY=true` only in production, behind a real proxy. It tells Express to
read the caller's IP from `X-Forwarded-For`, which the rate limiter needs to
tell visitors apart. Setting it locally would let anyone forge that header and
walk past the limiter.

`frontend/.env` (Vite only reads this folder, and only `VITE_`-prefixed names):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`,
`VITE_TURNSTILE_SITE_KEY`

The Turnstile *site* key is public by design — it identifies the widget. Its
partner secret key goes into the Supabase dashboard, never into this repo.

Never put the service_role key in `frontend/.env` — it bypasses RLS.

9. **Search with smart matching** (new in this session) — `frontend/src/lib/schoolSearch.js` + `frontend/src/components/FilterSelect.jsx`
   - **Diacritics folded:** `gymnazium` finds `Gymnázium`; normalize both sides
     with `NFD` + combining-mark strip, so input differences vanish
   - **Typo tolerance:** Levenshtein distance with budget scaled to token length
     — 0 edits under 4 chars (too ambiguous), 1 edit for 4–7 chars, 2 for 8+
     — so `gimnazium`, `gymnazim`, `gymnazimum` all return the 27 gymnasiums
   - **Prefix matching:** `info` finds while you type; full words not required
   - **Tokens ANDed across fields:** `gymnazium praha 6` means both; name/obor/location
     searched together in one box, not separate fields. Words in "Praha 6" are
     folded together and matched against the school's district only, so `6` never
     collides with house number `695` or postal codes
   - **Alias map for non-typos:** `gympl`→gymnázium, `it`/`informatika`→informační,
     `zdravka`, `prumka`, `ekonomka`, `ucnak` — words that no edit distance can
     bridge. Kept small; extend as real search data shows what students type
   - **Ranking:** name hits (3) > obor (2) > location (1), plus bonus when the
     query is a literal substring of the name, so typing a school's name puts it first
   - **Dropdowns with counts:** "Městská část" (the *správní obvody* actually
     present in the data, sorted numerically) and "Obor" (102 distinct; most
     common first, searchable by substring). Both auto-computed from the
     database; no hardcoded lists to update when scraping
   - **⚠️ The district here is `school.district`, attached by the backend from
     the school's coordinates — it is no longer parsed out of the address.**
     `districtOf()` in `schoolSearch.js` is now just a field read. Parsing would
     put this filter on the postal Praha 1–10 while the questionnaire scores on
     the správní obvody Praha 1–22, and the same school would be called "Praha
     9" in search and "Praha 14" in the questionnaire. See section 11's division
     note. A `praha 9` text query also matches this field, not the address, so
     the two agree
   - **Pagination:** 20 schools per page, shows automatically at 21+ results; single
     page (one constant) so adding cities auto-generates more pages with nothing to change
   - **⚠️ Page changes scroll to top from an effect keyed on `page`, never from
     the click handler.** Scrolling inside `goToPage` raced the re-render — the
     scroll started against the old list and was cut short as React swapped the
     cards out, so 3→2 landed at the top while 2→1 and 2→3 did not. The effect
     runs after the new page is in the DOM, which is why it holds for any number
     of pages. It jumps rather than animating (a full list swap has no
     continuity to express, and a long animation is interruptible — that was the
     bug), and is skipped on mount so returning from a school detail keeps its
     restored position
   - **URL state:** Search lives in query params `?q=…&cast=…&obor=…&razeni=…&strana=…` so
     opening a school from page 3 and pressing Back lands on the same filtered page
     3, not page 1 of nothing. Back button works as expected

10. **Motion system** — tokens in `index.css`, rules in section 15 of `App.css`
    - **Tokens:** `--dur-fast` (120ms, hover), `--dur-md` (220ms, things that
      travel), `--dur-slow` (380ms, entrances), `--dur-theme` (320ms),
      `--dur-ambient` (1.4s, infinite loops only — the skeleton shimmer).
      Easings: `--ease-out` (expo, leaves fast and settles — the default),
      `--ease-in-out`, `--ease-spring` (slight overshoot, only for sliding pills)
    - **`--dur-slow` drops to 220ms under 720px.** Touch has no hover to
      telegraph that something is about to happen, so the duration that reads
      as considered with a cursor reads as lag under a thumb. Done once at the
      token, in the breakpoint block that already exists in `index.css` — every
      entrance is expressed in `--dur-slow`, so none of them need a mobile rule
      of their own, and anything already at or below that speed is unaffected
    - **Auto-hiding header** — `lib/useHideOnScroll.js`. Scrolling down past 96px
      slides the header away, scrolling up brings it back. rAF-throttled, 6px
      dead zone for trackpad jitter and iOS rubber-banding. Takes the pathname
      as a reset key, otherwise a header hidden at the bottom of one page stays
      hidden on the next. Pinned under `prefers-reduced-motion`, and pinned on
      the auth routes via `PINNED_HEADER_PATHS` in `Layout.jsx` — short forms
      have no length to reclaim, and sliding the nav away mid-form takes the
      way out from under someone who changed their mind about signing in
    - **Sliding pill** (`.tab-thumb`) — one element shared by the auth tabs and
      the theme picker. The active cell's index is passed to CSS as `--tab-index`
      and the pill translates by whole multiples of its own width, so nothing
      has to be measured and it stays correct at any viewport size. The active
      option carries no background of its own
    - **Theme crossfade** — `ThemeContext` adds `.theme-transition` to `<html>`,
      flips the theme, and removes the class 400ms later. The class puts a
      blanket `!important` transition on colour properties; it includes
      `transform` on purpose, because the theme pill is sliding at the same
      moment and would otherwise teleport. Skipped on first paint and under
      reduced motion
    - **⚠️ Entrances always use `animation-fill-mode: backwards`, never
      `forwards`/`both`.** `backwards` holds the opening frame through a stagger
      delay but releases the element afterwards. `forwards` pins the closing
      frame, and animated values outrank ordinary declarations — a pinned
      `transform: none` silently kills every `:hover` lift on the page. This is
      the one rule to remember when adding an animation here
    - **Staggering** — `--stagger` set inline (`Math.min(i, 7)`) on cards,
      `:nth-child` delays on the Home page. One 45ms step everywhere, so with
      the cap at 7 the last card starts at 315ms and a full 20-card page lands
      in ~0.3s. Match cards used to step 60ms, which put the last one at 420ms
      and made the same list read as two different rhythms depending on which
      page you were on
    - **3D buttons** — `--accent-edge` / `--edge-highlight` / `--edge-shadow`.
      Three layers: lit rim inside the top, darker strip below for thickness,
      drop shadow. `--accent-edge` must stay darker than `--accent` in *both*
      themes, which is why it is not `--accent-hover` (that one goes lighter in
      dark mode). Ghost buttons stay flat on purpose
    - Only `transform` and `opacity` are animated anywhere — the two properties
      the browser composites without re-laying out the page. Colour, border and
      shadow transitions are the deliberate exception: they repaint but never
      reflow, and the theme crossfade is built on them
    - **Progress bars slide, they do not grow.** `.usage-meter-fill` and
      `.questionnaire-progress-fill` are full width and positioned with
      `translateX(calc(var(--percent) - 100%))`, clipped by the track's
      `overflow: hidden`. They used to animate `width`, which is the one thing
      that made the line above untrue. `scaleX` is the obvious transform and is
      wrong twice over — it grows from the centre, and it squashes the pill
      caps horizontally on the way. Translating keeps the right cap round and
      lets the track supply the left one, so it is pixel-identical to the width
      version at every value. `--percent` is still the same percentage string
      the component sets, so no JSX changed

    - **Component patterns — start from these, don't reinvent them.** Both are
      already applied across the app; copy them so a new surface feels like the
      rest of it rather than nearly like it.

      **Interactive card (school card, match card, anything clickable that
      contains its own content):** three layers moving together — the border
      tints toward the accent, the shadow blooms, the surface rises. The border
      is `--dur-fast` because a colour swap should feel instant; the two that
      *travel* are `--dur-md`.

      ```css
      .thing {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        transition: border-color var(--dur-fast) var(--ease-out),
          box-shadow var(--dur-md) var(--ease-out),
          transform var(--dur-md) var(--ease-out);
      }
      .thing:hover {
        border-color: var(--accent-border);
        box-shadow: var(--shadow-lg);
        transform: translateY(-4px);
      }
      ```

      Scale the travel to the control: `-4px` for a card, `-2px` with
      `--shadow-md` for a row-sized control like `.option-chip`. A thin row
      lifting a full 4px reads as detaching from its list.

      **Field focus:** a ring, not a lift.

      ```css
      .input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 4px var(--accent-soft);
      }
      ```

      **⚠️ Only *interactive* surfaces lift.** `.panel`, `.settings-section`
      and `.questionnaire-card` deliberately stay flat — a hover response on
      something that does not respond to a click is a promise the UI does not
      keep.

      **⚠️ Never put `transform: scale()` on a text field.** Scaling
      re-rasterises the text inside, so the value visibly blurs for the length
      of the transition and the caret drifts while someone is typing into it.
      This was in an earlier draft of these patterns and is the one part of it
      that was outright wrong.

      **⚠️ No `--ease-spring` on cards.** Spring stays on the sliding pills.
      Overshoot on a hover lift reads as wobble when the pointer crosses a grid
      of them, and hover is feedback rather than a thing being flung into
      place.

    - **Developer checklist when adding any animation:**
      - Use existing tokens (`--dur-fast` 120ms for hovers, `--dur-md` 220ms for
        movement, `--dur-slow` 380ms for entrances). Do not hardcode durations
      - Ease with `--ease-out` (expo) by default — leaves fast, settles
        smoothly. Use `--ease-spring` only on sliding pills; `--ease-in-out` for
        reverting states
      - Animate only `transform` and `opacity`. Animating layout properties
        (width, height, top, left) forces the browser to recalculate and repaint
        on every frame — perceptibly janky, even on desktop
      - If using `animation` (not `transition`), **always use
        `animation-fill-mode: backwards`**, never `forwards` or `both`. See the
        ⚠️ note above: `forwards` pins the closing frame, and animated values
        outrank declarations — a pinned `transform: none` silently breaks every
        `:hover` lift on the page
      - Respect `prefers-reduced-motion`. Wrap animations in `@media
        (prefers-reduced-motion: no-preference)` or conditionally apply classes
        in JS so users who prefer static motion get instant state changes
      - On mobile, keep animations ≤220ms (the `--dur-md` value). Touch feels
        less responsive than hover, so shorter durations feel snappier
      - Stagger multiple items intelligently — cap stagger to avoid animations
        trickling in for more than ~300ms total. Use `Math.min(index, 7)` as a
        pattern so 20 cards land together rather than the last ones being slow
      - Test on actual devices, not just the desktop browser. A smooth animation
        on a loaded MacBook Pro can feel sluggish on a mid-range Android phone
      - Only add an animation if it serves the UX: reveals state change, guides
        the eye, or provides feedback. Decorative motion without purpose adds
        friction

11. **AI questionnaire** — `lib/matching.js`, `lib/questionnaire.js`,
    `/api/questionnaire`, `pages/Questionnaire.jsx`, `components/UsageMeter.jsx`,
    route `/dotaznik`

    **⚠️ The match percentage is computed in code, NOT by the AI.** This is the
    central design decision and the easiest one to accidentally undo.

    - **Why:** the first version asked the model for the score too. Running the
      same student profile through two models gave the same school 95% and 83%.
      Neither was wrong, because neither was *measuring* anything — a model
      asked for a confidence number generates a plausible one exactly the way
      it generates the sentence next to it. Verified after the split: Claude and
      Gemini now return byte-identical rankings and scores, differing only in
      wording. If a future change moves scoring back into the prompt, that
      property is lost
    - **Two stages.** `matching.js` ranks every school and computes the
      percentage from the database (no network call, fully deterministic);
      `questionnaire.js` then asks the model for one Czech sentence per
      shortlisted school, grounded in the signals stage 1 produced. The model
      is explicitly told not to reorder or rescore
    - **Scoring model:** each dimension scores 0..1 and carries a weight —
      `oblasti` 30, `typ` 20, `predmety` 15, `casti` 15, `po_skole` 10,
      `zamereni` 8, `jazyky` 5, `styl` 5. The result is a weighted average over
      the dimensions that *apply*; a dimension returning `null` ("nevím", or an
      optional question left blank) is excluded and the rest renormalise, so an
      unstated preference never silently penalises a school
    - **Scores are absolute, not curved.** If nothing fits, the top result
      honestly reads 40% rather than being stretched to 100%
    - **⚠️ "I don't care" must return `null`, never 0** — the two are opposite
      instructions. `null` drops the dimension out of the average entirely and
      the remaining weights renormalise; 0 keeps it in and scores it as a
      failure. Get this wrong and a student who left a question blank is
      punished exactly as hard as one who answered and mismatched, which
      silently pushes down the scores of the least opinionated users. Verified
      on a Praha 9 school: `casti` blank → 90%, matching → 92%, mismatching →
      74%. Blank sits between them, as it must. Every "nevím"/neutral option
      already routes here — `typ: nevim`, `po_skole: nevim`, `jazyky: stredne`,
      `styl: kombinace`, `casti: []` — so a new dimension must do the same
    - **Breadth is not punished:** interest/subject coverage divides by
      `min(chosen, 3)`, so picking 5 interests and matching 3 scores the same as
      picking 1 and matching it. Picking more should describe you better, not
      make every school look worse. (`oblasti` and `predmety` cap at 5.)
    - **`zamereni` exists to break ties** — what share of a school's own
      programs are relevant to this student. Without it the coarse all-or-nothing
      dimensions tie constantly and "#1 match" becomes arbitrary; a school built
      entirely around IT should beat one offering IT among twenty other things
    - **`velikost` and `zacatek` are asked but score zero**, because there is
      nothing to match them against: no enrolment figures, and no start-time
      field. They reach the model as wording context only. Do not invent a
      proxy (program count as a stand-in for size) — that reintroduces exactly
      the fake precision this design removed
    - **⚠️ There is no commute-time dimension, and that is the design.** An
      earlier version asked for a home district (`bydliste`) plus a distance
      tolerance (`dojizdeni`) and scored them against a `district -> school`
      travel-time table seeded from Google Distance Matrix. All of it —
      `lib/commuteTimes.js`, the seeding script, the API key, the taper curve,
      the `privateToServer` flag keeping a home district out of the AI prompt,
      and the privacy promise that came with holding a home location at all —
      was **deleted** and replaced by rewording one existing question.
      `casti` now asks *"Do kterých částí Prahy jsi ochoten dojíždět?"*
      ("which parts of Prague are you willing to commute to"). The student
      answers from their own address, their own tolerance and their own sense
      of far — privately, in their head, and more accurately than a transit
      estimate. Nothing to collect, nothing to send, nothing to keep current.
      **Do not reintroduce a routing call**: any future "how long is the
      commute" idea has to beat a question that already has the answer
    - **`casti` weight is 20**, raised from 15 when it absorbed that meaning.
      Level with `typ` and below `oblasti`: a commute the student has already
      called too far is close to a veto, but what they want to *study* still
      has to outrank where the building is. Scoring is deliberately binary —
      1 if the school's district is in their set, 0 if not. Refine later if
      real use shows it is too blunt
    - **Praha 1–22 are offered** — the *správní obvody*, which tile the whole
      city. See the division note below for why this is not the Praha 1–10 in
      a postal address, and why that distinction changes how the dimension is
      scored
    - **Interactive district map** (`components/DistrictMap.jsx`,
      `lib/pragueDistricts.js`, built by `scripts/build-district-map.js`) — a
      flat, click-to-select map of Prague drawn beside the `casti` checkboxes.
      Inline SVG generated from real OpenStreetMap boundaries: no tiles, no
      mapping library, no network call at render time, nothing to rate-limit.
      Unlike `SchoolMap.jsx` (which does fetch OSM tiles) this costs nothing on
      a phone and works offline
    - **⚠️ Which of Prague's three divisions to use is the load-bearing
      decision, and it was measured, not assumed.** OSM carries all three:
      `admin_level=5` is the ten *městské obvody* (Praha 1–10, what postal
      addresses use), `admin_level=6` the 22 *správní obvody* (Praha 1–22),
      `admin_level=9` the 57 *městské části* (Praha 1–22 plus named ones —
      Zbraslav, Kunratice, Satalice, …). **We use the 22 správní obvody.** They
      tile the whole city, they are numbered 1–22 with no named exceptions to
      explain, and they are the division Praguers mean by "Praha 13"
    - **⚠️ A school's address cannot name its správní obvod, so location is
      scored from COORDINATES, never from `location`.** Point-in-polygon of all
      60 schools: the postal "Praha N" in the address disagrees with the real
      správní obvod for **18 of 60** — "Praha 9" addresses really in Praha 14,
      18, 19 or 20; "Praha 4" really in Praha 11; "Praha 5" really in Praha 13
      or 16. Parsing the address (which is what `districtOf` used to do) would
      match the wrong district for a third of the database and would never
      match Praha 11–22 at all, since no address contains those strings. Do not
      "simplify" this back into a string match
    - **Consequence: geocoding is now a prerequisite for location scoring.** A
      school with no latitude/longitude has no district and matches no district
      preference. Run `node scripts/geocode-schools.js` after every scrape. All
      60 are geocoded and verified as of this session
    - **`server.js` attaches `district` to every school it returns**
      (`withDistricts`, applied inside `withMatchScores` *before* its early
      return, because the search page's district filter needs it even for a
      visitor who never took the questionnaire). `matching.js` and
      `schoolSearch.js` both read that one field, which is what stops the
      search filter and the questionnaire calling the same school two different
      things
    - **⚠️ The map and the scorer are generated at DIFFERENT precisions, on
      purpose.** `frontend/src/lib/pragueDistricts.js` is simplified to 13.8% of
      its points (drawn only, ships to every browser); `lib/pragueDistricts.js`
      keeps **100%** of the source geometry (server-side, decides which schools
      a student is shown). This is safe because *schools are never plotted on
      the district map* — the map is a picker for district names, membership is
      decided entirely by the lookup, so there is no visual claim a coarser
      outline could contradict. It is also necessary: one real school (Akademie
      systémové gastronomie) sits **2 metres** from the Praha 9 / Praha 14
      border and lands on the wrong side at drawing tolerance. No tolerance
      makes a school standing on the line robust, so the side that decides what
      a student sees simply does not round. Verified 60/60 against unsimplified
      OSM geometry
    - `casti` **options are generated from `DISTRICT_IDS`**, not typed out, so
      the checkboxes, the map regions and the scorer cannot drift — all three
      come from one run of `scripts/build-district-map.js`. Districts with no
      schools yet (Praha 7, 12, 17, 21, 22) are still offered, so they work the
      day one is scraped there
    - **`max` is 10, raised from 6** when the list went 10 → 22 options. Six of
      ten was most of the city; six of twenty-two is barely a quarter, which
      quietly turns "where would you commute to" into a much narrower question
      than it reads as
    - **`map: 'praha-obvody'` is declared on the question**, not matched on
      `id === 'casti'` in React — the next question wanting a picker declares it
      alongside the rest of its definition. `DISTRICTS[].id` is exactly the
      `casti` option values ("Praha 1" … "Praha 10"); that string equality is
      the whole contract between map and checkboxes, and both drive the same
      answer through the same `toggleMulti`, so the cap applies to both
    - **⚠️ The SVG is deliberately `aria-hidden`.** Every district on it is
      already a real checkbox beside it, so exposing both would announce ten
      options as twenty controls with two tab stops each. The checkboxes are the
      accessible path; the map is a pointer shortcut onto the same state. If the
      checkbox list is ever removed, the map has to grow `role="checkbox"` and
      keyboard handling *before* it can stand alone
    - Labels are placed at each district's **pole of inaccessibility** (the
      interior point furthest from any edge), not its centroid — a centroid
      falls outside an L-shaped district and would float the number over a
      neighbour. Verified: all ten sit inside their own shape
    - Re-run `node scripts/build-district-map.js [mapTolerance]` to change the
      drawn simplification; the lookup is always full precision. The script
      refuses to write unless it gets exactly 22 stitched relations
    - Colour-only transitions, no `transform` anywhere on the map — a district
      is a fixed piece of ground and nudging it would read as the map moving
    - **Hover is synced both ways with the checkbox list** (`hoveredOption` in
      `Questionnaire.jsx`, passed down as `hovered`/`onHover`; the chips take
      `.is-peer-hovered`). Pointing at either representation highlights the
      other. This is the whole reason a map earns its place over the plain list:
      a student who does not know Prague's numbering can hover "Praha 6" and see
      *where* that is. Pointer-only by nature, so nothing about touch or keyboard
      use depends on it. The chip's peer-highlight deliberately **does not
      lift** — a lift means "your click lands here", and the pointer is
      somewhere else
    - Each region carries a `<title>` for a native tooltip. Inside the
      `aria-hidden` subtree it is never announced (the checkbox is what a screen
      reader reads), but browsers still show it on hover, which is what turns an
      unlabelled shape into a recognisable place
    - **⚠️ `:not(.is-selected)` on the hover rule is load-bearing.** Without it
      the hover selector is (0,4,0) against the selected rule's (0,3,0), so it
      won **regardless of source order** — and hovering a district you had
      already chosen repainted it pale, which reads exactly like the click just
      turned it off. Selected districts now get their own hover, shifting to
      `--accent-hover` (more prominent in both themes, even though that means
      darker on light and lighter on dark). Fixed by exclusion, not by ordering,
      so re-arranging the file cannot bring it back
    - **A running "Vybráno X z Y" count sits above the options** — and it is on
      *every* multi-select question, not just this one. Hitting the cap is the
      moment the remaining chips dim, and with no number on screen that looks
      like the page breaking rather than a limit being reached. It takes
      `--gold-ink` at the cap for the same reason
    - **Conditional questions (`showIf`)** — `bydliste` is the first question
      that only applies given another answer. `showIf: { field, equals }` on
      a `QUESTIONS` entry means "only ask/accept this when
      `answers[field] === equals`". It must stay a **plain JSON object, never
      a function** — `QUESTIONS` is served to the browser via
      `GET /api/questionnaire` as JSON, and a function property silently
      vanishes in `JSON.stringify`. `questionApplies(question, answers)` in
      `lib/questionnaire.js` is the one interpreter of that object; the
      backend validator uses it (evaluated against the already-validated
      `clean` object being built, never raw client input) to skip validating
      the question and to strip any value sent for it anyway, and
      `Questionnaire.jsx` carries an identical small copy (it can't
      `require()` a Node file) to decide what to render and where "next"/"Zpět"
      go. The frontend tracks the current question by **id**, not a numeric
      step index — a question that can vanish mid-flow (`bydliste` when
      `dojizdeni` flips to `nevadi`) makes any fixed index wrong the instant
      it happens. Reuse this pattern for the next branching question rather
      than inventing a second mechanism
    - **Adding a dimension:** append to `DIMENSIONS` in `matching.js` with a
      scorer returning 0..1 and a weight; it joins the average automatically.
      Weights need not total anything, they are normalised. This is where
      opening hours / admission cut-offs plug in once scraped
    - **Keyword maps are built from real data** — the 115 distinct program
      names actually in the database, folded for diacritics, matched with
      `includes` so stems catch their family. Re-check them after a scrape adds
      a new city, since program vocabulary will grow
    - **Claude via OpenRouter**, not the Anthropic SDK — plain `fetch`, no extra
      dependency (Node 24 has global fetch). The key is server-side only; an AI
      endpoint the browser could call is a bill anyone can run up.
      `reasoning: { effort: 'low' }` and `max_tokens: 4000` are set because
      reasoning models cannot disable thinking and Gemini 3.1 Pro otherwise
      spent ~1900 of a 2000-token budget before writing any answer, returning
      `content: null`. Non-reasoning models ignore the field
    - **No grades question.** The schools table has no admission-difficulty
      data to match a grade average against, so asking would imply a filter
      that does not exist. Add it when the scraper collects cut-off points
    - **Questions are served by the backend**, not duplicated in React, so
      there is one definition of a valid answer and it lives where it cannot
      be edited. `validateAnswers` rejects anything not in the offered options —
      otherwise the answers field is a free-text channel into the AI prompt
    - **Model output is never trusted:** returned `school_id`s are checked
      against the shortlist, so a hallucinated id cannot attach its sentence to
      a result
    - **Quota: 10 runs per month, counted from the signup anniversary** — not
      the 1st of the calendar month. The window is `usagePeriod(users.created_at)`
      in `questionnaire.js`: someone who joins on the 28th gets ten runs that
      day rather than a fresh allowance three days later. Anchored on account
      creation (trial start) rather than the Stripe billing date so the window
      stays continuous when a trial converts — moving the anchor mid-way would
      either hand out a second allowance days in or cut one short
    - **⚠️ Month arithmetic clamps the day** (`addMonthsClamped`). Plain
      `setMonth(+1)` on 31 January lands on 3 March, which would skip a
      February reset entirely for anyone who signed up on the 29th–31st. Tested
      across month-end, leap years and year boundaries; periods tile with no
      gaps. A missing or unparseable `created_at` falls back to the calendar
      month, and `months` is floored at 0 so clock skew cannot invent a period
      that ends before the account existed
    - Counted from rows in `questionnaire_runs` — no counter column to drift,
      nothing to reset on a schedule; the window simply moves. The quota is a
      *cost* control, not an anti-sharing measure: sharing is already bounded
      by the single login, and a tight cap would only punish a student
      legitimately trying different answers. Developers are exempt
    - **Reading results is free and unmetered** — a stored row, not a fresh
      call. Only submitting new answers spends allowance. A failed AI call
      writes no row, so it costs nothing
    - Separate hourly limiter (15/h) guards the *rate*; the quota guards the
      *total*. Different problems
    - `UsageMeter` shows what is left with a "?" popover explaining the cost
      reason honestly — it must not imply the user is suspected of anything
    - Stored rows keep `signals` and `breakdown` per match, so an old run can
      still explain itself and weight changes can be checked against what it saw
    - **The percentage shows up everywhere, not only here** — search results,
      favourites and the school detail page all carry `match_score`, added by
      `withMatchScores` in `server.js` from the account's newest stored answers.
      `components/MatchScore.jsx` renders it and returns null when there is no
      score, so a student who never took the questionnaire sees those pages
      exactly as they were. A genuine 0 still shows: the check is against null,
      not falsiness
    - **⚠️ Recomputed on every read, never stored per school.** `scoreSchools`
      is arithmetic over rows we already fetched — no model, no network, no
      allowance spent, so this stays as free as re-reading a stored run.
      Storing a score per school per run would duplicate the schools table on
      every submission and push the PostgREST row ceiling below closer. Whoever
      moves search to the backend (item 3 of section 12) has to carry
      `withMatchScores` onto the paginated query; a `select` that forgets it
      drops every percentage in the app with nothing to log
    - **Every surface recomputes, including this one.** `GET /api/questionnaire`
      rescores the stored match set before returning it, so a re-scrape or a
      weight tune can never leave one school reading 71% on the results page
      and 64% in search. The stored *set* is kept as it is — only those schools
      have an AI sentence, so re-selecting a new top 8 would put unexplained
      schools on the page — but it is re-sorted by the fresh score, otherwise
      rank 1 can show less than rank 2. Reasons are re-attached by `school_id`,
      never by position. Nothing is written back: the `score`/`breakdown`/
      `signals` on the run stay the historical record of what it saw, they are
      simply not what gets displayed
    - **Sorting by match** is offered on search and on favourites, both under
      the same `?razeni=shoda` param — on search it joins the existing query
      params so Back and pagination keep working, and favourites uses it too so
      that opening a school and pressing Back does not silently re-sort the
      list under someone who just chose how to read it. **Opens sorted by match
      by default whenever the account has a run** — a one-time effect on each
      page writes `razeni=shoda` into the URL the first time it finds none, ref-
      guarded so it fires exactly once per visit and never fights a visitor who
      explicitly switches back to "Podle názvu" (which just removes the param).
      The alphabetical fallback is the tie-break under the match sort either
      way (`Array#sort` is stable), and is what favourites shows on its own
      since the join behind it has no order of its own. The control appears
      only when the account has a run, the same absence rule as
      the badge. Opt-in: search still defaults to relevance, and match sorting
      wins over it only because the student asked for it

    **Many sets of answers, one of them default** — `questionnaire_runs.label`
    / `is_default` / `archived_at`, `scoringRunQuery` + `buildRunResult` in
    `server.js`, `frontend/src/lib/answerSummary.js`,
    `components/DefaultRunPanel.jsx`, `components/MatchList.jsx`, pages
    `QuestionnaireRuns.jsx` (`/dotaznik/sady`) and `QuestionnaireRun.jsx`
    (`/dotaznik/sady/:id`).

    Every submission has always inserted a row, but only the newest was ever
    readable, so a second questionnaire silently buried the first — and the
    `answers` jsonb, the only thing that tells two sets apart, was rendered
    nowhere. Now every set is reachable, and the student picks which one scores
    the database.

    - **⚠️ `scoringRunQuery` is the single definition of "which set is in
      use".** It orders `is_default desc, created_at desc` with
      `archived_at is null`, and both `withMatchScores` and
      `GET /api/questionnaire` go through it. Two copies of this ordering is how
      search ends up scoring against one set while the questionnaire page shows
      another — the contradiction section 11 spends most of its length
      preventing
    - **No set being flagged is a valid state meaning "the newest one"**, and
      that is what made this migration free: every pre-existing row is
      `is_default = false`, so accounts that predate the column score exactly as
      before with **no backfill**. It is also self-healing — archive the default
      and scoring falls back rather than every percentage in the app vanishing
    - **The flag is on the run, not a `default_run_id` on `users`.** Reads
      dominate: every `/api/schools`, `/api/favorites` and `/api/schools/:id`
      call resolves the scoring set, while setting it is a button press. On this
      side that is one indexed query; on the users side it would add a second
      lookup to every school request. It also keeps `users` — the row this
      project deliberately locks to select-only because it decides who has paid
      — out of a feature unrelated to billing
    - A **partial unique index** (`(user_id) where is_default`) enforces one
      default per account, so the two updates in `setDefaultRun` cannot leave
      two. **Clear before set** or the index rejects the second write; a crash
      between them leaves no default, which the resolver reads as "newest"
    - **A new set becomes the default automatically.** Finishing the
      questionnaire and finding the percentages unchanged would read as the
      submission having failed. Choosing an *older* set is the explicit action,
      from the set list, and it then survives every later submission
    - **⚠️ The set list shows no percentage, deliberately.** A number beside a
      set in the list and the same number on its results page arrive by
      different paths, and different paths drift. Sets are distinguished by an
      **answer digest** instead — `digestAnswers` over the three heaviest
      dimensions (`oblasti` 30, `typ` 20, `casti` 20) — which is both
      contradiction-proof and what a student actually recognises a set by. Two
      sets taken the same afternoon share a date and may share a top school;
      what differs is what was answered
    - The digest trims each option label at its em dash. "Gymnázium — široký
      základ, příprava na vysokou" reads well beside a radio button and blew the
      digest past 100 characters; measured over five profiles it now runs 28–104
      chars. The expanded answer list still shows labels in full
    - **Archive, never delete.** `readUsage` counts rows since the period start,
      so deleting sets would refund allowance and make the monthly cap
      meaningless. Archiving keeps the row counted, keeps a mis-click
      reversible, and leaves real erasure to account deletion. Archiving the
      current default is refused with a 409 rather than silently repointing
      scoring — that would move every percentage in the app from inside a
      tidy-up action
    - Naming, pinning and archiving take **`requireAuth` but not
      `requireAccess`**: managing your own answers has to keep working after a
      trial lapses, the same reasoning as the DELETE policy in
      `supabase-setup.sql`. Only the routes that read school rows need access.
      None of them touch `readUsage` — they are database writes, not AI calls
    - `GET /api/questionnaire`'s response key is **`active`, not `latest`** —
      with a default set it is no longer necessarily the newest, and the old
      name was a bug waiting to be believed. It also carries `runs` (id, label,
      date, flags, answers — no matches) so the list needs no second request
    - `buildRunResult` is the one place a stored row becomes a rendered result,
      shared by the GET and the by-id route. It also attaches districts before
      scoring, which changes no score (`districtOf` falls back to the same
      geometry) but stops the questionnaire being the one surface paying for the
      point-in-polygon work twice
    - Search and favourites carry a one-line `.match-source-note` naming where
      their percentages come from. Once an older set can be the default, "the
      last questionnaire you took" is no longer a safe assumption a student can
      make on their own

12. **What's NOT Built Yet (MVP Scope)**
    1. **Run Supabase SQL** — execute `supabase-setup.sql` in Supabase SQL Editor to create tables, trigger, and RLS policies (required before signup/login works). The whole file is safe to run repeatedly; re-run it after any future schema change.
       **Confirmed run:** probed the live database directly — `questionnaire_runs.label`/`is_default`/`archived_at` all exist and are queryable. This file's schema and the real database agree as of this session.
    2. **Stripe go-live** — decide price, create the product/price in Stripe, add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` to `.env` (~2h)
    3. **Backend pagination** — CRITICAL for ~500+ schools; see note below.
       (The questionnaire used to share this ceiling by stuffing all 60 schools
       into one prompt. It no longer does: `matching.js` ranks locally and only
       the top 8 reach the model, so the prompt size is fixed no matter how many
       cities are scraped. Scoring all schools in JS is fine into the thousands;
       the row-limit fix below is still needed to *fetch* them.)

Explicitly OUT of MVP scope (post-launch): Reviews/ratings, open-ended AI chat
assistant, mobile app (React Native).

## CRITICAL: Supabase PostgREST Row Limit

**Current state:** `GET /api/schools` does `select('*')` with no limit, and all results are
filtered in the browser. At 60 schools this is 21.2 KB (362 bytes/row). Survivable at
500 schools (~180 KB), but **Supabase's PostgREST has a hard default limit of 1000 rows
per response and truncates silently** — no error, just stops returning data. If the scraper
expands beyond Prague to Brno, Ostrava, and other cities, the row count will cross 1000,
schools will vanish from search, and nothing will log the truncation.

**What this means:**
- Display pagination (20 results per page) does NOT solve this — it hides a symptom but leaves
  the backend pulling all 1000+ rows at once
- The fix is to move search and sorting into the backend: `GET /api/schools?q=…&cast=…&obor=…&page=…`
  and return paginated results server-side, so the browser never downloads the full list
- **When to do this:** At ~500 schools in the database (Brno added), before expanding further

**Until then:** The current setup works fine for Prague-only (~60 schools). Monitor the row count
as you scrape. If it ever exceeds 950 or you add a new city, prioritize the backend pagination work.

**Implementation notes for future:**
- Keep the browser-side matching for UI responsiveness (instant filtering)
- Move the full-text search + ranking logic to the backend instead (SQL or Postgres FTS)
- Return the current page only, not the whole result set
- Keep `withMatchScores` on whatever query replaces `select('*')` — it is what puts the
  match percentage on every school card, and dropping it fails silently (see section 11)
- Dropdowns still aggregate from `select('*').limit(null)` on schools, but that's a separate
  metadata call (one per load, not per keystroke), so it's fine at any scale

## UI/UX Design Guidelines

A second UI/UX guidelines document (generic best-practice checklist, not written
for this codebase specifically) was compared against the design system already
built and documented in sections 4 and 10 above. Where the two agreed, nothing
changed. Where they conflicted, each is resolved below with a reason — several
in the new doc's favour, a few kept as this codebase already had them for a
specific reason that still applies. Treat this section as the merged, final
word; the standalone doc is superseded by it.

**Adopted from the new doc (real gaps, worth building):**

- **Semantic colour bands on `MatchScore` — BUILT.** `--accent-ink` for a
  strong match, `--gold-ink` for moderate, `--danger` for weak.
  - **⚠️ The cut points are 70 / 45, not the doc's 80 / 50, and they were
    measured.** Scores here are absolute rather than curved, so most schools
    genuinely do not suit any given student: pooled over five representative
    profiles × all 60 schools, the median score is **31%** and **75% of all
    pairs fall under 50%**. The doc's 50 line would therefore paint three
    quarters of a full search page red, and its 80 line is reached by only 6%
    of pairs — a genuinely good 74% match would read as lukewarm. At 70/45 the
    questionnaire's own top 8 comes out honest: a student with strong options
    sees 6–8 strong badges, one in a thin field (health) sees 0 strong, 4
    moderate, 4 weak. **Re-measure if `lib/matching.js` weights change**, since
    that shifts the whole distribution under these numbers.
  - Deliberately **plain coloured text, not a filled chip**. A solid red pill on
    a school card reads as "this school is broken" — the schools are real, it is
    the *fit* that is weak — and at 45% three quarters of a list would be filled
    badges. The cut points live in `MatchScore.jsx`; the CSS only paints.
- **Action toasts — BUILT.** `components/ToastContext.jsx`, rendered by a
  viewport inside `ToastProvider` in `App.jsx` (inside the router so any route
  can fire one, outside `<Routes>` so it survives the navigation it is
  confirming).
  - **Scope rule, worth keeping:** a toast is for something that *already
    succeeded somewhere the eye is not*. Anything the user has to act on stays
    in a `.notice` next to the thing it concerns. This is why Settings' e-mail
    change keeps its banner — it says "click the links in both e-mails", which
    must survive being read twice — while the password change became a toast.
  - Wired to: `FavoriteButton` (all four surfaces), `SchoolDetail`'s own
    separate favourite toggle, and Settings' name/password saves. Failures toast
    too, because an optimistic star silently snapping back is indistinguishable
    from never having clicked.
  - Bottom-centre, not top-right: top-right is where this app's own header and
    sign-out button are. The viewport is always mounted so `aria-live` has
    somewhere to put a message, which is why it needs
    `pointer-events: none` — otherwise it would swallow clicks along the bottom
    edge of every page.
  - `useToast()` returns a no-op outside the provider rather than throwing. A
    missing provider must never turn a working favourite button into a crashed
    page over a confirmation message.
- **Icon library: adopted — `lucide-react`.** Chosen over alternatives because
  its default rendering (20–24px viewBox, `stroke="currentColor"`, rounded caps
  and joins, no fill) already matches the hand-drawn SVGs this app had before
  adopting anything (`UsageMeter`'s "?" icon, `Search`'s magnifying glass) —
  so the new icons sit at the same visual weight without any override, and
  `currentColor` means every icon follows dark mode for free, the same as the
  text it sits next to. Named imports only (`import { MapPin } from
  'lucide-react'`), never the barrel/default import — that's what makes it
  tree-shakeable. Verified: adding `MapPin`, `Phone` and `Globe` this way cost
  2.4 KB (0.86 KB gzipped) of bundle, not the whole icon set.
  - **Where it's used so far** — exactly the "repeated metadata" case this was
    adopted for, nothing broader: `MapPin` before a school's location on
    search cards (`.school-card-meta`) and questionnaire match cards
    (`.match-card-meta`), and `MapPin`/`Phone`/`Globe` before the
    Adresa/Kontakt/Web školy labels in the school detail page's info list.
  - **`.meta-icon`** (`App.css`) is the one shared sizing rule — `width/height:
    1em`, so an icon dropped next to any text automatically matches that
    text's own size instead of needing a per-context override. Always pass
    `strokeWidth={1.75}` explicitly to match the existing hand-drawn icons'
    weight (Lucide's own default is `2`, tuned for a 24px viewBox rather than
    the 20px one already used here — 1.75 is what lines the two up).
  - **Not** used for: the favourite star (stays a filled custom path — a
    favourited state reads better solid than as a line icon), the back-arrow
    and card chevron (stay plain glyphs — no metadata to label), or anything
    decorative. This was adopted to fix one specific gap, not to re-icon
    everything that currently uses text or a glyph.
  - Also now: `Check` in the Paywall benefit list (replacing a `✓` glyph in a
    `::before`, so it sits on the same stroke weight as every other mark), and
    `Check`/`AlertCircle`/`X` inside the toasts.
  - **Notices were left on text alone, deliberately.** 23 call sites, and every
    one already carries a written title ("Školu se nepodařilo načíst"), so
    colour is not the only signal there — the accessibility argument for adding
    an icon does not actually apply. Doing it would have meant either a
    23-site refactor or a `::before` data-URI, which diverges from the icon
    approach adopted above.

**Two token additions this pass, both to keep an existing rule true:**

- **`--gold-ink`** — gold dark enough to carry text, mirroring the existing
  `--accent` / `--accent-ink` split. `--gold` itself is only **4.46:1** on white
  and **3.90:1** on `--gold-soft`, so the 11px `.badge` label ("Nejlepší shoda")
  was **below WCAG AA for small text before this pass** — a pre-existing bug,
  not one the score bands introduced. `--gold-ink` clears 5.3:1 everywhere it
  lands and is now used by `.badge`, the password-strength "fair" label,
  `.btn.is-favorite` and the moderate score band. **Use `--gold` for borders,
  fills and meter segments; `--gold-ink` whenever gold carries a glyph.**
- **`--ease-linear`** — constant rate, for continuous rotation only (currently
  just `.btn-spinner`). Every other easing token accelerates or decelerates,
  which on an endless loop makes each revolution visibly pulse. Named rather
  than writing `linear` inline so the "no hardcoded easings" rule still holds
  and the exception is argued once, here.

**Loading spinners** — `.btn-spinner`, on all 11 async buttons in the app. The
label already changed ("Přihlašuji…"), but a text swap alone is easy to miss on
the click you just made. **⚠️ Hidden outright under `prefers-reduced-motion`,
not slowed:** the global rule in `index.css` collapses animations to 0.01ms,
which for an infinite rotation does not mean calmer — it means a ring frozen
mid-turn, i.e. a permanently broken-looking button. The label carries the state
on its own, so showing nothing is the honest fallback.

**Already satisfied by what's built (new doc validates, doesn't add):**

- **4pt/8pt spacing grid** — `--space-1` through `--space-9` in `index.css`
  are `4, 8, 12, 16, 24, 32, 48, 64, 88`px — already exact multiples of 4.
  Nothing to change.
- **Soft, low-opacity ambient shadows, heavier ones for floating/overlay
  elements** — `--shadow-sm/md/lg` are already blurred, low-alpha, and scale
  up for popovers vs. resting cards (see section 7 of the old checklist).
  Already the pattern in `App.css`.
- **Dark mode uses lighter elevated surfaces, not black + heavy shadow** —
  dark `--surface` (#152420) is already lighter than dark `--bg` (#0e1613),
  and `--shadow-*` swap to low-alpha black rather than growing heavier.
  Already the pattern; see the dark-theme block in `index.css`.
- **Every interactive element has hover, active/pressed, and disabled
  states** — already true everywhere: `.option-chip`, `.filter-select-button`,
  `.school-card`, `.match-card`, `.btn` all define all three. Buttons use a
  bespoke pressed-depth effect (`translateY(1px)` + inset shadow, see the "3D
  buttons" note in section 10) rather than a generic `scale(0.95)`; icon-only
  circular controls (`.avatar-link`, the password reveal toggle) do use a
  scale press. Both are the same feedback *principle* — visible press — fitted
  to the control shape it's on. Keep both; do not flatten the button press
  into a generic scale to match the checklist literally, since the current
  version is more considered and already shipped.
- **Focus rings, not just colour, on invalid form fields** — `.input:focus`
  already does a ring (`box-shadow: 0 0 0 4px var(--accent-soft)`), and error
  states already use `--danger` (see `PasswordInput`/`AuthTabs` error styling).

**Kept as-is, overriding the new doc — this codebase's existing choice is
better for this specific site:**

- **Two type families (Source Serif 4 + IBM Plex Sans), not one.** The new
  doc's "single sans-serif family" rule is generic SaaS advice; this app
  deliberately pairs a serif display face with a sans UI face for the
  "trustworthy, considered" positioning a school-choice decision calls for.
  It's already been verified for full Czech diacritics and WCAG AA contrast
  in both themes — replacing it with a single generic sans would be a
  regression with no upside, not a fix for a real problem.
- **Heading letter-spacing stays at `-0.01em`, not the doc's `-0.02em to
  -0.03em`.** Czech headings carry diacritics (Škola, Gymnázium, Předměty)
  that sit above the cap height; tightening further risks visual collision
  between accent marks on adjacent tight-set capitals. `-0.01em` already
  reads as intentional at this type scale — going tighter is a real risk for
  this specific alphabet, which the generic doc had no reason to consider.
- **One interactive accent colour (teal), not a separate blue for focus/links.**
  The new doc's semantic table adds blue for "information, focus, neutral
  signifiers" alongside green/amber/red for status. This app already runs on
  a single accent hue for every interactive/focus purpose, verified for
  contrast in both themes. Adding a second interactive hue fractures that
  single coherent system for no real benefit — the existing "amber for
  moderate/warning, red for error, teal for interactive" split already covers
  every case that mattered without needing a fourth colour to track and
  re-verify.
- **No fixed 12/8/4-column responsive grid.** The site's layouts are flexbox
  and max-width based (`--content-width`, `.auth-layout`/`.questionnaire-layout`
  etc. pairing `max-width` with `width: 100%`), not a column-grid system.
  Retrofitting an explicit column grid onto pages that already reflow
  correctly would be pure churn with nothing to show for it.
- **School image banners** — not adopted, but not really a design
  disagreement: there is no `image` column in `schools` and the scraper never
  collected photos. Nothing to bind a banner to. Revisit only if the scraper
  is extended to pull a photo per school; don't fake one with a placeholder.

## Agent Workflow

Two project-scoped subagents live in `.claude/agents/`: **`builder`**
implements a scoped feature or fix end-to-end (crossing frontend/backend
together when the work does — this codebase's features usually aren't clean
layer splits); **`reviewer`** independently re-verifies the result and checks
it against this file's documented invariants and known failure modes, then
reports findings and any open product-decision questions.

- **Not automatic for every change.** Small fixes and one-off requests still
  happen directly in the main session, same as most of this file's history —
  that matches the stated preference below for small, tested, one-at-a-time
  changes. The builder/reviewer pair is for well-scoped, sizeable pieces of
  work where an isolated context is worth the overhead.
- **A subagent cannot interrupt the user mid-task.** It returns a report to
  the orchestrating session, which relays anything genuinely uncertain —
  reviewer's "Questions for the user" section exists for exactly this and
  should be surfaced, not silently resolved on the user's behalf.
- **Reviewer only reports; it does not fix.** Findings and fixes stay in
  separate passes on purpose.
- An earlier draft of this idea (`claude new md.md`, since deleted) was a
  generic Python-tools/Markdown-SOP template from an unrelated project —
  nothing in it matched this stack, so none of it carried over.

## Working Constraints

- Solo developer — no budget to hire, doesn't want collaborators right now
- Limited daily hours (school + gym + soccer training take up most of the day,
  roughly 2-4 hours/day available for this project)
- Prefers building and testing one feature at a time rather than large untested
  batches of code
- Wants direct, honest technical feedback — flag bad approaches immediately,
  suggest better alternatives rather than being diplomatically vague

## Language & Localization

- **Frontend is in Czech** — UI text, labels, placeholders, error messages all use Czech
  because the target audience is Czech 9th graders and their parents
- Backend API returns data as-is from Supabase (school names, locations, programs
  may be in Czech or English depending on scraper output)

## Geographic Scope for V1

Prague only, targeting ~50-60 schools initially. Expansion to other Czech cities
planned for later phases once the Prague version is validated with real users.

## Open Tasks — Delete from Here When Fixed

These are decided-but-deferred features that will need implementation; they're
tracked here so they don't vanish into conversation history.

**When you implement any of these, delete its entry from this list** — that's
the signal that it's shipped.

1. **`zacatek` (school start time) question wording** — currently reads "Záleží
   mi na tom — zatím to ale nedokážeme zohlednit" (we can't act on this yet),
   which is awkward. Either: make it `optional: true` to soften the caveat, move
   the caveat into a `hint` field instead of inline, or drop the question until
   there's a start-time field in the database to match against. User has not
   decided which.

2. **`velikost` (school size) scoring** — the question is asked but scores zero
   because there are no enrolment figures in the database. When the scraper
   collects school sizes, add a `velikost` dimension to `lib/matching.js` to
   match student preferences (small/large/doesn't matter) against actual school
   enrolment. Decide on weight (likely lower than geography/interests, since
   this is about environment not what you study) and whether the current binary
   options are fine or need to be split finer. The rule: do not invent a proxy
   like program count — that reintroduces the fake precision this design
   removed.

3. **Confirm the Home page at 375px.** CLAUDE.md carried a "Home overflows
   horizontally at 375px (scroll width 394px)" note for a long time. Trying to
   reproduce it analytically this pass found nothing that would cause it:
   `.hero-actions` already wraps, the 900px breakpoint drops `.hero` to one
   column and `.stat-strip` to two, `.steps` to one, and all three card bodies
   already carry `min-width: 0`. The 19px gap is the width of a desktop
   scrollbar, which `scrollWidth` includes — so the original number may well
   have been a measurement artifact rather than a real overflow, or it may have
   been fixed incidentally by later responsive work.
   **This could not be checked visually** (the browser tools are blocked on this
   machine — see the top of this file), so it needs a human to open Home at
   375px and look. What *was* fixed is a real, data-backed overflow risk found
   while looking: the scraped names run to 100 characters with single words of
   18, and `.school-card-name` / `.match-card-name` / `.detail-title` had no
   `overflow-wrap`, so a long word overhung its own shrunken box. All three now
   break instead.
