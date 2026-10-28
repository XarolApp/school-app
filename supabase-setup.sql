-- ============================================================================
-- Střední na míru — auth, trial and paywall schema
--
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> Run.
--
-- The paywall is enforced here and in server.js, never in the browser.
-- A user can edit anything the browser knows, so the browser is only ever
-- told what to *show* — the database decides what is *allowed*.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. School catalogue
--
-- Every product table below references public.schools, so a fresh project
-- must create the catalogue before those foreign keys are declared. Existing
-- projects are unaffected; the later ALTER statements add the admission and
-- coordinate columns introduced after the original catalogue.
-- ----------------------------------------------------------------------------

create table if not exists public.schools (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  location text,
  programs text,
  contact text,
  website text
);


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
  trial_expires_at timestamptz,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'season', 'past_due', 'canceled', 'expired', 'developer', 'beta', 'creator')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Trial length is set by the database, not the client
--
-- If the browser sent trial_expires_at, a user could give themselves a trial
-- expiring in the year 2099. The signup trigger in the beta block below keeps
-- this server-controlled for both normal and beta accounts.
--
-- 3 days, not 7: the trial length is a researched product decision recorded in
-- CLAUDE.md and frontend/src/config/pricing.js. If it ever changes, it must
-- change in both places or the paywall copy will promise a window the database
-- does not grant.
-- ----------------------------------------------------------------------------

-- Plan 009 (Stripe payments): access_expires_at makes paid access
-- self-enforcing rather than webhook-dependent. Without it, hasPaidStatus()
-- treats 'season'/'active' as permanently paid, so a single missed webhook
-- (they do get missed) would grant free access forever with nothing to
-- notice. plan_id records which plan is active, needed by the UI to decide
-- whether a cancel button is even meaningful. See server.js's
-- paidAccessActive() and plan 009 §3/§4.5.
alter table public.users add column if not exists access_expires_at timestamptz;
alter table public.users add column if not exists plan_id text;

-- Plan 009 revision: season pass moved from a subscription+trial hack to a
-- genuine one-time charge (mode:'setup' + a later PaymentIntent), because
-- Stripe discloses recurring-billing terms on any subscription-mode Checkout
-- session regardless of custom_text, which contradicted the "one-time"
-- promise. stripe_payment_method_id is the card saved during checkout, kept
-- until the scheduled charge fires; season_charge_due_at is when
-- chargeDueSeasonPasses() (server.js) is allowed to bill it, and is cleared
-- once billed or cancelled. Monthly is unaffected — still a real subscription.
alter table public.users add column if not exists stripe_payment_method_id text;
alter table public.users add column if not exists season_charge_due_at timestamptz;
-- Identifies the setup event already applied to this account. Stripe retries
-- webhooks, including after a user has cancelled; retaining this value makes
-- the same event a no-op instead of silently scheduling the charge again.
alter table public.users add column if not exists stripe_setup_intent_id text;

-- Statutory 14-day withdrawal (Terms §6): plan_started_at is when the contract
-- was concluded (checkout completed), last_paid_at when the money was actually
-- taken (season: the scheduled charge). The window runs 14 days from the later.
alter table public.users add column if not exists plan_started_at timestamptz;
alter table public.users add column if not exists last_paid_at timestamptz;

-- True once the user has cancelled but access still runs to access_expires_at.
alter table public.users add column if not exists cancel_at_period_end boolean not null default false;

-- Plan 014 (user-selectable colour themes): account defaults are Značka/system.
alter table public.users add column if not exists theme_palette text not null default 'znacka';
alter table public.users add column if not exists theme_mode text not null default 'system';
alter table public.users add column if not exists gender text;
alter table public.users drop constraint if exists users_gender_check;
alter table public.users add constraint users_gender_check
  check (gender is null or gender in ('m', 'f'));
alter table public.users drop constraint if exists users_theme_palette_check;
alter table public.users add constraint users_theme_palette_check
  check (theme_palette in ('znacka', 'smrk', 'zvyraznovac', 'terakota'));
alter table public.users drop constraint if exists users_theme_mode_check;
alter table public.users add constraint users_theme_mode_check
  check (theme_mode in ('system', 'light', 'dark'));


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
-- There is deliberately no client INSERT policy — only server.js, running as
-- service_role, may add a row. Submissions are currently unlimited but still
-- rate-limited at the API boundary.
-- ----------------------------------------------------------------------------

create table if not exists public.questionnaire_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  matches jsonb not null,
  extra_reasons jsonb not null default '{}'::jsonb,
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

-- Hidden from the main results without being destroyed. Archiving keeps a
-- mis-click reversible; genuinely erasing answers is what account deletion is
-- for.
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

-- Where a set of answers came from. 'onboarding' rows are written once, when a
-- new account first signs in, from the onboarding quiz; they make no AI call.
alter table public.questionnaire_runs
  add column if not exists source text not null default 'questionnaire'
  check (source in ('questionnaire', 'onboarding'));

-- Explanations requested after the original run are cached by school id.
alter table public.questionnaire_runs
  add column if not exists extra_reasons jsonb not null default '{}'::jsonb;

-- At most one onboarding set per account, so a double flush (two tabs, a
-- retry) cannot create duplicates — the second insert simply conflicts.
create unique index if not exists questionnaire_runs_one_onboarding_idx
  on public.questionnaire_runs (user_id) where source = 'onboarding';


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
  zamereni text,
  kapacita int,
  prihlasky int,
  prijati int,
  cutoff numeric
);

-- Cermat's "ZAMĚŘENÍ OBORU": free text that tells apart programmes sharing one
-- KKOV (FOSTRA's five gymnázium programmes are all 79-41-K/41). The wording
-- changes between years, so it only splits the newest year; history stays per obor.
alter table public.school_programs add column if not exists zamereni text;

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
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
-- Anonymous reporters (DSA Art. 16: notice-and-action must be open to anyone,
-- not just accounts) have a null user_id. A primary key column can't be
-- nullable in Postgres, so the PK is replaced with an id + a partial unique
-- index that only dedupes signed-in reporters (a null user_id never matches
-- another null, so anonymous reports are never blocked by it).
-- Re-runnable: drop the ORIGINAL (review_id, user_id) key only. After the first
-- run the new id key carries the same default name, so an unconditional drop
-- would remove it on every re-run and leave the table with no primary key.
do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.review_reports'::regclass
      and c.contype = 'p' and a.attname = 'review_id'
  ) then
    alter table public.review_reports drop constraint review_reports_pkey;
  end if;
end;
$$;
alter table public.review_reports add column if not exists id bigint generated always as identity primary key;
-- Restores the id key on databases where an earlier re-run already dropped it.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.review_reports'::regclass and contype = 'p'
  ) then
    alter table public.review_reports add primary key (id);
  end if;
end;
$$;
alter table public.review_reports alter column user_id drop not null;
create unique index if not exists review_reports_review_user_key
  on public.review_reports (review_id, user_id) where user_id is not null;

-- DSA Art. 16/17: why a review was held (shown to its author) and what a reporter said.
alter table public.school_reviews add column if not exists moderation_reason text;
alter table public.review_reports add column if not exists reason text;

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
-- 3d. Comparison & decision tools (feature-brainstorm.md §5)
-- ----------------------------------------------------------------------------

