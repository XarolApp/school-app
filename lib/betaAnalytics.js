const crypto = require('node:crypto');
const EVENT_FIELDS = {
  page_view: ['referrer'], page_leave: ['ms'], session_start: ['device','width','height','theme','palette'],
  ob_step: ['step','role'], ob_answer: ['key','skipped'], ob_drop: ['step'], paywall_view: ['screen'],
  q_start: [], q_answer: ['key','skipped'], q_finish: ['run_id'], q_abandon: ['key'],
  search: ['query','length','results'], search_zero: ['query'], filter_used: ['filter'], sort_used: ['sort'],
  school_open: ['id','from'], school_section: ['section'], school_web_click: ['id'],
  compare_add: ['id'], compare_open: ['count'], matrix_weight: ['criterion','level'],
  prihlaska_pick: ['priority'], share_create: [], theme_change: ['theme','palette'],
  favorite_toggle: ['id','added'], review_write: ['id'], result_view: ['schools','source'],
  js_error: ['message'], api_error: ['endpoint','status'], rage_click: ['selector'],
};
function safePath(value) {
  if (typeof value !== 'string' || value.length > 512 || !value.startsWith('/') || value.startsWith('//') || /[?#\u0000-\u001f]/.test(value)) return null;
  return value.replace(/\/(beta|sdileni|vysledky|platba-rodice|od-rodice)\/[^/]+/g, '/$1/:token');
}
function safeError(value) {
  const text = typeof value === 'string' ? value : '';
  const known = text.match(/(?:TypeError|ReferenceError|SyntaxError|RangeError|NetworkError|ChunkLoadError|Failed to fetch|Loading chunk|ResizeObserver loop|Cannot read properties)/);
  return known?.[0] || 'Chyba JavaScriptu';
}
function sanitizeEvent(event) {
  if (!event || !Object.hasOwn(EVENT_FIELDS, event.name)) return null;
  const path = safePath(event.path);
  const props = event.props ?? {};
  if (!path || typeof props !== 'object' || Array.isArray(props) || Buffer.byteLength(JSON.stringify(props)) > 2048) return null;
  const clean = {};
  for (const key of EVENT_FIELDS[event.name]) {
    const value = props[key];
    if (value === undefined) continue;
    if (key === 'schools') {
      if (!Array.isArray(value) || value.length > 10 || value.some((v) => !v || typeof v !== 'object' || Array.isArray(v) || !Number.isInteger(v.id) || v.id < 1 || !Number.isInteger(v.rank) || v.rank < 1 || v.rank > 10)) return null;
      clean.schools = value.map(({ id, rank }) => ({ id, rank }));
    } else if (key === 'message') clean.message = safeError(value);
    else if (key === 'endpoint' || key === 'referrer') clean[key] = safePath(value) || '/';
    else if (typeof value === 'boolean') clean[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value) && value >= 0) clean[key] = Math.min(value, key === 'ms' ? 86400000 : 100000);
    else if (typeof value === 'string' && value.length <= 160 && !/[@\u0000-\u001f]|\d{6,}/.test(value)) clean[key] = value;
  }
  return { name: event.name, path, props: clean };
}
function visitorTicket(secret, code, anonId, now = Date.now()) {
  if (!secret || !/^[a-f0-9-]{36}$/.test(anonId || '')) return null;
  const data = Buffer.from(JSON.stringify({ code, anonId, noticeAccepted: true, expires: now + 86400000 })).toString('base64url');
  return data + '.' + crypto.createHmac('sha256', secret).update(data).digest('base64url');
}
function verifyVisitorTicket(secret, ticket, anonId, now = Date.now()) {
  try {
    const [data, signature] = ticket.split('.');
    const expected = crypto.createHmac('sha256', secret).update(data).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.noticeAccepted === true && payload.anonId === anonId && payload.expires > now ? payload : null;
  } catch { return null; }
}
function checklistFromEvents(events, previous = {}) {
  const next = { ...previous };
  const seen = new Set(previous.school_ids || []);
  for (const event of events) {
    const map = { q_finish: 'dotaznik', result_view: 'dotaznik', search: 'vyhledavani', compare_open: 'porovnani',
      matrix_weight: 'matice', prihlaska_pick: 'prihlaska', theme_change: 'tema', share_create: 'sdileni' };
    if (map[event.name] && (event.name !== 'search' || event.props?.length>0)) next[map[event.name]] = true;
    if (event.name === 'school_open') seen.add(event.props.id);
    if (event.name === 'paywall_view') {
      next.paywall_screens = [...new Set([...(next.paywall_screens || []), event.props.screen])];
      next.platby = ['hodnota','cesta','plan','zkusebni','platba'].every((s) => next.paywall_screens.includes(s));
    }
  }
  next.school_ids = [...seen].filter(Number.isInteger).slice(0, 223);
  next.detail = next.school_ids.length >= 3;
  return next;
}
function feedbackDetails(body, userId) {
  if (!['bug','navrh','funkce','text','neprehledne','chvala','obecne'].includes(body.kind)) return null;
  const details = { kind: body.kind, source: 'button' };
  for (const [key,max] of [['selector',512],['element_text',120],['text_before',2000],['text_after',2000]]) {
    if (body[key] == null) continue;
    if (typeof body[key] !== 'string' || body[key].length > max) return null;
    details[key] = body[key].replace(/[^\s@]+@[^\s@]+/g, '[soukromý údaj]');
  }
  for (const [key,fields] of [['rect',['x','y','width','height']],['viewport',['width','height','scroll_x','scroll_y']]]) {
    if (body[key] == null) continue;
    if (typeof body[key] !== 'object' || Array.isArray(body[key])) return null;
    details[key] = {};
    for (const field of fields) {
      const value = body[key][field];
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1000000 || /width|height/.test(field) && value <= 0) return null;
      details[key][field] = value;
    }
  }
  if (body.screenshot_path != null) {
    if (typeof body.screenshot_path !== 'string' || !body.screenshot_path.startsWith(userId + '/') ||
      !/^[a-f0-9-]{36}\.(png|jpg)$/.test(body.screenshot_path.slice(userId.length + 1))) return null;
    details.screenshot_path = body.screenshot_path;
  }
  return details;
}
module.exports = { EVENT_FIELDS, safePath, sanitizeEvent, visitorTicket, verifyVisitorTicket, checklistFromEvents, feedbackDetails };
