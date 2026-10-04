import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShareLink, deleteShareLink, fetchShareLinks } from '../api';
import { useAuth } from './AuthContext';
import { ROLE_KEY } from '../lib/onboardingStorage';
import { shareUrl } from '../lib/shareLink';

function ParentPayHandoff({ voice = 'student', variant = 'ghost', onActivated }) {
  const { isSignedIn, isTester, hasAccess, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const activated = useRef(false);

  let storedRole = null;
  try {
    storedRole = localStorage.getItem(ROLE_KEY);
  } catch {
    storedRole = null;
  }
  const parentBranch = storedRole === 'parent';
  const paidAccess = hasAccess && Boolean(profile?.plan_id) &&
    ['trialing', 'active', 'season', 'past_due'].includes(profile?.subscription_status);

  const paymentUrl = useCallback((token) => window.location.origin + '/platba-rodice/' + token, []);
  const send = useCallback(async (token) => {
    const result = await shareUrl({
      text: voice === 'parent'
        ? 'Zaplaťte prosím přístup do Střední na míru přes tento odkaz. Účet ani přihlášení nepotřebujete.'
        : 'Můžeš mi prosím zaplatit přístup do Střední na míru? Platí se přes odkaz, účet pro tebe zakládat nemusíš.',
      url: paymentUrl(token),
    });
    setNote(result === 'copied' ? 'Odkaz zkopírován do schránky.' : result === 'shared' ? 'Odesláno.' : null);
  }, [paymentUrl, voice]);

  const loadExisting = useCallback(async () => {
    if (!isSignedIn || isTester || parentBranch) return;
    try {
      const links = await fetchShareLinks();
      const existing = links.find((item) =>
        item.kind === 'payment' && item.expires_at && new Date(item.expires_at) > new Date()
      );
      if (existing) setLink(existing);
    } catch (err) {
      setError(err?.status ? err.message : 'Sdílené odkazy se nepodařilo načíst. Zkus to prosím znovu.');
    }
  }, [isSignedIn, isTester, parentBranch]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  useEffect(() => {
    if (!link) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshProfile();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [link, refreshProfile]);

  // Only a payment link this account is waiting on may move the screen on;
  // an account that paid some other way keeps the page it opened.
  useEffect(() => {
    if (!paidAccess || !link || activated.current) return;
    activated.current = true;
    if (onActivated) onActivated();
    else navigate('/skoly');
  }, [paidAccess, link, onActivated, navigate]);

  if (!isSignedIn || isTester || parentBranch) return null;

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const created = await createShareLink('payment');
      setLink(created);
      try {
        await send(created.token);
      } catch {
        setNote('Odkaz je připravený, ale sdílení se nepovedlo.');
      }
    } catch (err) {
      setError(err?.status ? err.message : 'Platební odkaz se nepodařilo vytvořit. Zkus to prosím znovu.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNote(null);
    try {
      await send(link.token);
    } catch {
      setNote('Sdílení se nepovedlo. Zkus to prosím znovu.');
    }
  };

  const cancelLink = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteShareLink(link.token);
      setLink(null);
      setNote(null);
    } catch (err) {
      setError(err?.status ? err.message : 'Odkaz se nepodařilo zrušit. Zkus to prosím znovu.');
    } finally {
      setBusy(false);
    }
  };

  const checkPaid = async () => {
    setError(null);
    setBusy(true);
    try {
      await refreshProfile();
    } catch (err) {
      setError(err?.message || 'Stav účtu se nepodařilo obnovit.');
    } finally {
      setBusy(false);
    }
  };

  if (!link) {
    const className = variant === 'inline' ? 'ob-inline-link' : 'ob-btn ob-btn-ghost';
    return (
      <div className="ob-parent-pay-handoff">
        <button type="button" className={className} onClick={create} disabled={busy}>
          {busy ? 'Připravuji odkaz…' : 'Ať to zaplatí rodič'}
        </button>
        {error && <span className="ob-share-note" role="alert">{error}</span>}
      </div>
    );
  }

  return (
    <div className="ob-parent-pay-handoff ob-parent-pay-handoff-waiting">
      <p className="ob-parent-pay-status">Čekáme na platbu od rodiče. Odkaz platí 7 dní.</p>
      {error && <p className="ob-share-note" role="alert">{error}</p>}
      {note && <p className="ob-share-note" role="status">{note}</p>}
      <div className="ob-parent-pay-actions">
        <button type="button" className="ob-inline-link" onClick={resend}>Poslat znovu</button>
        <button type="button" className="ob-inline-link" onClick={checkPaid} disabled={busy}>Rodič už zaplatil</button>
        <button type="button" className="ob-inline-link" onClick={cancelLink} disabled={busy}>Zrušit odkaz</button>
      </div>
    </div>
  );
}

export default ParentPayHandoff;
