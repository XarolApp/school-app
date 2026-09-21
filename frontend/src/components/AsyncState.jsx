/**
 * Presentational loading / error / empty block — not a data-fetching
 * abstraction. Loading is one polite status with decorative placeholders;
 * errors get a heading, an explanation and a recovery action.
 */
function AsyncState({ kind, title, children, onRetry, retryLabel = 'Zkusit znovu', action, lines = 3 }) {
  if (kind === 'loading') {
    return (
      <div className="ss-async is-loading">
        <p className="ss-body-md" role="status">
          {title ?? 'Načítám…'}
        </p>
        <div aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <div className="ss-skeleton" key={i} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`ss-async is-${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      <h2 className="ss-headline-sm">{title}</h2>
      {children && <div className="ss-body-md">{children}</div>}
      {(onRetry || action) && (
        <div className="ss-async-actions">
          {onRetry && (
            <button type="button" className="ss-btn ss-btn-primary" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

export default AsyncState;
