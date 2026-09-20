# 006 — Comparison & decision tools (feature-brainstorm.md §5)

- **Planned:** 2026-09-10, Opus 5, `/plan-then-build`
- **Base commit:** `1bf53fd`
- **Design canvas:** https://claude.ai/code/artifact/688789aa-b54c-4a5e-b2b6-17b3ee775899
  (source artboards in `design/comparison-tools/*.dc.html`)
- **Scope:** every 🔥/✅ row of feature-brainstorm.md §5 **except** "Full
  share-with-parent link" (deferred by explicit user decision — see UNFORGET.md).
- **Impact:** HIGH · **Effort:** L · **Risk:** Medium

---

## What ships

| §5 row | Where it lands |
|---|---|
| Side-by-side comparison (2–4 schools) 🔥 | `/porovnani` |
| Weighted decision matrix 🔥 | `/porovnani/matice` |
| Pros/cons auto-generated per school ✅ | `school_ai_summary`, rendered in both |
| Shortlist limit warning ("only 3") 🔥 | `/prihlaska` + compare bar |
| Priority-order drag-and-drop planner 🔥 | `/prihlaska` |
| Decision journal / notes per school ✅ | `school_notes`, on `/prihlaska` |
| Share shortlist with parents 🔥 | `/sdileni/:token` |
| Print/PDF export ✅ | `@media print` + `window.print()` |
| "Risk analysis" of your 3 picks 🔥 | `/prihlaska` right rail |
| Shortlist / favorites 🔥 | **already built**, not re-implemented |

Deliberately NOT in scope: `Full share-with-parent link` (needs the parent/child
account + pricing model decided first).

---

## 1. Architecture decisions (already made — do not re-derive)

### 1.1 Three objects, not one

There are three genuinely different lists and conflating them is the main trap:

| Object | Lives in | Lifetime | Cap |
|---|---|---|---|
| **Favourites** | `favorites` table (exists) | long-lived "interested" | none |
| **Compare selection** | `localStorage` via `lib/searchPrefs.js` (exists) | ephemeral scratch | 4 |
| **Application picks** | `application_picks` table (NEW) | the real commitment | 3 |

`Search.jsx`'s checkbox selection and `SchoolActions.jsx`'s "Přidat k porovnání"
both feed the **compare selection**. Adding a school to the **picks** is a
separate, deliberate action taken on `/porovnani` or `/prihlaska`.

Do not make picks a boolean column on `favorites`. A pick is not a favourite —
students pick schools they never favourited, and favourite schools they don't pick.

### 1.2 Routes

| Route | Component | Guard |
|---|---|---|
| `/porovnani` | `pages/Porovnani.jsx` | inside `Layout`, `optionalAuth`-ish (works signed out) |
| `/porovnani/matice` | `pages/Matice.jsx` | same |
| `/prihlaska` | `pages/Prihlaska.jsx` | inside `Layout` + `ProtectedRoute` |
| `/sdileni/:token` | `pages/SdileniView.jsx` | **outside `Layout`**, no auth at all |

`/porovnani` must work signed out — the compare selection is localStorage and
`/api/schools` is ungated, so an anonymous visitor can compare. Only `/prihlaska`
requires an account (it writes to the DB).

`/sdileni/:token` sits outside `Layout` for the same reason onboarding does: a
parent following a link should not see a nav bar inviting them elsewhere.

### 1.3 The AI decision — cached per school, NOT per request

**This is the cost decision. Get it right or the feature is expensive forever.**

Pros/cons are a function of *the school's own data* (cutoff, acceptance rate,
capacity, obor mix, trend), which changes about once a year when the Cermat import
runs. They are **not** personalised per student — personalisation already exists
elsewhere (`match_score`, and the onboarding reason sentence).

So: generate once per school, store in the DB, serve from the DB.

- 60 schools × 1 call = **60 calls, ever** (plus a re-run per yearly import).
- A per-request design would be `users × schools` calls — the thing that actually
  burns credits.
- Bonus: `/porovnani` renders instantly with no LLM spinner.

Implementation: `scripts/generate-school-proscons.js`, modelled on
`scripts/import-admission-data.js` (same `dotenv` + service-role client + `--dry-run`
shape). It skips any school whose `data_fingerprint` is unchanged, so re-runs are
nearly free.

