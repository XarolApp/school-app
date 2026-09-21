import { useEffect } from 'react';

/**
 * Reserves room for a fixed bottom bar: writes its real rendered height to
 * `--bottom-bar-space` on the page container (0 when the bar is absent or not
 * fixed), so page padding never relies on a hardcoded guess. `active` re-runs
 * the measurement when a conditionally mounted bar appears or goes away.
 */
export default function useBottomBarSpace(barRef, containerRef, active = true) {
  useEffect(() => {
    const container = containerRef.current;
    const bar = barRef.current;
    if (!container) return undefined;
    const set = (px) => container.style.setProperty('--bottom-bar-space', `${px}px`);
    if (!active || !bar) {
      set(0);
      return undefined;
    }
    const measure = () => set(getComputedStyle(bar).position === 'fixed' ? bar.offsetHeight : 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      container.style.removeProperty('--bottom-bar-space');
    };
  }, [barRef, containerRef, active]);
}
