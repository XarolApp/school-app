import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
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
import SdileniView from './pages/SdileniView';
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import './styles/ui.css';
import './App.css';
import './auth.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Inside the router so any route can fire a toast, outside <Routes>
            so a toast survives the navigation it is confirming. */}
        <ToastProvider>
          <Routes>
            {/* Onboarding sits OUTSIDE the Layout on purpose: the nav bar is a
                distraction and an exit during a 23-screen narrative flow. */}
            <Route path="/onboarding" element={<Navigate to="/onboarding/welcome" replace />} />
            <Route path="/onboarding/:stepId" element={<OnboardingFlow />} />

            {/* Public read-only share view (feature-brainstorm.md §5 "Share
                shortlist with parents") — outside Layout for the same reason
                onboarding is: a parent following a link should not see a nav
                bar inviting them elsewhere. No auth at all; see
                GET /api/shared/:token in server.js. */}
            <Route path="/sdileni/:token" element={<SdileniView />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/skoly" element={<Search />} />
              <Route path="/skoly/:id" element={<SchoolDetail />} />

              {/* /porovnani works signed out — the compare selection is
                  localStorage (lib/searchPrefs.js) and /api/schools is
                  ungated, so an anonymous visitor can compare. Only
                  /prihlaska writes to the database, so it alone needs an
                  account. See plans/006-comparison-decision-tools.md §1.2. */}
              <Route path="/porovnani" element={<Porovnani />} />
              <Route path="/porovnani/matice" element={<Matice />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/prihlaska" element={<Prihlaska />} />
              </Route>

              <Route path="/prihlaseni" element={<Login />} />
              {/* Secondary account-creation entry point, deliberately not in
                  the nav — the onboarding flow is the canonical path. This is
                  for direct links and returning users. */}
              <Route path="/registrace" element={<SignUp />} />
              <Route path="/zapomenute-heslo" element={<ForgotPassword />} />
              <Route path="/nove-heslo" element={<ResetPassword />} />
              <Route path="/predplatne" element={<SubscriptionExpired />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/nastaveni" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
