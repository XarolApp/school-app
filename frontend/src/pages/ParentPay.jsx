import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import ConfirmDialog from '../components/ConfirmDialog';
import { cancelViaPayLink, fetchPayLink, startPayLinkCheckout, withdrawViaPayLink } from '../api';
import {
  DEFAULT_PLAN_ID,
  PLANS,
  PAYMENTS_MOCKED,
  cancellationTerms,
  formatCzk,
  getPlan,
  planCopy,
  trialDaysPhrase,
} from '../config/pricing';
import './decision.css';

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
}

function ParentPay() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [message, setMessage] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);
  const paymentReturned = searchParams.get('platba') === 'ok';

  const reload = useCallback(async () => {
    try {
      const value = await fetchPayLink(token);
      setLink(value);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    if (!paymentReturned || link?.plan || attempts >= 10) return undefined;
    const timer = setTimeout(async () => {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      await reload();
    }, 3000);
    return () => clearTimeout(timer);
  }, [paymentReturned, link, attempts, reload]);

  const startCheckout = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const { url } = await startPayLinkCheckout(token, planId);
      window.location.assign(url);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const manage = async () => {
    setBusy(true);
    setError(null);
    try {
      if (dialog === 'cancel') {
        await cancelViaPayLink(token);
        setMessage('Předplatné se podařilo zrušit.');
      } else {
        await withdrawViaPayLink(token);
        setMessage('Odstoupení od smlouvy jsme přijali.');
      }
      setDialog(null);
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const noLink = error?.status === 404 || (!loading && !link && !error);
  const plan = link?.plan;
  const planDetails = plan ? getPlan(plan.plan_id) : null;
  const canCancel = plan && !plan.cancel_at_period_end && (
    plan.subscription_status === 'trialing' ||
    (plan.plan_id === 'monthly' && ['active', 'past_due'].includes(plan.subscription_status))
  );

  return (
    <div className="dp-share-page dp-plan018-page">
      <div className="dp-share-topbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true"><BrandMark size={22} /></span>
          Střední na míru
        </Link>
      </div>

      {loading ? (
        <p className="ss-body-md dp-plan018-pad">Načítám platební odkaz…</p>
      ) : noLink ? (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Odkaz nenalezen nebo byl zrušen</h1>
        </div>
      ) : error && !link ? (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Platební odkaz se nepodařilo načíst</h1>
          <p className="ss-body-md">{error.status ? error.message : 'Připojení se nepodařilo. Zkus to prosím znovu.'}</p>
          <button className="ss-btn ss-btn-secondary" type="button" onClick={reload}>Zkusit znovu</button>
        </div>
      ) : paymentReturned && !plan && attempts < 10 ? (
        <section className="dp-share-header">
          <h1 className="ss-headline-md h">Platba se zpracovává…</h1>
          <p className="ss-body-md">Počkáme na potvrzení platby.</p>
        </section>
      ) : paymentReturned && !plan ? (
        <section className="dp-share-header">
          <h1 className="ss-headline-md h">Platba se zpracovává…</h1>
          <p className="ss-body-md">Stav můžete znovu ověřit.</p>
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => { setAttempts(0); attemptsRef.current = 0; reload(); }}>
            Zkontrolovat znovu
          </button>
        </section>
      ) : plan ? (
        <>
          <div className="dp-share-header">
            <div className="ss-label-caps">Správa přístupu</div>
            <h1 className="ss-headline-md h">Přístup pro {link.for_name || 'vaše dítě'} je aktivní</h1>
            <p className="ss-body-md">{planDetails?.name || 'Předplatné'}</p>
            {plan.access_expires_at && <p className="ss-body-md">Přístup platí do {formatDate(plan.access_expires_at)}.</p>}
            {plan.cancel_at_period_end && <p className="ss-caption">Předplatné je zrušené a po skončení zaplaceného období se neobnoví.</p>}
          </div>
          {message && <p className="dp-plan018-pad" role="status">{message}</p>}
          {error && <p className="dp-plan018-error" role="alert">{error.status ? error.message : 'Připojení se nepodařilo. Zkus to prosím znovu.'}</p>}
          <div className="dp-plan018-actions">
            {canCancel && (
              <button className="ss-btn ss-btn-secondary" type="button" onClick={() => setDialog('cancel')}>
                Zrušit předplatné
              </button>
            )}
            {plan.can_withdraw && (
              <button className="ss-btn ss-btn-secondary" type="button" onClick={() => setDialog('withdraw')}>
                Odstoupit od smlouvy a vrátit peníze
              </button>
            )}
          </div>
          <p className="ss-caption dp-share-footer">Tato stránka spravuje jen plán vašeho dítěte. Přístup do aplikace zůstává na jeho účtu.</p>
        </>
      ) : link.checkout_open ? (
        <section className="dp-parent-pay">
          <div className="dp-share-header">
            <div className="ss-label-caps">Platba za dítě</div>
            <h1 className="ss-headline-md h">Přístup pro {link.for_name || 'vaše dítě'}</h1>
            <p className="ss-body-md">
              Sezónní přístup nabízí {trialDaysPhrase()} zdarma. Měsíční varianta se platí hned.
            </p>
          </div>
          {error && <p className="dp-plan018-error" role="alert">{error.status ? error.message : 'Připojení se nepodařilo. Zkus to prosím znovu.'}</p>}
          <div className="plan-picker">
            {PLANS.map((item) => (
              <label key={item.id} className={'plan-picker-option' + (planId === item.id ? ' is-selected' : '')}>
                <input
                  type="radio"
                  name="parent-plan"
                  value={item.id}
                  checked={planId === item.id}
                  onChange={() => setPlanId(item.id)}
                />
                <span className="plan-picker-name">{item.name}</span>
                <span className="plan-picker-price">{formatCzk(item.priceCzk)} {item.priceSuffix}</span>
                <span className="plan-picker-terms">{planCopy(item, 'parent', 'terms')}</span>
                {item.hasTrial && (
                  <span className="plan-picker-terms">{cancellationTerms(item, 'parent').text}</span>
                )}
              </label>
            ))}
          </div>
          <button type="button" className="ss-btn ss-btn-primary dp-parent-pay-order" onClick={startCheckout} disabled={busy}>
            {busy ? 'Přesměrovávám…' : 'Objednat s povinností platby'}
          </button>
          <p className="ss-caption dp-parent-pay-terms">
            Objednáním potvrzujete, že jste rodič nebo zákonný zástupce, a souhlasíte s{' '}
            <Link to="/obchodni-podminky">obchodními podmínkami</Link> včetně práva odstoupit.
          </p>
          <p className="ss-caption dp-parent-pay-terms">Účet ani přihlášení nepotřebujete. Aplikaci bude používat vaše dítě na svém účtu.</p>
          {PAYMENTS_MOCKED && <p className="ss-caption dp-parent-pay-terms">Platby zatím nejsou nastavené. Zkuste to prosím později.</p>}
        </section>
      ) : (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Odkaz vypršel</h1>
          <p className="ss-body-md">Požádejte dítě o nový.</p>
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog === 'cancel' ? 'Zrušit předplatné?' : 'Odstoupit od smlouvy?'}
          cancelLabel={dialog === 'cancel' ? 'Nechat běžet' : 'Ne, ponechat'}
          confirmLabel={dialog === 'cancel' ? 'Ano, zrušit' : 'Potvrdit odstoupení od smlouvy'}
          onCancel={() => setDialog(null)}
          onConfirm={manage}
          busy={busy}
        >
          {dialog === 'cancel' ? (
            <p>
              {plan.subscription_status === 'trialing'
                ? 'Zrušíte teď, ve zkušební době — nic vám nebude strženo.'
                : 'Opravdu chcete předplatné zrušit? Přístup vám zůstane do konce zaplaceného období, pak se neobnoví.'}
            </p>
          ) : (
            <p>
              Potvrďte odstoupení od smlouvy. Zaplacenou částku vrátíme celou, předplatné se zruší a přístup skončí hned.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

export default ParentPay;
