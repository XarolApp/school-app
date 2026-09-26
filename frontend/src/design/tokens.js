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
 * derives its CSS custom properties from this file (see `gen-tokens-css.mjs` and
 * `design/tokens.css`), and a future React Native app imports the same objects
 * into `StyleSheet.create()`. One source of truth, two renderers.
 *
 * RULES:
 *   - Never hardcode a colour or radius in a component or in CSS. Add it here.
 *   - Keep palette values as primitive strings/numbers. `shadow` is the
 *     specified CSS shadow string; React Native should map it to native shadow
 *     properties rather than importing the CSS representation.
 *
 * Source: Claude Design project "Seven-screen system launch" (2026-08-24).
 * Full extraction notes + the list of mockup claims we deliberately did NOT
 * port: docs/sources/design_system.md
 */

// --- Typography --------------------------------------------------------------
// Archivo Narrow headings, Archivo body/UI. Both carry Czech diacritics.
export const fonts = {
  heading: 'Archivo Narrow',
  body: 'Archivo',
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
 *
 * No font-specific optical-axis fields are needed for Archivo Narrow or Archivo.
 */
export const type = {
  display: { size: 72, lineHeight: 1.06, weight: '600', tracking: '-0.02em', family: 'heading' },
  headlineLg: { size: 38, lineHeight: 1.14, weight: '600', tracking: '-0.015em', family: 'heading' },
  headlineMd: { size: 28, lineHeight: 1.2, weight: '600', tracking: '-0.01em', family: 'heading' },
  headlineSm: { size: 22, lineHeight: 1.25, weight: '500', tracking: 0, family: 'heading' },
  bodyLg: { size: 18, lineHeight: 1.6, weight: '400', tracking: 0, family: 'body' },
  bodyMd: { size: 16, lineHeight: 1.55, weight: '400', tracking: 0, family: 'body' },
  bodySm: { size: 14, lineHeight: 1.5, weight: '400', tracking: 0, family: 'body' },
  caption: { size: 13, lineHeight: 1.45, weight: '400', tracking: 0, family: 'body' },
  labelCaps: { size: 11, lineHeight: 1.3, weight: '600', tracking: '0.08em', family: 'body' },
  labelMd: { size: 15, lineHeight: 1, weight: '600', tracking: 0, family: 'body' },
  dataMd: { size: 15, lineHeight: 1.4, weight: '500', tracking: 0, family: 'body' },
  dataSm: { size: 13, lineHeight: 1.4, weight: '500', tracking: 0, family: 'body' },
};

// Values and the rules every theme must satisfy: design/DESIGN.md → Colors →
// Themes. Contrast verified for all 8 combinations 2026-09-24; don't edit
// values without re-running the pairs listed there.
export const palettes = {
  znacka: {
    light: { bg:'#F5F6F7', surface:'#F5F6F7', surface2:'#EAEDEF', ink:'#15191E', ink2:'#4B525B', ink3:'#5F6670', line:'#DCE0E4', line2:'#C4CBD2', accent:'#1C58A3', accentInk:'#F5F6F7', accentSoft:'#E1EAF6', accentLine:'#8FB0DA', ok:'#2C7340', okSoft:'#E0EFE3', matchFill:'#2C7340', matchInk:'#F5F6F7', danger:'#B0271F', dangerSoft:'#F7E1DF', track:'#BFC3C5', board:'#E6EAED', frost:'rgba(245,246,247,0.82)', glow:'rgba(28,88,163,0.12)', shadow:'0 1px 2px rgba(21,25,30,.05), 0 18px 40px -20px rgba(21,25,30,.18)' },
    dark:  { bg:'#131518', surface:'#1A1D21', surface2:'#22262B', ink:'#E7EAEE', ink2:'#B8BFC8', ink3:'#939BA5', line:'#2A2F35', line2:'#3A4047', accent:'#7FA8E6', accentInk:'#10151C', accentSoft:'#1D2B3F', accentLine:'#3F5F8C', ok:'#7DC08E', okSoft:'#1B2E21', matchFill:'#7DC08E', matchInk:'#131518', danger:'#EE8A80', dangerSoft:'#3A1F1C', track:'#494D52', board:'#0E1012', frost:'rgba(26,29,33,0.78)', glow:'rgba(127,168,230,0.15)', shadow:'0 1px 2px rgba(14,16,18,.40), 0 18px 40px -20px rgba(14,16,18,.60)' },
  },
  smrk: {
    light: { bg:'#F3F5F2', surface:'#F3F5F2', surface2:'#E6ECE7', ink:'#14201A', ink2:'#475650', ink3:'#5C6A63', line:'#D7DFD9', line2:'#BFCAC2', accent:'#1D5842', accentInk:'#F3F5F2', accentSoft:'#DAE9E0', accentLine:'#8DB5A2', ok:'#855A13', okSoft:'#F4E7CF', matchFill:'#855A13', matchInk:'#F3F5F2', danger:'#9A2E22', dangerSoft:'#F4DFDA', track:'#BCC3BE', board:'#E3E9E4', frost:'rgba(243,245,242,0.82)', glow:'rgba(29,88,66,0.12)', shadow:'0 1px 2px rgba(20,32,26,.05), 0 18px 40px -20px rgba(20,32,26,.18)' },
    dark:  { bg:'#0F1613', surface:'#151E1A', surface2:'#1C2722', ink:'#E3EAE5', ink2:'#AEBBB3', ink3:'#8E9C95', line:'#243029', line2:'#344239', accent:'#86C2A5', accentInk:'#0F1613', accentSoft:'#1A3027', accentLine:'#3E6B57', ok:'#E1B770', okSoft:'#33291A', matchFill:'#E1B770', matchInk:'#0F1613', danger:'#E9907F', dangerSoft:'#3A201B', track:'#444E49', board:'#0A0F0D', frost:'rgba(21,30,26,0.78)', glow:'rgba(134,194,165,0.15)', shadow:'0 1px 2px rgba(10,15,13,.40), 0 18px 40px -20px rgba(10,15,13,.60)' },
  },
  zvyraznovac: {
    light: { bg:'#FAFAF8', surface:'#FAFAF8', surface2:'#EFEEEA', ink:'#151412', ink2:'#4E4B45', ink3:'#6A675F', line:'#E3E1DA', line2:'#CDCAC0', accent:'#151412', accentInk:'#FAFAF8', accentSoft:'#FBEFB8', accentLine:'#D9B52E', ok:'#6B5300', okSoft:'#F9E27E', matchFill:'#F6CF3F', matchInk:'#151412', danger:'#B3301D', dangerSoft:'#F8E0DA', track:'#C3C2BF', board:'#ECEBE6', frost:'rgba(250,250,248,0.82)', glow:'rgba(246,207,63,0.25)', shadow:'0 1px 2px rgba(21,20,18,.05), 0 18px 40px -20px rgba(21,20,18,.18)' },
    dark:  { bg:'#161512', surface:'#1D1B18', surface2:'#25231F', ink:'#F0EDE5', ink2:'#BDB8AD', ink3:'#9C978E', line:'#2D2A25', line2:'#3D3A33', accent:'#F6CF3F', accentInk:'#161512', accentSoft:'#3A3217', accentLine:'#8C7628', ok:'#F6CF3F', okSoft:'#3A3217', matchFill:'#F6CF3F', matchInk:'#161512', danger:'#F0957F', dangerSoft:'#3B211B', track:'#4E4B47', board:'#100F0D', frost:'rgba(29,27,24,0.78)', glow:'rgba(246,207,63,0.15)', shadow:'0 1px 2px rgba(16,15,13,.40), 0 18px 40px -20px rgba(16,15,13,.60)' },
  },
  terakota: {
    light: { bg:'#FAF6EF', surface:'#FAF6EF', surface2:'#F1ECE3', ink:'#221A13', ink2:'#6B6259', ink3:'#6F6557', line:'#E6DFD1', line2:'#D6CBB6', accent:'#AD4F2A', accentInk:'#FAF6EF', accentSoft:'#F6E3D6', accentLine:'#DFA98C', ok:'#4F7143', okSoft:'#E6EDDE', matchFill:'#4F7143', matchInk:'#FAF6EF', danger:'#7A3020', dangerSoft:'#F5E2DC', track:'#C8C2B9', board:'#EFE9DC', frost:'rgba(250,246,239,0.82)', glow:'rgba(173,79,42,0.12)', shadow:'0 1px 2px rgba(34,26,19,.05), 0 18px 40px -20px rgba(34,26,19,.18)' },
    dark:  { bg:'#17130E', surface:'#1F1911', surface2:'#2A2216', ink:'#F2ECE2', ink2:'#D8CFC2', ink3:'#B3A895', line:'#362C1E', line2:'#4A3D2B', accent:'#E08A5C', accentInk:'#17130E', accentSoft:'#3A2617', accentLine:'#7A5540', ok:'#8FB57E', okSoft:'#24301F', matchFill:'#8FB57E', matchInk:'#17130E', danger:'#C97F6A', dangerSoft:'#33201A', track:'#524A3F', board:'#100D09', frost:'rgba(31,25,17,0.78)', glow:'rgba(224,138,92,0.15)', shadow:'0 1px 2px rgba(16,13,9,.40), 0 18px 40px -20px rgba(16,13,9,.60)' },
  },
};

export const PALETTE_IDS = ['znacka', 'smrk', 'zvyraznovac', 'terakota'];
export const DEFAULT_PALETTE = 'znacka';
// Back-compat for anything importing the old names (and the future RN app):
export const light = palettes.znacka.light;
export const dark = palettes.znacka.dark;

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
 *   1. Solid `accent` carries exactly ONE thing per screen. `accentSoft` may
 *      additionally tint one guidance area per screen (DESIGN.md → Primary-subtle).
 *   2. `ok` (green) appears ONLY on match strength, in three strength levels
 *      (DESIGN.md → Tertiary). Never generic success, never decorative checkmarks.
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
  fontStackHeading: "'Archivo Narrow', 'Arial Narrow', system-ui, sans-serif",
  fontStackBody: "'Archivo', system-ui, 'Segoe UI', sans-serif",
  fontStackMono: 'ui-monospace, Consolas, monospace',
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
 * @param {object} p one light or dark palette object
 * @returns {Record<string,string>}
 */
export function cssVars(p) {
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
    '--match-fill': p.matchFill,
    '--match-ink': p.matchInk,
    '--danger': p.danger,
    '--danger-soft': p.dangerSoft,
    '--track': p.track,
    '--board': p.board,
    '--frost': p.frost,
    '--glow': p.glow,
    '--shadow': p.shadow,

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
