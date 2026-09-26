const assert = require('node:assert/strict');
const test = require('node:test');
const config = require('./filter-config.json');
const { filterSchool, parsePages } = require('./filter-scraped-schools');

test('keeps URL markers and one protected repeated fact while removing repeated navigation', () => {
  const oldMinimum = config.fallbackMinChars;
  config.fallbackMinChars = 0;
  try {
    const urls = ['https://example.cz/', 'https://example.cz/skolne', 'https://example.cz/jidelna', 'https://example.cz/prijimaci-rizeni'];
    const source = urls.map((url, i) => `## PAGE-URL: ${url}\n\n# ${['Škola', 'Školné', 'Jídelna', 'Přijímací řízení'][i]}\n\nHlavní nabídka\nŠkolné 25 000 Kč ročně.\n\n${['Informace o škole.', 'Platba ve dvou splátkách.', 'Obědy pro žáky.', 'Pohovor pro uchazeče.'][i]}`).join('\n\n---\n\n');
    const result = filterSchool(source);
    assert.deepEqual(parsePages(result.text).map((page) => page.url), urls);
    assert.equal((result.text.match(/Školné 25 000 Kč ročně\./g) || []).length, 1);
    assert.doesNotMatch(result.text, /Hlavní nabídka/);
    assert.deepEqual(result.flags, []);
  } finally {
    config.fallbackMinChars = oldMinimum;
  }
});

test('copies unparseable markdown unchanged', () => {
  const source = '# School\nNo source marker';
  const result = filterSchool(source);
  assert.equal(result.text, source);
  assert.deepEqual(result.flags, ['unparsed']);
});

test('rescues a factual fee paragraph when the size budget drops its page', () => {
  const oldMinimum = config.fallbackMinChars;
  const oldReduction = config.fallbackMaxReduction;
  const oldTarget = config.targetChars;
  config.fallbackMinChars = 0;
  config.fallbackMaxReduction = 1;
  config.targetChars = 100;
  try {
    const source = [
      '## PAGE-URL: https://example.cz/\n\n# Škola\n\nO naší škole a studijních oborech.',
      '## PAGE-URL: https://example.cz/cena-za-studium\n\nŠkolné pro první ročník je 119 000 Kč za školní rok.',
      '## PAGE-URL: https://example.cz/aktuality\n\nŠkolní aktuality.',
    ].join('\n\n---\n\n');
    const result = filterSchool(source);
    assert.match(result.text, /119 000 Kč/);
    assert.match(result.text, /## PAGE-URL: https:\/\/example.cz\/cena-za-studium/);
  } finally {
    config.fallbackMinChars = oldMinimum;
    config.fallbackMaxReduction = oldReduction;
    config.targetChars = oldTarget;
  }
});

test('strips inline images, including data URIs, from kept lines', () => {
  const oldMinimum = config.fallbackMinChars;
  config.fallbackMinChars = 0;
  try {
    const source = '## PAGE-URL: https://example.cz/\n\n# Škola\n\nObědy ve školní jídelně ![logo](data:image/png;base64,AAAABBBBCCCC) každý den.';
    const result = filterSchool(source);
    assert.doesNotMatch(result.text, /data:image|!\[/);
    assert.match(result.text, /Obědy ve školní jídelně/);
  } finally {
    config.fallbackMinChars = oldMinimum;
  }
});

test('budget trimming drops keyword filler before a fee paragraph whose group is still present elsewhere', () => {
  const old = { ...config };
  const filler = 'Cena sportovního kurzu a platby za výlety se upřesní.';
  const fee = 'Školné činí 48 000 Kč ročně.';
  const source = `## PAGE-URL: https://example.cz/\n\n# Škola\n\n${filler}\n\n${fee}\n\n${filler} Znovu.`;
  Object.assign(config, { fallbackMinChars: 0, fallbackMaxReduction: 1, targetChars: source.length - 20 });
  try {
    const result = filterSchool(source);
    assert.match(result.text, /48 000 Kč/);
    assert.ok(result.text.length <= config.targetChars);
  } finally {
    Object.assign(config, old);
  }
});

test('keeps a keyword-less page and paragraph that state a price', () => {
  const oldMinimum = config.fallbackMinChars;
  const oldReduction = config.fallbackMaxReduction;
  config.fallbackMinChars = 0;
  config.fallbackMaxReduction = 1;
  try {
    const source = [
      '## PAGE-URL: https://example.cz/\n\n# Škola\n\nO naší škole.\n\nProgramy:\n\n- **tuition fees**: 89 000 CZK/year',
      '## PAGE-URL: https://example.cz/financovani-studia\n\nVýše příspěvku na studium činí vždy na začátku pololetí 23 450,- Kč.',
    ].join('\n\n---\n\n');
    const result = filterSchool(source);
    assert.match(result.text, /89 000 CZK/);
    assert.match(result.text, /23 450,- Kč/);
  } finally {
    config.fallbackMinChars = oldMinimum;
    config.fallbackMaxReduction = oldReduction;
  }
});
