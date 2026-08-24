/**
 * Generates src/design/tokens.css from src/design/tokens.js.
 *
 * tokens.js is the single source of truth (it is the file a future React Native
 * app imports). This script projects it into CSS custom properties for the web
 * app, so the two can never drift.
 *
 * Run after changing any token:   npm run tokens
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { light, dark, cssVarsText } from '../src/design/tokens.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/design/tokens.css');

const css = `/* AUTO-GENERATED from src/design/tokens.js — do not edit by hand.
 * Regenerate with:  npm run tokens
 *
 * Both new token names and the legacy aliases the existing stylesheets consume
 * are emitted here, so onboarding.css / App.css pick up the palette unchanged.
 */

:root {
${cssVarsText(light)}
}

@media (prefers-color-scheme: dark) {
  :root {
${cssVarsText(dark)
  .split('\n')
  .map((l) => '  ' + l)
  .join('\n')}
  }
}

/* Explicit override hooks — let a future in-app theme switch force a mode
   regardless of the OS setting. */
:root[data-theme='light'] {
${cssVarsText(light)}
}

:root[data-theme='dark'] {
${cssVarsText(dark)}
}
`;

writeFileSync(out, css, 'utf8');
console.log(`wrote ${out}`);
