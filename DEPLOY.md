# Deploying Střední na míru

Two separate deploys: the Express backend on **Railway**, the Vite/React
frontend on **Vercel**. Supabase is already hosted — nothing to deploy there.

**Current production (verified 2026-10-07):** frontend https://www.stredninamiru.cz
(apex `stredninamiru.cz` redirects there; gated by `SITE_ACCESS_KEY`, `noindex`),
backend https://school-app-production-be43.up.railway.app (CORS allows only the www
origin). Stripe runs on **test** keys; the Stripe webhook endpoint points at the
Railway URL above. ⚠️ The Railway service is on its 30-day trial (deployed
2026-09-13) — upgrade it before ~2026-10-13 or the whole backend goes offline.

Everything below is a one-time setup. Both platforms auto-redeploy on every
push to `main` after this is done once.

---

## 1. Backend — Railway

1. railway.app → **New Project** → **Deploy from GitHub repo** → pick
   `XarolApp/school-app`.
2. Railway will detect `railway.json` (repo root) and use Nixpacks with
   `node server.js` as the start command — no manual build config needed.
   **Root directory: leave as the repo root** (not `frontend/`) — `server.js`
   lives at the top level.
3. Go to the service's **Variables** tab and add every var from
   [`.env.example`](.env.example) with real values, **except**:
   - `PORT` — leave unset, Railway injects its own.
   - `TRUST_PROXY` — set to `true` (Railway sits behind a proxy;
     `express-rate-limit` needs this to see real client IPs, not Railway's).
   - `NODE_ENV` — `production`. Without it a missing `BETA_TICKET_SECRET`
     silently falls back to the service-role key.
   - `BETA_TICKET_SECRET` — a fresh random 32+ byte value (beta tracking tickets).
   - `ADMIN_EMAILS` / `DEVELOPER_EMAILS` — comma-separated, server-only.
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
   - `SITE_ACCESS_KEY` — **not** prefixed `VITE_`; read by `frontend/middleware.js`
     to keep the site private until launch (`?key=…` or a valid `/beta/CODE`).
5. Deploy. Copy the resulting URL and go back to Railway (step 1.3) to set
   `FRONTEND_URL` to it, then redeploy the Railway service.

## 3. Supabase — one setting to check

Auth → URL Configuration: **Site URL** `https://www.stredninamiru.cz`, and
**Redirect URLs** must cover every path the app sends in an e-mail link:
`https://www.stredninamiru.cz/email-overen**` (signup + beta confirmation),
`https://www.stredninamiru.cz/prihlaseni**` (onboarding signup returns here),
`https://www.stredninamiru.cz/nove-heslo` (password reset) and
`https://www.stredninamiru.cz/nastaveni` (e-mail change) — or simply
`https://www.stredninamiru.cz/**`. Keep the `http://localhost:5173/**` entry for dev.
A missing entry makes Supabase fall back to the Site URL, and the tab that is
waiting for confirmation never moves on.

## 4. After both are live

- Full smoke test against the real URLs: sign up, confirm email, sign in,
  fill `/dotaznik`, browse `/skoly`, open a school page, check
  `/porovnani/matice`.
- Update `docs/skolamatch_current_status.md`'s "Deployment" line from
  "not finalized" to done, with the two URLs.
- Payment is NOT live: Stripe runs on test keys (real Checkout sessions, test
  cards only). Going live needs an adult-owned Stripe account plus every item in
  `UNFORGET.md` "STOP. DO NOT GO LIVE WITH STRIPE" and the payment gates in
  `reports/claude-review-2026-10-07/REPORT.md`.
