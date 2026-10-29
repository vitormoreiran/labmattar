/* LABMATTAR / laboratório de composição. Somente demonstração; não altera tokens oficiais. */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const board=by("labArtboard");
  if(!board)return;
  const storageKey="labmattar-composicao-lab-v1";
  const presets={
    tipografia:{
      format:"horizontal",color:"neutral",margin:7,guides:"nenhuma",
      placement:"esquerda",relation:"separada",textWidth:61,titleScale:100,type:"alternada",
      image:"nenhuma",photo:"64",mPosition:"direita",mScale:60,focusX:50,focusY:50,symbol:"none",
      title:"PRÁTICAS\nMATERIAIS\nE PROCESSOS",
      body:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"oculto"
    },
    mascara:{
      format:"horizontal",color:"neutral",margin:7,guides:"margens",
      placement:"esquerda",relation:"sobreposta",textWidth:77,titleScale:100,type:"alternada",
      image:"recorte",photo:"64",mPosition:"centro",mScale:85,focusX:50,focusY:50,symbol:"none",
      title:"CADA CORPO\nABRE UM\nMUNDO",
      body:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"visivel"
    },
    imagem:{
      format:"horizontal",color:"neutral",margin:7,guides:"nenhuma",
      placement:"inferior",relation:"sobreposta",textWidth:80,titleScale:95,type:"alternada",
      image:"inteira",photo:"179",mPosition:"direita",mScale:60,focusX:50,focusY:50,symbol:"none",
      title:"CADA CORPO\nABRE UM MUNDO",
      body:"Uma gastroperformance que investiga a sinestesia como possibilidade de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"visivel"
    }
  };
  const fields={
    format:"labFormat",color:"labColor",margin:"labMargin",guides:"labGuides",
    placement:"labPlacement",relation:"labRelation",textWidth:"labTextWidth",
    titleScale:"labTitleScale",type:"labType",image:"labImage",photo:"labPhoto",
    mPosition:"labMPosition",mScale:"labMScale",focusX:"labFocusX",
    focusY:"labFocusY",symbol:"labSymbol",title:"labTitleInput",
    body:"labBodyInput",bodyMode:"labBodyMode"
  };
  const numeric=new Set(["margin","textWidth","titleScale","mScale","focusX","focusY"]);
  const palette={
    neutral:["#f7f6f2","#181818"],
    beige:["#e6dbcf","#181818"],
    green:["#8fd81b","#181818"],
    red:["#e22e24","#181818"],
    blue:["#1f3554","#f7f6f2"],
    brown:["#5b463e","#f7f6f2"]
  };
  const photos={
    "64":"/ambiente-editorial/media/BOXDOSENTIR-64.jpg",
    "179":"/ambiente-editorial/media/BOXDOSENTIR-179.jpg",
    "151":"/ambiente-editorial/media/BOXDOSENTIR-151.jpg"
  };
  const formatNames={
    horizontal:"HORIZONTAL / 16:9",vertical:"VERTICAL / 9:16",
    quadrado:"QUADRADO / 1:1",editorial:"EDITORIAL / √2:1"
  };
  let activePreset="tipografia",frame=0;
  const copy=v=>({...v});
  function sanitize(data){
    const result=copy(presets.tipografia);
    if(!data||typeof data!=="object")return result;
    for(const [key,id] of Object.entries(fields)){
      const el=by(id),value=data[key];
      if(numeric.has(key)){
        const val=Number(value),min=Number(el.min),max=Number(el.max);
        if(Number.isFinite(val))result[key]=Math.max(min,Math.min(max,val));
      }else if(key==="title"||key==="body"){
        if(typeof value==="string")result[key]=value.slice(0,Number(el.maxLength)>0?el.maxLength:400);
      }else if(Array.from(el.options).some(option=>option.value===value)){
        result[key]=value;
      }
    }
    return result;
  }
  let state=copy(presets.tipografia);
  try{state=sanitize(JSON.parse(localStorage.getItem(storageKey)))}catch{}
  const previewImg=by("labAmbientPhoto"),maskImg=by("labMaskPhoto"),mark=by("labSignature");
  const title=by("labRenderedTitle"),body=by("labRenderedBody"),copyArea=by("labCopy");
  function syncInputs(){
    for(const [key,id] of Object.entries(fields))by(id).value=String(state[key]);
    const activeImage=state.image!=="nenhuma",mask=state.image==="recorte";
    for(const key of ["photo","focusX","focusY"])by(fields[key]).disabled=!activeImage;
    for(const key of ["mPosition","mScale"])by(fields[key]).disabled=!mask;
    by("labColor").disabled=activeImage;
    by("labRelation").disabled=!activeImage;
    for(const key of ["margin","textWidth","titleScale","mScale","focusX","focusY"]){
      by("lab"+key.charAt(0).toUpperCase()+key.slice(1)+"Value").textContent=state[key]+"%";
    }
    document.querySelectorAll("[data-lab-preset]").forEach(b=>
      b.setAttribute("aria-pressed",String(b.dataset.labPreset===activePreset)));
    // Visual choice cards and hidden select retain the SAME state.
    // The native controls remain in the DOM for predictable serialization.
    document.querySelectorAll("[data-lab-choice]").forEach(button=>{
      const key=button.dataset.labChoice;
      const select=by(fields[key]);
      button.setAttribute("aria-pressed",String(state[key]===button.dataset.value));
      button.disabled=Boolean(select&&select.disabled);
    });
    for(const [key,id] of Object.entries(fields)){
      const input=by(id);
      if(input.type==="range"){
        const min=Number(input.min),max=Number(input.max),value=Number(input.value);
        const percent=max>min?(value-min)*100/(max-min):0;
        input.style.setProperty("--lm-range-progress",percent+"%");
      }
    }
    const signature=by("labSymbolPreview");
    if(signature){
      signature.parentElement.dataset.empty=String(state.symbol==="none");
      if(state.symbol!=="none")signature.src="/identidade/"+state.symbol;
    }
    const focusPreview=by("labFocalPreview");
    if(focusPreview){
      focusPreview.dataset.inactive=String(!activeImage);
      by("labFocusImage").style.backgroundImage="url('"+photos[state.photo]+"')";
      by("labFocusImage").style.backgroundPosition=state.focusX+"% "+state.focusY+"%";
      by("labFocusPointer").style.left=state.focusX+"%";
      by("labFocusPointer").style.top=state.focusY+"%";
    }
  }
  function readInputs(){
    const next={};
    for(const [key,id] of Object.entries(fields)){
      const value=by(id).value;
      next[key]=numeric.has(key)?Number(value):value;
    }
    state=sanitize(next);
  }
  function save(){
    try{
      localStorage.setItem(storageKey,JSON.stringify(state));
      by("labSaveState").textContent="Configuração salva neste navegador / não publicada.";
    }catch{by("labSaveState").textContent="Rascunho local / armazenamento indisponível.";}
  }
  function renderTitle(){
    title.replaceChildren();
    const lines=state.title.replace(/\r/g,"").split("\n").map(s=>s.trim()).filter(Boolean);
    for(let i=0;i<lines.length;i++){
      const span=document.createElement("span");
      span.className="lm-lab-title-line";
      if(state.type==="perpetua"||(state.type==="alternada"&&i===Math.min(1,lines.length-1)))
        span.classList.add("perpetua");
      span.textContent=lines[i];
      title.append(span);
    }
    body.textContent=state.body;
    body.hidden=state.bodyMode!=="visivel"||!state.body.trim();
  }
  function render(){
    syncInputs();
    board.dataset.format=state.format;
    board.dataset.placement=state.placement;
    board.dataset.relation=state.relation;
    board.dataset.image=state.image;
    board.dataset.guide=state.guides;
    board.dataset.photoText="false";
    board.dataset.mText="false";
    board.style.setProperty("--lab-pad",state.margin+"%");
    board.style.setProperty("--lab-title-scale",String(state.titleScale/100));
    board.style.setProperty("--lab-text-width",state.textWidth+"%");
    board.style.setProperty("--lab-m-size",state.mScale+"%");
    board.style.setProperty("--lab-focus-x",state.focusX+"%");
    board.style.setProperty("--lab-focus-y",state.focusY+"%");
    const anchors=state.relation==="sobreposta"?
      {esquerda:32,centro:53,direita:72}:
      {esquerda:24,centro:50,direita:76};
    board.style.setProperty("--lab-m-x",anchors[state.mPosition]+"%");
    const [bg,ink]=state.image==="nenhuma"?palette[state.color]:["#111713","#f7f6f2"];
    board.style.setProperty("--lab-bg",bg);
    board.style.setProperty("--lab-ink",ink);
    const src=photos[state.photo];
    previewImg.src=src;
    maskImg.src=src;
    mark.hidden=state.symbol==="none";
    if(!mark.hidden)mark.src="/identidade/"+state.symbol;
    renderTitle();
    // Do not carry the previous composition's fitted size into this one.
    title.style.removeProperty("font-size");
    body.style.removeProperty("font-size");
    board.dataset.titleBreak="normal";
    by("labFormatLabel").textContent=formatNames[state.format];
    requestMeasurement();
  }
  function requestMeasurement(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;measure()});
  }
  function intersects(a,b){
    return a.width>0&&a.height>0&&b.width>0&&b.height>0&&
      a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  }
  function rects(node){
    const range=document.createRange();
    range.selectNodeContents(node);
    const lines=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0);
    return lines.length?lines:[node.getBoundingClientRect()];
  }

  /*
   * An entered scale is a requested maximum, never a license to cross a margin.
   * Measure rendered line boxes after fonts and layout resolve; reduce the title
   * only as far as necessary. Long unbreakable words are preserved first.
   * Emergency wrapping is a last resort when a readable whole word cannot fit.
   */
  function fitTitleToReadingArea(){
    const reading=by("labReading");
    const kicker=reading.querySelector(".lm-lab-kicker");
    const footer=reading.querySelector(".lm-lab-bottom");
    const lines=[...title.querySelectorAll(".lm-lab-title-line")];
    title.style.removeProperty("font-size");
    body.style.removeProperty("font-size");
    board.dataset.titleBreak="normal";
    const requested=parseFloat(getComputedStyle(title).fontSize)||36;
    const bodyRequested=parseFloat(getComputedStyle(body).fontSize)||14;
    const sideRoom=2;
    function fits(){
      const safe=reading.getBoundingClientRect();
      const column=copyArea.getBoundingClientRect();
      const kickerRect=kicker.getBoundingClientRect();
      const footerRect=footer.getBoundingClientRect();
      const top=kickerRect.bottom;
      const bottom=footerRect.top;
      if(!safe.width||!safe.height||column.width<4||column.height<1)return false;
      // The footer can itself be displaced by overgrown flex content.
      // Compare against the actual safe region, not only sibling positions.
      if(kickerRect.top<safe.top-sideRoom||footerRect.bottom>safe.bottom+sideRoom)return false;
      if(column.left<safe.left-sideRoom||column.right>safe.right+sideRoom)return false;
      if(column.top<safe.top-sideRoom||column.bottom>safe.bottom+sideRoom)return false;
      if(column.top<top+2||column.bottom>bottom-2)return false;
      for(const node of lines){
        if(node.scrollWidth>node.clientWidth+1.5)return false;
        for(const rect of rects(node)){
          if(rect.left<column.left-sideRoom||rect.right>column.right+sideRoom||
             rect.left<safe.left-sideRoom||rect.right>safe.right+sideRoom||
             rect.top<safe.top-sideRoom||rect.bottom>safe.bottom+sideRoom)return false;
        }
      }
      if(!body.hidden){
        const b=body.getBoundingClientRect();
        if(body.scrollWidth>body.clientWidth+2||
           b.left<safe.left-sideRoom||b.right>safe.right+sideRoom||
           b.top<safe.top-sideRoom||b.bottom>safe.bottom+sideRoom||
           b.bottom>bottom-2)return false;
      }
      return true;
    }
    function searchTitle(floor){
      const candidate=size=>{
        title.style.fontSize=size.toFixed(3)+"px";
        return fits();
      };
      if(candidate(requested))return requested;
      if(!candidate(floor))return null;
      let low=floor,high=requested;
      for(let i=0;i<19;i++){
        const mid=(low+high)/2;
        if(candidate(mid))low=mid;
        else high=mid;
      }
      candidate(low);
      return low;
    }
    const minReadable=Math.min(12,requested);
    let applied=null,emergency=false,bodyReduced=false;
    for(const wrap of ["normal","emergency"]){
      board.dataset.titleBreak=wrap;
      applied=searchTitle(minReadable);
      if(applied!==null){emergency=wrap==="emergency";break;}
    }
    if(applied===null&&!body.hidden){
      // On unusually dense pages, reclaim vertical space from the body before
      // allowing title or body to leave the approved reading area.
      body.style.fontSize="8px";
      bodyReduced=true;
      for(const wrap of ["normal","emergency"]){
        board.dataset.titleBreak=wrap;
        applied=searchTitle(minReadable);
        if(applied!==null){emergency=wrap==="emergency";break;}
      }
    }
    if(applied===null){
      board.dataset.titleBreak="emergency";
      emergency=true;
      if(!body.hidden){body.style.fontSize="6px";bodyReduced=true;}
      applied=searchTitle(3);
    }
    if(applied===null){
      // In a very small horizontal canvas viewed on a phone, hundreds of body
      // characters can still fill all available height. Shrink the reading
      // text as well; then flag illegibility rather than allowing any overflow.
      board.dataset.titleBreak="emergency";
      emergency=true;
      if(!body.hidden){
        bodyReduced=true;
        for(const size of [4,3,2,1]){
          body.style.fontSize=size+"px";
          applied=searchTitle(3);
          if(applied===null)applied=searchTitle(1);
          if(applied!==null)break;
        }
      }else{
        applied=searchTitle(1);
      }
    }
    if(applied!==null&&bodyReduced&&!body.hidden){
      const requestedBody=bodyRequested;
      let low=parseFloat(getComputedStyle(body).fontSize)||6;
      let high=requestedBody;
      for(let i=0;i<14;i++){
        const mid=(low+high)/2;
        body.style.fontSize=mid.toFixed(3)+"px";
        if(fits())low=mid;
        else high=mid;
      }
      body.style.fontSize=low.toFixed(3)+"px";
    }
    const ok=fits();
    const real=parseFloat(getComputedStyle(title).fontSize)||applied||requested;
    const actualBody=parseFloat(getComputedStyle(body).fontSize)||bodyRequested;
    const lowLegibility=real<14||(!body.hidden&&actualBody<10);
    const adjusted=real<requested-.6||bodyReduced||emergency;
    const info=by("labTitleFitInfo");
    if(info){
      info.dataset.adjusted=String(adjusted);
      info.textContent=!ok?
        "Revisar o conteúdo: a área útil está no limite.":
        lowLegibility?
        "Margens preservadas, mas o conteúdo está denso demais: revise o texto ou a largura da coluna.":
        emergency?
        "Título excepcionalmente longo: quebra de segurança para preservar a margem.":
        real<requested-.6?
        "Escala ajustada automaticamente para "+Math.round(real)+" px, sem sair das margens.":
        "Escala aplicada: "+Math.round(real)+" px · margens preservadas.";
    }
    board.dataset.typeFit=ok?(lowLegibility?"compromised":adjusted?"adjusted":"natural"):"review";
    return {ok,adjusted,lowLegibility,emergency,requested,applied:real};
  }

  function measure(){
    const titleFit=fitTitleToReadingArea();
    const hasPhoto=state.image!=="nenhuma";
    const textNodes=[...board.querySelectorAll(".lm-lab-kicker,.lm-lab-title-line,.lm-lab-bottom span")];
    if(!body.hidden)textNodes.push(body);
    board.dataset.photoText=String(hasPhoto&&textNodes.some(n=>n.textContent.trim()));
    const mask=by("labMask");
    const overlap=hasPhoto&&state.image==="recorte"&&
      textNodes.some(n=>rects(n).some(r=>intersects(r,mask.getBoundingClientRect())));
    board.dataset.mText=String(overlap);
    const rect=board.getBoundingClientRect();
    const copyRect=copyArea.getBoundingClientRect();
    const footerRect=board.querySelector(".lm-lab-bottom").getBoundingClientRect();
    const titleWide=[...title.querySelectorAll(".lm-lab-title-line")].some(n=>n.scrollWidth>n.clientWidth+3);
    const invalid=!titleFit.ok||titleWide||copyRect.left<rect.left-2||copyRect.right>rect.right+2||
      copyRect.top<rect.top+1||copyRect.bottom>footerRect.top-6||
      (!body.hidden&&body.scrollWidth>body.clientWidth+3);
    const collision=overlap&&state.relation==="separada";
    board.dataset.state=invalid?"overflow":"ok";
    const status=by("labStatus");
    const desc=invalid?"REVER / CONTEÚDO EXCEDE A ÁREA ÚTIL":
      collision?"REVER / TEXTO E M CRUZAM EM CAMPOS SEPARADOS":
      titleFit.lowLegibility?"REVER LEGIBILIDADE / MARGENS PRESERVADAS":
      titleFit.adjusted?"ESCALA AUTOAJUSTADA / MARGENS PRESERVADAS":
      hasPhoto?"ESTUDO / COMPOSIÇÃO COM IMAGEM":
      "ESTUDO / SUPERFÍCIE TIPOGRÁFICA";
    status.textContent=desc;
    status.dataset.state=invalid?"overflow":"ok";
    const treatment=by("labPhotoStatus");
    treatment.textContent=!hasPhoto?"SEM VÉU FOTOGRÁFICO":
      overlap?"PRETO 20% / FUNDO E RECORTE M":
      "PRETO 20% / CAMPO FOTOGRÁFICO";
  }
  function applyPreset(key){
    if(!Object.prototype.hasOwnProperty.call(presets,key))return;
    state=copy(presets[key]);
    activePreset=key;
    render();save();
  }
  // One action model for the graphic controls and the original select fields.
  document.querySelectorAll("[data-lab-choice]").forEach(button=>{
    button.addEventListener("click",()=>{
      const select=by(fields[button.dataset.labChoice]);
      if(!select||select.disabled)return;
      select.value=button.dataset.value;
      select.dispatchEvent(new Event("change",{bubbles:true}));
    });
  });
  // Sliders show both endpoints and the current value without adding another
  // state system. The endpoints are ordinary labels, not draggable controls.
  for(const input of document.querySelectorAll(".lm-lab-inspector input[type=range]")){
    const scale=document.createElement("div");
    scale.className="lm-ctrl-range-limits";
    const min=document.createElement("span");
    const max=document.createElement("span");
    min.textContent=input.min+"%";max.textContent=input.max+"%";
    scale.append(min,max);
    input.insertAdjacentElement("afterend",scale);
  }
  for(const id of Object.values(fields)){
    const el=by(id);
    el.addEventListener(el.tagName==="TEXTAREA"||el.type==="range"?"input":"change",()=>{
      readInputs();activePreset="";render();save();
    });
  }
  document.querySelectorAll("[data-lab-preset]").forEach(b=>
    b.addEventListener("click",()=>applyPreset(b.dataset.labPreset)));
  by("labReset").addEventListener("click",()=>applyPreset("tipografia"));
  const obs=new ResizeObserver(requestMeasurement);
  obs.observe(board);
  document.fonts.ready.then(requestMeasurement);
  document.fonts.addEventListener?.("loadingdone",requestMeasurement);
  previewImg.addEventListener("load",requestMeasurement);
  maskImg.addEventListener("load",requestMeasurement);
  window.addEventListener("resize",requestMeasurement,{passive:true});
  render();
})();
