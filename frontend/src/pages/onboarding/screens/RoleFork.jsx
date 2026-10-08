import { useState } from 'react';
import { ArrowRight, Backpack, Users } from 'lucide-react';
import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { QUESTIONS } from '../quizQuestions';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 2 — THE ROLE FORK. The most structurally important screen in the app.
 *
 * Střední na míru has TWO independent buyers. A 15-year-old will spend ~250 Kč of
 * their own money on a decision this consequential, and parents buy too. So the
 * flow asks who you are and branches VOICE (tykání/vykání), PROOF (peer vs
 * authority), MOTION (full vs restrained), PRICE FRAMING and QUESTION PHRASING.
 *
 * It never branches the scoring engine. A parent and their child answering
 * honestly must land on comparable results.
 *
 * Redesigned 2026-09-27: icons instead of emoji (emoji-per-option is a named
 * anti-pattern in the Mobbin survey), larger cards, and a desktop side panel
 * that previews the real first question in the hovered voice — so the choice
 * visibly does something before it is made.
 */
const Q = QUESTIONS[0];

const ROLES = [
  {
    id: 'student',
    Icon: Backpack,
    title: 'Jsem student',
    sub: 'Vybírám si střední školu pro sebe.',
    tag: 'Tykáme ti',
  },
  {
    id: 'parent',
    Icon: Users,
    title: 'Jsem rodič',
    sub: 'Pomáhám s výběrem svému dítěti.',
    tag: 'Vykáme vám',
  },
];

function RoleFork() {
  const { role, setRole, gender, setGender, goNext, goBack } = useOnboarding();
  const [selectedRole, setSelectedRole] = useState(role);
  const [preview, setPreview] = useState(role || 'student');

  const choose = (role) => {
    setRole(role);
    setSelectedRole(role);
    if (role === 'parent') goNext();
  };

  const q = Q[preview];

  return (
    <ObScreen
      chrome={false}
      center
      asideVariant="showcase"
      aside={
        <div className="ob-voice" aria-hidden="true">
          <p className="ob-voice-label">První otázka pro {preview === 'parent' ? 'rodiče' : 'studenty'}</p>
          <div className="ob-voice-card" key={preview}>
            <span className="ob-voice-step">Otázka 1 z {QUESTIONS.length}</span>
            <p className="ob-voice-title">{q.title}</p>
            <p className="ob-voice-hint">{q.hint}</p>
            <div className="ob-voice-opts">
              {Q.options.slice(0, 5).map((o, i) => (
                <span key={o.value} className={i === 1 ? 'is-on' : undefined}>{o.label}</span>
              ))}
            </div>
          </div>
          <p className="ob-voice-note">Otázky i výsledek se přizpůsobí. Počítá se ale stejně.</p>
        </div>
      }
    >
      <button type="button" className="ob-back ob-back-loose" onClick={goBack} aria-label="Zpět">
        <span aria-hidden="true">←</span>
      </button>
      <div className="ob-fork ob-enter">
        <h1 className="ob-title-xl">Kdo jsi?</h1>
        <p className="ob-lead">Podle toho přizpůsobíme otázky i výsledky.</p>

        <div className="ob-fork-cards">
          {ROLES.map(({ id, Icon, title, sub, tag }) => (
            <button
              key={id}
              type="button"
              className={`ob-fork-card${selectedRole === id ? ' is-selected' : ''}`}
              aria-pressed={selectedRole === id}
              onClick={() => choose(id)}
              onPointerEnter={() => setPreview(id)}
              onFocus={() => setPreview(id)}
            >
              <span className="ob-fork-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={1.8} />
              </span>
              <span className="ob-fork-text">
                <strong>{title}</strong>
                <span className="ob-fork-sub">{sub}</span>
              </span>
              <span className="ob-fork-tag">{tag}</span>
              <ArrowRight className="ob-fork-go" size={20} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className={`ob-gender-reveal${selectedRole === 'student' ? ' is-open' : ''}`} aria-hidden={selectedRole !== 'student'} inert={selectedRole !== 'student'}>
          <div className="ob-gender-inner">
            <fieldset className="ob-gender-fieldset">
              <legend>Jak tě máme oslovovat?</legend>
              <div className="ob-gender-options">
                {[
                  ['m', 'Jako žáka'],
                  ['f', 'Jako žákyni'],
                  ['u', 'Nechci uvádět'],
                ].map(([value, label]) => (
                  <label key={value} className={`ob-gender-option${gender === value ? ' is-selected' : ''}`}>
                    <input type="radio" name="onboarding-gender" value={value} checked={gender === value} onChange={() => setGender(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p className="ob-gender-caption">Jen abychom ti psali správně (např. „vybral/vybrala“). Nic jiného se z toho neodvozuje.</p>
            </fieldset>
            <ObButton onClick={goNext}>Pokračovat <ArrowRight size={18} aria-hidden="true" /></ObButton>
          </div>
        </div>

        <p className="ob-microcopy">
          Roli můžeš změnit i později a odpovědi ti zůstanou.
        </p>
      </div>
    </ObScreen>
  );
}

export default RoleFork;
