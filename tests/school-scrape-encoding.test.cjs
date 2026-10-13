const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Only the actual decoder/fetch boundary is evaluated: no dotenv, Supabase,
// scraper main, renderer or cache writes. Responses contain offline fixture bytes.
const source = readFileSync(path.join(__dirname, '../scripts/scrape-schools-free.js'), 'utf8');
const start = source.indexOf('function decodePageBytes(');
const end = source.indexOf('/** Free renderer', start);
assert.ok(start >= 0 && end > start);

async function readPage(bytes, type = 'text/html') {
  const calls = [];
  const context = vm.createContext({
    Buffer, TextDecoder, RangeError, AbortSignal, USER_AGENT: 'offline-test',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(bytes, { headers: { 'content-type': type } });
    },
  });
  const fetchText = vm.runInContext(`${source.slice(start, end)}\nfetchText;`, context);
  const text = await fetchText('https://school.invalid/', 1000);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://school.invalid/');
  return text;
}

const legacyCzech = Buffer.from([0xc8, 0x65, 0x73, 0x6b, 0xe1, 0x20, 0x9a, 0x6b, 0x6f, 0x6c, 0x61]);

test('scraper preserves Czech windows-1250 text declared only by HTML meta', async () => {
  for (const meta of [
    '<meta http-equiv="Content-Type" content="text/html; charset=windows-1250">',
    "<META content='text/html; charset=windows-1250' HTTP-EQUIV='Content-Type'>",
    '<meta charset="windows-1250">',
  ]) {
    const bytes = Buffer.concat([Buffer.from(`${meta}<title>`), legacyCzech, Buffer.from('</title>')]);
    assert.equal(await readPage(bytes), `${meta}<title>Česká škola</title>`);
  }
});

test('scraper honors valid HTTP charset before conflicting HTML meta', async () => {
  const meta = '<meta charset="utf-8">';
  const bytes = Buffer.concat([Buffer.from(meta), legacyCzech]);
  assert.equal(await readPage(bytes, 'text/html; charset="windows-1250"'), `${meta}Česká škola`);
  const latin2 = Buffer.from([0xc8, 0x65, 0x73, 0x6b, 0xe1, 0x20, 0xb9, 0x6b, 0x6f, 0x6c, 0x61]);
  assert.equal(await readPage(latin2, 'text/html; charset=iso-8859-2'), 'Česká škola');
});

test('scraper keeps UTF-8 and ignores commented or unrelated meta declarations', async () => {
  const text = '<!-- <meta charset="windows-1250"> --><meta name="description" content="charset=windows-1250">Česká škola';
  assert.equal(await readPage(Buffer.from(text)), text);
  assert.equal(await readPage(Buffer.from('Žáci, obědy, školné'), 'text/html; charset=UTF-8'), 'Žáci, obědy, školné');
  const metaUtf16 = '<meta charset="utf-16">Česká škola';
  assert.equal(await readPage(Buffer.from(metaUtf16)), metaUtf16);
});

test('scraper honors UTF BOMs before charset declarations', async () => {
  const text = 'Česká škola';
  assert.equal(await readPage(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]), 'text/html; charset=windows-1250'), text);
  const little = Buffer.from(text, 'utf16le');
  assert.equal(await readPage(Buffer.concat([Buffer.from([0xff, 0xfe]), little])), text);
  const big = Buffer.from(little); big.swap16();
  assert.equal(await readPage(Buffer.concat([Buffer.from([0xfe, 0xff]), big])), text);
});

test('scraper skips unsupported encoding labels without losing valid text', async () => {
  const meta = '<meta charset="windows-1250">';
  const bytes = Buffer.concat([Buffer.from(meta), legacyCzech]);
  assert.equal(await readPage(bytes, 'text/html; charset=not-an-encoding'), `${meta}Česká škola`);
  assert.equal(await readPage(Buffer.from('Česká škola'), 'text/html; charset=not-an-encoding'), 'Česká škola');
});
