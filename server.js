const { rankingPayload } = require('./lib/betaRankings');
const { registerBetaAdmin } = require('./lib/betaAdminRoutes');
const { betaLimitOptions } = require('./lib/betaLimits');
const { cleanupBetaScreenshots } = require('./lib/betaMaintenance');
const { closingPayload, reviewPayload } = require('./lib/betaClosing');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SCHOOL_REVIEWS_ENABLED = process.env.SCHOOL_REVIEWS_ENABLED === 'true';

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


function hasLivePlan(profile) {
  const seasonScheduled = profile?.plan_id === 'season' && Boolean(profile.season_charge_due_at);
  return (paidAccessActive(profile) && !profile.cancel_at_period_end) || seasonScheduled;
}


/**
 * End of the access window for a season pass: 31 March 23:59:59 Europe/Prague,
 * the first one strictly more than 30 days after `from`.
 *
 * The 30-day floor guards against the charge landing after cancel_at: the
 * charge fires ~3 days after checkout (the trial), so a purchase made in late
 * March would otherwise compute a cancel_at before the charge ever happens,
 * and Stripe would cancel the subscription before it billed. If the naive
 * "next March 31" is under 30 days out, roll to the following year instead.
 *
 * Buying in April yields ~11 months of access — accepted as-is; the product is
 * seasonal (Sept-March) so this is a non-case in practice.
 */
