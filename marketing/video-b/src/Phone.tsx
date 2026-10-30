// The phone: a generic drawn frame showing real @3x captures of the app (brief §4).
// Screen changes wipe behind an accent bar; state changes inside one screen cut
// (that's how the app itself reacts). Taps draw a ring where the capture tapped.
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "./theme";
import type { Rect } from "./timeline";

const c = theme.colors;
const { K, bezel, top } = theme.phone;
export const SCREEN = { w: 390 * K, h: 844 * K };
export const PHONE = { w: SCREEN.w + bezel * 2, h: SCREEN.h + bezel * 2, left: (1080 - (SCREEN.w + bezel * 2)) / 2, top };

export type Shot = {
  at: number;
  src: string; // under public/shots/
  cut?: boolean; // same screen, new state: hard cut instead of a wipe
  pan?: { from: number; to: number; y0: number; y1: number }; // scroll a full-page capture (CSS px)
  y?: number; // fixed scroll of a full-page capture
  seq?: { from: number; to: number; count: number }; // frame-sequence capture (shots/pan/NN.jpg)
};
export type Tap = { at: number; r: Rect; dy?: number; burst?: boolean };
export type Zoom = { from: number; to: number; scale: number; x: number; y: number };

const WIPE = 9;

const ShotView: React.FC<{ s: Shot }> = ({ s }) => {
  const frame = useCurrentFrame();
  if (s.seq) {
    const t = interpolate(frame, [s.seq.from, s.seq.to], [0, 1], { ...clamp, easing: theme.ease.inOut });
    const n = Math.round(t * (s.seq.count - 1));
    return <Img src={staticFile(`shots/pan/${String(n).padStart(2, "0")}.jpg`)} style={{ width: SCREEN.w, height: SCREEN.h, display: "block" }} />;
  }
  const y = s.pan ? interpolate(frame, [s.pan.from, s.pan.to], [s.pan.y0, s.pan.y1], { ...clamp, easing: theme.ease.inOut }) : s.y ?? 0;
  return <Img src={staticFile(`shots/${s.src}`)} style={{ width: SCREEN.w, display: "block", transform: `translateY(${-y * K}px)` }} />;
};

const Screen: React.FC<{ shots: Shot[] }> = ({ shots }) => {
  const frame = useCurrentFrame();
  const idx = shots.findLastIndex((s) => frame >= s.at);
  if (idx < 0) return null;
  const cur = shots[idx];
  const prev = shots[idx - 1];
  const p = interpolate(frame, [cur.at, cur.at + WIPE], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const wiping = prev && !cur.cut && p < 1;
  return (
    <AbsoluteFill style={{ background: "#F5F6F7" }}>
      {wiping && <AbsoluteFill><ShotView s={prev} /></AbsoluteFill>}
      <AbsoluteFill style={{ clipPath: wiping ? `inset(0 0 ${(1 - p) * 100}% 0)` : undefined }}>
        <ShotView s={cur} />
      </AbsoluteFill>
      {wiping && (
        <div style={{ position: "absolute", left: 0, right: 0, top: `${p * 100}%`, height: 26, marginTop: -13,
          background: c.accent, boxShadow: `0 0 40px ${c.glow}` }} />
      )}
    </AbsoluteFill>
  );
};

const TapRing: React.FC<{ t: Tap }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - t.at;
  if (f < -4 || f > 22) return null;
  const press = interpolate(f, [-4, 0, 6], [0, 1, 0], { ...clamp, easing: theme.ease.inOut });
  const ring = spring({ frame: f, fps, config: theme.spring.snappy });
  const x = t.r.x * K, y = (t.r.y + (t.dy ?? 0)) * K;
  return (
    <>
      <div style={{ position: "absolute", left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: "50%",
        background: "rgba(21,25,30,0.22)", transform: `scale(${0.6 + 0.4 * press})`, opacity: press }} />
      <div style={{ position: "absolute", left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: "50%",
        border: "4px solid rgba(21,25,30,0.55)", transform: `scale(${0.7 + ring * 1.1})`,
        opacity: interpolate(f, [0, 4, 20], [0, 0.9, 0], { ...clamp, easing: theme.ease.out }) }} />
      {t.burst && <Burst x={x} y={y} f={f} />}
    </>
  );
};

// The one hero-coloured accent on a save: 8 short rays.
const Burst: React.FC<{ x: number; y: number; f: number }> = ({ x, y, f }) => {
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - 1, fps, config: theme.spring.snappy });
  const o = interpolate(f, [1, 4, 16], [0, 1, 0], { ...clamp, easing: theme.ease.out });
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: x - 3, top: y - 3, width: 6, height: 22 * p, borderRadius: 6,
          background: c.accent, opacity: o, transformOrigin: "3px 3px",
          transform: `rotate(${i * 45}deg) translateY(${26 + 18 * p}px)` }} />
      ))}
    </>
  );
};

export const Phone: React.FC<{ shots: Shot[]; taps: Tap[]; zooms: Zoom[]; enterAt: number; exitAt: number }> = ({
  shots, taps, zooms, enterAt, exitAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < enterAt - 1 || frame > exitAt + 12) return null;
  // Enters as the tiles implode: scale-through from the centre.
  const enter = spring({ frame: frame - enterAt, fps, config: theme.spring.smooth });
  const exit = interpolate(frame, [exitAt, exitAt + 11], [0, 1], { ...clamp, easing: theme.ease.in });
  const float = Math.sin(frame / 34) * 5;

  // Push into the screen toward a CSS-px focus point (the phone itself stays put, so
  // the chips and titles above it never collide with it). Eases in, holds, eases out.
  let scale = 1, ox = 0, oy = 0;
  for (const z of zooms) {
    const zin = interpolate(frame, [z.from, z.from + 12], [0, 1], { ...clamp, easing: theme.ease.inOut });
    const zout = interpolate(frame, [z.to - 10, z.to], [0, 1], { ...clamp, easing: theme.ease.inOut });
    const k = frame >= z.from && frame <= z.to ? zin * (1 - zout) : 0;
    if (k > 0) { scale = 1 + (z.scale - 1) * k; ox = z.x * K; oy = z.y * K; }
  }

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: PHONE.left, top: PHONE.top, width: PHONE.w, height: PHONE.h,
        opacity: interpolate(enter, [0, 0.4], [0, 1], clamp) * (1 - exit),
        transform: `translateY(${float + 260 * exit}px) scale(${interpolate(enter, [0, 1], [0.55, 1])})`,
        filter: enter < 0.85 ? `blur(${(1 - enter) * 10}px)` : undefined }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 74, background: "#0B0C0E",
          border: `2px solid ${c.line2}`, boxShadow: `0 60px 120px -40px ${c.shade(0.9)}, 0 0 0 1px rgba(255,255,255,0.04) inset` }} />
        <div style={{ position: "absolute", left: bezel, top: bezel, width: SCREEN.w, height: SCREEN.h, borderRadius: 60,
          overflow: "hidden" }}>
          <AbsoluteFill style={{ transformOrigin: `${ox}px ${oy}px`, transform: `scale(${scale})` }}>
            <Screen shots={shots} />
            {taps.map((t, i) => <TapRing key={i} t={t} />)}
          </AbsoluteFill>
        </div>
      </div>
    </AbsoluteFill>
  );
};
