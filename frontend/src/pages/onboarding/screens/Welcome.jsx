import { Link } from 'react-router-dom';
import { Calculator, Database, ShieldCheck } from 'lucide-react';
import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import MatchPreview from '../../../components/onboarding/MatchPreview';
import { PhoneLoop } from '../../../components/landing/ProductScreens';
import { STUDENTS_HELPED } from '../../../config/socialProof';
import { useOnboarding } from '../useOnboarding';
import { QUIZ_MINUTES } from '../../../config/facts';

/**
 * Screen 1 — Welcome + reassurance.
 *
 * "You've come to the right place" opener (§2.3 Pillar 1.1): frame the problem
 * and the solution inside the first three screens, because confusion kills
 * conversion. Role is unknown here, so the copy is written to work for both a
 * teenager and a parent — no tykání, no vykání, no assumptions.
 *
 * Redesigned 2026-09-27: the empty photo slot is gone. The product itself is
 * the visual — a live phone loop in the desktop side panel (the split-screen
 * signup pattern Buffer, Supabase and SchoolAI ship), and on phones a compact
 * preview of 223 schools narrowing to a short list, from real counts.
 *
 * There is no user count in the headline because there is no honest number to
 * put there yet (see config/socialProof.js).
 */
const TRUST = [
  { Icon: Database, title: 'Všechny pražské střední školy', body: 'Gymnázia, odborné i učební obory' },
  { Icon: ShieldCheck, title: 'Veřejné zdroje', body: 'Cermat a MŠMT, u každého čísla rok' },
  { Icon: Calculator, title: 'Žádné skóre o tobě', body: 'Hodnotíme shodu se školou, ne tebe' },
];

function Welcome() {
  const { goNext, schools } = useOnboarding();

  return (
    <ObScreen
      chrome={false}
      center
      asideVariant="showcase"
      aside={
        <div className="ob-showcase">
          <PhoneLoop />
          <p className="ob-showcase-caption">Takhle to vypadá uvnitř</p>
        </div>
      }
      actions={
        <>
          <ObButton onClick={goNext}>
            Začít <span className="ob-btn-arrow" aria-hidden="true">→</span>
          </ObButton>
          <p className="ob-microcopy">Asi {QUIZ_MINUTES} minuty · bez registrace · nic se neplatí předem</p>
          <p className="ob-microcopy ob-signin-hint">
            Už máš účet? <Link to="/prihlaseni" className="ob-inline-link">Přihlásit se</Link>
          </p>
        </>
      }
    >
      <div className="ob-hero ob-enter">
        <span className="ob-logo">ŠkolaMatch</span>
        <h1 className="ob-title-xl">Jsi na správném místě.</h1>
        <p className="ob-lead">
          Vyber si střední školu v Praze podle toho, co tě baví a kam to máš daleko — ne podle toho,
          na kterou školu jsi náhodou narazil jako první.
        </p>
        {STUDENTS_HELPED && (
          <p className="ob-proof-line">Už {STUDENTS_HELPED.toLocaleString('cs-CZ')} deváťáků si tudy prošlo.</p>
        )}

        <div className="ob-welcome-preview">
          <MatchPreview schools={schools} />
        </div>

        <ul className="ob-welcome-trust">
          {TRUST.map(({ Icon, title, body }) => (
            <li key={title}>
              <span className="ob-trust-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span>
                <strong>{title}</strong>
                {body}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ObScreen>
  );
}

export default Welcome;