-- The three schools this student is actually applying to, in binding DiPSy
-- order. `priority` is 1..3. No unique constraint on (user_id, priority):
-- server.js rewrites the whole set on every reorder (delete-then-insert, at
-- most 3 rows), which is simpler and cannot leave a half-swapped state.
-- obor_kkov/obor_nazev are optional — a pick without an obor still works, it
-- just falls back to the school-level cutoff for risk analysis.
create table if not exists public.application_picks (
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id bigint not null references public.schools (id) on delete cascade,
  priority int not null check (priority between 1 and 3),
  obor_kkov text,
  obor_nazev text,
  created_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

create index if not exists application_picks_user_idx
  on public.application_picks (user_id, priority);

-- Free-text notes, one per user per school. Not limited to picked schools —
-- a student may take notes on a school they later drop.
create table if not exists public.school_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  school_id bigint not null references public.schools (id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

-- The single JPZ score the risk analysis compares against. Deliberately ONE
-- nullable integer and nothing else: CLAUDE.md's data-minimization rule treats
-- grades as sensitive data about minors, so no per-subject breakdown is stored.
-- `source` is 'nanecisto' (September mock) or 'ostra' (the real exam).
create table if not exists public.decision_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  jpz_points numeric check (jpz_points >= 0 and jpz_points <= 100),
  jpz_source text check (jpz_source in ('nanecisto', 'ostra')),
  updated_at timestamptz not null default now()
);
-- How many points the student expects to add before the real exam (a guess,
-- shown next to the risk analysis; never used to change the verdict).
alter table public.decision_profile add column if not exists jpz_expected_gain smallint
  check (jpz_expected_gain between 0 and 100);

-- Revocable read-only share links. The view reads LIVE data at request time
-- (not a snapshot) so a parent always sees the current picks; revoked_at is
-- what makes "you can cancel the link" true rather than cosmetic.
create table if not exists public.shortlist_shares (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  include_notes boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists shortlist_shares_user_idx
  on public.shortlist_shares (user_id, revoked_at);

-- Plan 018: parent <-> child links. server.js (service_role) only — no client policy.

-- Account-owned links. kind='results' shows the owner's DEFAULT questionnaire
-- run live; kind='payment' lets someone without an account pay for, and then
-- manage, the owner's plan.
create table if not exists public.share_links (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('results', 'payment')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists share_links_user_idx on public.share_links (user_id, kind);
alter table public.share_links enable row level security;

-- Parent -> child questionnaire handoff, before any account exists. Holds NO
-- personal data and NO answers: the child's answers stay on the child's device.
create table if not exists public.quiz_handoffs (
  token text primary key,
  owner_secret text not null,
  status text not null default 'active' check (status in ('active', 'opened', 'completed', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  completed_at timestamptz
);
alter table public.quiz_handoffs enable row level security;

-- Pre-account results snapshot (Reveal). Free tier only: one school + a count.
create table if not exists public.result_snapshots (
  token text primary key,
  role text not null check (role in ('student', 'parent')),
  top_school_id bigint not null references public.schools (id) on delete cascade,
  top_score int not null check (top_score between 0 and 100),
  fitting_count int not null check (fitting_count between 0 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.result_snapshots enable row level security;

-- Run after applying Plan 018; expect three rows.
select table_name from information_schema.tables
where table_schema='public' and table_name in ('share_links','quiz_handoffs','result_snapshots');

-- Cached per-school pros/cons. Generated by scripts/generate-school-proscons.js,
-- NOT at request time — see plans/006 §1.3. `data_fingerprint` is a hash of the
-- school inputs the text was written from, so a re-run regenerates only schools
-- whose data actually moved.
create table if not exists public.school_ai_summary (
  school_id bigint primary key references public.schools (id) on delete cascade,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  model text,
  data_fingerprint text,
  generated_at timestamptz not null default now()
);


-- Cached per-school "school life" details, scraped from each school's own
-- website and extracted by Claude (scripts/scrape-schools.js +
-- scripts/extract-school-details.js) — fills the six MissingDataGrid.jsx
-- placeholder cards. Same pattern as school_ai_summary directly above: one
-- row per school, a model column, never regenerated on a page load. Every
-- text column is nullable and stays null when the source pages don't say —
-- never a guessed or invented value, per the extraction script's own rules.
create table if not exists public.school_extracted_details (
  school_id bigint primary key references public.schools (id) on delete cascade,
  skolne_poplatky text,
  obedy_ubytovani text,
  krouzky_aktivity text,
  maturita_uspesnost text,
  vs_uplatneni text,
  uplatneni_po_vyuceni text,
  source_urls jsonb,
  model text,
  extracted_at timestamptz not null default now()
);

-- Structured, queryable versions of two of the free-text fields above —
-- scripts/extract-school-details.js's NUMERIC_FIELDS. Additive, not a
-- replacement: skolne_poplatky/maturita_uspesnost keep the nuance a bare
-- number can't ("20% sourozenecká sleva"), these two exist so
-- lib/decisionMatrix.js can actually score against them.
alter table public.school_extracted_details add column if not exists tuition_czk_per_year integer;
alter table public.school_extracted_details add column if not exists maturita_pass_rate_pct numeric;
alter table public.school_extracted_details add column if not exists zacatek_hodin smallint;
alter table public.school_extracted_details add column if not exists ma_dodatecne_pozadavky boolean;
alter table public.school_extracted_details add column if not exists pripijimaci_pozadavky_detail text;
alter table public.school_extracted_details add column if not exists alternativni_pedagogika boolean;
alter table public.school_extracted_details add column if not exists vyukovy_styl_detail text;

-- Structured, queryable values derived from the stored free-text fields by
-- scripts/extract-school-details.js --structure. Null means no explicit evidence.
alter table public.school_extracted_details add column if not exists ma_jidelnu boolean;
alter table public.school_extracted_details add column if not exists ma_koleje boolean;
alter table public.school_extracted_details add column if not exists krouzky_kategorie text[];
alter table public.school_extracted_details add column if not exists pocet_krouzku integer;
alter table public.school_extracted_details add column if not exists vyukovy_styl_tagy text[];
alter table public.school_extracted_details add column if not exists vs_pokracuje_pct numeric;

-- Special-needs schools, written by scripts/extract-special-needs.js.
-- urceno_pro_postizeni: the SECONDARY school itself is primarily for pupils with
-- these disabilities (a ZŠ/MŠ-only special part does not count). Null = no evidence.
-- specialni_potreby_detail: what support the school describes, for "Praktické informace".
alter table public.school_extracted_details add column if not exists urceno_pro_postizeni text[];
alter table public.school_extracted_details add column if not exists specialni_potreby_detail text;
do $$ begin
  alter table public.school_extracted_details add constraint school_extracted_details_urceno_pro_postizeni_check
    check (urceno_pro_postizeni <@ array['sluchove','zrakove','telesne','mentalni','autismus','kombinovane']::text[]);
exception when duplicate_object then null; end $$;

alter table public.school_extracted_details enable row level security;
-- No client policy — same reasoning as school_ai_summary: this is
-- scraped/AI-derived school data, read only through server.js's service-role
-- key, never directly by the browser.


-- ----------------------------------------------------------------------------
-- BETA TESTING MIGRATION BLOCK
--
-- Re-runnable on an existing installation after the base schema above. The
-- seeded cutoff remains NULL, so enrollment and access stay disabled until
-- the program owner configures a real end time. Keep all beta schema, trigger,
-- access and feedback logic together here so this block can be run on its own.
-- ----------------------------------------------------------------------------

create table if not exists public.beta_schools (
  code text primary key check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  school_name text not null check (
    school_name = btrim(school_name) and char_length(school_name) between 1 and 160
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.beta_program_settings (
  singleton boolean primary key default true check (singleton),
  ends_at timestamptz,
  access_hours integer not null default 48 check (access_hours between 1 and 168),
  feedback_form_url text check (
    feedback_form_url is null or feedback_form_url ~* '^https://[^[:space:]]+$'
  )
);

insert into public.beta_program_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.users
  add column if not exists tester_school_code text references public.beta_schools(code),
  add column if not exists tester_access_until timestamptz,
  add column if not exists tester_guidance_seen_at timestamptz;

create table if not exists public.beta_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  school_code text references public.beta_schools(code),
  type text not null check (type in ('bug', 'idea', 'comment')),
  page_url text not null check (
    char_length(page_url) between 1 and 512
    and left(page_url, 1) = '/'
    and left(page_url, 2) <> '//'
    and position('?' in page_url) = 0
    and position('#' in page_url) = 0
    and position('://' in page_url) = 0
    and page_url !~ '[[:cntrl:]]'
  ),
  message text not null check (
    message = btrim(message) and char_length(message) between 10 and 4000
  ),
  created_at timestamptz not null default now()
);

create index if not exists beta_feedback_user_created_idx
  on public.beta_feedback (user_id, created_at desc);

-- Correct earlier installations that permitted beta but used an incomplete
-- constraint. Fresh installs already include beta in the table declaration.
alter table public.users drop constraint if exists users_subscription_status_check;
alter table public.users add constraint users_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'season', 'past_due', 'canceled', 'expired', 'developer', 'beta', 'creator'));

-- The retired shared-code endpoint could turn a paid account into beta. Stop
-- if any such profile still has billing state; inspect it before proceeding.
do $$
declare
  unsafe_beta_accounts integer;
begin
  select count(*) into unsafe_beta_accounts
  from public.users
  where subscription_status = 'beta'
    and (
      stripe_customer_id is not null
      or stripe_subscription_id is not null
      or stripe_payment_method_id is not null
      or stripe_setup_intent_id is not null
      or season_charge_due_at is not null
    );
  if unsafe_beta_accounts > 0 then
    raise exception 'Resolve % legacy beta billing profiles before applying the beta migration.', unsafe_beta_accounts
      using errcode = '55000';
  end if;
end;
$$;

-- One-time backfill. Re-applying the block never restarts an existing tester.
update public.users u
set tester_access_until = now() + make_interval(hours => s.access_hours)
from public.beta_program_settings s
where s.singleton = true
  and u.subscription_status = 'beta'
  and u.tester_access_until is null;

-- Auth confirmation remains mandatory in Supabase and server.js. The trigger
-- stores an unconfirmed account as beta, but no authenticated access is granted
-- until auth.users.email_confirmed_at is set.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  beta_code text;
  beta_hours integer;
  beta_ends_at timestamptz;
  beta_exists boolean;
  beta_invite_supplied boolean;
begin
  beta_invite_supplied := coalesce(new.raw_user_meta_data ? 'beta_school_code', false);
  if beta_invite_supplied then
    if jsonb_typeof(new.raw_user_meta_data -> 'beta_school_code') <> 'string'
      or btrim(coalesce(new.raw_user_meta_data ->> 'beta_school_code', '')) = '' then
      raise exception 'Beta invitation is invalid.' using errcode = '22023';
    end if;
    beta_code := upper(btrim(new.raw_user_meta_data ->> 'beta_school_code'));
    if beta_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then
      raise exception 'Beta invitation is invalid.' using errcode = '22023';
    end if;

    select s.ends_at, s.access_hours
      into beta_ends_at, beta_hours
      from public.beta_program_settings s
      where s.singleton = true
      for share;
    if not found or beta_ends_at is null or beta_ends_at <= clock_timestamp() then
      raise exception 'Beta program is closed.' using errcode = '55000';
    end if;

    select exists(select 1 from public.beta_schools s where s.code = beta_code)
      into beta_exists;
    if not beta_exists then
      raise exception 'Beta invitation is invalid.' using errcode = '22023';
    end if;

    insert into public.users (
      id, email, name, trial_expires_at, subscription_status,
      tester_school_code, tester_access_until
    ) values (
      new.id, new.email, nullif(new.raw_user_meta_data ->> 'name', ''),
      clock_timestamp(), 'beta', beta_code,
      clock_timestamp() + make_interval(hours => beta_hours)
    );
  else
    insert into public.users (id, email, name, trial_expires_at, subscription_status)
    values (
      new.id,
      new.email,
      nullif(new.raw_user_meta_data ->> 'name', ''),
      null,
      'trialing'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.users alter column trial_expires_at drop not null;

-- The ordinary trial starts once, at the first confirmed authenticated request
-- (server.js requireAuth), so a delayed e-mail confirmation cannot consume it.
-- Only an untouched trialing row with no window yet is updated; creator, beta,
-- developer and paid rows and existing accounts keep their current values.
create or replace function public.start_ordinary_trial(p_user_id uuid)
returns timestamptz
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.users u
     set trial_expires_at = clock_timestamp() + interval '3 days'
   where u.id = p_user_id
     and u.trial_expires_at is null
     and u.subscription_status = 'trialing'
  returning u.trial_expires_at;
$$;
revoke all on function public.start_ordinary_trial(uuid) from public, anon, authenticated;
grant execute on function public.start_ordinary_trial(uuid) to service_role;

-- RLS uses one access function. Beta takes an exclusive CASE branch so a
-- signup trial, paid state or developer address cannot extend tester access.
create or replace function public.has_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and case
        when u.subscription_status = 'beta' then
          u.tester_access_until > now()
          and exists (
            select 1 from public.beta_program_settings s
            where s.singleton = true and s.ends_at > now()
          )
          and exists (
            select 1 from auth.users a
            where a.id = u.id and a.email_confirmed_at is not null
          )
        else
          u.trial_expires_at > now()
          or u.subscription_status = 'developer'
          or (
            u.subscription_status in ('active', 'season')
            and (u.access_expires_at is null or u.access_expires_at > now())
          )
          or (
            u.subscription_status = 'past_due'
            and u.access_expires_at is not null
            and u.access_expires_at > now()
          )
        end
  );
$$;

-- Feedback and renewal commit together. Locking the profile serializes reports;
-- the timestamp is taken after that lock, and the cutoff row is held stable.
create or replace function public.submit_beta_feedback(
  p_user_id uuid,
  p_type text,
  p_page_url text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_status text;
  school_code text;
  program_ends_at timestamptz;
  access_hours integer;
  accepted_at timestamptz;
  feedback_id bigint;
  renewed_until timestamptz;
  clean_message text;
begin
  select u.subscription_status, u.tester_school_code
    into profile_status, school_code
    from public.users u
    join auth.users a on a.id = u.id and a.email_confirmed_at is not null
    where u.id = p_user_id
    for update of u;
  if not found or profile_status <> 'beta' then
    raise exception 'A confirmed beta tester account is required.' using errcode = '42501';
  end if;

  select s.ends_at, s.access_hours
    into program_ends_at, access_hours
    from public.beta_program_settings s
    where s.singleton = true
    for share;
  if not found or program_ends_at is null or program_ends_at <= clock_timestamp() then
    raise exception 'The beta program has ended.' using errcode = '55000';
  end if;

  clean_message := btrim(coalesce(p_message, ''));
  if p_type is null
    or p_type not in ('bug', 'idea', 'comment')
    or char_length(clean_message) not between 10 and 4000
    or p_page_url is null
    or char_length(p_page_url) not between 1 and 512
    or left(p_page_url, 1) <> '/'
    or left(p_page_url, 2) = '//'
    or position('?' in p_page_url) > 0
    or position('#' in p_page_url) > 0
    or position('://' in p_page_url) > 0
    or p_page_url ~ '[[:cntrl:]]' then
    raise exception 'Feedback is invalid.' using errcode = '22023';
  end if;

  accepted_at := clock_timestamp();
  if accepted_at >= program_ends_at then
    raise exception 'The beta program has ended.' using errcode = '55000';
  end if;
  renewed_until := accepted_at + make_interval(hours => access_hours);

  insert into public.beta_feedback (user_id, school_code, type, page_url, message)
  values (p_user_id, school_code, p_type, p_page_url, clean_message)
  returning id into feedback_id;

  update public.users
    set tester_access_until = renewed_until
    where id = p_user_id and subscription_status = 'beta';
  if not found then
    raise exception 'Beta tester profile changed.' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'id', feedback_id,
    'testerAccessUntil', renewed_until,
    'serverNow', accepted_at
  );
end;
$$;

revoke all on function public.submit_beta_feedback(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_beta_feedback(uuid, text, text, text) to service_role;

alter table public.beta_schools enable row level security;
alter table public.beta_program_settings enable row level security;
alter table public.beta_feedback enable row level security;

-- END BETA TESTING MIGRATION BLOCK

-- ----------------------------------------------------------------------------
-- BETA ANALYTICS BLOCK (plan 019)
-- Apply the WHOLE canonical file. These tables intentionally have no browser
-- policies. The beta access model and its atomic renewal RPC above remain in use.
-- ----------------------------------------------------------------------------
create table if not exists public.beta_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  anon_id text not null check (char_length(anon_id) between 16 and 80),
  session_id text not null check (char_length(session_id) between 16 and 80),
  name text not null check (name in (
    'page_view','page_leave','session_start','ob_step','ob_answer','ob_drop','paywall_view',
    'q_start','q_answer','q_finish','q_abandon','search','search_zero','filter_used','sort_used',
    'school_open','school_section','school_web_click','compare_add','compare_open',
    'matrix_weight','prihlaska_pick','share_create','theme_change','favorite_toggle','review_write',
    'result_view','js_error','api_error','rage_click'
  )),
  path text not null check (left(path, 1) = '/' and left(path, 2) <> '//'
    and char_length(path) <= 512 and path !~ '[?#[:cntrl:]]'),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 2048),
  created_at timestamptz not null default now()
);
create index if not exists beta_events_user_created_idx on public.beta_events(user_id, created_at);
create index if not exists beta_events_name_created_idx on public.beta_events(name, created_at);
create index if not exists beta_events_anon_idx on public.beta_events(anon_id) where user_id is null;

alter table public.beta_feedback
  add column if not exists kind text,
  add column if not exists selector text,
  add column if not exists element_text text,
  add column if not exists rect jsonb,
  add column if not exists viewport jsonb,
  add column if not exists screenshot_path text,
  add column if not exists text_before text,
  add column if not exists text_after text,
  add column if not exists status text not null default 'nove',
  add column if not exists admin_note text,
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists reply_read_at timestamptz,
  add column if not exists source text not null default 'button';
update public.beta_feedback set kind = case type when 'bug' then 'bug' when 'idea' then 'navrh' else 'obecne' end where kind is null;
alter table public.beta_feedback alter column kind set default 'obecne';
alter table public.beta_feedback alter column kind set not null;
alter table public.beta_feedback drop constraint if exists beta_feedback_kind_check;
alter table public.beta_feedback add constraint beta_feedback_kind_check check (kind in ('bug','navrh','funkce','text','neprehledne','chvala','dotaz','obecne'));
alter table public.beta_feedback drop constraint if exists beta_feedback_status_check;
alter table public.beta_feedback add constraint beta_feedback_status_check check (status in ('nove','precteno','vyreseno','neudelame'));
alter table public.beta_feedback drop constraint if exists beta_feedback_source_check;
alter table public.beta_feedback add constraint beta_feedback_source_check check (source in ('button','micro','gate'));

create table if not exists public.beta_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('8','9','rodic','ucitel','jine')),
  consent_tracking_at timestamptz,
  checklist jsonb not null default '{}'::jsonb,
  micro_asked jsonb not null default '{}'::jsonb,
  closing_due_at timestamptz,
  closing_done_at timestamptz
);
-- Free text a tester types after choosing "Jiné"; display-only, never decides access.
alter table public.beta_profile add column if not exists role_note text
  check (role_note is null or char_length(role_note) <= 80);
-- Set when the tester switches usage recording off in Nastavení (consent withdrawn).
alter table public.beta_profile add column if not exists tracking_paused_at timestamptz;
create table if not exists public.beta_closing_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 24000),
  created_at timestamptz not null default now()
);
create table if not exists public.beta_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 4000),
  consent_publish boolean not null default false,
  consent_text_version text,
  consent_at timestamptz,
  display_label text not null,
  age_group text not null check (age_group in ('under15','15plus','adult','unknown')),
  selected_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id)
);
alter table public.beta_reviews add column if not exists consent_text_version text;
alter table public.beta_reviews add column if not exists consent_at timestamptz;
-- The former checkbox did not describe the channels, shortening, or withdrawal
-- terms in version 2026-10-08. Require fresh consent before any old review can
-- be selected for publication under the expanded permission.
update public.beta_reviews
set consent_publish=false, consent_text_version=null, consent_at=null, selected_by_admin=false
where consent_publish and consent_text_version is distinct from '2026-10-08';
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  run_id bigint,
  source text not null check (source in ('questionnaire','proscons','extract','explain')),
  model text not null,
  prompt_tokens integer check (prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens >= 0),
  cost_usd numeric check (cost_usd >= 0),
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_log_created_idx on public.ai_usage_log(created_at);
alter table public.ai_usage_log drop constraint if exists ai_usage_log_source_check;
alter table public.ai_usage_log add constraint ai_usage_log_source_check
  check (source in ('questionnaire','proscons','extract','explain'));

