import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile} from 'node:fs/promises';
import worker from '../dist/server/index.js';
await mkdir('.local',{recursive:true});
const database=new DatabaseSync('.local/finance.sqlite');
database.exec(await readFile('drizzle/0000_finances.sql','utf8').then(s=>s.replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ')));
const DB={prepare(sql){return {bind(...values){return {
 async first(){return database.prepare(sql).get(...values)||null},
 async run(){return {meta:{changes:Number(database.prepare(sql).run(...values).changes)}}}
}}}}};
const host='127.0.0.1',port=Number(process.env.PORT||3000),origin=`http://${host}:${port}`;
createServer(async(req,res)=>{
 try{
  if(req.headers.host!==`${host}:${port}`){res.writeHead(403).end('Use o endereço local informado no terminal.');return}
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>4000000){res.writeHead(413).end('Payload muito grande.');return}chunks.push(chunk)}
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
  // Identidade simulada exclusivamente neste servidor local, vinculado ao loopback.
  headers.set('oai-authenticated-user-id','local-development');
  const options={method:req.method,headers};if(!['GET','HEAD'].includes(req.method))options.body=Buffer.concat(chunks);
  const response=await worker.fetch(new Request(new URL(req.url,origin),options),{DB});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500).end('Erro no servidor local. Consulte o terminal.')}
}).listen(port,host,()=>console.log(`Bolso local: ${origin}\nDados de desenvolvimento: .local/finance.sqlite\nIdentidade simulada apenas no servidor local. Não exponha este servidor na internet.`));
