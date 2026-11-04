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
    if(asset.type!=='image'||!/^photo:(ext|loc)-/.test(asset.id||''))continue;
    const key=asset.id.slice(6),uri=asset.uri;
    check(typeof uri==='string','referência da fotografia');
    if(key.startsWith('loc-')){
      check(/^loc-[a-z0-9]{10,25}$/.test(key)&&uri.length<=5_000_000&&
        /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri),
        'arquivo local da fotografia');
      catalog[key]=uri;continue;
    }
    check(/^ext-[a-z0-9]+$/.test(key),'fotografia de catálogo');
    const url=new URL(uri,'https://assets.local'),provider=url.searchParams.get('provider'),id=url.searchParams.get('id');
    check(uri.startsWith('/api/acervo/')&&!url.hash&&url.origin==='https://assets.local','origem da fotografia privada');
    const isPublic=url.pathname==='/api/acervo/public-media';
    check(isPublic?
      [...url.searchParams.keys()].sort().join(',')==='id,project'&&
        /^[A-Za-z0-9_-]{5,200}$/.test(url.searchParams.get('project')||''):
      url.pathname==='/api/acervo/media'&&[...url.searchParams.keys()].sort().join(',')==='id,provider',
      'origem da fotografia privada');
    const source=isPublic?'public':provider;
    check(source==='public'||source==='google'?/^[A-Za-z0-9_-]{5,200}$/.test(id||''):
      source==='dropbox'&&/^id:[A-Za-z0-9_=-]{5,200}$/.test(id||''),'identificador da fotografia');
    const hash=Array.from(new TextEncoder().encode(source+':'+id)).reduce((n,v)=>(n*33+v)>>>0,5381).toString(36);
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
// Private clips remain references to the same-origin authenticated media proxy.
 // They never contain bearer tokens, Google share URLs or arbitrary remote hosts.
