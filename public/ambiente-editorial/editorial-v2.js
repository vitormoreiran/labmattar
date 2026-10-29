(()=>{
"use strict";
const $=id=>document.getElementById(id),uid=()=>Math.random().toString(36).slice(2),roles=["title","subtitle","body","caption","credits"],names={title:"TÍTULO",subtitle:"SUBTÍTULO",body:"CORPO",caption:"LEGENDA",credits:"CRÉDITOS"},profiles={opening:["Abertura",["subtitle","title","body"]],project:["Projeto",roles],development:["Desenvolvimento",["subtitle","title","body","caption"]],gallery:["Galeria",["title","caption"]],text:["Texto",["subtitle","title","body"]],closing:["Encerramento",["title","body"]],credits:["Créditos",["title","body","credits"]]},escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const base=[{id:"64",name:"Cada Corpo / Abertura",src:"./media/BOXDOSENTIR-64.jpg"},{id:"179",name:"Cada Corpo / Projeto",src:"./media/BOXDOSENTIR-179.jpg"},{id:"151",name:"Cada Corpo / Detalhe",src:"./media/BOXDOSENTIR-151.jpg"}];
function make(profile="project",name="Nova página"){return{id:uid(),name,profile,status:"draft",treatment:profile==="text"||profile==="credits"?"sem-imagem":"m-central",media:{assetId:"64",focusX:50,focusY:50,gallery:["64","179","151"]},content:Object.fromEntries(roles.map(r=>[r,""])),visible:{}}}
function initial(){const items=[["opening","Abertura","CADA CORPO ABRE UM MUNDO","GASTROPERFORMANCE","Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo.","64"],["project","O projeto","CADA CORPO ABRE UM MUNDO","SIMONE MATTAR E MARTINA MATTAR","Uma gastroperformance que investiga a sinestesia como possibilidade de encontro entre diferentes formas de sentir e perceber o mundo.","179"],["development","Cinco atos","CINCO ATOS","SAUDADE · GARRA · OTIMISMO · EUFORIA · AMOR","A experiência articula criações gastronômicas, composições olfativas, imagens em movimento, música e poesia.","151"],["gallery","Galeria","IMAGENS DA EXPERIÊNCIA","","Registros visuais de Cada Corpo Abre um Mundo.","179"],["text","O encontro","SENTIR O MUNDO","UM PERCURSO SENSORIAL","Entre memórias individuais e experiências compartilhadas, a obra transforma a mesa em espaço de investigação sensível.","64"],["closing","Encerramento","CADA CORPO ABRE UM MUNDO","","Diferentes maneiras de sentir e perceber o mundo.","64"],["credits","Créditos","CRÉDITOS","","Cada Corpo Abre um Mundo","64"]];return{version:2,title:"Cada Corpo Abre um Mundo",assets:structuredClone(base),pages:items.map(([profile,name,title,subtitle,body,id])=>{const p=make(profile,name);p.content={...p.content,title,subtitle,body};p.media.assetId=id;if(profile==="gallery")p.content.caption=body;if(profile==="credits")p.content.credits="Criação: Simone Mattar e Martina Mattar · O Boticário";if(profile==="development")p.treatment="m-detalhe";if(profile==="gallery")p.treatment="imagem-livre";if(profile==="closing")p.treatment="fundo-com-blur";return p})}}
const key="labmattar-editorial-v2";let doc;try{doc=JSON.parse(localStorage.getItem(key))}catch{}if(!doc?.pages?.length||doc.version!==2)doc=initial();
let selected=doc.pages[0].id,mobile=false,preview=false,past=[],future=[];
const panelStateKey="labmattar-editorial-panels-v1";
let panelState={left:true,right:window.innerWidth>1050};
try{const saved=JSON.parse(localStorage.getItem(panelStateKey)||"null");if(saved&&typeof saved.left==="boolean"&&typeof saved.right==="boolean")panelState=saved}catch{}
function syncPanels(){
 const root=$("editor");
 root.dataset.leftHidden=String(!panelState.left);
 root.dataset.rightHidden=String(!panelState.right);
 $("togglePagesButton").setAttribute("aria-expanded",String(panelState.left));
 $("toggleInspectorButton").setAttribute("aria-expanded",String(panelState.right));
 $("togglePagesButton").title=panelState.left?"Ocultar páginas":"Mostrar páginas";
 $("toggleInspectorButton").title=panelState.right?"Ocultar propriedades":"Mostrar propriedades";
 queueComposition();
}
function togglePanel(side){
 panelState[side]=!panelState[side];
 try{localStorage.setItem(panelStateKey,JSON.stringify(panelState))}catch{}
 syncPanels();
}

const page=()=>doc.pages.find(p=>p.id===selected)||doc.pages[0],asset=id=>doc.assets.find(a=>a.id===id),allowed=(p,r)=>profiles[p.profile][1].includes(r)&&p.visible[r]!==false;
function save(){try{localStorage.setItem(key,JSON.stringify(doc));$("saveStatus").textContent="SALVO NESTE NAVEGADOR"}catch{$("saveStatus").textContent="EXPORTAR PARA PRESERVAR"}}
function checkpoint(){past.push(JSON.stringify(doc));if(past.length>80)past.shift();future=[];buttons()}
function change(fn){checkpoint();fn();save();render()}
function undo(reverse=false){const from=reverse?future:past,to=reverse?past:future;if(!from.length)return;to.push(JSON.stringify(doc));doc=JSON.parse(from.pop());if(!doc.pages.some(p=>p.id===selected))selected=doc.pages[0].id;save();render()}
function buttons(){$("undoButton").disabled=!past.length;$("redoButton").disabled=!future.length}
function render(){
const p=page(),i=doc.pages.indexOf(p),a=asset(p.media.assetId),art=$("artboard");
$("pagesList").innerHTML=doc.pages.map((q,j)=>{
 const thumb=q.treatment!=="sem-imagem"?asset(q.media.assetId):null;
 const image=thumb?'<img loading="lazy" src="'+escape(thumb.src)+'" alt="">':'<span class="thumb-empty">TEXTO</span>';
 const status=({draft:"Rascunho",review:"Em revisão",ready:"Pronta"}[q.status]||"Rascunho");
 return '<button type="button" draggable="true" class="page-entry '+(q.id===selected?"selected":"")+'" data-p="'+escape(q.id)+'" aria-current="'+(q.id===selected?"page":"false")+'" title="Selecionar ou arrastar para ordenar a página '+String(j+1)+'"><span class="page-thumb">'+image+'<span class="page-number">'+String(j+1).padStart(2,"0")+'</span></span><span class="page-meta"><strong>'+escape(q.name)+'</strong><small>'+profiles[q.profile][0]+' · '+status+'</small></span><span class="page-handle" aria-hidden="true">⋮</span></button>';
}).join("");
$("pagesList").querySelectorAll("[data-p]").forEach(b=>{
 b.onclick=()=>{selected=b.dataset.p;render()};
 b.ondragstart=e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",b.dataset.p);b.classList.add("dragging")};
 b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect="move";b.classList.add("drag-over")};
 b.ondragleave=()=>b.classList.remove("drag-over");
 b.ondrop=e=>{e.preventDefault();b.classList.remove("drag-over");const source=e.dataTransfer.getData("text/plain"),target=b.dataset.p;
   if(!source||!target||source===target)return;
   const from=doc.pages.findIndex(p=>p.id===source),to=doc.pages.findIndex(p=>p.id===target);
   if(from<0||to<0)return;
   change(()=>{const [moving]=doc.pages.splice(from,1);doc.pages.splice(to,0,moving);selected=moving.id});
 };
 b.ondragend=()=>{$("pagesList").querySelectorAll(".drag-over,.dragging").forEach(x=>x.classList.remove("drag-over","dragging"))};
});
$("pagesTotal").textContent=doc.pages.length+" PÁGINAS";
$("assetsList").innerHTML=doc.assets.map(a=>'<button class="asset-entry" data-a="'+escape(a.id)+'"><img src="'+escape(a.src)+'" alt=""><span>'+escape(a.name)+'</span></button>').join("");
$("assetsList").querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>change(()=>{page().media.assetId=b.dataset.a;if(page().treatment==="sem-imagem")page().treatment="m-central"}));
$("assetsTotal").textContent=doc.assets.length+" IMAGENS";
art.dataset.profile=p.profile;art.dataset.treatment=p.treatment;art.dataset.hasMedia=String(Boolean(a&&p.treatment!=="sem-imagem"));art.style.setProperty("--focus-x",p.media.focusX+"%");art.style.setProperty("--focus-y",p.media.focusY+"%");
$("primaryPhoto").src=$("ambientPhoto").src=a?.src||"";
art.querySelector(".gallery-grid")?.remove();
if(p.profile==="gallery"){const g=document.createElement("div");g.className="gallery-grid";for(const id of p.media.gallery||[]){const a=asset(id);if(!a)continue;const img=document.createElement("img");img.src=a.src;img.alt=a.name;g.append(img)}$("mediaScene").append(g)}
art.querySelectorAll("[data-content-slot]").forEach(node=>{const r=node.dataset.contentSlot;node.hidden=!allowed(p,r);if(document.activeElement!==node)node.innerText=p.content[r]||"";node.dataset.empty=String(!(p.content[r]||"").trim());node.contentEditable=String(!preview)});
$("compositionLabel").textContent="PÁGINA / "+String(i+1).padStart(2,"0");$("editorialRoleLabel").textContent=profiles[p.profile][0].toUpperCase();$("stageCount").textContent=$("inspectorPage").textContent=String(i+1).padStart(2,"0")+" / "+String(doc.pages.length).padStart(2,"0");$("inspectorPageName").textContent=p.name;
$("previousButton").disabled=i===0;$("nextButton").disabled=i===doc.pages.length-1;$("deleteButton").disabled=doc.pages.length===1;$("movePageUp").disabled=i===0;$("movePageDown").disabled=i===doc.pages.length-1;
$("pageName").value=p.name;$("pageProfile").value=p.profile;$("pageStatus").value=p.status;$("profileDescription").textContent="Organização editorial: "+profiles[p.profile][1].map(r=>names[r].toLowerCase()).join(", ")+". Identidade automática.";
$("contentFields").innerHTML=profiles[p.profile][1].map(r=>'<div class="field-group"><label for="field-'+r+'">'+names[r]+'<span class="field-kind">'+({title:"Hierarquia",subtitle:"Identificação",body:"Leitura",caption:"Legenda",credits:"Ficha técnica"}[r])+'</span></label><textarea id="field-'+r+'" data-field="'+r+'" rows="'+(r==="body"||r==="credits"?5:2)+'" '+(allowed(p,r)?"":"disabled")+'>'+escape(p.content[r])+'</textarea></div>').join("");
$("contentFields").querySelectorAll("[data-field]").forEach(t=>{t.onfocus=checkpoint;t.oninput=()=>{p.content[t.dataset.field]=t.value;const n=art.querySelector('[data-content-slot="'+t.dataset.field+'"]');if(n){n.innerText=t.value;n.dataset.empty=String(!t.value.trim())}save();queueComposition()}});
$("visibilityFields").innerHTML=profiles[p.profile][1].map(r=>'<label class="visibility-option"><input type="checkbox" data-v="'+r+'" '+(allowed(p,r)?"checked":"")+'><span>'+names[r]+'</span></label>').join("");
$("visibilityFields").querySelectorAll("[data-v]").forEach(t=>t.onchange=()=>change(()=>{p.visible[t.dataset.v]=t.checked}));
$("mediaAssetSelect").innerHTML=doc.assets.map(a=>'<option value="'+escape(a.id)+'">'+escape(a.name)+'</option>').join("");$("mediaAssetSelect").value=p.media.assetId;$("mediaTreatment").value=p.treatment;
$("mediaPreviewImage").src=a?.src||"";$("mediaPreviewImage").hidden=!a;$("mediaPreviewName").textContent=a?.name||"Nenhuma imagem selecionada";
for(const ax of ["X","Y"]){$("focus"+ax).value=p.media["focus"+ax];$("focus"+ax+"Value").value=p.media["focus"+ax]+"%"}
$("galleryControls").hidden=p.profile!=="gallery";$("galleryAssets").innerHTML=doc.assets.map(a=>'<label class="gallery-option"><input type="checkbox" data-g="'+escape(a.id)+'" '+(p.media.gallery?.includes(a.id)?"checked":"")+'><span>'+escape(a.name)+'</span></label>').join("");
$("galleryAssets").querySelectorAll("[data-g]").forEach(t=>t.onchange=()=>change(()=>{const ids=new Set(p.media.gallery||[]);t.checked?ids.add(t.dataset.g):ids.delete(t.dataset.g);p.media.gallery=[...ids]}));
$("documentTitle").value=doc.title;$("editor").dataset.viewport=mobile?"mobile":"desktop";$("editor").classList.toggle("is-preview",preview);$("viewportButton").textContent=mobile?"DESKTOP":"MOBILE";$("previewButton").textContent=preview?"EDITAR":"VISUALIZAR";buttons();queueComposition();
}

