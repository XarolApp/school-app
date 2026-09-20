# Plan 005 — Spacing & typography tokens: emit them, then adopt them site-wide

> **On approval, save verbatim to `plans/005-spacing-typography-migration.md`** and add a
> row to `plans/README.md` (existing plans: 001–004).
> **Written against commit `5a8381c`.**

**Executor:** assume zero context from the session that produced this.

---

## 1. Context

`design/DESIGN.md` and `design/system/tokens/` define a spacing scale and a type scale.
The app implements neither. Every stylesheet hardcodes raw pixels, and the two systems
have silently diverged:

| | app (`tokens.js:112`) | template (`design/system/tokens/spacing.css`) |
|---|---|---|
| spacing | `xs4 sm8 md12 lg16 xl24 xxl32` + `screen26` | `xs4 sm8 md16 lg24 xl32 xxl48 xxxl64` |

They agree at `xs`/`sm` then diverge — the app's `lg` (16) is the template's `md`. This
is not "missing tokens", it's two different scales. The type scales disagree too
(`tokens.js` has `hero 46 / title 32 / statNumber 56`; the template has
`display 72 / headline-lg 38 / headline-md 28`).

**Audited reality (measured, not estimated):**
- **246** hardcoded spacing values and **118** hardcoded font-sizes across 5 stylesheets.
- **Zero** `--space-*` or `--fs-*` custom properties exist in `tokens.css` today.
- **Zero** px values in JSX inline styles — all layout lives in the stylesheets, so
  there is no second surface to migrate.
- **No JS file imports `tokens.js`** — only `scripts/gen-tokens-css.mjs` does. So the
  values can be renumbered with zero runtime risk, and there is no JS/CSS drift to
  reconcile. This window closes as soon as anything imports it.

**Scope decision (user, explicit): `onboarding.css` is EXCLUDED.** It holds 130 of the
246 spacing values and nearly all the hard display-type calls, and it is already slated
for a full `/design` redesign against this same template — migrating it by hand now
would be discarded work. It keeps working unchanged. Tracked in `UNFORGET.md` (§7).

Excluding it also removes every genuinely hard typography decision: the template offers
only `22 / 28 / 38 / 72` above 18px, and its 72px display would be absurd on onboarding's
390px mobile-first screens. The remaining files map cleanly with no judgment calls.

---

## 2. Scope

**IN:**
- `frontend/src/design/tokens.js`
- `frontend/scripts/gen-tokens-css.mjs`
- `frontend/src/design/tokens.css` *(generated — never hand-edit; regenerate)*
- `frontend/src/index.css`
- `frontend/src/App.css`
- `frontend/src/auth.css`
- `frontend/src/pages/search.css`
- `UNFORGET.md` (one entry, §7)

**OUT — do not edit:**
`frontend/src/pages/onboarding/onboarding.css` **(explicitly excluded — see §1)** ·
every `.jsx` file · `design/**` · `CLAUDE.md` · any other stylesheet or component.

If a change appears to require editing `onboarding.css` or any `.jsx`: **STOP and report.**

---

## 3. Phase A — emit the tokens (no visual change)

This phase adds CSS variables nothing consumes yet, so the rendered site must look
**byte-identical** afterwards. That property is what makes it independently verifiable.

### A1. Update the scales in `tokens.js`

Current, `tokens.js:111-112`:
```js
/** Spacing rhythm from the mockup: 8 / 12 / 16 / 24 / 32. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, screen: 26 };
```

Replace the scale with the template's (`design/system/tokens/spacing.css`), and add the
layout constants it defines:
```js
/** Spacing scale — matches design/system/tokens/spacing.css exactly (8pt grid). */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 };

/** Layout constants from the same file. rowPadDense is the documented 8–12px
 *  exception for dense search/compare rows (DESIGN.md → Layout). */
export const layout = {
  gutter: 24, pageMargin: 64, pageMarginMd: 32, pageMarginSm: 16,
  contentMax: 1280, gridColumns: 12, rowPadDense: 10,
};
```

**`screen: 26` is dropped from `space`.** Its only consumer is `onboarding.css:787`
(`padding-left: 26px`), which is out of scope and hardcodes the literal anyway — so
removing the JS key changes nothing. Do not emit it.

Replace the `type` export (`tokens.js:43-58`) with the template's scale from
`design/system/tokens/typography.css`, **keeping the existing object shape**
(`{ size, lineHeight, weight, tracking, family }`, plus `variation` where the template
specifies a Fraunces axis). Keys rename to the template's names so future `/design`
output drops in without translation:

