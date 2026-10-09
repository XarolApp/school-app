/* global __BUILD_ID__ */

const AUTO_RELOAD_KEY = 'snm.autoReload';
const AUTO_RELOAD_GUARD = 'snm.autoReloadAttemptedBuild';
const PRELOAD_RELOAD_GUARD = 'snm.preloadReloadAttemptedBuild';
const DEFAULT_IDLE_MS = 30 * 60 * 1000;

export function shouldReloadForVersion({ currentBuild, latestBuild, idleForMs, idleThresholdMs, safeToReload }) {
  return Boolean(latestBuild)
    && latestBuild !== currentBuild
    && idleForMs >= idleThresholdMs
    && safeToReload;
}

export function mayReloadAfterPreloadError(currentBuild, attemptedBuild) {
  return Boolean(currentBuild) && attemptedBuild !== currentBuild;
}

function readSession(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function writeSession(key, value) {
  try { sessionStorage.setItem(key, value); return true; } catch { return false; }
}

function removeSession(key) {
  try { sessionStorage.removeItem(key); } catch { /* storage may be disabled */ }
}

function currentPath() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function saveReloadState() {
  return writeSession(AUTO_RELOAD_KEY, JSON.stringify({ path: currentPath(), scrollY: window.scrollY }));
}

function restoreReloadState() {
  const saved = readSession(AUTO_RELOAD_KEY);
  if (!saved) return;
  removeSession(AUTO_RELOAD_KEY);
  try {
    const state = JSON.parse(saved);
    const scrollY = Number(state.scrollY);
    if (state.path !== currentPath() || !Number.isFinite(scrollY)) return;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)));
  } catch { /* ignore an incomplete state written by an older build */ }
}

function idleThreshold() {
  if (!import.meta.env?.DEV) return DEFAULT_IDLE_MS;
  try {
    const raw = localStorage.getItem('snm.debug.idleMs');
    if (raw === null) return DEFAULT_IDLE_MS;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_IDLE_MS;
  } catch { return DEFAULT_IDLE_MS; }
}

export function startUpdateWatcher() {
  if (window.__snmUpdateWatcherStarted) return;
  window.__snmUpdateWatcherStarted = true;

  const currentBuild = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'unknown';
  const previousUpdateBuild = readSession(AUTO_RELOAD_GUARD);
  if (previousUpdateBuild === currentBuild) removeSession(AUTO_RELOAD_GUARD);
  const previousPreloadBuild = readSession(PRELOAD_RELOAD_GUARD);
  if (previousPreloadBuild && previousPreloadBuild !== currentBuild) removeSession(PRELOAD_RELOAD_GUARD);

  restoreReloadState();
  let lastActivityAt = Date.now();
  let checking = false;
  let reloading = false;
  let pendingPreloadReload = false;

  const safeToReload = () => {
    if (document.visibilityState !== 'visible') return false;
    if (document.querySelector('dialog[open], [data-snm-update-hold="true"]')) return false;
    if (document.documentElement.hasAttribute('data-snm-stripe-redirecting')) return false;
    const active = document.activeElement;
    return !active?.matches?.('input, textarea, select, [contenteditable="true"]');
  };

  const reloadOnce = (guardKey, buildId) => {
    if (reloading || !safeToReload() || readSession(guardKey) === buildId) return false;
    if (!writeSession(guardKey, buildId)) return false;
    if (!saveReloadState()) {
      removeSession(guardKey);
      return false;
    }
    reloading = true;
    window.location.reload();
    return true;
  };

  const tryPendingPreloadReload = () => {
    if (!pendingPreloadReload || !safeToReload()) return;
    const attemptedBuild = readSession(PRELOAD_RELOAD_GUARD);
    if (!mayReloadAfterPreloadError(currentBuild, attemptedBuild)) {
      pendingPreloadReload = false;
      return;
    }
    if (reloadOnce(PRELOAD_RELOAD_GUARD, currentBuild)) pendingPreloadReload = false;
  };

  const checkForUpdate = async () => {
    tryPendingPreloadReload();
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      const response = await fetch('/version.json', { cache: 'no-store' });
      if (!response.ok) return;
      const { build: latestBuild } = await response.json();
      const idleForMs = Date.now() - lastActivityAt;
      if (!shouldReloadForVersion({
        currentBuild,
        latestBuild,
        idleForMs,
        idleThresholdMs: idleThreshold(),
        safeToReload: safeToReload(),
      })) return;
      reloadOnce(AUTO_RELOAD_GUARD, latestBuild);
    } catch { /* a version check must never interrupt the app */ }
    finally { checking = false; }
  };

  const recordActivity = () => { lastActivityAt = Date.now(); };
  const onVisibilityChange = () => {
    recordActivity();
    if (document.visibilityState === 'visible') void checkForUpdate();
  };
  const onPreloadError = (event) => {
    event.preventDefault();
    pendingPreloadReload = true;
    tryPendingPreloadReload();
  };

  window.addEventListener('pointerdown', recordActivity, { passive: true });
  window.addEventListener('keydown', recordActivity);
  window.addEventListener('scroll', recordActivity, { passive: true });
  window.addEventListener('touchstart', recordActivity, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('vite:preloadError', onPreloadError);
  window.setInterval(() => void checkForUpdate(), 5 * 60 * 1000);
  void checkForUpdate();
}
