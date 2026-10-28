const { rankingPayload } = require('./lib/betaRankings');
const { registerBetaAdmin } = require('./lib/betaAdminRoutes');
const { registerCreatorLinks } = require('./lib/creatorLinks');
const { betaLimitOptions } = require('./lib/betaLimits');
const { cleanupBetaScreenshots } = require('./lib/betaMaintenance');
const { closingPayload, reviewPayload } = require('./lib/betaClosing');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('node:fs');
const path = require('node:path');
const { logAiUsage } = require('./lib/aiUsage');
const { sanitizeEvent, visitorTicket, verifyVisitorTicket, feedbackDetails } = require('./lib/betaAnalytics');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const {
  QUESTIONS,
  REASON_COUNT,
  DEFAULT_MODEL,
  validateAnswers,
  requestMatches,
  requestReasons,
} = require('./lib/questionnaire');
const { scoreSchools } = require('./lib/matching');
const season = require('./lib/season');
const {
  ACCESS_END, DEADLINE, SEASON_TRIAL_DAYS, MONTHLY_PRICE, TERMS_VERSION,
  REFERRAL_DISCOUNT, REFERRAL_REWARD, REFERRAL_MIN_PRICE, REFERRAL_SETTLE_DAYS, WITHDRAWAL_DAYS,
  SPRING_PRICE, SPRING_ADDON_FROM, seasonPriceCzk, isSpring, onSale, monthlyAvailable, trialAvailable,
  monthlyQuote, springAddOnCzk, proRataOwedMinor,
} = season;
const { districtOfSchool } = require('./lib/pragueDistricts');
const { shouldHold } = require('./lib/reviewFilter');
const {
  validateOnboardingAnswers,
  translateOnboardingAnswers,
  isScoreable,
} = require('./lib/onboardingAnswers');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;
const COMMUTE_MATRIX_PATH = path.join(__dirname, 'lib', 'data', 'commute-matrix.json');
let commuteMatrix = null;
try {
  const loadedMatrix = JSON.parse(fs.readFileSync(COMMUTE_MATRIX_PATH, 'utf8'));
  if (
    typeof loadedMatrix.feedDate === 'string' &&
    Array.isArray(loadedMatrix.stops) &&
    loadedMatrix.schools &&
    typeof loadedMatrix.schools === 'object' &&
    !Array.isArray(loadedMatrix.schools)
  ) commuteMatrix = loadedMatrix;
  else throw new Error('matrix shape is invalid');
} catch (error) {
  console.warn(`[commute] matrix unavailable; commute endpoints return 503 (${error.message})`);
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SCHOOL_REVIEWS_ENABLED = process.env.SCHOOL_REVIEWS_ENABLED === 'true';
// Link sharing (shortlist shares, results/payment links, parent handoffs,
// pre-account snapshots) is off during the beta, server-side too: creating a
// link and opening one both answer 404. Owners can still list and revoke
// links they made earlier. Turn on with SHARING_ENABLED=true together with the
// frontend flag and the privacy text for these flows (LEGAL-03).
const SHARING_ENABLED = process.env.SHARING_ENABLED === 'true';
const requireSharing = (req, res, next) => (SHARING_ENABLED ? next() : res.status(404).json({ error: 'Sdílení odkazem je během beta testování vypnuté.' }));

// The service role key bypasses Row Level Security, which is exactly why the
// browser must never see it. It lives only here, and it is what lets this
// server read the schools table that RLS blocks everyone else from touching.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BETA_TICKET_SECRET = process.env.BETA_TICKET_SECRET || (process.env.NODE_ENV !== 'production' ? SERVICE_KEY : null);

if (!SERVICE_KEY) {
  console.warn(
    '\n[!] SUPABASE_SERVICE_ROLE_KEY is missing from .env.\n' +
      '    With RLS enabled, requests for school data will return nothing.\n' +
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

const BETA_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const BETA_FEEDBACK_TYPES = new Set(['bug', 'idea', 'comment']);
const BETA_FEEDBACK_MIN = 10;
const BETA_FEEDBACK_MAX = 4000;

async function readBetaSettings() {
  return supabase
    .from('beta_program_settings')
    .select('ends_at, access_hours, feedback_form_url')
    .eq('singleton', true)
    .single();
}

function betaProgramState(settings, now = new Date()) {
  const endsAt = settings?.ends_at ? new Date(settings.ends_at) : null;
  const active = Boolean(endsAt && Number.isFinite(endsAt.getTime()) && endsAt > now);
  let feedbackFormUrl = null;
  if (typeof settings?.feedback_form_url === 'string') {
    try {
      const url = new URL(settings.feedback_form_url);
      if (url.protocol === 'https:' && !url.username && !url.password) {
        feedbackFormUrl = url.href;
      }
    } catch {
      // An invalid optional URL is never exposed as a working link.
    }
  }
  return {
    programEndsAt: endsAt?.toISOString() ?? null,
    accessHours: Number.isInteger(settings?.access_hours) ? settings.access_hours : 48,
    programActive: active,
    feedbackFormUrl,
  };
}

function betaAccessState(profile, settings, now = new Date()) {
  const program = betaProgramState(settings, now);
  const rollingUntil = profile?.tester_access_until ? new Date(profile.tester_access_until) : null;
  const effectiveMs = rollingUntil && program.programEndsAt
    ? Math.min(rollingUntil.getTime(), new Date(program.programEndsAt).getTime())
    : NaN;
  const active = profile?.subscription_status === 'beta' && program.programActive &&
    Number.isFinite(effectiveMs) && effectiveMs > now.getTime();
  return {
    ...program,
    effectiveAccessUntil: Number.isFinite(effectiveMs) ? new Date(effectiveMs).toISOString() : null,
    hasAccess: active,
    expired: Boolean(profile?.subscription_status === 'beta' && program.programActive && !active),
    programEnded: !program.programActive,
  };
}

// One definition of "this account is paid up", used by both the middleware and
// /api/me. Beta access is checked separately and is never a permanent paid status.
function hasPaidStatus(status) {
  return status === 'active' || status === 'season' || status === 'developer';
}

// A paid status alone is not enough: hasPaidStatus('season') would otherwise
// return true forever, with nothing recording when that season pass actually
// ends. If a single webhook is ever missed, access must not silently become
// permanent — so access_expires_at makes expiry self-enforcing instead of
// webhook-dependent. 'developer' never expires; a legacy row with a paid status
// but no access_expires_at (pre-migration) is treated as still active rather
// than retroactively locked out.
function paidAccessActive(profile) {
  if (profile.subscription_status === 'past_due') {
    return Boolean(
      profile.access_expires_at && new Date(profile.access_expires_at) > new Date()
    );
  }
  if (!hasPaidStatus(profile.subscription_status)) return false;
  if (profile.subscription_status === 'developer') return true;
  if (!profile.access_expires_at) return true;
  return new Date(profile.access_expires_at) > new Date();
}


// A monthly plan whose cancellation is pending still runs until its period
// ends, so it counts as live (the way back is "Obnovit", never a second subscription).
function hasLivePlan(profile) {
  const seasonScheduled = profile?.plan_id === 'season' && Boolean(profile.season_charge_due_at);
  return paidAccessActive(profile) || seasonScheduled;
}

// Access ends at whichever comes first: a scheduled cancellation, or the end of
// the period actually paid for. Both are optional on a Stripe subscription
// object depending on its state, so either side of the min() can be absent.
function accessEndsAt(sub) {
  const cancelAt = sub.cancel_at ? sub.cancel_at * 1000 : null;
  // Webhook events use the endpoint's API version (2026-08-26.dahlia), where
  // current_period_end lives on the subscription items, not the subscription.
  // The SDK's own calls (pinned 2024-04-10) still return the old top-level field.
  const periodEndSec = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const periodEnd = periodEndSec ? periodEndSec * 1000 : null;
  const ms =
    cancelAt && periodEnd ? Math.min(cancelAt, periodEnd) : cancelAt ?? periodEnd;
  return ms ? new Date(ms).toISOString() : null;
}

// Maps Stripe's subscription status onto our own subscription_status values.
// planId matters only for 'active': a season pass in its paid (post-trial)
// state is 'season', not 'active', because hasPaidStatus() and the UI both
// need to tell "one-time, already fully paid" apart from "recurring, still
// billing every month".
function mapStripeStatus(stripeStatus, planId) {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return planId === 'season' ? 'season' : 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    default:
      // incomplete, incomplete_expired, canceled, paused
      return 'canceled';
  }
}

app.use(cors({ origin: FRONTEND_URL }));

// Rate limiting keys off the caller's IP. Behind a proxy every request arrives
// from the proxy's own address, so Express has to be told to read
// X-Forwarded-For instead. Left off locally on purpose: trusting that header
// without a proxy in front lets anyone spoof their IP past the limiter.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Outer per-IP budget only. A class on one school Wi-Fi shares an IP, so this
// is sized for ~30 students at once; costly routes have their own per-user limits.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho požadavků. Zkus to prosím za chvíli.' },
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů o platbu. Zkus to prosím později.' },
});

// The user id is known because this limiter is mounted after requireAuth;
// students behind the same school network get independent feedback quotas.
const betaFeedbackLimiter = rateLimit(betaLimitOptions('feedback'));
const betaScreenshotLimiter = rateLimit(betaLimitOptions('screenshot'));
const betaMicroLimiter = rateLimit(betaLimitOptions('micro'));
const betaGateLimiter = rateLimit(betaLimitOptions('gate'));
const betaClosingLimiter = rateLimit(betaLimitOptions('closing'));

// Every questionnaire submission is a paid AI call. This guards the *rate*;
// the monthly quota below guards the *total*. Different problems.
const questionnaireLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů. Zkus to prosím za hodinu.' },
});

// On-demand explanations cost one small model call each; key them by the
// authenticated account so students on the same school network do not share a
// quota.
const questionnaireExplainLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // The results page fills #2–#10 through this route after every submission.
  limit: 60,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho vysvětlení. Zkus to prosím za hodinu.' },
});

// Posting/reporting reviews and data-corrections. Low limit on purpose — a
// genuine student writes a handful of these ever, not fifteen an hour.
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů. Zkus to prosím za hodinu.' },
});

// Picks/notes/points writes are cheap DB operations, not AI calls — this just
// stops a runaway client-side loop, not casual use (reordering 3 schools a
// dozen times while deciding is normal).
const decisionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů. Zkus to prosím za hodinu.' },
});

// GET /api/shared/:token has no auth at all, so this is what stops the token
// space from being walked by brute force. 128-bit tokens make that infeasible
// regardless, but a limiter costs nothing and removes the need to rely on that
// alone.
const shareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů. Zkus to prosím za hodinu.' },
});


// Anonymous link creation is more expensive than a read and can otherwise
// leave unbounded rows behind. Public reads use shareLimiter.
const anonLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
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

  // An auth-service outage or throttle is not a bad token: answer 503 so the browser keeps
  // its session (it signs itself out on 401).
  if (error && (error.name === 'AuthRetryableFetchError' || error.status === 429 || error.status >= 500)) {
    return res.status(503).json({ error: 'Přihlášení teď nejde ověřit. Zkus to prosím za chvíli.' });
  }
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Neplatné nebo vypršelé přihlášení.' });
  }

  // With "Confirm email" switched on in Supabase, an unconfirmed account never
  // receives a session, so this rarely fires. It is here because that setting
  // is a checkbox in someone else's dashboard: if it is ever off, the trial
  // would be handed out to an address nobody has proved they own.
  if (!data.user.email_confirmed_at) {
    return res.status(403).json({
      error: 'Účet ještě není potvrzený — zkontroluj svůj e-mail.',
      code: 'EMAIL_NOT_CONFIRMED',
    });
  }

  req.user = data.user;
  next();
}

// Independent of paid/developer access. The browser never receives this list.
const ADMIN_EMAILS = new Set((process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
function requireAdmin(req, res, next) {
  if (!ADMIN_EMAILS.has((req.user.email || '').toLowerCase())) return res.status(403).json({error:'Tato stránka je jen pro správce.'});
  next();
}
// Anonymous visit counter: device class comes from the User-Agent header and is
// only ever counted per day. No IP, user id or cookie is stored.
const visitLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
app.post('/api/visit', visitLimiter, async (req, res) => {
  const ua = String(req.get('user-agent') || '');
  if (!ua || /bot|crawl|spider|headless|preview|lighthouse|monitor/i.test(ua)) return res.status(204).end();
  const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet'
    : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  await supabase.rpc('bump_visit', { p_device: device });
  res.status(204).end();
});

registerCreatorLinks(app, supabase, { requireAuth, requireAdmin, saveOnboardingRun });
registerBetaAdmin(app, supabase, [requireAuth, requireAdmin]);

/**
 * Identifies the caller if they happen to be signed in, and shrugs if they are
 * not. Used only by the schools routes, which are deliberately open right now
 * (see the note above them) — a signed-in visitor gets match percentages, an
 * anonymous one gets the same school rows without them.
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  const { data } = await supabase.auth.getUser(token);
  if (data?.user?.email_confirmed_at) req.user = data.user;
  next();
}

// Usage recording needs the enrollment consent and must not be switched off
// in Nastavení. select('*') so a missing tracking_paused_at column (SQL not
// yet applied) reads as "not paused" instead of failing the profile.
const trackingOn = (row) => Boolean(row?.consent_tracking_at && !row?.tracking_paused_at);

async function closingStateFor(userId) {
  const sync=await supabase.rpc('sync_beta_closing',{p_user_id:userId});
  if (sync.error) return {error:sync.error};
  const {data,error}=await supabase.from('beta_profile').select('*').eq('user_id',userId).single();
  return {error,betaTrackingNoticeAccepted:trackingOn(data),betaTrackingPaused:Boolean(data?.tracking_paused_at),closingDueAt:data?.closing_due_at,closingDoneAt:data?.closing_done_at,
    closingPaused:Boolean(data?.closing_due_at && !data.closing_done_at && new Date(data.closing_due_at).getTime()+86400000<=Date.now())};
}

// Chunk 4: the ordinary trial window opens once, on the first confirmed request
// that reads the profile. The RPC only touches a 'trialing' row with no window,
// so parallel first requests share one window and later sign-ins never extend it.
async function ensureTrialStarted(userId, profile) {
  if (profile.trial_expires_at || profile.subscription_status !== 'trialing') return profile;
  const started = await supabase.rpc('start_ordinary_trial', { p_user_id: userId });
  if (started.error) return profile; // no window recorded means no trial access
  const { data } = await supabase.from('users').select('trial_expires_at').eq('id', userId).single();
  return data ? { ...profile, trial_expires_at: data.trial_expires_at } : profile;
}

// An account with an active purchase but no completion marker (the Stripe event
// that should have set it was lost, reordered or failed) is completed here, so a
// paid account is never stuck in onboarding. Needs a ledger row: no purchase, no heal.
async function healOnboarding(userId, profile) {
  if (profile.onboarding_completed_at || !['trialing', 'active', 'season', 'past_due'].includes(profile.subscription_status)) return profile;
  const { data: purchase } = await supabase.from('purchases').select('id')
    .eq('user_id', userId).eq('status', 'active').in('plan', ['season', 'monthly', 'spring'])
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!purchase?.id) return profile;
  const { data: done } = await supabase.rpc('complete_paid_onboarding', { p_user_id: userId, p_purchase_id: purchase.id });
  return done === true ? { ...profile, onboarding_completed_at: new Date().toISOString() } : profile;
}

// One account-access rule shared by protected routes and public result links.
async function accessStateFor(userId, email) {
  let { data: profile, error } = await supabase
    .from('users')
    .select('trial_expires_at, subscription_status, access_expires_at, tester_access_until, tester_school_code, created_at, gender, onboarding_completed_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { hasAccess: false, httpStatus: 403, body: { error: 'Profil účtu nenalezen.' }, profile: null };
  }

  profile = await ensureTrialStarted(userId, profile);
  profile = await healOnboarding(userId, profile);

  if (profile.subscription_status === 'beta') {
    const { data: settings, error: settingsError } = await readBetaSettings();
    if (settingsError || !settings) {
      return {
        hasAccess: false,
        httpStatus: 503,
        body: {
          error: 'Beta přístup se teď nepodařilo ověřit. Zkus to prosím později.',
          code: 'BETA_SETTINGS_UNAVAILABLE',
        },
        profile,
      };
    }
    const closing=await closingStateFor(userId);
    if (closing.error) return {hasAccess:false,httpStatus:503,body:{error:'Dotazník nelze ověřit.'},profile};
    if (closing.closingPaused) return {hasAccess:false,httpStatus:402,body:{error:'Nejdřív je potřeba vyplnit závěrečný dotazník.',code:'BETA_ACCESS_EXPIRED'},profile};
    const beta = betaAccessState(profile, settings);
    if (!beta.hasAccess) {
      return {
        hasAccess: false,
        httpStatus: 402,
        body: {
          error: beta.programEnded
            ? 'Beta program skončil.'
            : 'Testovací přístup se pozastavil. Zanech zpětnou vazbu a můžeš pokračovat.',
          code: beta.programEnded ? 'BETA_PROGRAM_ENDED' : 'BETA_ACCESS_EXPIRED',
        },
        profile,
      };
    }
    return { hasAccess: true, httpStatus: 200, body: null, profile };
  }

  if (profile.subscription_status === 'creator') {
    const { data: link, error: linkError } = await supabase
      .from('creator_links')
      .select('revoked_at,last_active_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (linkError) {
      return {
        hasAccess: false,
        httpStatus: 503,
        body: { error: 'Náhled pro tvůrce se teď nepodařilo ověřit.', code: 'CREATOR_ACCESS_UNAVAILABLE' },
        profile,
      };
    }
    if (!link || link.revoked_at) {
      return {
        hasAccess: false,
        httpStatus: 403,
        body: { error: 'Náhled pro tvůrce byl ukončen.', code: 'CREATOR_REVOKED' },
        profile,
      };
    }

    const lastActiveAt = Date.parse(link.last_active_at || '');
    if (!Number.isFinite(lastActiveAt) || Date.now() - lastActiveAt >= 10 * 60 * 1000) {
      void (async () => {
        try {
          const { error } = await supabase.from('creator_links')
            .update({ last_active_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('revoked_at', null);
          if (error) console.warn('Could not update creator last activity:', error.message);
        } catch (error) {
          console.warn('Could not update creator last activity:', error.message);
        }
      })();
    }
    return { hasAccess: true, httpStatus: 200, body: null, profile };
  }

  if (isDeveloperEmail(email)) {
    return {
      hasAccess: true,
      httpStatus: 200,
      body: null,
      profile: { ...profile, subscription_status: 'developer' },
    };
  }

  if (!profile.onboarding_completed_at) {
    return {
      hasAccess: false,
      httpStatus: 403,
      body: { error: 'Nejdřív dokonči úvodní průchod a ověřený nákup.', code: 'ONBOARDING_INCOMPLETE' },
      profile,
    };
  }

  const trialActive = new Date(profile.trial_expires_at) > new Date();
  if (!trialActive && !paidAccessActive(profile)) {
    return {
      hasAccess: false,
      httpStatus: 402,
      body: { error: 'Zkušební období skončilo.', code: 'PAYMENT_REQUIRED' },
      profile,
    };
  }

  return { hasAccess: true, httpStatus: 200, body: null, profile };
}

async function requireAccess(req, res, next) {
  const access = await accessStateFor(req.user.id, req.user.email);
  if (!access.hasAccess) return res.status(access.httpStatus).json(access.body);
  req.profile = access.profile;
  return next();
}

/* ---------------------------------------------------------------------------
 * Public
 * ------------------------------------------------------------------------- */

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// School invite links are attribution tags, not a secret security boundary.
// Existing known schools remain resolvable after the cutoff so signed-up
// testers can still reach sign-in, settings and the ended-program message.
app.get('/api/beta/schools/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!BETA_CODE_PATTERN.test(code)) {
    return res.status(404).json({ error: 'Přístupový kód neplatí.', code: 'BETA_INVITE_NOT_FOUND' });
  }

  const { data: school, error: schoolError } = await supabase
    .from('beta_schools')
    .select('code, school_name')
    .eq('code', code)
    .single();
  if (schoolError || !school) {
    return res.status(schoolError?.code === 'PGRST116' ? 404 : 503).json({
      error: schoolError?.code === 'PGRST116' ? 'Přístupový kód neplatí.' : 'Testovací přístup se nepodařilo ověřit.',
      code: schoolError?.code === 'PGRST116' ? 'BETA_INVITE_NOT_FOUND' : 'BETA_SETTINGS_UNAVAILABLE',
    });
  }

  const { data: settings, error: settingsError } = await readBetaSettings();
  if (settingsError || !settings) {
    return res.status(503).json({ error: 'Testovací přístup se nepodařilo ověřit.', code: 'BETA_SETTINGS_UNAVAILABLE' });
  }

  res.set('Cache-Control', 'no-store');
  res.json({
    ...school,
    ...betaProgramState(settings),
    trackingTicket: betaProgramState(settings).programActive
      ? (req.query?.notice === '1' && ['8','9','rodic','ucitel','jine'].includes(req.query?.role)
        ? visitorTicket(BETA_TICKET_SECRET, code, req.query?.anon) : null) : null,
    serverNow: new Date().toISOString(),
  });
});

const betaEventsLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
async function requireBetaTester(req, res, next) {
  const { data, error } = await supabase.from('users')
    .select('id, created_at, subscription_status, tester_school_code, tester_access_until')
    .eq('id', req.user.id).single();
  if (error || !data) return res.status(503).json({ error: 'Beta účet nelze ověřit.' });
  if (data.subscription_status !== 'beta') return res.status(403).json({ error: 'Tento účet není zapojený do testování.' });
  req.betaUser = data;
  next();
}
app.get('/api/beta/me', requireAuth, requireBetaTester, async (req, res) => {
  const sync=await supabase.rpc('sync_beta_closing',{p_user_id:req.user.id});
  if (sync.error) return res.status(503).json({error:'Dotazník nelze ověřit.'});
  const [profile, feedback] = await Promise.all([
    supabase.from('beta_profile').select('*').eq('user_id', req.user.id).single(),
    supabase.from('beta_feedback').select('id, kind, page_url, message, status, admin_reply, replied_at, reply_read_at, created_at, source')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(100),
  ]);
  if (profile.error || feedback.error) return res.status(503).json({ error: 'Testování se nepodařilo načíst.' });
  const feedbackRows = feedback.data || [];
  const unreadReplies = feedbackRows.filter((item) => item.admin_reply != null && (
    item.reply_read_at == null || (item.replied_at != null && Date.parse(item.reply_read_at) < Date.parse(item.replied_at))
  )).length;
  res.json({ ...profile.data, feedback: feedbackRows, unreadReplies });
});
app.post('/api/beta/feedback/replies/read', requireAuth, requireBetaTester, async (req, res) => {
  const { error } = await supabase.from('beta_feedback')
    .update({ reply_read_at: new Date().toISOString() })
    .eq('user_id', req.user.id)
    .not('admin_reply', 'is', null);
  if (error) return res.status(500).json({ error: 'Zprávy se nepodařilo označit přečtenými.' });
  res.status(204).end();
});
// The "Záznam používání" switch in Nastavení. Off = consent withdrawn: nothing
// more is recorded and this account's recorded usage (events, rankings) is
// deleted. Testing access and written feedback are unaffected. On = recording
// resumes (only for an account that gave consent at enrollment).
app.post('/api/beta/tracking', requireAuth, requireBetaTester, async (req, res) => {
  const enabled = req.body?.enabled;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Chybí volba.' });
  const current = await supabase.from('beta_profile').select('*').eq('user_id', req.user.id).single();
  if (current.error) return res.status(503).json({ error: 'Testování nelze ověřit.' });
  if (!current.data?.consent_tracking_at) return res.status(403).json({ error: 'Nejdřív je potřeba potvrdit seznámení s testováním.' });
  const { error } = await supabase.from('beta_profile')
    .update({ tracking_paused_at: enabled ? null : new Date().toISOString() })
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: 'Nastavení záznamu se nepodařilo uložit.' });
  if (!enabled) {
    for (const table of ['beta_events', 'beta_rankings']) {
      const { error: deleteError } = await supabase.from(table).delete().eq('user_id', req.user.id);
      if (deleteError) return res.status(500).json({ error: 'Záznam je vypnutý, ale dosavadní data se nepodařilo smazat. Zkus to prosím znovu.' });
    }
  }
  res.json({ enabled });
});

