import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { STUDENTS_HELPED } from '../../../config/socialProof';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 1 — Welcome + reassurance.
 *
 * "You've come to the right place" opener (§2.3 Pillar 1.1): frame the problem
 * and the solution inside the first three screens, because confusion kills
 * conversion. Role is unknown here, so the copy is written to work for both a
 * teenager and a parent — no tykání, no vykání, no assumptions.
 *
 * There is no user count in the headline because there is no honest number to
 * put there yet (see config/socialProof.js).
 */
function Welcome() {
  const { goNext } = useOnboarding();

  return (
    <ObScreen
      chrome={false}
      actions={
        <>
          <ObButton onClick={goNext}>Začít</ObButton>
          <p className="ob-microcopy">Zabere to asi 3 minuty. Nic se neplatí předem.</p>
        </>
      }
    >
      <div className="ob-hero">
        <span className="ob-logo">ŠkolaMatch</span>
        <h1 className="ob-title-xl">Jsi na správném místě.</h1>
        <p className="ob-lead">
          Vyber si střední školu v Praze podle toho, co tě baví a kam to máš daleko — ne podle toho,
          na kterou školu jsi náhodou narazil jako první.
        </p>
        {STUDENTS_HELPED && (
          <p className="ob-proof-line">Už {STUDENTS_HELPED.toLocaleString('cs-CZ')} deváťáků si tudy prošlo.</p>
        )}
      </div>
    </ObScreen>
  );
}

export default Welcome;
