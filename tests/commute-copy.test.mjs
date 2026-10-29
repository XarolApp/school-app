import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  commuteCountText, countWithin, limitFromSlider, NO_LIMIT, suggestLimit, withinLimit,
} from '../frontend/src/lib/commute.js';

// a stop's row: minutes to schools 1..n (null = over 90 minutes)
const row = (values) => Object.fromEntries(values.map((value, index) => [index + 1, value]));

test('slider position: 1-60 are minutes, the 60+ end stores no limit', () => {
  assert.equal(limitFromSlider(1), 1);
  assert.equal(limitFromSlider(60), 60);
  assert.equal(limitFromSlider(NO_LIMIT), null);
  assert.equal(limitFromSlider(0), null);
  assert.equal(limitFromSlider('abc'), null);
});

test('counts include the limit minute, skip unreachable schools and match the filter predicate', () => {
  const minutes = row([5, 25, 26, null, 60]);
  assert.equal(countWithin(minutes, 25), 2);
  assert.equal(countWithin(minutes, 60), 4);
  assert.equal(countWithin(minutes, null), 0);
  assert.equal(withinLimit(minutes, 2, 25), true);
  assert.equal(withinLimit(minutes, 3, 25), false);
  assert.equal(withinLimit(minutes, 4, 90), false);
  assert.equal(withinLimit(minutes, 99, 25), false);
});

test('student copy (tykání): do 1 školy / do 3 škol / do 42 škol', () => {
  const text = (n) => commuteCountText({ minutes: row(Array(n).fill(10)), limit: 25, parent: false }).main;
  assert.equal(text(1), 'Do 25 minut se dostaneš do 1 školy.');
  assert.equal(text(3), 'Do 25 minut se dostaneš do 3 škol.');
  assert.equal(text(42), 'Do 25 minut se dostaneš do 42 škol.');
});

test('parent copy (vykání): 1 škola / 2-4 školy / 5+ škol', () => {
  const text = (n) => commuteCountText({ minutes: row(Array(n).fill(10)), limit: 25, parent: true }).main;
  assert.equal(text(1), 'Do 25 minut je dostupná 1 škola.');
  assert.equal(text(2), 'Do 25 minut jsou dostupné 2 školy.');
  assert.equal(text(4), 'Do 25 minut jsou dostupné 4 školy.');
  assert.equal(text(5), 'Do 25 minut je dostupných 5 škol.');
  assert.equal(text(42), 'Do 25 minut je dostupných 42 škol.');
});

test('limit minutes decline: 1 minuty, 2+ minut', () => {
  const minutes = row([1, 1, 1, 1, 1, 1]);
  assert.match(commuteCountText({ minutes, limit: 1, parent: false }).main, /^Do 1 minuty se dostaneš do 6 škol\.$/);
  assert.match(commuteCountText({ minutes, limit: 2, parent: true }).main, /^Do 2 minut je dostupných 6 škol\.$/);
});

test('zero schools is calm and offers a way out; few schools suggest a longer limit', () => {
  const far = row([30, 31, 32, 33, 34, 35, 36, 37]);
  const zero = commuteCountText({ minutes: far, limit: 20, parent: false });
  assert.equal(zero.main, 'Do 20 minut se odsud MHD nedostaneš do žádné školy.');
  assert.equal(zero.hint, 'S limitem 35 minut by jich bylo 6.');
  const zeroParent = commuteCountText({ minutes: far, limit: 20, parent: true });
  assert.equal(zeroParent.main, 'Do 20 minut odsud MHD nedojedete do žádné školy.');
  assert.match(zeroParent.hint, /^S limitem 35 minut by to bylo \d+ škol\.$/);
  // nothing reachable at all: no number to promise, so a plain suggestion instead
  const none = commuteCountText({ minutes: row([null, null]), limit: 20, parent: false });
  assert.equal(none.hint, 'Zkus limit prodloužit, nebo vyber jinou zastávku.');
  assert.equal(suggestLimit(row([null, null]), 20), null);
  // plenty of schools: no hint at all
  assert.equal(commuteCountText({ minutes: row(Array(10).fill(5)), limit: 25, parent: false }).hint, null);
});

test('60+ (no limit) says dojezd is not counted', () => {
  const text = commuteCountText({ minutes: row([5]), limit: null, parent: false });
  assert.match(text.main, /Bez časového limitu/);
});
