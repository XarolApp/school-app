/**
 * ŠkolaMatch design tokens — THE source of truth for the visual system.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A .js FILE AND NOT ONLY CSS
 * ---------------------------------------------------------------------------
 * The mobile app is the intended primary surface at launch (CLAUDE.md →
 * "Platform Strategy"). React Native cannot read CSS variables, CSS files, or
 * anything in `onboarding.css`. It CAN import a plain JS module.
 *
 * So every colour, size, radius and font lives here as plain data. The web app
 * derives its CSS custom properties from this file (see `applyTokens` below and
 * `design/tokens.css`), and a future React Native app imports the same objects
 * into `StyleSheet.create()`. One source of truth, two renderers.
 *
 * RULES:
 *   - Never hardcode a colour or radius in a component or in CSS. Add it here.
 *   - Keep every value a primitive (string/number). No CSS-only syntax such as
 *     `calc()`, `var()`, media queries or multi-value shadows in the *palette*
 *     objects — React Native cannot parse those. Web-only values are isolated
 *     in `webOnly` at the bottom and must not be imported by the app.
 *
 * Source: Claude Design project "Seven-screen system launch" (2026-08-24).
 * Full extraction notes + the list of mockup claims we deliberately did NOT
 * port: docs/sources/design_system.md
 */

// --- Typography --------------------------------------------------------------
// Newsreader (serif) for headings, Hanken Grotesk (sans) for body/UI.
// Both OFL-licensed via Google Fonts, both carry full Czech diacritics.
// On React Native these become the loaded font-family names; the fallback
// stacks below are web-only and are appended in tokens.css, not here.
export const fonts = {
  heading: 'Newsreader',
  body: 'Hanken Grotesk',
  mono: 'ui-monospace',
};

/**
 * Type scale. Serif headings are deliberately weight 400 — the mockup never
 * bolds the serif; gravity comes from size and tight tracking, not weight.
 */
export const type = {
  hero: { size: 46, lineHeight: 1.06, weight: '400', tracking: -1.15, family: 'heading' },
  title: { size: 32, lineHeight: 1.12, weight: '400', tracking: -0.64, family: 'heading' },
  titleSm: { size: 28, lineHeight: 1.16, weight: '400', tracking: -0.56, family: 'heading' },
  cardTitle: { size: 23, lineHeight: 1.2, weight: '400', tracking: -0.46, family: 'heading' },
  statNumber: { size: 56, lineHeight: 1, weight: '400', tracking: -1.68, family: 'heading' },
  lead: { size: 17, lineHeight: 1.5, weight: '400', tracking: 0, family: 'body' },
  body: { size: 15, lineHeight: 1.5, weight: '400', tracking: 0, family: 'body' },
  bodyStrong: { size: 15, lineHeight: 1.35, weight: '500', tracking: 0, family: 'body' },
  small: { size: 14, lineHeight: 1.5, weight: '400', tracking: 0, family: 'body' },
  caption: { size: 13, lineHeight: 1.5, weight: '400', tracking: 0, family: 'body' },
  micro: { size: 12, lineHeight: 1.4, weight: '500', tracking: 0, family: 'body' },
  /** Uppercase tracked-out eyebrow above titles. */
  eyebrow: { size: 11, lineHeight: 1, weight: '600', tracking: 1.76, family: 'body' },
  button: { size: 16, lineHeight: 1, weight: '600', tracking: 0, family: 'body' },
};

// --- Palette -----------------------------------------------------------------
/**
 * Light theme. Background is warm paper (#FBFAF8), never pure white — that
 * warmth is most of why the mockup reads as calm rather than clinical.
 */
export const light = {
  bg: '#FBFAF8',
  surface: '#FFFFFF',
  surface2: '#F4F2EE',
  ink: '#17161B',
  ink2: '#5C5866',
  ink3: '#8E8A98',
  line: '#E6E3DD',
  line2: '#D6D2CA',
  accent: '#aa3bff',
  accentInk: '#FFFFFF',
  accentSoft: '#F6EEFF',
  accentLine: '#E2CCFF',
  ok: '#2F7D5F',
  okSoft: '#E9F2ED',
  board: '#EFEDE8',
  frost: 'rgba(255,255,255,0.82)',
  glow: 'rgba(170,59,255,0.13)',
};

