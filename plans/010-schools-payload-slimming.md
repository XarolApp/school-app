# Plan 010 — Slim the `/api/schools` list payload + defeat the 1000-row cap

## Context

`UNFORGET.md` tracks this as "Backend pagination": `GET /api/schools` has no
pagination, and Supabase's PostgREST silently truncates at 1000 rows — a silent
data-loss bug once the school count crosses that, which it will when the product
expands past Prague.

Measuring the endpoint before planning turned up a second, **already-live**
problem that matters more today:

| Measurement | Value |
|---|---|
| Schools / program rows | 223 / 2372 |
| Current `/api/schools` response | **843 KB** |
| Same response minus `school_programs` + `school_ai_summary` | 108 KB |

So the nested program rows are **~84% of the payload**, and that 843 KB is
downloaded by six surfaces — `Search.jsx`, the onboarding quiz, `/porovnani`,
`/porovnani/matice`, and `SimilarSchools` on *every* school detail page view.
The primary audience is Czech teenagers on phones, on mobile data.

Adding `?limit=&offset=` literally would break all six callers: every one of
them assumes it receives the complete set (Search does 13 filters, sorting and
per-option facet counts client-side; the onboarding quiz scores the whole
catalogue in the browser).

**The chosen approach** (user decision, 2026-09-17): keep the "you get every
school" contract, but stop shipping data the list pages never read, and page
through the 1000-row cap internally. Measured result of the exact shape below:
**843 KB → 215 KB, a 75% cut**, with *no rewrite of `Search.jsx`*.

### What the list pages actually read from `school_programs`

Verified field-by-field across every consumer:

- `Search.jsx` `summarizePrograms()` — `maturitni`, `jpz_povinna`, `typ_skoly`,
  `jazyk_studia`, `kkov`, `zrizovatel`, `kapacita`
- `SimilarSchools.jsx` — `maturitni`
- `comparisonRows.js` / `decisionMatrix.js` — `maturitni`, `jazyk_studia`,
  `typ_skoly`, plus `groupProgramsByObor()` which needs **full** rows
- Onboarding matcher (`lib/schoolFeatures.js`) — reads only `school.programs`
  (the free-text column). Touches the nested join **not at all**.
- Server scorer (`lib/matching.js` line 381) — likewise only `school.programs`,
  so **`withMatchScores` survives this change untouched**. This is the explicit
  warning in CLAUDE.md; it is satisfied, not worked around.

Nothing in the list path reads `rok`, `cutoff`, `prihlasky`, `prijati`,
`obor_nazev` or `forma_vzdelavani`. Those belong to the detail page's 3-year
Cermat trend (`lib/schoolPrograms.js`) and to the `/porovnani` risk analysis —
both of which only ever need a handful of schools at a time.

### A live bug this fixes

`Search.jsx:158` sums `kapacita` over the raw rows. Because the same obor
appears once per imported year, that sum counts capacity 2–3× over.
**211 of 223 schools are affected**, and the number feeds a real filter
("Aspoň N míst", `filters.kapacitaMin`). Collapsing the years server-side makes
it correct. This is an intentional, user-visible behaviour change — see
Verification.

---

## Server changes — `server.js`

All of this sits in the schools section (currently lines ~575–640).

### 1. Paged full-table read

Add near `withMatchScores`:

```js
// PostgREST caps a response at 1000 rows and truncates SILENTLY, so any
// full-table read has to page explicitly. `name` is not unique (the database
// still holds known duplicate rows), so `id` is the tiebreaker — without it
// paging can drop or repeat a row at a page boundary.
const SUPABASE_PAGE_SIZE = 1000;

async function fetchAllSchools(select) {
  const rows = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('schools')
      .select(select)
      .order('name')
      .order('id')
      .range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
}
```

### 2. Per-obor slimming

