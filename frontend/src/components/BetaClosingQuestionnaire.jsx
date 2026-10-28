import { useRef, useState } from 'react';
import { useScrollTopOnStep } from '../lib/scrollTop';
import { useDraft } from '../lib/useDraft';
import { Star } from 'lucide-react';
import { submitBetaClosing } from '../api';
import { submitBetaReview } from '../lib/betaReviewApi';
import { palettes, PALETTE_IDS } from '../design/tokens';
import { ObButton } from './onboarding/ObKit';
import { genderedCopy, useGender } from '../lib/gender';

const THEMES={znacka:'Modrá',zvyraznovac:'Žlutá',smrk:'Zelená',terakota:'Oranžová'};
function Choice({label,value,options,onChange,multiple=false,max=Infinity}) {
  return <fieldset className="beta-closing-field"><legend>{label}</legend><div className="beta-closing-options">{options.map(([id,text])=><label key={id} className="beta-role-option"><input type={multiple?'checkbox':'radio'} name={label} checked={multiple?value.includes(id):value===id} disabled={multiple&&!value.includes(id)&&value.length>=max} onChange={()=>onChange(multiple?(value.includes(id)?value.filter(v=>v!==id):[...value,id]):id)} /><span>{text}</span></label>)}</div></fieldset>;
}
function Rating({label,value,max=5,min=1,onChange}) {return <fieldset className="beta-closing-field"><legend>{label}</legend><div className="beta-kind-chips">{Array.from({length:max-min+1},(_,i)=>i+min).map(n=><button key={n} type="button" className="ss-btn ss-btn-secondary" aria-pressed={value===n} onClick={()=>onChange(n)}>{n}</button>)}</div><p className="ss-caption">{min} = nejméně · {max} = nejvíce</p></fieldset>;}
function Text({label,value,onChange}) {return <label className="ss-field-label">{label}<textarea className="ss-input" maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} /></label>;}
function ReviewFields({role,parent,review,setReview}) {
  const label=({'8':'Student, 8. třída','9':'Student, 9. třída',rodic:'Rodič',ucitel:'Učitel',jine:'Beta tester'})[role];
  const consentCopy=parent
    ? `Souhlasíte, že Střední na míru smí Vaši recenzi (hvězdičky a text, případně zkrácený bez změny smyslu) bezplatně zveřejnit na svém webu, v aplikaci a na sociálních sítích — bez Vašeho jména, jen s podpisem „${label} · beta tester, přístup zdarma“. Souhlas můžete kdykoli odvolat e-mailem na info@stredninamiru.cz a recenzi pak stáhneme. Moc nám to pomůže.`
    : `Souhlasíš, že Střední na míru smí tvoji recenzi (hvězdičky a text, případně zkrácený bez změny smyslu) bezplatně zveřejnit na svém webu, v aplikaci a na sociálních sítích — bez tvého jména, jen s podpisem „${label} · beta tester, přístup zdarma“. Souhlas můžeš kdykoli odvolat e-mailem na info@stredninamiru.cz a recenzi pak stáhneme. Moc nám to pomůže.`;
  return <>
    <p>Recenze je nepovinná. Nezveřejní se automaticky; každou nejdřív projdeme.</p>
    <Rating label="Hvězdy" value={review.stars} onChange={v=>setReview({...review,stars:v})} />
    <Text label="Recenze (alespoň 10 znaků)" value={review.body} onChange={v=>setReview({...review,body:v})} />
    <label className="beta-notice-check"><input type="checkbox" checked={review.consent_publish} onChange={e=>setReview({...review,consent_publish:e.target.checked})} /><span>{consentCopy}</span></label>
    <p className="ss-body-sm"><Star size={16} aria-hidden="true" /> Podpis: {label} · beta tester, přístup zdarma</p>
  </>;
}
export default function BetaClosingQuestionnaire({role,onDone,onCancel,reviewOnly=false,onBusyChange}) {
  const rootRef=useRef(null);
  const gender=useGender();
  const parent=['rodic','ucitel'].includes(role),[step,setStep,clearStep]=useDraft('snm.draft.beta.closing.step',0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const voice=(student,adult)=>parent?adult:genderedCopy(student,gender);
  const [a,setA,clearA]=useDraft('snm.draft.beta.closing.answers',{selected:'',prior:[],nps:null,help:null,useful:[],missing:'',pay:'',prices:{tooCheap:'',good:'',expensive:'',tooExpensive:''},payer:'',plan:'',theme:'',future:'',change:'',ratings:{search:null,detail:null,questionnaire:null,compare:null}});
  const [review,setReview,clearReview]=useDraft('snm.draft.beta.closing.review',{stars:null,body:'',consent_publish:false});
  useScrollTopOnStep(rootRef,step);
  const set=(key,value)=>setA(prev=>({...prev,[key]:value}));
  const valid=[Boolean(a.selected),a.nps!==null&&a.help!==null&&a.useful.length<=2,Boolean(a.pay&&a.payer&&a.plan)&&Object.values(a.prices).every(v=>v!==''&&Number(v)>=0&&Number(v)<=100000),Boolean(a.theme)&&Object.values(a.ratings).every(v=>v!==null),true][step];
  const submit=async(withReview)=>{setBusy(true);onBusyChange?.(true);setError('');try{if(reviewOnly){await submitBetaReview(review);clearReview();onDone();}else{await submitBetaClosing({answers:{...a,prices:Object.fromEntries(Object.entries(a.prices).map(([k,v])=>[k,Number(v)]))},review:withReview?review:null});clearStep();clearA();clearReview();onDone();}}catch(e){setError(e.message);}finally{setBusy(false);onBusyChange?.(false);}};
  if (reviewOnly) return <div className="beta-closing">
    <p className="ss-eyebrow">Nepovinná recenze webu</p>
    <p className="beta-closing-honest">{parent?'Odpovídejte upřímně — zveřejnění je nepovinné a rozhodnete o něm zvlášť.':'Odpovídej upřímně — zveřejnění je nepovinné a rozhodneš o něm zvlášť.'}</p>
    <ReviewFields role={role} parent={parent} review={review} setReview={setReview} />
    {error&&<p role="alert">{error}</p>}
    <div className="beta-closing-actions"><ObButton variant="secondary" disabled={busy} onClick={onCancel}>Zpět ke zpětné vazbě</ObButton><ObButton disabled={busy || !review.stars || review.body.trim().length<10} onClick={()=>submit(true)}>{busy?'Ukládáme…':'Odeslat recenzi'}</ObButton></div>
  </div>;
  return <div className="beta-closing" ref={rootRef}>
    <p className="ss-eyebrow">{step+1} / 5 · {[parent?'O Vás':'O tobě','Hodnota','Placení','Vzhled a budoucnost','Nepovinná recenze'][step]}</p>
    <p className="beta-closing-honest">{parent?'Odpovídejte upřímně':'Odpovídej upřímně'} — nic neodsuzujeme, špatná zpráva nám pomůže víc než pochvala.</p>
    <p className="ss-body-sm beta-closing-reassure">{parent?'Závěrečným dotazníkem testování nekončí. Web můžete dál používat do konce bety, pokud nám aspoň jednou za 48 hodin pošlete zpětnou vazbu.':'Závěrečným dotazníkem testování nekončí. Web můžeš dál používat do konce bety, pokud nám aspoň jednou za 48 hodin pošleš zpětnou vazbu.'}</p>
    {step===0 && <>
      <p>Role: {({'8':'8. třída','9':'9. třída',rodic:'Rodič',ucitel:'Učitel',jine:'Jiné'})[role]}</p>
      <Choice label={parent?'Máte už školu vybranou?':'Máš už školu vybranou?'} value={a.selected} options={['ano','pul','zatim_ne'].map((v,i)=>[v,['Ano, definitivně','Tak z půlky','Zatím vůbec'][i]])} onChange={v=>set('selected',v)} />
      <Choice label={voice('Jak jsi školy hledal(a) dřív?','Jak jste školy hledali dřív?')} value={a.prior} multiple options={['atlas','weby','chatgpt','kamaradi','rodice','jinak'].map((v,i)=>[v,['Atlas školství','Weby škol','ChatGPT','Kamarádi','Rodiče','Jinak'][i]])} onChange={v=>set('prior',v)} />
    </>}
    {step===1 && <>
      <Rating label={voice('Doporučil(a) bys Střední na míru dál?','Doporučili byste Střední na míru dál?')} value={a.nps} min={0} max={10} onChange={v=>set('nps',v)} />
      <Rating label={parent?'Pomohlo Vám to vybrat školu?':'Pomohlo ti to vybrat školu?'} value={a.help} onChange={v=>set('help',v)} />
      <Choice label={parent?'Nejužitečnější funkce (vyberte nejvýš 2)':'Nejužitečnější funkce (vyber nejvýš 2)'} multiple max={2} value={a.useful} options={['dotaznik','vyhledavani','detail','porovnani','matice','prihlaska'].map((v,i)=>[v,['Dotazník','Vyhledávání','Detail školy','Porovnání','Matice','Přihláška'][i]])} onChange={v=>set('useful',v)} />
      <Text label="Co chybělo? (nepovinné)" value={a.missing} onChange={v=>set('missing',v)} />
    </>}
    {step===2 && <>
      <Choice label={voice('Zaplatil(a) bys za přístup?','Zaplatili byste za přístup?')} value={a.pay} options={['ano','mozna','ne'].map((v,i)=>[v,['Ano','Možná','Ne'][i]])} onChange={v=>set('pay',v)} />
      <p>Jakou cenu by měl mít sezónní přístup (jednorázová platba, přístup až do 30. června 2027)?</p>
      {['tooCheap','good','expensive','tooExpensive'].map((key,i)=><label key={key} className="ss-field-label">{['Příliš levné — pochybnosti o kvalitě','Výhodné','Drahé, ale ještě přijatelné','Příliš drahé'][i]}<span className="beta-price-input"><input className="ss-input" type="number" inputMode="numeric" min="0" max="100000" value={a.prices[key]} onChange={e=>set('prices',{...a.prices,[key]:e.target.value})} /><span aria-hidden="true">Kč</span></span></label>)}
       <Choice label={parent?'Kdo by pravděpodobně platil?':'Kdo by pravděpodobně platil?'} value={a.payer} options={['ja','rodic','spolu'].map((v,i)=>[v,['Já','Rodič','Spolu'][i]])} onChange={v=>set('payer',v)} />
       <Choice label={voice('Jaký přístup by sis spíš koupil(a)?','Jaký přístup byste si spíš koupili?')} value={a.plan} options={[["mesic","Měsíční"],["sezona","Sezónní"]]} onChange={v=>set('plan',v)} />
    </>}
    {step===3 && <>
      <fieldset className="beta-closing-field"><legend>Oblíbené barevné téma</legend><div className="beta-theme-previews">{PALETTE_IDS.map(id=>{const t=palettes[id].light;return <label key={id} className="beta-theme-preview" style={{background:t.bg,color:t.ink,borderColor:a.theme===id?t.accent:t.line}}><input type="radio" name="theme" checked={a.theme===id} onChange={()=>set('theme',id)} /><span>{THEMES[id]}</span><span style={{background:t.surface2,color:t.ink2,'--mini-acc':id==='zvyraznovac'?t.matchFill:t.accent,'--mini-ink':id==='zvyraznovac'?t.matchInk:t.accentInk,'--mini-line':t.line}} className="beta-theme-mini" aria-hidden="true"><span className="beta-mini-row"><span className="beta-mini-dot" />Gymnázium · Praha<span className="beta-mini-chip">92 %</span></span><span className="beta-mini-bar"><span /></span><span className="beta-mini-btn">Zobrazit školu</span></span></label>;})}</div></fieldset>
      <Text label="Co přidat? (nepovinné)" value={a.future} onChange={v=>set('future',v)} /><Text label={voice('Jakou jednu věc bys změnil(a)? (nepovinné)','Jakou jednu věc byste změnili? (nepovinné)')} value={a.change} onChange={v=>set('change',v)} />
      <fieldset className="beta-closing-field beta-closing-ratings"><legend>{voice('Jak bys ohodnotil(a) jednotlivé funkce?','Jak byste ohodnotili jednotlivé funkce?')}</legend>
        {['search','detail','questionnaire','compare'].map((key,i)=><Rating key={key} label={['Vyhledávání','Detail školy','Dotazník','Porovnání'][i]} value={a.ratings[key]} onChange={v=>set('ratings',{...a.ratings,[key]:v})} />)}</fieldset>
    </>}
    {step===4 && <>
      <ReviewFields role={role} parent={parent} review={review} setReview={setReview} />
    </>}
    {error&&<p role="alert">{error}</p>}
    <div className="beta-closing-actions">{step>0&&<ObButton variant="secondary" disabled={busy} onClick={()=>setStep(step-1)}>Zpět</ObButton>}
      {step<4?<ObButton disabled={!valid} onClick={()=>setStep(step+1)}>Pokračovat</ObButton>:<><ObButton variant="secondary" disabled={busy} onClick={()=>submit(false)}>Dokončit bez recenze</ObButton><ObButton disabled={busy || !review.stars || review.body.trim().length<10} onClick={()=>submit(true)}>{busy?'Ukládáme…':'Dokončit s recenzí'}</ObButton></>}
    </div>
  </div>;
}
