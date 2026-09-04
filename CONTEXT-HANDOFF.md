# Session handoff — 2026-08-31

Written when the previous machine (Windows) was retired mid-task, ahead of a move to a
MacBook. Read this alongside `CLAUDE.md` (architecture, conventions) and `UNFORGET.md`
(all deferred work) — this file only covers **what was in flight when the session
ended**, not things those two already document.

---

# 🖥️ MacBook setup checklist — DORMANT, do not action

> **CLAUDE — INSTRUCTION TO YOU, NOT TO THE USER:**
> **This checklist is not pending. Do not prompt the user through it.**
> The MacBook move did not happen — the old PC was sold, and as of 2026-09-04 the
> user is working on the **Windows laptop** until roughly mid-September 2026. On that
> machine every step below is already satisfied: Node installed, repo cloned, deps
> installed in root and `frontend/`, both `.env` files present, both servers verified
> booting.
>
> Its boxes are left unticked on purpose, because they describe a *MacBook* that does
> not exist yet. Re-activate this section only when the user actually moves to the
> MacBook; until then treat it as reference for that future move, not as work. See
> `CLAUDE.md`'s "Current working setup" section, which is the authority on where
> things stand.

When the MacBook arrives, work through these in order on it. Tick each box
(`[ ]` → `[x]`) as you go.

- [ ] **1. Install Xcode command line tools** (gets you git)
      `xcode-select --install`

- [ ] **2. Install Node.js** — from nodejs.org, or `brew install node`

- [ ] **3. Install Claude Code** (macOS build — the old Windows binary does not transfer)

- [ ] **4. Set line endings BEFORE cloning** — the old machine used Windows CRLF; without
      this the whole repo can show as modified
      `git config --global core.autocrlf input`

- [ ] **5. Clone the repo**
      `git clone https://github.com/XarolApp/school-app.git`

- [ ] **6. Install dependencies — both root and frontend**
      `cd school-app && npm install && cd frontend && npm install`
      (Never copy `node_modules` across machines — the old ones were Windows binaries.)

- [ ] **7. Recreate the two `.env` files** — they are gitignored and are NOT in the repo.
      Restore from wherever they were saved before the old machine was wiped
      (password manager / private note):
      - `school-app/.env` — needs at minimum `SUPABASE_URL` and `SUPABASE_KEY`
      - `school-app/frontend/.env`
      Templates: `.env.example` and `frontend/.env.example`.
      The app still boots without them (auth stubs out, onboarding uses demo data), but
      nothing touching Supabase will work.

- [ ] **8. Verify it runs** — two terminals, per `CLAUDE.md` → Quick Start.
      Backend from repo root: `node server.js` (port 5000).
      Frontend from `frontend/`: `npm run dev` (port 5173).
      Check `curl http://localhost:5000/` returns `{"status":"ok"}` and
      `http://localhost:5173` loads in a browser.

- [ ] **9. Optional — restore global Claude skills.** `.claude/skills/` and
      `.claude/plugins/` at the *user* level did not come with the repo. The project's
      own skills in `school-app/.claude/skills/` are already here and work regardless.

- [ ] **10. Optional — restore per-project memory.** Reference copies are in
      `.claude/memory-backup/` (see the auto-memory section lower in this file). These
      are reference copies, not live memory — the same facts are in `CLAUDE.md`, so
      this is a nice-to-have.

**Once every box above is ticked, delete this entire section** (keep the rest of the
file until its contents are resolved into `CLAUDE.md` / `UNFORGET.md`).

---

## Where things stand

Four pieces of work happened this session. Three are **finished and verified live in
the browser**. The fourth is **~95% done and is the thing to pick up.**

### 1. `design/` folder reorganization — DONE, verified

Design assets consolidated into a new top-level `design/` folder:

| now at | was |
|---|---|
| `design/DESIGN.md` | repo root `DESIGN.md` |
| `design/system/` | `Škola Match system design (new)/` |
| `design/archive/school-search-wireframe/` | `# ŠkolaMatch School Search Wireframe/` |
| `design/research/` | 8 design-specific docs from `docs/sources/` |