```js
const LIST_PROGRAM_FIELDS = [
  'maturitni', 'jpz_povinna', 'typ_skoly', 'jazyk_studia',
  'kkov', 'zrizovatel', 'kapacita',
];

/**
 * One entry per distinct obor, carrying only the fields the list pages read.
 * Collapsing the years matters beyond payload size: summing `kapacita` over
 * the raw rows counts the same obor once per imported year, which overstated
 * capacity for 211 of 223 schools.
 *
 * The obor key matches frontend/src/lib/schoolPrograms.js so both sides agree
 * on what "one obor" means.
 */
function slimProgramsForList(programs) {
  const byObor = new Map();
  for (const row of programs ?? []) {
    const key = [row.kkov, row.obor_nazev, row.typ_skoly, row.delka_studia, row.jazyk_studia].join('|');
    const prev = byObor.get(key);
    if (!prev || (row.rok ?? 0) > (prev.rok ?? 0)) byObor.set(key, row);
  }
  return [...byObor.values()].map((row) =>
    Object.fromEntries(LIST_PROGRAM_FIELDS.map((f) => [f, row[f]]))
  );
}
```

Keep the key **`school_programs`**. Every consumer's `.some(p => p.maturitni)`
and `.map(p => p.typ_skoly)` then keeps working with zero frontend edits — the
array is simply shorter and carries fewer columns.

### 3. Rewrite `GET /api/schools`

```js
const LIST_SELECT = '*, school_programs(*)';
const FULL_SELECT = '*, school_programs(*), school_ai_summary(*)';

app.get('/api/schools', optionalAuth, async (req, res) => {
  // ?ids=1,2,3 — the comparison surfaces need full per-obor rows (the risk
  // analysis reads per-obor cutoffs) and the cached pros/cons, but only for
  // the handful of schools a student actually selected.
  if (req.query.ids !== undefined) {
    const ids = String(req.query.ids).split(',').map(Number);
    if (!ids.length || ids.length > 50 || ids.some((n) => !Number.isInteger(n))) {
      return res.status(400).json({ error: 'Neplatný parametr ids.' });
    }
    const { data, error } = await supabase.from('schools').select(FULL_SELECT).in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(await withMatchScores(req.user?.id, data));
  }

  let rows;
  try {
    rows = await fetchAllSchools(LIST_SELECT);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const slim = rows.map((s) => ({ ...s, school_programs: slimProgramsForList(s.school_programs) }));
  res.json(await withMatchScores(req.user?.id, slim));
});
```

`GET /api/schools/:id` stays exactly as it is — it already uses the full select.

### 4. One-line guard in `withFlatAiSummary`

The list no longer selects `school_ai_summary`, and as written the helper would
stamp `school_ai_summary: null` onto all 223 rows. Make it leave absent keys
alone:

```js
function withFlatAiSummary(schools) {
  return schools.map((school) => {
    if (!('school_ai_summary' in school)) return school;
    return { ...school, school_ai_summary: Array.isArray(school.school_ai_summary)
      ? school.school_ai_summary[0] ?? null
      : school.school_ai_summary ?? null };
  });
}
```

---

## Frontend changes

### 1. `frontend/src/api.js`

Add beside `fetchSchools` (line ~96):

```js
/**
 * Full rows — every per-obor program row and the cached pros/cons — for a
 * short list of schools. `fetchSchools()` returns a slimmed list shape that
 * deliberately omits both; anything doing per-obor or pros/cons work has to
 * come through here.
 */
export function fetchSchoolsByIds(ids) {
  if (!ids.length) return Promise.resolve([]);
  return request(`/api/schools?ids=${ids.join(',')}`);
}
```

Also extend `fetchSchools`'s comment to say it returns the slim list shape.

### 2. `frontend/src/pages/Porovnani.jsx`

Currently fetches all 223 schools to use 2–4 of them. Swap to the ids call.
`selection` changes as the user removes schools, so key the effect on it:

- import `fetchSchoolsByIds` instead of `fetchSchools`
- `const selectionKey = selection.join(',');`
- in the effect: bail to `setAllSchools([])` when `selection.length === 0`,
  otherwise `fetchSchoolsByIds(selection)`
- effect deps become `[selectionKey]`
- **keep** the existing `byId` → `selection.map(...)` memo, so the columns stay
  in the user's chosen order (the server does not preserve it)
- leave `fetchPicks()` where it is

