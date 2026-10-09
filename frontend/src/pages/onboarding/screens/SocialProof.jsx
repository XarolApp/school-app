import { Calculator, CircleSlash, Lock, SkipForward } from 'lucide-react';
import { ObButton, ObScreen } from '../../../components/onboarding/ObKit';
import TopMatchCard from '../../../components/onboarding/TopMatchCard';
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
 * user count here. Střední na míru has neither yet, and inventing "už 1 240
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
    Icon: Calculator,
    title: 'Shodu počítá matematika, ne dojem',
    student: 'Každá odpověď má svoji váhu a u každé školy ti ukážeme, z čeho výsledek vyšel.',
    parent:
      'Skóre je deterministický výpočet z vašich odpovědí. U každé školy rozepisujeme, které složky se do něj promítly.',
  },
  {
    id: 'skip',
    Icon: SkipForward,
    title: 'Přeskočené otázky nepočítáme',
    student: 'Když něco nevíš, otázku přeskočíš. Výsledek vychází z vyplněných odpovědí a ukazujeme i jeho spolehlivost.',
    parent:
      'Nevyplněná odpověď se z výpočtu vyřadí. Výsledek vychází z vyplněných odpovědí a uvádíme i jeho spolehlivost.',
  },
  {
    id: 'limits',
    Icon: CircleSlash,
    title: 'Neslibujeme, co nevíme',
    student: 'Hranice přijetí z Cermatu ti ukážeme, ale tvoje šance na přijetí nehádáme. Na to nemáme data.',
    parent:
      'Hranice přijetí a kapacity z výsledků Cermatu zobrazujeme, šanci na přijetí ale nepředpovídáme. Na to data nemáme.',
  },
  {
    id: 'data',
    Icon: Lock,
    title: 'Odpovědi zůstávají u vás',
    student: 'Dokud si nezaložíš účet, odpovědi z dotazníku neopustí tvůj prohlížeč.',
    parent:
      'Odpovědi z dotazníku zůstávají do vytvoření účtu pouze ve vašem prohlížeči. Neprodáváme je a nepředáváme školám.',
  },
];

function SocialProof() {
  const { role, goNext, goBack, phase, ranked, cleanedAnswers } = useOnboarding();
  const parent = role === 'parent';
  const testimonials = testimonialsFor(parent ? 'parent' : 'student');

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      center
      asideVariant="showcase"
      aside={
        // Proof by example: the first claim ("u každé školy ti ukážeme, z čeho
        // výsledek vyšel") demonstrated on the user's own #1 result.
        <TopMatchCard
          result={ranked?.[0]}
          answers={cleanedAnswers}
          role={role}
          label={parent ? 'Takhle rozepisujeme každou školu' : 'Takhle ti rozepíšeme každou školu'}
        />
      }
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
            <span className="ob-proof-icon" aria-hidden="true"><p.Icon size={18} strokeWidth={2} /></span>
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
              {/* Beta reviewers receive free access, so keep the incentive disclosure adjacent to each quote. */}
              <cite>{t.author} · beta tester, přístup zdarma</cite>
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
