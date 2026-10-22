import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../frontend/middleware.js';

const originalSiteKey = process.env.SITE_ACCESS_KEY;
const originalVercelEnv = process.env.VERCEL_ENV;

after(() => {
  if (originalSiteKey === undefined) delete process.env.SITE_ACCESS_KEY;
  else process.env.SITE_ACCESS_KEY = originalSiteKey;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
});

test('every page, including beta and email confirmation links, requires the typed code', async () => {
  process.env.SITE_ACCESS_KEY = 'Přístup testovací verze';
  delete process.env.VERCEL_ENV;
  for (const path of ['/skoly', '/beta/GYMJECNA', '/email-overen?beta=GYMJECNA', '/email-overen#access_token=secret']) {
    const response = await middleware(new Request(`https://school.test${path}`));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Střední na míru ještě není spuštěné/);
    assert.match(html, /<form method="POST" action="\/__gate">/);
    assert.match(html, /fetch\('\/__gate', \{ method: 'POST'/);
    assert.match(html, /location\.reload\(\)/);
    assert.doesNotMatch(html, /<form[^>]+method="GET"/);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('the POST gate normalizes accents, case and spaces, then issues an opaque long-lived cookie', async () => {
  process.env.SITE_ACCESS_KEY = 'Přístup testovací verze';
  const response = await middleware(new Request('https://school.test/__gate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: '  PRÍSTUP TESTOVACÍ VERZE ' }),
  }));

  assert.equal(response.status, 204);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^sm_access=[a-f0-9]{64}; Path=\//);
  assert.match(cookie, /Max-Age=15552000/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Přístup|pristup/i);

  const allowed = await middleware(new Request('https://school.test/skoly', { headers: { cookie: cookie.split(';')[0] } }));
  assert.equal(allowed, undefined);

  process.env.SITE_ACCESS_KEY = 'new secret';
  const rotated = await middleware(new Request('https://school.test/skoly', { headers: { cookie: cookie.split(';')[0] } }));
  assert.equal(rotated.status, 200);
});

test('a wrong code reports the specified error and delays the response', async () => {
  process.env.SITE_ACCESS_KEY = 'correct code';
  const started = Date.now();
  const response = await middleware(new Request('https://school.test/__gate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'wrong code' }),
  }));
  assert.equal(response.status, 401);
  assert.ok(Date.now() - started >= 550);
  assert.deepEqual(await response.json(), { ok: false });
  assert.equal(response.headers.get('set-cookie'), null);
});

test('plain POST fallback redirects to the same local path and query', async () => {
  process.env.SITE_ACCESS_KEY = 'entry code';
  const response = await middleware(new Request('https://school.test/__gate', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key: 'entry code', returnTo: '/email-overen?next=%2Fonboarding%2Fplan' }),
  }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/email-overen?next=%2Fonboarding%2Fplan');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);

  const openRedirect = await middleware(new Request('https://school.test/__gate', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key: 'entry code', returnTo: 'https://attacker.test/' }),
  }));
  assert.equal(openRedirect.headers.get('location'), '/');
});

test('wrong plain POST keeps its local return target and does not issue a cookie', async () => {
  process.env.SITE_ACCESS_KEY = 'entry code';
  const response = await middleware(new Request('https://school.test/__gate', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key: 'wrong', returnTo: '/email-overen?next=%2Fonboarding%2Fplan' }),
  }));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Kód nesedí\. Zkontroluj ho v e-mailu od školy\./);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('robots, gate endpoint and version endpoint are exempt, and robots disallows crawling', async () => {
  process.env.SITE_ACCESS_KEY = 'correct';
  const robots = await middleware(new Request('https://school.test/robots.txt'));
  assert.equal(await robots.text(), 'User-agent: *\nDisallow: /\n');
  assert.equal(await middleware(new Request('https://school.test/version.json')), undefined);
  assert.equal((await middleware(new Request('https://school.test/__gate'))).status, 405);
});

test('missing key stays open locally and fails closed in production', async () => {
  delete process.env.SITE_ACCESS_KEY;
  delete process.env.VERCEL_ENV;
  assert.equal(await middleware(new Request('https://school.test/skoly')), undefined);

  process.env.VERCEL_ENV = 'production';
  const response = await middleware(new Request('https://school.test/skoly'));
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Stránka se právě nastavuje\./);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');

  process.env.SITE_ACCESS_KEY = '   ';
  const blankKey = await middleware(new Request('https://school.test/skoly'));
  assert.equal(blankKey.status, 503);
  assert.match(await blankKey.text(), /Stránka se právě nastavuje\./);
});