app.post('/api/beta/profile', requireAuth, requireBetaTester, async (req, res) => {
  const { role, role_note: rawNote, tracking_notice_accepted: accepted } = req.body || {};
  if (!['8','9','rodic','ucitel','jine'].includes(role) || accepted !== true) return res.status(400).json({ error: 'Je potřeba vybrat roli a potvrdit seznámení s testováním.' });
  const roleNote = role === 'jine' && typeof rawNote === 'string' ? rawNote.trim().slice(0, 80) || null : null;
  const { error } = await supabase.from('beta_profile').update({ role, role_note: roleNote, consent_tracking_at: new Date().toISOString() })
    .eq('user_id', req.user.id).is('consent_tracking_at', null);
  if (error) return res.status(500).json({ error: 'Informace nelze uložit.' });
  res.status(204).end();
});
let betaSchoolNamesCache=null, betaSchoolNamesLoading=null;
async function betaSchoolNames() {
  if (betaSchoolNamesCache && betaSchoolNamesCache.until>Date.now()) return {data:betaSchoolNamesCache.names,error:null};
  if (!betaSchoolNamesLoading) betaSchoolNamesLoading=supabase.from('schools').select('name').is('merged_into',null).is('hidden_reason',null).then(result=>{
    if (!result.error) betaSchoolNamesCache={names:result.data || [],until:Date.now()+86400000};
    return result;
  }).finally(()=>{betaSchoolNamesLoading=null;});
  return betaSchoolNamesLoading;
}
const betaRankingsLimiter=rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-7',legacyHeaders:false,keyGenerator:req=>req.user.id});
app.post('/api/beta/rankings',requireAuth,requireBetaTester,betaRankingsLimiter,async(req,res)=>{
  const ranking=rankingPayload(req.body?.ranking), capture=req.body?.capture_id;
  if (!ranking || !/^[a-f0-9-]{36}$/.test(capture || '') || req.body?.source!=='onboarding') return res.status(400).json({error:'Pořadí nemá správný formát.'});
  const notice=await supabase.from('beta_profile').select('*').eq('user_id',req.user.id).single();
  if(notice.error)return res.status(503).json({error:'Testování nelze ověřit.'});
  if(!trackingOn(notice.data))return res.status(403).json({error:'Záznam používání je vypnutý nebo nepotvrzený.'});
  if(req.body?.ticket){
    const visit=verifyVisitorTicket(BETA_TICKET_SECRET,req.body.ticket,req.body.anon_id);
    if(!visit || visit.code!==req.betaUser.tester_school_code)return res.status(403).json({error:'Pořadí nepatří k této pozvánce.'});
  }
  const settings=await readBetaSettings();
  if(settings.error)return res.status(503).json({error:'Testování nelze ověřit.'});
  if(!betaProgramState(settings.data).programActive)return res.status(410).json({error:'Testování skončilo.'});
  let schools;
  try{schools=await fetchAllSchools('id');}catch{return res.status(503).json({error:'Školy nelze ověřit.'});}
  const known=new Set(schools.map(s=>s.id));
  if(ranking.some(id=>!known.has(id)))return res.status(400).json({error:'Pořadí obsahuje neznámou školu.'});
  const saved=await supabase.from('beta_rankings').upsert({user_id:req.user.id,source:'onboarding',run_id:null,capture_id:capture,ranking},{onConflict:'user_id,capture_id',ignoreDuplicates:true});
  if(saved.error)return res.status(500).json({error:'Pořadí nelze uložit.'});
  res.status(204).end();
});
app.post('/api/beta/events', betaEventsLimiter, async (req, res) => {
  const body = req.body || {};
  const token = req.headers.authorization?.replace(/^Bearer /, '') || body.token;
  let user = null;
  if (token) {
    const auth = await supabase.auth.getUser(token);
    if (auth.error && (auth.error.name === 'AuthRetryableFetchError' || auth.error.status === 429 || auth.error.status >= 500)) {
      return res.status(503).json({ error: 'Přihlášení teď nejde ověřit. Zkus to prosím za chvíli.' });
    }
    if (auth.error || !auth.data?.user?.email_confirmed_at) return res.status(401).json({ error: 'Neplatné přihlášení.' });
    user = auth.data.user;
  }
  const ticket = verifyVisitorTicket(BETA_TICKET_SECRET, body.ticket, body.anon_id);
  if (!/^[a-f0-9-]{36}$/.test(body.anon_id || '') || !/^[a-f0-9-]{36}$/.test(body.session_id || '') ||
      !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 40) {
    return res.status(400).json({ error: 'Neplatné události.' });
  }
  let profile = null;
  if (user) {
    const result = await supabase.from('users').select('subscription_status, tester_school_code').eq('id', user.id).single();
    if (result.error) return res.status(503).json({ error: 'Účet nelze ověřit.' });
    profile = result.data;
    if (profile?.subscription_status !== 'beta') return res.status(403).json({ error: 'Sledování je pouze pro beta testery.' });
    const notice=await supabase.from('beta_profile').select('*').eq('user_id',user.id).single();
    if (notice.error) return res.status(503).json({error:'Upozornění nelze ověřit.'});
    if (!trackingOn(notice.data)) return res.status(403).json({error:'Záznam používání je vypnutý nebo nepotvrzený.'});
  } else if (!ticket) return res.status(403).json({ error: 'Chybí testovací přístup.' });
  const settings = await readBetaSettings();
  if (settings.error) return res.status(503).json({ error: 'Testování nelze ověřit.' });
  if (!betaProgramState(settings.data).programActive) return res.status(410).json({ error: 'Testování skončilo.' });
  const events = body.events.map(sanitizeEvent);
  if (events.some((event) => !event)) return res.status(400).json({ error: 'Neznámá nebo příliš velká událost.' });
  // A free-form search is kept only when it is actually part of a school name.
  // Unknown queries still retain their length/result count, never personal text.
  if (events.some((e) => e.props.query)) {
    const names = await betaSchoolNames();
    if (names.error) return res.status(503).json({ error: 'Události nelze ověřit.' });
    const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const event of events) if (event.props.query && !(names.data || []).some((s) => fold(s.name).includes(fold(event.props.query)))) delete event.props.query;
  }
  const result = await supabase.rpc('record_beta_events', {
    p_user_id: user?.id || null, p_anon_id: body.anon_id, p_session_id: body.session_id,
    p_events: events, p_join: Boolean(user && ticket && ticket.code === profile.tester_school_code),
  });
  if (result.error) return res.status(result.error.code==='42501'?403:500).json({ error: 'Události nelze uložit.' });
  res.status(204).end();
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
  'id, email, name, created_at, trial_expires_at, subscription_status, ' +
  'stripe_subscription_id, access_expires_at, plan_id, season_charge_due_at, cancel_at_period_end, ' +
  'plan_started_at, last_paid_at, theme_palette, theme_mode, gender, tester_school_code, ' +
  'tester_access_until, tester_guidance_seen_at, onboarding_completed_at';

// Statutory 14 days (§1829 OZ), counted from the order: checkout is when the
// contract is concluded, and a trial's conversion does not open a new window
// (CJEU C-565/22 Sofatutor). Minors' guardians have a manual 30-day route (Terms §7).
function withdrawalWindowEnd(profile) {
  return profile.plan_started_at
    ? new Date(new Date(profile.plan_started_at).getTime() + WITHDRAWAL_DAYS * 86400000)
    : null;
}

function canWithdraw(profile) {
  const planLive =
    (['season', 'spring'].includes(profile.plan_id) && ['trialing', 'season'].includes(profile.subscription_status)) ||
    (profile.plan_id === 'monthly' && ['active', 'past_due'].includes(profile.subscription_status));
  const end = withdrawalWindowEnd(profile);
  return planLive && Boolean(end) && end > new Date();
}

// What Settings needs to draw the subscription section: the way back after a
// cancellation, a blocked trial waiting for a decision, the saved card.
async function paymentSummaryFor(userId, profile, now) {
  const [{ data: purchases }, eligible, savedCard] = await Promise.all([
    supabase.from('purchases')
      .select('id, plan, status, trial, cancel_requested_at, season_charge_status, price_amount_minor, needs_payment_confirmation, access_ends_at')
      .eq('user_id', userId).in('status', ['pending', 'active']).order('created_at', { ascending: false }).limit(5),
    trialEligible(userId, now),
    savedCardSummary(userId),
  ]);
  const rows = Array.isArray(purchases) ? purchases : [];
  const pending = rows.find((p) => p.status === 'pending' && p.needs_payment_confirmation);
  // The scheduled charge at the end of a running trial: when, and how much.
  const runningTrial = profile.plan_id === 'season' && profile.subscription_status === 'trialing'
    ? rows.find((p) => p.status === 'active' && p.plan === 'season' && p.trial && !p.cancel_requested_at && p.access_ends_at)
    : null;
  let restoreKind = null;
  let restore = {};
  if (profile.plan_id === 'monthly' && profile.cancel_at_period_end && paidAccessActive(profile) && now < DEADLINE) {
    restoreKind = 'monthly';
  } else if (profile.subscription_status === 'canceled') {
    const trial = rows.find((p) => p.status === 'active' && p.plan === 'season' && p.trial && p.cancel_requested_at
      && p.season_charge_status === 'canceled' && p.access_ends_at && new Date(p.access_ends_at) > now);
    if (trial) {
      restoreKind = 'season';
      restore = { restoreChargeAt: trial.access_ends_at, restorePriceCzk: trial.price_amount_minor / 100 };
    }
  }
  return {
    trialEligible: eligible,
    savedCard,
    canRestore: Boolean(restoreKind),
    restoreKind,
    ...restore,
    needsPaymentConfirmation: Boolean(pending),
    pendingPurchase: pending ? { priceCzk: pending.price_amount_minor / 100 } : null,
    trialCharge: runningTrial ? { chargeAt: runningTrial.access_ends_at, priceCzk: runningTrial.price_amount_minor / 100 } : null,
  };
}

app.get('/api/me', requireAuth, async (req, res) => {
  let { data: profile, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  profile = await ensureTrialStarted(req.user.id, profile);
  profile = await healOnboarding(req.user.id, profile);

  let onboardingStep = 'welcome';
  if (!profile.onboarding_completed_at) {
    const { data: progress, error: progressError } = await supabase
      .from('onboarding_progress')
      .select('step_id')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (progressError) return res.status(503).json({ error: 'Pokračování v onboardingu se nepodařilo ověřit.' });
    onboardingStep = progress?.step_id || onboardingStep;
  }

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
  if (
    !['beta', 'creator'].includes(profile.subscription_status) &&
    isDeveloperEmail(profile.email) &&
    profile.subscription_status !== 'developer'
  ) {
    const { data: promoted } = await supabase
      .from('users')
      .update({ subscription_status: 'developer' })
      .eq('id', profile.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (promoted) profile = promoted;
  }

  const isTester = profile.subscription_status === 'beta';
  const isCreator = profile.subscription_status === 'creator';
  const now = new Date();
  const isDeveloper = !isTester && !isCreator && profile.subscription_status === 'developer';
  let beta = null;
  let creatorAccess = null;
  if (isTester) {
    const { data: settings, error: settingsError } = await readBetaSettings();
    if (settingsError || !settings) {
      return res.status(503).json({
        error: 'Beta přístup se teď nepodařilo ověřit. Zkus to prosím později.',
        code: 'BETA_SETTINGS_UNAVAILABLE',
      });
    }
    const closing=await closingStateFor(req.user.id);
    if (closing.error) return res.status(503).json({error:'Dotazník nelze ověřit.'});
    beta = {...betaAccessState(profile, settings, now),...closing};
    if (closing.closingPaused) beta.hasAccess=false;
  }
  if (isCreator) {
    creatorAccess = await accessStateFor(req.user.id, req.user.email);
    if (creatorAccess.httpStatus === 503) return res.status(503).json(creatorAccess.body);
  }
  const trialActive = !isTester && !isCreator && new Date(profile.trial_expires_at) > now;
  const subscribed = !isTester && !isCreator && paidAccessActive(profile);
  const onboardingComplete = Boolean(profile.onboarding_completed_at) || isDeveloper || isTester || isCreator;
  const hasAccess = isTester
    ? beta.hasAccess
    : isCreator
      ? creatorAccess.hasAccess
      : onboardingComplete && (trialActive || subscribed);
  const payment = isTester || isCreator || isDeveloper ? {} : await paymentSummaryFor(req.user.id, profile, now);

  res.json({
    ...profile,
    ...payment,
    onboardingCompletedAt: profile.onboarding_completed_at,
    onboardingStep,
    onboardingComplete,
    isTester,
    isCreator,
    isDeveloper,
    trialActive,
    subscribed,
    canWithdraw: !isTester && !isCreator && canWithdraw(profile),
    withdrawalEndsAt: isTester || isCreator ? null : withdrawalWindowEnd(profile),
    hasAccess,
    trialDaysLeft: trialActive && !subscribed
      ? Math.ceil((new Date(profile.trial_expires_at) - new Date()) / 86400000)
      : 0,
    ...(beta ? beta : {}),
    ...(beta ? {
      betaProgramEndsAt: beta.programEndsAt,
      betaAccessHours: beta.accessHours,
      betaProgramActive: beta.programActive,
      betaFeedbackFormUrl: beta.feedbackFormUrl,
    } : {}),
    serverNow: now.toISOString(),
  });
});

// Only a user's name, appearance and form-of-address preferences are self-editable. Billing
// fields decide whether they have paid, so they remain writable only by the
// Stripe webhook and signup trigger. Accepting `req.body` wholesale here would
// hand out the product for free, which is also why RLS grants no browser UPDATE.
app.patch('/api/me', requireAuth, async (req, res) => {
  const body = req.body || {};
  const update = {};
  const hasName = Object.hasOwn(body, 'name');
  const hasPalette = Object.hasOwn(body, 'theme_palette');
  const hasMode = Object.hasOwn(body, 'theme_mode');
  const hasGender = Object.hasOwn(body, 'gender');

  if (!hasName && !hasPalette && !hasMode && !hasGender) {
    return res.status(400).json({ error: 'Není co uložit.' });
  }

  if (hasName) {
    if (typeof body.name !== 'string') {
      return res.status(400).json({ error: 'Chybí jméno.' });
    }

    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Jméno musí mít 2 až 80 znaků.' });
    }
    update.name = name;
  }

  if (hasPalette) {
    if (!['znacka', 'smrk', 'zvyraznovac', 'terakota'].includes(body.theme_palette)) {
      return res.status(400).json({ error: 'Neplatný vzhled.' });
    }
    update.theme_palette = body.theme_palette;
  }

  if (hasMode) {
    if (!['system', 'light', 'dark'].includes(body.theme_mode)) {
      return res.status(400).json({ error: 'Neplatný vzhled.' });
    }
    update.theme_mode = body.theme_mode;
  }

  if (hasGender) {
    if (body.gender !== null && !['m', 'f'].includes(body.gender)) {
      return res.status(400).json({ error: 'Neplatný způsob oslovení.' });
    }
    update.gender = body.gender;
  }

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', req.user.id)
    .select('id, name, theme_palette, theme_mode, gender')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// The "check your inbox" screen asks this whether the link was opened anywhere
// (another browser, a phone). Keyed by the unguessable id signUp returned, not
// the e-mail, so it cannot be used to probe which addresses have accounts.
app.get('/api/auth/confirmation/:userId', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.userId)) return res.status(400).json({ error: 'Neplatný požadavek.' });
  if (!SERVICE_KEY) return res.status(503).json({ error: 'Ověření není nastavené.' });
  const { data, error } = await supabase.auth.admin.getUserById(req.params.userId);
  if (error || !data?.user) return res.json({ confirmed: false });
  res.json({ confirmed: Boolean(data.user.email_confirmed_at) });
});

// Account erasure: remove billing/Storage data before deleting auth and its
// cascading account rows. Beta contributions may be retained in the separate
// minimised archive under the founder's D4 choice; it is not guaranteed anonymous.
app.delete('/api/me', requireAuth, async (req, res) => {
  if (!SERVICE_KEY) {
    return res.status(503).json({ error: 'Mazání účtu není nastavené.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_subscription_id, stripe_customer_id, subscription_status')
    .eq('id', req.user.id)
    .single();

  if (profileError) return res.status(500).json({ error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' });
  if (profile?.subscription_status === 'creator') {
    return res.status(403).json({ error: 'Účet s náhledem pro tvůrce spravuje Střední na míru.' });
  }

  // Cancel before deleting: once the account is gone the webhook can no longer
  // match the customer back to a row, and the card would keep being charged
  // for a subscription nobody can see or cancel.
  if (profile?.stripe_subscription_id) {
    if (!stripe) return res.status(503).json({ error: 'Zrušení předplatného není nastavené. Účet zatím nebyl smazán.' });
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      }
    } catch (err) {
      // A confirmed missing subscription cannot charge again. Network/auth/API
      // failures do not prove that: retain the account mapping so cancellation
      // can be retried rather than orphaning an active subscription.
      if (err.type !== 'StripeInvalidRequestError' || err.code !== 'resource_missing') {
        console.error('Stripe cancel during account deletion failed:', err.message);
        return res.status(502).json({ error: 'Předplatné se nepodařilo zrušit. Účet zatím nebyl smazán; zkus to prosím znovu.' });
      }
    }
  }

  // Deleting the Stripe customer removes the saved card and their personal data
  // at Stripe (payment records Stripe must keep by law remain there). Same
  // retry-safe rule as above: on a real failure keep the account so this can be
  // retried, because once the row is gone we can no longer find the customer.
  if (profile?.stripe_customer_id) {
    if (!stripe) return res.status(503).json({ error: 'Smazání platebních údajů není nastavené. Účet zatím nebyl smazán.' });
    try {
      await stripe.customers.del(profile.stripe_customer_id);
    } catch (err) {
      if (err.type !== 'StripeInvalidRequestError' || err.code !== 'resource_missing') {
        console.error('Stripe customer delete during account deletion failed:', err.message);
        return res.status(502).json({ error: 'Platební údaje se nepodařilo smazat. Účet zatím nebyl smazán; zkus to prosím znovu.' });
      }
    }
  }

  // Feedback screenshots are stored under "<user id>/" and are not covered by
  // the database cascade. Remove them first; on failure keep the account so the
  // deletion can be retried instead of leaving the images behind.
  // List every page first (storage lists at most 1000 per call, and removing while
  // paging would shift the offsets), then remove in batches.
  const bucket = supabase.storage.from('beta-screenshots');
  const screenshotFailure = { error: 'Snímky ze zpětné vazby se nepodařilo smazat. Účet zatím nebyl smazán; zkus to prosím znovu.' };
  const screenshotPaths = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: page, error: listError } = await bucket.list(req.user.id, { limit: 1000, offset });
    if (listError) return res.status(502).json(screenshotFailure);
    screenshotPaths.push(...(page || []).map((f) => `${req.user.id}/${f.name}`));
    if (!page || page.length < 1000) break;
  }
  for (let i = 0; i < screenshotPaths.length; i += 1000) {
    const { error: removeError } = await bucket.remove(screenshotPaths.slice(i, i + 1000));
    if (removeError) return res.status(502).json(screenshotFailure);
  }

  // Beta feedback, closing answers and the website review are kept without the
  // account id unless the user ticked "delete them too". Screenshots are never kept.
  let archivedIds = [];
  if (req.body?.delete_contributions !== true) {
    const { data: archived, error: archiveError } = await supabase.rpc('archive_beta_contributions', { p_user_id: req.user.id });
    if (archiveError) return res.status(500).json({ error: 'Zpětnou vazbu se nepodařilo uložit bez vazby na účet. Účet zatím nebyl smazán; zkus to prosím znovu.' });
    archivedIds = Array.isArray(archived) ? archived : [];
  }

  const { error } = await supabase.auth.admin.deleteUser(req.user.id);
  if (error) {
    // The account may still exist, so the next try archives (or deletes) from
    // scratch: take this try's archive copy back out first. Only when the account
    // is confirmed present; a deletion that did succeed keeps its copy.
    if (archivedIds.length) {
      const { data: still, error: lookupError } = await supabase.auth.admin.getUserById(req.user.id);
      if (!lookupError && still?.user) {
        const { error: undoError } = await supabase.rpc('remove_beta_archive_rows', { p_ids: archivedIds });
        if (undoError) console.error('Archive copy of a failed account deletion could not be removed:', undoError.code || 'database unavailable');
      }
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(204).end();
});

app.post('/api/beta/feedback', requireAuth, betaFeedbackLimiter, async (req, res) => {
  const { page_url: pageUrl, message } = req.body || {};
  const enhanced = req.body?.kind !== undefined;
  const details = enhanced ? feedbackDetails(req.body, req.user.id) : null;
  const type = enhanced ? (details?.kind === 'bug' ? 'bug' : ['navrh','funkce'].includes(details?.kind) ? 'idea' : 'comment') : req.body?.type;
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const safePage = typeof pageUrl === 'string' && pageUrl.length <= 512 &&
    pageUrl.startsWith('/') && !pageUrl.startsWith('//') &&
    !/[?#\u0000-\u001f]/.test(pageUrl) && !pageUrl.includes('://');

  if (
    !BETA_FEEDBACK_TYPES.has(type) || (enhanced && !details) ||
    cleanMessage.length < BETA_FEEDBACK_MIN ||
    cleanMessage.length > BETA_FEEDBACK_MAX ||
    !safePage
  ) {
    return res.status(400).json({ error: 'Zpráva nebo stránka nemá správný formát.', code: 'BETA_FEEDBACK_INVALID' });
  }

  if (details?.screenshot_path) {
    const object = await supabase.storage.from('beta-screenshots').info(details.screenshot_path);
    if (object.error || !object.data || !Number.isInteger(object.data.size) || object.data.size < 1 || object.data.size > 1572864 || !['image/png','image/jpeg'].includes(object.data.contentType)) {
      return res.status(400).json({ error: 'Snímek není platný nebo ještě nebyl nahrán.' });
    }
  }
  const { data, error } = await supabase.rpc(enhanced ? 'submit_beta_feedback_details' : 'submit_beta_feedback', {
    p_user_id: req.user.id,
    p_type: type,
    p_page_url: pageUrl,
    p_message: cleanMessage,
    ...(enhanced ? { p_details: details } : {}),
  });
  if (error) {
    if (error.code === '42501') {
      return res.status(403).json({ error: 'Tento účet není zapojený do beta testování.', code: 'BETA_TESTER_REQUIRED' });
    }
    if (error.code === '22023') {
      return res.status(400).json({ error: 'Zpráva nebo stránka nemá správný formát.', code: 'BETA_FEEDBACK_INVALID' });
    }
    if (error.code === '55000') {
      return res.status(410).json({ error: 'Beta program skončil. Zpětnou vazbu už nelze odeslat.', code: 'BETA_PROGRAM_ENDED' });
    }
    console.error('Beta feedback failed:', error.message);
    return res.status(500).json({ error: 'Zpětnou vazbu se nepodařilo uložit. Zkus to prosím znovu.' });
  }
  if (!data?.testerAccessUntil) {
    return res.status(500).json({ error: 'Zpětnou vazbu se nepodařilo uložit. Zkus to prosím znovu.' });
  }
  res.status(201).json(data);
});

app.post('/api/beta/closing', requireAuth, requireBetaTester, betaClosingLimiter, async (req,res) => {
  const profile=await supabase.from('beta_profile').select('role').eq('user_id',req.user.id).single();
  if (profile.error || !profile.data) return res.status(503).json({error:'Testování nelze ověřit.'});
  const payload=closingPayload(req.body,profile.data.role);
  if (!payload) return res.status(400).json({error:'Odpovědi nebo hodnocení nemají správný formát.'});
  const {error}=await supabase.rpc('submit_beta_closing',{p_user_id:req.user.id,p_answers:payload.answers,p_review:payload.review});
  if (error) return res.status(error.code==='23505'?409:error.code==='55000'?410:500).json({error:'Dotazník nelze uložit.'});
  res.status(201).json({saved:true});
});
app.post('/api/beta/review', requireAuth, requireBetaTester, betaClosingLimiter, async (req,res) => {
  const profile=await supabase.from('beta_profile').select('role').eq('user_id',req.user.id).single();
  if (profile.error || !profile.data) return res.status(503).json({error:'Testování nelze ověřit.'});
  const review=reviewPayload(req.body?.review,profile.data.role);
  if (!review) return res.status(400).json({error:'Recenze nebo souhlas nemají správný formát.'});
  const {error}=await supabase.rpc('submit_beta_review',{p_user_id:req.user.id,p_review:review});
  if (error) {
    const status=error.code==='42501'?403:error.code==='55000'?410:error.code==='22023'?400:500;
    return res.status(status).json({error:status===410?'Beta program skončil. Recenzi už nelze odeslat.':'Recenzi se nepodařilo uložit.'});
  }
  res.status(201).json({saved:true});
});
// Quick ten-second rating after a feature is tried. Stored as feedback; the
// rating alone never renews access, the tester's own words (note or chip follow-up, 10+ characters) do.
const QUICK_FEATURES = ['dotaznik','vyhledavani','detail','porovnani','matice','prihlaska','tema','platby'];
app.post('/api/beta/micro', requireAuth, requireBetaTester, betaMicroLimiter, async (req,res) => {
  const { id, action, rating, answers, note, typed } = req.body || {};
  if (!QUICK_FEATURES.includes(id) || !['answer','skip'].includes(action)) return res.status(400).json({ error: 'Odpověď nemá správný formát.' });
  let summary = null;
  if (action === 'answer') {
    const parts = [];
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Hodnocení musí být 1 až 5.' });
      parts.push(`${rating}/5`);
    }
    if (answers !== undefined) {
      if (!Array.isArray(answers) || answers.length > 4 || answers.some((a) => typeof a !== 'string' || !a.trim() || a.length > 340)) return res.status(400).json({ error: 'Odpověď nemá správný formát.' });
      parts.push(...answers.map((a) => a.trim()));
    }
    if (note !== undefined && note !== null && note !== '') {
      if (typeof note !== 'string' || note.trim().length > 600) return res.status(400).json({ error: 'Poznámka je moc dlouhá.' });
      if (note.trim()) parts.push(note.trim());
    }
    if (!parts.length) return res.status(400).json({ error: 'Chybí odpověď.' });
    summary = parts.join(' · ');
  }
  const { data,error } = await supabase.rpc('submit_beta_micro', { p_user_id: req.user.id, p_id: id, p_session: '00000000-0000-0000-0000-000000000000', p_action: action, p_answer: summary });
  if (error) return res.status(error.code === '23505' ? 409 : error.code === '55000' ? 410 : error.code === '22023' ? 400 : 500).json({ error: 'Hodnocení teď nelze uložit.' });
  // A rating alone never renews access; the tester's own words in the optional
  // note (same minimum as a written report) do, like "Zpětná vazba" would.
  let accessRenewed = false;
  // `typed` = the free text from the chip follow-ups (already inside `answers`).
  const typedTexts = Array.isArray(typed) ? typed.slice(0, 4).filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 300)) : [];
  const words = action === 'answer' ? [typeof note === 'string' ? note.trim() : '', ...typedTexts].join(' ').trim() : '';
  if (words.length >= BETA_FEEDBACK_MIN) {
    const { data: settings } = await readBetaSettings();
    const program = betaProgramState(settings);
    if (program.programActive) {
      const { error: renewError } = await supabase.from('users')
        .update({ tester_access_until: new Date(Date.now() + program.accessHours * 3600000).toISOString() })
        .eq('id', req.user.id).eq('subscription_status', 'beta');
      accessRenewed = !renewError;
    }
  }
  res.json({ ...data, accessRenewed });
});
app.post('/api/beta/gate', requireAuth, requireBetaTester, betaGateLimiter, async (req,res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (message.length < 20 || message.length > 4000) return res.status(400).json({ error: 'Zpráva musí mít aspoň jednu větu (20 znaků).' });
  const { data,error } = await supabase.rpc('submit_beta_feedback_details', { p_user_id: req.user.id, p_type: 'comment', p_page_url: '/predplatne', p_message: message, p_details: { kind: 'obecne', source: 'gate' } });
  if (error) return res.status(error.code === '55000' ? 410 : 500).json({ error: 'Odpověď se teď nepodařilo uložit.' });
  res.status(201).json(data);
});

app.post('/api/beta/feedback/screenshot-url', requireAuth, requireBetaTester, betaScreenshotLimiter, async (req, res) => {
  const { mime, size } = req.body || {};
  if (!['image/png','image/jpeg'].includes(mime) || !Number.isInteger(size) || size < 1 || size > 1572864) {
    return res.status(400).json({ error: 'Snímek musí být PNG nebo JPEG do 1,5 MB.' });
  }
  const settings = await readBetaSettings();
  if (settings.error) return res.status(503).json({ error: 'Testování nelze ověřit.' });
  if (!betaProgramState(settings.data).programActive) return res.status(410).json({ error: 'Testování skončilo.' });
  const path = `${req.user.id}/${crypto.randomUUID()}.${mime === 'image/png' ? 'png' : 'jpg'}`;
  const { data, error } = await supabase.storage.from('beta-screenshots').createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: 'Snímek teď nelze nahrát.' });
  res.json({ path, url: data.signedUrl });
});

app.post('/api/beta/guidance-seen', requireAuth, async (req, res) => {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', req.user.id)
    .single();
  if (profileError) return res.status(500).json({ error: 'Úvodní informace se nepodařilo uložit.' });
  if (profile?.subscription_status !== 'beta') {
    return res.status(403).json({ error: 'Tento účet není zapojený do beta testování.', code: 'BETA_TESTER_REQUIRED' });
  }

  const { error } = await supabase
    .from('users')
    .update({ tester_guidance_seen_at: new Date().toISOString() })
    .eq('id', req.user.id)
    .eq('subscription_status', 'beta')
    .is('tester_guidance_seen_at', null);
  if (error) return res.status(500).json({ error: 'Úvodní informace se nepodařilo uložit.' });
  res.status(204).end();
});

/**
 * The Cermat points are the same number /prihlaska analyses picks against, so
 * the questionnaire and the onboarding quiz both copy theirs into
 * decision_profile — one number, one place. Never overwrites an 'ostra' (real
 * exam) score with the same value re-labelled 'nanecisto', and never throws:
 * the run is already saved, so a failure here is logged, not returned.
 */
async function syncJpzPoints(userId, points) {
  if (typeof points !== 'number') return;
  const { data: existing } = await supabase
    .from('decision_profile')
    .select('jpz_points, jpz_source')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.jpz_source === 'ostra' && Number(existing.jpz_points) === points) return;
  const { error } = await supabase.from('decision_profile').upsert({
    user_id: userId,
    jpz_points: points,
    jpz_source: 'nanecisto',
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('decision_profile sync failed:', error.message);
}

/**
 * Saves the ONBOARDING quiz's answers as a questionnaire_runs row, so an
 * account that signed up through the onboarding flow gets a match_score
 * everywhere withMatchScores reads one — search, school detail, /porovnani,
 * the decision matrix — instead of nothing until it separately fills out the
 * standalone questionnaire.
 *
 * `requireAuth` only, deliberately NOT `requireAccess`: this saves data the
 * user already gave us during signup, not a new AI call gated by trial
 * status. It also skips questionnaireLimiter and OPENROUTER_API_KEY — there is
 * no model call on this path, just the same deterministic scoreSchools() the
 * rest of the app already runs, so it has no cost to rate-limit and nothing to
 * degrade when the AI key is unset. source: 'onboarding' marks where the run
 * came from.
 *
 * Called once, right after a confirmed sign-in, by AuthContext's stash flush —
 * see frontend's lib/pendingOnboardingAnswers.js for why it cannot simply run
 * inside the onboarding flow itself (no session exists yet at that point).
 */
async function saveOnboardingRun(userId, rawAnswers) {
  const validation = validateOnboardingAnswers(rawAnswers);
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error }, matches: [] };
  }

  const translated = translateOnboardingAnswers(validation.answers);
  if (!isScoreable(translated)) {
    return { status: 200, body: { saved: false, reason: 'nothing_to_score' }, matches: [] };
  }

  // Same rows and joins as every other scorer (buildRunResult, POST
  // /api/questionnaire): merged duplicates excluded, school_programs present so
  // matching.js classifies school types from Cermat data.
  let schools;
  try {
    schools = await fetchAllSchools('*, school_programs(*), school_extracted_details(*)');
  } catch (err) {
    return { status: 500, body: { error: err.message }, matches: [] };
  }
  if (!schools.length) {
    return { status: 503, body: { error: 'V databázi zatím nejsou žádné školy.' }, matches: [] };
  }

  const matches = scoreSchools(translated, withDistricts(schools))
    .slice(0, 20)
    .map(({ school_id, score }) => ({ school_id, score }));

  const { data: run, error: insertError } = await supabase
    .from('questionnaire_runs')
    .insert({
      user_id: userId,
      answers: translated,
      matches,
      model: null,
      label: 'Úvodní dotazník',
      source: 'onboarding',
      is_default: false,
    })
    .select('id')
    .single();

  if (insertError) {
    // Unique violation on questionnaire_runs_one_onboarding_idx — a second tab
    // or a retry flushed the same stash after the first save already landed.
    if (insertError.code === '23505') {
      return { status: 200, body: { saved: false, reason: 'already_saved' }, matches: [] };
    }
    return { status: 500, body: { error: insertError.message }, matches: [] };
  }

  // The onboarding run is the account's first, so it becomes the default that
  // drives match percentages everywhere. Without the explicit flag it only
  // looked default because scoringRunQuery falls back to "newest" when nothing
  // is flagged — which stops being true the moment a second run exists.
  try {
    await setDefaultRun(userId, run.id);
  } catch (err) {
    console.error('onboarding run saved but could not be flagged default:', err.message);
  }

  await syncJpzPoints(userId, translated.body);

  return { status: 201, body: { saved: true }, matches };
}

