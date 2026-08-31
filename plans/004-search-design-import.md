# Plan 004 — Implement the "School Search" design on `/skoly`

> **On approval, save this verbatim to `plans/004-search-design-import.md`** (the repo's
> `plans/` dir already holds 001–003) and add a row to `plans/README.md`.
> **Written against commit `5a8381c`.** If `Search.jsx` or `schoolSearch.js` has changed
> since, re-read them before starting — the excerpts below may have drifted.

**Executor:** Sonnet 5. This plan assumes zero context from the session that produced it.

---

## 1. Context — why this change

`frontend/src/pages/Search.jsx` is 92 lines and near-skeletal: a bare `<input>`, an
unstyled `<select>`, and a `<ul>` of three-line cards. Meanwhile the onboarding flow is
1,882 lines of carefully-built UI. The gap between "browse schools" and "take the quiz"
currently reads as two different products.

A Claude Design wireframe now exists for this page, built on a synced ŠkolaMatch design
system. **Implement it in full, exactly as designed** — every filter, sort, stat, and
interaction working.

**The design files** live in the repo root at `# ŠkolaMatch School Search Wireframe/`
(note the leading `#` and the spaces — quote the path in every shell command):

- `School Search.dc.html` — **the design to implement** (570 lines, markup + a `DCLogic`
  class holding all interaction logic)
- `_ds/kola-match-system-design-new-90cf52f9-.../` — token CSS + `readme.md` + `_ds_bundle.js`
- `School Search Wireframe.dc.html` and `Landing Page Wireframe.dc.html` are **byte-identical
  duplicates of each other** (same md5) and are *not* this design — ignore both.

---

## 2. The data gap — synthesize it, isolate it, track it

The design is built on a data model that does not exist yet. Its own footer says so:

> `Ukázková data: … hranice přijetí z výsledků jednotné přijímací zkoušky 2025, dojezd z jízdních dob PID.`

`GET /api/schools` returns **only**: `id`, `created_at`, `name`, `location` (free-text
address), `programs` (**one free-text blob**, comma- *or* semicolon-separated), `contact`,
`website`, `latitude`/`longitude` (null until geocoded), `district` (server-computed
"Praha N", null for ungeocoded), and `match_score` (**only** when a signed-in user has a
completed questionnaire run).

**Decision (user, explicit, 2026-08-30): ship the design as designed, with synthesized
stand-in data, and replace it with real data before public release.** The app is
pre-release and not reachable by real students, so this is a deliberate, tracked tradeoff
— **not** a licence to leave it unmarked. The UNFORGET entry in §9 is mandatory, not optional.

| Design field | Backing data | Implementation |
|---|---|---|
| `row.name` | ✅ `school.name` | live |
| `row.progs` | ✅ `splitPrograms(school.programs)` | live |
| `row.metRatio` | ✅ derivable | live |
| district in `row.meta` | ✅ `school.district` | live; **synthesize when null** (ungeocoded rows) |
| `row.cut` — *hranice 2025* | ❌ | **synthesized** |
| `row.acc` — *přijato z přihlášených* | ❌ | **synthesized** |
| `row.min` — *dojezd MHD* | ❌ | **synthesized** |
| `hasTalentExam` filter | ❌ | **synthesized** |
| `schoolType` (`veřejná`) | ❌ | **synthesized** |
| `row.diff` — differentiator sentence | ❌ | **derive honestly** — see §2b |

Every filter and sort in the design therefore works: the commute slider filters, the
talent-exam checkbox filters, "Nejkratší dojezd" and "Nejnižší hranice přijetí" both sort.

### 2a. The synthesis contract — follow this exactly

Put **all** synthesis in one clearly-marked block at the top of `Search.jsx`, so deleting it
later is a single edit and nothing synthetic hides elsewhere in the file.

