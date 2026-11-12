import {checkInstallation} from '../lib/pwa-diagnostics.js';
let cached=null,checkedAt=0;
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({error:'Método não permitido.'}));return}
 if(!cached||Date.now()-checkedAt>60000){cached=await checkInstallation();checkedAt=Date.now()}
 res.statusCode=200;res.end(JSON.stringify(cached));
}