app.post('/api/me/onboarding-answers', requireAuth, async (req, res) => {
  const result = await saveOnboardingRun(req.user.id, req.body?.answers);
  return res.status(result.status).json(result.body);
});

const ONBOARDING_STEPS = new Set([
  'welcome','role','stakes','calculating','reveal','commitment','proof',
  'hodnota','cesta','ucet','plan','zkusebni','platba','hotovo',
]);
const ONBOARDING_INTENTS = new Set(['srovnat','porovnat','sance','obor','rodice','terminy','dojezd']);
function validOnboardingStep(value) {
  return ONBOARDING_STEPS.has(value) || /^q([1-9]|1[01])$/.test(value || '');
}

app.get('/api/me/onboarding-progress', requireAuth, async (req, res) => {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('onboarding_completed_at')
    .eq('id', req.user.id)
    .single();
  if (profileError) return res.status(503).json({ error: 'Stav onboardingu se nepodařilo ověřit.' });
  if (profile.onboarding_completed_at) return res.json({ completed: true });

  const { data, error } = await supabase.from('onboarding_progress')
    .select('step_id,role,answers,intents,commitment,gender,plan_id,updated_at')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) return res.status(503).json({ error: 'Pokračování v onboardingu se nepodařilo načíst.' });
  res.set('Cache-Control', 'no-store');
  res.json({
    completed: false,
    stepId: data?.step_id || 'welcome',
    role: data?.role || null,
    answers: data?.answers || {},
    intents: data?.intents || [],
    commitment: data?.commitment || null,
    gender: data?.gender || null,
    planId: data?.plan_id || 'season',
    updatedAt: data?.updated_at || null,
  });
});

app.put('/api/me/onboarding-progress', requireAuth, async (req, res) => {
  const body = req.body || {};
  if (!validOnboardingStep(body.stepId)) return res.status(400).json({ error: 'Neplatný krok onboardingu.' });
  if (body.role !== null && body.role !== undefined && !['student','parent'].includes(body.role)) {
    return res.status(400).json({ error: 'Neplatná role v onboardingu.' });
  }
  const checkedAnswers = validateOnboardingAnswers(body.answers || {});
  if (!checkedAnswers.ok) return res.status(400).json({ error: checkedAnswers.error });
  if (!Array.isArray(body.intents) || body.intents.length > ONBOARDING_INTENTS.size ||
      new Set(body.intents).size !== body.intents.length || !body.intents.every((value) => ONBOARDING_INTENTS.has(value))) {
    return res.status(400).json({ error: 'Neplatný výběr v onboardingu.' });
  }
  if (body.commitment !== null && body.commitment !== undefined && !['maximalne','hodne','zjistuji'].includes(body.commitment)) {
    return res.status(400).json({ error: 'Neplatná odpověď v onboardingu.' });
  }
  if (body.gender !== null && body.gender !== undefined && !['m','f','u'].includes(body.gender)) {
    return res.status(400).json({ error: 'Neplatné oslovení v onboardingu.' });
  }
  if (!['season','monthly'].includes(body.planId)) return res.status(400).json({ error: 'Neplatný plán v onboardingu.' });
  if (JSON.stringify(body).length > 32_000) return res.status(413).json({ error: 'Rozpracovaný onboarding je příliš velký.' });

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('onboarding_completed_at')
    .eq('id', req.user.id)
    .single();
  if (profileError) return res.status(503).json({ error: 'Stav onboardingu se nepodařilo ověřit.' });
  if (profile.onboarding_completed_at) return res.status(409).json({ error: 'Tento účet už onboarding dokončil.' });

  const { error } = await supabase.from('onboarding_progress').upsert({
    user_id: req.user.id,
    step_id: body.stepId,
    role: body.role || null,
    answers: checkedAnswers.answers,
    intents: body.intents,
    commitment: body.commitment || null,
    gender: body.gender || null,
    plan_id: body.planId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) return res.status(503).json({ error: 'Rozpracovaný onboarding se nepodařilo uložit.' });
  res.status(204).end();
});

/* ---------------------------------------------------------------------------
 * Schools
 *
 * Anonymous users get the public landing-map projection and view-only detail.
 * Full catalogue data requires access, except the scoped authenticated request
 * used by an account that has not completed onboarding yet.
 * ------------------------------------------------------------------------- */

/**
 * Attaches the school's správní obvod ("Praha 1".."Praha 22"), derived from its
 * coordinates.
 *
 * ⚠️ This cannot be parsed out of `location`. A Czech postal address names a
 * *městský obvod* (1–10), a different division from the 22 *správní obvody* the
 * app asks about — they disagree for 18 of the 60 schools. Doing it here, once,
 * is what keeps the search filter and the questionnaire naming the same
 * district for the same school. An ungeocoded school gets `null`.
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
 * `is_default desc` first, `created_at desc` second, so **no set being flagged
 * is a valid state meaning "the newest one"**. Archived sets are excluded, so
 * they stop scoring the moment they are put away without being destroyed.
 *
 * This ordering is the entire definition of "which set is in use" — expressing
 * it twice is how one surface ends up scoring against a different set than
 * another.
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

/**
 * Adds `match_score` to every school, recomputed from the caller's scoring run.
 * Schools come back untouched — no key at all — when there is no signed-in user
 * or the account has never submitted the questionnaire.
 *
 * Recomputed rather than stored: `scoreSchools` is pure arithmetic over rows we
 * already hold. No network call, no model, no cost.
 */
/**
 * Supabase returns a to-one join (school_ai_summary has school_id as its
 * primary key) as an array anyway. Flattening it here means nothing
 * downstream — the frontend included — has to know it was a join at all.
 */
function withFlatAiSummary(schools) {
  return schools.map((school) => {
    if (!('school_ai_summary' in school)) return school;
    return {
      ...school,
      school_ai_summary: Array.isArray(school.school_ai_summary)
        ? school.school_ai_summary[0] ?? null
        : school.school_ai_summary ?? null,
    };
  });
}

// PostgREST caps a response at 1000 rows and truncates SILENTLY, so any
// full-table read has to page explicitly. `name` is not unique (the database
// still holds known duplicate rows), so `id` is the tiebreaker — without it
// paging can drop or repeat a row at a page boundary.
const SUPABASE_PAGE_SIZE = 1000;

// Plan 021: a merged school or one with nothing a 9th grader can apply to
// (schools.hidden_reason) never reaches a user.
function visibleSchool(s) {
  return Boolean(s) && !s.merged_into && !s.hidden_reason;
}

// Ids of schools users must not see (hidden for 9th graders, or merged away).
// Small set, read on demand; user data pointing at them is kept but not served.
async function unavailableSchoolIds() {
  const { data, error } = await supabase.from('schools').select('id, merged_into, hidden_reason');
  if (error) throw error;
  return new Set(data.filter((row) => !visibleSchool(row)).map((row) => row.id));
}

async function fetchAllSchools(select) {
  const rows = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('schools')
      .select(select)
      .is('merged_into', null)
      .is('hidden_reason', null)
      .order('name')
      .order('id')
      .range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
}

const LIST_PROGRAM_FIELDS = [
  'maturitni', 'jpz_povinna', 'typ_skoly', 'jazyk_studia',
  'kkov', 'zrizovatel', 'kapacita', 'cutoff', 'rok', 'prihlasky', 'prijati',
  // Per-obor name and study form, for the search filters.
  'obor_nazev', 'forma_vzdelavani',
  // Programmes sharing one KKOV (FOSTRA's five gymnázia) stay separate entries.
  'zamereni',
];

/**
 * One entry per distinct obor, carrying only the fields the list pages read.
 * Collapsing the years matters beyond payload size: summing `kapacita` over
 * the raw rows counts the same obor once per imported year, which overstated
 * capacity for 211 of 223 schools.
 *
 * The obor key matches frontend/src/lib/schoolPrograms.js so both sides agree
 * on what "one obor" means.
 */
function slimProgramsForList(programs) {
  const rows = programs ?? [];
  const latestYear = Math.max(0, ...rows.map((row) => row.rok ?? 0));
  const byObor = new Map();
  for (const row of rows) {
    // A program absent from the latest year is historical, not current capacity.
    if ((row.rok ?? 0) !== latestYear) continue;
    const key = [row.kkov, row.obor_nazev, row.typ_skoly, row.delka_studia, row.jazyk_studia, row.zamereni].join('|');
    const prev = byObor.get(key);
    if (!prev) {
      byObor.set(key, { ...row, cutoffs: row.cutoff != null ? [row.cutoff] : [] });
      continue;
    }
    // Several capacity groups of one obor: counts add up, cutoffs are averaged
    // within that one obor (same as frontend/src/lib/schoolPrograms.js).
    for (const f of ['kapacita', 'prihlasky', 'prijati']) {
      if (row[f] != null) prev[f] = (prev[f] ?? 0) + row[f];
    }
    if (row.cutoff != null) prev.cutoffs.push(row.cutoff);
  }
  return [...byObor.values()].map((row) => {
    const cutoff = row.cutoffs.length
      ? Math.round((row.cutoffs.reduce((s, c) => s + c, 0) / row.cutoffs.length) * 10) / 10
      : null;
    return Object.fromEntries(LIST_PROGRAM_FIELDS.map((f) => [f, f === 'cutoff' ? cutoff : row[f]]));
  });
}

/**
 * A school that merged into another (schools.merged_into) keeps its own row,
 * but its admission history belongs to the successor. Appends the predecessors'
 * school_programs to each successor so the detail page and its charts show the
 * whole history. Only for single-school / ?ids reads; the list page shows the
 * latest year only and never needs them.
 */
async function withPredecessorPrograms(schools) {
  const ids = schools.map((s) => s.id);
  if (!ids.length) return schools;
  const { data: preds, error } = await supabase
    .from('schools')
    .select('id, merged_into, school_programs(*)')
    .in('merged_into', ids);
  if (error) throw error;
  if (!preds.length) return schools;
  return schools.map((s) => ({
    ...s,
    school_programs: [
      ...(s.school_programs ?? []),
      ...preds.filter((p) => p.merged_into === s.id).flatMap((p) => p.school_programs ?? []),
    ],
  }));
}

/**
 * The ONE set of schools every match percentage is computed against.
 *
 * scoreSchools() derives each school's selectivity from the cutoffs of the
 * schools it is handed, and reads full programme rows. Scoring "just this
 * school" (detail page), "just these four" (comparison) or a slimmed list gave
 * a different number than the questionnaire result for the same school — 86 %
 * on one page, 83 % on another. Every surface now scores the whole
 * catalogue, with districts attached, and only picks its own schools out of
 * the result. Cached briefly: school data changes only on imports.
 */
const SCORING_CATALOGUE_TTL_MS = 5 * 60 * 1000;
let scoringCatalogue = { rows: null, loadedAt: 0, pending: null };

async function getScoringCatalogue() {
  const fresh = scoringCatalogue.rows && Date.now() - scoringCatalogue.loadedAt < SCORING_CATALOGUE_TTL_MS;
  if (fresh) return scoringCatalogue.rows;
  if (!scoringCatalogue.pending) {
    scoringCatalogue.pending = fetchAllSchools('*, school_programs(*), school_extracted_details(*)')
      .then((rows) => {
        scoringCatalogue = { rows: withDistricts(rows), loadedAt: Date.now(), pending: null };
        return scoringCatalogue.rows;
      })
      .catch((err) => {
        scoringCatalogue.pending = null;
        // A stale catalogue beats no percentages at all.
        if (scoringCatalogue.rows) return scoringCatalogue.rows;
        throw err;
      });
  }
  return scoringCatalogue.pending;
}

async function withMatchScores(userId, schools) {
  // District is attached first on purpose: the search page's district filter
  // needs it for every visitor, including one who is not signed in at all.
  const located = withFlatAiSummary(withDistricts(schools));

  if (!userId) return located;

  const { data: run, error } = await scoringRunQuery(userId, 'answers');

  // Degrading to "no scores" is right — a percentage is a nice extra, not a
  // reason to fail the whole schools page. But without this line a broken query
  // and a student who never took the questionnaire look identical.
  if (error) console.error('match scores: could not read scoring run', error.message);

  if (!run?.answers) return located;

  // scoreSchools returns its own ranked order; mapping by id keeps the caller's
  // ordering exactly as it was.
  let catalogue;
  try {
    catalogue = await getScoringCatalogue();
  } catch (err) {
    console.error('match scores: could not load the scoring catalogue', err.message);
    return located;
  }
  const scores = new Map(
    scoreSchools(run.answers, catalogue).map((match) => [match.school_id, match.score])
  );

  return located.map((school) => ({
    ...school,
    match_score: scores.get(school.id),
  }));
}

// school_extracted_details joined here too (not just in FULL_SELECT) so
// withMatchScores -> scoreSchools sees krouzky_kategorie/ma_jidelnu/
// vyukovy_styl_tagy on the list page, not only on the single-school page.
const LIST_SELECT = '*, school_programs(*), school_extracted_details(*)';
// school_extracted_details joined so /porovnani's decision matrix can score
// maturita_pass_rate_pct / tuition_czk_per_year, not just the pros/cons text.
const FULL_SELECT = '*, school_programs(*), school_ai_summary(*), school_extracted_details(*)';
const PUBLIC_LIST_SELECT = `id,name,official_name,location,contact,website,latitude,longitude,school_programs(${LIST_PROGRAM_FIELDS.join(',')})`;
const PUBLIC_DETAIL_SELECT = 'id,name,official_name,location,contact,website,latitude,longitude,merged_into,hidden_reason,school_programs(*),school_extracted_details(*)';

function publicSchoolDetail(school) {
  const { id, name, official_name, location, contact, website, latitude, longitude, district, school_programs, school_extracted_details } = school;
  return { id, name, official_name, location, contact, website, latitude, longitude, district, school_programs, school_extracted_details };
}

async function catalogueMode(req, onboarding = false) {
  if (!req.user) {
    return onboarding
      ? { error: { status: 401, body: { error: 'Pro onboarding se přihlas.' } } }
      : { mode: 'public' };
  }
  const access = await accessStateFor(req.user.id, req.user.email);
  if (access.hasAccess) return { mode: 'full' };
  if (access.httpStatus === 503) return { error: { status: 503, body: access.body } };
  if (onboarding && access.body?.code === 'ONBOARDING_INCOMPLETE') return { mode: 'onboarding' };
  return onboarding
    ? { error: { status: access.httpStatus, body: access.body } }
    : { mode: 'public' };
}

app.get('/api/commute/stops', (req, res) => {
  if (!commuteMatrix) return res.status(503).json({ error: 'Odhad dojezdu je dočasně nedostupný.' });
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ feedDate: commuteMatrix.feedDate, stops: commuteMatrix.stops });
});

app.get('/api/schools/:id/commute', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Neplatné ID školy.' });
  if (!commuteMatrix) return res.status(503).json({ error: 'Odhad dojezdu je dočasně nedostupný.' });

  const { data, error } = await supabase.from('schools')
    .select('id, merged_into, hidden_reason')
    .eq('id', id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!visibleSchool(data)) return res.status(404).json({ error: 'Škola nebyla nalezena.' });

  const minutes = commuteMatrix.schools[String(id)];
  if (!Array.isArray(minutes)) return res.status(404).json({ error: 'Odhad dojezdu pro tuto školu není k dispozici.' });
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ feedDate: commuteMatrix.feedDate, minutes });
});

app.get('/api/schools', optionalAuth, async (req, res) => {
  const onboardingScope = req.query.scope === 'onboarding';
  // ?ids=1,2,3 — the comparison surfaces need full per-obor rows (the risk
  // analysis reads per-obor cutoffs) and the cached pros/cons, but only for
  // the handful of schools a student actually selected.
  if (req.query.ids !== undefined) {
    const parts = String(req.query.ids).split(',');
    const ids = parts.map(Number);
    if (
      !parts.length ||
      parts.length > 50 ||
      parts.some((part) => part.trim() === '') ||
      ids.some((n) => !Number.isInteger(n) || n <= 0)
    ) {
      return res.status(400).json({ error: 'Neplatný parametr ids.' });
    }
    const permission = await catalogueMode(req);
    if (permission.error) return res.status(permission.error.status).json(permission.error.body);
    if (permission.mode !== 'full') return res.status(402).json({ error: 'Pro porovnání je potřeba aktivní přístup.', code: 'PAYMENT_REQUIRED' });
    const { data, error } = await supabase.from('schools').select(FULL_SELECT).in('id', ids).is('hidden_reason', null);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(await withMatchScores(req.user?.id, await withPredecessorPrograms(data)));
  }

  const permission = await catalogueMode(req, onboardingScope);
  if (permission.error) return res.status(permission.error.status).json(permission.error.body);

  let rows;
  try {
    rows = await fetchAllSchools(permission.mode === 'public' ? PUBLIC_LIST_SELECT : LIST_SELECT);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const slim = rows.map((s) => ({ ...s, school_programs: slimProgramsForList(s.school_programs) }));
  if (permission.mode === 'public') {
    return res.json(withDistricts(slim).map(({
      id, name, official_name, location, contact, website, latitude, longitude, district, school_programs,
    }) => ({ id, name, official_name, location, contact, website, latitude, longitude, district, school_programs })));
  }
  res.set('Cache-Control', 'private, no-store');
  if (permission.mode === 'onboarding') return res.json(slim);
  res.json(await withMatchScores(req.user.id, slim));
});

app.get('/api/schools/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const permission = await catalogueMode(req);
  if (permission.error) return res.status(permission.error.status).json(permission.error.body);
  const select = permission.mode === 'full' ? FULL_SELECT : PUBLIC_DETAIL_SELECT;

  const { data, error } = await supabase
    .from('schools')
    .select(select)
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Škola nebyla nalezena.' });
  if (error) return res.status(500).json({ error: error.message });
  if (data.hidden_reason) return res.status(404).json({ error: 'Škola nebyla nalezena.' });

  // An old link to a school that merged away answers with its successor; the
  // page sees a different id than it asked for and redirects.
  let row = data;
  if (row.merged_into) {
    const { data: successor, error: successorError } = await supabase
      .from('schools')
      .select(select)
      .eq('id', row.merged_into)
      .single();
    if (successorError) return res.status(500).json({ error: successorError.message });
    if (successor.hidden_reason) return res.status(404).json({ error: 'Škola nebyla nalezena.' });
    row = successor;
  }

  const programs = await withPredecessorPrograms([row]);
  if (permission.mode !== 'full') {
    const [school] = withDistricts(programs).map(publicSchoolDetail);
    res.set('Cache-Control', 'private, no-store');
    return res.json(school);
  }
  const [school] = await withMatchScores(req.user.id, programs);
  res.set('Cache-Control', 'private, no-store');
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

  const schools = data.map((row) => row.schools).filter(visibleSchool);
  res.json(await withMatchScores(req.user.id, schools));
});

app.post('/api/favorites', requireAuth, requireAccess, async (req, res) => {
  const schoolId = Number(req.body?.schoolId);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { data: target, error: targetError } = await supabase
    .from('schools').select('id, merged_into, hidden_reason').eq('id', schoolId).maybeSingle();
  if (targetError) return res.status(500).json({ error: targetError.message });
  if (!visibleSchool(target)) return res.status(404).json({ error: 'Škola nenalezena.' });

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
 * Reviews
 *
 * Real user-generated content, posted by any email-confirmed account
 * (requireAuth only, never requireAccess — writing a review about a school
 * you already left has nothing to do with an active trial or subscription).
 *
 * The identity rule lives entirely here, never in the browser: a review's
 * `show_name` column only means anything when the reviewer's role is an
 * adult one ('rodic' or 'ucitel') — see reviewDisplayName() below and the
 * long comment on school_reviews in supabase-setup.sql for the GDPR Art. 8
 * reasoning (Czech digital age of consent is 15; our core users are 14-15).
 * ------------------------------------------------------------------------- */

// Pseudonym unless the reviewer is an adult role AND opted in. First name
// only, and resolved here at READ time (never stored) so switching back to
// pseudonymous actually removes the name from every review immediately,
// rather than leaving it frozen into rows already posted (GDPR Art. 17).
function reviewDisplayName(row) {
  const adultRole = row.role === 'rodic' || row.role === 'ucitel';
  if (row.show_name && adultRole && row.users?.name) {
    return row.users.name.trim().split(/\s+/)[0];
  }
  return null;
}

function toPublicReview(row, userId) {
  return {
    id: row.id,
    role: row.role,
    role_year: row.role_year,
    obor_nazev: row.obor_nazev,
    body: row.body,
    display_name: reviewDisplayName(row),
    verified: row.verified,
    status: row.status,
    created_at: row.created_at,
    is_mine: userId != null && row.user_id === userId,
    // DSA Art. 17 statement of reasons — shown only to the author.
    moderation_reason:
      userId != null && row.user_id === userId && row.status !== 'published'
        ? MODERATION_REASONS[row.moderation_reason] || null
        : null,
  };
}

const MODERATION_REASONS = {
  pre_moderation:
    'Omezení: recenze zatím není veřejná. Důvod: recenze od studentů, absolventů a návštěvníků kontrolujeme ručně před zveřejněním, protože mohou obsahovat osobní údaje. Rozhodnutí je lidské, ne automatické. Zveřejníme ji po kontrole; námitku nebo dotaz pošli na e-mail z obchodních podmínek.',
  filter:
    'Omezení: recenze zatím není veřejná. Důvod: automatický filtr našel v textu vulgarismus nebo možné jméno učitele, což podmínky zakazují. Recenzi posoudí člověk a zveřejní ji, nebo ti napíše, co upravit. Námitku pošli na e-mail z obchodních podmínek.',
  reported:
    'Omezení: recenze je skrytá do kontroly. Důvod: někdo ji nahlásil jako nevhodnou nebo nezákonnou. Rozhodnutí je automatické (jedno nahlášení stačí ke skrytí), definitivní posouzení provede člověk. Námitku pošli na e-mail z obchodních podmínek.',
};

// school_reviews.user_id references auth.users, not public.users, so PostgREST
// cannot embed public profile names through that foreign key. Read only the
// opt-in adult authors' profiles, then keep the existing first-name policy.
async function withReviewNames(rows) {
  const authorIds = [...new Set(rows
    .filter((row) => row.show_name && (row.role === 'rodic' || row.role === 'ucitel'))
    .map((row) => row.user_id))];
  if (!authorIds.length) return rows;
  const { data, error } = await supabase.from('users').select('id, name').in('id', authorIds);
  if (error) {
    console.error('Review display names could not be loaded:', error.message);
    return rows; // Names are optional; never fail a successfully saved review.
  }
  const names = new Map((data || []).map((profile) => [profile.id, profile.name]));
  return rows.map((row) => ({ ...row, users: { name: names.get(row.user_id) } }));
}

const REVIEW_ROLES = ['student', 'absolvent', 'rodic', 'ucitel', 'navstevnik'];

app.get('/api/schools/:id/reviews', optionalAuth, async (req, res) => {
  if (!SCHOOL_REVIEWS_ENABLED) return res.json([]);
  const schoolId = Number(req.params.id);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  // Signed-in callers also get their own held/hidden review back (so they can
  // see "čeká na kontrolu" instead of it silently vanishing), never anyone
  // else's non-published one.
  let query = supabase
    .from('school_reviews')
    .select('id, role, role_year, obor_nazev, body, show_name, verified, status, created_at, user_id, moderation_reason')
    .eq('school_id', schoolId)
    .order('verified', { ascending: false })
    .order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const visible = data.filter(
    (row) => row.status === 'published' || (req.user && row.user_id === req.user.id)
  );

  res.json((await withReviewNames(visible)).map((row) => toPublicReview(row, req.user?.id)));
});

app.post('/api/schools/:id/reviews', (req, res, next) => {
  if (!SCHOOL_REVIEWS_ENABLED) return res.status(403).json({ error: 'Recenze škol jsou během beta testování vypnuté.' });
  return next();
}, reviewLimiter, requireAuth, async (req, res) => {
  const schoolId = Number(req.params.id);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const role = req.body?.role;
  if (!REVIEW_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Neplatná role.' });
  }

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (body.length < 40 || body.length > 2000) {
    return res.status(400).json({ error: 'Recenze musí mít 40 až 2000 znaků.' });
  }

  const roleYear = req.body?.roleYear != null ? Number(req.body.roleYear) : null;
  if (roleYear != null && (!Number.isInteger(roleYear) || roleYear < 1 || roleYear > 2100)) {
    return res.status(400).json({ error: 'Neplatný rok.' });
  }

  const oborNazev = typeof req.body?.oborNazev === 'string' ? req.body.oborNazev.trim().slice(0, 120) : null;

  // Never trust the client for this — only the two adult roles may EVER show
  // a name, no matter what the request body says.
  const adultRole = role === 'rodic' || role === 'ucitel';
  const showName = adultRole && req.body?.showName === true;

  // Only self-declared adult roles may publish immediately. Other reviewers
  // need a human check because the form can contain personal data the basic
  // word filter does not catch.
  const moderationReason = !adultRole ? 'pre_moderation' : shouldHold(body) ? 'filter' : null;
  const status = moderationReason ? 'held' : 'published';

  const { data, error } = await supabase
    .from('school_reviews')
    .insert({
      school_id: schoolId,
      user_id: req.user.id,
      role,
      role_year: roleYear,
      obor_nazev: oborNazev || null,
      body,
      show_name: showName,
      status,
      moderation_reason: moderationReason,
    })
    .select('id, role, role_year, obor_nazev, body, show_name, verified, status, created_at, user_id, moderation_reason')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'O téhle škole jsi už recenzi napsal/a.' });
    }
    return res.status(500).json({ error: error.message });
  }

  const [review] = await withReviewNames([data]);
  res.status(201).json(toPublicReview(review, req.user.id));
});

// Deleting your own review, like removing a favourite, must survive trial
// expiry — requireAuth only.
app.delete('/api/reviews/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Neplatné ID recenze.' });
  }

  const { error } = await supabase
    .from('school_reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// The DSA notice-and-action path: one report is enough to hold a review out
// of public view until a human looks at it. Idempotent — reporting twice is
// harmless, not an error, thanks to the (review_id, user_id) primary key.
// DSA Art. 16: notice-and-action must be usable by anyone, not just an
// account holder — optionalAuth, not requireAuth. reviewLimiter is IP-based,
// so an anonymous flood is still bounded.
app.post('/api/reviews/:id/report', reviewLimiter, optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Neplatné ID recenze.' });
  }

  // DSA Art. 16: a notice must say why, and be made in good faith.
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 10 || reason.length > 500 || req.body?.goodFaith !== true) {
    return res.status(400).json({ error: 'Napiš, proč je recenze nevhodná (10 až 500 znaků), a potvrď, že oznámení podáváš v dobré víře.' });
  }

  // One report per signed-in person is enforced by the PARTIAL unique index
  // review_reports_review_user_key. ON CONFLICT cannot target a partial index
  // (Postgres 42P10), so this is a plain insert and a repeat (23505) counts as
  // already reported. An anonymous report has no user_id and always inserts.
  const reportRow = { review_id: id, user_id: req.user?.id ?? null, reason };
  const { error: reportError } = await supabase.from('review_reports').insert(reportRow);

  if (reportError && reportError.code !== '23505') {
    return res.status(500).json({ error: 'Nahlášení se nepodařilo uložit. Zkus to prosím znovu.' });
  }

  const { error: holdError } = await supabase
    .from('school_reviews')
    .update({ status: 'held', moderation_reason: 'reported' })
    .eq('id', id);

  if (holdError) return res.status(500).json({ error: holdError.message });
  res.status(200).json({ received: true });
});

