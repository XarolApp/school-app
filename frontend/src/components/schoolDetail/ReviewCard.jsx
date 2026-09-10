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

  const handleReport = async () => {
    try {
      await reportReview(review.id);
      toast('Recenze nahlášena — schováme ji, než se na ni podíváme.');
      onChanged();
    } catch {
      toast('Nahlášení se nepodařilo', { type: 'error' });
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

      <div className="sd-review-foot">
        <span className="sd-review-obor">{review.obor_nazev ? `Obor: ${review.obor_nazev}` : ''}</span>
        <div className="sd-review-foot-actions">
          {review.is_mine ? (
            <button type="button" className="sd-review-link-btn" onClick={handleDelete}>
              Smazat
            </button>
          ) : (
            <button type="button" className="sd-review-link-btn" onClick={handleReport}>
              Nahlásit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewCard;
