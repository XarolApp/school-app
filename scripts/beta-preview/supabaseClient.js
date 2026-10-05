const KEY='snm.local-preview.session',listeners=new Set();
let session=JSON.parse(localStorage.getItem(KEY)||'null');
export const isSupabaseConfigured=true;
export const authConfigured=true;
export function setRememberMe(){}
export function getRememberMe(){return true;}
export function previewSession(user){session=user?{user,access_token:user.id}:null;localStorage.setItem(KEY,JSON.stringify(session));for(const fn of listeners)fn(session?'SIGNED_IN':'SIGNED_OUT',session);}
const auth={getSession:async()=>({data:{session}}),onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},signOut:async()=>{previewSession(null);return {error:null};},async signUp({email,options}){const r=await fetch('http://127.0.0.1:5002/__preview/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,metadata:options?.data})});const {user}=await r.json();return {data:{user,session:null},error:null};},async signInWithPassword({email}){const users=await(await fetch('http://127.0.0.1:5002/__preview/users')).json();const user=users.find(u=>u.email===email);if(!user)return {error:{message:'Invalid login credentials'}};previewSession(user);return {data:{session},error:null};},resetPasswordForEmail:async()=>({error:null}),updateUser:async()=>({error:null}),resend:async()=>({error:null})};
export const supabase={auth};
