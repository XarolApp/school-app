import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MousePointer2, SquareMousePointer, MessageSquare } from 'lucide-react';
import { ObButton } from './onboarding/ObKit';
import BetaEnrollment from './BetaEnrollment';
import { saveBetaProfile } from '../api';

const tasks = [
  ['dotaznik','Dotazník','/dotaznik'], ['vyhledavani','Vyhledávání','/skoly'],
  ['detail','Detail školy (3×)','/skoly'], ['porovnani','Porovnání','/porovnani'],
  ['matice','Rozhodovací matice','/porovnani/matice'], ['prihlaska','Přihláška','/prihlaska'],
  ['tema','Barevné téma','/nastaveni'], ['sdileni','Sdílení s rodiči','/dotaznik'],
  ['platby','Platební obrazovky','/onboarding/hodnota?betaPreview=1'],
];
export function BetaChecklist({ checklist = {}, onNavigate }) {
  return <ul className="beta-checklist">{tasks.map(([id,label,path]) => <li key={id}>
    <span className={`beta-task-check${checklist[id] ? ' is-done' : ''}`} aria-label={checklist[id] ? 'Vyzkoušeno' : 'Zatím nevyzkoušeno'}>{checklist[id] && <Check size={14} />}</span>
    <Link to={path} onClick={onNavigate}>{label}</Link>
    {id === 'detail' && <span className="ss-data-sm">{Math.min(checklist.school_ids?.length || 0,3)}/3</span>}
  </li>)}</ul>;
}
export default function BetaInstructions({ beta, hours = 48, onDone, onRefresh, busy }) {
  const [step, setStep] = useState(0), [role, setRole] = useState(beta?.role || ''), [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const parent = beta?.role === 'rodic' || beta?.role === 'ucitel';
  const headings = ['Díky. Každá připomínka se počítá.', parent ? 'Používejte web normálně' : 'Používej web normálně', parent ? 'Co od vás chceme' : 'Co od tebe chceme', 'Jak poslat zprávu', `${hours} hodin přístupu`, 'Na konci krátké ohlédnutí'];
  if (!beta) return <p role="status">Načítám testování…</p>;
  if (!beta.consent_tracking_at) return <div className="stack">
    <BetaEnrollment role={role} accepted={accepted} onRole={setRole} onAccepted={setAccepted} />
    {error && <p role="alert">{error}</p>}
    <ObButton disabled={saving || !role || !accepted} onClick={async () => {
      setSaving(true); setError('');
      try { await saveBetaProfile(role); await onRefresh(); } catch (e) { setError(e.message); } finally { setSaving(false); }
    }}>Pokračovat</ObButton>
  </div>;
  return <div className="stack beta-instructions">
    <p className="eyebrow">Pokyny · {step + 1} ze 6</p><h2 className="ss-headline-md">{headings[step]}</h2>
    {step === 0 && <p>{parent ? 'Jste mezi prvními. Každá vaše připomínka, i drobnost, jde přímo k nám a opravdu ji čteme.' : 'Jsi jeden z prvních. Každá připomínka, i drobnost, jde přímo k nám a opravdu ji čteme.'}</p>}
    {step === 1 && <><p>{parent ? 'Používejte to, jako byste opravdu vybírali školu. Vyzkoušené části se označí samy.' : 'Používej to, jako bys opravdu vybíral(a) školu. Vyzkoušené části se označí samy.'}</p><BetaChecklist checklist={beta.checklist} onNavigate={onDone} /></>}
    {step === 2 && <p>{parent ? 'Napište nám' : 'Napiš nám'} o chybách, návrzích, chybějících funkcích, textech i špatných údajích o školách. Nic není moc malé.</p>}
    {step === 3 && <><p>Tlačítko „Zpětná vazba“ je vždy v rohu. Místo na stránce lze označit, text navrhnout jinak, nebo napsat obecnou zprávu.</p>
      <ol className="beta-demo" aria-label="Tři kroky zpětné vazby">{[[MousePointer2,'Klikni'],[SquareMousePointer,'Označ místo / obecně'],[MessageSquare,'Napiš zprávu']].map(([Icon,label], i) => <li key={label} style={{ animationDelay: `${i * 0.4}s` }}><Icon size={24} /><span>{parent ? ['Klikněte','Označte místo / obecně','Napište zprávu'][i] : label}</span></li>)}</ol></>}
    {step === 4 && <p>{parent ? 'S každou zpětnou vazbou se vám přístup obnoví. Když se dva dny neozvete, zeptáme se vás na jednu otázku.' : 'S každou zpětnou vazbou se ti přístup obnoví. Když se dva dny neozveš, zeptáme se tě na jednu otázku.'} Nic se neztratí. V betě nic neplatíš.</p>}
    {step === 5 && <p>Po vyzkoušení hlavních funkcí přijde krátký závěrečný dotazník. Upřímné odpovědi nám pomůžou rozhodnout, co zlepšit. Recenze je samostatná a nepovinná.</p>}
    <div className="ss-dialog-actions">{step > 0 && <ObButton variant="secondary" onClick={() => setStep(step - 1)}>Zpět</ObButton>}
      <ObButton disabled={busy} onClick={() => step < 5 ? setStep(step + 1) : onDone()}>{step === 5 ? 'Začít testovat' : 'Pokračovat'}</ObButton>
    </div>
  </div>;
}
