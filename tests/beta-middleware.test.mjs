import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../frontend/middleware.js';

const originalFetch = globalThis.fetch;
const originalSiteKey = process.env.SITE_ACCESS_KEY;
const originalApiOrigin = process.env.VITE_API_BASE_URL;

after(() => {
  globalThis.fetch = originalFetch;
  if (originalSiteKey === undefined) delete process.env.SITE_ACCESS_KEY;
  else process.env.SITE_ACCESS_KEY = originalSiteKey;
  if (originalApiOrigin === undefined) delete process.env.VITE_API_BASE_URL;
  else process.env.VITE_API_BASE_URL = originalApiOrigin;
});

test('known beta invitation gets the existing cookie and keeps the confirmation query', async () => {
  process.env.SITE_ACCESS_KEY = 'server-only-secret';
  process.env.VITE_API_BASE_URL = 'https://api.skolamatch.test';
  let requestedUrl;
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    return Response.json({ code: 'GYMJECNA', school_name: 'Gymnázium' });
  };

  const response = await middleware(new Request('https://school.test/beta/gymjecna?potvrzeno=1&source=email'));
  assert.equal(response.status, 302);
  assert.equal(new URL(response.headers.get('location'), 'https://school.test').pathname, '/beta/gymjecna');
  assert.equal(new URL(response.headers.get('location'), 'https://school.test').search, '?potvrzeno=1&source=email');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /Secure/);
  assert.match(response.headers.get('set-cookie'), /server-only-secret/);
  assert.equal(requestedUrl, 'https://api.skolamatch.test/api/beta/schools/GYMJECNA');
});

test('unknown or unavailable beta invitations never receive the site cookie', async () => {
  process.env.SITE_ACCESS_KEY = 'server-only-secret';
  process.env.VITE_API_BASE_URL = 'https://api.skolamatch.test';
  globalThis.fetch = async () => new Response('{}', { status: 404 });
  const missing = await middleware(new Request('https://school.test/beta/UNKNOWN'));
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('set-cookie'), null);
  assert.match(missing.headers.get('x-robots-tag'), /noindex/);

  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  const offline = await middleware(new Request('https://school.test/beta/GYMJECNA'));
  assert.equal(offline.status, 503);
  assert.equal(offline.headers.get('set-cookie'), null);
});

test('beta lookup uses only the configured API origin, never the request host', async () => {
  process.env.SITE_ACCESS_KEY = 'server-only-secret';
  process.env.VITE_API_BASE_URL = 'https://api.skolamatch.test/path';
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const response = await middleware(new Request('https://attacker.test/beta/GYMJECNA'));
  assert.equal(response.status, 503);
  assert.equal(called, false);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('the existing access-key and cookie gate behavior stays intact', async () => {
  process.env.SITE_ACCESS_KEY = 'server-only-secret';
  process.env.VITE_API_BASE_URL = 'https://api.skolamatch.test';
  globalThis.fetch = async () => { throw new Error('beta lookup must not run'); };

  const keyResponse = await middleware(new Request('https://school.test/skoly?key=server-only-secret&sort=name'));
  assert.equal(keyResponse.status, 302);
  assert.equal(keyResponse.headers.get('location'), '/skoly?sort=name');

  const cookieResponse = await middleware(new Request('https://school.test/skoly', {
    headers: { cookie: 'sm_access=server-only-secret' },
  }));
  assert.equal(cookieResponse, undefined);
});
