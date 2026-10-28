import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { PAYMENTS_MOCKED, formatCzk } from '../../../config/pricing';
import { useAuth } from '../../../components/AuthContext';
import { useOnboarding } from '../useOnboarding';
import { useG } from '../../../lib/gender';
import { usePrices } from '../../../lib/usePrices';
import { completeOnSession } from '../../../lib/payFlow';
import { confirmPendingPurchase, discardPendingPurchase } from '../../../api';
import { useBetaTools } from '../../../components/BetaToolsContext';
import { QuickFeedback } from '../../../components/BetaReward';

/**
 * Post-onboarding — empty-state checklist.
 *
 * Mural replaced pop-ups and product tours with a persistent 6-step checklist
 * and got a ~10% relative lift in one-week retention. People like ticking
 * visible boxes, and it converts a "what now?" moment into a next action.
 *
 * The seasonal milestone loop replaces streaks here: real dates (dny otevřených
 * dveří, přihlášky) instead of a punishing daily counter. Nothing on this
 * screen shames a user who ticks nothing.
 *
 * Tone stays role-consistent: a parent who paid is never later addressed as ty.
 */
const TASKS = {
  student: [
    'Projdi si celé pořadí škol',
    'Ulož si tři školy, které tě zaujaly',
    'Porovnej je vedle sebe',
    'Napiš si poznámky ke školám',
    'Najdi si termíny dnů otevřených dveří',
    'Poznač si datum přihlášek',
  ],
  parent: [
    'Projděte si celé pořadí škol',
    'Uložte si tři školy k bližšímu zvážení',
    'Porovnejte je vedle sebe',
    'Proberte výsledky s dítětem',
    'Zjistěte termíny dnů otevřených dveří',
    'Poznamenejte si termín podání přihlášek',
  ],
};

/**
 * The card entered at Checkout already had its free trial, so nothing was
 * scheduled and nothing is unlocked. The person chooses: pay now at today's
 * price, or drop the card. Nothing is charged before they click.
 */
function ConfirmPending({ profile, parent, refreshProfile, goToStep }) {
  const g = useG();
  const [price, setPrice] = useState(profile.pendingPurchase?.priceCzk ?? null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!paid) return undefined;
    const poll = window.setInterval(() => { void refreshProfile(); }, 2000);
    return () => window.clearInterval(poll);
  }, [paid, refreshProfile]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await confirmPendingPurchase({ immediateStart: true, confirmPriceCzk: price });
      await completeOnSession(result);
      setPaid(true);
    } catch (err) {
      if (err.code === 'PRICE_CHANGED' && err.body?.priceCzk != null) {
        setPrice(err.body.priceCzk);
        setError(`Cena se změnila na ${formatCzk(err.body.priceCzk)}. Zkontroluj ji a potvrď znovu.`);
      } else {
        setError(err.message || 'Platba se nepodařila.');
      }
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    setError(null);
    try {
      await discardPendingPurchase();
      await refreshProfile();
      goToStep('plan');
    } catch (err) {
      setError(err.message || 'Kartu se nepodařilo odebrat.');
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <ObScreen chrome={false}>
        <div className="ob-done">
          <span className="ob-wait-spinner" role="status" aria-label="Načítání" />
          <h1 className="ob-title">Potvrzujeme platbu</h1>
          <p className="ob-lead">{parent ? 'Chvilku prosím počkejte, odemykáme účet.' : 'Chvilku prosím počkej, odemykáme tvůj účet.'}</p>
        </div>
      </ObScreen>
    );
  }
  return (
    <ObScreen chrome={false}>
      <div className="ob-done">
        <h1 className="ob-title">Tahle karta už zkušební období měla</h1>
        <p className="ob-lead">
          Zkušební období je jen jedno na kartu. {parent ? 'Přístup můžete mít hned' : 'Přístup můžeš mít hned'} za {price === null ? '…' : formatCzk(price)}.
        </p>
        {error && <div className="notice notice-error" role="alert"><p className="notice-text">{error}</p></div>}
        <label className="ob-check" htmlFor="immediate-start-pending">
          <input id="immediate-start-pending" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            {parent
              ? 'Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy měl/a dítě placený přístup.'
              : `Chci přístup hned. Beru na vědomí, že když do 14 dnů od objednávky odstoupím, zaplatím poměrnou část za dny, kdy jsem ${g('měl', 'měla')} placený přístup.`}
          </span>
        </label>
        <div className="ob-actions">
          <button type="button" className="ob-btn ob-btn-primary" onClick={pay} disabled={busy || !consent || price === null}>
            Objednat s povinností platby · {price === null ? '…' : formatCzk(price)}
          </button>
          <button type="button" className="ob-btn ob-btn-secondary" onClick={discard} disabled={busy}>
            Nechci, odebrat kartu
          </button>
        </div>
      </div>
    </ObScreen>
  );
}