All references updated (`CLAUDE.md`, `docs/sources/README.md`, `DESIGN.md`'s own
internal paths). `CLAUDE.md` gained a "Design system — `design/` folder" section with
the standing rule: **check `design/DESIGN.md` before any non-trivial visual change**,
and the Mobbin priority order (`design/system` > `DESIGN.md` > Mobbin as reference only,
never overriding the template).

Deleted `design/system/ui_kits/skolamatch/Search.jsx` — a static mockup superseded by the
real implementation. Its README row is struck through explaining why.

> **Note:** moving `Škola Match system design (new)` needed PowerShell — Git Bash `mv`
> fails on that path with `Permission denied` (the `Š` + parentheses). Use the
> `PowerShell` tool for Unicode paths in this repo.

### 2. Site-wide font fix — DONE, verified

`DESIGN.md` and `tokens.js`'s own comments already specified **Fraunces + Public Sans**,
but `index.html` and `tokens.js`'s `webOnly` export still loaded Newsreader + Hanken
Grotesk. Fixed both, regenerated `tokens.css`, verified both fonts actually load
(`document.fonts.check` → true, not falling back). Also fixed a self-contradiction inside
`CLAUDE.md` where one section claimed Fraunces was already live and another said Newsreader.

### 3. Content width 960px → 1280px — DONE, verified

`.app-content` in `App.css` widened to `design/DESIGN.md`'s stated 1280px, and the three
breakpoint margins DESIGN.md documents (64/32/16px) implemented as real media queries —
`App.css` previously had **zero** media queries. Verified at 1600px (1280px content,
64px padding) and 375px (16px padding, no real overflow). The width note inside
`DESIGN.md`'s Layout section was rewritten to say "Resolved 2026-08-31".

Remaining responsive work is tracked in `UNFORGET.md` — this was a fixed-width port of
the desktop spec, not a full responsive pass.

### 4. Plan 005 — spacing & typography migration — **CODE COMPLETE**

Full spec: `plans/005-spacing-typography-migration.md`. All code and bookkeeping is
finished as of 2026-09-04 (see "DONE" below). What remains is **three visual checks
only**, listed under "Not yet checked" — they need a human with a browser, because the
preview tools are hard-blocked on this laptop (`~/.claude/settings.json` →
`permissions.deny`). Nothing is known to be wrong; they are unverified, not failing.

The app had **no** spacing or font-size CSS variables at all; every stylesheet hardcoded
pixels, and `tokens.js`'s scales silently disagreed with `design/system`'s
(app `space.md` was 12, template's is 16). Plan 005 emits the template's real scales
from `tokens.js` and adopts them site-wide.

**`onboarding.css` is deliberately EXCLUDED** (user decision) — it's 130 of the 246
hardcoded spacing values and is slated for a full `/design` redesign that will restyle it
natively. Migrating it by hand now would be thrown away. **Exclusion verified holding:**
`grep -c "var(--space-\|var(--fs-" frontend/src/pages/onboarding/onboarding.css` → `0`.

#### Done

- **Phase A** (token infrastructure) — complete and verified. `tokens.js` has the
  template's `space`/`layout`/`type` scales plus new palette-free `staticVars()` /
  `staticVarsText()` emitters; `gen-tokens-css.mjs` emits them **once** in `:root`
  (not per-theme). Confirmed each var appears exactly once in `tokens.css`.
- **Phase B** (spacing) — complete across all four in-scope files. Only documented
  exceptions remain: 1/2/3px hairlines, `-1px` sr-only clip, `36px` icon inset (now
  commented), `88px` sticky-bar clearance (commented).
- **Phase C** (typography) — complete across all four in-scope files.
  `grep -nE 'font-size:[^;]*[0-9]+px'` across all four returns **nothing**.

#### DONE — 2026-09-04 (Windows laptop, after the branch promotion)

The `UNFORGET.md` entry required by plan 005 §7 **has now been added**, verbatim from
the plan, as "onboarding.css still on the old spacing/type scale". The stale
"Site-wide spacing and typography migration" entry — which still read *"in progress —
see `plans/` for the implementation plan once written"* — was moved to `## Resolved`
with a summary of what shipped and what was verified, since its only remaining scope
was the excluded `onboarding.css`, now tracked as its own open entry.

Re-verified on this machine before closing it out, rather than trusting the notes:
exclusion still holds (`onboarding.css` uses 0 tokens), no hardcoded `font-size` px in
any of the four in-scope files, the 8 remaining hardcoded spacing values are all the
documented exceptions, each `--space-*`/`--fs-*` emitted exactly once, lint exit 0 with
only the 4 pre-existing warnings, build succeeds, and three consecutive `npm run tokens`
runs are byte-identical.

One defect found and fixed while verifying: `search.css`'s search-input padding carried
**two contradictory comments on the same line** — a block comment reading
`16 + 12 + 8 = 36` and a trailing one reading `17px icon + 12px gutter + 7px edge`. The
actual rule above it is `left: 12px; width: 16px`, so the block comment is right and the
trailing one was stale. Removed the wrong one.

#### Two deliberate deviations from the plan as written

1. **`search.css` 26px → `--fs-headline-md` (28px), not 22px as the plan said.**
   The plan's mapping would have collapsed `.ss-headline-lg` and `.ss-headline-md` to the
   same 22px, destroying a heading level. 28px preserves the 28/22/18 hierarchy.
2. **`.ss-row` vertical padding → `var(--row-pad-dense)` (10px), not `var(--space-md)`.**
   `DESIGN.md` → Layout is explicit that "search, filter, and compare screens stay dense —
   8–12px row padding", and the design system ships `--row-pad-dense` for exactly this.
   16px violated the design system's own density rule. (This was pre-existing from plan
   004, not introduced by 005 — corrected while in the file. Comment in `search.css`
   explains it.)

