import {useEffect,useState} from 'react';
import {useSearchParams,Link} from 'react-router-dom';
import {ShieldCheck,Download,RefreshCw,ArrowUpRight,X,Mail,MessageSquare} from 'lucide-react';
import {useAuth} from '../components/AuthContext';
import Modal from '../components/Modal';
import {fetchAdminReport,fetchAdminFeedback,updateAdminFeedback,selectAdminReview,fetchTesterEmail,downloadAdminCsv} from '../api';
import './Admin.css';

const TABS=[['overview','Přehled'],['feedback','Zpětná vazba'],['behaviour','Chování'],['funnels','Trychtýře'],['matching','Matching'],['closing','Závěrečný dotazník'],['reviews','Recenze'],['testers','Testeři'],['ai-costs','AI náklady']];
const STATUS={nove:'Nové',precteno:'Přečtené',vyreseno:'Vyřešené',neudelame:'Neuděláme'};
const SOURCE={button:'Tlačítko',micro:'Krátká otázka',gate:'Obnovení přístupu'};
const fmt=value=>value==null?'—':typeof value==='number'?new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:value>0&&value<0.01?6:2}).format(value):typeof value==='boolean'?value?'Ano':'Ne':String(value);
function Chart({section,compact=false}){
 const {rows,kind}=section;
 if(!rows.length||kind==='table')return null;
 if(['bar','funnel'].includes(kind)){
  const max=Math.max(1,...rows.map(r=>Number(r.value)||0));
  return <div className="admin-bars" aria-label={section.title}>{(kind==='funnel'?rows:rows.slice(0,12)).map((r,i)=><div className="admin-bar" key={i}><span>{r.label}</span><svg viewBox="0 0 260 16" role="img" aria-label={`${r.label}: ${fmt(r.value)}`}><rect width="260" height="16" rx="4" fill="var(--track)"/><rect width={260*(Number(r.value)||0)/max} height="16" rx="4" fill="var(--acc)"/></svg><b>{fmt(r.value)}{r.drop!=null&&<small> −{fmt(r.drop)} %</small>}</b></div>)}</div>;
 }
 const scatter=kind==='scatter',price=kind==='prices',points=scatter?rows.filter(r=>r.mean!=null):rows;
 if(!points.length)return <p className="ss-caption">Zatím nejsou uložená pořadí testerů.</p>;
 const W=600,H=compact?70:220,pad=compact?3:30;
 const xmax=Math.max(1,...points.map((r,i)=>scatter?r.known_features:price?r.price:i));
 const ymax=price?100:Math.max(1,...points.map(r=>scatter?r.mean:Number(r.value)||0));
 const x=(r,i)=>pad+(scatter?r.known_features:price?r.price:i)/xmax*(W-2*pad);
 const y=v=>H-pad-Number(v)/ymax*(H-2*pad);
 const series=price?['tooCheap','good','expensive','tooExpensive']:['value'];
 return <div className={'admin-plot '+(compact?'admin-spark':'')}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={section.title}>
  {!compact&&<><path d={`M${pad} ${pad}V${H-pad}H${W-pad}`} fill="none" stroke="var(--line2)"/><text x={pad} y="15" fill="var(--ink3)" fontSize="11">{scatter?'Průměrné pořadí (nižší je lepší)':price?'Podíl odpovědí (%)':'Počet / náklad'}</text></>}
  {scatter?points.map((r,i)=><circle key={r.id} cx={x(r,i)} cy={y(r.mean)} r={Math.abs(r.delta||0)>=20?5:3} fill={Math.abs(r.delta||0)>=20?'var(--danger)':'var(--acc)'} opacity="0.8"><title>{r.school}: pořadí {fmt(r.mean)}, rozdíl {fmt(r.delta)}</title></circle>):series.map((key,i)=><polyline key={key} points={points.map((r,j)=>`${x(r,j)},${y(r[key])}`).join(' ')} fill="none" stroke={['var(--acc)','var(--ink)','var(--ink2)','var(--danger)'][i]} strokeDasharray={i%2?'5 4':undefined} strokeWidth={compact?3:2}/>)}
  {!compact&&<text x={W-pad} y={H-3} textAnchor="end" fill="var(--ink3)" fontSize="11">{scatter?'Počet známých údajů (0–6)':price?'Cena (Kč)':'Čas →'}</text>}
 </svg>{price&&<div className="admin-legend">{['Příliš levné','Výhodné','Drahé','Příliš drahé'].map((s,i)=><span key={s}><i style={{background:['var(--acc)','var(--ink)','var(--ink2)','var(--danger)'][i]}}/>{s}</span>)}</div>}</div>;
}
function FeedbackDetail({id,onClose,onSaved}){
 const [detail,setDetail]=useState(null),[form,setForm]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;fetchAdminFeedback(id).then(d=>{if(live){setDetail(d);setForm({status:d.status,admin_note:d.admin_note||'',admin_reply:d.admin_reply||''});}}).catch(e=>live&&setError(e.message));return()=>{live=false;};},[id]);
 const save=async()=>{setBusy(true);setError('');try{await updateAdminFeedback(id,form);onSaved();onClose();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const rect=detail?.rect,viewport=detail?.viewport;
 const marked=rect&&viewport?.width&&viewport?.height?{left:100*rect.x/viewport.width+'%',top:100*rect.y/viewport.height+'%',width:100*rect.width/viewport.width+'%',height:100*rect.height/viewport.height+'%'}:null;
 return <Modal open title={'Zpětná vazba #'+id} onDismiss={onClose} busy={busy} className="admin-drawer">
  <button className="admin-close" aria-label="Zavřít detail" onClick={onClose} disabled={busy}><X size={20}/></button>
  {error&&<p role="alert" className="admin-error">{error}</p>}{!detail?<p role="status">Načítání zprávy…</p>:<>
  <p className="ss-caption">{detail.tester} · {detail.page}</p><p className="admin-message">{detail.message}</p>
  {detail.screenshot_url&&<div className="admin-screenshot"><img src={detail.screenshot_url} alt="Snímek stránky od testera"/>{marked&&<span style={marked} aria-label="Označené místo"/>}</div>}
  {detail.selector&&<p className="ss-caption">Místo: <code>{detail.selector}</code></p>}
  {detail.element_text&&<p className="ss-body-sm">{detail.element_text}</p>}
  {detail.text_before!=null&&<div className="admin-text-edit"><div><b>Původní text</b><p>{detail.text_before}</p></div><ArrowUpRight size={18}/><div><b>Navržený text</b><p>{detail.text_after}</p></div></div>}
  <label className="ss-field-label">Stav<select className="ss-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label className="ss-field-label">Soukromá poznámka<textarea data-private className="ss-input" rows={3} maxLength={4000} value={form.admin_note} onChange={e=>setForm({...form,admin_note:e.target.value})}/></label>
  <label className="ss-field-label">Odpověď testerovi<textarea data-private className="ss-input" rows={4} maxLength={4000} value={form.admin_reply} onChange={e=>setForm({...form,admin_reply:e.target.value})}/></label>
  <p className="ss-caption">Odpověď se testerovi zobrazí u jeho zprávy. Poznámka zůstává soukromá.</p><button className="ss-btn ss-btn-primary" onClick={save} disabled={busy}>{busy?'Ukládání…':'Uložit změny'}</button>
  </>}
 </Modal>;
}
function AdminTable({section,tab,onInspect,onReload,onError}){
 const [filters,setFilters]=useState({}),[emails,setEmails]=useState({}),[pending,setPending]=useState(null);
 const filterKeys=tab==='feedback'?['kind','page','school','role','status','source']:[];
 const labels={kind:'Typ',page:'Stránka',school:'Škola',role:'Role',status:'Stav',source:'Zdroj'};
 const rows=section.rows.filter(r=>filterKeys.every(k=>!filters[k]||r[k]===filters[k]));
 const email=async id=>{setPending(id);try{const d=await fetchTesterEmail(id);setEmails(old=>({...old,[id]:d.email||'E-mail není dostupný'}));}catch(e){onError(e.message);}finally{setPending(null);}};
 const select=async r=>{setPending(r.id);try{await selectAdminReview(r.id,!r.selected_by_admin);onReload();}catch(e){onError(e.message);}finally{setPending(null);}};
 return <>
  {!!filterKeys.length&&<div className="admin-filters">{filterKeys.map(k=><label key={k} className="ss-field-label">{labels[k]}<select className="ss-input" value={filters[k]||''} onChange={e=>setFilters({...filters,[k]:e.target.value})}><option value="">Vše</option>{[...new Set(section.rows.map(r=>r[k]).filter(Boolean))].sort().map(v=><option key={v} value={v}>{STATUS[v]||SOURCE[v]||v}</option>)}</select></label>)}</div>}
  <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={section.title}><table><thead><tr>{section.columns.map(c=><th key={c.key} scope="col">{c.label}</th>)}{['feedback','reviews','testers'].includes(tab)&&<th scope="col">Akce</th>}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id||i} className={tab==='matching'&&Math.abs(row.delta||0)>=20?'admin-deviation':''}>
  {section.columns.map(c=><td key={c.key}>{c.key==='status'?<span className={'admin-status admin-status-'+row.status}>{STATUS[row.status]||row.status}</span>:c.key==='source'?SOURCE[row.source]||row.source:c.key==='created_at'||c.key.endsWith('_until')||c.key==='last_activity'?row[c.key]?new Date(row[c.key]).toLocaleString('cs-CZ'):'—':fmt(row[c.key])}</td>)}
  {tab==='feedback'&&<td><button className="admin-link" onClick={()=>onInspect(row.id)}>Otevřít <ArrowUpRight size={14}/></button></td>}
  {tab==='reviews'&&<td><label className="admin-check"><input type="checkbox" checked={!!row.selected_by_admin} disabled={pending===row.id||!row.consent_publish} onChange={()=>select(row)}/>Vybrat pro web</label></td>}
  {tab==='testers'&&<td data-private>{emails[row.id]||<button className="admin-link" disabled={pending===row.id} onClick={()=>email(row.id)}><Mail size={14}/>Zobrazit e-mail</button>}</td>}
  </tr>)}</tbody></table></div>{!rows.length&&<p className="admin-empty">Zatím žádné záznamy{Object.values(filters).some(Boolean)?' pro tento filtr':''}.</p>}
 </>;
}
export default function Admin(){
 const {loading,isSignedIn,user}=useAuth();const [params,setParams]=useSearchParams();
 const tab=TABS.some(([id])=>id===params.get('tab'))?params.get('tab'):'overview';
 const [report,setReport]=useState(null),[error,setError]=useState(''),[status,setStatus]=useState(null),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[detail,setDetail]=useState(null);
 useEffect(()=>{if(loading||!isSignedIn)return;let live=true;setBusy(true);setError('');setReport(null);fetchAdminReport(tab).then(d=>{if(live){setReport(d);setStatus(200);}}).catch(e=>{if(live){setError(e.message);setStatus(e.status);}}).finally(()=>live&&setBusy(false));return()=>{live=false;};},[tab,refresh,loading,isSignedIn,user?.id]);
 const reload=()=>setRefresh(n=>n+1);
 const download=async s=>{try{await downloadAdminCsv(tab+'--'+s.id);}catch(e){setError(e.message);}};
 if(loading)return <section className="admin"><p role="status">Ověřování přihlášení…</p></section>;
 if(!isSignedIn||status===401)return <section className="admin admin-denied"><ShieldCheck size={36}/><h1 className="ss-headline-lg">Přihlášení správce</h1><p>Pro přístup k přehledům se přihlaste.</p><Link className="ss-btn ss-btn-primary" to="/prihlaseni">Přihlásit se</Link></section>;
 if(status===403)return <section className="admin admin-denied"><ShieldCheck size={36}/><p className="ss-caption">403 · Přístup odepřen</p><h1 className="ss-headline-lg">Jen pro správce</h1><p>Tento účet nemá oprávnění zobrazit beta přehledy.</p><Link className="ss-btn ss-btn-secondary" to="/skoly">Zpět do aplikace</Link></section>;
 const spark=report?.sections.find(s=>s.id==='activity');
 return <section className="admin">
  <header className="admin-header"><div><p className="admin-kicker"><ShieldCheck size={16}/>Beta program</p><h1 className="ss-headline-lg">Jak si vede testování</h1><p className="ss-body-sm">Zkušenosti testerů, používání aplikace a kvalita doporučení.</p></div><button className="ss-btn ss-btn-secondary" disabled={busy} onClick={reload}><RefreshCw size={16}/>Obnovit</button></header>
  <nav className="admin-tabs" aria-label="Beta přehledy">{TABS.map(([id,label])=><button key={id} aria-current={id===tab?'page':undefined} onClick={()=>setParams({tab:id})}>{label}</button>)}</nav>
  {error&&<p className="admin-error" role="alert">{error}</p>}
  {busy&&<div className="admin-loading" role="status">Načítání přehledu…</div>}
  {report&&<><div className="admin-stats">{report.cards.map((c,i)=><article key={c.label} className="admin-stat"><p>{c.label}</p><strong>{fmt(c.value)} <small>{c.unit}</small></strong>{spark&&i===2&&<Chart section={spark} compact/>}</article>)}</div>
  {tab==='matching'&&<div className="admin-note"><p>Simulace: <b>{report.simulation?.file||'Soubor zatím není dostupný'}</b>{report.simulation?.n&&` · ${fmt(report.simulation.n)} profilů`}. Každý typ dotazníku se porovnává samostatně.</p><p>Rozdíl alespoň 20 míst je zvýrazněný. Průměr krátké otázky je společný pro oba zdroje; nevytváříme rozdělení, které odpovědi neobsahují. Podíly a rozptyl vycházejí z úplných pořadí, ve kterých byla škola zařazena.</p></div>}
  {tab==='reviews'&&<p className="admin-note">Výběr je interní. Recenze se automaticky nezveřejňuje; vybrat lze jen recenzi se souhlasem.</p>}
  {tab==='closing'&&<p className="admin-note">Cenové křivky používají odpovědi s postupně rostoucími částkami. Ostatní odpovědi zůstávají uložené. Přijatelný interval ukazuje průsečíky „příliš levné / drahé“ a „výhodné / příliš drahé“; při malém počtu testerů je orientační.</p>}
  <div className="admin-sections">{report.sections.map(s=><section key={tab+s.id} className={'admin-panel admin-panel-'+s.kind}><header><h2 className="ss-headline-md">{s.title}</h2><button className="admin-link" onClick={()=>download(s)} aria-label={'Stáhnout CSV: '+s.title}><Download size={15}/>CSV</button></header><Chart section={s}/><AdminTable key={tab+s.id} section={s} tab={tab} onInspect={setDetail} onReload={reload} onError={setError}/></section>)}</div>
  <p className="ss-caption admin-updated">Aktualizováno {new Date(report.generated_at).toLocaleString('cs-CZ')} · Přehled používá nejvýše 30 sekund stará data.</p></>}
  {!busy&&!report&&!error&&<p><MessageSquare size={20}/>Přehled se připravuje.</p>}
  {detail!=null&&<FeedbackDetail key={detail} id={detail} onClose={()=>setDetail(null)} onSaved={reload}/>}
 </section>;
}