function Activated() {
  const { role, purchased, refreshProfile, goToStep } = useOnboarding();
  const { profile } = useAuth();
  const { prices } = usePrices();
  const isTester = profile?.isTester === true;
  const parent = role === 'parent';
  const [done, setDone] = useState([]);
  const tasks = parent ? TASKS.parent : TASKS.student;
  const { beta, refreshBeta } = useBetaTools();

  // Stripe confirms the payment to our server a moment after the browser comes
  // back, and only then is the account unlocked. Ask again until it is (about a
  // minute), instead of showing the checklist to an account that is still locked.
  const waiting = !isTester && Boolean(profile) && profile.onboardingComplete === false;
  const [waitedOut, setWaitedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!waiting) return undefined;
    setWaitedOut(false);
    const poll = window.setInterval(() => { void refreshProfile(); }, 2000);
    const stop = window.setTimeout(() => setWaitedOut(true), 60000);
    return () => { window.clearInterval(poll); window.clearTimeout(stop); };
  }, [waiting, attempt, refreshProfile]);

  if (!isTester && profile?.needsPaymentConfirmation) {
    return <ConfirmPending profile={profile} parent={parent} refreshProfile={refreshProfile} goToStep={goToStep} />;
  }

  if (waiting) {
    return (
      <ObScreen chrome={false}>
        <div className="ob-done">
          {!waitedOut && <span className="ob-wait-spinner" role="status" aria-label="Načítání" />}
          <h1 className="ob-title">{waitedOut ? 'Platba se ještě potvrzuje' : 'Potvrzujeme platbu'}</h1>
          <p className="ob-lead">
            {waitedOut
              ? (parent ? 'Potvrzení od Stripe zatím nedorazilo. Zkuste to za chvíli znovu, nic se nestrhne dvakrát.' : 'Potvrzení od Stripe zatím nedorazilo. Zkus to za chvíli znovu, nic se nestrhne dvakrát.')
              : (parent ? 'Chvilku prosím počkejte, odemykáme váš účet.' : 'Chvilku prosím počkej, odemykáme tvůj účet.')}
          </p>
          {waitedOut && (
            <div className="ob-actions">
              <button type="button" className="ob-btn ob-btn-primary" onClick={() => setAttempt((n) => n + 1)}>
                Zkusit znovu
              </button>
            </div>
          )}
        </div>
      </ObScreen>
    );
  }

  // Beta: the paywall here was only a preview, so this screen is just a thank
  // you, a ten-second rating of the payment screens and the way back to schools.
  if (isTester) {
    return (
      <ObScreen chrome={false}>
        <div className="ob-done">
          <h1 className="ob-title">{parent ? 'Ukázku jste dokončili' : 'Ukázku máš za sebou'}</h1>
          <p className="ob-lead">{parent ? 'Děkujeme za vyzkoušení. Pokračujte ve zkoušení škol.' : 'Díky za vyzkoušení. Pokračuj ve zkoušení škol.'}</p>
          {beta && !beta.micro_asked?.platby?.done && (
            <div className="ob-done-quick">
              <QuickFeedback id="platby" parent={parent} onDone={() => { void refreshBeta().catch(() => {}); }} title={parent ? 'Jak hodnotíte platební obrazovky?' : 'Jak hodnotíš platební obrazovky?'} />
            </div>
          )}
          <div className="ob-actions">
            <Link to="/skoly" className="ob-btn ob-btn-primary">Přejít na školy</Link>
          </div>
        </div>
      </ObScreen>
    );
  }

  const toggle = (task) =>
    setDone((prev) => (prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]));

  return (
    <ObScreen chrome={false}>
      <div className="ob-done">
        <h1 className="ob-title">
          {purchased
            ? parent
              ? 'Hotovo — máte odemčeno'
              : 'Hotovo — máš odemčeno'
            : parent
              ? 'Vítejte'
              : 'Vítej'}
        </h1>
        <p className="ob-lead">
          {parent
            ? 'Tady je šest kroků, které dávají smysl udělat jako první. Není to povinnost ani soutěž.'
            : 'Tady je šest věcí, které dává smysl udělat jako první. Nic z toho není povinnost.'}
        </p>

        <ul className="ob-checklist">
          {tasks.map((task) => (
            <li key={task}>
              <label className="ob-check">
                <input
                  type="checkbox"
                  checked={done.includes(task)}
                  onChange={() => toggle(task)}
                />
                <span className={done.includes(task) ? 'is-done' : ''}>{task}</span>
              </label>
            </li>
          ))}
        </ul>

        <p className="ob-progress-label">
          {done.length} z {tasks.length}
        </p>

        <div className="ob-actions">
          <Link to="/skoly" className="ob-btn ob-btn-primary">
            {parent ? 'Přejít na školy' : 'Jdu na to'}
          </Link>
          <Link to="/dotaznik" className="ob-btn ob-btn-secondary">
            {parent ? 'Zpřesnit výsledky (asi 5–8 minut)' : 'Zpřesni výsledky (asi 5–8 minut)'}
          </Link>
        </div>

        {purchased && prices?.referral?.available && (
          <p className="ob-microcopy ob-pw-centered">
            V Nastavení najdeš odkaz pro kamarády — {parent ? 'dostanou' : 'dostanou'} {formatCzk(prices.referral.discountCzk)} slevu na sezónní přístup.
          </p>
        )}

        {PAYMENTS_MOCKED && purchased && (
          <p className="ob-mock-note">
            Ukázková verze: platba byla pouze simulovaná, žádná částka nebyla stržena.
          </p>
        )}
      </div>
    </ObScreen>
  );
}

export default Activated;
