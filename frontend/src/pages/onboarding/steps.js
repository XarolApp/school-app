import Welcome from './screens/Welcome';
import RoleFork from './screens/RoleFork';
import Stakes from './screens/Stakes';
import QuizQuestion from './screens/QuizQuestion';
import Calculating from './screens/Calculating';
import Reveal from './screens/Reveal';
import Commitment from './screens/Commitment';
import SocialProof from './screens/SocialProof';
import CreateAccount from './screens/CreateAccount';
import Hodnota from './screens/Hodnota';
import Cesta from './screens/Cesta';
import Plan from './screens/Plan';
import Zkusebni from './screens/Zkusebni';
import Platba from './screens/Platba';
import Activated from './screens/Activated';
import { QUESTIONS } from './quizQuestions';

/**
 * The canonical flow — 23 screens (onboarding-v2 + split paywall, 2026-09-05).
 *
 * Pillar 1 (3)  welcome -> role fork -> stakes+intent
 * Pillar 2 (11) quiz (one question per screen) -> calculation -> reveal
 * Pillar 3 (9)  commitment -> social proof -> hodnota -> cesta -> account ->
 *               plan -> zkusebni -> platba
 *
 * THE PAYWALL IS FIVE SCREENS, NOT ONE (2026-09-05, approved design in
 * design/paywall-multipage-extract4/). It used to be a single `paywall` screen
 * carrying price, benefits, trial rail, trust and card entry at once, preceded
 * by a `summary` roadmap screen. Both are gone; five replace them:
 *
 *   hodnota   how many hours this saves, with the arithmetic shown
 *   cesta     the season from today to March (replaces `summary`, whose
 *             milestone data was ported rather than rewritten)
 *   plan      the two plans and the price — the FIRST screen with a price
 *   zkusebni  how the trial runs, with real dates (skipped for a plan with no
 *             trial, so a monthly buyer goes plan -> platba)
 *   platba    card, consent, order summary
 *
 * The point of the split is that the price does not appear until screen 3, so
 * the user has twice received something before being asked for anything — the
 * first two screens say "zatím nic neplatíš" on them and mean it. Each screen
 * also carries exactly one decision, which is what makes a hard ask read as a
 * step rather than a wall.
 *
 * The growth is entirely POST-REVEAL. The v2 cuts below removed screens from
 * the first ~15 interactions, where drop-off actually lives; everything after
 * the reveal is the best-evidenced part of the flow and was deliberately left
 * alone. Do not "balance" this by trimming the post-reveal screens.
 *
 * `ucet` still sits immediately before `plan` for the original reason: the
 * trial window is opened by a database trigger on account creation, so there
 * has to be an account before there is anything to charge.
 *
 * WHAT CHANGED FROM THE 23-SCREEN v1, and why (design/onboarding-v2/canvas.json):
 * the steepest drop-off in an onboarding sits in the first ~15 interactions,
 * which is exactly where v1 spent five framing screens before the user had
 * received anything. Post-reveal screens are the best-evidenced part of the
 * flow, so nothing after the reveal was touched. Three screens were removed:
 *
 *  - `problem` + `stakes` + `intent`  -> merged into ONE screen (`stakes`).
 *    The neutral stat, the 60-schools problem statement and the multi-intent
 *    chips all do framing work; they did not each need a tap.
 *  - `mirror` (Mirroring)             -> DELETED as a screen. The "you were
 *    heard" job moved INTO the quiz: selecting an option injects a reassurance
 *    card directly under it (quizQuestions.js `reassure`). Same work, spread
 *    across every question, paid for with zero extra screens.
 *  - `expectation` (HonestExpectation) -> DELETED as a screen. Its content
 *    moved onto the reveal, attached to the claim it actually qualifies.
 *
 * `Activated` sits AFTER the 20 and is the post-onboarding empty-state
 * checklist, not an onboarding screen (`postFlow`).
 */

/** Honest phase labels. There is no percentage before the quiz because there
 *  is nothing to count yet, and none after it because "how far through a
 *  paywall are you" is not a real quantity. */
export const PHASES = {
  intro: 'Než začneme',
  quiz: 'Dotazník',
  result: 'Výsledek',
};

export const STEPS = [
  { id: 'welcome', component: Welcome, chrome: false, phase: 'intro' },
  { id: 'role', component: RoleFork, chrome: false, phase: 'intro' },
  { id: 'stakes', component: Stakes, chrome: true, phase: 'intro' },
  ...QUESTIONS.map((q, i) => ({
    id: `q${i + 1}`,
    component: QuizQuestion,
    chrome: true,
    phase: 'quiz',
    questionIndex: i,
  })),
  { id: 'calculating', component: Calculating, chrome: false, phase: 'result' },
  { id: 'reveal', component: Reveal, chrome: false, phase: 'result' },
  { id: 'commitment', component: Commitment, chrome: true, phase: 'result' },
  { id: 'proof', component: SocialProof, chrome: true, phase: 'result' },
  // --- the paywall, split across five screens (see the note above) ----------
  { id: 'hodnota', component: Hodnota, chrome: false, phase: 'result' },
  { id: 'cesta', component: Cesta, chrome: false, phase: 'result' },
  // Sits before the price because the trial window is opened by a database
  // trigger on account creation — there has to be an account before there is
  // anything to charge.
  { id: 'ucet', component: CreateAccount, chrome: true, phase: 'result' },
  { id: 'plan', component: Plan, chrome: false, phase: 'result' },
  // Reachable only when the chosen plan carries a trial; Plan jumps straight
  // to `platba` otherwise rather than rendering an empty timeline.
  { id: 'zkusebni', component: Zkusebni, chrome: false, phase: 'result' },
  { id: 'platba', component: Platba, chrome: false, phase: 'result' },
  { id: 'hotovo', component: Activated, chrome: false, postFlow: true },
];

export const FLOW_LENGTH = STEPS.filter((s) => !s.postFlow).length;

export function stepIndexById(id) {
  return STEPS.findIndex((s) => s.id === id);
}

/** Index of the first quiz screen, used for the "Otázka X z N" label. */
export const FIRST_QUIZ_INDEX = stepIndexById('q1');

/**
 * HONEST PROGRESS.
 *
 * The previous version pre-filled the bar to 15% on screen one and eased it
 * through a goal-gradient curve (endowed progress, Nunes & Drèze 2006). That is
 * deliberately gone: an indicator inflated to induce a feeling of advancement is
 * "artificial advancement that misrepresents the actual state" — squarely the
 * interface-manipulation prohibition in DSA Art. 25, and the audience here is
 * minors. Do not reintroduce it.
 *
 * What is left is a bar that counts questions and nothing else:
 *   - pre-quiz screens: no bar at all (a phase label instead),
 *   - quiz screens:     exactly (answered position) / (number of questions),
 *   - post-quiz:        no bar; a phase label only.
 *
 * @param {number} questionIndex zero-based index of the question on screen
 * @returns {number} 0-100
 */
export function quizProgressPercent(questionIndex, totalQuestions) {
  if (!totalQuestions) return 0;
  const clamped = Math.max(0, Math.min(totalQuestions, questionIndex + 1));
  return Math.round((clamped / totalQuestions) * 100);
}
