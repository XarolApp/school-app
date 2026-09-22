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

function gatePage(wrongKey) {
  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>ŠkolaMatch</title>
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
  <h1>ŠkolaMatch — stránka ještě není veřejná</h1>
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

export default function middleware(request) {
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

  return gatePage(Boolean(suppliedKey));
}

export const config = {
  matcher: '/(.*)',
};
