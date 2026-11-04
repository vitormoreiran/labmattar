import {createProductionDocument,verifyRoundTrip} from './composicao-document.mjs';
export const SEQUENCE_KIND='labmattar.presentation';
export const SEQUENCE_VERSION=1;
const clone=value=>JSON.parse(JSON.stringify(value));
const check=(value,message)=>{if(!value)throw Error('Projeto incompatível: '+message);};
const number=(value,min,max,name)=>{check(Number.isFinite(value)&&value>=min&&value<=max,name);return value;};
const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
const title=value=>{check(typeof value==='string'&&value.length<=120,'nome da página');return value;};
export function privatePhotoCatalog(document,base){
  const catalog={...base};
  for(const asset of document.assets||[]){
    if(asset.type!=='image'||!asset.id?.startsWith('photo:ext-'))continue;
    const key=asset.id.slice(6),uri=asset.uri;
    check(/^ext-[a-z0-9]+$/.test(key)&&typeof uri==='string','fotografia privada');
    const url=new URL(uri,'https://assets.local');
    const provider=url.searchParams.get('provider'),id=url.searchParams.get('id');
    check(uri.startsWith('/api/acervo/media?')&&!url.hash&&url.origin==='https://assets.local'&&url.pathname==='/api/acervo/media'&&
      [...url.searchParams.keys()].sort().join(',')==='id,provider','origem da fotografia privada');
    check(provider==='google'?/^[A-Za-z0-9_-]{5,200}$/.test(id||''):
      provider==='dropbox'&&/^id:[A-Za-z0-9_=-]{5,200}$/.test(id||''),'identificador da fotografia');
    const hash=Array.from(new TextEncoder().encode(provider+':'+id)).reduce((n,v)=>(n*33+v)>>>0,5381).toString(36);
    check(key==='ext-'+hash,'referência da fotografia privada');
    catalog[key]=uri;
  }
  return catalog;
}
export function normalizeMotion(value,catalog){
  check(value&&identifier(value.id),'identificador do elemento');
  const asset=catalog.find(asset=>asset.id===value.assetId);
  check(asset&&asset.video&&asset.poster,'motion não encontrado no acervo');
  check(value.projectHash===asset.projectHash&&value.videoHash===asset.sha256,'motion mudou desde este projeto');
  const normalized={id:value.id,assetId:asset.id,projectHash:asset.projectHash,videoHash:asset.sha256,
    x:number(value.x,0,100,'posição horizontal'),y:number(value.y,0,100,'posição vertical'),
    width:number(value.width,5,100,'largura do elemento'),
    frameSeconds:number(value.frameSeconds,0,asset.duration,'quadro estático')};
  check(Object.keys(value).sort().join(',')===Object.keys(normalized).sort().join(','),'campos do elemento');
  return normalized;
}
export function createMotion(asset,id){
  return {id,assetId:asset.id,projectHash:asset.projectHash,videoHash:asset.sha256,
    x:62,y:25,width:28,frameSeconds:asset.cut??Number(Math.max(0,asset.duration-1/30).toFixed(2))};
}
export function motionBox(motion,asset,width,height){
  const w=Math.min(width*motion.width/100,height*asset.width/asset.height);
  const h=w*asset.height/asset.width;
  return {x:Math.min(width*motion.x/100,width-w),y:Math.min(height*motion.y/100,height-h),w,h};
}
export function createPage({id,name,state,photoCatalog,maxEdge=3840,motions=[]}){
  return {id,name,composition:createProductionDocument({state,photoCatalog,maxEdge}),motions:clone(motions)};
}
export function readSequence(value,photoCatalog,motionCatalog){
  if(value?.schemaVersion===2)return readSectionSequence(value,photoCatalog,motionCatalog);
  check(value?.kind===SEQUENCE_KIND&&value.schemaVersion===SEQUENCE_VERSION,'versão da sequência');
  title(value.name);
  check(Array.isArray(value.pages)&&value.pages.length>0&&value.pages.length<=100,'quantidade de páginas');
  check(Object.keys(value).sort().join(',')==='kind,name,pages,schemaVersion','campos da sequência');
  const pageIds=new Set(),catalog={...photoCatalog};
  const pages=value.pages.map(page=>{
    check(page&&identifier(page.id)&&!pageIds.has(page.id),'identificador de página repetido');pageIds.add(page.id);
    check(Object.keys(page).sort().join(',')==='composition,id,motions,name','campos da página');
    title(page.name);
    Object.assign(catalog,privatePhotoCatalog(page.composition,catalog));
    const state=verifyRoundTrip(page.composition,catalog);
    check(Array.isArray(page.motions)&&page.motions.length<=20,'elementos da página');
    const ids=new Set();
    const motions=page.motions.map(motion=>{
      const clean=normalizeMotion(motion,motionCatalog);
      check(!ids.has(clean.id),'identificador de motion repetido');ids.add(clean.id);return clean;
    });
    return {id:page.id,name:page.name,composition:clone(page.composition),motions,state};
  });
  return {name:value.name,pages,photoCatalog:catalog};
}
export function sequenceDocument(name,pages,sections=null){
  if(sections)return {kind:SEQUENCE_KIND,schemaVersion:2,name,sections:clone(sections),pages:pages.map(({id,name,composition,motions,sectionId})=>({id,name,composition:clone(composition),motions:clone(motions),sectionId}))};
  return {kind:SEQUENCE_KIND,schemaVersion:SEQUENCE_VERSION,name,
    pages:pages.map(({id,name,composition,motions})=>({id,name,composition:clone(composition),motions:clone(motions)}))};
}
export function movePage(pages,index,delta){
  const target=index+delta;if(target<0||target>=pages.length)return index;
  const [page]=pages.splice(index,1);pages.splice(target,0,page);return target;
}

