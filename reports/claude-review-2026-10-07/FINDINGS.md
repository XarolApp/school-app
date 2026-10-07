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
