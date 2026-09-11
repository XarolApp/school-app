# 007 — Rozhodovací matice redesign + match score as a criterion

- **Planned:** 2026-09-11, Opus 5, `/plan-then-build`
- **Base commit:** `a5741d9`
- **Design canvas (approved: direction A "Rozpis"):**
  https://claude.ai/code/artifact/56e40c3c-2e79-400b-ba8d-d48d157b3f69
  (source artboards in `design/decision-matrix/*.dc.html` — `Main.dc.html` is
  the approved results panel, `Vahy.dc.html` the weights panel; `Kompakt.dc.html`
  was the rejected alternative, kept for history)
- **Scope:** `/porovnani/matice` only. Three files.
- **Impact:** HIGH · **Effort:** M · **Risk:** Low (one page, no schema, no API)
- **Depends on:** nothing. **Enables:** plan 008 makes the new criterion light up
  for real users; until 008 ships it only works for accounts with a legacy run.

---

## Why

The founder could not read the current matrix. Root causes, all verified in code:

1. `Matice.jsx` draws ONE stacked bar whose segment width is `raw × weight`
   (`decisionMatrix.js` `weighted`). Two different quantities in one length —
   neither is recoverable.
2. Five per-criterion colours with no legend; in dark mode `--acc-line`,
   `--ok-soft`, `--line2` nearly vanish against the `--surface2` track.
3. `Math.max(b.weighted * 100, 2)` paints a 2% stub for a school scoring zero.
4. `match_score` — the questionnaire result, the product's most valuable signal —
   is never read by `decisionMatrix.js`.

---

## 1. Decisions (already made — do not re-derive)

| Decision | Choice |
|---|---|
| Visualisation | Drop the stacked bar. One labelled row per criterion per school. |
| Bar length means | `raw` only (0–1, relative to the compared set). Never `× weight`. No minimum width — 0 is an empty track. |
| Colour | Single hue (`--acc`) for every bar. Colour carries no criterion identity, so no legend exists or is needed. |
| Weight display | Separate uppercase caption at the row end (`ZÁSADNÍ` in `--acc`, others `--ink3`). |
| Ranking device | Rank badge `1` / `2` / `3`. First = filled `--acc`, rest = outline. **No composite percentage anywhere.** |
| Match score display | Keeps its real `%` (founder decision 2026-09-11). Chip text `{band} · {n} %`. |
| Match score in math | New criterion `shoda`, first in `CRITERIA`, default weight `zasadni`. Normalised with the same `minMax` as every other criterion. |
| Other default weights | Unchanged (`dost`). The mockup's `trochu` values were sample data. |
| Missing match score | Existing rule already handles it: a criterion with a null for ANY compared school is dropped from `usableCriteria`. `match_score` is all-or-none per account (`server.js` `withMatchScores`), so it is present for all or absent for all. |

### 1.1 Band thresholds for the chip (presentation only, not scoring)

| `match_score` | Label | Tone class |
|---|---|---|
| ≥ 75 | `Silná shoda` | `ok` → bg `--ok-soft`, text `--ok` |
| 45–74 | `Střední shoda` | `acc` → bg `--acc-soft`, text `--acc` |
| < 45 | `Slabá shoda` | `neutral` → bg `--surface2`, text `--ink3` |

### 1.2 Callout rules (at most two per school row, in this order)

Constants in `decisionMatrix.js`: `WEAK_THRESHOLD = 0.35`, `MATCH_GAP = 15`.

**(1) Gap note — info style, rank 1 only.** Show when ALL hold:
- the row is index 0;
- `shoda` is in this row's `breakdown` (i.e. usable);
- the compared school with the highest `match_score` is a different school;
- `bestMatch.match_score − row.school.match_score ≥ MATCH_GAP`.

Copy: `Vede celkově — ale <strong>{bestMatch.name}</strong> ti podle dotazníku sedí výrazně víc.`