```js
/**
 * ⚠️ SYNTHETIC STAND-IN DATA — NOT REAL, REMOVE BEFORE PUBLIC RELEASE
 *
 * The Search design needs fields the `schools` table does not have yet. Rather
 * than ship a half-built page, these are generated deterministically from the
 * school id so the whole UI is functional and reviewable.
 *
 * These numbers are INVENTED. They are attached to REAL Prague school names.
 * Shipping them to real 9th-graders would mean a student could choose a school
 * on a fabricated admission cut-off. Tracked in UNFORGET.md → "Search page ships
 * synthesized stand-in data".
 *
 * Replace each field with a real column, then delete this block:
 *   admissionCutoff  jednotná přijímací zkouška score   (35.0–70.0)
 *   acceptanceRate   % přijatých z přihlášených          (19–82)
 *   commuteMinutes   dojezd MHD                          (16–46) — also needs a user home address
 *   hasTalentExam    boolean
 *   schoolType       veřejná / soukromá / církevní
 */
const SYNTHETIC = true;
```

Rules for the generator:

- **Deterministic** — seed from `school.id` (a small integer hash), never `Math.random()`.
  Values must be stable across reloads, or filters appear to flicker and sorts look broken.
- Handle **both id types**: real ids are `bigint` numbers, demo ids are strings
  (`'demo-1'`). Hash `String(school.id)`.
- Use the design's own ranges (above) so the UI looks as designed.
- Keep every synthetic field on a **single derived object** (e.g. `synth(school)`), not
  spread through the render.
- **Mark it in the UI once, honestly.** The design already has a footnote slot — reuse it:
  replace the design's footnote with wording that says the admission/commute figures are
  placeholder data, not real. One quiet line; do not decorate every row.

### 2b. `differentiator` — derive, don't invent

The design's `row.diff` is hand-written editorial prose (*"Vlastní laboratoře pro robotiku;
třetí ročník má povinnou praxi ve firmě."*). Synthesizing fake editorial *claims* about real
named schools is a different order of fabrication than a number in a labelled placeholder
cell — it reads as researched fact.

Instead, **derive a true sentence from real data**: use `deriveFeatures(school)` from
`lib/schoolFeatures.js` (returns `focus[]`, `type`, `hasMaturita`, `language`, `practice`,
`breadth`, each with a `*Known` flag) and compose from what is actually known — e.g. focus
areas plus program breadth. If nothing is known, render nothing; the line is a single
optional paragraph and the layout holds without it.

### 2c. Keep these — they are the design's real value

1. **Facet counts** — every filter option shows how many results it would yield
2. **Blame sentence** on empty state — names the most restrictive filter and the gain from dropping it
3. **Ranked relax options** — single-filter relaxations sorted by gain, primary button on the best
4. **Near misses** — schools failing *exactly one* criterion, with which one
5. **Sort options with stated tradeoffs** (`"nebere ohled na dojezd"`)
6. **Removable active-filter chips** + "Zrušit všechny filtry"
7. **`3 / 4 splněných kritérií` instead of a fake percentage** — matches the project's
   existing match-band honesty rule from onboarding
8. **Czech pluralization** (`škola` / `školy` / `škol`) — the design has a working `plural()`
9. **Selection + compare sticky bottom bar**

---

## 3. Scope — hard boundaries

**IN SCOPE:**
- `frontend/src/pages/Search.jsx` (rewrite)
- `frontend/src/pages/search.css` (**new file**)
- `UNFORGET.md` (**append one entry** — §9; tracking file, not code)

**OUT OF SCOPE — do not edit, for any reason:**
`Layout.jsx` · `App.jsx` · `App.css` · `auth.css` · `index.css` · `index.html` ·
`design/tokens.js` · `design/tokens.css` · `onboarding.css` · `FavoriteButton.jsx` ·
`api.js` · `lib/schoolSearch.js` · `lib/schoolFeatures.js` · `CLAUDE.md` · any other page.

If a change appears to require touching any of the above: **STOP and report back.**

---

## 4. The token bridge — the main technical problem

The design system and the app use **different token vocabularies for the same palette**.
Values agree (terracotta `#AD4F2A`, moss `#4F7143`); names do not.

