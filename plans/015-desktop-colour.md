# 015: More colour on desktop /skoly and on Praktické informace

**Status:** BUILT and reviewed, 2026-09-26 (13c3d1e, 4e0444c, 81ec180). Planned against `f23bab6`. Approved by the founder from the
concept, with two decisions: keep the Přijato bar, collapse the empty cards.

**Visual reference:** https://claude.ai/artifact/HNjMAttNGL3TfPTnqB9y7V (toggle
Teď/Návrh, all 4 themes × light/dark). **Design source of truth:** `design/DESIGN.md`
→ Colors. The rule changes this plan depends on (one Primary-subtle guidance area per
screen, three match-strength levels) were written into DESIGN.md in the same commit as
this plan. Read Colors → Primary-subtle and Tertiary before starting.

---

## 1. Outcome

On a 1280px desktop the search page and the school detail page stop reading as black
and white. No new hues: the existing theme colours get more surface in one place and
more meaning in another. Everything is token-driven and works in all 8 theme × mode
combinations.

1. The "Nevíš, kde začít?" browse block is tinted with the theme's soft accent, its
   tiles sit on it as surface cards, tile icons take the accent colour.
2. Match badges show strength in three levels (solid / soft / outline).
3. The Přijato column shows the number followed by a small bar, both centred under
   the "Přijato" header.
4. The Seznam/Mapa toggle uses the standard selection look; the legend icon takes the
   accent colour.
5. Praktické informace: filled cards look filled (solid, accent icon), the maturita
   percentage is shown large, empty cards collapse into one line, long texts clamp at
   6 lines with "Zobrazit celé", the intro copy loses its em dash and uses "ty".

**Not in this plan:** phone layout changes beyond what a shared rule implies (the Přijato
bar is hidden ≤860px), new hues, the onboarding theme step, the "78.9" decimal-point
data issue in scraped maturita text.

## 2. Decisions already made (do not re-open)

1. Themes change colour tokens only (DESIGN.md → Themes rule 1). No
   `[data-palette=…]` selector anywhere in this plan's CSS.
2. The new `matchFill`/`matchInk` values in §3 are final and contrast-checked
   (matchInk on matchFill, all 8 combinations, lowest 5.16:1 Terakota light).
3. Thresholds: `match_score >= 85` strong, `70–84` mid, `< 70` low. Integers, as the
   API returns them.
4. Tiles on the tinted block use `--surface`, not a new "raised" token.
5. The Přijato bar is decoration of a number that is always printed next to it, so it
   is `aria-hidden` and never the only carrier of the value.

## 3. Tokens (`frontend/src/design/tokens.js`)

Add two keys to every palette object, in both modes:

| palette | mode | `matchFill` | `matchInk` |
|---|---|---|---|
| znacka | light | `#2C7340` | `#F5F6F7` |
| znacka | dark | `#7DC08E` | `#131518` |
| smrk | light | `#855A13` | `#F3F5F2` |
| smrk | dark | `#E1B770` | `#0F1613` |
| zvyraznovac | light | `#F6CF3F` | `#151412` |
| zvyraznovac | dark | `#F6CF3F` | `#161512` |
| terakota | light | `#4F7143` | `#FAF6EF` |
| terakota | dark | `#8FB57E` | `#17130E` |

In `cssVars()` add, next to `--ok-soft`:

```js
'--match-fill': p.matchFill,
'--match-ink': p.matchInk,
```

Update the "Semantic rules" comment block in `tokens.js`: rule 1 becomes "Solid
`accent` carries exactly ONE thing per screen. `accentSoft` may additionally tint one
guidance area per screen (DESIGN.md → Primary-subtle)." Rule 2 gains "…in three
strength levels (DESIGN.md → Tertiary)."

Run `npm run tokens` in `frontend/`. Commit the regenerated `tokens.css`.

## 4. Browse block (`frontend/src/pages/search.css`)

```css
.ss-browse            { background: var(--acc-soft); }        /* was --surface2 */
.ss-browse-tile       { border-color: transparent; }          /* background stays --surface */
.ss-browse-tile > svg { color: var(--acc); }                  /* was --ink2 */
```

Hover (inside the existing `(hover: hover) and (pointer: fine)` block): border-color
`var(--acc-line)` instead of `var(--line2)`. Heading and description colours are
unchanged (ink on accentSoft is ≥10.9:1 in every theme). No JSX change. Applies at all
widths.

## 5. Match strength levels

`frontend/src/pages/Search.jsx`, the `ss-match-score` span (around line 1234). Add a
level class computed inline or from a tiny local helper next to `skol`-style helpers:

