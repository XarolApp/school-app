// Self-generated music bed (no licence needed): light lo-fi at 110 BPM, C major
// I–vi–IV–V colour (Cmaj7 Am7 Fmaj7 G6), soft kick/clap/hat, round bass.
// Run: node scripts/music.mjs <seconds> [anchorSeconds]  -> public/music.wav
// A bar downbeat lands exactly on anchorSeconds (e.g. the step-1 cut).
import { writeFileSync } from "node:fs";

const RATE = 44100;
const BPM = 110;
const SEC = Number(process.argv[2] ?? 48);
const beat = 60 / BPM;
const ANCHOR = Number(process.argv[3] ?? 0);
const PHASE = ANCHOR % (4 * beat);
const n = Math.floor(SEC * RATE);
const out = new Float32Array(n);
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

const add = (t0, dur, fn) => {
  const a = Math.max(0, Math.floor(t0 * RATE)), b = Math.min(n, Math.floor((t0 + dur) * RATE));
  for (let i = a; i < b; i++) out[i] += fn((i - a) / RATE);
};

const CHORDS = [[48, 52, 55, 59], [45, 52, 55, 60], [41, 52, 57, 60], [43, 50, 55, 59]]; // MIDI
const ROOTS = [36, 33, 29, 31];

for (let k = -4; PHASE + k * beat < SEC; k++) {
  const t = PHASE + k * beat;
  if (t < -0.01) continue;
  const bar = Math.floor(k / 4), inBar = ((k % 4) + 4) % 4, ch = ((bar % 4) + 4) % 4;
  // Kick on 1 and 3 (+ a ghost on the "and" of 3 every other bar)
  if (inBar === 0 || inBar === 2) {
    let ph = 0;
    add(t, 0.35, (s) => ((ph += (2 * Math.PI * (48 + 70 * Math.exp(-s * 28))) / RATE), Math.sin(ph) * Math.exp(-s * 9) * 0.55));
  }
  if (inBar === 2 && bar % 2) {
    let ph = 0;
    add(t + beat / 2, 0.25, (s) => ((ph += (2 * Math.PI * (48 + 50 * Math.exp(-s * 30))) / RATE), Math.sin(ph) * Math.exp(-s * 12) * 0.3));
  }
  // Soft clap on 2 and 4
  if (inBar === 1 || inBar === 3) {
    let lp = 0;
    add(t, 0.18, (s) => ((lp += 0.35 * (rand() - lp)), (rand() - lp) * Math.exp(-s * 26) * 0.16));
  }
  // Swung hats
  for (const [off, amp] of [[0, 0.05], [0.58, 0.035]]) {
    let lp = 0;
    add(t + off * beat, 0.05, (s) => ((lp += 0.6 * (rand() - lp)), (rand() - lp) * Math.exp(-s * 90) * amp));
  }
  // Chord pad: one per bar, warm sines with a slow tremolo
  if (inBar === 0) {
    for (const m of CHORDS[ch]) {
      const f = hz(m + 12);
      add(t, beat * 4 + 0.3, (s) => {
        const env = Math.min(1, s / 0.04) * (0.55 + 0.45 * Math.exp(-s * 1.4)) * Math.min(1, (beat * 4 + 0.3 - s) / 0.3);
        return (Math.sin(2 * Math.PI * f * s) + 0.28 * Math.sin(4 * Math.PI * f * s)) * env * 0.045 * (1 + 0.15 * Math.sin(2 * Math.PI * 4.2 * s));
      });
    }
  }
  // Bass: root on 1 and the "and" of 2
  if (inBar === 0 || inBar === 1) {
    const f = hz(ROOTS[ch]);
    const t0 = inBar === 0 ? t : t + beat / 2;
    add(t0, beat * 1.4, (s) => Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 2.2) * Math.min(1, s / 0.01) * 0.32);
  }
}

// Gentle low-pass, fades, normalise to −1 dBFS.
let lp = 0, peak = 0;
for (let i = 0; i < n; i++) {
  lp += 0.42 * (out[i] - lp);
  const s = i / RATE;
  out[i] = lp * Math.min(1, s / 0.4) * Math.min(1, (SEC - s) / 1.2);
  peak = Math.max(peak, Math.abs(out[i]));
}
const gain = 0.89 / peak;
const buf = Buffer.alloc(44 + n * 2);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24);
buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), 44 + i * 2);
writeFileSync(new URL("../public/music.wav", import.meta.url), buf);
console.log(`music.wav: ${SEC}s @ ${BPM} BPM, downbeat at ${ANCHOR}s, framesPerBeat ${((30 * 60) / BPM).toFixed(2)}`);
