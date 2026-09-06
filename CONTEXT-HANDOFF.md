# Session handoff — 2026-09-06, moving to the MacBook now

Written because the user is switching machines **for real this time** — not the
false alarm from 2026-08-31 (see git history if curious). Read this alongside
`CLAUDE.md` (architecture, conventions, current state) and `UNFORGET.md` (all
deferred work). This file covers only **what to do to get running on the MacBook**
and **what was in flight when the Windows laptop session ended** — not things
those two files already document.

Everything described below as "done" is committed and pushed to
`github.com/XarolApp/school-app` on `main` — a fresh clone has all of it.

---

## 🖥️ MacBook setup checklist — ACTIVE, do this now

- [ ] **1. Install Xcode command line tools** (gets you git)
      `xcode-select --install`
- [ ] **2. Install Node.js** — from nodejs.org, or `brew install node`
- [ ] **3. Install Claude Code** (macOS build)
- [ ] **4. Set line endings BEFORE cloning** — the Windows machine used CRLF;
      without this the whole repo can show as modified on first diff
      `git config --global core.autocrlf input`
- [ ] **5. Clone the repo**
      `git clone https://github.com/XarolApp/school-app.git`
- [ ] **6. Install dependencies — both root and frontend**
      `cd school-app && npm install && cd frontend && npm install`
      (Do not copy `node_modules` across machines — Windows binaries won't work.)
- [ ] **7. Recreate the two `.env` files** — gitignored, not in the repo.
      Restore from wherever they were saved (password manager / private note):
      - `school-app/.env` — needs at minimum `SUPABASE_URL` and `SUPABASE_KEY`
      - `school-app/frontend/.env`
      Templates: `.env.example` and `frontend/.env.example`. The app still boots
      without them (auth stubs out, onboarding runs on demo data), but nothing
      touching Supabase will work.
- [ ] **8. Verify it runs** — two terminals, per `CLAUDE.md` → Quick Start.
      Backend from repo root: `node server.js` (port 5000).
      Frontend from `frontend/`: `npm run dev` (port 5173).
      `curl http://localhost:5000/` → `{"status":"ok"}`; `http://localhost:5173`
      loads in a browser.
- [ ] **9. The Browser pane / preview tools are safe to use again on the MacBook.**
      CLAUDE.md's "do not use the Browser pane" instruction is Windows/Intel-GPU
      specific (a Chromium crash on this laptop's hardware) — it does not apply
      here. **Update that section of CLAUDE.md once confirmed working**, since
      it currently tells Claude to avoid a tool it should now use.
- [ ] **10. Optional — restore per-project memory.** Reference copies are in
      `.claude/memory-backup/`. Not live memory, just the same facts already in
      `CLAUDE.md` with more reasoning detail.

**Once every box above is ticked, delete this checklist section** (keep the rest
of the file until its contents are resolved into `CLAUDE.md` / `UNFORGET.md`).

---

## What just shipped (2026-09-05/06, Windows laptop, last thing before the move)

The **5-screen paywall flow** was designed (Claude Design canvas, both student and
parent persona variants, mobile + web) and then fully implemented as real React,
replacing the old single-screen `Paywall.jsx` and `JourneySummary.jsx`:

- New steps in `steps.js`: `hodnota → cesta → ucet → plan → zkusebni → platba`
- New screen files: `Hodnota.jsx`, `Cesta.jsx`, `Plan.jsx`, `Zkusebni.jsx`,
  `Platba.jsx`, `paywallKit.jsx` (shared chrome/icons), all in
  `frontend/src/pages/onboarding/screens/`
- Role-forked copy throughout (student tykání / parent vykání), same pattern as
  the rest of the onboarding flow — no separate parent component tree
- Design source for reference: `design/paywall-multipage/` — 20 `.dc.html` files
  (5 screens × mobile/web × student/parent) plus `canvas.json`. This IS the
  approved design; the React implementation should match it.
- Parent-quiz handoff: on `q1` only, when `role === 'parent'`, a same-device
  nudge ("hand the phone to your kid for this part") plus a visibly **disabled**
  "Poslat odkaz dítěti" placeholder — no real cross-device sharing was built
  (deliberate; needs backend session tokens this app doesn't have yet)
- `docs/sources/feature-brainstorm.md` now tracks the share-with-parent /
  send-to-child pairing as one future feature (same infrastructure, ship together)

### One real decision made mid-build, not just a design port

The implementing agent moved the **free trial from Měsíční to Sezónní**
(`hasTrial` flipped in `pricing.js`) because the approved design's Zkusebni
screen only exists on the trial, and the pre-selected Sezónní plan previously had
zero exit mechanism at all. **The user has not explicitly confirmed this is
final** — it was surfaced and left standing rather than reverted. If you're
picking this up, that's still an open question, not settled.

### Not yet verified — do this first on the MacBook

Nobody has looked at the new paywall flow in a real browser. The Windows laptop
could not use the Browser pane at all (crash risk), so this is genuinely unverified,
not "probably fine":

- Walk `/onboarding/hodnota` through `/onboarding/platba` on both the student and
  parent branches (`localStorage.setItem('skolamatch.role','student'|'parent')`,
  reload), at both phone width and desktop width
- Specifically check: Hodnota's card ordering on mobile (an inline `order` value
  is overridden by a `!important` rule at the 1024px breakpoint — verify it
  actually flips), and the Cesta timeline's rotation from vertical rail (mobile)
  to horizontal rail (web) at that same 1024px breakpoint
- Confirm the day-3 trial reminder renders in its explicitly-not-promised state
  (dashed circle, "tohle zatím neslibujeme") — `TRIAL_REMINDER_IMPLEMENTED` is
  still `false`
- Confirm card fields on Platba are inert placeholders (they should be — real
  card data must never enter this app's state pre-Stripe)

`npm run build` and `npm run lint` both passed on the Windows laptop before the
push, so nothing is broken at the code level — this is purely a "does it look and
flow right" pass.

---

## Older open item — plan 005 (spacing/typography migration), still IN PROGRESS

Not touched this session; carried over unresolved from 2026-09-04. Full spec:
`plans/005-spacing-typography-migration.md`. All code and bookkeeping was
reported code-complete as of 2026-09-04, with three visual checks never done
because the Browser pane was unusable on the Windows laptop:

- `/prihlaseni` and `/registrace` — form field/label/button alignment after the
  `auth.css` spacing and type changes
- `/onboarding/welcome` — should be **completely unchanged** (onboarding.css was
  deliberately excluded from the migration); this is the visual proof the
  exclusion held
- 375px mobile width on the auth pages

If these check out, mark plan 005 `DONE` in `plans/README.md` (currently
`IN PROGRESS`) and fold this section out of this file.

---

## Restarting the app

Two terminals, per `CLAUDE.md`'s Quick Start. Backend from repo root
(`node server.js`, port 5000), frontend from `frontend/` (`npm run dev`, port 5173).

## Auto-memory — lives OUTSIDE this folder

Claude Code's per-project memory is keyed by absolute path, so it will not
transfer to the MacBook automatically (new username, new path). Reference copies
are in `.claude/memory-backup/` inside the repo. Not live memory — same facts as
`CLAUDE.md`, just with more of the original reasoning. Optional to restore.

## Suggested first move on the MacBook

1. Work through the setup checklist above.
2. Run the paywall verification pass (both branches, both widths) — this is the
   freshest, least-verified work in the repo.
3. If time allows, knock out plan 005's three remaining visual checks.
4. Decide the Měsíční→Sezónní trial-plan question explicitly, one way or the other.
