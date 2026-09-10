-- ============================================================================
-- ŠkolaMatch — auth, trial and paywall schema
--
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- The paywall is enforced here and in server.js, never in the browser.
-- A user can edit anything the browser knows, so the browser is only ever
-- told what to *show* — the database decides what is *allowed*.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Profile table
--
-- Supabase already stores the account (email + hashed password) in the private
-- auth.users table, which nothing in our app can read directly. This table
-- holds the parts WE care about: name, trial window, subscription state.
-- ----------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  trial_expires_at timestamptz not null,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'season', 'past_due', 'canceled', 'expired', 'developer')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. Trial length is set by the database, not the client
--
-- If the browser sent trial_expires_at, a user could give themselves a trial
-- expiring in the year 2099. This trigger fires automatically whenever
-- Supabase Auth creates an account, so the 3 days is not negotiable.
--
-- 3 days, not 7: the trial length is a researched product decision recorded in
-- CLAUDE.md and frontend/src/config/pricing.js. If it ever changes, it must
-- change in both places or the paywall copy will promise a window the database
-- does not grant.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, trial_expires_at, subscription_status)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'name', ''),
    now() + interval '3 days',
    'trialing'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- Re-running this file on an existing database: widen the allowed statuses so
-- 'developer' is accepted. Safe to run repeatedly.
alter table public.users drop constraint if exists users_subscription_status_check;
alter table public.users add constraint users_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'season', 'past_due', 'canceled', 'expired', 'developer'));


-- ----------------------------------------------------------------------------
-- 3. Favourites
-- ----------------------------------------------------------------------------

create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id bigint not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, school_id)
);


-- ----------------------------------------------------------------------------
-- 3b. Questionnaire runs
--
-- One row per completed questionnaire — a "sada odpovědí" in the UI. Both the
-- answers and the AI's ranked matches are stored, so re-opening the results
-- page is a plain database read rather than a fresh (and billable) AI call.
--
-- An account keeps every set it has ever completed, and exactly one of them is
-- the *default*: the one whose answers decide the match percentage shown on
-- every school across the app. See the is_default notes below.
--
-- This table is also the quota: "how many runs this month" is a count of rows,
-- which means the limit cannot be dodged by clearing localStorage or replaying
-- a request. There is deliberately no client INSERT policy — only server.js,
-- running as service_role, may add a row, and it does so only after it has
-- checked the quota itself.
-- ----------------------------------------------------------------------------

create table if not exists public.questionnaire_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  matches jsonb not null,
  model text,
  created_at timestamptz not null default now()
);

-- The quota counts this account's rows since the start of the period.
create index if not exists questionnaire_runs_user_created_idx
  on public.questionnaire_runs (user_id, created_at desc);

-- --- Multiple sets, one of them default ---------------------------------------
-- Added after the table was already in use, hence the ALTERs. Every guard here
-- is `if not exists` because this whole file is meant to be re-runnable.

-- Optional user-written name. Unnamed sets are labelled from their date and a
-- digest of their own answers, computed at display time — nothing to store.
alter table public.questionnaire_runs
  add column if not exists label text check (char_length(label) <= 60);

-- Which set drives the match percentage everywhere else in the app.
--
-- The flag lives here rather than as a `default_run_id` on `users` because
-- reads outnumber writes by a wide margin: every /api/schools, /api/favorites
-- and /api/schools/:id request has to resolve the scoring set, while setting it
-- is an occasional button press. On this side it is one indexed query; on the
-- users side it would add a second lookup to every school request. It also
-- keeps `users` — the payment-critical row this file locks down to select-only
-- — out of a feature that has nothing to do with billing.
--
-- `false` on every existing row is deliberately a valid state. The resolver
-- orders by (is_default desc, created_at desc), so "nothing flagged" means
-- "the newest set", which is exactly how this behaved before sets existed.
-- That is why there is no backfill here: accounts that predate this column
-- score identically on the day it lands. It is also what makes the flag
-- self-healing — archive the default and scoring falls back to the newest
-- rather than every percentage in the app disappearing at once.
alter table public.questionnaire_runs
  add column if not exists is_default boolean not null default false;

-- Hidden from the list without being destroyed. Deliberately not a DELETE:
-- the quota is a count of rows since the period start, so deleting sets would
-- refund allowance and make the monthly limit worth nothing. Archiving keeps
-- the row counted and keeps a mis-click reversible; genuinely erasing answers
-- is what account deletion is for.
alter table public.questionnaire_runs
  add column if not exists archived_at timestamptz;

-- One default per account, enforced by the database rather than trusted to the
-- two updates in server.js that set it. Partial, so the many `false` rows do
-- not collide with each other.
create unique index if not exists questionnaire_runs_one_default_idx
  on public.questionnaire_runs (user_id) where is_default;

