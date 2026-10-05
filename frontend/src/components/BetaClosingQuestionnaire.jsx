import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitBetaClosing } from '../api';
import { palettes, PALETTE_IDS } from '../design/tokens';
import { ObButton } from './onboarding/ObKit';

const THEMES={znacka:'Značka',smrk:'Smrk',zvyraznovac:'Zvýrazňovač',terakota:'Terakota'};
function Choice({label,value,options,onChange,multiple=false}) {
  return <fieldset className="beta-closing-field"><legend>{label}</legend><div className="beta-closing-options">{options.map(([id,text])=><label key={id} className="beta-role-option"><input type={multiple?'checkbox':'radio'} name={label} checked={multiple?value.includes(id):value===id} onChange={()=>onChange(multiple?(value.includes(id)?value.filter(v=>v!==id):[...value,id]):id)} /><span>{text}</span></label>)}</div></fieldset>;
}
function Rating({label,value,max=5,min=1,onChange}) {return <fieldset className="beta-closing-field"><legend>{label}</legend><div className="beta-kind-chips">{Array.from({length:max-min+1},(_,i)=>i+min).map(n=><button key={n} type="button" className="ss-btn ss-btn-secondary" aria-pressed={value===n} onClick={()=>onChange(n)}>{n}</button>)}</div><p className="ss-caption">{min} = nejméně · {max} = nejvíce</p></fieldset>;}
function Text({label,value,onChange}) {return <label className="ss-field-label">{label}<textarea className="ss-input" maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} /></label>;}
export default function BetaClosingQuestionnaire({role,onDone}) {
  const parent=['rodic','ucitel'].includes(role),[step,setStep]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [a,setA]=useState({selected:'',prior:[],nps:null,help:null,useful:[],missing:'',pay:'',prices:{tooCheap:'',good:'',expensive:'',tooExpensive:''},payer:'',plan:'',theme:'',future:'',change:'',ratings:{search:null,detail:null,questionnaire:null,compare:null}});
  const [review,setReview]=useState({stars:null,body:'',consent_publish:false});
  const set=(key,value)=>setA(prev=>({...prev,[key]:value}));
  const valid=[Boolean(a.selected),a.nps!==null&&a.help!==null,Boolean(a.pay&&a.payer&&a.plan)&&Object.values(a.prices).every(v=>v!==''&&Number(v)>=0&&Number(v)<=100000),Boolean(a.theme)&&Object.values(a.ratings).every(v=>v!==null),true][step];
  const submit=async(withReview)=>{setBusy(true);setError('');try{await submitBetaClosing({answers:{...a,prices:Object.fromEntries(Object.entries(a.prices).map(([k,v])=>[k,Number(v)]))},review:withReview?review:null});onDone();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div className="beta-closing">
    <p className="ss-eyebrow">{step+1} / 5 · {[parent?'O Vás':'O tobě','Hodnota','Placení','Vzhled a budoucnost','Nepovinná recenze'][step]}</p>
    <p className="beta-closing-honest">{parent?'Odpovídejte upřímně':'Odpovídej upřímně'} — nic neodsuzujeme, špatná zpráva nám pomůže víc než pochvala.</p>
    {step===0 && <>
      <p>Role: {({'8':'8. třída','9':'9. třída',rodic:'Rodič',ucitel:'Učitel',jine:'Jiné'})[role]}</p>
      <Choice label={parent?'Máte už školu vybranou?':'Máš už školu vybranou?'} value={a.selected} options={['ano','ne','zatim_ne'].map((v,i)=>[v,['Ano','Ne','Ještě ne'][i]])} onChange={v=>set('selected',v)} />
      <Choice label={parent?'Jak jste školy hledali dřív?':'Jak jsi školy hledal(a) dřív?'} value={a.prior} multiple options={['atlas','weby','chatgpt','kamaradi','rodice','jinak'].map((v,i)=>[v,['Atlas školství','Weby škol','ChatGPT','Kamarádi','Rodiče','Jinak'][i]])} onChange={v=>set('prior',v)} />
    </>}
    {step===1 && <>
      <Rating label={parent?'Doporučili byste Střední na míru dál?':'Doporučil(a) bys Střední na míru dál?'} value={a.nps} min={0} max={10} onChange={v=>set('nps',v)} />
      <Rating label={parent?'Pomohlo Vám to vybrat?':'Pomohlo ti to vybrat?'} value={a.help} onChange={v=>set('help',v)} />
      <Choice label="Nejužitečnější funkce" multiple value={a.useful} options={['dotaznik','vyhledavani','detail','porovnani','matice','prihlaska','sdileni'].map((v,i)=>[v,['Dotazník','Vyhledávání','Detail školy','Porovnání','Matice','Přihláška','Sdílení'][i]])} onChange={v=>set('useful',v)} />
      <Text label="Co chybělo? (nepovinné)" value={a.missing} onChange={v=>set('missing',v)} />
    </>}
    {step===2 && <>
      <Choice label={parent?'Zaplatili byste za přístup?':'Zaplatil(a) bys za přístup?'} value={a.pay} options={['ano','mozna','ne'].map((v,i)=>[v,['Ano','Možná','Ne'][i]])} onChange={v=>set('pay',v)} />
      <p>Jakou cenu by měl mít sezónní přístup? Částky v Kč.</p>
      {['tooCheap','good','expensive','tooExpensive'].map((key,i)=><label key={key} className="ss-field-label">{['Příliš levné — pochybnosti o kvalitě','Výhodné','Drahé, ale ještě přijatelné','Příliš drahé'][i]}<input className="ss-input" type="number" min="0" max="100000" value={a.prices[key]} onChange={e=>set('prices',{...a.prices,[key]:e.target.value})} /></label>)}
      <Choice label="Kdo by platil?" value={a.payer} options={['ja','rodic','spolu'].map((v,i)=>[v,['Já','Rodič','Spolu'][i]])} onChange={v=>set('payer',v)} />
      <Choice label="Jaký přístup?" value={a.plan} options={[["mesic","Měsíční"],["sezona","Sezónní"]]} onChange={v=>set('plan',v)} />
    </>}
    {step===3 && <>
      <fieldset className="beta-closing-field"><legend>Oblíbené barevné téma</legend><div className="beta-theme-previews">{PALETTE_IDS.map(id=>{const t=palettes[id].light;return <label key={id} className="beta-theme-preview" style={{background:t.bg,color:t.ink,borderColor:a.theme===id?t.accent:t.line}}><input type="radio" name="theme" checked={a.theme===id} onChange={()=>set('theme',id)} /><span>{THEMES[id]}</span><span style={{background:t.surface2,color:t.ink2}} className="beta-theme-mini">Gymnázium · Praha<span style={{background:t.accent,color:t.accentInk}}>Zobrazit školu</span></span></label>;})}</div></fieldset>
      <Text label="Co přidat? (nepovinné)" value={a.future} onChange={v=>set('future',v)} /><Text label="Jedna věc ke změně hned (nepovinné)" value={a.change} onChange={v=>set('change',v)} />
      {['search','detail','questionnaire','compare'].map((key,i)=><Rating key={key} label={['Vyhledávání','Detail školy','Dotazník','Porovnání'][i]} value={a.ratings[key]} onChange={v=>set('ratings',{...a.ratings,[key]:v})} />)}
    </>}
    {step===4 && <>
      <p>Recenze je nepovinná. Nezveřejní se automaticky; každou nejdřív projdeme.</p>
      <Rating label="Hvězdy" value={review.stars} onChange={v=>setReview({...review,stars:v})} />
      <Text label="Recenze (alespoň 10 znaků)" value={review.body} onChange={v=>setReview({...review,body:v})} />
      <label className="beta-notice-check"><input type="checkbox" checked={review.consent_publish} onChange={e=>setReview({...review,consent_publish:e.target.checked})} /><span>Smíme recenzi anonymně použít na webu?</span></label>
      <p className="ss-body-sm"><Star size={16} aria-hidden="true" /> Podpis: {({'8':'Student, 8. třída','9':'Student, 9. třída',rodic:'Rodič',ucitel:'Učitel',jine:'Beta tester'})[role]} · beta tester, přístup zdarma</p>
    </>}
    {error&&<p role="alert">{error}</p>}
    <div className="beta-closing-actions">{step>0&&<ObButton variant="secondary" disabled={busy} onClick={()=>setStep(step-1)}>Zpět</ObButton>}
      {step<4?<ObButton disabled={!valid} onClick={()=>setStep(step+1)}>Pokračovat</ObButton>:<><ObButton variant="secondary" disabled={busy} onClick={()=>submit(false)}>Dokončit bez recenze</ObButton><ObButton disabled={busy || !review.stars || review.body.trim().length<10} onClick={()=>submit(true)}>{busy?'Ukládáme…':'Dokončit s recenzí'}</ObButton></>}
    </div>
  </div>;
}
