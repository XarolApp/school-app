import Welcome from './screens/Welcome';
import RoleFork from './screens/RoleFork';
import ProblemFraming from './screens/ProblemFraming';
import StakesClarifier from './screens/StakesClarifier';
import IntentSelect from './screens/IntentSelect';
import QuizQuestion from './screens/QuizQuestion';
import Mirroring from './screens/Mirroring';
import HonestExpectation from './screens/HonestExpectation';
import Calculating from './screens/Calculating';
import Reveal from './screens/Reveal';
import JourneySummary from './screens/JourneySummary';
import Commitment from './screens/Commitment';
import SocialProof from './screens/SocialProof';
import Paywall from './screens/Paywall';
import Activated from './screens/Activated';
import { QUESTIONS } from './quizQuestions';

/**
 * The canonical 23-screen flow.
 *
 * Pillar 1 (5)  hook -> role fork -> problem -> stakes -> intent
 * Pillar 2 (14) 10 quiz screens -> mirroring -> honest expectation ->
 *               calculation -> reveal
 * Pillar 3 (4)  journey summary -> commitment -> social proof -> paywall
 *
 * `Activated` sits AFTER the 23 and is the post-onboarding empty-state
 * checklist, not an onboarding screen. It is excluded from the progress maths.
 */
export const STEPS = [
  { id: 'welcome', component: Welcome, chrome: false },
  { id: 'role', component: RoleFork, chrome: false },
  { id: 'problem', component: ProblemFraming, chrome: true },
  { id: 'stakes', component: StakesClarifier, chrome: true },
  { id: 'intent', component: IntentSelect, chrome: true },
  ...QUESTIONS.map((q, i) => ({
    id: `q${i + 1}`,
    component: QuizQuestion,
    chrome: true,
    questionIndex: i,
  })),
  { id: 'mirror', component: Mirroring, chrome: true },
  { id: 'expectation', component: HonestExpectation, chrome: true },
  { id: 'calculating', component: Calculating, chrome: false },
  { id: 'reveal', component: Reveal, chrome: false },
  { id: 'summary', component: JourneySummary, chrome: true },
  { id: 'commitment', component: Commitment, chrome: true },
  { id: 'proof', component: SocialProof, chrome: true },
  { id: 'paywall', component: Paywall, chrome: false },
  { id: 'hotovo', component: Activated, chrome: false, postFlow: true },
];

export const FLOW_LENGTH = STEPS.filter((s) => !s.postFlow).length;

export function stepIndexById(id) {
  return STEPS.findIndex((s) => s.id === id);
}

/** Index of the first quiz screen, used for the "Otázka X z 10" label. */
export const FIRST_QUIZ_INDEX = stepIndexById('q1');

/**
 * Endowed progress + goal gradient.
 *
 * Starts at 15% on screen one — Nunes & Drèze (2006) showed a pre-stamped card
 * doubled completion (19% -> 34%) for identical remaining work. The curve is
 * deliberately uneven: it moves slowly through the first half and accelerates
 * after the midpoint, because motivation rises as the finish line appears
 * closer (goal gradient, Hull 1932).
 */
const ENDOWED = 0.15;

export function progressFor(stepIndex) {
  const raw = Math.max(0, Math.min(1, stepIndex / (FLOW_LENGTH - 1)));
  const eased = raw < 0.5 ? raw * 0.8 : 0.4 + (raw - 0.5) * 1.2;
  return Math.round((ENDOWED + (1 - ENDOWED) * eased) * 100);
}
