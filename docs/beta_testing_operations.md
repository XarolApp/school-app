# Beta testing operations

This is the operator runbook for plan 016. The beta program is **closed** while
`beta_program_settings.ends_at` is `NULL`. Do not distribute working invites
until a real future cutoff has been supplied and configured.

## Apply the database migration

On a fresh database, run the complete [`supabase-setup.sql`](../supabase-setup.sql)
after the Supabase `auth` schema is available.

On an existing installation, the base tables and Stripe columns must already
exist. In `supabase-setup.sql`, copy and run only the section between
`BEGIN BETA TESTING MIGRATION BLOCK` and `END BETA TESTING MIGRATION BLOCK` in
the Supabase SQL editor. The block is idempotent and leaves a configured cutoff
unchanged. It creates the school/settings/feedback tables, adds tester profile
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

Add one row to `beta_schools` per participating school. Use an uppercase code
matching `^[A-Z0-9][A-Z0-9_-]{2,31}$` and the school's trimmed name:

```sql
insert into public.beta_schools (code, school_name)
values ('GYMJECNA', 'Název školy')
on conflict (code) do update set school_name = excluded.school_name;
```

Replace both sample values with the school's agreed code and name. Do not reuse
a code for another school after distributing it. Construct the invitation as
`https://<deployed-domain>/beta/<CODE>`.

The frontend deployment needs `VITE_API_BASE_URL` set to the trusted backend
origin (the same public API origin used by the app). Vercel middleware reads it
server-side to validate a beta invitation before issuing the existing
`sm_access` site-gate cookie. `SITE_ACCESS_KEY` remains server-only and must not
be prefixed with `VITE_`.

In Supabase Auth URL configuration, allow the deployed confirmation return path
`https://<deployed-domain>/beta/*` (and the local development equivalent when
needed). Beta signup and resend-confirmation links return to that school route,
so a confirmed tester can finish sign-in on another device.

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

Account deletion cascades feedback. New submissions are written only by
`submit_beta_feedback`; school attribution and the new deadline come from the
locked server-side profile/settings rows, never from request fields.

## Disposable-database verification

Do this only against a disposable Supabase/Postgres database with a confirmed
synthetic beta user. Never add test triggers to production. Run the beta block
twice and confirm it succeeds both times and preserves the synthetic user's
`tester_access_until` on the second run. Confirm RLS and function grants:

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

The three tables should have RLS enabled, no browser policies, and no execute
grant for `anon` or `authenticated`; `service_role` must be able to execute the
function.

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
