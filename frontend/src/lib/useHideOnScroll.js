import { useEffect, useState } from 'react';

// Below this the header always stays put. Hiding it in the first few pixels of
// a flick costs a whole header of space for almost no scrolling, and on a short
// page it can slide away and never come back.
const HIDE_BELOW = 96;

// Trackpads and touch screens emit a stream of sub-pixel scroll events, and iOS
// rubber-banding reverses direction at both ends of the document. Anything
// smaller than this is not a decision the user made.
const DELTA = 6;

/**
 * True while the page is being scrolled down, false the moment it is scrolled
 * back up. Drives the header sliding out of the way to give reading the full
 * screen, then coming back the instant it is wanted.
 *
 * `resetKey` re-baselines the hook — pass the current pathname. Without it a
 * header hidden at the bottom of one page stays hidden after navigating, since
 * nothing scrolls on the new page to tell it otherwise.
 *
 * `enabled` pins the header open. Hiding it earns its keep on long pages that
 * are there to be read; on a short form it just takes the way out from under
 * someone who is filling it in.
 */
export default function useHideOnScroll(resetKey, enabled = true) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    // Also skips attaching the listener, so a pinned header costs nothing.
    if (!enabled) return undefined;

    let last = window.scrollY;
    let frame = null;

    const read = () => {
      frame = null;
      // Rubber-banding can report a negative offset; clamping keeps the
      // comparison against HIDE_BELOW honest.
      const y = Math.max(0, window.scrollY);
      const moved = y - last;

      if (Math.abs(moved) < DELTA) return;

      setHidden(y > HIDE_BELOW && moved > 0);
      last = y;
    };

    const onScroll = () => {
      // Scroll fires far more often than the screen repaints, and each handler
      // here reads layout. One read per frame is all that can actually be
      // shown, so extra ones are pure jank.
      if (frame === null) frame = window.requestAnimationFrame(read);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [resetKey, enabled]);

  return hidden;
}
