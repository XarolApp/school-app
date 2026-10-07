# Claude review 2026-10-07 — running findings log

Lead-only review (no subagents). IDs are stable; REPORT.md is built from this file.
Class: SAFE-FIX = fixed directly in this session (100 % bug); DECIDE = needs founder/product/legal call;
MANUAL = founder must do it in a dashboard/service; PLAN = handed to the fix agent in HANDOFF-PLAN.md.

## Services / live state
- S1 P0 MANUAL — Live DB missing `beta_profile.role_note`: the latest `supabase-setup.sql` is not applied. `POST /api/beta/profile` (server.js:522-530) writes that column, so EVERY tester's first-run step fails (it is not only "Jiné"; the update always sets role_note).
- S2 P0 DECIDE — `beta_program_settings.ends_at` = 2026-10-12 21:10:23.234879 UTC (fractional seconds, so it looks like now()+7d set during testing). Only beta school is `TEST`; `feedback_form_url` null.
- S3 P1 MANUAL — The OpenRouter API key in `.env` returns 401 "API key expired". Every questionnaire run since 2026-09-28 has `model=null` (no AI sentences), and `ai_usage_log` id 1 (2026-10-06, model google/gemini-2.5-flash-lite = prod default) is `ok=false`. Production likely uses the same key. The local `.env` also sets `OPENROUTER_MODEL=gemini-3.6-flash`, which is not a valid OpenRouter id (needs `google/` prefix) — fix or delete that line.
- S4 info — The user-facing school count is 217 (223 rows − 6 merged: 115, 208, 211, 216, 217, 218). UI is correct; `/test-db` reports raw 223.
- S5 P1 MANUAL — Stripe test account: charges_enabled=false, no support e-mail/URL/statement descriptor; monthly price 249 CZK `tax_behavior` unspecified; webhook at Railway prod with 6 events. Season has no Stripe Price (inline 690 Kč PaymentIntent).
- S6 ok — Supabase Auth: mailer_autoconfirm=false (email confirmation ON), only email provider enabled.
- S7 P1 PLAN — Prod frontend (Vercel) sends no CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy; backend sends `x-powered-by: Express`.
- S8 ok — 122/122 backend tests, lint 0 errors / 8 warnings, build OK. Prod backend /api/schools 200 in ~1 s, 758 KB.

## Legal
- L1 P0 SAFE-FIX — Privacy §8 says "Písma načítáme z našeho serveru", but `frontend/index.html` loaded Archivo/Archivo Narrow from fonts.googleapis.com (visitor IP → Google, not a listed recipient). FIX: self-host via @fontsource.
- L2 P1 — Terms §6 says withdrawal = 14 days; server WITHDRAWAL_DAYS = 30 (server.js:636), which Terms §7 promises for minors ("do 30 dnů … tlačítkem v Nastavení"). Consistent overall, but server.js:2945 error says "Lhůta 14 dní už uplynula" → wrong when the button works for 30 days. SAFE-FIX wording; stale comment server.js:638.
- L3 MANUAL/DECIDE — Operator is a natural person "neplátce DPH" with no IČO. Selling paid plans regularly is podnikání and needs a živnostenské oprávnění/IČO shown in Terms. Fine for free beta; blocks paid launch.
- L4 info — Privacy correctly names OSM tiles + Nominatim, Cloudflare Turnstile, Supabase, Stripe, Brevo, Vercel, Railway, OpenRouter/Google.

## Payments (server.js)
- P1 P1 PLAN — Season pass card failure is a dead end. chargeDueSeasonPasses (server.js:3273-3284) / the payment_failed webhook set status `past_due` but keep `plan_id='season'` + `season_charge_due_at`. Then: (a) hasLivePlan() is true → /api/checkout and payment links answer 409 "Už máš aktivní plán"; (b) cancelPlanForUser needs status `trialing` or a subscription id → 400 "Žádné aktivní předplatné"; (c) chargeDueSeasonPasses only selects `trialing` → never retried; (d) paidAccessActive(past_due) needs access_expires_at → no access. The user can neither pay, retry nor cancel.
- P2 info — Monthly has no trial by design (plan 009, Terms §4 "Bez zkušební doby"). Season: 3 days from checkout, on top of the 3-day signup trial.
- P3 P1 (live-payments blocker, not beta) — No trial-reminder e-mail (pricing.js TRIAL_REMINDER_IMPLEMENTED=false; Terms honestly say none is sent). CLAUDE.md calls it mandatory before real billing.

## Backend (server.js) misc
- B1 P2 SAFE-FIX — POST /api/me/onboarding-answers (server.js:1018) scores against `schools` without the merged filter and without `school_programs`, unlike every other scorer (fetchAllSchools + school_programs). Stored top-20 can include merged duplicates and is computed on a different basis.
- B2 P3 SAFE-FIX — Beta server messages mix vykání into tykání copy: server.js:409, 524, 546, 584, 904, 916, 923, 925 ("Nejprve vyplňte…", "Vyberte roli…", "Zkuste to znovu").
- B3 P3 — Many 500 responses return raw `error.message` from Supabase/Stripe to the browser (e.g. server.js:662, 785, 1021, 1292, 2815, 2841). Low risk; tidy in a later pass.
- B4 P3 — Reviews/picks/notes/reports don't check the school id exists → FK error surfaces as 500 with a DB message.

