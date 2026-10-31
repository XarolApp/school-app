// Video B: "Ušetři přes 15 hodin" tutorial (brief: marketing/content/video-b-brief.md).
// Layers bottom → top: BgMesh → tiles + phone (footage) → type → Finish (grade, grain, vignette).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { HookText, Tiles, hoursShown } from "./Hook";
import { BgMesh, Finish, Sfx } from "./kit";
import { Captions, Chips, EndCard, Equation, StepTitle, buildPages } from "./Overlay";
import { Phone, type Shot, type Tap, type Zoom } from "./Phone";
import { clamp } from "./theme";
import { B, DURATION, R, VO_END, cue, words } from "./timeline";

const IMPLODE = B.L - 5;
const CHIPS = cue("L", "v");
const STEPS = [B.s1, B.s2, B.s3, B.s4, B.s5];

// Step 5 scrolls the real full-page capture; card 2's "Posunout výš" sits at y 1009 CSS px.
const S5_Y = 640;
const S5_UP = { ...R.s5_up, y: 1009 - S5_Y };

// "Porovnat vybrané" on /ulozene (read off the capture; CSS px).
const COMPARE_BTN = { x: 117, y: 247, w: 200, h: 58 };

const k = {
  q1: cue("1", "Odpověz"), it: cue("1", "otázek"), q3: cue("1", "gympl"), odb: cue("1", "odborka"),
  q6: cue("1", "kam"), p2: cue("1", "dojíždět"), rev: cue("1", "Hned"), revZoom: cue("1", "školy"),
  fil: cue("2", "Filtruj"), shoda: cue("2", "seřaď"), body: cue("2", "bodů"), stacily: cue("2", "stačily"),
  cmp: cue("4", "Porovnej"), sebe: cue("4", "sebe", 0, "end"), mat: cue("4", "rozhodovací"), nast: cue("4", "nastav"),
  zal: cue("4", "záleží"), uv: cue("4", "uvidíš"), pickPan: cue("5", "přihlášky"), presne: cue("5", "Přesně"),
};

const shots: Shot[] = [
  { at: B.L, src: "s1_welcome.png" },
  { at: k.q1, src: "s1_q1.png" },
  { at: k.it + 2, src: "s1_q1_it.png", cut: true },
  { at: k.q3, src: "s1_q3.png" },
  { at: k.odb + 2, src: "s1_q3_odborna.png", cut: true },
  { at: k.q6, src: "s1_q6_map0.png" },
  { at: k.p2 + 2, src: "s1_q6_map.png", cut: true },
  { at: k.rev, src: "s1_reveal.png" },
  { at: B.s2, src: "s2_list.png" },
  { at: k.fil + 2, src: "s2_it.png", cut: true },
  { at: k.shoda, src: "s2_shoda.png" },
  { at: k.body - 8, src: "s2_hranice_open.png", cut: true },
  { at: k.body + 2, src: "s2_sheet_shoda.png", cut: true },
  { at: k.body + 16, src: "s2_sheet_hranice.png", cut: true },
  { at: k.stacily, src: "s2_hranice.png" },
  { at: B.s3, src: "s3_find_56.png" },
  { at: B.s3 + 10, src: "s3_saved_56.png", cut: true },
  { at: B.s3 + 17, src: "s3_find_110.png", cut: true },
  { at: B.s3 + 23, src: "s3_saved_110.png", cut: true },
  { at: B.s3 + 29, src: "s3_find_160.png", cut: true },
  { at: B.s3 + 35, src: "s3_saved_160.png", cut: true },
  // The saved list carries into step 4: its real "Porovnat vybrané" button opens the comparison.
  { at: B.s3 + 41, src: "s3_ulozene.png" },
  { at: B.s4 + 14, src: "s4_compare.png" },
  { at: k.cmp, src: "pan", cut: true, seq: { from: k.cmp, to: k.sebe, count: 25 } },
  { at: k.mat, src: "s4_rank_before.png" },
  { at: k.nast, src: "s4_weight_before.png" },
  { at: k.zal + 2, src: "s4_weight_after.png", cut: true },
  { at: k.uv, src: "s4_rank_after.png" },
  { at: B.s5, src: "s5_picks_full.png", pan: { from: k.pickPan, to: k.pickPan + 26, y0: 0, y1: S5_Y } },
  { at: k.presne + 8, src: "s5_after_full.png", cut: true, pan: { from: k.presne + 16, to: k.presne + 46, y0: S5_Y, y1: 0 } },
];

