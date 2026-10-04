import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObButton, ObScreen } from './ObKit';
import { shareUrl } from '../../lib/shareLink';

function HandoffLock({ status, error, url, onRefresh, onRevoke, onStartOwn }) {
  const [shareError, setShareError] = useState(null);
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    setShareError(null);
    try {
      await shareUrl({
        text: 'Vyplň si prosím dotazník ke střední škole — stačí otevřít odkaz.',
        url,
      });
    } catch {
      setShareError('Sdílení se nepovedlo. Odkaz můžeš zkopírovat znovu.');
    }
  };

  const revoke = async () => {
    if (busy) return;
    setBusy(true);
    await onRevoke();
    setBusy(false);
  };

  if (status === 'completed') {
    return (
      <ObScreen chrome={false} center>
        <h1 className="ob-title">Dítě dotazník vyplnilo</h1>
        <p className="ob-hint">
          Výsledky i účet má u sebe. Pokud chce, pošle vám výsledky nebo odkaz k platbě.
        </p>
        <div className="ob-actions">
          <ObButton onClick={onStartOwn}>Začít vlastní dotazník</ObButton>
          <Link to="/" className="ob-btn ob-btn-secondary">Zavřít</Link>
        </div>
      </ObScreen>
    );
  }

  return (
    <ObScreen chrome={false} center>
      <h1 className="ob-title">Dotazník teď vyplňuje vaše dítě</h1>
      <p className="ob-hint">
        Až ho dokončí, výsledky i účet bude mít u sebe. Výsledky nebo odkaz k platbě vám pak může poslat.
      </p>
      {status === 'error' ? (
        <div className="notice notice-error" role="alert">
          <p className="notice-text">{error || 'Stav odkazu se nepodařilo načíst.'}</p>
          <ObButton variant="secondary" onClick={onRefresh}>Zkusit znovu</ObButton>
        </div>
      ) : (
        <>
          <p className="ob-handoff-status">
            {status === 'opened' ? 'Dítě odkaz otevřelo' : 'Dítě odkaz zatím neotevřelo'}
          </p>
          {shareError && <p className="ob-share-note" role="status">{shareError}</p>}
          <div className="ob-actions">
            <ObButton variant="secondary" onClick={resend}>Poslat odkaz znovu</ObButton>
            <ObButton variant="secondary" onClick={onRefresh}>Zkontrolovat znovu</ObButton>
          </div>
          <p className="ob-hint ob-handoff-warning">Odkaz tím přestane platit.</p>
          <ObButton variant="ghost" onClick={revoke} disabled={busy}>
            {busy ? 'Ruším odkaz…' : 'Chci dotazník vyplnit sám'}
          </ObButton>
        </>
      )}
    </ObScreen>
  );
}

export default HandoffLock;
