// Type layer: step chips (progress bar), step titles (kinetic type above the phone),
// the lock-in equation, word-synced captions and the CTA end card.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Rise, breathe, useLife } from "./kit";
import { clamp, theme } from "./theme";
import { FPS, type Word } from "./timeline";

const c = theme.colors;
const display = (size: number, color: string = c.ink): React.CSSProperties => ({
  fontFamily: theme.fonts.display, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.03em", color,
});

// Five chips; the current step lights (ink, not accent: accent stays free for the hero).
export const Chips: React.FC<{ from: number; to: number; steps: number[] }> = ({ from, to, steps }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [to, to + 9], [0, 1], { ...clamp, easing: theme.ease.in });
  if (frame < from - 1 || exit >= 1) return null;
  const active = steps.findLastIndex((s) => frame >= s); // -1 before step 1, but chip 1 lights at the chips' entrance
  const on = Math.max(0, active);
  return (
    <div style={{ position: "absolute", top: 262, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22,
      opacity: 1 - exit, transform: `translateY(${-30 * exit}px)` }}>
      {[1, 2, 3, 4, 5].map((n, i) => {
        const p = spring({ frame: frame - from - i * 4, fps, config: theme.spring.snappy });
        const lit = i === on;
        const hit = lit ? spring({ frame: frame - Math.max(from + i * 4, steps[i] ?? from), fps, config: theme.spring.bouncy }) : 1;
        return (
          <div key={n} style={{ width: 74, height: 74, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center",
            background: lit ? c.ink : i < on ? c.surface2 : c.surface, border: `2px solid ${lit ? c.ink : c.line2}`,
            ...display(44, lit ? c.bg : i < on ? c.ink2 : c.ink3), opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [20, 0])}px) scale(${interpolate(p, [0, 1], [0.7, 1]) * (lit ? interpolate(hit, [0, 1], [1.18, 1.06]) : 1)})` }}>
            {n}
          </div>
        );
      })}
    </div>
  );
};

export const StepTitle: React.FC<{ from: number; to: number; n: number; text: string }> = ({ from, to, n, text }) => {
  const { enter, exit, visible, frame } = useLife(from, to, "snappy", 8);
  if (!visible) return null;
  return (
    <div style={{ position: "absolute", top: 362, left: 60, right: 60, display: "flex", justifyContent: "center", gap: 22,
      opacity: interpolate(enter, [0, 0.4], [0, 1], clamp) * (1 - exit),
      transform: `translateY(${interpolate(enter, [0, 1], [40, 0]) - 30 * exit}px) scale(${interpolate(enter, [0, 1], [1.12, 1]) * breathe(frame - from, 0.006, 26)})`,
      filter: `blur(${Math.max(0, (1 - enter) * 8) + 6 * exit}px)` }}>
      <span style={display(80, c.ink3)}>{n} ·</span>
      <span style={display(80)}>{text}</span>
    </div>
  );
};

// §2: "192 × 5 min = 16 h", each term landing on its spoken word.
export const Equation: React.FC<{ to: number; terms: { at: number; text: string; hero?: boolean }[] }> = ({ to, terms }) => (
  <div style={{ position: "absolute", top: 352, left: 40, right: 40, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 26 }}>
    {terms.map((t, i) => (
      <Rise key={i} from={t.at} to={to} y={30} cfg="snappy">
        <span style={{ ...display(96, t.hero ? c.accentInk : c.ink), fontVariantNumeric: "tabular-nums",
          ...(t.hero ? { background: c.accent, borderRadius: 24, padding: "2px 22px", boxShadow: `0 0 50px ${c.glow}` } : {}) }}>
          {t.text}
        </span>
      </Rise>
    ))}
  </div>
);

// Word-synced captions: 2–4 words a page, active word in accent, clear of TikTok's UI.
type Page = { words: Word[]; start: number; end: number };
export const buildPages = (ws: Word[]): Page[] => {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => cur.length && pages.push({ words: cur, start: cur[0].startMs, end: cur.at(-1)!.endMs }) && (cur = []);
  const chars = () => cur.reduce((a, x) => a + x.text.length + 1, 0);
  for (const w of ws) {
    // New page on a new beat, or before a word that would push the page past one line.
    if (cur.length && (cur[0].beat !== w.beat || chars() + w.text.length > 24)) flush();
    cur.push(w);
    if (/[.?]$/.test(w.text) || (/,$/.test(w.text) && cur.length >= 2) || cur.length >= 4) flush();
  }
  flush();
  // A page stays up until the next one starts (no flicker in the gaps).
  pages.forEach((p, i) => (p.end = pages[i + 1] ? pages[i + 1].start : p.end + 400));
  return pages;
};

export const Captions: React.FC<{ pages: Page[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / FPS) * 1000;
  const page = pages.find((p) => ms >= p.start && ms < p.end);
  if (!page) return null;
  const pf = Math.round((page.start / 1000) * FPS);
  const p = spring({ frame: frame - pf, fps, config: theme.spring.snappy });
  const active = page.words.findLast((w) => ms >= w.startMs);
  return (
    <div style={{ position: "absolute", top: 1300, left: 72, right: 150, display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 16, padding: "14px 28px", borderRadius: 26,
        background: "rgba(14,16,18,0.62)", backdropFilter: "blur(14px)", maxWidth: 820,
        opacity: interpolate(p, [0, 0.5], [0, 1], clamp), transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})` }}>
        {page.words.map((w, i) => (
          <span key={i} style={{ fontFamily: theme.fonts.body, fontWeight: 700, fontSize: 64, lineHeight: 1.18,
            color: w === active ? c.accent : c.ink, fontVariantNumeric: "tabular-nums" }}>{w.text}</span>
        ))}
      </div>
    </div>
  );
};

