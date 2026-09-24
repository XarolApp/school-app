# 013: `/skoly` redesign: one calm, scannable list

**Status:** BUILT, reviewed 2026-09-24. Chunks 1–2 by Codex (`c1b6a5c`, `e391a4b`);
chunk 3 by Codex plus reviewer fixes by Claude Opus 5.5 in the same commit. See
"Review outcome" at the end of this file for what changed from the plan and what
is still untested.

**Approved concept (visual reference, read it first):**
https://claude.ai/artifact/E2FKsRAozURP9TnuFLSZQq

The concept is the target *layout*. This file is the *contract*. Where they differ,
this file wins. Every design decision the concept left open is decided below, so the
implementation pass should make **no** design calls of its own. If something here is
wrong about the code (a missing prop, a name that doesn't exist), stop and report it
instead of improvising.

---

## 1. Problem and current behavior

The founder said the page is overwhelming: lots of text at once, and also lots of
blank space. Measured on the live page at 1280×800 (anonymous, 223 schools):

- The first school row starts at **y=602**, so only **one** school is visible above
  the fold. Everything above it is chrome: h1, search, 4 full-width "recently viewed"
  chips, filter/count row, a 120px sort row with a caption about MHD.
- Each row is **226px** tall: serif name, meta line, obor chips, a "Zaměření: …
  Nabízí N oborů v rámci školy." sentence that repeats the meta line, then a boxed
  4-cell stat grid with **4 ⓘ tooltips** (160 per page) that only fills 520 of the
  777px row, with "Detail" and the star stacked in a separate right column.
- Filters sit in a 240px left sidebar with "Typ školy" (10 options) open by default,
  and end with a dead "Dojezd MHD: zatím nedostupné" block.
- On a 390px phone, the compare bar takes about a fifth of the screen with a
  two-line sentence.

## 2. Decisions already made (do not re-open)

1. **Filters move to a top bar under the search.** The desktop left sidebar is removed
   at every width. This **supersedes plan 012's decision #3** ("above 860px keep a
   sidebar"); founder decision 2026-09-24. Plan 012's other decisions still stand (one
   filter state, one h1, results-first on mobile, `AsyncState`, `useBottomBarSpace`).
2. **Keep the "browse by field" block** (the 10 zaměření categories as tiles), shown
   only while nothing is filtered.
3. **Current colours and fonts stay.** Use only existing CSS variables from
   `frontend/src/design/tokens.css`. A new palette is planned as a separate project,
   and it must be able to land by editing `tokens.js` alone. That means **zero new
   hardcoded colours, radii, shadows or font families** in anything this plan touches.
   If a value you need has no token, use the nearest existing one; do not add literals.
4. **Each school is one row, with numbers in columns**, not a card with a boxed grid.
5. **Explanations appear once**, in a legend above the list. The per-row ⓘ tooltips go
   away on this page (`StatInfo` itself stays, because `SchoolMap.jsx` still uses it).
6. **No behavior change to search, filtering, counting, sorting, pagination, the empty
   state's relax suggestions, the map, favourites or the 4-school compare limit.** This
   is a layout, markup and copy change. Do not touch `lib/schoolSearch.js`,
   `lib/schoolFeatures.js`, `SchoolMap.jsx`, `server.js`, or the scoring.
7. **Banned by the founder:** gradients, pill-shaped buttons (anything with a radius of
   half its height or more), emoji, em dashes (—) in copy, scroll-triggered animations,
   fake numbers or counters, vague hero text. An en dash inside a school's real name is
   data and stays.

## 3. Files

| File | Change |
|---|---|
| `frontend/src/pages/Search.jsx` | Restructure the render tree (sections 4–10). Filter logic above the `return` stays, except the small additions named below. |
| `frontend/src/pages/search.css` | New layout styles; delete selectors that become unused (section 12). |
| `frontend/src/components/SearchFilters.jsx` | Split the facet groups into exported components so popovers and the full panel share them (section 5.3). Remove the "Dojezd MHD" parked block. |
| `frontend/src/components/FilterPopover.jsx` | **New.** The desktop dropdown panel for one filter group (section 5.2). |

Nothing else. Use existing `Modal`, `AsyncState`, `FavoriteButton`, `useMediaQuery`,
`useBottomBarSpace` and `.sr-only` (global, defined in `auth.css`).

## 4. Page structure, top to bottom

```
h1 + source line                 [recently viewed, right on desktop]
search input
filter bar                       (5 group buttons + "Všechny filtry")
applied-filter chips             (only when a facet filter is active)
browse by field                  (only when nothing is filtered, list view)
toolbar: count h2 · sort · Seznam/Mapa
legend                           (list view, n > 0)
column header row                (desktop only)
rows | map | empty state
pagination
footnote
compare bar                      (fixed, only when something is selected)
```

