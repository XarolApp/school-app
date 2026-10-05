const {loadBetaData,buildAdminReport,latestSimulation,toCsv}=require('./betaAdmin');
const TABS=['overview','feedback','behaviour','funnels','matching','closing','reviews','testers','ai-costs'];
const idOK=id=>/^[1-9]\d*$/.test(id||'');
function registerBetaAdmin(app,db,guards){
 let cached=null,pending=null,revision=0;
 const invalidate=()=>{cached=null;revision++;};
 const snapshot=async()=>{
  if(cached&&Date.now()-cached.at<30000)return cached.data;
  if(!pending){const version=revision;pending=loadBetaData(db).then(data=>{if(version===revision)cached={at:Date.now(),data};return data;}).finally(()=>{pending=null;});}
  return pending;
 };
 const report=async tab=>buildAdminReport(tab,await snapshot(),tab==='matching'?latestSimulation():null);
 const safe=fn=>async(req,res)=>{try{await fn(req,res);}catch{res.status(503).json({error:'Přehled teď nelze načíst. Zkuste to znovu.'});}};
 for(const tab of TABS)app.get('/api/admin/'+tab,...guards,safe(async(req,res)=>res.json(await report(tab))));
 app.get('/api/admin/export/:table.csv',...guards,safe(async(req,res)=>{
  const [tab,section,...rest]=(req.params.table||'').split('--');
  if(rest.length||!TABS.includes(tab))return res.status(404).json({error:'Export neexistuje.'});
  const table=(await report(tab)).sections.find(s=>s.id===section);
  if(!table)return res.status(404).json({error:'Export neexistuje.'});
  res.set('Content-Type','text/csv; charset=utf-8');res.set('Content-Disposition',`attachment; filename="beta-${tab}-${section}.csv"`);res.send(toCsv(table));
 }));
 app.get('/api/admin/feedback/:id',...guards,safe(async(req,res)=>{
  if(!idOK(req.params.id))return res.status(400).json({error:'Neplatná zpráva.'});
  const result=await db.from('beta_feedback').select('*').eq('id',req.params.id).single();
  if(result.error||!result.data)return res.status(404).json({error:'Zpráva neexistuje.'});
  const f=result.data;let screenshot_url=null;
  if(f.screenshot_path){const r=await db.storage.from('beta-screenshots').createSignedUrl(f.screenshot_path,120);if(r.error)throw r.error;screenshot_url=r.data.signedUrl;}
  const row=(await report('feedback')).sections[0].rows.find(r=>String(r.id)===String(f.id));
  res.json({...row,selector:f.selector,element_text:f.element_text,rect:f.rect,viewport:f.viewport,text_before:f.text_before,text_after:f.text_after,admin_note:f.admin_note,admin_reply:f.admin_reply,screenshot_url});
 }));
 app.patch('/api/admin/feedback/:id',...guards,safe(async(req,res)=>{
  const b=req.body||{},keys=Object.keys(b),patch={};
  if(!idOK(req.params.id)||!keys.length||keys.some(k=>!['status','admin_note','admin_reply'].includes(k))||
   b.status!==undefined&&!['nove','precteno','vyreseno','neudelame'].includes(b.status)||
   ['admin_note','admin_reply'].some(k=>b[k]!==undefined&&b[k]!==null&&(typeof b[k]!=='string'||b[k].length>4000)))return res.status(400).json({error:'Zkontrolujte stav a délku odpovědi.'});
  for(const k of keys)patch[k]=typeof b[k]==='string'?b[k].trim():b[k];
  if('admin_reply' in patch)patch.replied_at=patch.admin_reply?new Date().toISOString():null;
  const r=await db.from('beta_feedback').update(patch).eq('id',req.params.id).select('id').single();
  if(r.error||!r.data)return res.status(404).json({error:'Zpráva neexistuje.'});invalidate();res.status(204).end();
 }));
 app.patch('/api/admin/reviews/:id',...guards,safe(async(req,res)=>{
  if(!idOK(req.params.id)||Object.keys(req.body||{}).length!==1||typeof req.body.selected!=='boolean')return res.status(400).json({error:'Neplatná volba.'});
  const r=await db.from('beta_reviews').select('id,consent_publish').eq('id',req.params.id).single();
  if(r.error||!r.data)return res.status(404).json({error:'Recenze neexistuje.'});
  if(req.body.selected&&!r.data.consent_publish)return res.status(400).json({error:'Tester nedal souhlas se zveřejněním.'});
  const saved=await db.from('beta_reviews').update({selected_by_admin:req.body.selected}).eq('id',req.params.id);
  if(saved.error)throw saved.error;invalidate();res.status(204).end();
 }));
 app.get('/api/admin/testers/:id/email',...guards,safe(async(req,res)=>{
  const data=await snapshot();if(!data.users.some(u=>u.id===req.params.id))return res.status(404).json({error:'Tester neexistuje.'});
  const r=await db.auth.admin.getUserById(req.params.id);if(r.error)throw r.error;
  res.set('Cache-Control','no-store');res.json({email:r.data.user?.email||null});
 }));
}
module.exports={registerBetaAdmin,TABS};
