# Plan 023 — Transit (MHD) commute time from the student's stop to each school

Status: implemented and accepted, 2026-10-21. Request stops (PID pickup/drop type 3) were first
wrongly treated as non-boardable, which left 54% of cells null; fixed, matrix regenerated
(feed 2026-10-18, service date 2026-10-27, 1,484 stop groups x 192 schools, 967 KB, 0.2% null).
IDOS spot check passed (median 3 min, max 10 min): reports/commute-spot-check-2026-10.md.

## Goal

On a school detail page a student sees **"MHD cca 24 min ze zastávky Anděl"** — a typical
weekday-morning door-to-door transit estimate from *their* stop to this school.

No paid API, no live data, no address sent anywhere.

## Founder decisions (2026-10-16 — do not re-derive)

- Own computation from the free PID GTFS timetable. No Google/IDOS/Mapy.cz routing.
- Origin = the user's nearest stop. They either **type a stop name** or tap **"Použít moji
  polohu"** (browser geolocation → nearest stop computed in the browser).
- A typical estimate, not live. Labelled "cca" + "ranní špička, podle jízdních řádů PID".

## Key design choices (decided here)

1. **Precompute offline, serve a static matrix.** A script computes `stop → school →
   minutes` for every Prague stop group (~1,100) × every visible school (192) ≈ 210k numbers
   (~1 MB JSON). Runtime is a lookup — no routing engine in production.
2. **No database table, no Supabase migration.** The matrix is a generated file committed at
   `lib/data/commute-matrix.json` and loaded into server memory at boot. It is
   public-timetable-derived, not user data, and changes only when we regenerate it. (A DB
   table would add a migration and a founder SQL step for zero benefit.)
3. **The user's stop never leaves the browser.** The client fetches one school's column
   (≈1,100 small ints) and picks its own stop locally. The chosen stop id is remembered in
   `localStorage` only (per-device convenience; no profile column, no GDPR footprint).
   Geolocation coordinates are used once in memory and discarded.
4. **Own RAPTOR in plain Node, no new dependency.** ~200 lines. OpenTripPlanner (Java,
   GBs of RAM) is overkill for 1,100 origins once every few months.
5. Free-text **address** input is **deferred** (needs a geocoder — RUIAN self-host or
   Mapy.cz). Geolocation + stop name covers the request without one. Log in `UNFORGET.md`.

## 1. Data source — verify first

- Feed: PID GTFS, `https://data.pid.cz/PID_GTFS.zip` (**verify URL and licence**; PID open
  data is published as CC BY 4.0 — confirm and add the attribution line in the UI and
  `docs/` legal/data-sources page if one lists sources).
- The zip is large (~100 MB unzipped). Download into `scripts/data/gtfs/` (gitignored —
  check `.gitignore` covers it; add it if not). Never commit the raw feed.

## 2. Offline script — `scripts/build-commute-matrix.js`

Plain Node, streams files with `readline`, uses system `unzip` (same pattern as other
scripts that shell out; no npm dependency). Steps:

