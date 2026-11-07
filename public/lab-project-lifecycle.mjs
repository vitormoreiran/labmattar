import {createProductionDocument,verifyRoundTrip} from './composicao-document.mjs';
import {createSection,sectionState} from './lab-sequence.mjs';

// Salvar e abrir compartilham o mesmo teto, incluindo fotografias incorporadas.
export const MAX_PROJECT_BYTES=64*1024*1024;
export const MAX_SECTIONS=30;
const limitMessage='O projeto ultrapassa o limite de 64 MB. Reduza as fotografias ou divida a apresentação.';
export function checkProjectBytes(bytes){
  if(!Number.isFinite(bytes)||bytes<0||bytes>MAX_PROJECT_BYTES)throw Error(limitMessage);
}
export function serializeProject(project){
  const json=JSON.stringify(project,null,2)+'\n';
  checkProjectBytes(new TextEncoder().encode(json).byteLength);
  return json;
}
export function parseProject(json){
  checkProjectBytes(new TextEncoder().encode(json).byteLength);
  return JSON.parse(json);
}
export function persistProjectDraft(storage,key,snapshot){
  try{
    storage.setItem(key,JSON.stringify(snapshot));
    return {ok:true,message:'Apresentação salva neste navegador / não publicada.'};
  }catch{
    return {ok:false,message:'A apresentação não foi salva neste navegador. Baixe o projeto JSON para guardar as alterações.'};
  }
}
export function pagesToSections(pages,photoCatalog,sectionId){
  if(pages.length>MAX_SECTIONS)throw Error('A conversão cria uma seção por página e aceita até 30 páginas. O projeto atual foi preservado.');
  const nextPages=structuredClone(pages),sections=[];
  for(const [index,page] of nextPages.entries()){
    const state=verifyRoundTrip(page.composition,photoCatalog);
    const section=createSection(sectionId(index),index===0?'Introdução':'Seção '+(index+1),state,photoCatalog);
    page.sectionId=section.id;
    if(page.backgroundVideo)section.background.video=structuredClone(page.backgroundVideo);
    page.composition=createProductionDocument({state:sectionState(state,section),photoCatalog,maxEdge:page.composition.output.maxEdge});
    sections.push(section);
  }
  return {pages:nextPages,sections};
}
export async function fetchMotionCatalog(fetcher=fetch,timeoutMs=8000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetcher('/motion/catalog.json',{signal:controller.signal});
    if(!response.ok)throw Error('O acervo Motion está indisponível.');
    const manifest=await response.json();
    if(manifest.schemaVersion!==1||!Array.isArray(manifest.items)||!manifest.items.length)throw Error('Catálogo Motion incompleto.');
    const ids=new Set();
    for(const asset of manifest.items){
      if(!asset||typeof asset.id!=='string'||ids.has(asset.id)||
        !/^\/motion\/videos\/[a-z0-9_-]+\.mp4$/.test(asset.video||'')||
        !/^\/motion\/posters\/[a-z0-9_-]+\.png$/.test(asset.poster||'')||
        !/^[a-f0-9]{64}$/.test(asset.sha256||'')||!/^[a-f0-9]{64}$/.test(asset.projectHash||'')||
        !(asset.width>0)||!(asset.height>0)||!(asset.duration>0&&asset.duration<=3600))throw Error('Catálogo Motion incompleto.');
      ids.add(asset.id);
    }
    return manifest.items;
  }finally{clearTimeout(timer);}
}
