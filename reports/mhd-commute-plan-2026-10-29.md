# MHD commute time in the questionnaire, map and /skoly — plan, 2026-10-29

Planning stage only. No code, migrations or tests were changed. Numbers in this report
were computed from the committed matrix (`lib/data/commute-matrix.json`) with
throwaway scripts. They are not stored anywhere.

**Bottom line.** The data you asked about already exists and it is better than the
district plan in `UNFORGET.md`. It is a stop-level matrix on `main`, built by plan 023.
It covers every visible school. The scoring you sketched works with one smooth formula.
Three parts of the brief need correcting:

1. **The "is it a hard rule?" question plus a follow-up is the wrong control.** Use one
   3-way question.
2. **A hard cliff exactly at the chosen time would be misleading.** The estimates are off
   by up to 10 minutes and they lean optimistic.
3. **Short limits empty the list.** At 15 or 20 minutes most students get almost no
   schools, so the "no suitable school" fallback is required, not a nice-to-have.

The real blocking decision is privacy. Match scores are recomputed on the server on
every catalogue request (`withMatchScores`), so the student's origin stop has to be
stored with their questionnaire run. A district is too coarse to replace it (see §1.4).

---

## 1. Data findings

### 1.1 Where it is

The data is on `main` and on every other remote branch. I ran `git fetch --all` and
searched all four remotes. `plan/mhd-commute` was created from `main`.

| File | What it is |
|---|---|
| `lib/data/commute-matrix.json` (967 KB, 304 KB gzipped) | The matrix |
| `scripts/build-commute-matrix.js` | Own RAPTOR over the PID GTFS feed (offline) |
| `lib/commuteRouting.js`, `lib/commuteWalk.js` | Routing and walking constants |
| `server.js:37-50, 1581-1602` | Loads the matrix at boot. `GET /api/commute/stops`, `GET /api/schools/:id/commute` |
| `frontend/src/lib/commute.js` | Mirrored walk helper and nearest-stop search |
| `frontend/src/components/schoolDetail/CommuteTime.jsx` | Stop picker and geolocation UI on school detail |
| `tests/commute.test.cjs` | Routing and endpoint tests |
| `plans/023-mhd-commute-times.md` | The plan, status "implemented and accepted 2026-10-21" |
| `reports/commute-spot-check-2026-10.md` | IDOS check |
| `docs/sources/pid-gtfs-commute.md` | Licence and privacy notes |

No Supabase table or migration exists for it. That was a deliberate choice in plan 023.

**The founder's Supabase check finding zero matching tables (2026-10-29) is expected and
consistent with this.** The data was never meant to live in the database. It is the
committed file above, loaded into server memory at boot (`server.js:37-50`). A separate
"data acquisition" comparison (Google Routes, OpenTripPlanner, Golemio) is therefore not
needed. Plan 023 already chose PID GTFS with its own routing (founder decision
2026-10-16), and it passed the IDOS check on 2026-10-21. To confirm the deployed backend
has the matrix loaded, run
`curl -s https://<backend>/api/commute/stops | head -c 200`.
A 503 response means the file is missing on Railway.

### 1.2 Shape

```
{ generatedAt, feedDate: "2026-10-18", serviceDate: "2026-10-27",
  stops: [{ id: "pid-876-albertov", name, lat, lon }],   // 1,484 stop groups
  schools: { "<schoolId>": [minutes | null, ...] } }       // 192 columns, aligned to stops
```

- **Granularity is per stop group** (platforms grouped by PID node), not per district and
  not per address. The origin is "your stop". Walking from home to the stop is added only
  in the school-detail UI when geolocation is used.
- **Time assumption.** Departure times are 06:30–07:30 every 10 minutes (`DEPARTURES`,
  `scripts/build-commute-matrix.js:35`). The value is the median of 7 runs, including
  initial wait. It allows up to 3 transfers, 400 m transfer walks and 1 km walk from the
  last stop to the school.
- **It is not "arrive by 08:00".** Nothing in the matrix knows when lessons start.
- **Cap.** `null` means more than 90 minutes or unreachable. It does not mean "unknown".
- **Coverage.** 192 of 192 visible schools have a column, out of 223 raw rows (31 are
  merged or hidden). 525 of 284,928 cells are null (0.2%). The cell distribution is
  p10 21 min, p50 37 min, p90 57 min.
