# Claude pre-beta review — progress (paused 2026-10-07, usage limit)

Status: **NOT finished.** The fourteen read-only slice reviewers were stopped before reporting back. No source or md files have been edited yet. The next session should relaunch the slices using `BRIEF` (below), then verify, fix and write the final report + handoff plan here.

## Verified so far (by Claude, against the live services)

| # | Sev | Finding | Evidence |
|---|---|---|---|
| 1 | P0 | Live DB is missing `beta_profile.role_note`, so the latest `supabase-setup.sql` was not re-applied. Without it, `POST /api/beta/profile` fails for testers who pick "Jiné". | Read-only select on live Supabase |
| 2 | P0 (founder question) | Beta cutoff `beta_program_settings.ends_at = 2026-10-12 21:10:23.234879 UTC` (shown as "12. října 2026 v 23:10"). The fractional seconds suggest a test value set with `now() + 7 days`, not a chosen date. Only beta school is `TEST`; `feedback_form_url` is null. | live table + `/beta/TEST` page |
| 3 | info | The user-facing school count of **217** is correct: the table holds 223 rows, minus 6 merged duplicates (ids 115, 208, 211, 216, 217, 218). The app shows 217 (`facts.js`, `useSchoolCount`). Docs that say "223 schools" need to say "223 rows / 217 shown". | prod `GET /api/schools` returns 217; `/test-db` returns 223 |
| 4 | P1 | Production frontend sends no CSP, X-Frame-Options or X-Content-Type-Options headers (payment pages can be framed). Backend sends `x-powered-by: Express`. | `curl -D -` against prod |
| 5 | P1 | Stripe test account: `charges_enabled=false`, no support e-mail, URL or statement descriptor. Monthly price is 249 CZK/month, `tax_behavior` unspecified. The season pass (690 Kč) is an inline PaymentIntent, not a Stripe Price. The webhook is registered at Railway prod with 6 events. | read-only Stripe test API |
| 6 | P1 (verify) | The monthly plan has **no trial** by design (plan 009 table; no `trial_period_days` in `createCheckoutForUser`, server.js ~2828). Only the season pass gets 3 days. Check that no paywall/legal copy promises a trial on monthly. CLAUDE.md contradicts itself on which plan is pre-selected and which has the trial. | server.js:2794-2842 |
| 7 | P2 | The `/` landing loads inside `<Suspense fallback={null}>` (App.jsx:68). On phones the page is blank for 1–3 s while the 731 KB Landing chunk (three.js) downloads. Main bundle is 1.14 MB (332 KB gzip). | build output + 375px browser check |
| 8 | P3 | Landing category chips show "0" until the full school list loads. `useSchoolCount()` downloads the full 758 KB `/api/schools` just to count. Suggest a skeleton and a count endpoint. | browser check |
| 9 | Suggestion | Masculine-only copy aimed at girls too: "abys mohl vybrat sám" (landing), "narazil" (onboarding welcome). | browser text |
| 10 | Question | Onboarding welcome claims "Veřejné zdroje — Cermat a MŠMT". Is MŠMT data actually used? | browser text |
| 11 | Docs | Email confirmation **is** enforced live (`mailer_autoconfirm=false`), so UNFORGET "Re-enable Supabase email confirmation" is resolved. The Browser pane works on the MacBook, so the stale CLAUDE.md/AGENTS.md paragraph can go. | Supabase `/auth/v1/settings`; browser |
| 12 | P2 | Only 56 of 223 schools have `school_ai_summary` pros/cons; `school_extracted_details` has 220 rows. | live counts |
| 13 | ok | 122/122 backend tests pass; frontend lint has 0 errors and 8 warnings (unused `misto` at Search.jsx:108); production build passes. Prod backend health is OK and CORS is limited to https://www.stredninamiru.cz. Frontend is gated with 401 + noindex. | local runs |

## Still to do (next session)
1. Relaunch the read-only slice reviews: payments; legal vs code; server.js 1–1700; server.js 1650–end; lib + tests; SQL/RLS; scripts/tooling; onboarding; search/detail; questionnaire/decision; auth/shell/beta/admin; landing/styles/tokens; cross-file consistency; md-docs accuracy.
2. Verify each finding, fix only the 100 % SAFE-FIX ones (claim files in `reports/deployment-review-2026-10-07/COORDINATION.md` first; Codex is active), and update the md files.
3. Write `REPORT.md` + `HANDOFF-PLAN.md` here, plus the manual checks for the founder (apply SQL, Supabase redirect URLs, Turnstile key in prod, Brevo SMTP, Stripe account details, real-device Safari test).
