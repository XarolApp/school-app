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
6. Superseded by part 2 below: the AI now receives the real MHD minutes and the limit (founder request), still never the stop id or name.
7. No separate "Vzdušná čára / MHD" mode switch on the map: commute dimming appears when the
   commute filter is active, the straight-line radius panel stays as it was.
8. School detail "v tvém limitu / o 8 min nad limitem" (plan §4.3) is **not** built — see ideas.

## Tests

```
npm test            # root
# tests 281
# pass 281
# fail 0
```
New: `tests/commute-score.test.cjs` (credit table ±0.02, monotone 0–120 min for every limit,
multiplier values, validation, ordering of the three strictness levels, old-`casti` runs, no
commute text for the AI, paid + far stacking), `tests/commute-copy.test.mjs` (Czech plurals,
zero state, count = filter predicate), additions to `tests/server-boundaries.test.cjs`
(stop-row endpoint, `withCommute`, score moves only with a stop). Changed
`tests/questionnaire.test.cjs` (the select-all-districts test became "removed question ignored").
Part 2 adds `tests/onboarding-commute.test.mjs`, `tests/commute-parity.test.mjs` and four tests in
`tests/commute-score.test.cjs` (listed under part 2). Frontend: `npm run lint` 0 errors (existing warnings only), `npm run build` succeeds.
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
5. Matrix regeneration reminder after the December PID timetable change (no job does it).


---

# Part 2 — onboarding quiz and explanation texts (founder decisions relayed 2026-10-29)

Relayed by the orchestrator session: (1) "change the onboarding quiz as well, if we promise something
untrue, don't promise it"; (2) "for the AI explanation it should say instead of it meets district, it
meets the MHD time". Both built on `plan/mhd-commute`; nothing pushed to `main`.

## What changed

**Onboarding quiz**
- The `districts` question (and its district map, `DistrictMap.jsx` + CSS, deleted) is replaced by a
  `commute` question in the same slot (still 11 questions). It uses the **same control as the
  questionnaire** (`components/CommuteControl.jsx`, extracted from the questionnaire block): stop
  picker (name or "Použít moji polohu"), 1–60 / 60+ slider with the live count in the right voice
  (tykání student / vykání parent), the 3-way strictness (parent wording: "…delší dojíždění nechceme"),
  preview map. Answers stay in sessionStorage as `commuteStop`, `commuteLimit`, `commuteStrict`.
- Browser engine (`frontend/src/lib/matching.js`): the `location` (district membership) component is
  replaced by `commute` (weight 0.2, shifted by the "co je důležitější" answer exactly as before),
  using the **same credit curve and strictness multiplier** as the server. `frontend/src/lib/commuteScore.js`
  mirrors `lib/commuteScore.js`; `tests/commute-parity.test.mjs` checks constants and every
  (limit, minute, strictness) combination are identical. Unknown minutes (no data) drop the component;
  `null` (over 90 min) scores 0.
- `OnboardingFlow.jsx` fetches the stop's row only once a stop **and** a limit are answered and attaches
  `commute_minutes` to the schools used by the live counter, ranking, Reveal and explanations.
- Server save (`lib/onboardingAnswers.js`): accepts `commuteStop` (checked against the matrix; an unknown
  or stale stop is dropped, the rest still saves), `commuteLimit` 1–60, `commuteStrict`; translates them to
  `dojezd_zastavka/limit/prisnost` (limit needs a stop, strictness needs a limit). Old stashes with
  `districts` still translate to `casti`. The onboarding run is scored with the stop (`scoreAnswers`).

**Explanation texts**
- Server AI input (`lib/questionnaire.js` + `lib/matching.js`): the district signal ("leží v Praze N") is
  gone for every run; `dojezd` now emits `dojedeš tam MHD za cca 18 min, tedy v tvém limitu 25 min` as a
  signal only when the matrix has a real value within the limit. Over the limit it is a separate neutral
  `note` (`MHD tam trvá cca 31 min, tedy nad tvým limitem 25 min`), shown to the AI as
  "poznámky (neutrální, ne shoda)" and in the results fallback as "Poznámka: …" — never under
  "Shoda podle". Null or missing minutes produce nothing. The AI receives minutes and limit only; no stop id,
  stop name or coordinates (tests assert this on the request body). The prompt now tells it not to invent,
  round or recompute commute times and to mention an over-limit note neutrally.
