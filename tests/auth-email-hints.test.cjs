const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the real validators; React hooks are not called by these pure helpers.
const source = readFileSync(path.join(__dirname, '../frontend/src/lib/authValidation.js'), 'utf8')
  .replace(/^import .* from 'react';\n/, '')
  .replace(/export /g, '');
const scope = {};
vm.runInNewContext(source + '\nthis.validators = { emailProblem, emailSuggestion: typeof emailSuggestion === "function" ? emailSuggestion : null };', scope);
const { emailProblem, emailSuggestion } = scope.validators;

test('suspected domain typos do not block syntactically valid addresses', () => {
  for (const domain of ['centrum.com', 'seznam.com', 'gmail.cz', 'gmial.com', 'seznan.cz']) {
    for (const parent of [false, true]) assert.equal(emailProblem(`reviewer@${domain}`, parent), '');
  }
});

test('optional suggestions preserve syntax validation', () => {
  for (const address of ['', 'reviewer.example.com', 'reviewer@', 'reviewer@@example.com', 'a b@example.com']) {
    assert.notEqual(emailProblem(address), '');
  }
  for (const address of ['reviewer@example.com', ' review+tag@custom.example ']) assert.equal(emailProblem(address), '');
});

test('correction hints allow the original address in both voices and omit invalid input', () => {
  assert.equal(typeof emailSuggestion, 'function');
  assert.match(emailSuggestion('reviewer@centrum.com'), /@centrum\.cz/);
  assert.match(emailSuggestion('reviewer@centrum.com'), /můžeš pokračovat bez změny/);
  assert.match(emailSuggestion('reviewer@centrum.com', true), /můžete pokračovat bez změny/);
  assert.equal(emailSuggestion('reviewer@custom.example'), '');
  assert.equal(emailSuggestion('not-an-email'), '');
});