- **Accuracy (IDOS, 11 pairs).** The median error is 3 minutes and the maximum is
  10 minutes. **Our value was lower in 10 of 11 pairs**, so the matrix leans optimistic.
- **Licence.** PID open data, CC BY 4.0, with attribution in the UI. We can cache and
  serve it freely. The only obligations are attribution and saying it is our own
  calculation. There is no API, no key and no ToS caching limit.
- **Freshness.** It is one service date (Tuesday 27 October 2026). It needs regenerating
  after PID timetable changes (big change in December), a school import or a coordinate
  fix. No job does this automatically.

### 1.3 Stale documents that contradict this

I am only reporting these. Fixing them is step S10.

- `UNFORGET.md:1266` ("requires a provider, licence and accuracy decision") and `:1692`
  (the district × school Google plan) are both superseded by plan 023.
- `UNFORGET.md:153` says commute was removed from `/porovnani` "until coverage is real".
  Coverage is now real.
- `lib/matching.js:44-52` says "deliberately no commute-time dimension… Do not
  reintroduce a routing call here." The rationale was "no API key, no table, no privacy
  promise". A static lookup keeps the first two true. **The third is exactly the
  decision in §1.4.** The comment must be rewritten, not ignored.
- `frontend/src/pages/onboarding/quizQuestions.js:320-325`: the onboarding reassurance
  says "minuty bychom si museli vymyslet a to neděláme". That stays true for onboarding
  unless onboarding gets the feature too (question Q5).

### 1.4 Granularity versus privacy (minors' home location)

I grouped the stops and measured how much the commute to the same school varies
*inside* one group. The spread below is the median over all (group, school) pairs.

| Origin stored as | Groups | Spread inside a group, p10–p90 (median / p90 of pairs) |
|---|---|---|
| District (správní obvod) | 22 | **14 / 21 min** |
| 3 km grid cell | 65 | 10 / 17 min |
| 1.5 km grid cell | 214 | 6 / 11 min |
| 1 km grid cell | 399 | 4 / 9 min |
| Stop group (native) | 1,484 | 0, plus the matrix error (median 3, max 10) |

**A district cannot carry a 20-minute rule with a decay that changes every few minutes.**
A 14-minute spread is the size of the whole tolerance. Address-level precision is not
possible either: the matrix starts at a stop, and a free-text address would need a
geocoder (plan 023 deferred it). The address therefore stays in the browser in every
option below.

Options for what the server stores in `questionnaire_runs.answers`:

- **A: stop-group id (recommended).** The browser maps the address or geolocation to the
  nearest stop and only the id leaves the device. This is the "area" in your brief, and
  it is the finest area the data supports. It is less sensitive than the health answer
  (`postizeni`) the same row already stores. Erasure and RLS already cover the row. It
  must be `privateToServer` (never sent to the AI provider).
- **B: 1.5 km cell id.** The script precomputes a cell × school median matrix. This is
  about 7× more anonymous and costs roughly ±6 minutes of extra error, which sits on top
  of the matrix's own optimism. School detail would then show one value from the exact
  stop while the score used the cell value, so the two can disagree visibly.
- **C: store nothing and score in the browser.** This does not work with the current
  architecture: `withMatchScores` recomputes the percentage on the server for search,
  detail, `/porovnani` and the matrix.

