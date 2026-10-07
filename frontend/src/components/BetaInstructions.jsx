import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MousePointer2, SquareMousePointer, MessageSquare } from 'lucide-react';
import { ObButton } from './onboarding/ObKit';
import BetaEnrollment from './BetaEnrollment';
import { saveBetaProfile } from '../api';
import { betaEnrollmentComplete } from '../lib/betaEnrollment';
import { useDraft } from '../lib/useDraft';

const SUPPORT_EMAIL = 'info@stredninamiru.cz';
const tasks = [
  ['dotaznik','Dotazník','/dotaznik'], ['vyhledavani','Vyhledávání','/skoly'],
  ['detail','Detail školy (3×)','/skoly'], ['porovnani','Porovnání','/porovnani'],
  ['matice','Rozhodovací matice','/porovnani/matice'], ['prihlaska','Přihláška','/prihlaska'],
  ['tema','Barevné téma','/nastaveni'], ['sdileni','Sdílení s rodiči','/dotaznik'],
  ['platby','Platební obrazovky (jen náhled)','/onboarding/hodnota?betaPreview=1'],
];
export function BetaChecklist({ checklist = {}, onNavigate }) {
  return <ul className="beta-checklist">{tasks.map(([id,label,path]) => <li key={id}>
    <span className={`beta-task-check${checklist[id] ? ' is-done' : ''}`} aria-label={checklist[id] ? 'Vyzkoušeno' : 'Zatím nevyzkoušeno'}>{checklist[id] && <Check size={14} />}</span>
    <Link to={path} onClick={onNavigate}>{label}</Link>
    {id === 'detail' && <span className="ss-data-sm">{Math.min(checklist.school_ids?.length || 0,3)}/3</span>}
  </li>)}</ul>;
}
function doneCount(checklist = {}) {
  return tasks.filter(([id]) => checklist[id]).length;
}
/** Progress header + the checklist, for the places that show it on its own (Nastavení). */
export function BetaProgress({ checklist = {}, onNavigate }) {
  const done = doneCount(checklist);
  return <div className="beta-progress">
    <div className="beta-guide-section-head">
      <h3 className="ss-headline-sm">Vyzkoušené funkce</h3>
      <span className="beta-guide-progress">{done} z {tasks.length}</span>
    </div>
    <div className="beta-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done} aria-label="Vyzkoušené funkce">
      <span style={{ width: `${100 * done / tasks.length}%` }} />
    </div>
    <BetaChecklist checklist={checklist} onNavigate={onNavigate} />
  </div>;
}

