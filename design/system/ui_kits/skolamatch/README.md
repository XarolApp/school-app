# UI kit — ŠkolaMatch

Click-through recreation of the product's surfaces, composed entirely from the
system's own components (`Button`, `Input`, `Checkbox`, `OptionRow`, `Card`, `Chip`,
`Divider`, `MatchIndicator`, `Tooltip`). Open `index.html`.

## Screens

| File | Screen | Notes |
|---|---|---|
| `Landing.jsx` | Úvodní stránka | Airy marketing register: Display 72, flush-left, one primary CTA. The ambient loop specified in DESIGN.md is deliberately **not** implemented (gated behind a separate pass). |
| ~~`Search.jsx`~~ | ~~Databáze škol~~ | **Removed 2026-08-31** — superseded by the real, richer implementation at `frontend/src/pages/Search.jsx` (built from a separate, more detailed Claude Design wireframe with working filters/facets/sorting, not this mockup's static hardcoded list). See `plans/004-search-design-import.md`. |
| `Questionnaire.jsx` | Dotazník | `OptionRow` single- and multi-select, pill progress. No header chrome, no entrance animation, no reveal drama. |
| `Results.jsx` | Moje shody | `MatchIndicator` per card — met/unmet criteria, no score, no percentage. |
| `SchoolDetail.jsx` | Detail školy | Data rows with tabular figures; interpretation inline, tooltip only for the DiPSy abbreviation. |
| `Paywall.jsx` | Paywall | Formal *vy*, `Input` error state, consent `Checkbox`, single price. |
| `Shell.jsx` | Header / Footer / wordmark / photo slots | Shared chrome. |

## Fidelity caveat

No codebase, Figma file, or screenshots of the real ŠkolaMatch product were supplied —
`uploads/DESIGN.md` was the only source. Screen composition is therefore derived from
DESIGN.md's prose (the three named surfaces, the density rules, the 12-column/1280px
grid) rather than copied from a shipped design. **Tokens and component styling are
specified; screen layout is proposed.** Replace with real screens when they exist.

Photography is represented by labelled dashed placeholders — no imagery assets were
supplied, and DESIGN.md calls for real photography of real people, not illustration.
