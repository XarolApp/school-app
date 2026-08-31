import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { normalize } from '../lib/schoolSearch';

/**
 * A dropdown filter: a button that opens a listbox of options, each with the
 * number of schools behind it.
 *
 * Not a native <select>, for two reasons. The counts need their own styling on
 * the right of each row, and the obor list is ~100 entries long, which is
 * unusable without a search field inside the menu — neither is possible in a
 * native select.
 *
 * That means the keyboard and screen-reader behaviour a native select gives
 * for free has to be built: arrow keys move the active option, Enter picks it,
 * Escape closes, and aria-activedescendant tells assistive tech which row is
 * current while focus stays in the search input.
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  searchable = false,
  allLabel = 'Vše',
  searchPlaceholder = 'Hledat…',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  const visible = useMemo(() => {
    const rows = [{ value: '', label: allLabel, count: null }, ...options];
    if (!searchable || !query.trim()) return rows;

    const needle = normalize(query.trim());
    return rows.filter(
      (row) => row.value === '' || normalize(row.label).includes(needle)
    );
  }, [options, query, searchable, allLabel]);

  const selected = options.find((option) => option.value === value);

  // Close on a click anywhere else on the page. pointerdown rather than click
  // so the menu is already gone by the time the click lands on whatever is
  // underneath it.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus();
    if (!open) setQuery('');
  }, [open, searchable]);

  // Keep the highlighted row inside the scroll area as the arrows walk it.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (next) => {
    onChange(next);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next < 0) return visible.length - 1;
        if (next >= visible.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const option = visible[activeIndex];
      if (option) commit(option.value);
    }
  };

  return (
    <div className="filter-select" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={
          selected ? 'filter-select-button is-active' : 'filter-select-button'
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => !current);
          setActiveIndex(0);
        }}
      >
        <span className="filter-select-label">{label}</span>
        {selected && (
          <span className="filter-select-value">{selected.label}</span>
        )}
        <span className="filter-select-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="filter-select-menu">
          {searchable && (
            <div className="filter-select-search">
              <input
                ref={inputRef}
                type="text"
                className="input input-sm"
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-activedescendant={
                  visible[activeIndex] ? `${id}-opt-${activeIndex}` : undefined
                }
                aria-label={`Hledat v: ${label}`}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
              />
            </div>
          )}

          <ul
            className="filter-select-list"
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            ref={listRef}
          >
            {/* Each row is role="none" so the button inside it is the
                listbox's direct option child — an intervening listitem role
                breaks the listbox/option pairing for screen readers. */}
            {visible.map((option, index) => (
              <li key={option.value || '__all'} role="none">
                <button
                  type="button"
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  data-active={index === activeIndex}
                  className={
                    option.value === value
                      ? 'filter-select-option is-selected'
                      : 'filter-select-option'
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option.value)}
                >
                  <span className="filter-select-option-label">
                    {option.label}
                  </span>
                  {option.count != null && (
                    <span className="filter-select-option-count">
                      {option.count}
                    </span>
                  )}
                </button>
              </li>
            ))}

            {visible.length === 0 && (
              <li className="filter-select-empty" role="none">
                Nic neodpovídá
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FilterSelect;
