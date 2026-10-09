import { useEffect, useMemo, useRef, useState } from 'react';
import { SHARING_ENABLED, SHARING_OFF_NOTE } from '../../../config/features';
import { Link } from 'react-router-dom';
import { Confetti, DemoDataNotice, ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { countCandidates, explain, tradeoffs } from '../../../lib/matching';
import { FOCUS_CATEGORIES } from '../../../lib/schoolFeatures';
import { useOnboarding } from '../useOnboarding';
import { completeHandoff, createResultSnapshot } from '../../../api';
import { shareUrl } from '../../../lib/shareLink';
import { stageBetaRanking } from '../../../lib/betaRankings';
import { track, betaTracker } from '../../../lib/betaTrack';

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

// Same display curve as the server matcher; the two engines calculate raw
// scores separately, so an account's later score can differ.
const toPercent = (raw) => Math.round(100 * (1 - (1 - raw) ** 1.4));

function schoolWord(n) {
  if (n === 1) return 'škola';
  if (n >= 2 && n <= 4) return 'školy';
  return 'škol';
}

function Reveal() {
  const { role, gender, ranked, schools, goNext, isDemo, schoolsError, cleanedAnswers, answers } = useOnboarding();
  const rankingSignature=useRef(null);
  useEffect(() => {
    const capture=()=>{
      if(!ranked.length || isDemo || !betaTracker.active())return;
      const ids=ranked.map(m=>m.school.id),signature=JSON.stringify(ids);
      if(rankingSignature.current===signature)return;
      stageBetaRanking(ids);rankingSignature.current=signature;
      track('result_view',{source:'onboarding',schools:ranked.slice(0,10).map((m,i)=>({id:m.school.id,rank:i+1}))});
    };
    capture();window.addEventListener('snm:beta-account',capture);window.addEventListener('snm:beta-enabled',capture);
    return()=>{window.removeEventListener('snm:beta-account',capture);window.removeEventListener('snm:beta-enabled',capture);};
  },[ranked,isDemo]);
  const parent = role === 'parent';
  const [shareState, setShareState] = useState('idle');

  useEffect(() => {
    let token;
    try {
      token = localStorage.getItem('skolamatch.handoff.child');
    } catch {
      return;
    }
    if (!token) return;
    completeHandoff(token).catch(() => {}).finally(() => {
      try { localStorage.removeItem('skolamatch.handoff.child'); } catch {}
    });
  }, []);

  const top = ranked[0];
  const locked = ranked.slice(1, 3);
  const lockedTotal = Math.max(ranked.length - 1, 0);
  const orderedWord = lockedTotal === 1 ? 'seřazená' : lockedTotal < 5 ? 'seřazené' : 'seřazených';

  const reasons = useMemo(
    () => (top ? explain(top, cleanedAnswers, role || 'student', gender) : []),
    [top, cleanedAnswers, role, gender]
  );
  const limits = useMemo(() => (top ? tradeoffs(top, role || 'student', gender) : []), [top, role, gender]);
  const headline = useMemo(() => characterise(answers, role), [answers, role]);
  // The SAME count the quiz showed as "Zatím ti sedí N škol". `ranked` is every
  // school in rank order, so its length (always the whole database) must never
  // be presented as the number that "matches".
  const fitting = useMemo(
    () => countCandidates(schools || [], cleanedAnswers, role || 'student').fitting,
    [schools, cleanedAnswers, role],
  );

  const share = async () => {
    const text = top
      ? parent
        ? 'Střední na míru: nejlépe odpovídající škola je ' + top.school.name + ' (' + top.school.location + ').'
        : 'Můj top match podle Střední na míru: ' + top.school.name + ' (' + top.school.location + ').'
      : 'Střední na míru — hledání střední školy v Praze.';
    try {
      const { token } = await createResultSnapshot({
        role: role || 'student',
        topSchoolId: top.school.id,
        topScore: toPercent(top.score),
        fittingCount: fitting,
      });
      const result = await shareUrl({
        text,
        url: window.location.origin + '/vysledky/' + token,
      });
      setShareState(result === 'copied' ? 'copied' : result === 'shared' ? 'done' : 'idle');
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
          {fitting > 0
            ? parent
              ? `Z ${ranked.length} pražských škol tomu ${fitting >= 2 && fitting <= 4 ? 'odpovídají' : 'odpovídá'} ${fitting} ${schoolWord(fitting)}. Tato nejvíc:`
              : `Z ${ranked.length} pražských škol ti sedí ${fitting} ${schoolWord(fitting)}. Tahle nejvíc:`
            : parent
              ? 'Přesně tomu žádná škola neodpovídá. Tato se blíží nejvíc:'
              : 'Přesně tomu žádná škola neodpovídá. Tahle se blíží nejvíc:'}
        </p>

        <DemoDataNotice isDemo={isDemo} role={role} />

        <div className="ob-reveal-grid">
          <article className="ob-hero-match">
            <p className="ob-hero-rank">{parent ? 'Nejvyšší shoda' : 'Nejlepší shoda'}</p>
            <h2 className="ob-hero-name">
              <Link to={`/skoly/${top.school.id}`} className="ob-hero-link">
                {top.school.name}
              </Link>
            </h2>
            {top.school.official_name && <p className="ob-hero-meta">{top.school.official_name}</p>}
            <p className="ob-hero-meta">
              {top.school.location}
              {programs ? ` · ${programs}` : ''}
            </p>

            <p className={`ob-hero-band ob-band-${top.band.tone}`}>
              <span className="ob-hero-dot" aria-hidden="true" />
              {toPercent(top.score)} % shoda · {top.band.label}
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
              Úplnost podkladů pro shodu: {top.confidenceLabel.toLowerCase()}
            </p>
            <p className="ob-hero-open" aria-hidden="true">
              Zobrazit školu <span>→</span>
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
                    {lockedTotal < 5 ? 'Další' : 'Dalších'} {lockedTotal} {schoolWord(lockedTotal)}
                  </strong>{' '}
                  {parent
                    ? `${orderedWord} podle vašich odpovědí, s odůvodněním shody`
                    : `${orderedWord} podle tvých odpovědí, s vysvětlením shody`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Buy path and share path at EQUAL reach. */}
        <div className="ob-reveal-actions">
          <ObButton onClick={goNext}>
            {lockedTotal > 0
              ? lockedTotal === 1
                ? 'Zobrazit zbývající školu'
                : `Zobrazit zbývající ${lockedTotal} ${schoolWord(lockedTotal)}`
              : parent
                ? 'Zobrazit celé pořadí'
                : 'Chci vidět celé pořadí'}
          </ObButton>
          <ObButton variant="ghost" onClick={share} disabled={!SHARING_ENABLED}>
            {parent ? 'Sdílet s dítětem' : 'Poslat rodičům'}
          </ObButton>
          {!SHARING_ENABLED && <span className="ob-share-note">{SHARING_OFF_NOTE}</span>}
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
              ? 'Říká, jak škola odpovídá tomu, co jste vyplnili — ne jaké jsou šance na přijetí. Hranice přijetí z Cermatu u škol ukazujeme, šanci na přijetí ale nepředpovídáme. Vzdálenost počítáme podle městských částí, ne podle jízdních řádů.'
              : `Říká, jak moc škola sedí tomu, co jsi ${gender === 'f' ? 'vyplnila' : 'vyplnil'} — ne jaké máš šance se tam dostat. Hranice přijetí z Cermatu u škol ukážeme, šanci na přijetí ale nehádáme. Vzdálenost počítáme podle městských částí, ne podle spojů.`}
          </p>
        </div>
      </div>
    </ObScreen>
  );
}

export default Reveal;