// "Nahlásit chybu v údajích" — crowdsourced data correction, separate from
// reviews. Read directly in Supabase; nothing renders these back.
app.post('/api/schools/:id/report', reviewLimiter, requireAuth, async (req, res) => {
  const schoolId = Number(req.params.id);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (message.length < 10 || message.length > 1000) {
    return res.status(400).json({ error: 'Popis musí mít 10 až 1000 znaků.' });
  }

  const field = typeof req.body?.field === 'string' ? req.body.field.trim().slice(0, 100) : null;

  const { error } = await supabase
    .from('data_reports')
    .insert({ school_id: schoolId, user_id: req.user.id, field, message });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ok: true });
});

/* ---------------------------------------------------------------------------
 * Comparison & decision tools (feature-brainstorm.md §5, plan 006)
 *
 * Three separate objects, deliberately not merged (see plan 006 §1.1):
 *   - favorites (above) — long-lived "interested", no cap
 *   - the compare SELECTION — localStorage only, lib/searchPrefs.js, never
 *     touches this server
 *   - application_picks (here) — the real, binding 3-school DiPSy order
 *
 * Access rule, same one CLAUDE.md states for every route: reading school rows
 * needs requireAccess; managing/erasing the user's own data needs only
 * requireAuth, so an expired trial never locks someone out of their own picks
 * or notes.
 * ------------------------------------------------------------------------- */

app.get('/api/picks', requireAuth, requireAccess, async (req, res) => {
  const { data, error } = await supabase
    .from('application_picks')
    .select('priority, obor_kkov, obor_nazev, schools (*, school_programs(*), school_ai_summary(*))')
    .eq('user_id', req.user.id)
    .order('priority', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Picks on a school hidden for 9th graders stay in the table, just unseen.
  const shown = data.filter((row) => visibleSchool(row.schools));
  const schools = await withMatchScores(req.user.id, shown.map((row) => row.schools));
  res.json(
    shown.map((row, i) => ({
      priority: row.priority,
      obor_kkov: row.obor_kkov,
      obor_nazev: row.obor_nazev,
      school: schools[i],
    }))
  );
});

// Whole-set replace, not a diff — at most 3 rows, and it makes reordering one
// idempotent call with no intermediate half-swapped state. Same idiom as
// import-admission-data.js's per-year school_programs write.
app.put('/api/picks', decisionLimiter, requireAuth, requireAccess, async (req, res) => {
  const picks = Array.isArray(req.body?.picks) ? req.body.picks : null;
  if (!picks) {
    return res.status(400).json({ error: 'Neplatný formát.' });
  }
  if (picks.length > 3) {
    return res
      .status(400)
      .json({ error: 'Do přihlášky patří nejvýš 3 školy.', code: 'TOO_MANY_PICKS' });
  }

  const seen = new Set();
  const rows = [];
  for (const pick of picks) {
    const schoolId = Number(pick?.schoolId);
    if (!Number.isInteger(schoolId) || seen.has(schoolId)) {
      return res.status(400).json({ error: 'Neplatné ID školy.' });
    }
    seen.add(schoolId);
    rows.push({
      school_id: schoolId,
      obor_kkov: typeof pick.oborKkov === 'string' ? pick.oborKkov.slice(0, 40) : null,
      obor_nazev: typeof pick.oborNazev === 'string' ? pick.oborNazev.slice(0, 200) : null,
    });
  }

  // One transaction in the database: validate visibility and programmes, then
  // replace the visible picks. Hidden-school picks are kept.
  const { data: saved, error } = await supabase.rpc('save_application_picks', {
    p_user_id: req.user.id,
    p_picks: rows,
  });
  if (error) {
    const message = {
      SCHOOL_UNAVAILABLE: 'Škola už není v nabídce.',
      INVALID_PROGRAM: 'Tento obor už u školy není v nabídce. Vyber jiný.',
      TOO_MANY_PICKS: 'Do přihlášky patří nejvýš 3 školy.',
      INVALID_PICKS: 'Neplatný formát.',
    }[error.hint];
    if (message) return res.status(400).json({ error: message, code: error.hint });
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ ok: true, count: typeof saved === 'number' ? saved : rows.length });
});

app.delete('/api/picks/:schoolId', requireAuth, async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { error } = await supabase
    .from('application_picks')
    .delete()
    .eq('user_id', req.user.id)
    .eq('school_id', schoolId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// --- notes -------------------------------------------------------------------

app.get('/api/notes', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('school_notes')
    .select('school_id, body, updated_at')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  try {
    const unavailable = await unavailableSchoolIds();
    return res.json(data.filter((row) => !unavailable.has(row.school_id)));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:schoolId', decisionLimiter, requireAuth, async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (body.length > 2000) {
    return res.status(400).json({ error: 'Poznámka je příliš dlouhá (max 2000 znaků).' });
  }

  try {
    if ((await unavailableSchoolIds()).has(schoolId)) return res.status(404).json({ error: 'Škola nenalezena.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { error } = await supabase
    .from('school_notes')
    .upsert({ user_id: req.user.id, school_id: schoolId, body, updated_at: new Date().toISOString() });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
});

app.delete('/api/notes/:schoolId', requireAuth, async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  if (!Number.isInteger(schoolId)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { error } = await supabase
    .from('school_notes')
    .delete()
    .eq('user_id', req.user.id)
    .eq('school_id', schoolId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// --- decision profile (JPZ points) --------------------------------------------

app.get('/api/decision-profile', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('decision_profile')
    .select('jpz_points, jpz_source, jpz_expected_gain, updated_at')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { jpz_points: null, jpz_source: null, jpz_expected_gain: null, updated_at: null });
});

app.put('/api/decision-profile', decisionLimiter, requireAuth, async (req, res) => {
  const whole = (raw) => {
    if (raw === null || raw === undefined || raw === '') return null;
    const numeric = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '');
    return numeric ? Number(raw) : NaN;
  };
  const jpzPoints = whole(req.body?.jpzPoints);
  const expectedGain = whole(req.body?.expectedGain);
  if (jpzPoints !== null && (!Number.isInteger(jpzPoints) || jpzPoints < 0 || jpzPoints > 100)) {
    return res.status(400).json({ error: 'Body musí být celé číslo mezi 0 a 100.' });
  }
  if (expectedGain !== null && (!Number.isInteger(expectedGain) || expectedGain < 0 || expectedGain > 100)) {
    return res.status(400).json({ error: 'Odhad zlepšení musí být celé číslo mezi 0 a 100.' });
  }

  const { error } = await supabase.from('decision_profile').upsert({
    user_id: req.user.id,
    jpz_points: jpzPoints,
    // The student no longer picks mock vs. real exam: the number is simply
    // their current, most realistic score.
    jpz_source: jpzPoints === null ? null : 'nanecisto',
    jpz_expected_gain: jpzPoints === null ? null : expectedGain,
    updated_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
});

// --- share links ---------------------------------------------------------------
//
// GET /api/shared/:token is the only unauthenticated route in this file that
// returns school data, so its response shape is a strict allowlist — see the
// comment right on it. Never widen that select() without re-reading plan 006
// §3.4.

app.post('/api/shares', requireSharing, decisionLimiter, requireAuth, requireAccess, async (req, res) => {
  const token = crypto.randomBytes(16).toString('base64url');
  const includeNotes = req.body?.includeNotes === true;

  const { error } = await supabase
    .from('shortlist_shares')
    .insert({ token, user_id: req.user.id, include_notes: includeNotes });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ token });
});

app.get('/api/shares', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('shortlist_shares')
    .select('token, include_notes, created_at, revoked_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/shares/:token', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('shortlist_shares')
    .delete()
    .eq('user_id', req.user.id)
    .eq('token', req.params.token);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});


async function requireResultsLinkAccess(req, res, next) {
  if (req.body?.kind === 'results') return requireAccess(req, res, next);
  return next();
}

app.post('/api/share-links', requireSharing, decisionLimiter, requireAuth, requireResultsLinkAccess, async (req, res) => {
  const { kind } = req.body || {};
  if (kind !== 'results' && kind !== 'payment') {
    return res.status(400).json({ error: 'Neplatný typ odkazu.' });
  }

  const token = crypto.randomBytes(16).toString('base64url');
  const expires_at = kind === 'payment'
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  if (kind === 'payment') {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_status, access_expires_at, plan_id, season_charge_due_at, cancel_at_period_end')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({
        error: 'Nepodařilo se ověřit platební profil. Zkus to prosím znovu.',
      });
    }
    if (profile.subscription_status === 'beta') {
      return res.status(403).json({
        error: 'Beta účty nemohou zahájit placený přístup.',
        code: 'BETA_CHECKOUT_DISABLED',
      });
    }
    if (hasLivePlan(profile)) {
      return res.status(409).json({
        error: 'Už máš aktivní plán. Spravuj ho v Nastavení.',
        code: 'ALREADY_SUBSCRIBED',
      });
    }

    const { error: deleteError } = await supabase
      .from('share_links')
      .delete()
      .eq('user_id', req.user.id)
      .eq('kind', 'payment');
    if (deleteError) return res.status(500).json({ error: 'Platební odkaz se nepodařilo vytvořit.' });
  }

  const { error } = await supabase
    .from('share_links')
    .insert({ token, user_id: req.user.id, kind, expires_at });
  if (error) return res.status(500).json({ error: 'Sdílený odkaz se nepodařilo vytvořit.' });
  return res.status(201).json({ token, kind, expires_at });
});

app.get('/api/share-links', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('share_links')
    .select('token, kind, created_at, expires_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Sdílené odkazy se nepodařilo načíst.' });
  return res.json(data);
});

app.delete('/api/share-links/:token', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('user_id', req.user.id)
    .eq('token', req.params.token);
  if (error) return res.status(500).json({ error: 'Sdílený odkaz se nepodařilo zrušit.' });
  return res.status(204).end();
});

// Public results reveal only a strict allowlist. Never return answers, JPZ
// points, run labels, account identity, or subscription state.
app.get('/api/shared-results/:token', requireSharing, shareLimiter, async (req, res) => {
  const notFound = () => res.status(404).json({ error: 'Odkaz nenalezen nebo vypršel.' });
  const { data: share, error: shareError } = await supabase
    .from('share_links')
    .select('user_id')
    .eq('token', req.params.token)
    .eq('kind', 'results')
    .maybeSingle();

  if (shareError) return res.status(500).json({ error: 'Výsledky se nepodařilo načíst.' });

  if (share) {
    let runResult;
    try {
      const { data: run, error: runError } = await scoringRunQuery(share.user_id, '*');
      if (runError) return res.status(500).json({ error: 'Výsledky se nepodařilo načíst.' });
      if (!run) return notFound();
      runResult = await buildRunResult(run);
    } catch {
      return res.status(500).json({ error: 'Výsledky se nepodařilo načíst.' });
    }

    const matches = Array.isArray(runResult.matches) ? runResult.matches : [];
    if (!matches.length || !matches[0]?.school) return notFound();

    let ownerEmail = null;
    let ownerVerified = false;
    try {
      const { data, error } = await supabase.auth.admin.getUserById(share.user_id);
      if (!error && data?.user) {
        ownerEmail = data.user.email;
        ownerVerified = true;
      }
    } catch {
      // Auth lookup failure must always fall back to the free tier.
    }

    let access = { hasAccess: false };
    try {
      access = await accessStateFor(share.user_id, ownerEmail);
    } catch {
      // A failed access lookup must never expose the full ranking.
    }
    const hasAccess = ownerVerified && access.hasAccess;
    const shown = matches.slice(0, hasAccess ? 10 : 1);
    const top = shown.map((match, index) => ({
      rank: index + 1,
      school: {
        id: match.school.id,
        name: match.school.name,
        district: match.school.district ?? null,
      },
      score: Math.round(match.score),
      reason: match.reason || '',
    }));

    return res.json({
      source: 'account',
      role: null,
      created_at: runResult.created_at,
      fitting_count: null,
      locked_count: hasAccess ? 0 : Math.max(matches.length - 1, 0),
      top,
    });
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from('result_snapshots')
    .select('role, top_school_id, top_score, fitting_count, created_at')
    .eq('token', req.params.token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (snapshotError) return res.status(500).json({ error: 'Výsledky se nepodařilo načíst.' });
  if (!snapshot) return notFound();

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, name, latitude, longitude, merged_into, hidden_reason')
    .eq('id', snapshot.top_school_id)
    .maybeSingle();
  if (schoolError) return res.status(500).json({ error: 'Výsledky se nepodařilo načíst.' });
  if (!visibleSchool(school)) return notFound();

  const [withDistrict] = withDistricts([school]);
  return res.json({
    source: 'snapshot',
    role: snapshot.role,
    created_at: snapshot.created_at,
    fitting_count: snapshot.fitting_count,
    locked_count: Math.max(snapshot.fitting_count - 1, 0),
    top: [{
      rank: 1,
      school: { id: withDistrict.id, name: withDistrict.name, district: withDistrict.district ?? null },
      score: snapshot.top_score,
      reason: '',
    }],
  });
});

async function findPaymentLink(token) {
  return supabase
    .from('share_links')
    .select('user_id, expires_at')
    .eq('token', token)
    .eq('kind', 'payment')
    .maybeSingle();
}

function paymentLinkNotFound(res) {
  return res.status(404).json({ error: 'Odkaz nenalezen nebo byl zrušen.' });
}

app.get('/api/pay-links/:token', requireSharing, shareLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('name, plan_id, subscription_status, access_expires_at, cancel_at_period_end, season_charge_due_at, plan_started_at, last_paid_at')
    .eq('id', link.user_id)
    .single();
  if (profileError || !profile) {
    return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  }

  const firstName = typeof profile.name === 'string' ? profile.name.trim().split(/\s+/)[0] || null : null;
  // plan_id survives a plan's end (the subscription.deleted webhook only flips
  // the status), so it cannot mean "has a plan" here. Only a plan that still
  // grants access or has a charge scheduled is shown as manageable; anything
  // else falls through to checkout so the parent can buy again.
  const hasPlan = Boolean(profile.plan_id) && (
    paidAccessActive(profile) || (profile.plan_id === 'season' && Boolean(profile.season_charge_due_at))
  );
  const now = new Date();
  const checkout_open = Boolean(link.expires_at && new Date(link.expires_at) > now && !hasLivePlan(profile));
  // The parent sees the way back and the trial status, never the child's saved card.
  const summary = await paymentSummaryFor(link.user_id, profile, now);
  return res.json({
    for_name: firstName,
    checkout_open,
    trial_eligible: summary.trialEligible,
    can_restore: summary.canRestore,
    restore_kind: summary.restoreKind,
    restore_charge_at: summary.restoreChargeAt ?? null,
    restore_price_czk: summary.restorePriceCzk ?? null,
    expires_at: link.expires_at,
    plan: hasPlan ? {
      plan_id: profile.plan_id,
      subscription_status: profile.subscription_status,
      access_expires_at: profile.access_expires_at ?? null,
      cancel_at_period_end: Boolean(profile.cancel_at_period_end),
      can_withdraw: canWithdraw(profile),
    } : null,
  });
});

app.post('/api/pay-links/:token/checkout', requireSharing, checkoutLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  if (!link.expires_at || new Date(link.expires_at) <= new Date()) {
    return res.status(410).json({ code: 'PAY_LINK_EXPIRED' });
  }

  const result = await createCheckoutForUser({
    userId: link.user_id,
    email: undefined,
    planId: req.body?.planId,
    successPath: '/platba-rodice/' + req.params.token,
    cancelPath: '/platba-rodice/' + req.params.token,
    checkoutContext: 'parent',
    immediateStart: req.body?.immediateStart,
    referralCode: req.body?.referralCode,
    acknowledgedNoTrial: req.body?.acknowledgedNoTrial,
    confirmPriceCzk: req.body?.confirmPriceCzk,
  });
  return res.status(result.status).json(result.body);
});

app.post('/api/pay-links/:token/cancel', requireSharing, checkoutLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  const result = await cancelPlanForUser(link.user_id, req.body?.reason);
  return res.status(result.status).json(result.body);
});

app.post('/api/pay-links/:token/restore', requireSharing, checkoutLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  const result = await restorePlanForUser(link.user_id);
  return res.status(result.status).json(result.body);
});

app.post('/api/pay-links/:token/withdraw', requireSharing, checkoutLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  const result = await withdrawPlanForUser(link.user_id);
  return res.status(result.status).json(result.body);
});

app.get('/api/pay-links/:token/withdraw-preview', requireSharing, shareLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  const result = await withdrawalPreviewForUser(link.user_id);
  return res.status(result.status).json(result.body);
});

// Anonymous handoffs contain no personal data or quiz answers. The owner secret
// stays on the parent's device and is required for status and revoke.
// Gate-page "tell me when it launches" signup. Always answers ok so the form
// cannot be used to test whether an address is already on the list.
app.post('/api/waitlist', anonLinkLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Zadej platný e-mail.' });
  }
  const { error } = await supabase.from('launch_waitlist').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) return res.status(500).json({ error: 'Nepodařilo se uložit. Zkus to prosím znovu.' });
  res.json({ ok: true });
});

app.post('/api/handoffs', requireSharing, anonLinkLimiter, async (req, res) => {
  const token = crypto.randomBytes(16).toString('base64url');
  const ownerSecret = crypto.randomBytes(16).toString('base64url');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('quiz_handoffs')
    .insert({ token, owner_secret: ownerSecret, expires_at });
  if (error) return res.status(500).json({ error: 'Odkaz k dotazníku se nepodařilo vytvořit.' });
  return res.status(201).json({ token, ownerSecret });
});

app.get('/api/handoffs/:token', requireSharing, shareLimiter, async (req, res) => {
  const ownerSecret = req.get ? req.get('X-Owner-Secret') : req.headers?.['x-owner-secret'];
  const { data: handoff, error } = await supabase
    .from('quiz_handoffs')
    .select('owner_secret, status, expires_at')
    .eq('token', req.params.token)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Odkaz se nepodařilo ověřit.' });
  if (!handoff || !ownerSecret || ownerSecret !== handoff.owner_secret) {
    return res.status(404).json({ error: 'Odkaz nenalezen nebo byl zrušen.' });
  }
  const expired = ['active', 'opened'].includes(handoff.status) &&
    new Date(handoff.expires_at) <= new Date();
  return res.json({ status: expired ? 'expired' : handoff.status });
});

app.post('/api/handoffs/:token/revoke', requireSharing, shareLimiter, async (req, res) => {
  const ownerSecret = req.get ? req.get('X-Owner-Secret') : req.headers?.['x-owner-secret'];
  if (!ownerSecret) return res.status(404).json({ error: 'Odkaz nenalezen nebo byl zrušen.' });
  const { data, error } = await supabase
    .from('quiz_handoffs')
    .update({ status: 'revoked' })
    .eq('token', req.params.token)
    .eq('owner_secret', ownerSecret)
    .select('token')
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Odkaz se nepodařilo zrušit.' });
  if (!data) return res.status(404).json({ error: 'Odkaz nenalezen nebo byl zrušen.' });
  // Revoking after the child opened the link unlocks the parent's device; the
  // child's onboarding is already local and continues without the parent link.
  return res.status(204).end();
});

app.post('/api/handoffs/:token/open', requireSharing, shareLimiter, async (req, res) => {
  const { data: handoff, error } = await supabase
    .from('quiz_handoffs')
    .select('status, expires_at, opened_at')
    .eq('token', req.params.token)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Odkaz se nepodařilo otevřít.' });
  if (!handoff || !['active', 'opened'].includes(handoff.status) ||
      new Date(handoff.expires_at) <= new Date()) {
    return res.status(404).json({ error: 'Odkaz už neplatí.' });
  }

  const now = new Date().toISOString();
  const { data: opened, error: updateError } = await supabase
    .from('quiz_handoffs')
    .update({ status: 'opened', opened_at: handoff.opened_at || now })
    .eq('token', req.params.token)
    .in('status', ['active', 'opened'])
    .gt('expires_at', now)
    .select('token')
    .maybeSingle();
  if (updateError) return res.status(500).json({ error: 'Odkaz se nepodařilo otevřít.' });
  if (!opened) return res.status(404).json({ error: 'Odkaz už neplatí.' });
  return res.status(204).end();
});

