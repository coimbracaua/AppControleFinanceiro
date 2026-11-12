(() => {
  const button=document.querySelector('#installApp');
  const dialog=document.querySelector('#installDialog');
  const nativeButton=document.querySelector('#nativeInstall');
  const updateButton=document.querySelector('#updateApp');
  const instructions=document.querySelector('#installInstructions');
  const feedback=document.querySelector('#installFeedback');
  let promptEvent=null,waitingWorker=null,updateRequested=false;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const sync=()=>{const installed=standalone();button.hidden=false;button.textContent=installed?'✓ Aplicativo instalado':'↓ Instalar o Bolso';nativeButton.hidden=installed||!promptEvent;instructions.hidden=installed;document.querySelector('#installSummary').textContent=installed?'O Bolso já está instalado neste dispositivo.':'Adicione o Bolso à sua tela inicial para abrir como um aplicativo.'};
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const android=/Android/.test(navigator.userAgent);
  instructions.innerHTML=ios
    ? '<p>No iPhone ou iPad, abra este endereço no <strong>Safari</strong>:</p><ol><li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li><li>Escolha <strong>Adicionar à Tela de Início</strong>.</li><li>Se aparecer, ative <strong>Abrir como App</strong> e toque em <strong>Adicionar</strong>.</li></ol>'
    : android
    ? '<p>No Android, abra este endereço no <strong>Chrome</strong>:</p><ol><li>Toque no menu <strong>⋮</strong> do navegador.</li><li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li><li>Confirme a instalação.</li></ol>'
    : '<p>No computador, abra no <strong>Chrome ou Edge</strong>:</p><ol><li>Clique no ícone de instalação na barra de endereços, quando disponível.</li><li>Ou abra o menu <strong>⋮ → Instalar Bolso</strong> (pode estar em Aplicativos ou Salvar e compartilhar).</li><li>Confirme para abrir o Bolso em sua própria janela.</li></ol>';
  button.addEventListener('click',()=>{sync();dialog.showModal()});
  document.querySelector('#closeInstall').addEventListener('click',()=>dialog.close());
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;sync()});
  nativeButton.addEventListener('click',async()=>{
    if(!promptEvent)return;
    const current=promptEvent;promptEvent=null;sync();
    try{await current.prompt();const result=await current.userChoice;if(result.outcome==='accepted')dialog.close();else feedback.textContent='Você pode instalar depois pelo menu do navegador.'}
    catch{feedback.textContent='Use as instruções abaixo para instalar pelo navegador.'}
  });
  window.addEventListener('appinstalled',()=>{promptEvent=null;button.hidden=true;dialog.close()});
  matchMedia('(display-mode: standalone)').addEventListener('change',sync);
  sync();
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateRequested)location.reload()});
  function offerUpdate(worker){waitingWorker=worker;updateButton.hidden=false;feedback.textContent='Uma nova versão está disponível. Salve seus lançamentos antes de atualizar.'}
  updateButton.addEventListener('click',()=>{
    if(!waitingWorker)return;
    if(!confirm('Atualizar o Bolso agora? A página será recarregada. Salve primeiro qualquer formulário em andamento.'))return;
    updateRequested=true;waitingWorker.postMessage({type:'SKIP_WAITING'});
  });
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      if(registration.waiting)offerUpdate(registration.waiting);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(worker)});
      });
    }catch(error){console.warn('Bolso: instalação offline indisponível.',error);feedback.textContent='Para instalar, mantenha a conexão ativa e entre na sua conta Vercel se solicitado. Depois recarregue a página.'}
  });
})();
