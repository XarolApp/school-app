# Plan 021 — 9th-grade-only catalogue, plus the back-button bug (#15)

Status: original design plan 2026-10-10 (Opus 5.5, medium); source implementation through `7bc008d` is present. Independent read-only checks confirm the stored 194/23/58 scope. Full migration, authenticated/browser and factual data acceptance remains open. Released peer record `cb7a550` reports completed base/structure reruns for 56 of 58 and pros/cons for 194; schools 15/94 lacked scraped text and need manual checks. This is a run record, not independent content acceptance. Preserve the founder’s selected model; this historical routing line does not authorize a switch or delegation.

## Founder rules (decided 2026-10-10 — do not re-derive)

**A programme is shown only if a pupil finishing 9th grade can apply to it.** Not a
literal "4 years" rule.

| Cermat `typ_skoly` / `delka_studia` | Visible? | Why |
|---|---|---|
| `Gymnázia 6letá` | hidden | entered after 7th grade |
| `Gymnázia 8letá` | hidden | entered after 5th grade |
| `Konzervatoře` with `delka_studia = 8` | hidden | dance conservatory, after 5th grade |
| `Nástavby` (any length) | hidden | needs a finished výuční list |
| `Konzervatoře` 6-year | visible | entered after 9th grade |
| everything else (4-year SOŠ/gymnázium/lyceum/SOU with maturita, 3-year učební obory, 1–2-year SOU without výuční list, 5-year SOŠ, unknown `typ_skoly`) | visible | open to 9th graders |

- A school with **no visible programme left** is hidden entirely.
- **Nothing is deleted.** Hidden programmes move to `school_programs_hidden`, and hidden
  schools get `schools.hidden_reason = 'not_for_9th_grade'`. Both stay in the database
  for future use. No user-facing endpoint may return or accept them.
- Existing user data (favourites, picks, notes, questionnaire runs) that points at a
  hidden school is **kept in the database but not shown or counted**. Never delete it.

Read-only count on 2026-10-10: **23 schools hidden entirely** (217 → **194** visible) and
**58 schools partially affected**. Section 9 has the full list.

## Why this design (decided, not open)

Programmes are **moved** to a separate table rather than flagged. Every existing query
that embeds `school_programs(*)` (catalogue, detail, ids, picks, matrix, share, scoring
catalogue, pros/cons, extraction, beta admin) then excludes them **with no code change**.
Admission statistics, matching (both engines), comparison and the matrix all derive from
`school_programs`, so they automatically count only 9th-grade programmes. Hidden schools
need explicit filters, but `fetchAllSchools` already has the `merged_into` pattern to copy.

Scoring is always recomputed live from the catalogue (`buildRunResult`, `withMatchScores`,
`getScoringCatalogue`), so **no stored run needs rescoring**. Old runs' stored AI
sentences stay keyed by `school_id`; schools that newly enter a top 10 fall back to signals
(existing behaviour).

## Deployment order (hard requirement)

The server code reads `schools.hidden_reason`; deploying it before the SQL is applied
breaks the whole catalogue. So:
1. Commit and push **only** the SQL migration, `lib/ninthGrade.js`, the scripts and the
   tests (step 1–3 below). Nothing in `server.js` or `frontend/` yet.
2. **Founder applies** `migrations/2026-10-10-ninth-grade-scope.sql` in Supabase and runs
   the verify query.
3. Then commit and push the server and frontend changes (steps 4–7). Railway and Vercel
   redeploy.
4. Then run the data scripts (step 8).

## 1. Shared predicate — new `lib/ninthGrade.js`

```js
// Founder rule 2026-10-10: shown only if a pupil finishing 9th grade can apply.
const HIDDEN_TYPES = new Set(['Gymnázia 6letá', 'Gymnázia 8letá', 'Nástavby']);
function isNinthGradeProgram(row) {
  if (HIDDEN_TYPES.has(row?.typ_skoly)) return false;
  if (row?.typ_skoly === 'Konzervatoře' && Number(row?.delka_studia) === 8) return false;
  return true;
}
module.exports = { isNinthGradeProgram, HIDDEN_TYPES, HIDDEN_REASON: 'not_for_9th_grade' };
```

## 2. SQL — `migrations/2026-10-10-ninth-grade-scope.sql`, mirrored into `supabase-setup.sql`

Re-runnable, one transaction. Mirror into `supabase-setup.sql` right after the
`school_programs` declaration: the table, the column, the function and the
`ninth_grade_program()` predicate. Do **not** put the one-off data move into
`supabase-setup.sql`; it stays in the migration only.

