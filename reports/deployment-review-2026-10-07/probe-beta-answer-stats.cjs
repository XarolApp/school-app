// Offline actual-source review: no .env, Supabase, account, write or HTTP operation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const sourcePath = path.join(root, 'lib/betaAdmin.js');
const raw = fs.readFileSync(sourcePath);
const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
const questions = [{id:'a',label:'Synthetic single-choice question',type:'single',options:[{value:'x',label:'X'},{value:'y',label:'Y'}]}];
const context = {
  module:{exports:{}}, __dirname:path.join(root,'lib'),
  require: name => name === './questionnaire' ? {QUESTIONS:questions} : require(name),
};
vm.runInNewContext(raw.toString(), context, {filename:sourcePath});
const {answerStats,buildAdminReport,loadBetaData} = context.module.exports;
const users = Array.from({length:8},(_,i)=>({id:'synthetic-u'+i,created_at:'2026-10-01T00:00:00Z',subscription_status:'beta'}));
const profiles = users.map((u,i)=>({user_id:u.id,consent_tracking_at:'2026-10-01T00:00:00Z',tracking_paused_at:i===0?'2026-10-02T00:00:00Z':null}));
const runs = users.map((u,i)=>({id:i+1,user_id:u.id,source:'questionnaire',created_at:'2026-10-03T00:00:00Z',answers:{a:i<6?'x':'y'}}));
const report = buildAdminReport('funnels',{users,profiles,runs});
const rows = report.sections.find(s=>s.id==='answers').rows;
const x = rows.find(r=>r.option==='X');
const y = rows.find(r=>r.option==='Y');
assert.equal(x.respondents,8);
assert.equal(x.count,6);
assert.equal(y.count,'<5');
const withoutPaused = answerStats(runs,new Set(users.filter(u=>u.id!=='synthetic-u0').map(u=>u.id)),questions);
assert.equal(withoutPaused.rows.find(r=>r.option==='X').respondents,7);
assert.equal(withoutPaused.rows.find(r=>r.option==='X').count,5);
const mixed = answerStats([...runs,{id:99,user_id:users[0].id,source:'onboarding',created_at:'2026-10-04T00:00:00Z',answers:{q1:'unmapped-onboarding-key'}}],new Set(users.map(u=>u.id)),questions);
assert.equal(mixed.rows.find(r=>r.option==='X').respondents,7);
const inference = x.respondents-x.count;
assert.equal(inference,2);
const queried=[];
const ordinary = {id:100,user_id:'synthetic-ordinary-account',answers:{health:'private fixture',points:75},created_at:'2026-10-03T00:00:00Z'};
const db = {from(table){
  const record={table,columns:null,filters:[]};queried.push(record);
  const q={select(columns){record.columns=columns;return q;},order(){return q;},range(){return q;},eq(k,v){record.filters.push(['eq',k,v]);return q;},is(k,v){record.filters.push(['is',k,v]);return q;},then(resolve,reject){return Promise.resolve({data:table==='questionnaire_runs'?[ordinary]:[],error:null}).then(resolve,reject);}};
  return q;
}};
(async()=>{
  const data=await loadBetaData(db);
  const query=queried.find(q=>q.table==='questionnaire_runs');
  assert.equal(query.filters.length,0);
  assert.equal(data.runs[0].user_id,ordinary.user_id);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),sha256,'Source changed during probe');
  const evidence={checked_at_utc:new Date().toISOString(),source:{path:'lib/betaAdmin.js',sha256},method:'Actual current module evaluated in VM; questionnaire schema is a declared synthetic single-choice fixture. No production account/service/env or database writes.',cases:{withdrawnTester:{actualRespondents:x.respondents,actualXCount:x.count,excludingPausedWouldGiveRespondents:7,excludingPausedWouldGiveXCount:5,trackingPauseIgnored:true},smallCell:{displayedX:x,displayedY:y,derivedSuppressedY:inference,derivation:'respondents minus X for a complete valid binary single-choice fixture'},mixedSourcePolicyObservation:{respondentsBefore:8,respondentsAfterNewerUnmappedSyntheticRun:7,reportedTesters:mixed.testers,sourceNotSelectedByLoader:!query.columns.split(',').includes('source'),confirmedProductionBug:false,qualification:'Real onboarding persistence translates answers into the shared schema. This synthetic omission shows newest-run selection, not an established production schema incompatibility.'},loader:{questionnaireQuery:query,ordinaryFixtureRead:true}},limits:['Shows consent/count/fetch faults with synthetic fixtures, not successful identification of a real tester. Latest-run behavior alone is not classified as a bug.','No deployed RLS, grants, report endpoint, retention policy or real cohort anonymity acceptance established.','Tracking consent applicability follows current enrollment/privacy wording; a coordinated privacy/product decision and implementation remain required.']};
  fs.writeFileSync(path.join(__dirname,'beta-answer-stats-2026-10-11.json'),JSON.stringify(evidence,null,2)+'\n');
  process.stdout.write('Actual-source probe reproduced paused inclusion, binary small-cell inference and unfiltered ordinary-run fetch; latest-run replacement is a qualified policy observation.\n');
})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
