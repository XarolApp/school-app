const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shouldHold } = require('../lib/reviewFilter');

test('Czech role initials and capitalized titles still hold named-person reviews', () => {
  for (const text of [
    'učitel Novák byl skvělý.', 'Náš ředitel Novák byl skvělý.',
    'Pan Novák byl skvělý.', 'paní učitelka Nováková byla skvělá.',
    'prof. Svoboda učí dobře.', 'Ředitel Novák učí dobře.',
  ]) assert.equal(shouldHold(text), true, text);
});

test('a role without a name and a role embedded in another word are not held', () => {
  for (const text of ['učitel byl skvělý', 'paní učitelka je milá', 'tulipan Novák']) {
    assert.equal(shouldHold(text), false, text);
  }
  assert.equal(shouldHold('je to debil'), true);
});
