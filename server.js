const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const {
  QUESTIONS,
  MONTHLY_LIMIT,
  DEFAULT_MODEL,
  validateAnswers,
  requestMatches,
  usagePeriod,
} = require('./lib/questionnaire');
const { scoreSchools } = require('./lib/matching');
const { districtOfSchool } = require('./lib/pragueDistricts');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// The service role key bypasses Row Level Security, which is exactly why the
// browser must never see it. It lives only here, and it is what lets this
// server read the schools table that RLS blocks everyone else from touching.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.warn(
    '\n[!] SUPABASE_SERVICE_ROLE_KEY is missing from .env.\n' +
      '    Once RLS is enabled, requests for school data will return nothing.\n' +
      '    Copy it from Supabase: Project Settings -> API -> service_role.\n'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  SERVICE_KEY || process.env.SUPABASE_KEY
);

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// The AI questionnaire runs through OpenRouter. The key stays here and never
// reaches the browser — an AI endpoint callable from the client is a bill
// anyone on the internet can run up.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

// Accounts that skip the trial entirely, for development and demos.
// This lives in .env — on the server — precisely so that it cannot be a
// checkbox on the signup form. A checkbox would let any visitor grant
// themselves the product for free.
const DEVELOPER_EMAILS = (process.env.DEVELOPER_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

function isDeveloperEmail(email) {
  return DEVELOPER_EMAILS.includes((email || '').toLowerCase());
}

app.use(cors({ origin: FRONTEND_URL }));

// Rate limiting keys off the caller's IP. Behind a proxy (Render, Railway,
// nginx) every request arrives from the proxy's own address, so Express has to
// be told to read X-Forwarded-For instead — otherwise the whole internet shares
// one bucket. Left off locally on purpose: trusting that header without a proxy
// in front lets anyone spoof their IP and walk straight past the limiter.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Generous enough that a real student browsing schools never notices, tight
// enough that a script scraping the whole database gets cut off.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho požadavků. Zkus to prosím za chvíli.' },
});

// Checkout creates a Stripe session each time it is called, so it gets its own
// much smaller budget.
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů o platbu. Zkus to prosím později.' },
});

// Every questionnaire submission is a paid AI call, so it gets a much tighter
// budget than ordinary reads. This is the guard against a script; the monthly
// quota below is the guard against cost. They are different problems: a limiter
// caps the rate, a quota caps the total.
const questionnaireLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů. Zkus to prosím za hodinu.' },
});

app.use('/api/', apiLimiter);

// Stripe signs the exact bytes it sent, so this route needs the raw body and
// must be registered before express.json() parses it into an object.
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

app.use(express.json());

/* ---------------------------------------------------------------------------
 * Middleware
 * ------------------------------------------------------------------------- */

// Confirms the caller is who they say they are, by handing their token back to
// Supabase for verification. A forged or expired token fails here.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Chybí přihlášení.' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Neplatné nebo vypršelé přihlášení.' });
  }

  // With "Confirm email" switched on in Supabase, an unconfirmed account never
  // receives a session, so this rarely fires. It is here because that setting
  // is a checkbox in someone else's dashboard: if it is ever off, or a session
  // was issued before it was turned on, the trial would be handed out to an
  // address nobody has proved they own.
  if (!data.user.email_confirmed_at) {
    return res.status(403).json({
      error: 'Účet ještě není potvrzený — zkontroluj svůj e-mail.',
      code: 'EMAIL_NOT_CONFIRMED',
    });
  }

  req.user = data.user;
  next();
}

// Confirms the account is still inside its trial or has an active subscription.
// This is the paywall: it runs on every request for school data, so bypassing
// the frontend gains nothing.
async function requireAccess(req, res, next) {
  if (isDeveloperEmail(req.user.email)) {
    req.profile = { subscription_status: 'developer' };
    return next();
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('trial_expires_at, subscription_status, created_at')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(403).json({ error: 'Profil účtu nenalezen.' });
  }

  const trialActive = new Date(profile.trial_expires_at) > new Date();
  const subscribed = profile.subscription_status === 'active';

  if (!trialActive && !subscribed) {
    // 402 Payment Required — the frontend turns this into the paywall screen.
    return res.status(402).json({
      error: 'Zkušební období skončilo.',
      code: 'PAYMENT_REQUIRED',
    });
  }

  req.profile = profile;
  next();
}

/* ---------------------------------------------------------------------------
 * Public
 * ------------------------------------------------------------------------- */

