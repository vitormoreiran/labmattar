/*
 LABMATTAR / AREAS EDITORIAIS E PERCURSO DE LEITURA
 Areas: estrutura, fundo estatico e linguagem de leitura compartilhada.
 Paginas: unidades editaveis de conteudo, agrupadas em areas.
 O M permanece uma linguagem de insercao de imagens, nao um preset de identidade.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;":"&#39;"}[c]));
const defaults=[
 {id:"intro",name:"Introdução",backgroundAssetId:"64"},
 {id:"sobre",name:"Sobre",backgroundAssetId:"179"},
 {id:"atos",name:"Atos",backgroundAssetId:"151"},
 {id:"conclusao",name:"Conclusão",backgroundAssetId:"64"}
];
function normalize(doc){
 if(!Array.isArray(doc.sections)||doc.sections.length===0){
   doc.sections=defaults.map(s=>({...s}));
 }
 const valid=new Set(doc.sections.map(s=>s.id));
 let current=doc.sections[0]?.id||"intro";
 for(const p of doc.pages||[]){
   if(!valid.has(p.sectionId)){
     const candidate={opening:"intro",project:"sobre",development:"atos",gallery:"atos",text:"atos",closing:"conclusao",credits:"conclusao"}[p.profile];
     p.sectionId=valid.has(candidate)?candidate:current;
   }
   current=p.sectionId;
   p.media=p.media||{assetId:"64",focusX:50,focusY:50,gallery:[]};
   if(!Number.isFinite(Number(p.media.zoom)))p.media.zoom=100;
 }
 for(const s of doc.sections){
   if(!s.name)s.name="Área sem título";
   if(!doc.assets?.some(a=>a.id===s.backgroundAssetId))
     s.backgroundAssetId=doc.assets?.[0]?.id||"";
 }
 return doc;
}
const areaOf=(doc,p)=>doc.sections.find(s=>s.id===p?.sectionId)||doc.sections[0];
const count=(num)=>num+" página"+(num===1?"":"s");
function renderSidebar(env){
 const {doc,page,asset,profiles,change,selectPage,uiIcon}=env;
 $("areasTotal").textContent=doc.sections.length+" área"+(doc.sections.length===1?"":"s");
 const current=page();
 const markup=doc.sections.map((s,index)=>{
   const pages=doc.pages.filter(p=>p.sectionId===s.id);
   const active=pages.some(p=>p.id===current.id);
   const number=String(index+1).padStart(2,"0");
   const items=pages.map(q=>{
     const global=doc.pages.indexOf(q)+1;
     const thumb=q.treatment!=="sem-imagem"?asset(q.media.assetId):null;
     const image=thumb?'<img loading="lazy" draggable="false" src="'+esc(thumb.src)+'" alt="">':'<span class="thumb-empty">TEXTO</span>';
     const status=({draft:"Rascunho",review:"Em revisão",ready:"Pronta"}[q.status]||"Rascunho");
     return '<button type="button" draggable="true" class="page-entry '+(q.id===current.id?"selected":"")+'" data-p="'+esc(q.id)+'" aria-current="'+(q.id===current.id?"page":"false")+'" title="Selecionar ou arrastar para ordenar a página '+global+'">'+
       '<span class="page-thumb">'+image+'<span class="page-number">'+String(global).padStart(2,"0")+'</span></span>'+
       '<span class="page-meta"><strong>'+esc(q.name)+'</strong><small>'+esc(profiles[q.profile]?.[0]||q.profile)+' · '+status+'</small></span>'+
       '<span class="page-handle" aria-hidden="true">'+uiIcon("grip")+'</span></button>';
   }).join("");
   return '<section class="area-group '+(active?"active":"")+'" data-area-group="'+esc(s.id)+'">'+
     '<div class="area-group-heading"><button type="button" data-focus-area="'+esc(s.id)+'" aria-label="Ir para área '+esc(s.name)+'">'+
     '<span class="area-index">'+number+'</span><span class="area-title">'+esc(s.name)+'</span>'+
     '<span class="area-count">'+count(pages.length)+'</span></button></div>'+
     '<div class="area-group-pages">'+items+'</div></section>';
 }).join("");
 $("pagesList").innerHTML=markup;
 $("pagesList").querySelectorAll("[data-focus-area]").forEach(b=>{
   b.onclick=()=>{
     const first=doc.pages.find(p=>p.sectionId===b.dataset.focusArea);
     if(first)selectPage(first.id);
   };
 });
 $("pagesList").querySelectorAll("[data-p]").forEach(b=>{
   b.onclick=()=>selectPage(b.dataset.p);
   b.ondragstart=e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",b.dataset.p);b.classList.add("dragging")};
   b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect="move";b.classList.add("drag-over")};
   b.ondragleave=()=>b.classList.remove("drag-over");
   b.ondrop=e=>{
      e.preventDefault();
      const source=e.dataTransfer.getData("text/plain"),target=b.dataset.p;
      $("pagesList").querySelectorAll(".drag-over,.dragging").forEach(x=>x.classList.remove("drag-over","dragging"));
      if(!source||!target||source===target)return;
      const from=doc.pages.findIndex(p=>p.id===source);
      const to=doc.pages.findIndex(p=>p.id===target);
      if(from<0||to<0)return;
      change(()=>{
        const section=doc.pages[to].sectionId;
        const [moving]=doc.pages.splice(from,1);
        const targetIndex=doc.pages.findIndex(p=>p.id===target);
        doc.pages.splice(from<to?targetIndex+1:targetIndex,0,moving);
        moving.sectionId=section;
        selectPage(moving.id,false);
      });
   };
   b.ondragend=()=>$("pagesList").querySelectorAll(".drag-over,.dragging").forEach(x=>x.classList.remove("drag-over","dragging"));
 });
}
function renderInspector(env){
 const {doc,page,asset,change,checkpoint,save}=env;
 const p=page(),s=areaOf(doc,p);
 if(!s)return;
 const membership=$("pageSectionSelect");
 membership.innerHTML=doc.sections.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join("");
 membership.value=s.id;
 membership.onchange=e=>{
    const id=e.target.value;
    if(!doc.sections.some(a=>a.id===id)||id===page().sectionId)return;
    change(()=>{
      const moving=page();
      const i=doc.pages.indexOf(moving);
      doc.pages.splice(i,1);
      moving.sectionId=id;
      const last=doc.pages.map((p,index)=>p.sectionId===id?index:-1).filter(n=>n!==-1).pop();
      doc.pages.splice(last===undefined?doc.pages.length:last+1,0,moving);
    });
 };
 const pages=doc.pages.filter(q=>q.sectionId===s.id);
 $("areaPageCount").textContent=count(pages.length);
 $("sectionName").value=s.name;
 $("sectionName").onfocus=checkpoint;
 $("sectionName").onchange=e=>change(()=>{s.name=e.target.value.trim()||"Área sem título"});
 const background=$("sectionBackgroundSelect");
 background.innerHTML=doc.assets.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join("");
 background.value=s.backgroundAssetId;
 const a=asset(s.backgroundAssetId);
 $("sectionBackgroundImage").src=a?.src||"";
 $("sectionBackgroundImage").alt=a?.name||"Sem fundo cadastrado";
 background.onchange=e=>change(()=>{s.backgroundAssetId=e.target.value});
 $("addAreaButton").onclick=()=>change(()=>{
    const newId="area-"+Math.random().toString(36).slice(2,9);
    const area={id:newId,name:"Nova área",backgroundAssetId:s.backgroundAssetId};
    const position=doc.sections.findIndex(a=>a.id===s.id);
    doc.sections.splice(position+1,0,area);
    const newPage={
      id:Math.random().toString(36).slice(2),
      name:"Nova página",profile:"project",status:"draft",
      sectionId:newId,treatment:"m-central",
      media:{assetId:p.media.assetId,focusX:50,focusY:50,zoom:100,gallery:[]},
      content:{title:"",subtitle:"",body:"",caption:"",credits:""},visible:{}
    };
    const last=doc.pages.map((q,i)=>q.sectionId===s.id?i:-1).filter(i=>i>=0).pop();
    doc.pages.splice(last===undefined?doc.pages.length:last+1,0,newPage);
    env.selectPage(newPage.id,false);
 });
}
function textBlock(role,text){
 const roleClass={title:"story-title",subtitle:"story-subtitle",body:"story-body",caption:"story-caption",credits:"story-credits"}[role];
 if(!roleClass||!String(text??"").trim())return "";
 const tag=role==="title"?"h2":"p";
 return '<'+tag+' class="'+roleClass+'">'+esc(text)+'</'+tag+'>';
}
function storyPage(p,env){
 const {asset,profiles,allowed}=env;
 const roles=profiles[p.profile]?.[1]||["title","body"];
 const visible=roles.filter(r=>allowed(p,r));
 const text=visible.map(r=>textBlock(r,p.content?.[r])).join("");
 const image=asset(p.media.assetId);
 const treat=p.treatment||"m-central";
 const hasImage=Boolean(image&&treat!=="sem-imagem");
 const zoom=Number(p.media?.zoom||100)/100;
 const media=hasImage?'<figure class="story-page-media" data-treatment="'+esc(treat)+'" style="--story-image-focus-x:'+Number(p.media?.focusX||50)+'%;--story-image-focus-y:'+Number(p.media?.focusY||50)+'%;--story-image-zoom:'+Math.max(1,Math.min(1.75,zoom))+'">'+
    '<img src="'+esc(image.src)+'" alt="'+esc(image.alt||image.name)+'">'+
    '</figure>':"";
 let gallery="";
 if(p.profile==="gallery"){
   const images=(p.media.gallery||[]).map(id=>asset(id)).filter(Boolean);
   gallery='<div class="story-page-gallery">'+images.map(a=>'<figure><img src="'+esc(a.src)+'" alt="'+esc(a.alt||a.name)+'"></figure>').join("")+'</div>';
 }
 return '<article class="story-page" data-story-page-id="'+esc(p.id)+'" data-story-profile="'+esc(p.profile)+'" data-story-treatment="'+esc(treat)+'">'+
   '<div class="story-page-inner"><div class="story-page-copy">'+text+'</div>'+gallery+media+'</div></article>';
}
function renderViewer(env,preview){
 const viewer=$("storyViewer");
 viewer.hidden=!preview;
 if(!preview)return;
 const {doc,page,asset}=env;
 viewer.innerHTML=doc.sections.map(section=>{
   const pages=doc.pages.filter(p=>p.sectionId===section.id);
   if(!pages.length)return "";
   const a=asset(section.backgroundAssetId);
   return '<section class="story-area" data-story-area-id="'+esc(section.id)+'" aria-label="'+esc(section.name)+'">'+
     '<div class="story-area-backdrop" aria-hidden="true">'+
     (a?'<img class="story-area-photo" src="'+esc(a.src)+'" alt="">':'')+
     '<span class="story-area-veil"></span></div>'+
     '<div class="story-area-pages">'+pages.map(p=>storyPage(p,env)).join("")+'</div></section>';
 }).join("");
 if(!viewer.dataset.scrollBound){
   viewer.addEventListener("scroll",()=>{
     const pages=[...viewer.querySelectorAll("[data-story-page-id]")];
     const top=viewer.getBoundingClientRect().top;
     let most=pages[0],smallest=Infinity;
     for(const p of pages){const distance=Math.abs(p.getBoundingClientRect().top-top);
       if(distance<smallest){smallest=distance;most=p}}
     if(most)viewer.dataset.currentPage=most.dataset.storyPageId;
   },{passive:true});
   viewer.dataset.scrollBound="true";
 }
 const el=[...viewer.querySelectorAll("[data-story-page-id]")].find(n=>n.dataset.storyPageId===page().id);
 if(el){
   const top=el.getBoundingClientRect().top-viewer.getBoundingClientRect().top+viewer.scrollTop;
   viewer.scrollTop=top;
 }
}
window.LMSequences={normalize,areaOf,renderSidebar,renderInspector,renderViewer};
})();
