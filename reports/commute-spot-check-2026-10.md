# Commute matrix — IDOS spot check (plan 023 §7.2)

Date: 2026-10-21. Matrix: feed 2026-10-18, service date 2026-10-27, regenerated after the
request-stop fix (pickup/drop type 3 now boardable). IDOS queried for Tue 27.10.2026, 07:00.

Method: IDOS value = earliest arrival at the stop nearest the school − 07:00 (so waiting is
included, like our median over 06:30–07:30 departures) + our walk from that stop to the school.
Our value = `lib/data/commute-matrix.json` cell for (origin stop group, school).

| # | From | School (id) | Dest. stop (+walk) | IDOS | Ours | Δ |
|---|---|---|---|---|---|---|
| 1 | Anděl | ART ECON (16) | Kuchyňka (+3) | 30 | 23 | −7 |
| 2 | Háje | SŠ Podnikatelská akademie (59) | Milíčov (+6) | 10 | 8 | −2 |
| 3 | Sídliště Čimice | SŠ managementu a služeb (101) | Sídliště Lhotka (+2) | 51 | 47 | −4 |
| 4 | Dejvická | SŠ ARCUS (149) | Lehovec (+3) | 41 | 37 | −4 |
| 5 | Sídliště Barrandov | Královské gymnázium Petrovice (191) | Jakobiho (+3) | 40 | 41 | +1 |
| 6 | Letňany | MICHAEL (9) | Šperlova (+3) | 45 | 44 | −1 |
| 7 | Zličín | 1. KŠPA (51) | Sídliště Ďáblice (+5) | 49 | 47 | −2 |
| 8 | Palmovka | Konzervatoř Duncan centre (93) | U Staré pošty (+4) | 31 | 28 | −3 |
| 9 | Kobylisy | SOŠ Jarov (141) | Spojovací (+3) | 25 | 24 | −1 |
| 10 | Spořilov | SOŠ logistiky a podnikání (181) | Spojovací (+3) | 38 | 33 | −5 |
| 11 | Petřiny | EduVia (227) | Do Lipan (+3) | 74 | 64 | −10 |

Median |Δ| = **3 min** (≤ 5 ✔). Max |Δ| = **10 min** (not > 10 ✔, borderline).
Coverage mix: metro-only/metro+bus (4, 6, 7, 8, 11), tram+bus (1, 5), bus-only (2, 10), outer edge (3, 11).

**Result: PASS.**

Notes
- Ours is lower in 10 of 11. Expected: the matrix may finish at any stop within 1 km of the school,
  IDOS was asked only for the nearest one, and IDOS's first answer can start with a long wait
  (#11 leaves at 07:08 on a ~20-min bus headway). Not a model error, but the estimate leans optimistic.
- Horní Počernice was not a stop-group name in the matrix, so the outer-edge case uses Čimice and Petřiny.
- Before the fix, 54.2 % of matrix cells were null (request stops treated as non-boardable); now 0.2 %.
