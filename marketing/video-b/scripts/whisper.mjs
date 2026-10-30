// Word timings for the voiceover (brief §6). Caption TEXT comes from the script,
// only the timings come from Whisper. whisper.cpp + model live outside the repo.
// Run: node scripts/whisper.mjs [audio]  -> src/vo-words.json (default: the tightened VO)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from "@remotion/install-whisper-cpp";

const WHISPER = process.env.WHISPER_DIR ?? "/Users/vojtechkadlec/Developer/stredninamiru-video/whisper.cpp";
const MODEL = process.env.WHISPER_MODEL ?? "small"; // medium is better but a 1.5 GB download
const wav = new URL("../out/vo16k.wav", import.meta.url).pathname;
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-v", "error", "-i", process.argv[2] ?? "public/vo-tight.wav", "-ar", "16000", "-ac", "1", wav]);
await installWhisperCpp({ to: WHISPER, version: "1.5.5" });
await downloadWhisperModel({ model: MODEL, folder: WHISPER });
const r = await transcribe({ inputPath: wav, whisperPath: WHISPER, whisperCppVersion: "1.5.5", model: MODEL, tokenLevelTimestamps: true, language: "cs" });
const { captions } = toCaptions({ whisperCppOutput: r });
const words = captions.map((c) => ({ text: c.text, start: c.startMs, end: c.endMs })); // raw: a leading space starts a new word
writeFileSync(new URL("../src/vo-words.json", import.meta.url), JSON.stringify(words, null, 1));
console.log(words.length, "tokens");