export const dark = {
  bg: '#0C0B0F',
  surface: '#15141A',
  surface2: '#1E1C24',
  ink: '#F2F0F5',
  ink2: '#A5A1B0',
  ink3: '#75717F',
  line: '#262430',
  line2: '#343141',
  accent: '#c084fc',
  accentInk: '#1A1020',
  accentSoft: '#221A2E',
  accentLine: '#3E3054',
  ok: '#6FCFA6',
  okSoft: '#16241E',
  board: '#08080B',
  frost: 'rgba(28,26,36,0.78)',
  glow: 'rgba(192,132,252,0.20)',
};

// --- Geometry ----------------------------------------------------------------
/** Spacing rhythm from the mockup: 8 / 12 / 16 / 24 / 32. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, screen: 26 };

export const radius = {
  card: 18,
  button: 14,
  option: 16,
  chip: 10,
  check: 7,
  pill: 999,
};

export const size = {
  buttonHeight: 56,
  buttonHeightSm: 54,
  checkbox: 22,
  progressTrack: 5,
  /** Design viewport the whole system was drawn at. */
  designWidth: 390,
};

// --- Semantic rules the visual system depends on ------------------------------
/**
 * These are not decoration, they are the rules that make the system cohere.
 * Documented here because they are easy to violate silently:
 *
 *   1. `accent` carries exactly ONE thing per screen — the primary action, or
 *      the result. Never decoration, never two things at once.
 *   2. `ok` (green) appears ONLY on match strength. Never generic success,
 *      never decorative checkmarks.
 *   3. Selection = 1.5px `accent` border + `accentSoft` fill. NEVER a solid
 *      accent fill. Unselected = 1px `line` on `surface`.
 *   4. Hairline over shadow. Borders do the structural work.
 */
export const selection = {
  borderWidth: 1.5,
  restBorderWidth: 1,
};

// --- Web-only ----------------------------------------------------------------
/**
 * Values React Native cannot parse. Do NOT import this object into the app —
 * RN needs its own elevation/shadow handling.
 */
export const webOnly = {
  fontStackHeading: "'Newsreader', Georgia, 'Times New Roman', serif",
  fontStackBody: "'Hanken Grotesk', system-ui, 'Segoe UI', Roboto, sans-serif",
  fontStackMono: 'ui-monospace, Consolas, monospace',
  shadow: {
    light: '0 1px 2px rgba(23,22,27,.05), 0 18px 40px -20px rgba(23,22,27,.18)',
    dark: '0 1px 2px rgba(0,0,0,.5), 0 20px 44px -20px rgba(0,0,0,.75)',
  },
};

// --- Web bridge --------------------------------------------------------------
/**
 * Maps a palette object to CSS custom property declarations.
 *
 * Both the NEW names (--surface, --ink2, --ok …) and the LEGACY names the
 * existing stylesheets already consume (--text, --text-h, --accent-bg …) are
 * emitted, so `onboarding.css` and `App.css` pick up the new palette without a
 * 1,200-line rewrite. The legacy aliases are a compatibility layer — prefer the
 * new names in anything you write from here on.
 *
 * @param {object} p one of `light` / `dark`
 * @returns {Record<string,string>}
 */
export function cssVars(p) {
  const isDark = p === dark;
  return {
    // new names
    '--bg': p.bg,
    '--surface': p.surface,
    '--surface2': p.surface2,
    '--ink': p.ink,
    '--ink2': p.ink2,
    '--ink3': p.ink3,
    '--line': p.line,
    '--line2': p.line2,
    '--acc': p.accent,
    '--acc-ink': p.accentInk,
    '--acc-soft': p.accentSoft,
    '--acc-line': p.accentLine,
    '--ok': p.ok,
    '--ok-soft': p.okSoft,
    '--board': p.board,
    '--frost': p.frost,
    '--glow': p.glow,
    '--shadow': isDark ? webOnly.shadow.dark : webOnly.shadow.light,

    // legacy aliases consumed by existing CSS
    '--text': p.ink2,
    '--text-h': p.ink,
    '--border': p.line,
    '--code-bg': p.surface2,
    '--accent': p.accent,
    '--accent-bg': p.accentSoft,
    '--accent-border': p.accentLine,
    '--social-bg': p.surface2,

    // fonts
    '--sans': webOnly.fontStackBody,
    '--heading': webOnly.fontStackHeading,
    '--mono': webOnly.fontStackMono,

    // geometry
    '--r-card': `${radius.card}px`,
    '--r-button': `${radius.button}px`,
    '--r-option': `${radius.option}px`,
    '--r-chip': `${radius.chip}px`,
    '--ob-radius': `${radius.card}px`,
  };
}

/** Serialises `cssVars` into a CSS declaration block body. */
export function cssVarsText(p) {
  return Object.entries(cssVars(p))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}
