/**
 * Loading states. Two honest options only:
 *
 *  - <LoadingSpinner> where the loader cannot know what comes next (route
 *    guards, lazy chunks, one-off link pages). A wrong-shaped skeleton is worse
 *    than a spinner: the page "jumps" into something else.
 *  - <SkeletonPage> + <Sk> blocks, written per page inside the page's OWN
 *    layout classes, so the grey blocks sit exactly where the real content
 *    lands. Each page keeps its skeleton next to its markup (search for
 *    "Skeleton" in the page file) — change one, change the other.
 *
 * One polite status line for screen readers; the blocks are decorative.
 */
export function LoadingSpinner({ label = 'Načítám…' }) {
  return (
    <div className="ss-loading" role="status" aria-busy="true">
      <span className="ss-loading-wheel" aria-hidden="true" />
      <span className="ss-visually-hidden">{label}</span>
    </div>
  );
}

/** One grey block. `w`/`h` are CSS lengths (numbers mean px). */
export function Sk({ w = '100%', h = 16, r, className = '', style }) {
  return <span className={`ss-sk${className ? ` ${className}` : ''}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** A few text lines of decreasing length. */
export function SkLines({ count = 2, h = 14, gap = 8, last = '60%' }) {
  return (
    <span className="ss-sk-lines" style={{ gap }}>
      {Array.from({ length: count }, (_, i) => <Sk key={i} h={h} w={i === count - 1 ? last : '100%'} />)}
    </span>
  );
}

/** Wraps a page-shaped skeleton: `className` is the real page container's class. */
export function SkeletonPage({ className, label = 'Načítám…', children }) {
  return (
    <div className={className} role="status" aria-busy="true">
      <span className="ss-visually-hidden">{label}</span>
      {/* Children are rendered straight into the page container so its grid /
          flex layout applies; the blocks hold no text, so nothing is read out. */}
      {children}
    </div>
  );
}

export default LoadingSpinner;
