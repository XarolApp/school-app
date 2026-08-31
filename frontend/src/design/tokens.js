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
// Fraunces (serif) for headings, Public Sans (sans) for body/UI.
// Both OFL-licensed via Google Fonts, both carry full Czech diacritics.
// On React Native these become the loaded font-family names; the fallback
// stacks below are web-only and are appended in tokens.css, not here.
export const fonts = {
  heading: 'Fraunces',
  body: 'Public Sans',
  mono: 'ui-monospace',
};

/**
 * Type scale — matches design/system/tokens/typography.css exactly.
 *
 * NOTE the asymmetry: `tracking` was px-numeric in the old scale, but the
 * template specifies tracking in `em`. Em values are stored as STRINGS
 * (e.g. '-0.02em') and emitted verbatim by staticVars() below — never
 * converted to px, since an em value means something different at every
 * font-size. A tracking of exactly 0 is stored as the number 0.
 */
export const type = {
  display: { size: 72, lineHeight: 1.06, weight: '600', tracking: '-0.02em', family: 'heading', variation: "'SOFT' 60,'opsz' 72" },
  headlineLg: { size: 38, lineHeight: 1.14, weight: '600', tracking: '-0.015em', family: 'heading', variation: "'SOFT' 50,'opsz' 38" },
  headlineMd: { size: 28, lineHeight: 1.2, weight: '600', tracking: '-0.01em', family: 'heading', variation: "'SOFT' 45,'opsz' 28" },
  headlineSm: { size: 22, lineHeight: 1.25, weight: '500', tracking: 0, family: 'heading', variation: "'SOFT' 35,'opsz' 22" },
  bodyLg: { size: 18, lineHeight: 1.6, weight: '400', tracking: 0, family: 'body' },
  bodyMd: { size: 16, lineHeight: 1.55, weight: '400', tracking: 0, family: 'body' },
  bodySm: { size: 14, lineHeight: 1.5, weight: '400', tracking: 0, family: 'body' },
  caption: { size: 13, lineHeight: 1.45, weight: '400', tracking: 0, family: 'body' },
  labelCaps: { size: 11, lineHeight: 1.3, weight: '600', tracking: '0.08em', family: 'body' },
  labelMd: { size: 15, lineHeight: 1, weight: '600', tracking: 0, family: 'body' },
  dataMd: { size: 15, lineHeight: 1.4, weight: '500', tracking: 0, family: 'body' },
  dataSm: { size: 13, lineHeight: 1.4, weight: '500', tracking: 0, family: 'body' },
};

// --- Palette -----------------------------------------------------------------
/**
 * Light theme. Background is warm paper (#FBFAF8), never pure white — that
 * warmth is most of why the mockup reads as calm rather than clinical.
 * Accent is terracotta (#AD4F2A), secondary is moss (#4F7143).
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
  accent: '#AD4F2A',
  accentInk: '#FFFFFF',
  accentSoft: '#F5EDE5',
  accentLine: '#D9A489',
  ok: '#4F7143',
  okSoft: '#EBF1E7',
  danger: '#B3261E',
  dangerSoft: '#FBEBE9',
  board: '#EFEDE8',
  frost: 'rgba(255,255,255,0.82)',
  glow: 'rgba(173,79,42,0.12)',
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
  accent: '#E0B399',
  accentInk: '#1A1020',
  accentSoft: '#3D2D1F',
  accentLine: '#6B4C38',
  ok: '#8FD9A8',
  okSoft: '#1E3528',
  danger: '#F2837A',
  dangerSoft: '#2A1512',
  board: '#08080B',
  frost: 'rgba(28,26,36,0.78)',
  glow: 'rgba(224,179,153,0.15)',
};

// --- Geometry ----------------------------------------------------------------
/** Spacing scale — matches design/system/tokens/spacing.css exactly (8pt grid). */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 };

/** Layout constants from the same file. rowPadDense is the documented 8–12px
 *  exception for dense search/compare rows (DESIGN.md → Layout). */
export const layout = {
  gutter: 24, pageMargin: 64, pageMarginMd: 32, pageMarginSm: 16,
  contentMax: 1280, gridColumns: 12, rowPadDense: 10,
};

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
  fontStackHeading: "'Fraunces', Georgia, 'Times New Roman', serif",
  fontStackBody: "'Public Sans', system-ui, 'Segoe UI', sans-serif",
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
    '--danger': p.danger,
    '--danger-soft': p.dangerSoft,
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

/** Theme-independent tokens: emitted ONCE in :root, not per palette.
 *  Names match design/system/tokens/*.css exactly, so screens produced by
 *  /design against that template need no translation layer. */
export function staticVars() {
  const out = {};
  for (const [k, v] of Object.entries(space)) out[`--space-${k}`] = `${v}px`;
  out['--gutter'] = `${layout.gutter}px`;
  out['--page-margin'] = `${layout.pageMargin}px`;
  out['--page-margin-md'] = `${layout.pageMarginMd}px`;
  out['--page-margin-sm'] = `${layout.pageMarginSm}px`;
  out['--content-max'] = `${layout.contentMax}px`;
  out['--row-pad-dense'] = `${layout.rowPadDense}px`;
  for (const [k, t] of Object.entries(type)) {
    const n = k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());  // headlineLg -> headline-lg
    out[`--fs-${n}`] = `${t.size}px`;
    out[`--lh-${n}`] = `${t.lineHeight}`;
    out[`--fw-${n}`] = `${t.weight}`;
    if (t.tracking) out[`--ls-${n}`] = typeof t.tracking === 'number' ? `${t.tracking}px` : t.tracking;
    if (t.variation) out[`--var-${n}`] = t.variation;
  }
  out['--measure'] = '66ch';
  return out;
}

/** Same two-space indent contract as cssVarsText. */
export function staticVarsText() {
  return Object.entries(staticVars()).map(([k, v]) => `  ${k}: ${v};`).join('\n');
}
