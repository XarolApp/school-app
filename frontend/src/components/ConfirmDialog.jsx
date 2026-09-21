import { useId, useRef } from 'react';
import Modal from './Modal';

/**
 * A modal confirm prompt: backdrop click and Escape call `onDismiss`, the safe
 * (cancel) button takes focus first so Enter cannot confirm by accident.
 * `children` is the body, so a caller can pass more than a sentence.
 * Always rendered by the caller only while open.
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
  const bodyId = useId();

  return (
    <Modal
      open
      role="alertdialog"
      title={title}
      onDismiss={onDismiss}
      busy={busy}
      initialFocusRef={cancelRef}
      describedBy={bodyId}
      icon={icon && <div className="ss-dialog-icon">{icon}</div>}
    >
      <div className="ss-dialog-body" id={bodyId}>
        {children}
      </div>
      <div className="ss-dialog-actions">
        <button type="button" ref={cancelRef} className="ss-btn ss-btn-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className="ss-btn ss-btn-primary" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
