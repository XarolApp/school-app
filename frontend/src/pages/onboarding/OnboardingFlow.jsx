import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSchoolsForMatching } from '../../api';
import { rankSchools } from '../../lib/matching';
import { RoleSwitch } from '../../components/onboarding/ObKit';
import { OnboardingContext } from './useOnboarding';
import { STEPS, stepIndexById, progressFor } from './steps';
import { cleanAnswers, initialAnswers } from './quizQuestions';
import './onboarding.css';

const ROLE_KEY = 'skolamatch.role';
const ANSWERS_KEY = 'skolamatch.onboarding.answers';

function loadRole() {
  try {
    return localStorage.getItem(ROLE_KEY) || null;
  } catch {
    return null;
  }
}

function loadAnswers() {
  try {
    const raw = sessionStorage.getItem(ANSWERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Step controller for the whole onboarding flow.
 *
 * The step id lives in the URL (/onboarding/:stepId) so the phone back button
 * behaves the way a 15-year-old expects instead of nuking the flow.
 *
 * Quiz answers stay CLIENT STATE (sessionStorage) all the way to the reveal.
 * Nothing about a minor is written to Supabase during onboarding — data
 * minimisation under GDPR Art. 8. Persist only if and when there is an account
 * to attach it to and a reason to keep it.
 */
function OnboardingFlow() {
  const { stepId } = useParams();
  const navigate = useNavigate();

  const [role, setRoleState] = useState(loadRole);
  const [answers, setAnswers] = useState(() => loadAnswers() || initialAnswers());
  const [intents, setIntents] = useState([]);
  const [commitment, setCommitment] = useState(null);
  const [schools, setSchools] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(null);
  const [purchased, setPurchased] = useState(false);

  // Load the catalogue once, early and in the background, so the reveal never
  // waits on the network after the labour-illusion screen has already run.
  useEffect(() => {
    let alive = true;
    fetchSchoolsForMatching()
      .then((res) => {
        if (!alive) return;
        setSchools(res.schools);
        setIsDemo(res.isDemo);
        setSchoolsError(res.error);
      })
      .finally(() => alive && setSchoolsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    } catch {
      /* private mode */
    }
  }, [answers]);

  const stepIndex = stepIndexById(stepId);

  // Unknown or missing step -> start at the beginning.
  useEffect(() => {
    if (stepIndex === -1) navigate(`/onboarding/${STEPS[0].id}`, { replace: true });
  }, [stepIndex, navigate]);

  // The role fork gates everything after it: voice, proof, motion, pricing.
  useEffect(() => {
    if (stepIndex > 1 && !role) navigate('/onboarding/role', { replace: true });
  }, [stepIndex, role, navigate]);

  const setRole = useCallback((next) => {
    setRoleState(next);
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  const setAnswer = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
      navigate(`/onboarding/${STEPS[clamped].id}`);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [navigate]
  );

  const goNext = useCallback(() => goTo(stepIndex + 1), [goTo, stepIndex]);
  const goBack = useCallback(() => {
    if (stepIndex <= 0) navigate('/');
    else goTo(stepIndex - 1);
  }, [goTo, stepIndex, navigate]);

  const cleaned = useMemo(() => cleanAnswers(answers), [answers]);

  const ranked = useMemo(
    () => (schools.length ? rankSchools(schools, cleaned, role || 'student') : []),
    [schools, cleaned, role]
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      answers,
      cleanedAnswers: cleaned,
      setAnswer,
      intents,
      setIntents,
      commitment,
      setCommitment,
      schools,
      isDemo,
      schoolsLoading,
      schoolsError,
      ranked,
      purchased,
      setPurchased,
      stepIndex,
      totalSteps: STEPS.length,
      progress: progressFor(stepIndex),
      goNext,
      goBack,
      goTo,
    }),
    [
      role,
      setRole,
      answers,
      cleaned,
      setAnswer,
      intents,
      commitment,
      schools,
      isDemo,
      schoolsLoading,
      schoolsError,
      ranked,
      purchased,
      stepIndex,
      goNext,
      goBack,
      goTo,
    ]
  );

  if (stepIndex === -1) return null;

  const step = STEPS[stepIndex];
  const Screen = step.component;

  return (
    <OnboardingContext.Provider value={value}>
      <div className={`ob-root ob-role-${role || 'none'}`} data-step={step.id}>
        {step.chrome && role && (
          <div className="ob-roleswitch-bar">
            <RoleSwitch role={role} onSwitch={setRole} />
          </div>
        )}
        <Screen step={step} />
      </div>
    </OnboardingContext.Provider>
  );
}

export default OnboardingFlow;
