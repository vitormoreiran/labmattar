/* LABMATTAR / Biblioteca de mídia — conexão individual e leitura privada.
 * Este módulo integra o seletor de fotografia existente. Nenhum token é
 * persistido no cliente. A composição segue funcional sem OAuth configurado.
 */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const root=by("labAcervo"),overlay=by("labAcervoDialog");
  const dialog=overlay?.querySelector('[role="dialog"]');
  const list=by("labAcervoItems"),notice=by("labAcervoStatus");
  if(!root||!overlay||!dialog||!list||!notice)return;
  const BASE="/api/acervo/";
  // Fixed, user-selected LABMATTAR library. Never request broad Drive access
  // or display unrelated account folders in our default selection view.
  const PORTFOLIO_FOLDER_ID="13SMGPjdZF3jxEmM4OmWi0T1OoBPCNJqW";
  const PORTFOLIO_URL="https://drive.google.com/drive/folders/"+PORTFOLIO_FOLDER_ID;
  const providers=["google","dropbox"];
  const serviceNames={google:"Google Drive",dropbox:"Dropbox",public:"01_Portfolio",local:"Computador"};
  const setup=by("labAcervoSetup"),browser=by("labAcervoBrowser");
  const launch=by("labAcervoLaunch"),sources=by("labAcervoProviders");
  const localInput=by("labAcervoLocalInput"),search=by("labAcervoSearch");
  let publicIndex=null,publicTrail=[],publicCurrent=null;
  const publicProjects=new Map(),localVideoUrls=new Map();
  const pool=new Map();
  let statusData=null,activeProvider=null,folder="",cursor="",entries=[];
  let selected=null,busy=false,previousFocus=null;

  const notify=message=>{notice.textContent=message||""};
  const escapeName=name=>String(name||"Arquivo").slice(0,180);
  function setBusy(flag){
    busy=Boolean(flag);
    root.dataset.busy=String(busy);
    for(const provider of providers)by("labAcervoConnect-"+provider).disabled=busy;
    by("labAcervoBack").disabled=busy;
    by("labAcervoMore").disabled=busy;
  }
  async function api(path,options){
    const response=await fetch(BASE+path,{credentials:"same-origin",cache:"no-store",...options});
    if(!response.ok){
      let message="";
      try{message=(await response.json())?.error||""}catch{}
      throw Error(message||"Não foi possível acessar o acervo. Verifique sua conexão.");
    }
    return response.json();
  }
  function valid(item){
    return item && [...providers,"public"].includes(item.provider) &&
      typeof item.id==="string" && item.id.length<220 &&
      ["image","video"].includes(item.kind) &&
      typeof item.original==="string" &&
      item.original.startsWith(BASE+(item.provider==="public"?"public-media?":"media?")) &&
      typeof item.name==="string";
  }
  function displayProviders(){
    sources.hidden=false;
    setup.hidden=true;
    browser.hidden=true;
    activeProvider=null;
    for(const provider of providers)
      by("labAcervoConnect-"+provider).removeAttribute("aria-current");
  }
  function chooseVisual(provider){
    for(const name of providers)
      by("labAcervoConnect-"+name).setAttribute("aria-current",String(name===provider));
  }
  function setConnectionState(provider,state){
    const label=by("labAcervoConnection-"+provider);
    label.textContent=state.connected?"Conectado · Abrir arquivos":
      state.configured?"Conectar sua conta":"Ativação pendente";
    by("labAcervoDisconnect-"+provider).hidden=!state.connected;
  }
  async function refresh(){
    statusData=await api("status");
    for(const provider of providers){
      const state=statusData.providers?.[provider];
      if(!state)throw Error("O servidor não retornou o estado das contas.");
      setConnectionState(provider,state);
    }
    return statusData;
  }
  function showSetup(provider){
    chooseVisual(provider);
    const name=serviceNames[provider];
    by("labAcervoSetupTitle").textContent=name+" ainda não está habilitado";
    by("labAcervoSetupText").textContent=
      "Para conectar sua conta, o administrador precisa registrar o aplicativo "+name+
      " e configurar suas credenciais OAuth no Cloudflare. Isso é feito uma única vez e não requer sua senha no Laboratório.";
    browser.hidden=true;
    setup.hidden=false;
    notify("O seletor de arquivos locais continua disponível.");
  }
  function openDialog({autoProvider=null,returnedFromOAuth=false}={}){
    if(!overlay.hidden)return;
    previousFocus=document.activeElement;
    overlay.hidden=false;
    displayProviders();
    notify(autoProvider?"Verificando a conexão. Abrindo seus arquivos…":"Selecione a origem das fotografias.");
    dialog.focus({preventScroll:true});
    refresh().then(async state=>{
      // The OAuth callback returned to Compor. Complete the same action the
      // user originally requested; do not require a second click to open Drive.
      if(autoProvider && providers.includes(autoProvider)){
        if(!state.providers?.[autoProvider]?.configured){
          showSetup(autoProvider);
        }else if(returnedFromOAuth && !state.providers?.[autoProvider]?.connected){
          notify("O Google não confirmou a sessão neste navegador. Clique em Google Drive para tentar novamente ou abra a pasta diretamente pelo link abaixo.");
        }else{
          await openProvider(autoProvider);
        }
      }else{
        notify("Selecione a origem das fotografias.");
      }
    }).catch(error=>notify("Não foi possível verificar a conexão: "+error.message));
  }
  function closeDialog(){
    overlay.hidden=true;
    displayProviders();
    notify("");
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    else launch.focus({preventScroll:true});
  }
  function heading(){
    by("labAcervoPath").textContent=activeProvider==="public"?
      "01_Portfolio"+(publicTrail.length?" / "+publicTrail.map(x=>x.name).join(" / "):""):
      activeProvider==="dropbox"?(folder||"Dropbox / Seus arquivos"):"Google Drive / 01_Portfolio";
    by("labAcervoBack").hidden=activeProvider==="public"?!publicTrail.length:activeProvider!=="dropbox"||!folder;
    by("labAcervoMore").hidden=activeProvider!=="dropbox"||!cursor;
    if(search)search.hidden=activeProvider!=="public";
  }
  function show(items,append=false){
    if(!append)list.replaceChildren();
    if(!append&&!items.length){
      const empty=document.createElement("p");
      empty.className="lm-acervo-empty";
      empty.textContent="Nenhuma fotografia ou vídeo encontrado nesta pasta.";
      list.append(empty);
    }
    for(const item of items){
      const button=document.createElement("button");
      button.type="button";
      button.className="lm-acervo-item";
      if(item.kind==="folder"){
        button.classList.add("lm-acervo-folder");
        const glyph=document.createElement("span");
        glyph.textContent="▱";glyph.setAttribute("aria-hidden","true");
        const name=document.createElement("span");
        name.textContent=escapeName(item.name);
        button.append(glyph,name);
        button.addEventListener("click",()=>{
          if(activeProvider==="public")openPublicFolder(item);
          else openDropbox(item.path);
        });
      }else if(valid(item)){
        const thumb=document.createElement("span");thumb.className="lm-acervo-thumb";
        if(item.kind==="image"){
          const image=document.createElement("img");
          image.loading="lazy";image.alt="";image.src=item.preview;
          image.addEventListener("error",()=>{image.hidden=true;thumb.textContent="IMAGEM"});
          thumb.append(image);
        }else thumb.textContent="VÍDEO";
        const meta=document.createElement("span");meta.className="lm-acervo-item-meta";
        const name=document.createElement("strong");name.textContent=escapeName(item.name);
        const kind=document.createElement("small");
        kind.textContent=item.kind==="video"?"Vídeo · adicionar à página":"Fotografia · usar como fundo";
        meta.append(name,kind);button.append(thumb,meta);
        button.addEventListener("click",()=>select(item));
      }else continue;
      list.append(button);
    }
  }
  async function openDropbox(path="",append=false){
    if(busy)return;
    setBusy(true);activeProvider="dropbox";
    try{
      if(!append){folder=path;cursor="";entries=[]}
      const qs=new URLSearchParams({path:folder});
      if(append&&cursor)qs.set("cursor",cursor);
      const data=await api("dropbox/list?"+qs.toString());
      entries.push(...(data.entries||[]));
      cursor=data.cursor||"";
      heading();show(data.entries||[],append);
      notify(entries.length+" itens encontrados. Selecione uma fotografia ou vídeo.");
    }catch(error){notify(error.message)}
    finally{setBusy(false)}
  }
  async function openGoogle(){
    if(busy)return;
    activeProvider="google";folder="";cursor="";
    setBusy(true);
    try{
      const config=statusData?.picker;
      if(!config?.apiKey||!config?.appId)
        throw Error("A seleção do Drive ainda não está configurada no servidor.");
      const token=await api("picker-token",{
        method:"POST",headers:{"Content-Type":"application/json"},body:"{}"
      });
      if(!window.gapi){
        await new Promise((resolve,reject)=>{
          const script=document.createElement("script");
          script.src="https://apis.google.com/js/api.js";script.async=true;
          script.onload=resolve;script.onerror=()=>reject(Error("Não foi possível abrir o Google Picker."));
          document.head.append(script);
        });
      }
      await new Promise((resolve,reject)=>{
        window.gapi.load("picker",{
          callback:resolve,onerror:()=>reject(Error("Falha ao carregar o Google Picker."))
        });
      });
      if(!window.google?.picker)throw Error("Google Picker indisponível.");
      const picker=window.google.picker;
      const view=new picker.DocsView(picker.ViewId.DOCS);
      // Start in the one authorized portfolio folder, not in My Drive.
      // Keep subfolders visible because 01_Portfolio groups media by project.
      view.setParent(PORTFOLIO_FOLDER_ID);
      view.setIncludeFolders(true);
      view.setSelectFolderEnabled(false);
      // With drive.file, Google recommends LIST until individual items are picked.
      if(picker.DocsViewMode?.LIST)view.setMode(picker.DocsViewMode.LIST);
      view.setMimeTypes("image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime");
      const instance=new picker.PickerBuilder()
        .addView(view).setOAuthToken(token.accessToken).setDeveloperKey(config.apiKey)
        .setAppId(config.appId).setOrigin(location.origin).setLocale("pt-BR")
        .setTitle("LABMATTAR · 01_Portfolio")
        .enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .setCallback(async data=>{
          if(data.action===picker.Action.CANCEL){
            overlay.hidden=false;displayProviders();notify("Seleção cancelada.");
            dialog.focus({preventScroll:true});return;
          }
          if(data.action!==picker.Action.PICKED)return;
          const ids=(data.docs||[]).map(d=>d.id).filter(Boolean).slice(0,40);
          overlay.hidden=false;sources.hidden=true;browser.hidden=false;
          chooseVisual("google");
          heading();
          setBusy(true);
          try{
            const result=await api("google/inspect",{
              method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({ids})
            });
            entries=result.entries||[];show(entries);
            notify(entries.length+" arquivos autorizados. Selecione uma fotografia ou vídeo.");
          }catch(error){displayProviders();notify(error.message)}
          finally{setBusy(false)}
          dialog.focus({preventScroll:true});
        }).build();
      // If opening fails, keep our own dialog visible with a direct Drive link.
      // Hiding it *before* setVisible caused a blank screen on Picker failures.
      instance.setVisible(true);
      overlay.hidden=true;
    }catch(error){
      overlay.hidden=false;
      displayProviders();
      notify("Não foi possível abrir o seletor Google: "+error.message+
        ". Você pode conferir a pasta 01_Portfolio no link abaixo.");
      dialog.focus({preventScroll:true});
    }finally{setBusy(false)}
  }
  function select(item){
    if(!valid(item))return;
    if(item.kind==="video"){
      const descriptor={kind:"video",provider:item.provider,id:item.id,name:item.name,
        ...(item.projectId?{projectId:item.projectId}:{}),
        mimeType:item.mimeType,original:item.original,preview:item.preview};
      window.dispatchEvent(new CustomEvent("labmattar:acervo-video-select",{detail:descriptor}));
      by("labAcervoCurrent").textContent="Vídeo · "+item.name;
      closeDialog();
      return;
    }
    const key=item.provider+":"+item.id;
    const photoKey="ext-"+Array.from(new TextEncoder().encode(key))
      .reduce((n,v)=>(n*33+v)>>>0,5381).toString(36);
    const descriptor={provider:item.provider,id:item.id,name:item.name,
      ...(item.projectId?{projectId:item.projectId}:{}),
      mimeType:item.mimeType,original:item.original,preview:item.preview,photoKey};
    pool.set(photoKey,descriptor);
    selected=descriptor;
    window.dispatchEvent(new CustomEvent("labmattar:acervo-select",{detail:descriptor}));
    by("labAcervoCurrent").textContent=item.name+" · "+serviceNames[item.provider];
    closeDialog();
  }
  async function openProvider(provider){
    if(!providers.includes(provider)||busy)return;
    activeProvider=provider;
    chooseVisual(provider);
    setup.hidden=true;
    notify("Verificando conexão com "+serviceNames[provider]+"…");
    try{
      await refresh();
      const state=statusData.providers[provider];
      if(!state.configured){showSetup(provider);return}
      if(!state.connected){
        window.location.assign(BASE+"connect/"+provider);
        return;
      }
      sources.hidden=true;browser.hidden=false;setup.hidden=true;
      heading();
      notify("");
      if(provider==="google")await openGoogle();
      else await openDropbox();
    }catch(error){displayProviders();notify(error.message)}
  }
  root.addEventListener("click",event=>{
    if(event.target.closest("[data-acervo-open]"))
      openDialog({autoProvider:"google"});
  });
  overlay.addEventListener("click",event=>{
    if(event.target===overlay){closeDialog();return}
    const button=event.target.closest("[data-acervo-provider]");
    if(button)openProvider(button.dataset.acervoProvider);
  });
  by("labAcervoClose").addEventListener("click",closeDialog);
  by("labAcervoProvidersBack").addEventListener("click",()=>{
    const previous=activeProvider;
    displayProviders();notify("Selecione a origem das fotografias.");
    by("labAcervoConnect-"+(previous||"google")).focus({preventScroll:true});
  });
  by("labAcervoBack").addEventListener("click",()=>{
    const parent=folder.split("/").filter(Boolean).slice(0,-1);
    openDropbox(parent.length?"/"+parent.join("/"):"");
  });
  by("labAcervoMore").addEventListener("click",()=>openDropbox(folder,true));
  document.addEventListener("keydown",event=>{
    if(overlay.hidden)return;
    if(event.key==="Escape"){event.preventDefault();closeDialog();return}
    if(event.key!=="Tab")return;
    const focusables=[...dialog.querySelectorAll('button:not(:disabled):not([hidden]),a[href]')]
      .filter(el=>el.getClientRects().length>0);
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey && (document.activeElement===first||document.activeElement===dialog)){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey && document.activeElement===last){
      event.preventDefault();first.focus();
    }
  });
  for(const provider of providers){
    by("labAcervoDisconnect-"+provider).addEventListener("click",async()=>{
      if(!confirm("Desconectar "+serviceNames[provider]+" deste navegador?"))return;
      setBusy(true);
      try{
        await api("disconnect",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({provider})});
        for(const [key,item] of pool)if(item.provider===provider)pool.delete(key);
        if(selected?.provider===provider){
          selected=null;by("labAcervoCurrent").textContent="Fonte desconectada. Selecione outra fotografia.";
        }
        await refresh();
        displayProviders();
        notify("Conta desconectada. A autorização pode ser revogada também nas configurações do provedor.");
      }catch(error){notify(error.message)}
      finally{setBusy(false)}
    });
  }
  window.LabAcervo={
    has:key=>pool.has(key),
    get:key=>pool.get(key)||null,
    reopen:()=>selected?select({...selected}):null,
    open:options=>openDialog(options||{})
  };
  // No API requests on editor load. The library is opt-in and never blocks
  // local compositions or static build smoke tests.
  const result=new URL(location.href).searchParams.get("acervo");
  if(result){
    const url=new URL(location.href);url.searchParams.delete("acervo");
    history.replaceState(null,"",url.pathname+url.search+url.hash);
    if(providers.includes(result)){
      openDialog({autoProvider:result,returnedFromOAuth:true});
    }else{
      openDialog();
      const message=result==="erro"
        ?"Não foi possível concluir a autorização. Clique no serviço para tentar novamente."
        :result==="cancelado"
          ?"Autorização cancelada. Nenhuma conta foi conectada."
          :"Selecione a origem das fotografias.";
      // openDialog also checks availability, but preserve the OAuth error.
      if(result==="erro"||result==="cancelado")queueMicrotask(()=>notify(message));
    }
  }
})();