1. **Parse** `stops.txt`, `routes.txt`, `trips.txt`, `calendar.txt`, `calendar_dates.txt`,
   `stop_times.txt` (stream — it's the big one). Write a small quote-aware CSV line parser;
   GTFS fields can be quoted.
2. **Pick the service day**: the next ordinary Tuesday in term time (not a holiday, not a
   school-break week) within the feed's validity. Keep only trips active that day
   (calendar + calendar_dates exceptions). Print the chosen date.
3. **Prague filter**: keep stops whose `zone_id` contains `P`, `0` or `B` (Prague zones) —
   verify against the feed; fall back to a bounding box of the district polygons in
   `lib/pragueDistricts.js` if zones prove unreliable. Keep all trips that serve them
   (including trains — PID includes S-lines).
4. **Stop groups** (what the user picks): group platforms by `stop_name` (PID's names are
   unique per node; also `asw_node_id` if present — prefer it). Group coords = mean of its
   platforms. Output `{id, name, lat, lon}`; `id` = stable string (asw node id or name slug).
5. **Footpaths**: platform↔platform walking edges for pairs ≤ 400 m apart, walk time =
   haversine × 1.3 ÷ 4.5 km/h (+ 1 min minimum). Same constants used everywhere — put them
   in one shared module (see §3).
6. **School egress**: for each visible school (`schools` with lat/lon, not merged, not
   hidden — same filter as `fetchAllSchools`; read via service-role like other scripts),
   find platforms within 1,000 m; egress = walk time.
7. **RAPTOR** (round-based, max 4 rounds = 3 transfers), forward from each origin stop group
   (start at all its platforms), departure times **06:30–07:30 every 10 min** (7 runs).
   For each school: travel = min over its nearby platforms (arrival + egress) − departure.
   Also allow pure walking if origin group is ≤ 1,000 m from the school.
   Stored value = **median of the 7 runs**, rounded to whole minutes, `null` if > 90 min
   or unreachable.
8. **Write** `lib/data/commute-matrix.json`:
   ```json
   { "generatedAt": "...", "feedDate": "2026-10-20", "serviceDate": "...",
     "stops": [{ "id": "...", "name": "Anděl", "lat": 50.07, "lon": 14.40 }],
     "schools": { "12": [24, 31, null, ...] } }
   ```
   `schools[id][i]` aligns with `stops[i]`. Print summary: stop count, school count, % null,
   runtime.

Expected runtime: 1,100 × 7 RAPTOR runs; target < 15 min on the MacBook. If it's slower,
first optimisation is to prune routes whose trips never reach Prague stops, not
parallelism.

**Rerun when**: PID timetable change (they publish a new feed regularly; meaningful changes
a few times a year), new school added, or school coordinates change. Note this in the
script header and in the import pipeline notes next to `import-admission-data.js`.

## 3. Shared walking constants + nearest-stop helper

- `lib/commuteWalk.js` (server) — `WALK_KMH = 4.5`, `DETOUR = 1.3`, `walkMinutes(a, b)`,
  `haversineMeters`. Used by the script.
- Frontend needs the same `walkMinutes` + nearest-stop search for geolocation. Duplicate the
  ~15 lines into `frontend/src/lib/commute.js` with a comment pointing at the server copy
  (same convention as other mirrored helpers). Do not import across the server/frontend
  boundary.

## 4. API — two endpoints in `server.js`

Load the JSON once at boot (`require`). If the file is missing, log a warning and both
endpoints answer 503 — the app must boot without it.

- `GET /api/commute/stops` → `{ feedDate, stops: [{id, name, lat, lon}] }` (~60 KB).
  `Cache-Control: public, max-age=86400`.
- `GET /api/schools/:id/commute` → `{ feedDate, minutes: [..aligned to stops..] }`.
  Same auth middleware and hidden/merged 404 behaviour as `GET /api/schools/:id` (reuse
  `visibleSchool()`; whatever gating the detail route gets later, this follows it).
  `400` on non-integer id, `404` when the school has no column.

Both under the existing `/api/` rate limiter. Add fetch helpers to `frontend/src/api.js`.

## 5. UI — `frontend/src/components/schoolDetail/CommuteTime.jsx`

Placed inside / directly under `SchoolLocation` (it's "how do I get there").
Read `docs/sources/claude_code_ui_ux_guide.md` and `design/DESIGN.md` first; tokens only,
no hardcoded colours; `lucide-react` named imports (`Bus`, `LocateFixed`).

States:
1. **No stop chosen**: one line "Jak dlouho sem pojedeš MHD?" + a stop-name combobox
   (reuse the diacritics folding from `lib/schoolSearch.js` for matching "andel" → Anděl)
   + button "Použít moji polohu".
2. **Geolocation**: `navigator.geolocation.getCurrentPosition` → nearest stop group by
   haversine (client side). Show "Nejbližší zastávka: X (cca 4 min pěšky)". On deny/error:
   calm message, keep the combobox. Outside Prague (nearest stop > 2 km): "Zatím umíme jen
   Prahu — vyber zastávku ručně."
3. **Result**: big number "cca 24 min" + "ze zastávky Anděl · ranní špička, podle jízdních
   řádů PID" + "Změnit". `null` → "Přes 90 minut nebo bez rozumného spojení."
   Total = stop's matrix value + walk from user to stop (only when geolocation was used).
4. Chosen stop id saved in `localStorage` (`commute.stopId`, wrapped in try/catch), so every
   other school page shows its time immediately.
5. Footer: data attribution "Jízdní řády: PID (CC BY 4.0)" — exact wording per licence check.
6. 503 from the API → render nothing (feature quietly absent).

Copy: tykání for students, vykání for parents — follow how the rest of the detail page
picks voice (check `SchoolDetail.jsx`); zero-shame.

Out of scope for v1: sorting/filtering `/skoly` by commute time (natural follow-up — the
matrix already supports it; log in `UNFORGET.md`), live delays (Golemio), address input,
evening/weekend times.

## 6. Tests (`tests/`, existing node test style)

- RAPTOR on a hand-made 5-stop / 3-trip GTFS fixture: direct trip, one transfer, footpath
  transfer, missed connection → waits for next trip, unreachable → null.
- Median-of-departures and the 90-min cap.
- Endpoints: hidden school → 404, bad id → 400, missing matrix file → 503.
- `walkMinutes` server/frontend copies give identical results for a fixed pair.

## 7. Verification

1. Run the script and review the printed coverage summary. The 2026-10-18 generation has
   1,484 stop groups and 192 schools (1.30 MB); 54.2% of all cells and 49.6% of Betlémská's
   cells are null. This does not by itself establish a routing defect: some groups have no
   scheduled connection within the 90-minute cap. Validate useful central-origin routes in
   the IDOS spot check before release.
2. **Spot-check 10 pairs against IDOS** (founder task below; not yet done) — accept if median absolute
   difference ≤ 5 min and no pair is off by > 10 min. Record in
   `reports/commute-spot-check-2026-10.md`.
3. Browser preview at 375×812 and desktop: all four UI states, geolocation deny, dark mode.
4. `npm run lint` in `frontend/`, tests, build.

## 8. Release

New tester-visible feature → **do not push on your own.** Build, verify, tell the founder
how to try it on localhost, push after their OK. No SQL migration and no env change needed.
Check the matrix JSON size (< 2 MB) before committing; check `git status` so the raw GTFS
feed is not staged.

## Founder tasks (in parallel while it's being built)

- **IDOS spot check (20 min):** pick 10 real student-ish trips (different districts, one
  outer edge like Horní Počernice → central school, one metro-only, one bus+tram) and note
  the IDOS time for a Tuesday 07:00 departure. These are the acceptance numbers for §7.2.
- **Licence:** confirm on pid.cz/opendata that GTFS is CC BY 4.0 and the required
  attribution text.