| Design system | App (`design/tokens.css`) |
|---|---|
| `--primary` / `--primary-strong` / `--primary-subtle` | `--acc` / *(none)* / `--acc-soft` |
| `--surface` / `--surface-card` / `--surface-input` | `--bg` / `--surface` / `--surface2` |
| `--on-surface` / `--text-body` / `--text-muted` / `--text-faint` | `--ink` / `--ink2` / `--ink3` |
| `--border` / `--border-strong` | `--line` / `--line2` |
| `--tertiary` (moss) | `--ok` |
| `--error` | `--danger` |
| `--radius-card` 20px / `--radius-button` 12px / `--radius-chip` 12px | `--r-card` **18px** / `--r-button` **14px** / `--r-chip` **10px** |
| `--space-xs…xxxl`, `--gutter`, `--content-max` | ❌ **none — app has no spacing tokens in CSS** |
| `--fs-*`, `--lh-*`, `--fw-*` | ❌ **none — type sizes live in JS only** |
| `--dur-state`, `--ease-out` | ❌ **none** |
| `--font-serif-display: Fraunces` / `--font-sans: Public Sans` | `--heading: Newsreader` / `--sans: Hanken Grotesk` |

**Approach: a scoped alias block at the top of `search.css`.** Do *not* import the DS token
files — they would leak globally and collide with `tokens.css`, breaking the scope boundary.

```css
/* search.css — every DS token name is aliased to an app token, scoped to this page only.
   Nothing here escapes .school-search, so no other page is affected. */
.school-search {
  --primary: var(--acc);
  --primary-strong: var(--acc-ink);
  --primary-subtle: var(--acc-soft);
  --surface: var(--bg);
  --surface-card: var(--surface2);
  --on-surface: var(--ink);
  --text-body: var(--ink2);
  --text-muted: var(--ink2);
  --text-faint: var(--ink3);
  --border: var(--line);
  --border-strong: var(--line2);
  --tertiary: var(--ok);
  --error: var(--danger);

  /* App has no CSS tokens for these — defined page-locally on purpose.
     Adding them to tokens.js would be a global change and is out of scope. */
  --space-xs: 4px;  --space-sm: 8px;  --space-md: 16px;
  --space-lg: 24px; --space-xl: 32px; --space-xxl: 48px;
  --dur-state: 150ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
@media (prefers-reduced-motion: reduce) {
  .school-search { --dur-state: 0ms; }
}
```

**Radii:** use the app's `--r-card` / `--r-button` / `--r-chip`. The 2px differences are not
worth a global token change.

**Fonts:** use the app's `--heading` and `--sans`. The design's Fraunces/Public Sans are
**not loaded** — `index.html` loads Newsreader + Hanken Grotesk, and adding font links is
out of scope. Re-express the design's `.sm-*` typography classes locally with the app's font
variables; do not copy `typography.css` in.

**Width:** the design targets `--content-max: 1280px` with 64px margins. The app's
`.app-content` hard-caps at **960px** (`App.css:32-39`). Build for 960px — the
`288px sidebar + 48px gap + 1fr` grid compresses fine. **Do not widen `.app-content`**;
that's a Layout change affecting every page. Flag as a follow-up.

---

## 5. Reuse — do not reinvent any of this

**`lib/schoolSearch.js`** — five exports built for exactly this UI and **currently unused**:
- `collectFacet(schools, valuesOf, compare)` → `{value, label, count}[]` — **your facet-count engine**
- `splitPrograms(text)` — comma-split respecting `(...)` nesting
- `baseProgram(program)` — strips bracket qualifiers, MŠMT codes (`18-20-M/01`), `;`-tails
- `compareDistricts(a, b)` — numeric, so Praha 2 sorts before Praha 10
- `compareByCount(a, b)` — count desc, then Czech `localeCompare`

Already used by the current page: `buildIndex`, `prepareQuery`, `scoreSchool`, `districtOf`.

**`lib/schoolFeatures.js`** — `deriveFeatures(school)` → `{focus[], focusKnown, type,
hasMaturita, language, practice, district, breadth, programList}`. `FOCUS_CATEGORIES` gives
10 `{id, label, keywords}` entries with Czech labels — **use these for "Obor a zaměření"**
rather than the design's hardcoded 5.

