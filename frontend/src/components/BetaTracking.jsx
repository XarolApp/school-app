import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { betaTracker, track } from '../lib/betaTrack';
import { getCompareSelection } from '../lib/searchPrefs';

export default function BetaTracking() {
  const { user, session, isTester, loading, profileLoading } = useAuth();
  const location = useLocation();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    betaTracker.setAccount({ resolved: !loading && !profileLoading, userId: user?.id || null, tester: isTester, token: session?.access_token || null });
  }, [loading, profileLoading, user?.id, isTester, session?.access_token]);
  useEffect(() => {
    const enabled = () => setRevision((n) => n + 1);
    window.addEventListener('snm:beta-enabled', enabled);
    const timer = setInterval(() => void betaTracker.flush(), 10000);
    return () => { window.removeEventListener('snm:beta-enabled', enabled); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!betaTracker.active()) return;
    let started = document.hidden ? null : Date.now();
    let visible = 0;
    const path = location.pathname;
    let referrer = '/';
    try { referrer = sessionStorage.getItem('snm.beta.lastPath') || '/'; sessionStorage.setItem('snm.beta.lastPath', path); } catch { /* storage unavailable */ }
    track('page_view', { referrer }, path);
    const school = path.match(/^\/skoly\/(\d+)$/);
    if (school) track('school_open', { id: Number(school[1]), from: location.state?.from || (referrer.startsWith('/onboarding') ? 'reveal' : /^\/skoly\/\d/.test(referrer) ? 'similar' : 'search') });
    if (path === '/porovnani') track('compare_open', { count: getCompareSelection().length });
    if (path === '/skoly') track('search', { length: 0 });
    const visibility = () => {
      if (document.hidden) {
        if (started) visible += Date.now() - started;
        started = null;
        track('page_leave', { ms: visible }, path); visible = 0;
        if (path.startsWith('/onboarding/')) track('ob_drop', { step: path.split('/').at(-1) }, path);
        void betaTracker.flush(true);
      } else started = Date.now();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      track('page_leave', { ms: visible + (started ? Date.now() - started : 0) }, path);
      if (path.startsWith('/onboarding/') && !window.location.pathname.startsWith('/onboarding/')) track('ob_drop', { step: path.split('/').at(-1) }, path);
    };
  }, [location.pathname, location.state, loading, profileLoading, isTester, user?.id, revision]);
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
  }, [loading, profileLoading, isTester, user?.id, revision]);
  return null;
}