let layoutFrame=0;
function queueComposition(){
  if(layoutFrame)return;
  layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;fitComposition()});
}
function fitComposition(){
  const art=$("artboard"),stack=$("editorialStack"),title=art.querySelector(".content-title");
  const bounds=art.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const ratio=bounds.width/Math.max(1,bounds.height);
  const layout=bounds.width<700||ratio<.92?"narrow":bounds.width<1110||ratio<1.38?"compact":"wide";
  art.dataset.layout=layout;
  title.style.removeProperty("font-size");
  const hasTitle=title.offsetParent!==null&&title.textContent.trim().length>0;
  const availableHeight=stack.clientHeight;
  const visible=[...stack.children].filter(n=>!n.hidden&&n.dataset.empty!=="true");
  const gap=parseFloat(getComputedStyle(stack).rowGap)||0;
  const fits=()=>{
    const total=visible.reduce((sum,n)=>sum+n.getBoundingClientRect().height,0)+gap*Math.max(0,visible.length-1);
    return total<=availableHeight+2 &&
      visible.every(n=>n.scrollWidth<=n.clientWidth+2) &&
      title.scrollWidth<=title.clientWidth+2;
  };
  if(hasTitle&&!fits()){
    let size=parseFloat(getComputedStyle(title).fontSize)||46;
    const minimum=layout==="narrow"?26:30;
    while(size>minimum&&!fits()){
      size=Math.max(minimum,size-1.5);
      title.style.fontSize=size+"px";
    }
  }
  const overflow=Boolean(visible.length&&!fits());
  art.dataset.overflow=String(overflow);
  $("layoutStatus").textContent=overflow?
    "REVISAR CONTEÚDO / ÁREA DE LEITURA EXCEDIDA":
    "COMPOSIÇÃO AJUSTADA / IDENTIDADE PRESERVADA";
}

