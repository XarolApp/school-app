import { useState } from 'react';
import { saveDecisionProfile } from '../../api';

/**
 * JPZ score entry for the risk analysis. Deliberately lets the student say
 * "nemám ještě body" — most 9th graders sit a September mock ("nanečisto")
 * before the real exam, but not all of them, and the risk analysis must
 * degrade gracefully (show cutoffs with no verdict) rather than force a
 * number out of someone who doesn't have one yet.
 */
function PointsInput({ profile, onSaved }) {
  const [points, setPoints] = useState(profile?.jpz_points ?? '');
  const [source, setSource] = useState(profile?.jpz_source ?? 'nanecisto');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hasPoints = profile?.jpz_points != null;

  const handleSave = async () => {
    const value = points === '' ? null : Number(points);
    if (value !== null && (Number.isNaN(value) || value < 0 || value > 100)) {
      setError('Zadej číslo mezi 0 a 100.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveDecisionProfile({ jpzPoints: value, jpzSource: value === null ? null : source });
      onSaved?.({ jpz_points: value, jpz_source: value === null ? null : source });
    } catch (err) {
      setError(err.message || 'Nepodařilo se uložit.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setPoints('');
    setError(null);
    setSaving(true);
    try {
      await saveDecisionProfile({ jpzPoints: null, jpzSource: null });
      onSaved?.({ jpz_points: null, jpz_source: null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dp-points">
      <div className="dp-points-row">
        <div className="dp-points-field">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            className="dp-points-input"
            placeholder="—"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            aria-label="Tvoje body z přijímaček"
          />
          <span className="dp-points-suffix">/ 100 b.</span>
        </div>
        <button type="button" className="ss-btn ss-btn-secondary ss-btn-sm" onClick={handleSave} disabled={saving}>
          Uložit
        </button>
      </div>

      <div className="dp-points-source">
        <label>
          <input
            type="radio"
            name="jpz-source"
            checked={source === 'nanecisto'}
            onChange={() => setSource('nanecisto')}
          />
          Nanečisto (září)
        </label>
        <label>
          <input type="radio" name="jpz-source" checked={source === 'ostra'} onChange={() => setSource('ostra')} />
          Ostrá zkouška
        </label>
      </div>

      {error && <p className="dp-points-error">{error}</p>}

      <p className="ss-caption">
        Průměr z češtiny a matematiky. Většina deváťáků si zkoušku nanečisto píše v září — zadej výsledek odtud, nebo
        z ostré zkoušky, jakmile ji máš.
      </p>

      {hasPoints && (
        <button type="button" className="dp-points-clear" onClick={handleClear} disabled={saving}>
          Body ještě nemám →
        </button>
      )}
    </div>
  );
}

export default PointsInput;
