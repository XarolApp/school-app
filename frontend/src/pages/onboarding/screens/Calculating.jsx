import { useEffect, useState } from 'react';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { usePrefersReducedMotion } from '../../../components/onboarding/usePrefersReducedMotion';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 18 — Labour illusion.
 *
 * Buell & Norton: people rate identical output as higher quality when they
 * watch the work happen. Ruling C-2 sets the web budget at 2.5-4.0s total,
 * split across three labelled sub-steps so no single wait exceeds ~1.5s. Web
 * users abandon faster than iOS users; past 4s the perceived-quality gain
 * inverts into suspicion.
 *
 * The steps below are NOT theatre — each names work the matcher genuinely does
 * (feature extraction from programs text, district hop distances, explanation
 * assembly). Faking a step the code does not perform would be the same lie as
 * a fake percentage.
 *
 * Under prefers-reduced-motion the animation is dropped and the wait is cut to
 * a minimum; the user still sees the labels, just without motion.
 */
const SUB_STEPS = {
  student: [
    'Procházíme pražské střední školy…',
    'Počítáme vzdálenosti podle městských částí…',
    'Skládáme vysvětlení, proč ti která sedí…',
  ],
  parent: [
    'Procházíme pražské střední školy…',
    'Vyhodnocujeme dostupnost podle městských částí…',
    'Připravujeme odůvodnění u každé školy…',
  ],
};

const STEP_MS = 1050; // 3 x 1050 = 3.15s total, inside the C-2 window.

function Calculating() {
  const { role, goNext, schoolsLoading } = useOnboarding();
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const steps = SUB_STEPS[role === 'parent' ? 'parent' : 'student'];
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

  return (
    <ObScreen chrome={false}>
      <div className="ob-calc">
        <div className={`ob-calc-ring${reduced ? ' is-static' : ''}`} aria-hidden="true" />
        <h1 className="ob-title">
          {role === 'parent' ? 'Připravujeme výsledky' : 'Počítáme tvoje výsledky'}
        </h1>
        <ul className="ob-calc-steps" aria-live="polite">
          {steps.map((label, i) => (
            <li
              key={label}
              className={i < index ? 'is-done' : i === index ? 'is-active' : 'is-pending'}
            >
              <span className="ob-calc-mark" aria-hidden="true">
                {i < index ? '✓' : '•'}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </ObScreen>
  );
}

export default Calculating;