// Every block of guidance, worded once for both voices and shared by the
// first-run steps and the one-screen reference behind the "?" button.
function guidance(parent, hours) {
  const t = (student, adult) => (parent ? adult : student);
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return {
    want: <>
      <p>{t('Chceme od tebe co nejvíc informací. Každá informace je dobrá informace — i úplná drobnost.', 'Chceme od vás co nejvíc informací. Každá informace je dobrá informace — i úplná drobnost.')}</p>
      <p className="beta-guide-lead">{t('Co máš napsat:', 'Co máte napsat:')}</p>
      <ul className="beta-guide-list">
        <li>Chyby a místa, která nefungují nebo jsou matoucí.</li>
        <li>{t('Funkce a informace, které by se ti hodily.', 'Funkce a informace, které by se vám hodily.')}</li>
        <li>Malé změny: text, tlačítko, pořadí, barva.</li>
        <li>{t('Co se ti líbí a co máme nechat — pozitivní zpětná vazba pomáhá stejně.', 'Co se vám líbí a co máme nechat — pozitivní zpětná vazba pomáhá stejně.')}</li>
      </ul>
      <p><strong>{t('Buď upřímný(á).', 'Buďte upřímní.')}</strong> {t('Když ti web přijde k ničemu nebo se ti něco vůbec nelíbí, napiš to na rovinu. Přesně to potřebujeme slyšet.', 'Když vám web přijde k ničemu nebo se vám něco vůbec nelíbí, napište to na rovinu. Přesně to potřebujeme slyšet.')}</p>
    </>,
    data: <div className="beta-guide-callout">
      <p className="beta-guide-callout-title">{t('Nesedí ti nějaký údaj o škole?', 'Nesedí vám nějaký údaj o škole?')}</p>
      <p>{t('Statistiky z Cermatu i praktické informace z webů škol zpracováváme automaticky, takže se může stát, že něco není pravda. Když na takový údaj narazíš, dej nám vědět.', 'Statistiky z Cermatu i praktické informace z webů škol zpracováváme automaticky, takže se může stát, že něco není pravda. Když na takový údaj narazíte, dejte nám vědět.')}</p>
    </div>,
    how: <>
      <p>{t('Tlačítko „Zpětná vazba“ je vždy vpravo dole. Můžeš:', 'Tlačítko „Zpětná vazba“ je vždy vpravo dole. Můžete:')}</p>
      <ul className="beta-guide-list">
        <li>{t('napsat obecnou zprávu o celém webu, nebo', 'napsat obecnou zprávu o celém webu, nebo')}</li>
        <li>{t('označit konkrétní místo na stránce (tlačítko, text, část) a napsat poznámku přímo k němu.', 'označit konkrétní místo na stránce (tlačítko, text, část) a napsat poznámku přímo k němu.')}</li>
      </ul>
      <ol className="beta-demo" aria-label="Tři kroky zpětné vazby">{[[MousePointer2, t('Klikni na „Zpětná vazba“', 'Klikněte na „Zpětná vazba“')], [SquareMousePointer, t('Označ místo, nebo piš obecně', 'Označte místo, nebo pište obecně')], [MessageSquare, t('Napiš zprávu', 'Napište zprávu')]].map(([Icon, label]) => <li key={label}><Icon size={24} aria-hidden="true" /><span>{label}</span></li>)}</ol>
      <p>{t('Pošli toho klidně hodně — i „tohle je super, nechte to tak“.', 'Pošlete toho klidně hodně — i „tohle je super, nechte to tak“.')}</p>
    </>,
    contact: <div className="beta-guide-callout">
      <p className="beta-guide-callout-title">{t('Něco nejde nahlásit tlačítkem?', 'Něco nejde nahlásit tlačítkem?')}</p>
      <p>{t(<>Když nefunguje něco, co přes zpětnou vazbu poslat nejde (třeba přihlášení), napiš na {mail}. Během bety to obvykle opravíme do 24 hodin. Na cokoli se můžeš zeptat e-mailem i přes zpětnou vazbu.</>, <>Když nefunguje něco, co přes zpětnou vazbu poslat nejde (třeba přihlášení), napište na {mail}. Během bety to obvykle opravíme do 24 hodin. Na cokoli se můžete zeptat e-mailem i přes zpětnou vazbu.</>)}</p>
    </div>,
    rules: <ul className="beta-guide-list">
      <li><strong>Zdarma, výměnou za zpětnou vazbu.</strong> {t(`Chceme aspoň jednu zpětnou vazbu za ${hours} hodin. Když se neozveš, sami si o ni řekneme. Bez ní se přístup pozastaví, dokud nám nenapíšeš — každá zpětná vazba ho zase obnoví.`, `Chceme aspoň jednu zpětnou vazbu za ${hours} hodin. Když se neozvete, sami si o ni řekneme. Bez ní se přístup pozastaví, dokud nám nenapíšete — každá zpětná vazba ho zase obnoví.`)}</li>
      <li><strong>Platby jsou jen náhled.</strong> {t('Nic neplatíš. U platebních obrazovek chceme tvůj názor, ne peníze.', 'Nic neplatíte. U platebních obrazovek chceme váš názor, ne peníze.')}</li>
      <li><strong>Na konci krátký dotazník.</strong> {t('Po vyzkoušení hlavních funkcí se zeptáme, jak to celé dopadlo. Recenze je samostatná a nepovinná.', 'Po vyzkoušení hlavních funkcí se zeptáme, jak to celé dopadlo. Recenze je samostatná a nepovinná.')}</li>
    </ul>,
    try: t('Používej web, jako bys opravdu vybíral(a) školu. Vyzkoušené části se odškrtnou samy.', 'Používejte web, jako byste opravdu vybírali školu. Vyzkoušené části se odškrtnou samy.'),
  };
}

