# 014: Colour themes (Značka default + 3 options) and a light/dark switch

**Status:** APPROVED FOR BUILD, 2026-09-24. Planned by Claude Opus 5.5 (medium) against
commit `e412200`. Implementer: Codex (GPT-6 Luna max). Reviewer: Claude Opus 5.5 low
(diff + running app).

**Visual reference:** https://claude.ai/artifact/KziG32Ki2KCagBrM5eZE1G (the three
directions on the /skoly page). **Design source of truth:** `design/DESIGN.md`, which
was updated in the same commit as this plan: Značka palette, Archivo type, and the new
"Colors → Themes" section with the four rules every theme must follow. Read that
section before starting.

**Sequencing:** start only after plan 013's commits are on `main` (both touch
`search.css`). If 013 is still in progress, stop and report.

---

## 1. Outcome

- The app's default look becomes **Značka** (trail blue on cool grey paper, Archivo
  Narrow headings, Archivo text).
- Every signed-in user can pick a **colour theme** (Značka, Smrk, Zvýrazňovač,
  Terakota) and a **mode** (Podle zařízení / Světlý / Tmavý) in Nastavení → Vzhled.
- The choice is **saved to the account** and applied on every device after sign-in,
  with no flash of the wrong theme on reload.
- **Not in this plan:** the onboarding theme step (logged in `UNFORGET.md`, "Theme
  picker step in onboarding"), per-theme fonts, the mobile app.

## 2. Decisions already made (do not re-open)

1. Themes change **colour tokens only**. Fonts, spacing, radii and components are the
   same in every theme. No theme-specific CSS rules anywhere.
2. The theme values below are final and were contrast-checked: every text pair in all
   8 theme × mode combinations passes WCAG AA 4.5:1. Do not adjust them. If a screen
   looks wrong in a theme, report it; don't fix it with a per-theme override.
3. Mode `system` means "follow `prefers-color-scheme`", and it is the default.
4. Storage: two columns on `public.users`. The browser keeps a local copy **only** to
   avoid a flash before the profile loads. The account value always wins once loaded.
5. Access: `requireAuth` only (not `requireAccess`). An expired account can still
   change how its own settings page looks, like it can rename itself.

## 3. Files

| File | Change |
|---|---|
| `frontend/src/design/tokens.js` | Add `palettes`, `PALETTE_IDS`, `DEFAULT_PALETTE`; keep `light`/`dark` exports as aliases of Značka; per-palette `shadow`; fonts → Archivo Narrow / Archivo; update stale comments. |
| `frontend/scripts/gen-tokens-css.mjs` | Emit per-palette blocks (section 5). |
| `frontend/src/design/tokens.css` | Regenerated with `npm run tokens`, never hand-edited. |
| `frontend/index.html` | Font link → Archivo Narrow + Archivo; inline pre-paint theme script (section 6). |
| `frontend/src/lib/theme.js` | **New.** `applyTheme`, `readCachedTheme`, constants (section 6). |
| `frontend/src/components/AuthContext.jsx` | Apply the profile's theme after `fetchMe()` resolves. Expose nothing new beyond `profile`. |
| `frontend/src/api.js` | `updateProfile` accepts `{ name, themePalette, themeMode }` (any subset). |
| `frontend/src/pages/Settings.jsx` + its stylesheet | New "Vzhled" section (section 7). |
| `server.js` | `PROFILE_COLUMNS` + `PATCH /api/me` validation (section 4). |
| `supabase-setup.sql` | Two columns with checks (section 4). |
| Stylesheets with hardcoded colours | Replace with tokens (section 8). |
| `CLAUDE.md` + `AGENTS.md` | Update the "Design tokens" and font lines (section 9). |

## 4. Database and API

`supabase-setup.sql`, idempotent, next to the other `public.users` changes. Follow the
file's existing pattern for adding columns and named check constraints:

```sql
alter table public.users add column if not exists theme_palette text not null default 'znacka';
alter table public.users add column if not exists theme_mode    text not null default 'system';
-- named checks, guarded the way this file guards its other constraints:
--   users_theme_palette_check: theme_palette in ('znacka','smrk','zvyraznovac','terakota')
--   users_theme_mode_check:    theme_mode in ('system','light','dark')
```

No RLS change: clients still cannot update `users`; `server.js` writes it with the
service key.

The founder runs the SQL in the Supabase SQL editor. Put this one-line check in your
final report for them to run afterwards:

```sql
select column_name, column_default from information_schema.columns where table_schema='public' and table_name='users' and column_name like 'theme_%';
```

`server.js`:
- Add `theme_palette, theme_mode` to `PROFILE_COLUMNS`.
- `PATCH /api/me` accepts a JSON body with **any non-empty subset** of `name`,
  `theme_palette`, `theme_mode`. Keep the existing `name` validation and messages
  unchanged when `name` is present. `theme_palette` must be one of the four ids, and
  `theme_mode` one of the three. Otherwise answer `400 { error: 'Neplatný vzhled.' }`.
  An empty body (none of the three keys) → `400 { error: 'Není co uložit.' }`. Build
  the update object from validated keys only. Return `select('id, name, theme_palette,
  theme_mode')`.
- If the root test suite has server/API tests, add cases: valid palette, valid mode,
  invalid palette, invalid mode, empty body, name-only still works.

`frontend/src/api.js`: `updateProfile({ name, themePalette, themeMode })` sends only the
keys that are not `undefined`, mapped to `name`, `theme_palette`, `theme_mode`. Existing
callers passing `{ name }` keep working.

## 5. Tokens

### 5.1 `tokens.js`

Replace the `light` and `dark` objects with this `palettes` export. The values are
final; copy them exactly:

```js
export const palettes = {
  znacka: {
    light: { bg:'#F5F6F7', surface:'#F5F6F7', surface2:'#EAEDEF', ink:'#15191E', ink2:'#4B525B', ink3:'#5F6670', line:'#DCE0E4', line2:'#C4CBD2', accent:'#1C58A3', accentInk:'#F5F6F7', accentSoft:'#E1EAF6', accentLine:'#8FB0DA', ok:'#2C7340', okSoft:'#E0EFE3', danger:'#B0271F', dangerSoft:'#F7E1DF', board:'#E6EAED', frost:'rgba(245,246,247,0.82)', glow:'rgba(28,88,163,0.12)' },
    dark:  { bg:'#131518', surface:'#1A1D21', surface2:'#22262B', ink:'#E7EAEE', ink2:'#B8BFC8', ink3:'#939BA5', line:'#2A2F35', line2:'#3A4047', accent:'#7FA8E6', accentInk:'#10151C', accentSoft:'#1D2B3F', accentLine:'#3F5F8C', ok:'#7DC08E', okSoft:'#1B2E21', danger:'#EE8A80', dangerSoft:'#3A1F1C', board:'#0E1012', frost:'rgba(26,29,33,0.78)', glow:'rgba(127,168,230,0.15)' } },
  smrk: {
    light: { bg:'#F3F5F2', surface:'#F3F5F2', surface2:'#E6ECE7', ink:'#14201A', ink2:'#475650', ink3:'#5C6A63', line:'#D7DFD9', line2:'#BFCAC2', accent:'#1D5842', accentInk:'#F3F5F2', accentSoft:'#DAE9E0', accentLine:'#8DB5A2', ok:'#855A13', okSoft:'#F4E7CF', danger:'#9A2E22', dangerSoft:'#F4DFDA', board:'#E3E9E4', frost:'rgba(243,245,242,0.82)', glow:'rgba(29,88,66,0.12)' },
    dark:  { bg:'#0F1613', surface:'#151E1A', surface2:'#1C2722', ink:'#E3EAE5', ink2:'#AEBBB3', ink3:'#8E9C95', line:'#243029', line2:'#344239', accent:'#86C2A5', accentInk:'#0F1613', accentSoft:'#1A3027', accentLine:'#3E6B57', ok:'#E1B770', okSoft:'#33291A', danger:'#E9907F', dangerSoft:'#3A201B', board:'#0A0F0D', frost:'rgba(21,30,26,0.78)', glow:'rgba(134,194,165,0.15)' } },
  zvyraznovac: {
    light: { bg:'#FAFAF8', surface:'#FAFAF8', surface2:'#EFEEEA', ink:'#151412', ink2:'#4E4B45', ink3:'#6A675F', line:'#E3E1DA', line2:'#CDCAC0', accent:'#151412', accentInk:'#FAFAF8', accentSoft:'#FBEFB8', accentLine:'#D9B52E', ok:'#6B5300', okSoft:'#F9E27E', danger:'#B3301D', dangerSoft:'#F8E0DA', board:'#ECEBE6', frost:'rgba(250,250,248,0.82)', glow:'rgba(246,207,63,0.25)' },
    dark:  { bg:'#161512', surface:'#1D1B18', surface2:'#25231F', ink:'#F0EDE5', ink2:'#BDB8AD', ink3:'#9C978E', line:'#2D2A25', line2:'#3D3A33', accent:'#F6CF3F', accentInk:'#161512', accentSoft:'#3A3217', accentLine:'#8C7628', ok:'#F6CF3F', okSoft:'#3A3217', danger:'#F0957F', dangerSoft:'#3B211B', board:'#100F0D', frost:'rgba(29,27,24,0.78)', glow:'rgba(246,207,63,0.15)' } },
  terakota: {
    light: { bg:'#FAF6EF', surface:'#FAF6EF', surface2:'#F1ECE3', ink:'#221A13', ink2:'#6B6259', ink3:'#6F6557', line:'#E6DFD1', line2:'#D6CBB6', accent:'#AD4F2A', accentInk:'#FAF6EF', accentSoft:'#F6E3D6', accentLine:'#DFA98C', ok:'#4F7143', okSoft:'#E6EDDE', danger:'#7A3020', dangerSoft:'#F5E2DC', board:'#EFE9DC', frost:'rgba(250,246,239,0.82)', glow:'rgba(173,79,42,0.12)' },
    dark:  { bg:'#17130E', surface:'#1F1911', surface2:'#2A2216', ink:'#F2ECE2', ink2:'#D8CFC2', ink3:'#B3A895', line:'#362C1E', line2:'#4A3D2B', accent:'#E08A5C', accentInk:'#17130E', accentSoft:'#3A2617', accentLine:'#7A5540', ok:'#8FB57E', okSoft:'#24301F', danger:'#C97F6A', dangerSoft:'#33201A', board:'#100D09', frost:'rgba(31,25,17,0.78)', glow:'rgba(224,138,92,0.15)' } },
};
```

Then:

```js
export const PALETTE_IDS = ['znacka', 'smrk', 'zvyraznovac', 'terakota'];
export const DEFAULT_PALETTE = 'znacka';
// Back-compat for anything importing the old names (and the future RN app):
export const light = palettes.znacka.light;
export const dark = palettes.znacka.dark;
```

**Shadow per palette.** Today `--shadow` is one static value tinted with the old
terracotta ink. Make it part of each palette so it follows the theme. Add a `shadow` key
to every light and dark object, derived mechanically. Don't pick values by eye:
- light: `0 1px 2px rgba(R,G,B,.05), 0 18px 40px -20px rgba(R,G,B,.18)` where R,G,B is
  that palette's `ink`.
- dark: `0 1px 2px rgba(R,G,B,.40), 0 18px 40px -20px rgba(R,G,B,.60)` where R,G,B is
  that palette's `board`.
Emit it as `--shadow` from `cssVarsText` (move it out of the static block if it lives
there today).

**Fonts.** `fonts.heading: 'Archivo Narrow'`, `fonts.body: 'Archivo'` (keep the
existing key names). Stacks: heading `'Archivo Narrow', 'Arial Narrow', system-ui,
sans-serif`; body `'Archivo', system-ui, 'Segoe UI', sans-serif`. Keep the type scale's
sizes, line heights and tracking. Where a scale entry has weight `'500'` for a
heading-family style, keep it (Archivo Narrow has 500).

**Comments.** The long comment blocks above the old `light`/`dark` objects describe the
warm-paper/terracotta rationale. Replace them with a short pointer: "Values and the
rules every theme must satisfy: design/DESIGN.md → Colors → Themes. Contrast verified
for all 8 combinations 2026-09-24; don't edit values without re-running the pairs
listed there."

### 5.2 `gen-tokens-css.mjs`

Emit, in this order (static vars once, in the first block):

```css
:root { <static vars> <znacka light> }
:root[data-palette='smrk'] { <smrk light> }
:root[data-palette='zvyraznovac'] { <zvyraznovac light> }
:root[data-palette='terakota'] { <terakota light> }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { <znacka dark> }
  :root[data-palette='smrk']:not([data-theme='light']) { <smrk dark> }
  … one per palette
}

:root[data-theme='dark'] { <znacka dark> }
:root[data-palette='smrk'][data-theme='dark'] { <smrk dark> }
… one per palette
```

`znacka` has no `[data-palette]` block of its own; it's the bare `:root` default, so the
app looks right before any script runs. The attribute names are `data-palette` and
`data-theme` (the latter already exists in the generated file). Also set
`color-scheme: dark` inside every dark block and `color-scheme: light` in the bare
`:root`, so native controls and scrollbars follow.

Run `npm run tokens` and commit the regenerated `tokens.css`.

## 6. Applying the theme

### 6.1 `frontend/src/lib/theme.js` (new)

```js
import { PALETTE_IDS, DEFAULT_PALETTE } from '../design/tokens';
export const MODES = ['system', 'light', 'dark'];
export const THEME_CACHE_KEY = 'skolamatch.theme';

export function applyTheme(palette, mode) {
  // Validate, fall back to DEFAULT_PALETTE / 'system'.
  // palette === 'znacka' → remove data-palette; else set it.
  // mode === 'system'    → remove data-theme;   else set it to 'light'|'dark'.
  // Write { palette, mode } to localStorage under THEME_CACHE_KEY inside try/catch.
}
export function readCachedTheme() { /* try/catch, validated, default {znacka, system} */ }
```

### 6.2 Pre-paint script in `index.html`

A small inline `<script>` in `<head>` (before the stylesheet link and the module
script) that reads `localStorage['skolamatch.theme']` inside try/catch, validates both
values against the same literal lists, and sets the two attributes on
`document.documentElement`. No imports, under 20 lines. This prevents a flash of Značka
for someone who picked Smrk.

### 6.3 `AuthContext.jsx`

After `fetchMe()` resolves with a profile, call
`applyTheme(profile.theme_palette, profile.theme_mode)`. Do nothing on sign-out: the
device keeps the last theme until another account's profile loads. Signed-out pages
and onboarding use whatever is cached, or Značka/system.

## 7. Nastavení → Vzhled

New `<section className="panel panel-lg settings-section">` placed **between "Profil"
and "Zabezpečení"**, using the existing `settings-section-head` / `settings-section-title`
/ `settings-section-text` markup.

- Title: `Vzhled`
- Text: `Barvy a režim se uloží k tvému účtu, takže je uvidíš na každém zařízení.`

**Barvy**: `<fieldset>` with `<legend>` `Barvy` (visually styled like the existing row
labels), a radio group of 4 cards in this order. Native `<input type="radio"
name="theme-palette">` inside a `<label>` card, so arrow keys work.

| id | Name | Description |
|---|---|---|
| `znacka` | Značka | Modrá jako turistická značka. Výchozí. |
| `smrk` | Smrk | Tmavě zelená, klidná. |
| `zvyraznovac` | Zvýrazňovač | Černá a žlutá jako zvýrazňovač. |
| `terakota` | Terakota | Teplá cihlová, původní barvy ŠkolaMatch. |

Card layout: name (`label-md`, `var(--ink)`) and description (`caption`, `var(--ink2)`)
on the left. On the right, a preview of **that card's own** palette: three 20×20
squares (its `bg` with a 1px `line2` border, its `accent`, its `okSoft` with a centred
6px `ok` dot). Take the preview colours from `palettes[id][effectiveMode]` in
`tokens.js` via inline `style`, because previews must show their own theme, not the
active one. `effectiveMode` = the selected mode, or `matchMedia('(prefers-color-scheme:
dark)')` when the mode is `system`. These inline styles read token data and do not
count as hardcoded colours.
- Card: `padding: var(--space-md)`, `border: 1px solid var(--line2)`, `border-radius:
  var(--r-option)`, `background: var(--surface)`. Selected (`:has(input:checked)`):
  `background: var(--acc-soft)`, `border: 1.5px solid var(--acc)` (the DESIGN.md
  option-row-selected rule). Focus-visible on the input → 2px `var(--acc)` outline on
  the card. The radio itself is visually hidden (`.sr-only`); selection is shown by the
  card state plus a lucide `Check` (16px, `var(--acc)`) after the name when selected,
  so state never relies on colour alone.
- Grid: 2 columns ≥ 600px, 1 column below, `gap: var(--space-sm)`.

**Režim**: `<fieldset>` with `<legend>` `Režim`, three radios styled as one segmented
control (same look as the /skoly Seznam/Mapa toggle from plan 013): `Podle zařízení`
(`system`), `Světlý` (`light`), `Tmavý` (`dark`). Below it, `caption` `var(--ink3)`:
`„Podle zařízení“ se řídí nastavením telefonu nebo počítače.`

**Behaviour** (both groups):
1. On change: `applyTheme()` immediately (instant preview), then `updateProfile()` with
   only the changed key.
2. While saving, don't block further changes. If a later change supersedes an earlier
   in-flight save, ignore the earlier response.
3. On failure: re-apply the last saved values and show the existing toast pattern with
   `Vzhled se nepodařilo uložit. Zkus to prosím znovu.`
4. On success: no toast (the page already visibly changed). Update the profile in
   `AuthContext` so a later `fetchMe` doesn't fight the new value. Use whatever setter
   or refresh the context already exposes. If none exists, add a minimal
   `setProfile`-style updater to the context value, nothing more.
5. The page-level transition: none. Don't animate colour changes.

## 8. Remove hardcoded colours

Themes only reach what uses tokens. Replace every colour literal outside `tokens.js`
with a token. Find them with:

```bash
grep -rnE '#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(' frontend/src --include='*.css' --include='*.jsx' | grep -v 'design/tokens'
```

At plan time: 14 hex values in `pages/onboarding/onboarding.css`, 1 hex + 6 rgba in
`components/SchoolMap.css`, and rgba in `search.css`, `onboarding.css`,
`schoolDetail.css`, `decision.css`. Mapping rules, no judgment calls:
- Text-like colours → nearest of `--ink`, `--ink2`, `--ink3` by lightness.
- Fills → `--surface`, `--surface2` or `--board`.
- Borders → `--line` / `--line2`.
- Brand-coloured → `--acc` / `--acc-soft` / `--acc-line`.
- Success/match green → `--ok` / `--ok-soft`. Error red → `--danger` / `--danger-soft`.
- Shadows → `var(--shadow)`.
- Translucent overlays (scrims, map label halos) → `color-mix(in srgb, var(--ink) N%,
  transparent)` keeping the same alpha N as the literal, or `var(--frost)` if it's a
  frosted panel.
- Leaflet/map tile colours that come from the tile provider are out of scope. Only our
  own CSS counts.
- `#FFFFFF`/`white` used as text on an accent fill → `var(--acc-ink)`.

When a literal doesn't fit any rule, list it in the report with file:line instead of
guessing. After this, the grep above must print nothing except those listed exceptions.

## 9. Docs

- `CLAUDE.md` and `AGENTS.md`, "Design tokens — tokens.js" section: replace the
  terracotta/moss/Lora description with: default palette Značka + three user themes
  (`palettes` in tokens.js, `data-palette`/`data-theme` attributes, choice stored in
  `users.theme_palette`/`theme_mode`), fonts Archivo Narrow + Archivo, rules in
  DESIGN.md → Colors → Themes. Update the Supabase table row for `users` with the two
  columns. Keep both files' shared content equivalent (repo rule).
- Update this plan's Status when done.

## 10. Verification

From `frontend/`: `npm run tokens` (tokens.css must equal the committed file after
regeneration), `npm run lint`, `npm run build`. From the root: `npm test`.

Browser (both servers per `.claude/launch.json`), signed in with a confirmed account:

| # | Check | Pass |
|---|---|---|
| 1 | Fresh browser, no cache | App renders in Značka light, headings in Archivo Narrow. |
| 2 | Nastavení → Vzhled, pick each palette | Page recolours instantly. Reload: choice persists with no visible flash. |
| 3 | Each mode × OS dark/light emulation | `system` follows emulation, `light`/`dark` ignore it. |
| 4 | Second browser, same account | After sign-in the saved theme applies. |
| 5 | Screens × 8 combinations: `/skoly`, `/skoly/32`, `/nastaveni`, one onboarding question screen, `/porovnani` | Nothing unreadable, no leftover terracotta/cream from a hardcoded value, focus rings visible. Screenshot each for the reviewer (40 shots; a contact sheet is fine). |
| 6 | Keyboard | Tab into Barvy, arrows move selection, Space selects; same for Režim. |
| 7 | Save failure (stop the backend, change theme) | Toast appears, theme reverts to the last saved value. |
| 8 | API | `PATCH /api/me` with an invalid palette → 400 `Neplatný vzhled.`; name-only rename still works. |
| 9 | Section 8 grep | Prints nothing except listed exceptions. |

## 11. Commits

On `main`, pushed after each verified chunk: (1) tokens + generator + fonts + pre-paint
script; (2) DB/API + theme.js + AuthContext; (3) Settings Vzhled; (4) hardcoded colour
cleanup; (5) docs. Don't stage `docs/skolamatch_current_status.md`,
`docs/workflows/plan-then-build-collaboration.md` or the untracked routing-guide file.

## 12. Handoff prompt for Codex

> Implement `plans/014-colour-themes.md`. First confirm plan 013's commits are on `main`;
> if not, stop and say so. Read the plan, then `design/DESIGN.md` → Colors → Themes,
> then `AGENTS.md`. The plan is the contract: theme values are final and
> contrast-checked, so copy them exactly and make no design decisions. Where the code
> doesn't match the plan (a missing context setter, a different constraint pattern in
> `supabase-setup.sql`), take the smallest option the plan names, or stop and report.
> Run section 10, commit and push in section 11's chunks, and finish with a report of
> each check's result, the SQL the founder must run plus its verify query, and any
> hardcoded colour you couldn't map.