Option A also needs a one-line privacy-policy addition ("zvolená zastávka se uloží
k odpovědím"). Commute signals sent to the AI must not contain minutes (§2.4).

### 1.5 The "kraje" question you asked about does not exist

V1 is Prague-only. The location inputs that do exist, and what they feed into:

| Input | Where | Feeds into |
|---|---|---|
| `casti` — "Do kterých částí Prahy preferuješ dojíždět", up to 10 of the 22 districts, with a map | `lib/questionnaire.js:140-179` | `casti` dimension in `lib/matching.js:536-556`, weight 20, graded by district hops `DISTRICT_CREDIT = [1, .65, .35, .2]`. The weight is ×1.8 when `priorita_nabidka_misto = misto` and ×0.5 when `= nabidka` (`WEIGHT_RULES`). The result goes into `match_score` everywhere via `withMatchScores` |
| `districts` in the onboarding quiz | `frontend/src/pages/onboarding/quizQuestions.js:314` | Browser-only `location` dimension in `frontend/src/lib/matching.js:144`. It is binary, weight 0.2, shifted by `priority`, and feeds Reveal |
| District facet on /skoly | `Search.jsx:302, 566, 665-713` | Filter only, no scoring |
| Radius on the /skoly map | `SchoolMap.jsx:95-160, 288-332` | Straight-line filter of the pins. Home position is kept in memory only and geocoded with public Nominatim. The UI already says "Vzdušná čára, ne skutečná trasa MHD" |

---

## 2. What must change, by layer

### 2.1 Questionnaire (`lib/questionnaire.js`)

Add three questions to the "Praktické věci" section, directly after `casti`:

| id | type | Shown when | Notes |
|---|---|---|---|
| `dojezd_zastavka` | new type `stop` | always (optional) | The value is a stop-group id from the matrix. `privateToServer: true`. Pre-filled from `localStorage['commute.stopId']` when the student already picked one on a school page |
| `dojezd_limit` | `single`: `20`, `30`, `40`, `50`, `60` | `dojezd_zastavka` answered | Skipping it means no commute scoring, even with a stop. **No 15 option:** the median origin has only 3 schools within 15 minutes |
| `dojezd_prisnost` | `single`, 3 options (see §3.4) | `dojezd_limit` answered | Default "Raději ne déle" if skipped |

Other changes in this file:

- `showIf` needs a `present: true` form, because `equals` cannot express "answered".
  This is a small extension in `validateAnswers` and in the frontend renderer.
- `validateAnswers` checks a `stop` value against an injected set of valid stop ids. Keep
  `lib/questionnaire.js` free of the 1 MB matrix and pass the validator in from
  `server.js`. An unknown id gets the same handling as other invalid answers.
- `describeAnswers` already skips `privateToServer` questions. Also skip `dojezd_limit`
  and `dojezd_prisnost`; those are harmless, but keep the AI prompt free of commute
  entirely.

### 2.2 Scoring (`lib/matching.js`)

- **New dimension `dojezd`, weight 20.** `score()` returns `null` when there is no limit
  or no stop, or when `school.commute_minutes === undefined` (no column, so unknown).
  Otherwise it returns `commuteCredit(minutes, limit)` (§3.1). A matrix `null` (over
  90 minutes) scores 0, because that is known-far, not unknown.
- **Overlap with `casti`.** Both say "where". When `dojezd` applies, multiply `casti` by
  0.5 inside `effectiveWeights`. This is a special case, because `WEIGHT_RULES` is keyed
  on answer values. The district answer still expresses "where I'd like to be", for
  example near training, but stops double-counting the commute.
- Extend `WEIGHT_RULES.priorita_nabidka_misto` with `misto: { dojezd: 1.8 }` and
  `nabidka: { dojezd: 0.5 }`. This keeps "where vs what" meaning the same thing for both
  location dimensions.
- **Penalty multiplier** after `PAID_PENALTY` and before `disabilityBand`, following the
  same "a weighted dimension can be outweighed" precedent: `raw *= commuteMultiplier(...)`
  (§3.2).
- **No routing in this module.** `server.js` attaches `commute_minutes` to each school
  (like `withDistricts` attaches `district`), so `scoreSchools` stays pure and synchronous.
- Rewrite the header comment at `:44-52` to describe the lookup and privacy choice.
- Signals: `dojezd` emits `"dojezd v tvém limitu"` with **no minutes**. A list of minutes
  per top-10 school would let anyone triangulate the origin.

Pure helpers go in a new `lib/commuteScore.js`, so tests can target them and the frontend
can mirror them.

### 2.3 API (`server.js`)

- At boot, build `commuteStopIndex = Map(stopId → i)` next to `commuteMatrix`.
- Add `withCommute(schools, stopId)`, which sets `school.commute_minutes = column?.[i]`.
  It leaves the field `undefined` for a school with no column, and for every school when
  the matrix or stop is missing.
- Call it wherever `scoreSchools` runs: `withMatchScores` (`:1538`), the questionnaire
  POST (`:2775`), run reads (`:2699`) and onboarding-answers (`:1271`).
- New endpoint `GET /api/commute/matrix` returns the whole matrix, stop-major and compact:
  `{feedDate, schoolIds, stops, rows: base64 Uint8, 255 = null}`. It is about 285 KB raw
  and less after gzip. Set `Cache-Control: public, max-age=86400` and an ETag of
  `feedDate`. The browser then answers "which schools are within X minutes of my stop"
  without sending the stop to the server, for the map, the /skoly filter, the picker
  counts and comparison. The questionnaire save is the only place the stop id reaches
  the server.
- Gating follows whatever `/api/schools` gets (UNFORGET "Paid vs free gating"). Today
  that is `optionalAuth`, same as the existing commute endpoints.

### 2.4 Database

**No migration.** The answers live in the existing `questionnaire_runs.answers` jsonb and
the matrix stays a committed file. Option B from §1.4 would also need no migration (a
second generated file).

### 2.5 Frontend

| File | Change |
|---|---|
| `frontend/src/api.js` | `fetchCommuteMatrix()` |
| `frontend/src/lib/commute.js` | Decode the matrix, `minutesFrom(stopId)` → `Map(schoolId → minutes)`, mirrored `commuteCredit` |
| new `frontend/src/components/StopPicker.jsx` | Extract the combobox and "Použít moji polohu" from `CommuteTime.jsx`, so both use one picker |
| `frontend/src/pages/Questionnaire.jsx:941-990` | Render type `stop`, limit chips with live counts, the 3-way control and the preview map |
| `frontend/src/components/SchoolMap.jsx` | "Dojezd MHD" mode next to the straight-line radius (§4.2) |
| `frontend/src/pages/Search.jsx` | Commute facet, commute sort, relaxation hint |
| `frontend/src/pages/Legal.jsx` | One line about the stored stop |

---

## 3. Scoring formula, penalty and worked examples

### 3.1 Decay (preference credit)

```
t ≤ T                     credit = 1
t > T                     credit = max(0, 1 − (t − T) / G) ^ 2.25
                          G = clamp(1.5 · T, 20, 40) minutes
t = null (over 90 min)    credit = 0
no column for the school  dimension skipped (unknown, not "no")
```

`G` is the grace window: the credit reaches 0 at T + G. Scaling it with T matches your
example. The clamp stops a 60-minute limit from giving 75 minutes two-thirds credit, and
stops a short limit from collapsing to a cliff.

**Your example as the test case (T = 20, G = 30):**

| t (min) | 10 | 18 | 20 | 22 | 25 | **28** | 30 | **35** | 40 | **50** |
|---|---|---|---|---|---|---|---|---|---|---|
| Target | 1 | 1 | – | – | – | 0.5 | – | 0.2 | – | 0 |
| Formula | 1.000 | 1.000 | 1.000 | 0.856 | 0.664 | **0.498** | 0.402 | **0.210** | 0.084 | **0.000** |

Test tolerance is ±0.02. The curve is smooth (C¹) everywhere above T, monotone, and 0
from T + G onwards.

The same curve at other limits:

| T | G | T+5 | T+10 | T+15 | T+20 | T+30 |
|---|---|---|---|---|---|---|
| 30 | 40 | 0.74 | 0.52 | 0.35 | 0.21 | 0.04 |
| 40–60 | 40 | 0.74 | 0.52 | 0.35 | 0.21 | 0.04 |

### 3.2 Penalty (hard rule)

A cliff at exactly T would be dishonest. The estimate's error goes up to 10 minutes, and
our value was optimistic in 10 of 11 IDOS checks. A school we put at 22 minutes on a
20-minute "hard" rule may really be 20 or 30 minutes away. So the penalty ramps in over
the first 10 minutes past the limit (R = the maximum IDOS error):

```
multiplier = 1                                   t ≤ T
           = 1 − P · smoothstep((t − T) / 10)    t > T
           = 1 − P                               t = null
P = 0 (Klidně i déle) · 0.25 (Raději ne déle) · 0.5 (Nejvýš tolik)
```

With P = 0.5, the multiplier at 21 / 23 / 25 / 28 / 30+ minutes is 0.99 / 0.89 / 0.75 /
0.55 / 0.50.

**Why 0.5.** It multiplies the raw score, not the displayed one, exactly like
`PAID_PENALTY.ne = 0.5`, so the two "this is a veto" answers have the same strength.
They stack: a paid school outside the limit gets ×0.25.

The table below has 8 example schools. Assumptions: 120 weight from the other
dimensions, `dojezd` weight 20, T = 20. "Fit" is the raw score from everything except
commute. The displayed % uses `displayScore()`.

| School | Fit | MHD (min) | Credit | Without commute | Preference only | Raději ne déle (0.25) | **Nejvýš tolik (0.5)** |
|---|---|---|---|---|---|---|---|
| A | 85 | 35 | 0.21 | 93 | 86 (2nd) | 69 (4th) | **49 (6th)** |
| B | 85 | 24 | 0.72 | 93 | 92 (1st) | 86 (1st) | **80 (2nd)** |
| C | 70 | 18 | 1.00 | 81 | 85 (3rd) | 85 (2nd) | **85 (1st)** |
| D | 60 | 28 | 0.50 | 72 | 71 | 57 | **42 (last)** |
| E | 55 | 12 | 1.00 | 67 | 74 | 74 | **74 (3rd)** |
| F | 40 | 19 | 1.00 | 51 | 61 | 61 | **61** |
| G | 30 | 15 | 1.00 | 39 | 51 | 51 | **51** |
| H | 80 | >90 (null) | 0 | 89 | 80 | 64 | **44** |

How to read it:

- **Hard (0.5).** A near-perfect school 15 minutes over (A) falls below even the weakest
  in-limit school (G, fit 30). That is what "hard rule" should mean. B, at 4 minutes
  over, stays near the top. That is the tolerance working as intended, because 4 minutes
  is inside the measurement error. A smaller P (0.35) would leave A above F, which is no
  longer a hard rule. A larger P (0.6+) changes nothing in the order and only pushes
  far-out schools further down, where nobody looks.
- **Soft (0.25).** Far schools fall below solid in-limit ones (A below E), but a great
  school stays above a weak close one (A above F and G).
- **Preference only (honest critique of your design).** With weight 20 out of 140 the
  decay barely moves things: A, 15 minutes over, drops only from 93 to 86 and stays 2nd.
  That is by design, because "what you study" must outrank "where". If you want the
  preference to bite harder, the existing lever is `priorita_nabidka_misto = misto`
  (×1.8). Don't raise the base weight.

### 3.3 Your design: hard-rule yes/no plus a follow-up

The follow-up ("meeting the time limit vs being close") asks a 15-year-old to tell apart
two things that sound the same. "Being close" and "inside my time" are one idea to most
people. It is also the third question in a conditional chain, and it only changes one
number (P). Expect "nevím" answers and misreads. This touches zero-shame and cognitive
load in `docs/sources/claude_code_ui_ux_guide.md`, which asks for one question per screen
and no decisions the user cannot reason about.

### 3.4 Recommended: one 3-way control

> **Jak přísný je ten limit?**
> - Klidně i déle, když bude škola sedět → P = 0 (decay only)
> - Raději ne déle → P = 0.25
> - Nejvýš tolik, delší dojíždění nechci → P = 0.5

| | Hard yes/no + follow-up | One 3-way control |
|---|---|---|
| Taps after choosing the limit | 1–2 | 1 |
| Distinct outcomes | 3 (none / 0.35 / 0.6) | 3 (0 / 0.25 / 0.5) |
| Wording a student can answer | Follow-up is ambiguous | Each option describes a behaviour |
| Conditional logic | 2 levels of `showIf` | 1 |
| Testability | 2 answers combine | 1 answer → 1 P |

**Recommendation: the 3-way control.** It produces the same three outcomes with one
fewer question and no ambiguous wording.

---

## 4. UI plan

Follows `design/DESIGN.md` and `docs/sources/claude_code_ui_ux_guide.md`: tokens only,
Primary for selection or next action only, Tertiary only for match signals,
interpretation inline rather than in tooltips, and copy about the school, never about
the student. Use tykání or vykání per role as the questionnaire already does.

### 4.1 Questionnaire picker (one question per screen on mobile)

1. **"Odkud do školy pojedeš?"** One `StopPicker`: a stop-name combobox (diacritics
   folding as in `lib/schoolSearch.js`) plus "Použít moji polohu".
   - Inline hint: "Uloží se jen zastávka, ne tvoje adresa ani poloha."
   - A "Přeskočit" link. Skipping keeps the old district-only behaviour.
2. **"Jak dlouho můžeš jet nejdéle?"** Five chips, each with a live count computed in the
   browser from the downloaded matrix, for example "20 min · 23 škol", "30 min · 88 škol"
   (Háje). This is the cheapest way to prevent choosing an impossible limit.
   - Below the chips, a compact read-only map (≈200 px tall on mobile): in-limit schools
     as full pins, the rest as faint dots. It updates as the chip changes. No radius
     circle: the shape of real commute is not a circle, and drawing one would repeat the
     straight-line mistake.
3. **"Jak přísný je ten limit?"** The 3-way control (§3.4).
4. When the count is under 5, an inline note in the same viewport: "Do 20 minut z Háje
   jezdí MHD jen ke 3 školám. Do 30 minut by jich bylo 88." Neutral and about the data,
   with no warning colour.

Always visible under step 2: "cca, ranní špička podle jízdních řádů PID (náš výpočet
z dat PID, CC BY 4.0)".