**Model choice — build it swappable, decide empirically.** Read
`process.env.OPENROUTER_PROSCONS_MODEL`, default `google/gemini-2.5-flash-lite`.
Honest reasoning: this task is short-form Czech rewriting over structured numeric
input — no long-context reasoning, no multi-step inference, and the model never
produces a number (all figures are interpolated from our own data before the
prompt). That is squarely inside a small model's competence, and a flash-lite tier
is roughly 20–30× cheaper per token than Sonnet. The one genuine risk is **Czech
fluency**, which is where small models degrade first and which cannot be settled by
reasoning about it. So: after implementation, run the script with `--dry-run` across
the same 5 schools under 3 models and have the user read the Czech. See §7.

### 1.4 Risk analysis uses the OBOR cutoff, not the school average

`schools.admission_cutoff` is a 3-year average **across every obor a school offers**.
Telling a student "you're 3 points short" against that number would be wrong for any
school with a mixed obor portfolio.

`school_programs` already holds a per-obor, per-year `cutoff`. So a pick carries an
optional obor, and:

- **obor chosen** → compare against that obor's latest `cutoff`. Accurate.
- **no obor chosen** → fall back to the school average, and say so visibly in the UI.

This is why `application_picks` has `obor_kkov` / `obor_nazev` columns.

### 1.5 The matrix is plain arithmetic, never AI

Same rule as `lib/matching.js`: the model never produces a number. The weighted
matrix is pure JS, deterministic, auditable.

