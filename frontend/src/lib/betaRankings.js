import { betaTracker } from './betaTrack.js';
const KEY='snm.beta.rankings';
function read(){try{return JSON.parse(localStorage.getItem(KEY)) || [];}catch{return [];}}
function write(rows){try{if(rows.length)localStorage.setItem(KEY,JSON.stringify(rows));else localStorage.removeItem(KEY);}catch{/* storage unavailable */}}
let sending=false;
export function stageBetaRanking(ranking) {
  if(!betaTracker.active() || !ranking.length)return;
  const context=betaTracker.context();
  write([...read().filter(r=>r.expires>Date.now()),{capture_id:crypto.randomUUID(),source:'onboarding',ranking,owner:context.userId,
    ticket:context.userId?undefined:context.ticket,anon_id:context.anon_id,expires:Date.now()+86400000}].slice(-5));
}
export async function flushBetaRankings(send) {
  const context=betaTracker.context();
  if(sending || !betaTracker.active() || !context.userId)return;
  sending=true;
  try {
    for(const row of read()) {
      if(row.expires<=Date.now() || row.owner && row.owner!==context.userId){write(read().filter(r=>r.capture_id!==row.capture_id));continue;}
      try {
        await send({source:row.source,capture_id:row.capture_id,ranking:row.ranking,ticket:row.ticket,anon_id:row.anon_id});
        write(read().filter(r=>r.capture_id!==row.capture_id));
      } catch(e) {if([400,403,410].includes(e.status))write(read().filter(r=>r.capture_id!==row.capture_id));else break;}
      if(betaTracker.context().userId!==context.userId)break;
    }
  } finally {sending=false;}
}
