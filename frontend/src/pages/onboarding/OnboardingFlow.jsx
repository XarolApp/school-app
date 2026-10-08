import { track } from '../../lib/betaTrack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchHandoffStatus, fetchSchoolsForMatching, revokeHandoff, saveOnboardingAnswers } from '../../api';
import { rankSchools } from '../../lib/matching';
import { ObScreen, RoleSwitch } from '../../components/onboarding/ObKit';
import HandoffLock from '../../components/onboarding/HandoffLock';
import { useAuth } from '../../components/AuthContext';
import { OnboardingContext } from './useOnboarding';
import { PHASES, STEPS, stepIndexById } from './steps';
import { DEFAULT_PLAN_ID } from '../../config/pricing';
import { cleanAnswers, initialAnswers, QUESTIONS } from './quizQuestions';
import { ROLE_KEY, ANSWERS_KEY, readGenderPreference, writeGenderPreference } from '../../lib/onboardingStorage';
export { ROLE_KEY, ANSWERS_KEY };
import './onboarding.css';

const PAYWALL_STEP_IDS = new Set(['hodnota', 'cesta', 'ucet', 'plan', 'zkusebni', 'platba']);
const FINAL_QUESTION_INDEX = QUESTIONS.length - 1;

function loadRole() {
  try {
    return localStorage.getItem(ROLE_KEY) || null;
  } catch {
    return null;
  }
}

