const { test } = require('node:test');
const assert = require('node:assert/strict');

test('social proof only accepts explicitly consented, human-selected beta reviews', async () => {
  const { testimonialsFor } = await import('../frontend/src/config/socialProof.js');
  const approved = { id: 1, role: 'student', consent_publish: true, selected_by_admin: true };
  const reviews = [
    approved,
    { id: 2, role: 'student', consent_publish: false, selected_by_admin: true },
    { id: 3, role: 'student', consent_publish: true, selected_by_admin: false },
    { id: 4, role: 'parent', consent_publish: true, selected_by_admin: true },
    { id: 5, role: 'student', selected_by_admin: true },
  ];

  assert.deepEqual(testimonialsFor('student', reviews), [approved]);
});
