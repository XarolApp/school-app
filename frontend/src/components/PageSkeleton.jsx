/**
 * Placeholder shaped like the page that is loading, so the layout does not jump
 * when the data lands. One polite status line for screen readers; the blocks
 * themselves are decorative. Variants only differ in shape:
 *   page    heading + three cards (default)
 *   list    heading + rows (saved schools, history lists)
 *   form    heading + labelled fields (settings, application)
 *   columns heading + side-by-side columns (comparison, matrix)
 *   card    a single centred card (link pages, redirects)
 */
const blocks = (count, className) => Array.from({ length: count }, (_, i) => <div className={className} key={i} />);

export default function PageSkeleton({ variant = 'page', label = 'Načítám…', narrow = false }) {
  return (
    <div className={`ss-pagesk is-${variant}${narrow ? ' is-narrow' : ''}`} role="status" aria-busy="true">
      <span className="ss-visually-hidden">{label}</span>
      <div aria-hidden="true">
        {variant !== 'card' && <div className="ss-sk ss-sk-title" />}
        {variant !== 'card' && <div className="ss-sk ss-sk-line" />}
        {variant === 'page' && <div className="ss-sk-grid">{blocks(3, 'ss-sk ss-sk-card')}</div>}
        {variant === 'list' && <div className="ss-sk-stack">{blocks(4, 'ss-sk ss-sk-row')}</div>}
        {variant === 'form' && <div className="ss-sk-stack">{blocks(4, 'ss-sk ss-sk-field')}</div>}
        {variant === 'columns' && <div className="ss-sk-grid is-cols">{blocks(3, 'ss-sk ss-sk-tall')}</div>}
        {variant === 'card' && <div className="ss-sk ss-sk-tall" />}
      </div>
    </div>
  );
}
