// Closing timing is shared by API checks and deterministic tests. SQL applies
// the same deadline inside has_access(), including direct favorites requests.
function closingDue(profile, beta, settings, now=new Date()) {
  if (beta.closing_done_at) return null;
  if (settings?.ends_at == null) return null;
  const created=new Date(profile.created_at).getTime(), end=new Date(settings?.ends_at).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(end) || end<=now.getTime()) return null;
  if (beta.closing_due_at) return beta.closing_due_at;
  const c=beta.checklist || {}, candidates=[Math.max(created,end-2*86400000)];
  if (c.dotaznik && c.detail && (c.porovnani || c.matice)) candidates.push(Math.max(created+2*86400000,new Date(c.core_completed_at || now).getTime()));
  const due=Math.min(...candidates);
  return due<=now.getTime()?new Date(due).toISOString():null;
}
const roles=['8','9','rodic','ucitel','jine'];
function closingPayload(body, role) {
  const a=body?.answers;
  const pick=(value,options)=>options.includes(value);
  const multi=(value,options)=>Array.isArray(value) && value.length<=options.length && value.every(v=>options.includes(v)) && new Set(value).size===value.length;
  const rating=(v,min=1,max=5)=>Number.isInteger(v)&&v>=min&&v<=max;
  const text=(v)=>typeof v==='string'&&v.length<=2000;
  if (!a || !roles.includes(role) || !pick(a.selected,['ano','ne','zatim_ne']) ||
    !multi(a.prior,['atlas','weby','chatgpt','kamaradi','rodice','jinak']) || !rating(a.nps,0,10) || !rating(a.help) ||
    !multi(a.useful,['dotaznik','vyhledavani','detail','porovnani','matice','prihlaska','sdileni']) || !text(a.missing) ||
    !pick(a.pay,['ano','mozna','ne']) || !a.prices || !['tooCheap','good','expensive','tooExpensive'].every(k=>Number.isFinite(a.prices[k])&&a.prices[k]>=0&&a.prices[k]<=100000) ||
    !pick(a.payer,['ja','rodic','spolu']) || !pick(a.plan,['mesic','sezona']) || !pick(a.theme,['znacka','smrk','zvyraznovac','terakota']) ||
    !text(a.future) || !text(a.change) || !a.ratings || !['search','detail','questionnaire','compare'].every(k=>rating(a.ratings[k]))) return null;
  const answers={role,selected:a.selected,prior:a.prior,nps:a.nps,help:a.help,useful:a.useful,missing:a.missing,pay:a.pay,
    prices:Object.fromEntries(['tooCheap','good','expensive','tooExpensive'].map(k=>[k,a.prices[k]])),payer:a.payer,plan:a.plan,theme:a.theme,future:a.future,change:a.change,
    ratings:Object.fromEntries(['search','detail','questionnaire','compare'].map(k=>[k,a.ratings[k]]))};
  let review=null;
  if (body.review!=null) {
    const r=body.review;
    if (!rating(r.stars)||typeof r.body!=='string'||r.body.trim().length<10||r.body.length>2000||typeof r.consent_publish!=='boolean') return null;
    review={stars:r.stars,body:r.body.trim(),consent_publish:r.consent_publish,
      display_label:({'8':'Student, 8. třída','9':'Student, 9. třída',rodic:'Rodič',ucitel:'Učitel',jine:'Beta tester'})[role],
      age_group:role==='8'?'under15':role==='9'?'unknown':['rodic','ucitel'].includes(role)?'adult':'unknown'};
  }
  return {answers,review};
}
module.exports={closingDue,closingPayload};