function seasonEndsAt(from = new Date()) {
  const year = from.getFullYear();
  // March 31 is after Prague's last-Sunday-of-March DST transition (UTC+2).
  let end = new Date(Date.UTC(year, 2, 31, 21, 59, 59));
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  if (end.getTime() - from.getTime() < THIRTY_DAYS_MS) {
    end = new Date(Date.UTC(year + 1, 2, 31, 21, 59, 59));
  }
  return end;
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
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
  limit: 30,
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

async function closingStateFor(userId) {
  const sync=await supabase.rpc('sync_beta_closing',{p_user_id:userId});
  if (sync.error) return {error:sync.error};
  const {data,error}=await supabase.from('beta_profile').select('closing_due_at,closing_done_at,consent_tracking_at').eq('user_id',userId).single();
  return {error,betaTrackingNoticeAccepted:Boolean(data?.consent_tracking_at),closingDueAt:data?.closing_due_at,closingDoneAt:data?.closing_done_at,
    closingPaused:Boolean(data?.closing_due_at && !data.closing_done_at && new Date(data.closing_due_at).getTime()+86400000<=Date.now())};
}

// One account-access rule shared by protected routes and public result links.
async function accessStateFor(userId, email) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('trial_expires_at, subscription_status, access_expires_at, tester_access_until, tester_school_code, created_at, gender')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { hasAccess: false, httpStatus: 403, body: { error: 'Profil účtu nenalezen.' }, profile: null };
  }

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

  if (isDeveloperEmail(email)) {
    return {
      hasAccess: true,
      httpStatus: 200,
      body: null,
      profile: { ...profile, subscription_status: 'developer' },
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
  if (!betaSchoolNamesLoading) betaSchoolNamesLoading=supabase.from('schools').select('name').then(result=>{
    if (!result.error) betaSchoolNamesCache={names:result.data || [],until:Date.now()+86400000};
    return result;
  }).finally(()=>{betaSchoolNamesLoading=null;});
  return betaSchoolNamesLoading;
}
const betaRankingsLimiter=rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-7',legacyHeaders:false,keyGenerator:req=>req.user.id});
app.post('/api/beta/rankings',requireAuth,requireBetaTester,betaRankingsLimiter,async(req,res)=>{
  const ranking=rankingPayload(req.body?.ranking), capture=req.body?.capture_id;
  if (!ranking || !/^[a-f0-9-]{36}$/.test(capture || '') || req.body?.source!=='onboarding') return res.status(400).json({error:'Pořadí nemá správný formát.'});
  const notice=await supabase.from('beta_profile').select('consent_tracking_at').eq('user_id',req.user.id).single();
  if(notice.error)return res.status(503).json({error:'Testování nelze ověřit.'});
  if(!notice.data?.consent_tracking_at)return res.status(403).json({error:'Nejdřív je potřeba potvrdit seznámení s testováním.'});
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
    const notice=await supabase.from('beta_profile').select('consent_tracking_at').eq('user_id',user.id).single();
    if (notice.error) return res.status(503).json({error:'Upozornění nelze ověřit.'});
    if (!notice.data?.consent_tracking_at) return res.status(403).json({error:'Nejdřív je potřeba potvrdit seznámení s beta testováním.'});
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
  'tester_access_until, tester_guidance_seen_at';

// 14 days is the statutory minimum for everyone (§1829). Extended to 30 here
// so the SAME self-service button also delivers the "full refund within 30
// days" half of the minors' promise (Terms §7) — we can no longer tell a
// minor from an adult buyer (no attestation is collected at checkout), so one
// wider window applied to everyone is simpler and never under-delivers the
// statutory right. Only the pro-rata-after-30-days half of that promise stays
// a manual Stripe-dashboard process — see UNFORGET.md.
const WITHDRAWAL_DAYS = 30;

// The window runs from the later of "contract concluded" and "money taken", so a
// season pass (charged 3 days after checkout) still gets the full window after the charge.
function withdrawalWindowEnd(profile) {
  const times = [profile.plan_started_at, profile.last_paid_at]
    .filter(Boolean)
    .map((value) => new Date(value).getTime());
  return times.length ? new Date(Math.max(...times) + WITHDRAWAL_DAYS * 86400000) : null;
}

function canWithdraw(profile) {
  const planLive =
    (profile.plan_id === 'season' && ['trialing', 'season'].includes(profile.subscription_status)) ||
    (profile.plan_id === 'monthly' && ['active', 'past_due'].includes(profile.subscription_status));
  const end = withdrawalWindowEnd(profile);
  return planLive && Boolean(end) && end > new Date();
}

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
  if (
    profile.subscription_status !== 'beta' &&
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
  const now = new Date();
  const isDeveloper = !isTester && profile.subscription_status === 'developer';
  let beta = null;
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
  const trialActive = !isTester && new Date(profile.trial_expires_at) > now;
  const subscribed = !isTester && paidAccessActive(profile);
  const hasAccess = isTester ? beta.hasAccess : trialActive || subscribed;

  res.json({
    ...profile,
    isTester,
    isDeveloper,
    trialActive,
    subscribed,
    canWithdraw: !isTester && canWithdraw(profile),
    withdrawalEndsAt: isTester ? null : withdrawalWindowEnd(profile),
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

// GDPR erasure. Deleting the auth account cascades to public.users, favorites,
// questionnaire_runs, school_reviews, review_reports and data_reports (all
// foreign-key it with ON DELETE CASCADE), so this one call removes everything
// we hold. It needs the admin API, hence the service key.
app.delete('/api/me', requireAuth, async (req, res) => {
  if (!SERVICE_KEY) {
    return res.status(503).json({ error: 'Mazání účtu není nastavené.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', req.user.id)
    .single();

  if (profileError) return res.status(500).json({ error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' });

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

  const { error } = await supabase.auth.admin.deleteUser(req.user.id);
  if (error) return res.status(500).json({ error: error.message });

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
// Quick ten-second rating after a feature is tried. Stored as feedback, but it
// never renews access (only a written report does) — see submit_beta_micro.
const QUICK_FEATURES = ['dotaznik','vyhledavani','detail','porovnani','matice','prihlaska','tema','platby'];
app.post('/api/beta/micro', requireAuth, requireBetaTester, betaMicroLimiter, async (req,res) => {
  const { id, action, rating, answers, note } = req.body || {};
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
  res.json(data);
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
app.post('/api/me/onboarding-answers', requireAuth, async (req, res) => {
  const validation = validateOnboardingAnswers(req.body?.answers);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const translated = translateOnboardingAnswers(validation.answers);
  if (!isScoreable(translated)) {
    return res.status(200).json({ saved: false, reason: 'nothing_to_score' });
  }

  // Same rows and joins as every other scorer (buildRunResult, POST
  // /api/questionnaire): merged duplicates excluded, school_programs present so
  // matching.js classifies school types from Cermat data.
  let schools;
  try {
    schools = await fetchAllSchools('*, school_programs(*), school_extracted_details(*)');
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  if (!schools.length) {
    return res.status(503).json({ error: 'V databázi zatím nejsou žádné školy.' });
  }

  const matches = scoreSchools(translated, withDistricts(schools))
    .slice(0, 20)
    .map(({ school_id, score }) => ({ school_id, score }));

  const { data: run, error: insertError } = await supabase
    .from('questionnaire_runs')
    .insert({
      user_id: req.user.id,
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
      return res.status(200).json({ saved: false, reason: 'already_saved' });
    }
    return res.status(500).json({ error: insertError.message });
  }

  // The onboarding run is the account's first, so it becomes the default that
  // drives match percentages everywhere. Without the explicit flag it only
  // looked default because scoringRunQuery falls back to "newest" when nothing
  // is flagged — which stops being true the moment a second run exists.
  try {
    await setDefaultRun(req.user.id, run.id);
  } catch (err) {
    console.error('onboarding run saved but could not be flagged default:', err.message);
  }

  await syncJpzPoints(req.user.id, translated.body);

  res.status(201).json({ saved: true });
});

/* ---------------------------------------------------------------------------
 * Schools
 *
 * ⚠️ DELIBERATELY UNGATED. These two routes take `optionalAuth` and NOT
 * `requireAuth`/`requireAccess`, unlike everything else below.
 *
 * The 23-screen onboarding flow reads school data during the quiz — before any
 * account exists — so gating these would break the funnel at its widest point.
 * Gate them once the onboarding paywall is wired to real trial/access state;
 * until then, RLS on `schools` still blocks the browser from reading the table
 * directly, so this server remains the only way in.
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

async function fetchAllSchools(select) {
  const rows = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('schools')
      .select(select)
      .is('merged_into', null)
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
  const scores = new Map(
    scoreSchools(run.answers, located).map((match) => [match.school_id, match.score])
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

app.get('/api/schools', optionalAuth, async (req, res) => {
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
    const { data, error } = await supabase.from('schools').select(FULL_SELECT).in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(await withMatchScores(req.user?.id, await withPredecessorPrograms(data)));
  }

  let rows;
  try {
    rows = await fetchAllSchools(LIST_SELECT);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const slim = rows.map((s) => ({ ...s, school_programs: slimProgramsForList(s.school_programs) }));
  res.json(await withMatchScores(req.user?.id, slim));
});

app.get('/api/schools/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Neplatné ID školy.' });
  }

  const { data, error } = await supabase
    .from('schools')
    .select('*, school_programs(*), school_ai_summary(*), school_extracted_details(*)')
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Škola nebyla nalezena.' });
  if (error) return res.status(500).json({ error: error.message });

  // An old link to a school that merged away answers with its successor; the
  // page sees a different id than it asked for and redirects.
  let row = data;
  if (row.merged_into) {
    const { data: successor, error: successorError } = await supabase
      .from('schools')
      .select('*, school_programs(*), school_ai_summary(*), school_extracted_details(*)')
      .eq('id', row.merged_into)
      .single();
    if (successorError) return res.status(500).json({ error: successorError.message });
    row = successor;
  }

  const [school] = await withMatchScores(req.user?.id, await withPredecessorPrograms([row]));
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

  const schools = data.map((row) => row.schools).filter((school) => school && !school.merged_into);
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

  const schools = await withMatchScores(req.user.id, data.map((row) => row.schools));
  res.json(
    data.map((row, i) => ({
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
      user_id: req.user.id,
      school_id: schoolId,
      priority: rows.length + 1,
      obor_kkov: typeof pick.oborKkov === 'string' ? pick.oborKkov.slice(0, 40) : null,
      obor_nazev: typeof pick.oborNazev === 'string' ? pick.oborNazev.slice(0, 200) : null,
    });
  }

  const { error: deleteError } = await supabase
    .from('application_picks')
    .delete()
    .eq('user_id', req.user.id);
  if (deleteError) return res.status(500).json({ error: deleteError.message });

  if (rows.length) {
    const { error: insertError } = await supabase.from('application_picks').insert(rows);
    if (insertError) return res.status(500).json({ error: insertError.message });
  }

  res.status(200).json({ ok: true, count: rows.length });
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
  res.json(data);
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
  const whole = (raw) => (raw === null || raw === undefined || raw === '' ? null : Number(raw));
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

app.post('/api/shares', decisionLimiter, requireAuth, requireAccess, async (req, res) => {
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

app.post('/api/share-links', decisionLimiter, requireAuth, requireResultsLinkAccess, async (req, res) => {
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
app.get('/api/shared-results/:token', shareLimiter, async (req, res) => {
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
    .select('id, name, latitude, longitude')
    .eq('id', snapshot.top_school_id)
    .maybeSingle();
  if (schoolError) return res.status(500).json({ error: 'Výsledky se nepodařilo načíst.' });
  if (!school) return notFound();

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

app.get('/api/pay-links/:token', shareLimiter, async (req, res) => {
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
  return res.json({
    for_name: firstName,
    checkout_open,
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

app.post('/api/pay-links/:token/checkout', checkoutLimiter, async (req, res) => {
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
  });
  return res.status(result.status).json(result.body);
});

app.post('/api/pay-links/:token/cancel', checkoutLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  const result = await cancelPlanForUser(link.user_id);
  return res.status(result.status).json(result.body);
});

app.post('/api/pay-links/:token/withdraw', checkoutLimiter, async (req, res) => {
  const { data: link, error } = await findPaymentLink(req.params.token);
  if (error) return res.status(500).json({ error: 'Platební odkaz se nepodařilo načíst.' });
  if (!link) return paymentLinkNotFound(res);
  const result = await withdrawPlanForUser(link.user_id);
  return res.status(result.status).json(result.body);
});

// Anonymous handoffs contain no personal data or quiz answers. The owner secret
// stays on the parent's device and is required for status and revoke.
app.post('/api/handoffs', anonLinkLimiter, async (req, res) => {
  const token = crypto.randomBytes(16).toString('base64url');
  const ownerSecret = crypto.randomBytes(16).toString('base64url');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('quiz_handoffs')
    .insert({ token, owner_secret: ownerSecret, expires_at });
  if (error) return res.status(500).json({ error: 'Odkaz k dotazníku se nepodařilo vytvořit.' });
  return res.status(201).json({ token, ownerSecret });
});

app.get('/api/handoffs/:token', shareLimiter, async (req, res) => {
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

app.post('/api/handoffs/:token/revoke', shareLimiter, async (req, res) => {
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

app.post('/api/handoffs/:token/open', shareLimiter, async (req, res) => {
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

app.post('/api/handoffs/:token/complete', shareLimiter, async (req, res) => {
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
app.post('/api/result-snapshots', anonLinkLimiter, async (req, res) => {
  const { role, topSchoolId, topScore, fittingCount } = req.body || {};
  if (!['student', 'parent'].includes(role) ||
      !Number.isInteger(topSchoolId) ||
      !Number.isInteger(topScore) || topScore < 0 || topScore > 100 ||
      !Number.isInteger(fittingCount) || fittingCount < 0 || fittingCount > 1000) {
    return res.status(400).json({ error: 'Neplatný výsledek.' });
  }

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id')
    .eq('id', topSchoolId)
    .maybeSingle();
  if (schoolError) return res.status(500).json({ error: 'Výsledek se nepodařilo uložit.' });
  if (!school) return res.status(400).json({ error: 'Neplatný výsledek.' });

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
app.get('/api/shared/:token', shareLimiter, async (req, res) => {
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
  const picks = picksResult.data;

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
  const schools = withDistricts(await fetchAllSchools('*, school_programs(*), school_extracted_details(*)'));
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
      schools = await fetchAllSchools('*, school_programs(*), school_extracted_details(*)');
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

    if(req.profile?.subscription_status==='beta') {
      const notice=await supabase.from('beta_profile').select('consent_tracking_at').eq('user_id',req.user.id).single();
      if(!notice.error && notice.data?.consent_tracking_at) {
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
      const { data: run, error: runError } = await scoringRunQuery(
        req.user.id,
        'id, answers, matches, extra_reasons'
      );
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
      const schools = withDistricts(await fetchAllSchools('*, school_programs(*), school_extracted_details(*)'));
      const school = schools.find((entry) => entry.id === schoolId);
      if (!school) return res.status(404).json({ error: 'Škola nebyla nalezena.' });
      const match = scoreSchools(run.answers, schools).find((entry) => entry.school_id === schoolId);
      if (!match) return res.status(404).json({ error: 'Školu se nepodařilo vyhodnotit.' });

      const reasons = await requestReasons({
        answers: run.answers,
        shortlist: [match],
        byId: new Map([[schoolId, school]]),
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
      const reason = reasons.get(schoolId);
      if (!reason) throw new Error('Model nevrátil vysvětlení školy.');

      const extraReasons = {
        ...(run.extra_reasons && typeof run.extra_reasons === 'object' ? run.extra_reasons : {}),
        [String(schoolId)]: reason,
      };
      const { error: updateError } = await supabase
        .from('questionnaire_runs')
        .update({ extra_reasons: extraReasons })
        .eq('id', run.id)
        .eq('user_id', req.user.id);
      if (updateError) throw updateError;

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
 * Built and tested against Stripe TEST MODE. Going live needs an adult-owned
 * Stripe account (the founder is under 18) — no code change, only swapping
 * env vars from sk_test_ to sk_live_. See plan 009 §11.
 * ------------------------------------------------------------------------- */

// Locked 2026-09-21. Must mirror SEASON_PRICE_CZK in frontend/src/config/pricing.js.
// This is now the 2nd place this number lives (was previously encoded only as
// a Stripe Price; season no longer has one). Change both together.
const SEASON_PRICE_CZK = 690;

// Must mirror TRIAL_DAYS in frontend/src/config/pricing.js and the DB
// trigger's trial window — same duplication the old trial_period_days had.
const SEASON_TRIAL_DAYS = 3;

const PLAN_PRICE_ENV = {
  season: 'STRIPE_PRICE_ID_SEASON',
  monthly: 'STRIPE_PRICE_ID_MONTHLY',
};

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

async function createCheckoutForUser({ userId, email, planId, successPath, cancelPath }) {
  if (planId !== 'season' && planId !== 'monthly') {
    return { status: 400, body: { error: 'Neplatný plán.' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(
      'stripe_customer_id, email, subscription_status, access_expires_at, plan_id, season_charge_due_at, cancel_at_period_end'
    )
    .eq('id', userId)
    .single();

  if (profileError) {
    return {
      status: 500,
      body: { error: 'Nepodařilo se ověřit platební profil. Zkus to prosím znovu.' },
    };
  }

  if (profile.subscription_status === 'beta') {
    return {
      status: 403,
      body: {
        error: 'Beta účty nemohou zahájit placený přístup.',
        code: 'BETA_CHECKOUT_DISABLED',
      },
    };
  }

  if (!stripe) {
    return {
      status: 503,
      body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' },
    };
  }

  if (hasLivePlan(profile)) {
    return {
      status: 409,
      body: {
        // email === undefined is the parent's payment link (vykání, no Settings).
        error: email === undefined
          ? 'Dítě už má aktivní plán. Spravovat ho můžete na této stránce.'
          : 'Už máš aktivní plán. Spravuj ho v Nastavení.',
        code: 'ALREADY_SUBSCRIBED',
      },
    };
  }

  // The parent payment-link path passes email: undefined deliberately. Do not
  // attach the child's saved Stripe customer either; Checkout must collect the
  // payer's own billing details and send receipts to the parent.
  const billingCustomer = email === undefined
    ? {}
    : profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : email
        ? { customer_email: email }
        : {};
  const successUrl = FRONTEND_URL + successPath + '?platba=ok';
  const cancelUrl = FRONTEND_URL + cancelPath;

  if (planId === 'season') {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        currency: 'czk',
        ...billingCustomer,
        ...(email === undefined ? { customer_creation: 'always' } : {}),
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: { plan_id: 'season', app_user_id: userId },
        custom_text: {
          submit: {
            message: 'Uložíme jen platební metodu, nic se nestrhává hned. Za ' +
              SEASON_TRIAL_DAYS + ' dny proběhne jednorázová platba ' +
              SEASON_PRICE_CZK + ' Kč za celou sezónu (září–březen) — pak už nic dalšího.',
          },
        },
      });
      return { status: 200, body: { url: session.url } };
    } catch (err) {
      return { status: 500, body: { error: err.message } };
    }
  }

  const priceId = process.env[PLAN_PRICE_ENV[planId]];
  if (!priceId) {
    return {
      status: 503,
      body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' },
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...billingCustomer,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      subscription_data: {
        metadata: { plan_id: planId, app_user_id: userId },
      },
    });
    return { status: 200, body: { url: session.url } };
  } catch (err) {
    return { status: 500, body: { error: err.message } };
  }
}

app.post('/api/checkout', checkoutLimiter, requireAuth, async (req, res) => {
  const { planId, returnTo } = req.body || {};
  const result = await createCheckoutForUser({
    userId: req.user.id,
    email: req.user.email,
    planId,
    successPath: sanitizeReturnTo(returnTo),
    cancelPath: '/predplatne',
  });
  return res.status(result.status).json(result.body);
});

// requireAuth only, deliberately NOT requireAccess: an account whose access has
// lapsed is exactly the account that most needs to be able to cancel. Keep the
// Stripe and season-trial behavior shared with the parent's payment-link route.
async function cancelPlanForUser(userId) {
  if (!stripe) {
    return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_subscription_id, plan_id, subscription_status')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { status: 500, body: { error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' } };
  }

  if (profile?.plan_id === 'season' && profile.subscription_status === 'trialing') {
    const { error } = await supabase
      .from('users')
      .update({
        plan_id: null,
        subscription_status: 'canceled',
        season_charge_due_at: null,
        stripe_payment_method_id: null,
      })
      .eq('id', userId);
    if (error) {
      return { status: 500, body: { error: 'Předplatné se nepodařilo zrušit. Zkus to prosím znovu.' } };
    }
    return { status: 200, body: { cancelled: 'immediately', accessUntil: null } };
  }

  if (!profile?.stripe_subscription_id) {
    return { status: 400, body: { error: 'Žádné aktivní předplatné k zrušení.' } };
  }

  try {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    if (sub.status === 'trialing') {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      return { status: 200, body: { cancelled: 'immediately', accessUntil: null } };
    }

    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    const accessUntil = updated.current_period_end
      ? new Date(updated.current_period_end * 1000).toISOString()
      : null;
    return { status: 200, body: { cancelled: 'at_period_end', accessUntil } };
  } catch (err) {
    return { status: 500, body: { error: err.message } };
  }
}

app.post('/api/subscription/cancel', requireAuth, async (req, res) => {
  const result = await cancelPlanForUser(req.user.id);
  return res.status(result.status).json(result.body);
});

/**
 * Statutory 14-day withdrawal (Terms §6). The account route and parent link
 * call the same operation so a payer can cancel or withdraw from their surface.
 */
async function withdrawPlanForUser(userId) {
  if (!stripe) {
    return { status: 503, body: { error: 'Platby zatím nejsou nastavené.', code: 'STRIPE_NOT_CONFIGURED' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(
      'stripe_customer_id, stripe_subscription_id, plan_id, subscription_status, ' +
        'plan_started_at, last_paid_at'
    )
    .eq('id', userId)
    .single();
  if (profileError) {
    return { status: 500, body: { error: 'Nepodařilo se ověřit předplatné. Zkus to prosím znovu.' } };
  }

  if (!canWithdraw(profile)) {
    return {
      status: 400,
      body: {
        code: 'NOT_WITHDRAWABLE',
        error: 'Lhůta pro odstoupení už uplynula nebo není od čeho odstoupit. Kontakt pro pomoc: info@stredninamiru.cz.',
      },
    };
  }

  try {
    if (profile.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (!['canceled', 'incomplete_expired'].includes(sub.status)) {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      }
    }

    let refundedHaleru = 0;
    if (profile.stripe_customer_id) {
      const since = Math.floor(new Date(profile.plan_started_at).getTime() / 1000) - 3600;
      const payments = await stripe.paymentIntents.list({
        customer: profile.stripe_customer_id,
        created: { gte: since },
        limit: 100,
      });
      for (const intent of payments.data) {
        if (intent.status !== 'succeeded') continue;
        try {
          const refund = await stripe.refunds.create(
            { payment_intent: intent.id, reason: 'requested_by_customer' },
            { idempotencyKey: 'withdraw:' + intent.id }
          );
          refundedHaleru += refund.amount;
        } catch (err) {
          if (err.code !== 'charge_already_refunded') throw err;
        }
      }
    }

    const { error } = await supabase
      .from('users')
      .update({
        plan_id: null,
        subscription_status: 'canceled',
        access_expires_at: new Date().toISOString(),
        season_charge_due_at: null,
        stripe_payment_method_id: null,
        cancel_at_period_end: false,
      })
      .eq('id', userId);
    if (error) throw error;

    return {
      status: 200,
      body: { withdrawn: true, refundedCzk: refundedHaleru / 100, at: new Date().toISOString() },
    };
  } catch (err) {
    console.error('Withdrawal failed:', err.message);
    return {
      status: 502,
      body: { error: 'Odstoupení se nepodařilo dokončit. Zkus to prosím znovu; nic se nestrhne dvakrát.' },
    };
  }
}

app.post('/api/subscription/withdraw', checkoutLimiter, requireAuth, async (req, res) => {
  const result = await withdrawPlanForUser(req.user.id);
  return res.status(result.status).json(result.body);
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

  try {
    // Season: mode:'setup' sessions have no subscription — they only save a
    // payment method for chargeDueSeasonPasses() to bill later. Handled first
    // and separately because object.subscription is absent here.
    if (event.type === 'checkout.session.completed' && object.mode === 'setup') {
      const { data: currentProfile, error: profileError } = await supabase
        .from('users')
        .select('stripe_setup_intent_id, subscription_status')
        .eq('id', object.client_reference_id)
        .single();
      if (profileError) throw profileError;

      // A retry of the same signed event must not restart a trial the user has
      // since cancelled. A genuinely new checkout has a new SetupIntent and is
      // allowed to schedule a new season purchase.
      if (currentProfile?.subscription_status === 'beta') {
        console.warn(JSON.stringify({
          level: 'warn',
          event: 'legacy_stripe_checkout_ignored_for_beta_tester',
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeCheckoutSessionId: object.id,
          stripeSetupIntentId: object.setup_intent,
          userId: object.client_reference_id,
          checkoutMode: object.mode,
        }));
      } else if (currentProfile?.stripe_setup_intent_id !== object.setup_intent) {
        const setupIntent = await stripe.setupIntents.retrieve(object.setup_intent);
        const checkoutCompletedAt = Number.isFinite(object.created)
          ? object.created * 1000
          : Date.now();
        const dueAt = new Date(checkoutCompletedAt + SEASON_TRIAL_DAYS * 24 * 60 * 60 * 1000);

        await supabase
          .from('users')
          .update({
            subscription_status: 'trialing',
            trial_expires_at: dueAt.toISOString(),
            stripe_customer_id: object.customer,
            stripe_payment_method_id: setupIntent.payment_method,
            stripe_setup_intent_id: object.setup_intent,
            plan_id: 'season',
            season_charge_due_at: dueAt.toISOString(),
            plan_started_at: new Date(checkoutCompletedAt).toISOString(),
          })
          .eq('id', object.client_reference_id)
          .neq('subscription_status', 'beta')
          .throwOnError();
      }
    }

    if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
      const { data: currentProfile, error: profileError } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', object.client_reference_id)
        .maybeSingle();
      if (profileError) throw profileError;

      // A stale pre-enrollment Checkout completion must not retrieve or attach
      // a subscription to a beta account.
      if (currentProfile?.subscription_status === 'beta') {
        console.warn(JSON.stringify({
          level: 'warn',
          event: 'legacy_stripe_checkout_ignored_for_beta_tester',
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeCheckoutSessionId: object.id,
          stripeSubscriptionId: object.subscription,
          userId: object.client_reference_id,
          checkoutMode: object.mode,
        }));
      } else {
        const subscriptionId = object.subscription;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const planId = sub.metadata?.plan_id;

        await supabase
          .from('users')
          .update({
            subscription_status: mapStripeStatus(sub.status, planId),
            stripe_customer_id: object.customer,
            stripe_subscription_id: subscriptionId,
            plan_id: planId,
            access_expires_at: accessEndsAt(sub),
            plan_started_at: new Date(sub.start_date * 1000).toISOString(),
            last_paid_at: new Date(sub.start_date * 1000).toISOString(),
          })
          .eq('id', object.client_reference_id)
          .neq('subscription_status', 'beta')
          .throwOnError();
      }
    }

    // Season's one-time charge, fired from chargeDueSeasonPasses() below. Kept
    // as a webhook handler too (not just the synchronous result of that
    // function's own stripe.paymentIntents.create call) in case Stripe settles
    // the PaymentIntent asynchronously (e.g. a bank taking a moment on an
    // off-session charge) — this is the defense-in-depth path, the synchronous
    // one is the common case.
    if (event.type === 'payment_intent.succeeded' && object.metadata?.plan_id === 'season') {
      const userId = object.metadata?.app_user_id;
      if (userId) {
        const paidAt = Number.isFinite(object.created) ? new Date(object.created * 1000) : new Date();
        await supabase
          .from('users')
          .update({
            subscription_status: 'season',
            access_expires_at: seasonEndsAt(paidAt).toISOString(),
            season_charge_due_at: null,
            last_paid_at: paidAt.toISOString(),
          })
          .eq('id', userId)
          .neq('subscription_status', 'beta')
          .throwOnError();
      }
    }

    if (event.type === 'payment_intent.payment_failed' && object.metadata?.plan_id === 'season') {
      const userId = object.metadata?.app_user_id;
      if (userId) {
        await supabase
          .from('users')
          .update({ subscription_status: 'past_due' })
          .eq('id', userId)
          .neq('subscription_status', 'beta')
          .throwOnError();
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const planId = object.metadata?.plan_id;
      await supabase
        .from('users')
        .update({
          subscription_status: mapStripeStatus(object.status, planId),
          access_expires_at: accessEndsAt(object),
          cancel_at_period_end: Boolean(object.cancel_at_period_end || object.cancel_at),
        })
        .eq('stripe_subscription_id', object.id)
        .neq('subscription_status', 'beta')
        .throwOnError();
    }

    if (event.type === 'customer.subscription.deleted') {
      await supabase
        .from('users')
        .update({
          subscription_status: 'expired',
          access_expires_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', object.id)
        .neq('subscription_status', 'beta')
        .throwOnError();
    }

    if (event.type === 'invoice.payment_failed') {
      // Leave access_expires_at alone — Stripe retries the charge automatically,
      // and revoking access on the first failure would lock out someone whose
      // card just needs a retry (a temporary decline, an expired card mid-retry
      // window, etc).
      let failedInvoiceUpdate = supabase
        .from('users')
        .update({ subscription_status: 'past_due' });
      // A customer can have an old and a replacement subscription. Match the
      // invoice's subscription whenever Stripe supplies it so a late failure
      // from the old one cannot downgrade the new plan.
      // Newer API versions (the webhook's 2026-08-26.dahlia) moved the field to
      // parent.subscription_details.subscription.
      const failedSubscriptionId = object.subscription ?? object.parent?.subscription_details?.subscription;
      failedInvoiceUpdate = failedSubscriptionId
        ? failedInvoiceUpdate.eq('stripe_subscription_id', failedSubscriptionId)
        : failedInvoiceUpdate.eq('stripe_customer_id', object.customer);
      failedInvoiceUpdate = failedInvoiceUpdate.neq('subscription_status', 'beta');
      await failedInvoiceUpdate.throwOnError();
    }
  } catch (err) {
    // Stripe retries on any non-2xx, and every write above is an idempotent
    // absolute-value UPDATE, so surfacing the failure as a 500 (not silently
    // 200-ing it) is what makes that retry actually useful instead of masking
    // a real problem.
    console.error(`Stripe webhook handling failed (${event.type}):`, err.message);
    return res.status(500).json({ error: 'Webhook handling failed.' });
  }

  res.json({ received: true });
}

/**
 * Fires the season pass's one, genuine one-time charge for every account
 * whose season_charge_due_at has arrived. This is the piece that makes
 * mode:'setup' + a later charge actually equivalent to "trial, then bill
 * once" — see the block comment above the /api/checkout route for why this
 * replaced a subscription-based approach.
 *
 * off_session + confirm:true resolves synchronously in the common case (a
 * normal card, no fresh authentication challenge), so success/failure is
 * usually handled right here; payment_intent.succeeded / .payment_failed in
 * the webhook above are the fallback for the rare case where Stripe settles
 * it asynchronously instead.
 *
 * Polled on an interval rather than a real cron because this app has no
 * separate worker/scheduler infra yet — the Node process is already
 * always-on. Revisit if this ever needs to survive the process restarting
 * mid-hour without missing a run (Supabase pg_cron calling a dedicated route
 * would be the natural upgrade).
 */
async function chargeDueSeasonPasses() {
  if (!stripe) return;

  const { data: due, error } = await supabase
    .from('users')
    .select('id, stripe_customer_id, stripe_payment_method_id, season_charge_due_at, subscription_status')
    .eq('plan_id', 'season')
    .eq('subscription_status', 'trialing')
    .not('stripe_payment_method_id', 'is', null)
    .lte('season_charge_due_at', new Date().toISOString());

  if (error) {
    console.error('chargeDueSeasonPasses: failed to fetch due accounts:', error.message);
    return;
  }

  for (const user of due || []) {
    if (user.subscription_status !== 'trialing') continue;
    let intent;
    try {
      intent = await stripe.paymentIntents.create(
        {
          amount: SEASON_PRICE_CZK * 100, // CZK is not zero-decimal — amount is in haléře.
          currency: 'czk',
          customer: user.stripe_customer_id,
          payment_method: user.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: { plan_id: 'season', app_user_id: user.id },
        },
        {
          // Stable across process restarts, overlapping server instances and
          // database-update retries. A later checkout has a different due_at,
          // so it still creates a genuinely new purchase.
          idempotencyKey: `season:${user.id}:${user.season_charge_due_at}`,
        }
      );

    } catch (err) {
      // Card declined, expired, off-session auth required and refused, etc.
      console.error(`chargeDueSeasonPasses: charge failed for user ${user.id}:`, err.message);
      const { error: updateError } = await supabase
        .from('users')
        .update({ subscription_status: 'past_due' })
        .eq('id', user.id)
        .eq('subscription_status', 'trialing');
      if (updateError) {
        console.error(`chargeDueSeasonPasses: could not mark user ${user.id} past due:`, updateError.message);
      }
      continue;
    }

    if (intent.status === 'succeeded') {
      try {
        const paidAt = Number.isFinite(intent.created) ? new Date(intent.created * 1000) : new Date();
        await supabase
          .from('users')
          .update({
            subscription_status: 'season',
            access_expires_at: seasonEndsAt(paidAt).toISOString(),
            season_charge_due_at: null,
            last_paid_at: paidAt.toISOString(),
          })
          .eq('id', user.id)
          .eq('subscription_status', 'trialing')
          .throwOnError();
      } catch (err) {
        // The charge succeeded. Leave Stripe's stable idempotency key and the
        // webhook to retry the database write; never mislabel a paid account as
        // past due just because this local write failed.
        console.error(`chargeDueSeasonPasses: paid user ${user.id} but could not save access:`, err.message);
      }
    }
    // Any other status (e.g. requires_action) is left for the webhook to
    // resolve once Stripe settles it, rather than guessed at here.
  }
}

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
