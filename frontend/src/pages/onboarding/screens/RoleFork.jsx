import { useState } from 'react';
import { ArrowRight, Backpack, Users } from 'lucide-react';
import { ObScreen } from '../../../components/onboarding/ObKit';
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
  const { setRole, goNext, goBack } = useOnboarding();
  const [preview, setPreview] = useState('student');

  const choose = (role) => {
    setRole(role);
    goNext();
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
              className="ob-fork-card"
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

        <p className="ob-microcopy">
          Vybráno omylem? Roli změníš kdykoli později a odpovědi ti zůstanou.
        </p>
      </div>
    </ObScreen>
  );
}

export default RoleFork;
