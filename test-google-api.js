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

    const data = await response.json().catch(() => null);
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (response.ok && typeof answer === 'string' && answer.trim()) {
      console.log(`✅ Key ${index + 1}: Works`);
      return true;
    }

    console.log(`❌ Key ${index + 1}: HTTP ${response.status}, no usable answer`);
    return false;
  } catch (err) {
    console.log(`❌ Key ${index + 1}: ${err.message}`);
    return false;
  }
}

async function main() {
  const results = await Promise.all(GOOGLE_GEMINI_API_KEYS.map(testKey));

  if (results.some(Boolean)) {
    console.log('\n✅ At least one key returned a short answer. Extraction/tool support still needs separate verification.');
    process.exit(0);
  } else {
    console.log('\n❌ All keys failed. Check your .env.');
    process.exit(1);
  }
}

main();