// CTA end card: launch date, URL letter by letter, the −10 % badge springs in last.
export const EndCard: React.FC<{ from: number; urlAt: number; badgeAt: number; bioAt: number; to: number }> = ({ from, urlAt, badgeAt, bioAt, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from - 1) return null;
  const url = "stredninamiru.cz";
  const badge = spring({ frame: frame - badgeAt, fps, config: theme.spring.bouncy });
  const idle = breathe(frame - from, 0.01, 24);
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", top: 400, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Rise from={from}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 48, color: c.ink2 }}>Spouštíme</div>
        </Rise>
        <Rise from={from + 5}><div style={{ ...display(120), marginTop: 6 }}>1. listopadu</div></Rise>
      </div>
      <div style={{ position: "absolute", top: 650, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${idle})` }}>
        <div style={{ ...display(190, c.accentInk), background: c.accent, borderRadius: 44, padding: "6px 40px 10px",
          opacity: interpolate(badge, [0, 0.3], [0, 1], clamp), transform: `scale(${interpolate(badge, [0, 1], [0.5, 1])}) rotate(${interpolate(badge, [0, 1], [-6, -2])}deg)`,
          boxShadow: badge > 0.9 ? `0 0 70px ${c.glow}, 0 0 140px rgba(127,168,230,0.2)` : undefined, fontVariantNumeric: "tabular-nums" }}>
          −10 %
        </div>
        <Rise from={badgeAt + 6} y={24}><div style={{ ...display(72), marginTop: 22 }}>za waitlist</div></Rise>
      </div>
      <div style={{ position: "absolute", top: 1030, display: "flex", ...display(108) }}>
        {url.split("").map((ch, i) => {
          const p = spring({ frame: frame - urlAt - i * 1.5, fps, config: theme.spring.snappy });
          return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)` }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", top: 1166 }}>
        <Rise from={bioAt} y={20}><div style={{ fontFamily: theme.fonts.body, fontWeight: 500, fontSize: 46, color: c.ink3 }}>odkaz v biu</div></Rise>
      </div>
    </AbsoluteFill>
  );
};
