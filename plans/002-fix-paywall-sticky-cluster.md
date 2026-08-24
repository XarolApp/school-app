# 002 — Paywall sticky CTA block eats up to 57% of the screen

**Written against commit:** `12ede66`
**Category:** correctness / UX (conversion-critical surface)
**Impact:** HIGH — this is the reported "scrolling on the paywall doesn't work well"
**Effort:** M
**Risk of fix:** MEDIUM — this is the payment screen. Layout may change; wording,
pricing logic and the parental-consent flow must not.
**Confidence:** CONFIRMED by measurement (numbers below)

---

## Why this matters

The user reported that "the animations on scrolling on the paywall don't really work
well."

There is no scroll animation on the paywall. What they are reacting to is a sticky
element that is far too tall: the bottom CTA block is pinned to the viewport at a
fixed 317px, and it carries a `linear-gradient(... 78%, transparent)` background. As
the page scrolls, real content slides underneath that 22%-transparent band and shows
through it. That reads as a rendering glitch or a broken animation.

It is also a straightforward usability failure. Measured on the live app:

| Viewport | Sticky block | % of screen | Scrollable content window |
|---|---|---|---|
| 390 × 844 (iPhone 14) | 317px | **38%** | 527px |
| 375 × 667 (iPhone SE) | 317px | **47%** | 350px |
| 360 × 560 (Android + browser chrome) | 317px | **57%** | 243px |

On a common Android viewport the user reads the entire pricing page — outcomes
checklist, two plan cards, prices, terms — through a 243px slot. Every other screen in
the flow is fine by comparison (welcome 17%, stakes 11%, quiz 19%, reveal 11%); the
paywall is the sole outlier.

This is the screen where money is decided, so it is the worst possible place for the
layout to feel broken.

## Root cause

`frontend/src/pages/onboarding/screens/Paywall.jsx` puts **four** distinct things
inside the sticky container, when only the buttons need to be pinned:

```jsx
        <div className="ob-cta-cluster">
          <ObButton onClick={onCta} disabled={stage === 'working'}>
            {stage === 'working' ? 'Zpracováváme…' : planCopy(plan, voice, 'ctaLabel')}
          </ObButton>

          <ObButton variant="ghost" onClick={share}>
            {parent ? 'Sdílet s dítětem' : 'Poslat rodičům'}
          </ObButton>
          {shareNote && <span className="ob-share-note">{shareNote}</span>}

          <ul className="ob-trust">
            <li className={cancellation.unbuilt ? 'ob-trust-unbuilt' : undefined}>
              {cancellation.text}
            </li>
            {refund && <li>{refund}</li>}
            <li>Platební údaje nevidíme ani neukládáme.</li>
            <li>Ceny jsou včetně DPH.</li>
          </ul>

          {PAYMENTS_MOCKED && (
            <p className="ob-mock-note">
              Ukázková verze: platební brána zatím není napojená, nic se nestrhne.
            </p>
          )}
        </div>
```

Measured child heights: primary button 56px, ghost button 56px, `.ob-trust` list
110px, `.ob-mock-note` 55px — plus gaps, totalling 317px.

And in `frontend/src/pages/onboarding/onboarding.css` (line ~922):

```css
.ob-cta-cluster {
  display: grid;
  gap: 10px;
  position: sticky;
  bottom: 0;
  padding: 10px 0 env(safe-area-inset-bottom, 8px);
  background: linear-gradient(to top, var(--bg) 78%, transparent);
}
```

## The intended outcome

Only the **primary CTA** (and the trust line most tied to the money decision) should
be permanently pinned. The four-line legal/trust list, the mock-payment note and the
secondary share button belong in normal document flow, above the sticky bar, where the
user reads them once rather than staring at them for the whole scroll.

Target: **sticky block ≤ 96px** on every viewport, so even at 360×560 it is ~17% of the
screen — in line with the rest of the flow.

## Constraints that must not be broken

These are settled product decisions. Read `CLAUDE.md` and
`frontend/src/config/pricing.js` before editing.

1. **Do not change, soften or remove any copy string.** The cancellation line, refund
   line, VAT line, "Platební údaje nevidíme ani neukládáme" and the mock-payment note
   must all still render on the page, with identical text. This plan moves them; it
   does not edit them.
2. **`cancellation.text` and `refund` come from `pricing.js` helpers**
   (`cancellationTerms()`, `refundTerms()`) and are honesty-gated by
   `ONE_STEP_CANCELLATION_IMPLEMENTED` / `REFUND_GUARANTEE_DAYS`. Keep calling the
   helpers. Never inline their strings.
3. **`PAYMENTS_MOCKED` must still gate the mock note**, and the note must remain
   visible on the screen — it is a required disclosure while payments are fake.
4. **Do not touch the `stage === 'confirm'` parental-consent branch** of this
   component. That flow was fixed recently (double-charge guard, consent-outlives-price
   guard); leave it alone.
5. **No hardcoded prices, plan ids or booleans.** Everything money-related reads from
   `pricing.js`.

## Steps

### Step 1 — move the non-essential blocks out of the sticky container

In `frontend/src/pages/onboarding/screens/Paywall.jsx`, restructure so that only the
primary CTA and a single condensed trust line remain sticky. Move `.ob-trust`, the
`.ob-mock-note` and the ghost share button **above** the `.ob-cta-cluster`, inside the
normal scrolling body.

Keep every element and every string; only their position in the tree changes. The
share button and its `shareNote` stay adjacent to each other.

