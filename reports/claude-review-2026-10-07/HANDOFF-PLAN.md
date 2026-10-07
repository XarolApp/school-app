# Handoff plan — fixes left after the 2026-10-07 pre-beta review

For the next coding agent (Claude Code or Codex). Read `CLAUDE.md` first, then [`REPORT.md`](REPORT.md) §4. Findings are numbered as in [`FINDINGS.md`](FINDINGS.md).

**Rules for every task**
- Before editing a file: check `git status`, and claim the file in `reports/deployment-review-2026-10-07/COORDINATION.md` if another agent may be active. Release it when pushed.
- Run `npm test` (repo root) and `cd frontend && npm run lint && npm run build`. For anything visible, check it in the Browser pane at 375×812 and desktop.
- Push to `main` after each task (CLAUDE.md rule). Never commit `.env`.
- Model routing follows the CLAUDE.md table; the suggestion is given per task. Do not start a task marked **DECIDE** until the founder has answered.
- Keep tykání for students and vykání for parents. Never invent numbers, testimonials or features in copy.

---

## T1 — Paid vs free gating (founder decision 2026-10-07) · P1 · Sonnet 5 high (plan first with Opus 5.5 medium)
**Decision:** only the landing page (`/`) and the onboarding (`/onboarding/*`, including its result preview and map) are free. The founder clarified in the Codex chat that **school details opened from a landing-map dot remain public**. Keep `/skoly/:id` and its public data path working; gate the catalogue `/skoly`, comparison, matrix, standalone questionnaire, application planning and favourites with valid trial/paid/beta access. Auth, legal pages, account management and scoped parent/share links retain the public or signed-in access needed for their function.
**Files:** `frontend/src/App.jsx` (move those routes under `ProtectedRoute`), `Layout.jsx` (nav for signed-out users), every link into `/skoly` from the landing, onboarding (`Activated.jsx` "Přejít na školy", Reveal), `NotFound.jsx`. `server.js`: decide the server side with the founder. Onboarding still needs `GET /api/schools` (or `fetchSchoolsForMatching`) anonymously, so either keep the list endpoint public but strip detail fields for anonymous callers, or add a lean onboarding endpoint and gate the premium list/batch operations. Preserve public school-detail reads for landing dots; do not rely on the Referer header as authorization. Remember `withMatchScores` must keep working (CLAUDE.md trap).
**Copy to align in the same PR:** `pages/landing2/Landing.jsx` (FAQ "Kolik to stojí?", pricing cards "Zdarma / Plný přístup", "nebo projdi databázi"), `pages/Home.jsx` (same FAQ), `SignUp.jsx` ("Vyzkoušej celou databázi škol…", "Bez potvrzení se do databáze škol nedostaneš"), `Settings.jsx` ("Stav tvého přístupu k databázi škol" — Codex may be editing it), `SubscriptionExpired.jsx` BENEFITS, paywall `Plan.jsx` UNLOCKS / `Hodnota.jsx` withUs.
**Done when:** a signed-out visitor can use landing/onboarding and open a school from a landing-map dot, while premium tools redirect appropriately; a trial or beta account reaches every page; an expired account is sent to `/predplatne` but can still open `/nastaveni` (cancel, withdraw, delete — CLAUDE.md access rule); no copy anywhere says the database is free; tests cover the new server gating.

## T2 — Season-pass failed charge is a dead end · P1 (payment gate) · Opus 5.5 high
**Problem (P1 in FINDINGS):** `chargeDueSeasonPasses()` and the `payment_intent.payment_failed` webhook set `subscription_status='past_due'` but keep `plan_id='season'` and `season_charge_due_at`. Result: `hasLivePlan()` is true, so checkout and payment links answer 409; `cancelPlanForUser` answers 400; the charge is never retried; the user has no access.
**Fix sketch:** on failure, clear `season_charge_due_at` (keep a record such as `last_charge_failed_at` if useful) so a new checkout is allowed. Decide with the founder whether a re-checkout gets a fresh 3-day trial or is charged immediately (prefer immediate: create the PaymentIntent at once, so failing cards cannot farm free trials). Make `cancelPlanForUser` accept season `past_due`. Show a clear state in Settings ("Platba se nezdařila — zkus jinou kartu").
**Done when:** a test-mode card that fails off-session (`4000 0000 0000 0341`) leaves the user able to pay again or cancel; tests cover failure → re-checkout → success.

