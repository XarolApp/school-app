import { useEffect, useRef } from 'react';

/**
 * A modal confirm prompt: backdrop click and Escape cancel, the safe (cancel)
 * button takes focus first so Enter cannot confirm by accident. `children` is
 * the body, so a caller can pass more than a sentence.
 *
 * Matice.jsx still carries its own copy of this markup (`dp-confirm-*`); it is
 * left alone until that screen's review pass — see UNFORGET.md.
 */
function ConfirmDialog({
  icon,
  title,
  children,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  onDismiss = onCancel,
  busy = false,
}) {
  const cancelRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const busyRef = useRef(busy);
  onDismissRef.current = onDismiss;
  busyRef.current = busy;

  // Mount-only: a parent passing a fresh onCancel every render must not
  // re-focus the button or re-bind the listener each time.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busyRef.current) onDismissRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="ss-dialog-backdrop"
      role="presentation"
      onClick={() => {
        if (!busy) onDismiss();
      }}
    >
      <div
        className="ss-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ss-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {icon && <div className="ss-dialog-icon">{icon}</div>}
        <h2 className="ss-headline-md h" id="ss-dialog-title">
          {title}
        </h2>
        <div className="ss-dialog-body">{children}</div>
        <div className="ss-dialog-actions">
          <button type="button" ref={cancelRef} className="ss-btn ss-btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="ss-btn ss-btn-primary" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