- Onboarding `explain` / `tradeoffs` templates use the same facts (below).

## Copy changes (old → new)

| Where | Old | New |
|---|---|---|
| Quiz question title (student) | Do kterých částí Prahy jsi ochotný/á dojíždět? | Odkud do školy pojedeš MHD a jak dlouho smí cesta trvat? |
| … hint (student) | Vyber klidně víc — čím širší okruh, tím víc škol uvidíš. | Vyber zastávku a nastav nejdelší cestu v minutách. Nepovinné — když nevíš, přeskoč. |
| Quiz question title (parent) | Do kterých částí Prahy je dítě ochotné dojíždět? | Odkud bude dítě jezdit do školy MHD a jak dlouho smí cesta trvat? |
| … hint (parent) | Můžete vybrat víc částí. Pokud si nejste jistí, klidně přeskočte. | Vyberte zastávku a nastavte nejdelší cestu v minutách. Nepovinné — pokud si nejste jistí, přeskočte. |
| Reassurance (student) | **Vzdálenost počítáme podle městských částí, ne podle jízdních řádů — minuty bychom si museli vymyslet a to neděláme.** (now false) | Dojezd bereme z ranní špičky podle jízdních řádů PID jako odhad (cca). Jak přísně limit platí, určuješ pod posuvníkem. |
| Reassurance (parent) | Dostupnost vyhodnocujeme podle městských částí, nikoli podle jízdních řádů. Konkrétní minuty bychom museli odhadovat, což neděláme. | Dojezd bereme z ranní špičky podle jízdních řádů PID jako odhad (cca). Jak přísně limit platí, nastavíte pod posuvníkem. |
| Honesty line (one text for both) | Ptáme se na části Prahy, ne na přesnou adresu — nic o tom, kde bydlíš, si neukládáme. | student: Neptáme se na adresu. Zastávku použijeme k výpočtu dojezdu a uložíme ji až s dokončeným dotazníkem k tvému účtu. Časy jsou odhad z jízdních řádů PID, ne záruka. / parent: same with "vašemu účtu" |
| Priority "Aby to bylo blízko" (student) | Dojezd dostane větší váhu než obor. Školy z tvých částí Prahy půjdou nahoru, i když zaměření sedí jen napůl. | Dojezd dostane větší váhu než obor (když u dojezdu nastavíš zastávku a limit). Školy s kratší cestou MHD půjdou nahoru, i když zaměření sedí jen napůl. |
| … (parent) | Dostupnost dostane větší váhu než obor. Školy z vybraných částí Prahy se posunou výše i při částečné shodě zaměření. | Dojezd dostane větší váhu než obor (pokud jste nastavili zastávku a limit). Školy s kratší cestou MHD se posunou výše i při částečné shodě zaměření. |
| Priority "Zaměření školy" (student / parent) | …obor bude rozhodovat víc než adresa… / …obor rozhodne více než poloha. Ve výsledku se proto mohou objevit i vzdálenější školy. | …víc než dojezd… / …víc než dojezd. Ve výsledku se proto mohou objevit i školy s delší cestou. |
| Priority "Obojí" | Zaměření i dostupnost zohledníme společně… | Zaměření i dojezd (když ho nastavíš / pokud jste ho nastavili) zohledníme společně… |
| Practice "Půl na půl" (student / parent) | …rozhodnou spíš zájmy a dojíždění. / …zájmy a dostupnost. | …zájmy a dojezd (pokud ho nastavíš). / …(pokud jste ho nastavili). |
| Study type "Ještě nevím" (student / parent) | …rozhodne to, co tě baví a kam dojedeš. / …rozhodnou zájmy a dostupnost. | …rozhodne to, co tě baví (a dojezd, pokud ho nastavíš). / …zájmy (a dojezd, pokud jste ho nastavili). |
| Calculating step 2 (student / parent) | Porovnávám školy s částmi Prahy, které jsi vybral / Vyhodnocujeme dostupnost vybraných částí Prahy (shown to everyone, even without the question) | With a stop and limit: Porovnávám dojezd MHD z tvé zastávky s tvým limitem / Porovnáváme dojezd MHD z vybrané zastávky s nastaveným limitem. Otherwise: Vážím tvoje odpovědi u každé školy / Vážíme vaše odpovědi u každé školy |
| Stakes intent (parent) | Vyřešit dojíždění (over-promise) | Zjistit, jak dlouho se do škol jezdí MHD |
| Reveal "Shoda podle" (student) | Je v části Prahy, kam jsi ochotný/á jezdit. | Dojedeš tam MHD za cca 20 minut, tedy v tvém limitu 25 minut. |
| … (parent) | Škola leží v části Prahy, kam jste ochotni dojíždět. | Cesta MHD trvá cca 20 minut, tedy v limitu 25 minut, který jste nastavili. |
| Reveal trade-off, over the limit (student) | Je mimo části Prahy, které jsi vybral/a. Ověř si skutečný dojezd. | MHD tam trvá cca 31 minut, tedy nad tvým limitem 25 minut. Ověř si skutečné spojení. |
| … (parent) | Leží mimo části Prahy, které jste označili. Skutečný dojezd je potřeba ověřit. | Cesta MHD trvá cca 31 minut, tedy nad nastaveným limitem 25 minut. Skutečné spojení je potřeba ověřit. |
| Privacy policy, "Odhad cesty MHD" bullet (`Legal.jsx`) | …Souřadnice neodesíláme na náš server; vybranou zastávku ukládáme jen v tomto prohlížeči. (untrue once the stop is saved with the answers) | …Souřadnice ani adresu neodesíláme na náš server. Vybraná zastávka je v tomto prohlížeči a k účtu se uloží jen s dokončeným dotazníkem (viz výše). Jakmile nastavíš limit dojezdu, prohlížeč si pro vybranou zastávku vyžádá časy cest, a označení zastávky (nikdy adresa ani poloha) tak projde technickými přístupovými záznamy našich poskytovatelů hostingu (Vercel, Railway), které uchovávají podle své standardní lhůty. (No retention period is named: none is documented elsewhere in the policy.) |
| Landing tile "Mapa a dojezd" (`Home.jsx`) | Vybereš městské části, kam dojedeš, a vzdálenost se promítne do shody. (false) | Vybereš zastávku a nejdelší cestu MHD v minutách. Dojezd se promítne do shody a školy můžeš podle něj filtrovat. |
| Landing tile "Porovnání vedle sebe" (found while there) | Až čtyři školy v jedné tabulce… (limit is five) | Až pět škol v jedné tabulce… |
| Questionnaire AI prompt example | …dojíždění „Praha 12“… / leží přímo v Praze 12, kam ses chtěl dojíždět | …dojedeš tam MHD za cca 18 min, tedy v tvém limitu 25 min… / dojedeš tam MHD za cca 18 minut, tedy v limitu 25 minut, který sis nastavil |

