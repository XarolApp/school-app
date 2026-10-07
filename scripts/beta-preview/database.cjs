// Disposable in-memory fixtures. No Supabase connection or production writes.
const {randomUUID}=require('node:crypto');
const {checklistFromEvents}=require('../../lib/betaAnalytics');
const {closingDue}=require('../../lib/betaClosing');
const iso=(hours=0)=>new Date(Date.now()+hours*3600000).toISOString();
const uid=n=>String(n).padStart(8,'0')+'-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
function createDatabase(){
 const tables={users:[],beta_profile:[],beta_feedback:[],beta_events:[],beta_closing_answers:[],beta_reviews:[],ai_usage_log:[],beta_rankings:[],schools:[],favorites:[],application_picks:[],school_notes:[],decision_profile:[],questionnaire_runs:[],school_reviews:[],shortlist_shares:[],share_links:[],school_programs:[],review_reports:[],beta_program_settings:[{singleton:true,ends_at:iso(720),access_hours:48,feedback_form_url:null}],beta_schools:[{code:'LOCALGYM',school_name:'Místní testovací gymnázium',active:true}]};
 const authUsers=[];const objects=new Map();const metrics={eventRequests:0,stripeCalls:0,uploads:0};
 function addUser(email,metadata={},id=randomUUID()){
  const beta=metadata.beta_school_code==='LOCALGYM',user={id,email,email_confirmed_at:iso(),user_metadata:metadata};authUsers.push(user);
  tables.users.push({id,email,name:metadata.name||'Místní tester',created_at:iso(),subscription_status:beta?'beta':'trialing',trial_expires_at:iso(72),tester_school_code:beta?'LOCALGYM':null,tester_access_until:beta?iso(48):null,tester_guidance_seen_at:null,theme_palette:'znacka',theme_mode:'light'});
  if(beta)tables.beta_profile.push({user_id:id,role:metadata.beta_role||'9',consent_tracking_at:(metadata.beta_notice_accepted||metadata.beta_tracking_notice_accepted)?iso():null,checklist:{},micro_asked:{},closing_due_at:null,closing_done_at:null});return user;
 }
 addUser('admin@example.test',{},uid(1));addUser('normal@example.test',{},uid(2));
 for(let i=3;i<9;i++){
  const u=addUser('seed'+i+'@example.test',{beta_school_code:'LOCALGYM',beta_role:i%2?'9':'rodic',beta_tracking_notice_accepted:true},uid(i));
  const p=tables.beta_profile.at(-1);p.checklist={dotaznik:true,detail:true,porovnani:true,vyhledavani:true};tables.users.at(-1).tester_guidance_seen_at=iso(-100);
  for(let d=0;d<14;d++)for(const name of ['session_start','page_view','school_open','compare_open','paywall_view','ob_step','search'])tables.beta_events.push({id:tables.beta_events.length+1,user_id:u.id,anon_id:uid(99),session_id:uid(100+i+d),name,path:'/skoly',created_at:iso(-24*d),props:name==='search'?{query:'Gymnázium',length:9,count:5}:name==='session_start'?{device:i%2?'mobile':'desktop'}:name==='paywall_view'?{screen:'plan'}:name==='ob_step'?{step:'q1'}:{id:i,count:2}});
  tables.beta_feedback.push({id:i,user_id:u.id,school_code:'LOCALGYM',kind:i%2?'bug':'chvala',source:'button',type:'comment',page_url:'/skoly',message:i%2?'Na telefonu je porovnání těžší najít.':'Porovnání mi pomohlo vybrat školu.',status:'nove',created_at:iso(-i),admin_note:null,admin_reply:null});
  tables.beta_rankings.push({id:i,user_id:u.id,source:i%2?'onboarding':'questionnaire',capture_id:randomUUID(),run_id:null,ranking:Array.from({length:30},(_,j)=>(j+i)%30+1),created_at:iso(-i)});
  const answers={role:p.role,selected:'zatim_ne',prior:['weby','chatgpt'],nps:i+2,help:4,useful:['detail','porovnani'],missing:'Chybí mi více fotografií.',pay:i%2?'ano':'mozna',prices:{tooCheap:50+i*5,good:200+i*5,expensive:400+i*5,tooExpensive:600+i*5},payer:'rodic',plan:'sezona',theme:i%2?'smrk':'znacka',future:'Více oborů.',change:'Lépe najít porovnání.',ratings:{search:4,detail:5,questionnaire:4,compare:4}};
  tables.beta_closing_answers.push({user_id:u.id,answers,created_at:iso(-i)});p.closing_done_at=iso(-i);
  tables.beta_reviews.push({id:i,user_id:u.id,stars:4,body:'Pomohlo mi to rychle porovnat školy.',consent_publish:i%2===0,selected_by_admin:false,display_label:i%2?'Student, 9. třída':'Rodič',age_group:'unknown',created_at:iso(-i)});
  tables.ai_usage_log.push({id:i,user_id:u.id,run_id:i,source:'questionnaire',model:'local-fixture',prompt_tokens:500,completion_tokens:100,cost_usd:.002*i,ok:i!==8,error:i===8?'OpenRouter HTTP 503':null,created_at:iso(-i*24)});
 }
 for(let i=1;i<=30;i++)tables.schools.push({id:i,name:(i%3?'Gymnázium':'Střední průmyslová škola')+' Místní '+i,location:'Praha '+(i%10+1),programs:i%3?'gymnázium všeobecné':'informatika technika',website:'https://example.test',latitude:50.08+i/2000,longitude:14.43+i/2000,merged_into:null,redizo:'local'+i,admission_cutoff:50+i,acceptance_rate:40,school_programs:[{id:i,rok:2026,kkov:i%3?'79-41-K/41':'18-20-M/01',obor_nazev:i%3?'Gymnázium':'Informační technologie',maturitni:true,jpz_povinna:true,typ_skoly:i%3?'Gymnázium':'SOŠ',jazyk_studia:'Český',zrizovatel:'Kraj',kapacita:30,prihlasky:100,prijati:30,cutoff:50+i,delka_studia:4}],school_extracted_details:{ma_jidelnu:true,ma_koleje:false,vyukovy_styl_tagy:['projektova'],krouzky_kategorie:['sport'],vs_pokracuje_pct:80,pocet_krouzku:null},school_ai_summary:[]});
 // Exercise missing cutoff, unknown qualification and confirmed non-JPZ copy.
 for(const [id,maturitni,jpz_povinna] of [[27,true,true],[28,null,null],[29,false,false]]){const school=tables.schools.find(s=>s.id===id);school.admission_cutoff=null;Object.assign(school.school_programs[0],{maturitni,jpz_povinna,cutoff:null});}
 // A real missing-data path: a programme exists, but location/admission figures are unknown.
 const missing=tables.schools.find(s=>s.id===30);Object.assign(missing,{latitude:null,longitude:null,location:'Praha, adresa neuvedena',admission_cutoff:null,acceptance_rate:null});Object.assign(missing.school_programs[0],{maturitni:false,cutoff:null,prihlasky:null,prijati:null});
 const db={auth:{getUser:async token=>({data:{user:authUsers.find(u=>u.id===token)},error:null}),admin:{getUserById:async id=>({data:{user:authUsers.find(u=>u.id===id)},error:null})}},storage:{from:()=>({createSignedUploadUrl:async path=>({data:{signedUrl:'http://127.0.0.1:5002/__preview/storage/'+encodeURIComponent(path)},error:null}),createSignedUrl:async path=>({data:{signedUrl:'http://127.0.0.1:5002/__preview/storage/'+encodeURIComponent(path)},error:null}),info:async path=>({data:objects.get(path)?.info,error:null}),remove:async paths=>{paths.forEach(p=>objects.delete(p));return {error:null};}})},
 from(table){
  const filters=[],orders=[];let action=null,values=null,options={},single=false,allowNull=false,range=null,limit=null,cols='*';
  const q={select(c){cols=c||'*';return q;},eq(k,v){filters.push(r=>String(r[k])===String(v));return q;},neq(k,v){filters.push(r=>r[k]!==v);return q;},is(k,v){filters.push(r=>(r[k]??null)===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},gt(k,v){filters.push(r=>r[k]>v);return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},lt(k,v){filters.push(r=>r[k]<v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},order(k,o={}){orders.push([k,o.ascending!==false]);return q;},range(a,b){range=[a,b];return q;},limit(n){limit=n;return q;},single(){single=true;return q;},maybeSingle(){single=true;allowNull=true;return q;},insert(v){action='insert';values=v;return q;},upsert(v,o){action='upsert';values=v;options=o||{};return q;},update(v){action='update';values=v;return q;},delete(){action='delete';return q;},throwOnError(){return q;},or(){return q;},then(resolve,reject){return Promise.resolve().then(()=>{
   const list=tables[table]||[],chosen=list.filter(r=>filters.every(f=>f(r)));let rows=chosen;
   if(action==='update')chosen.forEach(r=>Object.assign(r,values));
   if(action==='delete'){tables[table]=list.filter(r=>!chosen.includes(r));rows=[];}
   if(action==='insert'||action==='upsert'){rows=[];for(const v of Array.isArray(values)?values:[values]){const keys=(options.onConflict||'id').split(','),existing=action==='upsert'&&list.find(r=>keys.every(k=>v[k]!=null&&r[k]===v[k]));if(existing){if(!options.ignoreDuplicates)Object.assign(existing,v);rows.push(existing);}else{const row={id:Math.max(0,...list.map(r=>Number(r.id)||0))+1,created_at:iso(),...v};list.push(row);rows.push(row);}}tables[table]=list;}
   rows=[...rows];for(const [key,asc] of orders)rows.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(asc?1:-1));if(range)rows=rows.slice(range[0],range[1]+1);if(limit!=null)rows=rows.slice(0,limit);
   if(cols.includes('schools (')||cols.includes('schools('))rows=rows.map(r=>({...r,schools:tables.schools.find(s=>s.id===r.school_id)}));
   if(!cols.includes('*')&&!cols.includes('(')){const keys=cols.split(',').map(s=>s.trim());rows=rows.map(r=>Object.fromEntries(keys.map(k=>[k,r[k]])));}
   return {data:single?rows[0]||null:rows,error:single&&!allowNull&&!rows.length?{code:'PGRST116',message:'no fixture'}:null,count:rows.length};
  }).then(resolve,reject);}};return q;
 },async rpc(name,a={}){
  const p=tables.beta_profile.find(r=>r.user_id===a.p_user_id),u=tables.users.find(r=>r.id===a.p_user_id);let result=null;
  const renew=(message,page,details={})=>{u.tester_access_until=iso(48);const f={id:Math.max(0,...tables.beta_feedback.map(r=>r.id))+1,user_id:u.id,school_code:u.tester_school_code,type:a.p_type||'comment',kind:'obecne',source:'button',message,page_url:page,status:'nove',created_at:iso(),...details};tables.beta_feedback.push(f);return {testerAccessUntil:u.tester_access_until,feedbackId:f.id};};
  if(name==='sync_beta_closing'){if(p)p.closing_due_at=closingDue(u,p,tables.beta_program_settings[0]);}
  else if(name==='record_beta_events'){
   if(u&&!p?.consent_tracking_at)return {error:{code:'42501'}};
   if(a.p_join)tables.beta_events.filter(e=>e.anon_id===a.p_anon_id&&!e.user_id).forEach(e=>e.user_id=u.id);
   for(const e of a.p_events)tables.beta_events.push({id:tables.beta_events.length+1,user_id:u?.id||null,anon_id:a.p_anon_id,session_id:a.p_session_id,...e,created_at:iso()});
   if(p)Object.assign(p.checklist,checklistFromEvents(tables.beta_events.filter(e=>e.user_id===u.id)));
  }else if(name==='submit_beta_feedback'||name==='submit_beta_feedback_details')result=renew(a.p_message,a.p_page_url,a.p_details);
  else if(name==='submit_beta_micro'){
   if(a.p_action==='ask'){const asked=p.micro_asked;if(Object.values(asked).some(m=>m.session_id===a.p_session)||asked[a.p_id]?.done)return {error:{code:'23505'}};asked[a.p_id]={session_id:a.p_session,done:false};}
   else {p.micro_asked[a.p_id]={session_id:a.p_session,done:true};if(a.p_action==='answer')result=renew('Mikro otázka '+a.p_id+': '+a.p_answer,'/beta/micro/'+a.p_id,{source:'micro'});}result=result||{asked:true};
  }else if(name==='submit_beta_closing'){
   if(p.closing_done_at)return {error:{code:'23505'}};
   tables.beta_closing_answers.push({user_id:u.id,answers:a.p_answers,created_at:iso()});p.closing_done_at=iso();
   if(a.p_review)tables.beta_reviews.push({id:Math.max(0,...tables.beta_reviews.map(r=>r.id))+1,user_id:u.id,...a.p_review,selected_by_admin:false,created_at:iso()});
  }else if(name==='beta_screenshot_orphans')result=[];
  return {data:result,error:null};
 }};
 return {db,tables,authUsers,objects,metrics,addUser,iso,uid};
}
module.exports={createDatabase};
