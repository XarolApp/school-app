require('dotenv').config();

const GOOGLE_GEMINI_API_KEYS = (process.env.GOOGLE_GEMINI_API_KEYS || '').split(',').filter(Boolean);
const GOOGLE_GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL || 'gemini-3.6-flash';

if (!GOOGLE_GEMINI_API_KEYS.length) {
  console.error('❌ No GOOGLE_GEMINI_API_KEYS in .env');
  process.exit(1);
}

async function testKey(apiKey, index) {
  console.log(`\nKey ${index + 1}:`);
  console.log(`  Testing with ${GOOGLE_GEMINI_MODEL}...`);
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: { parts: [{ text: 'Hi' }] },
        generation_config: { max_output_tokens: 10 },
      }),
    }
  );
  
  const data = await response.json();
  console.log(`  Status: ${response.status}`);
  if (data.error) {
    console.log(`  Error: ${data.error.message}`);
  } else if (data.candidates) {
    console.log(`  ✅ Success!`);
  } else {
    console.log(`  Response:`, JSON.stringify(data).slice(0, 150));
  }
}

async function main() {
  for (let i = 0; i < GOOGLE_GEMINI_API_KEYS.length; i++) {
    await testKey(GOOGLE_GEMINI_API_KEYS[i], i);
  }
}

main();
