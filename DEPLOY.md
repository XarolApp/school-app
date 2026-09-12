# Deploying ŠkolaMatch

Two separate deploys: the Express backend on **Railway**, the Vite/React
frontend on **Vercel**. Supabase is already hosted — nothing to deploy there.

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
   - `VITE_TURNSTILE_SITE_KEY` — same as local, or leave unset (CAPTCHA
     widget just won't render; forms still work).
5. Deploy. Copy the resulting URL and go back to Railway (step 1.3) to set
   `FRONTEND_URL` to it, then redeploy the Railway service.

## 3. Supabase — one setting to check

Auth → URL Configuration → **Redirect URLs**: add the Vercel URL (e.g.
`https://skolamatch.vercel.app/**`) alongside `localhost:5173`, or email
confirmation / password reset links will redirect to a dead local address
for real users. Keep the localhost entry too — you still need it for dev.

## 4. After both are live

- Full smoke test against the real URLs: sign up, confirm email, sign in,
  fill `/dotaznik`, browse `/skoly`, open a school page, check
  `/porovnani/matice`.
- Update `docs/skolamatch_current_status.md`'s "Deployment" line from
  "not finalized" to done, with the two URLs.
- Payment is still not live (`/api/checkout` stays 503 until Stripe keys are
  set — separate work, see `UNFORGET.md`/status doc blockers). Deployment
  existing does not mean the product can safely take real money yet.