app.post('/api/handoffs/:token/complete', requireSharing, shareLimiter, async (req, res) => {
  const { error } = await supabase
    .from('quiz_handoffs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('token', req.params.token)
    .eq('status', 'opened');
  if (error) return res.status(500).json({ error: 'Odkaz se nepodařilo uzavřít.' });
  return res.status(204).end();
});

// A forged snapshot can expose only one real school with a made-up percentage
// under the results heading; this is accepted because it cannot unlock data.
app.post('/api/result-snapshots', requireSharing, anonLinkLimiter, async (req, res) => {
  const { role, topSchoolId, topScore, fittingCount } = req.body || {};
  if (!['student', 'parent'].includes(role) ||
      !Number.isInteger(topSchoolId) ||
      !Number.isInteger(topScore) || topScore < 0 || topScore > 100 ||
      !Number.isInteger(fittingCount) || fittingCount < 0 || fittingCount > 1000) {
    return res.status(400).json({ error: 'Neplatný výsledek.' });
  }

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, merged_into, hidden_reason')
    .eq('id', topSchoolId)
    .maybeSingle();
  if (schoolError) return res.status(500).json({ error: 'Výsledek se nepodařilo uložit.' });
  if (!visibleSchool(school)) return res.status(400).json({ error: 'Neplatný výsledek.' });

  const token = crypto.randomBytes(16).toString('base64url');
  const { error } = await supabase
    .from('result_snapshots')
    .insert({
      token,
      role,
      top_school_id: topSchoolId,
      top_score: topScore,
      fitting_count: fittingCount,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  if (error) return res.status(500).json({ error: 'Výsledek se nepodařilo uložit.' });
  return res.status(201).json({ token });
});

// No auth. The same 404 body fires for "token never existed" and "token was
// revoked" — deliberately, so this endpoint cannot be used to distinguish the
// two (a token oracle). Returns only the selected schools and programmes, plus
// notes if explicitly included. Never return the owner's name, email, id, JPZ
// points, trial/subscription status, favourites, or questionnaire answers.
app.get('/api/shared/:token', requireSharing, shareLimiter, async (req, res) => {
  const { data: share, error: shareError } = await supabase
    .from('shortlist_shares')
    .select('user_id, include_notes')
    .eq('token', req.params.token)
    .is('revoked_at', null)
    .maybeSingle();

  if (shareError) {
    return res.status(500).json({ error: 'Sdílený výběr se nepodařilo načíst.' });
  }
  if (!share) {
    return res.status(404).json({ error: 'Odkaz nenalezen nebo byl zrušen.' });
  }

  const picksResult = await supabase
    .from('application_picks')
    .select('priority, obor_kkov, obor_nazev, schools (*, school_programs(*))')
    .eq('user_id', share.user_id)
    .order('priority', { ascending: true });
  if (picksResult.error) {
    return res.status(500).json({ error: 'Sdílený výběr se nepodařilo načíst.' });
  }
  const picks = (picksResult.data || []).filter((row) => visibleSchool(row.schools));

  let notesById = new Map();
  if (share.include_notes) {
    const { data: notes, error: notesError } = await supabase
      .from('school_notes')
      .select('school_id, body')
      .eq('user_id', share.user_id);
    if (notesError) {
      return res.status(500).json({ error: 'Sdílený výběr se nepodařilo načíst.' });
    }
    notesById = new Map((notes || []).map((n) => [n.school_id, n.body]));
  }

  res.json({
    picks: (picks || []).map((row) => ({
      priority: row.priority,
      obor_kkov: row.obor_kkov,
      obor_nazev: row.obor_nazev,
      school: withDistricts([row.schools])[0],
      note: share.include_notes ? notesById.get(row.schools.id) ?? null : null,
    })),
  });
});

/* ---------------------------------------------------------------------------
 * AI questionnaire
 *
 * NOTE: this is the standalone questionnaire surface ported from the earlier
 * build. It is NOT the onboarding quiz — that one lives entirely in the browser
 * (frontend/src/pages/onboarding/ + frontend/src/lib/matching.js) and scores
 * without any server call. The two scoring engines are deliberately separate.
 * ------------------------------------------------------------------------- */

// Submissions are deliberately unlimited (a run costs a fraction of a cent, and
// requireAccess + questionnaireLimiter already bound who can call it and how
// fast). The `usage` key stays in the responses so the frontend contract does
// not change shape; it always reports unlimited.
const UNLIMITED_USAGE = { used: 0, limit: null, remaining: null, unlimited: true, resetsAt: null };

/**
 * Turns a stored questionnaire_runs row into the shape the results screen
 * renders: current school rows joined on, and every score recomputed.
 *
 * Shared by GET /api/questionnaire and GET /api/questionnaire/runs/:id because
 * both render through the same components. Two copies of this is how one surface
 * ends up rescoring and the other showing frozen numbers for the same set.
 */
async function buildRunResult(run) {
  // Every school is scored, not just the ones stored on the run: the ranking
  // the student sees ("celé pořadí") covers the whole database, and it is the
  // same arithmetic /api/schools uses for match_score, so one school cannot read
  // 71% here and 64% in search. Schools are read fresh for the same reason —
  // a renamed or re-scraped school shows its current details.
  //
  // school_programs(*) joined so matching.js can classify a school's type
  // (gymnázium/lyceum/trade) from Cermat's own typ_skoly, not by guessing
  // from the free-text programs blob — see matching.js's isGymnasium et al.
  const schools = await getScoringCatalogue();
  const byId = new Map(schools.map((school) => [school.id, school]));

  // Sentences are only ever written for the run's stored top matches, so they
  // are looked up by school_id, never by position.
  const storedReason = new Map(
    (run.matches || []).map((match) => [match.school_id, match.reason || ''])
  );

  const ranked = scoreSchools(run.answers, schools).sort((a, b) => b.score - a.score);

  return {
    id: run.id,
    label: run.label ?? null,
    created_at: run.created_at,
    is_default: Boolean(run.is_default),
    archived_at: run.archived_at ?? null,
    source: run.source ?? 'questionnaire',
    // null = the run was scored without a model, so no match carries a sentence.
    model: run.model ?? null,
    answers: run.answers,
    extra_reasons: run.extra_reasons ?? {},
    // The top of the list carries the full school row and the reasons behind
    // the score; the tail only needs a name, a district and a number, which
    // keeps a 223-school response small.
    matches: ranked.map((match, index) => {
      const school = byId.get(match.school_id);
      if (index < REASON_COUNT) {
        return { ...match, reason: storedReason.get(match.school_id) || '', school };
      }
      return {
        school_id: match.school_id,
        score: match.score,
        school: { id: school.id, name: school.name, district: school.district },
      };
    }),
  };
}

// The questions live on the server so there is one definition of what a valid
// answer is, and it is the one the validator uses.
app.get('/api/questionnaire', requireAuth, requireAccess, async (req, res) => {
  try {
    // Re-reading existing results is free and unmetered — a database read, not
    // an AI call. Only submitting new answers costs anything.
    const { data: active, error: activeError } = await scoringRunQuery(
      req.user.id,
      'id, label, answers, matches, extra_reasons, created_at, is_default, model, source'
    );
    if (activeError) throw activeError;

    // The full set list, for the history page. `matches` is deliberately left
    // out: nothing in the list shows a percentage, so there is no second number
    // that could disagree with the one on the results page.
    const { data: runs, error: runsError } = await supabase
      .from('questionnaire_runs')
      .select('id, label, created_at, is_default, archived_at, answers, source')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (runsError) throw runsError;

    // The points from /prihlaska, so the form does not ask for a number the
    // account already has. Best effort: a read failure just means no prefill.
    const { data: profile } = await supabase
      .from('decision_profile')
      .select('jpz_points')
      .eq('user_id', req.user.id)
      .maybeSingle();

    res.json({
      questions: QUESTIONS,
      prefill: { body: profile?.jpz_points ?? null },
      usage: UNLIMITED_USAGE,
      // Named `active` rather than `latest`: with a default set it is no longer
      // necessarily the newest one.
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
    const validation = validateAnswers(req.body?.answers);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    // Full rows, not just the fields the prompt uses: the same objects are
    // handed back to the frontend as result cards, and they must match the
    // shape GET returns or the two paths render differently.
    let schools;
    try {
      schools = await getScoringCatalogue();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!schools.length) {
      return res.status(503).json({ error: 'V databázi zatím nejsou žádné školy.' });
    }

    let matches;
    let aiUsed;
    let fullRanking;
    let aiUsageId = null;
    try {
      ({ matches, aiUsed, fullRanking } = await requestMatches({
        answers: validation.answers,
        schools,
        apiKey: OPENROUTER_API_KEY,
        model: OPENROUTER_MODEL,
        referer: FRONTEND_URL,
        gender: req.profile?.gender === 'f' ? 'f' : 'm',
        onUsage: async (outcome) => {
          aiUsageId = await logAiUsage(supabase, {
            ...outcome, source: 'questionnaire', model: OPENROUTER_MODEL, userId: req.user.id,
          });
        },
      }));
    } catch (err) {
      console.error('Questionnaire match failed:', err.message);
      // The upstream message can carry provider detail that means nothing to a
      // student, so it is logged rather than shown. Nothing is written on this
      // path, so a failed call costs no allowance.
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
        // null means "scores only" — the results screen reads it to explain a
        // missing sentence, so never store a model name the model never saw.
        model: aiUsed ? OPENROUTER_MODEL : null,
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    if (aiUsageId) {
      const { error: usageError } = await supabase.from('ai_usage_log')
        .update({ run_id: run.id, ...(!aiUsed ? { ok: false, error: 'No usable explanation returned' } : {}) })
        .eq('id', aiUsageId);
      if (usageError) console.error('AI run attribution could not be saved:', usageError.code);
    }

    // A ranking banded by the disability answer would reveal health data (art. 9).
    if(req.profile?.subscription_status==='beta' && validation.answers.postizeni!=='ano') {
      const notice=await supabase.from('beta_profile').select('*').eq('user_id',req.user.id).single();
      if(!notice.error && trackingOn(notice.data)) {
        const order=rankingPayload(fullRanking);
        if(order){const logged=await supabase.from('beta_rankings').upsert({user_id:req.user.id,source:'questionnaire',run_id:run.id,capture_id:crypto.randomUUID(),ranking:order},{onConflict:'user_id,source,run_id',ignoreDuplicates:true});
          if(logged.error)console.error('Beta ranking could not be saved:',logged.error.code || 'database unavailable');}
      }
    }
    await syncJpzPoints(req.user.id, validation.answers.body);

    // A new set becomes the one that scores the database. Finishing the
    // questionnaire and finding the percentages unchanged would read as the
    // submission not having worked. Choosing an *older* set is the explicit
    // action, done from the set list.
    try {
      await setDefaultRun(req.user.id, run.id);
    } catch (err) {
      console.error('questionnaire run saved but could not be flagged default:', err.message);
      return res.status(500).json({
        error: 'Výsledky se uložily, ale nepodařilo se je nastavit jako výchozí. Zkus to prosím znovu.',
      });
    }

    const byId = new Map(schools.map((school) => [school.id, school]));

    res.status(201).json({
      run: {
        id: run.id,
        label: null,
        created_at: run.created_at,
        is_default: true,
        archived_at: null,
        answers: validation.answers,
        model: aiUsed ? OPENROUTER_MODEL : null,
        matches: matches.map((match) => ({
          ...match,
          school: byId.get(match.school_id),
        })),
      },
      usage: UNLIMITED_USAGE,
    });
  }
);

const explainInFlight = new Map();

app.post(
  '/api/questionnaire/explain/:schoolId',
  requireAuth,
  requireAccess,
  questionnaireExplainLimiter,
  async (req, res) => {
    const schoolId = Number(req.params.schoolId);
    if (!Number.isSafeInteger(schoolId) || schoolId <= 0) {
      return res.status(400).json({ error: 'Neplatné ID školy.' });
    }

    try {
      // ?run= targets a specific own run (the results page filling a run that
      // is no longer the default); without it, the scoring run.
      const runId = Number(req.query?.run);
      const columns = 'id, answers, matches, extra_reasons';
      const { data: run, error: runError } = Number.isSafeInteger(runId) && runId > 0
        ? await supabase.from('questionnaire_runs').select(columns)
          .eq('id', runId).eq('user_id', req.user.id).is('archived_at', null).maybeSingle()
        : await scoringRunQuery(req.user.id, columns);
      if (runError) throw runError;
      if (!run) {
        return res.status(404).json({
          error: 'Nejdřív vyplň dotazník.',
          code: 'QUESTIONNAIRE_REQUIRED',
        });
      }

      const cached = run.extra_reasons?.[String(schoolId)];
      if (typeof cached === 'string' && cached.trim()) {
        return res.json({ reason: cached, cached: true });
      }

      const storedMatch = (run.matches || []).find((match) => Number(match.school_id) === schoolId);
      if (storedMatch?.reason) {
        return res.json({ reason: storedMatch.reason, cached: true });
      }

      if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ error: 'Vysvětlení teď nejde vytvořit.' });
      }

      // scoreSchools derives selectivity signals from the full school set, so
      // score against that same comparison pool but send only the requested
      // school's evidence to the model.
      const schools = await getScoringCatalogue();
      const school = schools.find((entry) => entry.id === schoolId);
      if (!school) return res.status(404).json({ error: 'Škola nebyla nalezena.' });
      const fullOrder = scoreSchools(run.answers, schools);
      const match = fullOrder.find((entry) => entry.school_id === schoolId);
      if (!match) return res.status(404).json({ error: 'Školu se nepodařilo vyhodnotit.' });

      // The same school asked twice at once shares one model call. The key
      // includes the run id, which belongs to exactly one account.
      const inFlightKey = `${run.id}:${schoolId}`;
      let pending = explainInFlight.get(inFlightKey);
      if (!pending) {
        pending = (async () => {
          const reasons = await requestReasons({
            answers: run.answers,
            shortlist: [match],
            byId: new Map([[schoolId, school]]),
            fullOrder,
            nameById: new Map(schools.map((entry) => [entry.id, entry])),
            apiKey: OPENROUTER_API_KEY,
            model: OPENROUTER_MODEL,
            referer: FRONTEND_URL,
            gender: req.profile?.gender === 'f' ? 'f' : 'm',
            onUsage: (outcome) => logAiUsage(supabase, {
              ...outcome,
              source: 'explain',
              model: OPENROUTER_MODEL,
              userId: req.user.id,
              runId: run.id,
            }),
          });
          const generated = reasons.get(schoolId);
          if (!generated) throw new Error('Model nevrátil vysvětlení školy.');

          const { data: cachedOk, error: cacheError } = await supabase.rpc('cache_questionnaire_reason', {
            p_user_id: req.user.id,
            p_run_id: run.id,
            p_school_id: String(schoolId),
            p_answers: run.answers,
            p_reason: generated,
          });
          if (cacheError) throw cacheError;
          if (!cachedOk) throw new Error('Odpovědi se mezitím změnily.');
          return generated;
        })().finally(() => explainInFlight.delete(inFlightKey));
        explainInFlight.set(inFlightKey, pending);
      }
      const reason = await pending;

      return res.json({ reason, cached: false });
    } catch (err) {
      console.error('On-demand questionnaire explanation unavailable:', err.message);
      return res.status(502).json({ error: 'Vysvětlení teď nejde vytvořit.' });
    }
  }
);

/* ---------------------------------------------------------------------------
 * Managing sets of answers
 *
 * These take `requireAuth` but deliberately NOT `requireAccess`. An account
 * whose trial has lapsed still has to be able to tidy up and erase its own
 * answers — the same reasoning behind the DELETE policy in supabase-setup.sql.
 *
 * None of them are AI calls: they are plain database writes.
 * Every one scopes its write with `.eq('user_id', req.user.id)`, which is what
 * stops an id belonging to somebody else's account from being touched.
 * ------------------------------------------------------------------------- */

/**
 * Clears whichever set was default and flags this one.
 *
 * Two statements, in this order. The partial unique index allows one
 * `is_default` row per account, so setting before clearing would be rejected.
 * If the process dies between them the account has no default, which the
 * resolver reads as "the newest set" — a graceful landing, which is why this
 * does not need a transaction.
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

  const { data, error } = await supabase
    .from('questionnaire_runs')
    .select(columns)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data ?? null;
}

app.get('/api/questionnaire/runs/:id', requireAuth, requireAccess, async (req, res) => {
  try {
    const run = await ownRun(
      req.user.id,
      req.params.id,
      'id, label, answers, matches, extra_reasons, created_at, is_default, archived_at, model, source'
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

  let run;
  try {
    run = await ownRun(req.user.id, req.params.id);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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
  let run;
  try {
    run = await ownRun(req.user.id, req.params.id);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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

// Withdrawal of the art. 9 consent given by answering postizeni = 'ano': the
// answer leaves every saved run and the stored shortlist is re-scored without it
// (search percentages are scored live from answers, so they follow at once).
app.post('/api/questionnaire/health-consent/withdraw', requireAuth, async (req, res) => {
  const { data: runs, error } = await supabase
    .from('questionnaire_runs')
    .select('id, answers, matches')
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  const affected = (runs || []).filter((run) => run.answers && ('postizeni' in run.answers || 'postizeni_typ' in run.answers));
  if (!affected.length) return res.json({ updated: 0 });

  let schools;
  try {
    schools = await getScoringCatalogue();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  for (const run of affected) {
    const { postizeni, postizeni_typ, ...answers } = run.answers;
    const oldReasons = new Map((run.matches || []).map((m) => [m.school_id, m.reason]));
    const matches = scoreSchools(answers, schools).slice(0, REASON_COUNT).map((m) => ({
      school_id: m.school_id,
      score: m.score,
      reason: oldReasons.get(m.school_id) || '',
      signals: m.signals,
      breakdown: m.breakdown,
    }));
    const { error: updateError } = await supabase.from('questionnaire_runs')
      .update({ answers, matches }).eq('id', run.id).eq('user_id', req.user.id);
    if (updateError) return res.status(500).json({ error: 'Údaj se nepodařilo smazat. Zkus to prosím znovu.' });
  }
  res.json({ updated: affected.length });
});

app.patch('/api/questionnaire/runs/:id/archive', requireAuth, async (req, res) => {
  if (typeof req.body?.archived !== 'boolean') {
    return res.status(400).json({ error: 'Chybí příznak archivace.' });
  }

  let run;
  try {
    run = await ownRun(req.user.id, req.params.id);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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
 * Payments — plan 009, revised.
 *
 * Monthly is a real Stripe subscription (mode: 'subscription') — genuinely
 * recurring, so Stripe's own "recurring" checkout disclosure is accurate and
 * fine to show.
 *
 * Season is SOLD as a one-time payment and is now IMPLEMENTED as one too —
 * no subscription object exists for it at all. An earlier version tried to
 * get there via subscription + trial_period_days + an absolute cancel_at,
 * but Stripe's Checkout page discloses recurring-billing terms itself on any
 * mode:'subscription' session (required disclosure, not something
 * custom_text can hide), which would have shown "recurring" language and
 * directly contradicted what the app promises. Instead:
 *   1. Checkout runs in mode: 'setup' — collects and saves a card, charges
 *      nothing, creates no subscription. Nothing recurring is ever disclosed.
 *   2. The webhook below stores the saved payment method and a
 *      season_charge_due_at timestamp (SEASON_TRIAL_DAYS out).
 *   3. chargeDueSeasonPasses() polls hourly and fires one true one-time
 *      PaymentIntent per due account, off_session, once — see that function.
 * Access during the trial window is unaffected by any of this: requireAccess
 * already grants access purely from trial_expires_at (the DB-trigger trial),
 * independent of subscription_status — see that function above.
 *
 * Mocked boundary tests and local TEST MODE configuration are recorded; they
 * do not approve live billing. Close the payment lifecycle, reminder, refund,
 * operator/provider and test-mode acceptance gates in UNFORGET.md and the
 * current deployment handoff before enabling real charges. Beta never bills.
 * ------------------------------------------------------------------------- */

// Prices, the sale window and every date live in lib/season.js (plan 025) and
// reach the browser through GET /api/prices; the Stripe Price below is the one
// remaining outside copy (monthly) and must stay at lib/season.js MONTHLY_PRICE.

const PLAN_PRICE_ENV = {
  season: 'STRIPE_PRICE_ID_SEASON',
  monthly: 'STRIPE_PRICE_ID_MONTHLY',
};

// Statuses that mean "this account really bought something". A pending checkout
// that was never completed does not count as a trial or a prior purchase.
const SETTLED_STATUSES = ['active', 'canceled', 'withdrawn', 'refunded'];
const SEASON_PLANS = ['season', 'spring'];
// Kill switch (plan 025 §4.8): false limits referral rewards to payments made
// through the parent payment link, should a regulator object to students.
const REFERRAL_STUDENT_REWARDS = process.env.REFERRAL_STUDENT_REWARDS !== 'false';
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const deadlineUnix = () => Math.floor(DEADLINE.getTime() / 1000);

// Open-redirect guard: success_url embeds this, so it must never be able to
// carry the user off this domain. Relative paths only.
function sanitizeReturnTo(returnTo) {
  if (typeof returnTo === 'string' && /^\/[A-Za-z0-9\-_/]*$/.test(returnTo)) {
    return returnTo;
  }
  return '/skoly';
}

app.post('/api/me/redeem-beta-code', requireAuth, (req, res) => {
  res.status(410).json({
    error: 'Tenhle způsob přístupu už nefunguje. Zaregistruj se na stredninamiru.cz.',
    code: 'BETA_INVITATION_LINK_REQUIRED',
  });
});

// One season trial per account and per card; the card half is enforced where
// the card becomes known (the setup webhook), because Checkout hides it.
async function trialEligible(userId, now = new Date()) {
  if (!trialAvailable(now)) return false;
  const { data: user } = await supabase.from('users').select('season_trial_used_at').eq('id', userId).single();
  if (user?.season_trial_used_at) return false;
  const { data: used } = await supabase.from('purchases').select('id')
    .eq('user_id', userId).eq('trial', true).in('status', SETTLED_STATUSES).limit(1);
  return !(Array.isArray(used) && used.length);
}

app.get('/api/prices', optionalAuth, async (req, res) => {
  const now = new Date();
  const priceCzk = seasonPriceCzk(now);
  const body = {
    onSale: priceCzk !== null,
    deadline: DEADLINE.toISOString(),
    accessEnd: ACCESS_END.toISOString(),
    today: season.pragueDay(now),
    season: priceCzk === null ? null : {
      priceCzk,
      falling: priceCzk < season.SEASON_CAP && monthlyAvailable(now),
      trialAvailable: trialAvailable(now),
      isSpring: isSpring(now),
    },
    monthly: monthlyQuote(now)
      ? { available: true, priceCzk: MONTHLY_PRICE, ...monthlyQuote(now) }
      : { available: false, priceCzk: MONTHLY_PRICE },
    referral: { discountCzk: REFERRAL_DISCOUNT, available: priceCzk !== null && priceCzk >= REFERRAL_MIN_PRICE },
    // A live monthly may extend to the end of June from 1 Feb until the deadline.
    extend: { available: now >= SPRING_ADDON_FROM && now <= DEADLINE, springCzk: SPRING_PRICE },
  };
  if (req.user) {
    body.trialEligible = body.season ? await trialEligible(req.user.id, now) : false;
    res.set('Cache-Control', 'private, no-store');
  } else {
    res.set('Cache-Control', 'public, max-age=300');
  }
  return res.json(body);
});

// A referral code is honoured only on a first purchase and only from a referrer
// who has paid. Anything else is ignored silently: the purchase goes on at full
// price, so a person can never be referred in a circle (§4.8).
async function referralReferrerEligible(referrerId) {
  const { data } = await supabase.from('purchases')
    .select('id, trial, season_charge_status, checkout_context')
    .eq('user_id', referrerId).in('plan', ['season', 'spring']).eq('status', 'active')
    .not('stripe_payment_intent_id', 'is', null).limit(5);
  const paid = (Array.isArray(data) ? data : []).filter((p) => !p.trial || p.season_charge_status === 'succeeded');
  if (!paid.length) return false;
  return REFERRAL_STUDENT_REWARDS || paid.some((p) => p.checkout_context === 'parent');
}

async function resolveReferral({ userId, code, priceCzk }) {
  const clean = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(clean) || priceCzk < REFERRAL_MIN_PRICE) return null;
  const { data: row } = await supabase.from('referral_codes').select('user_id').eq('code', clean).maybeSingle();
  const referrerId = row?.user_id;
  if (!referrerId || referrerId === userId) return null;
  if (!(await referralReferrerEligible(referrerId))) return null;
  const { data: prior } = await supabase.from('purchases').select('id')
    .eq('user_id', userId).in('status', SETTLED_STATUSES).limit(1);
  if (Array.isArray(prior) && prior.length) return null;
  const { data: already } = await supabase.from('referrals').select('id').eq('referred_user_id', userId).maybeSingle();
  if (already) return null;
  const { data: people } = await supabase.from('users').select('id, stripe_customer_id').in('id', [userId, referrerId]);
  const customerOf = (id) => (Array.isArray(people) ? people : []).find((u) => u.id === id)?.stripe_customer_id || null;
  if (customerOf(userId) && customerOf(userId) === customerOf(referrerId)) return null;
  return { referrerId, discountMinor: REFERRAL_DISCOUNT * 100 };
}

const PENDING_COLUMNS =
  'id, stripe_checkout_session_id, checkout_context, price_amount_minor, trial, referrer_user_id, needs_payment_confirmation';

async function findPendingPurchase(userId, planId) {
  return supabase
    .from('purchases')
    .select(PENDING_COLUMNS)
    .eq('user_id', userId)
    .eq('plan', planId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function reservePurchase({
  userId, planId, checkoutContext, amountMinor, trial = false,
  discountMinor = 0, discountKind = null, referrerUserId = null,
}) {
  const existing = await findPendingPurchase(userId, planId);
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      user_id: userId,
      plan: planId,
      checkout_context: checkoutContext,
      price_amount_minor: amountMinor,
      currency: 'czk',
      status: 'pending',
      trial,
      discount_kind: discountMinor ? discountKind : null,
      discount_minor: discountMinor,
      referrer_user_id: referrerUserId,
    })
    .select(PENDING_COLUMNS)
    .single();

  if (!error) return data;
  if (error.code !== '23505') throw error;

  // A simultaneous request inserted the unique pending row. Both requests
  // will use the same Stripe idempotency key derived from that row.
  const raced = await findPendingPurchase(userId, planId);
  if (raced.error) throw raced.error;
  if (raced.data) return raced.data;
  // A season and a spring purchase are the same product; the index treats them alike.
  const sibling = await findPendingPurchase(userId, planId === 'spring' ? 'season' : planId === 'season' ? 'spring' : planId);
  if (sibling.error || !sibling.data) throw sibling.error || error;
  return sibling.data;
}

const PAYABLE_PROFILE_COLUMNS =
  'stripe_customer_id, stripe_payment_method_id, stripe_subscription_id, email, subscription_status, ' +
  'access_expires_at, plan_id, season_charge_due_at, cancel_at_period_end, plan_started_at, last_paid_at';

// Shared start of every purchase route: who may pay, and is Stripe configured.
async function loadPayableProfile(userId) {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(PAYABLE_PROFILE_COLUMNS)
    .eq('id', userId)
    .single();

  if (profileError) {
    return {
      fail: { status: 500, body: { error: 'Nepodařilo se ověřit platební profil. Zkus to prosím znovu.' } },
    };
  }
  if (profile.subscription_status === 'beta') {
    return {
      fail: {
        status: 403,
        body: { error: 'Beta účty nemohou zahájit placený přístup.', code: 'BETA_CHECKOUT_DISABLED' },
      },
    };
  }
  if (profile.subscription_status === 'creator') {
    return {
      fail: {
        status: 403,
        body: {
          error: 'Účty s náhledem pro tvůrce nemohou zahájit placený přístup.',
          code: 'CREATOR_CHECKOUT_DISABLED',
        },
      },
    };
  }
  if (!stripe) {
    return {
      fail: { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } },
    };
  }
  return { profile };
}

function alreadySubscribed(profile, parentLink = false) {
  return {
    status: 409,
    body: {
      error: parentLink
        ? 'Dítě už má aktivní plán. Spravovat ho můžete na této stránce.'
        : 'Už máš aktivní plán. Spravuj ho v Nastavení.',
      code: 'ALREADY_SUBSCRIBED',
      canRestore: Boolean(profile.cancel_at_period_end) && profile.plan_id === 'monthly',
    },
  };
}

const immediateStartRequired = () => ({
  status: 400,
  body: { error: 'Potvrď prosím, že chceš přístup hned.', code: 'IMMEDIATE_START_REQUIRED' },
});
const priceChanged = (priceCzk, extra = {}) => ({
  status: 409,
  body: { error: 'Cena se mezitím změnila.', code: 'PRICE_CHANGED', priceCzk, ...extra },
});

async function createCheckoutForUser({
  userId, email, planId, successPath, cancelPath, checkoutContext = 'self',
  immediateStart, referralCode, acknowledgedNoTrial, confirmPriceCzk,
}) {
  if (planId !== 'season' && planId !== 'monthly') {
    return { status: 400, body: { error: 'Neplatný plán.' } };
  }

  const loaded = await loadPayableProfile(userId);
  if (loaded.fail) return loaded.fail;
  const { profile } = loaded;

  // email === undefined is the parent's payment link (vykání, no Settings).
  if (hasLivePlan(profile)) return alreadySubscribed(profile, email === undefined);
  if (immediateStart !== true) return immediateStartRequired();

  const now = new Date();
  if (!onSale(now)) {
    return { status: 409, body: { error: 'Prodej pro tuto sezónu už skončil.', code: 'SALES_CLOSED' } };
  }
  const isMonthly = planId === 'monthly';
  if (isMonthly && !monthlyAvailable(now)) {
    return {
      status: 409,
      body: { error: 'Měsíční předplatné už se neprodává, do konce přihlášek zbývá 14 dní nebo méně.', code: 'MONTHLY_CLOSED' },
    };
  }

  const listCzk = isMonthly ? monthlyQuote(now).firstChargeCzk : seasonPriceCzk(now);
  const referral = isMonthly ? null : await resolveReferral({ userId, code: referralCode, priceCzk: listCzk });
  const amountMinor = listCzk * 100 - (referral?.discountMinor || 0);
  if (confirmPriceCzk !== undefined && Number(confirmPriceCzk) !== amountMinor / 100) {
    return priceChanged(amountMinor / 100, { referralApplied: Boolean(referral) });
  }

  const purchasePlan = isMonthly ? 'monthly' : isSpring(now) ? 'spring' : 'season';
  let trial = false;
  if (purchasePlan === 'season') {
    trial = await trialEligible(userId, now);
    // The UI advertised a trial (date allows one) but this account or card used it:
    // say so before any money moves.
    if (!trial && trialAvailable(now) && acknowledgedNoTrial !== true) {
      return {
        status: 409,
        body: {
          error: 'Zkušební období už bylo využité, zaplatíš hned.',
          code: 'TRIAL_NOT_AVAILABLE',
          priceCzk: amountMinor / 100,
        },
      };
    }
  }

  // The parent payment-link path passes email: undefined deliberately. Do not
  // attach the child's saved Stripe customer either; Checkout must collect the
  // payer's own billing details and send receipts to the parent.
  const ownCustomer = email !== undefined && profile?.stripe_customer_id && await hasOwnCardHistory(userId);
  const billingCustomer = email === undefined
    ? {}
    : ownCustomer
      ? { customer: profile.stripe_customer_id }
      : email
        ? { customer_email: email }
        : {};
  const successUrl = FRONTEND_URL + successPath + '?platba=ok';
  const cancelUrl = FRONTEND_URL + cancelPath;

  let priceId;
  if (isMonthly) {
    priceId = process.env[PLAN_PRICE_ENV.monthly];
    if (!priceId) {
      return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
    }
  }

  try {
    return await createTrackedCheckout({
      userId, planId: purchasePlan, checkoutContext, amountMinor, trial,
      discountMinor: referral?.discountMinor || 0, discountKind: 'referral',
      referrerUserId: referral?.referrerId || null,
      successUrl, cancelUrl, billingCustomer, email, priceId,
    });
  } catch (err) {
    return { status: 500, body: { error: err.message } };
  }
}

async function expireCheckoutSession(sessionId) {
  if (!sessionId) return;
  try { await stripe.checkout.sessions.expire(sessionId); } catch { /* already closed */ }
}

async function createTrackedCheckout({
  userId, planId, checkoutContext, amountMinor, trial, discountMinor, discountKind, referrerUserId,
  successUrl, cancelUrl, billingCustomer, email, priceId,
}) {
  const spec = { userId, planId, checkoutContext, amountMinor, trial, discountMinor, discountKind, referrerUserId };
  const sameDeal = (row) => row.checkout_context === checkoutContext
    && row.price_amount_minor === amountMinor
    && Boolean(row.trial) === trial
    && (row.referrer_user_id || null) === (referrerUserId || null);
  const discard = async (row) => {
    // The open checkout has the wrong return URLs, price or terms (another
    // payer, a new day's price, trial no longer allowed): close it, start fresh.
    await expireCheckoutSession(row.stripe_checkout_session_id);
    if (row.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
      // A session the customer already completed is never abandoned.
      if (session.status === 'complete') return false;
    }
    const { error } = await supabase.from('purchases')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('status', 'pending');
    if (error) throw error;
    return true;
  };
  const processing = {
    status: 409,
    body: { error: 'Platba se právě potvrzuje. Obnov stránku za chvíli.', code: 'CHECKOUT_PROCESSING' },
  };

  let purchase = await reservePurchase(spec);
  if (purchase.needs_payment_confirmation) {
    return {
      status: 409,
      body: { error: 'Tahle karta už zkušební období měla. Potvrď platbu.', code: 'NEEDS_PAYMENT_CONFIRMATION' },
    };
  }
  if (!sameDeal(purchase)) {
    if (!(await discard(purchase))) return processing;
    purchase = await reservePurchase(spec);
  }
  if (purchase.stripe_checkout_session_id) {
    let existingSession;
    try {
      existingSession = await stripe.checkout.sessions.retrieve(purchase.stripe_checkout_session_id);
    } catch {
      throw new Error('Nepodařilo se ověřit rozpracovanou platbu. Zkus to prosím znovu.');
    }
    if (existingSession.status === 'open' && existingSession.url) {
      return { status: 200, body: { url: existingSession.url, trial, priceCzk: amountMinor / 100, referralApplied: Boolean(referrerUserId) } };
    }
    if (existingSession.status === 'complete') {
      return {
        status: 409,
        body: { error: 'Platba se právě potvrzuje. Obnov stránku za chvíli.', code: 'CHECKOUT_PROCESSING' },
      };
    }
    if (existingSession.status !== 'expired') {
      throw new Error('Rozpracovanou platbu se nepodařilo bezpečně ověřit.');
    }
    if (!(await discard(purchase))) return processing;
    purchase = await reservePurchase(spec);
  }

  const metadata = { plan_id: planId, app_user_id: userId, purchase_id: purchase.id };
  const priceCzk = amountMinor / 100;
  // A stale daily price must not be payable for long.
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const common = {
    ...billingCustomer,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata,
  };
  let sessionParams;
  if (planId === 'monthly') {
    const quote = monthlyQuote(new Date());
    sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...common,
      expires_at: expiresAt,
      // Less than a month left: one prorated payment that ends at the deadline.
      subscription_data: {
        metadata,
        ...(quote?.singleCharge ? { billing_cycle_anchor: Math.floor(DEADLINE.getTime() / 1000) } : {}),
      },
      custom_text: {
        submit: {
          message: quote?.singleCharge
            ? 'Dnes ' + quote.firstChargeCzk + ' Kč za dny do 22. 2. 2027. Nic dalšího se nestrhne, předplatné pak samo skončí.'
            : 'Dnes 249 Kč, pak 249 Kč každý měsíc ve stejný den. Poslední platba je jen za dny do 22. 2. 2027, ' +
              'potom předplatné samo skončí. Celkem nejvýš ' + (quote?.totalCzk ?? '') + ' Kč.',
        },
      },
    };
  } else if (trial) {
    sessionParams = {
      mode: 'setup',
      currency: 'czk',
      ...common,
      ...(email === undefined ? { customer_creation: 'always' } : {}),
      expires_at: expiresAt,
      custom_text: {
        submit: {
          message: 'Uložíme jen platební metodu, nic se nestrhává hned. Za ' +
            SEASON_TRIAL_DAYS + ' dny proběhne jednorázová platba ' + priceCzk +
            ' Kč za přístup do 30. 6. 2027. Zkušební období je jen jedno na účet i na kartu.',
        },
      },
    };
  } else {
    sessionParams = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'czk',
          unit_amount: amountMinor,
          product_data: { name: planId === 'spring' ? 'Jarní přístup do 30. 6. 2027' : 'Sezónní přístup do 30. 6. 2027' },
        },
        quantity: 1,
      }],
      ...common,
      ...(billingCustomer.customer ? {} : { customer_creation: 'always' }),
      payment_intent_data: { setup_future_usage: 'on_session', metadata },
      expires_at: expiresAt,
      custom_text: {
        submit: {
          message: 'Zaplatíš hned ' + priceCzk + ' Kč, jednorázově, za přístup do 30. 6. 2027. ' +
            'Odstoupit můžeš do 14 dnů v Nastavení; vrátíme poměrnou část.',
        },
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams, {
    idempotencyKey: `snm-checkout:${purchase.id}`,
  });
  const { error: saveError } = await supabase
    .from('purchases')
    .update({
      price_amount_minor: amountMinor,
      stripe_checkout_session_id: session.id,
      immediate_start_consent_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)
    .eq('status', 'pending');
  if (saveError) throw saveError;
  return { status: 200, body: { url: session.url, trial, priceCzk, referralApplied: Boolean(referrerUserId) } };
}

