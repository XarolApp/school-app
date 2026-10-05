import { useEffect, useRef, useState } from 'react';
import { submitBetaMicro } from '../api';
import { nextBetaMicro } from '../lib/betaMicro';
import { betaTracker } from '../lib/betaTrack';

const QUESTIONS = [
  { id:'result', check:'dotaznik', text:'Sedí ti tenhle výsledek?', adult:'Sedí Vám tenhle výsledek?', rating:true },
  { id:'detail', check:'detail', text:'Chybělo ti tu něco?', adult:'Chybělo Vám tu něco?' },
  { id:'compare', check:'porovnani', text:'Pomohlo ti porovnání rozhodnout?', adult:'Pomohlo Vám porovnání rozhodnout?', rating:true },
  { id:'matrix', check:'matice', text:'Dávalo pořadí v matici smysl?', adult:'Dávalo pořadí v matici smysl?', rating:true },
  { id:'paywall', check:'platby', text:'Byla cena jasná?', adult:'Byla cena jasná?', options:['ano','spíš ano','ne'] },
  { id:'theme', check:'tema', text:'Proč tohle téma?', adult:'Proč tohle téma?' },
];
export default function BetaMicroQuestions({ beta, enabled, onRefresh, onRenew }) {
  const [question,setQuestion]=useState(null),[value,setValue]=useState(''),[why,setWhy]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const claiming=useRef(false),alive=useRef(true);
  useEffect(() => { alive.current=true; return () => { alive.current=false; }; },[]);
  useEffect(() => {
    if (!enabled || !beta || question || claiming.current) return;
    const session=betaTracker.getSessionId();
    const candidate=nextBetaMicro(QUESTIONS,beta.micro_asked || {},beta.checklist || {},session);
    if (!candidate) return;
    const next=candidate.question;
    if (candidate.resume) {setQuestion(next);return;}
    claiming.current=true;
    submitBetaMicro({ id:next.id, session_id:session, action:'ask' }).then(() => {
      if (alive.current) setQuestion(next);
      void onRefresh();
    }).catch(() => {}).finally(() => { claiming.current=false; });
  },[enabled,beta,question,onRefresh]);
  const send=async (skip=false) => {
    setBusy(true);setError('');
    try {
      const answer=value.trim()+(question.rating && why.trim() ? ` · ${why.trim()}` : '');
      const result=await submitBetaMicro({ id:question.id,session_id:betaTracker.getSessionId(),action:skip?'skip':'answer',answer });
      setQuestion(null);setValue('');setWhy('');void onRefresh();
      if (!skip) onRenew(result);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  if (!question || !enabled) return null;
  const parent=['rodic','ucitel'].includes(beta.role);
  return <aside className="beta-micro" data-beta-tools aria-label="Krátká otázka k testování">
    <p className="ss-eyebrow">Jedna krátká otázka</p><h2 className="ss-headline-sm">{parent?question.adult:question.text}</h2>
    {question.rating || question.options ? <div className="beta-kind-chips" role="group" aria-label="Odpověď">
      {(question.options || ['1','2','3','4','5']).map((option)=><button type="button" key={option} className="ss-btn ss-btn-secondary" aria-pressed={value===option} onClick={()=>setValue(option)}>{option}</button>)}
    </div> : <label className="ss-field-label">{parent?'Vaše odpověď':'Tvoje odpověď'}<textarea className="ss-input" maxLength={1400} value={value} onChange={(e)=>setValue(e.target.value)} /></label>}
    {question.rating && <label className="ss-field-label">Proč? (nepovinné)<textarea className="ss-input" maxLength={1300} value={why} onChange={(e)=>setWhy(e.target.value)} /></label>}
    {error && <p role="alert">{error}</p>}<div className="beta-micro-actions">
      <button type="button" className="ss-btn ss-btn-secondary" disabled={busy} onClick={()=>send(true)}>Přeskočit</button>
      <button type="button" className="ss-btn ss-btn-primary" disabled={busy || !value.trim()} onClick={()=>send()}>{busy?'Ukládáme…':'Odeslat'}</button>
    </div>
  </aside>;
}
