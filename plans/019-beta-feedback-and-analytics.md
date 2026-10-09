# 019 — Beta feedback, tracking and analytics

**Status, updated 10 October:** implementation/history plan, not deployment acceptance. Steps 2–12 were committed and full rankings implemented after the 5 October founder decision; the 121/127-test reports describe their dated snapshots. A fresh read-only check on 10 October exposes `beta_profile.role_note`, a 48-hour window, one current cohort code and cutoff 18 October at 23:59 Europe/Prague. The earlier missing-column/12 October diagnosis is superseded. Fresh/repeated SQL, grants/RLS/Storage isolation, privacy/erasure and complete enrollment/feedback/expiry verification remain gates. See [current evidence](../reports/deployment-review-2026-10-07/beta-cohort-schema-2026-10-10.json) and the deployment handoff; metadata is not proof of a complete migration.

**Current contract:** only messages through the main feedback form or access gate renew access; quick ratings never do (founder confirmed 10 October). Beta is free, payment screens are an optional preview, and no beta Stripe operation is permitted. Plan 020 and the current [logic](../docs/beta_testing_logic.md)/[runbook](../docs/beta_testing_operations.md) supersede this original build specification where behavior differs. The detailed event/UI/endpoint lists below are historical design, not a claim that the deployed app exactly follows every item.
**Builds on:** plan 016 (beta program, implemented) and `docs/beta_testing_logic.md`. This plan **extends** 016; it does not replace its access model, tables or routes.
**Model routing (CLAUDE.md):** planning was Opus 5.5 medium. Build at Sonnet 5 high (large multi-file). Review the tracking/consent and `/admin` access code at Opus 5.5 low.

## 0. Goal

Get the most feedback possible out of a 1–2 week beta with 10–170 testers (about half 8th graders, half 9th graders, plus parents), while the tester uses the product **like a normal paying user**. Most of the data comes from background tracking; direct requests are rare and cheap, so feedback stays honest.

Where the founder looks at everything: **`/admin`** in the app (section 9).

## 1. What already exists (plan 016) — keep

- `/beta/:code` invite landing page, `beta_schools`, `beta_program_settings` (`ends_at`, `access_hours = 48`, `feedback_form_url`).
- `subscription_status = 'beta'`, `tester_school_code`, `tester_access_until`, `tester_guidance_seen_at`.
- `beta_feedback` + `POST /api/beta/feedback` → RPC `submit_beta_feedback` (insert + renew 48h atomically).
- `BetaTools.jsx` (floating button + guidance modal), `SubscriptionExpired` tester copy, Stripe blocked for testers.
- **Current rollout evidence, 2026-10-10:** 48-hour access, one cohort invitation, `ends_at` (18 October 2026 at 23:59 Europe/Prague) and exposed `beta_profile.role_note` are confirmed by read-only metadata. Current function definitions/grants/policies, outgoing email and the complete tester journey still require acceptance; do not blindly reapply the whole SQL (see `UNFORGET.md`).

## 2. Decisions taken with the founder (2026-10-04)

| Topic | Decision |
|---|---|
| Dashboard | `/admin` page inside the app, charts + tables, CSV export on every table, visually polished |
| Admin access | new `ADMIN_EMAILS` env list (server-side), separate from `DEVELOPER_EMAILS` |
| Scope | 1–2 weeks, 10–170 testers; role asked at start: 8. třída / 9. třída / rodič / učitel / jiné |
| Pre-signup tracking | yes — anonymous id in the browser, joined to the account after signup |
| Feedback screenshot | yes — marked element **and** screenshot; also a plain "general feedback" mode with no marking |
| "Suggest a change" | yes — tester edits a text in place, we store before → after |
| Activity rule | 48h renewal stays; on expiry the account is **not suspended** — a soft gate asks one open question; one real answer unlocks 48h. No points system (it rewards quantity over quality) |
| Warning | in-app banner 12h before expiry |
| Micro-questions | original design: max 1 per session, 6 in total, each skippable. Superseded: current quick ratings are feedback but never renew access (10 October founder decision) |
| Closing questionnaire | appears after the main features were tried (checklist) and day ≥ 2, or for everyone 2 days before `ends_at`; **required** (access pauses until done); text "odpovídej upřímně, nic neodsuzujeme" |
| Review | optional separate step; saved only, **never published automatically**; founder reviews each before any use |
| Under-15 reviews | stored; publish only fully anonymous ("Student, 8. třída"), lawyer check before first public use |
| Paywall | testers walk all 5 paywall screens; Stripe replaced by "V betě nic neplatíš" |
| Retention | current notice: raw events/rankings deleted 6 months after `ends_at`; feedback/screenshots/closing answers/private reviews deleted or anonymised within 12 months. Cleanup and justified retention remain acceptance gates; see legal decisions of 10 October |
| Feedback replies | founder replies from `/admin`; tester sees status + reply in the app |
| Simulation | yes, as step 1, before the beta starts |

