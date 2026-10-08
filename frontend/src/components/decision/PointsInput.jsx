import { useState } from 'react';
import { saveDecisionProfile } from '../../api';

// Whole points only: the exam never awards half a point.
const toWhole = (value) => (value === '' ? null : Number(value));
const validWhole = (n, max = 100) => n === null || (Number.isInteger(n) && n >= 0 && n <= max);
const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, 3);

/**
 * JPZ score entry for the risk analysis: the student's current, most realistic
 * score (no mock-vs-real choice) plus an optional guess of how many points they
 * will still add before the real exam. "Body ještě nemám" stays possible — the
 * risk analysis degrades gracefully without a number.
 */
function PointsInput({ profile, onSaved }) {
  const [points, setPoints] = useState(profile?.jpz_points != null ? String(Math.round(profile.jpz_points)) : '');
  const [gain, setGain] = useState(profile?.jpz_expected_gain != null ? String(profile.jpz_expected_gain) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hasPoints = profile?.jpz_points != null;
  const current = toWhole(points), expected = toWhole(gain);
  const projected = current !== null && expected !== null && current + expected <= 100 ? current + expected : null;

  const handleSave = async () => {
    if (!validWhole(current)) { setError('Zadej celé číslo mezi 0 a 100.'); return; }
    if (!validWhole(expected)) { setError('Zlepšení zadej jako celé číslo mezi 0 a 100.'); return; }
    if (current !== null && expected !== null && current + expected > 100) { setError('Dohromady to dává víc než 100 bodů. Zkus odhad zlepšení snížit.'); return; }
    setError(null);
    setSaving(true);
    try {
      const gainValue = current === null ? null : expected;
      await saveDecisionProfile({ jpzPoints: current, expectedGain: gainValue });
      onSaved?.({ ...profile, jpz_points: current, jpz_source: current === null ? null : 'nanecisto', jpz_expected_gain: gainValue });
    } catch (err) {
      setError(err.message || 'Nepodařilo se uložit.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveDecisionProfile({ jpzPoints: null, expectedGain: null });
      setPoints('');
      setGain('');
      onSaved?.({ ...profile, jpz_points: null, jpz_source: null, jpz_expected_gain: null });
    } catch (err) {
      setError(err.message || 'Nepodařilo se uložit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dp-points">
      <label className="dp-points-label" htmlFor="jpz-points">Na kolika bodech jsi teď</label>
      <div className="dp-points-row">
        <div className="dp-points-field">
          <input
            id="jpz-points" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3}
            className="dp-points-input" placeholder="—" value={points}
            onChange={(e) => setPoints(digitsOnly(e.target.value))}
          />
          <span className="dp-points-suffix">/ 100 b.</span>
        </div>
      </div>
      <p className="ss-caption">
        Součet bodů z češtiny a matematiky (nejvýš 50 + 50). Zadej svůj nejnovější nebo nejrealističtější výsledek,
        třeba z testu nanečisto nebo z cvičných testů. Když se výsledky liší, napiš průměr.
      </p>

      <label className="dp-points-label" htmlFor="jpz-gain">Kolik bodů si myslíš, že do přijímaček ještě přidáš?</label>
      <div className="dp-points-row">
        <div className="dp-points-field">
          <span className="dp-points-suffix">+</span>
          <input
            id="jpz-gain" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3}
            className="dp-points-input" placeholder="0" value={gain}
            onChange={(e) => setGain(digitsOnly(e.target.value))}
          />
          <span className="dp-points-suffix">b.</span>
        </div>
        <button type="button" className="ss-btn ss-btn-secondary ss-btn-sm" onClick={handleSave} disabled={saving}>
          Uložit
        </button>
      </div>
      {projected !== null && <p className="ss-caption dp-points-projected">Odhad u přijímaček: <strong>{projected} b.</strong></p>}

      {error && <p className="dp-points-error" role="alert">{error}</p>}

      {hasPoints && (
        <button type="button" className="dp-points-clear" onClick={handleClear} disabled={saving}>
          Body ještě nemám →
        </button>
      )}
    </div>
  );
}

export default PointsInput;
