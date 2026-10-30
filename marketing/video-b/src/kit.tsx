import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "./theme";

const c = theme.colors;

// Layer 1: dark stage with two slow accent washes.
export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 60;
  const d2 = Math.cos(frame / 70) * 50;
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <div style={{ position: "absolute", width: 1400, height: 1400, borderRadius: "50%", top: -640, left: -560 + d1,
        filter: "blur(70px)", background: `radial-gradient(circle, ${c.accentSoft}, transparent 64%)` }} />
      <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: "50%", bottom: -560, right: -520 - d2,
        filter: "blur(80px)", background: `radial-gradient(circle, rgba(63,95,140,0.28), transparent 66%)` }} />
    </AbsoluteFill>
  );
};

// Layers 4–5: grade, grain (overlay on dark), vignette. Ink-tinted, never pure black.
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: c.accent, mixBlendMode: "soft-light", opacity: 0.12 }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.shade(0.18)}, transparent 22%, transparent 78%, ${c.shade(0.26)})` }} />
      <AbsoluteFill style={{ backgroundImage: noise, backgroundSize: "220px", opacity: 0.06, mixBlendMode: "overlay",
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 56%, ${c.shade(0.42)} 100%)` }} />
    </AbsoluteFill>
  );
};

// 0 → 1 entrance progress and 0 → 1 exit progress for an element living [from, to).
export const useLife = (from: number, to = Infinity, cfg: keyof typeof theme.spring = "smooth", exitLen = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - from, fps, config: theme.spring[cfg] });
  const exit = Number.isFinite(to) ? interpolate(frame, [to - exitLen, to], [0, 1], { ...clamp, easing: theme.ease.in }) : 0;
  return { enter, exit, frame, visible: frame >= from - 1 && frame < to };
};

// Fade + rise + scale in, faster rise-and-blur out.
export const Rise: React.FC<{ from: number; to?: number; y?: number; cfg?: keyof typeof theme.spring;
  style?: React.CSSProperties; children: React.ReactNode }> = ({ from, to, y = 40, cfg = "smooth", style, children }) => {
  const { enter, exit, visible } = useLife(from, to, cfg);
  if (!visible) return null;
  return (
    <div style={{ opacity: interpolate(enter, [0, 0.6], [0, 1], clamp) * (1 - exit),
      transform: `translateY(${interpolate(enter, [0, 1], [y, 0]) - 34 * exit}px) scale(${interpolate(enter, [0, 1], [0.95, 1])})`,
      filter: exit ? `blur(${6 * exit}px)` : undefined, ...style }}>
      {children}
    </div>
  );
};

// SFX lands 2–3 frames before the visual it belongs to (callers pass the visual's frame).
export const Sfx: React.FC<{ at: number; name: "tick" | "pop" | "thump" | "pad"; volume?: number }> = ({ at, name, volume = 0.5 }) => (
  <Sequence from={Math.max(0, at - 3)} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

export const breathe = (frame: number, amp = 0.015, speed = 22) => 1 + Math.sin(frame / speed) * amp;
