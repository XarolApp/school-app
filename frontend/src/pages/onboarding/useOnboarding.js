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
 *   goNext(), goBack(), skip(),
 *   stepIndex, totalSteps, progress
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
