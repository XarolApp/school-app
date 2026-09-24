import { DEFAULT_PALETTE, PALETTE_IDS } from '../design/tokens';

export const MODES = ['system', 'light', 'dark'];
export const THEME_CACHE_KEY = 'skolamatch.theme';

function validatedTheme(palette, mode) {
  return {
    palette: PALETTE_IDS.includes(palette) ? palette : DEFAULT_PALETTE,
    mode: MODES.includes(mode) ? mode : 'system',
  };
}

export function applyTheme(palette, mode) {
  const theme = validatedTheme(palette, mode);
  const root = document.documentElement;

  if (theme.palette === DEFAULT_PALETTE) root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', theme.palette);

  if (theme.mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme.mode);

  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
  } catch {}

  return theme;
}

export function readCachedTheme() {
  try {
    const cached = JSON.parse(localStorage.getItem(THEME_CACHE_KEY) || 'null');
    return validatedTheme(cached?.palette, cached?.mode);
  } catch {
    return validatedTheme();
  }
}
