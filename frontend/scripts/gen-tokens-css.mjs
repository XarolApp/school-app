/**
 * Generates src/design/tokens.css from src/design/tokens.js.
 *
 * tokens.js is the single source of truth for the four palettes and their two
 * modes. Run after changing any token: npm run tokens
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  DEFAULT_PALETTE,
  PALETTE_IDS,
  palettes,
  cssVarsText,
  staticVarsText,
} from '../src/design/tokens.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/design/tokens.css');
const indent = (text, spaces = 2) => text.split('\n').map((line) => line ? `${' '.repeat(spaces)}${line}` : '').join('\n');
const paletteIds = PALETTE_IDS.filter((id) => id !== DEFAULT_PALETTE);
const lightRules = paletteIds.map((id) =>
  `:root[data-palette='${id}'] {\n${cssVarsText(palettes[id].light)}\n}`
).join('\n\n');
const systemDarkRules = PALETTE_IDS.map((id) => {
  const selector = id === DEFAULT_PALETTE
    ? ":root:not([data-theme='light'])"
    : `:root[data-palette='${id}']:not([data-theme='light'])`;
  return `${selector} {\n  color-scheme: dark;\n${indent(cssVarsText(palettes[id].dark), 2)}\n}`;
}).join('\n\n');
const explicitDarkRules = PALETTE_IDS.map((id) => {
  const selector = id === DEFAULT_PALETTE
    ? ":root[data-theme='dark']"
    : `:root[data-palette='${id}'][data-theme='dark']`;
  return `${selector} {\n  color-scheme: dark;\n${cssVarsText(palettes[id].dark)}\n}`;
}).join('\n\n');

const css = `/* AUTO-GENERATED from src/design/tokens.js — do not edit by hand.
 * Regenerate with: npm run tokens
 * Theme-independent tokens are emitted once in the first :root block.
 */

:root {
${staticVarsText()}
  color-scheme: light;
${cssVarsText(palettes[DEFAULT_PALETTE].light)}
}

${lightRules}

@media (prefers-color-scheme: dark) {
${indent(systemDarkRules)}
}

${explicitDarkRules}
`;

writeFileSync(out, css, 'utf8');
console.log(`wrote ${out}`);
