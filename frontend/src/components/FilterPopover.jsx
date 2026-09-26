import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const skol = (count) => (count === 1 ? 'škola' : count >= 2 && count <= 4 ? 'školy' : 'škol');

function FilterPopover({ id, label, activeCount, open, onOpenChange, onClear, resultCount, children }) {
  const panelId = `${useId()}-panel`;
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const [alignRight, setAlignRight] = useState(false);
  onOpenChangeRef.current = onOpenChange;

  useLayoutEffect(() => {
    if (!open) return undefined;

    const root = rootRef.current;
    const panel = panelRef.current;
    if (panel) {
      setAlignRight(panel.getBoundingClientRect().right > window.innerWidth - 16);
      panel.querySelector(
        '.ss-filter-popover-body input:not(:disabled), .ss-filter-popover-body button:not(:disabled), .ss-filter-popover-body [tabindex]:not([tabindex="-1"])'
      )?.focus();
    }

    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) onOpenChangeRef.current(false);
    };
    // relatedTarget is null when focus goes nowhere, which is what Safari does on
    // every click of a checkbox or button inside the panel. Outside clicks are
    // already handled by the pointerdown listener, so only react to focus that
    // actually lands on another element (Tab / Shift+Tab out of the panel).
    const closeOnFocusOut = (event) => {
      if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) {
        onOpenChangeRef.current(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      triggerRef.current?.focus();
      onOpenChangeRef.current(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    root?.addEventListener('focusout', closeOnFocusOut);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      root?.removeEventListener('focusout', closeOnFocusOut);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className={`ss-filter-popover${alignRight ? ' is-right' : ''}`}
      data-filter-group={id}
      ref={rootRef}
    >
      <button
        type="button"
        ref={triggerRef}
        className={`ss-fbtn${activeCount > 0 ? ' is-set' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
      >
        {label}
        {activeCount > 0 && <span className="ss-facet-badge">{activeCount}</span>}
        <ChevronDown className={`ss-fbtn-chevron${open ? ' is-open' : ''}`} size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="ss-filter-popover-panel" id={panelId} ref={panelRef} role="dialog" aria-label={label}>
          <div className="ss-filter-popover-body">{children}</div>
          <div className="ss-filter-popover-footer">
            <button
              type="button"
              className="ss-filter-clear"
              onClick={onClear}
              disabled={activeCount === 0}
            >
              Vymazat
            </button>
            <button
              type="button"
              className="ss-btn ss-btn-primary ss-btn-sm"
              onClick={() => onOpenChange(false)}
            >
              Zobrazit {resultCount} {skol(resultCount)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPopover;