Suggested resulting order in the scrolling body: outcomes → plans → share button +
share note → trust list → mock note → **[sticky] primary CTA**.

**Verify** the strings all still render (run on `/onboarding/paywall`):

```js
(() => {
  const t = document.body.innerText;
  return {
    hasCancellation: /ruš|Zruš/i.test(t),
    hasVat: /DPH/.test(t),
    hasNoCardStored: /Platební údaje/.test(t),
    hasMockNote: /Ukázková verze/.test(t),
    hasShare: /Poslat rodičům|Sdílet s dítětem/.test(t),
  };
})()
```

Expected: every value `true`.

### Step 2 — constrain the sticky block

In `frontend/src/pages/onboarding/onboarding.css`, the `.ob-cta-cluster` rule stays
sticky but should now only wrap the CTA. Reduce the gradient to something proportional
to its new height (a tall soft gradient over a short bar looks muddy):

```css
.ob-cta-cluster {
  display: grid;
  gap: 10px;
  position: sticky;
  bottom: 0;
  padding: 10px 0 env(safe-area-inset-bottom, 8px);
  background: linear-gradient(to top, var(--bg) 88%, transparent);
}
```

Leave the `@media (min-width: 640px)` override (`position: static; background: none`)
exactly as it is.

**Verify** the height target on the three viewports below.

### Step 3 — measure on three viewports

For each of 390×844, 375×667 and 360×560, load `/onboarding/paywall`, scroll to the
bottom, and run:

```js
(() => {
  const c = document.querySelector('.ob-cta-cluster');
  const b = c.getBoundingClientRect();
  return { viewportH: innerHeight,
           stickyH: Math.round(b.height),
           pct: Math.round(b.height / innerHeight * 100) + '%' };
})()
```

Expected at every size: `stickyH` ≤ 96 and `pct` ≤ 20%.

### Step 4 — confirm nothing is hidden behind the sticky bar

At 360×560, scrolled to the bottom:

```js
(() => {
  const c = document.querySelector('.ob-cta-cluster');
  const cb = c.getBoundingClientRect();
  const hidden = [];
  document.querySelectorAll('.ob-screen *').forEach(el => {
    if (c.contains(el) || el.contains(c)) return;
    const b = el.getBoundingClientRect();
    if (b.height === 0 || el.children.length || !el.textContent.trim()) return;
    if (b.bottom > cb.top && b.top < cb.bottom)
      hidden.push(el.textContent.trim().slice(0, 40));
  });
  return { hiddenCount: hidden.length, hidden: hidden.slice(0, 5) };
})()
```

Expected: `hiddenCount: 0`.

### Step 5 — regression-check both role branches

The paywall differs by role. Check both:

```js
localStorage.setItem('skolamatch.role', 'parent'); location.reload();
```

then repeat Step 1's string check and Step 3's height check. Then set it back to
`'student'` and repeat. Both branches must pass.

## Files

**In scope:**
- `frontend/src/pages/onboarding/screens/Paywall.jsx` — JSX restructure only
- `frontend/src/pages/onboarding/onboarding.css` — the `.ob-cta-cluster` rule

**Explicitly OUT of scope — do not modify:**
- `frontend/src/config/pricing.js` — no pricing, plan, copy or flag changes
- The `stage === 'confirm'` parental-consent branch inside `Paywall.jsx`
- `frontend/public/mobile-preview.html` — separate bug, plan `001`
- Any other screen in `frontend/src/pages/onboarding/screens/`
- The `@media (min-width: 640px)` block's existing `.ob-actions` / `.ob-cta-cluster`
  overrides

## Done criteria

1. Sticky block ≤ 96px and ≤ 20% of viewport at 390×844, 375×667 **and** 360×560.
2. `hiddenCount: 0` from Step 4 at 360×560.
3. All five strings from Step 1 present, in **both** role branches.
4. `cd frontend && npm run lint` exits 0.
5. `cd frontend && npm run build` exits 0.
6. Browser console has zero errors on `/onboarding/paywall`.
7. Clicking the primary CTA on the student branch still reaches the parental-consent
   screen (type `confirm` stage), and the consent checkbox still gates its button.

## Test plan

No test framework exists in this repo — verification is the browser assertions above.
Do not add one as part of this plan.

Report the measured `stickyH`/`pct` table for all three viewports, before and after.

## Maintenance note

The underlying rule: **a sticky element's height is a permanent tax on the viewport.**
Anything added to `.ob-cta-cluster` in future shrinks the readable area on every phone.
If a future change needs to add a line there (for example when
`REFUND_GUARANTEE_DAYS` becomes non-null and `refundTerms()` starts returning a
string), it should go in the scrolling body, not the sticky bar. Worth adding a short
CSS comment above the rule saying so.

Note that `refund` is currently `null` (no refund policy exists yet), so the trust
list renders one line shorter today than it will once that is set — the 317px measured
here is the *optimistic* number.

## Escape hatches

- If moving `.ob-trust` out of the cluster makes the CTA look untrustworthy or bare —
  a real conversion concern on a payment screen — **stop and report** with a
  description of how it looks, rather than inventing new reassurance copy. New trust
  copy is a product decision, not an implementation one.
- If you cannot get the sticky block under 96px without deleting a string, **stop and
  report.** Do not delete or shorten any disclosure to hit the number.
- If the parental-consent branch breaks at any point, revert and report — that code
  path was recently fixed for a double-charge bug and must not regress.
