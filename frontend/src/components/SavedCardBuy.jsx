import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useG } from '../lib/gender';
import { formatCzk } from '../config/pricing';
import { cardLabel, completeOnSession } from '../lib/payFlow';
import { buyMonthlyWithSavedCard, buySeasonWithSavedCard, extendPlan } from '../api';

const CALLS = { season: buySeasonWithSavedCard, monthly: buyMonthlyWithSavedCard, extend: extendPlan };

/**
 * The one confirmation before a saved-card payment: it states the amount and
 * the card, asks for the express request for immediate start, and sends the
 * price the person saw, so a click can never charge something else.
 */
function SavedCardBuy({ kind, priceCzk, card, intro, onClose }) {
  const { refreshProfile } = useAuth();
  const g = useG();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await CALLS[kind]({ immediateStart: true, confirmPriceCzk: priceCzk });
      await completeOnSession(result);
      setDone(true);
      // The webhook activates the purchase a moment later; ask until it has.
      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise((resolve) => { window.setTimeout(resolve, 2000); });
        await refreshProfile();
      }
    } catch (err) {
      if (err.code === 'PRICE_CHANGED' && err.body?.priceCzk != null) {
        setError(`Cena se změnila na ${formatCzk(err.body.priceCzk)}. Zavři okno a zkontroluj ji.`);
      } else {
        setError(err.message || 'Platba se nepodařila.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="notice" role="status">
        <p className="notice-text">Platba proběhla. Potvrzujeme přístup — stránka se za chvíli sama aktualizuje.</p>
      </div>
    );
  }
  return (
    <section className="notice settings-inset" aria-live="polite">
      <strong>Potvrď platbu</strong>
      <p className="notice-text">
        {intro} Zaplatíš {formatCzk(priceCzk)} kartou {cardLabel(card)}. Platba proběhne hned.
      </p>
      {error && <p className="notice-text" role="alert">{error}</p>}
      <label className="ob-check" htmlFor={`immediate-start-${kind}`}>
        <input
          id={`immediate-start-${kind}`}
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy jsem {g('měl', 'měla')} placený přístup.
        </span>
      </label>
      <div className="settings-form-actions">
        <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy || !consent}>
          {busy ? 'Platím…' : `Objednat s povinností platby · ${formatCzk(priceCzk)}`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Zrušit</button>
      </div>
    </section>
  );
}

export default SavedCardBuy;
