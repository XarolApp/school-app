import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { PAYMENTS_MOCKED } from '../../../config/pricing';
import { useAuth } from '../../../components/AuthContext';
import { useOnboarding } from '../useOnboarding';
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
    'Ukaž výsledky rodičům',
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

function Activated() {
  const { role, purchased } = useOnboarding();
  const { profile } = useAuth();
  const isTester = profile?.isTester === true;
  const parent = role === 'parent';
  const [done, setDone] = useState([]);
  const tasks = parent ? TASKS.parent : TASKS.student;
  const { beta, refreshBeta } = useBetaTools();

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
