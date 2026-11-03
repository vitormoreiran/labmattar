/* LABMATTAR / Assinatura e uma composicao editorial, nao um seletor de icones.
 * Quatro pontos fixos na margem, tres tratamentos de texto, vetores originais.
 * O estado pertence ao mesmo rascunho persistido do Laboratorio. */
(()=>{
  "use strict";
  const by=id=>document.getElementById(id);
  const board=by("labArtboard"),layer=by("labSignatureLayer");
  const bridge=window.LabSignatureBridge;
  if(!board||!layer||!bridge)return;

  const corners=["tl","tr","bl","br"];
  const cornerNames={tl:"SUPERIOR ESQUERDO",tr:"SUPERIOR DIREITO",bl:"INFERIOR ESQUERDO",br:"INFERIOR DIREITO"};
  const kindNames={none:"VAZIO",brand:"MARCA",symbol:"SÍMBOLO","symbol-label":"SÍMBOLO + TEXTO",text:"TEXTO"};
  const validSymbols=new Set(["M.svg",...Array.from({length:9},(_,i)=>"vaso_"+String(i+1).padStart(2,"0")+".svg")]);
  const freshSlot=(kind="none",text="",symbol="M.svg")=>({kind,text,symbol});
  const presets={
    none:()=>({preset:"none",scale:100,slots:{
      tl:freshSlot(),tr:freshSlot(),bl:freshSlot(),br:freshSlot()
    }}),
    editorial:()=>({preset:"editorial",scale:100,slots:{
      tl:freshSlot("text","LABMATTAR / 2026"),
      tr:freshSlot("symbol","","vaso_03.svg"),
      bl:freshSlot("text","GASTROPERFORMANCE & FOOD DESIGN"),
      br:freshSlot("text","LABMATTAR / IDENTIDADE VISUAL")
    }}),
    navigation:()=>({preset:"navigation",scale:100,slots:{
      tl:freshSlot("brand"),
      tr:freshSlot("symbol-label","SUMÁRIO","M.svg"),
      bl:freshSlot("symbol-label","MENU","vaso_03.svg"),
      br:freshSlot("text","2026")
    }}),
    symbol:()=>({preset:"symbol",scale:100,slots:{
      tl:freshSlot(),tr:freshSlot("symbol","","vaso_03.svg"),
      bl:freshSlot(),br:freshSlot()
    }})
  };
  const kind=by("labSignatureKind"),symbol=by("labSignatureSymbol");
  const text=by("labSignatureText"),scale=by("labSignatureScale");
  const symbolField=by("labSignatureSymbolField"),textField=by("labSignatureTextField");
  const presetsButtons=[...document.querySelectorAll("[data-signature-preset]")];
  const cornerButtons=[...document.querySelectorAll("[data-signature-corner]")];
  let activeCorner="tl";

  function active(){
    return bridge.get();
  }
  function buildSlot(corner,config,signature){
    if(config.kind==="none")return null;
    const slot=document.createElement("div");
    slot.className="lm-lab-signature-slot";
    slot.dataset.corner=corner;
    slot.dataset.kind=config.kind;
    slot.style.setProperty("--lab-signature-scale",String(signature.scale/100));
    if(config.kind==="brand"||config.kind==="symbol"||config.kind==="symbol-label"){
      const image=document.createElement("img");
      image.alt="";
      image.setAttribute("aria-hidden","true");
      image.src="/identidade/"+(config.kind==="brand"?"mattar.svg":validSymbols.has(config.symbol)?config.symbol:"M.svg");
      image.className=config.kind==="brand"?"lm-signature-brand":"lm-signature-symbol";
      slot.append(image);
    }
    if(config.kind==="text"||config.kind==="symbol-label"){
      const caption=document.createElement("span");
      caption.className="detail lm-lab-signature-caption";
      caption.dataset.lmTextRole="detail";
      caption.textContent=config.text;
      slot.append(caption);
    }
    return slot;
  }

  function updateEditor(signature){
    for(const button of presetsButtons)
      button.setAttribute("aria-pressed",String(button.dataset.signaturePreset===signature.preset));
    const stateLabel=by("labSignaturePresetStatus");
    stateLabel.hidden=signature.preset!=="custom";
    stateLabel.textContent=signature.preset==="custom"?
      "Personalizada / composição dos quatro pontos":
      ({none:"Sem assinatura / nenhum elemento no quadro",editorial:"Editorial / identificação, símbolo e créditos",
        navigation:"Navegação / marca, acessos e data",symbol:"Símbolo isolado / posição livre"}[signature.preset]||"Composição");
    for(const button of cornerButtons){
      const corner=button.dataset.signatureCorner,slot=signature.slots[corner];
      button.setAttribute("aria-pressed",String(corner===activeCorner));
      const value=button.querySelector("[data-signature-mini-value]");
      if(value)value.textContent=kindNames[slot.kind]||"VAZIO";
      button.dataset.empty=String(slot.kind==="none");
    }
    by("labSignatureSlotTitle").textContent=cornerNames[activeCorner]+" / CONTEÚDO";
    const slot=signature.slots[activeCorner];
    kind.value=slot.kind;
    symbol.value=slot.symbol;
    text.value=slot.text;
    symbolField.hidden=!["symbol","symbol-label"].includes(slot.kind);
    textField.hidden=!["text","symbol-label"].includes(slot.kind);
    text.placeholder=slot.kind==="symbol-label"?"MENU / SUMÁRIO / ...":"Texto de identificação";
    scale.value=String(signature.scale);
    by("labSignatureScaleValue").textContent=signature.scale+"%";
    const hasSymbol=Object.values(signature.slots).some(item=>["symbol","symbol-label","brand"].includes(item.kind));
    by("labSignatureScale").disabled=!hasSymbol;
    by("labSignatureScale").closest(".lm-signature-scale-field").hidden=!hasSymbol;
  }

  function render(signature){
    if(!signature?.slots)return;
    const fragment=document.createDocumentFragment();
    for(const corner of corners){
      const node=buildSlot(corner,signature.slots[corner],signature);
      if(node)fragment.append(node);
    }
    layer.replaceChildren(fragment);
    board.dataset.signatureSystem="composed";
    const ink=getComputedStyle(board).getPropertyValue("--lab-ink").trim().toLowerCase();
    const white=ink==="#f7f6f2"||ink==="#ffffff"||ink==="#fff";
    board.style.setProperty("--lab-signature-filter",white?"brightness(0) invert(1)":"brightness(0)");
    updateEditor(signature);
  }
  function commit(mutator){
    const next=active();
    mutator(next);
    bridge.update(next);
  }
  for(const button of presetsButtons)button.addEventListener("click",()=>{
    const create=presets[button.dataset.signaturePreset];
    if(!create)return;
    const next=create();
    // The current icon scale is a compositional parameter, not a style preset.
    next.scale=active().scale;
    bridge.update(next);
  });
  for(const button of cornerButtons)button.addEventListener("click",()=>{
    activeCorner=button.dataset.signatureCorner;
    updateEditor(active());
  });
  kind.addEventListener("change",()=>{
    commit(signature=>{
      const slot=signature.slots[activeCorner];
      slot.kind=kind.value;
      if(slot.kind==="symbol-label"&&!slot.text)slot.text="MENU";
      signature.preset="custom";
    });
  });
  symbol.addEventListener("change",()=>commit(signature=>{
    signature.slots[activeCorner].symbol=symbol.value;
    signature.preset="custom";
  }));
  text.addEventListener("input",()=>commit(signature=>{
    signature.slots[activeCorner].text=text.value;
    signature.preset="custom";
  }));
  scale.addEventListener("input",()=>commit(signature=>{
    signature.scale=Number(scale.value);
    signature.preset="custom";
  }));
  window.LabSignatureComposer={render};
  render(active());
})();
