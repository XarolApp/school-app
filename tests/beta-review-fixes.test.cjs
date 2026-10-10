const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {closingDue}=require('../lib/betaClosing');
const {cleanupBetaScreenshots}=require('../lib/betaMaintenance');
const sql=readFileSync(require('node:path').join(__dirname,'../supabase-setup.sql'),'utf8');
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};};
test('no anonymous or account event is queued before notice acceptance',async()=>{
 const {createBetaTracker}=await import('../frontend/src/lib/betaTrack.js');
 const local=store(),sent=[],t=createBetaTracker({local,session:store(),uuid:()=>id,send:async p=>sent.push(p)});
 t.setAccount({resolved:true,userId:null,tester:false});assert.equal(t.startVisit('SCHOOL'),null);t.acceptTicket('unrequested');t.track('page_view');await t.flush();
 assert.equal(local.m.size,0);assert.equal(sent.length,0);
 t.setAccount({resolved:true,userId:'beta',tester:true,noticeAccepted:false});t.track('page_view');await t.flush();assert.equal(sent.length,0);
 t.setAccount({resolved:true,userId:'beta',tester:true,noticeAccepted:true});t.track('page_view');await t.flush();assert.equal(sent.length,1);
 assert.match(sql,/where p.user_id = p_user_id and p.consent_tracking_at is not null and p.tracking_paused_at is null for update/);
});
test('failed tracking flush cannot reattribute events to the next beta account',async()=>{
 const {createBetaTracker}=await import('../frontend/src/lib/betaTrack.js');let reject;const sent=[];
 const t=createBetaTracker({local:store(),session:store(),uuid:()=>id,send:p=>{sent.push(p);return new Promise((_,r)=>{reject=r;});}});
 t.setAccount({resolved:true,userId:'one',tester:true,noticeAccepted:true});t.track('page_view');const pending=t.flush();
 t.setAccount({resolved:true,userId:'two',tester:true,noticeAccepted:true});reject(new Error('offline'));await pending;await t.flush();assert.equal(sent.length,1);
});
test('same beta profile refresh pauses new collection and preserves already queued events',async()=>{
 const {createBetaTracker}=await import('../frontend/src/lib/betaTrack.js');const sent=[];
 const t=createBetaTracker({local:store(),session:store(),uuid:()=>id,send:async p=>sent.push(p)});
 t.setAccount({resolved:true,userId:'one',tester:true,noticeAccepted:true});t.track('theme_change');
 t.setAccount({resolved:false,userId:'one',tester:true,noticeAccepted:true});t.track('page_view');await t.flush();assert.equal(sent.length,0);
 t.setAccount({resolved:true,userId:'one',tester:true,noticeAccepted:true});await t.flush();
 assert.equal(sent.length,1);assert.deepEqual(sent[0].events.map(e=>e.name),['theme_change']);
 t.track('page_view');t.setAccount({resolved:true,userId:'one',tester:false,noticeAccepted:true});await t.flush();assert.equal(sent.length,1);
});
test('auth refresh cannot replay navigation events, including after tracking is enabled',async()=>{
 const {createBetaNavigation}=await import('../frontend/src/lib/betaNavigation.js');let enabled=false,now=0;const events=[];
 const tracker={active:()=>enabled,track:(...e)=>events.push(e)};
 const nav=createBetaNavigation({tracker,path:'/skoly/12',clock:()=>now});nav.start();assert.equal(events.length,0);
 enabled=true;nav.start();nav.start();nav.start();now=300;nav.finish();
 assert.equal(events.filter(e=>e[0]==='page_view').length,1);assert.equal(events.filter(e=>e[0]==='school_open').length,1);assert.equal(events.filter(e=>e[0]==='page_leave').length,1);
});
test('quick feature ratings never renew access, and event recording avoids the invalid function-name qualifier',()=>{
 const micro=sql.slice(sql.indexOf('create or replace function public.submit_beta_micro'),sql.indexOf('revoke all on function public.submit_beta_micro'));
 assert.doesNotMatch(micro,/submit_beta_feedback/);
 assert.match(micro,/insert into public.beta_feedback/);
 const events=sql.slice(sql.indexOf('create or replace function public.record_beta_events'),sql.indexOf('revoke all on function public.record_beta_events'));
 assert.doesNotMatch(events,/record_beta_events\.checklist/);
});
test('null or past program end suppresses a persisted closing deadline in JS and SQL',()=>{
 const user={created_at:'2026-10-01'},beta={closing_due_at:'2026-10-01'},now=new Date('2026-10-05');
 for(const ends_at of [null,'2026-10-04'])assert.equal(closingDue(user,beta,{ends_at},now),null);
 assert.match(sql,/case when s.ends_at is null or s.ends_at<=now\(\)/);
 assert.match(sql,/closing_done_at is null and p.closing_due_at=u.created_at/);
});
test('visiting search with an empty query does not count as a real search',()=>{
 const {checklistFromEvents}=require('../lib/betaAnalytics');
 assert.equal(checklistFromEvents([{name:'search',props:{length:0}}]).vyhledavani,undefined);
 assert.equal(checklistFromEvents([{name:'search',props:{length:3}}]).vyhledavani,true);
 assert.equal(checklistFromEvents([{name:'compare_open',props:{count:1}}]).porovnani,undefined);
 assert.equal(checklistFromEvents([{name:'compare_open',props:{count:2}}]).porovnani,true);
 assert.match(sql,/when 'search' then case when coalesce\(\(v_event->'props'->>'length'\)::numeric,0\)>0/);
});
test('daily cleanup removes only server-selected orphans through private Storage',async()=>{
 const removed=[];const db={rpc:async(name,args)=>{assert.equal(name,'beta_screenshot_orphans');assert.equal(args.p_limit,100);return {data:[{name:'owner/orphan.jpg'}]};},storage:{from:b=>{assert.equal(b,'beta-screenshots');return {remove:async paths=>{removed.push(...paths);return {error:null};}};}}};
 assert.equal((await cleanupBetaScreenshots(db)).error,null);assert.deepEqual(removed,['owner/orphan.jpg']);
 assert.match(sql,/o.created_at<now\(\)-interval '24 hours'/);assert.match(sql,/not exists\(select 1 from public.beta_feedback f where f.screenshot_path=o.name\)/);
});