## Frontend (observed in browser so far)
- F1 P2 PLAN — `/` renders `<Suspense fallback={null}>` (App.jsx:68): blank page on phones while the 731 KB Landing chunk (three.js) loads; main bundle 1.14 MB.
- F2 P3 PLAN — Landing chips show "0" until the full 758 KB school list loads; useSchoolCount fetches the whole list just to count.
- F3 Suggestion — masculine-only copy: "abys mohl vybrat sám" (landing), "narazil" (onboarding welcome).
- F4 Question — onboarding welcome "Veřejné zdroje — Cermat a MŠMT": is MŠMT data used?

## Batch 1 — fixed and pushed (909fcdd)
- R1 P1 FIXED — Signed-in "Nahlásit" on a review always returned 500: PostgREST upsert onConflict (review_id,user_id) cannot use the PARTIAL unique index (live probe: 42P10). Now insert + treat 23505 as already reported (server.js POST /api/reviews/:id/report). DSA Art. 16 notice-and-action was broken for logged-in users.
- SQL1 P2 FIXED — supabase-setup.sql dropped `review_reports_pkey` on every re-run (after run 1 it is the id key), leaving no PK. Now conditional + self-healing. VERIFY after applying: `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.review_reports'::regclass and contype='p';` → one row `PRIMARY KEY (id)`.
- L1 FIXED — fonts self-hosted (@fontsource/archivo, archivo-narrow 400–700); Google Fonts links removed; unused @fontsource/lora + public-sans removed. Verified in browser: 0 requests to googleapis/gstatic, Czech glyphs OK.
- L2 FIXED — withdrawal error no longer names 14 days; comment fixed.
- B1 FIXED — onboarding-answers uses fetchAllSchools with school_programs.
- B2 FIXED — beta tester messages switched to tykání (server.js, lib/betaLimits.js, api.js, BetaLanding.jsx). Admin-only messages in lib/betaAdminRoutes.js left as vykání (founder-facing).
- RLS verified live: anon key reads 0 rows from all 26 tables; beta-screenshots bucket private; has_access RPC returns false for anon.

## Batch 2 — paywall + parent pay (905df5a)
- PW1 FIXED — Platba.jsx title "Ještě karta a potvrzení rodiče" promised a parental confirmation that was removed by founder decision 2026-09-22 (9a8f8cc); header comment described a non-existent checkbox. CLAUDE.md/AGENTS.md still say "Parental confirmation required at payment … Real UI" → docs fix.
- PW2 FIXED — parent branch in tykání: order microcopy "Objednáním souhlasíš", errors in Platba.jsx/ParentPay.jsx, server 409 "Už máš aktivní plán. Spravuj ho v Nastavení" on the parent pay link, withdraw error "Napiš nám".
- PW3 FIXED — Zkusebni said "e-maily ještě neumíme posílat" (false since Brevo); now "připomínky e-mailem ještě neposíláme".
- PW4 P2 DECIDE — Paywall claims "U každé školy vysvětlení / napsané, proč se hodí" (Plan.jsx UNLOCKS, Hodnota.jsx withUs, Zkusebni "vysvětlení u každé"). AI sentences exist only for the top 10 of /dotaznik (REASON_COUNT) and are currently never generated (expired key, S3); beyond top 10 the list shows only name/score. Reword to "u nejlepších deseti" or extend reasons.
- PW5 info — Admission dates in Cesta.jsx (přihlášky do 22. 2. 2027, konzervatoře 30. 11. 2026) verified against public sources (JPZ 12.–13. 4. 2027). Cesta.jsx is being edited by Codex.
- PW6 P3 PLAN — Year 2026 hardcoded in ~8 UI strings (Search.jsx 148/1298/1455/1598, SchoolMap.jsx 360, ProductScreens.jsx 223-224, Porovnani.jsx 245/349, Landing.jsx 59) instead of CURRENT_ADMISSION_YEAR (schoolPrograms.js:208). Correct today; breaks silently at the next yearly import.
- PW7 P2 — Masculine-only copy across the student voice (e.g. Plan.jsx TRUST "jsi viděl", questionnaire "nejsi jistý", "Jak bys to nesl", "Zvládl bych to", Cesta "Nejsi v tom sám", landing "mohl vybrat sám"). Product decision whether to use "viděl/a" or neutral rewrites.

