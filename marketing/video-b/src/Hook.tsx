// §1: the Triple Hook. 192 school tiles (= the math) cascade in, the counter counts
// them at 5 min each, "Ušetři přes" slams in, then the tiles implode into the phone.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { breathe } from "./kit";
import { clamp, theme } from "./theme";

const c = theme.colors;
const COLS = 12, ROWS = 16, CW = 90, CH = 120;
export const TILES = COLS * ROWS; // 192 = the live catalogue count on 29 Oct 2026
const STAGGER = 0.2;
const T0 = 2;

// Cascade from the edges inwards: the grid is visible from frame 0 (the centre sits
// behind the text panel) and closes in on the text before the implode.
const order = Array.from({ length: TILES }, (_, i) => i)
  .map((i) => ({ i, d: Math.hypot((i % COLS) - (COLS - 1) / 2, (Math.floor(i / COLS) - (ROWS - 1) / 2) * 1.2) }))
  .sort((a, b) => b.d - a.d)
  .reduce<number[]>((acc, { i }, rank) => ((acc[i] = rank), acc), []);

export const tilesShown = (frame: number) => Math.max(0, Math.min(TILES, Math.floor((frame - T0) / STAGGER) + 1));
export const hoursShown = (frame: number) => Math.min(15, Math.floor((tilesShown(frame) * 5) / 60));

const Tile: React.FC = () => (
  <div style={{ width: 70, height: 98, borderRadius: 14, background: c.surface2, border: `1px solid ${c.line2}`,
    padding: 9, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 7 }}>
    <div style={{ height: 9, borderRadius: 5, background: c.line2 }} />
    <div style={{ height: 6, width: "78%", borderRadius: 3, background: c.line }} />
    <div style={{ height: 6, width: "56%", borderRadius: 3, background: c.line }} />
    <div style={{ flex: 1, borderRadius: 6, background: c.line, opacity: 0.6 }} />
  </div>
);

