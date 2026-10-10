// Pure repository-token calculation; no service calls or account writes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { palettes } from '../../frontend/src/design/tokens.js';

const luminance = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Unsupported color: ${hex}`);
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const ratio = (foreground, background) => {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const pairs = [
  ['ink', 'bg'], ['ink2', 'surface'], ['ink3', 'surface2'],
  ['accent', 'accentSoft'], ['accentInk', 'accent'], ['ok', 'okSoft'],
  ['danger', 'dangerSoft'], ['matchInk', 'matchFill'], ['surface', 'ok'],
];
const files = ['frontend/src/design/tokens.js', 'frontend/src/pages/beta.css',
  'frontend/src/components/BetaInstructions.jsx', 'frontend/src/lib/theme.js'];
const hashes = Object.fromEntries(files.map((path) => [path, createHash('sha256')
  .update(readFileSync(new URL(`../../${path}`, import.meta.url))).digest('hex')]));
const rows = Object.entries(palettes).flatMap(([palette, modes]) =>
  Object.entries(modes).flatMap(([mode, colors]) => pairs.map(([foreground, background]) => {
    const contrast = ratio(colors[foreground], colors[background]);
    return { palette, mode, foreground, background, foregroundHex: colors[foreground],
      backgroundHex: colors[background], contrast, normalText45: contrast >= 4.5 };
  })));
const result = {
  observedAtUtc: new Date().toISOString(), sourceHashes: hashes,
  method: 'sRGB relative luminance, threshold 0.04045; (Llighter + .05)/(Ldarker + .05); no threshold rounding.',
  reference: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
  scope: 'Nine selected token pairs in eight modes; this is not an exhaustive rendered-text/control or WCAG audit. Incidental/disabled/large-text exceptions require actual usage assessment.',
  renderedConfirmation: 'orange-theme-rendered-contrast-2026-10-10.json and .png: actual BetaInstructions, 16px weight 600, accent on accentSoft, opacity 1; loopback fixture only.',
  rows,
};
writeFileSync(fileURLToPath(new URL('theme-contrast-matrix-2026-10-10.json', import.meta.url)),
  `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({pairs: rows.length, below45: rows.filter((row) => !row.normalText45)}, null, 2));
