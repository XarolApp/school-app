# 008 — Save onboarding quiz answers to the account (so every student gets a match %)

- **Planned:** 2026-09-11, Opus 5, `/plan-then-build`
- **Base commit:** `a5741d9` (implement AFTER plan 007)
- **Scope:** new server endpoint + translator module, one schema change, a
  localStorage stash in the frontend, flush on sign-in.
- **Impact:** HIGH · **Effort:** M · **Risk:** Medium (touches auth lifecycle and
  stores data about minors)
- **Manual step for the founder:** re-run `supabase-setup.sql` in the Supabase SQL
  editor after §1 lands (the agent has no database access).

---

## Why

`match_score` on every surface (`/skoly`, school detail, `/porovnani`, the
rozhodovací matice from plan 007) is computed in `server.js` `withMatchScores`
from the account's newest `questionnaire_runs` row. **Nothing on `main` writes
that table** — the only writer was the retired `/dotaznik` UI on `older-version`.
The onboarding quiz keeps answers in `sessionStorage`
(`skolamatch.onboarding.answers`) and scores them in the browser only. So every
new student has no match % anywhere after signing up.

`OnboardingFlow.jsx`'s own comment anticipated this: *"Persist only if and when
there is an account to attach it to and a reason to keep it."*

---

## 1. Decisions (already made — do not re-derive)

### 1.1 Translate into the EXISTING server engine; do not port the onboarding engine

Store the answers in the server questionnaire's shape and score them with the
existing `lib/matching.js` `scoreSchools`.

- One `%` engine app-wide. The `% shoda` pill already shipping on `/porovnani`
  comes from this engine, and the founder chose to keep `%`.
- The onboarding engine (`frontend/src/lib/matching.js`) is explicitly a
  band-only engine ("never a spurious percentage") — porting it would contradict
  that decision.
- Accepted tradeoff: the onboarding **Reveal** ranking (browser engine) and the
  post-signup `%` (server engine) can order schools slightly differently. Log it
  in `UNFORGET.md` (§6).

### 1.2 Why a new endpoint, not `POST /api/questionnaire`

That route (server.js ~1146) calls OpenRouter (cost), counts against the monthly
quota, requires `requireAccess`, and runs `validateAnswers`, which **rejects** a
translated onboarding set (it requires `predmety`, `velikost`, `zacatek`, which
onboarding never asks).

### 1.3 When the save happens — the email-confirmation problem

At signup Supabase issues **no session** until the confirmation link is clicked,
and `requireAuth` rejects unconfirmed tokens. The link usually opens a new tab,
where `sessionStorage` is empty. Therefore:

1. On signup success, `CreateAccount.jsx` writes a **localStorage stash**:
   `skolamatch.pendingOnboardingAnswers` = `{ answers, email, savedAt }`.
2. Whenever `AuthContext` sees a session, it **flushes** the stash to the server,
   but only if `session.user.email` equals the stash email (case-insensitive).
   This stops a shared computer from saving student A's answers into account B.
3. The stash expires after **7 days**, and is cleared on sign-out.

Known limit (log in UNFORGET): signing up on device X and confirming + using only
device Y means the stash never reaches Y. It flushes the next time they sign in on X.

### 1.4 Schema: a `source` column

- `source text not null default 'questionnaire'`, check `in ('questionnaire','onboarding')`.
- Partial unique index: one `onboarding` run per account → the insert is
  idempotent (two tabs flushing at once cannot create two rows).
- `readUsage` counts only `source = 'questionnaire'` → the onboarding save never
  eats the student's monthly allowance.

### 1.5 What gets stored (data minimisation)

Only fields the server scorer consumes. `certainty` and `priority` are validated
and then **discarded** (no server counterpart). The row stores `answers`
(translated), `matches` (top 20 `{ school_id, score }`), `model: null`,
`label: 'Úvodní dotazník'`, `source: 'onboarding'`, `is_default: false`.

