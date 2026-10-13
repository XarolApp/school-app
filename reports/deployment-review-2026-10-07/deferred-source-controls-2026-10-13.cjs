'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const qsrc=fs.readFileSync(process.argv[2] || path.join(root,'lib/questionnaire.js'),'utf8');
const bodies=[];
const context={module:{exports:{}},process:{env:{}},console:{error(){}},AbortSignal,
 require(id){
  if(id==='./matching'||id==='./pragueDistricts')return require(path.join(root,'lib',id.slice(2)));
  if(id==='./aiUsage')return {fetchWithAiUsage:async(_url,opts)=>{bodies.push(JSON.parse(opts.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reasons:[{school_id:1,reason:'Offline fixture sentence.'}]})}}]}));}};
  throw new Error('Unexpected dependency '+id);
 }};
vm.runInNewContext(qsrc,context,{timeout:1000});
const {validateAnswers,describeAnswers,requestMatches}=context.module.exports;
const base={typ:'odborna',oblasti:['it'],predmety:['informatika'],styl:'kombinace',po_skole:'nevim',velikost:'nezalezi',jazyky:'stredne'};
const numeric=[];
for(const value of [true,false,[],[12],{},' ',0,100,'12',-1,101,1.5]){
 const r=validateAnswers({...base,body:value});numeric.push({input:value,accepted:r.ok,cleanBody:r.answers?.body??null});
}
const schools=[...Array.from({length:11},(_,i)=>({id:i+1,name:'Ordinary fixture '+(i+1),programs:'Informační technologie'})),{id:99,name:'Hearing-specialist fixture',programs:'Informační technologie',school_extracted_details:{urceno_pro_postizeni:['sluchove']}}];
(async()=>{
 const answers={...base,postizeni:'ano',postizeni_typ:['sluchove'],poznamka:'Synthetic private note'};
 const valid=validateAnswers(answers);assert.equal(valid.ok,true);assert(!describeAnswers(valid.answers).includes('sluchove'));assert(!describeAnswers(valid.answers).includes('Synthetic private note'));
 const args={schools,apiKey:'offline-fixture-only',model:'fixture',referer:'http://localhost'};
 await requestMatches({...args,answers:base});await requestMatches({...args,answers:valid.answers});
 const prompts=bodies.map(b=>b.messages[1].content);
 assert(!prompts[0].includes('Hearing-specialist fixture'));assert(prompts[1].includes('Hearing-specialist fixture'));assert(!prompts[1].includes('sluchove'));assert(!prompts[1].includes('Synthetic private note'));
 const out={method:'Entire immutable current questionnaire source evaluated with blocked provider dependency and synthetic rows/answers. No dotenv, real HTTP or hosted write.',numericTypeControls:numeric,healthPayload:{directAnswersAbsent:true,privateNoteAbsent:true,specialistNameAbsentWithoutPreference:true,specialistNamePresentWithPreference:true,maxTokens:bodies[1].max_tokens,claimLimit:'Identifying name/order exposure supports inference risk; no real diagnosis, provider inference or live disclosure proved.'}};
 fs.writeFileSync(path.join(require('node:os').tmpdir(),'deferred-source-controls-replay.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