alter table public.beta_events enable row level security;
alter table public.beta_profile enable row level security;
alter table public.beta_closing_answers enable row level security;
alter table public.beta_reviews enable row level security;
alter table public.ai_usage_log enable row level security;

-- Existing testers complete the new notice in-app. New signups must acknowledge
-- it and select a role; neither field grants or changes access.
insert into public.beta_profile(user_id, role)
select id, 'jine' from public.users where subscription_status = 'beta'
on conflict do nothing;
create or replace function public.capture_beta_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare metadata jsonb;
begin
  if new.subscription_status = 'beta' then
    select raw_user_meta_data into metadata from auth.users where id = new.id;
    if coalesce(metadata ->> 'beta_role', '') not in ('8','9','rodic','ucitel','jine')
      or metadata -> 'beta_notice_accepted' is distinct from 'true'::jsonb then
      raise exception 'Beta role and notice acknowledgement are required.' using errcode = '22023';
    end if;
    insert into public.beta_profile(user_id, role, role_note, consent_tracking_at)
    values (new.id, metadata ->> 'beta_role',
      case when metadata ->> 'beta_role' = 'jine'
        then nullif(left(btrim(coalesce(metadata ->> 'beta_role_note', '')), 80), '') end,
      clock_timestamp()) on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_beta_profile_created on public.users;
create trigger on_beta_profile_created after insert on public.users
for each row execute function public.capture_beta_profile();