app.post('/api/checkout', checkoutLimiter, requireAuth, async (req, res) => {
  const { planId, returnTo, immediateStart, referralCode, acknowledgedNoTrial, confirmPriceCzk } = req.body || {};
  const result = await createCheckoutForUser({
    userId: req.user.id,
    email: req.user.email,
    planId,
    successPath: sanitizeReturnTo(returnTo),
    cancelPath: '/predplatne',
    immediateStart,
    referralCode,
    acknowledgedNoTrial,
    confirmPriceCzk,
  });
  return res.status(result.status).json(result.body);
});

/* ---------------------------------------------------------------------------
 * Plan 025: saved-card purchases, restore, card management, referral.
 * Every route here needs the signed-in account and the price the person saw
 * (confirmPriceCzk), so a click can never charge a different amount.
 * ------------------------------------------------------------------------- */

const periodSec = (sub, field) => sub?.[field] ?? sub?.items?.data?.[0]?.[field] ?? null;

// The customer on a profile may have been created by a parent's payment link.
// It is the person's own only when they started a purchase themselves.
async function hasOwnCardHistory(userId) {
  const { data } = await supabase.from('purchases').select('id')
    .eq('user_id', userId).eq('checkout_context', 'self').in('status', ['pending', ...SETTLED_STATUSES]).limit(1);
  return Array.isArray(data) && data.length > 0;
}

// A card is "saved" for the signed-in person only when they entered it
// themselves: its fingerprint must match a purchase they made for themselves
// (paid, or waiting for their own confirmation). A parent's card stays the parent's.
async function savedCardFor(userId) {
  const { data: user } = await supabase.from('users')
    .select('stripe_customer_id, stripe_payment_method_id').eq('id', userId).single();
  if (!user?.stripe_customer_id) return null;
  let paymentMethod = user.stripe_payment_method_id;
  if (!paymentMethod) {
    const list = await stripe.paymentMethods.list({ customer: user.stripe_customer_id, type: 'card', limit: 1 });
    paymentMethod = list.data?.[0]?.id || null;
  }
  if (!paymentMethod) return null;
  const fingerprint = await cardFingerprintOf(paymentMethod);
  if (!fingerprint) return null;
  const { data: own } = await supabase.from('purchases').select('id')
    .eq('user_id', userId).eq('checkout_context', 'self').eq('card_fingerprint', fingerprint)
    .in('status', ['pending', ...SETTLED_STATUSES]).limit(1);
  return Array.isArray(own) && own.length ? { customer: user.stripe_customer_id, paymentMethod } : null;
}

// Clears stale pending purchases before a one-click charge. The pending row for
// the same plan and amount is kept: a double click must reuse it so Stripe's
// idempotency key returns the same PaymentIntent. A row is marked failed only
// once its Checkout session is certainly closed; a completed one is left alone.
async function abandonPendingPurchases(userId, keep = null) {
  const { data } = await supabase.from('purchases')
    .select('id, plan, price_amount_minor, stripe_checkout_session_id')
    .eq('user_id', userId).eq('status', 'pending');
  for (const row of Array.isArray(data) ? data : []) {
    if (!row.stripe_checkout_session_id && keep && row.plan === keep.planId && row.price_amount_minor === keep.amountMinor) continue;
    if (row.stripe_checkout_session_id) {
      await expireCheckoutSession(row.stripe_checkout_session_id);
      let closed = false;
      try { closed = (await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id)).status === 'expired'; } catch { /* unknown: leave it */ }
      if (!closed) continue;
    }
    await supabase.from('purchases').update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('status', 'pending').throwOnError();
  }
}

// Reserve (or reuse) the pending row for a one-click purchase.
async function reserveSavedCardPurchase({ userId, planId, amountMinor, ...rest }) {
  await abandonPendingPurchases(userId, { planId, amountMinor });
  const purchase = await reservePurchase({ userId, planId, checkoutContext: 'self', amountMinor, ...rest });
  if (purchase.stripe_checkout_session_id) {
    return { fail: { status: 409, body: { error: 'Platba se právě potvrzuje. Obnov stránku za chvíli.', code: 'CHECKOUT_PROCESSING' } } };
  }
  return { purchase };
}

async function failPurchase(purchaseId) {
  await supabase.from('purchases').update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', purchaseId).eq('status', 'pending');
}

// One on-session PaymentIntent with the person present. Activation is always
// done by the payment_intent.succeeded webhook, never here.
async function chargeSavedCardOnSession({ userId, purchaseId, amountMinor, metadata }) {
  const card = await savedCardFor(userId);
  if (!card) return { status: 'no_card' };
  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: 'czk',
      customer: card.customer,
      payment_method: card.paymentMethod,
      confirm: true,
      off_session: false,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata,
    }, { idempotencyKey: 'onsession:' + purchaseId });
    if (intent.status === 'succeeded') return { status: 'succeeded', paymentIntentId: intent.id };
    if (intent.status === 'requires_action') {
      return { status: 'requires_action', clientSecret: intent.client_secret, paymentIntentId: intent.id };
    }
    return { status: 'failed', message: 'Platba se nezdařila.' };
  } catch (err) {
    return { status: 'failed', message: err.message || 'Platba se nezdařila.' };
  }
}

