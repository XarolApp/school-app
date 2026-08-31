import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

/**
 * Brief confirmations for actions that would otherwise complete silently.
 *
 * The gap this fills: starring a school changed only the star itself, which is
 * easy to miss on a card the pointer is already covering — and on the favourites
 * page the row *disappears*, which is either a confirmation or a bug depending
 * on whether you expected it.
 *
 * Scope rule: a toast is for something that already succeeded somewhere the eye
 * is not. Errors that belong to a form stay in that form's own `.notice`, where
 * the field being complained about is; a toast that floats away is the wrong
 * place for something the user has to act on. `error` here is for a failed
 * *background* action, not for validation.
 */

const ToastContext = createContext(null);

// Long enough to read a short Czech sentence without hurrying, short enough not
// to pile up when someone stars several schools in a row.
const DISMISS_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Every pending auto-dismiss, so unmounting cannot leave a setState pointed at
  // a dead component.
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, { type = 'success' } = {}) => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((current) => {
        const next = [...current, { id, message, type }];
        // Three is enough to show a burst happened without covering the page.
        // Oldest go first — the newest is the one that matches what was just
        // clicked.
        return next.slice(-3);
      });

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_MS)
      );

      return id;
    },
    [dismiss]
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    []
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * `aria-live="polite"` on the container rather than on each toast: the region
 * has to already be in the DOM when a message lands in it, or screen readers
 * announce nothing. `role="status"` carries the same politeness for the ones
 * that map role to live-region behaviour instead.
 */
function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast is-${toast.type}`}>
          <span className="toast-icon" aria-hidden="true">
            {toast.type === 'error' ? (
              <AlertCircle size={18} strokeWidth={1.75} />
            ) : (
              <Check size={18} strokeWidth={2} />
            )}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Zavřít"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Returns the `toast` function. Safe to call from a component rendered outside
 * the provider — it hands back a no-op rather than throwing, so a missing
 * provider can never turn a working favourite button into a crashed page over
 * what is only a confirmation message.
 */
export function useToast() {
  const context = useContext(ToastContext);
  return context ?? { toast: () => {}, dismiss: () => {} };
}

export default ToastContext;