```js
const matchLevel = (score) => (score >= 85 ? 'is-strong' : score >= 70 ? 'is-mid' : 'is-low');
```

```jsx
<span className={`ss-match-score ${matchLevel(row.school.match_score)}`}>…</span>
```

`search.css`, after `.ss-match-score`:

```css
.ss-match-score.is-strong { background: var(--match-fill); color: var(--match-ink); }
.ss-match-score.is-low    { background: transparent; box-shadow: inset 0 0 0 1px var(--line2); }
```

`is-mid` needs no rule (it is today's style). Grep for other renderers of
`match_score` as a badge (`/porovnani`, the map popup `sm-card`, `/dotaznik`); apply the
same classes **only** where the element already uses `ss-match-score`. Anything
else: list it in the report, don't restyle it.

## 6. Přijato: number, then bar, centred

Markup (`Search.jsx`, `.ss-cell-acceptance`, around line 1259). Put the bar **after**
the number, only when a rate exists:

```jsx
<div className="ss-cell-number ss-cell-acceptance">
  <span className="ss-data-md">…existing number / bez dat…</span>
  {row.acceptanceRate != null && (
    <span className="ss-accept-bar" aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.round(row.acceptanceRate))}%` }} />
    </span>
  )}
  <span className="ss-caption ss-number-label">přijato</span>
</div>
```

Header: the "Přijato" `<span>` in `.ss-list-head` gets `className="ss-header-center"`
instead of `ss-header-numeric`.

CSS:

```css
.ss-header-center { text-align: center; }

.ss-cell-acceptance {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  text-align: left;
}
.ss-cell-acceptance > .ss-data-md { display: inline; }   /* overrides .ss-cell-number > .ss-data-md { display:block } */

