const {test}=require('node:test');const assert=require('node:assert/strict');
const {rankingPayload}=require('../lib/betaRankings');
test('rankings accept only distinct positive school ids, never an answer object',()=>{
 assert.deepEqual(rankingPayload([3,1,2]),[3,1,2]);
 for(const value of [[],[1,1],[0,1],[-1,1],['1'],{body:70},Array.from({length:1001},(_,i)=>i+1)])assert.equal(rankingPayload(value),null);
});
test('questionnaire retains full deterministic rank order before slicing explanation shortlist',async()=>{
 const {requestMatches,REASON_COUNT}=require('../lib/questionnaire');
 const schools=Array.from({length:15},(_,i)=>({id:i+1,name:'Gymnazium '+i,programs:'gymnazium'}));
 const result=await requestMatches({answers:{typ:'gymnazium'},schools,apiKey:null});
 assert.equal(result.fullRanking.length,15);assert.equal(result.matches.length,REASON_COUNT);
 assert.deepEqual(result.fullRanking.slice(0,REASON_COUNT),result.matches.map(m=>m.school_id));
 assert.equal(result.fullRanking.some(id=>typeof id!=='number'),false);
});