## 3. Legal / privacy (must ship with the feature)

- **Legal assessment remains a rollout gate (updated 2026-10-10):** current notice/required checkbox name explicit consent, replacing the earlier legitimate-interest rationale. Freely given consent, equally easy withdrawal, device-storage consent, actual collection stop and child/guardian authority remain unresolved acceptance points; see `docs/legal-decisions-2026-10-10.md` and LEGAL-01/04 in the deployment handoff. The checkbox alone is not legal sign-off.
- **Device storage is a separate question:** `sessionStorage`/`localStorage` identifiers require assessment under the device-access rules even when analytics is first-party and subsequent processing uses legitimate interest. Do not assume that joining the beta makes every identifier strictly necessary. Decide and document optional consent or a design that removes unnecessary storage before recruitment. [ÚOOÚ cookies/storage guidance](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies).
- **Beta notice + checkbox on `/beta/:code` signup** (required to join): what is collected (pages, clicks on features, searches, errors, device type, screenshots they send themselves), why, how long (6 months), right to object (`info@stredninamiru.cz`).
- **Screenshots:** captured locally only after the tester explicitly presses "Připravit snímek k odeslání"; the preview can be removed. Upload occurs on submitting feedback. Input fields (`input`, `textarea`, `[data-private]`) are masked before capture. No background screenshot capture.
- **Reviews:** separate unticked checkbox "Smíme recenzi anonymně použít na webu?". Any later public use must say "beta tester, přístup zdarma" (Czech consumer law: disclosed incentive + genuine user). Under-15: anonymous only.
- **Privacy policy:** add a "Beta testování" section to `Legal.jsx` (data, basis, retention, screenshots, reviews).
- Never log: passwords, free-text from the questionnaire answers beyond what is already stored, full e-mail in events, Cermat points (`body`) in events.

## 4. Step 1 — Matching simulation (before the beta)

`scripts/simulate-matching.mjs` (Node):
- Load all schools exactly like `server.js` (`withDistricts`), generate N answer sets (default 5,000) by sampling every question's options from `lib/questionnaire.js` (skips included at a realistic rate, e.g. 20%).
- Score with `lib/matching.js` `scoreSchools`. Per school: mean rank, median, std dev, % in top 10, % in bottom 10, mean `displayScore`.
- Join data completeness: has `admission_cutoff`, has `school_extracted_details`, # obory, # known features.
- Output: `reports/matching-simulation-<date>.json` + a short markdown summary with the 15 most over-/under-ranked schools and a completeness correlation.
- Store the JSON so `/admin → Matching` can show "simulation vs real testers".
- Also run the same for the onboarding scorer (`frontend/src/lib/matching.js`) — it is a separate engine.

## 5. Data model (new, in `supabase-setup.sql`, inside a new delimited `BETA ANALYTICS BLOCK`)

All tables: RLS on, **no browser policies**; only `server.js` (service role) reads/writes.

| Table | Columns (main) | Notes |
|---|---|---|
| `beta_events` | `id bigint`, `user_id uuid null`, `anon_id text`, `session_id text`, `name text`, `path text`, `props jsonb`, `created_at` | `name` from a fixed allowlist (section 6). Index `(user_id, created_at)`, `(name, created_at)`. `anon_id` joined to `user_id` on signup. |
| `beta_feedback` (extend) | `+ kind` (bug / navrh / funkce / text / chvala / obecne), `+ selector text`, `+ element_text text`, `+ rect jsonb`, `+ viewport jsonb`, `+ screenshot_path text`, `+ text_before text`, `+ text_after text`, `+ status` (nove/precteno/vyreseno/neudelame), `+ admin_note text`, `+ admin_reply text`, `+ replied_at`, `+ source` (button / micro / gate) | Keep the existing `type` column readable; map old values. |
| `beta_profile` | `user_id pk`, `role` (8/9/rodic/ucitel/jine), nullable `role_note`, `consent_tracking_at`, `checklist jsonb`, `micro_asked jsonb`, `closing_due_at`, `closing_done_at` | one row per tester; live `role_note` was missing on 2026-10-07 |
| `beta_closing_answers` | `user_id pk`, `answers jsonb`, `created_at` | section 8 |
| `beta_reviews` | `id`, `user_id`, `stars 1–5`, `body`, `consent_publish bool`, `display_label text` ("Student, 9. třída"), `age_group`, `selected_by_admin bool`, `created_at` | never public; no client policy |
| `beta_rankings` | `id`, `user_id`, `source`, nullable `run_id`, `ranking int[]`, `created_at` | private full school order, no answers/JPZ points; added by the 5 October decision |
| `ai_usage_log` | `id`, `user_id null`, `run_id null`, `source` (questionnaire / proscons / extract), `model`, `prompt_tokens`, `completion_tokens`, `cost_usd numeric`, `ok bool`, `error text`, `created_at` | written in `server.js` after every OpenRouter call; `usage` is already returned and currently discarded |

