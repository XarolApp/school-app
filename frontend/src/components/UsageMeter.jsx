import { useEffect, useId, useRef, useState } from 'react';

// Czech has three plural forms: 1, 2–4, and 0 or 5+.
function pluralRuns(count) {
  if (count === 1) return 'pokus';
  if (count >= 2 && count <= 4) return 'pokusy';
  return 'pokusů';
}

function formatReset(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
  });
}

function HelpIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7.9 7.6a2.2 2.2 0 1 1 2.6 2.5v1.2" />
      <path d="M10.5 14.3h.01" />
    </svg>
  );
}

/**
 * Shows how many questionnaire runs are left this month, with a "?" that
 * explains why there is a limit at all.
 *
 * The explanation is deliberately honest about the reason. The cap exists
 * because each run is a paid AI call, not because we suspect the student of
 * anything — and a help bubble that implied otherwise would read as an
 * accusation to someone who has just paid for the product.
 */
function UsageMeter({ usage, onRestart }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const closeTimer = useRef(null);
  const id = useId();

  // Hovering opens it; leaving closes it after a beat. The delay is what makes
  // the gap between the "?" and the bubble crossable — without it, moving the
  // cursor down to keep reading passes over dead space and snaps it shut.
  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close on a click anywhere else, and on Escape — the two things anyone
  // expects to dismiss a popover. Still needed despite the hover handling:
  // touch screens have no hover, so there the "?" is tapped rather than
  // pointed at, and a tap-opened bubble needs a way to be dismissed.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!usage) return null;

  const { unlimited, used, limit, remaining, resetsAt } = usage;
  const exhausted = !unlimited && remaining <= 0;
  // Fills as the allowance is spent, so a nearly-full bar reads as "nearly out"
  // the same way a battery does.
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div
      className={exhausted ? 'usage-meter is-exhausted' : 'usage-meter'}
      ref={rootRef}
    >
      <div className="usage-meter-head">
        <span className="usage-meter-label">
          {unlimited ? (
            'Neomezený počet vyhodnocení'
          ) : (
            <>
              Zbývá{' '}
              <strong>
                {remaining} {pluralRuns(remaining)}
              </strong>{' '}
              z {limit} tento měsíc
            </>
          )}
        </span>

        <button
          type="button"
          className="usage-meter-help"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          // Keyboard users cannot hover, so focus does the same job. Tapping
          // still toggles, which is the only thing that works on a touch
          // screen.
          onFocus={show}
          onBlur={hideSoon}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={`${id}-popover`}
          aria-label="Proč je počet vyhodnocení omezený?"
        >
          <HelpIcon />
        </button>
      </div>

      {!unlimited && (
        <div
          className="usage-meter-track"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label="Využitá vyhodnocení tento měsíc"
        >
          <div className="usage-meter-fill" style={{ '--percent': `${percent}%` }} />
        </div>
      )}

      {/* Only rendered where restarting makes sense (the results view). On the
          intro screen the primary button already says "Začít dotazník", and a
          second one saying the same thing would just be noise. */}
      {onRestart && (
        <button
          type="button"
          className="btn btn-secondary btn-sm usage-meter-action"
          onClick={onRestart}
          disabled={exhausted}
        >
          Vyplnit dotazník znovu
        </button>
      )}

      {open && (
        <div
          className="usage-meter-popover"
          id={`${id}-popover`}
          role="note"
          // Keeps the bubble up while the cursor is inside it, so a long
          // explanation can actually be read.
          onMouseEnter={show}
          onMouseLeave={hideSoon}
        >
          <p className="usage-meter-popover-title">Proč to není neomezené?</p>
          <p>
            Každé vyhodnocení znamená, že umělá inteligence projde celou databázi
            škol a porovná ji s tvými odpověďmi. To nás stojí peníze za každé
            spuštění, takže má dotazník měsíční strop.
          </p>
          <p>
            Prohlížet si už hotové výsledky můžeš{' '}
            <strong>kolikrát chceš zdarma</strong> — limit se počítá jen tehdy,
            když necháš vyhodnotit nové odpovědi. Deset pokusů je nastavených tak,
            aby sis v klidu mohl zkusit i jiné odpovědi a porovnat výsledky.
          </p>
          {resetsAt && (
            <p className="usage-meter-popover-reset">
              Limit se obnoví {formatReset(resetsAt)}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default UsageMeter;
