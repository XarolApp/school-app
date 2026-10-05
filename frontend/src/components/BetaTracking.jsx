import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { saveBetaOnboardingRanking } from '../api';
import { flushBetaRankings } from '../lib/betaRankings';
import { useAuth } from './AuthContext';
import { betaTracker, track } from '../lib/betaTrack';
import { createBetaNavigation } from '../lib/betaNavigation';
import { getCompareSelection } from '../lib/searchPrefs';

export default function BetaTracking() {
  const { user, session, isTester, loading, profileLoading, profile } = useAuth();
  const location = useLocation();
  const locationRef=useRef(location),navigation=useRef(null); locationRef.current=location;
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    betaTracker.setAccount({ resolved: !loading && !profileLoading, userId: user?.id || null, tester: isTester, noticeAccepted:Boolean(profile?.betaTrackingNoticeAccepted), token: session?.access_token || null });
  }, [loading, profileLoading, user?.id, isTester, session?.access_token, profile?.betaTrackingNoticeAccepted]);
  useEffect(() => {
    const enabled = () => setRevision((n) => n + 1);
    window.addEventListener('snm:beta-enabled', enabled);
    const flush=()=>{void betaTracker.flush();void flushBetaRankings(saveBetaOnboardingRanking);};
    const timer = setInterval(flush, 10000);
    window.addEventListener('snm:beta-account',flush);
    return () => { window.removeEventListener('snm:beta-enabled', enabled); window.removeEventListener('snm:beta-account',flush);clearInterval(timer); };
  }, []);
  useEffect(() => {
    const path=location.pathname;
    if (navigation.current?.path!==path) {
      let referrer='/';
      try {referrer=sessionStorage.getItem('snm.beta.lastPath') || '/';} catch { /* unavailable */ }
      navigation.current=createBetaNavigation({tracker:betaTracker,path,referrer,compareCount:getCompareSelection().length,
        from:locationRef.current.state?.from || (referrer.startsWith('/onboarding')?'reveal':/^\/skoly\/\d/.test(referrer)?'similar':'search'),hidden:()=>document.hidden});
    }
    const current=navigation.current;
    const enable=()=>{current.start();if(betaTracker.active()) try{sessionStorage.setItem('snm.beta.lastPath',path);}catch{/* unavailable */}};
    enable();
    const visibility=()=>{
      if(document.hidden){current.hide();if(path.startsWith('/onboarding/'))track('ob_drop',{step:path.split('/').at(-1)},path);void betaTracker.flush(true);}
      else current.show();
    };
    window.addEventListener('snm:beta-enabled',enable);window.addEventListener('snm:beta-account',enable);document.addEventListener('visibilitychange',visibility);
    return ()=>{
      window.removeEventListener('snm:beta-enabled',enable);window.removeEventListener('snm:beta-account',enable);document.removeEventListener('visibilitychange',visibility);
      if(window.location.pathname!==path){current.finish();if(path.startsWith('/onboarding/')&&!window.location.pathname.startsWith('/onboarding/'))track('ob_drop',{step:path.split('/').at(-1)},path);}
    };
  },[location.pathname]);
  useEffect(() => {
    if (!betaTracker.active()) return;
    const id = betaTracker.getSessionId();
    try {
      if (!sessionStorage.getItem('snm.beta.started.' + id)) {
        track('session_start', { device: innerWidth < 600 ? 'mobile' : innerWidth < 1000 ? 'tablet' : 'desktop', width: innerWidth, height: innerHeight,
          theme: document.documentElement.dataset.theme || 'light', palette: document.documentElement.dataset.palette || 'znacka' });
        sessionStorage.setItem('snm.beta.started.' + id, '1');
      }
    } catch { /* storage unavailable */ }
    const error = (event) => track('js_error', { message: event.error?.name || 'Chyba JavaScriptu' });
    const rejection = (event) => track('js_error', { message: event.reason?.name || 'Chyba JavaScriptu' });
    let target = null, clicks = [];
    const click = (event) => {
      const element = event.target.closest('button,a,[role="button"]') || event.target;
      if (element !== target) clicks = [];
      target = element; clicks = [...clicks.filter((t) => Date.now() - t < 600), Date.now()];
      if (clicks.length === 3) track('rage_click', { selector: element.tagName.toLowerCase() + (element.classList[0] ? '.' + element.classList[0] : '') });
    };
    window.addEventListener('error', error); window.addEventListener('unhandledrejection', rejection); document.addEventListener('click', click);
    return () => { window.removeEventListener('error', error); window.removeEventListener('unhandledrejection', rejection); document.removeEventListener('click', click); };
  }, [loading, profileLoading, isTester, user?.id, revision, profile?.betaTrackingNoticeAccepted]);
  return null;
}
