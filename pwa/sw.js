const CACHE='bolso-pwa-__VERSION__';
const ASSETS=['/offline.html','/manifest.webmanifest','/install.js','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/icons/apple-touch-icon.png','/icons/favicon-32.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(ASSETS.map(async path=>{
      const response=await fetch(new Request(new URL(path,self.location.origin),{credentials:'same-origin',cache:'reload',redirect:'error'}));
      if(!response.ok)throw Error('Não foi possível preparar o aplicativo.');
      await cache.put(path,response);
    }));
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await Promise.all((await caches.keys()).filter(key=>key.startsWith('bolso-pwa-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    // Não armazenar páginas autenticadas, saldos, senhas ou registros financeiros.
    event.respondWith(fetch(request).catch(async()=>{
      const offline=await (await caches.open(CACHE)).match('/offline.html');
      return offline||new Response('Sem conexão. Conecte-se e tente novamente.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }));
    return;
  }
  if(ASSETS.includes(url.pathname))event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    return (await cache.match(url.pathname))||fetch(request);
  })());
});