| key | size | lineHeight | weight | tracking | family | variation |
|---|---|---|---|---|---|---|
| display | 72 | 1.06 | '600' | -0.02em* | heading | `'SOFT' 60,'opsz' 72` |
| headlineLg | 38 | 1.14 | '600' | -0.015em* | heading | `'SOFT' 50,'opsz' 38` |
| headlineMd | 28 | 1.2 | '600' | -0.01em* | heading | `'SOFT' 45,'opsz' 28` |
| headlineSm | 22 | 1.25 | '500' | 0 | heading | `'SOFT' 35,'opsz' 22` |
| bodyLg | 18 | 1.6 | '400' | 0 | body | — |
| bodyMd | 16 | 1.55 | '400' | 0 | body | — |
| bodySm | 14 | 1.5 | '400' | 0 | body | — |
| caption | 13 | 1.45 | '400' | 0 | body | — |
| labelCaps | 11 | 1.3 | '600' | 0.08em* | body | — |
| labelMd | 15 | 1 | '600' | 0 | body | — |
| dataMd | 15 | 1.4 | '500' | 0 | body | — |
| dataSm | 13 | 1.4 | '500' | 0 | body | — |

\* **`tracking` is px-numeric in the current shape but the template specifies `em`.**
Store `em` values as strings (`'-0.02em'`) and emit them verbatim; store `0` as the
number `0`. Do **not** convert em→px — it would break at other sizes. Note this
asymmetry in a comment.

**RN constraint (binding — `tokens.js:4-26`):** keep every value a primitive; **do not
append `px` inside these objects.** Units are added in the emitter, exactly as `radius`
is handled at `tokens.js:219-223`. `lineHeight` stays a unitless multiplier and `weight`
stays a string — emit both with no unit.

### A2. Add a palette-free emitter to `tokens.js`

`cssVars(p)` takes a palette and is serialized once per theme by the generator's four
blocks. Spacing and type are **not** theme-dependent, so putting them there would
duplicate every value four times.

**Add a second emitter rather than refactoring `cssVars`.** This is deliberately
additive — `cssVars`/`cssVarsText` and their existing radius/font entries stay exactly
as they are. Do not move them; that is a refactor of working code with no benefit here.

```js
/** Theme-independent tokens: emitted ONCE in :root, not per palette.
 *  Names match design/system/tokens/*.css exactly, so screens produced by
 *  /design against that template need no translation layer. */
export function staticVars() {
  const out = {};
  for (const [k, v] of Object.entries(space)) out[`--space-${k}`] = `${v}px`;
  out['--gutter'] = `${layout.gutter}px`;
  out['--page-margin'] = `${layout.pageMargin}px`;
  out['--page-margin-md'] = `${layout.pageMarginMd}px`;
  out['--page-margin-sm'] = `${layout.pageMarginSm}px`;
  out['--content-max'] = `${layout.contentMax}px`;
  out['--row-pad-dense'] = `${layout.rowPadDense}px`;
  for (const [k, t] of Object.entries(type)) {
    const n = k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());  // headlineLg -> headline-lg
    out[`--fs-${n}`] = `${t.size}px`;
    out[`--lh-${n}`] = `${t.lineHeight}`;
    out[`--fw-${n}`] = `${t.weight}`;
    if (t.tracking) out[`--ls-${n}`] = typeof t.tracking === 'number' ? `${t.tracking}px` : t.tracking;
    if (t.variation) out[`--var-${n}`] = t.variation;
  }
  out['--measure'] = '66ch';
  return out;
}

/** Same two-space indent contract as cssVarsText. */
export function staticVarsText() {
  return Object.entries(staticVars()).map(([k, v]) => `  ${k}: ${v};`).join('\n');
}
```

### A3. Emit it once from the generator

`gen-tokens-css.mjs:25-27` currently reads:
```js
:root {
${cssVarsText(light)}
}
```
Import `staticVarsText` alongside `cssVarsText` (line 13) and emit it **inside the same
`:root` block, before the palette vars**. Do **not** add it to the dark media query or
either `[data-theme]` block — those are palette overrides; static tokens inherit from
`:root` correctly.

Update the file's header comment to say static tokens are emitted once in `:root`.

### A4. Regenerate and verify no visual change

```bash
cd frontend && npm run tokens && npm run lint && npm run build
```

`tokens.css` must now contain `--space-md: 16px`, `--fs-body-md: 16px`, etc., **only in
the first `:root` block**. Grep to confirm `--space-md` appears exactly once.

**Then confirm the site is visually unchanged** — nothing consumes the new vars yet.
Load `/`, `/skoly`, `/prihlaseni` and check the console is clean. If anything moved,
something was edited that shouldn't have been.

---

## 4. Phase B — adopt spacing in the four in-scope stylesheets

~116 spacing values across `index.css`, `App.css`, `auth.css`, `search.css`.

### B1. Remap rules — apply in this order

