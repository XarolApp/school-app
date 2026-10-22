import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, setRememberMe } from '../supabaseClient';
import { useAuth } from '../components/AuthContext';
import { LoadingSpinner } from '../components/PageSkeleton';

const OPEN_ERROR = 'Odkaz se nepodařilo otevřít. Otevři prosím znovu odkaz ze zprávy.';

export default function CreatorSignIn() {
  const [error, setError] = useState('');
  const started = useRef(false);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const tokenHash = new URLSearchParams(window.location.hash.slice(1)).get('t');
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);

    void (async () => {
      if (!tokenHash) {
        setError(OPEN_ERROR);
        return;
      }

      try {
        // No signOut first: it would log out this browser's other open tabs; verifyOtp replaces the session anyway.
        setRememberMe(true);
        const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
        if (verifyError || !data?.session) throw verifyError || new Error('Missing session');
        await refreshProfile(data.session);
        navigate('/dotaznik', { replace: true });
      } catch {
        setError(OPEN_ERROR);
      }
    })();
  }, [navigate, refreshProfile]);

  if (error) {
    return (
      <main className="page page-auth">
        <div className="auth-layout">
          <p className="notice notice-error" role="alert">{error}</p>
        </div>
      </main>
    );
  }

  return <LoadingSpinner label="Otevírám náhled pro tvůrce…" />;
}
