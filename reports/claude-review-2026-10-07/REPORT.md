# Pre-beta deep review — Střední na míru — 2026-10-07

Reviewer: Claude Code (Opus 5.5, xhigh), in parallel with Codex (its report: `reports/deployment-review-2026-10-07/`).
Working log with every finding: [`FINDINGS.md`](FINDINGS.md). Tasks for the next agent: [`HANDOFF-PLAN.md`](HANDOFF-PLAN.md).

## Verdict

**Ready for school beta testing once the 7 founder steps in §2 are done.** Nothing in the code blocks testers after the fixes pushed today. The P0 items are configuration and data: the live database is one SQL run behind, the beta end date is a test value, the AI key has expired, and the Railway trial runs out around 13 October.
**Not ready for real payments.** See §4 "Payment gates".

## 1. What was verified (evidence, not assumptions)

| Check | Result |
|---|---|
| Backend tests | 126/126 pass (1 regression test added today) |
| Frontend lint / build | 0 errors; production build OK |
| `npm audit` (prod) | backend 4 → **0** after fix (was 1 critical, 2 high); frontend 0 |
| Live Supabase | 26 tables exist; **RLS holds**: anon key reads 0 rows from each; `beta-screenshots` bucket private; email confirmation ON (`mailer_autoconfirm=false`) |
| Live schema vs `supabase-setup.sql` | **1 column missing**: `beta_profile.role_note` |
| Live data | 223 school rows / **217 shown** (6 merged), 2 374 programme rows, newest year 2026, every visible school has Cermat rows |
| Production | https://www.stredninamiru.cz up, gated (401 + noindex); backend health OK, CORS limited to the www origin, `/api/schools` 217 rows in ~1 s |
| Stripe (test mode, read-only) | monthly Price 249 CZK OK; webhook at the Railway URL with 6 events; **events arrive in API `2026-08-26.dahlia`** (this exposed bug P4) |
| OpenRouter | **key expired (401)**; last 5 questionnaire runs saved without AI sentences |
| Admission dates in the app | 22. 2. 2027 (přihlášky), 30. 11. 2026 (konzervatoře), JPZ 12.–13. 4. 2027: match public sources |
| Browser (local, 375 px + desktop) | landing, onboarding, `/skoly`, beta landing, fonts self-hosted (0 requests to Google), no horizontal overflow |

## 2. Founder steps before the first tester (P0)

Do these in order. Each has a one-line check.

1. **Re-run the WHOLE `supabase-setup.sql`** in the Supabase SQL editor. Without it, `POST /api/beta/profile` fails for every tester, because the server always writes `role_note`.
   Check: `select column_name from information_schema.columns where table_schema='public' and table_name='beta_profile' and column_name='role_note';` → 1 row. Also `select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.review_reports'::regclass and contype='p';` → `PRIMARY KEY (id)`.
2. **Set the real beta end date.** The live value 2026-10-12 21:10 UTC is a leftover test value (you confirmed this).
   `update public.beta_program_settings set ends_at = '2026-MM-DD 23:59:00+01:00' where singleton;` (use +01:00 after 25 October and +02:00 before).
   Check: `select ends_at at time zone 'Europe/Prague' from public.beta_program_settings;`
3. **Add the real school codes.** Only `TEST` exists. Use `insert into public.beta_schools (code, school_name) values ('KOD', 'Název') on conflict (code) do update set school_name = excluded.school_name;`
   Check: `select code, school_name from public.beta_schools order by code;`
4. **Upgrade Railway before ~13 October.** The trial started 2026-09-13; when it ends the whole backend goes offline. While you're there, set `NODE_ENV=production`, a fresh `BETA_TICKET_SECRET`, `ADMIN_EMAILS` and `TRUST_PROXY=true`.
   Check: `curl https://school-app-production-be43.up.railway.app/` → `{"status":"ok"}`.
5. **Replace the expired OpenRouter key** in Railway and in the local `.env`. Also fix the local `OPENROUTER_MODEL=gemini-3.6-flash`: it needs the `google/` prefix, or delete the line to use the default.
   Check after one questionnaire run: `select ok, error, model from public.ai_usage_log order by id desc limit 1;` → `ok = true`.
6. **Supabase → Authentication → URL Configuration:** Site URL `https://www.stredninamiru.cz`. Redirect URLs must include `/email-overen**`, `/prihlaseni**`, `/nove-heslo` and `/nastaveni` on the www domain (or `https://www.stredninamiru.cz/**`).
   Check: sign up on a phone with a throwaway address. The link must open `/email-overen` with "E-mail je ověřený".