// mode "hook": cascade in, implode at `implodeAt`. mode "echo": fade back in from the centre (loop).
export const Tiles: React.FC<{ implodeAt?: number; echoFrom?: number }> = ({ implodeAt = Infinity, echoFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const implode = Number.isFinite(implodeAt) ? interpolate(frame, [implodeAt, implodeAt + 11], [0, 1], { ...clamp, easing: theme.ease.in }) : 0;
  if (implode >= 1 && echoFrom === undefined) return null;
  return (
    <AbsoluteFill>
      {Array.from({ length: TILES }, (_, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const x = col * CW + 10, y = row * CH + 11;
        let o: number, s: number, dx = 0, dy = 0, blur = 0;
        if (echoFrom !== undefined) {
          const p = spring({ frame: frame - echoFrom - order[i] * 0.12, fps, config: theme.spring.smooth });
          o = p * 0.32; s = interpolate(p, [0, 1], [0.7, 1]);
        } else {
          const p = spring({ frame: frame - T0 - order[i] * STAGGER, fps, config: theme.spring.snappy });
          o = interpolate(p, [0, 0.5], [0, 1], clamp) * 0.9;
          s = interpolate(p, [0, 1], [0.6, 1]) * (1 - 0.8 * implode);
          dy = interpolate(p, [0, 1], [24, 0]);
          // Implode: every tile rushes to the centre, blurred by its own speed.
          const cx = 540 - (x + 35), cy = 960 - (y + 49);
          dx = cx * implode; dy += cy * implode;
          blur = Math.sin(Math.PI * implode) * 10;
          o *= 1 - interpolate(implode, [0.55, 1], [0, 1], clamp);
        }
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, opacity: o,
            transform: `translate(${dx}px, ${dy}px) scale(${s})`, filter: blur ? `blur(${blur}px)` : undefined }}>
            <Tile />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const HookText: React.FC<{ exitAt: number }> = ({ exitAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [exitAt, exitAt + 8], [0, 1], { ...clamp, easing: theme.ease.in });
  if (exit >= 1) return null;

  const panel = spring({ frame, fps, config: theme.spring.smooth });
  const hodin = spring({ frame: frame - 6, fps, config: theme.spring.snappy });
  const slam = spring({ frame: frame - 30, fps, config: theme.spring.bouncy });
  const slamV = Math.abs(spring({ frame: frame - 29, fps, config: theme.spring.bouncy }) - slam); // velocity proxy for blur
  const pill = interpolate(frame, [36, 46], [0, 1], { ...clamp, easing: theme.ease.out });
  const count = spring({ frame: frame - 2, fps, config: theme.spring.counter, durationInFrames: 38 });
  const hold = frame > 56 ? breathe(frame - 56) : 1;
  const sub = "(výběr střední školy)".split(" ");

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - exit,
      transform: `scale(${hold * (1 + 0.18 * exit)})`, filter: exit ? `blur(${12 * exit}px)` : undefined }}>
      <div style={{ position: "relative", padding: "56px 64px 60px", borderRadius: 48, background: c.frost,
        backdropFilter: "blur(18px)", border: `1px solid ${c.line2}`, opacity: panel,
        transform: `translateY(${interpolate(panel, [0, 1], [30, 0])}px)`,
        boxShadow: `0 40px 90px -30px ${c.shade(0.8)}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: theme.fonts.display, fontWeight: 700, fontSize: 176, lineHeight: 1, letterSpacing: "-0.03em",
          color: c.ink, opacity: interpolate(slam, [0, 0.4], [0, 1], clamp),
          transform: `translateY(${interpolate(slam, [0, 1], [-30, 0])}px) scale(${interpolate(slam, [0, 1], [1.25, 1])})`,
          filter: `blur(${Math.min(8, slamV * 40)}px)` }}>
          Ušetři přes
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 30, marginTop: 6 }}>
          <div style={{ position: "relative", padding: "0 22px" }}>
            <div style={{ position: "absolute", inset: "14px 0 6px", borderRadius: 30, background: c.accent,
              transform: `scaleX(${pill})`, transformOrigin: "left center",
              boxShadow: pill > 0.99 ? `0 0 60px ${c.glow}, 0 0 120px rgba(127,168,230,0.22)` : undefined }} />
            <span style={{ position: "relative", fontFamily: theme.fonts.display, fontWeight: 700, fontSize: 200, lineHeight: 1,
              letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: pill > 0.5 ? c.accentInk : c.ink,
              display: "inline-block", transform: `scale(${interpolate(count, [0, 1], [0.9, 1])})` }}>
              {hoursShown(frame)}
            </span>
          </div>
          <span style={{ fontFamily: theme.fonts.display, fontWeight: 700, fontSize: 200, lineHeight: 1, letterSpacing: "-0.03em",
            color: c.ink, opacity: hodin, display: "inline-block",
            transform: `translateX(${interpolate(hodin, [0, 1], [60, 0])}px)`, filter: `blur(${interpolate(hodin, [0, 1], [6, 0])}px)` }}>
            hodin
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 26, fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 54, color: c.ink2 }}>
          {sub.map((w, i) => {
            const p = spring({ frame: frame - 44 - i * 3, fps, config: theme.spring.snappy });
            return <span key={i} style={{ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)` }}>{w}</span>;
          })}
        </div>
      </div>
      <MathLabel />
    </AbsoluteFill>
  );
};

// "192 škol × 5 min": proof inside the visual hook (not part of the 2-line text hook).
const MathLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [40, 56], [0, 1], { ...clamp, easing: theme.ease.out });
  return (
    <div style={{ position: "absolute", top: 1330, padding: "12px 26px", borderRadius: 999, background: c.frost,
      backdropFilter: "blur(12px)", border: `1px solid ${c.line}`, fontFamily: theme.fonts.body, fontWeight: 500,
      fontSize: 34, color: c.ink3, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)` }}>
      192 škol × 5 min
    </div>
  );
};
