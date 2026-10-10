const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync,mkdtempSync,writeFileSync,rmSync,utimesSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');const vm=require('node:vm');
const {toCsv,rankingStats,buildAdminReport,priceCurves,latestSimulation}=require('../lib/betaAdmin');
test('CSV quotes delimiters, line breaks and quotes; neutralizes spreadsheet formulas',()=>{
 const csv=toCsv({columns:[{key:'x',label:'Hodnota'}],rows:[{x:'=HYPERLINK("x")'},{x:' +SUM(A1)'},{x:'a,b\nc"d'},{x:-3},{x:'@evil'},{x:'\t-cmd'}]});
 assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));assert.ok(csv.includes('"\' +SUM(A1)"'));assert.ok(csv.includes('"a,b\nc""d"'));assert.ok(csv.includes('"-3"'));assert.ok(csv.includes('"\'@evil"'));assert.ok(csv.includes('"\'\t-cmd"'));
});
test('matching aggregates complete rankings separately and uses full bottom distribution',()=>{
 const schools=Array.from({length:30},(_,i)=>({id:i+1,name:'Škola '+(i+1)})),ranking=schools.map(s=>s.id);
 const data=[{source:'onboarding',ranking},{source:'onboarding',ranking:[...ranking].reverse()},{source:'questionnaire',ranking}];
 const stats=rankingStats(data,schools,{onboarding:{schools:[{id:1,mean_rank:10,top10_pct:30,bottom10_pct:10}]}},'onboarding');
 const first=stats.find(s=>s.id===1);assert.equal(first.mean,15.5);assert.equal(first.spread,14.5);assert.equal(first.top10,50);assert.equal(first.bottom10,50);assert.equal(first.delta,5.5);
 assert.equal(rankingStats(data,schools,null,'questionnaire')[0].mean,1);
});
test('admin reports expose aggregate events and pseudonyms; default tester table and CSV omit email',()=>{
 const user={id:'u',created_at:'2026-10-01',tester_school_code:'GYM',email:'private@example.test'};
 const event={id:1,user_id:'u',session_id:'s',name:'page_view',path:'/skoly',props:{email:'private@example.test'},created_at:'2026-10-05'};
 for(const tab of require('../lib/betaAdminRoutes').TABS){const r=buildAdminReport(tab,{users:[user],events:[event]},null,new Date('2026-10-05T12:00:00Z'));assert.equal(r.tab,tab);assert.ok(!JSON.stringify(r).includes('private@example.test'));assert.ok(!JSON.stringify(r).includes('"props"'));for(const s of r.sections)assert.ok(s.columns.length);}
 const r=buildAdminReport('testers',{users:[user]});assert.match(r.sections[0].rows[0].tester,/Tester #1 · GYM/);assert.ok(!toCsv(r.sections[0]).includes(user.email));
});
test('price curves calculate intersections and exclude inconsistent threshold order only from curves',()=>{
 const p=priceCurves([{prices:{tooCheap:50,good:200,expensive:400,tooExpensive:600}},{prices:{tooCheap:600,good:200,expensive:400,tooExpensive:50}}]);assert.equal(p.n,1);assert.ok(p.low>=50&&p.low<=400);assert.ok(p.high>=200&&p.high<=600);assert.ok(p.rows.every(r=>r.good>=0&&r.good<=100));assert.equal(priceCurves([]).low,null);
});
test('admin reads the newest simulation report for both sources',()=>{
 const dir=mkdtempSync(join(tmpdir(),'beta-simulation-'));try{for(const [name,time] of [['old',1],['new',2]]){const f=join(dir,'matching-simulation-'+name+'.json');writeFileSync(f,JSON.stringify({questionnaire:{schools:[]},onboarding:{schools:[]}}));utimesSync(f,time,time);}assert.equal(latestSimulation(dir).file,'matching-simulation-new.json');}finally{rmSync(dir,{recursive:true,force:true});}
});
test('admin progress matches the eight available beta tasks and ignores disabled sharing',()=>{
 const checklist={dotaznik:true,vyhledavani:true,detail:true,porovnani:true,matice:true,prihlaska:true,tema:true,platby:true,sdileni:true};
 const data={users:[{id:'tester',created_at:'2026-10-10'}],profiles:[{user_id:'tester',checklist}]};
 const row=buildAdminReport('testers',data).sections[0].rows[0];
 assert.equal(row.total,8);assert.equal(row.checklist,8);
 const reach=buildAdminReport('behaviour',data).sections.find(s=>s.id==='reach');
 assert.equal(reach.rows.length,8);assert.ok(!reach.rows.some(r=>r.label==='Sdílení'));
});
test('simulation uses reproducible seeded sampling and deterministic school rankings without services',()=>{
 const source=readFileSync(join(__dirname,'../scripts/simulate-matching.mjs'),'utf8');
 const code=source.slice(source.indexOf('function rng('),source.indexOf('// --- data '));
 const {QUESTIONS,questionApplies,validateAnswers}=require('../lib/questionnaire');
 const generate=seed=>{const context={SEED:seed,SKIP:.25,QUESTIONS,questionApplies,validateAnswers};vm.createContext(context);vm.runInContext(code+';samples=Array.from({length:30},questionnaireAnswers)',context);const {scoreSchools}=require('../lib/matching');const schools=[{id:1,name:'Gymnázium',programs:'gymnázium'},{id:2,name:'Průmyslová škola',programs:'informatika'}];return JSON.stringify(context.samples.map(a=>({a,ranking:scoreSchools(a,schools)})));};
 assert.equal(generate(42),generate(42));assert.notEqual(generate(42),generate(43));
});
test('answer stats: beta only, latest run per tester, small cells and private questions hidden',()=>{
 const {answerStats}=require('../lib/betaAdmin');
 const qs=[{id:'a',type:'single',label:'A',options:[{value:'x',label:'X'},{value:'y',label:'Y'}]},{id:'m',type:'multi',label:'M',options:[{value:'p',label:'P'}]},{id:'h',type:'single',label:'H',privateToServer:true,options:[{value:'1',label:'1'}]}];
 const ids=Array.from({length:8},(_,i)=>'u'+i),runs=ids.map((u,i)=>({user_id:u,created_at:'2026-10-02',answers:{a:i<6?'x':'y',m:['p'],h:'1'}}));
 runs.push({user_id:'u0',created_at:'2026-10-01',answers:{a:'y'}},{user_id:'outsider',created_at:'2026-10-03',answers:{a:'y'}});
 const r=answerStats(runs,new Set(ids),qs);
 assert.equal(r.testers,8);assert.ok(!r.rows.some(x=>x.question==='H'));
 const x=r.rows.find(x=>x.option==='X'),y=r.rows.find(x=>x.option==='Y');
 assert.equal(x.count,6);assert.equal(x.respondents,8);assert.equal(y.count,'<5');assert.equal(y.share,null);
 assert.equal(answerStats(runs.slice(0,3),new Set(ids),qs).rows[0].count,null);
 assert.ok(!JSON.stringify(r).includes('u0'));
});
