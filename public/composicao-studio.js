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
  let active=false;

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
    applyMobileModule(mobileModule);
    if(updateUrl)setUrl(active);
    if(active)requestAnimationFrame(()=>{lab.querySelector(".lm-lab-workspace")?.scrollIntoView({block:"start"});fitArtboard();});
  }


  function syncViewport(){
    document.documentElement.style.setProperty("--lm-app-h",window.innerHeight+"px");
    document.body.classList.toggle("lm-phone-layout",window.innerWidth<=700);
    document.body.classList.toggle("lm-tablet-layout",window.innerWidth>700&&window.innerWidth<=1180);
  }
  syncViewport();
  window.addEventListener("resize",syncViewport,{passive:true});
  window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});

  const artboard=by("labArtboard");
  const artboardFrame=by("labArtboardFrame");
  const stage=lab.querySelector(".lm-lab-stage");
  const logicalSizes={
    horizontal:[1280,720],
    vertical:[720,1280],
    quadrado:[900,900],
    editorial:[1000,707]
  };

  function fitArtboard(){
    if(!artboard||!artboardFrame||!stage)return;
    const format=artboard.dataset.format||"horizontal";
    // The focused phone layout has several legacy !important grid overrides.
    // Own the preview allocation at the same place where artboard zoom is
    // calculated: do not let a later selector turn the page into a thumbnail.
    const workspace=lab.querySelector(".lm-lab-workspace");
    if(workspace){
      if(active&&window.innerWidth<=700){
        // Some historic rules turn this workspace back into flex. Grid
        // tracks have NO effect unless the actual display is grid.
        workspace.style.setProperty("display","grid","important");
        workspace.style.setProperty("grid-template-columns","minmax(0,1fr)","important");
        workspace.style.setProperty("grid-template-areas",'"preview" "controls"',"important");
        workspace.style.setProperty("grid-template-rows","clamp(300px,54dvh,460px) minmax(0,1fr)","important");
        // Old editor CSS calls this area "page", while the mobile grid calls
        // it "preview". Make those names agree rather than creating an auto
        // third row with a small, content-sized canvas.
        lab.querySelector(".lm-lab-preview")?.style.setProperty("grid-area","preview","important");
        inspector?.style.setProperty("grid-area","controls","important");
      }else{
        workspace.style.removeProperty("display");
        workspace.style.removeProperty("grid-template-columns");
        workspace.style.removeProperty("grid-template-areas");
        workspace.style.removeProperty("grid-template-rows");
        lab.querySelector(".lm-lab-preview")?.style.removeProperty("grid-area");
        inspector?.style.removeProperty("grid-area");
      }
    }
    const [logicalW,logicalH]=logicalSizes[format]||logicalSizes.horizontal;
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
    const scale=Math.min(maxW/logicalW,maxH/logicalH,1);

    // Typography belongs to the logical page, never to the screen zoom.
    // Scale all three canonical roles with page width so resizing the editor
    // cannot change line breaks, clipping or the relationship with the M.
    const pageRatio=Math.min(1,logicalW/900);
    const title=104*pageRatio*(Number(by("labTitleScale")?.value||100)/100);
    const body=32*pageRatio;
    const detail=24*pageRatio;
    artboard.style.setProperty("--lm-type-title-size",title.toFixed(3)+"px");
    artboard.style.setProperty("--lm-type-body-size",body.toFixed(3)+"px");
    artboard.style.setProperty("--lm-type-detail-size",detail.toFixed(3)+"px");
    artboard.dataset.previewZoom=scale.toFixed(4);

    artboard.style.setProperty("transform-origin","top left","important");
    artboard.style.setProperty("transform","scale("+scale+")","important");
    artboardFrame.style.width=(logicalW*scale)+"px";
    artboardFrame.style.height=(logicalH*scale)+"px";
    artboardFrame.dataset.scale=scale.toFixed(4);
  }

  const fitObserver=new ResizeObserver(()=>fitArtboard());
  if(stage)fitObserver.observe(stage);
  by("labTitleScale")?.addEventListener("input",()=>requestAnimationFrame(fitArtboard));
  if(artboard)new MutationObserver(fitArtboard).observe(artboard,{attributes:true,attributeFilter:["data-format"]});
  window.addEventListener("resize",fitArtboard,{passive:true});
  window.visualViewport?.addEventListener("resize",fitArtboard,{passive:true});
  requestAnimationFrame(fitArtboard);

  const moduleButtons=[...lab.querySelectorAll("[data-mobile-module]")];
  const mobileQuery=matchMedia("(max-width:1180px)");
  let mobileModule="superficie";
  try{
    const saved=sessionStorage.getItem("labmattar-composicao-mobile-module");
    if(moduleButtons.some(b=>b.dataset.mobileModule===saved))mobileModule=saved;
  }catch{}

  function applyMobileModule(name,{scroll=false}={}){
    if(!moduleButtons.some(b=>b.dataset.mobileModule===name))return;
    mobileModule=name;
    inspector.dataset.mobileModule=name;
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
    if(scroll&&mobileQuery.matches)
      inspector.querySelector(".lm-composition-module-index")?.scrollIntoView({block:"nearest"});
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