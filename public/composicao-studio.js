/* LABMATTAR — unified composition editor.
 * The focused mode enlarges the same inspector used in the manual.
 * It does not create alternate composition types or duplicate controls.
 */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const lab=by("laboratorio"),toggle=by("labStudioToggle"),toggleText=by("labStudioToggleText");
  const reset=by("labReset");
  if(!lab||!toggle||!toggleText)return;

  const panels=[...lab.querySelectorAll("[data-lab-panel]")];
  const inspector=lab.querySelector(".lm-lab-inspector");
  const heading=lab.querySelector(".lm-inspector-head>span");
  let active=false,previewExpanded=false,previewZoom=1;
  let viewportWidth=innerWidth,largestViewportHeight=innerHeight;

  // One composition: every module remains present in both manual and focused mode.
  for(const panel of panels)panel.hidden=false;
  if(heading)heading.textContent="COMPOSIÇÃO";

  let quickReset=by("labStudioQuickReset");
  if(!quickReset){
    quickReset=document.createElement("button");
    quickReset.type="button";
    quickReset.id="labStudioQuickReset";
    quickReset.className="lm-studio-quickreset";
    quickReset.textContent="↺";
    quickReset.title="Restaurar composição";
    quickReset.setAttribute("aria-label","Restaurar composição");
    lab.querySelector(".lm-studio-launch")?.prepend(quickReset);
    quickReset.addEventListener("click",()=>reset?.click());
  }

  function setUrl(open){
    try{
      const url=new URL(location.href);
      if(open)url.searchParams.set("studio","1");
      else url.searchParams.delete("studio");
      history.replaceState(null,"",url);
    }catch{}
  }

  function setActive(open,{updateUrl=true}={}){
    active=Boolean(open);
    document.body.classList.toggle("lm-studio-open",active);
    lab.classList.toggle("lm-unified-studio",active);
    inspector?.setAttribute("data-editor-mode",active?"focused":"manual");
    toggle.setAttribute("aria-pressed",String(active));
    toggleText.textContent=active?"VOLTAR AO LABORATÓRIO":"ABRIR EDITOR";
    quickReset.hidden=!active;
    toggle.setAttribute("aria-label",active?"Voltar ao Laboratório":"Abrir editor de composição");
    if(!active){previewExpanded=false;previewZoom=1;lab.dataset.previewExpanded="false";}
    applyMobileModule(mobileModule);
    if(updateUrl)setUrl(active);
    if(active)requestAnimationFrame(()=>{
      if(innerWidth<=1180)window.scrollTo(0,0);
      else lab.querySelector(".lm-lab-workspace")?.scrollIntoView({block:"start"});
      fitArtboard();
    });
  }


  function syncViewport(){
    const height=Math.round(window.visualViewport?.height||innerHeight);
    if(Math.abs(innerWidth-viewportWidth)>80)largestViewportHeight=height;
    else largestViewportHeight=Math.max(largestViewportHeight,height);
    viewportWidth=innerWidth;
    const typing=document.activeElement?.matches('textarea,input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file])');
    lab.dataset.keyboard=String(Boolean(active&&innerWidth<=1180&&typing&&height<largestViewportHeight*.75));
    document.documentElement.style.setProperty("--lm-app-h",height+"px");
    if(innerWidth>1180){previewExpanded=false;previewZoom=1;lab.dataset.previewExpanded="false";}
    document.body.classList.toggle("lm-phone-layout",window.innerWidth<=700);
    document.body.classList.toggle("lm-tablet-layout",window.innerWidth>700&&window.innerWidth<=1180);
  }
  syncViewport();
  window.addEventListener("resize",syncViewport,{passive:true});
  window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});

  const artboard=by("labArtboard");
  const artboardFrame=by("labArtboardFrame");
  const stage=lab.querySelector(".lm-lab-stage");

  const previewHead=lab.querySelector(".lm-lab-preview-head");
  const previewControls=document.createElement("div");previewControls.className="lm-studio-preview-controls";
  const previewToggle=document.createElement("button");previewToggle.type="button";previewToggle.id="labPreviewToggle";
  previewToggle.setAttribute("aria-controls","labArtboard");previewToggle.setAttribute("aria-expanded","false");
  const zoomControls=document.createElement("div");zoomControls.className="lm-studio-preview-zoom";
  const zoomOut=document.createElement("button"),zoomFit=document.createElement("button"),zoomIn=document.createElement("button");
  for(const button of [zoomOut,zoomFit,zoomIn])button.type="button";
  zoomOut.id="labPreviewZoomOut";zoomOut.textContent="−";zoomOut.setAttribute("aria-label","Reduzir zoom da prévia");
  zoomFit.id="labPreviewFit";zoomFit.textContent="Ajustar";zoomFit.setAttribute("aria-label","Ajustar página à tela");
  zoomIn.id="labPreviewZoomIn";zoomIn.textContent="+";zoomIn.setAttribute("aria-label","Aumentar zoom da prévia");
  zoomControls.append(zoomOut,zoomFit,zoomIn);previewControls.append(previewToggle,zoomControls);previewHead?.append(previewControls);
  by("labOpenDelivery")?.setAttribute("aria-label","Revisar e exportar");
  function refreshPreviewControls(){
    const compact=active&&innerWidth<=1180;
    previewControls.hidden=!compact;zoomControls.hidden=!compact||!previewExpanded;
    previewToggle.textContent=previewExpanded?"Voltar à edição":"Ampliar prévia";
    previewToggle.setAttribute("aria-expanded",String(compact&&previewExpanded));
    zoomOut.disabled=previewZoom<=1;zoomIn.disabled=previewZoom>=4;
    lab.dataset.previewExpanded=String(compact&&previewExpanded);
  }
  function changePreviewZoom(value){
    const x=Math.max(0,Math.min(1,(stage.scrollLeft+stage.clientWidth/2-artboardFrame.offsetLeft)/artboardFrame.clientWidth));
    const y=Math.max(0,Math.min(1,(stage.scrollTop+stage.clientHeight/2-artboardFrame.offsetTop)/artboardFrame.clientHeight));
    previewZoom=Math.max(1,Math.min(4,value));fitArtboard();
    stage.scrollLeft=artboardFrame.offsetLeft+x*artboardFrame.clientWidth-stage.clientWidth/2;
    stage.scrollTop=artboardFrame.offsetTop+y*artboardFrame.clientHeight-stage.clientHeight/2;
  }
  previewToggle.addEventListener("click",()=>{
    previewExpanded=!previewExpanded;previewZoom=1;refreshPreviewControls();
    fitArtboard();stage.scrollTop=0;stage.scrollLeft=0;
  });
  zoomOut.addEventListener("click",()=>changePreviewZoom(previewZoom/1.25));
  zoomIn.addEventListener("click",()=>changePreviewZoom(previewZoom*1.25));
  zoomFit.addEventListener("click",()=>{previewZoom=1;fitArtboard();stage.scrollTop=0;stage.scrollLeft=0;});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&previewExpanded&&!document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]')){
      previewExpanded=false;previewZoom=1;fitArtboard();previewToggle.focus({preventScroll:true});
    }
  });
  document.addEventListener("focusin",event=>{
    if(event.target.matches("input,textarea"))requestAnimationFrame(()=>{syncViewport();fitArtboard();});
  });
  document.addEventListener("focusout",()=>setTimeout(()=>{syncViewport();fitArtboard();},150));

  const logicalSizes={
    horizontal:[1280,720],
    vertical:[720,1280],
    quadrado:[900,900],
    editorial:[1000,707],
    a4:[840,1188]
  };

  function fitArtboard(){
    if(!artboard||!artboardFrame||!stage)return;
    const format=artboard.dataset.format||"horizontal";
    const [logicalW,logicalH]=logicalSizes[format]||logicalSizes.horizontal;
    const compact=active&&innerWidth<=1180;
    refreshPreviewControls();
    const workspace=lab.querySelector(".lm-lab-workspace");
    if(workspace){
      if(compact){
        const split=innerWidth>700||(innerWidth>=560&&innerWidth>innerHeight);
        workspace.style.setProperty("display","grid","important");
        workspace.style.setProperty("grid-template-columns",split&&!previewExpanded?'minmax(0,1fr) minmax(280px,42%)':'minmax(0,1fr)',"important");
        workspace.style.setProperty("grid-template-areas",previewExpanded?'"preview"':split?'"preview controls"':'"preview" "controls"',"important");
        let rows="minmax(0,1fr)";
        if(!split&&!previewExpanded){
          const total=workspace.clientHeight,reserved=Math.min(350,Math.max(240,total*.6));
          const page=(workspace.clientWidth-16)*logicalH/logicalW+60;
          const height=lab.dataset.keyboard==='true'?44:Math.max(140,Math.min(page,total-reserved));
          rows=height+'px minmax(0,1fr)';
        }
        workspace.style.setProperty("grid-template-rows",rows,"important");
        lab.querySelector(".lm-lab-preview")?.style.setProperty("grid-area","preview","important");
        inspector?.style.setProperty("grid-area","controls","important");
      }else{
        for(const property of ["display","grid-template-columns","grid-template-areas","grid-template-rows"])workspace.style.removeProperty(property);
        lab.querySelector(".lm-lab-preview")?.style.removeProperty("grid-area");inspector?.style.removeProperty("grid-area");
      }
    }
    artboard.style.setProperty("width",logicalW+"px","important");
    artboard.style.setProperty("height",logicalH+"px","important");
    artboard.style.setProperty("max-width","none","important");
    artboard.style.setProperty("max-height","none","important");
    artboard.style.setProperty("aspect-ratio","auto","important");

    // Fit the logical page inside the actual stage content box, including
    // its responsive padding. This keeps every edge visible at every format.
    const stageStyle=getComputedStyle(stage);
    const horizontalPadding=parseFloat(stageStyle.paddingLeft)+parseFloat(stageStyle.paddingRight);
    const verticalPadding=parseFloat(stageStyle.paddingTop)+parseFloat(stageStyle.paddingBottom);
    const maxW=Math.max(1,stage.clientWidth-horizontalPadding);
    const maxH=Math.max(1,stage.clientHeight-verticalPadding);
    // In the full editor, use the available workspace even above 100% zoom.
    // Reserve 5% on each side on desktop; smaller screens keep their full
    // usable preview. A single scale preserves every element's proportions.
    const occupancy=active&&window.innerWidth>1180?.9:1;
    const fitW=Math.min(maxW,stage.clientWidth*occupancy);
    const fitH=Math.min(maxH,stage.clientHeight*occupancy);
    const fit=Math.min(fitW/logicalW,fitH/logicalH);
    const scale=(active?fit:Math.min(fit,1))*(compact&&previewExpanded?previewZoom:1);

    // Only Title has its existing format/scale control. Corpo and Detalhe
    // come exclusively from manual-headings.css, at logical export-page size.
    // The preview zoom must never generate a separate hierarchy.
    const pageRatio=Math.min(1,logicalW/900);
    const title=(format==="a4"?48:104)*pageRatio*(Number(by("labTitleScale")?.value||100)/100);
    artboard.style.setProperty("--lm-type-title-size",title.toFixed(3)+"px");
    artboard.style.removeProperty("--lm-type-body-size");
    artboard.style.removeProperty("--lm-type-detail-size");
    artboard.dataset.previewZoom=scale.toFixed(4);

    artboard.style.setProperty("transform-origin","top left","important");
    artboard.style.setProperty("transform","scale("+scale+")","important");
    artboardFrame.style.width=(logicalW*scale)+"px";
    artboardFrame.style.height=(logicalH*scale)+"px";
    artboardFrame.dataset.scale=scale.toFixed(4);
    if(compact)artboardFrame.style.setProperty("margin-top",Math.max(0,(maxH-logicalH*scale)/2)+"px","important");
    else artboardFrame.style.removeProperty("margin-top");
    zoomFit.textContent="Ajustar";
    zoomFit.title="Ajustar página à tela · "+Math.round(scale*100)+"%";
    syncCompactActions(compact);
    positionMoreMenu();
    if(compact&&lab.dataset.keyboard==='true'){
      const field=document.activeElement;
      const panel=field?.closest('.lm-composition-module,#labPages,#labWorkflowMotion');
      if(panel){
        const control=field.getBoundingClientRect(),bounds=panel.getBoundingClientRect();
        const visibleHeight=Math.min(control.height,Math.max(0,bounds.height-32));
        if(control.top<bounds.top+16)panel.scrollTop-=bounds.top+16-control.top;
        else if(control.top+visibleHeight>bounds.bottom-16)panel.scrollTop+=control.top+visibleHeight-bounds.bottom+16;
      }
    }
  }

  const fitObserver=new ResizeObserver(()=>fitArtboard());
  if(stage)fitObserver.observe(stage);
  by("labTitleScale")?.addEventListener("input",()=>requestAnimationFrame(fitArtboard));
  if(artboard)new MutationObserver(fitArtboard).observe(artboard,{attributes:true,attributeFilter:["data-format"]});
  window.addEventListener("resize",fitArtboard,{passive:true});
  window.visualViewport?.addEventListener("resize",fitArtboard,{passive:true});
  requestAnimationFrame(fitArtboard);

  const moduleButtons=[...lab.querySelectorAll("[data-mobile-module]")];
  // Four everyday gestures; format and guides are secondary, not a competing tool.
  const moduleIndex=inspector?.querySelector(".lm-composition-module-index");
  const primaryOrder=["fundo","texto","m","assinatura"];
  if(moduleIndex&&!moduleIndex.querySelector(".lm-studio-secondary")){
    const secondary=document.createElement("details");
    secondary.className="lm-studio-secondary";
    const summary=document.createElement("summary");
    summary.textContent="MAIS OPÇÕES";
    secondary.append(summary);
    const secondaryTools=document.createElement("div");
    secondaryTools.className="lm-studio-secondary-tools";
    secondary.append(secondaryTools);
    const labels={fundo:"IMAGEM",texto:"TEXTO",m:"M",assinatura:"ASSINAR",superficie:"SUPERFÍCIE",construcao:"CONSTRUÇÃO"};
    for(const name of primaryOrder){
      const button=moduleButtons.find(item=>item.dataset.mobileModule===name);
      if(button){button.textContent=labels[name];moduleIndex.append(button);}
    }
    for(const name of ["superficie","construcao"]){
      const button=moduleButtons.find(item=>item.dataset.mobileModule===name);
      if(button){button.textContent=labels[name];secondaryTools.append(button);}
    }
    moduleIndex.append(secondary);
  }
  // Keep technical fields reachable without making them a mandatory step.
  const extrasButton=document.createElement("button");
  extrasButton.type="button";
  extrasButton.className="lm-studio-details-toggle";
  extrasButton.textContent="AJUSTES FINOS +";
  extrasButton.setAttribute("aria-expanded","false");
  extrasButton.addEventListener("click",()=>{
    const showing=inspector.classList.toggle("lm-studio-details");
    extrasButton.setAttribute("aria-expanded",String(showing));
    extrasButton.textContent=showing?"OCULTAR AJUSTES −":"AJUSTES FINOS +";
    if(active&&innerWidth<=1180)moduleIndex.querySelector(".lm-studio-secondary").open=false;
  });
  inspector?.querySelector(".lm-studio-secondary-tools")?.append(extrasButton);
  const secondary=moduleIndex?.querySelector(".lm-studio-secondary");
  const compactActions=[reset,by("labUndoReset")].filter(Boolean).map(button=>{
    const placeholder=document.createComment("original action position");button.before(placeholder);return {button,placeholder};
  });
  function syncCompactActions(compact){
    const target=secondary?.querySelector(".lm-studio-secondary-tools");
    for(const {button,placeholder}of compactActions){
      if(compact&&target&&button.parentElement!==target)target.append(button);
      else if(!compact&&button.parentNode!==placeholder.parentNode)placeholder.before(button);
    }
  }
  secondary?.addEventListener("click",event=>{if(active&&innerWidth<=1180&&event.target.closest('#labReset,#labUndoReset'))secondary.open=false;});
  function positionMoreMenu(){
    if(!secondary?.open||!active||innerWidth>1180)return;
    const summary=secondary.querySelector("summary"),menu=secondary.querySelector(".lm-studio-secondary-tools");
    const rect=summary.getBoundingClientRect(),height=menu.getBoundingClientRect().height;
    const viewport=Number.parseFloat(document.documentElement.style.getPropertyValue("--lm-app-h"))||innerHeight;
    secondary.style.setProperty("--lm-more-top",Math.max(52,Math.min(rect.bottom+4,viewport-height-8))+"px");
    secondary.style.setProperty("--lm-more-right",Math.max(8,innerWidth-rect.right)+"px");
  }
  secondary?.addEventListener("toggle",()=>{if(secondary.open)requestAnimationFrame(positionMoreMenu);});
  secondary?.addEventListener("keydown",event=>{if(event.key==="Escape"){secondary.open=false;secondary.querySelector("summary").focus();event.preventDefault();}});
  document.addEventListener("pointerdown",event=>{if(active&&innerWidth<=1180&&secondary?.open&&!secondary.contains(event.target))secondary.open=false;});
  const mobileQuery=matchMedia("(max-width:1180px)");
  let mobileModule="fundo";
  try{
    const saved=sessionStorage.getItem("labmattar-composicao-mobile-module");
    if(moduleButtons.some(b=>b.dataset.mobileModule===saved))mobileModule=saved;
  }catch{}

  function applyMobileModule(name,{scroll=false}={}){
    if(!moduleButtons.some(b=>b.dataset.mobileModule===name))return;
    mobileModule=name;
    inspector.dataset.mobileModule=name;
    if(["superficie","construcao"].includes(name))moduleIndex?.querySelector(".lm-studio-secondary")?.setAttribute("open","");
    const activeButton=moduleButtons.find(button=>button.dataset.mobileModule===name);
    const activeLabel=(activeButton?.textContent||name).trim();
    inspector.dataset.activeLabel=activeLabel;
    inspector.querySelector(".lm-composition-module-index")?.setAttribute("data-active-label",activeLabel);
    for(const button of moduleButtons)
      button.setAttribute("aria-pressed",String(button.dataset.mobileModule===name));

    const pagePanel=by("labPanel-pagina");
    const textPanel=by("labPanel-texto");
    const imagePanel=by("labPanel-imagem");
    const signaturePanel=by("labPanel-assinatura");
    const construction=pagePanel?.querySelector('[data-lab-more="pagina"]');
    const textMore=textPanel?.querySelector('[data-lab-more="texto"]');
    const imageMore=imagePanel?.querySelector('[data-lab-more="imagem"]');

    if(active){
      pagePanel.hidden=!(name==="superficie"||name==="construcao");
      textPanel.hidden=name!=="texto";
      imagePanel.hidden=!(name==="fundo"||name==="m");
      if(signaturePanel)signaturePanel.hidden=name!=="assinatura";
      if(construction)construction.open=name==="construcao";
      if(name!=="texto"&&textMore)textMore.open=false;
      if(imageMore)imageMore.open=false;
      const imageHeading=imagePanel?.querySelector(".lm-inspector-panel-heading span");
      if(imageHeading)imageHeading.textContent=activeLabel;
    }else{
      for(const panel of panels)panel.hidden=false;
    }

    try{sessionStorage.setItem("labmattar-composicao-mobile-module",name)}catch{}
    if(active&&innerWidth<=1180){
      if(secondary)secondary.open=false;
      if(scroll)[...panels].find(panel=>!panel.hidden)?.scrollTo(0,0);
    }else if(scroll&&mobileQuery.matches)inspector.querySelector(".lm-composition-module-index")?.scrollIntoView({block:"nearest"});
  }

  for(const button of moduleButtons)
    button.addEventListener("click",()=>applyMobileModule(button.dataset.mobileModule,{scroll:true}));

  // Detalhe is the third normative text treatment. The existing Signature
  // editor already owns corner labels, captions and identifications; reuse it
  // instead of creating duplicated text fields or a fourth typography scale.
  const detailJump=by("labEditDetail");
  detailJump?.addEventListener("click",()=>{
    applyMobileModule("assinatura");
    const panel=by("labPanel-assinatura");
    if(active){
      if(panel)panel.scrollTop=0;
      by("labSignatureKind")?.focus({preventScroll:true});
    }else{
      panel?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    }
  });

  mobileQuery.addEventListener?.("change",()=>applyMobileModule(mobileModule));
  applyMobileModule(mobileModule);
  toggle.addEventListener("click",()=>setActive(!active));
  const params=new URLSearchParams(location.search);
  setActive(params.get("studio")==="1",{updateUrl:false});

  window.addEventListener("popstate",()=>{
    const next=new URLSearchParams(location.search).get("studio")==="1";
    setActive(next,{updateUrl:false});
  });
})();
