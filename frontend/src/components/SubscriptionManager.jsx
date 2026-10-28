import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import SavedCardBuy from './SavedCardBuy';
import {
  cancelSubscription, fetchReferral, fetchExtendPreview, removeSavedCard, restoreSubscription,
} from '../api';
import { useOffer } from '../lib/usePrices';
import { cardLabel } from '../lib/payFlow';
import { ACCESS_END_LABEL, DEADLINE_LABEL, formatCzk } from '../config/pricing';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

const CANCEL_REASONS = [
  { id: 'price', label: 'cena' },
  { id: 'not_needed', label: 'nepotřebuji' },
  { id: 'other', label: 'jiný důvod' },
];

/** "Pozvi kamaráda": informational, shown only to people who already paid. */
function ReferralCard() {
  const [referral, setReferral] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchReferral().then((data) => { if (alive) setReferral(data); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!referral?.eligible) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referral.link);
      setCopied(true);
    } catch {
      document.getElementById('referral-link')?.select();
    }
  };
  return (
    <div className="settings-form-inset">
      <h3 className="settings-section-title">Pozvi kamaráda</h3>
      <p className="settings-section-text">
        Kdo použije tvůj odkaz, dostane {formatCzk(referral.discountCzk)} slevu na sezónní přístup. Za každého, kdo si
        přístup ponechá déle než 14 dní, ti vrátíme {formatCzk(referral.rewardCzk)} na kartu, dokud ti nevrátíme celou
        cenu. Pak už mají slevu jen kamarádi.
      </p>
      <div className="settings-form-actions">
        <input id="referral-link" className="input" readOnly value={referral.link} onFocus={(event) => event.target.select()} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>{copied ? 'Zkopírováno' : 'Kopírovat'}</button>
      </div>
      <p className="settings-section-text">
        Vráceno {formatCzk(referral.rewardedCzk)}{referral.capCzk !== null ? ` z ${formatCzk(referral.capCzk)}` : ''} · čeká {referral.pendingCount}
      </p>
    </div>
  );
}

/**
 * Everything about the plan the person is on, by state (plan 025 §5.3): cancel
 * with an honest way out, restore, switch, one-click re-buy with the saved
 * card, card removal. Withdrawal stays in Settings next to the legal text.
 */
