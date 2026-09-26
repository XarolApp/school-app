import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { reportSchoolData } from '../../api';
import { useToast } from '../ToastContext';
import { useAuth } from '../AuthContext';

/**
 * "Nahlásit chybu v údajích" — the crowdsourced data-accuracy channel from
 * feature-brainstorm.md §4. Not a review: goes to data_reports, read
 * directly in Supabase, never rendered back to any user.
 */
function ReportDataDialog({ schoolId }) {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const openRef = useRef(null);
  const textRef = useRef(null);
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const wasOpen = useRef(false);

  // Focus the field on open, the opener again on close.
  useEffect(() => {
    if (open) textRef.current?.focus();
    else if (wasOpen.current) openRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError('Popis musí mít alespoň 10 znaků.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await reportSchoolData(schoolId, { message: trimmed });
      toast('Díky, dáme se na to podívat.');
      setMessage('');
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Nahlášení se nepodařilo.');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <div className="sd-report-row">
        <div>
          <div className="sd-report-title">Něco tu nesedí?</div>
          <div className="sd-report-body">
            Znáš tuhle školu líp než my. Když je něco špatně nebo chybí, dej
            vědět a opravíme to.
          </div>
        </div>
        <button
          type="button"
          ref={openRef}
          className="ss-btn ss-btn-secondary"
          onClick={() => (isSignedIn ? setOpen(true) : toast('Nejdřív se přihlas.', { type: 'error' }))}
        >
          <AlertTriangle size={16} aria-hidden="true" />
          Nahlásit chybu v údajích
        </button>
      </div>
    );
  }

  return (
    <form className="sd-report-form" onSubmit={handleSubmit}>
      <label htmlFor={fieldId} className="sd-form-field-label">
        Co je špatně nebo chybí?
      </label>
      <textarea
        id={fieldId}
        ref={textRef}
        className="sd-textarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1000}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? 'true' : undefined}
      />
      <p id={hintId} className="sd-form-hint">
        Napiš aspoň 10 znaků. Hlášení čteme ručně, nikomu se nezobrazí.
      </p>
      {error && (
        <p id={errorId} className="sd-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="sd-form-actions">
        <button type="submit" className="ss-btn ss-btn-primary" disabled={sending}>
          {sending ? 'Odesílám…' : 'Odeslat'}
        </button>
        <button type="button" className="ss-btn ss-btn-secondary" onClick={() => setOpen(false)}>
          Zrušit
        </button>
      </div>
    </form>
  );
}

export default ReportDataDialog;
