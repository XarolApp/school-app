import { useEffect, useState } from 'react';

/**
 * Respects the OS "reduce motion" setting. Every animated surface in the
 * onboarding flow (confetti, calculation spinner, transitions) is gated behind
 * this in addition to the CSS media query, because some of them are decided in
 * JS (whether to render confetti nodes at all) rather than in CSS.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
