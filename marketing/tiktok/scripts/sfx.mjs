// Synthesises the video's small SFX kit as 16-bit mono WAVs into public/sfx/.
// Deterministic (seeded noise), zero downloads. Run: npm run sfx
import { writeFileSync } from "node:fs";

const RATE = 44100;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(name, seconds, fn) {
  const n = Math.floor(seconds * RATE);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, fn(i / RATE, i / n)));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(new URL(`../public/sfx/${name}.wav`, import.meta.url), buf);
}

// Whoosh: low-passed noise, swelling then fading, filter opening over time.
{
  let lp = 0;
  wav("whoosh", 0.45, (t, p) => {
    const a = 0.02 + 0.25 * p;
    lp += a * (rand() - lp);
    return lp * Math.sin(Math.PI * p) ** 1.5 * 1.6;
  });
}

// Pop: sine with a fast pitch drop.
{
  let ph = 0;
  wav("pop", 0.16, (t) => {
    ph += (2 * Math.PI * (900 * Math.exp(-t * 30) + 280)) / RATE;
    return Math.sin(ph) * Math.exp(-t * 28) * 0.6;
  });
}

// Tick: very short filtered click for UI selections and typing.
wav("tick", 0.04, (t) => rand() * Math.exp(-t * 180) * 0.35);

// Thump: sine kick for the big hits.
{
  let ph = 0;
  wav("thump", 0.5, (t) => {
    ph += (2 * Math.PI * (110 * Math.exp(-t * 14) + 45)) / RATE;
    return Math.sin(ph) * Math.exp(-t * 7) * 0.9;
  });
}

// Pad: soft detuned chord bed (A major add9) for the whole 10 s.
{
  const notes = [220, 277.18, 329.63, 493.88];
  wav("pad", 10.2, (t, p) => {
    const env = Math.min(1, t / 1.2) * Math.min(1, (10.2 - t) / 1.0);
    let s = 0;
    for (const f of notes) s += Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.004 * t);
    return (s / (notes.length * 2)) * env * 0.35 * (0.85 + 0.15 * Math.sin(t * 1.3));
  });
}

console.log("sfx written");
