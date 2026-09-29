import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

const c = theme.colors;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// --- Layer 1: background. Enamel-grey paper with two slow trail-blue washes.
export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 60;
  const d2 = Math.cos(frame / 70) * 50;
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <div style={{ position: "absolute", width: 1400, height: 1400, borderRadius: "50%", top: -620, left: -520 + d1,
        filter: "blur(60px)", background: `radial-gradient(circle, ${c.primarySoft}, transparent 64%)` }} />
      <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: "50%", bottom: -560, right: -520 - d2,
        filter: "blur(70px)", background: `radial-gradient(circle, rgba(143,176,218,0.30), transparent 66%)` }} />
    </AbsoluteFill>
  );
};

// --- Layers 4–5: grade, grain, vignette. Ink-tinted, never pure black.
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: c.primary, mixBlendMode: "soft-light", opacity: 0.08 }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.shade(0.05)}, transparent 25%, transparent 75%, ${c.shade(0.08)})` }} />
      <AbsoluteFill style={{ backgroundImage: noise, backgroundSize: "220px", opacity: 0.045, mixBlendMode: "multiply",
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 58%, ${c.shade(0.14)} 100%)` }} />
    </>
  );
};

// Fade + rise + scale. The workhorse entrance.
export const Entrance: React.FC<{ delay?: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  delay = 0, y = 50, style, children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.smooth });
  return (
    <div style={{ opacity: interpolate(p, [0, 0.6], [0, 1], clamp),
      transform: `translateY(${interpolate(p, [0, 1], [y, 0])}px) scale(${interpolate(p, [0, 1], [0.95, 1])})`, ...style }}>
      {children}
    </div>
  );
};

// Word-by-word headline. Pixel gap on purpose (em would resolve against the parent).
export const WordReveal: React.FC<{ text: string; delay?: number; per?: number; size: number; color?: string;
  weight?: number; font?: string; highlight?: string; highlightColor?: string }> = ({
  text, delay = 0, per = 3, size, color = c.ink, weight = 600, font = theme.fonts.display, highlight, highlightColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: size * 0.24, rowGap: 0, fontFamily: font, fontSize: size,
      fontWeight: weight, lineHeight: 1.06, letterSpacing: "-0.02em", color }}>
      {text.split(" ").map((word, i) => {
        const p = spring({ frame: frame - delay - i * per, fps, config: theme.spring.snappy });
        return (
          <span key={i} style={{ display: "inline-block", opacity: interpolate(p, [0, 0.5], [0, 1], clamp),
            transform: `translateY(${interpolate(p, [0, 1], [size * 0.4, 0])}px)`,
            color: word === highlight ? highlightColor : undefined, fontVariantNumeric: "tabular-nums" }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Scene wrapper: content lives in the TikTok safe box; exit is ~10 frames, faster than entrances.
export const Scene: React.FC<{ exitAt?: number; children: React.ReactNode }> = ({ exitAt, children }) => {
  const frame = useCurrentFrame();
  const t = (easing: (n: number) => number) =>
    exitAt === undefined ? 0 : interpolate(frame, [exitAt, exitAt + 10], [0, 1], { ...clamp, easing });
  // Opacity clears early (ease-out) so the next scene never lands on top of this text; movement accelerates away (ease-in).
  const o = t(theme.ease.out);
  const e = t(theme.ease.in);
  const s = theme.safe;
  return (
    <AbsoluteFill style={{ padding: `${s.top}px ${s.right}px ${s.bottom}px ${s.left}px`, opacity: 1 - o,
      transform: `translateY(${-70 * e}px) scale(${1 - 0.04 * e})`, filter: `blur(${8 * e}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

export const LabelCaps: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = c.ink3 }) => (
  <div style={{ fontFamily: theme.fonts.body, fontSize: 30, fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color }}>{children}</div>
);

// SFX lands 2–3 frames before the visual it belongs to (callers pass that frame).
export const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.6 }) => (
  <Sequence from={Math.max(0, at)} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

export const breathe = (frame: number, amp = 4, speed = 30) => Math.sin(frame / speed) * amp;
