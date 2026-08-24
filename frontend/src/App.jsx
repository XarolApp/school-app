import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import SchoolDetail from './pages/SchoolDetail';
import SignUp from './pages/SignUp';
import OnboardingFlow from './pages/onboarding/OnboardingFlow';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding sits OUTSIDE the Layout on purpose: the nav bar is a
            distraction and an exit during a 23-screen narrative flow. */}
        <Route path="/onboarding" element={<Navigate to="/onboarding/welcome" replace />} />
        <Route path="/onboarding/:stepId" element={<OnboardingFlow />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/schools/:id" element={<SchoolDetail />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
