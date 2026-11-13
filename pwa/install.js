(() => {
  const button=document.querySelector('#installApp');
  const dialog=document.querySelector('#installDialog');
  const nativeButton=document.querySelector('#nativeInstall');
  const updateButton=document.querySelector('#updateApp');
  const updateDialog=document.querySelector('#updateDialog');
  const updateConfirm=document.querySelector('#confirmUpdate');
  const updateStatus=document.querySelector('#updateStatus');
  const instructions=document.querySelector('#installInstructions');
  const feedback=document.querySelector('#installFeedback');
  let promptEvent=null,waitingWorker=null,updateRequested=false,installRequested=false,installTimer=null;
  const canonicalHost='appfinanceiro-rust-six.vercel.app';
  const alternateHost=location.hostname!==canonicalHost&&location.hostname.endsWith('.vercel.app');
  document.querySelector('#installAddress').hidden=!alternateHost;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||new URLSearchParams(location.search).get('source')==='android-apk'||document.referrer.startsWith('android-app://br.com.coimbracaua.bolso');
  const sync=()=>{const installed=standalone();const apkDownload=document.querySelector('#apkDownload');if(apkDownload)apkDownload.hidden=installed;button.hidden=false;button.setAttribute('aria-label',installed?'Aplicativo instalado — ver opções':'Instalar o Bolso');button.title=installed?'Aplicativo instalado — ver opções':'Instalar o Bolso';nativeButton.hidden=installed||!promptEvent||alternateHost;instructions.hidden=installed;document.querySelector('#installSummary').textContent=installed?'O Bolso já está instalado neste dispositivo.':'Adicione o Bolso à sua tela inicial para abrir como um aplicativo.'};
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const android=/Android/.test(navigator.userAgent);
  instructions.innerHTML=ios
    ? '<p>No iPhone ou iPad, abra este endereço no <strong>Safari</strong>:</p><ol><li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li><li>Escolha <strong>Adicionar à Tela de Início</strong>.</li><li>Se aparecer, ative <strong>Abrir como App</strong> e toque em <strong>Adicionar</strong>.</li></ol>'
    : android
    ? '<p>No Android, use o endereço principal no <strong>Chrome</strong>:</p><ol><li>Toque no menu <strong>⋮</strong> do navegador.</li><li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li><li>Confirme a instalação e procure <strong>Bolso na lista de aplicativos</strong>.</li><li>Para colocar na tela inicial, segure o ícone de Bolso e arraste-o.</li></ol><p>Se continuar em Instalando, cancele a tentativa pendente, atualize o Chrome e confira sua conexão antes de tentar novamente.</p>'
    : '<p>No computador, abra no <strong>Chrome ou Edge</strong>:</p><ol><li>Clique no ícone de instalação na barra de endereços, quando disponível.</li><li>Ou abra o menu <strong>⋮ → Instalar Bolso</strong> (pode estar em Aplicativos ou Salvar e compartilhar).</li><li>Confirme para abrir o Bolso em sua própria janela.</li></ol>';
  button.addEventListener('click',()=>{sync();dialog.showModal();if(installRequested)feedback.textContent='O Chrome recebeu sua solicitação. Procure Bolso na lista de aplicativos do Android. Se estiver pendente, siga as instruções abaixo.'});
  document.querySelector('#closeInstall').addEventListener('click',()=>dialog.close());
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;sync()});
  nativeButton.addEventListener('click',async()=>{
    if(!promptEvent)return;
    const current=promptEvent;promptEvent=null;sync();
    try{await current.prompt();const result=await current.userChoice;if(result.outcome==='accepted'){installRequested=true;feedback.textContent='Solicitação enviada ao Android. Aguarde e procure Bolso na lista de aplicativos. O ícone pode não ser adicionado automaticamente à tela inicial.';installTimer=setTimeout(()=>{if(!standalone())feedback.textContent='Se a instalação continua pendente, cancele a tentativa no Chrome e tente pelo endereço principal. Se Bolso já aparece na lista de apps, segure o ícone e arraste-o para a tela inicial.'},30000)}else feedback.textContent='Você pode instalar depois pelo menu do navegador.'}
    catch{feedback.textContent='Use as instruções abaixo para instalar pelo navegador.'}
  });
  window.addEventListener('appinstalled',()=>{promptEvent=null;installRequested=true;sync();feedback.textContent='O Chrome aceitou a instalação. No Android, procure Bolso na lista de aplicativos; para colocá-lo na tela inicial, segure o ícone e arraste. Aguarde a conclusão se ainda aparecer instalando.'});
  matchMedia('(display-mode: standalone)').addEventListener('change',sync);
  sync();
  if(new URLSearchParams(location.search).get('install')==='1')dialog.showModal();
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  let pendingNotice=false,lastNotifiedWorker=null,activationTimer=null;
  function showUpdateWhenReady(){
    if(!pendingNotice||document.visibilityState==='hidden'||document.querySelector('dialog[open]'))return;
    pendingNotice=false;
    updateDialog.showModal();
  }
  function offerUpdate(worker){
    waitingWorker=worker;
    updateButton.hidden=false;
    feedback.textContent='Uma nova versão está disponível. Salve seus lançamentos antes de atualizar.';
    if(lastNotifiedWorker!==worker){
      lastNotifiedWorker=worker;
      pendingNotice=true;
      showUpdateWhenReady();
    }
  }
  // Wait until an open financial or installation dialog has closed.
  document.addEventListener('close',showUpdateWhenReady,true);
  document.querySelector('#laterUpdate').addEventListener('click',()=>updateDialog.close());
  updateButton.addEventListener('click',()=>{
    pendingNotice=true;
    dialog.close();
    showUpdateWhenReady();
  });
  updateDialog.addEventListener('cancel',event=>{if(updateRequested)event.preventDefault()});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(updateRequested){clearTimeout(activationTimer);location.reload()}
  });
  updateConfirm.addEventListener('click',()=>{
    if(!waitingWorker||updateRequested)return;
    updateRequested=true;
    updateConfirm.disabled=true;
    document.querySelector('#laterUpdate').disabled=true;
    updateStatus.textContent='Atualizando…';
    const failed=()=>{
      updateRequested=false;
      updateConfirm.disabled=false;
      document.querySelector('#laterUpdate').disabled=false;
      updateStatus.textContent='Não foi possível concluir a atualização. Tente novamente ou reabra o aplicativo.';
    };
    try{
      waitingWorker.postMessage({type:'SKIP_WAITING'});
      activationTimer=setTimeout(failed,15000);
    }catch{failed()}
  });
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      if(registration.waiting)offerUpdate(registration.waiting);
      const watch=worker=>{
        if(!worker)return;
        const changed=()=>{
          if(worker.state==='installed'&&registration.waiting&&navigator.serviceWorker.controller)offerUpdate(registration.waiting);
        };
        worker.addEventListener('statechange',changed);
        changed();
      };
      registration.addEventListener('updatefound',()=>watch(registration.installing));
      watch(registration.installing);
      let checking=false;
      const check=async()=>{
        showUpdateWhenReady();
        if(checking||document.visibilityState==='hidden'||!navigator.onLine)return;
        checking=true;
        try{await registration.update()}catch{/* Retry when online or visible again. */}finally{checking=false}
      };
      window.addEventListener('focus',check);
      window.addEventListener('online',check);
      document.addEventListener('visibilitychange',check);
      setInterval(check,5*60*1000);
    }catch(error){console.warn('Bolso: instalação offline indisponível.',error);feedback.textContent='Para instalar, mantenha a conexão ativa e entre na sua conta Vercel se solicitado. Depois recarregue a página.'}
  });
})();
