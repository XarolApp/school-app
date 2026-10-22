import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { claimCreatorLink } from '../api';
import { LoadingSpinner } from '../components/PageSkeleton';

const DEVICE_KEY = 'snm.creator.devDevice';
const BLOCKED_MESSAGE = 'Tento odkaz už je aktivní na jiných zařízeních. Napiš nám na info@stredninamiru.cz a přidáme ti další.';

function createDeviceId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getDeviceId() {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (/^[a-f0-9]{64}$/.test(stored || '')) return stored;
    const device = createDeviceId();
    localStorage.setItem(DEVICE_KEY, device);
    return device;
  } catch {
    return createDeviceId();
  }
}

export default function CreatorClaimDev() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // One claim only: StrictMode's double effect would issue two magic links and the first one's token dies.
    if (!import.meta.env.DEV || started.current) return;
    started.current = true;
    claimCreatorLink({ token, device: getDeviceId(), userAgent: navigator.userAgent })
      .then(({ tokenHash }) => {
        navigate(`/pro/prihlaseni#t=${encodeURIComponent(tokenHash)}`, { replace: true });
      })
      .catch((error) => {
        setMessage(error.status === 409 ? BLOCKED_MESSAGE : 'Odkaz se nepodařilo otevřít. Zkontroluj, že je platný, a zkus to znovu.');
      });
  }, [navigate, token]);

  if (!import.meta.env.DEV) return <Navigate to="/" replace />;
  if (message) {
    return (
      <main className="page page-auth">
        <div className="auth-layout">
          <p className="notice notice-error" role="alert">{message}</p>
        </div>
      </main>
    );
  }
  return <LoadingSpinner label="Ověřuji odkaz pro tvůrce…" />;
}