`is_default: false` is deliberate: a brand-new account has no other runs, so the
resolver (`is_default desc, created_at desc`) picks it as newest. An account that
already flagged a default keeps that choice.

If the translated answers contain **no scoreable field at all**, nothing is saved
(every school would read `0 %`, which is misleading): respond
`200 { saved: false, reason: 'nothing_to_score' }`.

### 1.6 Translation table (onboarding → server)

| Onboarding key / value | Server key / value |
|---|---|
| `studyType`: `gymnazium` / `odborna` / `ucebni` | `typ`: same value |
| `studyType`: `nevim` | omitted |
| `future`: `vysoka` | `po_skole`: `vysoka` |
| `future`: `remeslo` | `po_skole`: `prace` |
| `future`: `nevim` | omitted |
| `practice`: `praxe` / `teorie` | `styl`: same value |
| `practice`: `obojí` / `nevim` | omitted (server treats `kombinace` as no preference anyway) |
| `language`: `hodne` | `jazyky`: `velmi` |
| `language`: `trochu` / `nezalezi` / `nevim` | omitted (server skips `stredne`; same effect) |
| `districts`: `['1'..'22']` | `casti`: `'Praha N'` each; **all 22 selected → omitted** |
| `focus`: `prirodni` | `oblasti`: `prirodni` |
| `focus`: `it` | `oblasti`: `it` **and** `technika` (onboarding's "IT a technika" covers both) |
| `focus`: `ekonomie` | `oblasti`: `ekonomika` |
| `focus`: `humanitni` / `umeni` / `zdravotnictvi` / `pedagogika` / `gastro` | `oblasti`: same value |
| `focus`: `remeslo` | `oblasti`: `remesla` |
| `focus`: `sport` | dropped — no server area (log in UNFORGET) |
| `focus`: `nevim` | ignored |
| `certainty`, `priority` | validated, discarded |

`oblasti` is deduplicated; no cap (the server validator's `max: 5` is not applied
to onboarding runs — they are identified by `source` and are not required to pass
`validateAnswers`).

**Note the diacritic:** onboarding stores `'obojí'` (with `í`) for `practice` and
`priority`. Match it exactly.

---

## 2. Schema — `supabase-setup.sql`

Append after the `questionnaire_runs_user_default_idx` block (~line 168), same
idempotent style and comment voice as the surrounding ALTERs:

```sql
-- Where a set of answers came from. 'onboarding' rows are written once, when a
-- new account first signs in, from the onboarding quiz; they cost no AI call
-- and must not count against the monthly questionnaire allowance.
alter table public.questionnaire_runs
  add column if not exists source text not null default 'questionnaire'
  check (source in ('questionnaire', 'onboarding'));

-- At most one onboarding set per account, so a double flush (two tabs, a retry)
-- cannot create duplicates — the second insert simply conflicts.
create unique index if not exists questionnaire_runs_one_onboarding_idx
  on public.questionnaire_runs (user_id) where source = 'onboarding';
```

No RLS change: the table already has no INSERT policy, so `server.js` stays the
only writer.

Also update the `questionnaire_runs` row in CLAUDE.md's Supabase schema table to
mention `source`.

## 3. Server

### 3.1 New file `lib/onboardingAnswers.js` (CommonJS, like `lib/questionnaire.js`)

Exports `{ validateOnboardingAnswers, translateOnboardingAnswers }`.

- `validateOnboardingAnswers(raw)` → `{ ok: true, answers }` or `{ ok: false, error }`.
  - `raw` must be a plain object; unknown keys ignored.
  - Allowed values (anything else on a known key → `{ ok: false }`):
    - `focus`: array of `prirodni it ekonomie humanitni umeni zdravotnictvi pedagogika gastro sport remeslo nevim`, deduped, length ≤ 11
    - `future`: `vysoka remeslo nevim`
    - `studyType`: `gymnazium odborna ucebni nevim`
    - `language`: `hodne trochu nezalezi nevim`
    - `practice`: `praxe teorie obojí nevim`
    - `districts`: array of strings `'1'`..`'22'`, deduped, length ≤ 22
    - `certainty`: `jiste spis vubec`
    - `priority`: `zamereni blizkost obojí`
  - Every key optional. Error messages in Czech, generic (`Odpovědi z dotazníku mají neplatný formát.`).
- `translateOnboardingAnswers(clean)` → server-shape object per §1.6. Only sets a
  key when it has a value (empty arrays → key omitted).
- Export an `isScoreable(serverAnswers)` helper: true when at least one of
  `typ po_skole styl jazyky casti oblasti` is present.

### 3.2 `server.js`

1. `require` the new module next to the other `lib/` requires.
2. `readUsage`: add `.eq('source', 'questionnaire')` to the count query.
3. New route, placed with the other `/api/me` routes (near `DELETE /api/me`):

```
app.post('/api/me/onboarding-answers', requireAuth, async (req, res) => {
  validate req.body?.answers → 400 { error } on failure
  translate → if !isScoreable → 200 { saved: false, reason: 'nothing_to_score' }
  fetch schools: supabase.from('schools').select('*') → 500 on error, 503 if empty (same messages as POST /api/questionnaire)
  matches = scoreSchools(translated, withDistricts(schools)).slice(0, 20).map(({ school_id, score }) => ({ school_id, score }))
  insert { user_id, answers: translated, matches, model: null, label: 'Úvodní dotazník', source: 'onboarding', is_default: false }
  on insertError.code === '23505' → 200 { saved: false, reason: 'already_saved' }
  on other insertError → 500
  → 201 { saved: true }
});
```

- `requireAuth` only — NOT `requireAccess` (saving your own data; a lapsed trial must not block it).
- Covered by the global `/api/` rate limiter already; no extra limiter.
- Comment the route explaining §1.2 and §1.4 in the file's existing voice (why, not what).

## 4. Frontend

### 4.1 New file `frontend/src/lib/pendingOnboardingAnswers.js`

Same try/catch discipline as `lib/searchPrefs.js`.

```js
const KEY = 'skolamatch.pendingOnboardingAnswers';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function stashOnboardingAnswers(answers, email)  // writes { answers, email: email.trim().toLowerCase(), savedAt: Date.now() }
export function readOnboardingStash()                  // null if missing, malformed, or older than MAX_AGE_MS (and clears it in that case)
export function clearOnboardingStash()
```

### 4.2 `frontend/src/api.js`

```js
export function saveOnboardingAnswers(answers) {
  return request('/api/me/onboarding-answers', { method: 'POST', body: JSON.stringify({ answers }) });
}
```

### 4.3 `CreateAccount.jsx`

- Take `answers` from `useOnboarding()` (it is exposed — see `useOnboarding.js`).
- After `signUp` succeeds and before `goNext()`: `if (answers) stashOnboardingAnswers(answers, email);`
- Update the header comment (lines 29–30): answers are still not sent to Supabase
  at signup; they are stashed locally and saved once the account signs in with a
  confirmed email (point to `lib/pendingOnboardingAnswers.js`).

### 4.4 `AuthContext.jsx`

Add a module-level flush with an in-flight guard (getSession and SIGNED_IN often
fire together on load):

```js
let flushInFlight = false;

async function flushOnboardingStash(activeSession) {
  if (!activeSession || flushInFlight) return;
  const stash = readOnboardingStash();
  if (!stash) return;
  const email = activeSession.user?.email?.toLowerCase();
  if (!email || email !== stash.email) return;   // different person on this device — leave it
  flushInFlight = true;
  try {
    await saveOnboardingAnswers(stash.answers);
    clearOnboardingStash();                         // 201 saved, or 200 already_saved / nothing_to_score
  } catch (err) {
    if (err?.status === 400) clearOnboardingStash(); // bad data will not fix itself
    // 401/403 (unconfirmed), 5xx, network: keep for the next session
  } finally {
    flushInFlight = false;
  }
}
```

- Call `flushOnboardingStash(data.session)` in the `getSession().then` callback
  **without awaiting it** (must not delay `setLoading(false)`), and
  `flushOnboardingStash(nextSession)` in `onAuthStateChange`, also not awaited.
- `signOut` and `signOutEverywhere`: call `clearOnboardingStash()` first.
- No live refresh of already-rendered pages after a save; the next page fetch
  picks up `match_score`. Acceptable — note it in the flush function's comment.

### 4.5 `OnboardingFlow.jsx`

Update the comment at ~line 38 so it no longer says nothing is ever written: quiz
answers stay client-side through onboarding; after account creation they are
stashed locally and saved to the account on first confirmed sign-in.

## 5. Verification

1. **Translator (no DB needed):** from repo root
   ```bash
   node -e "const m=require('./lib/onboardingAnswers'); const v=m.validateOnboardingAnswers({focus:['it','sport','ekonomie','nevim'],future:'remeslo',studyType:'nevim',language:'hodne',practice:'obojí',districts:['13','5'],certainty:'spis',priority:'obojí'}); console.log(JSON.stringify(v.ok && m.translateOnboardingAnswers(v.answers)))"
   ```
   Expected (key order may differ): `{"oblasti":["it","technika","ekonomika"],"po_skole":"prace","jazyky":"velmi","casti":["Praha 13","Praha 5"]}` — no `typ`, no `styl`, no `sport`, no `certainty`/`priority`.
   Also: all 22 districts → no `casti`; `{practice:'invalid'}` → `ok: false`; `{}` → translates to `{}` and `isScoreable` false.
2. `node --check server.js` and `cd frontend && npm run lint` — clean.
3. **Founder runs `supabase-setup.sql`** in the Supabase SQL editor (manual). Restart the backend.
4. Browser: run the onboarding flow to the `ucet` step with a fresh test email the founder controls; after submit, `javascript_tool`: `localStorage.getItem('skolamatch.pendingOnboardingAnswers')` → present, with the lowercased email.
5. **Founder clicks the confirmation email** (manual), then signs in on the same browser. Network tab: one `POST /api/me/onboarding-answers` → `201 {saved:true}`; stash key gone.
6. Navigate to `/skoly` → schools show a match %; `/porovnani/matice` → shoda criterion unlocked (plan 007).
7. Sign out, sign in again → no second POST, or a POST answered `200 already_saved`; still one onboarding row (check in Supabase table editor).
8. Shared-device check: create a stash for email A, sign in as the founder's own account → no POST is sent and the stash remains.
9. Founder's existing account: quota on `GET /api/questionnaire` `usage.used` unchanged by the onboarding row.

## 6. Housekeeping

- `UNFORGET.md` — add three entries in the existing format (`## title`, Found / Urgency / Release/context, body):
  1. **Onboarding Reveal ranking vs server match % can disagree** — two engines (browser band engine, server % engine); low urgency; consider unifying.
  2. **`sport` focus has no server `oblasti` area** — dropped on save; low urgency; add an area + keywords to `lib/matching.js` if sport schools matter.
  3. **Onboarding answers only reach the account on the signup device** — cross-device confirmation leaves the stash behind; low urgency; resolves naturally if the email-confirmation redirect fix (existing UNFORGET entry) resumes onboarding in the confirming tab.
- `CLAUDE.md`: onboarding item 7 ("Quiz answers are client state (sessionStorage) only — nothing about a minor is written to Supabase during onboarding") → update to the stash-then-save-on-confirmed-sign-in reality; Supabase table row for `questionnaire_runs` mentions `source`.
- `plans/README.md`: 008 → `DONE`.
- Commit + **push**.
