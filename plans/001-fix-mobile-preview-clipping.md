# 001 — Fix mobile preview harness clipping 28px of the app

**Written against commit:** `12ede66`
**Category:** correctness (dev tooling)
**Impact:** HIGH — this is the reported "text is not visible on mobile" bug
**Effort:** S (single file, ~5 lines)
**Risk of fix:** Very low — dev-only file, not shipped logic
**Confidence:** CONFIRMED by measurement (numbers below)

---

## Why this matters

The user reported that the onboarding "doesn't really work on mobile — it is wrongly
centered so that some of the text is not visible."

That symptom is **not** in the onboarding app. It is a bug in the preview harness at
`frontend/public/mobile-preview.html`, which renders the live app inside a decorative
phone frame. The frame clips the right and bottom edges of the app, so text near the
right margin disappears and the page looks mis-centred.

The onboarding itself was measured at 390×844, 375×667, 360×560 and 320×480 and had
**zero** horizontally overflowing or top-clipped elements at every size. The app is
fine; the viewer is broken.

## Root cause (measured, not inferred)

In `frontend/public/mobile-preview.html`:

- `.phone` is `width: 390px` with `padding: 14px`
- therefore its content box — which `.screen` fills at `width: 100%` — is
  `390 − 14 − 14 = 362px` wide, and `844 − 28 = 816px` tall
- `.screen` has `overflow: hidden`
- but `iframe` is hard-coded `width: 390px; height: 844px`

So a 390×844 iframe is placed inside a 362×816 clipping container. Measured in the
browser:

```
phoneOuter:  { w: 390, h: 844 }
screenBox:   { w: 362, h: 816 }   ← the actual visible window
iframeBox:   { w: 390, h: 844 }
CLIPPED_RIGHT_PX:  28
CLIPPED_BOTTOM_PX: 28
```

28px of the app's right edge and 28px of its bottom are cut off and unreachable.

**The fix is to size the outer frame from the inside out**: the iframe must stay
exactly 390×844 (that is the design viewport the whole system was drawn at — see
`frontend/src/design/tokens.js` → `size.designWidth`), and `.phone` must grow to
`390 + 28 = 418px` wide and `844 + 28 = 872px` tall to accommodate it plus its bezel.

Do **not** "fix" this by shrinking the iframe to 362px. That would silently change the
preview viewport away from the 390px design width and make the preview lie about
layout.

## Current state of the file

`frontend/public/mobile-preview.html`, the two relevant rules:

```css
  .phone {
    width: 390px;
    height: 844px;
    background: #000;
    border-radius: 55px;
    padding: 14px;
    box-shadow:
      0 0 0 2px #3a3940,
      0 30px 60px -12px rgba(0,0,0,.6),
      0 18px 36px -18px rgba(0,0,0,.6);
  }
```

```css
  iframe {
    width: 390px;
    height: 844px;
    border: none;
    display: block;
  }
```

## Steps

### Step 1 — make the bezel additive rather than subtractive

In `frontend/public/mobile-preview.html`, replace the `.phone` rule's fixed
`width`/`height` with values derived from the device size plus the bezel, and
introduce CSS variables so the two stay locked together.

Add these variables to the `.phone` rule and use them:

```css
  .phone {
    --device-w: 390px;   /* must match tokens.js size.designWidth */
    --device-h: 844px;
    --bezel: 14px;
    width: calc(var(--device-w) + var(--bezel) * 2);
    height: calc(var(--device-h) + var(--bezel) * 2);
    background: #000;
    border-radius: 55px;
    padding: var(--bezel);
    box-shadow:
      0 0 0 2px #3a3940,
      0 30px 60px -12px rgba(0,0,0,.6),
      0 18px 36px -18px rgba(0,0,0,.6);
  }
```

Then make the iframe read the same variables so it can never drift from the frame:

```css
  iframe {
    width: var(--device-w);
    height: var(--device-h);
    border: none;
    display: block;
  }
```

