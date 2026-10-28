const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const migration = readFileSync('migrations/2026-10-22-paid-catalogue-boundary.sql', 'utf8');
const setup = readFileSync('supabase-setup.sql', 'utf8');
const server = readFileSync('server.js', 'utf8');

test('paid catalogue schema is repeatable and keeps onboarding drafts service-only', () => {
  for (const sql of [migration, setup]) {
    assert.match(sql, /add column if not exists onboarding_completed_at timestamptz/i);
    assert.match(sql, /create table if not exists public\.onboarding_progress/i);
    assert.match(sql, /alter table public\.onboarding_progress enable row level security/i);
    assert.match(sql, /revoke all on public\.onboarding_progress from public, anon, authenticated/i);
    assert.match(sql, /grant all on table public\.onboarding_progress to service_role/i);
    assert.match(sql, /create table if not exists public\.paid_launch_schema_markers/i);
    assert.match(sql, /revoke all on public\.paid_launch_schema_markers from public, anon, authenticated/i);
    assert.match(sql, /grant all on table public\.paid_launch_schema_markers to service_role/i);
    assert.match(sql, /2026-10-22-paid-catalogue-boundary/);
    assert.match(sql, /grant execute on function public\.complete_paid_onboarding\(uuid, uuid\) to service_role/i);
    assert.match(sql, /revoke all on function public\.complete_paid_onboarding\(uuid, uuid\) from public, anon, authenticated/i);
  }
});

test('only a matching active purchase can mark onboarding complete', () => {
  assert.match(migration, /where p\.id = p_purchase_id\s+and p\.user_id = p_user_id\s+and p\.status = 'active'\s+and p\.plan in \('season','monthly'\)/i);
  assert.match(migration, /and u\.subscription_status in \('trialing','active','season','past_due'\)/i);
  assert.match(migration, /delete from public\.onboarding_progress where user_id = p_user_id/i);
  assert.match(migration, /onboarding_completed_at is not null[\s\S]{0,180}p\.id = p_purchase_id/i);
});

test('public catalogue projections omit match scores and comparison-only content', () => {
  assert.match(server, /const PUBLIC_LIST_SELECT = `id,name,official_name,location,contact,website,latitude,longitude,school_programs\(\$\{LIST_PROGRAM_FIELDS\.join\(','\)\}\)`/);
  assert.doesNotMatch(server.match(/const PUBLIC_LIST_SELECT = ([^;]+);/)?.[1] || '', /school_ai_summary|school_extracted_details|match_score/i);
  assert.match(server, /if \(permission\.mode === 'public'\) \{\s+return res\.json\(withDistricts\(slim\)\.map/);
  assert.match(server, /permission\.mode !== 'full'\) return res\.status\(402\)/);
});

test('onboarding flow declares `cleaned` before any hook that reads it', () => {
  const flow = readFileSync('frontend/src/pages/onboarding/OnboardingFlow.jsx', 'utf8');
  const declared = flow.indexOf('const cleaned = useMemo');
  const firstUse = flow.search(/\bcleaned\b(?!\s*=)/);
  assert.ok(declared !== -1 && declared < flow.indexOf('saveOnboardingProgress({'), 'declared above the progress save effect');
  assert.ok(declared <= firstUse || flow.slice(firstUse, firstUse + 20).includes('const cleaned'));
});

test('saved onboarding progress is restored once per account, never on every step change', () => {
  const flow = readFileSync('frontend/src/pages/onboarding/OnboardingFlow.jsx', 'utf8');
  const effect = flow.slice(flow.indexOf('fetchOnboardingProgress(session?.access_token)'));
  const deps = effect.match(/\}, \[(loading, isSignedIn[^\]]+)\]\);/)?.[1] || '';
  assert.ok(deps.includes('progressRetry') && deps.includes('user?.id'));
  assert.doesNotMatch(deps, /\bstepId\b/, 'a step change must not re-read the (debounced) saved step');
  assert.match(flow, /stepIdRef\.current === 'welcome' && saved\.stepId !== 'welcome'/);
});

test('half-finished accounts: signed-in users skip signup, pass a confirmation wait, and keep their own shortlist', () => {
  const fs = require('node:fs');
  const read = (p) => fs.readFileSync(p, 'utf8');
  const account = read('frontend/src/pages/onboarding/screens/CreateAccount.jsx');
  assert.match(account, /goToStep\('plan', \{ replace: true \}\)/);
  assert.match(read('frontend/src/components/onboarding/ObKit.jsx'), /login && !isSignedIn/);
  const platba = read('frontend/src/pages/onboarding/screens/Platba.jsx');
  assert.match(platba, /returnTo: '\/onboarding\/hotovo'/);
  assert.match(platba, /ALREADY_SUBSCRIBED/);
  assert.match(read('frontend/src/pages/onboarding/screens/Activated.jsx'), /onboardingComplete === false/);
  const prefs = read('frontend/src/lib/searchPrefs.js');
  assert.match(prefs, /const scoped = /);
  assert.match(read('frontend/src/components/AuthContext.jsx'), /setPrefsOwner\(latestUserRef\.current\)/);
});

test('signed-in users get no second sign-in/sign-up, and Welcome never overwrites saved progress', () => {
  const fs = require('node:fs');
  const read = (p) => fs.readFileSync(p, 'utf8');
  assert.match(read('frontend/src/pages/Login.jsx'), /if \(isSignedIn && !submitted\) return <SignedInNotice \/>/);
  assert.match(read('frontend/src/pages/SignUp.jsx'), /if \(isSignedIn && !submitted\) return <SignedInNotice \/>/);
  assert.match(read('frontend/src/pages/onboarding/screens/Welcome.jsx'), /!isSignedIn &&/);
  assert.match(read('frontend/src/pages/onboarding/OnboardingFlow.jsx'), /if \(stepId === 'welcome'\) return undefined;/);
});
