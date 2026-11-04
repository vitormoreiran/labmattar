/* LABMATTAR / seleção de mídia conectada.
 * Integra somente catálogo no painel IMAGEM / M, reutilizando o compositor
 * existente (fotografia, foco, M, blur, exportação). Sem alterar tokens.
 * Arquivos externos nunca são serializados como credenciais ou URLs públicas.
 */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const root=by("labAcervo"),overlay=by("labAcervoDialog");
  const list=by("labAcervoItems"),notice=by("labAcervoStatus");
  if(!root||!overlay||!list)return;
  const BASE="/api/acervo/";
  const providers=["google","dropbox"];
  let statusData=null,folder="",cursor="",entries=[],activeProvider="google";
  let selected=null,busy=false;
  const pool=new Map();
  function notify(message){notice.textContent=message}
  function escapeName(name){return String(name||"Arquivo").slice(0,180)}
  async function api(path,options){
    const response=await fetch(BASE+path,{credentials:"same-origin",cache:"no-store",...options});
    if(!response.ok){
      let error;try{error=(await response.json()).error}catch{}
      throw Error(error||"Não foi possível acessar este acervo.");
    }
    return response.json();
  }
  function valid(item){
    return item && providers.includes(item.provider)&&
      typeof item.id==="string" && item.id.length<220 &&
      ["image","video"].includes(item.kind)&&typeof item.original==="string" &&
      item.original.startsWith(BASE+"media?")&&typeof item.name==="string";
  }
  function setBusy(value){busy=Boolean(value);root.dataset.busy=String(busy)}
  async function refresh(){
    statusData=await api("status");
    for(const provider of providers){
      const state=statusData.providers[provider];
      const button=by("labAcervoConnect-"+provider);
      if(!button)continue;
      button.disabled=busy||!state.configured;
      button.textContent=!state.configured?"Configuração necessária":
        state.connected?"Abrir acervo":"Conectar conta";
      const label=by("labAcervoConnection-"+provider);
      if(label)label.textContent=!state.configured?"Indisponível":
        state.connected?"Conta conectada":"Não conectado";
      by("labAcervoDisconnect-"+provider).hidden=!state.connected;
    }
  }
  function heading(){
    by("labAcervoPath").textContent=activeProvider==="dropbox"?
      (folder||"Dropbox / Arquivos"):"Google Drive / Seleção";
    const up=by("labAcervoBack");if(up)up.hidden=activeProvider!=="dropbox"||!folder;
    by("labAcervoMore").hidden=activeProvider!=="dropbox"||!cursor;
  }
  function show(entriesToShow,append=false){
    if(!append)list.replaceChildren();
    if(!append&&!entriesToShow.length){
      const empty=document.createElement("p");
      empty.className="lm-acervo-empty";
      empty.textContent="Nenhuma mídia disponível nesta seleção.";
      list.append(empty);
    }
    for(const item of entriesToShow){
      const button=document.createElement("button");
      button.type="button";button.className="lm-acervo-item";
      if(item.kind==="folder"){
        button.classList.add("lm-acervo-folder");
        const icon=document.createElement("span");icon.textContent="▣";icon.setAttribute("aria-hidden","true");
        const name=document.createElement("span");name.textContent=escapeName(item.name);
        button.append(icon,name);
        button.addEventListener("click",()=>openDropbox(item.path));
      }else if(valid(item)){
        const thumb=document.createElement("span");thumb.className="lm-acervo-thumb";
        if(item.kind==="image"){
          const image=document.createElement("img");
          image.loading="lazy";image.alt="";
          image.src=item.preview;
          image.addEventListener("error",()=>{image.hidden=true;thumb.textContent="IMAGEM"});
          thumb.append(image);
        }else{
          thumb.textContent="VÍDEO";
        }
        const meta=document.createElement("span");meta.className="lm-acervo-item-meta";
        const name=document.createElement("strong");name.textContent=escapeName(item.name);
        const kind=document.createElement("small");
        kind.textContent=item.kind==="video"?"Vídeo / inserção não disponível":"Fotografia";
        meta.append(name,kind);button.append(thumb,meta);
        if(item.kind==="video"){
          button.disabled=true;button.title="Vídeos estão no catálogo, mas ainda não podem ser usados em composições estáticas.";
        }else{
          button.addEventListener("click",()=>select(item));
        }
      }else continue;
      list.append(button);
    }
  }
  async function openDropbox(path="",append=false){
    if(busy)return;
    setBusy(true);activeProvider="dropbox";
    try{
      if(!append){folder=path;cursor="";entries=[]}
      const params=new URLSearchParams({path:folder});
      if(append&&cursor)params.set("cursor",cursor);
      const result=await api("dropbox/list?"+params.toString());
      entries.push(...result.entries);cursor=result.cursor||"";
      heading();show(result.entries,append);
      notify(entries.length+" itens carregados. Selecione uma fotografia.");
    }catch(error){notify(error.message)}
    finally{setBusy(false)}
  }
  async function openGoogle(){
    activeProvider="google";folder="";cursor="";
    list.replaceChildren();heading();
    const cfg=statusData?.picker;
    if(!cfg?.apiKey||!cfg?.appId){notify("O Google Picker ainda não foi configurado.");return}
    setBusy(true);
    try{
      const token=await api("picker-token");
      if(!window.gapi){
        await new Promise((resolve,reject)=>{
          const script=document.createElement("script");
          script.src="https://apis.google.com/js/api.js";
          script.async=true;script.onload=resolve;script.onerror=()=>reject(Error("Google Picker indisponível"));
          document.head.append(script);
        });
      }
      await new Promise((resolve,reject)=>{
        window.gapi.load("picker",{callback:resolve,onerror:()=>reject(Error("Falha ao carregar Google Picker"))});
      });
      if(!window.google?.picker)throw Error("Google Picker indisponível.");
      const picker=window.google.picker;
      const view=new picker.DocsView(picker.ViewId.DOCS);
      view.setMimeTypes("image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime");
      const builder=new picker.PickerBuilder()
        .addView(view).setOAuthToken(token.accessToken).setDeveloperKey(cfg.apiKey)
        .setAppId(cfg.appId).enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .setCallback(async data=>{
          if(data.action!==picker.Action.PICKED)return;
          const ids=(data.docs||[]).map(d=>d.id).filter(Boolean).slice(0,40);
          setBusy(true);
          try{
            const result=await api("google/inspect",{
              method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})
            });
            entries=result.entries;show(entries);
            notify(entries.length+" arquivos autorizados. Selecione uma fotografia.");
          }catch(error){notify(error.message)}finally{setBusy(false)}
        }).build();
      picker.setVisible(true);
      notify("Selecione arquivos no Google Drive. O acesso é limitado aos arquivos autorizados.");
    }catch(error){notify(error.message)}
    finally{setBusy(false)}
  }
  function select(item){
    if(!valid(item)||item.kind!=="image")return;
    const key=item.provider+":"+item.id;
    const photoKey="ext-"+Array.from(new TextEncoder().encode(key)).reduce((n,v)=>(n*33+v)>>>0,5381).toString(36);
    // Same-origin proxy URL, not a provider token and not a public share link.
    const descriptor={provider:item.provider,id:item.id,name:item.name,mimeType:item.mimeType,
      original:item.original,preview:item.preview,photoKey};
    pool.set(photoKey,descriptor);
    selected=descriptor;
    const event=new CustomEvent("labmattar:acervo-select",{detail:descriptor});
    window.dispatchEvent(event);
    overlay.hidden=true;
    notify("Imagem selecionada: "+item.name);
    by("labAcervoCurrent").textContent=item.name+" / "+item.provider;
  }
  async function open(provider){
    if(!providers.includes(provider)||busy)return;
    try{
      await refresh();
      if(!statusData.providers[provider].configured){
        notify("A integração precisa ser configurada no servidor antes de conectar.");
        overlay.hidden=false;return;
      }
      if(!statusData.providers[provider].connected){
        // OAuth redirects in the same tab, bound to this browser through state+PKCE.
        window.location.assign(BASE+"connect/"+provider);
        return;
      }
      overlay.hidden=false;
      if(provider==="google")await openGoogle();
      else await openDropbox();
    }catch(error){notify(error.message);overlay.hidden=false}
  }
  root.addEventListener("click",async event=>{
    const target=event.target.closest("[data-acervo-provider]");
    if(target){await open(target.dataset.acervoProvider);return}
    if(event.target.closest("[data-acervo-open]")){
      overlay.hidden=false;heading();show(entries);
    }
  });
  for(const provider of providers){
    by("labAcervoDisconnect-"+provider).addEventListener("click",async()=>{
      if(!confirm("Desconectar "+(provider==="google"?"Google Drive":"Dropbox")+" deste navegador?"))return;
      try{
        await api("disconnect",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({provider})});
        pool.forEach((item,key)=>{if(item.provider===provider)pool.delete(key)});
        if(selected?.provider===provider){selected=null;by("labAcervoCurrent").textContent="Imagem conectada indisponível";}
        await refresh();notify("Conta desconectada.");
      }catch(error){notify(error.message)}
    });
  }
  by("labAcervoClose").addEventListener("click",()=>{overlay.hidden=true});
  overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.hidden=true});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!overlay.hidden)overlay.hidden=true});
  by("labAcervoBack").addEventListener("click",()=>{
    const previous=folder.split("/").filter(Boolean).slice(0,-1);
    openDropbox(previous.length?"/"+previous.join("/"):"");
  });
  by("labAcervoMore").addEventListener("click",()=>openDropbox(folder,true));
  // Restore only stable asset IDs, not OAuth data, credentials or token URLs.
  window.LabAcervo={
    has:key=>pool.has(key),
    get:key=>pool.get(key)||null,
    reopen:()=>selected?select({...selected}):null
  };
  refresh().catch(()=>notify("Conexão com o serviço de acervo indisponível."));
  const result=new URL(location.href).searchParams.get("acervo");
  if(result){
    notify(result==="erro"?"Não foi possível concluir a autorização.":
      result==="cancelado"?"Autorização cancelada.":"Conta autorizada. Abra o acervo para selecionar arquivos.");
    const url=new URL(location.href);url.searchParams.delete("acervo");
    history.replaceState(null,"",url.pathname+url.search+url.hash);
    refresh().catch(()=>{});
  }
})();
