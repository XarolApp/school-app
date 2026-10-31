// Every cue is derived from the voiceover's word timings (src/captions.json), so
// beats follow the real VO (brief §3: "beats follow the VO"). Times are frames @30 fps.
import captions from "./captions.json";
import rects from "../public/shots/rects.json";

export const FPS = 30;
export type Word = { text: string; beat: string; startMs: number; endMs: number };
export const words = captions as Word[];
const f = (ms: number) => Math.round((ms / 1000) * FPS);

// Frame where `text` (nth occurrence inside `beat`) starts being spoken.
export const cue = (beat: string, text: string, nth = 0, edge: "start" | "end" = "start") => {
  const hits = words.filter((w) => w.beat === beat && w.text.replace(/[.,?]+$/, "") === text);
  if (!hits[nth]) throw new Error(`cue not found: ${beat} "${text}" #${nth}`);
  return f(edge === "start" ? hits[nth].startMs : hits[nth].endMs);
};
export const beatStart = (beat: string) => f(words.find((w) => w.beat === beat)!.startMs);

export const VO_END = f(words.at(-1)!.endMs);
export const DURATION = VO_END + 38; // end card holds ~1.3 s after the last word

export const B = {
  L: beatStart("L"),
  s1: beatStart("1"),
  s2: beatStart("2"),
  s3: beatStart("3"),
  s4: beatStart("4"),
  s5: beatStart("5"),
  CTA: beatStart("CTA"),
};

// Tap targets recorded during capture, in CSS px of the 390×844 viewport.
export type Rect = { x: number; y: number; w: number; h: number };
export const R = rects as Record<string, Rect>;
