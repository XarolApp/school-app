# Plan 011 — Questionnaire: results screen, run history, unlimited runs, AI-optional

## Context

`/dotaznik` works but its results screen is a flat list of 8 rows
(`Questionnaire.jsx`, 215 lines) and it throws away most of what the backend
already gives it. The user's ask: a proper results surface showing the top 10
with AI reasoning, a run history where past runs can be named / set as default
/ archived, confirm dialogs that discourage casual retaking, and honest
behaviour while there are no OpenRouter credits.

### The important finding: the backend is nearly all there

Read before writing any new endpoint — most of this exists and is well built:

| Capability | Status |
|---|---|
| `questionnaire_runs.label` / `is_default` / `archived_at` / `source` | exists (`supabase-setup.sql`) |
| `GET /api/questionnaire` returns questions, usage, `active` **and the full `runs` history** | exists — the page fetches `runs` and renders **nothing** |
| `GET /api/questionnaire/runs/:id` | exists |
| `PATCH /api/questionnaire/runs/:id` (rename, ≤60 chars) | exists |
| `PUT /api/questionnaire/runs/:id/default` | exists, refuses archived runs (409) |
| `PATCH /api/questionnaire/runs/:id/archive` | exists, refuses archiving the default (409) |
| A new run automatically becomes the default | exists — `setDefaultRun` after insert (server.js ~1443) |
| Old runs re-scored against current school data | exists — `buildRunResult` |
| Run-management routes work on a lapsed trial (`requireAuth`, not `requireAccess`) | exists, deliberate |

So this plan is **mostly a frontend build** plus five small backend changes.

### Decisions taken (2026-09-19)

1. **AI optional** — submitting must work without `OPENROUTER_API_KEY`; real
   percentages, honestly-absent reasoning.
2. **Unlimited runs** — no monthly cap. Cost measured at ~$0.0005/run on Gemini
   2.5 Flash Lite (~1,500 in / ~800 out tokens, shortlist block measured at
   2,479 chars for 10 real schools). 100 runs ≈ $0.05.
3. **Percentages**, not bands — this surface deliberately differs from the
   onboarding quiz. Resolves the "score display resolution" open item in
   `UNFORGET.md` for the standalone questionnaire only.
4. **Design scope**: results + history + dialogs. The existing single-page
   question form keeps working as-is.
5. **Model**: `google/gemini-2.5-flash-lite`.

### Prerequisite

The visual design comes from the `/design` canvas the user is generating
separately. **Structure and behaviour below are complete and implementable; take
spacing, hierarchy and exact copy from that canvas.** If the canvas is not ready,
build the behaviour against existing `ss-*` primitives and restyle after.

---

## Backend

### 1. `lib/questionnaire.js` — AI becomes optional

Today `requestMatches()` always calls the model. Split scoring from wording so
scoring can stand alone:

- Keep `scoreSchools(answers, schools)` as the single source of ranking.
- Replace `MATCH_COUNT = 8` with **two** constants — the stored list and the
  AI-reasoned list are now different lengths:
  ```js
  const SHORTLIST_COUNT = 30; // stored on the run; what "celé pořadí" expands to
  const REASON_COUNT = 10;    // how many get an AI sentence
  ```
- `requestMatches({ answers, schools, apiKey, model, referer })`:
  - shortlist = `scoreSchools(...).slice(0, SHORTLIST_COUNT)`
  - **if `apiKey` is falsy**: return the shortlist with `reason: ''` on every
    match. No network call.
  - else: ask for reasons on `shortlist.slice(0, REASON_COUNT)` only, and if
    `requestReasons` throws, `console.error` it and fall back to the same
    `reason: ''` shape rather than failing the submission.
- `DEFAULT_MODEL` → `'google/gemini-2.5-flash-lite'`.

Keep `extractJson`'s tolerance and the existing id-validation of the model's
reply — a cheaper model makes both more load-bearing, not less.

### 2. `server.js` — drop the 503, drop the quota

In `POST /api/questionnaire` (~line 1355):

- **Delete** the `if (!OPENROUTER_API_KEY) return res.status(503) …` guard.
- **Delete** the monthly-quota rejection.
- **Keep `questionnaireLimiter`** — burst protection is what actually stops a
  scripted loop, and `requireAccess` already means only trialing/paying accounts
  reach this route. Removing the cap must not remove either of these.
- Store `model: apiKeyPresent ? OPENROUTER_MODEL : null`. `model === null` is
  what the UI reads to explain the missing sentence, so don't write a model name
  for a run the model never saw.
- Leave the `setDefaultRun(req.user.id, run.id)` call exactly as it is — the new
  run becoming default is already the required behaviour.

In `readUsage()` (~line 1240): every account is now unlimited. It already has a
correct unlimited shape for developer accounts — return that for everyone
(`{ used: 0, limit: null, remaining: null, unlimited: true, resetsAt: null }`)
and delete the counting query and `MONTHLY_LIMIT`. Do not leave the constant
behind as dead config.

### 3. `server.js` — the onboarding run becomes the default explicitly

`POST /api/me/onboarding-answers` inserts with `is_default: false` (~line 494),
which contradicts "the onboarding submission is the default". It *appears* to
work only because `scoringRunQuery` falls back to newest-when-none-flagged.
Insert it, then call `setDefaultRun(req.user.id, run.id)` the same way the
standalone POST does. Make the insert `.select('id').single()` so there is an id
to pass. Leave `source: 'onboarding'` and the `label: 'Úvodní dotazník'` alone.

---

## Frontend

### 4. `frontend/src/api.js` — four missing helpers

Only `fetchQuestionnaire` and `submitQuestionnaire` exist. Add, following the
existing `request()` idiom:

