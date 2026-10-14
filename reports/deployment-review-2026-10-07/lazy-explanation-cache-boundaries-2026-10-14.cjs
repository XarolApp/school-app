'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..');
const testFile=path.join(root,'tests/server-boundaries.test.cjs');const source=fs.readFileSync(testFile,'utf8');const start=source.indexOf('function harness('),end=source.indexOf("test('decision profile",start);assert(start>=0&&end>start);
const harness=vm.runInNewContext(source.slice(start,end)+'\nharness;', {require:createRequire(testFile),__dirname:path.dirname(testFile),readFileSync:fs.readFileSync,join:path.join,vm,Date,Buffer,URL,setTimeout,clearTimeout},{timeout:1000});
(async()=>{
 let extras={},calls=0;let release;const both=new Promise(r=>release=r);
 const h=harness({env:{OPENROUTER_API_KEY:'synthetic'},result:q=>{
  if(q.table==='questionnaire_runs'){
   const update=q.calls.find(c=>c[0]==='update');if(update){extras=structuredClone(update[1].extra_reasons);return {data:null,error:null};}
   return {data:{id:12,answers:{typ:'gymnazium'},matches:[],extra_reasons:structuredClone(extras)},error:null};
  }
  if(q.table==='schools')return {data:[{id:11,name:'Synthetic school11',programs:'Gymnázium'},{id:12,name:'Synthetic school12',programs:'Gymnázium'}],error:null};
  return {data:null,error:null};
 },requestReasonsImpl:async({shortlist})=>{calls++;if(calls===2)release();await both;return new Map([[shortlist[0].school_id,'Synthetic reason'+shortlist[0].school_id]]);}});
 const timer=setTimeout(()=>release(),1000);
 const responses=await Promise.all([11,12].map(id=>h.call('post','/api/questionnaire/explain/:schoolId',{params:{schoolId:String(id)},query:{run:'12'}})));clearTimeout(timer);
 assert(responses.every(r=>r.statusCode===200));assert.equal(calls,2);assert.equal(Object.keys(extras).length,1);
 let duplicates=0;let releaseSame;const sameBarrier=new Promise(r=>releaseSame=r);
 const same=harness({env:{OPENROUTER_API_KEY:'synthetic'},result:q=>q.table==='questionnaire_runs'?{data:{id:12,answers:{},matches:[],extra_reasons:{}},error:null}:q.table==='schools'?{data:[{id:11,name:'Synthetic school11',programs:'Gymnázium'}],error:null}:{data:null,error:null},requestReasonsImpl:async()=>{duplicates++;if(duplicates===2)releaseSame();await sameBarrier;return new Map([[11,'Synthetic same-school reason']]);}});
 const sameTimer=setTimeout(()=>releaseSame(),1000);const sameResponses=await Promise.all([1,2].map(()=>same.call('post','/api/questionnaire/explain/:schoolId',{params:{schoolId:'11'},query:{run:'12'}})));clearTimeout(sameTimer);assert(sameResponses.every(r=>r.statusCode===200));assert.equal(duplicates,2);
 const out={checkedAt:new Date().toISOString(),sourceSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'server.js'))).digest('hex'),method:'Actual full current registered handler via reviewed test harness; cloned in-memory run snapshots, fake provider barriers and fake DB. No dotenv, real account/network/model/cache/db writes.',differentSchools:{returnedBoth200:true,providerCalls:calls,finalExtraReasons:extras,lostOneCachedReason:true},sameSchool:{returnedBoth200:true,providerCalls:duplicates,notDeduplicatedInFlight:true},limits:['Does not prove deployed PostgreSQL timing or provider spending; handler lost-update/duplicate-call boundary is reproduced locally.','Requires coordinated atomic cache merge, owner/run/deletion/health-revision and hidden-school policy; not a blind whole-row write patch.']};
 fs.writeFileSync(path.join(require('node:os').tmpdir(),'lazy-explanation-cache-boundaries-replay.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
