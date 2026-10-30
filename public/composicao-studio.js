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
    toggleText.textContent=active?"VOLTAR AO MANUAL":"ABRIR EDITOR";
    quickReset.hidden=!active;
    for(const panel of panels)panel.hidden=false;
    if(updateUrl)setUrl(active);
    if(active)requestAnimationFrame(()=>lab.querySelector(".lm-lab-workspace")?.scrollIntoView({block:"start"}));
  }


  const moduleButtons=[...lab.querySelectorAll("[data-mobile-module]")];
  const mobileQuery=matchMedia("(max-width:850px)");
  let mobileModule="superficie";
  try{
    const saved=sessionStorage.getItem("labmattar-composicao-mobile-module");
    if(moduleButtons.some(b=>b.dataset.mobileModule===saved))mobileModule=saved;
  }catch{}

  function applyMobileModule(name,{scroll=false}={}){
    if(!moduleButtons.some(b=>b.dataset.mobileModule===name))return;
    mobileModule=name;
    inspector.dataset.mobileModule=name;
    for(const button of moduleButtons)
      button.setAttribute("aria-pressed",String(button.dataset.mobileModule===name));

    const pagePanel=by("labPanel-pagina");
    const textPanel=by("labPanel-texto");
    const imagePanel=by("labPanel-imagem");
    const construction=pagePanel?.querySelector('[data-lab-more="pagina"]');
    const textMore=textPanel?.querySelector('[data-lab-more="texto"]');
    const imageMore=imagePanel?.querySelector('[data-lab-more="imagem"]');

    if(mobileQuery.matches){
      pagePanel.hidden=!(name==="superficie"||name==="construcao");
      textPanel.hidden=name!=="texto";
      imagePanel.hidden=!(name==="fundo"||name==="m"||name==="assinatura");
      if(construction)construction.open=name==="construcao";
      if(name!=="texto"&&textMore)textMore.open=false;
      if(imageMore)imageMore.open=name==="assinatura";
    }else{
      for(const panel of panels)panel.hidden=false;
    }

    try{sessionStorage.setItem("labmattar-composicao-mobile-module",name)}catch{}
    if(scroll&&mobileQuery.matches)
      inspector.querySelector(".lm-composition-module-index")?.scrollIntoView({block:"nearest"});
  }

  for(const button of moduleButtons)
    button.addEventListener("click",()=>applyMobileModule(button.dataset.mobileModule,{scroll:true}));

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