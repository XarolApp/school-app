const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scripts/import-admission-data.js'), 'utf8');
const start = source.indexOf('  const neverMatched =');
const end = source.indexOf('  console.log(`\\n${programRowsToWrite.length}');
assert.ok(start >= 0 && end > start, 'actual report boundary exists');
const reportBlock = source.slice(start, end);

function runReport(unmatchedNames) {
  const reportPath = path.join(__dirname, '../scripts/admission-import-unmatched.txt');
  const files = new Map([[reportPath, 'Old unmatched school\n']]);
  let writes = 0;
  vm.runInNewContext(reportBlock, {
    __dirname: path.join(__dirname, '../scripts'),
    path, unmatchedNames, dbSchools: [], perSchool: new Map(), console: { log() {} },
    fs: { writeFileSync(file, text) { files.set(file, text); writes += 1; } },
  });
  return { text: files.get(reportPath), writes };
}

test('an import with no unmatched names clears the previous manual-review report', () => {
  const result = runReport(new Map());
  assert.equal(result.writes, 1);
  assert.equal(result.text.trim(), '');
});

test('a new unmatched report replaces old names and retains source file provenance', () => {
  const result = runReport(new Map([['Nová škola', new Set(['2025.xlsx', '2026.xlsx'])]]));
  assert.equal(result.writes, 1);
  assert.equal(result.text, 'Nová škola  (seen in: 2025.xlsx, 2026.xlsx)\n');
});