Criteria with no data source are rendered **locked and greyed**, never defaulted to
a neutral value — a silently-defaulted criterion is a fabricated comparison. Weights
renormalise across the criteria that do have data, so a missing field never penalises
a school. (Same principle already used by `lib/matching.js`'s `known` flags.)

---

## 2. Database — append to `supabase-setup.sql`

Add a new numbered section after the `data_reports` block (~line 277), keeping the
file's existing idempotent `create table if not exists` style, then add the RLS
statements into the existing section 5.

```sql
-- ----------------------------------------------------------------------------
-- 3d. Comparison & decision tools (feature-brainstorm.md §5)
-- ----------------------------------------------------------------------------

-- The three schools this student is actually applying to, in binding DiPSy
-- order. `priority` is 1..3. No unique constraint on (user_id, priority):
-- server.js rewrites the whole set on every reorder (delete-then-insert, at
-- most 3 rows), which is simpler and cannot leave a half-swapped state.
-- obor_kkov/obor_nazev are optional — a pick without an obor still works, it
-- just falls back to the school-level cutoff for risk analysis.
create table if not exists public.application_picks (
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id bigint not null references public.schools (id) on delete cascade,
  priority int not null check (priority between 1 and 3),
  obor_kkov text,
  obor_nazev text,
  created_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

create index if not exists application_picks_user_idx
  on public.application_picks (user_id, priority);

-- Free-text notes, one per user per school. Not limited to picked schools —
-- a student may take notes on a school they later drop.
create table if not exists public.school_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id bigint not null references public.schools (id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

-- The single JPZ score the risk analysis compares against. Deliberately ONE
-- nullable integer and nothing else: CLAUDE.md's data-minimisation rule treats
-- grades as sensitive data about minors, so no per-subject breakdown is stored.
-- `source` is 'nanecisto' (September mock) or 'ostra' (the real exam).
create table if not exists public.decision_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  jpz_points numeric check (jpz_points >= 0 and jpz_points <= 100),
  jpz_source text check (jpz_source in ('nanecisto', 'ostra')),
  updated_at timestamptz not null default now()
);

-- Revocable read-only share links. The view reads LIVE data at request time
-- (not a snapshot) so a parent always sees the current picks; revoked_at is
-- what makes "you can cancel the link" true rather than cosmetic.
create table if not exists public.shortlist_shares (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  include_notes boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists shortlist_shares_user_idx
  on public.shortlist_shares (user_id, revoked_at);

-- Cached per-school pros/cons. Generated by scripts/generate-school-proscons.js,
-- NOT at request time — see plans/006 §1.3. `data_fingerprint` is a hash of the
-- school inputs the text was written from, so a re-run regenerates only schools
-- whose data actually moved.
create table if not exists public.school_ai_summary (
  school_id bigint primary key references public.schools (id) on delete cascade,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  model text,
  data_fingerprint text,
  generated_at timestamptz not null default now()
);
```

RLS (add to section 5, following the `favorites` pattern exactly):

```sql
alter table public.application_picks enable row level security;
alter table public.school_notes enable row level security;
alter table public.decision_profile enable row level security;
alter table public.shortlist_shares enable row level security;
alter table public.school_ai_summary enable row level security;

-- application_picks / school_notes / decision_profile: read and delete your
-- own rows. NO client INSERT or UPDATE policy — server.js (service_role) is the
-- only writer, same reasoning as questionnaire_runs: a browser that could write
-- here could point a row at a user_id it does not own. DELETE stays open so an
-- expired account can still erase its own data.

drop policy if exists "read own picks" on public.application_picks;
create policy "read own picks" on public.application_picks for select
  using (auth.uid() = user_id);
drop policy if exists "delete own picks" on public.application_picks;
create policy "delete own picks" on public.application_picks for delete
  using (auth.uid() = user_id);

drop policy if exists "read own notes" on public.school_notes;
create policy "read own notes" on public.school_notes for select
  using (auth.uid() = user_id);
drop policy if exists "delete own notes" on public.school_notes;
create policy "delete own notes" on public.school_notes for delete
  using (auth.uid() = user_id);

drop policy if exists "read own decision profile" on public.decision_profile;
create policy "read own decision profile" on public.decision_profile for select
  using (auth.uid() = user_id);
drop policy if exists "delete own decision profile" on public.decision_profile;
create policy "delete own decision profile" on public.decision_profile for delete
  using (auth.uid() = user_id);

drop policy if exists "read own shares" on public.shortlist_shares;
create policy "read own shares" on public.shortlist_shares for select
  using (auth.uid() = user_id);
drop policy if exists "revoke own shares" on public.shortlist_shares;
create policy "revoke own shares" on public.shortlist_shares for delete
  using (auth.uid() = user_id);

-- school_ai_summary: NO client policy at all, same as `schools`. It is school
-- data and reaches the browser only through server.js.
```

**Also update the CLAUDE.md schema table** with the five new tables.

---

## 3. Backend — `server.js`

Add one new section after the Reviews section (~line 700), before the
Questionnaire section. Register a `decisionLimiter` alongside the existing
limiters (60/hour — these are cheap DB writes, not AI calls).

### 3.1 Access rule for this whole section

Follow the rule already stated in CLAUDE.md: **routes that read school rows need
`requireAccess`; routes that manage or erase the user's own data need only
`requireAuth`.**

| Route | Middleware |
|---|---|
| `GET /api/picks` | `requireAuth, requireAccess` (returns school rows) |
| `PUT /api/picks` | `requireAuth, requireAccess` |
| `DELETE /api/picks/:schoolId` | `requireAuth` only |
| `GET /api/notes` | `requireAuth` only |
| `PUT /api/notes/:schoolId` | `requireAuth` only |
| `DELETE /api/notes/:schoolId` | `requireAuth` only |
| `GET /api/decision-profile` | `requireAuth` only |
| `PUT /api/decision-profile` | `requireAuth` only |
| `POST /api/shares` | `requireAuth, requireAccess` |
| `GET /api/shares` | `requireAuth` only |
| `DELETE /api/shares/:token` | `requireAuth` only |
| `GET /api/shared/:token` | **no auth at all** |

### 3.2 `PUT /api/picks` — whole-set replace

Body: `{ picks: [{ schoolId, oborKkov?, oborNazev? }, ...] }`, ordered, max 3.

```
1. Validate: array, length 0..3, every schoolId an integer, no duplicate schoolId.
   Reject 400 `{ error: 'Do přihlášky patří nejvýš 3 školy.', code: 'TOO_MANY_PICKS' }`
   when length > 3.
2. delete from application_picks where user_id = req.user.id
3. insert the array with priority = index + 1
4. Respond with the same shape GET /api/picks returns.
```

Delete-then-insert, not a diff — at most 3 rows, and it makes reordering a single
idempotent call with no intermediate state. Same idiom as
`import-admission-data.js`'s per-year `school_programs` write.

### 3.3 `GET /api/picks`

Returns picks joined to full school rows (including `school_programs(*)` and
`school_ai_summary(*)`), passed through `withMatchScores(req.user.id, schools)` so
the district and match score are attached the same way every other school read does
it. Shape:

```json
[{ "priority": 1, "obor_kkov": "18-20-M/01", "obor_nazev": "Informační technologie",
   "school": { ...full school row... } }]
```

### 3.4 `GET /api/shared/:token` — the public one, be careful here

This is the only unauthenticated route that returns school data, so it needs its own
tight contract:

```
1. Look up shortlist_shares by token where revoked_at is null. 404 if absent —
   the SAME 404 body for "never existed" and "revoked", so the endpoint is not a
   token oracle.
2. Read that share's user's picks + decision_profile.
3. Read school_notes ONLY IF share.include_notes is true.
4. Return ONLY: the owner's FIRST NAME (users.name split on whitespace, first
   token, or null), the picks with their schools, jpz_points, and (conditionally)
   notes.
```

**Never return** the owner's email, id, `trial_expires_at`, `subscription_status`,
favourites, or questionnaire answers. This is a link a minor pastes into a family
chat; it must expose exactly what the student chose to expose and nothing else.

Token generation: `require('crypto').randomBytes(16).toString('base64url')` — 128
bits, unguessable. Never a sequential id or anything derived from `user_id`.

Add a dedicated `shareLimiter` (30/hour) on `GET /api/shared/:token` so the token
space cannot be walked.

### 3.5 Attach `school_ai_summary` to the existing school reads

In `GET /api/schools` and `GET /api/schools/:id`, extend the select to
`'*, school_programs(*), school_ai_summary(*)'`. Supabase returns it as an array —
normalise it to a single object (or null) inside `withMatchScores`'s `located` map
so the frontend never has to know it was a join.

---

## 4. Frontend

### 4.1 New files

| File | Job |
|---|---|
| `frontend/src/lib/decisionMatrix.js` | pure scoring — see §4.2 |
| `frontend/src/lib/admissionRisk.js` | pure risk banding — see §4.3 |
| `frontend/src/lib/comparisonRows.js` | builds the row model both desktop + mobile tables render |
| `frontend/src/pages/Porovnani.jsx` | comparison table |
| `frontend/src/pages/Matice.jsx` | weighted matrix |
| `frontend/src/pages/Prihlaska.jsx` | 3-pick planner |
| `frontend/src/pages/SdileniView.jsx` | public read-only share view |
| `frontend/src/pages/decision.css` | all styles for the four pages above |
| `frontend/src/components/decision/DecisionTabs.jsx` | the shared 3-tab bar |
| `frontend/src/components/decision/PickCard.jsx` | one draggable pick row |
| `frontend/src/components/decision/RiskSummary.jsx` | the reach/target/safety rail |
| `frontend/src/components/decision/PointsInput.jsx` | JPZ score entry + "nemám body" |
| `frontend/src/components/decision/NoteEditor.jsx` | autosaving textarea |
| `frontend/src/components/decision/ProsCons.jsx` | renders `school_ai_summary` |

Register the four routes in `App.jsx` (`/sdileni/:token` outside `<Layout>`,
alongside the onboarding routes).

Add fetch helpers to `frontend/src/api.js` following the existing style exactly —
`fetchPicks`, `savePicks`, `removePick`, `fetchNotes`, `saveNote`, `deleteNote`,
`fetchDecisionProfile`, `saveDecisionProfile`, `createShare`, `fetchShares`,
`revokeShare`, `fetchSharedShortlist`. `fetchSharedShortlist` must bypass the auth
header (it is public) — give it its own bare `fetch` rather than `request()`.

### 4.2 `lib/decisionMatrix.js`

```js
export const CRITERIA = [
  { id: 'sance',   label: 'Šance na přijetí',              available: true  },
  { id: 'mista',   label: 'Počet míst',                    available: true  },
  { id: 'typ',     label: 'Typ školy odpovídá mým plánům', available: true  },
  { id: 'jazyky',  label: 'Nabídka jazyků',                available: true  },
  { id: 'skolne',  label: 'Bez školného',                  available: true  },
  { id: 'dojezd',  label: 'Dojezd z domova',               available: false,
    unavailableNote: 'Na dojezdových časech MHD pracujeme.' },
  { id: 'maturita',label: 'Úspěšnost u maturity',          available: false,
    unavailableNote: 'Data o maturitě zatím nemáme.' },
];

export const WEIGHTS = { nezalezi: 0, trochu: 1, dost: 2, zasadni: 3 };
```

`scoreByWeights(schools, weights)` returns, per school, a 0–1 `score` plus a
`breakdown` array of `{ criterionId, raw, weighted }`.

Per-criterion raw score (all normalised 0–1 **across the compared set only**, so
the comparison is relative to what's on screen, not to all of Prague):

| id | raw |
|---|---|
| `sance` | inverted min-max of `admission_cutoff` (lower cutoff = better) |
| `mista` | min-max of current-year `kapacita` from `summarizeCurrentYear` |
| `typ` | 1 if `maturitni`, else 0.5 — placeholder until a student "plans" input exists |
| `jazyky` | min-max of distinct `jazyk_studia` count |
| `skolne` | 1 when `zrizovatel` is public (not soukromá/církevní), else 0 |

**Renormalisation rule:** drop every criterion that is `available: false`, weighted
`nezalezi`, or whose data is null for *any* school in the set; then divide each
remaining weight by the sum of remaining weights. If nothing remains, return
`score: null` and let the UI say so rather than showing a fake zero.

A single school in the set makes min-max degenerate — return `raw: 0.5` for every
criterion in that case rather than dividing by zero.

### 4.3 `lib/admissionRisk.js`

```js
export const BANDS = {
  jistota: { label: 'Jistota',      tone: 'ok'     },
  realna:  { label: 'Reálná šance', tone: 'accent' },
  risk:    { label: 'Risk',         tone: 'danger' },
};
```

`bandFor({ studentPoints, cutoff })`:

- `cutoff == null` → `null` (unknown, render "hranice neznámá", never a band)
- `studentPoints == null` → `null` (show the cutoff, no verdict — this is the
  "nemám ještě body" path the user asked for)
- `studentPoints >= cutoff + 10` → `jistota`
- `studentPoints >= cutoff - 5` → `realna`
- otherwise → `risk`

`cutoffForPick(pick, school)`: if `pick.obor_kkov` matches an entry from
`groupProgramsByObor(school)`, return that entry's `latest.cutoff` and
`{ source: 'obor', year }`. Otherwise return `school.admission_cutoff` and
`{ source: 'skola' }` — and the UI **must** show a caveat when source is `skola`.

`analyseSet(picks)` → `{ counts: { jistota, realna, risk }, verdict }` where verdict
is one of:

| condition | verdict key | copy |
|---|---|---|
| ≥1 of each, or 1 jistota + 2 others | `vyvazene` | "Tohle je dobře rozložené." |
| all `risk` | `vseRisk` | "Všechny tři jsou risk — zvaž přidat školu, kam se dostaneš jistě." |
| all `jistota` | `vseJistota` | "Máš jistotu, ale možná míříš níž, než bys mohl." |
| no `jistota`, mixed | `bezJistoty` | "Chybí ti záložní škola, kam se dostaneš skoro jistě." |
| < 3 picks | `neuplne` | "Zatím máš X ze 3 škol." |
| no points entered | `bezBodu` | "Zadej svoje body a spočítáme rozbor." |

**Zero-shame constraint (onboarding-architect §0, applies app-wide):** none of this
copy may imply the student is not good enough. Say what the data says and what to do
about it; never "you probably won't get in".

### 4.4 Drag and drop — no library

Three items. Use the HTML5 drag events (`draggable`, `onDragStart`, `onDragOver`,
`onDrop`) plus **keyboard-accessible ↑/↓ buttons on every card**, which are the real
accessibility path and also the only thing that works on touch. Do not add
`dnd-kit`/`react-beautiful-dnd` for three rows.

Reorder writes immediately via `savePicks` (whole-set PUT). Optimistic update with a
rollback on error, following the favourites toggle pattern already in the codebase.

### 4.5 Print

In `decision.css`:

```css
@media print {
  .app-nav, .decision-tabs, .decision-actions, .sm-wrap { display: none !important; }
  .decision-page { padding: 0; }
  .pick-card { break-inside: avoid; }
  a[href]::after { content: ''; }
}
```

The button is `onClick={() => window.print()}`. No PDF library — the browser's own
"Save as PDF" is the feature.

### 4.6 Wire the existing dead buttons

- `Search.jsx` ~line 1194: the `onClick={() => {}}` on "Porovnat N škol" becomes
  `navigate('/porovnani')` after writing `selected` into the compare selection.
- `Search.jsx`: cap the checkbox selection at 4 and show the cap in the compare bar.
- `SchoolActions.jsx`: keep "Přidat k porovnání" as-is; add a second action
  "Přidat do přihlášky" that calls `savePicks` (guarded — signed-in only, and shows
  the 3-school limit message when full).

---

## 5. `scripts/generate-school-proscons.js`

Model it on `scripts/import-admission-data.js`: same `require('dotenv').config()`,
same service-role client, same `--dry-run` flag, same "print what would change, then
write" flow.

```
node scripts/generate-school-proscons.js --dry-run          # all schools, preview
node scripts/generate-school-proscons.js --limit 5          # first 5 only
node scripts/generate-school-proscons.js --model google/gemini-2.5-flash-lite
node scripts/generate-school-proscons.js --force            # ignore fingerprints
```

Per school:

1. Build the input record from data we already hold: name, zřizovatel, typy škol,
   `admission_cutoff`, `acceptance_rate`, current-year kapacita/přihlášky, obor
   count, jazyky, and the trend direction from `groupProgramsByObor`. Plus the
   **Prague median** cutoff and acceptance rate, so the model can say "above/below
   average" without inventing a comparison.
2. `data_fingerprint = sha256(JSON.stringify(inputRecord))`. Skip the school when it
   matches the stored one and `--force` is absent.
3. One OpenRouter call, `temperature: 0.3`, `max_tokens: 700`, asking for strict JSON:
   `{ "pros": ["...", "..."], "cons": ["...", "..."] }` — 2–3 entries each, each a
   single Czech sentence under 90 characters.
4. Validate the JSON before writing. A malformed response skips that school and logs
   it; it never writes a partial or a raw string.
5. Upsert into `school_ai_summary`.

**Prompt constraints to encode literally:**
- Write in Czech, addressing a 15-year-old, informally (tykání).
- Only use the numbers provided. Never invent a fact about the school.
- Never mention teachers, reputation, atmosphere, or anything not in the input.
- A "con" must be a real tradeoff from the data, never a discouragement.
- If the input has too little data for a genuine con, return fewer entries rather
  than padding.

Add `OPENROUTER_PROSCONS_MODEL` to `.env.example` with a comment pointing at this
plan's §1.3.

---

## 6. Verification

Run the dev server (`node server.js` at root with `PORT=5001`, and `npm run dev` in
`frontend/`) and check in the Browser pane:

1. `/porovnani` with 3 schools selected from `/skoly` — table renders, best-value
   highlight lands on the right cell, absent values show an em-dash not a blank.
2. Resize to 390px — the first column holds, school columns scroll horizontally,
   the next column peeks.
3. `/porovnani/matice` — move a weight, ranking reorders; set everything to
   "Nezáleží" and confirm it says so instead of showing a fake ranking; locked
   criteria are not clickable.
4. `/prihlaska` — add 3 schools, reorder by drag AND by the ↑/↓ buttons, confirm the
   order persists across a reload. Try adding a 4th → limit message, no write.
5. Enter 58 points → bands appear; clear the points → bands disappear and cutoffs
   still show. Pick an obor → the cutoff and band change to that obor's number.
6. Write a note, reload, confirm it persisted.
7. Create a share link, open it in a private window (no session) → shows the picks,
   shows notes only when the checkbox was ticked. Revoke it → 404.
8. `window.print()` preview on `/prihlaska` — nav and tabs gone, cards unbroken.
9. `cd frontend && npm run lint` clean.
10. Check the 402 path: an expired account hitting `/prihlaska` gets the paywall,
    but can still `DELETE` its own picks and notes.

**Do not report done without step 7** — the share view is the one route with no auth,
and "it works while I happen to be signed in" is exactly the bug it would hide.

---

## 7. The one decision left for the user (after implementation)

Run this and have the user read the Czech, then set `OPENROUTER_PROSCONS_MODEL`:

```bash
for M in google/gemini-2.5-flash-lite google/gemini-2.5-flash anthropic/claude-haiku-4.5; do
  node scripts/generate-school-proscons.js --dry-run --limit 5 --model "$M"
done
```

Judge on: is the Czech natural, are the claims traceable to the input numbers, and is
any "con" phrased in a way that would make a 15-year-old feel bad. Cheapest model
that passes wins — total spend at 60 schools is small either way, so quality decides.

---

## 8. Out of scope, tracked in UNFORGET.md

- Full share-with-parent link (saved schools + questionnaire results + cross-device
  session) — needs the parent/child account and pricing model settled first.
- Email delivery of the share link — link-copy only for now.
- Dojezd MHD and maturita/VŠ criteria in the matrix — locked until the data exists.
- Personalised (per-student) pros/cons — deliberately not built; see §1.3.