function shift(n){const i=doc.pages.indexOf(page()),t=i+n;if(t<0||t>=doc.pages.length)return;change(()=>{const [p]=doc.pages.splice(i,1);doc.pages.splice(t,0,p)})}
document.querySelectorAll("[data-side-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-side-tab]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-selected",String(x===b))});for(const id of ["pages","assets"])$(id+"Panel").hidden=id!==b.dataset.sideTab});
document.querySelectorAll("[data-inspector-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-inspector-tab]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-selected",String(x===b))});for(const id of ["content","structure","media"])$(id+"Panel").hidden=id!==b.dataset.inspectorTab});
$("addPageButton").onclick=()=>change(()=>{const p=make();p.media.assetId=page().media.assetId;doc.pages.splice(doc.pages.indexOf(page())+1,0,p);selected=p.id});
$("movePageUp").onclick=()=>shift(-1);$("movePageDown").onclick=()=>shift(1);
$("previousButton").onclick=()=>{selected=doc.pages[doc.pages.indexOf(page())-1]?.id||selected;render()};$("nextButton").onclick=()=>{selected=doc.pages[doc.pages.indexOf(page())+1]?.id||selected;render()};
$("pageName").onchange=e=>change(()=>{page().name=e.target.value||profiles[page().profile][0]});$("pageProfile").onchange=e=>change(()=>page().profile=e.target.value);$("pageStatus").onchange=e=>change(()=>page().status=e.target.value);
$("mediaAssetSelect").onchange=e=>change(()=>page().media.assetId=e.target.value);$("mediaTreatment").onchange=e=>change(()=>page().treatment=e.target.value);
for(const ax of ["X","Y"]){$("focus"+ax).onpointerdown=checkpoint;$("focus"+ax).oninput=e=>{page().media["focus"+ax]=Number(e.target.value);$("focus"+ax+"Value").value=e.target.value+"%";$("artboard").style.setProperty("--focus-"+ax.toLowerCase(),e.target.value+"%");save()}}
$("duplicateButton").onclick=()=>change(()=>{const p=structuredClone(page());p.id=uid();p.name+=" — cópia";doc.pages.splice(doc.pages.indexOf(page())+1,0,p);selected=p.id});
$("deleteButton").onclick=()=>{if(doc.pages.length===1||!confirm("Excluir esta página? É possível desfazer."))return;change(()=>{const i=doc.pages.indexOf(page());doc.pages.splice(i,1);selected=doc.pages[Math.max(0,i-1)].id})};
$("documentTitle").onfocus=checkpoint;$("documentTitle").oninput=e=>{doc.title=e.target.value;save()};
$("artboard").querySelectorAll("[data-content-slot]").forEach(n=>{n.onfocus=checkpoint;n.oninput=()=>{const r=n.dataset.contentSlot;page().content[r]=n.innerText;const f=$("field-"+r);if(f)f.value=n.innerText;n.dataset.empty=String(!n.innerText.trim());save();queueComposition()}});
$("viewportButton").onclick=()=>{mobile=!mobile;render()};$("previewButton").onclick=()=>{preview=!preview;render()};
$("togglePagesButton").onclick=()=>togglePanel("left");
$("toggleInspectorButton").onclick=()=>togglePanel("right");
document.addEventListener("pointerdown",event=>{if(!$("fileActions").contains(event.target))$("fileActions").open=false});