function loadOwnerHandoff() {
  try {
    const raw = localStorage.getItem('skolamatch.handoff.owner');
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (typeof saved?.token === 'string' && typeof saved?.ownerSecret === 'string' && typeof saved?.url === 'string') {
      return saved;
    }
    localStorage.removeItem('skolamatch.handoff.owner');
    return null;
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
 * Quiz answers stay in sessionStorage during the flow. A signed-in tester's
 * completed answers are saved only after they advance from the final question;
 * normal signup keeps its email-bound localStorage stash until confirmation
 * (lib/pendingOnboardingAnswers.js and AuthContext's flush).
 */
function OnboardingFlow() {
  const { stepId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isSignedIn, user, profile, profileLoading, profileError, refreshProfile } = useAuth();
  const isTester = profile?.isTester === true;
  const betaPreviewRequested = new URLSearchParams(location.search).get('betaPreview') === '1';
  const betaPreview =
    betaPreviewRequested &&
    isTester &&
    isSignedIn &&
    !loading &&
    !profileLoading &&
    !profileError &&
    Boolean(profile);

  const [role, setRoleState] = useState(loadRole);
  const [gender, setGenderState] = useState(readGenderPreference);
  const [ownerHandoff, setOwnerHandoff] = useState(loadOwnerHandoff);
  const [ownerHandoffStatus, setOwnerHandoffStatus] = useState('loading');
  const [ownerHandoffError, setOwnerHandoffError] = useState(null);
  const [answers, setAnswers] = useState(() => loadAnswers() || initialAnswers());
  const [intents, setIntents] = useState([]);
  const [commitment, setCommitment] = useState(null);
  const [schools, setSchools] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(null);
  const [purchased, setPurchased] = useState(false);
  // The paywall is five screens now (hodnota -> cesta -> plan -> zkusebni ->
  // platba), so the selected plan can no longer be local state inside one
  // component: the trial rail and the order summary both have to read the same
  // choice. Pre-selected per ruling C-8.
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [quizSave, setQuizSave] = useState({
    status: 'idle',
    userId: null,
    error: null,
    completionReached: false,
  });
  const quizSaveInFlight = useRef(null);
  const checkOwnerHandoff = useCallback(async () => {
    if (!ownerHandoff?.token || !ownerHandoff?.ownerSecret) return;
    setOwnerHandoffStatus('loading');
    setOwnerHandoffError(null);
    try {
      const { status } = await fetchHandoffStatus(ownerHandoff.token, ownerHandoff.ownerSecret);
      if (status === 'revoked' || status === 'expired') {
        localStorage.removeItem('skolamatch.handoff.owner');
        setOwnerHandoff(null);
        setOwnerHandoffStatus('idle');
        return;
      }
      setOwnerHandoffStatus(status);
    } catch (error) {
      if (error?.status === 404) {
        localStorage.removeItem('skolamatch.handoff.owner');
        setOwnerHandoff(null);
        setOwnerHandoffStatus('idle');
      } else {
        setOwnerHandoffError(error?.status ? error.message : 'Připojení se nepodařilo. Odkaz zůstává zamčený. Zkus to prosím znovu.');
        setOwnerHandoffStatus('error');
      }
    }
  }, [ownerHandoff]);

  useEffect(() => {
    const syncOwnerHandoff = () => {
      const next = loadOwnerHandoff();
      setOwnerHandoff(next);
      setOwnerHandoffStatus(next ? 'loading' : 'idle');
      setOwnerHandoffError(null);
    };
    window.addEventListener('skolamatch:handoff-owner', syncOwnerHandoff);
    return () => window.removeEventListener('skolamatch:handoff-owner', syncOwnerHandoff);
  }, []);

  useEffect(() => {
    if (!ownerHandoff?.token) return undefined;
    checkOwnerHandoff();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') checkOwnerHandoff();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [ownerHandoff, checkOwnerHandoff]);

  const releaseOwnerHandoff = useCallback(async () => {
    try {
      await revokeHandoff(ownerHandoff.token, ownerHandoff.ownerSecret);
      localStorage.removeItem('skolamatch.handoff.owner');
      setOwnerHandoff(null);
      setOwnerHandoffStatus('idle');
      setOwnerHandoffError(null);
    } catch (error) {
      if (error?.status === 404) {
        localStorage.removeItem('skolamatch.handoff.owner');
        setOwnerHandoff(null);
        setOwnerHandoffStatus('idle');
      } else {
        setOwnerHandoffError(error?.status ? error.message : 'Odkaz se nepodařilo zrušit. Zkus to prosím znovu.');
        setOwnerHandoffStatus('error');
      }
    }
  }, [ownerHandoff]);

  const currentUserId = useRef(user?.id ?? null);
  currentUserId.current = user?.id ?? null;

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
  useEffect(() => {
    track('ob_step', { step: stepId, role });
    if (['hodnota','cesta','plan','zkusebni','platba'].includes(stepId)) track('paywall_view', { screen: stepId });
  }, [stepId, role]);

  const profileResolved = !loading && isSignedIn && !profileLoading && !profileError && Boolean(profile);
  const holdTesterPreviewRoute =
    betaPreviewRequested &&
    PAYWALL_STEP_IDS.has(stepId) &&
    (loading || (isSignedIn && (profileLoading || profileError || isTester)));

  // Unknown or missing step -> start at the beginning.
  useEffect(() => {
    if (stepIndex === -1) navigate(`/onboarding/${STEPS[0].id}`, { replace: true });
  }, [stepIndex, navigate]);

  // The role fork gates everything after it: voice, proof, motion, pricing.
  useEffect(() => {
    if (stepIndex > 1 && !role && !holdTesterPreviewRoute) {
      navigate('/onboarding/role', { replace: true });
    }
  }, [stepIndex, role, navigate, holdTesterPreviewRoute]);

  const setRole = useCallback((next) => {
    setRoleState(next);
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  const setGender = useCallback((next) => {
    const value = next === 'm' || next === 'f' || next === 'u' ? next : null;
    setGenderState(value);
    writeGenderPreference(value);
  }, []);

  const setAnswer = useCallback((key, value) => {
    track('ob_answer', { key, skipped: value == null || value === '' || Array.isArray(value) && !value.length });
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goTo = useCallback(
    (index, { includeBetaPreview = false, replace = false } = {}) => {
      let clamped = Math.max(0, Math.min(STEPS.length - 1, index));
      if ((betaPreview || (betaPreviewRequested && isTester && isSignedIn)) && STEPS[clamped]?.id === 'ucet') {
        clamped = stepIndexById('plan');
      }
      const preservePreview = isTester && isSignedIn && (betaPreviewRequested || includeBetaPreview);
      navigate(
        `/onboarding/${STEPS[clamped].id}${preservePreview ? '?betaPreview=1' : ''}`,
        { replace }
      );
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [navigate, betaPreview, betaPreviewRequested, isTester, isSignedIn]
  );

  const goNext = useCallback(() => {
    const currentStep = STEPS[stepIndex];
    if (
      currentStep?.questionIndex === FINAL_QUESTION_INDEX &&
      isSignedIn &&
      user?.id &&
      !betaPreviewRequested
    ) {
      setQuizSave({ status: 'pending', userId: user.id, error: null, completionReached: false });
    }
    goTo(stepIndex + 1);
  }, [goTo, stepIndex, isSignedIn, user?.id, betaPreviewRequested]);
  const goBack = useCallback(() => {
    if (stepIndex <= 0) navigate('/');
    else if (betaPreview && STEPS[stepIndex - 1]?.id === 'ucet') goTo(stepIndexById('cesta'));
    else goTo(stepIndex - 1);
  }, [goTo, stepIndex, navigate, betaPreview]);

  /** Jump to a named step. The paywall screens branch (a plan without a trial
   *  skips the trial rail entirely), and importing steps.js from a screen would
   *  close an import cycle, so the id->index lookup lives here. */
  const goToStep = useCallback(
    (id, options) => {
      const idx = stepIndexById(id);
      if (idx !== -1) goTo(idx, options);
    },
    [goTo]
  );

  const cleaned = useMemo(() => cleanAnswers(answers), [answers]);

  const startBetaPreview = useCallback(
    (id = 'hodnota') => {
      const idx = stepIndexById(id);
      if (isTester && isSignedIn && idx !== -1) goTo(idx, { includeBetaPreview: true });
    },
    [goTo, isTester, isSignedIn]
  );

  const leaveBetaPreview = useCallback(() => navigate('/skoly'), [navigate]);

  // Only the final quiz action marks completion. This effect runs on the next
  // screen, after React has committed the final answer (including a same-event
  // skip/clear), and is never triggered by a direct preview URL.
  useEffect(() => {
    if (quizSave.status !== 'pending' || !quizSave.userId) return;
    if (!quizSave.completionReached) {
      if (STEPS[stepIndex]?.questionIndex === FINAL_QUESTION_INDEX) return;
      setQuizSave({ ...quizSave, completionReached: true });
      return;
    }
    if (loading || profileLoading || profileError) return;
    if (user?.id !== quizSave.userId || !isSignedIn) {
      if (user?.id !== quizSave.userId) setQuizSave({ status: 'idle', userId: null, error: null });
      return;
    }
    if (profile?.isTester !== true) {
      setQuizSave({ status: 'idle', userId: null, error: null });
      return;
    }
    if (quizSaveInFlight.current === quizSave.userId) return;

    quizSaveInFlight.current = quizSave.userId;
    setQuizSave({ ...quizSave, status: 'saving' });
    saveOnboardingAnswers(cleaned)
      .then(() => {
        if (currentUserId.current !== quizSave.userId) {
          setQuizSave({ status: 'idle', userId: null, error: null });
          return;
        }
        // Both already_saved and nothing_to_score are terminal successes from
        // this one-run-per-account endpoint.
        setQuizSave({ status: 'saved', userId: quizSave.userId, error: null });
      })
      .catch((err) => {
        if (currentUserId.current === quizSave.userId) {
          setQuizSave({ status: 'error', userId: quizSave.userId, error: err.message || 'Uložení se nezdařilo.' });
        } else {
          setQuizSave({ status: 'idle', userId: null, error: null });
        }
      })
      .finally(() => {
        if (quizSaveInFlight.current === quizSave.userId) quizSaveInFlight.current = null;
      });
  }, [quizSave, stepIndex, loading, profileLoading, profileError, user?.id, profile?.isTester, isSignedIn, cleaned]);

  const retryQuizSave = useCallback(() => {
    if (quizSave.userId === user?.id && profileError) {
      setQuizSave({ ...quizSave, status: 'pending', error: null });
      refreshProfile();
    } else if (quizSave.status === 'error' && user?.id === quizSave.userId) {
      setQuizSave({ ...quizSave, status: 'pending', error: null });
    }
  }, [quizSave, user?.id, profileError, refreshProfile]);

  // Keep navigation intent through browser back and every in-flow jump. A URL
  // marker never grants preview access: only the server-derived tester profile
  // can make it active.
  useEffect(() => {
    if (betaPreview && stepId === 'ucet') goToStep('plan');
  }, [betaPreview, stepId, goToStep]);

  const ranked = useMemo(
    () => (schools.length ? rankSchools(schools, cleaned, role || 'student') : []),
    [schools, cleaned, role]
  );

  // Honest chrome: a phase name, never a fabricated completion percentage.
  // The only real percentage in the flow is computed on the quiz screen itself
  // from the question index (steps.js `quizProgressPercent`).
  const phase = PHASES[STEPS[stepIndex]?.phase] || null;

  const value = useMemo(
    () => ({
      role,
      setRole,
      gender,
      setGender,
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
      planId,
      setPlanId,
      stepIndex,
      totalSteps: STEPS.length,
      phase,
      goNext,
      goBack,
      goTo,
      goToStep,
      isTester,
      betaPreview,
      profileResolved,
      profileResolving: loading || profileLoading,
      profileError,
      refreshProfile,
      startBetaPreview,
      leaveBetaPreview,
    }),
    [
      role,
      setRole,
      gender,
      setGender,
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
      planId,
      stepIndex,
      phase,
      goNext,
      goBack,
      goTo,
      goToStep,
      isTester,
      betaPreview,
      profileResolved,
      loading,
      profileLoading,
      profileError,
      refreshProfile,
      startBetaPreview,
      leaveBetaPreview,
    ]
  );

  if (stepIndex === -1) return null;

  const step = STEPS[stepIndex];
  const Screen = step.component;
  const quizSaveNotice =
    (quizSave.status === 'error' || (quizSave.status === 'pending' && profileError)) &&
    quizSave.userId === user?.id ? (
    <div className="notice" role="alert">
      <span className="notice-title">
        {profileError ? 'Tester účet se nepodařilo ověřit' : 'Výsledky dotazníku se zatím neuložily'}
      </span>
      <p className="notice-text">
        {profileError
          ? 'Profil je potřeba znovu načíst, než půjde výsledky bezpečně uložit.'
          : `${quizSave.error} Můžeš to zkusit znovu.`}
      </p>
      <button type="button" className="ob-btn ob-btn-secondary" onClick={retryQuizSave}>Zkusit znovu</button>
    </div>
  ) : null;

  if (ownerHandoff) {
    if (ownerHandoffStatus === 'loading' || ownerHandoffStatus === 'idle') {
      return (
        <div className={'ob-root ob-role-' + (role || 'none')}>
          <ObScreen chrome={false}>
            <h1 className="ob-title">Načítám…</h1>
          </ObScreen>
        </div>
      );
    }
    return (
      <div className={'ob-root ob-role-' + (role || 'none')}>
        <HandoffLock
          status={ownerHandoffStatus}
          error={ownerHandoffError}
          url={ownerHandoff.url}
          onRefresh={checkOwnerHandoff}
          onRevoke={releaseOwnerHandoff}
          onStartOwn={() => {
            localStorage.removeItem('skolamatch.handoff.owner');
            setOwnerHandoff(null);
            setOwnerHandoffStatus('idle');
            goToStep('welcome');
          }}
        />
      </div>
    );
  }

  if (betaPreviewRequested && (loading || (isSignedIn && profileLoading))) {
    return (
      <div className={`ob-root ob-role-${role || 'none'}`} data-step={step.id}>
        <ObScreen chrome={false}>
          <h1 className="ob-title">Ověřujeme tester účet</h1>
          <p className="ob-hint">Chvilku prosím počkej, než zpřístupníme bezpečnou ukázku.</p>
        </ObScreen>
      </div>
    );
  }

  if (betaPreviewRequested && isSignedIn && profileError && PAYWALL_STEP_IDS.has(step.id)) {
    return (
      <div className={`ob-root ob-role-${role || 'none'}`} data-step={step.id}>
        <ObScreen chrome={false}>
          <h1 className="ob-title">Ověření tester účtu se nezdařilo</h1>
          <p className="ob-hint">Ukázku neotevřeme, dokud se nepodaří bezpečně načíst účet.</p>
          <button type="button" className="ob-btn ob-btn-secondary" onClick={refreshProfile}>Zkusit znovu</button>
        </ObScreen>
      </div>
    );
  }

  if (betaPreview && PAYWALL_STEP_IDS.has(step.id) && !role) {
    return (
      <div className="ob-root ob-role-none" data-step={step.id}>
        {quizSaveNotice}
        <ObScreen chrome={false}>
          <div className="ob-fork">
            <h1 className="ob-title">Kdo bude ukázku procházet?</h1>
            <p className="ob-lead">Podle volby upravíme oslovení v ukázkových obrazovkách.</p>
            <div className="ob-fork-cards">
              <button type="button" className="ob-fork-card" onClick={() => setRole('student')}>
                <strong>Jsem student</strong>
                <span className="ob-fork-sub">Procházím výběr školy pro sebe.</span>
              </button>
              <button type="button" className="ob-fork-card" onClick={() => setRole('parent')}>
                <strong>Jsem rodič</strong>
                <span className="ob-fork-sub">Procházím výběr školy pro své dítě.</span>
              </button>
            </div>
          </div>
        </ObScreen>
      </div>
    );
  }

  if (isTester && isSignedIn && PAYWALL_STEP_IDS.has(step.id) && !profileResolved) {
    return (
      <div className={`ob-root ob-role-${role || 'none'}`} data-step={step.id}>
        {quizSaveNotice}
        <ObScreen chrome={false}>
          <h1 className="ob-title">Ověřujeme tester účet</h1>
          <p className="ob-hint">
            {profileError
              ? 'Účet se nepodařilo ověřit. Zkus načíst profil znovu.'
              : 'Chvilku prosím počkej, než zpřístupníme bezpečnou ukázku.'}
          </p>
          {profileError && <button type="button" className="ob-btn ob-btn-secondary" onClick={refreshProfile}>Zkusit znovu</button>}
        </ObScreen>
      </div>
    );
  }

  if (isTester && profileResolved && PAYWALL_STEP_IDS.has(step.id) && !betaPreview) {
    const parent = role === 'parent';
    return (
      <div className={`ob-root ob-role-${role || 'none'}`} data-step={step.id}>
        {quizSaveNotice}
        <ObScreen chrome={false}>
          <div className="ob-fork">
            <h1 className="ob-title">
              {parent ? 'Děkujeme, že testujete Střední na míru' : 'Díky, že testuješ Střední na míru'}
            </h1>
            <p className="ob-lead">
              {parent
                ? 'Výběr škol máte hotový. Platební obrazovky si můžete bezpečně prohlédnout jako ukázku.'
                : 'Výběr škol máš hotový. Platební obrazovky si můžeš bezpečně prohlédnout jako ukázku.'}
            </p>
            <div className="ob-fork-cards">
              <button type="button" className="ob-fork-card" onClick={leaveBetaPreview}>
                <strong>Pokračovat v testování</strong>
                <span className="ob-fork-sub">Vrátit se ke školám. Za testovací účet se nic neplatí.</span>
              </button>
              <button
                type="button"
                className="ob-fork-card"
                onClick={() => startBetaPreview(step.id === 'ucet' ? 'plan' : step.id)}
              >
                <strong>Prohlédnout si ukázkové obrazovky</strong>
                <span className="ob-fork-sub">Ceny a platební podmínky se na beta účet nevztahují.</span>
              </button>
            </div>
          </div>
        </ObScreen>
      </div>
    );
  }

  return (
    <OnboardingContext.Provider value={value}>
      <div className={`ob-root ob-role-${role || 'none'}`} data-step={step.id}>
        {step.chrome && role && (
          <div className="ob-roleswitch-bar">
            <RoleSwitch role={role} onSwitch={setRole} />
          </div>
        )}
        {betaPreview && PAYWALL_STEP_IDS.has(step.id) && (
          <div className="ob-mock-note" role="status">
            <strong>Náhled platebních obrazovek.</strong>{' '}
            {role === 'parent'
              ? 'Nic neplatíte a nic se nestrhne. Chceme jen váš názor: jsou ceny a texty srozumitelné a působí to důvěryhodně? Napište nám přes „Zpětná vazba“.'
              : 'Nic neplatíš a nic se nestrhne. Chceme jen tvůj názor: jsou ceny a texty srozumitelné a působí to důvěryhodně? Napiš nám přes „Zpětná vazba“.'}{' '}
            <button type="button" className="ob-inline-link" onClick={leaveBetaPreview}>Zpět ke školám</button>
          </div>
        )}
        {quizSaveNotice}
        <Screen step={step} />
      </div>
    </OnboardingContext.Provider>
  );
}

export default OnboardingFlow;
