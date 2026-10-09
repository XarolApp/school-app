import assert from 'node:assert/strict';
import test from 'node:test';
import { mayReloadAfterPreloadError, shouldReloadForVersion } from '../frontend/src/lib/updateWatcher.js';

const versionChange = {
  currentBuild: 'old',
  latestBuild: 'new',
  idleForMs: 30_000,
  idleThresholdMs: 30_000,
  safeToReload: true,
};

test('auto-update waits for a different build, the idle threshold, and a safe page', () => {
  assert.equal(shouldReloadForVersion(versionChange), true);
  assert.equal(shouldReloadForVersion({ ...versionChange, latestBuild: 'old' }), false);
  assert.equal(shouldReloadForVersion({ ...versionChange, idleForMs: 29_999 }), false);
  assert.equal(shouldReloadForVersion({ ...versionChange, safeToReload: false }), false);
});

test('a stale chunk triggers at most one reload for the same build', () => {
  assert.equal(mayReloadAfterPreloadError('current', null), true);
  assert.equal(mayReloadAfterPreloadError('current', 'current'), false);
  assert.equal(mayReloadAfterPreloadError('next', 'current'), true);
});
