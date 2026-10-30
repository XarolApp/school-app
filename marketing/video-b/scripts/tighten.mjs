// Re-paces the voiceover by capping pauses (brief §6: split on silences ≥250 ms
// rather than asking for a re-record). Words are untouched; vo.mp3 stays the original.
// Run: node scripts/tighten.mjs [tempo]  -> public/vo-tight.wav
import { spawnSync } from "node:child_process";

const SRC = "public/vo.mp3";
const OUT = "public/vo-tight.wav";
const TEMPO = Number(process.argv[2] ?? 1); // atempo keeps pitch
const PARAGRAPH = 0.34; // pause kept where the read paused long (a blank line in §6)
const SENTENCE = 0.2;
const TAIL = 0.35;

// ffmpeg logs to stderr; return it so silencedetect output can be parsed.
const ff = (args) => {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-hide_banner", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
};
const log = ff(["-i", SRC, "-af", "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"]);
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const total = +/Duration: (\d+):(\d+):([\d.]+)/.exec(log).slice(1).reduce((a, v) => a * 60 + +v, 0);

// Speech segments with the kept slice of the following pause appended.
const segs = [];
let from = 0;
starts.forEach((s, i) => {
  const e = ends[i] ?? total;
  const dur = e - s;
  const keep = e >= total - 0.01 ? TAIL : Math.min(dur, dur > 0.7 ? PARAGRAPH : SENTENCE);
  segs.push([from, s + keep]);
  from = e;
});
if (from < total - 0.01) segs.push([from, total]);

const chains = segs.map(([a, b], i) => `[0:a]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS[s${i}]`);
const filter = `${chains.join(";")};${segs.map((_, i) => `[s${i}]`).join("")}concat=n=${segs.length}:v=0:a=1,atempo=${TEMPO}[out]`;
ff(["-y", "-v", "error", "-i", SRC, "-filter_complex", filter, "-map", "[out]", "-ar", "48000", "-ac", "1", OUT]);
const kept = segs.reduce((a, [x, y]) => a + y - x, 0) / TEMPO;
console.log(`${total.toFixed(2)} s -> ${kept.toFixed(2)} s (${segs.length} segments, tempo ${TEMPO})`);