app.get('/', (req, res) => {
  res.json({ message: 'School App Backend is running!' });
});

app.get('/test-db', async (req, res) => {
  const { count, error } = await supabase
    .from('schools')
    .select('*', { count: 'exact', head: true });

  if (error) {
    res.status(500).json({ status: 'Supabase error', error: error.message });
  } else {
    res.json({ status: 'Connected successfully!', schoolCount: count });
  }
});

/* ---------------------------------------------------------------------------
 * Account
 * ------------------------------------------------------------------------- */

const PROFILE_COLUMNS =
  'id, email, name, created_at, trial_expires_at, subscription_status, stripe_subscription_id';

app.get('/api/me', requireAuth, async (req, res) => {
  let { data: profile, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });

  // Changing an email updates auth.users, but the copy in public.users was
  // written once by the signup trigger and would otherwise stay stale forever.
  // req.user.email comes from the verified token, so it is the authority here.
  if (profile.email !== req.user.email) {
    const { data: synced } = await supabase
      .from('users')
      .update({ email: req.user.email })
      .eq('id', profile.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (synced) profile = synced;
  }

  // Promote allowlisted accounts on first sight, so the stored status matches
  // what the allowlist says and RLS agrees with the API.
  if (isDeveloperEmail(profile.email) && profile.subscription_status !== 'developer') {
    const { data: promoted } = await supabase
      .from('users')
      .update({ subscription_status: 'developer' })
      .eq('id', profile.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (promoted) profile = promoted;
  }

  const isDeveloper = profile.subscription_status === 'developer';
  const trialActive = new Date(profile.trial_expires_at) > new Date();
  const subscribed = profile.subscription_status === 'active';

  res.json({
    ...profile,
    isDeveloper,
    trialActive,
    subscribed,
    hasAccess: isDeveloper || trialActive || subscribed,
    trialDaysLeft: trialActive
      ? Math.ceil((new Date(profile.trial_expires_at) - new Date()) / 86400000)
      : 0,
  });
});

// The only profile field a user may change about themselves. Everything else on
// the row — the trial window, the subscription status, the Stripe ids — decides
// whether they have paid, so it is writable only by the Stripe webhook and the
// signup trigger. Accepting `req.body` wholesale here would hand out the
// product for free, which is also why RLS grants the browser no UPDATE policy.
app.patch('/api/me', requireAuth, async (req, res) => {
  if (typeof req.body?.name !== 'string') {
    return res.status(400).json({ error: 'Chybí jméno.' });
  }

  const name = req.body.name.trim();
  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Jméno musí mít 2 až 80 znaků.' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', req.user.id)
    .select('id, name')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GDPR erasure. Deleting the auth account cascades to public.users and
// favorites (both foreign-key it with ON DELETE CASCADE), so this one call
// removes everything we hold. It needs the admin API, hence the service key.
app.delete('/api/me', requireAuth, async (req, res) => {
  if (!SERVICE_KEY) {
    return res.status(503).json({ error: 'Mazání účtu není nastavené.' });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_subscription_id')
    .eq('id', req.user.id)
    .single();

  // Cancel before deleting: once the account is gone the webhook can no longer
  // match the customer back to a row, and the card would keep being charged
  // for a subscription nobody can see or cancel.
  if (stripe && profile?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      // An already-cancelled or unknown subscription must not block erasure —
      // the user asked for their data to be gone and that is the stronger duty.
      console.error('Stripe cancel during account deletion failed:', err.message);
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).end();
});

/* ---------------------------------------------------------------------------
 * Schools — behind the paywall
 * ------------------------------------------------------------------------- */

/**
 * Adds `match_score` to every school, recomputed from the caller's most recent
 * questionnaire answers. Schools come back untouched — no key at all — when the
 * account has never submitted the questionnaire.
 *
 * Recomputed rather than stored. `scoreSchools` is pure arithmetic over rows we
 * already hold: no network call, no model, no cost. Writing a score row per
 * school per run would duplicate the whole schools table on every submission
 * for nothing, and push the PostgREST row ceiling closer.
 *
 * This is a plain database read and costs no questionnaire allowance — the same
 * rule as re-reading stored results. Nothing here touches `readUsage` or writes
 * a `questionnaire_runs` row.
 *
 * Because the number is recomputed, changing the weights in matching.js moves
 * these scores while the `score`/`breakdown` frozen onto an old
 * questionnaire_runs row stay as they were. That divergence is expected, and is
 * why the run keeps its own breakdown and signals: it can still explain the
 * number it was showing at the time.
 *
 * Scoring is absolute rather than relative to the other results, so scoring one
 * school alone gives the same percentage as scoring it among all of them. That
 * is what lets the detail page pass a single row through here.
 */
/**
 * Attaches the school's správní obvod ("Praha 1".."Praha 22"), derived from its
 * coordinates.
 *
 * ⚠️ This cannot be parsed out of `location`. A Czech postal address names a
 * *městský obvod* (1–10), a different division from the 22 *správní obvody* the
 * app asks about — they disagree for 18 of the 60 schools. Doing it here, once,
 * is what keeps the search filter and the questionnaire naming the same
 * district for the same school.
 *
 * Applied to every school response, not just scored ones: the search filter
 * needs it whether or not the student has taken the questionnaire.
 * An ungeocoded school gets `null` and simply never matches a district filter.
 */
function withDistricts(schools) {
  return schools.map((school) => ({
    ...school,
    district: districtOfSchool(school),
  }));
}

/**
 * The one set of answers that decides match percentages for this account.
 *
 * An account can hold many completed sets; exactly one of them scores the whole
 * database. Which one is `is_default`, and the ordering below is the entire
 * definition of "which set is in use" — every percentage anywhere in the app
 * traces back through here, so it must not be expressed twice.
 *
 * `is_default desc` first, `created_at desc` second, so **no set being flagged
 * is a valid state meaning "the newest one"**. That matters in three places:
 * rows that predate the column keep scoring exactly as they did with no
 * backfill, a brand-new account's first set works before it has been flagged,
 * and archiving the default falls back instead of dropping every percentage in
 * the app at once.
 *
 * Archived sets are excluded, so they stop scoring the moment they are put away
 * without being destroyed.
 */
function scoringRunQuery(userId, columns) {
  return supabase
    .from('questionnaire_runs')
    .select(columns)
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function withMatchScores(userId, schools) {
  const { data: run, error } = await scoringRunQuery(userId, 'answers');

  // Degrading to "no scores" is the right behaviour — a percentage is a nice
  // extra, not a reason to fail the whole schools page. But without this line a
  // broken query and a student who never took the questionnaire look identical,
  // and every percentage in the app would quietly vanish with nothing to find.
  if (error) console.error('match scores: could not read scoring run', error.message);

  // District is attached before the early return on purpose: the search page's
  // district filter needs it for every visitor, including one who has never
  // taken the questionnaire and so has no scores at all.
  const located = withDistricts(schools);

  if (!run?.answers) return located;

  // scoreSchools returns its own ranked order; mapping by id keeps the caller's
  // ordering (name, or the favourites order) exactly as it was. It is handed
  // `located` rather than `schools` so matching.js reuses the district already
  // computed here instead of repeating the point-in-polygon work per school.
  const scores = new Map(
    scoreSchools(run.answers, located).map((match) => [match.school_id, match.score])
  );

  return located.map((school) => ({
    ...school,
    match_score: scores.get(school.id),
  }));
}

app.get('/api/schools', requireAuth, requireAccess, async (req, res) => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(await withMatchScores(req.user.id, data));
});

app.get('/api/schools/:id', requireAuth, requireAccess, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: error.message });

  const [school] = await withMatchScores(req.user.id, [data]);
  res.json(school);
});

