import { useEffect, useState } from 'react';
import { Check, Circle, Loader } from 'lucide-react';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { usePrefersReducedMotion } from '../../../components/onboarding/usePrefersReducedMotion';
import { useOnboarding } from '../useOnboarding';
import { SCHOOL_COUNT } from '../../../config/facts';

/**
 * Labour illusion.
 *
 * Buell & Norton: people rate identical output as higher quality when they
 * watch the work happen. The web budget is 2.5-4.0s total, split across three
 * labelled sub-steps so no single wait exceeds ~1.5s. Web users abandon faster
 * than iOS users, and past 4s the perceived-quality gain inverts into
 * suspicion — so this must never be padded to feel more impressive.
 *
 * ITEMISED, not a bare spinner and not a percentage (onboarding-v2): each row
 * names work the matcher genuinely does — feature extraction from the programs
 * text, comparing MHD minutes with the limit (only when one was set), explanation assembly. Faking a step the code
 * does not perform would be the same lie as a fake percentage. The running step
 * gets a genuinely indeterminate bar, because there is no honest number to
 * report for a sub-second computation.
 *
 * Under prefers-reduced-motion the animation is dropped and the wait is cut to
 * a minimum; the user still sees the labels, just without motion.
 */
// The middle step names the commute work only when there is commute work to do.
const SUB_STEPS = {
  student: [
    'Porovnávám pražské střední školy',
    'Vážím tvoje odpovědi u každé školy',
    'Připravuji vysvětlení u každé školy',
  ],
  parent: [
    'Porovnáváme pražské střední školy',
    'Vážíme vaše odpovědi u každé školy',
    'Připravujeme odůvodnění u každé školy',
  ],
};
const COMMUTE_STEP = {
  student: 'Porovnávám dojezd MHD z tvé zastávky s tvým limitem',
  parent: 'Porovnáváme dojezd MHD z vybrané zastávky s nastaveným limitem',
};

const STEP_MS = 1050; // 3 x 1050 = 3.15s total, inside the 2.5-4.0s window.

function Calculating() {
  const { role, goNext, schoolsLoading, schools, cleanedAnswers } = useOnboarding();
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const parent = role === 'parent';
  const commuteSet = Boolean(cleanedAnswers?.commuteStop) && Number(cleanedAnswers?.commuteLimit) >= 1;
  const steps = (parent ? SUB_STEPS.parent : SUB_STEPS.student).map((step, i) => (
    i === 1 && commuteSet ? COMMUTE_STEP[parent ? 'parent' : 'student'] : step
  ));
  const stepMs = reduced ? 400 : STEP_MS;

  useEffect(() => {
    if (index >= steps.length) return undefined;
    const t = setTimeout(() => setIndex((i) => i + 1), stepMs);
    return () => clearTimeout(t);
  }, [index, steps.length, stepMs]);

  useEffect(() => {
    // Never advance before the catalogue has actually arrived — the reveal must
    // not open on an empty list just because the timer ran out.
    if (index >= steps.length && !schoolsLoading) goNext();
  }, [index, steps.length, schoolsLoading, goNext]);

  const total = schools.length;

  return (
    <ObScreen chrome={false}>
      <div className="ob-calc">
        <h1 className="ob-title ob-calc-title">
          {parent ? 'Skládáme výsledek' : 'Skládám tvůj výsledek'}
        </h1>
        <p className="ob-lead ob-calc-sub">
          {parent
            ? `Vaše odpovědi proti ${total || SCHOOL_COUNT} pražským školám. Chvilku to trvá, ale ne dlouho.`
            : `Tvoje odpovědi proti ${total || SCHOOL_COUNT} pražským školám. Chvilku to trvá, ale ne dlouho.`}
        </p>

        <ol className="ob-calc-steps" role="status" aria-live="polite">
          {steps.map((label, i) => {
            const state = i < index ? 'done' : i === index ? 'now' : 'next';
            return (
              <li key={label} className={`ob-calc-step is-${state}`}>
                <span className="ob-calc-row">
                  <span className="ob-calc-mark" aria-hidden="true">
                    {state === 'done' ? <Check size={16} /> : state === 'now' ? <Loader size={16} /> : <Circle size={12} />}
                  </span>
                  <span className="ob-calc-text">
                    {label}
                    {i === 1 && total ? ` (${total})` : ''}
                  </span>
                  <span className="ob-calc-state">
                    {state === 'done' ? 'hotovo' : state === 'now' ? 'právě teď' : ''}
                  </span>
                </span>
                {state === 'now' && (
                  <span className={`ob-calc-bar${reduced ? ' is-static' : ''}`} aria-hidden="true">
                    <span className="ob-calc-bar-fill" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Matching runs locally; account answer persistence is separate. */}
        <div className="ob-calc-note">
          <p>
            <strong>
              {parent
                ? 'Počítá se to přímo ve vašem prohlížeči.'
                : 'Počítá se to přímo u tebe v prohlížeči.'}
            </strong>{' '}
            {parent
              ? 'Výpočet je pro všechny stejný.'
              : 'Matematika je stejná pro všechny.'}
          </p>
        </div>
      </div>
    </ObScreen>
  );
}

export default Calculating;
