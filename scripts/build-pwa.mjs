import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return(crc^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([size,name,data,crc])}
function icon(size){
 const rows=Buffer.alloc((size*4+1)*size),dark=[25,62,54],light=[218,232,174];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let hits=0;
  for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
   const px=(x+(sx+.5)/4)/size,py=(y+(sy+.5)/4)/size,dist=Math.hypot(px-.49,py-.56);
   const stem=px>=.29&&px<=.40&&py>=.23&&py<=.76;
   const ring=dist<=.20&&dist>=.095;
   const dot=Math.hypot(px-.75,py-.70)<=.045;
   if(stem||ring||dot)hits++;
  }
  const pos=y*(size*4+1)+1+x*4;
  for(let c=0;c<3;c++)rows[pos+c]=Math.round(dark[c]+(light[c]-dark[c])*hits/16);
  rows[pos+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
export async function buildPwa(directory,html){
 await mkdir(directory+'/icons',{recursive:true});
 const inputs=await Promise.all(['manifest.webmanifest','offline.html','install.js','sw.js'].map(p=>readFile('pwa/'+p,'utf8')));
 const version=createHash('sha256').update(inputs.join('')+html+icon.toString()).digest('hex').slice(0,12);
 for(const [i,path]of ['manifest.webmanifest','offline.html','install.js','sw.js'].entries())await writeFile(directory+'/'+path,inputs[i].replaceAll('__VERSION__',version));
 for(const [name,size]of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32]])await writeFile(directory+'/icons/'+name,icon(size));
 const head='<link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials"><link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png"><link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Bolso"><meta name="mobile-web-app-capable" content="yes">';
 const install='<button id="installApp" class="secondary" style="margin-top:22px;font-size:12px">↓ Instalar o Bolso</button>';
 const dialog='<dialog id="installDialog" class="modal" aria-labelledby="installTitle"><div class="row"><h2 id="installTitle">Seu Bolso, sempre por perto.</h2><button id="closeInstall" class="text" aria-label="Fechar instruções de instalação">✕</button></div><p id="installSummary">Adicione o Bolso à sua tela inicial para abrir como um aplicativo.</p><button id="nativeInstall" style="margin:18px 0" hidden>Instalar agora</button><p id="installAddress" style="margin-top:14px;font-size:13px" hidden>Instale pelo endereço principal do Bolso. Você precisará entrar novamente com sua senha.<br><a id="canonicalInstall" href="https://appfinanceiro-rust-six.vercel.app/?install=1" style="color:var(--green);font-weight:600">Abrir endereço de instalação ↗</a></p><div id="installInstructions" style="margin-top:18px;line-height:1.8"></div><p style="font-size:12px;margin-top:16px">Os lançamentos e saldos precisam de internet. Sua senha continua protegendo o acesso ao app instalado.</p><p id="installFeedback" role="status" style="margin-top:14px;font-size:12px"></p><button id="updateApp" class="secondary" style="margin-top:16px" hidden>Atualizar aplicativo</button></dialog><script src="/install.js" defer></script>';
 return html.replace('</head>',head+'</head>').replace('</nav>','</nav>'+install).replace('</body>',dialog+'</body>');
}
