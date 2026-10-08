import { useEffect } from 'react';

/**
 * Reserves room for a fixed bottom bar: writes its real rendered height to
 * `--bottom-bar-space` on the page container and `--bottom-bar-h` on the root
 * (0 when the bar is absent or not fixed), so page padding and floating tools
 * never rely on a hardcoded guess. `active` re-runs the measurement when a
 * conditionally mounted bar appears or goes away.
 */
export default function useBottomBarSpace(barRef, containerRef, active = true) {
  useEffect(() => {
    const container = containerRef.current;
    const bar = barRef.current;
    const root = document.documentElement;
    if (!container) {
      root.style.setProperty('--bottom-bar-h', '0px');
      return () => root.style.removeProperty('--bottom-bar-h');
    }
    const set = (px) => {
      container.style.setProperty('--bottom-bar-space', `${px}px`);
      root.style.setProperty('--bottom-bar-h', `${px}px`);
    };
    const measure = active && bar
      ? () => set(getComputedStyle(bar).position === 'fixed' ? bar.offsetHeight : 0)
      : null;
    if (!measure) {
      set(0);
    }
    const observer = measure && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (measure) {
      measure();
      observer?.observe(bar);
      window.addEventListener('resize', measure);
    }
    return () => {
      observer?.disconnect();
      if (measure) window.removeEventListener('resize', measure);
      container.style.removeProperty('--bottom-bar-space');
      root.style.removeProperty('--bottom-bar-h');
    };
  }, [barRef, containerRef, active]);
}
