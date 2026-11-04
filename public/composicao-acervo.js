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
  const filterBar=by("labAcervoFilters"),localDialog=by("labAcervoLocalDialog");
  let publicIndex=null,publicTrail=[],publicCurrent=null,mediaFilter="all",currentPublicItems=[];
  let publicRenderRevision=0;
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
    document.body.classList.add("lm-acervo-open");
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
    document.body.classList.remove("lm-acervo-open");
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
    if(search)search.parentElement.hidden=activeProvider!=="public";
    if(filterBar)filterBar.hidden=activeProvider!=="public";
    by("labAcervoProvidersBack").hidden=activeProvider==="public";
  }
  function groupFor(kind){
    let section=list.querySelector('[data-acervo-group="'+kind+'"]');
    if(section)return section.querySelector('.lm-acervo-group-grid');
    section=document.createElement("section");
    section.className="lm-acervo-group";
    section.dataset.acervoGroup=kind;
    const header=document.createElement("div");
    header.className="lm-acervo-group-heading";
    const label=document.createElement("strong");
    label.textContent=kind==="folder"?"PASTAS":"FOTOGRAFIAS E VÍDEOS";
    const count=document.createElement("span");
    count.className="lm-acervo-group-count";
    header.append(label,count);
    const grid=document.createElement("div");
    grid.className="lm-acervo-group-grid "+(kind==="folder"?"lm-acervo-folder-grid":"lm-acervo-media-grid");
    section.append(header,grid);
    // Keep folder navigation above media, even with paginated sources.
    if(kind==="folder"&&list.firstChild)list.prepend(section);
    else list.append(section);
    return grid;
  }
  function show(items,append=false){
    if(!append){list.replaceChildren();list.scrollTop=0;}
    if(!append&&!items.length){
      const empty=document.createElement("p");
      empty.className="lm-acervo-empty";
      empty.textContent="Nenhum resultado nesta pasta. Ajuste a busca ou volte à pasta anterior."
      list.append(empty);return;
    }
    for(const item of items){
      const button=document.createElement("button");
      button.type="button";
      button.className="lm-acervo-item";
      button.title=escapeName(item.name);
      if(item.kind==="folder"){
        button.classList.add("lm-acervo-folder");
        button.setAttribute("aria-label","Abrir pasta "+escapeName(item.name));
        const glyph=document.createElement("span");
        glyph.className="lm-acervo-folder-icon";
        glyph.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6.5h6l2.1 2H20.5v10H3.5z"/><path d="M3.5 8.5V6.5a2 2 0 0 1 2-2h4"/></svg>';
        const name=document.createElement("span");
        name.className="lm-acervo-folder-name";
        name.textContent=escapeName(item.name);
        const arrow=document.createElement("span");
        arrow.className="lm-acervo-folder-arrow";
        arrow.textContent="›";arrow.setAttribute("aria-hidden","true");
        button.append(glyph,name,arrow);
        button.addEventListener("click",()=>{
          if(activeProvider==="public")openPublicFolder(item);
          else openDropbox(item.path);
        });
        groupFor("folder").append(button);
      }else if(valid(item)){
        button.classList.add("lm-acervo-file");
        if(item.kind==="video")button.classList.add("lm-acervo-video");
        button.setAttribute("aria-label","Selecionar "+(item.kind==="video"?"vídeo ":"fotografia ")+escapeName(item.name));
        const thumb=document.createElement("span");
        thumb.className="lm-acervo-thumb";
        const image=document.createElement("img");
        image.loading="lazy";image.decoding="async";image.alt="";
        image.addEventListener("error",()=>{image.hidden=true;thumb.classList.add("is-missing")});
        image.src=item.preview;
        const fallback=document.createElement("span");
        fallback.className="lm-acervo-thumb-label";
        fallback.textContent=item.kind==="video"?"VÍDEO":"IMAGEM";
        thumb.append(image,fallback);
        if(item.kind==="video"){
          const play=document.createElement("span");
          play.className="lm-acervo-play";
          play.textContent="▶";play.setAttribute("aria-hidden","true");
          thumb.append(play);
        }
        const meta=document.createElement("span");
        meta.className="lm-acervo-item-meta";
        const name=document.createElement("strong");
        name.textContent=escapeName(item.name);
        const kind=document.createElement("small");
        kind.textContent=item.kind==="video"?"VÍDEO":"FOTOGRAFIA";
        meta.append(name,kind);button.append(thumb,meta);
        button.addEventListener("click",()=>select(item));
        groupFor("media").append(button);
      }
    }
    for(const section of list.querySelectorAll(".lm-acervo-group")){
      const count=section.querySelector(".lm-acervo-group-grid").childElementCount;
      section.querySelector(".lm-acervo-group-count").textContent=String(count).padStart(2,"0");
    }
  }

  async function publicJson(path){
    const res=await fetch("/acervo/"+path,{cache:"no-store",credentials:"omit"});
    if(!res.ok)throw Error("Não foi possível carregar o índice de 01_Portfolio.");
    return res.json();
  }
  function publicItem(entry,projectId){
    if(entry.kind==="folder")return {...entry,projectId};
    const query="project="+encodeURIComponent(projectId)+"&id="+encodeURIComponent(entry.id);
    return {provider:"public",projectId,id:entry.id,name:entry.name,kind:entry.kind,
      mimeType:entry.mime,original:BASE+"public-media?"+query,
      preview:BASE+"public-thumb?"+query,size:entry.size||0};
  }
  function paintPublicItems(){
    const folders=currentPublicItems.filter(x=>x.kind==="folder").length;
    const photos=currentPublicItems.filter(x=>x.kind==="image").length;
    const videos=currentPublicItems.filter(x=>x.kind==="video").length;
    if(filterBar){
      filterBar.hidden=activeProvider!=="public"||photos+videos===0;
      for(const button of filterBar.querySelectorAll("[data-acervo-filter]")){
        const mode=button.dataset.acervoFilter;
        const count=mode==="all"?photos+videos:mode==="image"?photos:videos;
        button.setAttribute("aria-pressed",String(mediaFilter===mode));
        const counter=button.querySelector(".lm-acervo-filter-count");
        if(counter)counter.textContent=String(count);
      }
    }
    const visible=currentPublicItems.filter(x=>x.kind==="folder"||mediaFilter==="all"||x.kind===mediaFilter);
    show(visible);
    const parts=[];
    if(folders)parts.push(folders+(folders===1?" pasta":" pastas"));
    if(photos||videos)parts.push(photos+videos+(photos+videos===1?" arquivo":" arquivos"));
    notify((parts.join(" · ")||"Nenhum item")+" · "+
      (publicTrail.length?"Clique em uma fotografia ou vídeo para inserir.":"Abra uma pasta para explorar os projetos."));
  }
  async function renderPublic(){
    if(activeProvider!=="public")return;
    const revision=++publicRenderRevision;
    setBusy(true);sources.hidden=true;setup.hidden=true;browser.hidden=false;
    try{
      if(!publicIndex){
        const data=await publicJson("index.json");
        if(data.rootId!==PORTFOLIO_FOLDER_ID||!Array.isArray(data.projects))
          throw Error("Índice do acervo incompatível.");
        publicIndex=data;
      }
      const query=(search?.value||"").trim().toLocaleLowerCase("pt-BR");
      let items=[];
      if(!publicTrail.length){
        items=publicIndex.projects.map(p=>({kind:"folder",projectId:p.id,
          id:p.id,name:p.name}));
      }else{
        const projectId=publicTrail[0].projectId,folderId=publicTrail[publicTrail.length-1].id;
        let project=publicProjects.get(projectId);
        if(!project){
          project=await publicJson("projects/"+encodeURIComponent(projectId)+".json");
          if(project.projectId!==projectId||!Array.isArray(project.entries))
            throw Error("Pasta do projeto incompatível.");
          publicProjects.set(projectId,project);
        }
        const choices=project.entries.filter(x=>x.parent===folderId&&
          (!query||x.name.toLocaleLowerCase("pt-BR").includes(query)));
        items=choices.sort((a,b)=>(a.kind==="folder"?0:1)-(b.kind==="folder"?0:1)||
          a.name.localeCompare(b.name,"pt-BR",{numeric:true}))
          .map(x=>publicItem(x,projectId));
      }
      if(query&&!publicTrail.length)items=items.filter(x=>x.name.toLocaleLowerCase("pt-BR").includes(query));
      if(revision!==publicRenderRevision)return;
      heading();currentPublicItems=items;paintPublicItems();
    }catch(error){
      if(revision===publicRenderRevision){list.replaceChildren();notify(error.message);}
    }finally{if(revision===publicRenderRevision)setBusy(false);}
  }
  function openPublicFolder(item){
    if(!item?.id)return;
    const projectId=item.projectId||publicTrail[0]?.projectId;
    mediaFilter="all";publicTrail.push({id:item.id,name:item.name,projectId});
    if(search)search.value="";
    renderPublic().catch(error=>notify(error.message));
  }
  function openPublic(){
    if(!overlay.hidden){if(activeProvider==="public")return;displayProviders();}
    else{
      previousFocus=document.activeElement;
      overlay.hidden=false;
      document.body.classList.add("lm-acervo-open");
      dialog.focus({preventScroll:true});
    }
    activeProvider="public";publicTrail=[];mediaFilter="all";
    if(search)search.value="";
    sources.hidden=true;setup.hidden=true;browser.hidden=false;
    notify("Carregando 01_Portfolio…");
    renderPublic().catch(error=>notify(error.message));
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
            overlay.hidden=false;document.body.classList.add("lm-acervo-open");displayProviders();notify("Seleção cancelada.");
            dialog.focus({preventScroll:true});return;
          }
          if(data.action!==picker.Action.PICKED)return;
          const ids=(data.docs||[]).map(d=>d.id).filter(Boolean).slice(0,40);
          overlay.hidden=false;document.body.classList.add("lm-acervo-open");sources.hidden=true;browser.hidden=false;
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
      document.body.classList.remove("lm-acervo-open");
    }catch(error){
      overlay.hidden=false;
      document.body.classList.add("lm-acervo-open");
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
    if(event.target.closest("[data-acervo-open]"))openPublic();
  });
  overlay.addEventListener("click",event=>{
    if(event.target===overlay){closeDialog();return}
    const button=event.target.closest("[data-acervo-provider]");
    if(button)openProvider(button.dataset.acervoProvider);
  });
  by("labAcervoClose").addEventListener("click",closeDialog);
  by("labAcervoProvidersBack").addEventListener("click",()=>{
    if(activeProvider==="public"){publicTrail=[];renderPublic();return;}
    const previous=activeProvider;
    displayProviders();notify("Selecione a origem das fotografias.");
    by("labAcervoConnect-"+(previous||"google")).focus({preventScroll:true});
  });
  by("labAcervoBack").addEventListener("click",()=>{
    if(activeProvider==="public"){
      publicTrail.pop();mediaFilter="all";if(search)search.value="";
      renderPublic().catch(error=>notify(error.message));return;
    }
    const parent=folder.split("/").filter(Boolean).slice(0,-1);
    openDropbox(parent.length?"/"+parent.join("/"):"");
  });
  search?.addEventListener("input",()=>{
    if(activeProvider==="public")renderPublic().catch(error=>notify(error.message));
  });
  filterBar?.addEventListener("click",event=>{
    const button=event.target.closest("[data-acervo-filter]");
    if(!button||activeProvider!=="public")return;
    const mode=button.dataset.acervoFilter;
    if(!["all","image","video"].includes(mode))return;
    mediaFilter=mode;paintPublicItems();
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

  function localDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)){reject(Error("Este navegador não oferece armazenamento local de vídeos."));return;}
      const req=indexedDB.open("labmattar-midia-local",1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("videos"))
        req.result.createObjectStore("videos");};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(Error("Não foi possível abrir a biblioteca local deste navegador."));
    });
  }
  async function saveLocalVideo(file,id){
    const db=await localDb();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction("videos","readwrite");
        tx.objectStore("videos").put({blob:file,name:file.name,mime:file.type},id);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(Error("Sem espaço para salvar o vídeo local. Libere armazenamento ou use outro arquivo."));
        tx.onabort=()=>reject(Error("Armazenamento do vídeo interrompido."));
      });
    }finally{db.close();}
  }
  async function localVideoBlob(id){
    if(!/^local-[a-f0-9-]{36}$/.test(id||""))throw Error("Vídeo local inválido.");
    const db=await localDb();
    try{return await new Promise((resolve,reject)=>{
      const req=db.transaction("videos","readonly").objectStore("videos").get(id);
      req.onsuccess=()=>req.result?.blob?resolve(req.result.blob):reject(Error("Vídeo não encontrado neste navegador."));
      req.onerror=()=>reject(Error("Não foi possível ler o vídeo local."));
    });}finally{db.close();}
  }
  async function localVideoUrl(id){
    if(localVideoUrls.has(id))return localVideoUrls.get(id);
    const blob=await localVideoBlob(id),url=URL.createObjectURL(blob);
    localVideoUrls.set(id,url);return url;
  }
  async function optimizeImage(file){
    if(file.size>45*1024*1024)throw Error("Fotografia acima de 45 MB. Use uma versão menor.");
    const bitmap=await createImageBitmap(file).catch(()=>{
      throw Error("O navegador não conseguiu abrir esta imagem. Use JPG, PNG ou WebP.");
    });
    try{
      const edge=Math.max(bitmap.width,bitmap.height),scale=Math.min(1,3840/edge);
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      const ctx=canvas.getContext("2d",{alpha:true});
      if(!ctx)throw Error("Não foi possível preparar a imagem local.");
      ctx.imageSmoothingQuality="high";ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      let data="";
      for(const quality of [.9,.8,.7,.6]){
        data=canvas.toDataURL("image/webp",quality);
        if(data.startsWith("data:image/webp;base64,")&&data.length<=4_800_000)break;
      }
      if(!/^data:image\/webp;base64,/.test(data)||data.length>4_800_000)
        throw Error("Imagem grande demais para salvar no projeto. Exporte uma versão reduzida.");
      return data;
    }finally{bitmap.close?.();}
  }
  async function addLocalFiles(files){
    let inserted=0,failed=[];
    for(const file of files){
      try{
        if(["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)){
          const original=await optimizeImage(file);
          const photoKey="loc-"+crypto.randomUUID().replace(/-/g,"").slice(0,20);
          const descriptor={provider:"local",id:photoKey,photoKey,name:file.name,
            kind:"image",mimeType:"image/webp",original,preview:original};
          pool.set(photoKey,descriptor);selected=descriptor;
          window.dispatchEvent(new CustomEvent("labmattar:acervo-select",{detail:descriptor}));
          inserted++;
        }else if(["video/mp4","video/webm","video/quicktime"].includes(file.type)){
          const id="local-"+crypto.randomUUID();
          await saveLocalVideo(file,id);
          window.dispatchEvent(new CustomEvent("labmattar:acervo-video-select",{detail:{
            kind:"video",provider:"local",id,name:file.name,mimeType:file.type
          }}));
          inserted++;
        }else throw Error("Formato não suportado: "+file.name);
      }catch(error){failed.push(file.name+": "+error.message);}
    }
    const message=inserted?inserted+" arquivo(s) local(is) adicionados. "+
      (files.some(file=>file.type.startsWith("image/"))?"Salve o projeto JSON para preservar as fotografias. ":"")+
      (files.some(file=>file.type.startsWith("video/"))?"Vídeos locais permanecem neste navegador. ":""):
      "Nenhum arquivo foi adicionado. ";
    const result=message+failed.join(" ");
    by("labAcervoCurrent").textContent=result;notify(result);
    if(inserted&&!overlay.hidden)closeDialog();
  }
  function chooseLocal(onlyVideos=false){
    localInput.accept=onlyVideos?"video/mp4,video/webm,video/quicktime":
      "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
    localInput.value="";
    localInput.click();
  }
  by("labAcervoLocal").addEventListener("click",()=>chooseLocal(false));
  localDialog?.addEventListener("click",()=>chooseLocal(false));
  by("labClipLocal").addEventListener("click",()=>chooseLocal(true));
  localInput.addEventListener("change",()=>{
    const files=[...localInput.files];if(files.length)addLocalFiles(files).catch(error=>{
      by("labAcervoCurrent").textContent=error.message;
    });
  });
  window.addEventListener("pagehide",()=>{
    for(const url of localVideoUrls.values())URL.revokeObjectURL(url);
    localVideoUrls.clear();
  });

  window.LabAcervo={
    has:key=>pool.has(key),
    get:key=>pool.get(key)||null,
    reopen:()=>selected?select({...selected}):null,
    open:options=>options?.autoProvider&&providers.includes(options.autoProvider)?
      openDialog(options):openPublic(),
    openPublic,
    chooseLocal,
    localVideoBlob,
    localVideoUrl
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