$("undoButton").onclick=()=>undo();$("redoButton").onclick=()=>undo(true);
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&!e.target.isContentEditable&&!["INPUT","TEXTAREA"].includes(e.target.tagName)){e.preventDefault();undo(e.shiftKey)}});
$("exportButton").onclick=()=>{const blob=new Blob([JSON.stringify(doc,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="labmattar-editorial.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);$("fileActions").open=false};
$("importButton").onclick=()=>{$("fileActions").open=false;$("importFile").click()};$("importFile").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const d=JSON.parse(await file.text());if(d.version!==2||!Array.isArray(d.pages)||!Array.isArray(d.assets)||!d.pages.length)throw Error("Documento incompatível");change(()=>{doc=d;selected=doc.pages[0].id})}catch(e){alert("Importação não realizada: "+e.message)}e.target.value=""};
$("resetButton").onclick=()=>{if(confirm("Restaurar projeto-base? A versão anterior pode ser recuperada com Desfazer nesta sessão."))change(()=>{doc=initial();selected=doc.pages[0].id})};
$("recoverLegacyButton").hidden=!localStorage.getItem("labmattar-editorial-v1");
$("recoverLegacyButton").onclick=()=>{try{const d=JSON.parse(localStorage.getItem("labmattar-editorial-v1"));if(!Array.isArray(d?.pages)||!d.pages.length)throw Error("Sem páginas");if(!confirm("Converter as "+d.pages.length+" páginas do rascunho antigo?"))return;change(()=>{doc=initial();doc.title=d.title||doc.title;doc.pages=d.pages.map(q=>{const profile=({cover:"opening",opening:"opening",project:"project",portfolio:"project",development:"development",essay:"text",gallery:"gallery",closing:"closing",section:"project"})[q.mode]||"project",p=make(profile,q.name);for(const n of q.nodes||[])if(roles.includes(n.role))p.content[n.role]=n.text||"";const src=String(q.images?.[0]?.src||q.images?.[0]||"");p.media.assetId=src.includes("179")?"179":src.includes("151")?"151":"64";p.treatment=({detail:"m-detalhe",none:"sem-imagem",plain:"imagem-livre",portfolio:"m-central",opening:"m-central"})[q.treatment]||"m-central";return p});selected=doc.pages[0].id})}catch(e){alert(e.message)}};
$("addAssetButton").onclick=()=>$("assetFile").click();$("assetFile").onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>1400000){alert("Imagem acima do limite local de 1,4 MB.");return}const reader=new FileReader();reader.onload=()=>change(()=>{const id=uid();doc.assets.push({id,name:f.name,src:reader.result});page().media.assetId=id});reader.readAsDataURL(f);e.target.value=""};
const compositionObserver=new ResizeObserver(queueComposition);
compositionObserver.observe($("artboard"));
document.fonts.ready.then(queueComposition);
window.addEventListener("resize",queueComposition,{passive:true});
syncPanels();save();render();
})();