1. `alter table public.schools add column if not exists hidden_reason text;`
2. `create table if not exists public.school_programs_hidden (like public.school_programs including defaults including constraints);`
   then `alter table ... add column if not exists hidden_reason text not null default 'not_for_9th_grade', add column if not exists hidden_at timestamptz not null default now();`
   Enable RLS with no policy. Add the FK `school_id → schools(id) on delete cascade` if
   `like` did not copy it (it does not copy FKs).
   - The `like` copies the identity column as a plain `bigint` default-less `id`. That is
     fine: rows keep their original id.
3. `create or replace function public.ninth_grade_program(p_typ text, p_delka int) returns boolean language sql immutable as $$ select not (coalesce(p_typ,'') in ('Gymnázia 6letá','Gymnázia 8letá','Nástavby') or (p_typ = 'Konzervatoře' and p_delka = 8)) $$;`
   This is the intended rule shared with `lib/ninthGrade.js`. Current regex tests check source spelling only; C52 reproduces nullable SQL/JS disagreement, so they do not enforce semantic parity.
4. Move the rows (atomic):
   ```sql
   with moved as (
     delete from public.school_programs where not public.ninth_grade_program(typ_skoly, delka_studia) returning *
   )
   insert into public.school_programs_hidden select moved.*, 'not_for_9th_grade', now() from moved;
   ```
   List the columns explicitly on both sides if the column order of
   `school_programs_hidden` differs from `school_programs` (check with `\d`).
5. Hide schools with no visible programme that **do** have hidden ones:
   ```sql
   update public.schools s set hidden_reason = 'not_for_9th_grade'
   where s.merged_into is null
     and not exists (select 1 from public.school_programs p where p.school_id = s.id)
     and exists (select 1 from public.school_programs_hidden h where h.school_id = s.id);
   ```
   Also clear it again where a school regained visible programmes:
   `update ... set hidden_reason = null where hidden_reason = 'not_for_9th_grade' and exists (visible programme)`.
6. Recompute `schools.admission_cutoff` and `acceptance_rate` from visible programmes only,
   **newest year per school**, using the same arithmetic as `scripts/import-admission-data.js`:
   - cutoff = `round(avg(cutoff), 1)` over that year's rows with a non-null cutoff;
   - rate = `round(100.0 * sum(prijati) / sum(prihlasky), 1)` over rows with `prihlasky > 0`
     and non-null `prijati`; null when there are none.
   - Write a separate `public.recompute_school_admission(p_school_ids bigint[] default null)`
     function (null = all) and call it at the end of the migration. The import script
     calls it too (step 3). Grant execute to `service_role` only.
7. Verify query, put as a comment at the end and given to the founder:
   ```sql
   select (select count(*) from schools where merged_into is null and hidden_reason is null) as visible,   -- expect 194
          (select count(*) from schools where hidden_reason = 'not_for_9th_grade') as hidden,                -- expect 23
          (select count(*) from school_programs where not ninth_grade_program(typ_skoly, delka_studia)) as leftover; -- expect 0
   ```

Test the migration in a disposable PGlite database before giving it to the founder.
Use the scratchpad harness pattern (`run.mjs` with the `auth`/`storage`/roles stubs) and
seed a fixture: one 8-year-only school, one mixed school, one nástavba-only-loss school,
and one 6-year conservatory. Check the moves, the hide flags, the recomputed cutoff and
rate, and that the migration is idempotent when run twice.

## 3. Scripts and tests (ship in the first push)

- **`scripts/import-admission-data.js`**: split `programRowsToWrite` with
  `isNinthGradeProgram`.
  - Visible rows go to `school_programs` and hidden rows to `school_programs_hidden`,
    both delete-then-insert per (rok, school ids), as the script does today.
  - Drop the per-file `perSchool` cutoff/rate write. After the program writes, call
    `recompute_school_admission(<matched school ids>)` and apply the `hidden_reason`
    set/clear rule from SQL step 5 for those ids. Keep the `redizo` and
    `admission_data_updated_at` updates.
  - Update the header comment.
- **New `scripts/report-ninth-grade-scope.js`** (read-only, `node --env-file=.env`): prints
  three lists: hidden schools (id, name, hidden types), partially affected schools (id,
  name, which hidden types and how many obory hidden), and visible counts. It writes the
  same data to `reports/ninth-grade-scope-2026-10-10.json` (no personal data). The
  founder-facing summary in step 9 comes from this script after the SQL is applied.
- **Tests** (`tests/ninth-grade.test.cjs`):
  - the predicate table above;
  - the SQL `ninth_grade_program` body contains exactly the same three types and the
    `Konzervatoře`/8 rule as `HIDDEN_TYPES`, checked by reading `supabase-setup.sql`;
  - the import split puts a `Gymnázia 8letá` row into the hidden set.

