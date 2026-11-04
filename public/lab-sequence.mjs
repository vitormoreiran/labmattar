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
// Private clips remain references to the same-origin authenticated media proxy.
 // They never contain bearer tokens, Google share URLs or arbitrary remote hosts.
export function normalizeClip(value){
  check(value&&identifier(value.id),'identificador do vídeo');
  check(value.provider==='google'||value.provider==='dropbox','provedor do vídeo');
  check(typeof value.fileId==='string'&&(
    value.provider==='google'?/^[A-Za-z0-9_-]{5,200}$/.test(value.fileId):
      /^id:[A-Za-z0-9_=-]{5,200}$/.test(value.fileId)),'identificador privado do vídeo');
  check(['video/mp4','video/webm','video/quicktime'].includes(value.mimeType),'formato do vídeo');
  const normalized={id:value.id,provider:value.provider,fileId:value.fileId,
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
    name:String(media.name||'Vídeo').slice(0,120),mimeType:media.mimeType,
    x:20,y:15,width:60,aspect:16/9,frameSeconds:0});
}
export function clipBox(clip,width,height){
  const w=Math.min(width*clip.width/100,height*clip.aspect);
  const h=w/clip.aspect;
  return {x:Math.max(0,Math.min(width*clip.x/100,width-w)),
    y:Math.max(0,Math.min(height*clip.y/100,height-h)),w,h};
}
export function privateClipUrl(clip){
  const safe=normalizeClip(clip);
  return '/api/acervo/media?provider='+safe.provider+'&id='+encodeURIComponent(safe.fileId);
}
export function createPage({id,name,state,photoCatalog,maxEdge=3840,motions=[],clips=[]}){
  return {id,name,composition:createProductionDocument({state,photoCatalog,maxEdge}),
    motions:clone(motions),clips:clips.map(normalizeClip)};
}
export function readSequence(value,photoCatalog,motionCatalog){
  check(value?.kind===SEQUENCE_KIND&&value.schemaVersion===SEQUENCE_VERSION,'versão da sequência');
  title(value.name);
  check(Array.isArray(value.pages)&&value.pages.length>0&&value.pages.length<=100,'quantidade de páginas');
  check(Object.keys(value).sort().join(',')==='kind,name,pages,schemaVersion','campos da sequência');
  const pageIds=new Set(),catalog={...photoCatalog};
  const pages=value.pages.map(page=>{
    check(page&&identifier(page.id)&&!pageIds.has(page.id),'identificador de página repetido');pageIds.add(page.id);
    const keys=Object.keys(page).sort().join(',');
    check(keys==='composition,id,motions,name'||keys==='clips,composition,id,motions,name','campos da página');
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
    return {id:page.id,name:page.name,composition:clone(page.composition),motions,clips,state};
  });
  return {name:value.name,pages,photoCatalog:catalog};
}
export function sequenceDocument(name,pages){
  return {kind:SEQUENCE_KIND,schemaVersion:SEQUENCE_VERSION,name,
    pages:pages.map(({id,name,composition,motions,clips=[]})=>({
      id,name,composition:clone(composition),motions:clone(motions),
      ...(clips.length?{clips:clips.map(normalizeClip)}:{})
    }))};
}
export function movePage(pages,index,delta){
  const target=index+delta;if(target<0||target>=pages.length)return index;
  const [page]=pages.splice(index,1);pages.splice(target,0,page);return target;
}