| current | → | rationale |
|---|---|---|
| 4px | `var(--space-xs)` | on scale |
| 8px | `var(--space-sm)` | on scale |
| 16px | `var(--space-md)` | on scale |
| 24px | `var(--space-lg)` | on scale |
| 32px | `var(--space-xl)` | on scale |
| 48px | `var(--space-xxl)` | on scale |
| 64px | `var(--space-xxxl)` | on scale |
| **1px, 2px, 3px** | **leave as-is** | hairlines and optical nudges — not spacing-scale values. Do not tokenise. |
| 5px, 6px | `var(--space-xs)` if tight chip/inline padding, else `var(--space-sm)` | |
| **10px** | `var(--row-pad-dense)` in dense rows/compare tables; `var(--space-sm)` otherwise | the template defines `--row-pad-dense: 10px` precisely for this; DESIGN.md → Layout blesses 8–12px for dense screens |
| **12px** | `var(--space-md)` **by default**; `var(--space-sm)` only where 16px visibly breaks a dense layout | the largest group — verify these visually, they are the main regression risk |
| 14px | `var(--space-md)` | |
| 20px | `var(--space-lg)` | |
| 36px, 88px | **leave, add a comment** | derived/functional, not scale values: `search.css:167` 36px is icon-inset (icon size + gutter); `search.css:119` 88px is sticky-bar clearance. Prefer `calc()` from a real value if trivial, otherwise leave and comment why. |

### B2. `search.css` — delete its now-redundant local block

`search.css:25-33` currently defines a private scale, with a comment that anticipates
exactly this plan:
```css
  /* The app has no CSS spacing/duration tokens (tokens.js has none of these
     yet — adding them there would be a global change and is out of scope
     for this page). Defined page-locally instead. */
  --space-xs: 4px;
  --space-sm: 8px;
  ...
```
Phase A makes that global change. **Delete the six `--space-*` declarations and their
comment** so the file inherits from `tokens.css`. The values are identical, so nothing
shifts. **Keep `--dur-state` and `--ease-out`** — motion tokens are out of scope for
this plan.

Three lines mix both idioms on one declaration and must be normalised:
`search.css:412`, `:479`, `:493` — all read `padding: 12px var(--space-md);`.

### B3. `App.css` — use the layout constants

`App.css` was widened to 1280px with 64/32/16px breakpoint padding on 2026-08-31. Those
five numbers now have tokens: `--content-max`, `--page-margin`, `--page-margin-md`,
`--page-margin-sm`. Replace the literals. **Do not change the values or the breakpoints.**

---

## 5. Phase C — adopt typography

Only in-scope files. All remaps are mechanical; there are no display-type judgment calls
left once `onboarding.css` is excluded.

**`index.css` — the only file with a responsive type step** (`index.css:47-73`):

| selector | now | → |
|---|---|---|
| `h1` | 34px / lh 1.08 | `var(--fs-headline-md)` (28) / `var(--lh-headline-md)` |
| `h1` @640 | 46px / lh 1.06 | `var(--fs-headline-lg)` (38) / `var(--lh-headline-lg)` |
| `h2` | 26px / lh 1.15 | `var(--fs-headline-sm)` (22) / `var(--lh-headline-sm)` |
| `h2` @640 | 32px | `var(--fs-headline-md)` (28) |
| `h3` | 20px / lh 1.2 | `var(--fs-body-lg)` (18) / `var(--lh-body-lg)` |
| `code` | 14px | `var(--fs-body-sm)` |

Headings shrink slightly at both breakpoints — that is correct and intended; the template's
scale is deliberately tighter with bigger jumps. The responsive step is preserved.

`index.css:44` sets `letter-spacing: -0.02em` on all headings — replace with the
per-size `var(--ls-*)` tokens now that each size carries its own tracking.

`index.css:9` `font: 400 16px/1.5 var(--sans)` → use `var(--fs-body-md)` / `var(--lh-body-md)`.

**`auth.css`** — 19 font-sizes, mostly already on-scale (11/13/14/15/16/18 → their
`--fs-*` equivalents). One off-scale: 20px → `var(--fs-body-lg)` (18).

**`search.css`** — its `.ss-*` type classes (`search.css:49+`) re-express the template's
scale locally with hardcoded px. Replace each with the matching `var(--fs-*)`/`var(--lh-*)`.
Off-scale: 12px → `var(--fs-caption)` (13), 17px → `var(--fs-body-lg)` (18), 26px →
`var(--fs-headline-sm)` (22).

**`App.css`** — one 18px → `var(--fs-body-lg)`.

---

## 6. Done criteria — machine-checkable

From `frontend/`:
```bash
npm run tokens && npm run lint && npm run build
```
- lint exits 0 with **no new warnings** (4 pre-existing `only-export-components`
  warnings are expected and unrelated — do not "fix" them)