## 4. Server (`server.js`, `lib/betaAdminRoutes.js`) — second push

Add the helper next to `fetchAllSchools`:
`const visibleSchool = (s) => Boolean(s) && !s.merged_into && !s.hidden_reason;`

| Place | Change |
|---|---|
| `fetchAllSchools` (~1297) | add `.is('hidden_reason', null)` next to `.is('merged_into', null)`. This covers the catalogue, the scoring catalogue, beta rankings validation and `/api/questionnaire`. |
| `GET /api/schools?ids=` (~1476) | add `.is('hidden_reason', null)`. |
| `GET /api/schools/:id` (~1499) | after loading: `if (!data \|\| data.hidden_reason) → 404` (same response as not found). If it resolves a `merged_into` successor, apply the same check to the successor. |
| merged-predecessor programmes (~1371) | unchanged (moved programmes are already gone). |
| `betaSchoolNames` (~605) | `.is('hidden_reason', null).is('merged_into', null)`. |
| `GET /api/favorites` (~1530) | drop rows whose joined `schools` row fails `visibleSchool`. |
| `POST /api/favorites` | reject a hidden or unknown school id with 404 `Škola nenalezena.` (one `select id, hidden_reason, merged_into` query). `DELETE` stays allowed (own data). |
| `GET /api/picks` (~1834) | drop picks whose school fails `visibleSchool` from the response. **Do not delete them.** |
| `PUT /api/picks` (~1860) | reject the request with 400 `Škola už není v nabídce.` if any `schoolId` is hidden or unknown. The client sends the full current list, and a stale hidden pick would otherwise be re-saved, so the frontend must drop hidden picks before sending; see step 6. |
| `GET /api/notes` | return only notes whose school is visible: query visible ids once with `fetchAllSchools('id')`, or filter by joined school. |
| share/snapshot readers (~2193, ~2395, ~2439) | filter or 404 hidden schools the same way. Sharing is off, but the code must still be correct. |
| `buildRunResult` / questionnaire / explain endpoint | no change (the catalogue is already filtered). In `POST /api/questionnaire/.../explain` (on-demand reason), return 404 if the school is not in the catalogue. Check that it already does this; if not, add it. |
| scoring catalogue cache | no change; it expires on its own TTL, and the redeploy restarts it anyway. |

## 5. Pros/cons and extraction scripts — second push

- **`scripts/generate-school-proscons.js`**: select only `merged_into is null` and
  `hidden_reason is null`. Medians are therefore over visible schools. The fingerprint
  changes for every affected school (programmes changed) and probably for all schools (if
  the medians are fingerprinted), so a normal run regenerates them. Do **not** pass
  `--force`.
- **`scripts/extract-school-details.js`**:
  - Base mode: skip hidden and merged schools when selecting.
  - Extend `SYSTEM_PROMPT` with this rule (insert verbatim before "Pro každé pole…"):
    > TŘETÍ PRAVIDLO: Aplikace je jen pro žáky 9. třídy. Pokud web popisuje i víceleté
    > gymnázium (šestileté/osmileté), nástavbové studium nebo taneční konzervatoř pro žáky
    > po 5. třídě, informace platné jen pro tyto programy úplně ignoruj (školné, přijímačky,
    > třídy, kroužky, úspěšnost). Vyplňuj jen to, co platí pro obory uvedené v "Obory
    > školy" (ty jsou všechny pro žáky po 9. třídě), nebo pro celou školu.
  - Structure mode: the same skip.
  - In `STRUCTURE_SYSTEM_PROMPT`, add one line:
    `'Ignorujte údaje platné jen pro víceleté gymnázium, nástavbu nebo konzervatoř pro žáky po 5. třídě.'`
  - The "Obory školy" list is built from `school_programs`, so after the move it already
    contains only visible obory.

## 6. Frontend — second push

- `frontend/src/config/facts.js`: `SCHOOL_COUNT = 194`. It is only a fallback; the live
  count comes from `useSchoolCount()`.
- Scraped `schools.programs` blob: it can still list "Gymnázium (osmileté)". Add
  `programNames(school)` to `frontend/src/lib/schoolPrograms.js`: unique `obor_nazev` of
  the newest year in `school_programs`, falling back to the blob only when there are no
  rows. Use it in:
  - `schoolFeatures.js` `programList` (replace the blob split when `school_programs` has rows);
  - `SavedSchools.jsx:58`;
  - `Search.jsx:217` `allProgs`.
