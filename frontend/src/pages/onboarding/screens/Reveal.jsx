import { useMemo, useState } from 'react';
import { Confetti, DemoDataNotice, ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { explain, tradeoffs } from '../../../lib/matching';
import { FOCUS_CATEGORIES } from '../../../lib/schoolFeatures';
import { useOnboarding } from '../useOnboarding';

/**
 * THE REVEAL. The emotional peak of the whole flow.
 *
 * Hybrid paywall, split on the VALUE axis: the #1 match is revealed FREE, with
 * its full reasoning. Walling the result before any reveal would destroy the
 * "taste" and throw away the 3-5x conversion gain that contextual paywall
 * placement buys. Give the taste, wall the depth. Ranks 2+ are shown as real
 * cards with the content blurred, so the user sees exactly what they are
 * buying rather than a vague promise.
 *
 * WHAT ONBOARDING-V2 CHANGED HERE:
 *  1. The headline now names something about the USER, not a settings summary
 *     of what they typed. A reveal that echoes inputs back is a receipt and
 *     reads as one. See `characterise` below — it is COPY built from answers,
 *     never a score, and it never invents a trait the answers do not support.
 *  2. "Shoda podle" now includes at least one honest trade-off (matching.js
 *     `tradeoffs`). A reasons list that is all wins is a pitch, not an
 *     explanation, and it is the first thing a parent distrusts.
 *  3. The honest-expectation block that used to be its own screen now lives
 *     here, attached to the claim it actually qualifies rather than costing one
 *     more tap before the payoff.
 *  4. The share button sits at EQUAL reach beside the buy path — never in
 *     front of it, never styled as the fallback for someone who cannot pay.
 *     There is no native review modal on web, so this share prompt is what
 *     fires at the emotional peak instead; it doubles as the parent handoff and
 *     the organic acquisition loop.
 *
 * Motion branches by role: confetti for the student, a plain fade for the
 * parent — excess animation reads as unserious to an adult evaluating a paid
 * tool. Confetti is additionally suppressed under prefers-reduced-motion.
 */

/**
 * One sentence naming the kind of student the answers describe.
 *
 * RULES: every clause must be entailed by an answer the user actually gave. If
 * the answers are thin, the sentence gets shorter — it never gets invented.
 * Nothing here touches the scoring engine; this is language, not maths.
 */
function characterise(answers, role) {
  const parent = role === 'parent';
  const subject = parent ? 'Vaše dítě je typ' : 'Jsi typ';

  const typeWord = {
    gymnazium: parent ? 'na všeobecné gymnázium' : 'na všeobecný gympl',
    odborna: parent ? 'na odbornou školu s maturitou' : 'na odborku s maturitou',
    ucebni: parent ? 'na učební obor' : 'na řemeslo a učební obor',
  }[answers.studyType];

  const focusLabels = (answers.focus || [])
    .map((id) => FOCUS_CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .slice(0, 2);

  // Sentence one: the type. Built as its own sentence rather than a subordinate
  // clause on purpose — Czech would require declining the category labels
  // ("Přírodní vědy" -> "přírodním vědám"), and the labels come from
  // schoolFeatures.js in the nominative. "Baví tě X" keeps them nominative and
  // therefore correct without a declension table we do not have.
  let first;
  if (typeWord) first = `${subject} ${typeWord}.`;
  else if (focusLabels.length) {
    first = parent ? 'Zatím jde hlavně o zájmy.' : 'Zatím to hraje hlavně na to, co tě baví.';
  } else {
    first = parent
      ? 'Zatím máme jen hrubý obrys — a i tak se z něj dá vyjít.'
      : 'Zatím z tebe máme jen hrubý obrys — a i tak se z něj dá vyjít.';
  }

  // Sentence two: only clauses an answer actually supports. Labels stay
  // verbatim (never lower-cased: "IT a technika" -> "it a technika" reads as a
  // bug) and are comma-joined, because joining two labels that already contain
  // "a" with another "a" is unreadable.
  const clauses = [];
  if (focusLabels.length) {
    clauses.push(
      parent ? `dítě baví ${focusLabels.join(', ')}` : `baví tě ${focusLabels.join(', ')}`
    );
  }
  if (answers.certainty === 'vubec') {
    clauses.push(parent ? 'zaměření si zatím nechává otevřené' : 'zaměření si zatím necháváš otevřené');
  } else if (answers.certainty === 'jiste') {
    clauses.push(parent ? 'zaměření má jasné' : 'zaměření máš jasné');
  }
  if (answers.priority === 'blizkost') {
    clauses.push(
      parent ? 'a dojíždění má hrát co nejmenší roli' : 'a nechceš kvůli škole trávit půl dne na cestě'
    );
  }

  if (!clauses.length) return first;
  const second = clauses.join(', ').replace(', a ', ' a ');
  return `${first} ${second.charAt(0).toUpperCase()}${second.slice(1)}.`;
}

function schoolWord(n) {
  if (n === 1) return 'škola';
  if (n >= 2 && n <= 4) return 'školy';
  return 'škol';
}

function Reveal() {
  const { role, ranked, goNext, isDemo, schoolsError, cleanedAnswers, answers } = useOnboarding();
  const parent = role === 'parent';
  const [shareState, setShareState] = useState('idle');

  const top = ranked[0];
  const locked = ranked.slice(1, 3);
  const lockedTotal = Math.max(ranked.length - 1, 0);

  const reasons = useMemo(
    () => (top ? explain(top, cleanedAnswers, role || 'student') : []),
    [top, cleanedAnswers, role]
  );
  const limits = useMemo(() => (top ? tradeoffs(top, role || 'student') : []), [top, role]);
  const headline = useMemo(() => characterise(answers, role), [answers, role]);

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
      <ObScreen chrome={false} actions={<ObButton onClick={goNext}>Pokračovat</ObButton>}>
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

  const programs = top.features.programList?.slice(0, 3).join(' · ');

  return (
    <ObScreen chrome={false} wide>
      <Confetti active={!parent} />
      <div className="ob-reveal">
        <p className="ob-eyebrow">{parent ? 'Výsledek' : 'Tvůj výsledek'}</p>
        <h1 className="ob-title ob-reveal-head">{headline}</h1>
        <p className="ob-lead ob-reveal-lede">
          {parent
            ? `Tomu v Praze odpovídá ${ranked.length} ${schoolWord(ranked.length)}. Tato nejvíc:`
            : `Tomu v Praze odpovídá ${ranked.length} ${schoolWord(ranked.length)}. Tahle nejvíc:`}
        </p>

        <DemoDataNotice isDemo={isDemo} role={role} />

        <div className="ob-reveal-grid">
          <article className="ob-hero-match">
            <p className="ob-hero-rank">{parent ? 'Nejvyšší shoda' : 'Nejlepší shoda'}</p>
            <h2 className="ob-hero-name">{top.school.name}</h2>
            <p className="ob-hero-meta">
              {top.school.location}
              {programs ? ` · ${programs}` : ''}
            </p>

            {/* A band and named reasons, never a percentage. The engine cannot
                honestly justify two significant figures. */}
            <p className={`ob-hero-band ob-band-${top.band.tone}`}>
              <span className="ob-hero-dot" aria-hidden="true" />
              {top.band.label}
            </p>

            <p className="ob-hero-whylabel">Shoda podle</p>
            <ul className="ob-hero-why">
              {reasons.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {limits.map((line) => (
                <li key={line} className="is-tradeoff">
                  {line}
                </li>
              ))}
            </ul>
            <p className="ob-hero-confidence">
              Spolehlivost dat: {top.confidenceLabel.toLowerCase()}
            </p>
          </article>

          <div className="ob-lock-stack">
            {locked.map((r, i) => (
              <div className="ob-lock-card" key={r.school.id}>
                <div className="ob-lock-inner" aria-hidden="true">
                  <p className="ob-lock-rank">{i + 2}. místo</p>
                  <p className="ob-lock-name">{r.school.name}</p>
                  <p className="ob-lock-meta">{r.school.location}</p>
                </div>
                <span className="ob-visually-hidden">
                  {i + 2}. škola v pořadí — odemkne se v placené verzi
                </span>
              </div>
            ))}
            {lockedTotal > 0 && (
              <div className="ob-lock-foot">
                <p>
                  <strong>
                    {parent ? 'Dalších' : 'Dalších'} {lockedTotal} {schoolWord(lockedTotal)}
                  </strong>{' '}
                  {parent
                    ? 'seřazených podle vašich odpovědí, s odůvodněním u každé z nich'
                    : 'seřazených podle tvých odpovědí, s vysvětlením u každé z nich'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Buy path and share path at EQUAL reach. */}
        <div className="ob-reveal-actions">
          <ObButton onClick={goNext}>
            {lockedTotal > 0
              ? `Zobrazit zbylých ${lockedTotal} ${schoolWord(lockedTotal)}`
              : parent
                ? 'Zobrazit celé pořadí'
                : 'Chci vidět celé pořadí'}
          </ObButton>
          <ObButton variant="ghost" onClick={share}>
            {parent ? 'Sdílet s dítětem' : 'Poslat rodičům'}
          </ObButton>
          <span className="ob-reveal-free">
            {parent
              ? 'První školu máte zdarma a zůstane vám.'
              : 'První škola je zdarma a zůstane ti.'}
          </span>
          {shareState === 'copied' && (
            <span className="ob-share-note">Odkaz zkopírován do schránky.</span>
          )}
          {shareState === 'done' && <span className="ob-share-note">Odesláno.</span>}
          {shareState === 'error' && (
            <span className="ob-share-note">
              {parent
                ? 'Sdílení se nepovedlo — zkuste to prosím znovu.'
                : 'Sdílení se nepovedlo — zkus to prosím znovu.'}
            </span>
          )}
        </div>

        {/* Migrated from the deleted HonestExpectation screen. Stating a limit
            up front is Cal AI's highest-transfer tactic and it is the
            credibility hinge on the parent branch. */}
        <div className="ob-honest">
          <span className="ob-honest-icon" aria-hidden="true">
            ◆
          </span>
          <p>
            <strong>Shoda není záruka přijetí.</strong>{' '}
            {parent
              ? 'Říká, jak škola odpovídá tomu, co jste vyplnili — ne jaké jsou šance na přijetí. Data o známkách, kapacitách ani o výsledcích přijímacích zkoušek zatím nemáme, takže je nepředstíráme. Vzdálenost počítáme podle městských částí, ne podle jízdních řádů.'
              : 'Říká, jak moc škola sedí tomu, cos napsal — ne jaké máš šance se tam dostat. Data o známkách, kapacitách ani o přijímačkách zatím nemáme, tak si je nevymýšlíme. Vzdálenost počítáme podle městských částí, ne podle spojů.'}
          </p>
        </div>
      </div>
    </ObScreen>
  );
}

export default Reveal;
