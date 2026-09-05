import { useEffect, useState } from 'react';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { usePrefersReducedMotion } from '../../../components/onboarding/usePrefersReducedMotion';
import { useOnboarding } from '../useOnboarding';

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
 * text, district hop distances, explanation assembly. Faking a step the code
 * does not perform would be the same lie as a fake percentage. The running step
 * gets a genuinely indeterminate bar, because there is no honest number to
 * report for a sub-second computation.
 *
 * Under prefers-reduced-motion the animation is dropped and the wait is cut to
 * a minimum; the user still sees the labels, just without motion.
 */
const SUB_STEPS = {
  student: [
    'Porovnávám pražské střední školy',
    'Počítám dojezd do částí, které jsi vybral',
    'Připravuji vysvětlení u každé školy',
  ],
  parent: [
    'Porovnáváme pražské střední školy',
    'Vyhodnocujeme dostupnost vybraných částí Prahy',
    'Připravujeme odůvodnění u každé školy',
  ],
};

const STEP_MS = 1050; // 3 x 1050 = 3.15s total, inside the 2.5-4.0s window.

function Calculating() {
  const { role, goNext, schoolsLoading, schools } = useOnboarding();
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const parent = role === 'parent';
  const steps = SUB_STEPS[parent ? 'parent' : 'student'];
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
            ? `Vaše odpovědi proti ${total || 'šedesáti'} pražským školám. Chvilku to trvá, ale ne dlouho.`
            : `Tvoje odpovědi proti ${total || 'šedesáti'} pražským školám. Chvilku to trvá, ale ne dlouho.`}
        </p>

        <ol className="ob-calc-steps" aria-live="polite">
          {steps.map((label, i) => {
            const state = i < index ? 'done' : i === index ? 'now' : 'next';
            return (
              <li key={label} className={`ob-calc-step is-${state}`}>
                <span className="ob-calc-row">
                  <span className="ob-calc-mark" aria-hidden="true">
                    {state === 'done' ? '✓' : state === 'now' ? '◐' : '·'}
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

        {/* True today and worth saying: the matching runs entirely in the
            browser (lib/matching.js), so quiz answers never reach the server.
            That is also the single strongest trust claim available on the
            parent branch, where methodology transparency is the right proof. */}
        <div className="ob-calc-note">
          <p>
            <strong>
              {parent
                ? 'Počítá se to přímo ve vašem prohlížeči.'
                : 'Počítá se to přímo u tebe v prohlížeči.'}
            </strong>{' '}
            {parent
              ? 'Odpovědi na náš server vůbec neodcházejí — výpočet je pro všechny stejný a je veřejně popsaný.'
              : 'Tvoje odpovědi na náš server vůbec neodcházejí — matematika je stejná pro všechny a je veřejně popsaná.'}
          </p>
        </div>
      </div>
    </ObScreen>
  );
}

export default Calculating;