function Enrollment({ beta, onRefresh }) {
  const [role, setRole] = useState(beta?.role || ''), [roleNote, setRoleNote] = useState(beta?.role_note || ''), [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [showErrors, setShowErrors] = useState(false);
  return <div className="stack">
    <BetaEnrollment role={role} roleNote={roleNote} accepted={accepted} showErrors={showErrors} onRole={setRole} onRoleNote={setRoleNote} onAccepted={setAccepted} />
    {error && <p role="alert">{error}</p>}
    <ObButton disabled={saving} onClick={async () => {
      if (!betaEnrollmentComplete({ role, roleNote, accepted })) { setShowErrors(true); return; }
      setSaving(true); setError('');
      try { await saveBetaProfile(role, roleNote); await onRefresh(); } catch (e) { setError(e.message); } finally { setSaving(false); }
    }}>Pokračovat</ObButton>
  </div>;
}

/** First run: three steps the tester has to finish. `reference`: everything on one screen. */
export default function BetaInstructions({ beta, hours = 48, onDone, onRefresh, busy, reference = false }) {
  // Kept per tab: a reload on step 3 must not send the tester back to step 1.
  const [step, setStep, clearStep] = useDraft('snm.beta.guide.step', 0);
  const parent = beta?.role === 'rodic' || beta?.role === 'ucitel';
  if (!beta) return <p role="status">Načítám testování…</p>;
  if (!beta.consent_tracking_at) return <Enrollment beta={beta} onRefresh={onRefresh} />;
  const g = guidance(parent, hours);
  const done = doneCount(beta.checklist);
  const checklist = <section className="beta-guide-section beta-guide-checklist" aria-labelledby="beta-guide-try">
    <div className="beta-guide-section-head">
      <h3 id="beta-guide-try" className="ss-headline-sm">Co vyzkoušet</h3>
      <span className="beta-guide-progress">{done} z {tasks.length}</span>
    </div>
    <p className="beta-guide-hint">{g.try}</p>
    <BetaChecklist checklist={beta.checklist} onNavigate={onDone} />
  </section>;

  if (reference) return <div className="beta-instructions beta-reference">
    {checklist}
    <div className="beta-reference-guide">
      <section className="beta-guide-section"><h3 className="ss-headline-sm">{parent ? 'Co od vás chceme' : 'Co od tebe chceme'}</h3>{g.want}{g.data}</section>
      <section className="beta-guide-section"><h3 className="ss-headline-sm">Jak nám dát zpětnou vazbu</h3>{g.how}{g.contact}</section>
      <section className="beta-guide-section"><h3 className="ss-headline-sm">Jak testování funguje</h3>{g.rules}</section>
    </div>
    <div className="ss-dialog-actions beta-reference-actions"><ObButton onClick={onDone}>Zavřít</ObButton></div>
  </div>;

  const steps = [
    [parent ? 'Co od vás chceme' : 'Co od tebe chceme', <>{g.want}{g.data}</>],
    ['Jak nám dát zpětnou vazbu', <>{g.how}{g.contact}</>],
    ['Jak testování funguje', <>{g.rules}{checklist}</>],
  ];
  const last = step === steps.length - 1;
  return <div className="beta-instructions">
    <p className="eyebrow">Pokyny · {step + 1} ze {steps.length}</p>
    <h3 className="ss-headline-md">{steps[step][0]}</h3>
    <div className="beta-guide-body">{steps[step][1]}</div>
    <div className="ss-dialog-actions">{step > 0 && <ObButton variant="secondary" onClick={() => setStep(step - 1)}>Zpět</ObButton>}
      <ObButton disabled={busy} onClick={() => { if (last) { clearStep(); onDone(); } else setStep(step + 1); }}>{last ? 'Začít testovat' : 'Pokračovat'}</ObButton>
    </div>
  </div>;
}
