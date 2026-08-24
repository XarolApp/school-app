import { useMemo, useState } from 'react';
import {
  Confetti,
  DemoDataNotice,
  MatchCard,
  ObButton,
  ObScreen,
} from '../../../components/onboarding/ObKit';
import { explain } from '../../../lib/matching';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 19 — THE REVEAL. The emotional peak of the whole flow.
 *
 * Ruling C-7 (hybrid paywall, split on the value axis): the #1 match is
 * revealed FREE, with its full reasoning. Walling the result before any reveal
 * would destroy the Pillar-2 "taste" and throw away the 3-5x conversion gain
 * that contextual paywall placement buys. Give the taste, wall the depth.
 *
 * Ranks 2+ are shown as real school cards with the reasoning blurred, so the
 * user can see exactly what they are buying rather than a vague promise.
 *
 * Motion branches by role: confetti for the student, restrained reveal for the
 * parent — excess animation reads as unserious to an adult evaluating a paid
 * tool. Confetti is additionally suppressed under prefers-reduced-motion.
 *
 * Ruling C-4 applied: there is no native review modal on web, so the emotional
 * peak fires the SHARE prompt instead — which doubles as the parent handoff
 * and the organic acquisition loop.
 */
function Reveal() {
  const { role, ranked, goNext, isDemo, schoolsError, cleanedAnswers } = useOnboarding();
  const parent = role === 'parent';
  const [shareState, setShareState] = useState('idle');

  const top = ranked[0];
  const rest = ranked.slice(1, 4);

  const explanation = useMemo(
    () => (top ? explain(top, cleanedAnswers, role || 'student') : []),
    [top, cleanedAnswers, role]
  );

  const share = async () => {
    const text = top
      ? parent
        ? `ŠkolaMatch: nejlépe odpovídající škola je ${top.school.name} (${top.school.location}).`
        : `Můj top match na ŠkolaMatch: ${top.school.name} (${top.school.location}).`
      : 'ŠkolaMatch — hledání střední školy v Praze.';
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ŠkolaMatch', text, url });
        setShareState('done');
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareState('copied');
    } catch {
      setShareState('error');
    }
  };

  if (!top) {
    return (
      <ObScreen
        chrome={false}
        actions={<ObButton onClick={goNext}>Pokračovat</ObButton>}
      >
        <h1 className="ob-title">
          {parent ? 'Zatím nemáme co zobrazit' : 'Zatím ti nemáme co ukázat'}
        </h1>
        <p className="ob-lead">
          {parent
            ? 'Databázi škol se nepodařilo načíst, takže výsledky nemůžeme spočítat. Zkuste to prosím za chvíli znovu.'
            : 'Databáze škol se nenačetla, takže výsledky nespočítáme. Zkus to prosím za chvíli znovu.'}
        </p>
        {schoolsError && <p className="ob-microcopy">Technický detail: {schoolsError}</p>}
      </ObScreen>
    );
  }

  return (
    <ObScreen chrome={false} wide>
      <Confetti active={!parent} />
      <div className="ob-reveal">
        <span className="ob-eyebrow">{parent ? 'Nejvyšší shoda' : 'Tvoje jednička'}</span>
        <h1 className="ob-title">
          {parent ? 'Nejlépe odpovídá tato škola' : 'Tady se podle nás hodíš nejvíc'}
        </h1>

        <DemoDataNotice isDemo={isDemo} role={role} />

        <MatchCard result={top} explanation={explanation} rank={1} />

        <div className="ob-share">
          <p className="ob-share-title">
            {parent ? 'Chcete to probrat s dítětem?' : 'Chceš to někomu ukázat?'}
          </p>
          <ObButton variant="ghost" onClick={share}>
            {parent ? 'Sdílet s dítětem' : 'Ukázat rodičům'}
          </ObButton>
          {shareState === 'copied' && (
            <span className="ob-share-note">Zkopírováno do schránky.</span>
          )}
          {shareState === 'done' && <span className="ob-share-note">Odesláno.</span>}
          {shareState === 'error' && (
            <span className="ob-share-note">Sdílení se nepovedlo — zkus to prosím znovu.</span>
          )}
        </div>

        {rest.length > 0 && (
          <div className="ob-locked-block">
            <h2 className="ob-subtitle">
              {parent
                ? `Další školy v pořadí (${ranked.length - 1})`
                : `Další školy v pořadí (${ranked.length - 1})`}
            </h2>
            <div className="ob-locked-list">
              {rest.map((r, i) => (
                <MatchCard key={r.school.id} result={r} rank={i + 2} locked />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ob-actions">
        <ObButton onClick={goNext}>
          {parent ? 'Zobrazit celé pořadí' : 'Chci vidět celé pořadí'}
        </ObButton>
      </div>
    </ObScreen>
  );
}

export default Reveal;
