# MHD commute in the questionnaire, map and /skoly — build report, 2026-10-29

Branch `plan/mhd-commute` (not merged, **not pushed to `main`**). Implements
`reports/mhd-commute-plan-2026-10-29.md` with the founder's decisions 1–6 applied.
Tester-visible scoring and `/skoly` change → waits for your localhost test.

## What changed

**Scoring and questionnaire (server)**
- `lib/commuteScore.js` (new): `commuteCredit` (smooth decay, grace `G = clamp(1.5·T, 20, 40)`,
  exponent 2.25, `null` = 0), `commuteMultiplier` (10-minute smoothstep ramp, `P` = 0 / 0.25 / 0.5),
  `isCommuteLimit` (whole minute 1–60). The 20-minute worked example from the plan is a test,
  generalised to every limit 1–60.
- `lib/matching.js`: new `dojezd` dimension (weight 20; ×1.8 for "místo", ×0.5 for "nabídka"),
  strictness multiplier applied after `PAID_PENALTY` (they stack). A school with no matrix column
  (`commute_minutes === undefined`) sits out; matrix `null` (>90 min) scores 0. Signal text
  `dojezd v tvém limitu` carries no minutes. Header comment rewritten (the "no commute dimension"
  rationale no longer holds).
- `lib/questionnaire.js`: `casti` removed from `QUESTIONS`. Added `dojezd_zastavka` (type `stop`),
  `dojezd_limit` (number 1–60), `dojezd_prisnost` (`preference` / `dulezite` / `nutne`), all
  `privateToServer`. `showIf: { field, present: true }`. `validateAnswers(raw, { isCommuteStop })`
  rejects an unknown stop and drops a limit without a stop / strictness without a limit.
- `server.js`: `commuteStopIndex`, `withCommute()`, `scoreAnswers()` used by `withMatchScores`,
  run reads, the explain endpoint, health-consent re-scoring and the POST. New
  **`GET /api/commute/stops/:stopId/schools`** → `{ feedDate, stopId, minutes: { [schoolId]: min|null } }`,
  same access as the other commute reads (optionalAuth, 503 without matrix, 404 unknown stop,
  hidden/merged schools filtered through a 5-min cached id set).

**Frontend**
- New: `StopPicker.jsx` (extracted from `CommuteTime.jsx`, school detail behaves as before),
  `CommuteLimitControl.jsx` (draggable 1–60 / "60+" slider with ticks and the live count line),
  `CommuteQuestion.jsx` (stop + slider + 3-way strictness + preview map + attribution),
  `CommutePreviewMap.jsx`, `commute.css`, `lib/useCommute.js`, helpers in `lib/commute.js`
  (Czech copy and counts), `api.js: fetchStopSchools`.
- `Questionnaire.jsx`: draws the commute block, ignores answers to removed questions when counting
  "N z M odpovědí", shows the stop name in the answer history.
- `/skoly` (`Search.jsx`, `SearchFilters.jsx`): district facet replaced by "Dojezd MHD"
  (stop + slider), chip, empty-state "Prodloužit limit na N minut → M škol", sort by "Dojezd",
  map keeps schools beyond the limit as faint pins with a legend and "cca N min MHD" on the card.
- Docs: `Legal.jsx` (one sentence), `CLAUDE.md` + `AGENTS.md` (same paragraph), `UNFORGET.md`
  (two superseded notes + a note on the removed `/porovnani` commute row).

Copy: student (tykání) "Do 25 minut se dostaneš do 42 škol"; parent (vykání) "Do 25 minut je
dostupných 42 škol". Plurals: parent 1 škola / 2–4 školy / 5+ škol; student "do 1 školy / do 3 škol".
Zero: "Do 15 minut se odsud MHD nedostaneš do žádné školy." + "S limitem 35 minut by jich bylo 6."
(parent: "Do 15 minut odsud MHD nedojedete do žádné školy. S limitem 35 minut by to bylo 6 škol.").
Role comes from the beta role or the onboarding role in `localStorage`.

## Decisions and judgement calls (read these)

