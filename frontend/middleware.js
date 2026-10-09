/**
 * Site-wide tester gate for the Vercel frontend. The access code is sent only
 * in a POST body; the browser keeps an HMAC cookie after a successful entry.
 */

const COOKIE_NAME = 'sm_access';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const COOKIE_LABEL = 'stredni-na-miru:site-access:v1';
const WRONG_CODE_DELAY_MS = 600;

function normalizeAccessKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

async function accessCookieValue(value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizeAccessKey(value)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(COOKIE_LABEL),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const target = new URL(value, 'https://gate.invalid');
    const path = `${target.pathname}${target.search}`;
    return target.origin === 'https://gate.invalid' && !path.startsWith('//') ? path : '/';
  } catch {
    return '/';
  }
}

function gatePage({ wrongKey = false, returnTo = '/', setup = false } = {}) {
  const error = wrongKey ? '<p class="error" role="alert">Kód nesedí. Zkontroluj ho v e-mailu od školy.</p>' : '';
  const form = setup ? '' : `<form method="POST" action="/__gate">
      <input type="hidden" name="returnTo" value="${escapeHtml(safeReturnTo(returnTo))}">
      <label for="access-key">Přístupový kód</label>
      <div class="field"><input id="access-key" type="password" name="key" autocomplete="off" autocapitalize="none" required autofocus><button class="reveal" type="button" aria-label="Zobrazit kód" aria-pressed="false">Zobrazit</button></div>
      ${error}
      <button class="submit" type="submit">Vstoupit</button>
    </form>`;
  const content = setup
    ? '<h1>Stránka se právě nastavuje.</h1>'
    : `<h1>Střední na míru je teď v testovací verzi.</h1>
      <p class="intro">Pokud jsi tester, zadej přístupový kód z e-mailu od školy.</p>
      ${form}
      <p class="footer">Nejste tester? Spuštění chystáme — <a href="mailto:info@stredninamiru.cz">info@stredninamiru.cz</a></p>`;
  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Střední na míru — testovací verze</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { min-height: 100vh; margin: 0; padding: 24px; display: grid; place-items: center; background: #F5F6F7; color: #15191E; font: 16px/1.5 system-ui, sans-serif; }
  main { width: min(100%, 440px); padding: 32px; background: #F5F6F7; border: 1px solid #DCE0E4; border-radius: 16px; box-shadow: 0 18px 40px -20px rgba(21,25,30,.18); }
  h1 { margin: 0 0 12px; font-size: clamp(1.45rem, 6vw, 1.8rem); line-height: 1.2; letter-spacing: -.02em; }
  .intro { margin: 0 0 24px; color: #4B525B; }
  label { display: block; margin-bottom: 6px; font-weight: 600; }
  .field { display: flex; gap: 8px; }
  input { min-width: 0; flex: 1; height: 48px; padding: 0 12px; border: 1px solid #C4CBD2; border-radius: 8px; background: #F5F6F7; color: #15191E; font: inherit; }
  input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #1C58A3; outline-offset: 2px; }
  button { min-height: 48px; border: 0; border-radius: 8px; font: inherit; font-weight: 600; cursor: pointer; }
  .reveal { padding: 0 10px; background: #EAEDEF; color: #15191E; }
  .submit { width: 100%; margin-top: 12px; background: #1C58A3; color: #F5F6F7; }
  .submit:hover { background: #16467F; }
  .error { margin: 10px 0 0; color: #B0271F; font-size: .92rem; }
  .footer { margin: 24px 0 0; color: #5F6670; font-size: .9rem; }
  a { color: #1C58A3; }
  @media (max-width: 420px) { main { padding: 24px; } .field { flex-wrap: wrap; } .field input { flex-basis: 100%; } .reveal { margin-left: auto; } }
</style>
</head>
<body>
<main>${content}</main>
${setup ? '' : `<script>
  const form = document.querySelector('form');
  const input = document.querySelector('#access-key');
  const reveal = document.querySelector('.reveal');
  const submit = document.querySelector('.submit');
  const showError = (message) => {
    let error = form.querySelector('.error');
    if (!error) { error = document.createElement('p'); error.className = 'error'; error.setAttribute('role', 'alert'); form.insertBefore(error, submit); }
    error.textContent = message;
  };
  reveal.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    reveal.textContent = visible ? 'Skrýt' : 'Zobrazit';
    reveal.setAttribute('aria-pressed', String(visible));
    reveal.setAttribute('aria-label', visible ? 'Skrýt kód' : 'Zobrazit kód');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const response = await fetch('/__gate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: input.value }) });
      if (response.ok) { location.reload(); return; }
      showError(response.status === 401 ? 'Kód nesedí. Zkontroluj ho v e-mailu od školy.' : 'Stránka se právě nastavuje.');
    } catch {
      showError('Vstup se nepodařil. Zkus to znovu.');
    } finally {
      submit.disabled = false;
    }
  });
</script>`}
</body>
</html>`;
  return new Response(html, {
    status: setup ? 503 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

async function readGateSubmission(request) {
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      return { key: body?.key, returnTo: '/' };
    }
    const body = await request.formData();
    return { key: body.get('key'), returnTo: body.get('returnTo') };
  } catch {
    return { key: null, returnTo: '/' };
  }
}

function setAccessCookie(value) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function cookieValue(request) {
  const item = (request.headers.get('cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? item.slice(COOKIE_NAME.length + 1) : '';
}

function jsonResponse(body, status, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  if (url.pathname === '/__gate' || url.pathname === '/version.json') {
    if (url.pathname === '/version.json') return;
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    const accessKey = process.env.SITE_ACCESS_KEY;
    if (!accessKey) {
      return process.env.VERCEL_ENV === 'production'
        ? gatePage({ setup: true })
        : new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
    if (Number(request.headers.get('content-length') || 0) > 2048) return jsonResponse({ ok: false }, 413);

    const { key: suppliedKey, returnTo } = await readGateSubmission(request);
    const normalizedSecret = normalizeAccessKey(accessKey);
    if (!normalizedSecret) return gatePage({ setup: true });
    if (typeof suppliedKey !== 'string' || normalizeAccessKey(suppliedKey) !== normalizedSecret) {
      await new Promise((resolve) => setTimeout(resolve, WRONG_CODE_DELAY_MS));
      if ((request.headers.get('content-type') || '').includes('application/json')) {
        return jsonResponse({ ok: false }, 401);
      }
      return gatePage({ wrongKey: true, returnTo: safeReturnTo(returnTo) });
    }

    const token = await accessCookieValue(normalizedSecret);
    if ((request.headers.get('content-type') || '').includes('application/json')) {
      return new Response(null, { status: 204, headers: { 'Set-Cookie': setAccessCookie(token), 'Cache-Control': 'no-store' } });
    }
    return new Response(null, {
      status: 303,
      headers: { Location: safeReturnTo(returnTo), 'Set-Cookie': setAccessCookie(token), 'Cache-Control': 'no-store' },
    });
  }

  const accessKey = process.env.SITE_ACCESS_KEY;
  if (!accessKey) {
    return process.env.VERCEL_ENV === 'production' ? gatePage({ setup: true }) : undefined;
  }

  const normalizedSecret = normalizeAccessKey(accessKey);
  if (!normalizedSecret) return gatePage({ setup: true });
  const expectedCookie = await accessCookieValue(normalizedSecret);
  const actualCookie = cookieValue(request);
  if (actualCookie && constantTimeEqual(actualCookie, expectedCookie)) return;

  return gatePage({ returnTo: `${url.pathname}${url.search}` });
}

export const config = {
  matcher: '/(.*)',
};
