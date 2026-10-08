import assert from 'node:assert/strict';
import { test } from 'node:test';
import { genderedCopy } from '../frontend/src/lib/genderCopy.js';

test('Czech copy uses masculine forms by default and switches common forms for women', () => {
  const copy = 'Našel(a) jsi, co jsi hledal(a)? Kde sis nebyl(a) jistý/á?';
  assert.equal(genderedCopy(copy), 'Našel jsi, co jsi hledal? Kde sis nebyl jistý?');
  assert.equal(genderedCopy(copy, 'f'), 'Našla jsi, co jsi hledala? Kde sis nebyla jistá?');
  assert.equal(genderedCopy('Do které části jsi ochotný/á jet?', 'f'), 'Do které části jsi ochotná jet?');
  assert.equal(genderedCopy('Do které části jsi ochotný/á jet?'), 'Do které části jsi ochotný jet?');
  assert.equal(genderedCopy('Můžeš klikl/a na odkaz.', 'f'), 'Můžeš klikla na odkaz.');
});
