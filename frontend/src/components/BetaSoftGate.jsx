import { useState } from 'react';
import { submitBetaGate } from '../api';
import { useAuth } from './AuthContext';
import { useBetaTools } from './BetaToolsContext';
import { genderedCopy, useGender } from '../lib/gender';

export default function BetaSoftGate() {
  const { refreshProfile }=useAuth(),{ beta,refreshBeta }=useBetaTools();
  const gender = useGender();
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const parent=['rodic','ucitel'].includes(beta?.role);
  const questions=parent ? ['Co Vás za poslední dny nejvíc štvalo nebo bavilo?','Co by Vám výběr školy usnadnilo?','Kde jste si při používání nebyli jistí?'] : ['Co tě za poslední dny nejvíc štvalo nebo bavilo?','Co by ti výběr školy usnadnilo?','Kde sis při používání nebyl(a) jistý/á?'];
  const send=async(e)=>{e.preventDefault();setBusy(true);setError('');try{await submitBetaGate(message);setMessage('');await refreshBeta();await refreshProfile();}catch(err){setError(err.message);}finally{setBusy(false);}};
  return <form className="beta-soft-gate" onSubmit={send}>
    <h2 className="ss-headline-md">{parent ? questions[(beta?.feedback?.length || 0)%questions.length] : genderedCopy(questions[(beta?.feedback?.length || 0)%questions.length], gender)}</h2>
    <p>{parent?'Stačí jedna upřímná věta. Pak můžete zase pokračovat.':'Stačí jedna upřímná věta. Pak můžeš zase pokračovat.'}</p>
    <label className="ss-field-label">Odpověď<textarea className="ss-input" value={message} onChange={(e)=>setMessage(e.target.value)} minLength={20} maxLength={4000} required /></label>
    <p className="ss-body-sm">Alespoň 20 znaků. Bez osobních údajů.</p>{error&&<p role="alert">{error}</p>}
    <button className="ss-btn ss-btn-primary" disabled={busy || message.trim().length<20}>{busy?'Ukládáme…':'Odeslat a pokračovat'}</button>
  </form>;
}
