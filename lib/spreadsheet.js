import {validate} from '../worker/index.js';

export const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const blank=row=>row.every(value=>value===null||value===undefined||String(value).trim()==='');
export function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');
 const line=text.split(/\r?\n/)[0];
 const counts=Object.fromEntries([';',',','\t'].map(delimiter=>[delimiter,0]));let quoted=false;
 for(let i=0;i<line.length;i++){if(line[i]==='"'){if(quoted&&line[i+1]==='"')i++;else quoted=!quoted}else if(!quoted&&line[i] in counts)counts[line[i]]++}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 const rows=[];let row=[],cell='',inQuotes=false,closed=false;
 const push=()=>{row.push(cell);cell='';closed=false};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(inQuotes){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{inQuotes=false;closed=true}}else cell+=c;continue}
  if(c==='"'){if(cell||closed)throw Error('CSV com aspas inválidas. Exporte novamente como CSV UTF-8.');inQuotes=true}
  else if(c===delimiter){push()}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;push();if(!blank(row))rows.push(row);row=[]}
  else {if(closed&&c.trim())throw Error('CSV com conteúdo após as aspas.');if(!closed)cell+=c}
 }
 if(inQuotes)throw Error('CSV com aspas não fechadas.');
 push();if(!blank(row))rows.push(row);
 if(rows.some(r=>r.length!==rows[0].length))throw Error('Há linhas com número diferente de colunas. Confira o separador do CSV.');
 return rows;
}
export function tableRows(rows){
 rows=rows.filter(row=>!blank(row));
 if(rows.length<2)throw Error('A planilha precisa de cabeçalho e pelo menos um lançamento.');
 if(rows.length>10001||rows[0].length>100)throw Error('Use até 10.000 lançamentos e 100 colunas por arquivo.');
 return {headers:rows[0].map((h,i)=>String(h??'').trim()||'Coluna '+(i+1)),rows:rows.slice(1)};
}
const aliases={date:['data','date','data do lancamento'],description:['descricao','description','historico','lancamento'],amount:['valor','valor (brl)','valor (r$)','amount'],type:['tipo','type','natureza'],account:['conta','account','banco'],category:['categoria','category']};
export function suggestMapping(headers){return Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.findIndex(h=>names.includes(normalize(h)))]))}
export function parseAmount(value){
 if(typeof value==='number'){
  const cents=Math.round(value*100);
  if(!Number.isFinite(value)||Math.abs(value*100-cents)>.00001||!Number.isSafeInteger(cents)||Math.abs(cents)>1e12)throw Error('Valor inválido ou com mais de duas casas decimais.');
  return cents;
 }
 let text=String(value??'').trim().replace(/^'/,'').replace(/^R\$\s*/i,'').replace(/\s/g,'').replace(/^−/,'-');
 if(/^\(.+\)$/.test(text))text='-'+text.slice(1,-1);
 if(text.includes(',')){
  if(!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text))throw Error('Use um valor como 1.234,56.');
  text=text.replaceAll('.','').replace(',','.');
 }else if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(text))text=text.replaceAll('.','');
 else if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(text))throw Error('Valor inválido. Use até duas casas decimais.');
 return parseAmount(Number(text));
}
export function parseDate(value){
 if(value instanceof Date){if(!Number.isFinite(value.getTime()))throw Error('Data inválida.');value=value.toISOString().slice(0,10)}
 let text=String(value??'').trim();
 if(/^\d{2}\/\d{2}\/\d{4}$/.test(text))text=text.split('/').reverse().join('-');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text).toISOString().slice(0,10)!==text)throw Error('Data inválida. Use DD/MM/AAAA ou AAAA-MM-DD.');
 return text;
}
export function prepareImport({rows,mapping,state,defaultAccount='Conta da planilha',balances={},skipDuplicates=true,createId=()=>crypto.randomUUID()}){
 for(const key of ['date','description','amount'])if(!Number.isInteger(mapping[key])||mapping[key]<0)throw Error('Selecione as colunas Data, Descrição e Valor.');
 const selected=Object.values(mapping).filter(i=>i>=0);if(new Set(selected).size!==selected.length)throw Error('Escolha uma coluna diferente para cada campo.');
 const next=structuredClone(state),addedAccounts=[],imported=[];let duplicates=0;
 const key=t=>JSON.stringify([t.date,normalize(t.description),t.type,t.amount,t.account,normalize(t.category)]);
 const existing=new Set(next.transactions.map(key));
 for(const [index,row] of rows.entries()){
  try{
   const get=name=>mapping[name]>=0?row[mapping[name]]:null;
   const name=String(get('account')??'').trim()||defaultAccount.trim();
   if(!name||name.length>80)throw Error('Informe uma conta com até 80 caracteres.');
   const matches=next.accounts.filter(a=>normalize(a.name)===normalize(name));
   if(matches.length>1)throw Error('Há contas com o mesmo nome. Renomeie-as antes de importar.');
   let account=matches[0];
   if(!account){account={id:createId(),name,initial:parseAmount(balances[normalize(name)]??0)};next.accounts.push(account);addedAccounts.push(account)}
   const signedAmount=parseAmount(get('amount'));if(!signedAmount)throw Error('O valor precisa ser diferente de zero.');
   const rawType=normalize(get('type'));
   let type=rawType?({receita:'income',entrada:'income',credito:'income',income:'income',despesa:'expense',saida:'expense',debito:'expense',expense:'expense'})[rawType]:(signedAmount<0?'expense':'income');
   if(!type)throw Error('Use Receita ou Despesa. Aportes e resgates devem ser restaurados pelo backup JSON.');
   if(type==='income'&&signedAmount<0)throw Error('Uma receita não pode ter valor negativo.');
   const tx={id:createId(),date:parseDate(get('date')),description:String(get('description')??'').trim(),amount:Math.abs(signedAmount),type,account:account.id,category:String(get('category')??'').trim()||'Outros',goal:null};
   if(!tx.description||tx.description.length>150||tx.category.length>150)throw Error('Descrição obrigatória e campos com até 150 caracteres.');
   if(skipDuplicates&&existing.has(key(tx))){duplicates++;continue}
   existing.add(key(tx));next.transactions.push(tx);imported.push(tx);
  }catch(error){throw Error('Linha '+(index+2)+': '+error.message)}
 }
 let financialError='';try{validate(next)}catch(error){financialError=error.message}
 return {data:next,accounts:addedAccounts,transactions:imported,duplicates,financialError};
}
