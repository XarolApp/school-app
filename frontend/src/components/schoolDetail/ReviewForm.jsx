import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addSchoolReview } from '../../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

const ROLES = [
  { id: 'student', label: 'Student' },
  { id: 'absolvent', label: 'Absolvent' },
  { id: 'rodic', label: 'Rodič' },
  { id: 'ucitel', label: 'Učitel nebo zaměstnanec' },
  { id: 'navstevnik', label: 'Byl/a jsem na dni otevřených dveří' },
];

// Only an adult role may ever show a real name — never a student or
// absolvent, whatever the checkbox says. Enforced again, harder, on the
// server (GDPR Art. 8 — Czech digital age of consent is 15; our core users
// are 14-15-year-old 9th graders).
const ADULT_ROLES = new Set(['rodic', 'ucitel']);

function ReviewForm({ schoolId, onSubmitted }) {
  const { isSignedIn, emailConfirmed } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState('student');
  const [body, setBody] = useState('');
  const [oborNazev, setOborNazev] = useState('');
  const [showName, setShowName] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  if (!isSignedIn) {
    return (
      <div className="sd-form-signin-prompt">
        Chceš napsat recenzi? <Link to="/prihlaseni">Přihlas se</Link> nebo si
        vytvoř účet.
      </div>
    );
  }

  if (!emailConfirmed) {
    return (
      <div className="sd-form-signin-prompt">
        Nejdřív si potvrď e-mail — teprve pak můžeš psát recenze.
      </div>
    );
  }

  const isAdultRole = ADULT_ROLES.has(role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 40) {
      setError('Recenze musí mít alespoň 40 znaků.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const review = await addSchoolReview(schoolId, {
        role,
        oborNazev: oborNazev.trim() || null,
        body: trimmed,
        showName: isAdultRole && showName,
      });
      onSubmitted(review);
      setBody('');
      setOborNazev('');
      setShowName(false);
      toast(
        review.display_name || review.verified
          ? 'Recenze zveřejněna'
          : 'Recenze uložena — pokud čeká na kontrolu, uvidíš to jen ty'
      );
    } catch (err) {
      setError(err.message || 'Recenzi se nepodařilo uložit.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="sd-review-form" onSubmit={handleSubmit}>
      <h3 className="sd-review-form-title">Napsat recenzi</h3>

      <div className="sd-form-field">
        <div className="sd-form-field-label">Kdo jsi vůči téhle škole</div>
        <div className="sd-role-chips">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`sd-role-chip${role === r.id ? ' is-selected' : ''}`}
              onClick={() => {
                setRole(r.id);
                if (!ADULT_ROLES.has(r.id)) setShowName(false);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sd-form-field">
        <div className="sd-form-field-label">Obor (nepovinné)</div>
        <input
          type="text"
          className="sd-textarea"
          style={{ minHeight: 'auto' }}
          placeholder="např. Informační technologie"
          value={oborNazev}
          onChange={(e) => setOborNazev(e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="sd-form-field">
        <div className="sd-form-field-label">Jak to tu je</div>
        <textarea
          className="sd-textarea"
          placeholder="Napiš, co bys sám chtěl vědět, než sis školu vybral…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <p className="sd-form-hint">
          Piš jen o tom, co sám znáš. Nepiš jména učitelů ani spolužáků — takové
          recenze automaticky pozdržíme.
        </p>
      </div>

      {isAdultRole && (
        <label className="sd-name-opt-in">
          <input
            type="checkbox"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
            style={{ marginTop: 4 }}
          />
          <span>
            <span className="sd-name-opt-in-title">Zveřejnit pod křestním jménem</span>
            <span className="sd-name-opt-in-body">
              Bez zaškrtnutí se recenze zobrazí pod rolí, bez jména. U studentů a
              absolventů tuto možnost schválně nenabízíme.
            </span>
          </span>
        </label>
      )}

      {error && <p className="sd-form-error">{error}</p>}

      <div className="sd-form-actions">
        <button type="submit" className="ss-btn ss-btn-primary" disabled={sending}>
          {sending ? 'Odesílám…' : 'Odeslat recenzi'}
        </button>
        <span className="sd-form-hint">Recenzi můžeš kdykoliv smazat.</span>
      </div>
    </form>
  );
}

export default ReviewForm;
