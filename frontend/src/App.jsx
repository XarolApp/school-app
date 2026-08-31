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
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
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

            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/skoly" element={<Search />} />
              <Route path="/skoly/:id" element={<SchoolDetail />} />

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