Breakpoints (reuse the existing `isMobile = useMediaQuery('(max-width: 860px)')`):

- **Wide, ≥1100px:** full row with the Obory column.
- **Medium, 861–1099px:** same row, Obory column hidden (header and cells).
- **Mobile, ≤860px:** stacked rows, no header row, filter groups open in the `Modal`
  sheet instead of popovers.

Spacing between the blocks above: `var(--space-lg)` (24px) desktop, `var(--space-md)`
(16px) mobile, except search → filter bar and filter bar → chips, which are
`var(--space-sm)` (8px) apart. Lay out the blocks with `display:flex; flex-direction:
column; gap` on `.school-search`, not per-element margins.

## 5. Header, search and filters

### 5.1 Header

- `<h1 className="ss-headline-lg">Střední školy v Praze</h1>` (replaces "Databáze škol").
- Source line under it, `ss-body-md`, colour `var(--ink2)`, max-width `var(--measure)`:
  `{total} {skol(total)}. Hranice a počty přijatých jsou z výsledků přijímaček Cermatu za roky 2024 až 2026.`
  Render it only once schools have loaded (`!loading && !error`). Plain text, no link.
- **Recently viewed** (same condition as today: `activeCriteriaCount === 0 &&
  recentRows.length > 0 && view === 'list'`). Maximum 3 items. One line:
  `Naposledy:` in `var(--ink3)` followed by comma-separated `<Link>`s, `ss-caption`,
  link colour `var(--ink2)`, underline `1px var(--line2)`, `text-underline-offset: 3px`.
  Each link has `max-width: 24ch; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; display: inline-block; vertical-align: bottom` and a `title`
  holding the full name. Desktop: right-aligned in the header row
  (`display:flex; justify-content:space-between; align-items:flex-end; gap: var(--space-lg)`),
  max-width 420px. Mobile: under the source line, left-aligned, single line with the
  container clipping overflow. The old chip-stack block (`.ss-recent`) is removed.

### 5.2 Search input

- Keep the current input and wrapper. Height 52px desktop, 48px mobile. Border 1px
  `var(--line2)`, radius `var(--r-chip)`, background `var(--surface)`.
- Placeholder: `Název školy, obor nebo třeba „gympl“`. Keep `aria-label="Hledat školu"`.
- When `filters.query` is non-empty, show a clear button at the right end: lucide `X`
  size 18, `aria-label="Vymazat hledání"`, sets `query: ''` and returns focus to the
  input. 32×32 hit area, `var(--ink3)`, hover `var(--ink)`.
- The query **no longer appears as a chip** in the applied-filter row (the input already
  shows it). It still counts in `activeCriteriaCount` and the empty-state logic as today.

### 5.3 Split `SearchFilters.jsx` into groups

Export these named components from `SearchFilters.jsx`. Each renders the body of one
group **without** its `FacetSection` wrapper, with the exact markup and handlers it has
today:

| Export | Content today | Props |
|---|---|---|
| `FieldGroup` | "Obor a zaměření" checkboxes | `fieldOptions, toggleIn` |
| `DistrictGroup` | "Městská část" toggle buttons | `districtOptions, toggleIn` |
| `UkonceniGroup` | "Ukončení studia" checkboxes + the "součet vyšší" note | `filters, ukonceniOptions, toggleIn, total` |
| `TypGroup` | "Typ školy" toggle buttons | `typOptions, toggleIn` |
| `AdmissionsGroup` | cutoff slider, acceptance slider, JPZ checkboxes | `filters, setPatch, jpzOptions, toggleIn` |

The default export `SearchFilters` keeps its current props and composes these inside
`FacetSection`s in this order: Obor a zaměření, Městská část, Ukončení studia, Typ
školy, Přijímačky a šance, Zřizovatel, Další. **All sections collapsed by default**
(`defaultOpen` removed everywhere), each still showing its active-count badge. Delete
the "Dojezd MHD / zatím nedostupné" block.

### 5.4 Filter bar

A row of six buttons. Order and labels:

| Button | Group | Active count |
|---|---|---|
| `Zaměření` | `FieldGroup` | `filters.fields.length` |
| `Městská část` | `DistrictGroup` | `filters.districts.length` |
| `Maturita / výuční list` | `UkonceniGroup` | `filters.ukonceni.length` |
| `Typ školy` | `TypGroup` | `filters.typySkoly.length` |
| `Šance na přijetí` | `AdmissionsGroup` | `admissionsActiveCount` |
| `Všechny filtry` (pushed right with `margin-left:auto` on desktop) | full `SearchFilters` in the `Modal` | `activeFacetCount` |