### 3. `frontend/src/pages/Matice.jsx`

Same swap. `selection` here is read once (`useState(() => getCompareSelection())`
with no setter), so the effect keeps its current deps; just replace
`fetchSchools()` with `fetchSchoolsByIds(selection)` and keep the `byId` memo.

### 4. Deliberately unchanged

`Search.jsx`, `SimilarSchools.jsx`, `OnboardingFlow.jsx`, `schoolFeatures.js`,
`matching.js` (both copies), `schoolPrograms.js`, `comparisonRows.js`,
`decisionMatrix.js`. If executing this requires editing any of them, **stop and
flag it** — it means the slim shape is missing a field the plan did not find.

### 5. Optional, decide separately

`comparisonRows.js:127` reads `s.zrizovatel`, but `schools` has no such column
(verified against the live table) — the "Školné" row therefore always renders
"—". Pre-existing, unrelated to this change. Now that `/porovnani` receives full
program rows it would be a one-liner (`(s.school_programs ?? [])[0]?.zrizovatel`).
**Do not fold this in silently** — either do it as its own clearly-labelled
commit or log it in `UNFORGET.md`.

---

## Verification

**Backend, before and after** (`PORT=5001 node server.js` from repo root):

```bash
curl -s localhost:5001/api/schools | wc -c          # expect ~220000, was ~863000
curl -s localhost:5001/api/schools | jq 'length'    # expect 223
curl -s "localhost:5001/api/schools?ids=1,2" | jq '.[0].school_programs[0] | keys'
# expect the FULL column set incl. rok/cutoff/obor_nazev
curl -s "localhost:5001/api/schools?ids=abc" | jq   # expect 400
```

**Exercise the paging loop** — it cannot trigger at 223 rows. Temporarily set
`SUPABASE_PAGE_SIZE = 50`, confirm `jq 'length'` still returns 223 with no
duplicate ids (`jq '[.[].id] | length, (unique | length)'` must print 223
twice), then set it back to 1000.

**Browser** (`npm run dev` in `frontend/`, per CLAUDE.md verify yourself, don't
ask the user to):

1. `/skoly` — all 13 filters, the per-option counts, the district facet, search,
   sorting and the map view behave as before.
2. `/skoly` "Aspoň N míst" — **this is the intended behaviour change.** Capacity
   numbers drop to their real values (they were 2–3× inflated for 211 schools),
   so a given threshold now matches fewer schools. Confirm the numbers look
   plausible against a school's detail page, not that they are unchanged.
3. Signed in — match percentages still render on `/skoly` (guards
   `withMatchScores`).
4. `/porovnani` with 2–3 schools selected — comparison table, "Počet oborů",
   pros/cons, and removing a school all still work.
5. `/porovnani/matice` — ranking and weights unchanged.
6. A school detail page — "Podobné školy" still populates; the per-obor
   breakdown and 3-year trend are untouched.
7. The onboarding quiz through to the reveal screen — real schools, not the
   `(ukázka)` demo fallback.
8. Network tab: the `/api/schools` response on `/skoly` is ~215 KB, and
   `/porovnani` now requests `?ids=` instead of the full list.

**Lint/build:** `npm run lint` and `npx vite build` in `frontend/`, both clean.

---

## Bookkeeping after it lands

Update `UNFORGET.md`:

- **"Backend pagination"** — the silent-truncation half is fixed by
  `fetchAllSchools`. Rewrite the entry to cover only what is left: true
  `?limit=/offset=` with server-side filtering, sorting and facet counting,
  needed at national scale (~1300 CZ secondary schools) and deliberately not
  built now because it would rewrite `Search.jsx`'s core and move onboarding
  scoring. Keep the `withMatchScores` warning attached to it.
- **"Backend payload size — school_programs nesting"** — resolved; move to
  Resolved with the 843 KB → 215 KB measurement.
- Note the capacity fix (211/223 schools) so the changed filter results are not
  mistaken for a regression later.

`CLAUDE.md` needs one line under the `/api/schools*` trap note: the list
endpoint returns a slimmed per-obor shape, and full program rows come from
`/api/schools/:id` or `?ids=`.
