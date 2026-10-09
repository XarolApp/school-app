# Deploying Střední na míru

Two separate deploys: the Express backend on **Railway**, the Vite/React
frontend on **Vercel**. Supabase hosts the database and Auth; schema, grants,
policies and Auth/Storage settings still require separate migration verification.

**Observed deployment, 8 October 2026:** frontend https://www.stredninamiru.cz
(apex redirects to www; the shared-code gate returns `no-store` and `noindex`).
The site-wide gate uses the shared tester code and protects only the frontend;
each API endpoint has its own authorization policy. Backend
https://school-app-production-be43.up.railway.app returns a healthy JSON response;
its CORS response allows the www origin. CORS does not replace API authorization:
the anonymous catalogue endpoint currently returns all 217 visible schools and
nested data. The premium/public projection boundary remains an open review item.

Local Stripe configuration was verified in **test mode**; the test webhook points
at the Railway URL. This does not verify deployed billing secrets or authorize
real payments. Check Railway billing/credits and continuity in the dashboard: the
previous note predicted a trial deadline around 13 October, but its current billing
state has not been verified. Do not assume that date proves the service will stop.

The setup below describes the existing topology, not release approval. Git pushes
are intended to trigger Railway/Vercel deployment; verify each platform's deployed
commit and build logs rather than assuming every push reached both services. See
the [continuing deployment review](reports/deployment-review-2026-10-07/REPORT.md)
and [handoff gates](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

---

## 1. Backend — Railway

1. railway.app → **New Project** → **Deploy from GitHub repo** → pick
   `XarolApp/school-app`.
2. Railway will detect `railway.json` (repo root) and use Nixpacks with
   `node server.js` as the start command — no manual build config needed.
   **Root directory: leave as the repo root** (not `frontend/`) — `server.js`
   lives at the top level.
3. Go to the service's **Variables** tab and configure the server variables from
   [`.env.example`](.env.example). Scrape/extraction-only keys and tuning variables
   belong in the local pipeline environment, not this service. In particular:
   - `PORT` — leave unset, Railway injects its own.
   - `TRUST_PROXY` — configure only after verifying Railway's actual trusted
     proxy/header topology. The earlier blanket `true` instruction is not a
     verified safe configuration. Confirm forwarded headers cannot be spoofed and
     rate limits distinguish clients without blocking a classroom behind one NAT.
     See B06 in the deployment review; do not change live settings blindly.
   - `NODE_ENV` — `production`. Without it a missing `BETA_TICKET_SECRET`
     silently falls back to the service-role key.
   - `BETA_TICKET_SECRET` — a fresh random 32+ byte value (beta tracking tickets).
   - `ADMIN_EMAILS` / `DEVELOPER_EMAILS` — comma-separated, server-only.
   - `OPENROUTER_API_KEY` — needed for questionnaire explanations and cached
     school reasons. Defaults are `OPENROUTER_MODEL=openai/gpt-6-luna`,
     `OPENROUTER_PROSCONS_MODEL=openai/gpt-6-luna`, and
     `OPENROUTER_PROVIDER=openai/flex`; see [`.env.example`](.env.example).
   - `FRONTEND_URL` — you don't have the Vercel URL yet. Deploy step 2 first,
     then come back and set this to that URL (no trailing slash), then
     redeploy this service (Railway → Deployments → Redeploy) so CORS,
     the Stripe redirect URLs, and the OpenRouter referer all point at it.
4. Deploy. Once it's up, copy its public URL (Settings → Networking →
   Generate Domain if one isn't assigned yet) — you'll need it in step 2.
5. Sanity check: `curl https://<your-railway-url>/` should return
   `{"status":"ok"}` (same health check as local dev, see CLAUDE.md).

## 2. Frontend — Vercel

1. vercel.com → **Add New Project** → import `XarolApp/school-app`.
2. **Root Directory: set to `frontend`** — this is the one setting Vercel
   won't guess correctly on its own, since the repo root also has a
   `package.json` (the backend's). Framework preset should auto-detect as
   Vite once the root directory is set.
3. `frontend/vercel.json` already handles the React Router SPA rewrite
   (without it, refreshing a route like `/skoly` 404s) — nothing to
   configure there.
4. Project → Settings → Environment Variables, add every var from
   [`frontend/.env.example`](frontend/.env.example):
   - `VITE_API_BASE_URL` → the Railway URL from step 1.4 (no trailing slash).
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — same values as your
     local `frontend/.env` (the anon key, never the service-role key).
   - `VITE_TURNSTILE_SITE_KEY` — must match the Turnstile secret configured in
     Supabase → Authentication → Attack Protection. If CAPTCHA is enabled in Supabase
     and this is unset, every signup/login fails.
   - `SITE_ACCESS_KEY` — **not** prefixed `VITE_`; set the shared tester code
     `pristuptestovaciverze`. Vercel middleware accepts it by POST and stores only
     an HMAC in a 180-day Secure, HttpOnly, SameSite=Lax cookie. Production fails
     closed if this variable is missing; `/beta/:code` and `?beta=` do not bypass it.
   - `VITE_BETA_SCHOOL_CODE=PRISTUPTESTOVACIVERZE` — public, baked into the client
     bundle, and used for the single internal beta-school enrolment. It is the
     uppercase form of the shared tester code. The first visit to `/` goes to the
     beta landing once; signup still requires role and data-use acknowledgement.
     Since this value is public and matches the gate code, treat the shared-code
     gate as a beta distribution barrier, not as a security boundary. API access
     still depends on server-side authorization.
5. Deploy. Copy the resulting URL and go back to Railway (step 1.3) to set
   `FRONTEND_URL` to it, then redeploy the Railway service.

## 3. Supabase — Auth configuration and schema acceptance

Auth → URL Configuration: **Site URL** `https://www.stredninamiru.cz`, and
**Redirect URLs** must cover every path the app sends in an e-mail link:
`https://www.stredninamiru.cz/email-overen**` (signup + beta confirmation),
`https://www.stredninamiru.cz/prihlaseni**` (onboarding signup returns here),
`https://www.stredninamiru.cz/nove-heslo` (password reset) and
`https://www.stredninamiru.cz/nastaveni` (e-mail change) — or simply
`https://www.stredninamiru.cz/**`. Keep the `http://localhost:5173/**` entry for dev.
A missing entry makes Supabase fall back to the Site URL, and the tab that is
waiting for confirmation never moves on.

The canonical intended schema is `supabase-setup.sql`; table presence is not proof
that its latest functions, grants or constraints are deployed. `beta_profile.role_note`
is present in the 8 October read-only check. Fresh-install/rerun and authenticated
cross-account/Storage tests remain required in a disposable database, followed by
only the reviewed missing migration on production. Never blindly rerun the entire
schema on production or use production accounts for destructive acceptance tests.

## 4. Verify the deployed beta

- Record the deployed frontend/backend commits, HTTP security headers, allowed
  origins and environment mode. Test both the shared-code gate and unlocked app.
  `frontend/vercel.json` configures CSP in report-only mode and applies the other
  listed browser security headers; inspect their deployed values and reports before
  considering CSP enforcement. Verify Turnstile, maps, Auth and screenshots still
  work. The API host is independently reachable outside the frontend gate.
- Use designated synthetic testers to exercise invitation → role/data-use
  acknowledgement → signup → email confirmation → first sign-in → questionnaire →
  search/detail → comparison/matrix → main feedback/renewal → expiry. Separately
  exercise onboarding and its optional payment preview. Quick ratings must leave
  the access timer unchanged. Test delayed
  confirmation, recovery, account switching and account management. Do not submit
  real pupil data merely to run a smoke test.
- Beta is **free for feedback**, with payment screens as a preview. Verify no beta
  journey opens Stripe, starts a purchase trial or requires payment. The observed
  cutoff is 18 October at 23:59 Europe/Prague, with a 48-hour rolling window; check
  the server's current settings before distributing invitations.
- Preserve the founder's public landing/onboarding and landing-map school-detail
  exception while enforcing premium access on the rest of the product. Ordinary
  access trials must start at first confirmed sign-in; that change is still pending.
- Save evidence and unresolved manual checks in the current review, then update
  `docs/skolamatch_current_status.md` with what actually passed. Deployed URLs and a
  successful build alone do not mean beta acceptance is complete.
- Payment is **not approved for live billing**. Test cards only until the payment
  lifecycle, refund, reminder, operator and provider gates in `UNFORGET.md` and the
  [current handoff](reports/deployment-review-2026-10-07/HANDOFF-PLAN.md) are closed.
  The [Claude review](reports/claude-review-2026-10-07/REPORT.md) is additional
  snapshot evidence, not a replacement for those gates.
