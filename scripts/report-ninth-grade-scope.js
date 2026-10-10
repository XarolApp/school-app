/**
 * Read-only report of what the 9th-grade scope (plan 021) hides.
 *
 *   node --env-file=.env scripts/report-ninth-grade-scope.js
 *
 * Prints schools hidden entirely and schools that lost some obory, and writes
 * the same data (no personal data) to reports/ninth-grade-scope-2026-10-10.json.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function all(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function main() {
  const schools = await all('schools', 'id, name, merged_into, hidden_reason');
  const hidden = await all('school_programs_hidden', 'school_id, rok, obor_nazev, typ_skoly, delka_studia');
  const visible = await all('school_programs', 'school_id');

  const visibleCount = new Map();
  for (const p of visible) visibleCount.set(p.school_id, (visibleCount.get(p.school_id) || 0) + 1);

  const perSchool = new Map();
  for (const h of hidden) {
    const entry = perSchool.get(h.school_id) || { types: new Map(), obory: new Set() };
    const label = h.typ_skoly === 'Konzervatoře' ? `Konzervatoře ${h.delka_studia}letá` : h.typ_skoly;
    entry.types.set(label, (entry.types.get(label) || 0) + 1);
    entry.obory.add(`${h.obor_nazev}|${h.typ_skoly}`);
    perSchool.set(h.school_id, entry);
  }

  const byId = new Map(schools.map((s) => [s.id, s]));
  const describe = (id) => {
    const entry = perSchool.get(id);
    return {
      id,
      name: byId.get(id)?.name ?? '?',
      hidden_types: [...entry.types.keys()].sort(),
      hidden_obory: entry.obory.size,
      visible_rows: visibleCount.get(id) || 0,
    };
  };

  const hiddenSchools = schools.filter((s) => s.hidden_reason).map((s) => s.id);
  const partial = [...perSchool.keys()].filter((id) => !byId.get(id)?.hidden_reason && !byId.get(id)?.merged_into);
  const report = {
    generated_at: new Date().toISOString(),
    visible_schools: schools.filter((s) => !s.merged_into && !s.hidden_reason).length,
    hidden_schools: hiddenSchools.length,
    partially_affected: partial.length,
    hidden: hiddenSchools.map(describe).sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    partial: partial.map(describe).sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  };

  console.log(`Visible ${report.visible_schools} | hidden ${report.hidden_schools} | partially affected ${report.partially_affected}\n`);
  console.log('HIDDEN ENTIRELY');
  for (const s of report.hidden) console.log(`  ${s.id}\t${s.name}\t[${s.hidden_types.join(', ')}]`);
  console.log('\nPARTIALLY AFFECTED (lost obory)');
  for (const s of report.partial) console.log(`  ${s.id}\t${s.name}\t-${s.hidden_obory} obory [${s.hidden_types.join(', ')}]`);

  const out = path.join(__dirname, '..', 'reports', 'ninth-grade-scope-2026-10-10.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\nWritten to ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
