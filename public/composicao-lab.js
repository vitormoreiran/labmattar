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
  function measure(){
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
    const invalid=titleWide||copyRect.left<rect.left-2||copyRect.right>rect.right+2||
      copyRect.top<rect.top+1||copyRect.bottom>footerRect.top-6||
      (!body.hidden&&body.scrollWidth>body.clientWidth+3);
    const collision=overlap&&state.relation==="separada";
    board.dataset.state=invalid?"overflow":"ok";
    const status=by("labStatus");
    const desc=invalid?"REVER / CONTEÚDO EXCEDE A ÁREA ÚTIL":
      collision?"REVER / TEXTO E M CRUZAM EM CAMPOS SEPARADOS":
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
  previewImg.addEventListener("load",requestMeasurement);
  maskImg.addEventListener("load",requestMeasurement);
  window.addEventListener("resize",requestMeasurement,{passive:true});
  render();
})();
