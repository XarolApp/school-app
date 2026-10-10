// Execute the real API helper with synthetic sessions and HTTP responses only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../frontend/src/api.js'), 'utf8');
const session = (id, token = id) => ({ user: { id }, access_token: `synthetic-${token}` });
const response = (status) => ({ status, ok: status >= 200 && status < 300, json: async () => ({ error: 'Synthetic rejection' }) });
function harness({ onFetch, onRefresh, onSession } = {}) {
  let current = session('A'), refreshes = 0, sessionReads = 0;
  const requests = [];
  const context = {
    supabase: { auth: {
      getSession: async () => {
        sessionReads++;
        if (onSession) await onSession({ read: sessionReads, change: (next) => { current = next; } });
        return { data: { session: current } };
      },
      refreshSession: async () => {
        refreshes++;
        if (onRefresh) return onRefresh({ change: (next) => { current = next; } });
        if (!current) return { data: { session: null }, error: new Error('Synthetic missing session') };
        current = session(current.user.id, `${current.user.id}-fresh`);
        return { data: { session: current }, error: null };
      },
    } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return onFetch({ index: requests.length, change: (next) => { current = next; } });
    },
    track() {}, betaTracker: {}, DEMO_SCHOOLS: [], withNames: (value) => value, withNamesAll: (value) => value,
    window: { dispatchEvent() {} }, CustomEvent: class {}, URL, setTimeout,
  };
  vm.createContext(context);
  vm.runInContext(source.replace(/^import .*;\n/gm, '').replace(/\bexport (?=(?:async )?(?:function|class|const))/g, '')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined')
    + '\nthis.api = { deleteAccount, updateProfile, fetchMe };', context);
  return { api: context.api, requests, get refreshes() { return refreshes; } };
}

test('a delayed account A deletion must not retry under account B', async () => {
  const h = harness({ onFetch: ({ index, change }) => {
    if (index === 1) { change(session('B')); return response(401); }
    return response(204);
  } });
  await assert.rejects(h.api.deleteAccount(), (error) => error.status === 401);
  assert.equal(h.refreshes, 0);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer synthetic-A');
});

test('an account change while refreshing must not replay the old mutation', async () => {
  const h = harness({ onFetch: ({ index }) => response(index === 1 ? 401 : 204),
    onRefresh: ({ change }) => { const next = session('B'); change(next); return { data: { session: next }, error: null }; },
  });
  await assert.rejects(h.api.deleteAccount({ deleteContributions: true }), (error) => error.status === 401);
  assert.equal(h.refreshes, 1);
  assert.equal(h.requests.length, 1);
});

test('same-owner retry uses the verified refreshed token despite a later session change', async () => {
  const h = harness({ onFetch: ({ index }) => response(index === 1 ? 401 : 204),
    onRefresh: ({ change }) => { const refreshed = session('A', 'A-fresh'); change(session('B')); return { data: { session: refreshed }, error: null }; },
  });
  await h.api.deleteAccount({ deleteContributions: true });
  assert.equal(h.refreshes, 1);
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].options.headers.Authorization, 'Bearer synthetic-A-fresh');
  assert.equal(h.requests[1].options.body, h.requests[0].options.body);
  assert.equal(h.requests[1].options.method, 'DELETE');
  assert.equal(Object.hasOwn(h.requests[1].options, 'accessToken'), false);
});

test('a persistent rejection refreshes at most once', async () => {
  const h = harness({ onFetch: () => response(401) });
  await assert.rejects(h.api.fetchMe(), (error) => error.status === 401);
  assert.equal(h.refreshes, 1);
  assert.equal(h.requests.length, 2);
});

test('explicit owner token does not refresh or redirect to the current session', async () => {
  const h = harness({ onFetch: () => response(401) });
  await assert.rejects(h.api.updateProfile({ name: 'Synthetic A' }, 'synthetic-owner'), (error) => error.status === 401);
  assert.equal(h.refreshes, 0);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer synthetic-owner');
});

test('sign-out before a rejection prevents refresh', async () => {
  const h = harness({ onFetch: ({ change }) => { change(null); return response(401); } });
  await assert.rejects(h.api.deleteAccount(), (error) => error.status === 401);
  assert.equal(h.refreshes, 0);
  assert.equal(h.requests.length, 1);
});

test('failed refresh preserves the original rejection without replay', async () => {
  const h = harness({ onFetch: () => response(401), onRefresh: () => ({ data: { session: null }, error: new Error('Synthetic outage') }) });
  await assert.rejects(h.api.fetchMe(), (error) => error.status === 401);
  assert.equal(h.refreshes, 1);
  assert.equal(h.requests.length, 1);
});
