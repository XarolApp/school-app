import { useMemo } from 'react';
import { explain } from '../../lib/matching';
import { useOnboarding } from '../../pages/onboarding/useOnboarding';

/**
 * The user's own #1 result, compact — used as the desktop side panel on the
 * screens between the reveal and the paywall (proof, account). Seeing the
 * artefact they already have is what makes "save it" and "trust it" concrete
 * (Mobbin: signup as the door to a thing already built).
 *
 * Band + named reasons only, never a percentage, same as the reveal.
 */
export default function TopMatchCard({ result, answers, role, label, footer }) {
  const { gender } = useOnboarding();
  const reasons = useMemo(
    () => (result ? explain(result, answers, role || 'student', gender).slice(0, 3) : []),
    [result, answers, role, gender],
  );
  if (!result) return null;
  return (
    <div className="ob-tm">
      {label && <p className="ob-tm-label">{label}</p>}
      <article className="ob-tm-card">
        <p className="ob-tm-rank">{role === 'parent' ? 'Nejvyšší shoda' : 'Tvoje nejlepší shoda'}</p>
        <h2 className="ob-tm-name">{result.school.name}</h2>
        <p className={`ob-hero-band ob-band-${result.band.tone}`}>
          <span className="ob-hero-dot" aria-hidden="true" />
          {result.band.label}
        </p>
        {reasons.length > 0 && (
          <ul className="ob-tm-why">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </article>
      {footer}
    </div>
  );
}
