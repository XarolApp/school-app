/**
 * Page numbers with ellipses: 1 … 4 [5] 6 … 42.
 *
 * The window around the current page is fixed, so the control stays the same
 * width whether the database holds 60 schools or 6000 — nothing here needs
 * touching when the scraper adds a city.
 */
function pageItems(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push('gap-start');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push('gap-end');
  items.push(total);

  return items;
}

function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label="Stránkování výsledků">
      <button
        type="button"
        className="pagination-step"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        <span aria-hidden="true">←</span> Předchozí
      </button>

      <ul className="pagination-pages">
        {pageItems(page, pageCount).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                className={
                  item === page ? 'pagination-page is-current' : 'pagination-page'
                }
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Stránka ${item}`}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} className="pagination-gap" aria-hidden="true">
              …
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        className="pagination-step"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
      >
        Další <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}

export default Pagination;