function SubscriptionManager({ profile, status }) {
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const seasonOffer = useOffer('season');
  const monthlyOffer = useOffer('monthly');
  const [sheet, setSheet] = useState(null); // 'cancel' | 'restore' | 'extend' | 'buy-season' | 'buy-monthly'
  const [reason, setReason] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [extendPreview, setExtendPreview] = useState(null);

  const card = profile?.savedCard;
  const plan = profile?.plan_id;
  const trialRunning = status === 'trialing' && plan === 'season' && Boolean(profile?.season_charge_due_at);
  const monthlyActive = plan === 'monthly' && ['active', 'past_due'].includes(status) && !profile?.cancel_at_period_end;
  const monthlyCancelled = profile?.restoreKind === 'monthly';
  const trialCancelled = profile?.restoreKind === 'season';
  const paid = status === 'season' && ['season', 'spring'].includes(plan);
  const live = trialRunning || monthlyActive || monthlyCancelled || paid;
  const monthlyEnded = plan === 'monthly' && !live && ['expired', 'canceled'].includes(status);
  const canCancel = trialRunning || monthlyActive;
  const canBuy = Boolean(card) && !live && seasonOffer.ready && seasonOffer.onSale && !profile?.needsPaymentConfirmation;
  const canRemoveCard = Boolean(card) && !trialRunning && !monthlyActive;

  const run = async (action, done) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      await refreshProfile();
      setSheet(null);
      if (done) toast(done(result));
    } catch (err) {
      setError(err.message || 'Akci se nepodařilo dokončit.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => run(() => cancelSubscription(reason), (result) =>
    result.cancelled === 'pending'
      ? 'Požadavek na zrušení jsme uložili a ověřujeme, že platba neproběhne.'
      : result.cancelled === 'immediately'
        ? 'Zrušeno. Nic ti nebude strženo.'
        : `Zrušeno. Přístup ti běží do ${formatDate(result.accessUntil)}.`);
  const restore = () => run(() => restoreSubscription(), (result) =>
    result.restored === 'season'
      ? `Obnoveno. Platba ${formatCzk(result.priceCzk)} proběhne ${formatDate(result.chargeAt)}.`
      : 'Obnoveno. Předplatné samo skončí s přihláškami.');
  const removeCard = () => run(() => removeSavedCard(), () => 'Uložená karta je odebraná.');

  // "Prodloužit do 30. 6.": from 1 Feb, spring for 149 Kč plus any monthly payment still due.
  const openExtend = async () => {
    setError(null);
    setExtendPreview(null);
    setSheet('extend');
    try { setExtendPreview(await fetchExtendPreview()); } catch (err) { setError(err.message); }
  };
  const canExtend = monthlyActive && Boolean(card) && seasonOffer.extendAvailable;

  // A trial turns into monthly: the trial is cancelled first (a plan that is
  // still scheduled counts as live), then the monthly purchase is confirmed.
  const trialToMonthly = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription('price');
      await refreshProfile();
      setSheet('buy-monthly');
    } catch (err) {
      setError(err.message || 'Zrušení se nepodařilo.');
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error && (
    <div className="notice notice-error" role="alert"><p className="notice-text">{error}</p></div>
  );

  return (
    <>
      {card && (
        <div className="settings-row">
          <div className="settings-row-body">
            <span className="settings-row-label">Uložená karta</span>
            <span className="settings-row-value" data-private>{cardLabel(card)}</span>
          </div>
          {canRemoveCard && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={removeCard} disabled={busy}>Odebrat uloženou kartu</button>
          )}
        </div>
      )}

      {trialRunning && profile.trialCharge && (
        <p className="settings-section-text">
          Zkušební období. {formatDate(profile.trialCharge.chargeAt)} se strhne {formatCzk(profile.trialCharge.priceCzk)}
          {card ? ` z karty ${cardLabel(card)}` : ''}. Do té doby můžeš zrušit a nic se nestrhne.
        </p>
      )}
      {monthlyActive && (
        <p className="settings-section-text">
          Platí se každý měsíc ve stejný den. Předplatné samo skončí {DEADLINE_LABEL}, poslední platba je jen za dny do konce přihlášek.
        </p>
      )}
      {monthlyEnded && <p className="settings-section-text">Měsíční předplatné skončilo s přihláškami.</p>}

      {trialCancelled && (
        <div className="settings-row-actions">
          <p className="settings-section-text">
            Zkušební období zrušeno. Přístup ti běží do {formatDate(profile.trial_expires_at)}. Nic se nestrhne.
          </p>
          {sheet === 'restore' ? (
            <div className="settings-form-inset">
              {errorBox}
              <p className="settings-section-text">
                Platba {formatCzk(profile.restorePriceCzk)} proběhne {formatDate(profile.restoreChargeAt)} z karty {cardLabel(card)}. Žádné nové zkušební dny.
              </p>
              <div className="settings-form-actions">
                <button type="button" className="btn btn-primary" onClick={restore} disabled={busy}>Potvrdit</button>
                <button type="button" className="btn btn-ghost" onClick={() => setSheet(null)} disabled={busy}>Zpět</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setError(null); setSheet('restore'); }}>
              Obnovit sezónní přístup
            </button>
          )}
        </div>
      )}

      {monthlyCancelled && (
        <div className="settings-row-actions">
          <p className="settings-section-text">
            Zrušeno — přístup ti běží do {formatDate(profile.access_expires_at)}, nic dalšího se nestrhne.
          </p>
          {errorBox}
          <button type="button" className="btn btn-primary btn-sm" onClick={restore} disabled={busy}>Obnovit předplatné</button>
        </div>
      )}

      {canCancel && (sheet === 'cancel' ? (
        <div id="settings-form-cancel" className="settings-form settings-form-inset">
          {errorBox}
          <p className="settings-section-text">
            {trialRunning
              ? 'Zrušíš teď, ve zkušební době — nic ti nebude strženo.'
              : 'Opravdu chceš předplatné zrušit? Přístup ti zůstane do konce už zaplaceného období, pak se neobnoví.'}
          </p>
          <div className="settings-form-actions">
            <button type="button" className="btn btn-danger btn-block" onClick={cancel} disabled={busy}>
              {busy && <span className="btn-spinner" aria-hidden="true" />}
              {busy ? 'Ruším…' : 'Ano, zrušit'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setSheet(null); setError(null); }} disabled={busy}>Nechat běžet</button>
          </div>
          <fieldset className="settings-reasons">
            <legend className="settings-section-text">Proč rušíš? (nepovinné)</legend>
            {CANCEL_REASONS.map((item) => (
              <label key={item.id} className="ob-check">
                <input type="radio" name="cancel-reason" checked={reason === item.id} onChange={() => setReason(item.id)} />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          {trialRunning && card && seasonOffer.monthlyAvailable && (
            <div className="notice settings-inset">
              <p className="notice-text">
                {monthlyOffer.monthlySingleCharge
                  ? `Raději jen do ${DEADLINE_LABEL}? Jednou ${formatCzk(monthlyOffer.priceCzk)}, nic dalšího se nestrhne.`
                  : `Raději měsíčně? Dnes ${formatCzk(monthlyOffer.priceCzk)}, pak ${formatCzk(monthlyOffer.priceCzk)} měsíčně, zrušíš kdykoli a samo skončí ${DEADLINE_LABEL}.`}
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={trialToMonthly} disabled={busy}>Přejít na měsíční</button>
            </div>
          )}
          {canExtend && (
            <div className="notice settings-inset">
              <p className="notice-text">Raději přístup až do {ACCESS_END_LABEL}?</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={openExtend} disabled={busy}>Prodloužit do 30. 6.</button>
            </div>
          )}
        </div>
      ) : sheet === 'extend' ? (
        <div className="settings-form-inset">
          {errorBox}
          {extendPreview ? (
            <SavedCardBuy
              kind="extend"
              priceCzk={extendPreview.amountCzk}
              card={card}
              intro={extendPreview.remainingMonthlyCzk > 0
                ? `Jaro ${formatCzk(extendPreview.springCzk)} plus zbývající měsíční platba ${formatCzk(extendPreview.remainingMonthlyCzk)}, kterou bys jinak zaplatil/a do ${DEADLINE_LABEL}. Měsíční předplatné tím skončí a přístup poběží do ${ACCESS_END_LABEL}.`
                : `Jaro do ${ACCESS_END_LABEL} za ${formatCzk(extendPreview.springCzk)}. Měsíční předplatné tím skončí a přístup poběží do ${ACCESS_END_LABEL}.`}
              onClose={() => setSheet(null)}
            />
          ) : !error && <p className="settings-section-text">Počítám částku…</p>}
        </div>
      ) : (
        <div className="settings-row-actions">
          {canExtend && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={openExtend}>Prodloužit do 30. 6.</button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setError(null); setSheet('cancel'); }}>
            {trialRunning ? 'Zrušit zkušební období' : 'Zrušit předplatné'}
          </button>
        </div>
      ))}

      {(canBuy || (monthlyEnded && card && seasonOffer.onSale)) && (sheet === 'buy-season' || sheet === 'buy-monthly' ? (
        <SavedCardBuy
          kind={sheet === 'buy-monthly' ? 'monthly' : 'season'}
          priceCzk={sheet === 'buy-monthly' ? monthlyOffer.priceCzk : seasonOffer.listCzk}
          card={card}
          intro={sheet === 'buy-monthly' ? (monthlyOffer.monthlySingleCharge ? `Platí se jednou za dny do ${DEADLINE_LABEL}, nic dalšího se nestrhne.` : `Měsíční předplatné samo skončí ${DEADLINE_LABEL}, poslední platba je jen za dny do konce přihlášek.`) : `Přístup platí do ${ACCESS_END_LABEL}.`}
          onClose={() => setSheet(null)}
        />
      ) : (
        <div className="settings-row-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setSheet('buy-season')}>
            {seasonOffer.isSpring ? `Jarní přístup do ${ACCESS_END_LABEL} za` : 'Koupit sezónní přístup za'} {formatCzk(seasonOffer.listCzk)}
          </button>
          {seasonOffer.monthlyAvailable && !seasonOffer.isSpring && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSheet('buy-monthly')}>
              Měsíčně {formatCzk(monthlyOffer.priceCzk)}
            </button>
          )}
        </div>
      ))}

      {paid && <ReferralCard />}
      {!seasonOffer.onSale && !live && (
        <p className="settings-section-text">Prodej pro tuto sezónu už skončil.</p>
      )}
    </>
  );
}

export default SubscriptionManager;
