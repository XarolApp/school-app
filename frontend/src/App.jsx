import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/ToastContext';
import BetaTools from './components/BetaTools';
import BetaTracking from './components/BetaTracking';
import ProtectedRoute from './components/ProtectedRoute';
// Default landing (3D map). three.js + GSAP load only on this route.
const Landing = lazy(() => import('./pages/landing2/Landing'));
const Admin = lazy(() => import('./pages/Admin'));

function HomeEntry() {
  const navigate = useNavigate();
  const betaCode = import.meta.env.VITE_BETA_SCHOOL_CODE?.trim();

  useEffect(() => {
    if (!betaCode) return;
    try {
      if (localStorage.getItem('snm.beta.homeRedirected') === '1') return;
    } catch {
      // The route still works if browser storage is disabled.
    }
    navigate(`/beta/${encodeURIComponent(betaCode)}`, { replace: true });
    try {
      localStorage.setItem('snm.beta.homeRedirected', '1');
    } catch {
      // The redirect is useful even when it cannot be remembered.
    }
  }, [betaCode, navigate]);

  return <Suspense fallback={<LoadingSpinner />}><Landing /></Suspense>;
}

import Search from './pages/Search';
import SchoolDetail from './pages/SchoolDetail';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import SubscriptionExpired from './pages/SubscriptionExpired';
import Porovnani from './pages/Porovnani';
import Matice from './pages/Matice';
import Prihlaska from './pages/Prihlaska';
import Questionnaire from './pages/Questionnaire';
import { Privacy, Terms } from './pages/Legal';
import SdileniView from './pages/SdileniView';
import SharedResults from './pages/SharedResults';
import ParentPay from './pages/ParentPay';
import HandoffStart from './pages/HandoffStart';
import NotFound from './pages/NotFound';
import BetaLanding from './pages/BetaLanding';
import EmailConfirmed from './pages/EmailConfirmed';
import SavedSchools from './pages/SavedSchools';
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import './styles/ui.css';
import './App.css';
import './auth.css';
import { LoadingSpinner } from './components/PageSkeleton';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BetaTracking />
        {/* Inside the router so any route can fire a toast, outside <Routes>
            so a toast survives the navigation it is confirming. */}
        <BetaTools>
          <ToastProvider>
            <Routes>
              {/* Onboarding sits OUTSIDE the Layout on purpose: the nav bar is a
                  distraction and an exit during a 23-screen narrative flow. */}
              {/* Closed beta: every app page needs a signed-in, confirmed account
                  with access; signed-out visitors only see the landing, auth
                  and legal pages. Server routes enforce the same rule. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Navigate to="/onboarding/welcome" replace />} />
                <Route path="/onboarding/:stepId" element={<OnboardingFlow />} />
              </Route>
              <Route path="/beta/:code" element={<BetaLanding />} />
              <Route path="/email-overen" element={<EmailConfirmed />} />

              {/* Public read-only share view (feature-brainstorm.md §5 "Share
                  shortlist with parents") — outside Layout for the same reason
                  onboarding is: a parent following a link should not see a nav
                  bar inviting them elsewhere. No auth at all; see
                  GET /api/shared/:token in server.js. */}
              <Route path="/sdileni/:token" element={<SdileniView />} />
              <Route path="/vysledky/:token" element={<SharedResults />} />
              <Route path="/platba-rodice/:token" element={<ParentPay />} />
              <Route path="/od-rodice/:token" element={<HandoffStart />} />

              <Route element={<Layout />}>
                {/* Variant B (3D map) is the default landing; the old one stays at /stara for comparison. */}
                <Route path="/" element={<HomeEntry />} />
                <Route path="/nova" element={<Navigate to="/" replace />} />
                <Route path="/stara" element={<Navigate to="/" replace />} />
                <Route path="/ochrana-osobnich-udaju" element={<Privacy />} />
                <Route path="/obchodni-podminky" element={<Terms />} />
                {/* Signed-out visitors have no school list or comparison: they
                    go back to the landing. */}
                <Route element={<ProtectedRoute signedOutTo="/" />}>
                  <Route path="/skoly" element={<Search />} />
                  <Route path="/porovnani" element={<Porovnani />} />
                  <Route path="/porovnani/matice" element={<Matice />} />
                </Route>
                {/* A school page opened from the landing map is view-only when
                    signed out (no save, compare, explanation or review). */}
                <Route
                  path="/skoly/:id"
                  element={<ProtectedRoute publicFallback={<SchoolDetail publicView />}><SchoolDetail /></ProtectedRoute>}
                />
                <Route element={<ProtectedRoute />}>
                  <Route path="/admin" element={<Suspense fallback={<LoadingSpinner label="Načítání přehledů…" />}><Admin /></Suspense>} />
                  <Route path="/prihlaska" element={<Prihlaska />} />
                  <Route path="/ulozene" element={<SavedSchools />} />
                  {/* The standalone AI questionnaire (server-side lib/questionnaire.js) —
                      separate from the onboarding quiz. Protected the same way /prihlaska
                      is: the backend route itself also requires requireAccess. */}
                  <Route path="/dotaznik" element={<Questionnaire />} />
                </Route>

                <Route path="/prihlaseni" element={<Login />} />
                {/* Secondary account-creation entry point, deliberately not in
                    the nav — the onboarding flow is the canonical path. This is
                    for direct links and returning users. */}
                <Route path="/registrace" element={<SignUp />} />
                <Route path="/zapomenute-heslo" element={<ForgotPassword />} />
                <Route path="/nove-heslo" element={<ResetPassword />} />
                {/* Signed in but not necessarily with access: this is where
                    ProtectedRoute sends a lapsed account. */}
                <Route element={<ProtectedRoute requireAccess={false} />}>
                  <Route path="/predplatne" element={<SubscriptionExpired />} />
                </Route>

                {/* Settings checks sign-in itself. Billing cancellation and
                    account erasure must stay available after access expires. */}
                <Route path="/nastaveni" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </ToastProvider>
        </BetaTools>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
