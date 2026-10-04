import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { acknowledgeBetaGuidance, submitBetaFeedback, fetchBetaMe } from '../api';
import BetaInstructions from './BetaInstructions';
import { BetaToolsContext } from './BetaToolsContext';
import { useAuth } from './AuthContext';
import Modal from './Modal';

const EMPTY_DRAFT = { type: 'comment', message: '' };

function formatDeadline(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Prague',
  }).format(date);
}

function BetaToolsUI({
  profile,
  profileLoading,
  isSignedIn,
  emailConfirmed,
  isTester,
  isPasswordRecovery,
  userId,
  refreshProfile,
  feedbackOpen,
  feedbackPageUrl,
  feedbackRequestId,
  openFeedback,
  closeFeedback,
  beta,
  refreshBeta,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [feedbackErrorState, setFeedbackErrorState] = useState({ requestId: null, message: '' });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [submittedUntil, setSubmittedUntil] = useState(null);
  const [submittedForRequest, setSubmittedForRequest] = useState(null);
  const [guidanceError, setGuidanceError] = useState('');
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const guidanceAttemptedFor = useRef(new Set());
  const feedbackButtonRef = useRef(null);
  const feedbackMessageRef = useRef(null);
  const guidanceDismissedFor = useRef(new Set());

  const canShow = isSignedIn && emailConfirmed && isTester && profile && !profileLoading;
  const feedbackError = feedbackErrorState.requestId === feedbackRequestId ? feedbackErrorState.message : '';

  useEffect(() => {
    setDraft(EMPTY_DRAFT);
    setSubmittedUntil(null);
    setSubmittedForRequest(null);
    closeFeedback();
    setGuidanceOpen(false);
    setGuidanceError('');
    guidanceAttemptedFor.current.clear();
    guidanceDismissedFor.current.clear();
  }, [userId, closeFeedback]);

  const acknowledge = useCallback(async () => {
    if (!userId || guidanceAttemptedFor.current.has(userId)) return;
    guidanceAttemptedFor.current.add(userId);
    setGuidanceBusy(true);
    setGuidanceError('');
    try {
      await acknowledgeBetaGuidance();
      await refreshProfile();
    } catch {
      guidanceAttemptedFor.current.delete(userId);
      setGuidanceError('Nepodařilo se uložit potvrzení. Zkus to prosím znovu.');
    } finally {
      setGuidanceBusy(false);
    }
  }, [userId, refreshProfile]);

  useEffect(() => {
    if (!canShow || isPasswordRecovery) return;
    if (profile.tester_guidance_seen_at || guidanceDismissedFor.current.has(userId)) return;
    setGuidanceOpen(true);
  }, [canShow, isPasswordRecovery, profile?.tester_guidance_seen_at, userId, acknowledge]);

  useEffect(() => {
    const onExpired = (event) => {
      if (!canShow || event.detail?.userId !== userId) return;
      if (location.pathname !== '/predplatne') {
        navigate('/predplatne', {
          replace: true,
          state: { from: { pathname: location.pathname }, betaPaused: true },
        });
      }
      void refreshProfile();
    };
    window.addEventListener('skolamatch:beta-access-expired', onExpired);
    return () => window.removeEventListener('skolamatch:beta-access-expired', onExpired);
  }, [canShow, userId, location.pathname, navigate, refreshProfile]);

  const handleOpenFeedback = useCallback(() => {
    setGuidanceOpen(false);
    openFeedback();
  }, [openFeedback]);

  const dismissGuidance = () => {
    guidanceDismissedFor.current.add(userId);
    setGuidanceOpen(false);
    void acknowledge();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedbackBusy(true);
    try {
      const result = await submitBetaFeedback({
        type: draft.type,
        message: draft.message,
        pageUrl: feedbackPageUrl,
      });
      setDraft(EMPTY_DRAFT);
      setSubmittedUntil(result.testerAccessUntil);
      setSubmittedForRequest(feedbackRequestId);
      await refreshProfile();
      await refreshBeta();
    } catch (error) {
      setFeedbackErrorState({
        requestId: feedbackRequestId,
        message: error.message || 'Zprávu se nepodařilo odeslat. Zkus to prosím znovu.',
      });
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
    <>
      {canShow && profile.betaProgramActive && (
        <div className={`beta-floating-tools${location.pathname.startsWith('/onboarding/') ? ' is-onboarding' : ''}`}>
        <button type="button" className="beta-help-trigger" aria-label="Pokyny k beta testování" onClick={() => setGuidanceOpen(true)}>?</button>
        <button
          ref={feedbackButtonRef}
          type="button"
          className="beta-feedback-trigger"
          onClick={handleOpenFeedback}
        >
          Zpětná vazba
        </button>
        </div>
      )}

      <Modal
        open={Boolean(canShow && guidanceOpen && !isPasswordRecovery)}
        title="Vítej v testování Střední na míru"
        onDismiss={dismissGuidance}
        busy={guidanceBusy}
        className="beta-modal"
      >
        <BetaInstructions beta={beta} hours={profile?.betaAccessHours} onDone={dismissGuidance} onRefresh={refreshBeta} busy={guidanceBusy} />
        {guidanceError && (
          <div className="notice notice-error" role="alert">
            <p className="notice-text">{guidanceError}</p>
          </div>
        )}
        <div className="ss-dialog-actions">
          {guidanceError && <button type="button" className="ss-btn ss-btn-secondary" onClick={acknowledge} disabled={guidanceBusy}>Zkusit znovu</button>}
          <button type="button" className="ss-btn ss-btn-primary" onClick={dismissGuidance}>Rozumím</button>
        </div>
      </Modal>

      <Modal
        open={Boolean(canShow && feedbackOpen)}
        title="Zpětná vazba"
        onDismiss={closeFeedback}
        busy={feedbackBusy}
        initialFocusRef={feedbackMessageRef}
        returnFocusRef={feedbackButtonRef}
        className="beta-modal"
      >
        {submittedForRequest === feedbackRequestId && submittedUntil ? (
          <div className="stack" role="status">
            <div className="notice notice-success">
              <span className="notice-title">Děkujeme za zprávu</span>
              <p className="notice-text">Přístup je obnoven do {formatDeadline(submittedUntil)}.</p>
            </div>
            <button type="button" className="ss-btn ss-btn-primary" onClick={closeFeedback}>Pokračovat</button>
          </div>
        ) : (
          <form className="stack beta-feedback-form" onSubmit={handleSubmit}>
            <p className="ss-body-md">Odesláním zpětné vazby se testovací přístup obnoví o {profile?.betaAccessHours || 48} hodin, nejdéle však do konce programu.</p>
            <label className="field">
              <span className="field-label">Typ zprávy</span>
              <select className="input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                <option value="bug">Nahlásit problém</option>
                <option value="idea">Nápad na zlepšení</option>
                <option value="comment">Obecný komentář</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Co se stalo nebo co by ti pomohlo?</span>
              <textarea
                ref={feedbackMessageRef}
                className="input beta-feedback-message"
                minLength={10}
                maxLength={4000}
                required
                value={draft.message}
                onChange={(event) => setDraft({ ...draft, message: event.target.value })}
              />
              <span className="field-hint">Napiš alespoň 10 znaků. Nepřidávej osobní údaje.</span>
            </label>
            {feedbackError && <div className="notice notice-error" role="alert"><p className="notice-text">{feedbackError}</p></div>}
            <div className="ss-dialog-actions">
              <button type="button" className="ss-btn ss-btn-secondary" onClick={closeFeedback} disabled={feedbackBusy}>Zavřít</button>
              <button type="submit" className="ss-btn ss-btn-primary" disabled={feedbackBusy || draft.message.trim().length < 10}>
                {feedbackBusy ? 'Odesílám…' : 'Odeslat a pokračovat'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function BetaTools({ children }) {
  const { profile, profileLoading, isSignedIn, emailConfirmed, isTester, isPasswordRecovery, user, refreshProfile } = useAuth();
  const location = useLocation();
  const [betaState, setBetaState] = useState(null);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const refreshBeta = useCallback(async () => {
    if (!user?.id || !isTester || !emailConfirmed) return;
    const id = user.id;
    const value = await fetchBetaMe();
    if (currentUser.current === id) setBetaState(value);
  }, [user?.id, isTester, emailConfirmed]);
  useEffect(() => {
    setBetaState(null);
    if (!isTester || !emailConfirmed) return;
    void refreshBeta().catch(() => {});
    const timer = setInterval(() => void refreshBeta().catch(() => {}), 15000);
    return () => clearInterval(timer);
  }, [isTester, emailConfirmed, refreshBeta]);
  const [feedbackState, setFeedbackState] = useState({ open: false, pageUrl: '/', requestId: 0 });
  const openFeedback = useCallback(() => {
    setFeedbackState((previous) => ({
      open: true,
      pageUrl: location.pathname,
      requestId: previous.requestId + 1,
    }));
  }, [location.pathname]);
  const closeFeedback = useCallback(() => {
    setFeedbackState((previous) => ({ ...previous, open: false }));
  }, []);

  return (
    <BetaToolsContext.Provider value={{ openFeedback, beta: betaState, refreshBeta }}>
      {children}
      <BetaToolsUI
        profile={profile}
        profileLoading={profileLoading}
        isSignedIn={isSignedIn}
        emailConfirmed={emailConfirmed}
        isTester={isTester}
        isPasswordRecovery={isPasswordRecovery}
        userId={user?.id}
        refreshProfile={refreshProfile}
        feedbackOpen={feedbackState.open}
        feedbackPageUrl={feedbackState.pageUrl}
        feedbackRequestId={feedbackState.requestId}
        openFeedback={openFeedback}
        closeFeedback={closeFeedback}
        beta={betaState}
        refreshBeta={refreshBeta}
      />
    </BetaToolsContext.Provider>
  );
}

export default BetaTools;
