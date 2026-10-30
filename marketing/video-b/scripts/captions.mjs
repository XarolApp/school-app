// Aligns the script's words (src/script.json) to Whisper's token timings
// (src/vo-words.json) and writes src/captions.json. Whisper misspells Czech, so its
// text is used only to place the script words in time (brief §6).
// Run: node scripts/captions.mjs
import { readFileSync, writeFileSync } from "node:fs";

const src = (f) => new URL(`../src/${f}`, import.meta.url);
const script = JSON.parse(readFileSync(src("script.json"), "utf8"));
const tokens = JSON.parse(readFileSync(src("vo-words.json"), "utf8"));

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// Whisper tokens -> words (a leading space starts a new word).
const heard = [];
for (const t of tokens) {
  if (!t.text.trim()) continue;
  if (t.text.startsWith(" ") || !heard.length) heard.push({ w: norm(t.text), start: t.start, end: t.end });
  else Object.assign(heard.at(-1), { w: heard.at(-1).w + norm(t.text), end: t.end });
}
const H = heard.filter((h) => h.w);

const words = script.beats.flatMap((b) => b.text.split(/\s+/).map((text) => ({ text, beat: b.id, n: norm(text) })));

// Needleman–Wunsch: digits Whisper wrote for spoken numbers count as weak matches.
const sim = (a, b) => {
  if (a === b) return 2;
  if (a.length >= 3 && b.length >= 3 && a.slice(0, 3) === b.slice(0, 3)) return 1;
  if (/^\d+$/.test(b) && /^(sto|devadesati|dvou|patnacti|pet|jedenact|deset|procent|peti)$/.test(a)) return 0.5;
  return -1;
};
const GAP = -0.6;
const n = words.length, m = H.length;
const S = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i + j) * GAP));
for (let i = 1; i <= n; i++)
  for (let j = 1; j <= m; j++)
    S[i][j] = Math.max(S[i - 1][j - 1] + sim(words[i - 1].n, H[j - 1].w), S[i - 1][j] + GAP, S[i][j - 1] + GAP);
for (let i = n, j = m; i > 0 && j > 0; ) {
  if (S[i][j] === S[i - 1][j - 1] + sim(words[i - 1].n, H[j - 1].w)) {
    if (sim(words[i - 1].n, H[j - 1].w) > 0) Object.assign(words[i - 1], { start: H[j - 1].start, end: H[j - 1].end });
    i--; j--;
  } else if (S[i][j] === S[i - 1][j] + GAP) i--;
  else j--;
}

// Unmatched words share the gap between their matched neighbours, by length.
for (let i = 0; i < n; ) {
  if (words[i].start !== undefined) { i++; continue; }
  let k = i;
  while (k < n && words[k].start === undefined) k++;
  const from = i ? words[i - 1].end : 0;
  const to = k < n ? words[k].start : H.at(-1).end;
  const total = words.slice(i, k).reduce((a, w) => a + w.text.length, 0);
  let t = from;
  for (let x = i; x < k; x++) {
    const d = ((to - from) * words[x].text.length) / total;
    Object.assign(words[x], { start: Math.round(t), end: Math.round(t + d) });
    t += d;
  }
  i = k;
}

// Spoken numbers and the URL read better as digits on screen; their timing spans the words.
const DISPLAY = [
  ["patnácti", "15"], ["sto devadesáti dvou", "192"], ["pět minut.", "5 minut."], ["pěti krocích.", "5 krocích."],
  ["jedenáct", "11"], ["deset procent.", "10 %."], ["střední na míru tečka cé zet", "stredninamiru.cz"],
];
const out = [];
for (let i = 0; i < n; i++) {
  const hit = DISPLAY.find(([spoken]) => spoken.split(" ").every((s, k) => words[i + k]?.text === s));
  if (hit) {
    const len = hit[0].split(" ").length;
    out.push({ text: hit[1], beat: words[i].beat, startMs: words[i].start, endMs: words[i + len - 1].end });
    i += len - 1;
  } else out.push({ text: words[i].text, beat: words[i].beat, startMs: words[i].start, endMs: words[i].end });
}
writeFileSync(src("captions.json"), JSON.stringify(out, null, 1));
const matched = words.filter((w) => w.end - w.start > 0).length;
console.log(`${out.length} caption words, ${H.length} heard words`);
for (const b of script.beats) {
  const ws = out.filter((w) => w.beat === b.id);
  console.log(b.id.padEnd(3), (ws[0].startMs / 1000).toFixed(2), "→", (ws.at(-1).endMs / 1000).toFixed(2), "|", ws.map((w) => `${w.text}@${(w.startMs / 1000).toFixed(2)}`).join(" "));
}
