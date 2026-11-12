import {buildPwa} from './build-pwa.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('public',{recursive:true});
let html=await readFile('app.html','utf8');
html=html.replace('const $=s=>',"const VERCEL_APP=true; const $=s=>");
html=html.replace('async function load(){try{',`async function showLogin(){
 const r=await fetch('/api/auth'), info=await r.json();
 const setup=!info.configured;
 $('#status').classList.remove('hidden');
 $('#status').innerHTML='<strong>'+ (setup?'Bem-vindo ao seu Bolso.':'Seu espaço é privado.') +'</strong><p style="margin-top:6px">'+(setup?'Crie uma senha pessoal para proteger seu financeiro. Use pelo menos 12 caracteres.':'Digite sua senha para acessar seus registros.')+'</p><form id="loginForm" style="display:grid;gap:12px;max-width:360px;margin-top:15px"><label>Senha<input style="display:block;width:100%" id="password" type="password" minlength="12" maxlength="128" autocomplete="'+(setup?'new-password':'current-password')+'" required></label>'+(setup?'<label>Confirme a senha<input style="display:block;width:100%" id="confirmPassword" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></label>':'')+'<button id="loginButton">'+(setup?'Criar senha e começar':'Entrar')+'</button><span id="loginError" role="alert"></span></form>';
 $('#loginForm').onsubmit=async e=>{e.preventDefault();const password=$('#password').value;if(setup&&password!==$('#confirmPassword').value){$('#loginError').textContent='As senhas não coincidem.';return}$('#loginButton').disabled=true;try{const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,mode:setup?'setup':'login'})});const result=await response.json();if(!response.ok)throw Error(result.error);await load()}catch(err){$('#loginError').textContent=err.message}finally{if($('#loginButton'))$('#loginButton').disabled=false}};
}
async function load(){try{`);
const old="$('#status').innerHTML='Seu espaço está pronto. <a href=\"/signin-with-chatgpt?return_to=/\" target=\"_top\">Entre com sua conta para começar ↗</a>';return";
html=html.replace(old,'await showLogin();return');
html=html.replace('href="/signout-with-chatgpt?return_to=/"','href="#" id="logout"');
html=html.replace("const b=e.target.closest('button');",`if(e.target.closest('#logout')){e.preventDefault();fetch('/api/auth',{method:'DELETE'}).then(()=>location.reload());return}const b=e.target.closest('button');`);
html=await buildPwa('public',html);
await writeFile('public/index.html',html);
console.log('Vercel: interface gerada em public/index.html.');