const taps: Tap[] = [
  { at: k.it, r: R.s1_q1_it },
  { at: k.odb, r: R.s1_q3_odborna },
  { at: k.p2, r: R.s1_q6_p2 },
  { at: k.fil, r: R.s2_it },
  { at: k.body, r: R.s2_hranice_sort },
  { at: k.body + 14, r: R.s2_hranice },
  { at: B.s3 + 8, r: R.s3_fav_56, burst: true },
  { at: B.s3 + 21, r: R.s3_fav_110, burst: true },
  { at: B.s3 + 33, r: R.s3_fav_160, burst: true },
  { at: B.s4 + 8, r: COMPARE_BTN },
  { at: k.zal, r: R.s4_weight },
  { at: k.presne + 6, r: S5_UP },
];

// The match % on the reveal card, the sort control, the weight row.
const zooms: Zoom[] = [
  { from: k.revZoom - 8, to: B.s2 - 2, scale: 1.35, x: 150, y: 468 },
  { from: k.body - 6, to: k.stacily + 4, scale: 1.25, x: 170, y: 190 },
  { from: k.nast + 6, to: k.uv, scale: 1.3, x: R.s4_weight.x + 40, y: R.s4_weight.y },
];

const pages = buildPages(words.filter((w) => w.beat !== "H")); // no captions over the text hook

// Counter ticks: one per hour the hook counter rolls over.
const counterTicks = Array.from({ length: 60 }, (_, f) => f).filter((f) => f > 0 && hoursShown(f) > hoursShown(f - 1));

export const VideoB: React.FC<{ music?: boolean }> = ({ music = true }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <BgMesh />
      <Tiles implodeAt={IMPLODE} />
      {frame >= B.CTA + 8 && <Tiles echoFrom={B.CTA + 8} />}
      <Phone shots={shots} taps={taps} zooms={zooms} enterAt={B.L - 2} exitAt={B.CTA} />

      <HookText exitAt={IMPLODE} />
      <Equation to={B.s1} terms={[
        { at: cue("L", "192"), text: "192" },
        { at: cue("L", "5 minut"), text: "× 5 min" },
        { at: cue("L", "5 minut", 0, "end"), text: "= 16 h", hero: true },
      ]} />
      <Chips from={CHIPS} to={B.CTA} steps={STEPS} />
      <StepTitle from={B.s1} to={B.s2} n={1} text="Odpověz na otázky" />
      <StepTitle from={B.s2} to={B.s3} n={2} text="Projdi a vyfiltruj" />
      <StepTitle from={B.s3} to={B.s4} n={3} text="Ulož si favority" />
      <StepTitle from={B.s4} to={B.s5} n={4} text="Porovnej + rozhodni" />
      <StepTitle from={B.s5} to={B.CTA} n={5} text="Seřaď přihlášku" />
      <EndCard from={B.CTA + 6} urlAt={cue("CTA", "stredninamiru.cz")} badgeAt={cue("CTA", "slevu")}
        bioAt={cue("CTA", "Odkaz")} to={DURATION} />
      <Captions pages={pages} />
      <Finish />

      <Audio src={staticFile("vo-tight.wav")} />
      {music && <Audio src={staticFile("music.wav")} volume={(f) => interpolate(f, [0, 12, VO_END, VO_END + 12], [0, 0.12, 0.12, 0.2], clamp)} />}
      {counterTicks.map((f) => <Sfx key={`c${f}`} at={f} name="tick" volume={0.14} />)}
      <Sfx at={30} name="thump" volume={0.55} />
      <Sfx at={B.L} name="thump" volume={0.7} />
      {[0, 1, 2, 3, 4].map((i) => <Sfx key={`ch${i}`} at={CHIPS + i * 4} name="tick" volume={0.16} />)}
      {taps.map((t, i) => <Sfx key={`t${i}`} at={t.at} name={t.burst ? "pop" : "tick"} volume={t.burst ? 0.45 : 0.32} />)}
      <Sfx at={k.revZoom + 4} name="pop" volume={0.45} />
      <Sfx at={k.uv + 9} name="thump" volume={0.5} />
      <Sfx at={B.CTA + 6} name="pad" volume={0.3} />
    </AbsoluteFill>
  );
};