- Comparison selection (`searchPrefs.js`) and the decision matrix: `?ids=` can now return
  fewer schools than requested. Make sure missing ids are **pruned** from the stored
  selection and nothing renders an empty column or crashes. Check `Porovnani.jsx` and
  `Matice.jsx`.
- `usePicks` / `/prihlaska`: the server no longer returns hidden picks. Verify the next
  `PUT` (built from the returned list) does not include them; `toggle` already refetches
  first.
- Questionnaire run history: stored `matches` are not rendered for old runs (`buildRunResult`
  rescans the catalogue), so no change.
- Demo data `demoSchools.js:23` mentions "Gymnázium (osmileté)". Change it to
  "Gymnázium všeobecné (čtyřleté)".

## 7. Bug #15 — back button from school detail (second push)

Tester report: from the questionnaire results, they opened a school, pressed "Zpět" at the
top and landed on the list of all schools instead of the results.

`SchoolDetail.jsx` uses `navigate(-1)` only when `window.history.state?.idx > 0`. Make the
return target explicit, so it does not depend on history:
- Every link into a detail page that should return somewhere specific passes
  `state={{ from: location.pathname + location.search, fromLabel }}`.
  - `Questionnaire.jsx:210`: `fromLabel: 'výsledky dotazníku'`.
  - Also `Search.jsx` result links (`'výpis škol'`), `SchoolMap.jsx:419` (`'mapa'`),
    `SavedSchools`, `Porovnani`/`Matice` school links, and the onboarding result if it
    links to detail.
- `SchoolDetail.jsx` back link:
  - if `location.state?.from` is present, render `← Zpět na {fromLabel}`; clicking runs
    `navigate(-1)` when `cameFromApp`, otherwise `navigate(from)`;
  - if not, keep today's behaviour.
- **First reproduce** in the browser preview, signed in with a test session: `/dotaznik` →
  open a school → click "Zpět", and record what actually happens. If it is the
  questionnaire page resetting (e.g. "celé pořadí" collapsing, or a redirect away from
  `/dotaznik`), fix that cause too. Note it in the commit message.

## 8. Data run (after both pushes are deployed)

**Historical execution sequence; updated 11 October:** the released peer record reports steps 3–5 already run for the 56 affected schools with scraped text and all 194 pros/cons. Do not rerun these paid commands merely to complete this plan. Inspect current outputs and run/cost evidence; check schools 15 and 94 manually. Any additional write or paid run needs its reviewed scope and authorization.

Run from the repo root with the local `.env`. All paid calls go through OpenRouter flex.
1. `node --env-file=.env scripts/report-ninth-grade-scope.js`. Confirm 194 visible, 23
   hidden and 58 partial, or explain any difference.
2. `node scripts/extract-school-details.js --dry-run --school-id <3 partial ids, e.g. 91,184,117>`.
   Review the output: no 8-year or nástavba-only facts.
3. `node scripts/extract-school-details.js --school-id <all 58 partial ids>` (base fields).
4. `node scripts/extract-school-details.js --structure --force --school-id <same 58 ids>`.
5. `node scripts/generate-school-proscons.js --dry-run --limit 3`. Review the Czech, then
   `node scripts/generate-school-proscons.js` (no `--force`).
6. Spot-check in the browser: one fully hidden school id gives 404 on `/skoly/:id`;
   Gymnázium Jana Keplera (120) shows only its 4-year obory and recomputed statistics; the
   landing and onboarding count shows 194.

The cost is roughly 116 extraction calls plus up to 194 pros/cons calls on the Luna flex
route, the same order as earlier full runs. Report the actual cost from `ai_usage_log`.

## 9. Affected schools (read-only, 2026-10-10)

**Hidden entirely (23):**
- 8-year gymnázium only: 64 Gymnázium a Hudební škola hl. m. Prahy, 187 Německá škola v Praze, 47 Gymnázium Jiřího Gutha-Jarkovského, 69 Malostranské gymnázium, 95 Gymnázium ALTIS, 80 Arcibiskupské gymnázium, 114 Gymnázium Nad Kavalírkou, 127 Trojské gymnázium, 136 Gymnázium J. Seiferta, 109 Gymnázium Jaroslava Heyrovského, 113 Mensa gymnázium, 139 Gymnázium Chodovická, 148 Soukromé gymnázium ARCUS, 150 Křesťanské gymnázium, 186 Lauderova škola, 212 Gymnázium Přírodní škola.
- 6-year only: 231 Gymnázium Na Pražačce, 42 The English College in Prague, 111 Rakouské gymnázium.
- 6- and 8-year: 230 Gymnázium Budějovická, 130 Gymnázium Ústavní.
- Dance conservatories (8-year): 70 Taneční konzervatoř hl. m. Prahy, 123 Taneční centrum Praha – konzervatoř.

