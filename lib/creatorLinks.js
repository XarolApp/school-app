'use strict';

const crypto = require('node:crypto');
const { CREATOR_DEMO_ANSWERS } = require('./creatorDemo');

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;
const DEVICE_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Cosmetic only: the URL shows the creator's name, the token after it is what authenticates.
function creatorUrl(name, token) {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return `${linkBase()}/pro/${slug || 'tvurce'}/${token}`;
}

function matchesSecret(supplied, expected) {
  if (typeof supplied !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function asyncRoute(handler, errorBody) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('Creator link request failed:', error?.message || error);
      return res.status(503).json(errorBody);
    }
  };
}

function linkBase() {
  return (process.env.CREATOR_LINK_BASE || 'https://www.stredninamiru.cz').replace(/\/+$/, '');
}

function registerCreatorLinks(app, db, { requireAuth, requireAdmin, saveOnboardingRun }) {
  const guards = [requireAuth, requireAdmin];

  app.post('/api/creator/claim', asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const expectedSecret = process.env.CREATOR_CLAIM_SECRET;
    const suppliedSecret = req.get?.('X-Creator-Claim-Secret') || req.headers?.['x-creator-claim-secret'];
    if (expectedSecret ? !matchesSecret(suppliedSecret, expectedSecret) : process.env.NODE_ENV === 'production') {
      return res.status(403).json({});
    }

    const { token, device, userAgent } = req.body || {};
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token) || typeof device !== 'string' || !DEVICE_PATTERN.test(device)) {
      return res.status(404).json({});
    }

    const { data, error } = await db.rpc('claim_creator_device', {
      p_token_hash: sha256(token),
      p_device_hash: sha256(device),
      p_user_agent: typeof userAgent === 'string' ? userAgent.slice(0, 200) : null,
    });
    if (error) throw error;
    const claim = Array.isArray(data) ? data[0] : data;
    if (claim?.result === 'blocked') return res.status(409).json({});
    if (claim?.result !== 'ok' || !claim.user_id) return res.status(404).json({});

    const userResult = await db.auth.admin.getUserById(claim.user_id);
    if (userResult.error || !userResult.data?.user?.email) throw userResult.error || new Error('Creator user is unavailable.');
    const linkResult = await db.auth.admin.generateLink({ type: 'magiclink', email: userResult.data.user.email });
    if (linkResult.error || typeof linkResult.data?.properties?.hashed_token !== 'string') {
      throw linkResult.error || new Error('Magic link token is unavailable.');
    }
    return res.status(200).json({ tokenHash: linkResult.data.properties.hashed_token });
  }, {}));

  app.get('/api/admin/creators', ...guards, asyncRoute(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const { data, error } = await db.from('creator_links')
      .select('id,name,note,created_at,revoked_at,last_opened_at,last_active_at,open_count,blocked_attempts,last_blocked_at,max_devices,creator_devices(first_seen,last_seen,user_agent)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json((data || []).map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      created_at: row.created_at,
      revoked_at: row.revoked_at,
      last_opened_at: row.last_opened_at,
      last_active_at: row.last_active_at,
      open_count: row.open_count,
      blocked_attempts: row.blocked_attempts,
      last_blocked_at: row.last_blocked_at,
      max_devices: row.max_devices,
      devices: (row.creator_devices || []).map(({ first_seen, last_seen, user_agent }) => ({ first_seen, last_seen, user_agent })),
    })));
  }, { error: 'Tvůrce se nepodařilo načíst.' }));

  app.post('/api/admin/creators', ...guards, asyncRoute(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() || null : null;
    if (!name || name.length > 80 || (note && note.length > 200)) {
      return res.status(400).json({ error: 'Zadej jméno do 80 znaků a poznámku do 200 znaků.' });
    }

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('base64url');
    const email = `tvurce+${id.slice(0, 8)}@stredninamiru.cz`;
    let userId = null;
    try {
      const created = await db.auth.admin.createUser({
        email,
        password: crypto.randomBytes(32).toString('hex'),
        email_confirm: true,
        user_metadata: { name },
      });
      if (created.error || !created.data?.user?.id) throw created.error || new Error('Creator account was not created.');
      userId = created.data.user.id;

      const profile = await db.from('users').update({ subscription_status: 'creator', trial_expires_at: new Date().toISOString() }).eq('id', userId);
      if (profile.error) throw profile.error;

      const link = await db.from('creator_links').insert({
        id,
        name,
        note,
        token_hash: sha256(token),
        user_id: userId,
        max_devices: 2,
      });
      if (link.error) throw link.error;

      const saved = await saveOnboardingRun(userId, CREATOR_DEMO_ANSWERS);
      if (saved.status !== 201 || !saved.body?.saved || !saved.matches?.length) {
        throw new Error(saved.body?.error || 'Creator demo results were not saved.');
      }
      const favorites = saved.matches.slice(0, 3).map(({ school_id }) => ({ user_id: userId, school_id }));
      if (favorites.length) {
        const favoriteResult = await db.from('favorites').insert(favorites);
        if (favoriteResult.error) throw favoriteResult.error;
      }
    } catch (error) {
      if (userId) {
        const deletion = await db.auth.admin.deleteUser(userId);
        if (deletion.error) console.error('Could not clean up a failed creator account:', deletion.error.message || deletion.error);
      }
      throw error;
    }

    return res.status(201).json({ url: creatorUrl(name, token) });
  }, { error: 'Tvůrce se nepodařilo vytvořit.' }));

  const findLink = async (id) => {
    const { data, error } = await db.from('creator_links').select('id,user_id').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  };

  const validateId = (req, res) => {
    if (!UUID_PATTERN.test(req.params.id || '')) {
      res.status(400).json({ error: 'Neplatný odkaz.' });
      return false;
    }
    return true;
  };

  app.post('/api/admin/creators/:id/rotate', ...guards, asyncRoute(async (req, res) => {
    if (!validateId(req, res)) return;
    const token = crypto.randomBytes(32).toString('base64url');
    const { data, error } = await db.from('creator_links').update({ token_hash: sha256(token) }).eq('id', req.params.id).select('id,name').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Odkaz neexistuje.' });
    return res.json({ url: creatorUrl(data.name, token) });
  }, { error: 'Odkaz se nepodařilo obnovit.' }));

  app.post('/api/admin/creators/:id/reset-devices', ...guards, asyncRoute(async (req, res) => {
    if (!validateId(req, res)) return;
    const link = await findLink(req.params.id);
    if (!link) return res.status(404).json({ error: 'Odkaz neexistuje.' });
    const { error } = await db.from('creator_devices').delete().eq('link_id', req.params.id);
    if (error) throw error;
    return res.status(204).end();
  }, { error: 'Zařízení se nepodařilo resetovat.' }));

  app.post('/api/admin/creators/:id/revoke', ...guards, asyncRoute(async (req, res) => {
    if (!validateId(req, res)) return;
    const link = await findLink(req.params.id);
    if (!link) return res.status(404).json({ error: 'Odkaz neexistuje.' });
    const { error } = await db.from('creator_links').update({ revoked_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    const ban = await db.auth.admin.updateUserById(link.user_id, { ban_duration: '876000h' });
    if (ban.error) throw ban.error;
    return res.status(204).end();
  }, { error: 'Odkaz se nepodařilo zrušit.' }));

  app.post('/api/admin/creators/:id/restore', ...guards, asyncRoute(async (req, res) => {
    if (!validateId(req, res)) return;
    const link = await findLink(req.params.id);
    if (!link) return res.status(404).json({ error: 'Odkaz neexistuje.' });
    const unban = await db.auth.admin.updateUserById(link.user_id, { ban_duration: 'none' });
    if (unban.error) throw unban.error;
    const { error } = await db.from('creator_links').update({ revoked_at: null }).eq('id', req.params.id);
    if (error) throw error;
    return res.status(204).end();
  }, { error: 'Odkaz se nepodařilo obnovit.' }));
}

module.exports = { registerCreatorLinks, sha256 };