Checked and left as is (true now): Reveal "a nechceš kvůli škole trávit půl dne na cestě" (echo of the student's own
"blízko" answer, not a product claim); paywall value screens (`Hodnota`, `Cesta`, `Plan`, …) make no commute claim.


## Tests added / output

```
npm test
# tests 281
# pass 281
# fail 0
```
- `tests/onboarding-commute.test.mjs` (13): with only the commute answered the browser engine equals the server's
  `raw_score` for every limit/strictness/minute sampled; the 20-minute worked example; unknown ≠ no, null = 0;
  strictness ordering; `withCommuteMinutes`; explanation and trade-off text (student/parent, singular "1 minutu",
  over limit neutral, null/missing says nothing, no district); quiz definition and copy honesty (no "částí Prahy",
  no "to neděláme"); profile tags never show the stop id; onboarding save validation/translation incl. old `districts`.
- `tests/commute-parity.test.mjs` (2): browser vs server constants and credit/multiplier, 60 limits × 97 minutes × 5 strictness values.
- `tests/commute-score.test.cjs` (+4): signal text with minutes, neutral note over the limit, nothing for null/missing,
  no district sentence, and the **AI request body** (stubbed `fetch`) contains the minutes/limit text and the
  no-inventing instruction but no stop id/name.
- Lint: 0 errors. Build: succeeds.