- build succeeds
- `git diff --stat` from repo root touches **only** the 8 files in §2. **`onboarding.css`
  must not appear.** Any other file means scope was violated — revert it.

Regeneration is deterministic:
```bash
npm run tokens && git diff --exit-code src/design/tokens.css
```
must exit 0 on a second run (proves `tokens.css` is committed in sync with `tokens.js`).

No hardcoded spacing left in the four migrated files, except the documented exceptions:
```bash
grep -nE '(padding|margin|gap|inset)[^:]*:[^;]*[0-9]+px' src/index.css src/App.css src/auth.css src/pages/search.css
```
Every remaining hit must be a 1/2/3px hairline or one of the two commented derived values
(`search.css` 36px icon-inset, 88px sticky-bar clearance).

**Browser, at 1280px and 375px** — dev server on :5173 (`npm run dev` if down):
- `/` — headings render at the new sizes, no overlap, no clipping
- `/skoly` — the page built in plan 004 must be visually intact: sidebar facets, filter
  chips, sort row, result rows, sticky compare bar. **Confirm the 12px→16px remaps did
  not break the dense row layout** — this is the single most likely regression.
- `/prihlaseni` and `/registrace` — form fields, labels, buttons still aligned
- `/onboarding/welcome` — **must be completely unchanged** (proves the exclusion held)
- console clean; no horizontal scroll at either width

---

## 7. Required `UNFORGET.md` entry

Append, matching the file's existing format (`**Found:** / **Urgency:** / **Risk of
fixing now:** / **Risk of NOT fixing:** / **Effort:** / **Release/context:**, then prose):

```markdown
## onboarding.css still on the old spacing/type scale
- **Found:** 2026-08-31, during the site-wide spacing/typography migration (plan 005)
- **Urgency:** medium — deliberately deferred, not forgotten
- **Risk of fixing now:** the work would be discarded; onboarding is slated for a
  full /design redesign against design/system, which will restyle it natively
- **Risk of NOT fixing:** onboarding renders on a different spacing and type scale
  than the rest of the site until that redesign happens. Visible only if a user
  moves between onboarding and the main app in one session.
- **Effort:** large on its own (130 spacing values + ~10 display-type decisions);
  near-zero if folded into the planned redesign
- **Release/context:** do this AS PART OF the onboarding redesign, not before it

Plan 005 migrated `index.css`, `App.css`, `auth.css`, and `search.css` onto the
design system's real scales (`--space-*`, `--fs-*`, emitted from `tokens.js`).
`onboarding.css` was explicitly excluded by the user: it holds 130 of the 246
hardcoded spacing values and nearly all the hard display-type calls, and hand-migrating
it now would be thrown away by the redesign.

It also carries the only genuinely hard typography problem: the template's scale
offers just 22/28/38/72 above 18px, and its 72px display is unusable on onboarding's
390px mobile-first screens. **The template has no documented mobile type steps** —
that gap needs resolving in `design/DESIGN.md` before or during the redesign, not
guessed at.

Known pre-existing bug in that file, already tracked as `plans/003`: `.ob-title`
*shrinks* 32px → 30px at the 640px breakpoint (`onboarding.css:107` vs `:1168`).
Fold that fix into the redesign rather than patching it separately.
```

---

## 8. Maintenance notes

- **`npm run tokens` is not wired into `dev` or `build`** (`package.json:8`), so
  `tokens.css` can silently drift from `tokens.js`. The `git diff --exit-code` check in
  §6 catches it manually; a pre-commit hook or a `predev` script would catch it always.
  Out of scope here — worth raising separately.
- **Nothing imports `tokens.js` from JS today**, which is why renumbering is safe. The
  moment a component imports `space` or `type`, JS and CSS can disagree again. If that
  happens, the component must read the same object the emitter reads.
- `radius` and the font stacks still flow through the per-theme `cssVars` path and are
  emitted four times identically. Harmless, pre-existing, deliberately not touched here.
- `radius.check` (7) and `radius.pill` (999) are defined but never emitted; `size` and
  `selection` are never emitted at all. Out of scope — noted so a future pass knows.

---

## 9. Escape hatches — STOP and report if

- Any change appears to require editing `onboarding.css` or a `.jsx` file.
- After Phase A, the site does **not** look identical — Phase A adds unconsumed
  variables and must be visually inert. Something else was changed.
- The 12px→16px remap visibly breaks the `/skoly` dense rows and 8px looks equally
  wrong — that means the value was load-bearing in a way this plan didn't anticipate;
  report it rather than inventing an off-scale value.
- `npm run tokens` produces a `tokens.css` that fails the second-run `git diff
  --exit-code` check — the emitter is non-deterministic (likely object key ordering);
  fix that before continuing, or every future run creates spurious diffs.
