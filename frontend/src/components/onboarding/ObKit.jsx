import { useMemo } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Shared onboarding UI kit.
 *
 * Everything here is mobile-first (a 15-year-old meets this on a phone) and
 * every animation is gated behind prefers-reduced-motion.
 */

export function ObProgress({ percent, label }) {
  return (
    <div className="ob-progress" role="group" aria-label="Průběh">
      <div
        className="ob-progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Průběh dotazníku"
      >
        <div className="ob-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {label && <span className="ob-progress-label">{label}</span>}
    </div>
  );
}

/**
 * Standard screen frame: back arrow, progress, content, sticky action bar.
 * `wide` drops the narrow column for reveal/paywall screens.
 */
export function ObScreen({
  children,
  onBack,
  progress,
  progressLabel,
  actions,
  wide = false,
  chrome = true,
}) {
  return (
    <div className={`ob-screen${wide ? ' ob-screen-wide' : ''}`}>
      {chrome && (
        <header className="ob-header">
          <button type="button" className="ob-back" onClick={onBack} aria-label="Zpět">
            <span aria-hidden="true">←</span>
          </button>
          <ObProgress percent={progress} label={progressLabel} />
        </header>
      )}
      <div className="ob-body">{children}</div>
      {actions && <div className="ob-actions">{actions}</div>}
    </div>
  );
}

/**
 * Role switch. The fork screen promises the user can change role later without
 * redoing the quiz, so this must actually work: it swaps voice/proof/framing
 * and leaves every answer in place, because the scoring engine is shared.
 */
export function RoleSwitch({ role, onSwitch }) {
  if (!role) return null;
  const target = role === 'parent' ? 'student' : 'parent';
  return (
    <button type="button" className="ob-roleswitch" onClick={() => onSwitch(target)}>
      {role === 'parent' ? 'Jsem student, ne rodič' : 'Jsem rodič, ne student'}
    </button>
  );
}

export function ObButton({ children, variant = 'primary', ...rest }) {
  return (
    <button type="button" className={`ob-btn ob-btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}

export function ObOption({
  selected,
  onClick,
  children,
  sub,
  multi = false,
  unsure = false,
  disabled = false,
  onHover,
}) {
  return (
    <button
      type="button"
      className={`ob-option${selected ? ' is-selected' : ''}${unsure ? ' is-unsure' : ''}${disabled ? ' is-blocked' : ''}`}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
    >
      <span className={`ob-option-mark${multi ? ' is-multi' : ''}`} aria-hidden="true" />
      <span className="ob-option-text">
        <span className="ob-option-label">{children}</span>
        {sub && <span className="ob-option-sub">{sub}</span>}
      </span>
    </button>
  );
}

/** "Vybráno X z Y" — shown above any capped multi-select, so hitting the cap
 *  reads as a limit reached rather than the page silently breaking. */
export function SelectionCount({ count, max }) {
  return (
    <p className={`ob-selection-count${count >= max ? ' is-at-max' : ''}`}>
      Vybráno {count} z {max}
    </p>
  );
}

/** Honest, non-numeric match strength. Never a fake percentage. */
export function MatchBand({ band, basedOn, confidenceLabel }) {
  return (
    <div className={`ob-band ob-band-${band.tone}`}>
      <strong className="ob-band-label">{band.label}</strong>
      {basedOn.length > 0 && (
        <span className="ob-band-basis">Shoda podle: {basedOn.join(', ')}</span>
      )}
      <span className="ob-band-confidence">Spolehlivost dat: {confidenceLabel.toLowerCase()}</span>
    </div>
  );
}

export function MatchCard({ result, explanation, locked = false, rank }) {
  const { school, band } = result;
  return (
    <article className={`ob-match${locked ? ' is-locked' : ''}`}>
      <div className="ob-match-head">
        {rank && <span className="ob-match-rank">{rank}.</span>}
        <div>
          <h3 className="ob-match-name">{school.name}</h3>
          <p className="ob-match-loc">{school.location}</p>
        </div>
      </div>
      {!locked && (
        <>
          <MatchBand
            band={band}
            basedOn={result.basedOn}
            confidenceLabel={result.confidenceLabel}
          />
          {explanation?.length > 0 && (
            <ul className="ob-match-why">
              {explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {result.features.programList?.length > 0 && (
            <p className="ob-match-programs">{result.features.programList.slice(0, 4).join(' · ')}</p>
          )}
        </>
      )}
      {locked && <div className="ob-match-lock">Odemkne se v plné verzi</div>}
    </article>
  );
}

/** Says out loud when the catalogue could not be loaded from the database. */
export function DemoDataNotice({ isDemo, role }) {
  if (!isDemo) return null;
  return (
    <p className="ob-demo-notice">
      {role === 'parent'
        ? 'Databáze škol se právě nenačetla, proto pracujeme s ukázkovými daty. Názvy škol jsou smyšlené.'
        : 'Databáze škol se teď nenačetla, tak jedeme na ukázkových datech. Názvy škol jsou vymyšlené.'}
    </p>
  );
}

/**
 * Confetti for the student reveal only. Parent branch gets no confetti at all —
 * excess motion reads as unserious to an adult evaluating a paid tool.
 * Fully skipped under prefers-reduced-motion.
 */
export function Confetti({ active }) {
  const reduced = usePrefersReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        delay: ((i * 13) % 100) / 100,
        hue: [0, 1, 2, 3][i % 4],
      })),
    []
  );
  if (!active || reduced) return null;
  return (
    <div className="ob-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`ob-confetti-piece ob-confetti-c${p.hue}`}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}