1. **`casti` is removed from the question list but not from the scorer.** Old saved runs and runs
   translated from the onboarding quiz (`lib/onboardingAnswers.js` writes `casti`) keep scoring
   exactly as before; a new submission simply drops the key. Deleting the dimension would have
   silently changed onboarding-run scores, which decision 5 says not to touch. If you want it gone
   everywhere, delete the `casti` entry in `matching.js` and the `WEIGHT_RULES` factors — one small
   follow-up.
2. **`/skoly` district filter**: removed. A tab restored from `sessionStorage` that still holds
   `districts` drops it. Saved filter presets (`searchPrefs.js`) have no UI, so nothing breaks;
   the map's radius search is untouched; "praha 6" typed in the search box still matches district.
3. **The stop id is in a GET URL** (`/api/commute/stops/:id/schools`), so it can appear in
   Railway/Vercel access logs, which the plan's matrix download would have avoided. Mitigation:
   the row is requested only when something needs it (a limit is set, or the "Dojezd" sort is
   chosen) — a stop remembered from a school page is never sent on its own. The stop is also
   inside the saved run, as decided. Add one line to the privacy policy if you want logs covered:
   the existing sentence says "uložíme jen označení zastávky".
4. **Minutes shown = minutes scored** (no +3). One known difference: school detail adds the walk
   to the stop when the stop came from geolocation (the walk is never stored), so detail can read
   a few minutes more than the score used. The stop-to-school value itself is identical.
5. **Strictness default is "Důležité"** (×0.75 at the far end), preselected as soon as a limit is set.
6. The `dojezd v tvém limitu` signal reaches the AI provider (no minutes, no stop). The plan said
   "keep the AI prompt free of commute entirely" and also asked for this signal; I followed the
   signal. Say if you want it hidden.
7. No separate "Vzdušná čára / MHD" mode switch on the map: commute dimming appears when the
   commute filter is active, the straight-line radius panel stays as it was.
8. School detail "v tvém limitu / o 8 min nad limitem" (plan §4.3) is **not** built — see ideas.

## Tests

```
npm test            # root
# tests 262
# pass 262
# fail 0
```
New: `tests/commute-score.test.cjs` (credit table ±0.02, monotone 0–120 min for every limit,
multiplier values, validation, ordering of the three strictness levels, old-`casti` runs, no
commute text for the AI, paid + far stacking), `tests/commute-copy.test.mjs` (Czech plurals,
zero state, count = filter predicate), additions to `tests/server-boundaries.test.cjs`
(stop-row endpoint, `withCommute`, score moves only with a stop). Changed
`tests/questionnaire.test.cjs` (the select-all-districts test became "removed question ignored").
Frontend: `npm run lint` 0 errors (existing warnings only), `npm run build` succeeds.
`npm install` was needed in this container (root and `frontend/`); lockfiles untouched.

## Browser verification (Playwright/Chromium, 375×812 and 1280×800, light + dark)

Run against Vite dev (`VITE_API_BASE_URL` pointing at a synthetic API, see "Not checked") with an
injected Supabase session. Screens: questionnaire form, results, history; `/skoly` filter, chip, list,
sort, map, empty state; school detail commute card.

| Check | 375×812 | 1280×800 | Dark |
|---|---|---|---|
| Questionnaire: pick stop, slider 1 / 15 / 20 / 25 / 60, strictness, preview map, submit, results | ✔ | ✔ | ✔ (form + slider + map, 375) |
| Saved answers hold only `dojezd_zastavka`/`dojezd_limit`/`dojezd_prisnost` (request payload read) | ✔ | ✔ | – |
| `/skoly`: filter + slider, chip, list count, empty state with "Prodloužit limit na 5 minut" | ✔ | ✔ | – |
| `/skoly` map: 48 full pins / 144 faint pins at 25 min from Háje, legend "Do 25 min MHD ze zastávky Háje · 48 škol" | ✔ | ✔ | – |
| `/skoly` sort "Dojezd": order 168 (2 min), 9 (7), 31 (8) equals the matrix | – | ✔ | – |
| School detail: no stop / pick / "Změnit" prefilled / geolocation denied / geolocation OK (Háje, 2 min walk, 9 min total) | ✔ | ✔ | – |

- **Counts agree**: questionnaire chip, slider line, `/skoly` list header and map legend all read
  **48 schools for Háje at 25 min** (and 23 at 20, 11 at 15, 191 at 60; the 192nd school is
  unreachable from there).