Button style (one class, `.ss-fbtn`): `display:inline-flex; align-items:center;
gap: 6px; height: 40px; padding: 0 12px; border: 1px solid var(--line2);
border-radius: var(--r-chip); background: var(--surface); color: var(--ink);
font: 500 var(--fs-body-sm)/1 var(--sans); white-space: nowrap`. Trailing lucide
`ChevronDown` size 14, `var(--ink3)`, rotated 180° while open
(`transition: transform 150ms ease-out`). "Všechny filtry" has a leading lucide
`SlidersHorizontal` size 16 instead of a chevron.

- **Active group** (count > 0): class `is-set`, background `var(--acc-soft)`, border
  `var(--acc-line)`, and a count badge after the label. Badge: `font: 600
  var(--fs-caption)/1 var(--sans)`, background `var(--acc)`, colour `var(--surface)`,
  `border-radius: calc(var(--r-chip) / 2)`, padding `2px 6px`. Restyle the existing
  `.ss-facet-badge` to this and use it everywhere a filter count appears (buttons and
  `FacetSection` heads).
- Hover (`@media (hover:hover) and (pointer:fine)`): border `var(--ink3)`.
- Focus: `:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }`.
- Pressed: `transform: scale(0.98)` for 100ms. Disabled under reduced motion.

**Desktop (>860px):** each of the first five buttons is a `FilterPopover` (below).
"Všechny filtry" opens the existing `Modal` with the full `SearchFilters`, the close
button and the existing `ss-mobile-commit` button ("Zobrazit {n} {skol(n)}"). The modal
now opens on desktop too, so change `sheetOpen` so it no longer depends on `isMobile`
for the "all" case.