async function runSavedCardCharge({ userId, purchase, amountMinor, plan, extraMetadata = {} }) {
  await supabase.from('purchases').update({
    immediate_start_consent_at: new Date().toISOString(),
    terms_version: TERMS_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', purchase.id).eq('status', 'pending').throwOnError();
  const result = await chargeSavedCardOnSession({
    userId, purchaseId: purchase.id, amountMinor,
    metadata: { plan_id: plan, app_user_id: userId, purchase_id: purchase.id, ...extraMetadata },
  });
  if (result.status === 'no_card') {
    await failPurchase(purchase.id);
    return { status: 409, body: { error: 'Nemáš uloženou kartu.', code: 'NO_SAVED_CARD' } };
  }
  if (result.status === 'failed') {
    await failPurchase(purchase.id);
    return { status: 402, body: { error: result.message, code: 'CARD_FAILED' } };
  }
  return { status: 200, body: { status: result.status, clientSecret: result.clientSecret || null, purchaseId: purchase.id } };
}

// Season (or, after the deadline, spring) with the saved card and no trial.
async function seasonSavedCardPurchase(userId, { confirmPriceCzk, immediateStart } = {}) {
  const loaded = await loadPayableProfile(userId);
  if (loaded.fail) return loaded.fail;
  if (hasLivePlan(loaded.profile)) return alreadySubscribed(loaded.profile);
  if (immediateStart !== true) return immediateStartRequired();
  const now = new Date();
  if (!onSale(now)) return { status: 409, body: { error: 'Prodej pro tuto sezónu už skončil.', code: 'SALES_CLOSED' } };
  const priceCzk = seasonPriceCzk(now);
  if (Number(confirmPriceCzk) !== priceCzk) return priceChanged(priceCzk);
  if (!(await savedCardFor(userId))) {
    return { status: 409, body: { error: 'Nemáš uloženou kartu.', code: 'NO_SAVED_CARD' } };
  }
  const plan = isSpring(now) ? 'spring' : 'season';
  const reserved = await reserveSavedCardPurchase({ userId, planId: plan, amountMinor: priceCzk * 100 });
  if (reserved.fail) return reserved.fail;
  return runSavedCardCharge({ userId, purchase: reserved.purchase, amountMinor: priceCzk * 100, plan });
}

// "Prodloužit do 30. 6." for a live monthly, from 1 Feb: the spring price plus
// every monthly payment still due before the deadline (usually none), so it can
// never be cheaper than paying monthly to the end and then buying spring.
async function quoteExtend(userId) {
  const loaded = await loadPayableProfile(userId);
  if (loaded.fail) return { fail: loaded.fail };
  const { profile } = loaded;
  if (profile.plan_id !== 'monthly' || !profile.stripe_subscription_id || !paidAccessActive(profile)) {
    return { fail: { status: 400, body: { error: 'Není co prodloužit.' } } };
  }
  const now = new Date();
  if (now < SPRING_ADDON_FROM || now > DEADLINE) {
    return { fail: { status: 409, body: { error: 'Prodloužit lze od 1. 2. do konce přihlášek.', code: 'EXTEND_NOT_AVAILABLE' } } };
  }
  let sub;
  try {
    sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  } catch {
    return { fail: { status: 502, body: { error: 'Předplatné se teď nepodařilo ověřit. Zkus to prosím znovu.' } } };
  }
  const periodEnd = periodSec(sub, 'current_period_end');
  const amountCzk = springAddOnCzk(periodEnd ? periodEnd * 1000 : DEADLINE);
  return { profile, amountMinor: amountCzk * 100, springCzk: SPRING_PRICE, remainingMonthlyCzk: amountCzk - SPRING_PRICE };
}

async function extendMonthly(userId, { confirmPriceCzk, immediateStart } = {}) {
  const quote = await quoteExtend(userId);
  if (quote.fail) return quote.fail;
  const { profile, amountMinor } = quote;
  if (immediateStart !== true) return immediateStartRequired();
  if (Number(confirmPriceCzk) !== amountMinor / 100) return priceChanged(amountMinor / 100);
  if (!(await savedCardFor(userId))) {
    return { status: 409, body: { error: 'Nemáš uloženou kartu.', code: 'NO_SAVED_CARD' } };
  }
  const reserved = await reserveSavedCardPurchase({ userId, planId: 'season', amountMinor });
  if (reserved.fail) return reserved.fail;
  return runSavedCardCharge({
    userId, purchase: reserved.purchase, amountMinor, plan: 'season',
    extraMetadata: { switch_from_subscription: profile.stripe_subscription_id },
  });
}

// What the extend sheet shows before the person confirms. Read-only.
app.get('/api/plan/extend-preview', requireAuth, async (req, res) => {
  try {
    const quote = await quoteExtend(req.user.id);
    if (quote.fail) return res.status(quote.fail.status).json(quote.fail.body);
    return res.json({ amountCzk: quote.amountMinor / 100, springCzk: quote.springCzk, remainingMonthlyCzk: quote.remainingMonthlyCzk });
  } catch {
    return res.status(500).json({ error: 'Částku se teď nepodařilo spočítat.' });
  }
});

// Applies a state change the server itself caused through the same replay-safe
// RPC the webhooks use, under a synthetic event id.
function applyInternalPurchaseEvent(name, key, params) {
  return applyStripePurchaseEvent(
    { id: `internal:${name}:${key}`, type: `internal.${name}`, created: Math.floor(Date.now() / 1000) },
    params,
  );
}

// Monthly again, with the saved card. The subscription ends itself at the deadline.
async function monthlySavedCardPurchase(userId, { confirmPriceCzk, immediateStart } = {}) {
  const loaded = await loadPayableProfile(userId);
  if (loaded.fail) return loaded.fail;
  if (hasLivePlan(loaded.profile)) return alreadySubscribed(loaded.profile);
  if (immediateStart !== true) return immediateStartRequired();
  const now = new Date();
  const quote = monthlyQuote(now);
  if (!quote) {
    return { status: 409, body: { error: 'Měsíční předplatné už se neprodává.', code: 'MONTHLY_CLOSED' } };
  }
  if (Number(confirmPriceCzk) !== quote.firstChargeCzk) return priceChanged(quote.firstChargeCzk);
  const priceId = process.env[PLAN_PRICE_ENV.monthly];
  if (!priceId) return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  const card = await savedCardFor(userId);
  if (!card) return { status: 409, body: { error: 'Nemáš uloženou kartu.', code: 'NO_SAVED_CARD' } };

  // A subscription that exists in Stripe but is not yet reflected in our profile must block a second one.
  const existing = await stripe.subscriptions.list({ customer: card.customer, status: 'all', limit: 10 });
  if ((existing.data || []).some((sub) => !['canceled', 'incomplete_expired'].includes(sub.status))) {
    return alreadySubscribed(loaded.profile);
  }
  const reserved = await reserveSavedCardPurchase({ userId, planId: 'monthly', amountMinor: quote.firstChargeCzk * 100 });
  if (reserved.fail) return reserved.fail;
  const purchase = reserved.purchase;
  await supabase.from('purchases').update({
    immediate_start_consent_at: new Date().toISOString(), terms_version: TERMS_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', purchase.id).eq('status', 'pending').throwOnError();
  const metadata = { plan_id: 'monthly', app_user_id: userId, purchase_id: purchase.id };
  let sub;
  try {
    sub = await stripe.subscriptions.create({
      customer: card.customer,
      items: [{ price: priceId }],
      default_payment_method: card.paymentMethod,
      cancel_at: deadlineUnix(),
      ...(quote.singleCharge ? { billing_cycle_anchor: deadlineUnix() } : {}),
      expand: ['latest_invoice.payment_intent'],
      metadata,
    }, { idempotencyKey: 'monthly-saved:' + purchase.id });
  } catch (err) {
    await failPurchase(purchase.id);
    return { status: 402, body: { error: err.message || 'Platba se nezdařila.', code: 'CARD_FAILED' } };
  }
  const active = sub.status === 'active';
  const outcome = await applyInternalPurchaseEvent('monthly_saved_card', purchase.id, {
    userId,
    purchaseId: purchase.id,
    purchaseStatus: active ? 'active' : null,
    subscriptionId: sub.id,
    accessStartsAt: Number.isFinite(sub.start_date) ? new Date(sub.start_date * 1000).toISOString() : null,
    accessEndsAt: accessEndsAt(sub),
    profilePatch: active ? {
      subscription_status: mapStripeStatus(sub.status, 'monthly'),
      stripe_customer_id: card.customer,
      stripe_subscription_id: sub.id,
      stripe_payment_method_id: card.paymentMethod,
      plan_id: 'monthly',
      access_expires_at: accessEndsAt(sub),
      plan_started_at: new Date().toISOString(),
      last_paid_at: new Date().toISOString(),
      cancel_at_period_end: false,
    } : {},
  });
  if (active) await completeOnboardingAfterCheckout(userId, purchase.id, outcome);
  const invoicePayment = typeof sub.latest_invoice === 'object' ? sub.latest_invoice?.payment_intent : null;
  const clientSecret = !active && invoicePayment?.status === 'requires_action' ? invoicePayment.client_secret : null;
  return { status: 200, body: { status: active ? 'succeeded' : clientSecret ? 'requires_action' : 'processing', clientSecret, purchaseId: purchase.id } };
}

const SAVED_CARD_ROUTES = [
  ['/api/purchase/season-saved-card', seasonSavedCardPurchase],
  ['/api/plan/spring', seasonSavedCardPurchase],
  ['/api/plan/extend', extendMonthly],
  ['/api/plan/monthly-saved-card', monthlySavedCardPurchase],
];
for (const [route, handler] of SAVED_CARD_ROUTES) {
  app.post(route, checkoutLimiter, requireAuth, async (req, res) => {
    try {
      const result = await handler(req.user.id, req.body || {});
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Saved-card purchase failed:', err.code || err.type || 'error');
      return res.status(500).json({ error: 'Platbu se nepodařilo dokončit. Zkus to prosím znovu.' });
    }
  });
}

// A trial that was blocked (the card already had one) waits here for the
// person's decision: pay now, or drop the card. Nothing is charged before this.
async function pendingConfirmationFor(userId) {
  const { data } = await supabase.from('purchases').select('id, plan, price_amount_minor, discount_minor')
    .eq('user_id', userId).eq('status', 'pending').eq('needs_payment_confirmation', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

app.post('/api/purchase/confirm-pending', checkoutLimiter, requireAuth, async (req, res) => {
  try {
    const loaded = await loadPayableProfile(req.user.id);
    if (loaded.fail) return res.status(loaded.fail.status).json(loaded.fail.body);
    const purchase = await pendingConfirmationFor(req.user.id);
    if (!purchase) return res.status(404).json({ error: 'Není co potvrdit.' });
    if (hasLivePlan(loaded.profile)) {
      const live = alreadySubscribed(loaded.profile);
      return res.status(live.status).json(live.body);
    }
    if (req.body?.immediateStart !== true) {
      const required = immediateStartRequired();
      return res.status(required.status).json(required.body);
    }
    const now = new Date();
    if (!onSale(now)) return res.status(409).json({ error: 'Prodej pro tuto sezónu už skončil.', code: 'SALES_CLOSED' });
    // Never charge more than today's price (it falls daily).
    const amountMinor = Math.min(purchase.price_amount_minor, seasonPriceCzk(now) * 100 - (purchase.discount_minor || 0));
    if (Number(req.body?.confirmPriceCzk) !== amountMinor / 100) {
      const changed = priceChanged(amountMinor / 100);
      return res.status(changed.status).json(changed.body);
    }
    const plan = isSpring(now) ? 'spring' : 'season';
    await supabase.from('purchases').update({
      plan, price_amount_minor: amountMinor, updated_at: now.toISOString(),
    }).eq('id', purchase.id).eq('status', 'pending').throwOnError();
    const result = await runSavedCardCharge({ userId: req.user.id, purchase, amountMinor, plan });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Pending purchase confirmation failed:', err.code || err.type || 'error');
    return res.status(500).json({ error: 'Platbu se nepodařilo dokončit. Zkus to prosím znovu.' });
  }
});

app.post('/api/purchase/discard-pending', requireAuth, async (req, res) => {
  try {
    const purchase = await pendingConfirmationFor(req.user.id);
    if (!purchase) return res.status(404).json({ error: 'Není co zahodit.' });
    const card = stripe ? await savedCardFor(req.user.id) : null;
    if (card) {
      try { await stripe.paymentMethods.detach(card.paymentMethod); } catch { /* already detached */ }
    }
    await supabase.from('purchases').update({ status: 'failed', needs_payment_confirmation: false, updated_at: new Date().toISOString() })
      .eq('id', purchase.id).eq('status', 'pending').throwOnError();
    await supabase.from('users').update({ stripe_payment_method_id: null }).eq('id', req.user.id).throwOnError();
    savedCardCache.delete(req.user.id);
    return res.json({ discarded: true });
  } catch (err) {
    console.error('Pending purchase discard failed:', err.code || err.type || 'error');
    return res.status(500).json({ error: 'Kartu se teď nepodařilo odebrat. Zkus to prosím znovu.' });
  }
});

// Undo a cancellation, with no new trial and no new card entry.
async function restorePlanForUser(userId) {
  if (!stripe) {
    return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  }
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_subscription_id, plan_id, subscription_status, cancel_at_period_end, access_expires_at, season_charge_due_at')
    .eq('id', userId)
    .single();
  if (profileError) {
    return { status: 500, body: { error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' } };
  }

  if (profile.plan_id === 'monthly' && profile.cancel_at_period_end && profile.stripe_subscription_id && paidAccessActive(profile)) {
    if (new Date() >= DEADLINE) {
      return { status: 409, body: { error: 'Přihlášky už skončily.', code: 'MONTHLY_CLOSED' } };
    }
    try {
      const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at: deadlineUnix() });
      await supabase.from('purchases').update({ cancel_requested_at: null, cancel_reason: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId).eq('plan', 'monthly').eq('status', 'active').throwOnError();
      await supabase.from('users').update({ cancel_at_period_end: false }).eq('id', userId).throwOnError();
      return { status: 200, body: { restored: 'monthly', accessUntil: accessEndsAt(updated) } };
    } catch {
      return { status: 502, body: { error: 'Předplatné se nepodařilo obnovit. Zkus to prosím znovu.' } };
    }
  }

  const { data: purchase, error: purchaseError } = await supabase.from('purchases')
    .select('id, price_amount_minor, access_ends_at')
    .eq('user_id', userId).eq('plan', 'season').eq('status', 'active').eq('trial', true)
    .not('cancel_requested_at', 'is', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (purchaseError) return { status: 500, body: { error: 'Platební stav se nepodařilo ověřit.' } };
  if (!purchase) return { status: 400, body: { error: 'Není co obnovit.' } };
  const { data: outcome, error: rpcError } = await supabase.rpc('restore_season_charge', {
    p_user_id: userId, p_purchase_id: purchase.id,
  });
  if (rpcError) return { status: 500, body: { error: 'Obnovení se nepodařilo bezpečně uložit.' } };
  if (outcome === 'restored') {
    return { status: 200, body: { restored: 'season', chargeAt: purchase.access_ends_at, priceCzk: purchase.price_amount_minor / 100 } };
  }
  if (outcome === 'too_late') {
    return { status: 409, body: { error: 'Zkušební období už skončilo.', code: 'RESTORE_TOO_LATE' } };
  }
  if (outcome === 'no_card') {
    return { status: 409, body: { error: 'Nemáš uloženou kartu.', code: 'NO_SAVED_CARD' } };
  }
  return { status: 400, body: { error: 'Není co obnovit.' } };
}

app.post('/api/subscription/restore', checkoutLimiter, requireAuth, async (req, res) => {
  const result = await restorePlanForUser(req.user.id);
  return res.status(result.status).json(result.body);
});

// Brand and last four digits for Settings; cached briefly so /api/me stays cheap.
const savedCardCache = new Map();
async function savedCardSummary(userId) {
  const cached = savedCardCache.get(userId);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.value;
  let value = null;
  try {
    const card = stripe ? await savedCardFor(userId) : null;
    if (card) {
      const pm = await stripe.paymentMethods.retrieve(card.paymentMethod);
      if (pm?.card) value = { brand: pm.card.brand, last4: pm.card.last4 };
    }
  } catch {
    value = null;
  }
  savedCardCache.set(userId, { value, at: Date.now() });
  return value;
}

// The card stays saved after a cancellation (for one-click re-buy). It goes
// only on request, and never while it is about to be charged.
app.delete('/api/payment-method', checkoutLimiter, requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' });
  try {
    const { data: profile, error } = await supabase.from('users')
      .select('plan_id, subscription_status, season_charge_due_at, cancel_at_period_end, access_expires_at')
      .eq('id', req.user.id).single();
    if (error) return res.status(500).json({ error: 'Nepodařilo se ověřit platební profil.' });
    if (profile.plan_id === 'season' && profile.subscription_status === 'trialing' && profile.season_charge_due_at) {
      return res.status(409).json({ error: 'Nejdřív zruš zkušební období.', code: 'TRIAL_CARD_IN_USE' });
    }
    if (profile.plan_id === 'monthly' && paidAccessActive(profile) && !profile.cancel_at_period_end) {
      return res.status(409).json({ error: 'Nejdřív zruš předplatné.', code: 'SUBSCRIPTION_CARD_IN_USE' });
    }
    const card = await savedCardFor(req.user.id);
    if (card) {
      try { await stripe.paymentMethods.detach(card.paymentMethod); } catch { /* already detached */ }
    }
    await supabase.from('users').update({ stripe_payment_method_id: null }).eq('id', req.user.id).throwOnError();
    savedCardCache.delete(req.user.id);
    return res.json({ removed: true });
  } catch (err) {
    console.error('Card removal failed:', err.code || err.type || 'error');
    return res.status(502).json({ error: 'Kartu se teď nepodařilo odebrat. Zkus to prosím znovu.' });
  }
});

/* ---------------------------------------------------------------------------
 * Referral (plan 025 §4.8). Informational copy only, shown to people who
 * already paid; rewards are capped at what the referrer paid, so recruiting
 * can only give a price back, never a profit.
 * ------------------------------------------------------------------------- */

async function referrerNetPaid(referrerId) {
  const { data: purchase } = await supabase.from('purchases').select('id, stripe_payment_intent_id')
    .eq('user_id', referrerId).in('plan', ['season', 'spring']).eq('status', 'active')
    .not('stripe_payment_intent_id', 'is', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!purchase?.stripe_payment_intent_id) return null;
  const intent = await stripe.paymentIntents.retrieve(purchase.stripe_payment_intent_id, { expand: ['latest_charge'] });
  const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  const netMinor = charge ? charge.amount - (charge.amount_refunded || 0) : (intent.amount_received ?? intent.amount ?? 0);
  return { netMinor, paymentIntentId: purchase.stripe_payment_intent_id };
}

async function ensureReferralCode(userId) {
  const { data: existing } = await supabase.from('referral_codes').select('code').eq('user_id', userId).maybeSingle();
  if (existing?.code) return existing.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let code = '';
    for (let i = 0; i < 8; i += 1) code += REFERRAL_ALPHABET[crypto.randomInt(REFERRAL_ALPHABET.length)];
    const { error } = await supabase.from('referral_codes').insert({ user_id: userId, code });
    if (!error) return code;
    if (error.code !== '23505') throw error;
    const { data: raced } = await supabase.from('referral_codes').select('code').eq('user_id', userId).maybeSingle();
    if (raced?.code) return raced.code;
  }
  throw new Error('Kód pozvánky se nepodařilo vytvořit.');
}

app.get('/api/referral', requireAuth, async (req, res) => {
  try {
    if (!(await referralReferrerEligible(req.user.id))) return res.json({ eligible: false });
    const code = await ensureReferralCode(req.user.id);
    const { data: rows } = await supabase.from('referrals')
      .select('status, reward_minor').eq('referrer_user_id', req.user.id);
    const list = Array.isArray(rows) ? rows : [];
    const rewarded = list.filter((r) => r.status === 'rewarded');
    const rewardedMinor = rewarded.reduce((sum, r) => sum + r.reward_minor, 0);
    let capCzk = null;
    try {
      const paid = stripe ? await referrerNetPaid(req.user.id) : null;
      if (paid) capCzk = Math.round((paid.netMinor + rewardedMinor) / 100);
    } catch { capCzk = null; }
    return res.json({
      eligible: true,
      code,
      link: `${FRONTEND_URL}/?pozvanka=${code}`,
      discountCzk: REFERRAL_DISCOUNT,
      rewardCzk: REFERRAL_REWARD,
      rewardedCzk: rewardedMinor / 100,
      rewardedCount: rewarded.length,
      pendingCount: list.filter((r) => r.status === 'pending').length,
      capCzk,
    });
  } catch (err) {
    console.error('Referral status failed:', err.code || err.type || 'error');
    return res.status(500).json({ error: 'Pozvánky se teď nepodařilo načíst.' });
  }
});

// Anonymous: says only whether a code could apply, never who owns it.
app.get('/api/referral/check', shareLimiter, async (req, res) => {
  const code = typeof req.query?.code === 'string' ? req.query.code.trim().toUpperCase() : '';
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return res.json({ valid: false });
  const { data: row } = await supabase.from('referral_codes').select('user_id').eq('code', code).maybeSingle();
  return res.json({ valid: Boolean(row?.user_id && (await referralReferrerEligible(row.user_id))) });
});

// Called when a purchase turns active; the same-card check needs the fingerprint.
async function recordReferral(purchaseId) {
  const { data: purchase } = await supabase.from('purchases')
    .select('id, user_id, referrer_user_id, discount_kind, card_fingerprint').eq('id', purchaseId).single();
  if (!purchase?.referrer_user_id || purchase.discount_kind !== 'referral') return;
  let status = 'pending';
  let voidReason = null;
  if (purchase.card_fingerprint) {
    const { data: same } = await supabase.from('purchases').select('id')
      .eq('user_id', purchase.referrer_user_id).eq('card_fingerprint', purchase.card_fingerprint).limit(1);
    if (Array.isArray(same) && same.length) { status = 'void'; voidReason = 'same_card'; }
  }
  await supabase.from('referrals').upsert({
    referrer_user_id: purchase.referrer_user_id,
    referred_user_id: purchase.user_id,
    referred_purchase_id: purchase.id,
    status,
    void_reason: voidReason,
  }, { onConflict: 'referred_purchase_id', ignoreDuplicates: true }).throwOnError();
}

async function settleReferral(referral) {
  const close = (status, extra = {}) => supabase.from('referrals')
    .update({ status, settled_at: new Date().toISOString(), ...extra })
    .eq('id', referral.id).eq('status', 'pending').throwOnError();
  const { data: referred } = await supabase.from('purchases')
    .select('status, trial, season_charge_status, access_starts_at').eq('id', referral.referred_purchase_id).single();
  if (!referred) return;
  if (['withdrawn', 'refunded', 'canceled', 'failed'].includes(referred.status)) {
    await close('void', { void_reason: 'referred_withdrew' });
    return;
  }
  if (referred.status !== 'active') return;
  if (referred.trial && referred.season_charge_status !== 'succeeded') return; // not paid yet
  const startedAt = referred.access_starts_at ? new Date(referred.access_starts_at).getTime() : null;
  if (!startedAt || Date.now() < startedAt + REFERRAL_SETTLE_DAYS * 86400000) return;

  const paid = await referrerNetPaid(referral.referrer_user_id);
  if (!paid) { await close('void', { void_reason: 'referrer_not_paid' }); return; }
  // Never pay out more than the referrer paid; 1 Kč always stays.
  if (paid.netMinor - 100 < REFERRAL_REWARD * 100) { await close('capped'); return; }
  const refund = await stripe.refunds.create({
    payment_intent: paid.paymentIntentId,
    amount: REFERRAL_REWARD * 100,
    reason: 'requested_by_customer',
    metadata: { referral_id: referral.id, kind: 'referral' },
  }, { idempotencyKey: 'referral:' + referral.id });
  await close('rewarded', { reward_minor: REFERRAL_REWARD * 100, stripe_refund_id: refund.id });
}

async function settleReferrals() {
  try {
    const { data } = await supabase.from('referrals')
      .select('id, referrer_user_id, referred_user_id, referred_purchase_id').eq('status', 'pending').limit(50);
    for (const referral of Array.isArray(data) ? data : []) {
      try { await settleReferral(referral); } catch (err) {
        console.error('Referral settlement failed:', err.code || err.type || 'error');
      }
    }
  } catch (err) {
    console.error('Referral settlement query failed:', err.code || 'error');
  }
}

// requireAuth only, deliberately NOT requireAccess: an account whose access has
// lapsed is exactly the account that most needs to be able to cancel. Keep the
// Stripe and season-trial behavior shared with the parent's payment-link route.
const CANCEL_REASONS = ['price', 'not_needed', 'other'];
async function cancelPlanForUser(userId, reason = null) {
  const cancelReason = CANCEL_REASONS.includes(reason) ? reason : null;
  if (!stripe) {
    return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_subscription_id, plan_id, subscription_status, season_charge_due_at')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { status: 500, body: { error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' } };
  }

  if (profile?.plan_id === 'season' && ['trialing', 'past_due'].includes(profile.subscription_status) && profile.season_charge_due_at) {
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('plan', 'season')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (purchaseError) {
      return { status: 500, body: { error: 'Platební stav se nepodařilo ověřit.' } };
    }
    if (!purchase?.id) {
      // Legacy trial rows pre-date the purchase ledger. They have no queued
      // Stripe charge to cancel, so clearing the schedule is safe.
      const { error } = await supabase.from('users').update({
        plan_id: null, subscription_status: 'canceled', season_charge_due_at: null,
      }).eq('id', userId).eq('subscription_status', 'trialing');
      if (error) return { status: 500, body: { error: 'Předplatné se nepodařilo zrušit. Zkus to prosím znovu.' } };
      return { status: 200, body: { cancelled: 'immediately', accessUntil: null } };
    }

    if (cancelReason) {
      await supabase.from('purchases').update({ cancel_reason: cancelReason }).eq('id', purchase.id).eq('user_id', userId);
    }
    const { data: cancelRows, error: cancelError } = await supabase.rpc('request_season_charge_cancel', {
      p_user_id: userId, p_purchase_id: purchase.id,
    });
    if (cancelError) return { status: 500, body: { error: 'Zrušení se nepodařilo bezpečně uložit.' } };
    const cancellation = Array.isArray(cancelRows) ? cancelRows[0] : cancelRows;
    if (cancellation?.result === 'already_charged') {
      return { status: 409, body: { code: 'SEASON_ALREADY_CHARGED', error: 'Jednorázová platba už proběhla; sezónní přístup se neobnovuje.' } };
    }
    if (cancellation?.result === 'cancellation_requested' && cancellation.payment_intent_id) {
      try {
        const intent = await stripe.paymentIntents.retrieve(cancellation.payment_intent_id);
        if (intent.status === 'succeeded') {
          await supabase.rpc('set_season_charge_state', {
            p_purchase_id: purchase.id, p_state: 'succeeded', p_payment_intent_id: intent.id,
          });
          const refundStatus = await refundCanceledSeasonPurchase({
            purchaseId: purchase.id, userId, paymentIntentId: intent.id, finishSeasonCancel: true,
          });
          return { status: refundStatus === 'pending' ? 202 : 200, body: {
            cancelled: refundStatus === 'pending' ? 'pending' : 'immediately', accessUntil: null,
          } };
        }
        if (!['canceled', 'processing'].includes(intent.status)) {
          await stripe.paymentIntents.cancel(intent.id);
        }
        if (intent.status !== 'processing') {
          await supabase.rpc('finish_season_charge_cancel', { p_user_id: userId, p_purchase_id: purchase.id });
          return { status: 200, body: { cancelled: 'immediately', accessUntil: null } };
        }
      } catch (err) {
        console.error('Season charge cancellation is pending:', err.code || err.type || 'stripe_error');
        return { status: 202, body: { cancelled: 'pending', accessUntil: null } };
      }
    }
    if (cancellation?.result === 'cancellation_requested') {
      return { status: 202, body: { cancelled: 'pending', accessUntil: null } };
    }
    if (cancellation?.result === 'not_found') {
      return { status: 500, body: { error: 'Platební záznam se nepodařilo ověřit.' } };
    }
    return { status: 200, body: { cancelled: 'immediately', accessUntil: null } };
  }

  if (!profile?.stripe_subscription_id) {
    return { status: 400, body: { error: 'Žádné aktivní předplatné k zrušení.' } };
  }

  const { data: monthlyPurchase, error: monthlyPurchaseError } = await supabase.from('purchases')
    .select('id').eq('user_id', userId).eq('plan', 'monthly').eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (monthlyPurchaseError) {
    return { status: 500, body: { error: 'Platební stav se nepodařilo ověřit.' } };
  }
  if (monthlyPurchase?.id) {
    const { error } = await supabase.from('purchases').update({
      cancel_requested_at: new Date().toISOString(), cancel_reason: cancelReason, updated_at: new Date().toISOString(),
    }).eq('id', monthlyPurchase.id).eq('user_id', userId).eq('status', 'active');
    if (error) return { status: 500, body: { error: 'Zrušení se nepodařilo bezpečně uložit.' } };
  }

  try {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    if (sub.status === 'trialing') {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      return { status: 200, body: { cancelled: 'immediately', accessUntil: null } };
    }

    // End at the period's end, or at the deadline if that comes first, so a
    // cancelled plan never keeps access past what was paid for.
    const endSec = periodSec(sub, 'current_period_end');
    const cancelAtSec = endSec ? Math.min(endSec, deadlineUnix()) : deadlineUnix();
    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at: cancelAtSec,
    });
    const accessUntil = accessEndsAt({ ...sub, ...updated, cancel_at: cancelAtSec });
    return { status: 200, body: { cancelled: 'at_period_end', accessUntil } };
  } catch (err) {
    return { status: 500, body: { error: err.message } };
  }
}

app.post('/api/subscription/cancel', requireAuth, async (req, res) => {
  const result = await cancelPlanForUser(req.user.id, req.body?.reason);
  return res.status(result.status).json(result.body);
});

/**
 * Statutory 14-day withdrawal (Terms §6). The account route and parent link
 * call the same operation so a payer can cancel or withdraw from their surface.
 *
 * A person who expressly asked for access to start at once pays for the time
 * used (§1834 OZ, CRD Art. 14(3)), pro rata; without that request nothing may
 * be deducted. The refund amount is fixed on the first request and stored, so
 * a retry after a failed refund repeats exactly the same amount.
 */
function withdrawalQuote({ purchase, profile, refundableMinor, now = new Date() }) {
  const owedMinor = purchase.immediate_start_consent_at
    ? Math.min(refundableMinor, proRataOwedMinor({
      paidMinor: purchase.price_amount_minor,
      paidAt: profile.last_paid_at || profile.plan_started_at,
      accessEndsAt: purchase.access_ends_at || ACCESS_END,
      now,
    }))
    : 0;
  return { owedMinor, refundMinor: Math.max(0, refundableMinor - owedMinor) };
}

function refundableOf(intent) {
  const charge = intent.latest_charge && typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  return charge ? charge.amount - (charge.amount_refunded || 0) : (intent.amount_received ?? intent.amount ?? 0);
}

const WITHDRAWAL_PURCHASE_COLUMNS =
  'id, plan, status, stripe_payment_intent_id, stripe_subscription_id, refund_status, refund_attempts, ' +
  'season_charge_status, price_amount_minor, immediate_start_consent_at, access_ends_at, refund_amount_minor';

async function withdrawPlanForUser(userId) {
  if (!stripe) {
    return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_customer_id, stripe_subscription_id, plan_id, subscription_status, plan_started_at, last_paid_at')
    .eq('id', userId)
    .single();
  if (profileError) {
    return { status: 500, body: { error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' } };
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .select(WITHDRAWAL_PURCHASE_COLUMNS)
    .eq('user_id', userId)
    .in('status', ['active', 'withdrawn'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (purchaseError) {
    return { status: 500, body: { error: 'Platební záznam se nepodařilo ověřit.' } };
  }
  const retryingRefund = purchase?.status === 'withdrawn' && ['pending', 'failed'].includes(purchase.refund_status);
  if (!canWithdraw(profile) && !retryingRefund) {
    return {
      status: 400,
      body: {
        code: 'NOT_WITHDRAWABLE',
        error: 'Lhůta pro odstoupení už uplynula nebo není od čeho odstoupit. Kontakt pro pomoc: info@stredninamiru.cz.',
      },
    };
  }

  let owedMinor = null;
  try {
    // Record the request before contacting Stripe, so a process crash cannot
    // make a retry look like a fresh or unrelated purchase.
    if (purchase && purchase.status !== 'withdrawn') {
      // The pro-rata amount is stored in the same write that makes the refund
      // sweepable: the hourly sweep refunds everything when it finds none.
      let quoted = null;
      if (purchase.stripe_payment_intent_id && (purchase.refund_amount_minor === null || purchase.refund_amount_minor === undefined)) {
        const intent = await stripe.paymentIntents.retrieve(purchase.stripe_payment_intent_id, { expand: ['latest_charge'] });
        if (intent.status === 'succeeded') {
          quoted = withdrawalQuote({ purchase, profile, refundableMinor: refundableOf(intent) });
          purchase.refund_amount_minor = quoted.refundMinor;
        }
      }
      const { error } = await supabase.from('purchases').update({
        status: 'withdrawn',
        cancel_requested_at: new Date().toISOString(),
        refund_status: purchase.stripe_payment_intent_id ? 'pending' : 'none',
        ...(quoted ? { refund_amount_minor: quoted.refundMinor } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', purchase.id).eq('user_id', userId);
      if (error) throw error;
      if (quoted) owedMinor = quoted.owedMinor;
      // A friend who withdraws earns the referrer nothing.
      await supabase.from('referrals').update({ status: 'void', void_reason: 'referred_withdrew', settled_at: new Date().toISOString() })
        .eq('referred_purchase_id', purchase.id).eq('status', 'pending');
    }

    if (profile.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (!['canceled', 'incomplete_expired'].includes(sub.status)) {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      }
    }

    let paymentIntentId = purchase?.stripe_payment_intent_id || null;
    if (!paymentIntentId && purchase?.plan === 'monthly' && profile.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
        expand: ['latest_invoice.payment_intent'],
      });
      const latestInvoice = sub.latest_invoice;
      const paymentIntent = typeof latestInvoice === 'object' ? latestInvoice.payment_intent : null;
      paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null;
      if (paymentIntentId) {
        await supabase.from('purchases').update({ stripe_payment_intent_id: paymentIntentId })
          .eq('id', purchase.id).eq('user_id', userId).throwOnError();
      }
    }

    let refundStatus = 'none';
    let refundedHaleru = 0;
    if (purchase && paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
      if (intent.status !== 'succeeded') {
        refundStatus = await refundCanceledSeasonPurchase({ purchaseId: purchase.id, userId, paymentIntentId });
      }
      const existing = intent.status === 'succeeded'
        ? await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })
        : { data: [] };
      const settled = (existing.data || []).find((refund) => ['succeeded', 'pending'].includes(refund.status) && isWithdrawalRefund(refund));
      if (intent.status !== 'succeeded') {
        // The related charge has not settled, so there is nothing to refund.
      } else if (settled?.status === 'succeeded') {
        refundStatus = 'succeeded';
        refundedHaleru = settled.amount;
      } else if (settled?.status === 'pending') {
        refundStatus = 'pending';
      } else {
        let refundMinor = purchase.refund_amount_minor;
        if (refundMinor === null || refundMinor === undefined) {
          const quote = withdrawalQuote({ purchase, profile, refundableMinor: refundableOf(intent) });
          refundMinor = quote.refundMinor;
          owedMinor = quote.owedMinor;
          await supabase.from('purchases').update({ refund_amount_minor: refundMinor })
            .eq('id', purchase.id).eq('user_id', userId).throwOnError();
        }
        if (refundMinor <= 0) {
          await supabase.from('purchases').update({ refund_status: 'none', updated_at: new Date().toISOString() })
            .eq('id', purchase.id).eq('user_id', userId).throwOnError();
        } else {
          const failed = (existing.data || []).filter((refund) => refund.status === 'failed').length;
          const attempt = Math.max(Number(purchase.refund_attempts) || 0, failed) + 1;
          const { error: pendingError } = await supabase.rpc('set_purchase_refund_state', {
            p_user_id: userId, p_purchase_id: purchase.id, p_state: 'pending', p_refund_id: null,
          });
          if (pendingError) throw pendingError;
          try {
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              amount: refundMinor,
              reason: 'requested_by_customer',
              metadata: { kind: 'withdrawal', purchase_id: purchase.id },
            }, { idempotencyKey: `withdraw:${purchase.id}:attempt:${attempt}` });
            refundStatus = refund.status === 'succeeded' ? 'succeeded'
              : refund.status === 'failed' ? 'failed' : 'pending';
            refundedHaleru = refund.status === 'succeeded' ? refund.amount : 0;
            const { error: saveRefundError } = await supabase.rpc('set_purchase_refund_state', {
              p_user_id: userId, p_purchase_id: purchase.id,
              p_state: refundStatus, p_refund_id: refund.id,
            });
            if (saveRefundError) throw saveRefundError;
          } catch (err) {
            const { error: saveRefundError } = await supabase.rpc('set_purchase_refund_state', {
              p_user_id: userId, p_purchase_id: purchase.id, p_state: 'failed', p_refund_id: null,
            });
            if (saveRefundError) throw saveRefundError;
            console.error('Purchase-linked refund failed:', err.code || err.type || 'stripe_error');
            refundStatus = 'failed';
          }
        }
      }
      if (settled) {
        const { error: stateError } = await supabase.rpc('set_purchase_refund_state', {
          p_user_id: userId, p_purchase_id: purchase.id,
          p_state: refundStatus, p_refund_id: settled.id,
        });
        if (stateError) throw stateError;
      }
    }

    const at = new Date().toISOString();
    const { error } = await supabase.from('users').update({
      plan_id: null,
      subscription_status: 'canceled',
      access_expires_at: at,
      season_charge_due_at: null,
      cancel_at_period_end: false,
    }).eq('id', userId);
    if (error) throw error;

    return {
      status: refundStatus === 'failed' ? 202 : 200,
      body: {
        withdrawn: true,
        refundedCzk: refundedHaleru / 100,
        owedCzk: owedMinor === null ? null : owedMinor / 100,
        refundStatus,
        at,
      },
    };
  } catch (err) {
    console.error('Withdrawal failed:', err.code || err.type || 'stripe_error');
    return {
      status: 502,
      body: { error: 'Odstoupení se zatím nepodařilo dokončit. Zkus to prosím znovu; případnou platbu zkontrolujeme podle konkrétní objednávky.' },
    };
  }
}

// What the button would do, shown before the person confirms. Read-only.
async function withdrawalPreviewForUser(userId) {
  if (!stripe) {
    return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  }
  const { data: profile, error: profileError } = await supabase.from('users')
    .select('stripe_subscription_id, plan_id, subscription_status, plan_started_at, last_paid_at').eq('id', userId).single();
  if (profileError) return { status: 500, body: { error: 'Nepodařilo se ověřit předplatné.' } };
  if (!canWithdraw(profile)) return { status: 200, body: { canWithdraw: false, owedCzk: 0, refundCzk: 0 } };
  const { data: purchase } = await supabase.from('purchases').select(WITHDRAWAL_PURCHASE_COLUMNS)
    .eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
  try {
    let paymentIntentId = purchase?.stripe_payment_intent_id || null;
    if (!paymentIntentId && purchase?.plan === 'monthly' && profile.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, { expand: ['latest_invoice.payment_intent'] });
      const payment = typeof sub.latest_invoice === 'object' ? sub.latest_invoice?.payment_intent : null;
      paymentIntentId = typeof payment === 'string' ? payment : payment?.id || null;
    }
    // A trial that has not been charged yet costs nothing to leave.
    if (!purchase || !paymentIntentId) return { status: 200, body: { canWithdraw: true, owedCzk: 0, refundCzk: 0, trial: true } };
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const quote = withdrawalQuote({ purchase, profile, refundableMinor: refundableOf(intent) });
    return { status: 200, body: { canWithdraw: true, owedCzk: quote.owedMinor / 100, refundCzk: quote.refundMinor / 100, trial: false } };
  } catch {
    return { status: 502, body: { error: 'Částku se teď nepodařilo spočítat. Zkus to prosím znovu.' } };
  }
}

app.get('/api/subscription/withdraw-preview', requireAuth, async (req, res) => {
  const result = await withdrawalPreviewForUser(req.user.id);
  return res.status(result.status).json(result.body);
});
app.post('/api/subscription/withdraw', checkoutLimiter, requireAuth, async (req, res) => {
  const result = await withdrawPlanForUser(req.user.id);
  return res.status(result.status).json(result.body);
});

// Subscription state is only ever written here, from a Stripe-signed event.
// Nothing the browser sends can grant itself access.
async function applyStripePurchaseEvent(event, {
  userId = null,
  purchaseId = null,
  purchaseStatus = null,
  checkoutSessionId = null,
  setupIntentId = null,
  paymentIntentId = null,
  subscriptionId = null,
  accessStartsAt = null,
  accessEndsAt = null,
  profilePatch = {},
} = {}) {
  const eventCreated = Number.isSafeInteger(event.created) && event.created >= 0
    ? event.created
    : Math.floor(Date.now() / 1000);
  const { data, error } = await supabase.rpc('apply_stripe_purchase_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created: eventCreated,
    p_user_id: userId,
    p_purchase_id: purchaseId,
    p_purchase_status: purchaseStatus,
    p_checkout_session_id: checkoutSessionId,
    p_setup_intent_id: setupIntentId,
    p_payment_intent_id: paymentIntentId,
    p_subscription_id: subscriptionId,
    p_access_starts_at: accessStartsAt,
    p_access_ends_at: accessEndsAt,
    p_profile_patch: profilePatch,
  });
  if (error) throw error;
  if (purchaseStatus === 'active' && purchaseId && ['applied', 'duplicate'].includes(data)) {
    // Paid access exists now: a leftover "confirm your card" purchase must not be chargeable later.
    const { data: row } = await supabase.from('purchases').select('user_id').eq('id', purchaseId).maybeSingle();
    if (row?.user_id) {
      await supabase.from('purchases')
        .update({ status: 'failed', needs_payment_confirmation: false, updated_at: new Date().toISOString() })
        .eq('user_id', row.user_id).eq('status', 'pending').eq('needs_payment_confirmation', true).neq('id', purchaseId);
    }
  }
  return data;
}

async function completeOnboardingAfterCheckout(userId, purchaseId, outcome) {
  if (!userId || !purchaseId || !['applied', 'duplicate'].includes(outcome)) return;
  const { data, error } = await supabase.rpc('complete_paid_onboarding', {
    p_user_id: userId,
    p_purchase_id: purchaseId,
  });
  if (error) throw error;
  if (data !== true) {
    // e.g. the purchase was cancelled before this event arrived: nothing to retry.
    console.warn('Paid onboarding completion skipped: no matching active purchase');
  }
}

async function findStripePurchase({ purchaseId, subscriptionId, userId }) {
  let query = supabase.from('purchases').select('id, user_id, plan, trial, status, checkout_context, stripe_checkout_session_id, cancel_requested_at, stripe_payment_intent_id, refund_status');
  if (purchaseId) query = query.eq('id', purchaseId);
  else if (subscriptionId) query = query.eq('stripe_subscription_id', subscriptionId);
  else if (userId) query = query.eq('user_id', userId).eq('plan', 'season').eq('status', 'active');
  else return null;
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findStripeUser(column, value) {
  if (!value) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, subscription_status, stripe_setup_intent_id')
    .eq(column, value)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// The fingerprint identifies a physical card across accounts; null (wallets,
// lookup failure) leaves only the per-account rule, a known ceiling.
async function cardFingerprintOf(paymentMethodId) {
  if (!paymentMethodId) return null;
  try {
    const method = await stripe.paymentMethods.retrieve(paymentMethodId);
    return method?.card?.fingerprint || null;
  } catch {
    return null;
  }
}

// Has this account (another purchase) or this card (another account) already had its trial?
// Idempotent tail of a setup-mode checkout: the trial-abuse records and the
// referral. Safe to run again on a retried webhook.
async function setupFollowUps({ userId, purchaseId, setupIntentId }) {
  if (!userId || !purchaseId || !setupIntentId) return;
  const { data: purchase } = await supabase.from('purchases')
    .select('status, card_fingerprint').eq('id', purchaseId).maybeSingle();
  if (!purchase) return;
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const fingerprint = purchase.card_fingerprint || await cardFingerprintOf(setupIntent.payment_method);
  if (purchase.status === 'active') {
    await supabase.from('purchases').update({ card_fingerprint: fingerprint, trial: true }).eq('id', purchaseId);
    if (fingerprint) {
      await supabase.from('trial_card_fingerprints')
        .upsert({ fingerprint, user_id: userId }, { onConflict: 'fingerprint', ignoreDuplicates: true });
    }
    await supabase.from('users').update({ season_trial_used_at: new Date().toISOString() })
      .eq('id', userId).is('season_trial_used_at', null);
    await recordReferral(purchaseId);
  } else if (purchase.status === 'pending' && await trialConsumedElsewhere({ userId, purchaseId, fingerprint })) {
    await supabase.from('purchases').update({
      needs_payment_confirmation: true, trial: false, card_fingerprint: fingerprint, updated_at: new Date().toISOString(),
    }).eq('id', purchaseId).eq('status', 'pending');
  }
}

async function trialConsumedElsewhere({ userId, purchaseId, fingerprint }) {
  const { data: prior } = await supabase.from('purchases').select('id')
    .eq('user_id', userId).eq('trial', true).neq('id', purchaseId).in('status', SETTLED_STATUSES).limit(1);
  if (Array.isArray(prior) && prior.length) return true;
  if (!fingerprint) return false;
  const { data: owner } = await supabase.from('trial_card_fingerprints').select('user_id')
    .eq('fingerprint', fingerprint).maybeSingle();
  return Boolean(owner) && owner.user_id !== userId;
}

// A switch to the season pass ends the monthly plan once the new one is paid.
async function finishSwitchFromMonthly(userId, subscriptionId) {
  try {
    await stripe.subscriptions.cancel(subscriptionId, { prorate: false, invoice_now: false });
  } catch (err) {
    if (err.code !== 'resource_missing') throw err;
  }
  await supabase.from('purchases').update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('stripe_subscription_id', subscriptionId).eq('status', 'active').throwOnError();
}

// Monthly plans end at the deadline; if Stripe did not already prorate the last
// period, take off the days after it (idempotent per invoice). A period that
// starts at or after the deadline, or whose remainder would be under Stripe's
// 15 Kč minimum, is credited in full.
async function creditLastMonthlyPeriod(invoice) {
  if (invoice.billing_reason !== 'subscription_cycle' || invoice.status !== 'draft') return;
  const line = invoice.lines?.data?.[0];
  const start = line?.period?.start;
  const end = line?.period?.end;
  if (!line?.amount || !start || !end || end * 1000 <= DEADLINE.getTime()) return;
  const minimum = season.MIN_CHARGE_CZK * 100;
  // Stripe already prorated it to a sensible amount.
  if (start * 1000 < DEADLINE.getTime() && line.amount < MONTHLY_PRICE * 100 && line.amount >= minimum) return;
  const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription || null;
  const linked = subscriptionId ? await findStripePurchase({ subscriptionId }) : null;
  if (!linked) return;
  let creditMinor = start * 1000 >= DEADLINE.getTime()
    ? line.amount
    : Math.round(line.amount * (end * 1000 - DEADLINE.getTime()) / ((end - start) * 1000));
  if (line.amount - creditMinor > 0 && line.amount - creditMinor < minimum) creditMinor = line.amount;
  if (creditMinor < 100) return;
  await stripe.invoiceItems.create({
    customer: invoice.customer, invoice: invoice.id, currency: 'czk', amount: -creditMinor,
    description: 'Poslední období jen do 22. 2. 2027',
  }, { idempotencyKey: 'deadline-credit:' + invoice.id });
}

function purchaseStatusFromStripe(status) {
  if (['canceled', 'paused'].includes(status)) return 'canceled';
  // 'incomplete' is a 3-D Secure payment still in flight: the purchase stays pending so
  // the later 'active' update can complete it. Only incomplete_expired is final.
  if (status === 'incomplete') return 'pending';
  if (status === 'incomplete_expired') return 'failed';
  return 'active';
}

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

  const object = event.data?.object || {};
  try {
    if (event.type === 'checkout.session.completed' && object.mode === 'setup') {
      const userId = object.client_reference_id || object.metadata?.app_user_id || null;
      const profile = userId ? await findStripeUser('id', userId) : null;
      const purchaseId = object.metadata?.purchase_id || null;

      if (profile?.subscription_status === 'beta') {
        console.warn(JSON.stringify({
          level: 'warn', event: 'legacy_stripe_checkout_ignored_for_beta_tester',
          stripeEventId: event.id, stripeEventType: event.type,
          stripeCheckoutSessionId: object.id, stripeSetupIntentId: object.setup_intent,
          userId, checkoutMode: object.mode,
        }));
        await applyStripePurchaseEvent(event, { userId });
      } else if (profile?.stripe_setup_intent_id === object.setup_intent) {
        const outcome = await applyStripePurchaseEvent(event, {
          userId,
          purchaseId,
          checkoutSessionId: object.id,
          setupIntentId: object.setup_intent,
        });
        await completeOnboardingAfterCheckout(userId, purchaseId, outcome);
        // A retried delivery must still finish the trial-abuse records the first one may have missed.
        await setupFollowUps({ userId, purchaseId, setupIntentId: object.setup_intent });
      } else {
        const setupIntent = await stripe.setupIntents.retrieve(object.setup_intent);
        const fingerprint = await cardFingerprintOf(setupIntent.payment_method);
        if (userId && purchaseId && await trialConsumedElsewhere({ userId, purchaseId, fingerprint })) {
          // This account or card already had its trial: no charge is scheduled and
          // no access is granted until the person confirms paying now (or drops the card).
          await applyStripePurchaseEvent(event, {
            userId,
            purchaseId,
            checkoutSessionId: object.id,
            setupIntentId: object.setup_intent,
            profilePatch: {
              stripe_customer_id: object.customer,
              stripe_payment_method_id: setupIntent.payment_method,
              stripe_setup_intent_id: object.setup_intent,
            },
          });
          await supabase.from('purchases').update({
            needs_payment_confirmation: true, trial: false, card_fingerprint: fingerprint,
            updated_at: new Date().toISOString(),
          }).eq('id', purchaseId).eq('status', 'pending').throwOnError();
          return res.json({ received: true });
        }
        const checkoutAt = Number.isFinite(object.created) ? object.created * 1000 : Date.now();
        const checkoutDate = new Date(checkoutAt);
        const dueAt = new Date(checkoutAt + SEASON_TRIAL_DAYS * 24 * 60 * 60 * 1000);
        const outcome = await applyStripePurchaseEvent(event, {
          userId,
          purchaseId,
          purchaseStatus: 'active',
          checkoutSessionId: object.id,
          setupIntentId: object.setup_intent,
          accessStartsAt: checkoutDate.toISOString(),
          accessEndsAt: dueAt.toISOString(),
          profilePatch: {
            subscription_status: 'trialing',
            trial_expires_at: dueAt.toISOString(),
            stripe_customer_id: object.customer,
            stripe_payment_method_id: setupIntent.payment_method,
            stripe_setup_intent_id: object.setup_intent,
            plan_id: 'season',
            season_charge_due_at: dueAt.toISOString(),
            plan_started_at: checkoutDate.toISOString(),
          },
        });
        await completeOnboardingAfterCheckout(userId, purchaseId, outcome);
        if (['applied', 'duplicate'].includes(outcome) && purchaseId) {
          await supabase.from('purchases').update({ card_fingerprint: fingerprint, trial: true }).eq('id', purchaseId);
          if (fingerprint) {
            await supabase.from('trial_card_fingerprints')
              .upsert({ fingerprint, user_id: userId }, { onConflict: 'fingerprint', ignoreDuplicates: true });
          }
          await supabase.from('users').update({ season_trial_used_at: new Date().toISOString() })
            .eq('id', userId).is('season_trial_used_at', null);
          await recordReferral(purchaseId);
        }
      }
    } else if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
      const userId = object.client_reference_id || object.metadata?.app_user_id || null;
      const profile = userId ? await findStripeUser('id', userId) : null;
      const purchaseId = object.metadata?.purchase_id || null;

      if (profile?.subscription_status === 'beta') {
        console.warn(JSON.stringify({
          level: 'warn', event: 'legacy_stripe_checkout_ignored_for_beta_tester',
          stripeEventId: event.id, stripeEventType: event.type,
          stripeCheckoutSessionId: object.id, stripeSubscriptionId: object.subscription,
          userId, checkoutMode: object.mode,
        }));
        await applyStripePurchaseEvent(event, { userId });
      } else {
        let subscription = await stripe.subscriptions.retrieve(object.subscription);
        // The plan never bills after the end of applications; the last period
        // is charged only for the days up to the deadline (Stripe prorates it).
        if (subscription.cancel_at !== deadlineUnix() && Date.now() < DEADLINE.getTime()) {
          const updated = await stripe.subscriptions.update(object.subscription, {
            cancel_at: deadlineUnix(), proration_behavior: 'create_prorations',
          });
          subscription = { ...subscription, ...updated };
        }
        const planId = subscription.metadata?.plan_id || object.metadata?.plan_id;
        const defaultMethod = subscription.default_payment_method;
        const resolvedPurchaseId = purchaseId || subscription.metadata?.purchase_id || null;
        const purchaseStatus = purchaseStatusFromStripe(subscription.status);
        const outcome = await applyStripePurchaseEvent(event, {
          userId,
          purchaseId: resolvedPurchaseId,
          purchaseStatus,
          checkoutSessionId: object.id,
          subscriptionId: object.subscription,
          accessStartsAt: Number.isFinite(subscription.start_date)
            ? new Date(subscription.start_date * 1000).toISOString() : null,
          accessEndsAt: accessEndsAt(subscription),
          profilePatch: {
            subscription_status: mapStripeStatus(subscription.status, planId),
            stripe_customer_id: object.customer,
            stripe_subscription_id: object.subscription,
            ...(defaultMethod ? { stripe_payment_method_id: typeof defaultMethod === 'string' ? defaultMethod : defaultMethod.id } : {}),
            plan_id: planId,
            access_expires_at: accessEndsAt(subscription),
            plan_started_at: Number.isFinite(subscription.start_date)
              ? new Date(subscription.start_date * 1000).toISOString() : null,
            last_paid_at: Number.isFinite(subscription.start_date)
              ? new Date(subscription.start_date * 1000).toISOString() : null,
          },
        });
        if (purchaseStatus === 'active') await completeOnboardingAfterCheckout(userId, resolvedPurchaseId, outcome);
      }
    } else if (event.type === 'checkout.session.expired') {
      await applyStripePurchaseEvent(event, {
        userId: object.client_reference_id || object.metadata?.app_user_id || null,
        purchaseId: object.metadata?.purchase_id || null,
        purchaseStatus: 'failed',
        checkoutSessionId: object.id,
      });
    } else if (event.type === 'payment_intent.succeeded' && SEASON_PLANS.includes(object.metadata?.plan_id)) {
      const userId = object.metadata?.app_user_id || null;
      const purchaseId = object.metadata?.purchase_id || null;
      const linked = purchaseId
        ? await findStripePurchase({ purchaseId })
        : await findStripePurchase({ userId });
      if (linked && !linked.trial && linked.status === 'failed') {
        await refundOrphanPayment(object, linked.id);
        return res.json({ received: true });
      }
      if (linked?.cancel_requested_at) {
        await supabase.rpc('set_season_charge_state', {
          p_purchase_id: linked.id, p_state: 'succeeded', p_payment_intent_id: object.id,
        });
        await refundCanceledSeasonPurchase({ purchaseId: linked.id, userId: linked.user_id, paymentIntentId: object.id, finishSeasonCancel: true });
      } else {
        const paidAt = Number.isFinite(object.created) ? new Date(object.created * 1000) : new Date();
        // The scheduled charge after a trial; anything else is a purchase paid on the spot.
        const trialCharge = !linked || linked.trial;
        const switchedFrom = object.metadata?.switch_from_subscription || null;
        const outcome = await applyStripePurchaseEvent(event, {
          userId,
          purchaseId,
          purchaseStatus: 'active',
          paymentIntentId: object.id,
          accessStartsAt: trialCharge ? null : paidAt.toISOString(),
          accessEndsAt: ACCESS_END.toISOString(),
          profilePatch: {
            subscription_status: 'season',
            access_expires_at: ACCESS_END.toISOString(),
            season_charge_due_at: null,
            last_paid_at: paidAt.toISOString(),
            plan_id: object.metadata.plan_id,
            ...(trialCharge ? {} : {
              plan_started_at: paidAt.toISOString(),
              // A parent's card stays the parent's: it is never written onto the child's profile.
              ...(linked?.checkout_context !== 'parent' && object.customer ? { stripe_customer_id: object.customer } : {}),
              ...(linked?.checkout_context !== 'parent' && typeof object.payment_method === 'string' ? { stripe_payment_method_id: object.payment_method } : {}),
              ...(switchedFrom ? { stripe_subscription_id: null, cancel_at_period_end: false } : {}),
            }),
          },
        });
        if (linked?.trial) await setSeasonChargeState(linked.id, 'succeeded', object.id);
        if (!trialCharge && ['applied', 'duplicate'].includes(outcome)) {
          const fingerprint = await cardFingerprintOf(object.payment_method);
          if (fingerprint) await supabase.from('purchases').update({ card_fingerprint: fingerprint }).eq('id', purchaseId);
          await completeOnboardingAfterCheckout(userId, purchaseId, outcome);
          if (switchedFrom) await finishSwitchFromMonthly(userId, switchedFrom);
          await recordReferral(purchaseId);
        }
      }
    } else if (event.type === 'payment_intent.requires_action' && SEASON_PLANS.includes(object.metadata?.plan_id)) {
      const userId = object.metadata?.app_user_id || null;
      const purchaseId = object.metadata?.purchase_id || null;
      const linked = purchaseId ? await findStripePurchase({ purchaseId }) : await findStripePurchase({ userId });
      // A purchase paid on the spot (not a scheduled trial charge) is handled on screen.
      if (linked && !linked.trial) {
        await applyStripePurchaseEvent(event);
      } else {
      if (purchaseId) {
        await supabase.rpc('set_season_charge_state', {
          p_purchase_id: purchaseId, p_state: 'requires_action', p_payment_intent_id: object.id,
        });
      }
      if (!linked?.cancel_requested_at) {
        await applyStripePurchaseEvent(event, {
          userId: linked?.user_id || userId,
          purchaseId: linked?.id || purchaseId,
          paymentIntentId: object.id,
          profilePatch: { subscription_status: 'past_due' },
        });
      }
      }
    } else if (['payment_intent.payment_failed', 'payment_intent.canceled'].includes(event.type) && SEASON_PLANS.includes(object.metadata?.plan_id)) {
      const purchaseId = object.metadata?.purchase_id || null;
      const linked = purchaseId ? await findStripePurchase({ purchaseId }) : await findStripePurchase({ userId: object.metadata?.app_user_id || null });
      if (linked && !linked.trial) {
        // A one-click payment that failed or was cancelled must not block the account.
        // (A Checkout session may retry its own PaymentIntent, so those rows stay.)
        await applyStripePurchaseEvent(event, linked.stripe_checkout_session_id ? {} : {
          userId: linked.user_id, purchaseId: linked.id, purchaseStatus: 'failed', paymentIntentId: object.id,
        });
      } else if (event.type === 'payment_intent.canceled') {
        await applyStripePurchaseEvent(event);
      } else {
      if (purchaseId) {
        await supabase.rpc('set_season_charge_state', {
          p_purchase_id: purchaseId,
          p_state: object.status === 'requires_action' ? 'requires_action' : 'declined',
          p_payment_intent_id: object.id,
          p_error_code: object.last_payment_error?.code || null,
        });
      }
      if (!linked?.cancel_requested_at) {
        await applyStripePurchaseEvent(event, {
          userId: object.metadata?.app_user_id || null,
          purchaseId,
          paymentIntentId: object.id,
          profilePatch: { subscription_status: 'past_due' },
        });
      }
      }
    } else if (event.type === 'customer.subscription.updated') {
      const purchaseId = object.metadata?.purchase_id || null;
      const linkedPurchase = await findStripePurchase({ purchaseId, subscriptionId: object.id });
      const linkedUser = linkedPurchase ? null : await findStripeUser('stripe_subscription_id', object.id);
      const planId = object.metadata?.plan_id;
      await applyStripePurchaseEvent(event, {
        userId: linkedPurchase?.user_id || object.metadata?.app_user_id || linkedUser?.id || null,
        purchaseId: linkedPurchase?.id || null,
        purchaseStatus: purchaseStatusFromStripe(object.status),
        subscriptionId: object.id,
        accessEndsAt: accessEndsAt(object),
        profilePatch: {
          subscription_status: mapStripeStatus(object.status, planId),
          access_expires_at: accessEndsAt(object),
          // "Cancelled" means the person cancelled, not that the plan is scheduled to
          // end at the deadline (cancel_at), which every monthly plan is.
          cancel_at_period_end: Boolean(object.cancel_at_period_end) || Boolean(linkedPurchase?.cancel_requested_at),
          ...(linkedPurchase && purchaseStatusFromStripe(object.status) === 'active' && planId ? {
            plan_id: planId, stripe_subscription_id: object.id, stripe_customer_id: object.customer,
          } : {}),
        },
      });
      // A card needing 3-D Secure completes Checkout while still 'incomplete';
      // the subscription turns active here, so finish onboarding on this event too.
      if (purchaseStatusFromStripe(object.status) === 'active' && linkedPurchase) {
        await completeOnboardingAfterCheckout(linkedPurchase.user_id, linkedPurchase.id, 'applied');
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const linkedPurchase = await findStripePurchase({ subscriptionId: object.id });
      const linkedUser = linkedPurchase ? null : await findStripeUser('stripe_subscription_id', object.id);
      await applyStripePurchaseEvent(event, {
        userId: linkedPurchase?.user_id || linkedUser?.id || null,
        purchaseId: linkedPurchase?.id || null,
        purchaseStatus: 'canceled',
        subscriptionId: object.id,
        accessEndsAt: new Date().toISOString(),
        profilePatch: {
          subscription_status: 'expired',
          access_expires_at: new Date().toISOString(),
        },
      });
    } else if (event.type === 'invoice.created') {
      await creditLastMonthlyPeriod(object);
      await applyStripePurchaseEvent(event);
    } else if (event.type === 'invoice.paid') {
      const subscriptionId = object.subscription || object.parent?.subscription_details?.subscription || null;
      let linkedPurchase = await findStripePurchase({ subscriptionId });
      if (!linkedPurchase && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata?.purchase_id) {
          linkedPurchase = await findStripePurchase({ purchaseId: subscription.metadata.purchase_id });
        }
      }
      const paymentIntent = object.payment_intent;
      const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null;
      if (linkedPurchase && paymentIntentId) {
        await applyStripePurchaseEvent(event, {
          userId: linkedPurchase.user_id,
          purchaseId: linkedPurchase.id,
          purchaseStatus: 'active',
          paymentIntentId,
        });
      } else {
        await applyStripePurchaseEvent(event);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const subscriptionId = object.subscription || object.parent?.subscription_details?.subscription || null;
      const linkedPurchase = await findStripePurchase({ subscriptionId });
      const linkedUser = linkedPurchase
        ? null
        : await findStripeUser(subscriptionId ? 'stripe_subscription_id' : 'stripe_customer_id', subscriptionId || object.customer);
      await applyStripePurchaseEvent(event, {
        userId: linkedPurchase?.user_id || linkedUser?.id || null,
        purchaseId: linkedPurchase?.id || null,
        profilePatch: { subscription_status: 'past_due' },
      });
    } else {
      await applyStripePurchaseEvent(event);
    }
  } catch (err) {
    console.error(`Stripe webhook handling failed (${event.type}):`, err.message);
    return res.status(500).json({ error: 'Webhook handling failed.' });
  }

  return res.json({ received: true });
}

async function setSeasonChargeState(purchaseId, state, paymentIntentId = null, errorCode = null) {
  const { data, error } = await supabase.rpc('set_season_charge_state', {
    p_purchase_id: purchaseId,
    p_state: state,
    p_payment_intent_id: paymentIntentId,
    p_error_code: errorCode,
  });
  if (error) throw error;
  return data;
}

// Referral rewards and orphan refunds share a PaymentIntent with the withdrawal
// but are not it. Untagged refunds predate the tags and still count.
const isWithdrawalRefund = (refund) => !refund.metadata?.kind || ['withdrawal', 'cancel_race'].includes(refund.metadata.kind);

// A payment that succeeded for a purchase we had already given up on (a double
// click, a stale session): give it all back instead of silently keeping it.
async function refundOrphanPayment(intent, purchaseId) {
  console.warn(JSON.stringify({ level: 'warn', event: 'orphan_payment_refunded', paymentIntentId: intent.id, purchaseId }));
  await stripe.refunds.create({
    payment_intent: intent.id, reason: 'requested_by_customer', metadata: { kind: 'orphan', purchase_id: purchaseId },
  }, { idempotencyKey: 'orphan:' + intent.id });
}

async function refundCanceledSeasonPurchase({ purchaseId, userId, paymentIntentId, finishSeasonCancel = false }) {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status === 'canceled') {
    const { error } = await supabase.from('purchases')
      .update({ refund_status: 'none', updated_at: new Date().toISOString() })
      .eq('id', purchaseId).eq('user_id', userId);
    if (error) throw error;
    if (finishSeasonCancel) {
      await supabase.rpc('finish_season_charge_cancel', { p_user_id: userId, p_purchase_id: purchaseId });
    }
    return 'none';
  }
  if (intent.status !== 'succeeded') {
    if (['requires_action', 'requires_confirmation', 'requires_payment_method'].includes(intent.status)) {
      await stripe.paymentIntents.cancel(intent.id);
      const { error } = await supabase.from('purchases')
        .update({ refund_status: 'none', updated_at: new Date().toISOString() })
        .eq('id', purchaseId).eq('user_id', userId);
      if (error) throw error;
      if (finishSeasonCancel) {
        await supabase.rpc('finish_season_charge_cancel', { p_user_id: userId, p_purchase_id: purchaseId });
      }
      return 'none';
    }
    return 'pending';
  }
  const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
  let refund = (existing.data || []).find((row) => ['succeeded', 'pending'].includes(row.status) && isWithdrawalRefund(row));
  if (!refund) {
    const { data: purchase, error: purchaseError } = await supabase.from('purchases')
      .select('refund_attempts, refund_amount_minor').eq('id', purchaseId).eq('user_id', userId).single();
    if (purchaseError) throw purchaseError;
    const failed = (existing.data || []).filter((row) => row.status === 'failed').length;
    const attempt = Math.max(Number(purchase.refund_attempts) || 0, failed) + 1;
    const { error } = await supabase.rpc('set_purchase_refund_state', {
      p_user_id: userId, p_purchase_id: purchaseId, p_state: 'pending', p_refund_id: null,
    });
    if (error) throw error;
    // A withdrawal stores the amount it decided on (pro rata); a cancellation
    // before access refunds everything.
    const partial = Number.isInteger(purchase.refund_amount_minor) ? { amount: purchase.refund_amount_minor } : {};
    refund = await stripe.refunds.create({ payment_intent: paymentIntentId, reason: 'requested_by_customer', metadata: { kind: 'cancel_race', purchase_id: purchaseId }, ...partial }, {
      idempotencyKey: `cancel-season:${purchaseId}:attempt:${attempt}`,
    });
  }
  const state = refund.status === 'succeeded' ? 'succeeded' : refund.status === 'failed' ? 'failed' : 'pending';
  const { error } = await supabase.rpc('set_purchase_refund_state', {
    p_user_id: userId, p_purchase_id: purchaseId, p_state: state, p_refund_id: refund.id,
  });
  if (error) throw error;
  if (state === 'succeeded' && finishSeasonCancel) {
    await supabase.rpc('finish_season_charge_cancel', { p_user_id: userId, p_purchase_id: purchaseId });
  }
  return state;
}

async function reconcileSeasonCancellationRequests() {
  const { data: requests, error } = await supabase.from('purchases')
    .select('id, user_id, stripe_payment_intent_id')
    .eq('plan', 'season').eq('status', 'active')
    .not('cancel_requested_at', 'is', null)
    .not('stripe_payment_intent_id', 'is', null)
    .in('season_charge_status', ['processing', 'requires_action', 'retryable', 'succeeded'])
    .limit(50);
  if (error) {
    console.error('Season cancellation reconciliation query failed:', error.message);
    return;
  }
  for (const purchase of Array.isArray(requests) ? requests : []) {
    try {
      const intent = await stripe.paymentIntents.retrieve(purchase.stripe_payment_intent_id);
      if (intent.status === 'succeeded') {
        await setSeasonChargeState(purchase.id, 'succeeded', intent.id);
        await refundCanceledSeasonPurchase({
          purchaseId: purchase.id, userId: purchase.user_id, paymentIntentId: intent.id,
          finishSeasonCancel: true,
        });
      } else if (intent.status === 'canceled') {
        await supabase.rpc('finish_season_charge_cancel', { p_user_id: purchase.user_id, p_purchase_id: purchase.id });
      } else if (['requires_action', 'requires_confirmation', 'requires_payment_method'].includes(intent.status)) {
        await stripe.paymentIntents.cancel(intent.id);
        await supabase.rpc('finish_season_charge_cancel', { p_user_id: purchase.user_id, p_purchase_id: purchase.id });
      }
    } catch (err) {
      console.error('Season cancellation reconciliation failed:', err.code || err.type || 'stripe_error');
    }
  }
}

/**
 * Claims due purchases atomically in Postgres. Retries use the same Stripe
 * idempotency key as the former worker, so an ambiguous response cannot create
 * a second charge. The Stripe webhook remains authoritative for paid access.
 */
// One-click purchases that never produced a payment must not linger as
// "pending": a pending row can hold up the account's other payments.
// A row with a Stripe subscription is left alone: that subscription can still
// turn active after 3-D Secure, and a failed row would then reject it as stale
// while Stripe keeps billing. Its own incomplete_expired update fails it.
async function failStalePendingPurchases() {
  try {
    await supabase.from('purchases')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('status', 'pending').eq('trial', false).eq('needs_payment_confirmation', false)
      .is('stripe_checkout_session_id', null)
      .is('stripe_subscription_id', null)
      .lt('updated_at', new Date(Date.now() - 2 * 3600 * 1000).toISOString())
      .throwOnError();
  } catch (err) {
    console.error('failStalePendingPurchases failed:', err.code || err.type || 'error');
  }
}

async function chargeDueSeasonPasses() {
  if (!stripe) return;
  await reconcileSeasonCancellationRequests();
  await failStalePendingPurchases();
  await settleReferrals();
  const { data: due, error } = await supabase.rpc('claim_due_season_charges', {
    p_now: new Date().toISOString(),
  });
  if (error) {
    console.error('chargeDueSeasonPasses: atomic claim failed:', error.message);
    return;
  }

  for (const purchase of Array.isArray(due) ? due : []) {
    let intent = null;
    try {
      if (purchase.stripe_payment_intent_id) {
        // Reconcile a known/ambiguous attempt before any new create request.
        intent = await stripe.paymentIntents.retrieve(purchase.stripe_payment_intent_id);
      } else {
        if (purchase.attempt_number > 1) {
          const prior = await stripe.paymentIntents.search({
            query: `metadata['purchase_id']:'${purchase.purchase_id}'`,
            limit: 1,
          });
          if (prior.data?.[0]?.id) intent = await stripe.paymentIntents.retrieve(prior.data[0].id);
        }
      }
      if (!intent) {
        // The price locked at checkout, never a constant: the daily price moves.
        if (!Number.isInteger(purchase.price_amount_minor) || purchase.price_amount_minor <= 0) {
          throw Object.assign(new Error('missing locked price'), { type: 'LockedPriceMissing' });
        }
        intent = await stripe.paymentIntents.create({
          amount: purchase.price_amount_minor,
          currency: 'czk',
          customer: purchase.stripe_customer_id,
          payment_method: purchase.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: { plan_id: 'season', app_user_id: purchase.user_id, purchase_id: purchase.purchase_id },
        }, {
          // Persisted by claim_due_season_charges: legacy purchases retain the
          // old key and new purchases get one derived from their purchase id.
          idempotencyKey: purchase.season_charge_idempotency_key,
        });
      }
    } catch (err) {
      const failedIntent = err.payment_intent && typeof err.payment_intent === 'object'
        ? err.payment_intent : null;
      const errorCode = err.code || err.raw?.code || null;
      const state = failedIntent?.status === 'requires_action' || errorCode === 'authentication_required'
        ? 'requires_action'
        : err.type === 'StripeCardError' || ['card_declined', 'expired_card', 'insufficient_funds'].includes(errorCode)
          ? 'declined'
          : 'retryable';
      try {
        await setSeasonChargeState(purchase.purchase_id, state, failedIntent?.id || null, errorCode);
        if (state !== 'retryable') {
          await supabase.from('users').update({ subscription_status: 'past_due' })
            .eq('id', purchase.user_id).eq('subscription_status', 'trialing').throwOnError();
        }
      } catch (saveError) {
        console.error('Could not persist season charge outcome:', saveError.code || 'database_error');
      }
      console.error('Season charge attempt failed:', state, errorCode || 'stripe_error');
      continue;
    }

    const state = intent.status === 'succeeded' ? 'succeeded'
      : intent.status === 'requires_action' ? 'requires_action'
        : intent.status === 'canceled' ? 'canceled'
          : intent.status === 'requires_payment_method' ? 'declined' : 'retryable';
    try {
      await setSeasonChargeState(purchase.purchase_id, state, intent.id, intent.last_payment_error?.code || null);
      const { data: current, error: currentError } = await supabase.from('purchases')
        .select('cancel_requested_at').eq('id', purchase.purchase_id).single();
      if (currentError) throw currentError;
      if (current.cancel_requested_at) {
        if (state === 'succeeded') {
          await refundCanceledSeasonPurchase({ purchaseId: purchase.purchase_id, userId: purchase.user_id, paymentIntentId: intent.id, finishSeasonCancel: true });
        } else if (state === 'requires_action' || state === 'declined' || state === 'canceled') {
          if (state !== 'canceled') await stripe.paymentIntents.cancel(intent.id);
          await supabase.rpc('finish_season_charge_cancel', { p_user_id: purchase.user_id, p_purchase_id: purchase.purchase_id });
        }
        continue;
      }
      if (state === 'succeeded') {
        const paidAt = Number.isFinite(intent.created) ? new Date(intent.created * 1000) : new Date();
        await supabase.from('users').update({
          subscription_status: 'season',
          access_expires_at: ACCESS_END.toISOString(),
          season_charge_due_at: null,
          last_paid_at: paidAt.toISOString(),
        }).eq('id', purchase.user_id).in('subscription_status', ['trialing', 'past_due']).throwOnError();
      } else if (state === 'requires_action' || state === 'declined') {
        await supabase.from('users').update({ subscription_status: 'past_due' })
          .eq('id', purchase.user_id).eq('subscription_status', 'trialing').throwOnError();
      }
    } catch (err) {
      console.error('Could not persist season charge result:', err.code || err.type || 'database_error');
    }
  }

  const { data: refundsDue, error: refundsError } = await supabase.from('purchases')
    .select('id, user_id, plan, stripe_payment_intent_id, cancel_requested_at')
    .eq('status', 'withdrawn').in('refund_status', ['pending', 'failed'])
    .not('stripe_payment_intent_id', 'is', null).limit(50);
  if (refundsError) {
    console.error('Season charge worker: could not load pending refunds:', refundsError.message);
  } else {
    for (const purchase of Array.isArray(refundsDue) ? refundsDue : []) {
      try {
        await refundCanceledSeasonPurchase({
          purchaseId: purchase.id,
          userId: purchase.user_id,
          paymentIntentId: purchase.stripe_payment_intent_id,
          finishSeasonCancel: purchase.plan === 'season' && Boolean(purchase.cancel_requested_at),
        });
      } catch (err) {
        console.error('Purchase refund reconciliation failed:', err.code || err.type || 'stripe_error');
      }
    }
  }
}

app.get('/api/subscription/season-charge', requireAuth, async (req, res) => {
  const { data: purchase, error } = await supabase.from('purchases')
    .select('id, season_charge_status, stripe_payment_intent_id, cancel_requested_at')
    .eq('user_id', req.user.id).eq('plan', 'season').eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return res.status(500).json({ error: 'Stav platby se nepodařilo načíst.' });
  if (!purchase) return res.json({ status: 'none' });
  const response = {
    status: purchase.cancel_requested_at ? 'cancellation_pending' : purchase.season_charge_status,
  };
  if (purchase.season_charge_status === 'requires_action' && purchase.stripe_payment_intent_id && !purchase.cancel_requested_at) {
    try {
      const intent = await stripe.paymentIntents.retrieve(purchase.stripe_payment_intent_id);
      if (intent.metadata?.purchase_id !== purchase.id || intent.metadata?.app_user_id !== req.user.id) {
        return res.status(404).json({ error: 'Platbu se nepodařilo ověřit.' });
      }
      if (intent.status === 'requires_action') response.clientSecret = intent.client_secret;
      else if (intent.status === 'succeeded') {
        response.status = 'succeeded';
        await setSeasonChargeState(purchase.id, 'succeeded', intent.id);
        if (purchase.cancel_requested_at) {
          await refundCanceledSeasonPurchase({
            purchaseId: purchase.id, userId: req.user.id, paymentIntentId: intent.id,
            finishSeasonCancel: true,
          });
          response.status = 'cancellation_pending';
        } else {
          const paidAt = Number.isFinite(intent.created) ? new Date(intent.created * 1000) : new Date();
          await supabase.from('users').update({
            subscription_status: 'season', access_expires_at: ACCESS_END.toISOString(),
            season_charge_due_at: null, last_paid_at: paidAt.toISOString(),
          }).eq('id', req.user.id).in('subscription_status', ['trialing', 'past_due']).throwOnError();
        }
      } else if (intent.status === 'canceled') {
        response.status = 'canceled';
        await setSeasonChargeState(purchase.id, 'canceled', intent.id);
      } else response.status = 'declined';
    } catch {
      return res.status(503).json({ error: 'Ověření platby je dočasně nedostupné.' });
    }
  }
  return res.json(response);
});

if (stripe) {
  chargeDueSeasonPasses(); // catch anything due while the server was down
  setInterval(chargeDueSeasonPasses, 60 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const purgeEvents = async () => {
    const { error } = await supabase.rpc('purge_beta_events');
    if (error) console.error('Beta retention cleanup failed:', error.code || 'database unavailable');
    const screenshots=await cleanupBetaScreenshots(supabase);
    if (screenshots.error) console.error('Beta screenshot cleanup failed:', screenshots.error.code || 'storage unavailable');
  };
  void purgeEvents();
  setInterval(purgeEvents, 24 * 60 * 60 * 1000).unref();
});
