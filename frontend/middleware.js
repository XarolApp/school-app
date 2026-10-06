/**
 * Site-wide access gate, pre-launch. Blocks random visitors and search
 * engines from the whole site; anyone with the link `?key=<SITE_ACCESS_KEY>`
 * gets a cookie and can browse normally afterwards.
 *
 * Set SITE_ACCESS_KEY in the Vercel project's environment variables (NOT
 * prefixed VITE_ — that would ship it in client JS). If it's unset, this
 * fails OPEN (site behaves as before) rather than silently locking everyone
 * out from a missing env var.
 *
 * This only gates the frontend. The Railway backend's ungated endpoints
 * (GET /api/schools, /api/schools/:id — deliberately public per CLAUDE.md)
 * are still directly reachable by anyone who has that URL; this is a soft
 * "keep it off Google and random visitors" gate, not a security boundary.
 */

const COOKIE_NAME = 'sm_access';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days
const BETA_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const BETA_LOOKUP_TIMEOUT_MS = 3500;

function gatePage(wrongKey) {
  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Střední na míru</title>
<style>
  body { font-family: system-ui, sans-serif; background: #FAF6EF; color: #221A13; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 16px; }
  form { background: #fff; padding: 32px; border-radius: 12px; max-width: 360px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  h1 { font-size: 1.05rem; margin: 0 0 16px; }
  input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; margin-bottom: 12px; }
  button { width: 100%; padding: 10px; border: 0; border-radius: 8px; background: #AD4F2A; color: #fff; font-size: 1rem; cursor: pointer; }
  p.err { color: #B23A2E; font-size: .9rem; margin: 0 0 12px; }
</style>
</head>
<body>
<form method="GET">
  <h1>Střední na míru — stránka ještě není veřejná</h1>
  ${wrongKey ? '<p class="err">Špatný kód.</p>' : ''}
  <input type="password" name="key" placeholder="Přístupový kód" autofocus required />
  <button type="submit">Vstoupit</button>
</form>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

function betaInvitationPage(status, unavailable = false) {
  const heading = unavailable ? 'Pozvánku teď nejde ověřit' : 'Tato pozvánka neplatí';
  const detail = unavailable
    ? 'Obnov stránku za chvíli nebo požádej školu o pomoc.'
    : 'Zkontroluj odkaz nebo požádej školu o novou pozvánku.';
  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Střední na míru — beta pozvánka</title>
<style>
  body { font-family: system-ui, sans-serif; background: #FAF6EF; color: #221A13; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 16px; }
  main { background: #fff; padding: 32px; border-radius: 12px; max-width: 440px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  h1 { font-size: 1.2rem; margin: 0 0 12px; }
  p { line-height: 1.55; margin: 0; }
</style>
</head>
<body><main><h1>${heading}</h1><p>${detail}</p></main></body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export function betaInvitationCode(pathname) {
  const match = /^\/beta\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let rawCode;
  try {
    rawCode = decodeURIComponent(match[1]);
  } catch {
    return '';
  }
  const code = rawCode.trim().toUpperCase();
  return BETA_CODE_PATTERN.test(code) ? code : '';
}

// The e-mail confirmation page carries the invitation as ?beta=CODE and may
// open in a browser that never saw the invitation (a phone's mail app), so a
// valid code opens the gate there too, exactly like /beta/CODE.
export function betaGateCode(url) {
  const fromPath = betaInvitationCode(url.pathname);
  if (fromPath !== null) return fromPath;
  if (url.pathname.replace(/\/$/, '') !== '/email-overen' || !url.searchParams.has('beta')) return null;
  const code = (url.searchParams.get('beta') || '').trim().toUpperCase();
  return BETA_CODE_PATTERN.test(code) ? code : '';
}

export function betaApiUrl(code) {
  const configuredOrigin = process.env.VITE_API_BASE_URL;
  if (!configuredOrigin) return null;
  try {
    const base = new URL(configuredOrigin);
    const isLocalHttp = base.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if (
      (!isLocalHttp && base.protocol !== 'https:') ||
      base.username || base.password || base.pathname !== '/' ||
      base.search || base.hash
    ) return null;
    return new URL(`/api/beta/schools/${encodeURIComponent(code)}`, base.origin);
  } catch {
    return null;
  }
}

export async function lookupBetaInvitation(code) {
  const endpoint = betaApiUrl(code);
  if (!endpoint) return 'unavailable';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BETA_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    if (response.status === 404) return 'invalid';
    if (!response.ok) return 'unavailable';
    const result = await response.json();
    return result?.code === code && typeof result?.school_name === 'string'
      ? 'valid'
      : 'invalid';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timeout);
  }
}

export default async function middleware(request) {
  const accessKey = process.env.SITE_ACCESS_KEY;
  if (!accessKey) return; // not configured — do not lock anyone out by accident

  const url = new URL(request.url);
  const suppliedKey = url.searchParams.get('key');

  if (suppliedKey === accessKey) {
    url.searchParams.delete('key');
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + url.search,
        'Set-Cookie': `${COOKIE_NAME}=${accessKey}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const hasValidCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .includes(`${COOKIE_NAME}=${accessKey}`);

  if (hasValidCookie) return;

  const betaCode = betaGateCode(url);
  if (betaCode !== null) {
    if (!betaCode) return betaInvitationPage(404);
    const result = await lookupBetaInvitation(betaCode);
    if (result === 'invalid') return betaInvitationPage(404);
    if (result !== 'valid') return betaInvitationPage(503, true);

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + url.search,
        'Set-Cookie': `${COOKIE_NAME}=${accessKey}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return gatePage(Boolean(suppliedKey));
}

export const config = {
  matcher: '/(.*)',
};
