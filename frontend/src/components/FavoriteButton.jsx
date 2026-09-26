import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { addFavorite, removeFavorite } from '../api';
import { useToast } from './ToastContext';

/**
 * Save (bookmark) toggle used on school cards (search results, questionnaire
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
      // No success toast: the filled bookmark is the confirmation. Only a
      // failure is announced (below), because a silent snap-back looks like
      // the click never happened.
    } catch {
      onChange(!next);
      // The star silently snapping back is indistinguishable from never having
      // clicked, which is the one case here that genuinely needs saying out
      // loud — especially on the favourites page, where a failed removal makes
      // a row reappear.
      toast(
        next
          ? 'Školu se nepodařilo uložit'
          : 'Školu se nepodařilo odebrat z uložených',
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
      aria-label={isFavorite ? 'Odebrat z uložených' : 'Uložit školu'}
      title={isFavorite ? 'Odebrat z uložených' : 'Uložit školu'}
      data-pop={popping ? '' : undefined}
    >
      <Bookmark size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}

export default FavoriteButton;
