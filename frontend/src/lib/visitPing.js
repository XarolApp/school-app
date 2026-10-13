import { pingVisit } from '../api.js';

const IDLE_MS = 30 * 60 * 1000;

// One anonymous ping per visit: when the app opens (new tab or reload) and when the
// user comes back after 30 minutes without activity. The last-activity time lives in
// memory only, so nothing is stored on the device.
export function startVisitPing() {
  let last = Date.now();
  pingVisit();
  const touch = () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - last >= IDLE_MS) pingVisit();
    last = now;
  };
  for (const type of ['pointerdown', 'keydown', 'scroll', 'visibilitychange', 'focus']) {
    window.addEventListener(type, touch, { passive: true, capture: true });
  }
}
