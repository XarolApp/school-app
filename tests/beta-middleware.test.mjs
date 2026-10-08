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
    assert.match(html, /Střední na míru je teď v testovací verzi/);
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
