# UI kit — Střední na míru

> **Historical prototype — checked 10 October 2026.** This kit is separate from the shipped app. Its hardcoded school facts, commute times, 17 matches, five-school comparison, 2021–2025 coverage, PDF/parent-account promises and 390 Kč price are illustrative proposals, not verified live data or approved offers. Current commercial config is 690 Kč once after the season purchase trial and 249 Kč monthly without a purchase trial; beta is free for main-feedback messages, with optional preview screens. Match percentages, Archivo fonts, Značka/default themes and the landing2 implementation exist in the actual app. Use `design/DESIGN.md`, frontend source, `UNFORGET.md` and the deployment review for current behavior. The generic components still need the C44 accessibility/template reconciliation; opening this kit does not verify beta readiness.

Click-through recreation of the product's surfaces, composed entirely from the
system's own components (`Button`, `Input`, `Checkbox`, `OptionRow`, `Card`, `Chip`,
`Divider`, `MatchIndicator`, `Tooltip`). Open `index.html`.

## Screens

| File | Screen | Notes |
|---|---|---|
| `Landing.jsx` | Úvodní stránka | Airy marketing register: Display 72, flush-left, one primary CTA. The ambient loop specified in DESIGN.md is deliberately **not** implemented (gated behind a separate pass). |
| ~~`Search.jsx`~~ | ~~Databáze škol~~ | **Removed 2026-08-31** — superseded by the real, richer implementation at `frontend/src/pages/Search.jsx` (built from a separate, more detailed Claude Design wireframe with working filters/facets/sorting, not this mockup's static hardcoded list). See `archive/plans/004-search-design-import.md`. |
| `Questionnaire.jsx` | Dotazník | `OptionRow` single- and multi-select, pill progress. No header chrome, no entrance animation, no reveal drama. |
| `Results.jsx` | Moje shody | `MatchIndicator` per card — met/unmet criteria, no score, no percentage. |
| `SchoolDetail.jsx` | Detail školy | Data rows with tabular figures; interpretation inline, tooltip only for the DiPSy abbreviation. |
| `Paywall.jsx` | Paywall | Formal *vy*, `Input` error state, consent `Checkbox`, single price. |
| `Shell.jsx` | Header / Footer / wordmark / photo slots | Shared chrome. |

## Fidelity caveat

No codebase, Figma file, or screenshots of the real Střední na míru product were supplied —
`uploads/DESIGN.md` was the only source. Screen composition is therefore derived from
DESIGN.md's prose (the three named surfaces, the density rules, the 12-column/1280px
grid) rather than copied from a shipped design. **Tokens and component styling are
specified; screen layout is proposed.** Replace with real screens when they exist.

Photography is represented by labelled dashed placeholders — no imagery assets were
supplied, and DESIGN.md calls for real photography of real people, not illustration.
