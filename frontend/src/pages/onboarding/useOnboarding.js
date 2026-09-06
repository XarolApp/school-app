import { createContext, useContext } from 'react';

/**
 * Onboarding state shared by every screen.
 *
 * {
 *   role: 'student' | 'parent' | null,
 *   setRole(role),
 *   answers: object,          // quiz answers, CLIENT STATE ONLY until the reveal
 *   setAnswer(key, value),
 *   intents: string[],        // multi-intent selection
 *   commitment: string|null,
 *   schools: array, isDemo: bool, schoolsLoading: bool,
 *   ranked: array,            // deterministic match results (memoised)
 *   planId, setPlanId,      // selected plan, shared by the five paywall
 *                            // screens (plan / zkusebni / platba) — they must
 *                            // all describe the SAME purchase
 *   goNext(), goBack(), goTo(index), goToStep(id),
 *   stepIndex, totalSteps,
 *   phase: string|null       // honest phase label ("Než začneme"). There is
 *                            // deliberately NO flow-wide `progress` percentage:
 *                            // see steps.js `quizProgressPercent` — the only
 *                            // real number is questions answered / questions.
 * }
 */
export const OnboardingContext = createContext(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingFlow');
  return ctx;
}

/** Role helper: true when the formal (vykání) voice must be used. */
export function isParent(role) {
  return role === 'parent';
}