**Partially affected (58):**
- 6/8-year obory removed (29): 52, 91, 184, 68, 229, 97, 48, 94, 77, 82, 87, 107, 108, 132, 137, 100, 120, 152, 155, 140, 144, 191, 92, 96, 122, 194, 201, 205 (gymnázia), plus 117 (8-year dance conservatory branch).
- Nástavby removed (29): 141, 147, 34, 11, 134, 193, 54, 98, 20, 30, 43, 21, 15, 83, 58, 12, 63, 40, 124, 133, 145, 154, 169, 102, 14, 116, 146, 180, 135.

The implementer regenerates the exact lists with `scripts/report-ninth-grade-scope.js`
after the SQL and shows them to the founder.

## 10. Docs (second push)

- `CLAUDE.md` and `AGENTS.md` (together):
  - Add a "9th-grade scope" rule under Supabase Schema: the hidden table, the
    `hidden_reason` column and the predicate.
  - Update the "217 shown" counts to 194 visible (223 raw, 6 merged, 23 hidden).
- `UNFORGET.md`: remove nothing; add "9th-grade scope applied" with the live verify result.
- Also update `README.md`, `PROJECT-OVERVIEW.md` and `DEPLOY.md` where they say 217.

## Verification checklist

- `npm test` at the root passes, plus `npm run lint` and `npm run build` in
  `frontend/`. Vitest is not configured in the current frontend package; do not
  install or download a new runner merely to execute this historical checklist.
- The PGlite migration test passes, including the second run.
- Live verify query: 194 / 23 / 0.
- Browser checks:
  - `/skoly` count 194;
  - a hidden id gives 404;
  - a mixed gymnázium shows 4-year obory only, and its "míst" totals equal the sum of its
    4-year obory;
  - comparison with a stale hidden id in the selection still renders;
  - the questionnaire runs and shows no hidden school;
  - bug #15 is fixed on `/dotaznik` → detail → Zpět.
- `report-ninth-grade-scope.js` output is shown to the founder.

## Independent review amendment — 10 October

- The source migration explicitly declares a new identity primary key and copies listed programme-content columns; it does not preserve the old row IDs. Section 2’s `LIKE`/original-ID examples are historical design sketches, not commands to apply. Use the reviewed actual migration and canonical schema. No disposable PostgreSQL/PGlite migration receipt has been established by this review.
- GET-only, ordered/paginated checks confirm 223 raw schools, 6 merged, 23 hidden, 194 visible, 58 partially affected; programme rows are 2,047 visible-table / 327 hidden-table. No row in either table conflicts with the JS eligibility predicate. This verifies stored scope only, not official completeness/eligibility or current SQL bodies/grants.
- **C52:** make nullable SQL/JS rules agree and test actual PostgreSQL behaviour rather than regex text. Current data has no unknown type/conservatory-length rows; future imports still need the boundary fixed.
- **C53/B03:** an unknown school ID passes PUT validation, current choices are deleted, and a subsequent modelled FK failure returns 500 with those choices lost. Validate positive known/visible IDs and programme ownership, then replace atomically.
- **C54/S02/S03:** an import that changes a programme’s classification leaves its old row in the opposite table. Stage and replace both destination sets for the complete touched school/year scope atomically, including empty sets; preserve unrelated schools/years and fail without publishing partial data.
- **C55:** cached on-demand explanations return before a visibility check, so an old explanation for a now-hidden school can still be served. Apply the current visibility contract before cache/new generation and exercise real registered-handler paths.
- **Founder decision in this review:** when a hidden school becomes visible again, its old application choice stays archived until the user explicitly restores it. Current visibility alone would return it automatically. Define persistent archive state and safe order/capacity restoration with C53; retain the data.
- Review all 58 affected schools’ cached prose/structured facts and stored AI explanations against the eligible programmes. This review made no paid calls; the later released peer record reports 56 base/structure reruns and 194 pros/cons already completed. Schools 15/94 retained old extraction because scraped text was absent. Verify those outputs and manual exceptions first; approve scope/source/budget only for additional work.

Evidence and ordered acceptance: `reports/deployment-review-2026-10-07/ninth-grade-boundaries-2026-10-10.json`, `ninth-grade-live-2026-10-10.json`, and `HANDOFF-PLAN.md`. The boundary probe runs actual JS handlers/writer with synthetic services and evaluates the extracted boolean expression in SQLite; it is explicitly not PostgreSQL migration acceptance or a hosted write.
