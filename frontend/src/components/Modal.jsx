import { useEffect, useId, useRef } from 'react';

/**
 * A controlled modal on the native <dialog>: the browser supplies the focus
 * containment, background inertness and top layer. The caller owns `open`;
 * Escape and backdrop clicks call `onDismiss` (ignored while `busy`).
 * Focus goes to `initialFocusRef` (else the first focusable) and returns to
 * `returnFocusRef` (else whatever had focus when it opened) on close.
 * `children` may be a function receiving the title id, for aria wiring.
 */
function Modal({
  open,
  title,
  children,
  onDismiss,
  busy = false,
  initialFocusRef,
  returnFocusRef,
  role = 'dialog',
  className = '',
  describedBy,
  icon,
}) {
  const ref = useRef(null);
  const titleId = useId();
  const onDismissRef = useRef(onDismiss);
  const busyRef = useRef(busy);
  onDismissRef.current = onDismiss;
  busyRef.current = busy;
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return undefined;
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    if (!el.open) el.showModal();
    document.body.style.overflow = 'hidden';
    initialFocusRef?.current?.focus();

    const onCancel = (e) => {
      e.preventDefault();
      if (!busyRef.current) onDismissRef.current?.();
    };
    el.addEventListener('cancel', onCancel);

    return () => {
      el.removeEventListener('cancel', onCancel);
      if (el.open) el.close();
      document.body.style.overflow = prevOverflow;
      const target = returnFocusRef?.current ?? opener;
      if (target?.isConnected) target.focus?.();
    };
    // Mount-per-open only: refs and callbacks are read through refs/closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // A press that starts inside the panel and ends on the backdrop (text
  // selection drag) must not dismiss.
  return (
    <dialog
      ref={ref}
      className={`ss-dialog ${className}`.trim()}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current && !busy) onDismiss?.();
      }}
    >
      <div className="ss-dialog-panel">
        {icon}
        <h2 className="ss-headline-md h" id={titleId}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

export default Modal;
