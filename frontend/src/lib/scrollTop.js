import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Scroll the page and any dialog that holds `el` back to the top. */
export function scrollToTop(el) {
  el?.closest?.('dialog')?.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

/** Wizard steps: when `step` changes, put the user at the top of the new step. */
export function useScrollTopOnStep(ref, step) {
  useEffect(() => { scrollToTop(ref.current); }, [ref, step]);
}

/** New page = top of page. Back/forward keeps the browser's own restoration; #anchors are left alone. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== 'POP' && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, type]);
  return null;
}
