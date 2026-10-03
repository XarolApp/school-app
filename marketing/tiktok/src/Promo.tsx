import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { BgMesh, Entrance, Finish, LabelCaps, Scene, Sfx, WordReveal, breathe } from "./components";

const c = theme.colors;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Copy follows the landing page (frontend/src/pages/Home.jsx), student voice (tykání).
// No invented user counts or testimonials; the school/match shown is labelled as an illustration.

// ---------- Scene 1 — hook: tab chaos -------------------------------------------------
const TABS = [
  "Kam na střední? – diskuze",
  "Přijímačky 2027: body",
  "Den otevřených dveří",
  "Gymnázium – obory",
  "Hranice přijetí loni?",
  "Mapa škol Praha",
  "Recenze školy…",
];

const TabCard: React.FC<{ i: number; title: string }> = ({ i, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 6 - i * 4, fps, config: theme.spring.snappy });
  const rot = [-4, 3, -2, 5, -3, 2, -1][i];
  const x = [0, 60, -20, 90, 20, 70, 10][i];
  return (
    <div style={{ position: "absolute", top: i * 62, left: x, width: 720, borderRadius: 30, background: c.bg,
      border: `2px solid ${c.line2}`, boxShadow: theme.shadow, overflow: "hidden",
      opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
      transform: `translateY(${interpolate(p, [0, 1], [500, breathe(frame + i * 9, 3)])}px) rotate(${interpolate(p, [0, 1], [rot * 3, rot])}deg) scale(${interpolate(p, [0, 1], [0.85, 1])})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", background: c.surface2 }}>
        {[0, 1, 2].map((d) => <div key={d} style={{ width: 16, height: 16, borderRadius: 8, background: c.line2 }} />)}
        <div style={{ marginLeft: 14, padding: "8px 20px", borderRadius: 14, background: c.bg, fontFamily: theme.fonts.body,
          fontSize: 28, fontWeight: 500, color: c.ink2, whiteSpace: "nowrap" }}>{title}</div>
      </div>
      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ height: 16, width: "78%", borderRadius: 8, background: c.line }} />
        <div style={{ height: 16, width: "54%", borderRadius: 8, background: c.line }} />
      </div>
    </div>
  );
};

const Hook: React.FC = () => (
  <Scene exitAt={72}>
    <Entrance delay={0} y={24}><LabelCaps>Výběr střední školy · Praha</LabelCaps></Entrance>
    <div style={{ marginTop: 28 }}>
      <WordReveal text="Třicet otevřených záložek" size={132} delay={2} per={4} />
    </div>
    <div style={{ position: "relative", marginTop: 56, height: 560 }}>
      {TABS.map((t, i) => <TabCard key={t} i={i} title={t} />)}
    </div>
    <div style={{ marginTop: 40 }}>
      <WordReveal text="a pořád nevíš." size={96} weight={500} color={c.ink2} delay={40} per={4} />
    </div>
  </Scene>
);

// ---------- Scene 2 — one place: search ----------------------------------------------
const QUERY = "gympl";
const ROWS = [
  { name: "Gymnázium", where: "Praha 6", tags: ["4leté", "8leté"], fill: 0.62 },
  { name: "Gymnázium a jazyková škola", where: "Praha 2", tags: ["4leté", "jazyky"], fill: 0.41 },
  { name: "Sportovní gymnázium", where: "Praha 10", tags: ["4leté", "sport"], fill: 0.78 },
];

const SearchField: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = QUERY.slice(0, Math.max(0, Math.floor((frame - 16) / 3)));
  const caret = Math.floor(frame / 8) % 2 === 0 ? 1 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, height: 124, padding: "0 36px", borderRadius: 30,
      background: c.bg, border: `4px solid ${c.primary}`, boxShadow: `0 0 0 10px ${c.primarySoft}, ${theme.shadow}` }}>
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={c.ink3} strokeWidth="2.4" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
      </svg>
      <div style={{ fontFamily: theme.fonts.body, fontSize: 52, fontWeight: 500, color: c.ink }}>
        {typed}<span style={{ opacity: caret, color: c.primary, fontWeight: 400 }}>|</span>
      </div>
    </div>
  );
};

const ResultRow: React.FC<{ i: number; row: (typeof ROWS)[number] }> = ({ i, row }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = spring({ frame: frame - 44 - i * 5, fps, config: theme.spring.smooth });
  return (
    <Entrance delay={34 + i * 5} y={60}>
      <div style={{ padding: "30px 34px", borderRadius: theme.radius.card, background: c.surface2,
        transform: `translateY(${breathe(frame + i * 12, 2)}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
          <div style={{ fontFamily: theme.fonts.display, fontSize: 54, fontWeight: 600, color: c.ink, lineHeight: 1.1 }}>{row.name}</div>
          <div style={{ fontFamily: theme.fonts.body, fontSize: 30, color: c.ink3, whiteSpace: "nowrap" }}>{row.where}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          {row.tags.map((t) => (
            <div key={t} style={{ padding: "8px 18px", borderRadius: theme.radius.chip, background: c.bg,
              fontFamily: theme.fonts.body, fontSize: 28, fontWeight: 500, color: c.ink2 }}>{t}</div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: theme.fonts.body, fontSize: 26, color: c.ink3 }}>Přijato</div>
            <div style={{ width: 170, height: 14, borderRadius: 7, background: c.track, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${row.fill * 100 * bar}%`, background: c.ink2, borderRadius: 7 }} />
            </div>
          </div>
        </div>
      </div>
    </Entrance>
  );
};

const OnePlace: React.FC = () => (
  <Scene exitAt={76}>
    <WordReveal text="Všech 223 pražských škol na jednom místě." size={112} delay={3} per={3} />
    <div style={{ marginTop: 56 }}>
      <Entrance delay={8}><SearchField /></Entrance>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 34 }}>
      {ROWS.map((r, i) => <ResultRow key={r.name} i={i} row={r} />)}
    </div>
  </Scene>
);

// ---------- Scene 3 — quiz answer → fitting school -----------------------------------
const OPTIONS = ["Jazyky", "Matika a IT", "Biologie a chemie", "Umění a design"];
const PICK = 1;
const PICK_AT = 30;
const CARD_AT = 42;

const Option: React.FC<{ i: number; label: string }> = ({ i, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sel = i === PICK ? spring({ frame: frame - PICK_AT, fps, config: theme.spring.firm }) : 0;
  return (
    <Entrance delay={10 + i * 4} y={40}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 26, height: 108, padding: "0 32px",
        borderRadius: theme.radius.option, background: c.bg, border: `3px solid ${c.line}`,
        transform: `scale(${1 + 0.03 * Math.sin(Math.PI * sel)})` }}>
        {/* Selected state crossfades in over the resting one. */}
        <div style={{ position: "absolute", inset: -3, borderRadius: theme.radius.option, background: c.primarySoft,
          border: `3px solid ${c.primary}`, opacity: sel }} />
        <div style={{ position: "relative", width: 48, height: 48, borderRadius: 14, border: `3px solid ${c.line2}`,
          background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: -3, borderRadius: 14, background: c.primary, opacity: sel }} />
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.primaryInk} strokeWidth="3.4"
            strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", opacity: sel, transform: `scale(${sel})` }}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div style={{ position: "relative", fontFamily: theme.fonts.body, fontSize: 44, fontWeight: 500, color: c.ink }}>{label}</div>
      </div>
    </Entrance>
  );
};

const MatchCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - CARD_AT, fps, config: theme.spring.smooth });
  const badge = spring({ frame: frame - CARD_AT - 8, fps, config: theme.spring.firm });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, padding: "40px 42px", borderRadius: theme.radius.card,
      background: c.bg, border: `2px solid ${c.line}`, boxShadow: theme.shadow,
      opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
      transform: `translateY(${interpolate(p, [0, 1], [420, breathe(frame, 3)])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <LabelCaps>Podle tvých odpovědí</LabelCaps>
        {/* ≥85 % = solid match badge (DESIGN.md → match strength). Static number: no count-up. */}
        <div style={{ padding: "12px 26px", borderRadius: theme.radius.pill, background: c.match, color: c.matchInk,
          fontFamily: theme.fonts.body, fontSize: 40, fontWeight: 600, fontVariantNumeric: "tabular-nums",
          opacity: badge, transform: `scale(${interpolate(badge, [0, 1], [0.6, 1])})` }}>shoda 88 %</div>
      </div>
      <div style={{ marginTop: 22, fontFamily: theme.fonts.display, fontSize: 76, fontWeight: 600, color: c.ink, lineHeight: 1.08 }}>
        Střední průmyslová škola
      </div>
      <div style={{ marginTop: 8, fontFamily: theme.fonts.body, fontSize: 34, color: c.ink3 }}>Praha 9 · Informační technologie</div>
      <div style={{ marginTop: 26, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {["obor", "dojezd", "přijímačky"].map((t, i) => (
          <Entrance key={t} delay={CARD_AT + 14 + i * 4} y={20}>
            <div style={{ padding: "10px 22px", borderRadius: theme.radius.chip, background: c.surface2,
              fontFamily: theme.fonts.body, fontSize: 30, fontWeight: 500, color: c.ink2 }}>✓ {t}</div>
          </Entrance>
        ))}
      </div>
      <div style={{ marginTop: 22, fontFamily: theme.fonts.body, fontSize: 24, color: c.ink3 }}>Ilustrační ukázka</div>
    </div>
  );
};

const Quiz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const back = spring({ frame: frame - CARD_AT, fps, config: theme.spring.smooth });
  return (
    <Scene exitAt={78}>
      <WordReveal text="Odpověz na pár otázek." size={112} delay={3} per={3} />
      <div style={{ position: "relative", marginTop: 48 }}>
        <div style={{ opacity: interpolate(back, [0, 1], [1, 0.4]), filter: `blur(${2 * back}px)`,
          transform: `scale(${interpolate(back, [0, 1], [1, 0.94])}) translateY(${-30 * back}px)`, transformOrigin: "50% 0%" }}>
          <Entrance delay={6} y={30}>
            <div style={{ fontFamily: theme.fonts.display, fontSize: 60, fontWeight: 600, color: c.ink2, marginBottom: 26 }}>
              Co tě baví nejvíc?
            </div>
          </Entrance>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {OPTIONS.map((o, i) => <Option key={o} i={i} label={o} />)}
          </div>
        </div>
        <MatchCard />
      </div>
    </Scene>
  );
};

// ---------- Scene 4 — CTA ------------------------------------------------------------
// Logo mark: the white–blue–white tourist-trail stripe (DESIGN.md → Colors).
const TrailMark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size * 0.72, borderRadius: size * 0.16, overflow: "hidden",
    border: `3px solid ${c.line2}`, display: "flex", flexDirection: "column", boxShadow: theme.shadow }}>
    <div style={{ flex: 1, background: c.bg }} />
    <div style={{ flex: 1, background: c.primary }} />
    <div style={{ flex: 1, background: c.bg }} />
  </div>
);

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 2, fps, config: theme.spring.firm });
  const btn = spring({ frame: frame - 22, fps, config: theme.spring.smooth });
  const glow = 0.75 + 0.25 * Math.sin(frame / 9);
  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <div style={{ opacity: mark, transform: `scale(${interpolate(mark, [0, 1], [0.5, 1])}) rotate(${interpolate(mark, [0, 1], [-12, 0])}deg)` }}>
            <TrailMark size={130} />
          </div>
          <WordReveal text="Střední na míru" size={150} weight={700} delay={6} />
        </div>
        <div style={{ marginTop: 50 }}>
          <WordReveal text="Najdi střední školu, která ti opravdu sedí." size={84} weight={500} color={c.ink2} delay={12} per={3} />
        </div>
        <div style={{ marginTop: 70, alignSelf: "flex-start", opacity: interpolate(btn, [0, 0.5], [0, 1], clamp),
          transform: `translateY(${interpolate(btn, [0, 1], [60, 0])}px) scale(${interpolate(btn, [0, 1], [0.9, 1 + 0.012 * Math.sin(frame / 9)])})` }}>
          <div style={{ padding: "36px 60px", borderRadius: theme.radius.button, background: c.primary, color: c.primaryInk,
            fontFamily: theme.fonts.body, fontSize: 60, fontWeight: 600,
            boxShadow: `0 0 ${70 * glow}px ${c.glow}, 0 30px 60px -30px ${c.shade(0.35)}` }}>
            stredninamiru.cz
          </div>
        </div>
        <Entrance delay={30} y={24} style={{ marginTop: 34 }}>
          <div style={{ fontFamily: theme.fonts.body, fontSize: 38, color: c.ink3 }}>Bez registrace · asi 4 minuty</div>
        </Entrance>
      </div>
    </Scene>
  );
};

// ---------- Timeline -----------------------------------------------------------------
// Each scene overlaps the next by ~6 frames: the outgoing one exits while the new one lands.
const S = { hook: 0, place: 80, quiz: 164, cta: 250 };

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: c.bg }}>
    <BgMesh />
    <Sequence from={S.hook} durationInFrames={90}><Hook /></Sequence>
    <Sequence from={S.place} durationInFrames={94}><OnePlace /></Sequence>
    <Sequence from={S.quiz} durationInFrames={94}><Quiz /></Sequence>
    <Sequence from={S.cta}><Cta /></Sequence>
    <Finish />

    <Audio src={staticFile("sfx/pad.wav")} volume={0.22} />
    <Sfx at={0} name="thump" volume={0.7} />
    {TABS.map((_, i) => <Sfx key={i} at={4 + i * 4} name="tick" volume={0.35} />)}
    {[S.place, S.quiz, S.cta].map((t) => <Sfx key={`w${t}`} at={t - 8} name="whoosh" volume={0.5} />)}
    {[S.place, S.quiz, S.cta].map((t) => <Sfx key={`t${t}`} at={t + 2} name="thump" volume={0.5} />)}
    {QUERY.split("").map((_, i) => <Sfx key={`k${i}`} at={S.place + 16 + i * 3} name="tick" volume={0.3} />)}
    <Sfx at={S.quiz + PICK_AT - 2} name="tick" volume={0.5} />
    <Sfx at={S.quiz + CARD_AT + 6} name="pop" volume={0.5} />
    <Sfx at={S.cta + 20} name="pop" volume={0.45} />
  </AbsoluteFill>
);
