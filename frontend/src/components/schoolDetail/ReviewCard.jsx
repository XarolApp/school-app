import { useState } from 'react';
import { Check } from 'lucide-react';
import { deleteReview, reportReview } from '../../api';
import { useToast } from '../ToastContext';

// One string per role, changed here and nowhere else. `display_name` from
// the server always wins when present (only ever true for rodic/ucitel who
// opted in) — this map is the pseudonym fallback.
const ROLE_LABEL = {
  student: (r) => (r.role_year ? `Student · ${r.role_year}. ročník` : 'Student'),
  absolvent: () => 'Absolvent',
  rodic: () => 'Rodič studenta',
  ucitel: () => 'Učitel/ka',
  navstevnik: () => 'Byl/a jsem na dni otevřených dveří',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ReviewCard({ review, onChanged }) {
  const { toast } = useToast();
  const who = review.display_name || ROLE_LABEL[review.role]?.(review) || review.role;
  const isPending = review.is_mine && review.status === 'held';
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      await reportReview(review.id, { reason: reason.trim(), goodFaith });
      toast('Oznámení přijato. Recenzi jsme do kontroly skryli.');
      setReporting(false);
      onChanged();
    } catch (err) {
      toast(err.message || 'Nahlášení se nepodařilo', { type: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReview(review.id);
      toast('Recenze smazána');
      onChanged();
    } catch {
      toast('Smazání se nepodařilo', { type: 'error' });
    }
  };

  return (
    <div className="sd-review-card">
      <div className="sd-review-head">
        <div className="sd-review-who">
          <span className="sd-review-name">{who}</span>
          {review.verified ? (
            <span className="sd-review-badge is-verified">
              <Check size={13} aria-hidden="true" /> Ověřeno školou
            </span>
          ) : (
            <span className="sd-review-badge is-unverified">Neověřeno</span>
          )}
          {isPending && <span className="sd-review-pending">čeká na kontrolu</span>}
        </div>
        <span className="sd-review-date">{formatDate(review.created_at)}</span>
      </div>

      <p className="sd-review-body">{review.body}</p>
      {review.moderation_reason && (
        <p className="sd-review-pending" role="note">{review.moderation_reason}</p>
      )}

      <div className="sd-review-foot">
        <span className="sd-review-obor">{review.obor_nazev ? `Obor: ${review.obor_nazev}` : ''}</span>
        <div className="sd-review-foot-actions">
          {review.is_mine ? (
            <button type="button" className="sd-review-link-btn" onClick={handleDelete}>
              Smazat
            </button>
          ) : (
            <button type="button" className="sd-review-link-btn" onClick={() => setReporting((v) => !v)}>
              Nahlásit
            </button>
          )}
        </div>
      </div>
      {reporting && (
        <form className="sd-review-report" onSubmit={handleReport}>
          <label htmlFor={`report-reason-${review.id}`}>Proč je recenze nevhodná nebo nezákonná?</label>
          <textarea
            id={`report-reason-${review.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={10}
            maxLength={500}
            required
            rows={3}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={goodFaith}
              onChange={(e) => setGoodFaith(e.target.checked)}
              required
            />
            <span>Prohlašuji, že oznámení podávám v dobré víře a že je pravdivé.</span>
          </label>
          <div className="sd-review-foot-actions">
            <button type="submit" className="sd-review-link-btn">Odeslat oznámení</button>
            <button type="button" className="sd-review-link-btn" onClick={() => setReporting(false)}>Zrušit</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ReviewCard;