export function normalizeClip(value){
  check(value&&identifier(value.id),'identificador do vídeo');
  check(['google','dropbox','public','local'].includes(value.provider),'provedor do vídeo');
  check(typeof value.fileId==='string'&&(
    value.provider==='local'?/^local-[a-f0-9-]{36}$/.test(value.fileId):
    value.provider==='dropbox'?/^id:[A-Za-z0-9_=-]{5,200}$/.test(value.fileId):
      /^[A-Za-z0-9_-]{5,200}$/.test(value.fileId)),'identificador privado do vídeo');
  if(value.provider==='public')
    check(/^[A-Za-z0-9_-]{5,200}$/.test(value.projectId||''),'projeto do vídeo');
  check(['video/mp4','video/webm','video/quicktime'].includes(value.mimeType),'formato do vídeo');
  const normalized={id:value.id,provider:value.provider,fileId:value.fileId,
    ...(value.provider==='public'?{projectId:value.projectId}:{}),
    name:title(value.name),mimeType:value.mimeType,
    x:number(value.x,0,100,'posição horizontal do vídeo'),
    y:number(value.y,0,100,'posição vertical do vídeo'),
    width:number(value.width,5,100,'tamanho do vídeo'),
    aspect:number(value.aspect,0.25,4,'proporção do vídeo'),
    frameSeconds:number(value.frameSeconds,0,3600,'quadro do vídeo')};
  check(Object.keys(value).sort().join(',')===Object.keys(normalized).sort().join(','),'campos do vídeo');
  return normalized;
}
export function createClip(media,id){
  check(media?.kind==='video','somente vídeos podem ser adicionados');
  return normalizeClip({id,provider:media.provider,fileId:media.id,
    ...(media.provider==='public'?{projectId:media.projectId}:{}),
    name:String(media.name||'Vídeo').slice(0,120),mimeType:media.mimeType,
    x:20,y:15,width:60,aspect:16/9,frameSeconds:0});
}
export function normalizeBackgroundVideo(value){
  check(value&&identifier(value.id),'identificador do vídeo de fundo');
  check(['google','dropbox','public','local'].includes(value.provider),'origem do vídeo de fundo');
  check(typeof value.fileId==='string'&&(
    value.provider==='local'?/^local-[a-f0-9-]{36}$/.test(value.fileId):
    value.provider==='dropbox'?/^id:[A-Za-z0-9_=-]{5,200}$/.test(value.fileId):
      /^[A-Za-z0-9_-]{5,200}$/.test(value.fileId)),'arquivo do vídeo de fundo');
  if(value.provider==='public')check(/^[A-Za-z0-9_-]{5,200}$/.test(value.projectId||''),'pasta do vídeo de fundo');
  check(['video/mp4','video/webm','video/quicktime'].includes(value.mimeType),'formato do vídeo de fundo');
  const clean={id:value.id,provider:value.provider,fileId:value.fileId,
    ...(value.provider==='public'?{projectId:value.projectId}:{}),
    name:title(value.name),mimeType:value.mimeType,
    frameSeconds:number(value.frameSeconds,0,3600,'quadro estático do vídeo de fundo')};
  check(Object.keys(value).sort().join(',')===Object.keys(clean).sort().join(','),'campos do vídeo de fundo');
  return clean;
}
export function createBackgroundVideo(media,id){
  check(media?.kind==='video','somente vídeos podem ser usados como fundo');
  return normalizeBackgroundVideo({id,provider:media.provider,fileId:media.id,
    ...(media.provider==='public'?{projectId:media.projectId}:{}),
    name:String(media.name||'Vídeo').slice(0,120),mimeType:media.mimeType,frameSeconds:0});
}
export function backgroundVideoUrl(video){
  const safe=normalizeBackgroundVideo(video);
  return safe.provider==='public'?
    '/api/acervo/public-media?project='+encodeURIComponent(safe.projectId)+'&id='+encodeURIComponent(safe.fileId):
    safe.provider==='local'?'/api/acervo/local-placeholder?id='+encodeURIComponent(safe.fileId):
    '/api/acervo/media?provider='+safe.provider+'&id='+encodeURIComponent(safe.fileId);
}
export function clipBox(clip,width,height){
  const w=Math.min(width*clip.width/100,height*clip.aspect);
  const h=w/clip.aspect;
  return {x:Math.max(0,Math.min(width*clip.x/100,width-w)),
    y:Math.max(0,Math.min(height*clip.y/100,height-h)),w,h};
}
export function privateClipUrl(clip){
  const safe=normalizeClip(clip);
  return safe.provider==='public'?
    '/api/acervo/public-media?project='+encodeURIComponent(safe.projectId)+'&id='+encodeURIComponent(safe.fileId):
    safe.provider==='local'?'/api/acervo/local-placeholder?id='+encodeURIComponent(safe.fileId):
    '/api/acervo/media?provider='+safe.provider+'&id='+encodeURIComponent(safe.fileId);
}
export function createPage({id,name,state,photoCatalog,maxEdge=3840,motions=[],clips=[],backgroundVideo=null}){
  return {id,name,composition:createProductionDocument({state,photoCatalog,maxEdge}),
    motions:clone(motions),clips:clips.map(normalizeClip),
    ...(backgroundVideo?{backgroundVideo:normalizeBackgroundVideo(backgroundVideo)}:{})};
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
    const keys=Object.keys(page).sort().join(',');
    check(['composition,id,motions,name','clips,composition,id,motions,name',
      'backgroundVideo,composition,id,motions,name',
      'backgroundVideo,clips,composition,id,motions,name'].includes(keys),'campos da página');
    title(page.name);
    Object.assign(catalog,privatePhotoCatalog(page.composition,catalog));
    const state=verifyRoundTrip(page.composition,catalog);
    check(Array.isArray(page.motions)&&page.motions.length<=20,'elementos da página');
    const ids=new Set();
    const motions=page.motions.map(motion=>{
      const clean=normalizeMotion(motion,motionCatalog);
      check(!ids.has(clean.id),'identificador de motion repetido');ids.add(clean.id);return clean;
    });
    check(page.clips===undefined||(Array.isArray(page.clips)&&page.clips.length<=8),'vídeos da página');
    const clips=(page.clips||[]).map(normalizeClip);
    check(new Set(clips.map(clip=>clip.id)).size===clips.length,'vídeo repetido na página');
    const backgroundVideo=page.backgroundVideo?normalizeBackgroundVideo(page.backgroundVideo):null;
    check(!backgroundVideo||page.composition.pages[0].surface.background==='photo','vídeo de fundo exige superfície de imagem');
    return {id:page.id,name:page.name,composition:clone(page.composition),motions,clips,
      ...(backgroundVideo?{backgroundVideo}:{}),state};
  });
  return {name:value.name,pages,photoCatalog:catalog};
}
export function sequenceDocument(name,pages,sections=null){
  if(sections)return {kind:SEQUENCE_KIND,schemaVersion:2,name,sections:clone(sections),pages:pages.map(({id,name,composition,motions,sectionId,clips=[],backgroundVideo=null})=>({id,name,composition:clone(composition),motions:clone(motions),sectionId,...(clips.length?{clips:clips.map(normalizeClip)}:{}),...(backgroundVideo?{backgroundVideo:normalizeBackgroundVideo(backgroundVideo)}:{})}))};
  return {kind:SEQUENCE_KIND,schemaVersion:SEQUENCE_VERSION,name,
    pages:pages.map(({id,name,composition,motions,clips=[],backgroundVideo=null})=>({
      id,name,composition:clone(composition),motions:clone(motions),
      ...(clips.length?{clips:clips.map(normalizeClip)}:{}),
      ...(backgroundVideo?{backgroundVideo:normalizeBackgroundVideo(backgroundVideo)}:{})
    }))};
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
  const stripped=value.pages.map(page=>{check(page&&['composition,id,motions,name,sectionId','clips,composition,id,motions,name,sectionId','backgroundVideo,composition,id,motions,name,sectionId','backgroundVideo,clips,composition,id,motions,name,sectionId'].includes(Object.keys(page).sort().join(',')),'campos da página de seção');const {sectionId,...rest}=page;return rest;});
  const base=readSequence({kind:SEQUENCE_KIND,schemaVersion:1,name:value.name,pages:stripped},photoCatalog,motionCatalog);
  const ids=new Set();
  const sections=value.sections.map(section=>{
    check(section&&identifier(section.id)&&!ids.has(section.id),'identificador de seção repetido');ids.add(section.id);title(section.name);
    check(Object.keys(section).sort().join(',')==='background,id,name','campos da seção');
    const b=section.background;
    check(b&&['color,focusX,focusY,mode,photo,treatment,uri','color,focusX,focusY,mode,photo,treatment,uri,video'].includes(Object.keys(b).sort().join(',')),'campos do fundo da seção');
    if(b.video){normalizeBackgroundVideo(b.video);check(b.mode==='photo','vídeo de seção exige superfície de imagem');}
    check(['photo','blur'].includes(b.treatment),'tratamento do fundo');
    check(['color','photo'].includes(b.mode)&&typeof b.photo==='string'&&typeof b.uri==='string','tipo do fundo');
    const extra=privatePhotoCatalog({assets:[{id:'photo:'+b.photo,type:'image',uri:b.uri}]},base.photoCatalog);
    check(extra[b.photo]===b.uri,'fotografia do fundo não cadastrada');Object.assign(base.photoCatalog,extra);
    // O contrato de composição valida cores, limites de foco e referências.
    createProductionDocument({state:sectionState(base.pages[0].state,section),photoCatalog:base.photoCatalog});
    const normalized=clone(section);if(b.video)normalized.background.video=normalizeBackgroundVideo(b.video);return normalized;
  });
  let previous=-1;
  const pages=base.pages.map((page,index)=>{
    const sectionId=value.pages[index].sectionId,order=sections.findIndex(section=>section.id===sectionId);
    check(identifier(sectionId)&&order>=0,'seção da página não encontrada');
    check(order>=previous,'as páginas devem seguir a ordem das seções');previous=order;
    const expected=sectionState(page.state,sections[order]);
    check(['background','color','photo','focusX','focusY','mContent'].every(key=>expected[key]===page.state[key]),'página diverge do fundo compartilhado');
    check(JSON.stringify(page.backgroundVideo||null)===JSON.stringify(sections[order].background.video||null),'vídeo da página diverge do fundo compartilhado');
    return {...page,sectionId};
  });
  return {...base,sections,pages};
}