-- Extra metadata is part of the same transaction as the existing insert/renewal.
-- The service-only caller validates all fields; SQL validates the core fields too.
create or replace function public.submit_beta_feedback_details(
  p_user_id uuid, p_type text, p_page_url text, p_message text, p_details jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if p_details is null or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 12000
    or coalesce(p_details ->> 'kind', 'obecne') not in ('bug','navrh','funkce','text','neprehledne','chvala','dotaz','obecne')
    or coalesce(p_details ->> 'source', 'button') not in ('button','micro','gate')
    or (p_details ->> 'source' = 'gate' and char_length(btrim(p_message)) < 20) then
    raise exception 'Feedback metadata is invalid.' using errcode = '22023';
  end if;
  result := public.submit_beta_feedback(p_user_id, p_type, p_page_url, p_message);
  update public.beta_feedback set
    kind = coalesce(p_details ->> 'kind', 'obecne'),
    source = coalesce(p_details ->> 'source', 'button'),
    selector = left(p_details ->> 'selector', 512),
    element_text = left(p_details ->> 'element_text', 120),
    rect = p_details -> 'rect', viewport = p_details -> 'viewport',
    screenshot_path = p_details ->> 'screenshot_path',
    text_before = left(p_details ->> 'text_before', 2000),
    text_after = left(p_details ->> 'text_after', 2000)
  where id = (result ->> 'id')::bigint;
  return result;
end;
$$;
revoke all on function public.submit_beta_feedback_details(uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_beta_feedback_details(uuid,text,text,text,jsonb) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('beta-screenshots', 'beta-screenshots', false, 1572864, array['image/png','image/jpeg'])
on conflict(id) do update set public = false, file_size_limit = 1572864, allowed_mime_types = array['image/png','image/jpeg'];
-- No storage.objects browser policy: server-issued signed upload/read URLs only.

-- plpgsql: beta_rankings is created further down, and a sql body is checked at creation.
create or replace function public.purge_beta_events()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.beta_program_settings where singleton
    and ends_at + interval '6 months' <= now()) then
    delete from public.beta_events;
    delete from public.beta_rankings;
  end if;
end;
$$;
revoke all on function public.purge_beta_events() from public, anon, authenticated;
grant execute on function public.purge_beta_events() to service_role;
create or replace function public.record_beta_events(
  p_user_id uuid, p_anon_id text, p_session_id text, p_events jsonb, p_join boolean
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
-- v_ prefix: a bare `checklist` collides with beta_profile.checklist, and
-- qualifying it with the function name is invalid here (42P01 on every
-- signed-in batch, which is why no checklist box ever ticked before 2026-10-08).
declare v_checklist jsonb; v_event jsonb; v_key text; v_events jsonb := p_events;
begin
  if p_user_id is not null then
    perform 1 from public.users where id = p_user_id and subscription_status = 'beta' for update;
    if not found then raise exception 'Beta account required.' using errcode = '42501'; end if;
    select p.checklist into v_checklist from public.beta_profile p where p.user_id = p_user_id and p.consent_tracking_at is not null and p.tracking_paused_at is null for update;
    if not found then raise exception 'Beta profile missing.' using errcode = '42501'; end if;
    v_checklist := coalesce(v_checklist, '{}'::jsonb);
    if p_join then
      select v_events || coalesce(jsonb_agg(jsonb_build_object('name',e.name,'props',e.props)), '[]'::jsonb)
        into v_events from public.beta_events e where e.anon_id = p_anon_id and e.user_id is null;
      update public.beta_events set user_id = p_user_id where anon_id = p_anon_id and user_id is null;
    end if;
  end if;
  insert into public.beta_events(user_id,anon_id,session_id,name,path,props)
  select p_user_id,p_anon_id,p_session_id,value->>'name',value->>'path',value->'props' from jsonb_array_elements(p_events);
  if p_user_id is null then return; end if;
  for v_event in select value from jsonb_array_elements(v_events) loop
    v_key := case v_event->>'name'
      when 'q_finish' then 'dotaznik' when 'result_view' then 'dotaznik'
      when 'search' then case when coalesce((v_event->'props'->>'length')::numeric,0)>0 then 'vyhledavani' else null end when 'compare_open' then case when coalesce((v_event->'props'->>'count')::numeric,0)>=2 then 'porovnani' else null end
      when 'matrix_weight' then 'matice' when 'prihlaska_pick' then 'prihlaska'
      when 'theme_change' then 'tema' when 'share_create' then 'sdileni' else null end;
    if v_key is not null then v_checklist := jsonb_set(v_checklist, array[v_key], 'true'::jsonb); end if;
    if v_event->>'name' = 'school_open' and v_event->'props'->'id' is not null then
      v_checklist := jsonb_set(v_checklist, '{school_ids}', (select jsonb_agg(distinct value) from jsonb_array_elements(
        coalesce(v_checklist->'school_ids','[]'::jsonb) || jsonb_build_array(v_event->'props'->'id'))));
      v_checklist := jsonb_set(v_checklist, '{detail}', to_jsonb(jsonb_array_length(v_checklist->'school_ids') >= 3));
    end if;
    if v_event->>'name' = 'paywall_view' then
      v_checklist := jsonb_set(v_checklist, '{paywall_screens}', (select jsonb_agg(distinct value) from jsonb_array_elements(
        coalesce(v_checklist->'paywall_screens','[]'::jsonb) || jsonb_build_array(v_event->'props'->'screen'))));
      v_checklist := jsonb_set(v_checklist, '{platby}', to_jsonb(v_checklist->'paywall_screens' @> '["hodnota","cesta","plan","zkusebni","platba"]'::jsonb));
    end if;
  end loop;
  if v_checklist @> '{"dotaznik":true,"detail":true}'::jsonb and
    (v_checklist @> '{"porovnani":true}'::jsonb or v_checklist @> '{"matice":true}'::jsonb) and not v_checklist ? 'core_completed_at' then
    v_checklist := jsonb_set(v_checklist,'{core_completed_at}',to_jsonb(clock_timestamp()));
  end if;
  update public.beta_profile set checklist = v_checklist where user_id = p_user_id;
end;
$$;
revoke all on function public.record_beta_events(uuid,text,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.record_beta_events(uuid,text,text,jsonb,boolean) to service_role;
-- Quick feedback after a tester tries a feature: a 1–5 rating plus one short
-- answer, about ten seconds. It is stored as feedback (source 'micro') but on
-- purpose does NOT renew access — only a real written report does. One answer
-- or skip per feature; p_session is kept only for the signature/grants.
create or replace function public.submit_beta_micro(
  p_user_id uuid, p_id text, p_session text, p_action text, p_answer text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare state jsonb; checks jsonb; v_school text;
begin
  select u.tester_school_code into v_school from public.users u join auth.users a on a.id=u.id
    where u.id=p_user_id and u.subscription_status='beta' and a.email_confirmed_at is not null for update of u;
  if not found then raise exception 'Beta required.' using errcode='42501'; end if;
  if not exists(select 1 from public.beta_program_settings where singleton and ends_at>clock_timestamp()) then
    raise exception 'Program ended.' using errcode='55000'; end if;
  select micro_asked, checklist into state, checks from public.beta_profile where user_id=p_user_id for update;
  if not found or p_id not in ('dotaznik','vyhledavani','detail','porovnani','matice','prihlaska','tema','platby')
    or p_action not in ('answer','skip') then
    raise exception 'Micro invalid.' using errcode='22023'; end if;
  state := coalesce(state,'{}'::jsonb);
  if state->p_id->>'done'='true' then raise exception 'Already answered.' using errcode='23505'; end if;
  if not coalesce((checks->>p_id)::boolean,false) then raise exception 'Feature not tried.' using errcode='22023'; end if;
  if p_action='answer' then
    if char_length(btrim(coalesce(p_answer,''))) not between 1 and 1500 then
      raise exception 'Answer required.' using errcode='22023'; end if;
    insert into public.beta_feedback(user_id, school_code, type, page_url, message, kind, source)
    values (p_user_id, v_school, 'comment', '/beta/rychle/'||p_id, 'Rychlé hodnocení · '||p_id||' · '||btrim(p_answer), 'obecne', 'micro');
  end if;
  state := jsonb_set(state,array[p_id],jsonb_build_object('done',true,'skipped',p_action='skip','at',clock_timestamp()));
  update public.beta_profile set micro_asked=state where user_id=p_user_id;
  return jsonb_build_object('micro_asked',state);
end;
$$;
revoke all on function public.submit_beta_micro(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_beta_micro(uuid,text,text,text,text) to service_role;
-- Earliest eligible instant, rather than the time a browser happens to poll.
-- Repair only the persisted deadline produced by the unconfigured-end bug.
update public.beta_profile p set closing_due_at=null from public.users u
where p.user_id=u.id and p.closing_done_at is null and p.closing_due_at=u.created_at
  and exists(select 1 from public.beta_program_settings where singleton and ends_at is null);
create or replace function public.beta_closing_deadline(uid uuid)
returns timestamptz language sql stable security definer set search_path=public,pg_temp as $$
  select case when s.ends_at is null or s.ends_at<=now() or p.closing_done_at is not null then null else coalesce(p.closing_due_at,
    least(greatest(u.created_at,s.ends_at-interval '2 days'),
      case when p.checklist @> '{"dotaznik":true,"detail":true}'::jsonb and
        (p.checklist @> '{"porovnani":true}'::jsonb or p.checklist @> '{"matice":true}'::jsonb)
      then greatest(u.created_at+interval '2 days',coalesce((p.checklist->>'core_completed_at')::timestamptz,now())) else null end)) end
  from public.users u join public.beta_profile p on p.user_id=u.id
  cross join public.beta_program_settings s where u.id=uid and u.subscription_status='beta' and s.singleton;
$$;
revoke all on function public.beta_closing_deadline(uuid) from public,anon,authenticated;
grant execute on function public.beta_closing_deadline(uuid) to service_role;
create or replace function public.sync_beta_closing(p_user_id uuid)
returns void language sql security definer set search_path=public,pg_temp as $$
  update public.beta_profile set closing_due_at=public.beta_closing_deadline(p_user_id)
  where user_id=p_user_id and closing_done_at is null and closing_due_at is null
    and public.beta_closing_deadline(p_user_id)<=now();
$$;
revoke all on function public.sync_beta_closing(uuid) from public,anon,authenticated;
grant execute on function public.sync_beta_closing(uuid) to service_role;
create or replace function public.submit_beta_closing(p_user_id uuid,p_answers jsonb,p_review jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.users u join auth.users a on a.id=u.id where u.id=p_user_id
    and u.subscription_status='beta' and a.email_confirmed_at is not null for update of u;
  if not found then raise exception 'Beta required.' using errcode='42501'; end if;
  if not exists(select 1 from public.beta_program_settings where singleton and ends_at>clock_timestamp()) then
    raise exception 'Program ended.' using errcode='55000'; end if;
  perform 1 from public.beta_profile where user_id=p_user_id and closing_done_at is null for update;
  if not found then raise exception 'Already completed.' using errcode='23505'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>24000 then
    raise exception 'Answers invalid.' using errcode='22023'; end if;
  insert into public.beta_closing_answers(user_id,answers) values(p_user_id,p_answers);
  if p_review is not null then
    if (p_review->>'consent_publish')::boolean and p_review->>'consent_text_version' is distinct from '2026-10-08' then
      raise exception 'Review consent version invalid.' using errcode='22023';
    end if;
    insert into public.beta_reviews(user_id,stars,body,consent_publish,consent_text_version,consent_at,display_label,age_group)
    values(p_user_id,(p_review->>'stars')::integer,p_review->>'body',(p_review->>'consent_publish')::boolean,
      case when (p_review->>'consent_publish')::boolean then p_review->>'consent_text_version' else null end,
      case when (p_review->>'consent_publish')::boolean then clock_timestamp() else null end,
      p_review->>'display_label',p_review->>'age_group')
    on conflict(user_id) do update set stars=excluded.stars,body=excluded.body,consent_publish=excluded.consent_publish,
      consent_text_version=excluded.consent_text_version,consent_at=excluded.consent_at,
      display_label=excluded.display_label,age_group=excluded.age_group,selected_by_admin=false,created_at=clock_timestamp();
  end if;
  update public.beta_profile set closing_done_at=clock_timestamp() where user_id=p_user_id;
end;
$$;
revoke all on function public.submit_beta_closing(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_beta_closing(uuid,jsonb,jsonb) to service_role;
create or replace function public.submit_beta_review(p_user_id uuid,p_review jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.users u join auth.users a on a.id=u.id where u.id=p_user_id
    and u.subscription_status='beta' and a.email_confirmed_at is not null for update of u;
  if not found then raise exception 'Beta required.' using errcode='42501'; end if;
  if not exists(select 1 from public.beta_program_settings where singleton and ends_at>clock_timestamp()) then
    raise exception 'Program ended.' using errcode='55000'; end if;
  perform 1 from public.beta_profile where user_id=p_user_id and consent_tracking_at is not null for update;
  if not found then raise exception 'Beta notice required.' using errcode='42501'; end if;
  if jsonb_typeof(p_review) is distinct from 'object'
    or (p_review->>'consent_publish')::boolean and p_review->>'consent_text_version' is distinct from '2026-10-08' then
    raise exception 'Review invalid.' using errcode='22023';
  end if;
  insert into public.beta_reviews(user_id,stars,body,consent_publish,consent_text_version,consent_at,display_label,age_group)
  values(p_user_id,(p_review->>'stars')::integer,p_review->>'body',(p_review->>'consent_publish')::boolean,
    case when (p_review->>'consent_publish')::boolean then p_review->>'consent_text_version' else null end,
    case when (p_review->>'consent_publish')::boolean then clock_timestamp() else null end,
    p_review->>'display_label',p_review->>'age_group')
  on conflict(user_id) do update set stars=excluded.stars,body=excluded.body,consent_publish=excluded.consent_publish,
    consent_text_version=excluded.consent_text_version,consent_at=excluded.consent_at,
    display_label=excluded.display_label,age_group=excluded.age_group,selected_by_admin=false,created_at=clock_timestamp();
end;
$$;
revoke all on function public.submit_beta_review(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_beta_review(uuid,jsonb) to service_role;
create or replace function public.has_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and case
        when u.subscription_status = 'beta' then
          u.tester_access_until > now()
          and coalesce(public.beta_closing_deadline(uid)+interval '24 hours'>now(),true)
          and exists (
            select 1 from public.beta_program_settings s
            where s.singleton = true and s.ends_at > now()
          )
          and exists (
            select 1 from auth.users a
            where a.id = u.id and a.email_confirmed_at is not null
          )
        else
          u.trial_expires_at > now()
          or u.subscription_status = 'developer'
          or (
            u.subscription_status in ('active', 'season')
            and (u.access_expires_at is null or u.access_expires_at > now())
          )
          or (
            u.subscription_status = 'past_due'
            and u.access_expires_at is not null
            and u.access_expires_at > now()
          )
        end
  );
$$;
create or replace function public.beta_screenshot_orphans(p_limit integer default 100)
returns table(name text) language sql security definer set search_path=public,pg_temp as $$
  select o.name from storage.objects o where o.bucket_id='beta-screenshots'
    and o.created_at<now()-interval '24 hours'
    and not exists(select 1 from public.beta_feedback f where f.screenshot_path=o.name)
  order by o.created_at,o.name limit least(greatest(p_limit,1),100);
$$;
revoke all on function public.beta_screenshot_orphans(integer) from public,anon,authenticated;
grant execute on function public.beta_screenshot_orphans(integer) to service_role;
-- Full orders are separate from the 2 KB event payload, without any answers.
create table if not exists public.beta_rankings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check(source in ('onboarding','questionnaire')),
  run_id bigint references public.questionnaire_runs(id) on delete set null,
  capture_id uuid not null,
  ranking integer[] not null check(cardinality(ranking) between 1 and 1000 and 0<all(ranking)),
  created_at timestamptz not null default now(),
  unique(user_id,capture_id), unique(user_id,source,run_id)
);
alter table public.beta_rankings enable row level security;
create index if not exists beta_rankings_source_created_idx on public.beta_rankings(source,created_at);
-- No browser policy. Server validates tester/notice and all ordered IDs.
-- Withdrawal guard (C43): once tracking_paused_at is set, no usage row for that
-- account can be written, even by a request that passed the server's check just
-- before the switch. The share lock waits for an in-flight switch update, so a
-- row either lands before it (and the switch's delete removes it) or is dropped.
create or replace function public.beta_drop_paused_usage() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.user_id is null then return new; end if;
  perform 1 from public.beta_profile p
    where p.user_id = new.user_id and p.consent_tracking_at is not null and p.tracking_paused_at is null
    for share;
  if not found then return null; end if;
  return new;
end;
$$;
revoke all on function public.beta_drop_paused_usage() from public, anon, authenticated;
drop trigger if exists beta_events_paused_guard on public.beta_events;
create trigger beta_events_paused_guard before insert or update of user_id on public.beta_events
  for each row execute function public.beta_drop_paused_usage();
drop trigger if exists beta_rankings_paused_guard on public.beta_rankings;
create trigger beta_rankings_paused_guard before insert or update on public.beta_rankings
  for each row execute function public.beta_drop_paused_usage();
-- Anonymous archive of beta contributions (founder decision 2026-10-10). On account
-- deletion, unless the user ticks "delete my feedback and reviews too", the server
-- copies feedback, closing answers and the website review here without the account
-- id, school code, screenshots, coordinates or admin notes; the originals then go
-- with the account cascade. Free text may still mention the writer: treat the
-- archive as minimised, not as guaranteed anonymous. No client policy.
create table if not exists public.beta_contributions_archive (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('feedback','closing','review')),
  content jsonb not null,
  created_on date,
  archived_at timestamptz not null default now()
);
alter table public.beta_contributions_archive enable row level security;
-- Returns the ids it created so a failed account deletion can take its own copy
-- back out (remove_beta_archive_rows) instead of leaving a duplicate for the retry.
drop function if exists public.archive_beta_contributions(uuid);
create function public.archive_beta_contributions(p_user_id uuid)
returns bigint[] language plpgsql security definer set search_path = public, pg_temp as $$
declare v_ids bigint[] := '{}'; v_new bigint[];
begin
  with ins as (
    insert into public.beta_contributions_archive(kind, content, created_on)
    select 'feedback', jsonb_strip_nulls(jsonb_build_object('type', f.type, 'kind', f.kind, 'page_url', f.page_url,
      'message', f.message, 'selector', f.selector, 'element_text', f.element_text,
      'text_before', f.text_before, 'text_after', f.text_after, 'status', f.status)), f.created_at::date
    from public.beta_feedback f where f.user_id = p_user_id
    returning id
  ) select coalesce(array_agg(id), '{}') into v_new from ins;
  v_ids := v_ids || v_new;
  with ins as (
    insert into public.beta_contributions_archive(kind, content, created_on)
    select 'closing', c.answers, c.created_at::date from public.beta_closing_answers c where c.user_id = p_user_id
    returning id
  ) select coalesce(array_agg(id), '{}') into v_new from ins;
  v_ids := v_ids || v_new;
  with ins as (
    insert into public.beta_contributions_archive(kind, content, created_on)
    select 'review', jsonb_strip_nulls(jsonb_build_object('stars', r.stars, 'body', r.body, 'consent_publish', r.consent_publish,
      'consent_text_version', r.consent_text_version, 'consent_at', r.consent_at, 'age_group', r.age_group,
      'selected_by_admin', r.selected_by_admin)), r.created_at::date
    from public.beta_reviews r where r.user_id = p_user_id
    returning id
  ) select coalesce(array_agg(id), '{}') into v_new from ins;
  return v_ids || v_new;
end;
$$;
revoke all on function public.archive_beta_contributions(uuid) from public, anon, authenticated;
grant execute on function public.archive_beta_contributions(uuid) to service_role;
create or replace function public.remove_beta_archive_rows(p_ids bigint[])
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rows integer;
begin
  delete from public.beta_contributions_archive where id = any(coalesce(p_ids, '{}'));
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke all on function public.remove_beta_archive_rows(bigint[]) from public, anon, authenticated;
grant execute on function public.remove_beta_archive_rows(bigint[]) to service_role;
-- END BETA ANALYTICS BLOCK


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
alter table public.application_picks enable row level security;
alter table public.school_notes enable row level security;
alter table public.decision_profile enable row level security;
alter table public.shortlist_shares enable row level security;
alter table public.school_ai_summary enable row level security;

-- --- users -------------------------------------------------------------------
-- Read your own profile. Nothing else: there is deliberately no INSERT policy
-- (the trigger creates the row) and no UPDATE policy (only Stripe webhooks,
-- running as service_role, may change subscription_status).

drop policy if exists "read own profile" on public.users;
create policy "read own profile"
  on public.users for select
  using (auth.uid() = id);

-- Beta invitation metadata/configuration and submitted feedback are visible
-- only to the server's service-role API, just like reviews and reports below.
-- In particular, school attribution cannot be changed from a browser client.

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
-- A school that legally merged into another (or was re-registered under a new
-- REDIZO) points at its successor. server.js hides it from every list and
-- scorer, redirects its old detail URL, and adds its school_programs to the
-- successor's history. Null = an ordinary, independent school.
alter table public.schools add column if not exists merged_into integer references public.schools(id);

-- --- 9th-grade scope (plan 021, 2026-10-10) -----------------------------------
-- A programme is shown only if a pupil finishing 9th grade can apply to it.
-- Programmes that fail ninth_grade_program() live in school_programs_hidden
-- (kept for later, never served); a school with none left gets
-- schools.hidden_reason. The one-off data move is in
-- migrations/2026-10-10-ninth-grade-scope.sql; scripts/import-admission-data.js
-- does the same split on every import. RLS on, no policy: server/scripts only.

alter table public.schools add column if not exists hidden_reason text;

create table if not exists public.school_programs_hidden (
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
  zamereni text,
  kapacita int,
  prihlasky int,
  prijati int,
  cutoff numeric,
  hidden_reason text not null default 'not_for_9th_grade',
  hidden_at timestamptz not null default now()
);
create index if not exists school_programs_hidden_school_id_idx
  on public.school_programs_hidden (school_id);
alter table public.school_programs_hidden enable row level security;

-- Must stay identical to lib/ninthGrade.js (a test enforces it).
create or replace function public.ninth_grade_program(p_typ text, p_delka int)
returns boolean
language sql
immutable
as $$
  select not (
    coalesce(p_typ, '') in ('Gymnázia 6letá', 'Gymnázia 8letá', 'Nástavby')
    or (p_typ = 'Konzervatoře' and p_delka = 8)
  )
$$;

-- Hide schools with no visible programme (but hidden ones); un-hide the ones
-- that have a visible programme again. Null ids = all schools.
create or replace function public.refresh_school_visibility(p_school_ids bigint[] default null)
returns void
language sql
as $$
  update public.schools s
     set hidden_reason = 'not_for_9th_grade'
   where s.merged_into is null
     and s.hidden_reason is null
     and (p_school_ids is null or s.id = any (p_school_ids))
     and not exists (select 1 from public.school_programs p where p.school_id = s.id)
     and exists (select 1 from public.school_programs_hidden h where h.school_id = s.id);

  update public.schools s
     set hidden_reason = null
   where s.hidden_reason = 'not_for_9th_grade'
     and (p_school_ids is null or s.id = any (p_school_ids))
     and exists (select 1 from public.school_programs p where p.school_id = s.id);
$$;

-- School-level cutoff / acceptance rate from VISIBLE programmes only, newest
-- year per school; same arithmetic as scripts/import-admission-data.js.
create or replace function public.recompute_school_admission(p_school_ids bigint[] default null)
returns void
language sql
as $$
  with newest as (
    select school_id, max(rok) as rok
      from public.school_programs
     where p_school_ids is null or school_id = any (p_school_ids)
     group by school_id
  ), agg as (
    select p.school_id,
           round(avg(p.cutoff) filter (where p.cutoff is not null), 1) as cutoff,
           case when coalesce(sum(p.prihlasky) filter (where p.prihlasky > 0 and p.prijati is not null), 0) > 0
                then round(100.0 * sum(p.prijati) filter (where p.prihlasky > 0 and p.prijati is not null)
                                 / sum(p.prihlasky) filter (where p.prihlasky > 0 and p.prijati is not null), 1)
           end as rate
      from public.school_programs p
      join newest n on n.school_id = p.school_id and n.rok = p.rok
     group by p.school_id
  )
  update public.schools s
     set admission_cutoff = agg.cutoff,
         acceptance_rate = agg.rate
    from agg
   where s.id = agg.school_id;
$$;

revoke all on function public.refresh_school_visibility(bigint[]) from public, anon, authenticated;
revoke all on function public.recompute_school_admission(bigint[]) from public, anon, authenticated;
grant execute on function public.refresh_school_visibility(bigint[]) to service_role;
grant execute on function public.recompute_school_admission(bigint[]) to service_role;

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

-- --- application_picks / school_notes / decision_profile ----------------------
-- Read and delete your own rows. NO client INSERT or UPDATE policy —
-- server.js (service_role) is the only writer, same reasoning as
-- questionnaire_runs: a browser that could write here could point a row at a
-- user_id it does not own. DELETE stays open so an expired account can still
-- erase its own data.

drop policy if exists "read own picks" on public.application_picks;
create policy "read own picks"
  on public.application_picks for select
  using (auth.uid() = user_id);

drop policy if exists "delete own picks" on public.application_picks;
create policy "delete own picks"
  on public.application_picks for delete
  using (auth.uid() = user_id);

drop policy if exists "read own notes" on public.school_notes;
create policy "read own notes"
  on public.school_notes for select
  using (auth.uid() = user_id);

drop policy if exists "delete own notes" on public.school_notes;
create policy "delete own notes"
  on public.school_notes for delete
  using (auth.uid() = user_id);

drop policy if exists "read own decision profile" on public.decision_profile;
create policy "read own decision profile"
  on public.decision_profile for select
  using (auth.uid() = user_id);

drop policy if exists "delete own decision profile" on public.decision_profile;
create policy "delete own decision profile"
  on public.decision_profile for delete
  using (auth.uid() = user_id);

-- --- shortlist_shares ----------------------------------------------------------
-- Read and revoke (delete) your own share links. The PUBLIC read of a shared
-- link (GET /api/shared/:token) goes through server.js with service_role — it
-- is deliberately NOT a client-readable policy, because the reader of a share
-- link is not signed in as the link's owner at all.

drop policy if exists "read own shares" on public.shortlist_shares;
create policy "read own shares"
  on public.shortlist_shares for select
  using (auth.uid() = user_id);

drop policy if exists "revoke own shares" on public.shortlist_shares;
create policy "revoke own shares"
  on public.shortlist_shares for delete
  using (auth.uid() = user_id);

-- --- school_ai_summary -----------------------------------------------------------
-- RLS on, no policy at all — same as `schools` and `school_programs`. It is
-- school data, cached AI text, and reaches the browser only through
-- server.js's `.select('*, school_programs(*), school_ai_summary(*)')`.


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
  null,
  'trialing'
from auth.users a
where not exists (select 1 from public.users u where u.id = a.id);

-- Anonymous device-class visit counter: one row per day and device class, no visitor identifiers.
create table if not exists public.visit_counts (
  day date not null,
  device text not null check (device in ('desktop','mobile','tablet')),
  visits integer not null default 0,
  primary key (day, device)
);
alter table public.visit_counts enable row level security;
create or replace function public.bump_visit(p_device text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.visit_counts (day, device, visits)
  values ((now() at time zone 'Europe/Prague')::date, p_device, 1)
  on conflict (day, device) do update set visits = public.visit_counts.visits + 1;
$$;
revoke all on function public.bump_visit(text) from public, anon, authenticated;
grant execute on function public.bump_visit(text) to service_role;


-- Plan 022: paid purchase ledger and replay-safe Stripe events
alter table public.users
  add column if not exists stripe_last_event_created bigint not null default 0;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null check (plan in ('season', 'monthly')),
  checkout_context text not null default 'self' check (checkout_context in ('self', 'parent')),
  price_amount_minor integer not null check (price_amount_minor > 0),
  currency text not null check (currency = 'czk'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed')),
  stripe_checkout_session_id text,
  stripe_setup_intent_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  access_starts_at timestamptz,
  access_ends_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  last_stripe_event_created bigint not null default 0
);

create unique index if not exists purchases_one_pending_per_user_plan
  on public.purchases (user_id, plan)
  where status = 'pending';
create unique index if not exists purchases_stripe_checkout_session_unique
  on public.purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists purchases_stripe_setup_intent_unique
  on public.purchases (stripe_setup_intent_id)
  where stripe_setup_intent_id is not null;
create unique index if not exists purchases_stripe_payment_intent_unique
  on public.purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists purchases_stripe_subscription_unique
  on public.purchases (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists purchases_user_created_idx
  on public.purchases (user_id, created_at desc);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  outcome text not null default 'processing'
    check (outcome in ('processing', 'applied', 'duplicate', 'stale', 'unmatched', 'ignored')),
  processed_at timestamptz
);

alter table public.purchases enable row level security;
alter table public.stripe_webhook_events enable row level security;
revoke all on table public.purchases, public.stripe_webhook_events from public, anon, authenticated;
grant all on table public.purchases, public.stripe_webhook_events to service_role;

create or replace function public.apply_stripe_purchase_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_purchase_id uuid,
  p_purchase_status text,
  p_checkout_session_id text,
  p_setup_intent_id text,
  p_payment_intent_id text,
  p_subscription_id text,
  p_access_starts_at timestamptz,
  p_access_ends_at timestamptz,
  p_profile_patch jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_user public.users%rowtype;
  v_inserted_event text;
  v_status_allowed boolean := true;
  v_profile_eligible boolean := true;
  v_status text;
  v_updated_user uuid;
begin
  if p_event_id is null or length(p_event_id) = 0
     or p_event_type is null or length(p_event_type) = 0
     or p_event_created is null or p_event_created < 0 then
    raise exception 'Invalid Stripe event identity';
  end if;
  if coalesce(jsonb_typeof(p_profile_patch), 'object') <> 'object' then
    raise exception 'Stripe profile patch must be a JSON object';
  end if;
  if exists (
    select 1
      from jsonb_object_keys(coalesce(p_profile_patch, '{}'::jsonb)) as k(key)
     where key not in (
       'subscription_status', 'trial_expires_at', 'stripe_customer_id',
       'stripe_payment_method_id', 'stripe_setup_intent_id',
       'stripe_subscription_id', 'plan_id', 'season_charge_due_at',
       'plan_started_at', 'last_paid_at', 'access_expires_at',
       'cancel_at_period_end'
     )
  ) then
    raise exception 'Stripe profile patch contains a protected field';
  end if;
  if p_purchase_status is not null and p_purchase_status not in
     ('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed') then
    raise exception 'Invalid purchase status';
  end if;

  insert into public.stripe_webhook_events(event_id, event_type, event_created)
  values (p_event_id, p_event_type, p_event_created)
  on conflict (event_id) do nothing
  returning event_id into v_inserted_event;

  if v_inserted_event is null then
    return 'duplicate';
  end if;

  if p_purchase_id is not null and p_user_id is null then
    select user_id into p_user_id from public.purchases where id = p_purchase_id;
  end if;

  if p_user_id is not null then
    select * into v_user
      from public.users
     where id = p_user_id
     for update;
    if not found or v_user.subscription_status = 'beta' then
      update public.stripe_webhook_events
         set outcome = 'ignored', processed_at = now()
       where event_id = p_event_id;
      return 'ignored';
    end if;
    if p_event_created < v_user.stripe_last_event_created then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  if p_purchase_id is not null then
    select * into v_purchase
      from public.purchases
     where id = p_purchase_id
     for update;

    if not found or (p_user_id is not null and v_purchase.user_id <> p_user_id) then
      update public.stripe_webhook_events
         set outcome = 'unmatched', processed_at = now()
       where event_id = p_event_id;
      return 'unmatched';
    end if;

    if p_event_created < v_purchase.last_stripe_event_created
       or (p_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id <> p_checkout_session_id) then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;

    if p_purchase_status is not null then
      v_status_allowed := case v_purchase.status
        when 'pending' then p_purchase_status in ('pending', 'active', 'canceled', 'failed')
        when 'active' then p_purchase_status in ('active', 'canceled', 'withdrawn', 'refunded')
        when 'canceled' then p_purchase_status in ('canceled', 'withdrawn', 'refunded')
        when 'withdrawn' then p_purchase_status in ('withdrawn', 'refunded')
        when 'failed' then p_purchase_status in ('failed', 'refunded')
        when 'refunded' then p_purchase_status = 'refunded'
        else false
      end;
      if not v_status_allowed then
        update public.stripe_webhook_events
           set outcome = 'stale', processed_at = now()
         where event_id = p_event_id;
        return 'stale';
      end if;
    end if;

    v_status := case when p_purchase_status is not null and v_status_allowed
      then p_purchase_status else v_purchase.status end;

    update public.purchases
       set status = v_status,
           stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
           stripe_setup_intent_id = coalesce(p_setup_intent_id, stripe_setup_intent_id),
           stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
           stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
           access_starts_at = coalesce(p_access_starts_at, access_starts_at),
           access_ends_at = coalesce(p_access_ends_at, access_ends_at),
           completed_at = case when v_status = 'active' then coalesce(completed_at, now()) else completed_at end,
           updated_at = now(),
           last_stripe_event_created = p_event_created
     where id = p_purchase_id;

    v_profile_eligible := not exists (
        select 1 from public.purchases newer
         where newer.user_id = v_purchase.user_id
           and newer.id <> v_purchase.id
           and newer.created_at > v_purchase.created_at
           and newer.status in ('pending', 'active')
      );
  end if;

  if p_user_id is not null and v_profile_eligible then
    update public.users as u
       set (subscription_status, trial_expires_at, stripe_customer_id,
            stripe_payment_method_id, stripe_setup_intent_id, stripe_subscription_id,
            plan_id, season_charge_due_at, plan_started_at, last_paid_at,
            access_expires_at, cancel_at_period_end, stripe_last_event_created) = (
         select patched.subscription_status, patched.trial_expires_at, patched.stripe_customer_id,
                patched.stripe_payment_method_id, patched.stripe_setup_intent_id,
                patched.stripe_subscription_id, patched.plan_id, patched.season_charge_due_at,
                patched.plan_started_at, patched.last_paid_at, patched.access_expires_at,
                patched.cancel_at_period_end, p_event_created
           from jsonb_populate_record(u, p_profile_patch) as patched
       )
     where u.id = p_user_id
       and u.subscription_status <> 'beta'
       and u.stripe_last_event_created <= p_event_created
     returning id into v_updated_user;

    if v_updated_user is null then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  update public.stripe_webhook_events
     set outcome = 'applied', processed_at = now()
   where event_id = p_event_id;
  return 'applied';
end;
$$;

revoke all on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) to service_role;

-- Verify: returns two rows, with zero policies on the ledger tables.
-- select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('purchases','stripe_webhook_events');
-- select proname from pg_proc where proname='apply_stripe_purchase_event';

-- Launch waitlist (gate page): service role only, no client policy.
create table if not exists public.launch_waitlist (
  email text primary key check (email = lower(email) and length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.launch_waitlist enable row level security;

-- Creator preview links: each creator owns an isolated demo account, and the
-- server stores only a hash of the link code and device identifiers.
create table if not exists public.creator_links (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  note text check (note is null or char_length(note) <= 200),
  token_hash text not null unique,
  user_id uuid not null unique references public.users(id) on delete cascade,
  max_devices smallint not null default 2 check (max_devices between 1 and 5),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_opened_at timestamptz,
  last_active_at timestamptz,
  open_count integer not null default 0,
  blocked_attempts integer not null default 0,
  last_blocked_at timestamptz
);

create table if not exists public.creator_devices (
  link_id uuid not null references public.creator_links(id) on delete cascade,
  device_hash text not null,
  user_agent text check (user_agent is null or char_length(user_agent) <= 200),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (link_id, device_hash)
);

alter table public.creator_links enable row level security;
alter table public.creator_devices enable row level security;
revoke all on table public.creator_links, public.creator_devices from public, anon, authenticated;
grant all on table public.creator_links, public.creator_devices to service_role;

create or replace function public.claim_creator_device(
  p_token_hash text,
  p_device_hash text,
  p_user_agent text
)
returns table(result text, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.creator_links%rowtype;
  v_device_exists boolean;
  v_device_count integer;
begin
  select * into v_link
  from public.creator_links
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  if v_link.revoked_at is not null then
    return query select 'revoked'::text, null::uuid;
    return;
  end if;

  select exists (
    select 1 from public.creator_devices
    where link_id = v_link.id and device_hash = p_device_hash
  ) into v_device_exists;

  if v_device_exists then
    update public.creator_devices
    set last_seen = now()
    where link_id = v_link.id and device_hash = p_device_hash;
  else
    select count(*)::integer into v_device_count
    from public.creator_devices
    where link_id = v_link.id;

    if v_device_count >= v_link.max_devices then
      update public.creator_links
      set blocked_attempts = blocked_attempts + 1,
          last_blocked_at = now()
      where id = v_link.id;
      return query select 'blocked'::text, null::uuid;
      return;
    end if;

    insert into public.creator_devices (link_id, device_hash, user_agent)
    values (v_link.id, p_device_hash, left(p_user_agent, 200));
  end if;

  update public.creator_links
  set open_count = open_count + 1,
      last_opened_at = now()
  where id = v_link.id;

  return query select 'ok'::text, v_link.user_id;
end;
$$;

revoke all on function public.claim_creator_device(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_creator_device(text, text, text) to service_role;

-- Verify: two tables, creator status accepted, and the atomic claim RPC exists.
-- select (select count(*) from information_schema.tables where table_schema='public' and table_name in ('creator_links','creator_devices')) as tables_2,
--        (select pg_get_constraintdef(oid) like '%creator%' from pg_constraint where conname='users_subscription_status_check' and conrelid='public.users'::regclass) as status_ok,
--        (select count(*) from pg_proc where proname='claim_creator_device' and pronamespace='public'::regnamespace) as fn_1;
-- Rerun safety (plan 025): the plan 025 block below gives this function a wider return type, and CREATE OR REPLACE cannot narrow it back.
drop function if exists public.claim_due_season_charges(timestamptz);

-- Chunk 2 of plan 022: claim season charges, serialize cancellation and track refunds.
-- Apply only after review; never run this against production from an agent.

alter table public.purchases
  add column if not exists season_charge_status text not null default 'not_due'
    check (season_charge_status in ('not_due', 'ready', 'processing', 'requires_action', 'declined', 'retryable', 'succeeded', 'canceled')),
  add column if not exists season_charge_claimed_at timestamptz,
  add column if not exists season_charge_attempts integer not null default 0 check (season_charge_attempts >= 0),
  add column if not exists season_charge_error_code text check (season_charge_error_code is null or char_length(season_charge_error_code) <= 80),
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists season_charge_idempotency_key text,
  add column if not exists refund_status text not null default 'none'
    check (refund_status in ('none', 'pending', 'failed', 'succeeded')),
  add column if not exists refund_attempts integer not null default 0 check (refund_attempts >= 0),
  add column if not exists stripe_refund_id text;

create index if not exists purchases_due_season_charge_idx
  on public.purchases (season_charge_status, season_charge_claimed_at)
  where plan = 'season' and status = 'active';

-- Existing completed setup sessions have not yet entered this state machine.
update public.purchases
   set season_charge_status = 'ready', updated_at = now()
 where plan = 'season'
   and status = 'active'
   and stripe_setup_intent_id is not null
   and stripe_payment_intent_id is null
   and season_charge_status = 'not_due'
   and cancel_requested_at is null;

-- Keep the exact old worker key on already-active purchases so an ambiguous
-- pre-migration request is replayed under the same Stripe key. New purchases
-- get a key derived from their immutable purchase id when claimed below.
update public.purchases p
   set season_charge_idempotency_key = 'season:' || p.user_id::text || ':' ||
       to_char(u.season_charge_due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  from public.users u
 where u.id = p.user_id
   and p.plan = 'season'
   and p.status = 'active'
   and p.season_charge_idempotency_key is null
   and u.season_charge_due_at is not null;

create or replace function public.prepare_season_charge()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.plan = 'season'
     and new.status = 'active'
     and new.stripe_setup_intent_id is not null
     and new.season_charge_status = 'not_due'
     and new.cancel_requested_at is null then
    new.season_charge_status := 'ready';
  end if;
  return new;
end;
$$;

drop trigger if exists purchases_prepare_season_charge on public.purchases;
create trigger purchases_prepare_season_charge
before insert or update of status, stripe_setup_intent_id on public.purchases
for each row execute function public.prepare_season_charge();

create or replace function public.claim_due_season_charges(p_now timestamptz default now())
returns table (
  purchase_id uuid,
  user_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text,
  season_charge_due_at timestamptz,
  attempt_number integer,
  stripe_payment_intent_id text,
  season_charge_idempotency_key text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select p.id
      from public.purchases p
      join public.users u on u.id = p.user_id
     where p.plan = 'season'
       and p.status = 'active'
       and p.season_charge_status in ('ready', 'retryable', 'processing')
       and (p.season_charge_status <> 'processing'
            or p.season_charge_claimed_at < p_now - interval '30 minutes')
       and p.cancel_requested_at is null
       and u.plan_id = 'season'
       and u.subscription_status = 'trialing'
       and u.season_charge_due_at <= p_now
       and u.stripe_customer_id is not null
       and u.stripe_payment_method_id is not null
     order by u.season_charge_due_at, p.created_at
     for update of p skip locked
     limit 50
  ), claimed as (
    update public.purchases p
       set season_charge_status = 'processing',
           season_charge_claimed_at = p_now,
           season_charge_attempts = p.season_charge_attempts + 1,
           season_charge_idempotency_key = coalesce(p.season_charge_idempotency_key, 'season:' || p.id::text),
           updated_at = p_now
      from candidates c
     where p.id = c.id
     returning p.id, p.user_id, p.season_charge_attempts,
               p.stripe_payment_intent_id, p.season_charge_idempotency_key
  )
  select c.id, c.user_id, u.stripe_customer_id, u.stripe_payment_method_id,
         u.season_charge_due_at, c.season_charge_attempts, c.stripe_payment_intent_id,
         c.season_charge_idempotency_key
    from claimed c
    join public.users u on u.id = c.user_id;
end;
$$;

create or replace function public.set_season_charge_state(
  p_purchase_id uuid,
  p_state text,
  p_payment_intent_id text default null,
  p_error_code text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_state text := p_state;
begin
  if p_state not in ('processing', 'requires_action', 'declined', 'retryable', 'succeeded', 'canceled') then
    raise exception 'Invalid season charge state';
  end if;
  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if not found or v_purchase.plan <> 'season' then return 'not_found'; end if;
  if v_purchase.cancel_requested_at is not null and p_state in ('requires_action', 'declined', 'retryable') then
    v_state := 'canceled';
  end if;
  if v_purchase.season_charge_status in ('succeeded', 'canceled')
     and v_state not in ('succeeded', v_purchase.season_charge_status) then
    return v_purchase.season_charge_status;
  end if;
  update public.purchases
     set season_charge_status = v_state,
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
         season_charge_error_code = left(p_error_code, 80),
         season_charge_claimed_at = case when v_state = 'processing' then now() else null end,
         updated_at = now()
   where id = p_purchase_id;
  return v_state;
end;
$$;

create or replace function public.request_season_charge_cancel(p_user_id uuid, p_purchase_id uuid)
returns table(result text, payment_intent_id text, charge_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found then
    return query select 'not_found'::text, null::text, null::text;
    return;
  end if;
  if v_purchase.season_charge_status = 'succeeded' then
    return query select 'already_charged'::text, v_purchase.stripe_payment_intent_id, v_purchase.season_charge_status;
    return;
  end if;
  if v_purchase.season_charge_status = 'canceled' then
    return query select 'canceled'::text, v_purchase.stripe_payment_intent_id, v_purchase.season_charge_status;
    return;
  end if;

  update public.purchases
     set cancel_requested_at = coalesce(cancel_requested_at, now()),
         season_charge_status = case
           when season_charge_status in ('not_due', 'ready', 'retryable', 'declined') then 'canceled'
           else season_charge_status
         end,
         updated_at = now()
   where id = p_purchase_id;

  if v_purchase.season_charge_status in ('not_due', 'ready', 'retryable', 'declined') then
    update public.users
       set plan_id = null, subscription_status = 'canceled',
           season_charge_due_at = null, stripe_payment_method_id = null
     where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
    return query select 'canceled'::text, v_purchase.stripe_payment_intent_id, 'canceled'::text;
    return;
  end if;

  return query select 'cancellation_requested'::text, v_purchase.stripe_payment_intent_id,
                      v_purchase.season_charge_status;
end;
$$;

create or replace function public.finish_season_charge_cancel(p_user_id uuid, p_purchase_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found then return 'not_found'; end if;
  if v_purchase.season_charge_status = 'succeeded' and v_purchase.refund_status <> 'succeeded' then return 'already_charged'; end if;
  update public.purchases
     set season_charge_status = 'canceled', cancel_requested_at = coalesce(cancel_requested_at, now()), updated_at = now()
   where id = p_purchase_id;
  update public.users
     set plan_id = null, subscription_status = 'canceled',
         season_charge_due_at = null, stripe_payment_method_id = null
   where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
  return 'canceled';
end;
$$;

create or replace function public.set_purchase_refund_state(
  p_user_id uuid,
  p_purchase_id uuid,
  p_state text,
  p_refund_id text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  if p_state not in ('pending', 'failed', 'succeeded') then raise exception 'Invalid refund state'; end if;
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id
   for update;
  if not found then return 'not_found'; end if;
  if v_purchase.refund_status = 'succeeded' then return 'succeeded'; end if;
  update public.purchases
     set status = 'withdrawn',
         refund_status = p_state,
         refund_attempts = refund_attempts + case when p_state = 'pending' and p_refund_id is null then 1 else 0 end,
         stripe_refund_id = coalesce(p_refund_id, stripe_refund_id),
         updated_at = now()
   where id = p_purchase_id;
  return p_state;
end;
$$;

revoke all on function public.prepare_season_charge() from public, anon, authenticated;
revoke all on function public.claim_due_season_charges(timestamptz) from public, anon, authenticated;
revoke all on function public.set_season_charge_state(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.request_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_purchase_refund_state(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_due_season_charges(timestamptz) to service_role;
grant execute on function public.set_season_charge_state(uuid, text, text, text) to service_role;
grant execute on function public.request_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.finish_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.set_purchase_refund_state(uuid, uuid, text, text) to service_role;

-- Verify: charge-state counts; no client policies or function grants.
-- select season_charge_status, count(*) from public.purchases where plan='season' group by 1 order by 1;
-- select tablename, count(*) as policies from pg_policies where schemaname='public' and tablename='purchases' group by tablename;
-- select proname, has_function_privilege('anon', p.oid, 'execute') as anon_exec, has_function_privilege('authenticated', p.oid, 'execute') as user_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('claim_due_season_charges','set_season_charge_state','request_season_charge_cancel','finish_season_charge_cancel','set_purchase_refund_state');

-- ----------------------------------------------------------------------------
-- Paid-launch chunk 3 — gated catalogue and resumable onboarding
-- Mirrored by migrations/2026-10-22-paid-catalogue-boundary.sql.
-- ----------------------------------------------------------------------------

alter table public.users add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.onboarding_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  step_id text not null check (
    step_id in ('welcome','role','stakes','calculating','reveal','commitment','proof',
      'hodnota','cesta','ucet','plan','zkusebni','platba','hotovo')
    or step_id ~ '^q([1-9]|1[01])$'
  ),
  role text check (role is null or role in ('student','parent')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  intents jsonb not null default '[]'::jsonb check (jsonb_typeof(intents) = 'array'),
  commitment text check (commitment is null or commitment in ('maximalne','hodne','zjistuji')),
  gender text check (gender is null or gender in ('m','f','u')),
  plan_id text not null default 'season' check (plan_id in ('season','monthly')),
  updated_at timestamptz not null default now()
);
alter table public.onboarding_progress enable row level security;
revoke all on public.onboarding_progress from public, anon, authenticated;
grant all on table public.onboarding_progress to service_role;

create table if not exists public.paid_launch_schema_markers (
  marker text primary key,
  applied_at timestamptz not null default now()
);
alter table public.paid_launch_schema_markers enable row level security;
revoke all on public.paid_launch_schema_markers from public, anon, authenticated;
grant all on table public.paid_launch_schema_markers to service_role;

do $$
begin
  if not exists (
    select 1 from public.paid_launch_schema_markers
     where marker = '2026-10-22-paid-catalogue-boundary'
  ) then
    update public.users
       set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
     where onboarding_completed_at is null;
    insert into public.paid_launch_schema_markers(marker)
    values ('2026-10-22-paid-catalogue-boundary');
  end if;
end;
$$;

create or replace function public.complete_paid_onboarding(p_user_id uuid, p_purchase_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_purchase_id is null then return false; end if;
  if exists (
    select 1 from public.users u join public.purchases p on p.user_id = u.id
     where u.id = p_user_id and u.onboarding_completed_at is not null
       and p.id = p_purchase_id and p.plan in ('season','monthly')
  ) then
    delete from public.onboarding_progress where user_id = p_user_id;
    return true;
  end if;
  update public.users u
     set onboarding_completed_at = coalesce(u.onboarding_completed_at, now())
   where u.id = p_user_id
     and exists (
       select 1 from public.purchases p where p.id = p_purchase_id
         and p.user_id = p_user_id and p.status = 'active' and p.plan in ('season','monthly')
     )
     and u.subscription_status in ('trialing','active','season','past_due');
  if not found then return false; end if;
  delete from public.onboarding_progress where user_id = p_user_id;
  return true;
end;
$$;
revoke all on function public.complete_paid_onboarding(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_paid_onboarding(uuid, uuid) to service_role;

-- Verify after applying: both counts should be zero for existing accounts.
-- select count(*) filter (where onboarding_completed_at is null) as incomplete_accounts,
--   (select count(*) from public.onboarding_progress p join public.users u on u.id=p.user_id
--     where u.onboarding_completed_at is not null) as completed_with_draft from public.users;

create or replace function public.save_application_picks(p_user_id uuid, p_picks jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pick jsonb;
  sid bigint;
  v_kkov text;
  pos integer := 0;
  seen bigint[] := '{}';
begin
  if p_user_id is null or p_picks is null or jsonb_typeof(p_picks) <> 'array' then
    raise exception 'Invalid picks' using errcode = '22023', hint = 'INVALID_PICKS';
  end if;
  if jsonb_array_length(p_picks) > 3 then
    raise exception 'Too many picks' using errcode = '22023', hint = 'TOO_MANY_PICKS';
  end if;

  -- Two saves for one account queue here, so the stored list is always one
  -- complete request, never a mix of two.
  perform pg_advisory_xact_lock(hashtextextended('application_picks:' || p_user_id::text, 0));

  for pick in select value from jsonb_array_elements(p_picks) loop
    if jsonb_typeof(pick) <> 'object' or (pick ->> 'school_id') !~ '^[0-9]{1,15}$' then
      raise exception 'Invalid pick' using errcode = '22023', hint = 'INVALID_PICKS';
    end if;
    sid := (pick ->> 'school_id')::bigint;
    if sid = any(seen) then
      raise exception 'Duplicate school' using errcode = '22023', hint = 'INVALID_PICKS';
    end if;
    seen := seen || sid;
    if not exists (
      select 1 from public.schools s
       where s.id = sid and s.merged_into is null and s.hidden_reason is null
    ) then
      raise exception 'School unavailable' using errcode = '22023', hint = 'SCHOOL_UNAVAILABLE';
    end if;
    v_kkov := nullif(pick ->> 'obor_kkov', '');
    if v_kkov is not null and not exists (
      select 1 from public.school_programs p where p.school_id = sid and p.kkov = v_kkov
    ) then
      raise exception 'Programme does not belong to school' using errcode = '22023', hint = 'INVALID_PROGRAM';
    end if;
  end loop;

  -- Picks on a hidden school are kept (never deleted); only visible picks are replaced.
  delete from public.application_picks ap
   where ap.user_id = p_user_id
     and exists (
       select 1 from public.schools s
        where s.id = ap.school_id and s.merged_into is null and s.hidden_reason is null
     );

  for pick in select value from jsonb_array_elements(p_picks) loop
    pos := pos + 1;
    insert into public.application_picks (user_id, school_id, priority, obor_kkov, obor_nazev)
    values (
      p_user_id,
      (pick ->> 'school_id')::bigint,
      pos,
      left(nullif(pick ->> 'obor_kkov', ''), 40),
      left(nullif(pick ->> 'obor_nazev', ''), 200)
    );
  end loop;
  return pos;
end;
$$;
revoke all on function public.save_application_picks(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_application_picks(uuid, jsonb) to service_role;

create or replace function public.cache_questionnaire_reason(
  p_user_id uuid, p_run_id bigint, p_school_id text, p_answers jsonb, p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_run_id is null or p_answers is null
     or p_school_id is null or p_school_id !~ '^[0-9]{1,15}$'
     or p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 2000 then
    return false;
  end if;
  -- One key merged into the stored map: two schools generated in parallel both
  -- stay cached. The answers must still be the ones the sentence was written
  -- for, so a re-score or consent withdrawal in between is never overwritten.
  update public.questionnaire_runs r
     set extra_reasons = coalesce(r.extra_reasons, '{}'::jsonb)
                         || jsonb_build_object(p_school_id, p_reason)
   where r.id = p_run_id
     and r.user_id = p_user_id
     and r.answers = p_answers;
  return found;
end;
$$;
revoke all on function public.cache_questionnaire_reason(uuid, bigint, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.cache_questionnaire_reason(uuid, bigint, text, jsonb, text) to service_role;

-- Plan 025: revenue model (daily season price, spring pass, trial abuse, referral, restore).
-- Mirrored byte-for-byte in supabase-setup.sql. Idempotent; apply by hand, never from an agent.

-- purchases: provenance of every price and consent, one trial per purchase
alter table public.purchases drop constraint if exists purchases_plan_check;
alter table public.purchases
  add constraint purchases_plan_check check (plan in ('season', 'monthly', 'spring'));
alter table public.purchases
  add column if not exists trial boolean not null default false,
  add column if not exists card_fingerprint text,
  add column if not exists immediate_start_consent_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists discount_kind text check (discount_kind is null or discount_kind in ('referral', 'switch_credit')),
  add column if not exists discount_minor integer not null default 0 check (discount_minor >= 0),
  add column if not exists cancel_reason text check (cancel_reason is null or cancel_reason in ('price', 'not_needed', 'other')),
  add column if not exists needs_payment_confirmation boolean not null default false,
  add column if not exists referrer_user_id uuid references public.users(id) on delete set null,
  add column if not exists refund_amount_minor integer check (refund_amount_minor is null or refund_amount_minor >= 0);

create index if not exists purchases_card_fingerprint_idx
  on public.purchases (card_fingerprint) where card_fingerprint is not null;

-- one trial per account
alter table public.users add column if not exists season_trial_used_at timestamptz;

-- Every season purchase made through setup mode so far was a trial.
update public.purchases set trial = true
 where plan = 'season' and stripe_setup_intent_id is not null and trial = false
   and needs_payment_confirmation = false and stripe_payment_intent_id is null;
update public.users u
   set season_trial_used_at = p.first_trial
  from (select user_id, min(created_at) as first_trial from public.purchases where trial group by user_id) p
 where p.user_id = u.id and u.season_trial_used_at is null;

-- one trial per card (service role only)
create table if not exists public.trial_card_fingerprints (
  fingerprint text primary key,
  user_id uuid references public.users(id) on delete set null,
  used_at timestamptz not null default now()
);
alter table public.trial_card_fingerprints enable row level security;
revoke all on table public.trial_card_fingerprints from public, anon, authenticated;
grant all on table public.trial_card_fingerprints to service_role;

-- referral (service role only)
create table if not exists public.referral_codes (
  user_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  referred_purchase_id uuid not null unique references public.purchases(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'capped', 'void')),
  void_reason text,
  reward_minor integer not null default 0,
  stripe_refund_id text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on table public.referral_codes, public.referrals from public, anon, authenticated;
grant all on table public.referral_codes, public.referrals to service_role;

-- Only trial purchases enter the scheduled-charge state machine.
create or replace function public.prepare_season_charge()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.plan = 'season'
     and new.trial
     and new.status = 'active'
     and new.stripe_setup_intent_id is not null
     and new.season_charge_status = 'not_due'
     and new.cancel_requested_at is null then
    new.season_charge_status := 'ready';
  end if;
  return new;
end;
$$;

-- The charge uses the price locked at checkout, so the claim returns it.
drop function if exists public.claim_due_season_charges(timestamptz);
create function public.claim_due_season_charges(p_now timestamptz default now())
returns table (
  purchase_id uuid,
  user_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text,
  season_charge_due_at timestamptz,
  attempt_number integer,
  stripe_payment_intent_id text,
  season_charge_idempotency_key text,
  price_amount_minor integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select p.id
      from public.purchases p
      join public.users u on u.id = p.user_id
     where p.plan = 'season'
       and p.status = 'active'
       and p.season_charge_status in ('ready', 'retryable', 'processing')
       and (p.season_charge_status <> 'processing'
            or p.season_charge_claimed_at < p_now - interval '30 minutes')
       and p.cancel_requested_at is null
       and u.plan_id = 'season'
       and u.subscription_status = 'trialing'
       and u.season_charge_due_at <= p_now
       and u.stripe_customer_id is not null
       and u.stripe_payment_method_id is not null
     order by u.season_charge_due_at, p.created_at
     for update of p skip locked
     limit 50
  ), claimed as (
    update public.purchases p
       set season_charge_status = 'processing',
           season_charge_claimed_at = p_now,
           season_charge_attempts = p.season_charge_attempts + 1,
           season_charge_idempotency_key = coalesce(p.season_charge_idempotency_key, 'season:' || p.id::text),
           updated_at = p_now
      from candidates c
     where p.id = c.id
     returning p.id, p.user_id, p.season_charge_attempts,
               p.stripe_payment_intent_id, p.season_charge_idempotency_key, p.price_amount_minor
  )
  select c.id, c.user_id, u.stripe_customer_id, u.stripe_payment_method_id,
         u.season_charge_due_at, c.season_charge_attempts, c.stripe_payment_intent_id,
         c.season_charge_idempotency_key, c.price_amount_minor
    from claimed c
    join public.users u on u.id = c.user_id;
end;
$$;

-- Cancelling a trial keeps the saved card, so "Obnovit" needs no card entry.
create or replace function public.request_season_charge_cancel(p_user_id uuid, p_purchase_id uuid)
returns table(result text, payment_intent_id text, charge_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found then
    return query select 'not_found'::text, null::text, null::text;
    return;
  end if;
  if v_purchase.season_charge_status = 'succeeded' then
    return query select 'already_charged'::text, v_purchase.stripe_payment_intent_id, v_purchase.season_charge_status;
    return;
  end if;
  if v_purchase.season_charge_status = 'canceled' then
    return query select 'canceled'::text, v_purchase.stripe_payment_intent_id, v_purchase.season_charge_status;
    return;
  end if;

  update public.purchases
     set cancel_requested_at = coalesce(cancel_requested_at, now()),
         season_charge_status = case
           when season_charge_status in ('not_due', 'ready', 'retryable', 'declined') then 'canceled'
           else season_charge_status
         end,
         updated_at = now()
   where id = p_purchase_id;

  if v_purchase.season_charge_status in ('not_due', 'ready', 'retryable', 'declined') then
    update public.users
       set plan_id = null, subscription_status = 'canceled', season_charge_due_at = null
     where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
    return query select 'canceled'::text, v_purchase.stripe_payment_intent_id, 'canceled'::text;
    return;
  end if;

  return query select 'cancellation_requested'::text, v_purchase.stripe_payment_intent_id,
                      v_purchase.season_charge_status;
end;
$$;

create or replace function public.finish_season_charge_cancel(p_user_id uuid, p_purchase_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found then return 'not_found'; end if;
  if v_purchase.season_charge_status = 'succeeded' and v_purchase.refund_status <> 'succeeded' then return 'already_charged'; end if;
  update public.purchases
     set season_charge_status = 'canceled', cancel_requested_at = coalesce(cancel_requested_at, now()), updated_at = now()
   where id = p_purchase_id;
  update public.users
     set plan_id = null, subscription_status = 'canceled', season_charge_due_at = null
   where id = p_user_id and plan_id = 'season' and subscription_status in ('trialing', 'past_due');
  return 'canceled';
end;
$$;

-- Undo a trial cancellation while the trial is still running: same charge date,
-- same locked price, no new trial. Returns restored | too_late | no_card | not_found.
create or replace function public.restore_season_charge(p_user_id uuid, p_purchase_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_user public.users%rowtype;
begin
  select * into v_user from public.users where id = p_user_id for update;
  select * into v_purchase from public.purchases
   where id = p_purchase_id and user_id = p_user_id and plan = 'season'
   for update;
  if not found or v_user.id is null then return 'not_found'; end if;
  if v_purchase.status <> 'active' or not v_purchase.trial
     or v_purchase.cancel_requested_at is null
     or v_purchase.season_charge_status <> 'canceled'
     or v_purchase.stripe_payment_intent_id is not null
     or v_user.subscription_status <> 'canceled'
     or exists (
       select 1 from public.purchases newer
        where newer.user_id = p_user_id and newer.id <> p_purchase_id
          and newer.created_at > v_purchase.created_at
          and newer.status in ('pending', 'active')
     ) then
    return 'not_found';
  end if;
  if v_purchase.access_ends_at is null or v_purchase.access_ends_at <= now() + interval '5 minutes' then
    return 'too_late';
  end if;
  if v_user.stripe_payment_method_id is null then return 'no_card'; end if;

  update public.purchases
     set cancel_requested_at = null, season_charge_status = 'ready', updated_at = now()
   where id = p_purchase_id;
  update public.users
     set plan_id = 'season', subscription_status = 'trialing',
         season_charge_due_at = v_purchase.access_ends_at
   where id = p_user_id;
  return 'restored';
end;
$$;

-- A spring pass is a paid purchase like any other.
create or replace function public.complete_paid_onboarding(p_user_id uuid, p_purchase_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_purchase_id is null then return false; end if;
  if exists (
    select 1 from public.users u join public.purchases p on p.user_id = u.id
     where u.id = p_user_id and u.onboarding_completed_at is not null
       and p.id = p_purchase_id and p.plan in ('season','monthly','spring')
  ) then
    delete from public.onboarding_progress where user_id = p_user_id;
    return true;
  end if;
  update public.users u
     set onboarding_completed_at = coalesce(u.onboarding_completed_at, now())
   where u.id = p_user_id
     and exists (
       select 1 from public.purchases p where p.id = p_purchase_id
         and p.user_id = p_user_id and p.status = 'active' and p.plan in ('season','monthly','spring')
     )
     and u.subscription_status in ('trialing','active','season','past_due');
  if not found then return false; end if;
  delete from public.onboarding_progress where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.prepare_season_charge() from public, anon, authenticated;
revoke all on function public.claim_due_season_charges(timestamptz) from public, anon, authenticated;
revoke all on function public.request_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_season_charge_cancel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.restore_season_charge(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_paid_onboarding(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_due_season_charges(timestamptz) to service_role;
grant execute on function public.request_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.finish_season_charge_cancel(uuid, uuid) to service_role;
grant execute on function public.restore_season_charge(uuid, uuid) to service_role;
grant execute on function public.complete_paid_onboarding(uuid, uuid) to service_role;

-- The webhook ledger function: only a newer ACTIVE purchase outranks an event (plan 025 review fix).
create or replace function public.apply_stripe_purchase_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_purchase_id uuid,
  p_purchase_status text,
  p_checkout_session_id text,
  p_setup_intent_id text,
  p_payment_intent_id text,
  p_subscription_id text,
  p_access_starts_at timestamptz,
  p_access_ends_at timestamptz,
  p_profile_patch jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_user public.users%rowtype;
  v_inserted_event text;
  v_status_allowed boolean := true;
  v_profile_eligible boolean := true;
  v_status text;
  v_updated_user uuid;
begin
  if p_event_id is null or length(p_event_id) = 0
     or p_event_type is null or length(p_event_type) = 0
     or p_event_created is null or p_event_created < 0 then
    raise exception 'Invalid Stripe event identity';
  end if;
  if coalesce(jsonb_typeof(p_profile_patch), 'object') <> 'object' then
    raise exception 'Stripe profile patch must be a JSON object';
  end if;
  if exists (
    select 1
      from jsonb_object_keys(coalesce(p_profile_patch, '{}'::jsonb)) as k(key)
     where key not in (
       'subscription_status', 'trial_expires_at', 'stripe_customer_id',
       'stripe_payment_method_id', 'stripe_setup_intent_id',
       'stripe_subscription_id', 'plan_id', 'season_charge_due_at',
       'plan_started_at', 'last_paid_at', 'access_expires_at',
       'cancel_at_period_end'
     )
  ) then
    raise exception 'Stripe profile patch contains a protected field';
  end if;
  if p_purchase_status is not null and p_purchase_status not in
     ('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed') then
    raise exception 'Invalid purchase status';
  end if;

  insert into public.stripe_webhook_events(event_id, event_type, event_created)
  values (p_event_id, p_event_type, p_event_created)
  on conflict (event_id) do nothing
  returning event_id into v_inserted_event;

  if v_inserted_event is null then
    return 'duplicate';
  end if;

  if p_purchase_id is not null and p_user_id is null then
    select user_id into p_user_id from public.purchases where id = p_purchase_id;
  end if;

  if p_user_id is not null then
    select * into v_user
      from public.users
     where id = p_user_id
     for update;
    if not found or v_user.subscription_status = 'beta' then
      update public.stripe_webhook_events
         set outcome = 'ignored', processed_at = now()
       where event_id = p_event_id;
      return 'ignored';
    end if;
    if p_event_created < v_user.stripe_last_event_created then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  if p_purchase_id is not null then
    select * into v_purchase
      from public.purchases
     where id = p_purchase_id
     for update;

    if not found or (p_user_id is not null and v_purchase.user_id <> p_user_id) then
      update public.stripe_webhook_events
         set outcome = 'unmatched', processed_at = now()
       where event_id = p_event_id;
      return 'unmatched';
    end if;

    if p_event_created < v_purchase.last_stripe_event_created
       or (p_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id <> p_checkout_session_id) then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;

    if p_purchase_status is not null then
      v_status_allowed := case v_purchase.status
        when 'pending' then p_purchase_status in ('pending', 'active', 'canceled', 'failed')
        when 'active' then p_purchase_status in ('active', 'canceled', 'withdrawn', 'refunded')
        when 'canceled' then p_purchase_status in ('canceled', 'withdrawn', 'refunded')
        when 'withdrawn' then p_purchase_status in ('withdrawn', 'refunded')
        when 'failed' then p_purchase_status in ('failed', 'refunded')
        when 'refunded' then p_purchase_status = 'refunded'
        else false
      end;
      if not v_status_allowed then
        update public.stripe_webhook_events
           set outcome = 'stale', processed_at = now()
         where event_id = p_event_id;
        return 'stale';
      end if;
    end if;

    v_status := case when p_purchase_status is not null and v_status_allowed
      then p_purchase_status else v_purchase.status end;

    update public.purchases
       set status = v_status,
           stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
           stripe_setup_intent_id = coalesce(p_setup_intent_id, stripe_setup_intent_id),
           stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
           stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
           access_starts_at = coalesce(p_access_starts_at, access_starts_at),
           access_ends_at = coalesce(p_access_ends_at, access_ends_at),
           completed_at = case when v_status = 'active' then coalesce(completed_at, now()) else completed_at end,
           updated_at = now(),
           last_stripe_event_created = p_event_created
     where id = p_purchase_id;

    -- Only a newer ACTIVE purchase outranks this event; a pending one (an unfinished
    -- one-click switch, an open Checkout) must not freeze a paying account.
    v_profile_eligible := not exists (
        select 1 from public.purchases newer
         where newer.user_id = v_purchase.user_id
           and newer.id <> v_purchase.id
           and newer.created_at > v_purchase.created_at
           and newer.status = 'active'
      );
  end if;

  if p_user_id is not null and v_profile_eligible then
    update public.users as u
       set (subscription_status, trial_expires_at, stripe_customer_id,
            stripe_payment_method_id, stripe_setup_intent_id, stripe_subscription_id,
            plan_id, season_charge_due_at, plan_started_at, last_paid_at,
            access_expires_at, cancel_at_period_end, stripe_last_event_created) = (
         select patched.subscription_status, patched.trial_expires_at, patched.stripe_customer_id,
                patched.stripe_payment_method_id, patched.stripe_setup_intent_id,
                patched.stripe_subscription_id, patched.plan_id, patched.season_charge_due_at,
                patched.plan_started_at, patched.last_paid_at, patched.access_expires_at,
                patched.cancel_at_period_end, p_event_created
           from jsonb_populate_record(u, p_profile_patch) as patched
       )
     where u.id = p_user_id
       and u.subscription_status <> 'beta'
       and u.stripe_last_event_created <= p_event_created
     returning id into v_updated_user;

    if v_updated_user is null then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  update public.stripe_webhook_events
     set outcome = 'applied', processed_at = now()
   where event_id = p_event_id;
  return 'applied';
end;
$$;

revoke all on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) to service_role;

-- Verify: expect purchase_cols = 10, new_tables = 3, fns = 1, claim_returns_price = true and guard_active_only = true.
-- select (select count(*) from information_schema.columns where table_schema='public' and table_name='purchases'
--          and column_name in ('trial','card_fingerprint','immediate_start_consent_at','terms_version','discount_kind','discount_minor','cancel_reason','needs_payment_confirmation','referrer_user_id','refund_amount_minor')) as purchase_cols,
--        (select count(*) from information_schema.tables where table_schema='public' and table_name in ('trial_card_fingerprints','referral_codes','referrals')) as new_tables,
--        (select count(*) from pg_proc where proname='restore_season_charge' and pronamespace='public'::regnamespace) as fns,
--        (select pg_get_function_result(p.oid) like '%price_amount_minor%' from pg_proc p where p.proname='claim_due_season_charges' and p.pronamespace='public'::regnamespace) as claim_returns_price,
--        (select pg_get_functiondef(p.oid) like '%newer.status = ''active''%' from pg_proc p where p.proname='apply_stripe_purchase_event' and p.pronamespace='public'::regnamespace) as guard_active_only;

-- Plan 022 review fix (28 Oct 2026): an event that changes nothing must not move the ledger clocks.
-- invoice.paid carries an empty profile patch; advancing users/purchases.stripe_last_event_created
-- made a retried (older) customer.subscription.updated look stale, so a renewal's new
-- access_expires_at was dropped. Safe to re-run (create or replace).
create or replace function public.apply_stripe_purchase_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_purchase_id uuid,
  p_purchase_status text,
  p_checkout_session_id text,
  p_setup_intent_id text,
  p_payment_intent_id text,
  p_subscription_id text,
  p_access_starts_at timestamptz,
  p_access_ends_at timestamptz,
  p_profile_patch jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_user public.users%rowtype;
  v_inserted_event text;
  v_status_allowed boolean := true;
  v_profile_eligible boolean := true;
  v_status text;
  v_updated_user uuid;
  v_has_patch boolean := coalesce(p_profile_patch, '{}'::jsonb) <> '{}'::jsonb;
  v_moves_purchase boolean;
begin
  if p_event_id is null or length(p_event_id) = 0
     or p_event_type is null or length(p_event_type) = 0
     or p_event_created is null or p_event_created < 0 then
    raise exception 'Invalid Stripe event identity';
  end if;
  if coalesce(jsonb_typeof(p_profile_patch), 'object') <> 'object' then
    raise exception 'Stripe profile patch must be a JSON object';
  end if;
  if exists (
    select 1
      from jsonb_object_keys(coalesce(p_profile_patch, '{}'::jsonb)) as k(key)
     where key not in (
       'subscription_status', 'trial_expires_at', 'stripe_customer_id',
       'stripe_payment_method_id', 'stripe_setup_intent_id',
       'stripe_subscription_id', 'plan_id', 'season_charge_due_at',
       'plan_started_at', 'last_paid_at', 'access_expires_at',
       'cancel_at_period_end'
     )
  ) then
    raise exception 'Stripe profile patch contains a protected field';
  end if;
  if p_purchase_status is not null and p_purchase_status not in
     ('pending', 'active', 'canceled', 'withdrawn', 'refunded', 'failed') then
    raise exception 'Invalid purchase status';
  end if;

  insert into public.stripe_webhook_events(event_id, event_type, event_created)
  values (p_event_id, p_event_type, p_event_created)
  on conflict (event_id) do nothing
  returning event_id into v_inserted_event;

  if v_inserted_event is null then
    return 'duplicate';
  end if;

  if p_purchase_id is not null and p_user_id is null then
    select user_id into p_user_id from public.purchases where id = p_purchase_id;
  end if;

  if p_user_id is not null then
    select * into v_user
      from public.users
     where id = p_user_id
     for update;
    if not found or v_user.subscription_status = 'beta' then
      update public.stripe_webhook_events
         set outcome = 'ignored', processed_at = now()
       where event_id = p_event_id;
      return 'ignored';
    end if;
    if p_event_created < v_user.stripe_last_event_created then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  if p_purchase_id is not null then
    select * into v_purchase
      from public.purchases
     where id = p_purchase_id
     for update;

    if not found or (p_user_id is not null and v_purchase.user_id <> p_user_id) then
      update public.stripe_webhook_events
         set outcome = 'unmatched', processed_at = now()
       where event_id = p_event_id;
      return 'unmatched';
    end if;

    if p_event_created < v_purchase.last_stripe_event_created
       or (p_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id is not null
           and v_purchase.stripe_checkout_session_id <> p_checkout_session_id) then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;

    if p_purchase_status is not null then
      v_status_allowed := case v_purchase.status
        when 'pending' then p_purchase_status in ('pending', 'active', 'canceled', 'failed')
        when 'active' then p_purchase_status in ('active', 'canceled', 'withdrawn', 'refunded')
        when 'canceled' then p_purchase_status in ('canceled', 'withdrawn', 'refunded')
        when 'withdrawn' then p_purchase_status in ('withdrawn', 'refunded')
        when 'failed' then p_purchase_status in ('failed', 'refunded')
        when 'refunded' then p_purchase_status = 'refunded'
        else false
      end;
      if not v_status_allowed then
        update public.stripe_webhook_events
           set outcome = 'stale', processed_at = now()
         where event_id = p_event_id;
        return 'stale';
      end if;
    end if;

    v_status := case when p_purchase_status is not null and v_status_allowed
      then p_purchase_status else v_purchase.status end;

    -- An event that changes nothing on the purchase (invoice.paid on an active one)
    -- must not move its clock, or a delayed subscription.updated would be dropped.
    v_moves_purchase := v_status <> v_purchase.status
      or p_access_starts_at is not null
      or p_access_ends_at is not null
      or v_has_patch;

    update public.purchases
       set status = v_status,
           stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
           stripe_setup_intent_id = coalesce(p_setup_intent_id, stripe_setup_intent_id),
           stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
           stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
           access_starts_at = coalesce(p_access_starts_at, access_starts_at),
           access_ends_at = coalesce(p_access_ends_at, access_ends_at),
           completed_at = case when v_status = 'active' then coalesce(completed_at, now()) else completed_at end,
           updated_at = now(),
           last_stripe_event_created = case when v_moves_purchase
             then p_event_created else last_stripe_event_created end
     where id = p_purchase_id;

    -- Only a newer ACTIVE purchase outranks this event; a pending one (an unfinished
    -- one-click switch, an open Checkout) must not freeze a paying account.
    v_profile_eligible := not exists (
        select 1 from public.purchases newer
         where newer.user_id = v_purchase.user_id
           and newer.id <> v_purchase.id
           and newer.created_at > v_purchase.created_at
           and newer.status = 'active'
      );
  end if;

  if p_user_id is not null and v_profile_eligible then
    update public.users as u
       set (subscription_status, trial_expires_at, stripe_customer_id,
            stripe_payment_method_id, stripe_setup_intent_id, stripe_subscription_id,
            plan_id, season_charge_due_at, plan_started_at, last_paid_at,
            access_expires_at, cancel_at_period_end, stripe_last_event_created) = (
         select patched.subscription_status, patched.trial_expires_at, patched.stripe_customer_id,
                patched.stripe_payment_method_id, patched.stripe_setup_intent_id,
                patched.stripe_subscription_id, patched.plan_id, patched.season_charge_due_at,
                patched.plan_started_at, patched.last_paid_at, patched.access_expires_at,
                patched.cancel_at_period_end,
                case when v_has_patch then p_event_created else u.stripe_last_event_created end
           from jsonb_populate_record(u, p_profile_patch) as patched
       )
     where u.id = p_user_id
       and u.subscription_status <> 'beta'
       and u.stripe_last_event_created <= p_event_created
     returning id into v_updated_user;

    if v_updated_user is null then
      update public.stripe_webhook_events
         set outcome = 'stale', processed_at = now()
       where event_id = p_event_id;
      return 'stale';
    end if;
  end if;

  update public.stripe_webhook_events
     set outcome = 'applied', processed_at = now()
   where event_id = p_event_id;
  return 'applied';
end;
$$;

revoke all on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_stripe_purchase_event(
  text, text, bigint, uuid, uuid, text, text, text, text, text,
  timestamptz, timestamptz, jsonb
) to service_role;

-- Verify: expect clock_only_on_change = true.
-- select (select pg_get_functiondef(p.oid) like '%v_moves_purchase%' and pg_get_functiondef(p.oid) like '%v_has_patch%' from pg_proc p where p.proname='apply_stripe_purchase_event' and p.pronamespace='public'::regnamespace) as clock_only_on_change;