// Seções v2 reutilizam as composições v1 como páginas materializadas.
export function createSection(id,name,state,photoCatalog){
  const mode=state.background==='photo'||state.mContent==='photo'?'photo':'color';
  return {id,name,background:{mode,color:state.color,photo:state.photo,uri:photoCatalog[state.photo],focusX:state.focusX,focusY:state.focusY,treatment:state.mContent==='photo'?'blur':'photo'}};
}
export function sectionState(state,section){
  const b=section.background;
  return {...clone(state),background:b.mode,color:b.color,photo:b.photo,focusX:b.focusX,focusY:b.focusY,
    mContent:b.mode==='photo'&&state.mContent==='solid'?'photo':b.mode==='color'&&state.mContent==='photo'?'solid':state.mContent};
}
export function hasSectionText(sectionId,pages){
  return pages.filter(page=>page.sectionId===sectionId).some(page=>{
    const text=page.composition.pages[0].text;
    return Boolean(text.title.value.trim()||(text.body.visible&&text.body.value.trim())||Object.values(text.detail.signature.slots).some(slot=>['text','symbol-label'].includes(slot.kind)&&slot.text.trim()));
  });
}
function readSectionSequence(value,photoCatalog,motionCatalog){
  check(value.kind===SEQUENCE_KIND&&Object.keys(value).sort().join(',')==='kind,name,pages,schemaVersion,sections','campos da apresentação por seções');
  check(Array.isArray(value.sections)&&value.sections.length>0&&value.sections.length<=30,'quantidade de seções');
  check(Array.isArray(value.pages),'páginas da apresentação');
  const stripped=value.pages.map(page=>{check(page&&Object.keys(page).sort().join(',')==='composition,id,motions,name,sectionId','campos da página de seção');const {sectionId,...rest}=page;return rest;});
  const base=readSequence({kind:SEQUENCE_KIND,schemaVersion:1,name:value.name,pages:stripped},photoCatalog,motionCatalog);
  const ids=new Set();
  const sections=value.sections.map(section=>{
    check(section&&identifier(section.id)&&!ids.has(section.id),'identificador de seção repetido');ids.add(section.id);title(section.name);
    check(Object.keys(section).sort().join(',')==='background,id,name','campos da seção');
    const b=section.background;
    check(b&&Object.keys(b).sort().join(',')==='color,focusX,focusY,mode,photo,treatment,uri','campos do fundo da seção');
    check(['photo','blur'].includes(b.treatment),'tratamento do fundo');
    check(['color','photo'].includes(b.mode)&&typeof b.photo==='string'&&typeof b.uri==='string','tipo do fundo');
    const extra=privatePhotoCatalog({assets:[{id:'photo:'+b.photo,type:'image',uri:b.uri}]},base.photoCatalog);
    check(extra[b.photo]===b.uri,'fotografia do fundo não cadastrada');Object.assign(base.photoCatalog,extra);
    // O contrato de composição valida cores, limites de foco e referências.
    createProductionDocument({state:sectionState(base.pages[0].state,section),photoCatalog:base.photoCatalog});
    return clone(section);
  });
  let previous=-1;
  const pages=base.pages.map((page,index)=>{
    const sectionId=value.pages[index].sectionId,order=sections.findIndex(section=>section.id===sectionId);
    check(identifier(sectionId)&&order>=0,'seção da página não encontrada');
    check(order>=previous,'as páginas devem seguir a ordem das seções');previous=order;
    const expected=sectionState(page.state,sections[order]);
    check(['background','color','photo','focusX','focusY','mContent'].every(key=>expected[key]===page.state[key]),'página diverge do fundo compartilhado');
    return {...page,sectionId};
  });
  return {...base,sections,pages};
}
