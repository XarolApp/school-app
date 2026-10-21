# PID GTFS commute estimates

The school detail's optional commute estimate uses the daily [PID GTFS feed](https://data.pid.cz/PID_GTFS.zip).
PID's [open-data page](https://pid.cz/o-systemu/opendata/) links its CC-BY notice to
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

The app turns the timetable into a typical weekday-morning estimate. The result is our
calculation from PID data, not a route or real-time estimate supplied by PID. The UI
credits PID, links the licence, and identifies the estimate as our calculation.

The browser computes the nearest stop from geolocation locally. Coordinates are not sent
to the app server; the selected stop id stays in that browser's local storage. The server
receives only the school id when it returns that school's static commute column.

Regenerate the committed `lib/data/commute-matrix.json` after a meaningful timetable
change, school import, or coordinate update:

```sh
node scripts/build-commute-matrix.js
node scripts/build-commute-matrix.js --refresh
```

The raw feed and extracted files live under `scripts/data/gtfs/` and are ignored by Git.
The script selects an ordinary Tuesday from the feed's validity range and stores the
selected service date in the matrix. Confirm the generated matrix is below 2 MB and run
the manual IDOS comparison recorded in [plan 023](../../plans/023-mhd-commute-times.md)
before treating its estimates as accepted.
