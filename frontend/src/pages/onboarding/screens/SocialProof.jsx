import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import { STUDENTS_HELPED, testimonialsFor } from '../../../config/socialProof';
import { useOnboarding } from '../useOnboarding';

/**
 * Screen 22 — Proof wall, immediately before the paywall.
 *
 * Branches by role: peer proof for students, authority proof (methodology,
 * deterministic scoring, data handling) for parents. Stripe/security signals
 * stay on BOTH branches — teenagers are more scam-wary than adults assume.
 *
 * HONESTY OVERRIDE: the playbook wants a high-density testimonial wall and a
 * user count here. ŠkolaMatch has neither yet, and inventing "už 1 240
 * deváťáků" would be a fabricated claim aimed at a minor and their parent —
 * a misleading commercial practice under the UCPD and the fastest possible way
 * to lose a Czech parent. So this screen ships the strongest TRUE proof
 * available instead: exactly how the matching works and what it refuses to
 * claim. Fill config/socialProof.js with real quotes and the wall switches on
 * automatically.
 */
const METHOD_POINTS = [
  {
    id: 'math',
    title: 'Shodu počítá matematika, ne dojem',
    student: 'Každá odpověď má svoji váhu a u každé školy ti ukážeme, z čeho výsledek vyšel.',
    parent:
      'Skóre je deterministický výpočet z vašich odpovědí. U každé školy rozepisujeme, které složky se do něj promítly.',
  },
  {
    id: 'skip',
    title: 'Přeskočená otázka nikdy neubírá body',
    student: 'Když něco nevíš, jen ti u výsledku napíšeme, že je méně spolehlivý. Nic víc.',
    parent:
      'Nevyplněná odpověď se z výpočtu vyřadí a sníží se uvedená spolehlivost. Skóre se nikdy nesnižuje za mlčení.',
  },
  {
    id: 'limits',
    title: 'Neslibujeme, co nevíme',
    student: 'Nemáme data o přijímačkách ani známkách, tak si je nevymýšlíme.',
    parent:
      'Nepracujeme s daty o přijímacích zkouškách, kapacitách ani prospěchu. Dokud je nemáme, netvrdíme o nich nic.',
  },
  {
    id: 'data',
    title: 'Odpovědi zůstávají u vás',
    student: 'Dokud si nezaložíš účet, odpovědi z dotazníku neopustí tvůj prohlížeč.',
    parent:
      'Odpovědi z dotazníku zůstávají do vytvoření účtu pouze ve vašem prohlížeči. Neprodáváme je a nepředáváme školám.',
  },
];

function SocialProof() {
  const { role, goNext, goBack, phase } = useOnboarding();
  const parent = role === 'parent';
  const testimonials = testimonialsFor(parent ? 'parent' : 'student');

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      actions={<ObButton onClick={goNext}>{parent ? 'Pokračovat' : 'Chci celé pořadí'}</ObButton>}
    >
      <h1 className="ob-title">{parent ? 'Na čem výsledky stojí' : 'Proč tomu můžeš věřit'}</h1>

      {STUDENTS_HELPED && (
        <p className="ob-proof-line">
          Dotazníkem už prošlo {STUDENTS_HELPED.toLocaleString('cs-CZ')} deváťáků.
        </p>
      )}

      <div className="ob-proof-grid">
        {METHOD_POINTS.map((p) => (
          <div key={p.id} className="ob-proof-card">
            <strong>{p.title}</strong>
            <span>{parent ? p.parent : p.student}</span>
          </div>
        ))}
      </div>

      {testimonials.length > 0 && (
        <div className="ob-testimonials">
          {testimonials.map((t) => (
            <blockquote key={t.id} className="ob-testimonial">
              <p>{t.quote}</p>
              <cite>{t.author}</cite>
            </blockquote>
          ))}
        </div>
      )}

      {testimonials.length === 0 && (
        <p className="ob-microcopy">
          {parent
            ? 'Recenze zde zveřejníme, až je budeme mít od skutečných uživatelů. Vymyšlené hodnocení sem nedáme.'
            : 'Recenze sem dáme, až je budeme mít od skutečných lidí. Vymyšlené hodnocení tu nenajdeš.'}
        </p>
      )}
    </ObScreen>
  );
}

export default SocialProof;