## T3 — Stripe SDK / API version alignment · P1 (payment gate) · Opus 5.5 high
The SDK is `stripe@15` (API 2024-04-10); the webhook endpoint delivers `2026-08-26.dahlia`. Today's fix (`accessEndsAt`, invoice subscription id) reads both shapes. Upgrade `stripe` to the current major, set `apiVersion` explicitly, and set the webhook endpoint to the same version in the Stripe dashboard (test and live). Audit every Stripe field used in `server.js` (subscription period fields, `invoice.subscription`, `checkout.session.*`, `setup_intent`, `payment_intent`) against the new version. **Done when:** an end-to-end test-mode run (monthly: create, renew via test clock, cancel, withdraw; season: setup, charge, failed charge) writes the expected rows; the existing and new tests pass.

## T4 — "Vysvětlení u každé školy" promise · P2 · Sonnet 5 medium (copy) — **DECIDE wording**
AI sentences exist only for the top 10 (`REASON_COUNT`) of `/dotaznik`, and none right now (expired key). Claims to fix: `Plan.jsx` UNLOCKS, `Hodnota.jsx` withUs ("U každé napsané, proč…"), `Zkusebni.jsx` ("vysvětlení u každé"), `Reveal.jsx` ("s odůvodněním u každé z nich"), `Calculating.jsx` ("Připravuji vysvětlení u každé školy"), `Home.jsx` ("U každé školy je napsané…"), `CreateAccount.jsx` ("Celé pořadí … s důvody"), landing2 ("u každé napsané proč"). Either reword (e.g. "u nejlepších deseti škol vysvětlení, proč sedí") or show the scorer's `signals` for every school in the list (that would make the claim true).

## T5 — Gender-neutral student copy · P2 · Sonnet 5 medium — **DECIDE style**
Masculine-only forms aimed at a half-female audience: `lib/questionnaire.js` ("nejsi jistý", "Buď k sobě upřímný", "Jak bys to nesl", "Zvládl bych to"), `Plan.jsx` ("jsi viděl"), `Cesta.jsx` ("Nejsi v tom sám"), landing2 ("abys mohl vybrat sám", "kdyby sis to rozmyslel"), `Welcome.jsx` ("narazil"), `ReviewForm.jsx` ("co bys sám chtěl vědět, než sis školu vybral", "co sám znáš"), `Login.jsx` ("Zapomněl jsem heslo", "kde jsi skončil"), `Commitment.jsx` ("Ještě si nejsem jistý"), `HandoffLock.jsx` ("vyplnit sám"), `admissionRisk.js` ("než bys mohl"). The codebase already mixes in "jsi zadal(a)" and "Byl/a jsem"; pick one style with the founder and apply it everywhere. Server copy in `lib/questionnaire.js` changes stored labels shown in run history, so check `describeAnswers` and the tests.