-- Serves the resolver's (is_default desc, created_at desc) order directly.
create index if not exists questionnaire_runs_user_default_idx
  on public.questionnaire_runs (user_id, is_default desc, created_at desc);


-- ----------------------------------------------------------------------------
-- 3c. Per-obor admission data (school_programs)
--
-- One row per obor per school per year, from Cermat's real jednotná přijímací
-- zkouška results (`scripts/import-admission-data.js`). Backs the per-obor
-- breakdown on the school detail page — the school-level admission_cutoff /
-- acceptance_rate columns above are an average across all of these, useful as
-- a headline number but not for judging any single obor.
--
-- This table already existed in the live database (created by the import
-- script before this file described it) — this block only makes the file
-- describe reality, matching CLAUDE.md's claim that this file is the source
-- of truth for the schema. `create table if not exists` makes this safe to
-- run against a database that already has the table.
-- ----------------------------------------------------------------------------

create table if not exists public.school_programs (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  rok int not null,
  kkov text,
  obor_nazev text,
  typ_skoly text,
  zrizovatel text,
  maturitni boolean,
  jpz_povinna boolean,
  jazyk_studia text,
  delka_studia int,
  forma_vzdelavani text,
  kapacita int,
  prihlasky int,
  prijati int,
  cutoff numeric
);

create index if not exists school_programs_school_id_idx
  on public.school_programs (school_id);


-- ----------------------------------------------------------------------------
-- 3d. Reviews and reports
--
-- Reviews are real user-generated content, not a stub. Two GDPR-driven rules
-- that only server.js enforces (never trust the browser for either):
--
--   1. `show_name` is meaningless unless role is 'rodic' or 'ucitel' — those
--      are the only two roles that are adults by definition. A student or
--      absolvent review is ALWAYS pseudonymous ("Student · 3. ročník"),
--      because the Czech digital age of consent (GDPR Art. 8) is 15 and our
--      core users are 14-15-year-old 9th graders, who cannot validly consent
--      to publishing their own name next to an opinion about a named school.
--   2. The display name itself is never stored here — see server.js's
--      reviewDisplayName(), which resolves `users.name` at READ time. That is
--      what makes revoking consent (switching back to pseudonymous) actually
--      remove the name everywhere, per GDPR Art. 17, instead of leaving it
--      frozen into every review already posted.
--
-- `status` is the moderation state: 'published' (default, shown immediately —
-- a review only gets published this fast because posting is gated behind an
-- email-confirmed account and a word filter), 'held' (a report or the word
-- filter flagged it — hidden from everyone but its author until manually
-- reviewed), 'hidden' (reserved for a manual takedown).
-- ----------------------------------------------------------------------------

create table if not exists public.school_reviews (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'absolvent', 'rodic', 'ucitel', 'navstevnik')),
  role_year int check (role_year between 1 and 2100),
  obor_nazev text check (char_length(obor_nazev) <= 120),
  body text not null check (char_length(body) between 40 and 2000),
  show_name boolean not null default false,
  verified boolean not null default false,
  status text not null default 'published' check (status in ('published', 'held', 'hidden')),
  created_at timestamptz not null default now()
);

-- One review per person per school — not a technical limit, a product one:
-- this is "what's it like to go here", not a comment thread.
create unique index if not exists school_reviews_one_per_user
  on public.school_reviews (school_id, user_id);

create index if not exists school_reviews_school_idx
  on public.school_reviews (school_id, status);

