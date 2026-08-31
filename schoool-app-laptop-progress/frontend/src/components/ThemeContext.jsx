import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// Kept in sync with the inline script in index.html, which applies the stored
// theme before React mounts. If this key changes, change it there too.
const STORAGE_KEY = 'skolamatch.theme';
const MODES = ['light', 'dark', 'system'];

// Must outlast the --dur-theme transition in index.css, or the class is pulled
// off mid-fade and the remaining colours snap.
const FADE_MS = 400;

const ThemeContext = createContext(null);

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    // Private browsing can make localStorage throw on read.
    return 'system';
  }
}

// 'system' removes the attribute rather than setting one, which hands the
// decision back to the prefers-color-scheme block in index.css. The two
// explicit modes pin it and win over the OS.
function applyMode(mode) {
  const root = document.documentElement;
  if (mode === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', mode);
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let fadeTimer = null;

/**
 * Runs a theme change as a crossfade rather than a hard cut.
 *
 * Every colour in the app resolves from a token, so re-pointing the tokens
 * changes thousands of computed values in a single frame. The `.theme-transition`
 * class in index.css puts a blanket transition on those properties; it is added
 * for the length of the fade only, so it never lingers and never competes with
 * a component's own timing.
 */
function fadeTo(apply) {
  const root = document.documentElement;

  // Someone who has asked the OS for less motion gets the instant swap. The
  // colours still change — only the animating of them is dropped.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply();
    return;
  }

  root.classList.add('theme-transition');
  apply();

  // Restart rather than stack, so double-clicking the picker does not strip
  // the class off halfway through the second fade.
  window.clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(() => {
    root.classList.remove('theme-transition');
  }, FADE_MS);
}

// The theme lives in localStorage, not in the database. It is a per-device
// preference — a phone in bed and a school computer at midday genuinely want
// different answers — and it costs no round trip, so the page never flashes
// the wrong colours while a profile loads.
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // The very first run only re-states what the inline script in index.html
  // already applied before paint. Fading there would mean the page loads in
  // the wrong theme and visibly drifts into the right one.
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      applyMode(mode);
      return;
    }
    fadeTo(() => applyMode(mode));
  }, [mode]);

  // Follows the OS flipping to dark at sunset while the tab is open.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference is lost on reload, but the current page still switches.
    }
  }, []);

  const value = {
    mode,
    setMode,
    // What the user is actually looking at, once 'system' is resolved.
    resolvedTheme: mode === 'system' ? (systemDark ? 'dark' : 'light') : mode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