### 4.2 Map on /skoly (`SchoolMap.jsx`)

- **Location control with two modes.** "Dojezd MHD" (stop + limit) is the default when a
  stop is known from `localStorage` or the questionnaire. "Vzdušná čára" (the existing
  radius) stays for people outside the stop list.
- **In MHD mode:**
  - Pins inside the limit stay full. Pins outside are dimmed, not hidden, so the map
    doesn't look empty at 20 minutes.
  - The selected-pin card shows "cca 24 min MHD".
  - The legend reads "Do 30 min MHD · 55 škol".
  - Never call the haversine radius "dojezd".
- The home address search (Nominatim) maps to the nearest stop in the browser and is
  then discarded, the same as geolocation today.
- **Dark mode and 375×812:** the control collapses into the existing filter sheet.

### 4.3 School detail

`CommuteTime.jsx` already exists. The only change is to use the shared `StopPicker` and,
when the questionnaire has a limit, show "v tvém limitu 30 min" or "o 8 min nad limitem".

---

## 5. Ideas beyond the brief, ranked

Value is for the student or parent. Cost is implementation hours on top of the core
feature. **⚠ = misleading if presented as precise with the current data.**

| # | Idea | Value | Data needed | Cost | Risk |
|---|---|---|---|---|---|
| 1 | **"No suitable school" fallback.** Relax the limit and show the counts at +10 and +20 min | High: at T = 20, 98 stops have 0 schools within the limit and the median stop has 10 | Exists | 1–2 h | Low |
| 2 | **Sort and filter /skoly by MHD time** | High: the most common practical question for a Prague family | Exists | 2–3 h | Low, if labelled "cca" and the filter keeps the ±tolerance |
| 3 | **Commute row back in `/porovnani` and the decision matrix** | High: UNFORGET removed it only for lack of data | Exists | 1–2 h | Low |
| 4 | **Commute in the shortlist (`/ulozene`) and application picks.** Calm note when all 3 picks are over 45 min | Medium–high, at the moment of the binding DiPSy order | Exists | 1–2 h | Low |
| 5 | **Two origins** (two homes, or home and a training ground). Score uses the best or the worse of the two | Medium: split households are common, and parents will notice | Exists. Needs two stop answers | 2–3 h | Medium: stores two locations (privacy) |
| 6 | **Yearly time cost**, e.g. "cca 24 min × 2 × 190 dní ≈ 150 h ročně" on comparison only | Medium for parents | Exists | <1 h | ⚠ Looks precise. Must stay "cca" and never be fear-framed |
| 7 | **Transfers and walking limit** ("jedním spojem", "bez přestupu") | Medium: parents of younger students care | Regenerate the matrix with a transfer count per cell. RAPTOR rounds already give it. ~2× file size | 3–4 h | ⚠ The median of 7 departures can mix 0- and 1-transfer runs. Show "obvykle" |
| 8 | **Reverse isochrone on school detail** ("odkud se sem dobře dostaneš"), with stops shaded by minutes | Medium, useful for parents relocating | Exists | 3 h | Low |
| 9 | **Open-day planning**: an order for several DOD visits on one afternoon | Low–medium | DOD dates (not in the DB), a school → school matrix (cheap: 192 origins), afternoon departures | 6 h+ | ⚠ Afternoon headways differ from the morning |
| 10 | **"Will I be on time" check** against the school's start time | Medium in theory | `zacatek_hodin` exists for about 39 schools (backup review 2026-10-12, ~20%), plus an arrive-by run | 4 h+ | **⚠⚠ Misleading now.** The matrix is depart-at, not arrive-by, optimistic, and start times are mostly missing. Don't build until both exist |
| 11 | **Onboarding quiz integration**, replacing the binary district hit | Medium: more users see it | Client-side matrix (304 KB gz) or a row endpoint | 3–4 h | Medium: onboarding copy currently promises "no minutes". Founder call |
| 12 | **Live delays** (Golemio) | Low for a 4-year decision | API key, live calls | High | Not worth it |

