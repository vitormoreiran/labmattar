/* LABMATTAR / laboratório de composição. Somente demonstração; não altera tokens oficiais. */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const board=by("labArtboard");
  if(!board)return;
  const storageKey="labmattar-composicao-lab-v1";
  const defaultMetadata={
    kicker:"LABMATTAR / 2026",
    footerLeft:"GASTROPERFORMANCE & FOOD DESIGN",
    footerRight:"LABMATTAR / IDENTIDADE VISUAL"
  };
  const presets={
    tipografia:{
      format:"horizontal",color:"neutral",margin:7,guides:"nenhuma",
      placement:"central",relation:"central",gap:0,textWidth:61,titleScale:100,type:"alternada",
      background:"color",mContent:"off",image:"nenhuma",mMode:"janela",photo:"64",mPosition:"centro",marker:"none",mScale:60,focusX:50,focusY:50,symbol:"none",
      title:"PRÁTICAS\nMATERIAIS\nE PROCESSOS",
      body:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"oculto",
      ...defaultMetadata
    },
    mascara:{
      format:"horizontal",color:"neutral",margin:7,guides:"margens",
      placement:"central",relation:"central",gap:0,textWidth:40,titleScale:95,type:"alternada",
      background:"color",mContent:"photo",image:"nenhuma",mMode:"janela",photo:"64",mPosition:"centro",marker:"none",mScale:50,focusX:50,focusY:50,symbol:"none",
      title:"CADA CORPO\nABRE UM\nMUNDO",
      body:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"visivel",
      ...defaultMetadata
    },
    imagem:{
      format:"horizontal",color:"neutral",margin:7,guides:"nenhuma",
      placement:"central",relation:"central",gap:0,textWidth:80,titleScale:95,type:"alternada",
      background:"photo",mContent:"off",image:"nenhuma",mMode:"janela",photo:"179",mPosition:"centro",marker:"none",mScale:60,focusX:50,focusY:50,symbol:"none",
      title:"CADA CORPO\nABRE UM MUNDO",
      body:"Uma gastroperformance que investiga a sinestesia como possibilidade de encontro entre diferentes formas de sentir e perceber o mundo.",bodyMode:"visivel",
      ...defaultMetadata
    }
  };
  const fields={
    format:"labFormat",color:"labColor",margin:"labMargin",guides:"labGuides",
    placement:"labPlacement",relation:"labRelation",gap:"labGap",marker:"labMarker",textWidth:"labTextWidth",
    titleScale:"labTitleScale",type:"labType",background:"labBackground",mContent:"labMContent",image:"labImage",mMode:"labMMode",photo:"labPhoto",
    mPosition:"labMPosition",mScale:"labMScale",focusX:"labFocusX",
    focusY:"labFocusY",symbol:"labSymbol",title:"labTitleInput",
    body:"labBodyInput",bodyMode:"labBodyMode"
  };
  const numeric=new Set(["margin","gap","textWidth","titleScale","mScale","focusX","focusY"]);
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
    return result;
  }
  let state=copy(presets.tipografia);
  try{state=sanitize(JSON.parse(localStorage.getItem(storageKey)))}catch{}
  // Format-specific reading widths are genuine layout decisions, not zoom.
  // Switching aspect ratios recomposes the text and restores an author's
  // previous column width when they return to that format.
  const formatReadingWidths={horizontal:61,vertical:90,quadrado:78,editorial:70};
  const rememberedReadingWidths=new Map([[state.format,state.textWidth]]);
  const previewImg=by("labAmbientPhoto"),maskImg=by("labMaskPhoto"),mark=by("labSignature");
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
    const markerActive=state.marker!=="none";
    const backgroundPhoto=state.background==="photo"||markerActive;
    const mActive=state.mContent!=="off";
    const mPhoto=state.mContent==="photo";
    const activeImage=backgroundPhoto||mPhoto;
    for(const key of ["photo","focusX","focusY"])by(fields[key]).disabled=!activeImage;
    for(const key of ["mPosition","mMode"])by(fields[key]).disabled=!mActive;
    by("labMScale").disabled=!mActive;
    by("labColor").disabled=false;
    by("labMarker").disabled=false;
    for(const id of ["labColor","labPhoto","labFocalPreview","labFocusX","labFocusY","labMMode","labMPosition","labMScale","labMarker"])
      setFieldVisible(id,true);
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
    if(state.mScale>mMax)state.mScale=mMax;
    const mScaleInput=by("labMScale");
    mScaleInput.max=String(mMax);
    const mPrecision=by("labPrecision-mScale");
    if(mPrecision)mPrecision.max=String(mMax);
    state.placement="central";
    state.mPosition="centro";
    syncInputs();
    board.dataset.format=state.format;
    board.dataset.placement=state.placement;
    board.dataset.relation="central";
    const markerActive=state.marker!=="none";
    const effectiveBackground=markerActive?"photo":state.background;
    const legacyImage=state.mContent==="photo"?"recorte":effectiveBackground==="photo"?"inteira":"nenhuma";
    board.dataset.image=legacyImage;
    board.dataset.background=effectiveBackground;
    board.dataset.markerBlur=String(markerActive);
    board.dataset.mContent=state.mContent;
    board.dataset.mMode=state.mMode;
    board.dataset.guide=state.guides;
    board.dataset.photoText="false";
    board.dataset.mText="false";
    board.style.setProperty("--lab-pad",state.margin+"%");
    board.style.setProperty("--lab-title-scale",String(state.titleScale/100));
    board.style.setProperty("--lab-text-width",state.textWidth+"%");
    board.style.setProperty("--lab-m-size",state.mScale+"%");
    board.style.setProperty("--lab-focus-x",state.focusX+"%");
    board.style.setProperty("--lab-focus-y",state.focusY+"%");
    board.style.setProperty("--lab-m-x","50%");
    board.style.setProperty("--lab-m-y","50%");
    by("labMMarkers").dataset.marker=state.marker;
    const [bg,ink]=effectiveBackground==="color"?palette[state.color]:["#111713","#f7f6f2"];
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
   * Text remains on the page ruler. The relation control changes only its
   * vertical structural band; it never introduces free X/Y positioning.
   */
  function positionCopyOnRuler(){
    copyArea.style.removeProperty("top");
    copyArea.style.removeProperty("transform");
    copyArea.dataset.rulerAdjusted="false";
    return {adjusted:false,room:true};
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
    const sideRoom=Math.max(.5,board.getBoundingClientRect().width*.001);
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
      const gutter=safe.width*.012;
      if(column.top<top+gutter-sideRoom||column.bottom>bottom-gutter+sideRoom)return false;
      if(title.scrollWidth>title.clientWidth+1.5)return false;
      // Editing can temporarily replace the precomposed title spans with
      // plain text or a BR. The complete range must still obey the margins.
      for(const rect of rects(title)){
        if(rect.left<column.left-sideRoom||rect.right>column.right+sideRoom||
           rect.left<safe.left-sideRoom||rect.right>safe.right+sideRoom||
           rect.top<safe.top-sideRoom||rect.bottom>safe.bottom+sideRoom)return false;
      }
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
        positionCopyOnRuler();
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
    // An editorial surface must not silently turn approved typography into
    // microscopic type. A dense configuration is a validation failure, not a
    // successful layout merely because every glyph fits inside its margins.
    // Both the desired size and its lower bound are proportional to the
    // artwork. A preview resized to 350px must not retain a 14px hard floor.
    const titleFloor=requested*.60;
    const bodyFloor=bodyRequested*.85;
    let applied=null,emergency=false,bodyReduced=false;
    applied=searchTitle(titleFloor);
    if(applied===null&&!body.hidden){
      // Recover vertical space proportionally without breaking the body's
      // minimum readable size or changing the selected editorial hierarchy.
      body.style.fontSize=bodyFloor+"px";
      bodyReduced=true;
      applied=searchTitle(titleFloor);
    }
    if(applied===null){
      // Preserve readable typography. A blocked composition must be corrected
      // through text, column, format or margins; never force 1px text.
      title.style.fontSize=titleFloor+"px";
      positionCopyOnRuler();
      applied=titleFloor;
      board.dataset.titleBreak="normal";
      emergency=true;
    }
    if(bodyReduced&&!body.hidden){
      let low=bodyFloor,high=bodyRequested;
      for(let i=0;i<14;i++){
        const mid=(low+high)/2;
        body.style.fontSize=mid.toFixed(3)+"px";
        if(fits())low=mid;
        else high=mid;
      }
      body.style.fontSize=low.toFixed(3)+"px";
    }
    positionCopyOnRuler();
    const ok=fits();
    const real=parseFloat(getComputedStyle(title).fontSize)||applied||requested;
    const actualBody=parseFloat(getComputedStyle(body).fontSize)||bodyRequested;
    // Reduced hierarchy requires an editorial warning before reaching the
    // absolute proportional floor (60% title / 85% body).
    const lowLegibility=real<requested*.72||(!body.hidden&&actualBody<bodyRequested*.90);
    const adjusted=real<requested*.98||bodyReduced||emergency;
    const info=by("labTitleFitInfo");
    if(info){
      info.dataset.adjusted=String(adjusted||!ok||lowLegibility);
      info.textContent=!ok?
        "Revisar o conteúdo: a área útil está no limite.":
        lowLegibility?
        "Margens preservadas, mas o conteúdo está denso demais: revise o texto ou a largura da coluna.":
        emergency?
        "Composição incompatível com esta coluna: reveja texto, largura ou formato.":
        real<requested*.98?
        "Escala proporcional ajustada para "+Math.round(real/requested*100)+"% do tamanho solicitado.":
        "Escala proporcional aplicada · margens preservadas.";
    }
    board.dataset.typeFit=ok?(lowLegibility?"compromised":adjusted?"adjusted":"natural"):"review";
    board.setAttribute("aria-invalid",String(!ok||lowLegibility));
    return {ok,adjusted,lowLegibility,emergency,requested,applied:real};
  }

  function alignMToCopy(){
    if(state.mContent==="off")return;
    board.style.setProperty("--lab-m-x","50%");
    board.style.setProperty("--lab-m-y","50%");
  }

  function measure(){
    const titleFit=fitTitleToReadingArea();
    alignMToCopy();
    const backgroundPhoto=state.background==="photo";
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
    rememberedReadingWidths.clear();
    rememberedReadingWidths.set(state.format,state.textWidth);
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
      const select=by(fields[button.dataset.labChoice]);
      if(!select||select.disabled)return;
      select.value=button.dataset.value;
      select.dispatchEvent(new Event("change",{bubbles:true}));
    });
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
      "Define se a superfície usa cor ou fotografia.",
      "O fundo é independente do M."],
    labMContent:["M",
      "Define se o M está ausente, sólido ou preenchido por fotografia.",
      "O M permanece central e sua escala é independente do fundo."],
    labImage:["Imagem",
      "Escolha campo liso, fotografia integral ou máscara M.",
      "Com texto sobre fotografia, o preto 20% é automático."],

    labPhoto:["Fotografia",
      "Escolha a imagem.",
      "O enquadramento pode ser ajustado separadamente."],
    labMarker:["Marcadores do M",
      "Ativa a ponta superior, a ponta inferior ou as duas pontas como elementos de marcação da página.",
      "Os marcadores derivam da mesma geometria do M e não alteram o eixo central."],
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
  // The three illustrated examples are alternatives, not numbered steps.
  // The original Construct / Compare / Validate guidance lives here.
  const overviewTrigger=by("labOverviewHelp");
  if(overviewTrigger){
    const wrapper=overviewTrigger.parentElement;
    const panel=helpNode("section","lm-help-popover lm-help-popover-overview");
    panel.id="labHelp-overview";
    panel.hidden=true;
    panel.setAttribute("role","region");
    panel.setAttribute("aria-label","Como funciona o laboratório");
    panel.append(helpNode("h4","lm-help-popover-title","Como usar este laboratório"));
    panel.append(helpNode("p","lm-help-popover-effect",
      "Escolha um exemplo, ajuste Página, Texto e Imagem / M e compare a prova ao lado. Os exemplos não são etapas obrigatórias."));
    const guide=document.querySelector(".lm-lab-legend");
    const limits=document.querySelector(".lm-lab-lead");
    if(guide)panel.append(guide);
    if(limits)panel.append(limits);
    wrapper.append(panel);
    overviewTrigger.addEventListener("click",e=>{
      e.stopPropagation();
      showHelp(overviewTrigger,panel);
    });
  }
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
      const previousMode=state.mMode;
      const previousFormat=state.format,previousWidth=state.textWidth;
      readInputs();
      if(id==="labFormat"&&state.format!==previousFormat){
        rememberedReadingWidths.set(previousFormat,previousWidth);
        state.textWidth=rememberedReadingWidths.has(state.format)?
          rememberedReadingWidths.get(state.format):formatReadingWidths[state.format];
        rememberedReadingWidths.set(state.format,state.textWidth);
      }
      // An application is a compositional decision. Entering M mode gives
      // the word and the whole letter separate readable fields, preserving
      // the user's actual content, fonts, format and selected photograph.

      if(id==="labMMode"&&previousMode!==state.mMode){
        if(state.mMode==="janela")state.mScale=Math.min(state.mScale,50);
      }
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
