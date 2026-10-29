/*
 LABMATTAR / Painéis editoriais
 Camada de apresentação do inspector. Não altera regras de identidade
 nem coloca estilos arbitrários à disposição do usuário.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const roles={
 subtitle:{name:"Subtítulo",purpose:"Identificação e contexto"},
 title:{name:"Título",purpose:"Informação principal"},
 body:{name:"Corpo",purpose:"Leitura e desenvolvimento"},
 caption:{name:"Legenda",purpose:"Identificação da imagem"},
 credits:{name:"Créditos",purpose:"Autoria e ficha técnica"}
};
const profileDescriptions={
 opening:{name:"Abertura",purpose:"Introduz o projeto",detail:"Título principal, identificação e imagem de abertura.",visual:"text-media"},
 project:{name:"Projeto",purpose:"Apresenta a obra",detail:"Título editorial, conceito, imagem e informações complementares.",visual:"editorial"},
 development:{name:"Desenvolvimento",purpose:"Desdobra a narrativa",detail:"Corpo e imagem em leitura complementar.",visual:"media-text"},
 gallery:{name:"Galeria",purpose:"Prioriza imagens",detail:"Sequência visual com identificação e legenda.",visual:"gallery"},
 text:{name:"Texto",purpose:"Aprofunda o conteúdo",detail:"Coluna de leitura com título e corpo mais extenso.",visual:"text"},
 closing:{name:"Encerramento",purpose:"Fecha o percurso",detail:"Mensagem final e síntese visual.",visual:"closing"},
 credits:{name:"Créditos",purpose:"Identifica a equipe",detail:"Ficha técnica e informações finais.",visual:"credits"}
};
const treatments=[
{id:"m-central",name:"M central",detail:"Imagem dentro do M"},
{id:"m-detalhe",name:"M detalhe",detail:"Recorte aproximado"},
{id:"fundo-com-blur",name:"Fundo suave",detail:"Fotografia em fundo"},
{id:"imagem-livre",name:"Imagem livre",detail:"Sem a máscara M"},
{id:"sem-imagem",name:"Sem imagem",detail:"Composição de texto"}
];
let libraryQuery="";
let libraryOrientation="all";
let environment=null;
const dimensions=new Map();
const loading=new Set();
const normalize=t=>String(t??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=t=>String(t??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const desc=(p)=>profileDescriptions[p]||profileDescriptions.project;
const statName={draft:"Rascunho",review:"Em revisão",ready:"Pronta"};
function profileSchematic(profile){
 const {visual}=desc(profile);
 return '<span class="profile-diagram" data-diagram="'+visual+'" aria-hidden="true">'+
   '<span class="diagram-titles"><i></i><i></i><i></i></span>'+
   '<span class="diagram-media"><i></i><i></i><i></i><i></i></span>'+
   '<span class="diagram-body"><i></i><i></i></span>'+
   '</span>';
}
function textMeta(text){
 const raw=String(text||"");
 const count=raw.trim().length;
 const words=(raw.trim().match(/\S+/g)||[]).length;
 return count+" caractere"+(count===1?"":"s")+" · "+words+" palavra"+(words===1?"":"s");
}
function renderText(env){
 const p=env.page(), active=env.profiles[p.profile][1];
 const visible=active.filter(r=>env.allowed(p,r));
 $("textFlowOverview").innerHTML='<span class="inspector-note-label">ORDEM DE LEITURA</span>'+
  '<div class="reading-roles">'+active.map((r,i)=>'<span class="reading-role '+(env.allowed(p,r)?"":"inactive")+'"><small>'+String(i+1).padStart(2,"0")+'</small>'+esc(roles[r].name)+'</span>').join('')+'</div>';
 $("textIdentityNote").textContent=(["project","text","credits"].includes(p.profile)?"Univers Light · Perpetua no título":"Univers Light")+" · Hierarquia definida pelo perfil";
 $("textLayoutHealth").textContent=$("artboard").dataset.overflow==="true"?"Conteúdo excede a área de leitura.":"Espaçamentos e quebras preservados automaticamente.";
 const groups=$("contentFields").querySelectorAll(".field-group");
 groups.forEach((group)=>{
   const field=group.querySelector("[data-field]");
   const r=field?.dataset.field;if(!r)return;
   const on=env.allowed(p,r);
   const label=group.querySelector("label");
   label.textContent=roles[r]?.name||r;
   group.classList.toggle("is-inactive",!on);
   const line=document.createElement("div");line.className="editorial-field-head";
   const name=document.createElement("div");name.className="editorial-field-name";
   const kicker=document.createElement("span");kicker.className="inspector-note-label";kicker.textContent=roles[r]?.purpose||"Texto";
   label.after(kicker);
   line.append(label);
   const controls=document.createElement("div");controls.className="field-actions";
   const eye=document.createElement("button");eye.type="button";eye.className="inspector-quiet-button";
   eye.textContent=on?"Ocultar":"Mostrar";
   eye.setAttribute("aria-label",(on?"Ocultar":"Mostrar")+" "+(roles[r]?.name||r));
   eye.onclick=()=>env.change(()=>{env.page().visible[r]=!on});
   const focus=document.createElement("button");focus.type="button";focus.className="inspector-quiet-button";
   focus.textContent="Editar na página";focus.disabled=!on;
   focus.onclick=()=>{const block=$("artboard").querySelector('[data-content-slot="'+r+'"]');block?.focus()};
   controls.append(eye,focus);line.append(controls);
   group.insertBefore(line,kicker);
   const metrics=document.createElement("div");metrics.className="field-metrics";metrics.textContent=textMeta(field.value);
   field.after(metrics);
   field.addEventListener("input",()=>{metrics.textContent=textMeta(field.value)});
 });
}
function renderStructure(env){
 const p=env.page();
 const options=Object.entries(profileDescriptions);
 $("profileLibrary").innerHTML=options.map(([id,info])=>
  '<button type="button" class="profile-choice '+(p.profile===id?'selected':'')+'" data-profile-choice="'+id+'" aria-pressed="'+(p.profile===id)+'" aria-label="Perfil '+info.name+': '+info.purpose+'">'+
  profileSchematic(id)+
  '<span class="profile-choice-text"><strong>'+esc(info.name)+'</strong><small>'+esc(info.purpose)+'</small></span></button>'
 ).join("");
 $("profileLibrary").querySelectorAll("[data-profile-choice]").forEach(button=>button.onclick=()=>{
   const select=$("pageProfile");
   if(select.value===button.dataset.profileChoice)return;
   select.value=button.dataset.profileChoice;
   select.dispatchEvent(new Event("change",{bubbles:true}));
 });
 const detail=desc(p.profile);
 $("profileDescription").innerHTML='<span class="inspector-note-label">APLICAÇÃO / '+esc(detail.name).toUpperCase()+'</span><span>'+esc(detail.detail)+'</span>';
 const statuses=[["draft","Rascunho"],["review","Em revisão"],["ready","Pronta"]];
 $("statusCards").innerHTML=statuses.map(([id,name])=>
  '<button class="editorial-status-choice '+(p.status===id?'selected':'')+'" data-status-choice="'+id+'" aria-pressed="'+(p.status===id)+'" type="button">'+esc(name)+'</button>'
 ).join("");
 $("statusSummary").textContent=statName[p.status]||"Rascunho";
 $("statusCards").querySelectorAll("[data-status-choice]").forEach(button=>button.onclick=()=>{
   const select=$("pageStatus");
   select.value=button.dataset.statusChoice;select.dispatchEvent(new Event("change",{bubbles:true}));
 });
 $("visibilityFields").querySelectorAll("[data-v]").forEach(input=>{
   const role=input.dataset.v;
   const text=input.parentNode.querySelector("span");
   if(text)text.textContent=(roles[role]?.name)||role;
 });
}
function orientationFor(src){
 return dimensions.get(src)?.orientation||"unknown";
}
function observeImage(a){
 if(!a?.src||dimensions.has(a.src)||loading.has(a.src))return;
 loading.add(a.src);
 const im=new Image();
 im.onload=()=>{
   const width=im.naturalWidth||0,height=im.naturalHeight||0;
   const ratio=width/(height||1);
   const orientation=Math.abs(ratio-1)<.12?"square":ratio>1?"landscape":"portrait";
   dimensions.set(a.src,{width,height,orientation});
   loading.delete(a.src);
   if(environment&&libraryOrientation!=="all")renderMediaLibrary(environment);
   else updateOrientationLabels(a.src);
 };
 im.onerror=()=>{loading.delete(a.src);dimensions.set(a.src,{orientation:"unknown",width:0,height:0})};
 im.src=a.src;
}
function updateOrientationLabels(src){
 document.querySelectorAll("[data-library-src]").forEach(el=>{
  if(el.dataset.librarySrc!==src)return;
  const label=el.querySelector(".asset-orientation");
  const a=dimensions.get(src);
  if(label&&a&&a.width)label.textContent=a.width+" × "+a.height;
 });
}
function renderMediaLibrary(env){
 const p=env.page();const all=env.doc.assets||[];
 all.forEach(observeImage);
 const matched=all.filter(a=>{
   const text=normalize(a.name+" "+(a.alt||"")+" "+(a.credit||""));
   return text.includes(normalize(libraryQuery))&&
    (libraryOrientation==="all"||orientationFor(a.src)===libraryOrientation);
 });
 $("libraryCount").textContent=matched.length+" / "+all.length;
 $("libraryFilters").querySelectorAll("[data-orientation]").forEach(button=>{
   const yes=button.dataset.orientation===libraryOrientation;
   button.classList.toggle("selected",yes);button.setAttribute("aria-pressed",String(yes));
 });
 $("mediaLibrary").innerHTML=matched.length?matched.map(a=>{
   const selected=p.media.assetId===a.id;
   const d=dimensions.get(a.src);
   const ratio=d?.width?d.width+" × "+d.height:"Imagem";
   return '<button type="button" role="option" aria-selected="'+selected+'" class="media-library-item '+(selected?'selected':'')+'" data-library-id="'+esc(a.id)+'" data-library-src="'+esc(a.src)+'" title="'+esc(a.name)+'">'+
     '<span class="library-photo"><img loading="lazy" src="'+esc(a.src)+'" alt=""></span>'+
     '<span class="library-caption"><span>'+esc(a.name)+'</span><small class="asset-orientation">'+ratio+'</small></span></button>';
 }).join(''):'<p class="library-empty">Nenhuma imagem corresponde aos filtros. Experimente outra orientação ou termo.</p>';
 $("mediaLibrary").querySelectorAll("[data-library-id]").forEach(button=>button.onclick=()=>{
  const select=$("mediaAssetSelect");select.value=button.dataset.libraryId;
  select.dispatchEvent(new Event("change",{bubbles:true}));
 });
}
function renderTreatments(env){
 const p=env.page(),a=env.asset(p.media.assetId);const src=a?.src||"";
 $("treatmentCards").innerHTML=treatments.map(t=>{
   const selected=p.treatment===t.id;
   const shot=t.id==="sem-imagem"?"":'<img src="'+esc(src)+'" alt="">';
   return '<button type="button" class="treatment-choice '+(selected?'selected':'')+'" data-treatment-choice="'+t.id+'" aria-pressed="'+selected+'">'+
   '<span class="treatment-figure" data-treatment-figure="'+t.id+'">'+shot+'</span>'+
   '<span class="treatment-label">'+esc(t.name)+'</span>'+
   '<small>'+esc(t.detail)+'</small></button>';
 }).join("");
 $("treatmentCards").querySelectorAll("[data-treatment-choice]").forEach(button=>button.onclick=()=>{
    const select=$("mediaTreatment");select.value=button.dataset.treatmentChoice;
    select.dispatchEvent(new Event("change",{bubbles:true}));
 });
}
function renderMedia(env){
 const p=env.page(),a=env.asset(p.media.assetId);
 $("mediaPreviewName").textContent=a?.name||"Nenhuma imagem";
 $("mediaPreviewImage").alt=a?.alt||a?.name||"Imagem";
 $("librarySearch").value=libraryQuery;
 $("librarySearch").oninput=event=>{libraryQuery=event.target.value;renderMediaLibrary(env)};
 $("libraryFilters").querySelectorAll("[data-orientation]").forEach(button=>
  button.onclick=()=>{libraryOrientation=button.dataset.orientation;renderMediaLibrary(env)});
 $("mediaAddAsset").onclick=()=>$("assetFile").click();
 renderMediaLibrary(env);
 renderTreatments(env);
 const zoom=Number.isFinite(Number(p.media.zoom))?Math.max(100,Math.min(175,Number(p.media.zoom))):100;
 $("mediaZoom").value=String(zoom);
 $("mediaZoomValue").value=zoom+"%";
 $("mediaZoom").onpointerdown=()=>env.checkpoint();
 $("mediaZoom").onchange=()=>{env.save()};
 $("mediaZoom").oninput=e=>{
   const value=Number(e.target.value);
   env.page().media.zoom=value;
   $("mediaZoomValue").value=value+"%";
   $("artboard").style.setProperty("--media-zoom",String(value/100));
   env.save();env.queueComposition();
 };
 $("resetMediaCrop").onclick=()=>env.change(()=>{
  const m=env.page().media;m.focusX=50;m.focusY=50;m.zoom=100;
 });
 for(const [id,key] of [["mediaAlt","alt"],["mediaCredit","credit"]]){
   const element=$(id);
   element.disabled=!a;
   element.value=a?.[key]||"";
   element.onfocus=()=>{if(a)env.checkpoint()};
   element.oninput=()=>{const current=env.asset(env.page().media.assetId);if(current){current[key]=element.value;env.save()}};
 }
}
function render(env){
 environment=env;
 renderText(env);
 renderStructure(env);
 renderMedia(env);
}
function updateTextHealth(){
 if(!$("textLayoutHealth"))return;
 $("textLayoutHealth").textContent=$("artboard").dataset.overflow==="true"?
   "Atenção: texto excede a região editorial.":"O sistema preserva espaçamento, quebras e alinhamento.";
}
window.LMInspector={render,updateTextHealth};
})();