.ss-accept-bar {
  flex: none;
  width: 40px;
  height: 6px;
  border-radius: 3px;
  background: var(--line);
  overflow: hidden;
}
.ss-accept-bar > span {
  display: block;
  height: 100%;
  background: var(--acc-line);
}
```

Grid: widen the Přijato track from `72px` to `112px` in all four desktop/tablet grid
declarations (`.ss-list-head, .ss-row`, their `.has-score` variants, and the same two
inside `@media (min-width: 861px) and (max-width: 1099px)`). Nothing else in the grid
changes.

Phone (`@media (max-width: 860px)`): `.ss-accept-bar { display: none; }` and restore
`.ss-cell-acceptance { display: block; text-align: left; }` so the stacked
number-over-label layout is exactly as today.

Measure after the change at 1280px: the bar+number group's horizontal centre must be
within 2px of the "Přijato" header text's centre, for a row showing `34 %` and one
showing `100 %`.

## 7. Small accents

```css
.ss-view-toggle button.is-active {
  background: var(--acc-soft);
  color: var(--ink);
  box-shadow: inset 0 0 0 1.5px var(--acc);
}
.ss-legend svg { color: var(--acc); }   /* was --ink3 */
```

## 8. Praktické informace

### 8.1 `MissingDataGrid.jsx`

- Give each card a lucide icon (named imports only): Školné → `Wallet`, Obědy →
  `Utensils`, Kroužky → `Music`, Maturita → `GraduationCap`, Kam míří absolventi →
  `Compass`, Uplatnění po vyučení → `Briefcase`, Přijímací požadavky → `ClipboardList`,
  Styl výuky → `Presentation`, Fotky → `Image`, Video → `Video`. Size 16,
  `aria-hidden`.
- A card is **empty** when its body is exactly `'Nemáme tuto informaci.'`. Use one
  constant for that string so the check and the fallbacks can't drift.
- Render filled cards in the grid. Render empty cards **not** as cards but as one line
  after the grid:
  `<p className="sd-missing-line"><strong>Zatím nemáme:</strong> {titles joined with ", ", lower-cased first letter}. Doplňujeme je postupně.</p>`
  Example: "Zatím nemáme: uplatnění po vyučení, fotky školy, video a prohlídka.
  Doplňujeme je postupně." Omit the line when nothing is empty. If **every** card is
  empty, render only the line (no grid).
- Maturita big number: when `e.maturita_pass_rate_pct != null`, render
  `<div className="sd-card-figure">{numCz(pct)} %</div>` between title and body, with
  a Czech decimal comma (reuse an existing number formatter if one exists in
  `frontend/src/lib`; otherwise `String(pct).replace('.', ',')`). Do not parse numbers
  out of `maturita_uspesnost` text.
- Long texts: body gets class `sd-missing-card-body is-clamped` when its length is
  over 220 characters, plus a button `Zobrazit celé` / `Zobrazit méně` toggling a
  local `expanded` state per card (a `Set` of titles in `useState`). Button is a plain
  text button (`type="button"`, `aria-expanded`), underlined, ink colour.

### 8.2 `schoolDetail.css`

```css
.sd-missing-card {                       /* filled card */
  border: 0;                             /* was 1px dashed --line2 */
  background: var(--surface2);
}
.sd-missing-card-title { display: flex; align-items: center; gap: var(--space-sm); }
.sd-missing-card-title > svg { flex: none; color: var(--acc); }
.sd-card-figure {
  font: 700 var(--fs-headline-md)/1 var(--heading);   /* use the nearest existing headline size token */
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  margin: 2px 0 var(--space-xs);
}
.sd-missing-card-body.is-clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
}
.sd-missing-line {
  margin: var(--space-md) 0 0;
  padding: 12px var(--space-md);
  border: 1px dashed var(--line2);
  border-radius: var(--r-chip);
  color: var(--ink2);
  font-size: var(--fs-body-sm);
}
.sd-missing-line strong { color: var(--ink); font-weight: 600; }
```

Add `align-items: start` to `.sd-missing-grid` so short cards don't stretch to the
height of a long neighbour.

### 8.3 `SchoolDetail.jsx` intro copy (line ~161)

Replace with: `Údaje níže jsme automaticky sesbírali z webu školy. Před podáním
přihlášky si je ověř přímo u školy.` No em dash. The "Co zatím doplňujeme" branch is
unchanged.

## 9. Docs

- `CLAUDE.md` and `AGENTS.md`: no change needed unless they restate the "one thing per
  screen" rule; if they do, update both identically.
- DESIGN.md is already updated (this plan's commit). Don't edit it.

## 10. Verification

From `frontend/`: `npm run tokens` (regenerated `tokens.css` committed and clean),
`npm run lint` (no new warnings), `npm run build`. From root: `npm test`.

Browser, both servers per `.claude/launch.json`, signed in with an account that has a
default questionnaire run (so Shoda shows):

| # | Check | Pass |
|---|---|---|
| 1 | `/skoly` at 1280×900, Značka light and Zvýrazňovač dark | Browse block tinted, icons accent, tiles readable. Screenshot both. |
| 2 | Match levels | At least one row each of ≥85, 70–84, <70 visible (sort by match and scroll/paginate if needed); classes match thresholds. |
| 3 | Přijato centring | §6 measurement passes for `34 %` and `100 %` rows; bar is to the right of the number. |
| 4 | Row with no admission data | "Nebyla v prvním kole…" text unchanged, no bar, no layout break. |
| 5 | 1024px (tablet grid) | No overflow, Přijato column fits. |
| 6 | 390×844 phone | No bar shown; numbers layout identical to before; browse block tinted and scrolls horizontally. No horizontal page scroll. |
| 7 | `/skoly/<a school with extracted data>` (e.g. the Elijáš school) | Filled cards solid with icons, maturita figure large with comma, empty ones in one "Zatím nemáme" line, a long card clamps and expands/collapses. |
| 8 | A school with no extracted data | Heading "Co zatím doplňujeme", only the line, no empty grid. |
| 9 | All 8 theme × mode combinations on `/skoly` and one detail page | Nothing unreadable. Contact sheet of 16 screenshots for the reviewer. |
| 10 | Grep | `grep -nE '#[0-9A-Fa-f]{3,8}\b|rgba?\(' frontend/src/pages/search.css frontend/src/pages/schoolDetail.css` shows no new lines from this plan. |

## 11. Commits

On `main`, pushed after each verified chunk:
(1) tokens + generated CSS; (2) `/skoly` changes (§4–§7); (3) Praktické informace (§8).
Don't stage `docs/skolamatch_current_status.md`,
`docs/workflows/plan-then-build-collaboration.md`, the untracked routing-guide file,
`UNFORGET.md`, `reports/…`, `scripts/extract-school-details.js`, or `AGENTS.md` /
`CLAUDE.md` unless §9 required an edit (then stage only your hunk).

## 12. Handoff prompt for Codex

> Implement `plans/015-desktop-colour.md`. Read the plan, then `design/DESIGN.md` →
> Colors (Primary-subtle and Tertiary bullets), then `AGENTS.md`. The plan is the
> contract: token values are final and contrast-checked, copy them exactly and make
> no design decisions. Where the code doesn't match the plan, take the smallest option
> the plan names, or stop and report. Run section 10, commit and push in section 11's
> chunks, and finish with a report of each check's result (with the screenshots), the
> §6 centring measurement, any `match_score` renderer you found but did not restyle,
> and the commit hashes.
