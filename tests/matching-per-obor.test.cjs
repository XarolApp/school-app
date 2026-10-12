const test = require('node:test');
const assert = require('node:assert');
const { scoreSchools } = require('../lib/matching');

// A student studies one obor, so interests must be matched within one entry
// of a school's program list, not across all of them (bias found by
// scripts/simulate-matching.mjs, 2026-10-04).
const school = (id, programs) => ({ id, name: `S${id}`, programs, school_programs: [] });

test('interests are matched within one obor, not across a broad school', () => {
  const answers = { oblasti: ['it', 'umeni', 'gastro'] };
  const [broad, focused] = [
    school(1, 'Informační technologie, Grafický design, Kuchař-číšník'),
    school(2, 'Informační technologie - grafický design a gastronomie'),
  ];
  const byId = Object.fromEntries(scoreSchools(answers, [broad, focused]).map((m) => [m.school_id, m]));
  assert.ok(byId[2].breakdown.oblasti > byId[1].breakdown.oblasti, 'one obor covering all three beats three obory covering one each');
  assert.ok(Math.abs(byId[1].breakdown.oblasti - 1 / 3) < 0.01);
});

test('a general gymnázium gets partial credit instead of zero', () => {
  const [m] = scoreSchools({ oblasti: ['it'], predmety: ['matematika'] }, [school(3, 'Gymnázium')]);
  assert.ok(m.breakdown.oblasti > 0 && m.breakdown.oblasti < 1);
  assert.ok(m.breakdown.predmety > 0 && m.breakdown.predmety < 1);
});

test('conservatory obory count as art', () => {
  const [m] = scoreSchools({ oblasti: ['umeni'] }, [school(4, 'Tanec')]);
  assert.strictEqual(m.breakdown.oblasti, 1);
});

test('disability answer: special schools lead for a pupil who needs them, sink for everyone else', () => {
  const special = (id, types) => ({ ...school(id, 'Informační technologie'), school_extracted_details: { urceno_pro_postizeni: types } });
  const schools = [school(1, 'Informační technologie'), special(2, ['sluchove']), special(3, ['zrakove']), special(4, ['kombinovane'])];
  const order = (answers) => scoreSchools({ oblasti: ['it'], ...answers }, schools).map((m) => m.school_id);
  for (const answers of [{}, { postizeni: 'ne' }]) {
    assert.strictEqual(order(answers)[0], 1, 'an ordinary school beats every special school');
  }
  assert.deepStrictEqual(order({ postizeni: 'ano', postizeni_typ: ['sluchove'] }), [2, 4, 1, 3]);
  // "ano" without a type gives no basis to reorder.
  const flat = scoreSchools({ oblasti: ['it'], postizeni: 'ano' }, schools);
  assert.ok(flat.every((m) => m.score === flat[0].score));
});