/* ---------------------------------------------------------------------------
 * Favourites
 * ------------------------------------------------------------------------- */

app.get('/api/favorites', requireAuth, requireAccess, async (req, res) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('school_id, schools (*)')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  const schools = data.map((row) => row.schools).filter(Boolean);
  res.json(await withMatchScores(req.user.id, schools));
});

app.post('/api/favorites', requireAuth, requireAccess, async (req, res) => {
  const schoolId = Number(req.body?.schoolId);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: req.user.id, school_id: schoolId });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ schoolId });
});

// Removing a favourite stays available after the trial ends, so an expired
// account is never locked out of deleting its own data.
app.delete('/api/favorites/:schoolId', requireAuth, async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', req.user.id)
    .eq('school_id', schoolId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

/* ---------------------------------------------------------------------------
 * AI questionnaire
 * ------------------------------------------------------------------------- */

// Developers are exempt so the feature stays testable without burning a real
// month's allowance every time something changes.
function isUnlimited(req) {
  return req.profile?.subscription_status === 'developer';
}

/**
 * How much of the current allowance period is left.
 *
 * The period runs from the account's signup anniversary, not the first of the
 * calendar month, so someone who joins on the 28th gets ten runs that day
 * rather than a fresh allowance three days later. See `usagePeriod`.
 *
 * Counted from the stored rows rather than tracked in a column, so there is no
 * counter that can drift out of step with reality and nothing to reset on a
 * schedule — the window simply moves.
 */
async function readUsage(req) {
  if (isUnlimited(req)) {
    return { used: 0, limit: null, remaining: null, unlimited: true, resetsAt: null };
  }

  const period = usagePeriod(req.profile?.created_at);

  const { count, error } = await supabase
    .from('questionnaire_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .gte('created_at', period.start.toISOString());

  if (error) throw new Error(error.message);

  const used = count ?? 0;
  return {
    used,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    unlimited: false,
    resetsAt: period.end.toISOString(),
  };
}

/**
 * Turns a stored questionnaire_runs row into the shape the results screen
 * renders: current school rows joined on, and every score recomputed.
 *
 * Shared by GET /api/questionnaire and GET /api/questionnaire/runs/:id because
 * both render through the same components. Two copies of this is how one surface
 * ends up rescoring and the other showing frozen numbers for the same set.
 */
async function buildRunResult(run) {
  // Schools are joined in here rather than stored on the run, so a school that
  // was renamed or re-scraped shows its current details instead of a stale copy
  // frozen at the time of the run.
  const ids = run.matches.map((match) => match.school_id);
  const { data: schools } = await supabase.from('schools').select('*').in('id', ids);

  // Attached so matching.js's districtOf reuses the value instead of repeating
  // the point-in-polygon work per school. Scores are identical either way — it
  // falls back to the same geometry — this just stops the questionnaire being
  // the one surface that pays for it twice.
  const located = withDistricts(schools || []);
  const byId = new Map(located.map((school) => [school.id, school]));
  // A school deleted since the run would otherwise render as an empty card.
  const present = run.matches.filter((match) => byId.has(match.school_id));

  // Scored again from the school rows just fetched, for the same reason those
  // rows are fetched at all: search, favourites and the detail page all
  // recompute, and one school reading 71% there and 64% here is a contradiction
  // the student can see. A re-scrape or a weight change in matching.js is enough
  // to cause it.
  //
  // The run itself is not rewritten. What is stored stays the historical record
  // of what this run saw; the fresh score, breakdown and signals live only in
  // this response — and they travel together, so the numbers sent out always
  // explain each other.
  const rescored = new Map(
    scoreSchools(
      run.answers,
      present.map((match) => byId.get(match.school_id))
    ).map((match) => [match.school_id, match])
  );

  return {
    id: run.id,
    label: run.label ?? null,
    created_at: run.created_at,
    is_default: Boolean(run.is_default),
    archived_at: run.archived_at ?? null,
    answers: run.answers,
    // The stored set of schools is kept exactly as it is. Re-selecting a new
    // top 8 would put schools on the page that no reason was ever written for,
    // and the AI sentence is the whole point of this list.
    //
    // Reordered by the fresh score though: leaving the old order would let rank
    // 1 show a lower percentage than rank 2. `reason` comes from the stored
    // match and the new score from a lookup by school_id, never by position, so
    // a sentence cannot end up under the wrong school.
    matches: present
      .map((match) => ({
        ...match,
        ...rescored.get(match.school_id),
        school: byId.get(match.school_id),
      }))
      .sort((a, b) => b.score - a.score),
  };
}

// The questions live on the server so there is one definition of what a valid
// answer is, and it is the one the validator uses.
app.get('/api/questionnaire', requireAuth, requireAccess, async (req, res) => {
  try {
    const usage = await readUsage(req);

    // Re-reading your existing results is free and unmetered — it is a database
    // read, not an AI call. Only submitting new answers costs anything.
    const { data: active } = await scoringRunQuery(
      req.user.id,
      'id, label, answers, matches, created_at, is_default'
    );

    // The full set list, for the history page. `answers` is included because
    // that is what the list distinguishes sets by — the digest beside each one
    // is built from it. `matches` is deliberately left out: nothing in the list
    // shows a percentage, so there is no second number that could disagree with
    // the one on the results page.
    const { data: runs } = await supabase
      .from('questionnaire_runs')
      .select('id, label, created_at, is_default, archived_at, answers')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    res.json({
      questions: QUESTIONS,
      usage,
      // Named `active` rather than `latest`: with a default set it is no longer
      // necessarily the newest one, and calling it that was the bug waiting to
      // happen.
      active: active ? await buildRunResult(active) : null,
      runs: runs || [],
      configured: Boolean(OPENROUTER_API_KEY),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  '/api/questionnaire',
  questionnaireLimiter,
  requireAuth,
  requireAccess,
  async (req, res) => {
    if (!OPENROUTER_API_KEY) {
      return res.status(503).json({
        error: 'Dotazník zatím není nastavený.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    const validation = validateAnswers(req.body?.answers);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    let usage;
    try {
      usage = await readUsage(req);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    // Checked here and nowhere else that matters. The frontend hides the button
    // when the allowance runs out, but that is only to explain — this is what
    // actually stops the call from happening.
    if (!usage.unlimited && usage.remaining <= 0) {
      return res.status(429).json({
        error: `Tento měsíc jsi dotazník využil ${usage.used}× z ${usage.limit}. Další pokusy budou k dispozici od prvního dne dalšího měsíce.`,
        code: 'QUOTA_EXCEEDED',
        usage,
      });
    }

    // Full rows, not just the four fields the prompt uses: the same objects are
    // handed back to the frontend as result cards, and they must match the
    // shape GET returns or the two paths render differently.
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .order('name');

    if (schoolsError) {
      return res.status(500).json({ error: schoolsError.message });
    }
    if (!schools?.length) {
      return res.status(503).json({ error: 'V databázi zatím nejsou žádné školy.' });
    }

    let matches;
    try {
      ({ matches } = await requestMatches({
        answers: validation.answers,
        schools,
        apiKey: OPENROUTER_API_KEY,
        model: OPENROUTER_MODEL,
        referer: FRONTEND_URL,
      }));
    } catch (err) {
      console.error('Questionnaire match failed:', err.message);
      // The upstream message can carry provider detail that means nothing to a
      // student, so it is logged rather than shown. Nothing is written to
      // questionnaire_runs on this path, so a failed call costs no allowance.
      return res.status(502).json({
        error: 'Vyhodnocení dotazníku se nepodařilo. Zkus to prosím znovu.',
        code: 'AI_FAILED',
      });
    }

    const { data: run, error: insertError } = await supabase
      .from('questionnaire_runs')
      .insert({
        user_id: req.user.id,
        answers: validation.answers,
        matches,
        model: OPENROUTER_MODEL,
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // A new set becomes the one that scores the database. This keeps the app
    // behaving as it always has — finishing the questionnaire and finding the
    // percentages unchanged would read as the submission not having worked.
    // Choosing an *older* set is the explicit action, done from the set list,
    // and it survives every later submission until it is changed again.
    await setDefaultRun(req.user.id, run.id);

    const byId = new Map(schools.map((school) => [school.id, school]));

    res.status(201).json({
      run: {
        id: run.id,
        label: null,
        created_at: run.created_at,
        is_default: true,
        archived_at: null,
        answers: validation.answers,
        matches: matches.map((match) => ({
          ...match,
          school: byId.get(match.school_id),
        })),
      },
      usage: await readUsage(req),
    });
  }
);

/* ---------------------------------------------------------------------------
 * Managing sets of answers
 *
 * Naming, choosing the default and archiving are database writes, not AI calls,
 * so none of them touch readUsage — managing what you already have must never
 * cost allowance.
 *
 * They require `requireAuth` but deliberately NOT `requireAccess`. An account
 * whose trial has lapsed still has to be able to tidy up and erase its own
 * answers; that is the same reasoning behind the DELETE policy in
 * supabase-setup.sql. Only the route that reads school rows needs access.
 *
 * Every one of them scopes its write with `.eq('user_id', req.user.id)`, which
 * is what stops an id belonging to somebody else's account from being touched.
 * ------------------------------------------------------------------------- */

/**
 * Clears whichever set was default and flags this one.
 *
 * Two statements, in this order. The partial unique index in supabase-setup.sql
 * allows one `is_default` row per account, so setting before clearing would be
 * rejected. If the process dies between them the account has no default, which
 * the resolver reads as "the newest set" — a graceful landing rather than a
 * broken one, which is why this does not need a transaction.
 */
async function setDefaultRun(userId, runId) {
  const { error: clearError } = await supabase
    .from('questionnaire_runs')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);

  if (clearError) throw new Error(clearError.message);

  const { error: setError } = await supabase
    .from('questionnaire_runs')
    .update({ is_default: true })
    .eq('id', runId)
    .eq('user_id', userId);

  if (setError) throw new Error(setError.message);
}

// Reads the caller's own set, or null. Used by the routes below so an id from
// another account is indistinguishable from one that does not exist.
async function ownRun(userId, rawId, columns = 'id, is_default, archived_at') {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return null;

  const { data } = await supabase
    .from('questionnaire_runs')
    .select(columns)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  return data ?? null;
}

app.get('/api/questionnaire/runs/:id', requireAuth, requireAccess, async (req, res) => {
  try {
    const run = await ownRun(
      req.user.id,
      req.params.id,
      'id, label, answers, matches, created_at, is_default, archived_at'
    );
    if (!run) return res.status(404).json({ error: 'Tato sada odpovědí neexistuje.' });

    res.json({ run: await buildRunResult(run) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const LABEL_MAX = 60;

app.patch('/api/questionnaire/runs/:id', requireAuth, async (req, res) => {
  if (typeof req.body?.label !== 'string') {
    return res.status(400).json({ error: 'Chybí název.' });
  }

  const trimmed = req.body.label.trim();
  if (trimmed.length > LABEL_MAX) {
    return res.status(400).json({ error: `Název může mít nejvýš ${LABEL_MAX} znaků.` });
  }

  const run = await ownRun(req.user.id, req.params.id);
  if (!run) return res.status(404).json({ error: 'Tato sada odpovědí neexistuje.' });

  // Clearing the name is a real choice, not a validation failure: the set falls
  // back to being labelled by its date and answers, which it always can be.
  const { data, error } = await supabase
    .from('questionnaire_runs')
    .update({ label: trimmed || null })
    .eq('id', run.id)
    .eq('user_id', req.user.id)
    .select('id, label')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/questionnaire/runs/:id/default', requireAuth, async (req, res) => {
  const run = await ownRun(req.user.id, req.params.id);
  if (!run) return res.status(404).json({ error: 'Tato sada odpovědí neexistuje.' });

  // An archived set is excluded from the resolver, so flagging one would leave
  // the account with a default that scores nothing.
  if (run.archived_at) {
    return res.status(409).json({
      error: 'Archivovanou sadu nelze nastavit jako výchozí. Nejdřív ji vrať z archivu.',
    });
  }

  try {
    await setDefaultRun(req.user.id, run.id);
    res.json({ id: run.id, is_default: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/questionnaire/runs/:id/archive', requireAuth, async (req, res) => {
  if (typeof req.body?.archived !== 'boolean') {
    return res.status(400).json({ error: 'Chybí příznak archivace.' });
  }

  const run = await ownRun(req.user.id, req.params.id);
  if (!run) return res.status(404).json({ error: 'Tato sada odpovědí neexistuje.' });

  // Refused rather than silently repointing scoring at another set. Archiving
  // the default would move every percentage in the app, which is too large a
  // consequence to hide inside a tidy-up action.
  if (req.body.archived && run.is_default) {
    return res.status(409).json({
      error:
        'Tuhle sadu používáš pro výpočet shody. Nejdřív nastav jako výchozí jinou sadu, pak ji můžeš archivovat.',
    });
  }

  const { data, error } = await supabase
    .from('questionnaire_runs')
    .update({ archived_at: req.body.archived ? new Date().toISOString() : null })
    .eq('id', run.id)
    .eq('user_id', req.user.id)
    .select('id, archived_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ---------------------------------------------------------------------------
 * Payments
 * ------------------------------------------------------------------------- */

app.post('/api/checkout', checkoutLimiter, requireAuth, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({
      error: 'Platby zatím nejsou nastavené.',
      code: 'STRIPE_NOT_CONFIGURED',
    });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', req.user.id)
    .single();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : req.user.email,
      success_url: `${FRONTEND_URL}/?platba=ok`,
      cancel_url: `${FRONTEND_URL}/predplatne`,
      // Ties the Stripe session back to our account when the webhook fires.
      client_reference_id: req.user.id,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscription state is only ever written here, from a Stripe-signed event.
// Nothing the browser sends can grant itself access.
async function handleStripeWebhook(req, res) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).end();
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature failed: ${err.message}`);
  }

  const object = event.data.object;

  if (event.type === 'checkout.session.completed') {
    await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        stripe_customer_id: object.customer,
        stripe_subscription_id: object.subscription,
      })
      .eq('id', object.client_reference_id);
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const status = object.status === 'active' ? 'active' : 'canceled';
    await supabase
      .from('users')
      .update({ subscription_status: status })
      .eq('stripe_customer_id', object.customer);
  }

  res.json({ received: true });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