**(2) Weak-spot note — warning style.** `weak = breakdown.filter(b => (b.weightKey === 'dost' || b.weightKey === 'zasadni') && b.raw < WEAK_THRESHOLD)`. Show when `weak.length > 0`.

- If `weak` is exactly one entry and it is `shoda`:
  - start: `b.raw === 0` → `Nejnižší shoda s dotazníkem z porovnávaných škol — a `; else → `Shoda s dotazníkem tu vychází slabě — a `
  - end: `weightKey === 'zasadni'` → `shodu máš nastavenou jako zásadní.`; else → `na shodě ti dost záleží.`
- Otherwise:
  - prefix: this school has the highest `match_score` among compared AND `shoda` usable → `Sedí ti nejvíc ze všech — ale slabá místa`; else → `Slabá místa`
  - full: `{prefix} jsou přesně v tom, na čem ti záleží: {joinCz(labels)}.` where each label is `lowerFirst(b.label)` wrapped in `<strong>`.

`joinCz(['a'])` → `a`; `(['a','b'])` → `a a b`; `(['a','b','c'])` → `a, b a c`.

All copy is present tense and gender-neutral (no `jsi nastavil/označil`). Do not
add counts like `(24)` — the mockup's numbers were illustrative.

---

## 2. `frontend/src/lib/decisionMatrix.js`

1. Prepend to `CRITERIA`:
   ```js
   { id: 'shoda', label: 'Shoda s tvým dotazníkem', available: true },
   ```
2. In `rawForCriterion`, add:
   ```js
   case 'shoda': {
     const values = schools.map((s) => (typeof s.match_score === 'number' ? s.match_score : null));
     const scale = minMax(values);
     return values.map((v) => scale(v));
   }
   ```
