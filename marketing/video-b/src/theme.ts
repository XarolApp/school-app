// Single source of truth for the video. Stage colours are the Značka DARK palette
// from frontend/src/design/tokens.js (copied, not invented). The phone shows the
// real app in light mode. Accent (#7FA8E6) is the hero: one hero element per frame.
import { Easing, continueRender, delayRender, staticFile } from "remotion";

export const theme = {
  colors: {
    bg: "#131518",
    surface: "#1A1D21",
    surface2: "#22262B",
    ink: "#E7EAEE",
    ink2: "#B8BFC8",
    ink3: "#939BA5",
    line: "#2A2F35",
    line2: "#3A4047",
    accent: "#7FA8E6",
    accentInk: "#10151C",
    accentSoft: "#1D2B3F",
    accentLine: "#3F5F8C",
    ok: "#7DC08E",
    board: "#0E1012",
    frost: "rgba(26,29,33,0.78)",
    glow: "rgba(127,168,230,0.45)",
    shade: (a: number) => `rgba(14,16,18,${a})`,
  },
  fonts: { display: "Archivo Narrow", body: "Archivo" },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
    counter: { damping: 30, stiffness: 120, mass: 1 },
  },
  // TikTok covers the top bar, the right-hand icon column and the bottom ~20 %.
  safe: { top: 230, right: 150, bottom: 384, left: 72 },
  // Phone: the app's 390×844 CSS viewport drawn at K stage px per CSS px.
  phone: { K: 1.22, bezel: 14, top: 478 },
} as const;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Self-hosted Archivo / Archivo Narrow (OFL) from frontend/node_modules/@fontsource.
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const faces: [string, string, string][] = [
  ["Archivo Narrow", "700", "archivo-narrow-latin%-700-normal.woff2"],
  ["Archivo", "500", "archivo-latin%-500-normal.woff2"],
  ["Archivo", "700", "archivo-latin%-700-normal.woff2"],
];
const handle = delayRender("fonts");
Promise.all(
  faces.flatMap(([family, weight, file]) =>
    [["", LATIN], ["-ext", LATIN_EXT]].map(([sub, range]) =>
      new FontFace(family, `url(${staticFile(`fonts/${file.replace("%", sub)}`)})`, { weight, unicodeRange: range })
        .load()
        .then((f) => document.fonts.add(f)),
    ),
  ),
).then(() => continueRender(handle));
