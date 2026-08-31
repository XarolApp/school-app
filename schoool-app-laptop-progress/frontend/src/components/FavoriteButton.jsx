import { useState } from 'react';
import { addFavorite, removeFavorite } from '../api';
import { useToast } from './ToastContext';

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="favorite-star-icon" aria-hidden="true">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

/**
 * Floating star toggle used on school cards (search results, questionnaire
 * matches). Meant to sit as a SIBLING of the card's own Link, not nested
 * inside it — a <button> inside an <a> is invalid HTML and double-fires on
 * some screen readers. `stopPropagation` below is a second line of defence
 * for the same problem, not a substitute for keeping them apart in the DOM.
 *
 * State is owned by the parent (a Set of favorited ids covering the whole
 * list) rather than fetched per-button, so 20+ stars on one page cost one
 * favorites request total, not one each.
 */
function FavoriteButton({ schoolId, isFavorite, onChange, className = '' }) {
  const [saving, setSaving] = useState(false);
  // Only true for the instant after a click, so the pop animation plays once
  // per toggle and never on the initial render of an already-favorited card.
  const [popping, setPopping] = useState(false);
  const { toast } = useToast();

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;

    const next = !isFavorite;
    onChange(next);
    setSaving(true);
    setPopping(true);

    try {
      if (next) {
        await addFavorite(schoolId);
      } else {
        await removeFavorite(schoolId);
      }
      // Confirmed only after the call succeeds. The optimistic update above
      // already moved the star, so announcing before this point would sometimes
      // congratulate the user on a save that then rolled back.
      toast(next ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených');
    } catch {
      onChange(!next);
      // The star silently snapping back is indistinguishable from never having
      // clicked, which is the one case here that genuinely needs saying out
      // loud — especially on the favourites page, where a failed removal makes
      // a row reappear.
      toast(
        next
          ? 'Školu se nepodařilo přidat do oblíbených'
          : 'Školu se nepodařilo odebrat z oblíbených',
        { type: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      className={`favorite-star${isFavorite ? ' is-active' : ''} ${className}`.trim()}
      onClick={handleClick}
      onAnimationEnd={() => setPopping(false)}
      disabled={saving}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Odebrat z oblíbených' : 'Přidat mezi oblíbené'}
      data-pop={popping ? '' : undefined}
    >
      <StarIcon />
    </button>
  );
}

export default FavoriteButton;
