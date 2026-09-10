/**
 * One-off: writes hand-looked-up REDIZO values (from rejskol.msmt.cz) for the
 * schools import-admission-data.js couldn't fuzzy-match on the first run.
 * Run once, then re-run import-admission-data.js — those schools will match
 * on REDIZO immediately and never need this again.
 *
 *   node scripts/backfill-redizo.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const REDIZO_BY_NAME = {
  'Gymnázium, Praha 10, Voděradská 2': '600006603',
  'Škola mezinárodních a veřejných vztahů Praha, Střední odborná škola, Gymnázium, s. r. o.': '600005402',
  'Střední průmyslová škola strojnická, škola hlavního města Prahy, Praha 1, Betlémská 4/287': '600004686',
  'Bezpečnostně právní akademie, s. r. o., střední škola': '691020515',
  'Gymnázium Jiřího Gutha-Jarkovského, Praha 1, Truhlářská 22': '600004546',
  'Gymnázium, Praha 8, U Libeňského zámku 1': '600005933',
  'Hotelová škola, Praha 10, Vršovická 43': '600004741',
  'Křesťanská střední škola, základní škola a mateřská škola Elijáš, Praha 4-Michle': '651040001',
  'Střední odborné učiliště kadeřnické, Praha 8, Karlínské náměstí 8/225': '600005101',
  'Vyšší odborná škola informačních studií a Střední škola elektrotechniky, multimédií a informatiky':
    '600006174',
  'Heřmánek Praha, základní škola, gymnázium a střední pedagogická škola, školská právnická osoba':
    '691008426',
  'Vyšší odborná škola zdravotnická a Střední zdravotnická škola a gymnázium, Praha 1, Alšovo nábřeží 6':
    '600020665',
  'EDUSO – Střední odborná škola multimediální a reklamní tvorby, s. r. o.': '651015995',
  'Střední průmyslová škola elektrotechnická, Praha 2, Ječná 30': '600004783',
};

async function main() {
  const { data: schools, error } = await supabase.from('schools').select('id, name');

  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }

  const byName = new Map(schools.map((s) => [s.name, s]));
  let written = 0;

  for (const [name, redizo] of Object.entries(REDIZO_BY_NAME)) {
    const school = byName.get(name);
    if (!school) {
      console.log(`  ? no DB school named exactly: ${name}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('schools')
      .update({ redizo })
      .eq('id', school.id);

    if (updateError) {
      console.error(`  ! ${name}: ${updateError.message}`);
      continue;
    }

    written += 1;
    console.log(`  ✓ ${name} → ${redizo}`);
  }

  console.log(`\nWrote REDIZO for ${written} of ${Object.keys(REDIZO_BY_NAME).length} schools.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
