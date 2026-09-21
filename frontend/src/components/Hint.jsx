import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Tap/keyboard-operable explanation: an icon button toggling an associated
 * note (aria-expanded/aria-controls). Escape or an outside press closes it;
 * hover still previews it via each consumer's CSS. The button never
 * navigates or submits, so it is safe beside links — but must not be nested
 * inside one (render it as a sibling).
 */
function Hint({ text, label, size = 12, wrapClass, tipClass }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    const onPress = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPress);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
    };
  }, [open]);

  return (
    <span ref={ref} className={`${wrapClass}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="hint-btn"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label ? `Vysvětlení: ${label}` : 'Vysvětlení'}
        onClick={() => setOpen((o) => !o)}
      >
        <Info size={size} aria-hidden="true" />
      </button>
      <span id={id} role="note" className={tipClass}>
        {label ? <strong>{label}: </strong> : null}
        {text}
      </span>
    </span>
  );
}

export default Hint;
