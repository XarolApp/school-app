import { useEffect, useState } from 'react';
import { Heart, GitCompare, Share2, Check, ListPlus } from 'lucide-react';
import { addFavorite, removeFavorite, fetchPicks, savePicks } from '../../api';
import { toggleCompareSelection, isInCompareSelection } from '../../lib/searchPrefs';
import { useToast } from '../ToastContext';
import { useAuth } from '../AuthContext';
import { parseSchoolContact } from '../../lib/schoolContact';

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
function SchoolActions({ school, isFavorite, onFavoriteChange, barRef }) {
  const { isSignedIn, hasAccess } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [compared, setCompared] = useState(() => isInCompareSelection(school.id));
  const [picks, setPicks] = useState(null); // null = not loaded yet
  const [savingPick, setSavingPick] = useState(false);
  const contacts = parseSchoolContact(school.contact);

  const canFavorite = isSignedIn && hasAccess;

  useEffect(() => {
    if (!canFavorite) return;
    let cancelled = false;
    fetchPicks()
      .then((picks) => {
        if (!cancelled) setPicks(picks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canFavorite]);

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
    try {
      const next = toggleCompareSelection(school.id);
      setCompared(next.includes(school.id));
      toast(next.includes(school.id) ? 'Přidáno k porovnání' : 'Odebráno z porovnání');
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  };

  const isPicked = picks?.some((pick) => pick.school.id === school.id) ?? false;

  const handleTogglePick = async () => {
    if (!canFavorite || picks === null || savingPick) return;
    const nextPicks = isPicked ? picks.filter((pick) => pick.school.id !== school.id) : [...picks, { school }];

    if (!isPicked && picks.length >= 3) {
      toast('Do přihlášky patří nejvýš 3 školy. Nejdřív jednu odeber na stránce Moje přihláška.', {
        type: 'error',
      });
      return;
    }

    setPicks(nextPicks);
    setSavingPick(true);
    try {
      await savePicks(nextPicks.map((pick) => ({
        schoolId: pick.school.id,
        oborKkov: pick.obor_kkov,
        oborNazev: pick.obor_nazev,
      })));
      toast(isPicked ? 'Odebráno z přihlášky' : 'Přidáno do přihlášky');
    } catch (err) {
      setPicks(picks);
      toast(err.message || 'Nepodařilo se upravit přihlášku.', { type: 'error' });
    } finally {
      setSavingPick(false);
    }
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

  const compareButton = (
    <button type="button" className="ss-btn ss-btn-secondary" onClick={handleCompare}>
      {compared ? <Check size={16} aria-hidden="true" /> : <GitCompare size={16} aria-hidden="true" />}
      {compared ? 'K porovnání' : 'Přidat k porovnání'}
    </button>
  );
  const shareButton = (
    <button type="button" className="ss-btn ss-btn-secondary" onClick={handleShare}>
      <Share2 size={16} aria-hidden="true" />
      Sdílet školu
    </button>
  );

  // Desktop shows one rail in this order. On mobile the "primary" group is the
  // fixed bottom bar — two actions, never more — and "secondary" flows under
  // the hero. Without favourite access the bar is compare + share.
  return (
    <div className="sd-actions">
      <div className="sd-actions-primary" ref={barRef}>
        {canFavorite && (
          <button type="button" className="ss-btn ss-btn-primary" onClick={handleSave} disabled={saving}>
            <Heart size={16} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Uloženo' : 'Uložit do oblíbených'}
          </button>
        )}
        {compareButton}
        {!canFavorite && shareButton}
      </div>
      {canFavorite && (
        <div className="sd-actions-secondary">
          <button type="button" className="ss-btn ss-btn-secondary" onClick={handleTogglePick} disabled={picks === null || savingPick}>
            {isPicked ? <Check size={16} aria-hidden="true" /> : <ListPlus size={16} aria-hidden="true" />}
            {isPicked ? 'V přihlášce' : 'Přidat do přihlášky'}
          </button>
          {shareButton}
        </div>
      )}

      <div className="sd-actions-divider" />
      <div className="sd-actions-links">
        {school.website && (
          <a href={school.website} target="_blank" rel="noopener noreferrer">
            {school.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
        {contacts.map((contact, index) =>
          contact.href ? (
            <a href={contact.href} key={`${contact.type}-${contact.label}-${index}`}>
              {contact.label}
            </a>
          ) : (
            <span key={`${contact.type}-${contact.label}-${index}`}>{contact.label}</span>
          ),
        )}
      </div>
    </div>
  );
}

export default SchoolActions;
