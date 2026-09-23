require('dotenv').config();

const GOOGLE_GEMINI_API_KEYS = (process.env.GOOGLE_GEMINI_API_KEYS || '').split(',').filter(Boolean);
const GOOGLE_GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';

if (!GOOGLE_GEMINI_API_KEYS.length) {
  console.error('❌ No GOOGLE_GEMINI_API_KEYS in .env');
  process.exit(1);
}

console.log(`Testing Google Gemini API with ${GOOGLE_GEMINI_API_KEYS.length} key(s)...`);

async function testKey(apiKey, index) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: { parts: [{ text: 'Say "OK" in one word.' }] },
          generation_config: { max_output_tokens: 10 },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`✅ Key ${index + 1}: Works`);
        return true;
      }
    }

    const text = await response.text();
    console.log(`❌ Key ${index + 1}: ${response.status} ${text.slice(0, 100)}`);
    return false;
  } catch (err) {
    console.log(`❌ Key ${index + 1}: ${err.message}`);
    return false;
  }
}

async function main() {
  const results = await Promise.all(GOOGLE_GEMINI_API_KEYS.map(testKey));

  if (results.some(Boolean)) {
    console.log('\n✅ At least one key works. Ready to extract!');
    process.exit(0);
  } else {
    console.log('\n❌ All keys failed. Check your .env.');
    process.exit(1);
  }
}

main();
