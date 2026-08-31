import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import SchoolDetail from './pages/SchoolDetail';
import Favorites from './pages/Favorites';
import Questionnaire from './pages/Questionnaire';
import QuestionnaireRuns from './pages/QuestionnaireRuns';
import QuestionnaireRun from './pages/QuestionnaireRun';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Paywall from './pages/Paywall';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      {/* Outside AuthProvider: the theme is a device preference, so it applies
          to signed-out visitors on the landing page too. */}
      <ThemeProvider>
        <AuthProvider>
          {/* Inside the router so a toast can be fired from any route, and
              outside <Routes> so it survives navigation — a confirmation for
              something that just happened should not be torn down by the click
              that navigates away from it. */}
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/prihlaseni" element={<Login />} />
                <Route path="/registrace" element={<SignUp />} />
                <Route path="/zapomenute-heslo" element={<ForgotPassword />} />
                <Route path="/nove-heslo" element={<ResetPassword />} />
                <Route path="/predplatne" element={<Paywall />} />

                {/* Not behind ProtectedRoute on purpose: that redirects anyone
                    without access to the paywall, which would lock an expired
                    account out of changing its password or deleting its data.
                    Settings does its own signed-in check instead. */}
                <Route path="/nastaveni" element={<Settings />} />

                {/* School data lives behind the trial/subscription check. The
                    backend enforces the same rule, so these routes are only
                    keeping people from staring at an error screen. */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/skoly" element={<Search />} />
                  <Route path="/skoly/:id" element={<SchoolDetail />} />
                  <Route path="/oblibene" element={<Favorites />} />
                  <Route path="/dotaznik" element={<Questionnaire />} />
                  {/* Stored sets of answers. Behind the same check as the rest:
                      both pages render school data. */}
                  <Route path="/dotaznik/sady" element={<QuestionnaireRuns />} />
                  <Route path="/dotaznik/sady/:id" element={<QuestionnaireRun />} />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