Leave `.screen` as-is (`width: 100%; height: 100%; overflow: hidden`) — once the
container is the right size, `overflow: hidden` only clips the rounded corners, which
is what it is for.

**Verify:** reload `http://localhost:5173/mobile-preview.html` and run this in the
browser console. Both clipped values must be `0`:

```js
(() => {
  const s = document.querySelector('.screen').getBoundingClientRect();
  const f = document.getElementById('frame').getBoundingClientRect();
  return { clippedRight: Math.round(f.width - s.width),
           clippedBottom: Math.round(f.height - s.height),
           iframeW: Math.round(f.width), iframeH: Math.round(f.height) };
})()
```

Expected: `{ clippedRight: 0, clippedBottom: 0, iframeW: 390, iframeH: 844 }`.

### Step 2 — confirm the app's right edge is now reachable

Still in the preview page, check that content at the right margin is inside the
visible window:

```js
(() => {
  const d = document.getElementById('frame').contentDocument;
  const el = d.querySelector('.ob-screen');
  return { screenWidth: Math.round(el.getBoundingClientRect().width),
           docScrollW: d.documentElement.scrollWidth };
})()
```

Expected: `screenWidth: 390` and `docScrollW: 390` — no horizontal overflow.

### Step 3 — add a short device-size switcher (optional but recommended)

The single hardest-hit real-world case is a *short* phone, where the paywall's sticky
block dominates (that is plan `002`). Being able to switch the preview to a small
device makes that regression visible instead of theoretical.

Add buttons to the existing `.toolbar` that set `--device-w` / `--device-h` on
`.phone`:

```html
    <button onclick="setDevice(390,844)">390×844</button>
    <button onclick="setDevice(375,667)">375×667</button>
    <button onclick="setDevice(360,640)">360×640</button>
```

```js
    function setDevice(w, h) {
      const p = document.querySelector('.phone');
      p.style.setProperty('--device-w', w + 'px');
      p.style.setProperty('--device-h', h + 'px');
    }
```

**Verify:** click `360×640`, then re-run the Step 1 snippet. Clipped values must still
be `0` and `iframeW` must now be `360`.

## Files

**In scope:**
- `frontend/public/mobile-preview.html` — the only file this plan touches.

**Explicitly OUT of scope — do not modify:**
- `frontend/src/pages/onboarding/onboarding.css` — the paywall sticky-height problem
  is a separate, real bug handled in plan `002`. Do not try to fix it here.
- Anything under `frontend/src/` at all. This plan is dev tooling only.
- `frontend/src/design/tokens.js` — read it if you want to confirm `designWidth: 390`,
  but do not change it.

## Done criteria

All must hold:

1. `clippedRight` and `clippedBottom` both equal `0` at 390×844 (Step 1 snippet).
2. The iframe still measures exactly 390×844 at the default size — the preview must
   not silently change the design viewport.
3. `cd frontend && npm run build` exits 0.
4. `cd frontend && npm run lint` exits 0.
5. Loading `http://localhost:5173/mobile-preview.html` shows the phone frame with the
   full app inside it, no content cut off at the right edge.

## Test plan

There is no test framework in this repo (`frontend/package.json` has no test script),
so verification is the manual browser assertions above. **Do not add a test framework
as part of this plan** — that is a separate decision.

Record the before/after of the Step 1 snippet in your report.

## Maintenance note

The bug class here is "decorative padding subtracts from a fixed-size child." Anyone
later changing the bezel thickness or adding a border to `.phone` will reintroduce it
unless they keep using the `calc()` + shared-variable approach. The comment
`/* must match tokens.js size.designWidth */` exists to catch the other drift risk: if
the design viewport ever stops being 390px, this file must follow.

## Escape hatches

- If after Step 1 the clipped values are still non-zero, something else is
  constraining `.screen` (e.g. a border added to `.phone`, or `box-sizing` not being
  `border-box`). **Report the measured numbers and stop** rather than adding
  compensating magic numbers.
- If you discover the onboarding app itself *does* overflow horizontally at some
  viewport, that is a different bug than this plan describes — **report it, do not
  fix it here.**
