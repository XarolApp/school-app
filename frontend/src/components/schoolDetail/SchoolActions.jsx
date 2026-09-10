import { useState } from 'react';
import { Heart, GitCompare, Share2, Check } from 'lucide-react';
import { addFavorite, removeFavorite } from '../../api';
import { toggleCompareSelection, isInCompareSelection } from '../../lib/searchPrefs';
import { useToast } from '../ToastContext';
import { useAuth } from '../AuthContext';

/**
 * The three primary actions on a school page. Accent fill goes on exactly
 * ONE of them (Uložit) — tokens.js's rule that accent carries one thing per
 * screen. The other two are secondary outline buttons.
 *
 * Save/unsave follows the same optimistic-update + toast pattern as
 * FavoriteButton.jsx (that component renders a star icon meant for list
 * rows; this needs a full labelled button, so the logic is repeated rather
 * than the component reused).
 */
function SchoolActions({ school, isFavorite, onFavoriteChange }) {
  const { isSignedIn, hasAccess } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [compared, setCompared] = useState(() => isInCompareSelection(school.id));

  const canFavorite = isSignedIn && hasAccess;

  const handleSave = async () => {
    if (!canFavorite || saving) return;
    const next = !isFavorite;
    onFavoriteChange(next);
    setSaving(true);
    try {
      if (next) await addFavorite(school.id);
      else await removeFavorite(school.id);
      toast(next ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených');
    } catch {
      onFavoriteChange(!next);
      toast('Uložení se nepodařilo', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCompare = () => {
    const next = toggleCompareSelection(school.id);
    setCompared(next.includes(school.id));
    toast(
      next.includes(school.id)
        ? 'Přidáno k porovnání'
        : 'Odebráno z porovnání'
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: school.name, url });
      } catch {
        // User cancelled the share sheet — not an error, nothing to say.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Odkaz zkopírován do schránky');
    } catch {
      toast('Odkaz se nepodařilo zkopírovat', { type: 'error' });
    }
  };

  return (
    <div className="sd-actions">
      {canFavorite && (
        <button type="button" className="ss-btn ss-btn-primary" onClick={handleSave} disabled={saving}>
          <Heart size={16} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
          {isFavorite ? 'Uloženo' : 'Uložit do oblíbených'}
        </button>
      )}
      <button type="button" className="ss-btn ss-btn-secondary" onClick={handleCompare}>
        {compared ? <Check size={16} aria-hidden="true" /> : <GitCompare size={16} aria-hidden="true" />}
        {compared ? 'K porovnání' : 'Přidat k porovnání'}
      </button>
      <button type="button" className="ss-btn ss-btn-secondary" onClick={handleShare}>
        <Share2 size={16} aria-hidden="true" />
        Sdílet školu
      </button>

      <div className="sd-actions-divider" />
      <div className="sd-actions-links">
        {school.website && (
          <a href={school.website} target="_blank" rel="noopener noreferrer">
            {school.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
        {school.contact && <a href={`mailto:${school.contact}`}>{school.contact}</a>}
      </div>
    </div>
  );
}

export default SchoolActions;
