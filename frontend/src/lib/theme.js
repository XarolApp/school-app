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

/**
 * A theme switch the person can actually see: the new colours spread from
 * where they clicked (View Transitions), or cross-fade where that API is
 * missing. Reduced-motion users get the plain instant swap.
 */
export function applyThemeAnimated(palette, mode, origin) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (reduce) return applyTheme(palette, mode);
  if (!document.startViewTransition) {
    root.classList.add('theme-fading');
    const theme = applyTheme(palette, mode);
    setTimeout(() => root.classList.remove('theme-fading'), 600);
    return theme;
  }
  const x = origin?.x ?? window.innerWidth / 2, y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.classList.add('theme-transition');
  const transition = document.startViewTransition(() => { applyTheme(palette, mode); });
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-transition'));
  return validatedTheme(palette, mode);
}