## T6 — Security headers · P1 (before public launch) · Sonnet 5 medium
`frontend/vercel.json`: add `headers` for all routes: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Permissions-Policy: geolocation=(self), camera=(), microphone=()`, and a CSP **in Report-Only mode first**. Allow `self`, the Railway API origin, the Supabase URL (https + wss), `challenges.cloudflare.com` (script + frame), `tile.openstreetmap.org` (img), `nominatim.openstreetmap.org` (connect), `data:`/`blob:` images (html2canvas screenshots). Watch Report-Only for a week, then enforce. `server.js`: `app.disable('x-powered-by')`. Middleware responses (`gatePage`) set their own headers — keep them consistent.

## T7 — Admission year from one constant · P3 · Haiku 4.5
Replace literal "2026" in UI strings with `CURRENT_ADMISSION_YEAR` (`frontend/src/lib/schoolPrograms.js`) or the computed `dataYear`: `Search.jsx` (SORTS `places` tradeoff, header line "rok 2026", sort explainer, "Nebyla v prvním kole přijímaček 2026"), `SchoolMap.jsx:360`, `components/landing/ProductScreens.jsx:223-224`, `Porovnani.jsx:245,349`, `pages/landing2/Landing.jsx:59`.

## T8 — No fabricated district · P3 · Sonnet 5 medium
`Search.jsx` `synth()` invents "Praha 1–22" for a school without coordinates, and it feeds the district filter and facet. Replace it with a null district shown as "Praha (neurčeno)", excluded from district filters. Delete the PRNG helpers if they become unused. 0 schools are affected today; this protects future imports.

## T9 — Performance on phones · P2 · Sonnet 5 high
(a) Add `GET /api/schools/count` (or ship the count and category counts as a tiny JSON) and use it in `useSchoolCount` and the landing chips, instead of downloading the full 758 KB list. Show a skeleton, not "0", while loading. (b) Lazy-load the heavy routes in `App.jsx` (`Search`, `SchoolDetail`, `Matice`, `Porovnani`, `Settings`, the onboarding flow) like `Landing` and `Admin` already are. **Done when:** the main JS chunk is under ~500 KB and Lighthouse mobile shows no regression.

## T10 — Hygiene bundle · P3 · Sonnet 5 medium
- Delete `test-google-api.js` and `test-google-simple.js` (repo root, dev leftovers), or move them to `scripts/`.
- Remove the `/stara` route (`App.jsx`) and `pages/Home.jsx` if the old landing is no longer needed, or replace its placeholders ("[Jméno], zakladatel", "Fotografie", "Portrét"). Ask the founder.
- Add `--dry-run` (default) / `--write` to `scripts/backfill-redizo.js`, `scripts/geocode-schools.js` and `scripts/reset-test-account.js`.
- `frontend/src/supabaseClient.js` `rememberMeStorage`: wrap `localStorage`/`sessionStorage` access in try/catch (Safari with site data blocked throws).
- Break the `steps.js` ↔ `QuizQuestion.jsx` import cycle (Vite HMR "Cannot access 'QuizQuestion' before initialization").
- `Search.jsx` `setPatch`: do not emit `filter_used` for `sortPicked`/`sortDir`.
- `ReviewForm.jsx`: collect `roleYear` for students (ReviewCard already renders "Student · N. ročník").
- `HistoryChart.jsx:73`: decimal-aware plural ("61,5 bodu").
- Polite capitals: the beta components use "Vám/Vás", `BetaLanding` uses "vám/vás"; pick one (lowercase is the app norm).
- `server.js`: stop returning raw `error.message` from Supabase/Stripe in 500 responses (B3); validate that the school id exists for reviews, picks, notes and reports (B4).

## T11 — Legal items from Codex's review · founder + lawyer, then Sonnet 5 / Opus 5.5 high
See `reports/deployment-review-2026-10-07/legal-docs-findings.md`: **LEGAL-01** (beta analytics consent for minors — decide before minors join), **LEGAL-02** (review notice-and-action: reporter contact, decision notification, plus an admin moderation tab — see REPORT §6.4), LEGAL-03 (privacy text for result, payment and handoff links), LEGAL-04 (retention, DPIA screening), LEGAL-05 (verify processors and region), LEGAL-06 (clarify the voluntary 30-day refund deadline; the initial claim that code allowed only 14 days was retracted), LEGAL-07 (durable order and withdrawal confirmations by e-mail), LEGAL-08/09 (minor contracting, operator IČO), LEGAL-10 (trial reminder e-mail before live billing).

## T12 — Church-school tuition from real data · P2 · Sonnet 5 medium
UNFORGET "Church schools: tuition shown as unknown". Query `school_extracted_details` for every school whose latest `zrizovatel` is církevní. Where `tuition_czk_per_year` or clear `skolne_poplatky` text exists, use it in `comparisonRows.js` (skolne row), `decisionMatrix.js` (`skolne`, `vyse_skolneho`) and `lib/matching.js` `isPaid()` consistently. Keep "Zjistit u školy" only where nothing is known.

## T13 — Docs left to Codex (only if Codex has not done them)
Codex's correction table in `legal-docs-findings.md`: mark `plans/009-stripe-payments.md` superseded (season is setup + one PaymentIntent, not a yearly Price), fix `plans/019` (legal-basis wording, `simulate-matching.mjs` name), date-banner the snapshots in `docs/legal-research/*` and `docs/reports/2026-09-21-*`, the implementation-override banners in `docs/sources/claude_code_ui_ux_guide.md` and `paywall_copy_framing_research.md`, and the broken link in `docs/sources/README.md`.

## Already tracked in UNFORGET (no new task)
Onboarding matching bias (2026-10-05), Plan 018 three open findings, Plan 018 two-device tests, Brevo/Stripe account transfer to Václav, trial-reminder e-mail, pagination at national scale, responsive work below 1280 px.