Build order: 1 → 2 → 3 → 4 alongside the core. 5–8 later. 9 and 10 only once the
missing data exists. 12 never.

---

## 6. Build plan (Sonnet 5.5 medium; each step < 3 h)

Rules for the implementing session:

- Read `CLAUDE.md`, this report and `lib/matching.js` first.
- This is a **tester-visible feature: do not push `main`**. Work on a feature branch.
  Verify each step, then hand the founder localhost steps (CLAUDE.md "Commit and push
  rules").
- No migration or env change is needed.
- Run `npm test` (root) and `npm run lint` plus build in `frontend/` after every step.
- Only start after Q1–Q3 in §7 are answered.

| Step | Work | Files | Test (must pass before the next step) |
|---|---|---|---|
| **S1** (1 h) | Pure helpers `commuteCredit(t, T)` and `commuteMultiplier(t, T, strictness)`, constants `GRACE_MIN = 20`, `GRACE_MAX = 40`, `GRACE_FACTOR = 1.5`, `DECAY_EXP = 2.25`, `RAMP_MIN = 10`, `STRICTNESS_P = {klidne: 0, radeji: 0.25, nejvys: 0.5}` | new `lib/commuteScore.js` | `tests/commute-score.test.cjs`: the §3.1 table for T = 20 (±0.02 at 28/35/50, exactly 1 at 10/18/20), monotone non-increasing over 0..120, `null` → 0, multiplier values from §3.2 (±0.01) |
| **S2** (1.5 h) | `commuteStopIndex` at boot. `withCommute(schools, stopId)`. Validator `isCommuteStop(id)` | `server.js` | Stubbed matrix (3 stops, 2 schools, one missing column): known stop → minutes attached; matrix null → `null`; missing column → `undefined`; unknown stop or no matrix → all `undefined` |
| **S3** (2 h) | Questions `dojezd_zastavka` (type `stop`, `privateToServer`), `dojezd_limit`, `dojezd_prisnost`. `showIf: {field, present: true}`. `validateAnswers` with the injected stop validator. `describeAnswers` skips all three | `lib/questionnaire.js`, `server.js` (inject) | Valid answer set passes. Unknown stop rejected. Limit without stop stripped. `describeAnswers` output contains no "dojezd" text. `SECTIONS` still lists every question once (existing self-check) |
| **S4** (2.5 h) | Dimension `dojezd` (weight 20). Halve `casti` when `dojezd` applies. `WEIGHT_RULES` extension. Penalty after `PAID_PENALTY`. Signal without minutes. Rewrite the header comment | `lib/matching.js` | 8 synthetic schools A–H from §3.2. Assert the **order** in each of the three strictness columns, and that `breakdown.dojezd` matches the credit. A school with `commute_minutes === undefined` gets no `dojezd` key and no penalty. Answers without commute give scores identical to before (regression snapshot over current fixtures) |
| **S5** (2 h) | Call `withCommute(..., run.answers.dojezd_zastavka)` in `withMatchScores`, the questionnaire POST, run GET and onboarding-answers | `server.js` | Existing `tests/server-boundaries.test.cjs` style: a run with a stop changes `match_score` for an in-limit vs out-of-limit stub school; a run without one is unchanged; a 503 matrix leaves scores identical to no-commute |
| **S6** (2 h) | `GET /api/commute/matrix` (stop-major Uint8 base64, ETag = `feedDate`). Frontend `fetchCommuteMatrix`, decode, `minutesFrom(stopId)`, mirrored `commuteCredit` | `server.js`, `frontend/src/api.js`, `frontend/src/lib/commute.js` | Server: decode round-trip equals the JSON matrix (null ↔ 255); 503 without matrix. Frontend unit: the `commuteCredit` mirror matches the server for 20 fixed (t, T) pairs (same pattern as the `walkMinutes` parity test) |
| **S7** (2 h) | Extract `StopPicker` from `CommuteTime.jsx`. No behaviour change on school detail | new `frontend/src/components/StopPicker.jsx`, `CommuteTime.jsx` | Lint and build. Browser: the school-detail commute states (none / geolocation deny / result / change) look and work as before at 375×812 and desktop, light and dark |
| **S8** (3 h) | Questionnaire rendering: type `stop` via `StopPicker` (pre-filled from `localStorage`), limit chips with live counts, 3-way control, "fewer than 5" inline note | `frontend/src/pages/Questionnaire.jsx` | Browser: complete a run with Háje / 20 / Nejvýš tolik. The saved run's answers hold only the stop id (check the request payload). Results order changes as expected. Skipping keeps the old flow |
| **S9** (3 h) | `SchoolMap` "Dojezd MHD" mode (dim outside pins, legend count, card minutes), plus the compact read-only preview inside the questionnaire limit step | `SchoolMap.jsx`, `SchoolMap.css`, `Questionnaire.jsx` | Browser: pins update as the limit changes. No network request contains the stop id (DevTools filter). The radius mode still works. 375×812 and dark mode |
| **S10** (2.5 h) | /skoly commute facet, commute sort, relaxation hint (ideas 1–2). Docs: `Legal.jsx` line; `UNFORGET.md` entries at :153/:1266/:1692 superseded; CLAUDE.md and AGENTS.md together | `Search.jsx`, `Legal.jsx`, docs | Browser: the filter "do 30 min" count equals the questionnaire chip count for the same stop. Sort ascending puts nulls last. The relaxation hint appears with 0 results |
| **S11** (1 h) | Full verification and founder handoff (localhost steps). No push until the founder OKs it | — | `npm test`, lint and build green. Screenshots of each state |

Ideas 3–4 (comparison and shortlist rows) are each a follow-up step under 2 h after S10.

---

## 7. Questions for the founder

1. **Privacy (blocking S3–S5).** Can the questionnaire run store the student's chosen
   **stop-group id** (option A: accurate, address never leaves the device)? Or do you
   want the **1.5 km cell** (option B: about 7× more anonymous, roughly ±6 minutes extra
   error, and a visible mismatch with the school-detail number)? A district is not an
   option (14-minute spread).
2. **Control (blocking S3).** Do you accept the one 3-way strictness question instead of
   the hard-rule yes/no plus follow-up? If you keep yours, I'll map it to P = 0 / 0.35 / 0.6.
3. **Limit options (blocking S3).** Are 20 / 30 / 40 / 50 / 60 minutes OK, dropping 15?
   (Median origin: 3 schools within 15 min, 10 within 20, 55 within 30.)
4. **Districts.** Should `casti` keep half weight when commute is answered (recommended),
   or be hidden or ignored once a stop is given?
5. **Onboarding quiz.** Is it in scope now? Its reassurance copy currently says "we don't
   compute minutes", so including it means changing that copy and the browser scoring
   engine.
6. **Optimism.** The matrix came in under IDOS in 10 of 11 checks. Is the 10-minute
   penalty ramp enough, or do you also want a flat +3 min applied before comparing with
   the limit? (Its display would then differ from school detail unless both change.)
