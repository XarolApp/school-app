import { ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 2 — THE ROLE FORK. The most structurally important screen in the app.
 *
 * ŠkolaMatch has TWO independent buyers. A 15-year-old will spend ~250 Kč of
 * their own money on a decision this consequential, and parents buy too. So the
 * flow asks who you are and branches VOICE (tykání/vykání), PROOF (peer vs
 * authority), MOTION (full vs restrained), PRICE FRAMING and QUESTION PHRASING.
 *
 * It never branches the scoring engine. A parent and their child answering
 * honestly must land on comparable results.
 *
 * This screen also passes the Core Paradox test twice over: it buys a genuinely
 * personalised first-run experience AND it qualifies the buyer.
 */
function RoleFork() {
  const { setRole, goNext, goBack } = useOnboarding();

  const choose = (role) => {
    setRole(role);
    goNext();
  };

  return (
    <ObScreen chrome={false}>
      <button type="button" className="ob-back ob-back-loose" onClick={goBack} aria-label="Zpět">
        <span aria-hidden="true">←</span>
      </button>
      <div className="ob-fork">
        <h1 className="ob-title">Kdo jsi?</h1>
        <p className="ob-lead">Podle toho přizpůsobíme otázky i výsledky.</p>

        <div className="ob-fork-cards">
          <button type="button" className="ob-fork-card" onClick={() => choose('student')}>
            <span className="ob-fork-emoji" aria-hidden="true">
              🎒
            </span>
            <strong>Jsem student</strong>
            <span className="ob-fork-sub">Vybírám si střední školu pro sebe.</span>
          </button>

          <button type="button" className="ob-fork-card" onClick={() => choose('parent')}>
            <span className="ob-fork-emoji" aria-hidden="true">
              👨‍👩‍👧
            </span>
            <strong>Jsem rodič</strong>
            <span className="ob-fork-sub">Pomáhám s výběrem svému dítěti.</span>
          </button>
        </div>

        <p className="ob-microcopy">
          Vybráno omylem? Roli změníš kdykoli později a odpovědi ti zůstanou.
        </p>
      </div>
    </ObScreen>
  );
}

export default RoleFork;