```js
export function fetchQuestionnaireRun(id)          // GET  /api/questionnaire/runs/:id
export function renameQuestionnaireRun(id, label)  // PATCH { label }
export function setDefaultQuestionnaireRun(id)     // PUT   /runs/:id/default
export function archiveQuestionnaireRun(id, archived) // PATCH { archived }
```

### 5. `frontend/src/components/ConfirmDialog.jsx` — new, shared

`Matice.jsx` (~line 418) already has a good dialog: `role="alertdialog"`,
`aria-modal`, `aria-labelledby`, backdrop click-to-dismiss, `stopPropagation` on
the panel. Two more copies of that markup is two too many.

Extract it as a component taking `{ icon, title, body, cancelLabel, confirmLabel,
onCancel, onConfirm }`, with new `ss-dialog-*` classes in `styles/ui.css` copied
from `decision.css`'s `.dp-confirm-*` rules.

**Leave `Matice.jsx` untouched.** It is flagged in `UNFORGET.md` as still
awaiting a human review pass, and rewiring it here would mean re-verifying it for
no functional gain. This accepts one duplicated CSS block on purpose; log the
follow-up in `UNFORGET.md` rather than doing it now.

### 6. `frontend/src/pages/Questionnaire.jsx` — the rebuild

Currently one page that shows the form, or a result. It becomes three regions
driven by what `GET /api/questionnaire` already returns (`active`, `runs`,
`questions`, `usage`):

**A. Results (default view when `active` exists)**
- Header: which run is active (`label`, or a date-derived fallback — the server
  deliberately stores no label for unnamed runs), when it was taken.
- Top 10 rows: rank, `Math.round(score)` %, school name linking to `/skoly/:id`,
  and the AI sentence.
  - When `match.reason` is empty: render an explicit "zdůvodnění zatím není k
    dispozici" note. **Never** invent text, and never hide the row — the
    percentage is real and is the point.
  - When the whole run has `model === null`, show one explanation at the top of
    the list rather than repeating it on all ten rows.
- "Zobrazit celé pořadí" expands to the remaining stored matches (up to
  `SHORTLIST_COUNT`, no sentences below rank 10).
- Guidance copy the user asked for: answer honestly, retaking often doesn't
  improve the result.
- "Vyplnit znovu" opens **Dialog 1**.

**B. Run history (when `runs.length > 1`)**
- Row per run: name (inline-editable, ≤60 chars), date, default badge, archived
  state.
- Actions: "Nastavit jako výchozí", rename, archive/unarchive.
- Surface the backend's two 409s as readable messages instead of generic errors:
  archiving the default, and setting an archived run as default.
- Setting a default must refresh the results region — it changes every
  percentage across the app.

**C. The form** — unchanged behaviour, reachable from "Vyplnit znovu".

**Dialog 1 — before retaking.** Honest framing, no scare copy (zero-shame rule):
retaking doesn't produce better schools, answering truthfully does. Confirm
proceeds to the form.

**Dialog 2 — after a successful submit.** The new run is already the default
(the server did it). Offer "Ponechat předchozí jako výchozí", which calls
`setDefaultQuestionnaireRun(previousDefaultId)`. Capture that id **before**
submitting — after the response it is no longer flagged anywhere.

### 7. `frontend/src/pages/questionnaire.css`

Restyle to the canvas. Tokens only — no hardcoded colours or radii
(`tokens.js` is the source of truth; `tokens.css` is generated, never
hand-edited).

---

## Deliberately unchanged

`lib/matching.js` (both copies), `schoolFeatures.js`, the onboarding quiz UI and
its band-only display, `Search.jsx`, `Porovnani.jsx`, `Matice.jsx`,
`decision.css`. If the work seems to require editing these, stop and flag it.

---

## Verification

**Backend, no `OPENROUTER_API_KEY` set** (the state the user is actually in):

```bash
PORT=5001 node server.js
# submit as a signed-in trialing account — expect 201, real percentages,
# every reason empty, model null. NOT 503.
```
- Submit twice in a row: both succeed (no quota), the second becomes default.
- `GET /api/questionnaire` → `usage.unlimited === true`.
- Rename a run, set an older run as default, confirm `/skoly` match percentages
  change to match that older run.
- Archive the default → expect the 409 with its Czech message, not a 500.

**With a key set** (once credits exist): same flow, reasons populated on exactly
the top 10, ranks 11+ have scores and no sentence, `model` is the Gemini id.

**Browser** (`npm run dev`, verify yourself per CLAUDE.md — don't ask the user):
results screen at 390px and 1280px; expand to the full ranking; both dialogs
including "keep the previous default"; rename; set-default and confirm the
results region refreshes; empty state on an account with no runs.

**Lint/build:** `npm run lint` (expect only the 4 pre-existing
`only-export-components` warnings) and `npx vite build`.

---

## Bookkeeping

- `CLAUDE.md`: the questionnaire is no longer AI-gated (scores work without a
  key), runs are unlimited, and the default model is Gemini 2.5 Flash Lite.
  Also fix the stale line saying the standalone questionnaire has "no UI wired
  to it" — `/dotaznik` has existed since 2026-09-12.
- `UNFORGET.md`:
  - Close "score display resolution" **for the standalone questionnaire**
    (percentages); it stays open for school-detail surfaces.
  - Add: `Matice.jsx` should adopt the shared `ConfirmDialog` once its human
    review pass happens.
  - Add: Czech output quality of Gemini 2.5 Flash Lite is unverified — fold it
    into the existing "AI feature prompts need real human editing" item, which
    now has a second reason to happen (cheaper model, minors reading it).
  - Note that the monthly quota was removed deliberately; the code is in git
    history if abuse ever appears.
