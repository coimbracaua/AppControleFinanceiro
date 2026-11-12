import {randomBytes,scryptSync,timingSafeEqual,createHmac} from 'node:crypto';
import {validate} from '../worker/index.js';
const EMPTY={accounts:[],goals:[],transactions:[]};
const COOKIE='bolso_session';
export function createApp(store,{setupHost,now=()=>Date.now()}={}){
 const reply=(res,status,data)=>{res.statusCode=status;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 async function body(req){if(typeof req.body==='object'&&req.body!==null)return req.body;let value=typeof req.body==='string'?req.body:'';if(!value)for await(const part of req){value+=part;if(value.length>4000000)throw Error('Payload excedido')};if(value.length>4000000)throw Error('Payload excedido');return JSON.parse(value)}
 const sign=(value,key)=>createHmac('sha256',key).update(value).digest('hex');
 const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
 const cookie=(res,value,age)=>res.setHeader('Set-Cookie',`${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`);
 const authorized=(req,auth)=>{const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));const token=cookies[COOKIE]||'',parts=token.split('.');return parts.length===2&&Number(parts[0])>now()&&same(parts[1],sign(parts[0],auth.key))};
 const issue=(res,auth)=>{const exp=String(now()+7*86400000);cookie(res,exp+'.'+sign(exp,auth.key),7*86400)};
 const originOk=req=>req.headers.origin===`https://${req.headers.host}`;
 return async function handler(req,res,route){try{
 if(!['GET','POST','PUT','DELETE'].includes(req.method))return reply(res,405,{error:'Método não permitido.'});
 if(req.method!=='GET'&&!originOk(req))return reply(res,403,{error:'Origem inválida.'});
 const credentials=await store.read('auth/owner.json');const auth=credentials?.value;
 if(route==='auth'){
  if(req.method==='GET')return reply(res,200,{configured:!!auth,authenticated:!!auth&&authorized(req,auth)});
  if(req.method==='DELETE'){cookie(res,'',0);return reply(res,200,{ok:true})}
  if(req.method!=='POST')return reply(res,405,{error:'Método não permitido.'});
  const {password,mode}=await body(req);if(typeof password!=='string'||password.length<12||password.length>128)return reply(res,400,{error:'Use uma senha entre 12 e 128 caracteres.'});
  if(!auth){
   if(mode!=='setup'||req.headers.host!==setupHost)return reply(res,403,{error:'Configure sua senha pelo endereço principal protegido da Vercel.'});
   const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex'),created={salt,hash,key:randomBytes(32).toString('hex')};
   await store.write('auth/owner.json',created,null);issue(res,created);return reply(res,200,{ok:true});
  }
  const hash=scryptSync(password,auth.salt,64).toString('hex');if(!same(hash,auth.hash))return reply(res,401,{error:'Senha incorreta.'});issue(res,auth);return reply(res,200,{ok:true});
 }
 if(!auth||!authorized(req,auth))return reply(res,401,{error:'Entre para acessar seu financeiro.'});
 if(req.method==='GET'){const data=await store.read('finance/owner.json');return reply(res,200,data?.value||{data:EMPTY,revision:0})}
 if(req.method!=='PUT')return reply(res,405,{error:'Método não permitido.'});
 const input=await body(req);validate(input.data);if(!Number.isSafeInteger(input.revision)||input.revision<0)return reply(res,400,{error:'Revisão inválida.'});
 const current=await store.read('finance/owner.json');if((current?.value.revision||0)!==input.revision)return reply(res,409,{error:'Os dados mudaram em outra aba. Recarregue antes de continuar.'});
 await store.write('finance/owner.json',{data:input.data,revision:input.revision+1},current?.etag||null);return reply(res,200,{revision:input.revision+1});
 }catch(error){if(store.conflict(error))return reply(res,409,{error:'Os dados mudaram em outra aba. Recarregue a página.'});if(error.name==='SyntaxError')return reply(res,400,{error:'Dados inválidos.'});if(error.message?.includes('Blob')||error.message?.includes('token')){console.error('Storage error:',error.name);return reply(res,503,{error:'Armazenamento indisponível. Tente novamente.'})}return reply(res,400,{error:error.message||'Não foi possível concluir.'})}};
}