- No request sent the remembered stop on its own: with `commute.stopId` in localStorage, loading
  `/skoly` and opening the questionnaire form made no `/api/commute/stops/:id/schools` request.
- Console: no page errors; the only console errors were blocked OpenStreetMap tile requests
  (sandbox network).
- **Not run at 375**: the "Dojezd" sort (mobile uses a different sort control; the code path is
  shared with desktop). **Not run in dark**: `/skoly` and the detail page (only the questionnaire block).
  Light-mode layout of the commute block at 375: picker, selected stop, slider, strictness, map all
  fit with no horizontal scroll.

## SQL / env

**None.** No migration, no env change. The stop id lives in `questionnaire_runs.answers`
(jsonb). The matrix file stays committed; `GET /api/commute/stops` returning 503 on Railway
would mean the file is missing there (not checked — no deploy access from this session).

## Try it on localhost (MacBook, `PORT=5001`)

1. `git fetch && git checkout plan/mhd-commute`
2. Terminal 1: `npm install && PORT=5001 node server.js` (`.env` as today; `VITE_API_BASE_URL=http://localhost:5001` in `frontend/.env`).
3. Terminal 2: `cd frontend && npm install && npm run dev`, open `http://localhost:5173`, sign in with a test account.
4. `curl -s localhost:5001/api/commute/stops | head -c 200` → JSON (503 means the matrix did not load).
5. **/dotaznik → Vyplnit dotazník**, scroll to "Praktické věci". Choose a stop (try "Háje" or "Anděl", or
   "Použít moji polohu"). Drag the slider: the count line must change and follow the Czech plurals;
   at 1 min it must show the calm zero message with a suggestion. Pick "Nutnost" with 25 min,
   fill the required questions, submit.
6. In DevTools → Network, open the `POST /api/questionnaire` payload: the only commute values are
   `dojezd_zastavka` (an id like `pid-286-haje`), `dojezd_limit`, `dojezd_prisnost`. No address, no coordinates.
7. On the results page schools beyond the limit should rank clearly lower than at "Spíš přání"
   (redo the form with the same answers and compare the order). Open "Moje sady odpovědí →
   Zobrazit odpovědi": the stop shows by name, and an old run (with districts) still opens.
8. **/skoly**: "Dojezd MHD" filter → pick the same stop, set 25 min. The list count must equal
   the count under the slider and the questionnaire count for the same stop/limit. Try the "Dojezd"
   sort (shortest first), the map (faint pins beyond the limit, legend), and limit 1 for the empty state.
9. Open any school detail: the commute card behaves as before (stop name, geolocation, "Změnit").
10. If it all works, tell me and I merge to `main`.

## Not checked

- `server.js` itself was **not run** (no Supabase here). Its new routes are covered by the vm
  harness in `tests/server-boundaries.test.cjs`; the browser checks used a synthetic API
  (scratch file outside the repo) that calls the real `lib/matching.js`, `lib/questionnaire.js`,
  `lib/commuteScore.js` and the real committed matrix, with **fabricated school names and
  positions** (placed at the stop nearest to each school's column). So: no real catalogue, no real
  Supabase auth (a synthetic session was injected), no AI sentences.
- OpenStreetMap tiles are blocked in this sandbox, so maps rendered grey; pin/dot logic only.
- Geolocation was simulated (Playwright permission + coordinates), not a real phone.
- Real iOS/Android Safari touch behaviour of the slider (drag with a thumb) is untested; the control
  is a native `<input type=range>`, with `touch-action: pan-y`.
- Railway/Vercel deployment, the production `/api/commute/stops` response, and the privacy-policy
  wording by a lawyer.

## Extra ideas (not built)

1. Commute row back in `/porovnani` and the decision matrix (plan idea 3), and in `/ulozene`
   / application picks (idea 4).
2. School detail annotation "v tvém limitu" / "o 8 min nad limitem" (plan §4.3) now that the limit is saved.
3. Drop the `casti` dimension for good (see judgement call 1) once onboarding runs no longer need it.
4. Hide the `dojezd v tvém limitu` signal from the AI prompt if you prefer the strict reading.
5. A matrix endpoint (stop-major, base64) if you would rather keep the stop out of URLs entirely.
6. Matrix regeneration reminder after the December PID timetable change (no job does it).