-- One report per person per review — the primary key itself makes reporting
-- idempotent, so clicking "Nahlásit" twice is harmless rather than an error.
create table if not exists public.review_reports (
  review_id bigint not null references public.school_reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

-- Crowdsourced data-accuracy reports ("Nahlásit chybu v údajích") — a free
-- correction channel, not a review. No status/moderation columns: these are
-- read by a human (you) directly in Supabase, not rendered back to users.
create table if not exists public.data_reports (
  id bigint generated always as identity primary key,
  school_id bigint not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  field text,
  message text not null check (char_length(message) between 10 and 1000),
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 4. Does this account currently have access?
--
-- One definition, used by every policy below, so "is this person allowed in"
-- can never drift between tables.
-- ----------------------------------------------------------------------------

-- 'developer' is a permanent grant with no expiry, used for your own test
-- accounts. It is only ever set by server.js from the DEVELOPER_EMAILS
-- allowlist — there is no way for a signup form to ask for it.
create or replace function public.has_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and (
        u.trial_expires_at > now()
        or u.subscription_status in ('active', 'season', 'developer')
      )
  );
$$;


-- ----------------------------------------------------------------------------
-- 5. Row Level Security
--
-- Without RLS, the publishable key in the frontend can read every row of
-- every table straight from Supabase's REST API — the backend would be a
-- polite suggestion. These policies close that door.
-- ----------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.favorites enable row level security;
alter table public.schools enable row level security;
alter table public.questionnaire_runs enable row level security;
alter table public.school_programs enable row level security;
alter table public.school_reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.data_reports enable row level security;

-- --- users -------------------------------------------------------------------
-- Read your own profile. Nothing else: there is deliberately no INSERT policy
-- (the trigger creates the row) and no UPDATE policy (only Stripe webhooks,
-- running as service_role, may change subscription_status).

drop policy if exists "read own profile" on public.users;
create policy "read own profile"
  on public.users for select
  using (auth.uid() = id);

-- --- favorites ---------------------------------------------------------------
-- Your own rows only, and only while your account has access.

drop policy if exists "read own favorites" on public.favorites;
create policy "read own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "add own favorites" on public.favorites;
create policy "add own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id and public.has_access(auth.uid()));

drop policy if exists "remove own favorites" on public.favorites;
create policy "remove own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- --- questionnaire_runs -------------------------------------------------------
-- Read your own runs. No INSERT policy on purpose: a browser that could write
-- here could also write its own quota away by inserting nothing, or fabricate
-- matches. server.js (service_role) is the only writer. DELETE is allowed so an
-- expired account can still erase its own answers.
--
-- There is no UPDATE policy either, which is what protects the columns added
-- above: naming a set, flagging it as default and archiving it all go through
-- server.js, so a browser cannot point `is_default` at a row it does not own or
-- un-archive its way around anything. Those three routes require only a valid
-- login and not an active subscription — managing your own answers has to keep
-- working after a trial lapses, for the same reason DELETE is allowed here.

drop policy if exists "read own questionnaire runs" on public.questionnaire_runs;
create policy "read own questionnaire runs"
  on public.questionnaire_runs for select
  using (auth.uid() = user_id);

drop policy if exists "delete own questionnaire runs" on public.questionnaire_runs;
create policy "delete own questionnaire runs"
  on public.questionnaire_runs for delete
  using (auth.uid() = user_id);

-- --- schools -----------------------------------------------------------------
-- RLS is on and NO policy grants the browser access, so the anon/publishable
-- key cannot read this table at all. School data is only reachable through
-- server.js, which checks the trial before answering. This is the paywall.
--
-- service_role (used by server.js and the n8n scraper) bypasses RLS entirely,
-- so both keep working.

-- Coordinates behind the location snapshot on the school detail page. Added by
-- ALTER rather than in a create-table block because this table predates this
-- file — the scraper made it. Both columns stay null until
-- `scripts/geocode-schools.js` fills them in, and SchoolMap renders nothing at
-- all while either is missing, so an unseeded database simply has no maps
-- rather than a pin in the wrong place.
alter table public.schools add column if not exists latitude double precision;
alter table public.schools add column if not exists longitude double precision;

-- Real admission data from Cermat's yearly jednotná přijímací zkouška results
-- (data.cermat.cz), filled in by `scripts/import-admission-data.js`. Both
-- numbers are averaged across every obor a school offers AND across every
-- year's file the script has been given — never a single program's number,
-- because Search.jsx shows one figure per school and a single-program cutoff
-- would overstate how hard the easiest or hardest program at that school is.
-- Null until the script runs; Search.jsx must treat null as "no data", never
-- as 0, matching the zero-shame/never-fabricate rule already used for the
-- synthetic stand-ins it replaces.
alter table public.schools add column if not exists redizo text;
alter table public.schools add column if not exists admission_cutoff numeric;
alter table public.schools add column if not exists acceptance_rate numeric;
alter table public.schools add column if not exists admission_data_updated_at timestamptz;

-- --- school_programs -----------------------------------------------------------
-- Same reasoning as schools directly above: RLS on, no policy at all. Every
-- read goes through server.js's `.select('*, school_programs(*)')` running as
-- service_role — the browser cannot query this table on its own either.

-- --- school_reviews / review_reports / data_reports -----------------------------
-- RLS on, no policies at all — one step further than questionnaire_runs (which
-- at least allows a client SELECT). Every read and write for all three tables
-- goes through server.js:
--   * reading reviews needs the display-name resolution in
--     reviewDisplayName() (never send a name for a review that isn't showing
--     one — that logic cannot live in a client-readable policy)
--   * writing a review needs the word-filter check before the row lands
--   * reporting a review needs to also flip that review's status, which is
--     two tables changing together
-- A client-writable policy on any of these would let the browser bypass all
-- three.


-- ----------------------------------------------------------------------------
-- 6. Backfill
--
-- Gives a profile row to any account that already existed before the trigger.
-- ----------------------------------------------------------------------------

insert into public.users (id, email, name, trial_expires_at, subscription_status)
select
  a.id,
  a.email,
  nullif(a.raw_user_meta_data ->> 'name', ''),
  now() + interval '3 days',
  'trialing'
from auth.users a
where not exists (select 1 from public.users u where u.id = a.id);