7. **Redeploy Vercel from `main`** (today's commits include the self-hosted fonts). Check: open the site with DevTools → Network; there must be no request to `fonts.googleapis.com` or `fonts.gstatic.com`.

## 3. Fixed and pushed today (all on `main`)

| Commit | What | Severity |
|---|---|---|
| 909fcdd | Signed-in "Nahlásit" on a review always returned **500** (`ON CONFLICT` cannot target a partial index; probed live: 42P10). Breaks the DSA notice-and-action flow. | P1 |
| 909fcdd | Re-running `supabase-setup.sql` **dropped the `review_reports` primary key** every time; now conditional and self-healing | P2 |
| 909fcdd | **Privacy policy said fonts are self-hosted, but index.html loaded Google Fonts** (every visitor's IP sent to Google, including minors'). Now bundled via @fontsource; unused font packages removed | P0 legal |
| 909fcdd | Withdrawal error said "14 dní" while the button works for 30; onboarding answers scored without `school_programs` and with merged schools; beta messages mixed vy into ty | P2–P3 |
| 905df5a | Payment-screen title promised a "potvrzení rodiče" that was removed on 2026-09-22; parents addressed with *ty* in order microcopy, errors and server messages; "e-maily ještě neumíme posílat" was false | P1 copy |
| 6d3fff3 | **Auth deadlock pattern**: the `onAuthStateChange` callback awaited `getSession()`, which Supabase documents as a cause of hangs on token refresh or tab refocus. Blank `/` on phones while the landing chunk loads. Shared beta messages made voice-neutral | P1 |
| 4979d70 | Czech agreement ("by odpovídalo 3 školy"), screen reader read "volných míst" for total capacity, garbled share-link explanation | P3 |
| d00cfc9 | **False claims**: Reveal said "no capacity or exam data" (we show Cermat data); Calculating claimed a publicly described method and a commute calculation (neither exists). "o 5 bodu" plural. OSM attribution without the required copyright link. iOS Safari could hide the landing CTA | P1–P3 |
| d949478 | **Stripe webhook API-version bug**: in `2026-08-26.dahlia` events, `current_period_end` moved to `items[]`, so every monthly renewal wrote `access_expires_at = NULL` ("paid forever"). Invoice failures lost the subscription match. Fixed and tested. `npm audit fix` (critical `proxy-addr`). `.env.example` now documents `NODE_ENV`, `SITE_ACCESS_KEY` and the real URLs | P1 |
| 8b7215d + 3149560 | Your decisions: church-school tuition shown as "Zjistit u školy"; data sources named as Cermat, the MŠMT registry, school websites and others | P2 |
| 3149560 | Docs: CLAUDE/AGENTS, UNFORGET, DEPLOY, PROJECT-OVERVIEW, README, beta runbook/spec and status doc now match reality | — |

## 4. Open findings (not fixed: need a decision, are bigger than a safe fix, or are manual)

### Beta-relevant
- **Paid vs free gating (your decision today, task T1).** Only the landing page and the onboarding (with its result preview and map) should be free. Today `/skoly`, `/skoly/:id`, `/porovnani` and `/porovnani/matice` are public, and a lot of copy says "databáze škol zdarma". Testers aren't affected (they have full access), but this has to ship as one change: gating plus all copy.
- **Codex LEGAL-01: beta analytics consent for minors.** Joining the beta requires accepting tracking, and the policy rests on "legitimate interest" for under-15s. This needs your or a lawyer's call before minors join. See Codex `legal-docs-findings.md`.
- **Codex LEGAL-02: review reporting workflow.** Reporters get no decision e-mail and anonymous reporters leave no contact, although the Terms promise both. Also, every student review is held for manual approval, and there's **no admin screen for held school reviews** (only the Supabase table editor). Either moderate via the dashboard during the beta or disable review publishing until there is one.
- **Paywall and marketing promise "vysvětlení u každé školy"** (Plan, Hodnota, Zkusebni, Reveal, Home). AI sentences exist only for the top 10, and none are generated until the key is replaced. Task T4.
- **Masculine-only wording** for a student audience that is half girls ("jsi viděl", "nejsi jistý", "Jak bys to nesl", "Zvládl bych to", "Nejsi v tom sám", "abys mohl vybrat sám"). Task T5, after you pick the style (e.g. "viděl/a" or neutral phrasing).

### Payment gates (must be done before live keys; not needed for the beta)
- **Season-pass card failure is a dead end (task T2).** Status becomes `past_due` but `plan_id` and the due date stay set. Checkout then answers 409 "Už máš aktivní plán", cancel answers 400, the charge is never retried, and access is gone.
- **Stripe SDK v15 (API 2024-04-10) vs webhook endpoint `2026-08-26.dahlia` (task T3).** Today's fix reads both shapes; upgrade the SDK and pin one version.
- No trial-reminder e-mail (honestly stated in the Terms, but CLAUDE.md requires it before live billing); no durable order or withdrawal confirmation e-mail (Codex LEGAL-07); withdrawal deadline uses milliseconds, not a Prague calendar day (LEGAL-06); operator IČO/registration missing from the Terms (LEGAL-09); adult-owned Stripe account and Brevo account; the existing UNFORGET "STOP. DO NOT GO LIVE WITH STRIPE" list.
- Production frontend sends **no security headers** (no CSP, X-Frame-Options, nosniff or Referrer-Policy), and the backend sends `x-powered-by`. Task T6.

### Lower priority (P2–P3, in the plan)
Year "2026" hardcoded in about 8 UI strings (T7) · a fabricated "Praha N" district for un-geocoded schools in Search (0 affected today, T8) · main bundle 1.14 MB and `useSchoolCount` downloading the full 758 KB list to count it (T9) · `/stara` old landing still routed with "[Jméno]" placeholders, `test-google-*.js` leftovers, three DB scripts without dry-run, `localStorage` without try/catch in `supabaseClient`, HMR circular import, analytics noise, `role_year` never collected, "61,5 bodů" (T10) · onboarding matching bias and the plan 018 open findings (already in UNFORGET).

## 5. Things I could not verify — please check by hand

- **Real devices:** iPhone Safari and an Android phone, full path: invitation → signup → confirm on the other device → first-run guide → feedback with a screenshot → results. Emulation is not Safari.
- **E-mail delivery:** confirmation and reset mails from Brevo to **seznam.cz**, gmail and a school address, including spam folders. Supabase does not expose the SMTP settings to me.
- **Turnstile:** that the Vercel `VITE_TURNSTILE_SITE_KEY` matches the secret in Supabase Attack Protection, and that the allowed hostnames include `www.stredninamiru.cz`.
- **Railway variables:** which OpenRouter key and model production uses, and whether `NODE_ENV` / `BETA_TICKET_SECRET` are set. I can only see the local `.env`.
- **Vercel variables:** `SITE_ACCESS_KEY`, `VITE_API_BASE_URL` (needed for beta invitations to open the site gate).
- **Legal facts:** operator identity and address, the DPA with each processor, the Supabase region (policy says eu-west-1), OpenRouter's data-retention settings.
- **One full paid flow in Stripe test mode** after today's webhook fix (monthly: renew, cancel, withdraw; season: setup, charge, failed charge).

## 6. Suggestions (not broken, would make it better)

1. **A "Jak počítáme shodu" page.** It builds trust with parents, and it is exactly the claim I had to delete from the calculating screen.
2. **A count endpoint, or the count in the HTML.** The landing page downloads 758 KB just to show "217" and the chip counts (shown as "0" until then).
3. **Route-level code splitting** (Search, SchoolDetail, Matice, Settings) to cut the 1.14 MB main bundle on phones.
4. **A moderation tab in `/admin` for held school reviews** (approve / hide / reason), before reviews go public.
5. **A "data year 2026 · aktualizováno …" badge** near every number list, driven by `CURRENT_ADMISSION_YEAR`.
6. **Test e-mail on seznam.cz first.** It is the most common Czech mailbox and the most aggressive spam filter.
7. **A short, child-friendly privacy summary** at the top of the privacy page (3 bullets), alongside the legal text.
8. **Monitoring:** the beta already records `js_error` and `api_error`; add an alert (e-mail/Discord) on spikes, so you notice a broken deploy before testers report it.

## 7. Coverage — what "every line" meant in practice

- **Read line by line:** `server.js` (all 3 328 lines), `supabase-setup.sql` (all 1 376), every file in `lib/`, `frontend/src/pages/Legal.jsx`, all payment and paywall screens, `ParentPay`, `ParentPayHandoff`, `SubscriptionExpired`, `AuthContext`, `api.js` (request layer), `supabaseClient`, `App.jsx`, `ProtectedRoute`, `Login`, `SignUp`, `CreateAccount`, `BetaLanding`, `EmailConfirmed`, the `Search.jsx` logic, `SchoolDetail` and its review components, `admissionRisk`, `Questionnaire.jsx` (form and results), `OnboardingFlow` (state and storage), `ConsentCheckbox`, `middleware.js`, the tests that touch payments.
- **Every user-facing Czech string extracted and read** (script-assisted) in the remaining pages and components: onboarding screens, landing, Home, Layout, decision tools, sharing pages, school-detail components, filters, the beta UI.
- **Scanned, not read line by line:** the about 12 000 lines of CSS (cross-browser grep: `100vh`, `backdrop-filter`, `:has`, hardcoded colours, plus browser checks), `scripts/` (writes and dry-run flags, secrets, env usage), `Admin.jsx`, chart and render-only code, the generated district geometry.
- **Not touched, owned by Codex's claims:** `Settings.jsx`, `pricing.js`, `Cesta.jsx`, `QuizQuestion.jsx`, `ProgramCard.jsx`, `BetaFeedbackSheet.jsx`, `PasswordStrength.jsx`, `betaCapture.js`, `lib/betaAnalytics.js` (read only) and the docs in Codex's correction table (`plans/009`, `plans/019`, `docs/sources/*`, `docs/legal-research/*`, `docs/reports/*`).
