import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { acknowledgeBetaGuidance, fetchBetaMe } from '../api';
import { BetaToolsContext } from './BetaToolsContext';
import { useAuth } from './AuthContext';
import BetaInstructions from './BetaInstructions';
import BetaFeedbackSheet from './BetaFeedbackSheet';
import BetaMicroQuestions from './BetaMicroQuestions';
import Modal from './Modal';
import BetaClosingQuestionnaire from './BetaClosingQuestionnaire';

function BetaToolsUI({ profile, canShow, isPasswordRecovery, userId, refreshProfile, beta, refreshBeta, feedback, openFeedback, closeFeedback }) {
  const location = useLocation(), navigate = useNavigate();
  const [closingOpen,setClosingOpen]=useState(false), [guidanceOpen,setGuidanceOpen] = useState(false), [guidanceBusy,setGuidanceBusy] = useState(false), [guidanceError,setGuidanceError] = useState('');
  const acknowledged = useRef(false), dismissed = useRef(false);
  const parent = ['rodic','ucitel'].includes(beta?.role);
  const [renewed,setRenewed]=useState('');
  const until=new Date(profile?.effectiveAccessUntil || 0).getTime();
  const hoursLeft=(until-Date.now())/3600000;
  useEffect(() => {
    if (canShow && !isPasswordRecovery && !dismissed.current && !profile.tester_guidance_seen_at) setGuidanceOpen(true);
  }, [canShow,isPasswordRecovery,profile?.tester_guidance_seen_at]);
  const dismissGuidance = async () => {
    dismissed.current = true; setGuidanceOpen(false);
    if (!canShow || !beta?.consent_tracking_at || acknowledged.current || profile.tester_guidance_seen_at) return;
    acknowledged.current = true; setGuidanceBusy(true); setGuidanceError('');
    try { await acknowledgeBetaGuidance(); await refreshProfile(); }
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
    <div data-beta-tools><Modal open={Boolean(canShow && !guidanceOpen && beta && !beta.closing_done_at && (closingOpen || profile.closingPaused))} title="Závěrečný dotazník" onDismiss={()=>setClosingOpen(false)} className="beta-modal beta-closing-modal">
      <BetaClosingQuestionnaire role={beta?.role} onDone={()=>{setClosingOpen(false);void refreshBeta();void refreshProfile();}} />
    </Modal></div>
    {canShow && profile.betaProgramActive && profile.hasAccess && hoursLeft>0 && hoursLeft<=12 && <div className="beta-banner" data-beta-tools role="status">
      {parent?'Do 12 hodin se Vám přístup pozastaví — stačí poslat jednu připomínku.':'Do 12 hodin se ti přístup pozastaví — stačí poslat jednu připomínku.'}
      <button type="button" className="ss-btn ss-btn-secondary" onClick={openFeedback}>Poslat připomínku</button>
    </div>}
    {renewed && <div className="beta-banner" data-beta-tools role="status">Přístup obnoven do {renewed}.<button type="button" className="ss-btn ss-btn-ghost" onClick={()=>setRenewed('')}>Zavřít</button></div>}
    <BetaMicroQuestions beta={beta} enabled={Boolean(canShow && profile.betaProgramActive && profile.hasAccess && !guidanceOpen && !feedback.open && !closingOpen && !profile.closingPaused)} onRefresh={refreshBeta} onRenew={(result)=>{void refreshProfile();setRenewed(new Date(result.testerAccessUntil).toLocaleString('cs-CZ'));}} />
    {canShow && profile.betaProgramActive && <div data-beta-tools className={`beta-floating-tools${location.pathname.startsWith('/onboarding/') ? ' is-onboarding' : ''}`}>
      <button type="button" className="beta-help-trigger" aria-label="Pokyny k beta testování" onClick={() => setGuidanceOpen(true)}>?</button>
      <button type="button" className="beta-feedback-trigger" onClick={() => { setGuidanceOpen(false); openFeedback(); }}>Zpětná vazba</button>
    </div>}
    {canShow && guidanceError && <p className="beta-banner" role="alert" data-beta-tools>{guidanceError}</p>}
    <div data-beta-tools><Modal open={Boolean(canShow && guidanceOpen && !isPasswordRecovery)} title={parent ? 'Vítejte v testování Střední na míru' : 'Vítej v testování Střední na míru'} onDismiss={dismissGuidance} busy={guidanceBusy} className="beta-modal">
      <BetaInstructions beta={beta} hours={profile?.betaAccessHours} onDone={dismissGuidance} onRefresh={refreshBeta} busy={guidanceBusy} />
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
  useEffect(() => {
    setBetaState(null); setFeedback({ open: false, pageUrl: '/', requestId: 0 });
    if (!isTester || !emailConfirmed) return;
    void refreshBeta().catch(() => {});
    const timer = setInterval(() => void refreshBeta().catch(() => {}),15000);
    return () => clearInterval(timer);
  }, [isTester,emailConfirmed,refreshBeta]);
  const openFeedback = useCallback(() => setFeedback((previous) => ({ open: true, pageUrl: location.pathname, requestId: previous.requestId + 1 })), [location.pathname]);
  const closeFeedback = useCallback(() => setFeedback((previous) => ({ ...previous, open: false })), []);
  const canShow = isSignedIn && emailConfirmed && isTester && profile && !profileLoading;
  return <BetaToolsContext.Provider value={{ openFeedback, beta: betaState, refreshBeta }}>
    {children}
    <BetaToolsUI key={user?.id || 'anonymous'} profile={profile} canShow={canShow} isPasswordRecovery={isPasswordRecovery} userId={user?.id} refreshProfile={refreshProfile} beta={betaState} refreshBeta={refreshBeta} feedback={feedback} openFeedback={openFeedback} closeFeedback={closeFeedback} />
  </BetaToolsContext.Provider>;
}
export default BetaTools;
