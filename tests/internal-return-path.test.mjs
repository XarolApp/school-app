import assert from 'node:assert/strict';
import { test } from 'node:test';
import { internalReturnPath } from '../frontend/src/lib/internalReturnPath.js';

test('auth return paths preserve internal routes, queries and fragments', () => {
  for (const path of ['/', '/skoly', '/skoly/29', '/onboarding/plan?betaPreview=1', '/skoly?q=um%C4%9Bn%C3%AD#mapa']) {
    assert.equal(internalReturnPath(path), path);
    assert.equal(new URL(path, 'https://app.example').origin, 'https://app.example');
  }
});

test('auth return paths reject external authorities, backslashes and stripped controls', () => {
  const unsafe = [
    '//redirect-check.invalid', '/\\redirect-check.invalid', '/\t/redirect-check.invalid',
    '/\n/redirect-check.invalid', '/\r/redirect-check.invalid', '/\0/redirect-check.invalid',
    '/./\\redirect-check.invalid', '/skoly\\other', 'https://redirect-check.invalid',
    'javascript:alert(1)', 'skoly', '', null, undefined, {}, 1,
  ];
  for (const path of unsafe) assert.equal(internalReturnPath(path), null, String(path));
  assert.equal(new URL('/\\redirect-check.invalid', 'https://app.example').origin, 'https://redirect-check.invalid');
});