## Batches 3–5 — frontend (6d3fff3, 4979d70, d00cfc9)
- A1 FIXED P1 — AuthContext onAuthStateChange awaited loadProfile → supabase.auth.getSession(): the deadlock pattern Supabase documents for that callback (hangs on token refresh / tab refocus). Work deferred with setTimeout.
- A2 FIXED P2 — "/" Suspense fallback was null → blank screen while the 731 KB landing chunk loads.
- A3 FIXED — Shared beta server messages made voice-neutral (reach students, parents, teachers). BetaLanding start error follows its own role voice switch again.
- A4 FIXED — CreateAccount parent branch used ty in waiting/error copy.
- A5 FIXED — Search empty-state agreement ("by odpovídalo 3 školy"), screen-reader "volných míst" (it is total capacity), unused helper.
- A6 FIXED — Questionnaire share text: "výchozí běh" jargon + garbled "Nic jiného z aplikace s ním nepoužije".
- A7 FIXED P1 — Reveal disclaimer claimed "Data o … kapacitách ani o výsledcích přijímacích zkoušek zatím nemáme" (false; SocialProof says the opposite). Calculating claimed "výpočet je veřejně popsaný" (no methodology page exists) and "Počítám dojezd" (no commute calculation).
- A8 FIXED — PickCard "Máš o 5 bodu víc" → bod/body/bodů.
- A9 FIXED — OSM attribution now links to openstreetmap.org/copyright (ODbL requirement) in SchoolMap + SchoolLocation.
- A10 FIXED — landing2 hero 100vh without dvh fallback (iOS Safari toolbar covers the CTA).

### Open, frontend (→ HANDOFF-PLAN)
- F5 P1 DECIDE — What is paid vs free is described inconsistently. Landing2 + Home FAQ/pricing: "Dotazník, základní výsledek a celá databáze škol jsou zdarma. Placený přístup odemyká podrobné porovnání, rozhodovací matici a plánování přihlášek." Reality (App.jsx): /porovnani and /porovnani/matice are public, /dotaznik (full questionnaire) and /prihlaska need trial/paid, favourites need access. SignUp.jsx says the trial unlocks "celou databázi škol" and "Bez potvrzení se do databáze škol nedostaneš" (false, /skoly is public). Settings "Stav tvého přístupu k databázi škol". Decide the gating, then align ALL copy (landing2, Home, SignUp, Settings, paywall UNLOCKS/withUs, SubscriptionExpired BENEFITS).
- F6 P2 DECIDE — Church schools shown as "Placená škola" (comparisonRows.js skolne) and scored as paid in decisionMatrix.js (skolne, vyse_skolneho), while lib/matching.js (server) treats církevní as free. Most CZ church schools charge no tuition. Pick one rule.
- F7 P2 QUESTION — "Cermat a MŠMT" / "rejstřík škol MŠMT" claimed as data source (Welcome.jsx, landing2 Landing.jsx 81/92, Home.jsx 68). The school list was scraped from atlasskolstvi.cz; only REDIZO/Cermat are official. Confirm or reword.
- F8 P3 — /stara (old Home.jsx) is still routed and contains placeholders "[Jméno], zakladatel", "Fotografie", "Portrét". Not linked anywhere; remove the route or fill the placeholders before public launch.
- F9 P3 — Search.jsx synthesizes a random "Praha N" district for a school without coordinates (synth()); 0 schools affected today, but it is fabricated data that also feeds the district filter. Replace with "Praha (neurčeno)" / null.
- F10 P3 — ReviewForm never collects role_year although ReviewCard renders "Student · N. ročník".
- F11 P3 — Circular import steps.js ↔ QuizQuestion.jsx breaks Vite HMR ("Cannot access 'QuizQuestion' before initialization"); dev-only.
- F12 P3 — Inconsistent polite capitalisation: beta components use "Vám/Vás", BetaLanding "vám/vás".
- F13 P3 — supabaseClient rememberMeStorage touches localStorage without try/catch (Safari with all site data blocked throws SecurityError → auth unusable).
- F14 P3 — HistoryChart "61,5 bodů" for decimals; ProgramCard plural of přihlášek (Codex is editing ProgramCard).
- F15 P3 — Search setPatch tracks 'sortPicked'/'sortDir' as filter_used events (analytics noise).

## Batch 6 — payments + deps (d949478)
- P4 FIXED P1 — Stripe webhook endpoint runs API 2026-08-26.dahlia (verified with real test events): `subscription.current_period_end` → items[0], `invoice.subscription` → parent.subscription_details. customer.subscription.updated wrote access_expires_at = NULL on every renewal (= paid forever if subscription.deleted is ever missed). Now reads both shapes; regression test added. Remaining: stripe-node is v15 (API 2024-04-10) — plan an SDK upgrade + pin the endpoint version together (PLAN).
- D1 FIXED — npm audit (prod): proxy-addr critical, axios/firecrawl high, ip-address moderate → 0 after `npm audit fix` (lockfile only). Frontend audit: 0.
- D2 FIXED — .env.example lacked NODE_ENV (BETA_TICKET_SECRET silently falls back to the service-role key when NODE_ENV≠production), script-only vars, and showed stale example URLs; frontend example now documents SITE_ACCESS_KEY.
- D3 P3 PLAN — test-google-api.js / test-google-simple.js at repo root are dev leftovers (read GOOGLE_GEMINI_API_KEYS); delete or move to scripts/.
- D4 P3 PLAN — scripts that write to production with no dry-run flag: backfill-redizo.js, geocode-schools.js, reset-test-account.js (all one-off; add --dry-run or a confirmation prompt before reuse).
- No committed secrets (git grep for live/test keys, JWTs, sb_secret, sk-or, fc-, AIza).
