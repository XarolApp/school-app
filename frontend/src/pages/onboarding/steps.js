import Welcome from './screens/Welcome';
import RoleFork from './screens/RoleFork';
import Stakes from './screens/Stakes';
import QuizQuestion from './screens/QuizQuestion';
import Calculating from './screens/Calculating';
import Reveal from './screens/Reveal';
import JourneySummary from './screens/JourneySummary';
import Commitment from './screens/Commitment';
import SocialProof from './screens/SocialProof';
import CreateAccount from './screens/CreateAccount';
import Paywall from './screens/Paywall';
import Activated from './screens/Activated';
import { QUESTIONS } from './quizQuestions';

/**
 * The canonical flow — 20 screens (onboarding-v2, 2026-09-05).
 *
 * Pillar 1 (3)  welcome -> role fork -> stakes+intent
 * Pillar 2 (11) quiz (one question per screen) -> calculation -> reveal
 * Pillar 3 (5)  journey summary -> commitment -> social proof -> account ->
 *               paywall
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
  { id: 'summary', component: JourneySummary, chrome: true, phase: 'result' },
  { id: 'commitment', component: Commitment, chrome: true, phase: 'result' },
  { id: 'proof', component: SocialProof, chrome: true, phase: 'result' },
  // Sits before the paywall because the trial window is opened by a database
  // trigger on account creation — there has to be an account before there is
  // anything to charge.
  { id: 'ucet', component: CreateAccount, chrome: true, phase: 'result' },
  { id: 'paywall', component: Paywall, chrome: false, phase: 'result' },
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
