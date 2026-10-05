// Execute real server routes with disposable services. Binds loopback only.
// node scripts/beta-preview/server.cjs (never reads .env).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');const originalRequire=createRequire(path.join(__dirname,'../../server.js'));
const {createDatabase}=require('./database.cjs');const fixture=createDatabase();const express=originalRequire('express');const app=express();
// Optional restart checkpoint contains synthetic fixtures only, outside repo.
const checkpoint='/tmp/school-app-beta-preview.json';
if(process.argv.includes('--resume')&&fs.existsSync(checkpoint)){const s=JSON.parse(fs.readFileSync(checkpoint,'utf8'));Object.assign(fixture.tables,s.tables);fixture.authUsers.splice(0,fixture.authUsers.length,...s.authUsers);Object.assign(fixture.metrics,s.metrics);for(const [k,v] of s.objects)fixture.objects.set(k,{...v,bytes:Buffer.from(v.bytes,'base64')});}
process.on('SIGINT',()=>{fs.writeFileSync(checkpoint,JSON.stringify({tables:fixture.tables,authUsers:fixture.authUsers,metrics:fixture.metrics,objects:[...fixture.objects].map(([k,v])=>[k,{...v,bytes:v.bytes.toString('base64')}])}),{mode:0o600});process.exit(0);});
app.use(originalRequire('cors')());app.use('/__preview',express.json());
app.post('/__preview/signup',(req,res)=>{const user=fixture.addUser(req.body.email,req.body.metadata);res.json({user});});
app.get('/__preview/users',(req,res)=>res.json(fixture.authUsers));
app.post('/__preview/tester',(req,res)=>{const role=req.body.role==='rodic'?'rodic':'8';const user=fixture.addUser('local-'+role+'-'+Date.now()+'@example.test',{beta_school_code:'LOCALGYM',beta_role:role,beta_notice_accepted:true});res.json({user});});
app.get('/__preview/metrics',(req,res)=>res.json({...fixture.metrics,events:fixture.tables.beta_events.length,feedback:fixture.tables.beta_feedback,rankings:fixture.tables.beta_rankings,closing:fixture.tables.beta_closing_answers.length,reviews:fixture.tables.beta_reviews.length}));
app.post('/__preview/scenario',(req,res)=>{
 const user=fixture.tables.users.find(u=>u.id===req.body.user_id),p=fixture.tables.beta_profile.find(p=>p.user_id===req.body.user_id);if(!user)return res.status(400).end();
 if(req.body.scenario==='warning')user.tester_access_until=fixture.iso(6);
 if(req.body.scenario==='expired')user.tester_access_until=fixture.iso(-1);
 if(req.body.scenario==='closing'){user.created_at=fixture.iso(-96);p.checklist={...p.checklist,dotaznik:true,detail:true,porovnani:true,core_completed_at:fixture.iso(-48)};p.closing_due_at=fixture.iso(-1);}
 res.status(204).end();
});
app.put('/__preview/storage/:path',express.raw({type:['image/jpeg','image/png'],limit:'2mb'}),(req,res)=>{fixture.objects.set(req.params.path,{bytes:req.body,info:{size:req.body.length,contentType:req.headers['content-type']}});fixture.metrics.uploads++;res.status(200).end();});
app.get('/__preview/storage/:path',(req,res)=>{const o=fixture.objects.get(req.params.path);if(!o)return res.status(404).end();res.type(o.info.contentType).send(o.bytes);});
app.use('/api/beta/events',(req,res,next)=>{fixture.metrics.eventRequests++;next();});
const source=fs.readFileSync(path.join(__dirname,'../../server.js'),'utf8');
const syntheticEnv={PORT:'5002',FRONTEND_URL:'http://127.0.0.1:5175',SUPABASE_SERVICE_ROLE_KEY:'local-fixture',ADMIN_EMAILS:'admin@example.test',BETA_TICKET_SECRET:'local-only-fixture-ticket-secret-123456',STRIPE_SECRET_KEY:'fixture-trap'};
const trap=new Proxy(()=>{fixture.metrics.stripeCalls++;throw Error('Stripe reached in local beta preview');},{get:()=>trap});
vm.runInNewContext(source.slice(0,source.lastIndexOf('\nif (stripe)')),{__dirname:path.join(__dirname,'../..'),Buffer,URL,Date,setTimeout,clearTimeout,console,process:{env:syntheticEnv},require(name){
 if(name==='dotenv')return {config(){}};
 if(name==='express')return Object.assign(()=>app,{json:express.json,raw:express.raw});
 if(name==='@supabase/supabase-js')return {createClient:()=>fixture.db};
 if(name==='stripe')return ()=>trap;
 return originalRequire(name);
}},{filename:'server.js'});
app.listen(5002,'127.0.0.1',()=>console.log('Disposable beta preview API: http://127.0.0.1:5002 (no .env, no live services)'));
