import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { acknowledgeBetaGuidance, fetchBetaMe } from '../api';
import { BetaToolsContext } from './BetaToolsContext';
import { useAuth } from './AuthContext';
import BetaInstructions from './BetaInstructions';
import BetaFeedbackSheet from './BetaFeedbackSheet';
import BetaReward from './BetaReward';
import Modal from './Modal';
import BetaClosingQuestionnaire from './BetaClosingQuestionnaire';
import { betaTracker } from '../lib/betaTrack';

function BetaToolsUI({ profile, canShow, isPasswordRecovery, userId, refreshProfile, beta, refreshBeta, feedback, openFeedback, closeFeedback }) {
  const location = useLocation(), navigate = useNavigate();
  const [closingOpen,setClosingOpen]=useState(false), [guidanceOpen,setGuidanceOpen] = useState(false), [guidanceBusy,setGuidanceBusy] = useState(false), [guidanceError,setGuidanceError] = useState('');
  const acknowledged = useRef(false), dismissed = useRef(false);
  const parent = ['rodic','ucitel'].includes(beta?.role);
  const firstRun = !profile?.tester_guidance_seen_at;
  const until=new Date(profile?.effectiveAccessUntil || 0).getTime();
  const hoursLeft=(until-Date.now())/3600000;
  useEffect(() => {
    if (canShow && !isPasswordRecovery && !dismissed.current && !profile.tester_guidance_seen_at) setGuidanceOpen(true);
  }, [canShow,isPasswordRecovery,profile?.tester_guidance_seen_at]);
  const dismissGuidance = async () => {
    if (!canShow || !beta?.consent_tracking_at || acknowledged.current || profile.tester_guidance_seen_at) {dismissed.current = true;setGuidanceOpen(false);return;}
    acknowledged.current = true; setGuidanceBusy(true); setGuidanceError('');
    try { await acknowledgeBetaGuidance(); dismissed.current = true;setGuidanceOpen(false);await refreshProfile(); }
    catch { acknowledged.current = false; setGuidanceError('Potvrzení se nepodařilo uložit. Pokyny lze otevřít znovu pomocí otazníku.'); }
    finally { setGuidanceBusy(false); }
  };
  useEffect(() => {
    const onExpired = (event) => {
      if (!canShow || event.detail?.userId !== userId) return;
      if (location.pathname !== '/predplatne') navigate('/predplatne', { replace: true, state: { from: { pathname: location.pathname }, betaPaused: true } });
      void refreshProfile();
    };
    window.addEventListener('skolamatch:beta-access-expired',onExpired);
    return () => window.removeEventListener('skolamatch:beta-access-expired',onExpired);
  }, [canShow,userId,location.pathname,navigate,refreshProfile]);
  return <>
    {canShow && profile.betaProgramActive && beta?.closing_due_at && !beta.closing_done_at && <div className="beta-banner" data-beta-tools role="status">
      {profile.closingPaused?'Před pokračováním je potřeba závěrečný dotazník.':'Závěrečný dotazník je připravený. Na odpovědi je 24 hodin.'}
      <button type="button" className="ss-btn ss-btn-primary" onClick={()=>setClosingOpen(true)}>Vyplnit dotazník</button>
    </div>}
    <div data-beta-tools><Modal open={Boolean(canShow && profile.betaProgramActive && !guidanceOpen && beta && !beta.closing_done_at && (closingOpen || profile.closingPaused))} title="Závěrečný dotazník" onDismiss={()=>setClosingOpen(false)} className="beta-modal beta-closing-modal">
      <BetaClosingQuestionnaire role={beta?.role} onDone={()=>{setClosingOpen(false);void refreshBeta();void refreshProfile();}} />
    </Modal></div>
    {canShow && profile.betaProgramActive && profile.hasAccess && hoursLeft>0 && hoursLeft<=12 && <div className="beta-banner" data-beta-tools role="status">
      {parent?'Do 12 hodin se Vám přístup pozastaví — stačí poslat jednu připomínku.':'Do 12 hodin se ti přístup pozastaví — stačí poslat jednu připomínku.'}
      <button type="button" className="ss-btn ss-btn-secondary" onClick={openFeedback}>Poslat připomínku</button>
    </div>}
    <BetaReward beta={beta} enabled={Boolean(canShow && beta?.consent_tracking_at && profile.betaProgramActive && profile.hasAccess && !guidanceOpen && !feedback.open && !closingOpen && !profile.closingPaused)} onRefresh={refreshBeta} />
    {canShow && profile.betaProgramActive && <div data-beta-tools className={`beta-floating-tools${location.pathname.startsWith('/onboarding/') ? ' is-onboarding' : ''}`}>
      <button type="button" className="beta-help-trigger" aria-label="Pokyny k beta testování" onClick={() => setGuidanceOpen(true)}>?</button>
      <button type="button" className="beta-feedback-trigger" onClick={() => { setGuidanceOpen(false); openFeedback(); }}>Zpětná vazba</button>
    </div>}
    {canShow && guidanceError && <p className="beta-banner" role="alert" data-beta-tools>{guidanceError}</p>}
    {/* First run must be read to the end: no Escape, no backdrop click. Once
        seen, the "?" opens a one-screen reference that closes normally. */}
    <div data-beta-tools><Modal open={Boolean(canShow && guidanceOpen && !isPasswordRecovery)}
      title={firstRun ? (parent ? 'Vítejte v testování Střední na míru' : 'Vítej v testování Střední na míru') : 'Pokyny k testování'}
      onDismiss={firstRun ? undefined : dismissGuidance} busy={guidanceBusy} className={`beta-modal${firstRun ? '' : ' beta-modal-reference'}`}>
      <BetaInstructions beta={beta} hours={profile?.betaAccessHours} onDone={dismissGuidance} onRefresh={refreshBeta} busy={guidanceBusy} reference={!firstRun} />
    </Modal></div>
    <BetaFeedbackSheet open={Boolean(canShow && feedback.open)} requestId={feedback.requestId} onClose={closeFeedback} pageUrl={feedback.pageUrl} beta={beta} programActive={profile?.betaProgramActive}
      onSuccess={() => { void refreshProfile(); void refreshBeta().catch(() => {}); }} />
  </>;
}
function BetaTools({ children }) {
  const { profile, profileLoading, isSignedIn, emailConfirmed, isTester, isPasswordRecovery, user, refreshProfile } = useAuth();
  const location = useLocation();
  const [betaState,setBetaState] = useState(null), [feedback,setFeedback] = useState({ open: false, pageUrl: '/', requestId: 0 });
  const currentUser = useRef(user?.id); currentUser.current = user?.id;
  const refreshBeta = useCallback(async () => {
    if (!user?.id || !isTester || !emailConfirmed) return;
    const id = user.id, value = await fetchBetaMe();
    if (currentUser.current === id) setBetaState(value);
  }, [user?.id,isTester,emailConfirmed]);
  // Ticking the checklist must feel instant: an action that counts for it sends
  // its event and re-reads the tester state right away instead of waiting for
  // the 10 s flush and the 60 s poll. Tab focus re-reads it too.
  useEffect(() => {
    if (!isTester || !emailConfirmed) return undefined;
    const counts = new Set(['q_finish','result_view','search','compare_open','matrix_weight','prihlaska_pick','theme_change','share_create','school_open','paywall_view']);
    let timer = null;
    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void betaTracker.flush().finally(() => { void refreshBeta().catch(() => {}); }); }, 1200);
    };
    const onEvent = (event) => { if (counts.has(event.detail?.name)) refreshSoon(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshSoon(); };
    window.addEventListener('snm:beta-event', onEvent);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timer); window.removeEventListener('snm:beta-event', onEvent); document.removeEventListener('visibilitychange', onVisible); };
  }, [isTester, emailConfirmed, refreshBeta]);
  useEffect(() => {
    setBetaState(null); setFeedback({ open: false, pageUrl: '/', requestId: 0 });
    if (!isTester || !emailConfirmed) return;
    void refreshBeta().catch(() => {});
    const timer = setInterval(() => void refreshBeta().catch(() => {}),60000);
    return () => clearInterval(timer);
  }, [isTester,emailConfirmed,refreshBeta]);
  const openFeedback = useCallback(() => setFeedback((previous) => ({ open: true, pageUrl: location.pathname, requestId: previous.requestId + 1 })), [location.pathname]);
  const closeFeedback = useCallback(() => setFeedback((previous) => ({ ...previous, open: false })), []);
  // The confirmation tab only says "you can close this"; the guidance opens in
  // the tab the tester actually continues in.
  const canShow = isSignedIn && emailConfirmed && isTester && profile && !profileLoading && location.pathname !== '/email-overen';
  useEffect(()=>{
    if(canShow)document.documentElement.dataset.betaUi='true';
    else delete document.documentElement.dataset.betaUi;
    return()=>{delete document.documentElement.dataset.betaUi;};
  },[canShow]);
  return <BetaToolsContext.Provider value={{ openFeedback, beta: betaState, refreshBeta }}>
    {children}
    <BetaToolsUI key={user?.id || 'anonymous'} profile={profile} canShow={canShow} isPasswordRecovery={isPasswordRecovery} userId={user?.id} refreshProfile={refreshProfile} beta={betaState} refreshBeta={refreshBeta} feedback={feedback} openFeedback={openFeedback} closeFeedback={closeFeedback} />
  </BetaToolsContext.Provider>;
}
export default BetaTools;
