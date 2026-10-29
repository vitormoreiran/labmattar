/* LABMATTAR — focused, viewport-based composition studio.
 * Reuses the existing LABMATTAR artboard and all canonical input IDs.
 * No new identity style, M geometry, or content/state copy is introduced.
 */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const lab=by("laboratorio"),board=by("labArtboard"),stage=lab?.querySelector(".lm-lab-stage");
  const workspace=lab?.querySelector(".lm-lab-workspace");
  const toolbar=lab?.querySelector(".lm-lab-prep");
  const toggle=by("labStudioToggle");
  const toggleText=by("labStudioToggleText");
  if(!lab||!board||!stage||!workspace||!toggle)return;

  const fieldsByPanel={
    pagina:["labFormat","labMargin","labColor","labGuides"],
    texto:["labPlacement","labType","labTitleScale","labTextWidth","labBodyMode","labTitleInput","labBodyInput"],
    imagem:["labImage","labMMode","labPhoto","labRelation","labMPosition","labMScale","labFocalPreview","labFocusX","labFocusY","labSymbol"]
  };
  const label={
    labFormat:"Formato",labMargin:"Margem",labColor:"Fundo",labGuides:"Guias",
    labPlacement:"Posição",labType:"Fonte",labTitleScale:"Título",labTextWidth:"Coluna",
    labBodyMode:"Leitura",labTitleInput:"Editar título",labBodyInput:"Editar texto",
    labImage:"Aplicação",labMMode:"Uso do M",labPhoto:"Fotografia",labRelation:"Relação",labMPosition:"Posição M",
    labMScale:"Escala M",labFocalPreview:"Enquadrar",labFocusX:"Foco X",
    labFocusY:"Foco Y",labSymbol:"Assinatura"
  };
  const display={
    format:{horizontal:"16:9",vertical:"9:16",quadrado:"1:1",editorial:"√2:1"},
    color:{neutral:"Papel",beige:"Bege",green:"Verde",red:"Vermelho",blue:"Azul",brown:"Marrom"},
    guides:{nenhuma:"Oculto",margens:"Margens",grid:"12 colunas"},
    placement:{esquerda:"Esquerda",central:"Centro",superior:"Superior",inferior:"Inferior"},
    type:{alternada:"U + P",univers:"Univers",perpetua:"Perpetua"},
    bodyMode:{oculto:"Só título",visivel:"Título + texto"},
    image:{nenhuma:"Sem foto",recorte:"Com M",inteira:"Integral"},
    mMode:{janela:"Janela",corte:"Corte lateral",sutil:"Marca sutil"},
    photo:{"64":"Imagem 01","179":"Imagem 02","151":"Imagem 03"},
    relation:{separada:"Separados",sobreposta:"Sobrepostos"},
    mPosition:{esquerda:"Esquerda",centro:"Centro",direita:"Direita"},
    symbol:{none:"Nenhuma","M.svg":"M mestre"}
  };
  const ratio={horizontal:16/9,vertical:9/16,quadrado:1,editorial:Math.SQRT2};
  const entries=new Map(),layouts=new Map();
  let active=false,currentEntry=null,overviewMarker=null;
  let fitFrame=0,syncFrame=0,lastFocus=null;
  const overview=lab.querySelector(".lm-lab-heading-aside");
  if(overview){overviewMarker=document.createComment("Return overview help to manual");overview.after(overviewMarker)}
  const quickReset=document.createElement("button");
  quickReset.type="button";
  quickReset.className="lm-studio-quickreset";
  quickReset.id="labStudioQuickReset";
  quickReset.setAttribute("aria-label","Restaurar composição inicial");
  quickReset.title="Restaurar estudo inicial";
  quickReset.textContent="↺";
  const launch=lab.querySelector(".lm-studio-launch");
  launch?.prepend(quickReset);
  quickReset.addEventListener("click",()=>by("labReset")?.click());

  function make(tag,className,text){
    const el=document.createElement(tag);
    el.className=className;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function fieldValue(id){
    if(id==="labFocalPreview")return by("labFocusX").value+"% · "+by("labFocusY").value+"%";
    const input=by(id);
    if(!input)return "";
    if(input.matches("textarea"))return input.value.trim()?"Editar":"Vazio";
    if(input.type==="range")return input.value+"%";
    if(input.tagName==="SELECT"){
      const val=input.value,fieldName=id.replace(/^lab/,"");
      const key=fieldName.charAt(0).toLowerCase()+fieldName.slice(1);
      return display[key]?.[val]||input.selectedOptions?.[0]?.textContent||val;
    }
    return input.value||"";
  }
  function registerTool(panelName,id,menu,detail){
    const input=by(id);
    const field=input?.closest(".lm-lab-field,.lm-ctrl-focus-field");
    if(!input||!field)throw Error("Missing composition tool "+id);
    const marker=document.createComment("Original field: "+id);
    field.before(marker);
    const button=make("button","lm-studio-tool");
    button.type="button";
    button.dataset.studioTool=id;
    button.setAttribute("aria-controls",detail.id);
    button.setAttribute("aria-expanded","false");
    const labelSpan=make("span","lm-studio-tool-label",label[id]);
    const value=make("span","lm-studio-tool-value","");
    button.append(labelSpan,value);
    menu.append(button);
    const entry={id,panelName,input,field,marker,button,value,detail};
    button.addEventListener("click",()=>openTool(entry));
    entries.set(id,entry);
  }
  for(const [panelName,ids] of Object.entries(fieldsByPanel)){
    const panel=by("labPanel-"+panelName);
    if(!panel)throw Error("Composition inspector panel missing: "+panelName);
    const menu=make("div","lm-studio-tools");
    menu.dataset.studioTools=panelName;
    menu.setAttribute("role","group");
    menu.setAttribute("aria-label","Ferramentas de "+(panelName==="imagem"?"imagem e M":panelName));
    const detail=make("div","lm-studio-detail");
    detail.id="labStudioDetail-"+panelName;
    detail.hidden=true;
    detail.setAttribute("role","region");
    detail.setAttribute("aria-label","Opções de edição");
    const head=make("div","lm-studio-detail-head");
    const back=make("button","lm-studio-back");
    back.type="button";
    back.append(make("span","lm-studio-back-icon","×"),make("span","lm-studio-back-text","RECOLHER"));
    back.setAttribute("aria-label","Recolher opções");
    const value=make("span","lm-studio-detail-value","");
    head.append(back,value);
    const body=make("div","lm-studio-detail-body");
    detail.append(head,body);
    panel.insertBefore(menu,panel.querySelector(".lm-inspector-primary"));
    panel.append(detail);
    layouts.set(panelName,{panel,menu,detail,head,body,back,value});
    for(const id of ids)registerTool(panelName,id,menu,detail);
    back.addEventListener("click",()=>closeTool({focus:true}));
  }

  /*
   * Image / M is an editorial decision, not a folder tree.
   * The existing fields are temporarily lifted into one compact visible
   * surface while the studio is active, then restored to the manual in order.
   * We do not clone inputs, SVGs, or state.
   */
  const imageLayout=layouts.get("imagem");
  const imageFlat=make("div","lm-studio-image-flat");
  imageFlat.id="labStudioImageFlat";
  imageFlat.setAttribute("aria-label","Composição de fotografia e M");
  imageLayout.panel.insertBefore(imageFlat,imageLayout.menu);
  const imageBlocks=[];
  const imageSpec=[
    {name:"aplicacao",fields:["labImage"]},
    {name:"uso",fields:["labMMode"]},
    {name:"fotografia",fields:["labPhoto"]},
    {name:"foco",fields:["labFocalPreview","labFocusX","labFocusY"]},
    {name:"geometria",fields:["labMPosition","labMScale"]},
    {name:"texto",fields:["labRelation"]},
    {name:"assinatura",fields:["labSymbol"]}
  ];
  for(const spec of imageSpec){
    const container=make("div","lm-studio-image-block lm-studio-image-block--"+spec.name);
    container.dataset.studioImageBlock=spec.name;
    container.setAttribute("role","group");
    const heading={
      aplicacao:"IMAGEM",uso:"APLICAÇÃO DO M",fotografia:"FOTOGRAFIA",
      foco:"ENQUADRAMENTO",geometria:"GEOMETRIA DO M",
      texto:"TEXTO E IMAGEM",assinatura:"ASSINATURA"
    }[spec.name];
    container.append(make("span","lm-studio-image-block-label",heading));
    imageFlat.append(container);
    imageBlocks.push({spec,container});
  }
  function mountFlatImage(){
    for(const {spec,container} of imageBlocks)
      for(const id of spec.fields)container.append(entries.get(id).field);
  }
  function restoreFlatImage(){
    for(const {spec} of imageBlocks)
      for(const id of spec.fields){
        const entry=entries.get(id);
        entry.marker.after(entry.field);
      }
  }
  function syncFlatImage(){
    if(!active)return;
    for(const {spec,container} of imageBlocks){
      container.hidden=spec.fields.every(id=>{
        const entry=entries.get(id);
        return entry.field.hidden||entry.input.disabled;
      });
    }
  }

  function restoreField(entry){
    entry.marker.after(entry.field);
    entry.button.setAttribute("aria-expanded","false");
  }
  function closeTool({focus=false}={}){
    if(!currentEntry)return;
    const entry=currentEntry;
    currentEntry=null;
    restoreField(entry);
    const layout=layouts.get(entry.panelName);
    layout.detail.hidden=true;
    // The property index is the stable spatial reference point. It is
    // never removed when a parameter opens or closes.
    if(focus&&active&&!layout.panel.hidden&&!entry.button.hidden)
      entry.button.focus();
    scheduleSync();
  }
  function openTool(entry){
    if(!active)return;
    if(entry.field.hidden||entry.input.disabled)return;
    if(currentEntry===entry){closeTool({focus:true});return}
    closeTool();
    const layout=layouts.get(entry.panelName);
    layout.body.append(entry.field);
    layout.value.textContent=fieldValue(entry.id);
    layout.detail.setAttribute("aria-label","Opções: "+label[entry.id]);
    layout.detail.hidden=false;
    currentEntry=entry;
    entry.button.setAttribute("aria-expanded","true");
    // Leave focus on the chosen property, directly above its new section.
    // Reclick the card to collapse it, or select another tool to switch
    // the options displayed below the unchanged index.
    scheduleSync();
  }
  function syncTools(){
    if(!active)return;
    for(const entry of entries.values()){
      entry.button.hidden=entry.field.hidden||Boolean(entry.input.disabled);
      entry.value.textContent=fieldValue(entry.id);
      entry.button.setAttribute("aria-label",label[entry.id]+": "+entry.value.textContent);
    }
    syncFlatImage();
    if(currentEntry){
      if(currentEntry.field.hidden||currentEntry.input.disabled||
         layouts.get(currentEntry.panelName)?.panel.hidden){
        closeTool();
      }else{
        layouts.get(currentEntry.panelName).value.textContent=fieldValue(currentEntry.id);
      }
    }
  }
  function scheduleSync(){
    if(syncFrame)return;
    syncFrame=requestAnimationFrame(()=>{
      syncFrame=0;
      syncTools();
    });
  }
  function innerDimensions(el){
    const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {
      width:Math.max(0,rect.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-
        parseFloat(style.borderLeftWidth||0)-parseFloat(style.borderRightWidth||0)),
      height:Math.max(0,rect.height-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-
        parseFloat(style.borderTopWidth||0)-parseFloat(style.borderBottomWidth||0))
    };
  }
  function fitBoard(){
    if(!active)return;
    const space=innerDimensions(stage);
    const r=ratio[board.dataset.format]||ratio.horizontal;
    if(space.width<20||space.height<20)return;
    // Contain (not cover): nothing is cropped or distorted. No fixed size
    // for the vertical canvas, square canvas, or horizontal canvas.
    const width=Math.max(1,Math.min(space.width,space.height*r));
    const height=width/r;
    const w=Math.floor(width*100)/100;
    const h=Math.floor(height*100)/100;
    if(Math.abs(board.getBoundingClientRect().width-w)>.3||
       Math.abs(board.getBoundingClientRect().height-h)>.3){
      board.style.setProperty("width",w+"px");
      board.style.setProperty("height",h+"px");
    }
  }
  function scheduleFit(){
    if(fitFrame)return;
    fitFrame=requestAnimationFrame(()=>{
      fitFrame=0;fitBoard();syncTools();
    });
  }
  function setUrlState(on){
    try{
      const url=new URL(window.location.href);
      if(on)url.searchParams.set("studio","1");
      else url.searchParams.delete("studio");
      window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
    }catch{}
  }
  function startStudio(){
    if(active)return;
    lastFocus=document.activeElement;
    active=true;
    mountFlatImage();
    document.body.classList.add("lm-studio-open");
    lab.dataset.studio="true";
    if(overview)toolbar.insertBefore(overview,launch);
    toggle.setAttribute("aria-pressed","true");
    toggleText.textContent="VOLTAR AO MANUAL";
    toggle.setAttribute("aria-label","Sair do editor e voltar ao manual");
    closeTool();
    for(const layout of layouts.values()){
      layout.menu.hidden=false;
      layout.detail.hidden=true;
    }
    setUrlState(true);
    scheduleSync();
    scheduleFit();
    requestAnimationFrame(scheduleFit);
  }
  function stopStudio(){
    if(!active)return;
    closeTool();
    restoreFlatImage();
    active=false;
    document.body.classList.remove("lm-studio-open");
    lab.dataset.studio="false";
    if(overview&&overviewMarker)overviewMarker.before(overview);
    board.style.removeProperty("height");
    board.style.removeProperty("width");
    toggle.setAttribute("aria-pressed","false");
    toggleText.textContent="ABRIR EDITOR";
    toggle.setAttribute("aria-label","Abrir laboratório de composição sem rolagem");
    setUrlState(false);
    if(lastFocus&&lastFocus!==document.body&&lastFocus.isConnected&&lastFocus!==toggle){
      lastFocus.focus({preventScroll:true});
    }
    lastFocus=null;
  }
  toggle.addEventListener("click",()=>active?stopStudio():startStudio());
  window.addEventListener("resize",scheduleFit,{passive:true});
  new ResizeObserver(scheduleFit).observe(stage);
  new MutationObserver(scheduleFit).observe(board,{attributes:true,attributeFilter:["data-format"]});
  for(const layout of layouts.values()){
    new MutationObserver(()=>{
      if(active){
        if(layout.panel.hidden&&currentEntry?.panelName===layout.panel.dataset.labPanel)
          closeTool();
        scheduleSync();
      }
    }).observe(layout.panel,{attributes:true,attributeFilter:["hidden"]});
  }
  // The canonical editor updates visibility and selection through its existing
  // event pipeline. Observe those changes without manufacturing extra state.
  for(const entry of entries.values()){
    new MutationObserver(scheduleSync).observe(entry.field,{attributes:true,attributeFilter:["hidden"]});
  }
  document.addEventListener("input",scheduleSync,true);
  document.addEventListener("change",scheduleSync,true);
  document.addEventListener("click",e=>{
    if(!active)return;
    if(e.target.closest("[data-lab-tab]")&&currentEntry)closeTool();
    scheduleSync();
    scheduleFit();
  },true);
  for(const tab of lab.querySelectorAll("[data-lab-tab]"))
    tab.addEventListener("click",()=>{if(active)closeTool()});
  document.fonts?.ready.then(scheduleFit);
  if(new URLSearchParams(window.location.search).get("studio")==="1")startStudio();
})();