**`components/FavoriteButton.jsx`** — props `{schoolId, isFavorite, onChange, className}`.
Its docblock states the contract: it must be a **sibling** of the card's `<Link>`, never
nested inside it, and the parent owns a `Set` of favourited ids so one page = one
`fetchFavorites()` call. Gate on `isSignedIn && hasAccess` from `useAuth()`.

**`lucide-react`** is installed and unused. Named imports only — never the barrel import.

**Reference implementation:** `schoool-app-laptop-progress/frontend/src/pages/Search.jsx` is
a 479-line fully-built Search with URL-driven filters, pagination, skeletons, and a Czech
plural helper. **Read it for structure** — but its CSS targets an older forest/teal token set
that no longer exists, so any port is a translation, not a copy.

---

## 6. Bugs to fix while in here

1. **Empty query returns zero results.** `prepareQuery('')` returns a *truthy* object
   (`{text:'', tokens:[]}`), so the ternary at `Search.jsx:22-43` —
   `score = prepared ? scoreSchool(entry, prepared) : 1` — **always** takes the scoring
   branch. With no tokens every school scores 0 and `.filter(row => row.score > 0)` drops
   everything. **Verify in the browser first** — if `/skoly` renders an empty list on load
   today, this is why. Guard with `const hasQuery = prepared.tokens.length > 0`.
2. **District dropdown sorts as plain strings** → "Praha 10" before "Praha 2". Use `compareDistricts`.
3. **Invalid HTML** — the empty-state `<p>` is rendered *inside* the `<ul>` (`Search.jsx:85`).
4. `.page` / `.page-search` are applied but defined nowhere. Replace with real classes.
5. **`FavoriteButton` active state is dead** — the component writes `is-active`
   (`FavoriteButton.jsx:71`) but `auth.css:531` styles `.favorite-star.is-favorite`. Both
   files are out of scope, so **style `.school-search .favorite-star.is-active` in
   `search.css`** rather than editing either.

---

## 7. Implementation steps

**Step 0 — Verify the baseline.** Dev server should be running on :5173 (if not:
`cd frontend && npm run dev`). Open `/skoly`, note whether the list renders on load, check
the console. This is your before-state for bug #1.

**Step 1 — Read the design.** `sed -n '1,570p' "./# ŠkolaMatch School Search Wireframe/School Search.dc.html"`.
One desktop branch (`sc-if isDesktop`), one mobile branch (`sc-if isMobile`); the `DCLogic`
class at the bottom holds `crit()`, `list()`, `sorted()`, and `renderVals()` which computes
facet counts, chips, `relaxOptions`, `blame`, and `nearMisses`. **Port this logic** — it is
the spec, and it already handles the tricky parts correctly.

**Step 2 — Write `frontend/src/pages/search.css`.** Start with the scoped alias block from
§4. Namespace every class (`.school-search`, `.ss-sidebar`, `.ss-row`, …). No colour or
radius literals — standing CLAUDE.md rule. Re-express `.sm-headline-*` / `.sm-body-*` /
`.sm-data-*` / `.sm-label-caps` locally using `--heading` / `--sans`.

**Step 3 — Rewrite `Search.jsx`.** Add the §2a synthesis block first. Then the full design
structure: sticky sidebar (search input, focus facet, commute slider, district chips, talent
checkbox) + results column (count headline, active chips, sort row, results list, load-more,
footnote) + sticky compare bar. Wire `collectFacet` for counts. Fix bugs 1–4.

**Step 4 — Empty state.** Blame sentence, ranked relax options, near-misses. Highest-value
part of the design; don't skip it.

**Step 5 — Favourites.** One `fetchFavorites()` on mount into a `Set`, `FavoriteButton` as a
sibling of the `<Link>`, gated on `isSignedIn && hasAccess`. Non-fatal `.catch(() => {})`.
Map the design's "Uložit / Uloženo" text button onto this.

**Step 6 — Mobile.** The design's mobile branch is a 390px card layout. Implement as
responsive CSS in `search.css`, not a separate component tree.

**Step 7 — Append the UNFORGET entry** (§9). **Step 8 — Verify** (§8).

