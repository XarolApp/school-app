const fs=require('node:fs');
const path=require('node:path');
const ROLES={'8':'8. třída','9':'9. třída',rodic:'Rodič',ucitel:'Učitel',jine:'Jiné'};
const KINDS={bug:'Chyba',navrh:'Návrh',funkce:'Nová funkce',text:'Chybný text / údaj',neprehledne:'Nepřehledné',chvala:'Pochvala',obecne:'Obecně'};
const FEATURES={dotaznik:'Dotazník',vyhledavani:'Vyhledávání',detail:'3 detaily škol',porovnani:'Porovnání',matice:'Matice',prihlaska:'Přihláška',tema:'Barevné téma',sdileni:'Sdílení',platby:'Platební obrazovky'};
const avg=rows=>rows.length?rows.reduce((a,b)=>a+b,0)/rows.length:null;
const pct=(n,d)=>d?100*n/d:0;
const col=(key,label)=>({key,label});
const section=(id,title,rows,columns,kind='table')=>({id,title,kind,rows,columns});
const grouped=(rows,key)=>{const map=new Map();for(const row of rows){const label=key(row);if(label==null)continue;map.set(label,(map.get(label)||0)+1);}return [...map].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||String(a.label).localeCompare(String(b.label),'cs'));};
const counts=(id,title,rows,key,kind='bar')=>section(id,title,grouped(rows,key),[col('label','Položka'),col('value','Počet')],kind);
const distinct=rows=>new Set(rows).size;
function latestSimulation(directory=path.join(__dirname,'../reports')){
 try{const names=fs.readdirSync(directory).filter(n=>/^matching-simulation-.*\.json$/.test(n)).sort((a,b)=>fs.statSync(path.join(directory,b)).mtimeMs-fs.statSync(path.join(directory,a)).mtimeMs||b.localeCompare(a));
  if(!names.length)return null;const data=JSON.parse(fs.readFileSync(path.join(directory,names[0]),'utf8'));return {...data,file:names[0]};
 }catch{return null;}
}
async function readAll(db,table,columns,key='id',filter){
 const rows=[];for(let from=0;;from+=1000){let q=db.from(table).select(columns).order(key).range(from,from+999);if(filter)q=filter(q);const r=await q;if(r.error)throw r.error;rows.push(...(r.data||[]));if(!r.data || r.data.length<1000)break;}return rows;
}
async function loadBetaData(db){
 const specs={users:['users','id,created_at,subscription_status,tester_school_code,tester_access_until','id',q=>q.eq('subscription_status','beta')],
  profiles:['beta_profile','*','user_id'],feedback:['beta_feedback','*'],events:['beta_events','id,user_id,anon_id,session_id,name,path,props,created_at'],
  closing:['beta_closing_answers','user_id,answers,created_at','user_id'],reviews:['beta_reviews','*'],usage:['ai_usage_log','*'],rankings:['beta_rankings','*'],
  schools:['schools','id,name,admission_cutoff,school_programs(kkov,rok,zamereni),school_extracted_details(ma_jidelnu,ma_koleje,vyukovy_styl_tagy,krouzky_kategorie,vs_pokracuje_pct,pocet_krouzku)','id',q=>q.is('merged_into',null)]};
 const entries=await Promise.all(Object.entries(specs).map(async([key,args])=>[key,await readAll(db,...args)]));return Object.fromEntries(entries);
}
function csvCell(value){
 let s=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
 if(typeof value!=='number'&&/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function toCsv(table){return '\ufeff'+[table.columns.map(c=>csvCell(c.label)).join(','),...table.rows.map(row=>table.columns.map(c=>csvCell(row[c.key])).join(','))].join('\r\n')+'\r\n';}
function priceCurves(answers){
 const valid=answers.map(a=>a.prices).filter(p=>p&&['tooCheap','good','expensive','tooExpensive'].every(k=>Number.isFinite(p[k]))&&p.tooCheap<=p.good&&p.good<=p.expensive&&p.expensive<=p.tooExpensive);
 const points=[...new Set([0,...valid.flatMap(p=>Object.values(p))])].sort((a,b)=>a-b);
 const rows=points.map(price=>({price,tooCheap:pct(valid.filter(p=>price<=p.tooCheap).length,valid.length),good:pct(valid.filter(p=>price<=p.good).length,valid.length),expensive:pct(valid.filter(p=>price>=p.expensive).length,valid.length),tooExpensive:pct(valid.filter(p=>price>=p.tooExpensive).length,valid.length)}));
 const cross=(a,b)=>{for(let i=1;i<rows.length;i++){const prev=rows[i-1],next=rows[i],x=prev[a]-prev[b],y=next[a]-next[b];if(x>=0&&y<=0)return prev.price+(next.price-prev.price)*(x===y?0:x/(x-y));}return null;};
 return {rows,n:valid.length,low:cross('tooCheap','expensive'),high:cross('good','tooExpensive')};
}
function rankingStats(rankings,schools,simulation,source){
 const samples=rankings.filter(r=>r.source===source),acc=new Map();
 for(const run of samples)run.ranking.forEach((id,i)=>{const a=acc.get(id)||{n:0,sum:0,squares:0,top:0,bottom:0};const rank=i+1;a.n++;a.sum+=rank;a.squares+=rank*rank;if(rank<=10)a.top++;if(rank>run.ranking.length-10)a.bottom++;acc.set(id,a);});
 const simulated=new Map((simulation?.[source]?.schools||[]).map(s=>[s.id,s]));
 return schools.map(s=>{const a=acc.get(s.id),baseline=simulated.get(s.id),rank=a?a.sum/a.n:null;
  const details=Array.isArray(s.school_extracted_details)?s.school_extracted_details[0]:s.school_extracted_details;
  const programs=s.school_programs||[],year=Math.max(0,...programs.map(p=>p.rok||0));
  return {id:s.id,school:s.name,samples:a?.n||0,mean:rank,spread:a?Math.sqrt(Math.max(0,a.squares/a.n-rank*rank)):null,top10:a?pct(a.top,a.n):null,bottom10:a?pct(a.bottom,a.n):null,
    simulated_mean:baseline?.mean_rank??null,simulated_top10:baseline?.top10_pct??null,simulated_bottom10:baseline?.bottom10_pct??null,delta:rank!=null&&baseline?rank-baseline.mean_rank:null,
    cutoff:s.admission_cutoff!=null?'Ano':'Ne',known_features:Object.values(details||{}).filter(v=>v!=null&&(!Array.isArray(v)||v.length)).length,obory:distinct(programs.filter(p=>p.rok===year).map(p=>p.kkov+'|'+(p.zamereni||'')))};
 }).sort((a,b)=>(a.mean??Infinity)-(b.mean??Infinity)||a.school.localeCompare(b.school,'cs'));
}
function buildAdminReport(tab,data,simulation=null,now=new Date()){
 const {users=[],profiles=[],events=[],feedback=[],closing=[],reviews=[],usage=[],rankings=[],schools=[]}=data;
 const ordered=[...users].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 const ps=new Map(profiles.map(p=>[p.user_id,p])),us=new Map(ordered.map((u,i)=>[u.id,{...u,number:i+1}]));
 const tester=id=>{const u=us.get(id);return u?`Tester #${u.number} · ${u.tester_school_code||'bez školy'} · ${ROLES[ps.get(id)?.role]||'Jiné'}`:'Smazaný tester';};
 const count=users.length,answers=closing.map(r=>r.answers),ms=now.getTime(),day=now.toISOString().slice(0,10);
 const activeSince=days=>distinct(events.filter(e=>us.has(e.user_id)&&new Date(e.created_at).getTime()>=ms-days*86400000).map(e=>e.user_id));
 const nps=answers.length?pct(answers.filter(a=>a.nps>=9).length-answers.filter(a=>a.nps<=6).length,answers.length):null;
 const totalCost=usage.reduce((sum,r)=>sum+(r.cost_usd==null?0:Number(r.cost_usd)),0),cards=[],sections=[];
 const card=(label,value,unit='')=>cards.push({label,value,unit});
 const add=(...s)=>sections.push(...s);
 if(tab==='overview'){
  card('Testeři',count);card('Aktivní dnes',distinct(events.filter(e=>us.has(e.user_id)&&e.created_at.slice(0,10)===day).map(e=>e.user_id)));card('Aktivní za 7 dní',activeSince(7));card('Zpětné vazby',feedback.length);
  card('Závěrečný dotazník',pct(profiles.filter(p=>p.closing_done_at).length,count),'%');card('NPS',nps);card('Zaplatilo by',pct(answers.filter(a=>a.pay==='ano').length,answers.length),'%');card('AI náklady',totalCost,'USD');
  const activity=Array.from({length:14},(_,i)=>{const d=new Date(ms-(13-i)*86400000).toISOString().slice(0,10);return {label:d,value:distinct(events.filter(e=>us.has(e.user_id)&&e.created_at.slice(0,10)===d).map(e=>e.user_id))};});
  add(section('activity','Aktivní testeři po dnech',activity,[col('label','Den (UTC)'),col('value','Testeři')],'line'),counts('schools','Testeři podle školy',users,u=>u.tester_school_code||'Bez školy'),counts('roles','Testeři podle role',profiles,p=>ROLES[p.role]||'Jiné'),counts('kinds','Druhy zpětné vazby',feedback,f=>KINDS[f.kind]||f.kind));
 }else if(tab==='feedback'){
  card('Nové',feedback.filter(f=>f.status==='nove').length);card('Vyřešené',feedback.filter(f=>f.status==='vyreseno').length);card('Odpovědi',feedback.filter(f=>f.admin_reply).length);
  const rows=[...feedback].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(f=>({id:f.id,tester:tester(f.user_id),school:f.school_code,role:ROLES[ps.get(f.user_id)?.role]||'Jiné',kind:KINDS[f.kind]||f.kind,kind_key:f.kind,page:f.page_url,status:f.status,source:f.source,message:f.message,created_at:f.created_at}));
  add(section('messages','Zpětná vazba',rows,[col('id','ID'),col('tester','Tester'),col('kind','Typ'),col('page','Stránka'),col('status','Stav'),col('source','Zdroj'),col('message','Zpráva'),col('created_at','Odesláno')]));
 }else if(tab==='behaviour'){
  const views=events.filter(e=>e.name==='page_view'),leaves=events.filter(e=>e.name==='page_leave');
  const pages=grouped(views,e=>e.path).map(row=>{const times=leaves.filter(e=>e.path===row.label).map(e=>Number(e.props.ms)||0);return {...row,seconds:row.value?times.reduce((a,b)=>a+b,0)/1000/row.value:0};});
  add(section('pages','Stránky a viditelný čas',pages,[col('label','Stránka'),col('value','Návštěvy'),col('seconds','Průměr viditelného času (s)')],'bar'));
  add(section('reach','Dosah funkcí',Object.entries(FEATURES).map(([key,label])=>({label,value:pct(profiles.filter(p=>p.checklist?.[key]).length,count),testers:profiles.filter(p=>p.checklist?.[key]).length})),[col('label','Funkce'),col('value','Dosah (%)'),col('testers','Testeři')],'bar'));
  add(counts('searches','Hledané názvy škol',events.filter(e=>e.name==='search'&&e.props.query),e=>e.props.query),counts('zero','Hledání bez výsledku',events.filter(e=>e.name==='search_zero'),e=>e.props.query||'Text neuložen kvůli soukromí'),counts('filters','Použité filtry',events.filter(e=>e.name==='filter_used'),e=>e.props.filter),counts('sorts','Řazení',events.filter(e=>e.name==='sort_used'),e=>e.props.sort),counts('devices','Zařízení',events.filter(e=>e.name==='session_start'),e=>({mobile:'Telefon',tablet:'Tablet',desktop:'Počítač'})[e.props.device]||'Jiné'));
  const issues=events.filter(e=>['js_error','api_error','rage_click'].includes(e.name));
  const groupedIssues=new Map();for(const e of issues){const label=e.name==='api_error'?`${e.props.endpoint} · ${e.props.status}`:e.name==='js_error'?e.props.message:e.props.selector;const key=e.name+'|'+e.path+'|'+label;const row=groupedIssues.get(key)||{type:e.name,page:e.path,label,value:0};row.value++;groupedIssues.set(key,row);}
  add(section('errors','Chyby a opakované klikání',[...groupedIssues.values()].sort((a,b)=>b.value-a.value),[col('type','Typ'),col('page','Stránka'),col('label','Popis'),col('value','Počet')]));
 }else if(tab==='funnels'){
  const stepLabels={welcome:'Úvod',role:'Role',stakes:'Očekávání',calculating:'Výpočet',reveal:'Výsledek',commitment:'Další postup',proof:'Zkušenosti',hodnota:'Hodnota',cesta:'Cesta',ucet:'Účet',plan:'Plán',zkusebni:'Zkouška',platba:'Platba',hotovo:'Hotovo'};
  const qLabels=new Map((require('./questionnaire').QUESTIONS||[]).map(q=>[q.id,q.label]));
  const funnel=(id,title,name,keys,key)=>{const rows=keys.map(step=>({step,label:stepLabels[step]||(/^q\d+$/.test(step)?'Otázka '+step.slice(1):qLabels.get(step)||step),value:distinct(events.filter(e=>e.name===name&&e.props[key]===step).map(e=>e.session_id))}));let prev=null;for(const r of rows){r.drop=prev==null?null:pct(Math.max(0,prev-r.value),prev);prev=r.value;}return section(id,title,rows,[col('label','Krok'),col('value','Relace'),col('drop','Úbytek oproti předchozímu (%)')],'funnel');};
  const ob=['welcome','role','stakes',...Array.from({length:11},(_,i)=>'q'+(i+1)),'calculating','reveal','commitment','proof','hodnota','cesta','ucet','plan','zkusebni','platba','hotovo'];
  // Use the actual production step identifiers, including optional branches.
  const seen=grouped(events.filter(e=>e.name==='ob_step'),e=>e.props.step).map(r=>r.label);const ids=[...ob.filter(k=>seen.includes(k)),...seen.filter(k=>!ob.includes(k))];
  add(funnel('onboarding','Onboarding: dosažené kroky','ob_step',ids,'step'));
  const questions=require('./questionnaire').QUESTIONS?.map(q=>q.id)||[];
  add(funnel('questionnaire','Dotazník: zodpovězené otázky','q_answer',questions,'key'),funnel('paywall','Platební obrazovky','paywall_view',['hodnota','cesta','plan','zkusebni','platba'],'screen'));
  const decision=['school_open','compare_open','prihlaska_pick'].map((name,i)=>({label:['Detail školy','Porovnání','Přihláška'][i],value:distinct(events.filter(e=>e.name===name).map(e=>e.session_id))}));
  add(section('decision','Od školy k rozhodnutí',decision,[col('label','Krok'),col('value','Relace')],'funnel'));
 }else if(tab==='matching'){
  card('Úplná pořadí',rankings.length);card('Hodnocení výsledku',avg(feedback.filter(f=>f.source==='micro'&&f.page_url==='/beta/micro/result').map(f=>Number(f.message.match(/result:\s*([1-5])(?:$|\s*·)/)?.[1])).filter(n=>n>=1&&n<=5)),'/ 5');
  for(const source of ['questionnaire','onboarding'])add(section(source,source==='questionnaire'?'Samostatný dotazník':'Úvodní dotazník',rankingStats(rankings,schools,simulation,source),[col('school','Škola'),col('samples','Pořadí se školou'),col('mean','Průměrné pořadí'),col('spread','Směrodatná odchylka'),col('top10','Top 10 (%)'),col('bottom10','Posledních 10 (%)'),col('simulated_mean','Simulace: pořadí'),col('simulated_top10','Simulace: top 10 (%)'),col('simulated_bottom10','Simulace: posledních 10 (%)'),col('delta','Rozdíl pořadí'),col('cutoff','Přijímací hranice'),col('known_features','Známé strukturované údaje'),col('obory','Obory')],'scatter'));
 }else if(tab==='closing'){
  card('Odpovědi',answers.length);card('Dokončeno',pct(answers.length,count),'%');card('NPS',nps);
  add(counts('roles','Role',answers,a=>ROLES[a.role]),counts('selected','Vybraná škola',answers,a=>({ano:'Ano',ne:'Ne',zatim_ne:'Ještě ne'})[a.selected]),counts('prior','Dřívější hledání',answers.flatMap(a=>(a.prior||[]).map(label=>({label}))),r=>({atlas:'Atlas školství',weby:'Weby škol',chatgpt:'ChatGPT',kamaradi:'Kamarádi',rodice:'Rodiče',jinak:'Jinak'})[r.label]),counts('nps','Doporučení (0–10)',answers,a=>String(a.nps)),counts('help','Pomohlo s výběrem (1–5)',answers,a=>String(a.help)),counts('useful','Nejužitečnější funkce',answers.flatMap(a=>(a.useful||[]).map(label=>({label}))),r=>FEATURES[r.label]||r.label),counts('pay','Ochota zaplatit',answers,a=>({ano:'Ano',mozna:'Možná',ne:'Ne'})[a.pay]),counts('payer','Kdo by platil',answers,a=>({ja:'Já',rodic:'Rodič',spolu:'Spolu'})[a.payer]),counts('plan','Preferovaný přístup',answers,a=>({mesic:'Měsíční',sezona:'Sezónní'})[a.plan]),counts('themes','Oblíbené téma',answers,a=>({znacka:'Značka',smrk:'Smrk',zvyraznovac:'Zvýrazňovač',terakota:'Terakota'})[a.theme]));
  const prices=priceCurves(answers);card('Cenové odpovědi pro křivku',prices.n);card('Dolní přijatelná cena',prices.low,'Kč');card('Horní přijatelná cena',prices.high,'Kč');
  add(section('prices','Van Westendorp: přijatelnost ceny',prices.rows,[col('price','Cena (Kč)'),col('tooCheap','Příliš levné (%)'),col('good','Výhodné (%)'),col('expensive','Drahé (%)'),col('tooExpensive','Příliš drahé (%)')],'prices'));
  add(section('ratings','Hodnocení funkcí',Object.entries({search:'Vyhledávání',detail:'Detail školy',questionnaire:'Dotazník',compare:'Porovnání'}).map(([key,label])=>({label,value:avg(answers.map(a=>a.ratings?.[key]).filter(Number.isFinite))})),[col('label','Funkce'),col('value','Hodnocení (1–5)')],'bar'));
  add(section('quotes','Co chybí a co změnit',closing.flatMap(r=>['missing','future','change'].filter(k=>r.answers[k]?.trim()).map(k=>({tester:tester(r.user_id),question:({missing:'Co chybělo',future:'Co přidat',change:'Změna hned'})[k],text:r.answers[k]}))),[col('tester','Tester'),col('question','Otázka'),col('text','Odpověď')]));
 }else if(tab==='reviews'){
  card('Recenze',reviews.length);card('Se souhlasem',reviews.filter(r=>r.consent_publish).length);card('Vybrané',reviews.filter(r=>r.selected_by_admin).length);
  add(section('reviews','Soukromé recenze',reviews.map(r=>({id:r.id,tester:tester(r.user_id),role:ROLES[ps.get(r.user_id)?.role],stars:r.stars,body:r.body,consent:r.consent_publish?'Ano':'Ne',consent_publish:r.consent_publish,selected_by_admin:r.selected_by_admin,selected:r.selected_by_admin?'Ano':'Ne',signature:r.display_label,age:({under15:'Méně než 15 let',adult:'Dospělý',unknown:'Neurčeno'})[r.age_group]||'Neurčeno',created_at:r.created_at})),[col('tester','Tester'),col('role','Role / třída'),col('stars','Hvězdy'),col('body','Recenze'),col('consent','Souhlas'),col('selected','Vybráno pro web'),col('signature','Anonymní podpis'),col('age','Věková skupina'),col('created_at','Odesláno')]));
 }else if(tab==='testers'){
  card('Testeři',count);card('Aktivní za 7 dní',activeSince(7));
  const rows=ordered.map(u=>{const p=ps.get(u.id),activity=events.filter(e=>e.user_id===u.id),last=activity.map(e=>e.created_at).sort().at(-1)||null;return {id:u.id,tester:tester(u.id),school:u.tester_school_code,role:p?.role==='jine'&&p.role_note?`Jiné: ${p.role_note}`:ROLES[p?.role],last_activity:last,feedback:feedback.filter(f=>f.user_id===u.id).length,checklist:Object.keys(FEATURES).filter(k=>p?.checklist?.[k]).length,total:Object.keys(FEATURES).length,access_until:u.tester_access_until,closing:p?.closing_done_at?'Dokončeno':p?.closing_due_at?'Čeká na odpověď':'Zatím není potřeba',created_at:u.created_at};});
  add(section('testers','Testeři a průběh',rows,[col('tester','Tester'),col('last_activity','Poslední aktivita'),col('feedback','Zpětné vazby'),col('checklist','Vyzkoušené funkce'),col('total','Celkem funkcí'),col('access_until','Přístup do'),col('closing','Závěrečný dotazník'),col('created_at','Registrace')]));
 }else if(tab==='ai-costs'){
  card('Vrácený náklad',totalCost,'USD');card('Volání',usage.length);card('Neznámý náklad',usage.filter(r=>r.cost_usd==null).length);card('Neúspěšná volání',usage.filter(r=>!r.ok).length);
  const summary=(rows,key)=>{const groups=new Map();for(const r of rows){const label=key(r),a=groups.get(label)||{label,value:0,calls:0,prompt_tokens:0,completion_tokens:0,failed:0,unknown:0};a.value+=Number(r.cost_usd)||0;a.calls++;a.prompt_tokens+=r.prompt_tokens||0;a.completion_tokens+=r.completion_tokens||0;if(!r.ok)a.failed++;if(r.cost_usd==null)a.unknown++;groups.set(label,a);}return [...groups.values()].sort((a,b)=>String(a.label).localeCompare(String(b.label),'cs'));};
  const columns=[col('label','Položka'),col('value','Náklad (USD)'),col('calls','Volání'),col('prompt_tokens','Vstupní tokeny'),col('completion_tokens','Výstupní tokeny'),col('failed','Chyby'),col('unknown','Neznámý náklad')];
  add(section('days','Náklady po dnech',summary(usage,r=>r.created_at.slice(0,10)),columns,'line'),section('models','Podle modelu',summary(usage,r=>r.model),columns,'bar'),section('sources','Podle použití',summary(usage,r=>({questionnaire:'Dotazník',proscons:'Shrnutí škol',extract:'Extrakce údajů'})[r.source]||r.source),columns,'bar'),section('runs','Po běhu dotazníku',summary(usage.filter(r=>r.run_id!=null),r=>'Běh #'+r.run_id),columns),section('failed','Neúspěšná volání',usage.filter(r=>!r.ok).map(r=>({created_at:r.created_at,model:r.model,source:r.source,error:r.error,cost:r.cost_usd,run:r.run_id})),[col('created_at','Čas'),col('model','Model'),col('source','Použití'),col('error','Chyba'),col('cost','Náklad (USD)'),col('run','Běh')]));
 }else return null;
 return {tab,generated_at:now.toISOString(),cards,sections,simulation:tab==='matching'?{file:simulation?.file||null,generated_at:simulation?.generated_at||null,n:simulation?.params?.n||null}:undefined};
}
module.exports={loadBetaData,buildAdminReport,latestSimulation,toCsv,priceCurves,rankingStats,ROLES,KINDS,FEATURES};