## Browser verification (Chromium, synthetic API as in part 1)

| Check | 375×812 | 1280×800 |
|---|---|---|
| Quiz walked to the commute question (step 6 of 11), stop → slider 25 → "Do 25 minut se dostaneš do 48 škol." → "Nutnost" | ✔ student, ✔ parent (vykání) | ✔ student |
| Profile panel/strip shows "do 25 min MHD", never the stop id | ✔ | ✔ |
| sessionStorage holds `commuteStop` (id), `commuteLimit` 25, `commuteStrict` nutne | ✔ | ✔ |
| Calculating → Reveal shows "Dojedeš tam MHD za cca 20 minut, tedy v tvém limitu 25 minut." / parent "Cesta MHD trvá cca 20 minut, tedy v limitu 25 minut, který jste nastavili." | ✔ | ✔ |
| Live counter ("Zatím ti sedí 16 škol z 192") reacts to the commute answer | ✔ | ✔ |

Not checked: the account-creation step and the stash → `POST /api/me/onboarding-answers` flush in the browser (needs a
real signup); covered by unit tests only. Dark mode of the onboarding screens. The "Skip" path of the commute question
beyond reading the code (`clear()` resets all three keys). Demo-catalogue mode (the control shows "Dojezd teď nejde
spočítat" when the catalogue is the offline demo, because demo ids are not in the matrix).

## Things you should know

1. **"Stop id only on the device until the save" is true for storage, not for transport.** To count schools and rank
   in the browser the quiz asks `GET /api/commute/stops/:id/schools`, so the stop id is in that request's URL (access
   logs), exactly as in part 1; the request happens only once a stop and a limit are answered. The quiz text therefore
   says "uložíme ji až s dokončeným dotazníkem" (true) and does not claim the stop never leaves the device. **Settled decision, 2026-10-29
   (founder: "go with option 1"): keep this design. The stop id travels in the URL of `GET /api/commute/stops/:id/schools`
   and is covered by the privacy-policy sentence about hosting access logs; there is no full-matrix download. Not to be
   re-raised.**
2. Found, not touched: `OnboardingFlow.jsx` has a misplaced `if (profile?.isCreator …) return <Navigate …>` line inside the
   `betaPreview` branch and `Navigate` is not imported (lint warns; would throw if reached). Leftover `ob-district-map*`
   CSS rules in `onboarding.css` are now unused.
3. `lib/matching.js` (server) still scores `casti` for old and onboarding-translated runs; nothing narrates it.

## Try it on localhost (add to the earlier steps)

11. Sign in with a fresh test account (or clear `sessionStorage`), open `/onboarding/welcome`, pick "Jsem student", answer the
    questions until "Odkud do školy pojedeš MHD…". Pick "Háje", drag to 25, choose "Nutnost". Check the count line, the
    profile panel ("do 25 min MHD") and that the text under the question says "Neptáme se na adresu…".
12. Finish the quiz: the Reveal should list "Dojedeš tam MHD za cca N minut, tedy v tvém limitu 25 minut." for a school
    inside the limit (and, under the trade-offs, "MHD tam trvá cca N minut, tedy nad tvým limitem…" for one outside).
13. Repeat as "Jsem rodič" (all copy in vykání) and once skipping the commute question (Calculating must then say
    "Vážím tvoje odpovědi u každé školy" and no MHD line must appear anywhere).
14. Create the account, confirm the e-mail, sign in: `/dotaznik` → "Moje sady odpovědí" shows the onboarding set; in DevTools
    the request to `/api/me/onboarding-answers` contains `commuteStop` (the id), never coordinates.
15. In `/dotaznik`, open the results of a run with a commute limit and use "Získat vysvětlení" (needs `OPENROUTER_API_KEY`):
    the sentence should name the MHD minutes and the limit, never a district, stop or street.
