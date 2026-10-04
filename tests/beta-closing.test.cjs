const {test}=require('node:test');
const assert=require('node:assert/strict');
const {closingDue,closingPayload}=require('../lib/betaClosing');
const now=new Date('2026-10-05T12:00:00Z');
test('closing starts after core features and day two, or two days before cutoff; new testers get 24 hours',()=>{
 const user={created_at:'2026-10-02T12:00:00Z'},settings={ends_at:'2026-10-15T12:00:00Z'};
 const core={checklist:{dotaznik:true,detail:true,porovnani:true,core_completed_at:'2026-10-04T10:00:00Z'}};
 assert.equal(closingDue(user,core,settings,now),'2026-10-04T12:00:00.000Z');
 assert.equal(closingDue(user,{checklist:{dotaznik:true,detail:false}},settings,now),null);
 assert.equal(closingDue({created_at:now.toISOString()},core,settings,now),null);
 assert.equal(closingDue(user,{checklist:{}},{ends_at:'2026-10-07T12:00:00Z'},now),now.toISOString());
 assert.equal(closingDue({created_at:now.toISOString()},{checklist:{}},{ends_at:'2026-10-06T12:00:00Z'},now),now.toISOString());
 assert.equal(closingDue(user,{...core,closing_done_at:now.toISOString()},settings,now),null);
});
const valid={selected:'ne',prior:['weby'],nps:8,help:4,useful:['detail'],missing:'',pay:'mozna',prices:{tooCheap:50,good:200,expensive:400,tooExpensive:600},payer:'rodic',plan:'sezona',theme:'smrk',future:'',change:'',ratings:{search:4,detail:4,questionnaire:5,compare:3}};
test('closing validation strips extra fields and derives anonymous review label server-side',()=>{
 const p=closingPayload({answers:{...valid,email:'secret',body:87},review:{stars:4,body:'Pomohlo mi porovnani skol.',consent_publish:false,selected_by_admin:true,display_label:'Full name'}},'8');
 assert.equal(p.answers.role,'8');assert.equal(p.answers.email,undefined);assert.equal(p.answers.body,undefined);
 assert.equal(p.review.display_label,'Student, 8. třída');assert.equal(p.review.age_group,'under15');assert.equal(p.review.selected_by_admin,undefined);
 assert.equal(closingPayload({answers:{...valid,nps:11}},'9'),null);
 assert.equal(closingPayload({answers:{...valid,prices:{...valid.prices,good:-1}}},'9'),null);
 assert.equal(closingPayload({answers:valid,review:{stars:0,body:'text',consent_publish:false}},'9'),null);
});
