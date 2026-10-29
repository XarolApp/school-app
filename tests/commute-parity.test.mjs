import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as browser from '../frontend/src/lib/commuteScore.js';

const server = createRequire(import.meta.url)('../lib/commuteScore.js');

test('browser and server commute constants are identical', () => {
  for (const key of ['COMMUTE_LIMIT_MIN', 'COMMUTE_LIMIT_MAX', 'GRACE_FACTOR', 'GRACE_MIN', 'GRACE_MAX', 'DECAY_EXP', 'RAMP_MIN', 'DEFAULT_STRICTNESS']) {
    assert.equal(browser[key], server[key], key);
  }
  assert.deepEqual(browser.STRICTNESS_P, server.STRICTNESS_P);
});

test('browser and server give the same credit and multiplier for every limit, minute and strictness', () => {
  for (let limit = 1; limit <= 60; limit += 1) {
    assert.equal(browser.isCommuteLimit(limit), server.isCommuteLimit(limit));
    for (const minutes of [null, ...Array.from({ length: 96 }, (_, i) => i)]) {
      assert.equal(browser.commuteCredit(minutes, limit), server.commuteCredit(minutes, limit), `credit ${minutes}/${limit}`);
      for (const strictness of [...Object.keys(server.STRICTNESS_P), undefined, 'bogus']) {
        assert.equal(
          browser.commuteMultiplier(minutes, limit, strictness),
          server.commuteMultiplier(minutes, limit, strictness),
          `multiplier ${minutes}/${limit}/${strictness}`,
        );
      }
    }
  }
  for (const bad of [0, 61, 2.5, '5', null, undefined]) assert.equal(browser.isCommuteLimit(bad), server.isCommuteLimit(bad));
});
