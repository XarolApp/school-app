# Beta testing operations

> **Status 2026-10-07 (verified live):** all beta tables exist; the configured
> `ends_at` is a leftover TEST value (2026-10-12 21:10 UTC — set the real date);
> `beta_schools` holds only `TEST`; the newest SQL (`beta_profile.role_note`) is
> NOT applied yet. Test a fresh installation and reruns in a disposable database,
> then prepare/apply only the reviewed missing migration on the existing project.
> Do not blindly rerun the whole schema on production. See the
> [current deployment handoff](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

This is the operator runbook for plan 016. The beta program is **closed** while
`beta_program_settings.ends_at` is `NULL`. Do not distribute working invites
until a real future cutoff has been supplied and configured.

Beta is **free in exchange for feedback** (founder confirmed 2026-10-07). The
rolling tester window/cutoff is independent of ordinary-account or season payment
trials. Paywall screens are an optional feedback preview; beta must never open
Stripe, require payment, start a purchase trial or renew access merely by viewing
that preview.

## Apply the database migration

On a fresh database, run the complete [`supabase-setup.sql`](../supabase-setup.sql)
after the Supabase `auth` schema is available.

On an existing installation, the base tables and Stripe columns must already
exist. The delimited `BEGIN BETA TESTING MIGRATION BLOCK` /
`END BETA TESTING MIGRATION BLOCK` describes the original beta access/feedback
migration; later schema sections add analytics, profile, screenshot, closing and
ranking features. Applying that block alone does not install the latest beta.
Inspect the full current schema, verify a fresh installation and repeat runs in a
disposable database, and prepare an explicit incremental migration for the existing
project. The original block is intended to leave a configured cutoff unchanged.
It creates the school/settings/feedback tables, adds tester profile
fields, replaces the signup trigger and access function, installs the atomic
feedback renewal function, and enables RLS on the new tables without adding
browser policies.

Before the migration proceeds, it checks for legacy `beta` profiles that still
have Stripe identifiers or a scheduled season charge. If it raises an exception,
resolve those accounts' billing state first; do not clear identifiers to get
past the check. To inspect only the count:

```sql
select count(*) as unsafe_legacy_beta_profiles
from public.users
where subscription_status = 'beta'
  and (
    stripe_customer_id is not null
    or stripe_subscription_id is not null
    or stripe_payment_method_id is not null
    or stripe_setup_intent_id is not null
    or season_charge_due_at is not null
  );
```

The schema seeds a settings row with `access_hours = 48`, `ends_at = NULL`, and
no external form. It backfills a missing rolling deadline once for old beta
profiles. Running the block again does not extend an existing deadline.

## Configure a cohort

When the founder supplies the end date and time, edit the single row where
`singleton = true` in `beta_program_settings`:

- Set `ends_at` to that future instant, including the Europe/Prague offset.
- Keep `access_hours` at `48` unless the founder changes the renewal window.
- Set `feedback_form_url` only after the external form URL is supplied. Leave
  it `NULL` otherwise; the app validates HTTPS before showing a link.

The current cohort has one shared tester code and one internal school attribution
row. Do not create a different code per tester or show the school name as a tester
invitation. Seed the existing cohort row with the uppercase code and internal school
name:

```sql
insert into public.beta_schools (code, school_name)
values ('PRISTUPTESTOVACIVERZE', 'ZŠ Jesenicova')
on conflict (code) do update set school_name = excluded.school_name;
```

This database row is internal: it satisfies the signup trigger's code validation
and attributes testers to the sole cohort school. The tester-facing code is
`pristuptestovaciverze`; the uppercase form is used in `beta_schools` and the
frontend environment variable. The beta landing is at `/beta/PRISTUPTESTOVACIVERZE`.

The frontend deployment needs `VITE_API_BASE_URL` set to the trusted backend
origin (the same public API origin used by the app). In Vercel set server-side
`SITE_ACCESS_KEY=pristuptestovaciverze` and public
`VITE_BETA_SCHOOL_CODE=PRISTUPTESTOVACIVERZE`. The middleware accepts the shared
code by POST, normalizes it, and stores an HMAC in a Secure, HttpOnly,
SameSite=Lax cookie for 180 days. Production fails closed when `SITE_ACCESS_KEY`
is missing; local and preview builds stay open. `/beta/<CODE>` and
`/email-overen?beta=<CODE>` do not bypass the gate. A confirmation link opened
in a fresh browser asks for the code first; after entry, the same path, query and
hash are restored so Supabase tokens survive.

`VITE_BETA_SCHOOL_CODE` is public and included in the frontend bundle. It sends
the first visit to `/` to the beta landing once and supplies the internal school
code at signup; testers still choose a role and acknowledge the beta data-use
notice. Since this public value matches the gate code, treat the shared-code gate
as a beta distribution barrier, not as a security boundary. Keep API authorization
server-side: direct requests to the backend are not blocked by frontend middleware.

In Supabase Auth URL configuration, allow the deployed confirmation return path
`https://www.stredninamiru.cz/email-overen**` (and `http://localhost:5173/email-overen**`
for development). Beta confirmation links may still include `?beta=CODE` so the
app can continue to the school landing, but that query is navigation context only;
it does not open the site gate. The POST gate keeps access codes out of browser
history and preserves the confirmation link's path, query, and hash after entry.

## Read tester and feedback data

Useful cohort totals, without exposing account details:

```sql
select
  tester_school_code,
  count(*) as accounts,
  count(*) filter (where tester_access_until > now()) as rolling_windows_open
from public.users
where subscription_status = 'beta'
group by tester_school_code
order by tester_school_code nulls last;
```

Review feedback by school or account in the Supabase dashboard, or query the
specific information needed:

```sql
select created_at, school_code, user_id, type, page_url, message
from public.beta_feedback
where school_code = 'GYMJECNA'
order by created_at desc;
```

Account deletion cascades feedback. Feedback is written through service-only
server/RPC paths, including `submit_beta_feedback` and
`submit_beta_feedback_details`; school attribution and renewal deadlines are
derived from server-side profile/settings rows, never trusted request fields.

## Disposable-database verification

Do this only against a disposable Supabase/Postgres database with a confirmed
synthetic beta user. Never add test triggers to production. Run the full current
schema on a fresh disposable installation and at least twice more; confirm it
succeeds each time and preserves the synthetic user's `tester_access_until` on
subsequent runs. Confirm RLS and function grants:

```sql
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('beta_schools', 'beta_program_settings', 'beta_feedback');

select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'submit_beta_feedback'
order by grantee, privilege_type;

select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('beta_schools', 'beta_program_settings', 'beta_feedback');
```

These three base beta tables should have RLS enabled and no browser policies.
The function must have no `EXECUTE` grant for `anon` or `authenticated`, while
`service_role` can execute it. These example queries cover only the original
access/feedback block. Also inspect every later beta table, service-only RPC and
private Storage policy, verify the latest profile columns, and exercise isolation
with anonymous/account-A/account-B requests. Anonymous zero-row probes alone do
not prove this.

To prove both sides of transaction rollback, record the synthetic tester's
deadline and feedback count, then separately install a disposable trigger that
raises on (1) feedback insert and (2) a change to that tester's
`tester_access_until`. Call `submit_beta_feedback` in each case and catch the
expected error in a PL/pgSQL exception block. After each failure, verify that
both the row count and deadline equal their recorded values. Drop the test
triggers/functions afterward. A JavaScript mock cannot establish this database
atomicity.

For concurrency, submit two valid feedback calls in separate sessions at nearly
the same time. Both should succeed, but the final deadline must be about 48 hours
after the later accepted submission (capped by `ends_at`), not 96 hours after
either one. `FOR UPDATE` on the user row serializes those writes.
