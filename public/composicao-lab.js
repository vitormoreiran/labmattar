/* LABMATTAR / laboratório de composição. Somente demonstração; não altera tokens oficiais. */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const board=by("labArtboard");
  if(!board)return;
  const storageKey="labmattar-composicao-lab-v1";
  const signatureSymbols=new Set(["M.svg",...Array.from({length:9},(_,i)=>"vaso_"+String(i+1).padStart(2,"0")+".svg")]);
  const signatureCorners=["tl","tr","bl","br"];
  const signatureKinds=new Set(["none","brand","symbol","symbol-label","text"]);
  const freshSignature=()=>({
    preset:"editorial",scale:100,
    slots:{
      tl:{kind:"text",symbol:"M.svg",text:"LABMATTAR / 2026"},
      tr:{kind:"none",symbol:"vaso_03.svg",text:""},
      bl:{kind:"text",symbol:"M.svg",text:"GASTROPERFORMANCE & FOOD DESIGN"},
      br:{kind:"text",symbol:"M.svg",text:"LABMATTAR / IDENTIDADE VISUAL"}
    }
  });
  function sanitizeSignature(input,legacy){
    const fresh=freshSignature();
    if(!input||typeof input!=="object"){
      if(legacy&&typeof legacy==="object"){
        for(const [corner,key] of [["tl","kicker"],["bl","footerLeft"],["br","footerRight"]])
          if(typeof legacy[key]==="string")fresh.slots[corner].text=legacy[key].slice(0,100);
        if(signatureSymbols.has(legacy.symbol))
          fresh.slots.tr={kind:"symbol",symbol:legacy.symbol,text:""};
      }
      return fresh;
    }
    const result={preset:["none","editorial","navigation","symbol","custom"].includes(input.preset)?input.preset:"custom",
      scale:Math.max(60,Math.min(140,Math.round(Number(input.scale)||100))),slots:{}};
    for(const corner of signatureCorners){
      const source=input.slots?.[corner],base=fresh.slots[corner];
      result.slots[corner]={
        kind:signatureKinds.has(source?.kind)?source.kind:base.kind,
        symbol:signatureSymbols.has(source?.symbol)?source.symbol:base.symbol,
        text:typeof source?.text==="string"?source.text.replace(/[\r\n]+/g," ").slice(0,100):base.text
      };
    }
    return result;
  }
  const defaultMetadata={
    kicker:"LABMATTAR / 2026",
    footerLeft:"GASTROPERFORMANCE & FOOD DESIGN",
    footerRight:"LABMATTAR / IDENTIDADE VISUAL",
    signature:freshSignature()
  };
  const presets={
    tipografia:{
      format:"horizontal",color:"neutral",margin:7,guides:"nenhuma",
      textWidth:61,titleScale:100,type:"alternada",
      background:"color",mContent:"off",mPresentation:"elemento",photo:"64",marker:"none",markerFocus:"blur",mScale:60,focusX:50,focusY:50,symbol:"none",
      title:"PRÁTICAS\nMATERIAIS E\nPROCESSOS",
      body:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"oculto",
      ...defaultMetadata
    },
    mascara:{
      format:"horizontal",color:"neutral",margin:7,guides:"margens",
      textWidth:40,titleScale:95,type:"alternada",
      background:"color",mContent:"photo",mPresentation:"elemento",photo:"64",marker:"none",markerFocus:"blur",mScale:50,focusX:50,focusY:50,symbol:"none",
      title:"CADA CORPO\nABRE UM\nMUNDO",
      body:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"visivel",
      ...defaultMetadata
    },
    imagem:{
      format:"horizontal",color:"neutral",margin:7,guides:"nenhuma",
      textWidth:80,titleScale:95,type:"alternada",
      background:"photo",mContent:"off",mPresentation:"elemento",photo:"179",marker:"none",markerFocus:"blur",mScale:60,focusX:50,focusY:50,symbol:"none",
      title:"CADA CORPO\nABRE UM MUNDO",
      body:"Uma gastroperformance que investiga a sinestesia como possibilidade de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"visivel",
      ...defaultMetadata
    }
  };
  const fields={
    format:"labFormat",color:"labColor",margin:"labMargin",guides:"labGuides",
    marker:"labMarker",markerFocus:"labMarkerFocus",textWidth:"labTextWidth",
    titleScale:"labTitleScale",type:"labType",background:"labBackground",mContent:"labMContent",photo:"labPhoto",
    mScale:"labMScale",mPresentation:"labMPresentation",focusX:"labFocusX",
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
  // Only same-origin media endpoints are accepted. Credentials never enter state.
  const externalMedia=new Map();
  function loadExternalMedia(){
    try{
      const cached=JSON.parse(sessionStorage.getItem("lm-acervo-selected")||"null");
      if(cached && /^(google|dropbox|public)$/.test(cached.provider)&&
        /^ext-[a-z0-9]+$/.test(cached.photoKey)&&
        typeof cached.id==="string"&&cached.id.length<220){
        const url=cached.provider==="public"?
          "/api/acervo/public-media?project="+encodeURIComponent(cached.projectId)+"&id="+encodeURIComponent(cached.id):
          "/api/acervo/media?provider="+cached.provider+"&id="+encodeURIComponent(cached.id);
        photos[cached.photoKey]=url;
        externalMedia.set(cached.photoKey,{...cached,original:url});
        const select=by("labPhoto");
        select.add(new Option(cached.name+" / "+cached.provider,cached.photoKey));
      }
    }catch{}
  }
  loadExternalMedia();
  // Register the saved external option before the editor restores its state.
  const cachedExternal=[...externalMedia.values()][0];
  if(cachedExternal){
    const button=document.createElement("button");
    button.type="button";button.className="lm-ctrl-choice";
    button.dataset.labChoice="photo";button.dataset.value=cachedExternal.photoKey;
    const name=document.createElement("span");name.className="lm-ctrl-name";
    name.textContent=String(cachedExternal.name).slice(0,100);
    button.append(name);
    button.addEventListener("click",()=>{
      const select=by("labPhoto");
      select.value=cachedExternal.photoKey;
      select.dispatchEvent(new Event("change",{bubbles:true}));
    });
    document.querySelector(".lm-ctrl-photos")?.append(button);
  }
  const formatNames={
    horizontal:"HORIZONTAL / 16:9",vertical:"VERTICAL / 9:16",
    quadrado:"QUADRADO / 1:1",editorial:"EDITORIAL / √2:1"
  };
  const formatRatio={horizontal:16/9,vertical:9/16,quadrado:1,editorial:Math.SQRT2};
  const mAspect=990.08/743.18;
  const maxMScale=format=>Math.min(95,Math.floor(100*mAspect/formatRatio[format]));
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
    for(const [key,max] of [["kicker",80],["footerLeft",100],["footerRight",100]]){
      if(typeof data[key]==="string")result[key]=data[key].replace(/[\r\n]+/g," ").slice(0,max);
    }
    result.signature=sanitizeSignature(data.signature,data);
    // Saved projects made before this rule may contain a solid M on a photo.
    // Normalize that impossible combination before rendering or exporting.
    if(result.background==="photo"&&result.mContent==="solid")result.mContent="photo";
    return result;
  }
  let state=copy(presets.tipografia);
  try{state=sanitize(JSON.parse(localStorage.getItem(storageKey)))}catch{}
  // M's material survives a temporary "Sem M"; the visible application
  // controls do not create another data model or change the document schema.
  let lastMContent=state.mContent==="off"?(state.background==="photo"?"photo":"solid"):state.mContent;
  // Format-specific reading widths are genuine layout decisions, not zoom.
  // Switching aspect ratios recomposes the text and restores an author's
  // previous column width when they return to that format.
  // The editorial sheet is wide but shorter than the other formats: its default
  // reading column needs room for authored title groups and visible body/footer.
  // The user may still narrow the column; overflow remains a validation error.
  const formatReadingWidths={horizontal:61,vertical:100,quadrado:90,editorial:90};
  const rememberedReadingWidths=new Map([[state.format,state.textWidth]]);
  const rememberedMScales=new Map([[state.format,state.mScale]]);
  const previewImg=by("labAmbientPhoto"),maskImg=by("labMaskPhoto"),markerImg=by("labMarkerPhoto"),mark=by("labSignature");
  const title=by("labRenderedTitle"),body=by("labRenderedBody"),copyArea=by("labCopy");
  const kicker=by("labKicker"),footerLeft=by("labFooterLeft"),footerRight=by("labFooterRight");
  const editorTabs=[];
  const editorPanels=[...document.querySelectorAll("[data-lab-panel]")];
  const validPanels=["pagina","texto","imagem"];
  let activePanel="pagina";
  function selectPanel(name){
    if(validPanels.includes(name))activePanel=name;
    for(const panel of editorPanels)panel.hidden=false;
  }
  selectPanel(activePanel);
  function setFieldVisible(id,visible){
    const input=by(id);
    const wrapper=input?.closest(".lm-lab-field,.lm-ctrl-focus-field");
    if(wrapper)wrapper.hidden=!visible;
  }
  function syncInputs(){
    for(const [key,id] of Object.entries(fields))by(id).value=String(state[key]);
    const markerActive=state.marker!=="none" && !(state.mContent!=="off"&&state.mPresentation==="completo");
    const mActive=state.mContent!=="off";
    const backgroundPhoto=state.background==="photo"||state.mContent==="photo";
    const activeImage=backgroundPhoto;
    const backdropContext=by("labBackdropContext");
    if(backdropContext)backdropContext.textContent=backgroundPhoto?
      markerActive?"Mesma fotografia, duas nitidezes. Os marcadores recortam a variante escolhida; o restante recebe a variante oposta.":
      state.mContent==="photo"?"A mesma fotografia ocupa o M e o fundo, sem preenchimentos sólidos.":"A fotografia permanece nítida, salvo ajuste pelos marcadores.":
      "Composição de cor: M sólido e marcadores cromáticos disponíveis.";
    for(const key of ["photo","focusX","focusY"])by(fields[key]).disabled=!activeImage;
    const fullM=mActive&&state.mPresentation==="completo";
    by("labMPresentationField").hidden=false;
    // Choosing Elemento or Completo also enables the M from "Sem M".
    by("labMPresentation").disabled=false;
    by("labMScale").disabled=!mActive||fullM;
    by("labMPresentationHint").textContent=!mActive?
      "Selecione Elemento ou Completo para aplicar o M.":
      fullM?
      "Completo: M com 100% da altura do canvas, com proporção preservada. A escala anterior fica salva para Elemento.":
      "Elemento: M inteiro, centralizado e com escala ajustável.";
    by("labMScale").closest(".lm-m-scale-field").dataset.scaleLocked=String(fullM);
    by("labColor").disabled=state.background==="photo";
    by("labMarker").disabled=fullM;
    by("labMContentField").hidden=!mActive||state.background==="photo";
    by("labOpenPhotoFromM").hidden=!(mActive&&backgroundPhoto);
    // A solid M is a color-only treatment. Do not offer or restore it
    // on photographic surfaces, including legacy saved projects.
    const solidChoice=document.querySelector('[data-lab-choice="mContent"][data-value="solid"]');
    const solidAllowed=state.background==="color";
    if(solidChoice)solidChoice.hidden=!solidAllowed;
    by("labMContent").querySelector('option[value="solid"]').disabled=!solidAllowed;
    const focusField=by("labMarkerFocusField");
    if(focusField)focusField.hidden=!(markerActive&&backgroundPhoto);
    by("labMarkerFocus").disabled=!(markerActive&&backgroundPhoto);
    // Progressive disclosure: only relevant controls occupy inspector space.
    // Markers are independent of the central M, except in Completo.
    setFieldVisible("labColor",state.background==="color");
    for(const id of ["labPhoto","labFocalPreview","labFocusX","labFocusY"])setFieldVisible(id,activeImage);
    setFieldVisible("labMScale",mActive&&!fullM);
    setFieldVisible("labMarker",!fullM);
    for(const key of ["margin","textWidth","titleScale","mScale","focusX","focusY"]){
      by("lab"+key.charAt(0).toUpperCase()+key.slice(1)+"Value").textContent=state[key]+"%";
      const precision=by("labPrecision-"+key);
      if(precision){
        precision.value=state[key];
        precision.disabled=by(fields[key]).disabled;
      }
    }

    // Visual choice cards and hidden select retain the SAME state.
    // The native controls remain in the DOM for predictable serialization.
    document.querySelectorAll("[data-lab-choice]").forEach(button=>{
      const key=button.dataset.labChoice;
      const select=by(fields[key]);
      button.setAttribute("aria-pressed",String(key==="mPresentation"
        ? mActive&&state.mPresentation===button.dataset.value
        : state[key]===button.dataset.value));
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
      focusPreview.disabled=!activeImage;
      focusPreview.dataset.inactive=String(!activeImage);
      focusPreview.setAttribute("aria-label","Enquadramento da imagem: foco horizontal "+state.focusX+"%, vertical "+state.focusY+"%. Use as setas ou arraste.");
      by("labFocusImage").style.backgroundImage="url('"+photos[state.photo]+"')";
      by("labFocusImage").style.backgroundPosition=state.focusX+"% "+state.focusY+"%";
      by("labFocusPointer").style.left=state.focusX+"%";
      by("labFocusPointer").style.top=state.focusY+"%";
    }
    // The four diagrams show the actual numeric parameters rather than
    // decorative illustrations that might contradict the live page.
    const diagrams={
      margin:["--lm-mini-margin",state.margin+"%"],
      width:["--lm-mini-width",state.textWidth+"%"],
      title:["--lm-mini-title-scale",String(state.titleScale/100)],
      mask:["--lm-mini-mask-scale",String(state.mScale/100)]
    };
    for(const [key,[prop,value]] of Object.entries(diagrams)){
      document.querySelector('[data-control-effect="'+key+'"]')?.style.setProperty(prop,value);
    }
  }
  function readInputs(){
    const next={...state};
    for(const [key,id] of Object.entries(fields)){
      const value=by(id).value;
      next[key]=numeric.has(key)?Number(value):value;
    }
    state=sanitize(next);
  }
  function save(){
    window.dispatchEvent(new Event("labmattar:composition-change"));
    try{
      localStorage.setItem(storageKey,JSON.stringify(state));
      by("labSaveState").textContent="Configuração salva neste navegador / não publicada.";
    }catch{by("labSaveState").textContent="Rascunho local / armazenamento indisponível.";}
  }
  function renderTitleLines(){
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
  }
  function renderTitle(){
    renderTitleLines();
    body.textContent=state.body;
    body.hidden=state.bodyMode!=="visivel";
    kicker.textContent=state.kicker;
    footerLeft.textContent=state.footerLeft;
    footerRight.textContent=state.footerRight;
  }
  function render(){
    const mMax=maxMScale(state.format);
    if(state.mPresentation!=="completo"&&state.mScale>mMax)state.mScale=mMax;
    // An inactive scale control must not overwrite an Elemento value stored
    // for another surface merely because Completo is selected now.
    const visibleMax=state.mPresentation==="completo"?Math.max(mMax,state.mScale):mMax;
    const mScaleInput=by("labMScale");
    mScaleInput.max=String(visibleMax);
    const mPrecision=by("labPrecision-mScale");
    if(mPrecision)mPrecision.max=String(visibleMax);
    syncInputs();
    board.dataset.format=state.format;
    board.dataset.mPresentation=state.mPresentation;
    const markerActive=state.marker!=="none" && !(state.mContent!=="off"&&state.mPresentation==="completo");
    // Photo compositions use one photographic source in two variants.
    // The marker mask chooses which region is sharp and which has blur.
    // The M is a vector clipping region, never a solid substitute for photo.
    const effectiveBackground=(state.background==="photo"||state.mContent==="photo")?"photo":"color";
    const backdrop=effectiveBackground==="color"?"color":
      markerActive?(state.markerFocus==="sharp"?"blur":"photo"):
      state.mContent==="photo"?"blur":"photo";
    board.dataset.background=effectiveBackground;
    board.dataset.backdrop=backdrop;
    board.dataset.backgroundRequested=state.background;
    board.dataset.markerBlur=String(markerActive&&effectiveBackground==="photo");
    board.dataset.markerFocus=state.markerFocus;
    board.dataset.mContent=state.mContent;
    board.dataset.guide=state.guides;
    board.dataset.photoText="false";
    board.dataset.mText="false";
    board.style.setProperty("--lab-pad",state.margin+"%");
    board.style.setProperty("--lab-text-width",state.textWidth+"%");
    board.style.setProperty("--lab-m-size",state.mScale+"%");
    board.style.setProperty("--lab-focus-x",state.focusX+"%");
    board.style.setProperty("--lab-focus-y",state.focusY+"%");
    board.style.setProperty("--lab-m-x","50%");
    board.style.setProperty("--lab-m-y","50%");
    by("labMMarkers").dataset.marker=markerActive?state.marker:"none";
    const [bg,ink]=effectiveBackground==="color"?palette[state.color]:["#111713","#f7f6f2"];
    board.style.setProperty("--lab-bg",bg);
    board.style.setProperty("--lab-ink",ink);
    const src=photos[state.photo];
    previewImg.src=src;
    maskImg.src=src;
    markerImg.src=src;
    syncMarkerMask(markerActive&&effectiveBackground==="photo");
    mark.hidden=state.symbol==="none";
    if(!mark.hidden)mark.src="/identidade/"+state.symbol;
    renderTitle();
    // One canonical signature is assembled separately from the M image mask.
    window.LabSignatureComposer?.render(state.signature);
    // Do not carry the previous composition's fitted size into this one.
    title.style.removeProperty("font-size");
    body.style.removeProperty("font-size");
    board.dataset.titleBreak="normal";
    by("labFormatLabel").textContent=formatNames[state.format];
    requestMeasurement();
  }
  window.LabSignatureBridge={
    get:()=>sanitizeSignature(state.signature),
    update:signature=>{
      state.signature=sanitizeSignature(signature);
      activePreset="";
      render();
      save();
    }
  };
  // Read-only bridge for the versioned production document.  The existing
  // state remains the single source of truth; imports use its normal renderer
  // and local-draft persistence rather than rewriting the canvas DOM.
  window.addEventListener("labmattar:acervo-select",event=>{
    const data=event.detail;
    if(!data || !/^(google|dropbox|public|local)$/.test(data.provider) ||
      !/^(ext|loc)-[a-z0-9]+$/.test(data.photoKey) ||
      !(data.provider==="local"?/^data:image\/(?:webp|png|jpeg);base64,/.test(data.original||""):
        data.provider==="public"?(data.original||"").startsWith("/api/acervo/public-media?"):
        (data.original||"").startsWith("/api/acervo/media?")))return;
    photos[data.photoKey]=data.original;
    externalMedia.set(data.photoKey,data);
    const input=by("labPhoto");
    if(![...input.options].some(option=>option.value===data.photoKey))
      input.add(new Option(data.name+" / "+data.provider,data.photoKey));
    const name=escape=>String(escape).slice(0,100);
    const buttons=document.querySelector(".lm-ctrl-photos");
    if(buttons && !buttons.querySelector('[data-value="'+data.photoKey+'"]')){
      const button=document.createElement("button");
      button.type="button";button.className="lm-ctrl-choice";
      button.dataset.labChoice="photo";button.dataset.value=data.photoKey;
      const span=document.createElement("span");span.className="lm-ctrl-name";
      span.textContent=name(data.name);button.append(span);
      button.addEventListener("click",()=>{
        input.value=data.photoKey;input.dispatchEvent(new Event("change",{bubbles:true}));
      });
      buttons.append(button);
    }
    if(data.provider!=="local")try{sessionStorage.setItem("lm-acervo-selected",JSON.stringify({
      provider:data.provider,id:data.id,name:data.name,photoKey:data.photoKey,
      ...(data.projectId?{projectId:data.projectId}:{})
    }))}catch{}
    if(!data.restore){
      input.value=data.photoKey;
      input.dispatchEvent(new Event("change",{bubbles:true}));
    }
  });
  window.LabProductionBridge={
    snapshot:()=>({state:JSON.parse(JSON.stringify(state)),photoCatalog:{...photos}}),
    restore:next=>{
      state=sanitize(next);
      rememberedReadingWidths.clear();
      rememberedReadingWidths.set(state.format,state.textWidth);
      rememberedMScales.clear();
      rememberedMScales.set(state.format,state.mScale);
      activePreset="";
      render();
      save();
    }
  };

  function syncMarkerMask(active){
    const overlay=by("labMarkerPhotoLayer");
    if(!overlay)return;
    if(!active){
      overlay.style.removeProperty("-webkit-mask-image");
      overlay.style.removeProperty("mask-image");
      return;
    }
    const width=board.offsetWidth,height=board.offsetHeight;
    if(width<=0||height<=0)return;
    // Reuse the paths and viewBoxes of the actual marker SVG elements:
    // no approximation, independent vector, or duplicated geometry.
    const paths=[];
    const boardRect=board.getBoundingClientRect();
    const zoom=boardRect.width/width||1;
    for(const svg of by("labMMarkers").querySelectorAll("svg")){
      if(getComputedStyle(svg).display==="none")continue;
      const box=svg.getBoundingClientRect(),view=svg.viewBox.baseVal;
      const shape=svg.querySelector("path")?.getAttribute("d");
      if(!shape||!view.width||!view.height)continue;
      const x=(box.left-boardRect.left)/zoom,y=(box.top-boardRect.top)/zoom;
      const sx=box.width/zoom/view.width,sy=box.height/zoom/view.height;
      paths.push('<path transform="translate('+x+' '+y+') scale('+sx+' '+sy+')" d="'+shape+'" fill="white"/>');
    }
    if(!paths.length)return;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'">'+paths.join("")+'</svg>';
    const url='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
    overlay.style.setProperty("-webkit-mask-image",url);
    overlay.style.setProperty("mask-image",url);
  }
  function requestMeasurement(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;syncMarkerMask(board.dataset.markerBlur==="true");measure()});
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
   * Text remains on the page ruler. The relation control changes only its
   * vertical structural band; it never introduces free X/Y positioning.
   */
  function positionCopyOnRuler(){
    copyArea.style.removeProperty("top");
    copyArea.style.removeProperty("transform");
    copyArea.dataset.rulerAdjusted="false";
    return {adjusted:false,room:true};
  }

  /* The three LABMATTAR typography roles are fixed.
   * Validate the rendered title against the shared reading frame. If content
   * exceeds it, report the condition; never shrink an individual title.
   */
  function fitTitleToReadingArea(){
    const reading=by("labReading");
    const kicker=reading.querySelector(".lm-lab-kicker");
    const footer=reading.querySelector(".lm-lab-bottom");
    const lines=[...title.querySelectorAll(".lm-lab-title-line")];
    title.style.removeProperty("font-size");
    body.style.removeProperty("font-size");
    board.dataset.titleBreak="normal";
    positionCopyOnRuler();
    const requested=parseFloat(getComputedStyle(title).fontSize)||36;
    const sideRoom=Math.max(.5,board.getBoundingClientRect().width*.001);
    const safe=reading.getBoundingClientRect();
    const column=copyArea.getBoundingClientRect();
    const kickerRect=kicker.getBoundingClientRect();
    const footerRect=footer.getBoundingClientRect();
    let ok=!!safe.width&&!!safe.height&&column.width>=4&&column.height>=1;
    if(ok){
      const gutter=safe.width*.012;
      ok=kickerRect.top>=safe.top-sideRoom&&footerRect.bottom<=safe.bottom+sideRoom&&
        column.left>=safe.left-sideRoom&&column.right<=safe.right+sideRoom&&
        column.top>=Math.max(safe.top,kickerRect.bottom)+gutter-sideRoom&&
        column.bottom<=Math.min(safe.bottom,footerRect.top)-gutter+sideRoom&&
        title.scrollWidth<=title.clientWidth+1.5;
    }
    for(const item of [title,...lines]){
      if(item.scrollWidth>item.clientWidth+1.5)ok=false;
      for(const rect of rects(item)){
        if(rect.left<column.left-sideRoom||rect.right>column.right+sideRoom||
           rect.left<safe.left-sideRoom||rect.right>safe.right+sideRoom||
           rect.top<safe.top-sideRoom||rect.bottom>safe.bottom+sideRoom)ok=false;
      }
    }
    if(!body.hidden){
      const b=body.getBoundingClientRect();
      if(body.scrollWidth>body.clientWidth+2||
         b.left<safe.left-sideRoom||b.right>safe.right+sideRoom||
         b.top<safe.top-sideRoom||b.bottom>safe.bottom+sideRoom||
         b.bottom>footerRect.top-2)ok=false;
    }
    const info=by("labTitleFitInfo");
    if(info){
      info.dataset.adjusted=String(!ok);
      info.textContent=ok?
        "Título, corpo e detalhe preservados na régua da página.":
        "Conteúdo excede a área útil. Revise texto, largura, formato ou margens; a tipografia não será reduzida.";
    }
    board.dataset.typeFit=ok?"natural":"review";
    board.setAttribute("aria-invalid",String(!ok));
    return {ok,adjusted:false,lowLegibility:false,emergency:!ok,requested,applied:requested};
  }

  function alignMToCopy(){
    if(state.mContent==="off")return;
    board.style.setProperty("--lab-m-x","50%");
    board.style.setProperty("--lab-m-y","50%");
  }

  function syncSolidContrast(){
    let overlay=board.querySelector(".lm-lab-solid-contrast");
    if(state.mContent!=="solid"){
      overlay?.remove();
      return;
    }
    if(!overlay){
      overlay=document.createElement("div");
      overlay.className="lm-lab-solid-contrast";
      overlay.setAttribute("aria-hidden","true");
      overlay.inert=true;
      board.append(overlay);
    }
    const mask=by("labMask"),reading=by("labReading").cloneNode(true);
    for(const node of [reading,...reading.querySelectorAll("*")]){
      node.removeAttribute("id");
      node.removeAttribute("contenteditable");
      node.removeAttribute("tabindex");
      node.removeAttribute("role");
      node.removeAttribute("aria-label");
    }
    overlay.replaceChildren(reading);
    const w=mask.offsetWidth,h=mask.offsetHeight;
    const size=w+"px "+h+"px";
    const position=(mask.offsetLeft-w/2)+"px "+(mask.offsetTop-h/2)+"px";
    overlay.style.maskSize=size;
    overlay.style.webkitMaskSize=size;
    overlay.style.maskPosition=position;
    overlay.style.webkitMaskPosition=position;
  }

  function measure(){
    const titleFit=fitTitleToReadingArea();
    alignMToCopy();
    syncSolidContrast();
    const backgroundPhoto=board.dataset.backdrop==="blur"||board.dataset.backdrop==="photo";
    const mPhoto=state.mContent==="photo";
    const hasPhoto=backgroundPhoto||mPhoto;
    const textNodes=[...board.querySelectorAll(".lm-lab-kicker,.lm-lab-title-line,.lm-lab-bottom span")];
    if(!body.hidden)textNodes.push(body);
    board.dataset.photoText=String(backgroundPhoto&&textNodes.some(n=>n.textContent.trim()));
    const mask=by("labMask");
    const overlap=mPhoto&&
      textNodes.some(n=>rects(n).some(r=>intersects(r,mask.getBoundingClientRect())));
    // Footer and kicker are metadata, not the primary editorial column. They
    // still receive the 20% photographic treatment, but do not create a false
    // "separate image/text" conflict beside an otherwise intact title.
    const editorialText=[...board.querySelectorAll(".lm-lab-title-line")];
    if(!body.hidden)editorialText.push(body);
    const editorialOverlap=mPhoto&&
      editorialText.some(n=>rects(n).some(r=>intersects(r,mask.getBoundingClientRect())));
    board.dataset.mText=String(overlap);
    const rect=board.getBoundingClientRect();
    const copyRect=copyArea.getBoundingClientRect();
    const footerRect=board.querySelector(".lm-lab-bottom").getBoundingClientRect();
    const titleWide=title.scrollWidth>title.clientWidth+3||
      [...title.querySelectorAll(".lm-lab-title-line")].some(n=>n.scrollWidth>n.clientWidth+3);
    const invalid=!titleFit.ok||titleWide||copyRect.left<rect.left-2||copyRect.right>rect.right+2||
      copyRect.top<rect.top+1||copyRect.bottom>footerRect.top-6||
      (!body.hidden&&body.scrollWidth>body.clientWidth+3);
    const collision=false;
    // The visual proof and its status must agree: an unintended overlap is
    // never an approved canvas, even if all text fits inside the page.
    board.dataset.state=invalid?"overflow":collision?"collision":"ok";
    board.setAttribute("aria-invalid",String(invalid||collision||titleFit.lowLegibility));
    const status=by("labStatus");
    const desc=invalid?"REVER / CONTEÚDO EXCEDE A ÁREA ÚTIL":
      collision?"REVER / TEXTO E M CRUZAM EM CAMPOS SEPARADOS":
      titleFit.lowLegibility?"REVER LEGIBILIDADE / MARGENS PRESERVADAS":
      titleFit.adjusted?"ESCALA AUTOAJUSTADA / MARGENS PRESERVADAS":
      hasPhoto?"ESTUDO / COMPOSIÇÃO COM IMAGEM":
      "ESTUDO / SUPERFÍCIE TIPOGRÁFICA";
    status.textContent=desc;
    status.dataset.state=invalid?"overflow":collision?"collision":titleFit.lowLegibility?"review":"ok";
    const treatment=by("labPhotoStatus");
    treatment.textContent=!hasPhoto?"SEM VÉU FOTOGRÁFICO":
      backgroundPhoto&&mPhoto?"PRETO 20% / FUNDO + M":
      mPhoto?"PRETO 20% / M":
      "PRETO 20% / FUNDO";
  }
  function applyPreset(key){
    if(!Object.prototype.hasOwnProperty.call(presets,key))return;
    state=copy(presets[key]);
    state.signature=sanitizeSignature(state.signature);
    rememberedReadingWidths.clear();
    rememberedReadingWidths.set(state.format,state.textWidth);
    rememberedMScales.clear();
    rememberedMScales.set(state.format,state.mScale);
    activePreset=key;
    render();save();
  }
  /*
   * In-canvas editorial editing shares the inspector's state and local draft.
   * Never re-render the currently focused contenteditable on each keystroke:
   * doing so would destroy the caret. Canonical title lines are restored only
   * when editing ends, keeping Univers/Perpetua treatment deterministic.
   */
  const inlineEditors=[
    {key:"title",el:title,limit:140,multiline:true},
    {key:"body",el:body,limit:380,multiline:true},
    {key:"kicker",el:kicker,limit:80,multiline:false},
    {key:"footerLeft",el:footerLeft,limit:100,multiline:false},
    {key:"footerRight",el:footerRight,limit:100,multiline:false}
  ];
  const readInlineText=({el,multiline})=>{
    const raw=el.innerText.replace(/\r/g,"").replace(/\u00a0/g," ");
    return multiline?raw.replace(/\n{3,}/g,"\n\n").replace(/^\n+|\n+$/g,""):
      raw.replace(/\n+/g," ");
  };
  const syncInlineValue=(editor)=>{
    const value=readInlineText(editor).slice(0,editor.limit);
    state[editor.key]=value;
    const inspector=fields[editor.key]&&by(fields[editor.key]);
    if(inspector)inspector.value=value;
    activePreset="";
    save();
    requestMeasurement();
  };
  for(const editor of inlineEditors){
    const {el,multiline,key}=editor;
    let snapshot="",cancelled=false,composing=false;
    el.addEventListener("focus",()=>{
      snapshot=state[key];
      cancelled=false;
      board.dataset.editing=key;
      selectPanel("texto");
    });
    el.addEventListener("compositionstart",()=>{composing=true});
    el.addEventListener("compositionend",()=>{
      composing=false;
      syncInlineValue(editor);
    });
    el.addEventListener("beforeinput",e=>{
      if(composing||e.isComposing||!e.inputType?.startsWith("insert"))return;
      const incoming=e.data??e.dataTransfer?.getData("text/plain")??"";
      if(!incoming)return;
      const selected=window.getSelection()?.toString().length||0;
      const current=readInlineText(editor);
      if(current.length-selected+incoming.length>editor.limit)e.preventDefault();
    });
    el.addEventListener("input",()=>{
      if(!composing)syncInlineValue(editor);
    });
    el.addEventListener("keydown",e=>{
      if(e.key==="Escape"){
        e.preventDefault();
        cancelled=true;
        state[key]=snapshot;
        const inspector=fields[key]&&by(fields[key]);
        if(inspector)inspector.value=snapshot;
        el.blur();
      }else if(e.key==="Enter"&&!multiline){
        e.preventDefault();
        el.blur();
      }
    });
    el.addEventListener("blur",()=>{
      if(!cancelled){
        state[key]=readInlineText(editor).slice(0,editor.limit);
      }
      const inspector=fields[key]&&by(fields[key]);
      if(inspector)inspector.value=state[key];
      // Only reconcile the editor being closed. A full render here could
      // reset the caret of another text layer receiving the next click.
      if(key==="title")renderTitleLines();
      else el.textContent=state[key];
      board.removeAttribute("data-editing");
      activePreset="";
        save();
      requestMeasurement();
    });
  }

  // Direct manipulation of the image focal point reuses the exact X/Y
  // sliders and their single state pipeline. No new image transform is added.
  const focusSurface=by("labFocalPreview");
  const clampFocus=v=>Math.max(0,Math.min(100,Math.round(v/5)*5));
  const setFocus=(x,y)=>{
    if(focusSurface.disabled)return;
    by("labFocusX").value=String(clampFocus(x));
    by("labFocusY").value=String(clampFocus(y));
    by("labFocusX").dispatchEvent(new Event("input",{bubbles:true}));
  };
  const readFocusPosition=e=>{
    const bounds=focusSurface.getBoundingClientRect();
    if(bounds.width<=0||bounds.height<=0)return;
    setFocus((e.clientX-bounds.left)/bounds.width*100,(e.clientY-bounds.top)/bounds.height*100);
  };
  focusSurface.addEventListener("pointerdown",e=>{
    if(focusSurface.disabled)return;
    focusSurface.setPointerCapture(e.pointerId);
    readFocusPosition(e);
  });
  focusSurface.addEventListener("pointermove",e=>{
    if(focusSurface.disabled||!focusSurface.hasPointerCapture(e.pointerId))return;
    readFocusPosition(e);
  });
  const releaseFocus=e=>{
    if(focusSurface.hasPointerCapture(e.pointerId))focusSurface.releasePointerCapture(e.pointerId);
  };
  focusSurface.addEventListener("pointerup",releaseFocus);
  focusSurface.addEventListener("pointercancel",releaseFocus);
  focusSurface.addEventListener("keydown",e=>{
    if(focusSurface.disabled)return;
    const delta={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]}[e.key];
    if(!delta)return;
    e.preventDefault();
    setFocus(state.focusX+delta[0],state.focusY+delta[1]);
  });
  // One action model for the graphic controls and the original select fields.
  document.querySelectorAll("[data-lab-choice]").forEach(button=>{
    button.addEventListener("click",()=>{
      const key=button.dataset.labChoice;
      const select=by(fields[key]);
      if(!select||select.disabled)return;
      if(key==="mContent"){
        if(state.mContent!=="off")lastMContent=state.mContent;
        if(button.dataset.value!=="off")lastMContent=button.dataset.value;
      }
      // The three M applications are a single decision. Reuse the two
      // existing native fields to preserve export, tests and saved projects.
      if(key==="mPresentation"&&state.mContent==="off"){
        by("labMContent").value=state.background==="photo"?"photo":lastMContent;
      }
      select.value=button.dataset.value;
      select.dispatchEvent(new Event("change",{bubbles:true}));
    });
  });
  by("labOpenPhotoFromM")?.addEventListener("click",()=>{
    const tab=document.querySelector('[data-mobile-module="fundo"]');
    if(document.body.classList.contains("lm-studio-open"))tab?.click();
    else by("labPhoto")?.closest(".lm-photo-library-field")?.scrollIntoView({block:"nearest",behavior:"smooth"});
  });
  // Keep the original sliders as the source of truth, but allow exact integer
  // percentages in a compact numeric input. This makes one-percent edits
  // possible without adding separate scale controls or new design tokens.
  for(const key of numeric){
    const slider=by(fields[key]);
    slider.step="1";
    const row=slider.closest(".lm-lab-field")?.querySelector(".lm-lab-value-row");
    const output=row?.querySelector("output");
    if(!row||!output)continue;
    const holder=document.createElement("span");
    holder.className="lm-inspector-precision";
    const number=document.createElement("input");
    number.id="labPrecision-"+key;
    number.type="number";
    number.inputMode="numeric";
    number.min=slider.min;
    number.max=slider.max;
    number.step="1";
    number.value=slider.value;
    const label=row.querySelector("label")?.textContent?.trim()||"Escala";
    number.setAttribute("aria-label",label+" em porcentagem");
    const suffix=document.createElement("span");
    suffix.textContent="%";
    suffix.setAttribute("aria-hidden","true");
    holder.append(number,suffix);
    output.after(holder);
    number.addEventListener("change",()=>{
      if(number.disabled)return;
      const raw=Number(number.value);
      if(!Number.isFinite(raw)){number.value=slider.value;return;}
      slider.value=String(Math.max(Number(slider.min),Math.min(Number(slider.max),Math.round(raw))));
      slider.dispatchEvent(new Event("input",{bubbles:true}));
    });
    number.addEventListener("keydown",e=>{
      if(e.key==="Enter"){number.blur();}
    });
  }
  /*
   * Contextual help: permanent explanations and demonstration diagrams live
   * behind small, keyboard-accessible ? triggers. No state or identity rule
   * is changed by reading help; a single help panel is open at a time.
   */
  const helpContent={
    labFormat:["Formato",
      "Altera a proporção da página.",
      "A composição é refeita; o M não é deformado."],
    labMargin:["Margem",
      "Define a área útil.",
      "O texto não ultrapassa esse limite."],
    labColor:["Campo cromático",
      "Escolhe a cor da superfície quando a composição não usa fotografia.",
      "Papel e bege são neutros; verde e vermelho são acentos validados. Azul e marrom continuam em estudo."],
    labGuides:["Guias",
      "Exibem margens e divisões de construção.",
      "Não fazem parte da composição final."],
    labType:["Título",
      "Define o tratamento tipográfico.",
      "Existe um único tipo de título."],
    labTitleScale:["Escala do título",
      "Ajusta o tamanho do título.",
      "O texto permanece dentro da área útil."],
    labTextWidth:["Largura do texto",
      "Define a largura do bloco editorial.",
      "As quebras respondem a essa largura."],
    labBodyMode:["Presença do parágrafo",
      "Escolhe se a página contém somente título ou título acompanhado de texto de leitura.",
      "Você pode editar o parágrafo diretamente sobre a prévia, quando estiver visível."],
    labTitleInput:["Editar título pelo painel",
      "Use este campo para revisar o título sem digitar na própria página. Uma linha corresponde a um grupo editorial.",
      "Enter define uma quebra; a tipografia e o ajuste automático às margens permanecem ativos."],
    labBodyInput:["Editar texto de leitura",
      "Edite o parágrafo no painel ou clique nele diretamente na página.",
      "A largura de leitura e os limites da superfície continuam aplicados durante a edição."],
    labBackground:["Fundo",
      "Define se a superfície usa cor ou mídia visual (fotografia ou vídeo).",
      "O fundo é independente do M."],
    labMContent:["Conteúdo do M",
      "Quando o fundo é cor, o M pode receber cor ou fotografia. Sobre fundo fotográfico, o M usa sempre a fotografia.",
      "Os perfis de aplicação não alteram a geometria do vetor."],
    labMPresentation:["Aplicação do M",
      "Sem M desativa a forma central; Elemento permite ajustar a escala; Completo ocupa 100% da altura da superfície.",
      "O perfil de Elemento mantém sua escala quando você muda de modo."],
    labPhoto:["Fotografia",
      "Escolha a fotografia de fundo. Vídeos do acervo também ocupam esta camada, preservando M e marcadores.",
      "O mesmo enquadramento é usado por todas as camadas da composição."],
    labMarker:["Marcadores do M",
      "Em fotografia, as pontas recortam a versão nítida ou desfocada da mesma imagem. Em cor, permanecem marcadores gráficos.",
      "Os recortes usam a mesma geometria vetorial do M, sem blocos de cor sobre fotografia."],
    labMarkerFocus:["Tratamento dos marcadores",
      "Blur nos marcadores deixa o restante nítido. Nítido nos marcadores deixa o restante com blur.",
      "As duas regiões utilizam a mesma fotografia e o mesmo ponto de enquadramento."],
    labMScale:["Escala do M",
      "Ajusta o tamanho do M mantendo-o no eixo central da página.",
      "A escala varia; posição central e proporção permanecem."],
    labFocalPreview:["Enquadramento",
      "Clique ou arraste para escolher o foco.",
      "O ajuste atua apenas na fotografia."],
    labFocusX:["Foco horizontal",
      "Move o ponto de interesse da imagem da esquerda (0%) para a direita (100%).",
      "Você também pode fazer esse ajuste diretamente no pequeno visor de enquadramento."],
    labFocusY:["Foco vertical",
      "Move o ponto de interesse da imagem do alto (0%) para baixo (100%).",
      "O vetor do M permanece estático; apenas o enquadramento da fotografia muda."],
    labSymbol:["Símbolo de assinatura",
      "Acrescenta uma assinatura independente: o M mestre ou um dos nove vasos.",
      "Essa assinatura não é a máscara fotográfica. São aplicações diferentes do sistema de identidade."]
  };
  let openHelp=null;
  function dismissHelp(){
    if(!openHelp)return;
    openHelp.panel.hidden=true;
    openHelp.trigger.setAttribute("aria-expanded","false");
    openHelp=null;
  }
  function positionHelp(trigger,panel){
    const anchor=trigger.getBoundingClientRect();
    const width=Math.min(325,window.innerWidth-24);
    panel.style.width=width+"px";
    panel.style.left=Math.max(12,Math.min(window.innerWidth-width-12,anchor.right-width))+"px";
    panel.style.maxHeight=Math.min(510,Math.max(100,window.innerHeight-24))+"px";
    const height=panel.getBoundingClientRect().height;
    let top=anchor.bottom+10;
    if(top+height>window.innerHeight-12){
      top=anchor.top-height-10>=12?anchor.top-height-10:
        Math.max(12,window.innerHeight-height-12);
    }
    panel.style.top=top+"px";
  }
  function showHelp(trigger,panel){
    if(openHelp?.trigger===trigger){dismissHelp();return}
    dismissHelp();
    panel.hidden=false;
    trigger.setAttribute("aria-expanded","true");
    openHelp={trigger,panel};
    positionHelp(trigger,panel);
  }
  function helpNode(tag,className,text){
    const el=document.createElement(tag);
    el.className=className;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function addHelp({host,buttonHost,id,subject,effect,rule,overview=false}){
    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="lm-help-trigger"+(overview?" lm-help-trigger-overview":"");
    trigger.dataset.labHelp=id;
    trigger.setAttribute("aria-label","Ajuda: "+subject);
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-controls","labHelp-"+id);
    trigger.textContent="?";
    buttonHost.append(trigger);
    const panel=helpNode("section","lm-help-popover");
    panel.id="labHelp-"+id;
    panel.hidden=true;
    panel.setAttribute("role","region");
    panel.setAttribute("aria-label","Ajuda: "+subject);
    panel.append(helpNode("h4","lm-help-popover-title",subject));
    if(effect)panel.append(helpNode("p","lm-help-popover-effect",effect));
    if(rule){
      const note=helpNode("p","lm-help-popover-rule");
      note.append(helpNode("strong","", "Regra. "),document.createTextNode(rule));
      panel.append(note);
    }
    host.append(panel);
    trigger.addEventListener("click",e=>{
      e.stopPropagation();
      showHelp(trigger,panel);
    });
    return panel;
  }
  // Each command retains the same input and editing behavior. Only the
  // nonessential explanations and miniature diagrams move into its help.
  for(const [id,[subject,effect,rule]] of Object.entries(helpContent)){
    const input=by(id);
    const field=input?.closest(".lm-lab-field,.lm-ctrl-focus-field");
    if(!field)continue;
    let header=field.querySelector(".lm-lab-field-title,.lm-lab-value-row,.lm-ctrl-signature-title,.lm-help-label-row");
    let buttonHost=header;
    if(header?.classList.contains("lm-lab-value-row")){
      const label=header.querySelector("label");
      buttonHost=document.createElement("span");
      buttonHost.className="lm-help-label-inline";
      if(label){header.insertBefore(buttonHost,label);buttonHost.append(label)}
    }else if(header?.classList.contains("lm-ctrl-signature-title")){
      const label=header.querySelector("label");
      buttonHost=document.createElement("span");
      buttonHost.className="lm-help-label-inline";
      if(label){header.insertBefore(buttonHost,label);buttonHost.append(label)}
    }else if(!header){
      const label=field.querySelector(":scope > label");
      buttonHost=document.createElement("div");
      buttonHost.className="lm-help-label-inline";
      field.insertBefore(buttonHost,field.firstChild);
      if(label)buttonHost.append(label);
      else buttonHost.append(helpNode("span","lm-help-field-name",subject));
    }
    const panel=addHelp({host:field,buttonHost,id,subject,effect,rule});
    // Keep the authored explanations in the manual, but show them only if
    // requested. The functional mini-diagram remains live in the popup.
    for(const child of [...field.children]){
      if(child===panel||child===buttonHost)continue;
      if(child.classList.contains("lm-ctrl-helper")||
         (child.tagName==="SMALL"&&!child.classList.contains("lm-lab-fit-info"))||
         child.classList.contains("lm-control-effect")){
        panel.append(child);
      }
    }
  }
  // One guided help sequence for the entire Laboratory. Contextual ? buttons
  // remain independent; reading the tour never edits the composition state.
  const overviewTrigger=by("labOverviewHelp");
  const studioTourTrigger=by("labTourStudioHelp");
  const tourTriggers=[overviewTrigger,studioTourTrigger].filter(Boolean);
  const tourSteps=[
    {
      title:"Como funciona",
      text:"Construa uma página com Superfície, M, Texto e Imagem. As ferramentas mudam o conteúdo e a apresentação, não as regras da identidade.",
      rule:"Uma composição, uma régua e a mesma saída para prévia e exportação.",
      target:".lm-composition-module-index"
    },
    {
      title:"Superfície e margem",
      text:"Escolha Horizontal, Vertical, Quadrado ou Editorial. A margem define a área útil e as guias ajudam a conferir os alinhamentos.",
      rule:"Título, Corpo e Detalhe partem da mesma régua. O formato recompõe, não deforma.",
      module:"superficie",
      target:"#labFormat"
    },
    {
      title:"M e geometria",
      text:"Elemento mostra o M inteiro com escala própria. Completo ocupa toda a altura da página; os marcadores usam as pontas do mesmo vetor.",
      rule:"Eixo central, proporções e matriz vetorial permanecem constantes.",
      module:"m",
      target:"#labMPresentation"
    },
    {
      title:"Área de leitura",
      text:"A coluna organiza o título e, quando ativado, o texto de leitura. A largura pode variar dentro das margens.",
      rule:"Quebre linhas por palavras; não reduza a tipografia para esconder excessos.",
      module:"texto",
      target:"#labTextWidth"
    },
    {
      title:"Título, Corpo e Detalhe",
      text:"Título estabelece a hierarquia. Corpo apresenta a leitura contínua. Detalhe identifica, orienta e credita; suas informações são editadas em Assinatura.",
      rule:"Apenas três tratamentos. Corpo e Detalhe seguem as escalas oficiais do índice de Tipografia.",
      module:"texto",
      target:"#labEditDetail"
    },
    {
      title:"Imagem e contraste",
      text:"Escolha cor, fotografia ou vídeo de fundo e ajuste o enquadramento. O M e os marcadores usam a mesma mídia, com regiões nítidas ou desfocadas.",
      rule:"Preto 20% somente sobre fotografia com texto. Nenhum fundo sólido é criado atrás dos marcadores fotográficos.",
      module:"fundo",
      target:"#labBackground"
    },
    {
      title:"Revisar e exportar",
      text:"Organize a apresentação em Páginas e use Revisar e exportar. Confira as páginas incluídas, escolha PDF, site HTML ou imagem PNG e ajuste a qualidade antes de baixar.",
      rule:"PDF e site incluem a sequência. PNG inclui somente a página em edição. O formato de cada página é definido na montagem.",
      target:"#labOpenDelivery"
    }
  ];
  let tourIndex=-1;
  let originalModule=null;
  let tourReturnFocus=null;
  let tourResizeFrame=0;
  const tourSpotlight=helpNode("div","lm-help-tour-spotlight");
  const tourBackdrop=helpNode("div","lm-help-tour-backdrop");
  const tour=helpNode("section","lm-help-tour");
  tour.id="labHelp-overview";
  tour.setAttribute("role","dialog");
  tour.setAttribute("aria-modal","true");
  tour.setAttribute("aria-label","Ajuda guiada do Laboratório");
  tour.setAttribute("aria-labelledby","labTourTitle");
  tour.tabIndex=-1;
  const tourProgress=helpNode("small","lm-help-tour-progress");
  tourProgress.id="labTourProgress";
  tourProgress.setAttribute("aria-live","polite");
  const tourTitle=helpNode("h3","lm-help-tour-title");
  tourTitle.id="labTourTitle";
  const tourText=helpNode("p","lm-help-tour-copy");
  const tourRule=helpNode("small","lm-help-tour-rule");
  const tourActions=helpNode("div","lm-help-tour-actions");
  const tourBack=helpNode("button","lm-help-tour-back","Voltar");
  const tourNext=helpNode("button","lm-help-tour-next","Entendi");
  const tourClose=helpNode("button","lm-help-tour-close","Fechar");
  tourBack.id="labTourBack";
  tourNext.id="labTourNext";
  tourClose.id="labTourClose";
  for(const button of [tourBack,tourNext,tourClose])button.type="button";
  tourActions.append(tourBack,tourNext);
  tour.append(tourProgress,tourTitle,tourText,tourRule,tourActions,tourClose);
  tourSpotlight.hidden=true;
  tourBackdrop.hidden=true;
  tour.hidden=true;
  document.body.append(tourBackdrop,tourSpotlight,tour);

  const guidedTarget=step=>{
    const node=document.querySelector(step.target);
    if(!node)return null;
    const field=node.closest(".lm-lab-field,.lm-ctrl-focus-field");
    return field&&step.target!=="#labEditDetail"?field:node;
  };
  const showTourPosition=()=>{
    if(tourIndex<0)return;
    const step=tourSteps[tourIndex],target=guidedTarget(step);
    if(!target)return;
    const rect=target.getBoundingClientRect();
    const margin=10;
    const x=Math.max(margin,Math.min(window.innerWidth-margin,rect.left));
    const y=Math.max(margin,Math.min(window.innerHeight-margin,rect.top));
    tourSpotlight.style.left=x+"px";
    tourSpotlight.style.top=y+"px";
    tourSpotlight.style.width=Math.max(1,Math.min(window.innerWidth-margin-x,rect.width))+"px";
    tourSpotlight.style.height=Math.max(1,Math.min(window.innerHeight-margin-y,rect.height))+"px";
    const width=Math.min(360,window.innerWidth-24);
    tour.style.width=width+"px";
    const height=tour.getBoundingClientRect().height;
    const spaceRight=window.innerWidth-rect.right;
    const spaceLeft=rect.left;
    let left=Math.max(12,(window.innerWidth-width)/2);
    let top;
    if(window.innerWidth>700&&spaceRight>=width+26){
      left=rect.right+18;
      top=Math.max(12,Math.min(window.innerHeight-height-12,rect.top));
    }else if(window.innerWidth>700&&spaceLeft>=width+26){
      left=rect.left-width-18;
      top=Math.max(12,Math.min(window.innerHeight-height-12,rect.top));
    }else{
      top=rect.top>=height+24?rect.top-height-12:
        Math.min(window.innerHeight-height-12,rect.bottom+12);
      top=Math.max(12,top);
    }
    tour.style.left=left+"px";
    tour.style.top=top+"px";
  };
  const queueTourPosition=()=>{
    if(tourIndex<0)return;
    cancelAnimationFrame(tourResizeFrame);
    tourResizeFrame=requestAnimationFrame(showTourPosition);
  };
  const closeTour=()=>{
    if(tourIndex<0)return;
    tourIndex=-1;
    cancelAnimationFrame(tourResizeFrame);
    tour.hidden=true;
    tourBackdrop.hidden=true;
    tourSpotlight.hidden=true;
    for(const trigger of tourTriggers)trigger.setAttribute("aria-expanded","false");
    if(originalModule&&document.body.classList.contains("lm-studio-open")){
      const restore=document.querySelector('[data-mobile-module="'+originalModule+'"]');
      if(restore&&restore.getAttribute("aria-pressed")!=="true")restore.click();
    }
    originalModule=null;
    (tourReturnFocus||overviewTrigger)?.focus({preventScroll:true});
    tourReturnFocus=null;
  };
  const renderTourStep=index=>{
    if(index<0||index>=tourSteps.length)return;
    tourIndex=index;
    const step=tourSteps[index];
    if(step.module&&document.body.classList.contains("lm-studio-open")){
      const module=document.querySelector('[data-mobile-module="'+step.module+'"]');
      if(module&&module.getAttribute("aria-pressed")!=="true")module.click();
    }
    tourProgress.textContent=String(index+1).padStart(2,"0")+" / "+String(tourSteps.length).padStart(2,"0");
    tourTitle.textContent=step.title;
    tourText.textContent=step.text;
    tourRule.replaceChildren(helpNode("strong","", "REGRA / "),document.createTextNode(step.rule));
    tourBack.hidden=index===0;
    tourNext.textContent=index===tourSteps.length-1?"Concluir":"Entendi";
    tour.hidden=false;
    tourBackdrop.hidden=false;
    tourSpotlight.hidden=false;
    const target=guidedTarget(step);
    if(target)target.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
    requestAnimationFrame(()=>{
      queueTourPosition();
      tourNext.focus({preventScroll:true});
    });
  };
  const startTour=()=>{
    dismissHelp();
    tourReturnFocus=document.activeElement;
    const current=document.querySelector('.lm-composition-module-index [data-mobile-module][aria-pressed="true"]');
    originalModule=current?.dataset.mobileModule||null;
    for(const trigger of tourTriggers)trigger.setAttribute("aria-expanded","true");
    renderTourStep(0);
  };
  for(const trigger of tourTriggers)trigger.addEventListener("click",e=>{
    e.stopPropagation();
    if(tourIndex>=0)closeTour();
    else startTour();
  });
  tourBack.addEventListener("click",()=>renderTourStep(tourIndex-1));
  tourNext.addEventListener("click",()=>{
    if(tourIndex===tourSteps.length-1)closeTour();
    else renderTourStep(tourIndex+1);
  });
  tourClose.addEventListener("click",closeTour);
  tourBackdrop.addEventListener("click",closeTour);
  document.addEventListener("keydown",e=>{
    if(tourIndex<0)return;
    if(e.key==="Escape"){e.preventDefault();closeTour();return;}
    if(e.key==="ArrowLeft"){e.preventDefault();if(tourIndex>0)renderTourStep(tourIndex-1);return;}
    if(e.key==="ArrowRight"){e.preventDefault();if(tourIndex<tourSteps.length-1)renderTourStep(tourIndex+1);else closeTour();return;}
    if(e.key==="Tab"){
      const buttons=[tourClose,...(!tourBack.hidden?[tourBack]:[]),tourNext];
      const index=buttons.indexOf(document.activeElement);
      if(e.shiftKey&&index<=0){e.preventDefault();buttons[buttons.length-1].focus();}
      else if(!e.shiftKey&&index===buttons.length-1){e.preventDefault();buttons[0].focus();}
    }
  });
  window.addEventListener("resize",queueTourPosition,{passive:true});
  window.addEventListener("scroll",queueTourPosition,{passive:true});

  document.addEventListener("pointerdown",e=>{
    if(openHelp&&!openHelp.trigger.contains(e.target)&&!openHelp.panel.contains(e.target))dismissHelp();
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&openHelp){
      e.preventDefault();
      const trigger=openHelp.trigger;
      dismissHelp();
      trigger.focus();
    }
  });
  // Auto-scroll from the browser must not close help immediately after
  // a click. Keep the panel anchored while the tool stays on screen.
  const followHelp=()=>{
    if(!openHelp)return;
    const rect=openHelp.trigger.getBoundingClientRect();
    if(rect.bottom<0||rect.top>window.innerHeight){
      dismissHelp();
      return;
    }
    positionHelp(openHelp.trigger,openHelp.panel);
  };
  window.addEventListener("scroll",followHelp,{passive:true});
  window.addEventListener("resize",followHelp,{passive:true});
  for(const tab of editorTabs){
    tab.addEventListener("click",dismissHelp);
    tab.addEventListener("keydown",e=>{
      if(["ArrowRight","ArrowLeft","Home","End"].includes(e.key))dismissHelp();
    });
  }
  for(const more of document.querySelectorAll("[data-lab-more]")){
    more.addEventListener("toggle",dismissHelp);
  }
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
      const previousFormat=state.format,previousWidth=state.textWidth,previousMScale=state.mScale;
      readInputs();
      if(id==="labFormat"&&state.format!==previousFormat){
        rememberedReadingWidths.set(previousFormat,previousWidth);
        rememberedMScales.set(previousFormat,previousMScale);
        state.textWidth=rememberedReadingWidths.has(state.format)?
          rememberedReadingWidths.get(state.format):formatReadingWidths[state.format];
        state.mScale=rememberedMScales.has(state.format)?
          rememberedMScales.get(state.format):Math.min(previousMScale,maxMScale(state.format));
        rememberedReadingWidths.set(state.format,state.textWidth);
        rememberedMScales.set(state.format,state.mScale);
      }
      if(id==="labMScale")rememberedMScales.set(state.format,state.mScale);
      if(id==="labBackground"||id==="labPhoto")
        window.dispatchEvent(new CustomEvent("labmattar:background-source-change",{detail:{kind:state.background==="color"?"color":"image"}}));
      if(id==="labTextWidth"||id==="labBackground"||id==="labMContent")
        rememberedReadingWidths.set(state.format,state.textWidth);
      activePreset="";render();save();
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
