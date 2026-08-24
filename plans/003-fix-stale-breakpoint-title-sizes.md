# 003 — Desktop breakpoint still uses pre-redesign title sizes

**Written against commit:** `12ede66`
**Category:** tech debt / visual correctness
**Impact:** LOW-MED — headings *shrink* when the viewport gets wider
**Effort:** S (two numbers)
**Risk of fix:** Very low
**Confidence:** CONFIRMED by reading the file

---

## Why this matters

The 2026-08-24 design-system port updated the base heading sizes in
`frontend/src/pages/onboarding/onboarding.css` to match the Claude Design spec, but
the `@media (min-width: 640px)` block at the bottom of the same file was not updated
with them. It still carries the older, smaller values.

The result is backwards: as the viewport gets **wider**, the headings get **smaller**.

| Class | Base (mobile) | At ≥640px | Should be |
|---|---|---|---|
| `.ob-title` | 32px | **30px** ↓ | ≥ 32px |
| `.ob-title-xl` | 40px | 44px ↑ | 44px (fine) |

`.ob-title` is the wrong direction. `.ob-title-xl` happens to be fine but is worth
checking against the design at the same time.

This is invisible on a phone, which is why it survived the port — it only shows on
tablet/desktop, which is the surface with no design yet (see CLAUDE.md → "Platform
Strategy"). It should still be corrected now so the desktop pass starts from a sane
baseline rather than inheriting a known-wrong number.

## Current state

`frontend/src/pages/onboarding/onboarding.css`, the base rules (~line 165):

```css
.ob-title {
  font-size: 32px;
  line-height: 1.12;
}

.ob-title-xl {
  font-size: 40px;
  line-height: 1.06;
}
```

and the breakpoint (~line 1163):

```css
@media (min-width: 640px) {
  .ob-screen {
    padding: 24px 24px 32px;
  }
  .ob-title {
    font-size: 30px;
  }
  .ob-title-xl {
    font-size: 44px;
  }
  .ob-fork-cards {
    grid-template-columns: 1fr 1fr;
  }
  .ob-proof-grid {
    grid-template-columns: 1fr 1fr;
  }
  .ob-actions,
  .ob-cta-cluster {
    position: static;
    background: none;
  }
}
```

## Reference — what the design specifies

`frontend/src/design/tokens.js` exports the canonical scale:

```js
  hero:  { size: 46, lineHeight: 1.06, weight: '400', tracking: -1.15, family: 'heading' },
  title: { size: 32, lineHeight: 1.12, weight: '400', tracking: -0.64, family: 'heading' },
```

The mockup's hero was 46px at 390px wide. The current base of 40px is a deliberate
slight reduction; the ≥640px value should climb toward the 46px design figure rather
than sitting at 44px arbitrarily.

## Steps

### Step 1 — correct the two values

In the `@media (min-width: 640px)` block of
`frontend/src/pages/onboarding/onboarding.css`:

- change `.ob-title` from `30px` to `36px` (a real step **up** from the 32px base)
- change `.ob-title-xl` from `44px` to `46px` (matches `tokens.js` `type.hero.size`)

Leave every other declaration in that media block untouched — especially the
`.ob-actions` / `.ob-cta-cluster` `position: static` override, which plan `002`
depends on.

### Step 2 — verify the direction of the scale

Load `http://localhost:5173/onboarding/welcome`, then at two widths run:

```js
(() => {
  const t  = document.querySelector('.ob-title, .ob-title-xl');
  return { cls: t.className, size: getComputedStyle(t).fontSize, w: innerWidth };
})()
```

- At width 390 → note the size.
- At width 900 → the size must be **larger** than at 390, never smaller.

Repeat on `/onboarding/paywall` (which uses `.ob-title`) to check both classes.

## Files

**In scope:**
- `frontend/src/pages/onboarding/onboarding.css` — only the two `font-size`
  declarations inside the `@media (min-width: 640px)` block.

**Explicitly OUT of scope:**
- `frontend/src/design/tokens.js` and the generated `tokens.css` — the token values
  are correct; this is a stylesheet that failed to follow them. Do not regenerate or
  edit tokens.
- The base `.ob-title` / `.ob-title-xl` rules — they already match the design.
- Everything else in the media block.

## Done criteria

1. `.ob-title` computed font-size at 900px wide is **greater than** at 390px wide.
2. `.ob-title-xl` computed font-size at 900px wide is `46px`.
3. `cd frontend && npm run lint` exits 0.
4. `cd frontend && npm run build` exits 0.
5. No visual change at all below 640px (mobile is the primary surface — confirm the
   390px rendering is byte-identical in computed heading sizes to before the change).

## Test plan

Browser assertions above; no test framework in this repo.

## Maintenance note

The general trap: this stylesheet has a single `@media (min-width: 640px)` block far
from the rules it overrides (1000+ lines away), so base-value edits routinely miss it.
When the desktop design pass happens, consider colocating each responsive override
with its base rule, or moving the whole set into the token pipeline so the two cannot
drift again.

## Escape hatch

If 36px/46px look wrong once rendered — this is a judgement call made without a
desktop design — **report what you see and leave the values at your best reading**,
noting it for the desktop design pass. Do not iterate more than once on the numbers;
the point of this plan is fixing the inverted direction, not finalising desktop type.
