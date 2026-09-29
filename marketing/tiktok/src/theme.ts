// Single source of truth for the video. Colours are the Značka light palette
// from frontend/src/design/tokens.js — copy, don't invent. Rules from
// design/DESIGN.md: blue = the next action/selection only, green = match
// strength only, never #FFF/#000 (shadows and vignette are ink-tinted).
import { Easing } from "remotion";
import { loadFont as loadNarrow } from "@remotion/google-fonts/ArchivoNarrow";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";

const narrow = loadNarrow("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });
const archivo = loadArchivo("normal", { weights: ["400", "500", "600"], subsets: ["latin", "latin-ext"] });

export const theme = {
  colors: {
    bg: "#F5F6F7",
    surface2: "#EAEDEF",
    ink: "#15191E",
    ink2: "#4B525B",
    ink3: "#5F6670",
    line: "#DCE0E4",
    line2: "#C4CBD2",
    primary: "#1C58A3",
    primaryInk: "#F5F6F7",
    primarySoft: "#E1EAF6",
    accentLine: "#8FB0DA",
    match: "#2C7340",
    matchInk: "#F5F6F7",
    track: "#BFC3C5",
    glow: "rgba(28,88,163,0.28)",
    shade: (a: number) => `rgba(21,25,30,${a})`,
  },
  fonts: { display: narrow.fontFamily, body: archivo.fontFamily },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    // Brand motion is calm (DESIGN.md → Motion): near-critically damped, no bounce.
    firm: { damping: 26, stiffness: 180, mass: 0.8 },
  },
  radius: { card: 44, button: 34, option: 38, chip: 24, pill: 999 },
  shadow: "0 3px 6px rgba(21,25,30,.05), 0 44px 90px -40px rgba(21,25,30,.28)",
  // TikTok UI covers the top bar, the right-hand action column and the caption
  // block at the bottom. Everything important stays inside this box.
  safe: { top: 250, left: 80, right: 150, bottom: 500 },
} as const;
