export function validate(s) {
 if(!s || !Array.isArray(s.accounts)||!Array.isArray(s.goals)||!Array.isArray(s.transactions)) throw Error('Formato de dados inválido.');
 if(s.accounts.length>100||s.goals.length>100||s.transactions.length>10000) throw Error('Limite de registros atingido.');
 const ids=new Set();const checkId=x=>{if(typeof x.id!=='string'||!x.id||ids.has(x.id))throw Error('Identificador inválido.');ids.add(x.id)};
 const label=x=>{if(typeof x!=='string'||!x.trim()||x.length>150)throw Error('Preencha um nome de até 150 caracteres.')};
 const money=x=>{if(!Number.isSafeInteger(x)||x<0||x>1e12)throw Error('Valor inválido.')};
 const balances={},reserved={},alloc={};
 for(const a of s.accounts){checkId(a);label(a.name);money(a.initial);balances[a.id]=a.initial;reserved[a.id]=0;}
 for(const g of s.goals){checkId(g);label(g.name);money(g.target);if(!g.target)throw Error('A meta precisa ser maior que zero.');if(g.deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(g.deadline))throw Error('Prazo inválido.');}
 for(const t of s.transactions){checkId(t);label(t.description);label(t.category);money(t.amount);if(!t.amount)throw Error('O valor precisa ser maior que zero.');if(!(t.account in balances))throw Error('Conta não encontrada.');if(!['income','expense','reserve','withdraw'].includes(t.type))throw Error('Tipo inválido.');if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date)throw Error('Data inválida.');
 if(t.type==='income')balances[t.account]+=t.amount;
 if(t.type==='expense')balances[t.account]-=t.amount;
 if(['reserve','withdraw'].includes(t.type)){if(!s.goals.some(g=>g.id===t.goal))throw Error('Objetivo não encontrado.');const amount=t.type==='reserve'?t.amount:-t.amount;reserved[t.account]+=amount;const k=t.goal+'|'+t.account;alloc[k]=(alloc[k]||0)+amount;}
 }
 if(Object.values(alloc).some(x=>x<0))throw Error('O resgate excede a reserva deste objetivo nesta conta.');
 if(s.accounts.some(a=>balances[a.id]<reserved[a.id]))throw Error('Saldo disponível insuficiente na conta. Resgate a reserva ou ajuste os lançamentos.');
 return s;
}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/state'){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Entre com sua conta para salvar seus dados.'},401);
 try {
 if(request.method==='GET'){const row=await env.DB.prepare('SELECT data,revision FROM finance_state WHERE user_id=?').bind(user).first();return json(row?{data:JSON.parse(row.data),revision:row.revision}:{data:{accounts:[],goals:[],transactions:[]},revision:0});}
 if(request.method==='PUT'){
 if(request.headers.get('origin')!==url.origin)return json({error:'Origem inválida.'},403);
 const raw=await request.text();if(raw.length>4000000)return json({error:'Arquivo muito grande.'},413);
 const {data,revision}=JSON.parse(raw);validate(data);if(!Number.isSafeInteger(revision)||revision<0)throw Error('Versão inválida.');
 const q=revision===0?env.DB.prepare('INSERT OR IGNORE INTO finance_state(user_id,data,revision) VALUES(?,?,1)').bind(user,JSON.stringify(data)):env.DB.prepare('UPDATE finance_state SET data=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(data),user,revision);
 const result=await q.run();if(!result.meta.changes)return json({error:'Seus dados mudaram em outra aba. Recarregue a página antes de continuar.'},409);return json({revision:revision+1});}
 return json({error:'Método não permitido.'},405);
 }catch(e){console.error('Finance API:',e.message);return json({error:e.message?.includes('D1')?'Não foi possível acessar os dados. Tente novamente.':e.message},400);}
 }
 if(url.pathname!=='/')return new Response('Página não encontrada',{status:404});
 return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; worker-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'"}});
}};