---

## 8. Done criteria — machine-checkable

From `frontend/`:
- `npm run lint` → exits 0, no new warnings
- `npm run build` → succeeds
- From repo root, `git status --short` → shows **exactly three** paths:
  `frontend/src/pages/Search.jsx`, `frontend/src/pages/search.css`, `UNFORGET.md`.
  **Any fourth file means scope was violated — revert it.**

In the browser at `:5173/skoly`:
- list renders **on load with an empty query** (regression test for bug #1)
- `gympl`, `zdravka`, `prumka` return results (alias map); `gymnazium` matches `Gymnázium`
- district chips ordered Praha 2 → Praha 10 (bug #2)
- facet counts change as filters are applied
- **every filter narrows the result set** — focus, district, commute slider, talent checkbox
- **every sort reorders** — criteria, commute, cut-off
- synthetic values are **stable across a page reload** (determinism check)
- impossible filter combination → blame sentence + relax options; clicking the primary relax
  option actually widens the result set
- card click navigates to `/skoly/:id`
- favourite star fills when toggled (needs a signed-in account with access)
- the placeholder-data footnote is visible
- console clean; no horizontal scroll at 375px or 1280px

---

## 9. Required UNFORGET.md entry

Append this to `UNFORGET.md`, matching the existing entry format (see the file's other
sections — `**Found:** / **Urgency:** / **Risk of fixing now:** / **Risk of NOT fixing:** /
**Effort:** / **Release/context:**, then prose):

```markdown
## Search page ships synthesized stand-in data
- **Found:** 2026-08-30, Claude Design import of `School Search.dc.html`
- **Urgency:** high — blocks public release
- **Risk of fixing now:** none technically; needs real data sources, not code
- **Risk of NOT fixing:** a student could pick a school based on an invented
  admission cut-off. The numbers are fabricated but attached to real Prague
  school names, which is what makes them dangerous rather than merely wrong.
- **Effort:** large — each field needs a column plus a scraper or geocoding pass
- **Release/context:** **hard blocker for public launch**

`frontend/src/pages/Search.jsx` implements the full Search design, but the
`schools` table has no column for several fields the design shows. They are
generated deterministically from `school.id` in a single block at the top of the
file marked `⚠️ SYNTHETIC STAND-IN DATA`. Delete that block once real columns exist.

Fields needing real data:
- `admissionCutoff` — jednotná přijímací zkouška score ("hranice 2025")
- `acceptanceRate` — % přijatých z přihlášených
- `commuteMinutes` — dojezd MHD; needs school coords **and** a user home address
- `hasTalentExam` — boolean
- `schoolType` — veřejná / soukromá / církevní

`differentiator` is deliberately NOT synthesized — it is derived from real
`deriveFeatures()` output, because inventing editorial claims about named schools
reads as researched fact in a way a number in a labelled cell does not.

User decision (2026-08-30): ship as designed for now, fix before public release.
```

---

## 10. Maintenance notes & follow-ups (report, don't implement)

- **`--content-max` 1280px vs `.app-content` 960px** — widening touches every page.
- **Font mismatch** — DS specifies Fraunces + Public Sans; app loads Newsreader + Hanken
  Grotesk. Resolve before more screens are designed.
- **`FavoriteButton` `is-active` / `is-favorite` mismatch** — patched page-locally here.
- **Demo mode** — `Search` calls `fetchSchools()` (throws, no fallback).
  `fetchSchoolsForMatching()` gives `{schools, isDemo, error}` with a demo fallback, but
  **demo rows have no `district`**, so the district facet would depend on synthesis there.

---

## 11. Escape hatches — STOP and report if

- `/skoly` already renders correctly with an empty query → bug #1 is not real; re-read
  `schoolSearch.js` before "fixing" it.
- Implementing a design element requires editing any file in the §3 out-of-scope list.
- Synthetic values change between reloads → the seed is not deterministic; fix before
  continuing, because every count and sort depends on stability.
- You are about to synthesize `differentiator` prose → stop; §2b says derive it from real
  features or omit it.
