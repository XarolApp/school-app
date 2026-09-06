import { useCallback, useState } from 'react';

/**
 * Shared pieces for the five paywall screens
 * (hodnota -> cesta -> plan -> zkusebni -> platba).
 *
 * These live in one module because the five screens are one argument split
 * across five surfaces: the same step counter, the same icon vocabulary and the
 * same handoff share. Duplicating any of them is how two screens end up
 * claiming different things about the same purchase.
 *
 * Source design: design/paywall-multipage-extract4/ (approved 2026-09-05).
 */

/* --- icons ---------------------------------------------------------------- */
/* Inline SVG rather than lucide-react: these are decorative, always
   aria-hidden, and inherit `currentColor` so a single CSS rule controls the
   whole set. Stroke colours come from the stylesheet, never from props. */

function Svg({ children, size = 16, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  check: (p) => (
    <Svg {...p}>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  ),
  chevron: (p) => (
    <Svg {...p}>
      <path d="M9 18l6-6-6-6" />
    </Svg>
  ),
  arrowLeft: (p) => (
    <Svg {...p}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </Svg>
  ),
  shield: (p) => (
    <Svg {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  ),
  cross: (p) => (
    <Svg {...p}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </Svg>
  ),
  info: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  ),
  bell: (p) => (
    <Svg {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  ),
  card: (p) => (
    <Svg {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Svg>
  ),
  lock: (p) => (
    <Svg {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  ),
  unlock: (p) => (
    <Svg {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </Svg>
  ),
  clock: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </Svg>
  ),
  sent: (p) => (
    <Svg {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </Svg>
  ),
};

/* --- step chrome ---------------------------------------------------------- */
/**
 * The five screens are presented to the user as FOUR steps: the payment screen
 * is not numbered, because a counter that keeps ticking while the card form is
 * open reads as "and there is more after this".
 *
 * "Zatím nic neplatíš" is on the first two only, and it is literally true —
 * no price appears until the plan screen. That line is what stops the sequence
 * reading as a wall with four bricks instead of one.
 */
export const PAY_STEP_TOTAL = 4;

export function PayStepChrome({ step, onBack, role }) {
  const parent = role === 'parent';
  const beforePrice = step <= 2;
  const label = step
    ? `Krok ${step} ze ${PAY_STEP_TOTAL}${
        beforePrice ? (parent ? ' · zatím nic neplatíte' : ' · zatím nic neplatíš') : ''
      }`
    : null;

  return (
    <div className="ob-pw-chrome">
      <button type="button" className="ob-back" onClick={onBack} aria-label="Zpět">
        <Icon.arrowLeft size={17} />
      </button>
      {label && (
        <div className="ob-pw-steps">
          <span className="ob-pw-dots" aria-hidden="true">
            {Array.from({ length: PAY_STEP_TOTAL }, (_, i) => (
              <span key={i} className={`ob-pw-dot${i < step ? ' is-done' : ''}`} />
            ))}
          </span>
          <span className="ob-pw-steplabel">{label}</span>
        </div>
      )}
    </div>
  );
}

/* --- primary CTA ---------------------------------------------------------- */
/**
 * The chevron is on the primary CTA only, on every one of the five screens and
 * never on a ghost or decline button. It is what makes the button read as
 * "next step" rather than "buy" — which is the whole reason the paywall was
 * split into steps in the first place.
 */
export function PayCta({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      className="ob-btn ob-btn-primary ob-pw-cta"
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <Icon.chevron size={18} />
    </button>
  );
}

/* --- handoff share -------------------------------------------------------- */
/**
 * §0.2: the handoff exists on BOTH branches and is never the only option. A
 * student sends the result to a parent who may pay; a parent sends it back to
 * the child. Real behaviour — Web Share where it exists, clipboard otherwise.
 * Nothing here fakes a send.
 */
export function useHandoffShare(role) {
  const parent = role === 'parent';
  const [note, setNote] = useState('');

  const share = useCallback(async () => {
    const text = parent
      ? 'Tohle jsou tvoje výsledky ze ŠkolaMatch — podívej se na školy, které ti podle dotazníku sedí nejvíc.'
      : 'Podívejte se na moje výsledky na ŠkolaMatch — vybírám si střední školu.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ŠkolaMatch', text, url: window.location.origin });
        setNote('Odesláno.');
        return;
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      setNote(
        parent ? 'Odkaz zkopírován — můžete ho poslat dítěti.' : 'Odkaz zkopírován — pošli ho rodičům.'
      );
    } catch {
      setNote(
        parent ? 'Sdílení se nepovedlo, zkuste to prosím znovu.' : 'Sdílení se nepovedlo, zkus to prosím znovu.'
      );
    }
  }, [parent]);

  return { share, note };
}