Supabase Storage bucket `beta-screenshots` (private). Uploads go through `server.js` (signed upload URL), admin reads via signed URLs.

**Rollout verification:** verify a fresh installation and repeated execution in a disposable database before applying any reviewed missing schema change live. A five-table count alone is insufficient. Verify required function signatures/service-only grants, authenticated cross-account isolation, closing transactions, and private signed screenshot upload/read/cleanup. The 7 October probe did not expose `role_note`; it is exposed in fresh 10 October metadata, so do not implement that obsolete missing-column task without inspecting current state. No production migration was performed by this audit.

## 6. Background tracking (the main data source)

Frontend `lib/betaTrack.js`: `track(name, props)` → batched `POST /api/beta/events` (every 10 s, on `visibilitychange` hidden via `sendBeacon`). Active only when the visitor came through `/beta/:code` (anon) or is a tester. Normal users are never tracked.

Server `POST /api/beta/events`: rate-limited, validates `name` against the allowlist, caps `props` size (2 KB), strips unknown keys, attaches `user_id` from the token when present.

Event allowlist (first version):
- **Navigation:** `page_view` (path, referrer path), `page_leave` (path, ms visible), `session_start` (device: mobile/tablet/desktop, viewport w/h, theme, palette).
- **Onboarding:** `ob_step` (step id, role), `ob_answer` (question key, skipped?), `ob_drop` (last step, via `page_leave`), `paywall_view` (screen).
- **Questionnaire (/dotaznik):** `q_start`, `q_answer` (key, skipped), `q_finish` (run id), `q_abandon` (last key).
- **Search:** `search` (query length + query text — school names only, no personal data; mark `results`), `search_zero` (query), `filter_used` (filter id), `sort_used`.
- **Schools:** `school_open` (id, from: search/map/reveal/similar), `school_section` (section seen), `school_web_click`.
- **Compare / decide:** `compare_add`, `compare_open` (count), `matrix_weight` (criterion, level), `prihlaska_pick` (priority), `share_create`.
- **Account / UI:** `theme_change`, `favorite_toggle`, `review_write`.
- **Results quality:** `result_view` (top 10 school ids + ranks, source onboarding/questionnaire) — feeds section 9 Matching.
  **Decision 2026-10-05 (founder, resolves the Matching conflict):** record the **full ranking**, not just the top 10. Each time results are produced, store the ordered list of ALL school ids (≈217 ints) with `source` (onboarding / questionnaire) and the run id when there is one — in a dedicated private table (e.g. `beta_rankings`: user_id, source, run_id, ranking int[], created_at), not in `beta_events` (it would break the 2 KB props cap). Never store the answers or Cermat points alongside it. Questionnaire: take the full `scoreSchools()` order on the server before `REASON_COUNT` slices it. Onboarding: the browser sends the full `rankSchools()` order from the scorer the tester actually saw (the server's translated-answers path cannot reproduce it). This makes per-school mean rank, spread, top/bottom-10 frequency and simulation-vs-real comparisons valid for both engines.
- **Errors:** `js_error` (message, path — from `window.onerror`/`unhandledrejection`), `api_error` (endpoint, status) from `api.js`.
- **Frustration:** `rage_click` (3+ clicks in 600 ms on one element: selector).

Checklist auto-ticks from these events (section 7).

## 7. Tester-facing UI

### 7.1 Start (on `/beta/:code`, before signup)
- "Kdo jsi?" → 8. třída / 9. třída / rodič / učitel / jiné (stored in `beta_profile.role`).
- Beta notice + required checkbox (section 3).

### 7.2 Instructions (first screen after first login, then always under a "?" next to the feedback button)
Reuse onboarding visual language (`ObKit`, tokens). Screens:
1. **Díky + proč na tom záleží:** "Jsi jeden z prvních. Každá připomínka, i drobnost, jde přímo k nám a opravdu ji čteme."
2. **Používej to normálně:** "Používej to, jako bys opravdu vybíral(a) školu." + **checklist** (auto-ticked): dotazník · vyhledávání · detail školy (3×) · porovnání · matice · přihláška · barevné téma · sdílení s rodiči · platební obrazovky.
3. **Co od tebe chceme:** chyby, ale i návrhy, chybějící funkce, texty, které bys napsal(a) jinak, špatné údaje o školách. "Nic není moc malé."
4. **Jak na to:** short 3-step animation of the feedback button (klikni → označ místo / obecně → napiš).
5. **Pravidlo 48 hodin** (current): "Přístup obnoví zpráva přes Zpětná vazba nebo formulář pro obnovení přístupu, nejdéle do konce programu. Rychlé hodnocení časovač nemění."
6. **Na konci:** krátký dotazník a nepovinná recenze.

### 7.3 Feedback button (replaces the simple form in `BetaTools.jsx`)
Floating button, bottom-right, testers only. Opens a sheet with three modes:
1. **Označit místo** — page dims, hover outlines elements (desktop) / tap selects (phone), click selects. We capture CSS selector, element text (first 120 chars), rect, viewport, path. Then a screenshot (`html2canvas`, lazy-loaded only in this mode; inputs masked), shown as a preview with "odebrat snímek".
2. **Navrhnout změnu textu** — pick a text element, it becomes editable in place; save stores `text_before` → `text_after`.
3. **Obecně k webu** — no marking, no screenshot.

Then: kind chips (Chyba · Návrh · Nová funkce · Text/údaj · Pochvala) + message (min 10 chars) → send. Success toast shows the new access time.
"Moje zpětné vazby" list in the sheet: each item with status and the founder's reply ("Opraveno ✓ — díky!").

**New dependency:** `html2canvas` (~200 kB, dynamic import only in mode 1). Ask before installing per project convention — founder approved screenshots on 2026-10-04.

### 7.4 Micro-questions (max 1 per session, 6 total, skippable)
Small bottom card, never a modal:
1. After the first questionnaire / onboarding result: "Sedí ti tenhle výsledek?" 1–5 (+ optional "proč").
2. After the 3rd school detail: "Chybělo ti tu něco?" (text).
3. After first comparison: "Pomohlo ti porovnání rozhodnout?" 1–5.
4. After the matrix: "Dávalo pořadí v matici smysl?" 1–5.
5. After the paywall screens: "Byla cena jasná?" ano / spíš ano / ne.
6. After a theme change: "Proč tohle téma?" (text, optional).
Current quick ratings are stored as micro feedback and **do not renew access**. The original six-question design is historical; use the current source/runbook before extending it.

### 7.5 Expiry warning + soft gate
- 12h before `tester_access_until`: banner "Za 12 hodin se ti přístup pozastaví — stačí poslat jednu připomínku."
- After expiry: instead of the current paused page, a full-screen question (rotating, e.g. "Co tě za poslední dny nejvíc štvalo nebo bavilo?"), min one sentence (20 chars) → saved as feedback (`source = gate`) → renews 48h. No data lost, no suspension.

### 7.6 Closing questionnaire (required) + review (optional)
Trigger: checklist core items done (dotazník, 3× detail, porovnání nebo matice) **and** day ≥ 2 since signup; or for everyone 2 days before `ends_at`. Prompt card, then if not done within 24h access pauses until it is filled (same gate mechanism).
Header on every screen: "Odpovídej upřímně — nic neodsuzujeme, špatná zpráva nám pomůže víc než pochvala."
1. **O tobě:** role/třída (prefilled), máš už školu vybranou?, jak jsi hledal(a) dřív (atlasskolstvi / weby škol / ChatGPT / kamarádi / rodiče / jinak).
2. **Hodnota:** NPS 0–10, "Pomohlo ti to vybrat?" 1–5, nejužitečnější funkce (multi), co chybělo (text).
3. **Placení:** zaplatil(a) bys? (ano / možná / ne), Van Westendorp ×4 (příliš levné / výhodné / drahé / příliš drahé, Kč), kdo by platil (já / rodič / spolu), měsíc nebo sezóna.
4. **UI a budoucnost:** oblíbené téma (live preview of all 4), co přidat (text), jedna věc ke změně hned (text), hodnocení 1–5: vyhledávání, detail školy, dotazník, porovnání.
5. **Recenze (nepovinná):** hvězdy 1–5, text, unticked "Smíme recenzi anonymně použít na webu?", shows the signature it would get ("Student, 9. třída").

## 8. Server endpoints (new)

- `POST /api/beta/events` — section 6.
- `POST /api/beta/feedback` (extend) — new fields; screenshot via `POST /api/beta/feedback/screenshot-url` (signed upload URL, image/png|jpeg ≤ 1.5 MB).
- `GET /api/beta/me` — role, checklist, micro state, closing due/done, my feedback with statuses/replies.
- `POST /api/beta/profile` — role + tracking consent (once).
- `POST /api/beta/micro` — quick rating; stores feedback without renewing access.
- `POST /api/beta/closing` — closing answers + optional review.
- `ai_usage_log` writes inside the questionnaire endpoint and the generator scripts.
- **Admin** (`requireAdmin` = `requireAuth` + email in `ADMIN_EMAILS`, server-side only): `GET /api/admin/overview|feedback|behaviour|funnels|matching|closing|reviews|testers|ai-costs`, `PATCH /api/admin/feedback/:id` (status, note, reply), `PATCH /api/admin/reviews/:id` (selected), `GET /api/admin/export/:table.csv`. All aggregation in SQL/Node, never raw events to the browser except the feedback list.

## 9. `/admin` — where the founder sees everything

Route `/admin` (lazy-loaded, inside `Layout`), hidden from navigation, 403 page for non-admins. Charts in plain SVG with design tokens (no chart library); every table has **CSV export**. Visual quality bar: same design system, cards with large numbers, sparklines, bar charts, funnel bars — follow `design/DESIGN.md`.

Tabs:
1. **Přehled** — testers by school / role, active today & 7 days (sparkline), feedback count by kind, % closing done, NPS, "zaplatil(a) by" %, AI cost to date.
2. **Zpětná vazba** — filterable table (kind, page, school, role, status, source); detail drawer: screenshot with the marked rect outlined, selector, before → after, tester pseudonym; set status, private note, public reply.
3. **Chování** — top pages + avg time, feature reach (% testers who used each), top searches + zero-result searches, filters, device split, JS/API errors, rage clicks.
4. **Trychtýře** — onboarding step-by-step drop-off, questionnaire question-by-question, paywall screens, school detail → compare → application.
5. **Matching** — per school: avg rank, spread, % top 10, % bottom; vs data completeness; **simulation vs real testers**; micro-question "Sedí ti výsledek?" averages next to the rank data. Highlights schools whose real-tester rank deviates strongly from simulation.
6. **Závěrečný dotazník** — charts per question, Van Westendorp curve (acceptable price range), theme preference, quotes for missing features.
7. **Recenze** — all reviews with role, grade, stars, consent; "Vybrat pro web" toggle (still nothing published automatically).
8. **Testeři** — pseudonyms ("Tester #14 · GYMJECNA · 9. třída"), activity, feedback count, checklist progress, access until; e-mail only on click.
9. **AI náklady** — total and per day, per questionnaire run, tokens, model, failed calls.

## 10. Build order

1. Simulation script (section 4) → report to founder.
2. SQL block (section 5) → founder runs it.
3. `ai_usage_log` writes.
4. Tracking lib + `/api/beta/events` + allowlist.
5. Beta start screen (role + notice) on `/beta/:code`.
6. Instructions + checklist.
7. New feedback sheet (general → marked element → text edit → screenshot).
8. Micro-questions, warning banner, soft gate.
9. Closing questionnaire + review.
10. `/admin` (overview + feedback first, then the rest) + CSV.
11. Privacy policy beta section.
12. End-to-end test as a fresh tester on localhost; verify no Stripe call is reachable; verify a normal (non-beta) user sends no events.

## 11. Verification

- Tests: event allowlist validation, admin guard (non-admin → 403), closing trigger logic, main-form/gate renewal and no renewal from quick ratings, CSV escaping, simulation determinism with a seed.
- Browser: full tester run on phone width and desktop; screenshot masking of inputs; `/admin` charts render with seed data.
- Privacy: grep that no event carries an e-mail or `body`.

## 12. Founder to-dos (not code)

- `ADMIN_EMAILS` in `.env` (local + production).
- Decide `ends_at` and school codes (016).
- Outgoing e-mail (UNFORGET) — required for tester confirmation.
- Lawyer look at anonymous use of under-15 reviews before the first public use.