3. In `scoreByWeights`, add `weightKey: weightsById[c.id]` to each `breakdown` entry. Keep `weighted` (still used for `score`).
4. New exports:
   - `export const WEAK_THRESHOLD = 0.35;`
   - `export const MATCH_GAP = 15;`
   - `export function hasMatchScores(schools)` → `schools.length > 0 && schools.every((s) => typeof s.match_score === 'number')`
   - `export function matchBand(score)` → `{ label, tone }` per §1.1
   - `export function weakSpots(breakdown)` → per §1.2 (2)
   - `export function joinCz(items)` → per §1.2; returns a plain string array joined — see Matice for the `<strong>` version (Matice builds React nodes; give Matice its own tiny `joinCzNodes` or map with separators — implementer's local choice)
5. Update the file header comment: the matrix now also reads `match_score` from the server questionnaire run; still pure arithmetic, no AI.

## 3. `frontend/src/pages/Matice.jsx`

Imports to add: `useAuth` from `../components/AuthContext`; `{ Heart, Info, Lock, TriangleAlert }` from `lucide-react` (named imports only — verified present in the installed version); `hasMatchScores, matchBand, weakSpots, MATCH_GAP` from `../lib/decisionMatrix`.

1. `defaultWeights`: all available criteria `dost`, **except** `shoda: 'zasadni'`.
2. `const { isSignedIn } = useAuth();` and `const matchAvailable = hasMatchScores(schools);`
3. Delete `bestCriteria` and the `Nejlepší podle:` span.
4. **Weights panel** — render `shoda` specially, before the `CRITERIA.map` of the rest (skip `shoda` inside that map):
   ```
   <div className={`dp-criterion dp-criterion-featured${matchAvailable ? '' : ' is-locked'}`}>
     head: <span className="dp-criterion-label"><Heart size={15} /> Shoda s tvým dotazníkem</span>
           <span className="ss-caption dp-criterion-state">{matchAvailable ? levelLabel : 'Nevyplněno'}</span>
     segmented: same buttons, disabled when !matchAvailable
     note (ss-caption dp-criterion-note):
       matchAvailable → "Z tvých odpovědí v dotazníku. Ve výchozím nastavení váží nejvíc."
       !matchAvailable && !isSignedIn → "Shodu počítáme z tvého dotazníku. Přihlas se a doplní se sama." + <Link to="/prihlaseni">Přihlásit se</Link>
       !matchAvailable && isSignedIn → "Shodu počítáme z úvodního dotazníku. Jakmile ho máš uložený u účtu, doplní se tady sama."
   ```
   No "Vyplnit dotazník" button for signed-in users — until plan 008 ships it would be a false promise.
   For the two `available: false` criteria, replace the `🔒` emoji with `<Lock size={13} aria-hidden="true" />`.
5. **Result card head** — under the existing title add
   `<p className="ss-caption dp-matrix-result-sub">Delší proužek = škola je v tom kritériu lepší než ostatní porovnávané. Váhy nastavuješ ty.</p>`
6. **Each ranked row** (replace the current row body):
   - Rank: `<div className={`dp-matrix-rank-badge${i === 0 ? ' is-first' : ''}`}>{i + 1}</div>`
   - Head: school name `Link` (unchanged) + chip when `typeof r.school.match_score === 'number'`:
     `<span className={`dp-match-chip dp-match-chip-${band.tone}`}>{band.label} · {Math.round(r.school.match_score)} %</span>`
   - Criterion list `dp-crit-list`, one `dp-crit-row` per `r.breakdown` entry, in `CRITERIA` order:
     - `<div className={`dp-crit-label${b.criterionId === 'shoda' ? ' is-featured' : ''}`}>{b.label}</div>`
     - `<div className="dp-crit-track"><div className="dp-crit-fill" style={{ width: `${b.raw * 100}%` }} /></div>`
     - `<div className={`dp-crit-weight${b.weightKey === 'zasadni' ? ' is-hi' : ''}`}>{LEVELS label for b.weightKey}</div>`
   - Callouts per §1.2 as `<div className="dp-matrix-note">` (Info icon, size 16) and `<div className="dp-matrix-note is-warn">` (TriangleAlert icon, size 16).
7. Keep unchanged: loading state, empty state, "Nastav aspoň jedno kritérium" empty result, the `Pořadí tady není pořadí přihlášky` callout.
8. Replace the bottom footnote text with:
   `Výpočet je obyčejná matematika nad daty z Cermatu a tvého dotazníku — žádná AI. Proužky ukazují, jak si škola stojí proti ostatním porovnávaným, ne proti celé Praze. Kritéria, u kterých nemáme data pro všechny porovnávané školy, se do součtu nezapočítávají.`

## 4. `frontend/src/pages/decision.css`

**Delete:** `.dp-matrix-rank`, `.dp-matrix-row:nth-child(n + 2) .dp-matrix-rank`, `.dp-matrix-bar`, `.dp-matrix-bar-seg`, `.dp-matrix-bar-sance`, `.dp-matrix-bar-mista`, `.dp-matrix-bar-typ`, `.dp-matrix-bar-jazyky`, `.dp-matrix-bar-skolne`.

**Change:** `.dp-matrix-row-body { gap: 12px; }` (was `var(--space-sm)`).

**Add** (values lifted from the approved artboard; tokens only, no raw colours):

```css
.dp-matrix-result-sub { margin-top: 4px; }

.dp-matrix-rank-badge {
  width: 36px; height: 36px; flex: none; box-sizing: border-box;
  border-radius: var(--r-chip); border: 1px solid var(--line2);
  color: var(--ink3); display: flex; align-items: center; justify-content: center;
  font-family: var(--heading); font-size: 18px; font-weight: 600;
}
.dp-matrix-rank-badge.is-first { background: var(--acc); border-color: var(--acc); color: var(--acc-ink); }

.dp-match-chip {
  display: inline-flex; align-items: center; padding: 4px 10px;
  border-radius: var(--r-chip); font-size: 12px; font-weight: 600; white-space: nowrap;
}
.dp-match-chip-ok { background: var(--ok-soft); color: var(--ok); }
.dp-match-chip-acc { background: var(--acc-soft); color: var(--acc); }
.dp-match-chip-neutral { background: var(--surface2); color: var(--ink3); }

.dp-crit-list { display: flex; flex-direction: column; gap: 9px; }
.dp-crit-row { display: grid; grid-template-columns: 210px minmax(0, 1fr) 68px; gap: 12px; align-items: center; }
.dp-crit-label { font-size: var(--fs-caption); color: var(--ink2); }
.dp-crit-label.is-featured { color: var(--ink); font-weight: 600; }
.dp-crit-track { height: 8px; border-radius: 8px; background: var(--surface2); overflow: hidden; }
.dp-crit-fill { height: 100%; border-radius: 8px; background: var(--acc); }
.dp-crit-weight { font-size: 11px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; text-align: right; color: var(--ink3); }
.dp-crit-weight.is-hi { color: var(--acc); }

.dp-matrix-note {
  display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px;
  border-radius: var(--r-chip); background: var(--surface2);
  font-size: var(--fs-caption); line-height: 1.5; color: var(--ink2);
}
.dp-matrix-note svg { flex: none; margin-top: 1px; color: var(--ink3); }
.dp-matrix-note strong { color: var(--ink); }
.dp-matrix-note.is-warn { background: var(--danger-soft); }
.dp-matrix-note.is-warn svg { color: var(--danger); }

.dp-criterion-featured {
  padding: var(--space-md); border: 1px solid var(--acc-line);
  border-radius: var(--r-button); background: var(--acc-soft);
}
.dp-criterion-featured .dp-criterion-label { display: inline-flex; align-items: center; gap: 6px; }
.dp-criterion-featured .dp-criterion-label svg { color: var(--acc); }
.dp-criterion-featured:not(.is-locked) .dp-criterion-state { color: var(--acc); font-weight: 600; }

@media (max-width: 560px) {
  .dp-crit-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "label weight" "track track";
    row-gap: 6px;
  }
  .dp-crit-label { grid-area: label; }
  .dp-crit-weight { grid-area: weight; }
  .dp-crit-track { grid-area: track; }
}
```

If `--fs-caption` is not defined in `tokens.css`, use `13px` (it is defined as of `a5741d9`).

---

## 5. Verification

1. `cd frontend && npm run lint` — clean.
2. Dev server running (backend on 5001 on this MacBook, see CLAUDE.md). Put 3 schools in the comparison (`/skoly` → check 3 → Porovnat), open `/porovnani/matice`.
3. **Signed out:** shoda panel is locked with `Nevyplněno` and a `Přihlásit se` link; no match chips; rows show the 5 other criteria; ranking still renders; badge 1 filled, 2–3 outlined.
4. **Signed in with the founder's account (has a legacy run):**
   - every row has a chip whose `%` equals the `% shoda` pill for the same school on `/porovnani`;
   - `Shoda s tvým dotazníkem` is the first, bold criterion row;
   - the school with the lowest compared value in any criterion shows an **empty** track (inspect: `width: 0%`);
   - set shoda to `Nezáleží` → shoda rows disappear from every school and the order may change; set back to `Zásadní` → they return.
   - set every criterion to `Nezáleží` → "Nastav aspoň jedno kritérium…" message.
5. Callout sanity: with shoda `Zásadní`, any school whose shoda bar is under ~35% shows a warning note; no note contains `jsi nastavil` / `jsi označil`.
6. `resize_window` `colorScheme: dark` → bars, chips and notes readable; no near-invisible elements.
7. `resize_window` preset `mobile` → each criterion shows label + weight on one line, bar underneath; no horizontal page scroll. Reset to `desktop` afterwards.
8. `read_console_messages` onlyErrors — nothing new beyond the known unauthenticated 401s when signed out.
9. Screenshot the signed-in desktop state for the founder.

## 6. After it passes

- Commit (`Redesign rozhodovací matice: labelled per-criterion rows, match score as criterion`) and **push** (CLAUDE.md push rule).
- `plans/README.md`: add rows for 007 (`DONE`) and 008 (`TODO`) to the status table.
- `CLAUDE.md` item 10 / Supabase notes need no change; nothing architectural moved.