#### Verification status

Passing:
- `npm run lint` — exit 0, only the 4 pre-existing `only-export-components` warnings
- `npm run build` — succeeds
- Emitter determinism — three consecutive `npm run tokens` runs produce byte-identical
  output (md5 compared). **Note:** the plan's own `git diff --exit-code` check for this is
  wrong — it compares against the last commit, and `tokens.css` is legitimately modified
  in the working tree. Compare hashes across runs instead.
- Browser `/skoly` at 1600px — 10 rows render, dense rows 10px/16px, chips 4px/8px,
  sidebar 240px, compare bar present, console clean, no horizontal scroll
- Browser `/` — h1 38px Fraunces, line-height 43.32px (38 × 1.14 ✓), tracking −0.57px
  (38 × −0.015em ✓), no horizontal scroll

Not yet checked (session ended mid-verification):
- `/prihlaseni` and `/registrace` — form field/label/button alignment after the auth.css
  spacing and type changes
- `/onboarding/welcome` — should be **completely unchanged**; this is the visual proof the
  exclusion held (the grep above already confirms it structurally)
- 375px mobile width on the auth pages

---

## Paywall — believed complete, but verify independently

A dedicated paywall pass (both student and parent branches) was run via the
`onboarding-architect` agent shortly before the work above. **Flagging it here because an
automated check disputed whether it happened, and the disagreement could not be resolved
from inside that session — so verify rather than assume.**

The artifacts are on disk and are consistent with that pass having run:

| evidence | where |
|---|---|
| `ONE_STEP_CANCELLATION_IMPLEMENTED = false` — gate replacing an unbacked "cancel anytime" claim | `frontend/src/config/pricing.js:127` |
| `REFUND_GUARANTEE_DAYS = 3` + `refundTerms()` | `pricing.js:155`, `:298` |
| `trialDaysPhrase()` / `trialFreeLabel()` — Czech plural fix (`Prvních 3 dní` → `První 3 dny`) | `pricing.js:81`, `:88` |
| `planCopy(plan, role, field)` — added because plan copy showed student-voice *tykání* to parents | `pricing.js:251` |
| `cancellationTerms()` branching on the flag | `pricing.js:280` |
| `'Sdílet s dítětem' : 'Poslat rodičům'` — parent-branch share button | `Paywall.jsx:473` |
| `CtaProof` — trust signals adjacent to the CTA | `Paywall.jsx:120`, `:465` |

**To confirm on the new machine**, walk both branches at `/onboarding/paywall`. Set the
role first — `localStorage.setItem('skolamatch.role','parent')` (or `'student'`), then
reload. Check:

- parent branch shows **"Sdílet s dítětem"**; student shows **"Poslat rodičům"**
- parent copy uses *vykání* throughout (no *tykání* leaking onto plan cards)
- selecting **Měsíční** shows the honest cancellation line — *"Zrušení na jedno kliknutí
  zatím nemáme hotové, takže ho neslibujeme"* — not a "cancel anytime" promise
- trial text reads **"První 3 dny zdarma"** (not *"Prvních 3 dní"*)
- Sezónní přístup is pre-selected with the "Doporučujeme" tag; refund line reads
  *"Do 3 dnů…"* on both branches, worded differently per role
- student branch routes through the parental-confirmation step before the mocked charge

If any of those are missing, the pass did not fully land and should be re-run with the
`onboarding-architect` agent. Everything still outstanding on the paywall (real Stripe,
the one-step cancellation screen, an actual refund process) is in `UNFORGET.md` as
launch blockers — `PAYMENTS_MOCKED` is still `true`.

---

## What this session changed

All of the below was committed and pushed to `github.com/XarolApp/school-app` as part of
the migration — if you cloned the repo, you already have it. (Before that push, the repo's
last commit was `5a8381c` and ~96 files were uncommitted, including a large amount of
pre-existing drift from earlier sessions in onboarding, auth, lib and components.)

Modified: `frontend/scripts/gen-tokens-css.mjs`, `frontend/src/App.css`,
`frontend/src/index.css`, `frontend/src/design/tokens.js`,
`frontend/src/design/tokens.css` (generated), `frontend/index.html`, `CLAUDE.md`,
`design/DESIGN.md`, `docs/sources/README.md`, `plans/README.md`

New: `frontend/src/auth.css`, `frontend/src/pages/search.css`,
`plans/004-search-design-import.md`, `plans/005-spacing-typography-migration.md`,
`UNFORGET.md`, `design/` (the whole reorganized folder), `.claude/memory-backup/`,
`CONTEXT-HANDOFF.md` (this file)

**Not in the repo, by design:** `.env` and `frontend/.env` (gitignored — see setup
checklist step 7), and `.claude/worktrees/` (246MB of throwaway agent scratch dirs,
deleted before the push).

---

## Restarting the app on the new machine

Two terminals, per `CLAUDE.md`'s Quick Start. Backend from repo root (`node server.js`,
port 5000), frontend from `frontend/` (`npm run dev`, port 5173).

**Run `npm install` in both the repo root and `frontend/` rather than copying
`node_modules`** — it contains platform-specific binaries that may not work on the new
machine.

**`.env` files:** `.env` and `frontend/.env` both exist on disk. They are *gitignored*,
so they will NOT come through a `git clone` — but they WILL come through a direct folder
copy, as long as hidden/dotfiles are included in the copy. Check both exist on the new
machine before assuming Supabase and auth work; recreate from `.env.example` if missing.
The app still boots without them (auth stubs out, onboarding runs on demo data).

## Auto-memory — lives OUTSIDE this folder

Claude Code's per-project memory was stored at
`<user>/.claude/projects/C--Users-vojte-m1zb3wt-school-app/memory/` — **outside the repo,
so it does not transfer with the folder.** The project key is also derived from the
absolute path, so a new machine with a different username would not match it anyway.

Copies were placed in **`.claude/memory-backup/`** (inside the repo, so they travel).
Six files: `MEMORY.md` (the index) plus five memories covering the dual-buyer model,
the settled pricing structure, the standing "read the UX guide before frontend work"
rule, the `docs/sources/` pointer, and the documentation-upkeep preference.

These are reference copies, not live memory. To restore them as real memory on the new
machine, re-save the facts there (or copy the files into the new machine's own
`.claude/projects/<new-project-key>/memory/`). Nothing breaks if you skip this — the
same facts are in `CLAUDE.md` — but the memories carry the *reasoning* behind several
decisions in more detail.

## Suggested first move

1. Add the missing `UNFORGET.md` entry from `plans/005-spacing-typography-migration.md` §7.
2. Run the three unchecked browser verifications above.
3. Mark plan 005 `DONE` in `plans/README.md` (currently `IN PROGRESS`).
4. Then commit — this session produced a lot of unstaged work and none of it is saved
   to git history yet.