test('creator edge claim sets device and gate cookies, then redirects with a no-referrer token hash', async () => {
  const originalFetch = globalThis.fetch;
  const originalClaimSecret = process.env.CREATOR_CLAIM_SECRET;
  const originalSiteKeyForTest = process.env.SITE_ACCESS_KEY;
  process.env.CREATOR_CLAIM_SECRET = 'shared-creator-secret';
  process.env.SITE_ACCESS_KEY = 'beta test code';
  const token = 'A'.repeat(43);
  const device = 'b'.repeat(64);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json({ tokenHash: 'one-time-hash' }, { status: 200 });
  };
  try {
    const response = await middleware(new Request(`https://school.test/pro/${token}`, {
      method: 'POST',
      headers: { 'user-agent': 'Creator Browser', 'x-forwarded-for': '203.0.113.10' },
    }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/pro/prihlaseni#t=one-time-hash');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');

    const cookies = response.headers.getSetCookie?.() ?? response.headers.get('set-cookie').split(', ');
    assert.equal(cookies.length, 2);
    assert.match(cookies[0], /^sm_creator_device=[a-f0-9]{64};/);
    assert.match(cookies[0], /Max-Age=34560000; HttpOnly; Secure; SameSite=Lax/);
    assert.match(cookies[1], /^sm_access=[a-f0-9]{64};/);
    assert.match(cookies[1], /HttpOnly; Secure; SameSite=Lax/);

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/api\/creator\/claim$/);
    assert.equal(calls[0].options.headers['X-Creator-Claim-Secret'], 'shared-creator-secret');
    assert.equal(calls[0].options.headers['X-Forwarded-For'], '203.0.113.10');
    assert.deepEqual(JSON.parse(calls[0].options.body), { token, device: cookies[0].split('=')[1].split(';')[0], userAgent: 'Creator Browser' });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalClaimSecret === undefined) delete process.env.CREATOR_CLAIM_SECRET;
    else process.env.CREATOR_CLAIM_SECRET = originalClaimSecret;
    if (originalSiteKeyForTest === undefined) delete process.env.SITE_ACCESS_KEY;
    else process.env.SITE_ACCESS_KEY = originalSiteKeyForTest;
  }
});

test('creator link GET (bots, scanners) shows an open button and never claims a device', async () => {
  const originalFetch = globalThis.fetch;
  const token = 'A'.repeat(43);
  let fetched = 0;
  globalThis.fetch = async () => { fetched += 1; return Response.json({ tokenHash: 'x' }); };
  try {
    for (const method of ['GET', 'HEAD']) {
      const response = await middleware(new Request(`https://school.test/pro/${token}`, { method }));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert.equal(response.headers.get('set-cookie'), null);
      if (method === 'GET') assert.match(await response.text(), new RegExp(`<form method="post" action="/pro/${token}">[^]*Otevřít náhled`));
    }
    assert.equal(fetched, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('creator edge errors use the gate for unknown links and no-store pages for blocked or unavailable claims', async () => {
  const originalFetch = globalThis.fetch;
  const token = 'A'.repeat(43);
  try {
    globalThis.fetch = async () => new Response('{}', { status: 404 });
    const unknown = await middleware(new Request(`https://school.test/pro/${token}`, { method: 'POST' }));
    assert.equal(unknown.status, 200);
    assert.match(await unknown.text(), /Střední na míru ještě není spuštěné/);
    assert.equal(unknown.headers.get('referrer-policy'), 'no-referrer');

    globalThis.fetch = async () => new Response('{}', { status: 409 });
    const blocked = await middleware(new Request(`https://school.test/pro/${token}`, { method: 'POST' }));
    assert.equal(blocked.status, 409);
    assert.match(await blocked.text(), /Tento odkaz už je aktivní na jiných zařízeních/);
    assert.equal(blocked.headers.get('cache-control'), 'no-store');
    assert.equal(blocked.headers.get('referrer-policy'), 'no-referrer');

    globalThis.fetch = async () => new Response('{}', { status: 503 });
    const unavailable = await middleware(new Request(`https://school.test/pro/${token}`, { method: 'POST' }));
    assert.equal(unavailable.status, 503);
    assert.match(await unavailable.text(), /Náhled se teď nepodařilo otevřít/);
    assert.equal(unavailable.headers.get('cache-control'), 'no-store');
    assert.equal(unavailable.headers.get('referrer-policy'), 'no-referrer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
