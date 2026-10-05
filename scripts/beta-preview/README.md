# Disposable local beta preview

This runs the actual React UI and Express handlers against synthetic services.
It never loads `.env`, connects to Supabase, sends e-mail or calls OpenRouter.
Any Stripe access throws and increments the `stripeCalls` counter.
Both servers bind only to `127.0.0.1`; the preview endpoints are **not production
endpoints** and must never be exposed publicly.

From the repository root, in two terminals:

```sh
node scripts/beta-preview/server.cjs
frontend/node_modules/.bin/vite --config scripts/beta-preview/vite.config.mjs --configLoader runner
```

Open `http://127.0.0.1:5175/beta/LOCALGYM`. Use any synthetic `example.test`
address and a dummy password. The password is ignored, no credential is saved,
and no terms agreement is transmitted to an external service.
The collapsed **Místní testovací nástroje** toolbar confirms the newest mock
signup, switches between administrator/normal accounts, or simulates access
expiry and closing timing. Administrator: `admin@example.test`; normal account:
`normal@example.test`. There are six seed testers, 30 synthetic schools and data
for all nine admin tabs. Do not interpret fixture matching deltas as real bias.

`GET http://127.0.0.1:5002/__preview/metrics` exposes synthetic counters. The
preview uses real event validation, middleware, ranking calculations, HTTP
upload/submission flows and admin aggregation. Auth, SQL RPC transactions and
Storage signing are fixtures; this does **not** verify live PostgreSQL RLS,
locks, triggers, e-mail delivery or Supabase Storage.

On Ctrl-C the backend saves only synthetic state to
`/tmp/school-app-beta-preview.json` (mode 0600). Start it with `--resume` only
when preserving that test state is wanted. Starting without `--resume` always
starts fresh. Remove the temporary file after verification. This config is
separate from the ordinary Vite config and is never used by the production build.