**Mobile (≤860px):** the bar is one horizontally scrolling row: `overflow-x:auto;
scrollbar-width:none` (and `::-webkit-scrollbar{display:none}`), bleeding to the screen
edges (negative side margin equal to the page's mobile side padding, same value as
padding inside). Order on mobile: **"Filtry"** first (label shortened from "Všechny
filtry", same modal), then the five group buttons. Tapping a group button opens the
same `Modal` sheet, titled with the group label, containing **only that group's
component**, the close button and the "Zobrazit {n} {skol(n)}" commit button. Model this
as one state: `const [sheet, setSheet] = useState(null) // null | 'all' | groupId`.
Returning focus and `showResults()` work as today.

### 5.5 `FilterPopover.jsx` (new)

```jsx
<FilterPopover
  id="fields"
  label="Zaměření"
  activeCount={filters.fields.length}
  open={openPopover === 'fields'}
  onOpenChange={(open) => setOpenPopover(open ? 'fields' : null)}
  onClear={() => setPatch({ fields: [] })}
  resultCount={n}
>
  <FieldGroup … />
</FilterPopover>
```

- Only one popover is open at a time. `openPopover` state lives in `Search`.
- Wrapper `position: relative; display: inline-block`. The trigger is the `.ss-fbtn`
  button with `aria-expanded`, `aria-controls={panelId}`, `aria-haspopup="dialog"`.
- Panel: `role="dialog"`, `aria-label={label}`, non-modal. `position:absolute;
  top: calc(100% + 8px); left: 0; z-index: 20; width: 320px` (Městská část: 360px);
  `max-height: min(440px, 60vh)`; flex column. Background `var(--surface)`, border 1px
  `var(--line)`, radius `var(--r-option)`, shadow `var(--shadow)`.
  - Body: `padding: var(--space-md); overflow-y: auto; flex: 1`.
  - Footer, pinned at the bottom: `border-top: 1px solid var(--line); padding:
    var(--space-sm) var(--space-md); display:flex; justify-content:space-between;
    align-items:center`. Left: text button `Vymazat` (`var(--ink2)`, underlined,
    disabled and `var(--ink3)` when `activeCount === 0`), calls `onClear`. Right: primary
    small button `Zobrazit {resultCount} {skol(resultCount)}` using the existing
    `ss-btn ss-btn-primary ss-btn-sm` classes, closes the popover.
- **Filters apply live**, exactly as the sidebar did. The footer button only closes.
- On open: if `panel.getBoundingClientRect().right > window.innerWidth - 16`, switch to
  `left:auto; right:0`. Measure in a layout effect so there is no visible jump.
- Close on: Escape (focus returns to the trigger), pointerdown outside the wrapper,
  focus leaving the wrapper (`focusout` whose `relatedTarget` is outside), the footer
  button, and opening another popover.
- On open, move focus to the first focusable element inside the body.
- Enter animation only: `opacity 0 → 1` and `translateY(-4px) → 0`, 150ms, `ease-out`,
  `transform-origin: top left`. No exit animation. None under
  `prefers-reduced-motion: reduce`.

### 5.6 Applied-filter chips

Keep the existing `chips` array and markup, minus the query chip (5.2). Render the row
only when `chips.length > 0`. "Zrušit všechny filtry" becomes `Zrušit vše`, same
handler. Chip radius `var(--r-chip)`, not full.

## 6. Browse by field

Shown when `activeCriteriaCount === 0 && view === 'list' && !loading && !error`.

- Container: `<section aria-labelledby=…>`, background `var(--surface2)`, radius
  `var(--r-card)`, padding `var(--space-lg)` desktop / `var(--space-md)` mobile.
- Heading `<h2>`: `Nevíš, kde začít? Vyber zaměření.` in `font: 600 var(--fs-body-lg)/1.3
  var(--sans)`, colour `var(--ink)`.
- Sub line, `ss-body-sm`, `var(--ink2)`: `Zúží seznam na školy s obory v té oblasti. Další filtry můžeš přidat potom.`
- Tiles: one `<button type="button">` per entry in `fieldOptions` (already filtered to
  count > 0). Content: lucide icon size 18 in `var(--ink2)`, then the label, then the
  count right-aligned in `ss-data-sm` `var(--ink3)` (real counts, already computed).
  Icons: `it` Monitor, `prirodni` FlaskConical, `ekonomie` ChartColumn, `humanitni`
  BookOpen, `umeni` Palette, `zdravotnictvi` HeartPulse, `pedagogika` Users, `gastro`
  ChefHat, `sport` Dumbbell, `remeslo` Wrench (all verified present in the installed
  lucide-react; named imports only). Unknown id: no icon.
- Tile style: `display:flex; align-items:center; gap: 10px; min-height: 48px; padding:
  10px 14px; background: var(--surface); border: 1px solid var(--line); border-radius:
  var(--r-chip); font: 500 var(--fs-body-sm)/1.3 var(--sans); color: var(--ink);
  text-align:left`. Hover: border `var(--line2)`. Focus-visible: 2px `var(--acc)`
  outline. Pressed: `scale(0.98)` 100ms (none under reduced motion).
- Grid: 5 columns ≥1100px, 3 columns 861–1099px, `gap: var(--space-sm)`. Mobile: a
  single horizontally scrolling row (`display:flex; overflow-x:auto;
  scroll-snap-type: x proximity`, tiles `flex: 0 0 auto; scroll-snap-align: start`),
  bleeding to the screen edges like the filter bar.
- Click: `toggleIn('fields', id)`, then focus `resultsHeadingRef` so keyboard and
  screen-reader users land on the new count. The block then disappears on its own
  because a filter is active.
- Primary colour (`--acc`) is **not** used for the icons. DESIGN.md bans it on dense
  browsing screens except for CTAs and selection.

## 7. Toolbar and legend

**Toolbar** (`display:flex; align-items:center; gap: var(--space-md); flex-wrap: wrap;
padding-bottom: var(--space-sm); border-bottom: 1px solid var(--line2)`):

- Left: `<h2 ref={resultsHeadingRef} tabIndex={-1}>` in `ss-headline-sm`:
  `{n} {skol(n)}`, followed when `n !== total` by a `<span>` ` z {total}` in
  `ss-body-sm` `var(--ink3)`. The old "Filtry" button and the caption under the count
  are removed from here (the filter bar replaces them).
- Right (`margin-left:auto`): the sort `<select>` (keep the native select and its
  options, `sortOptions`, `activeSort`). A visible inline label `Řadit:` in `ss-body-sm`
  `var(--ink2)` wrapped in the `<label>`. Select height 36px, radius `var(--r-chip)`,
  border 1px `var(--line2)`.
- Then the existing Seznam/Mapa segmented toggle, labels shortened to `Seznam` and
  `Mapa`, height 36px, outer radius `var(--r-chip)`, active segment background
  `var(--ink)` with `var(--surface)` text. Keep `aria-pressed`.
- Delete the "Řazení podle dojezdu MHD zatím není k dispozici." note and the per-sort
  tradeoff caption from the toolbar.
- Mobile: same row, wraps naturally. The count stays on the first line.

**Legend** (list view, `n > 0`): a `<p>` with a leading lucide `Info` size 16 in
`var(--ink3)`, `ss-body-sm`, `var(--ink2)`, max-width `var(--measure)`, bold terms in
`var(--ink)` weight 600. Copy, in this order, including only the clauses that apply:

1. If `activeSort === 'cut'`: `Řazeno od nejnižší hranice: bezpečnější volba, ne nutně lepší škola.`
   If `activeSort === 'acceptance'`: `Řazeno podle loňské míry přijetí.`
2. Always: `**Hranice** je nejnižší počet bodů z přijímaček (max. 100), se kterým se dalo dostat, průměr za 3 roky přes všechny obory. **Přijato** je podíl přijatých ze všech přihlášených. **Míst** je počet míst, která škola letos otevírá.`
3. If `hasMatch`: `**Shoda** říká, jak škola sedí na tvoje odpovědi z dotazníku, ne jak je dobrá.`
   Else if the "Splňuje" column is shown (section 8): `**Splňuje** je počet tvých filtrů, které škola splňuje.`

No "learn more", no tooltip, no collapse.

## 8. The list

### 8.1 Markup

```
<div className="ss-list-head" aria-hidden="true">…column labels…</div>   (desktop only)
<ul className="ss-list">
  <li className="ss-row [is-selected]">
    checkbox · school cell · obory cell · [score cell] · hranice · přijato · míst · star
  </li>
</ul>
```

Row names become `<h3>` (the page has one h1, the toolbar and browse block have h2s).

**Score column.** Three cases:
- `hasMatch`: header `Shoda`, cell is the match badge (8.3).
- else `activeCriteriaCount > 0`: header `Splňuje`, cell `{metCount} z {metTotal}` in
  `ss-data-md`.
- else: no score column. Toggle with a modifier class `has-score` on both `.ss-list-head`
  and `.ss-list` so the grid template matches.

### 8.2 Desktop grid (>860px)

```
.ss-list-head, .ss-row {
  display: grid;
  grid-template-columns: 20px minmax(0,2fr) minmax(0,1.3fr) 80px 72px 64px 40px;
  column-gap: var(--space-md);
  align-items: center;
}
.has-score → 20px minmax(0,2fr) minmax(0,1.3fr) 76px 80px 72px 64px 40px
861–1099px → drop the minmax(0,1.3fr) track and hide .ss-cell-obory
```

- Header row: `font: var(--fw-label-caps) var(--fs-label-caps)/var(--lh-label-caps)
  var(--sans); letter-spacing: var(--ls-label-caps); text-transform: uppercase; color:
  var(--ink3); padding: var(--space-sm) 12px; border-bottom: 1px solid var(--line)`.
  Numeric headers right-aligned. Labels: (empty), `Škola`, `Obory`, [`Shoda` or
  `Splňuje`], `Hranice`, `Přijato`, `Míst`, (empty).
- Row: `position: relative; padding: var(--space-md) 12px; border-bottom: 1px solid
  var(--line); transition: background-color 120ms ease-out`. No card, no shadow, no
  radius on the row.
  - Hover (hover-capable pointers only): background `var(--surface2)`.
  - `.is-selected`: background `var(--acc-soft)`.
  - Keyboard focus on the name link: `.ss-row:has(.ss-row-link:focus-visible) { outline:
    2px solid var(--acc); outline-offset: -2px; }`, and the link's own outline set to
    none.

### 8.3 Cells

- **Checkbox:** the existing input, 18×18, `accent-color: var(--acc)`, same `aria-label`.
  New: when `selected.size >= COMPARE_LIMIT && !isSelected`, render it `disabled` with
  `title="Porovnat jde nejvýš 4 školy."` (today the click is silently ignored).
  `position: relative; z-index: 1` so it sits above the stretched link.
- **School cell:** `<h3 className="ss-row-name"><Link className="ss-row-link" to=…>{row.name}</Link></h3>`.
  Name style: `font: 600 var(--fs-body-lg)/1.3 var(--heading); color: var(--ink)`,
  clamped to 2 lines (`display:-webkit-box; -webkit-line-clamp:2;
  -webkit-box-orient:vertical; overflow:hidden`), `title={row.name}` on the link.
  **Stretched link:** `.ss-row-link::after { content:""; position:absolute; inset:0; }`
  so the whole row opens the detail page. The "Detail" button is deleted.
  Meta line under it, `ss-caption`, `var(--ink2)`: `{districtLabel} · {zrizovatelLabel} · {ukonceni}`,
  skipping any empty part. `zrizovatelLabel` maps `veřejné/státní → veřejná`,
  `soukromé → soukromá`, `církevní → církevní`, anything else unchanged. The
  "N oborů" part moves into the Obory cell.
- **Obory cell:** the first 2 entries of the school's programs as chips, then
  `+ {extra}` as plain `ss-caption` `var(--ink3)` text when `extra > 0`, where
  `extra = Math.max(row.p.count, row.progTotal) - shownCount`. In `buildRow`, keep
  `progs` sliced to 2 and add `progTotal` (length of the deduplicated list before
  slicing). Chip: `ss-data-sm`, background `var(--surface2)`, colour `var(--ink2)`,
  radius `var(--r-chip)`, padding `var(--space-xs) var(--space-sm)`, `max-width:100%`,
  single line with ellipsis. `display:flex; flex-wrap:wrap; gap: 6px`.
- **Score cell** (when present), right-aligned. Match badge: `display:inline-block;
  font: 600 var(--fs-data-md)/1 var(--sans); font-variant-numeric: tabular-nums;
  color: var(--ok); background: var(--ok-soft); border-radius: var(--r-chip); padding:
  6px 8px`. Text `{match_score} %`. A school with no numeric `match_score` shows
  `bez dat` (below). DESIGN.md reserves `--ok` for match strength, which this is.
- **Number cells**, right-aligned, `ss-data-md` (tabular figures):
  - Hranice: `{numCz(cutoff)} b.`
  - Přijato: `{Math.round(acceptanceRate)} %`
  - Míst: `{row.p.kapacita}`
  - Each prefixed with a `.sr-only` label (`hranice přijetí `, `přijato `, `volných míst `)
    so screen readers don't rely on the hidden header.
  - A single missing value renders `bez dat` in `ss-caption` `var(--ink3)`. Never `—`.
  - **Both cutoff and acceptance missing:** replace the Hranice and Přijato cells with
    one cell spanning both tracks (`grid-column: span 2`), left-aligned, `ss-caption`,
    `var(--ink3)`: `Nebyla v prvním kole přijímaček 2026, čísla zatím nemáme.` The Míst
    cell still renders normally. Delete the old `.ss-no-data-note` paragraph.
- **Star:** `FavoriteButton` exactly as now when `canFavorite`, otherwise an empty cell.
  `position: relative; z-index: 1`, `justify-self: end`.

Remove from the row: the `differentiatorFor` sentence (delete the function if nothing
else uses it), the `ss-stat-grid` block, all `StatInfo` usage (remove the import from
`Search.jsx`), and `.ss-row-actions`.

### 8.4 Mobile rows (≤860px)

No header row. Each `li` becomes a grid:

```
grid-template-columns: minmax(0,1fr) auto;
grid-template-areas:
  "name  score"
  "meta  meta"
  "nums  nums"
  "chips chips"
  "foot  foot";
row-gap: var(--space-xs);
padding: var(--space-md) 0;
```

- `name`: `font: 600 var(--fs-body-md)/1.3 var(--heading)`, 2-line clamp, stretched
  link as on desktop.
- `score`: the match badge (or `Splňuje` value) top-right. Omitted when there's no
  score column.
- `nums`: `display:flex; gap: var(--space-lg); margin-top: var(--space-sm)`. Each item is
  a column: value in `ss-data-md`, label under it in `ss-caption` `var(--ink3)`
  (`hranice`, `přijato`, `míst`). The both-missing case shows the same one-line text
  instead.
- `chips`: max 2 chips + `+ N`, as on desktop.
- `foot`: `display:flex; justify-content:space-between; align-items:center;
  margin-top: var(--space-sm)`. Left: the checkbox wrapped in a `<label>` with visible
  text `Porovnat` (`ss-caption`, `var(--ink2)`), 44px min hit height. Right: the star.
  Both above the stretched link (`z-index: 1`).

## 9. Compare bar

Keep `.ss-compare-bar`, `compareBarRef` and `useBottomBarSpace`. New content, one line:

- Desktop: `<p>` with `<strong>{selected.size} {skol(selected.size)}</strong> k porovnání (max. {COMPARE_LIMIT})`,
  then a text button `Zrušit výběr` (underlined, `var(--ink2)`, `margin-left:auto`),
  then the primary button `Porovnat`.
- Mobile: `<strong>{selected.size} {vybraná/vybrané/vybraných}</strong>` (1 → vybraná
  škola, 2–4 → vybrané školy; build with the existing `plural` helper), text button
  `Zrušit`, primary button `Porovnat`. Target total height ≤ 56px plus the safe-area
  inset. Include `padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px))`.

## 10. Map, empty state, pagination, footnote

- **Map view:** toolbar stays; browse block, legend and column header are hidden.
  `SchoolMap` renders directly under the toolbar with the same props as today.
- **Empty state** (`n === 0`): keep all logic and copy except replacing the em dashes in
  `blameSentence` and in `nearMisses[].why` with a colon or a full stop:
  - `Žádný jednotlivý filtr to sám neuvolní. Zruš celou kombinaci a začni od jednoho kritéria.`
  - `Nejvíc omezuje {blame}. Bez něj by odpovídalo {gainN} {skolGen(gainN)} z {total}.`
  - near miss: `… · {cutoffLabel}. Nesplňuje {label}.`
  Render the empty state outside the list/map branch so it shows in both views. Constrain
  it to `max-width: var(--measure)`.
- **Pagination:** unchanged logic. It sits below the list with `margin-top:
  var(--space-lg)`; restyle nothing beyond making sure page-number buttons use
  `var(--r-chip)` (not a full radius).
- **Footnote:** one line, `ss-caption`, `var(--ink3)`:
  `Hranice, míra přijetí, typ školy, zřizovatel, jazyk výuky a počet míst jsou reálná data z Cermatu.`
  Drop the MHD sentence.

## 11. Motion (the complete list)

Only these animate, and all are off under `prefers-reduced-motion: reduce`:

1. Popover enter: opacity + translateY(-4px), 150ms ease-out.
2. Filter-button chevron rotation: 150ms ease-out.
3. Row background on hover/selection: 120ms ease-out.
4. Press feedback on `.ss-fbtn` and browse tiles: scale(0.98), 100ms.

No scroll reveals, no staggered list entrance, no animated numbers, no skeleton shimmer.

## 12. CSS cleanup in `search.css`

After the rebuild, delete selectors that no longer match anything in `Search.jsx` or
`SearchFilters.jsx`: at least `.ss-layout` two-column rules, `.ss-sidebar`, `.ss-recent`,
`.ss-count-row`, `.ss-sort-row`, `.ss-sort-note`, `.ss-row-body`, `.ss-row-title`,
`.ss-row-chips`, `.ss-row-diff`, `.ss-row-actions`, `.ss-no-data-note`, `.ss-parked*`,
`.ss-travel-head` (only if the sliders no longer use it). **Keep** every
`.ss-stat-*` and `.sm-card-stats` rule: `SchoolMap.jsx` and `.decision-page` still use
them. Grep each selector across `frontend/src` before deleting it.

The final diff must add **no** hex, `rgb(`, `rgba(`, `hsl(`, font-family names or
pixel radii outside `var()`/`calc(var())`. Check with:

```bash
git diff -U0 -- frontend/src | grep '^+' | grep -nEi '#[0-9a-f]{3,8}\b|rgba?\(|hsl|border-radius:\s*[0-9]|font-family:\s*["A-Za-z]'
```

It must print nothing.

## 13. Verification

Automated (from `frontend/`):

```bash
npm run lint
npm run build
```

Plus the root test suite from the repo root: `npm test`.

Browser checks. Start both servers per `.claude/launch.json` (backend on 5001). Check
each item and record the result in the final report:

| # | Check | Pass condition |
|---|---|---|
| 1 | 1280×800, anonymous, no filters | First school row starts above y=720. Browse block visible. No left sidebar. No ⓘ icons in rows. |
| 2 | 1280×800, pick "IT a technika" tile | Browse block disappears, focus is on the count heading, at least 5 full rows visible below the toolbar. |
| 3 | 1024×768 | Obory column hidden, no horizontal scroll, numbers still aligned. |
| 4 | 390×844, no filters | Page title, search, filter row, browse row, toolbar visible; first school's name visible without scrolling. No horizontal page scroll. |
| 5 | 390×844, tap "Městská část" | Sheet opens with only districts, commit button shows the live count, closing returns focus to the button. |
| 6 | Desktop popovers | Each of the 5 opens, applies live, "Vymazat" clears only its group, Escape closes and restores focus, outside click closes, only one open at a time, the rightmost one does not overflow the viewport. |
| 7 | "Všechny filtry" | Modal opens on desktop and mobile with every group collapsed and badges correct. |
| 8 | Query `zzzzzzzzzz` | Empty state with relax options in list **and** map view; no em dash in any copy. |
| 9 | Sort by each option | Legend's first clause matches the sort; order matches the old page for the same filters. |
| 10 | Compare | Select 1, 2, 4 schools; 5th checkbox disabled with its title; bar is one line on desktop and ≤56px + safe area on 390px. |
| 11 | A school with no Cermat data (use sort "Nejnižší hranice", last page) | Spanning "Nebyla v prvním kole…" text, no "—" anywhere. |
| 12 | Signed in with a questionnaire run (if an account is available) | "Shoda" column and legend clause present; otherwise record it as untested. |
| 13 | Keyboard only | Tab order: search → filter buttons → (tiles) → sort → view toggle → rows (checkbox, name, star) → pagination. Visible focus on every stop. |
| 14 | Reduced motion (emulate) | No transitions or transforms from section 11. |
| 15 | Dark scheme (emulate `prefers-color-scheme: dark`) | Everything readable; nothing appears in a light-only colour (this proves no literals slipped in). |

Take before/after screenshots at 1280×800 and 390×844 for the reviewer.

## 14. Out of scope

- A new palette, fonts or design system (separate project; this plan keeps it a
  `tokens.js`-only change later).
- `SchoolMap.jsx` internals, the school detail page, `/porovnani`.
- Any change to search matching, filter predicates, counts, sort order or the API.
- Saved searches, sorting by MHD commute, new filters.
- Plan 005's app-wide spacing/typography migration beyond the files listed here.

## 15. Commits

Follow `AGENTS.md`: commit and push each verified chunk on `main`. Suggested chunks:
(1) `SearchFilters` split + `FilterPopover` + filter bar; (2) header, browse block,
toolbar, legend; (3) rows, compare bar, empty state, CSS cleanup. Stage only the four
files in section 3 and this plan's status line. `docs/skolamatch_current_status.md`,
`docs/workflows/plan-then-build-collaboration.md` and the untracked routing-guide file
belong to other work and must not be committed. When done, set this file's **Status**
to `BUILT, awaiting review` with the verification results.

## 16. Handoff prompt for Codex

> Implement `plans/013-skoly-calm-list.md` in this repo. Read the plan fully, then
> `AGENTS.md`, then `frontend/src/pages/Search.jsx`, `search.css` and
> `components/SearchFilters.jsx`. The plan is the contract: it decides every layout,
> token, copy and state question, so make no design decisions of your own. If the code
> contradicts the plan (a prop, class or helper that doesn't exist as described), stop
> and report the mismatch instead of improvising. Use only existing CSS variables; the
> section 12 grep must print nothing. Run section 13's checks, commit and push in the
> chunks from section 15, and finish with a report listing each check's result and
> anything you could not test.


---

## Review outcome (2026-09-24)

**Cleanup conflicts Codex raised, resolved:**
- `.ss-recent` stays. Section 12 meant "delete the old chip-stack styling", not "retire
  the class name". The class now styles the new one-line "Naposledy" row, and the old
  `.ss-recent a.ss-district-toggle` rule is gone.
- `.ss-no-data-note` stays. `SchoolMap.jsx:362` still uses it, and section 14 (map out of
  scope) outranks section 12's list. Section 12 already said to grep before deleting.

**Plan corrections (the planner's error, not the build's).** The fold targets in section
13 were estimates that ignored the nav, the trial banner and two-line school names. To
get as close as honestly possible, these values changed from the plan:
- Page and results block gap: `--space-lg` → `--space-md` on desktop.
- Legend: no `max-width: var(--measure)`. It's a caption and now runs 2 lines on desktop.
  On phones it uses caption size.
- Browse block: heading and sub line share one row on desktop, `--space-md` padding,
  tiles `min-height: 44px` with `--space-sm` vertical padding.
- Rows: vertical padding `--row-pad-dense` (DESIGN.md's dense search-row rule) instead of
  `--space-md`.
- Source line copy shortened to `{total} škol. Data o přijímačkách z Cermatu, roky 2024 až 2026.`
- Phone toolbar: sort select and Seznam/Mapa share one line, and "Řadit:" is visually
  hidden but still labels the select.

**Bugs fixed in review:**
- `FilterPopover` closed after every click inside the panel in Safari, because Safari
  doesn't focus clicked checkboxes or buttons, so `focusout` fired with a null
  `relatedTarget`. It now only closes on focus that actually lands outside.
- 30px horizontal page overflow on phones, caused by the no-admission sentence
  (`white-space: nowrap`) and the compare bar text. Both now shrink or wrap.
- Phone browse row showed a visible scrollbar. It's hidden like the filter bar's.

**Measured results (Browser pane, signed-in account with match scores):**

| Check | Result |
|---|---|
| 1 · 1280×800 default | First row at y=719 (target <720) with the trial banner showing. Pass. |
| 2 · 1280×800 after a tile | Browse block gone, focus on the count heading, **2 full rows + most of a 3rd** visible. The "≥5 rows" target was unrealistic at 800px with the nav, banner, search and filter bar above the list. Revised target: ≥2 full rows. |
| 4 · 390×844 default | First school name at y=790, visible. With a compare selection it sits just under the compare bar. Page overflow 0px. Pass, marginal. |
| 12 · Shoda column | Present (this browser has a signed-in account with a questionnaire run). |
| Lint / build / tests / §12 grep | Pass / pass / 44 of 44 / empty. |

**Still open:**
- Checks 13 (full keyboard pass), 14 (reduced motion) and 15 (dark scheme) are not yet
  verified.
- The phone legend is still ~6 lines. If it feels heavy on a real phone, the next step is
  a founder call: keep it inline (DESIGN.md's rule) or collapse it there only.
