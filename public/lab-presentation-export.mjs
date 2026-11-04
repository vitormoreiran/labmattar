import {sectionWebDocument} from './lab-section-web.mjs';
import {sceneSvg,escapeMarkup as esc} from './lab-scene.mjs';
const bytesCache=new Map(),frameCache=new Map();
export async function resource(path){
  if(!bytesCache.has(path))bytesCache.set(path,(async()=>{
    const response=await fetch(path,{credentials:'same-origin'});
    if(!response.ok)throw Error('Recurso indisponível: '+path);
    return new Uint8Array(await response.arrayBuffer());
  })());
  try{return await bytesCache.get(path);}catch(error){bytesCache.delete(path);throw error;}
}
function base64(bytes){
  let text='';for(let n=0;n<bytes.length;n+=32768)text+=String.fromCharCode(...bytes.subarray(n,n+32768));
  return btoa(text);
}
export async function officialFonts(){
  return {UniversMattar:await resource('/fonts/univers-lt-std-45-light.otf'),
    PerpetuaMattar:await resource('/fonts/perpetua-titling-light.ttf')};
}
const verifiedMotions=new Map();
async function motionBytes(asset){
  if(!verifiedMotions.has(asset.sha256))verifiedMotions.set(asset.sha256,(async()=>{
    const bytes=await resource(asset.video);const digest=await crypto.subtle.digest('SHA-256',bytes);
    const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
    if(hash!==asset.sha256)throw Error('O motion não corresponde à versão registrada. Atualize o acervo.');
    return bytes;
  })());try{return await verifiedMotions.get(asset.sha256);}catch(error){verifiedMotions.delete(asset.sha256);throw error;}
}
export async function motionFrame(asset,seconds){
  const key=asset.sha256+':'+seconds;
  if(frameCache.size>=32)frameCache.delete(frameCache.keys().next().value);
  if(!frameCache.has(key))frameCache.set(key,(async()=>{
    const video=document.createElement('video');video.muted=true;video.preload='auto';video.playsInline=true;
    const ready=new Promise((resolve,reject)=>{
      video.addEventListener('loadeddata',resolve,{once:true});
      video.addEventListener('error',()=>reject(Error('Motion indisponível: '+asset.title)),{once:true});
    });
    const objectUrl=URL.createObjectURL(new Blob([await motionBytes(asset)],{type:'video/mp4'}));
    try{video.src=objectUrl;await ready;
    const time=Math.max(0,Math.min(seconds,video.duration-1/30));
    if(time>0){
      const seeked=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('O quadro do motion não carregou.')),15000);
        video.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});
      });video.currentTime=time;await seeked;
    }
    const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0);
    return canvas.toDataURL('image/png');
    }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(objectUrl);}
  })());
  try{return await frameCache.get(key);}catch(error){frameCache.delete(key);throw error;}
}
export function download(blob,name){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
const MAX_PRIVATE_VIDEO_BYTES=32*1024*1024;
async function privateVideoBytes(clip){
  if(clip.provider==='local'){
    const blob=await window.LabAcervo?.localVideoBlob?.(clip.fileId);
    if(!blob)throw Error('Vídeo local não encontrado neste navegador: '+clip.name);
    if(blob.size>MAX_PRIVATE_VIDEO_BYTES)
      throw Error('O vídeo '+clip.name+' é maior que 32 MB. Exporte uma versão otimizada para HTML offline.');
    return new Uint8Array(await blob.arrayBuffer());
  }
  const path=clip.provider==='public'?
    '/api/acervo/public-media?project='+encodeURIComponent(clip.projectId)+'&id='+encodeURIComponent(clip.fileId):
    '/api/acervo/media?provider='+clip.provider+'&id='+encodeURIComponent(clip.fileId);
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Vídeo privado indisponível: '+clip.name+'. Reconecte o acervo.');
  const size=Number(response.headers.get('content-length')||0);
  if(size>MAX_PRIVATE_VIDEO_BYTES){
    await response.body?.cancel();
    throw Error('O vídeo '+clip.name+' é maior que 32 MB. Ele funciona no editor, mas a exportação HTML offline precisa de uma versão otimizada ou de hospedagem autorizada.');
  }
  const chunks=[];let total=0;
  const reader=response.body?.getReader();
  if(!reader)throw Error('Não foi possível ler o vídeo privado: '+clip.name);
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      total+=value.byteLength;
      if(total>MAX_PRIVATE_VIDEO_BYTES){
        await reader.cancel();
        throw Error('O vídeo '+clip.name+' excede 32 MB para HTML offline. Use uma versão otimizada.');
      }
      chunks.push(value);
    }
  }finally{try{reader.releaseLock();}catch{}}
  const result=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
  return result;
}

function maskData(xml){
  return 'data:image/svg+xml;base64,'+base64(new TextEncoder().encode(xml));
}
function clipMask(clip){
  const [vx,vy,vw,vh]=clip.viewBox;
  return maskData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[vx,vy,vw,vh].join(' ')+'">'+
    clip.paths.map(path=>'<path fill="white" d="'+esc(path.d)+'"/>').join('')+'</svg>');
}
function markerMask(scene,groups){
  const paths=groups.map(group=>{
    const clip=group.clip,[vx,vy,vw,vh]=clip.viewBox,b=clip.box;
    return '<g transform="translate('+b.x+' '+b.y+') scale('+(b.w/vw)+' '+(b.h/vh)+') translate('+(-vx)+' '+(-vy)+')">'+
      clip.paths.map(path=>'<path fill="white" d="'+esc(path.d)+'"/>').join('')+'</g>';
  }).join('');
  return maskData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+scene.width+' '+scene.height+'">'+paths+'</svg>');
}
function animatedBackground(scene,video){
  if(!scene.videoVisual)throw Error('Quadro de vídeo de fundo indisponível para exportação.');
  const v=scene.videoVisual,source='private:'+esc(video.id),pos=v.focusX+'% '+v.focusY+'%';
  const backdrop=v.backdrop==='blur'?' is-blurred':'',marker=v.markerFocus==='blur'?' is-blurred':'';
  const parts=[
    '<video autoplay muted loop playsinline class="bg-video-base'+backdrop+'" data-asset="'+source+'" style="object-position:'+pos+'"></video>',
    '<div class="bg-video-contrast" style="opacity:'+(v.contrast?1:0)+'"></div>'
  ];
  const m=scene.items.find(op=>op.layer==='video-bg-m');
  if(m){
    const b=m.clip.box;
    parts.push('<div class="bg-video-m" style="left:'+(b.x/scene.width*100)+'%;top:'+(b.y/scene.height*100)+'%;width:'+(b.w/scene.width*100)+'%;height:'+(b.h/scene.height*100)+'%;-webkit-mask-image:url('+clipMask(m.clip)+');mask-image:url('+clipMask(m.clip)+')">'+
      '<video autoplay muted loop playsinline data-asset="'+source+'" style="object-position:'+pos+'"></video>'+
      (v.mContrast?'<div class="bg-video-m-contrast"></div>':'')+'</div>');
  }
  const markers=scene.items.filter(op=>op.layer==='video-bg-marker');
  if(markers.length){
    const mask=markerMask(scene,markers);
    parts.push('<div class="bg-video-markers" style="-webkit-mask-image:url('+mask+');mask-image:url('+mask+'")>'+
      '<video autoplay muted loop playsinline class="bg-video-marker'+marker+'" data-asset="'+source+'" style="object-position:'+pos+'"></video></div>');
  }
  return '<div class="animated-background" aria-hidden="true">'+parts.join('')+'</div>';
}

const animatedBackgroundCSS=":is(.page-art,.story-art) .animated-background{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}\n:is(.page-art,.story-art) .animated-background video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;max-width:none}\n:is(.page-art,.story-art) .animated-background .is-blurred{inset:-7%;width:114%;height:114%;filter:blur(clamp(18px,4.8cqw,42px)) brightness(.72) saturate(.86);transform:scale(1.045)}\n:is(.page-art,.story-art) .bg-video-contrast,:is(.page-art,.story-art) .bg-video-m-contrast{position:absolute;inset:0;background:rgba(0,0,0,.20);pointer-events:none}\n:is(.page-art,.story-art) .bg-video-contrast{z-index:1}\n:is(.page-art,.story-art) .bg-video-m{position:absolute;z-index:2;overflow:hidden;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;filter:drop-shadow(0 2px 10px rgba(0,0,0,.08))}\n:is(.page-art,.story-art) .bg-video-m-contrast{z-index:1}\n:is(.page-art,.story-art) .bg-video-markers{position:absolute;inset:0;z-index:3;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}";
export async function webDocument(scenes,project,catalog,fonts){
  if(project.schemaVersion===2)return sectionWebDocument(scenes,project,catalog,fonts,{resource,base64,motionBytes,privateVideoBytes,animatedBackground,animatedBackgroundCSS});
  const used=new Set(scenes.flatMap(scene=>scene.motions.map(motion=>motion.assetId))),videos={},videoTypes={};
  for(const id of used){const asset=catalog.find(asset=>asset.id===id);videos[id]=base64(await motionBytes(asset));}
  const privateClips=new Map(scenes.flatMap(scene=>[...(scene.clips||[]),
    ...(scene.backgroundVideo?[scene.backgroundVideo]:[])].map(clip=>[clip.id,clip])));
  if(privateClips.size>0){
    let count=0;
    for(const clip of privateClips.values()){
      const bytes=await privateVideoBytes(clip);
      count+=bytes.byteLength;
      if(count>64*1024*1024)throw Error('Os vídeos privados ultrapassam 64 MB no total. Reduza os arquivos para exportar HTML offline.');
      videos['private:'+clip.id]=base64(bytes);
      videoTypes['private:'+clip.id]=clip.mimeType;
    }
  }
  const fontCss=`@font-face{font-family:UniversMattar;src:url(data:font/otf;base64,${base64(fonts.UniversMattar)});font-weight:300}@font-face{font-family:PerpetuaMattar;src:url(data:font/ttf;base64,${base64(fonts.PerpetuaMattar)});font-weight:300}`;
  const pages=scenes.map((scene,index)=>{
    const indices=scene.items.map((op,n)=>op.motionId||op.privateClipId?n:-1).filter(n=>n>=0),last=Math.max(-1,...indices);
    const base={...scene,items:last<0?scene.items:scene.items.slice(0,last+1)};
    const foreground={...scene,id:scene.id+'-foreground',items:last<0?[]:scene.items.slice(last+1)};
    const svg=value=>sceneSvg(value).replace('<svg ','<svg aria-hidden="true" ');
    const text=project.pages[index].composition.pages[0].text;
    const live=[...scene.motions.map(motion=>{
      const op=scene.items.find(op=>op.motionId===motion.id);
      return `<video autoplay muted loop playsinline data-asset="${esc(motion.assetId)}" style="left:${op.x/scene.width*100}%;top:${op.y/scene.height*100}%;width:${op.w/scene.width*100}%;height:${op.h/scene.height*100}%" aria-hidden="true"></video>`;
    }),...(scene.clips||[]).map(clip=>{
      const op=scene.items.find(op=>op.privateClipId===clip.id);
      if(!op)throw Error('Quadro de vídeo não encontrado: '+clip.name);
      return `<video autoplay muted loop playsinline data-asset="private:${esc(clip.id)}" style="left:${op.x/scene.width*100}%;top:${op.y/scene.height*100}%;width:${op.w/scene.width*100}%;height:${op.h/scene.height*100}%" aria-hidden="true"></video>`;
    })].join('');
    const hasBackgroundVideo=Boolean(scene.backgroundVideo);
    const screenBase=hasBackgroundVideo?{...base,items:base.items.filter(op=>!op.layer?.startsWith('video-bg-'))}:base;
    const view=hasBackgroundVideo?
      animatedBackground(scene,scene.backgroundVideo)+'<div class="screen-scene">'+svg(screenBase)+'</div>'+live+
        (foreground.items.length?'<div class="foreground">'+svg(foreground)+'</div>':'')+
        '<div class="print-scene">'+svg(scene)+'</div>':
      svg(base)+live+(foreground.items.length?'<div class="foreground">'+svg(foreground)+'</div>':'');
    return `<section class="export-page" id="${scene.id}" style="page:print-${scene.id};--page-width:${scene.width*.75}pt;--page-height:${scene.height*.75}pt" aria-label="${esc(scene.name)}"><div class="semantic"><h2>${esc(text.title.value)}</h2><p>${esc(text.body.visible?text.body.value:'')}</p></div><div class="page-art"${hasBackgroundVideo?' data-video-background="true"':''} style="max-width:min(1440px,calc(${100*scene.width/scene.height}svh - ${122*scene.width/scene.height}px))">${view}</div></section>`;
  }).join('');
  const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
  const print=scenes.map(scene=>`@page print-${scene.id}{size:${scene.width*.75}pt ${scene.height*.75}pt;margin:0}`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)}</title><style>${fontCss}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-snap-type:y proximity}body{margin:0;background:#e6e3dc;color:#181818;font-family:UniversMattar,Arial,sans-serif;font-weight:300}.presentation-nav{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;padding:12px 20px;background:#f7f6f2;border-bottom:1px solid #c9c8c2;font-size:13px;line-height:1.35;letter-spacing:.04em}.presentation-nav button{font:inherit;color:inherit;background:none;border:0;border-bottom:1px solid;padding:4px;cursor:pointer}.presentation-nav strong{font-weight:300;margin-right:auto}.export-page{scroll-snap-align:start;scroll-margin-top:62px;min-height:calc(100svh - 62px);display:grid;place-items:center;padding:30px 20px}.page-art{width:min(100%,1440px);position:relative;box-shadow:0 12px 40px #0002}.page-art svg{display:block;width:100%;height:auto;overflow:hidden}.page-art video{position:absolute;display:block;object-fit:contain;pointer-events:none}.foreground{position:absolute;inset:0;pointer-events:none}.foreground text{pointer-events:auto;user-select:text}.semantic{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}button:focus-visible{outline:2px solid;outline-offset:4px}@media(max-width:760px){.presentation-nav{font-size:12px}.export-page{padding:20px 10px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}${print}@media print{.presentation-nav{display:none}.export-page{display:block;width:var(--page-width);height:var(--page-height);min-height:0;padding:0;break-after:page}.export-page:last-child{break-after:auto}.page-art{width:100%;height:100%;max-width:none!important;box-shadow:none}.page-art video{display:none}body{background:none}.semantic{display:none}}
.page-art[data-video-background]{isolation:isolate;overflow:hidden;container-type:inline-size}
${animatedBackgroundCSS}
.page-art .screen-scene{position:relative;z-index:1;pointer-events:none}
.page-art .screen-scene svg{width:100%;height:auto}
.page-art[data-video-background]>video{z-index:4}
.page-art[data-video-background]>.foreground{z-index:5}
.page-art .print-scene{display:none}
@media print{.page-art[data-video-background] .animated-background,.page-art[data-video-background] .screen-scene,.page-art[data-video-background]>.foreground{display:none}
.page-art[data-video-background] .print-scene{display:block;position:absolute;inset:0;width:100%;height:100%}
.page-art[data-video-background] .print-scene svg{width:100%;height:100%}}
</style></head><body><nav class="presentation-nav" aria-label="Apresentação"><strong>${esc(project.name)}</strong><button id="previous">ANTERIOR</button><span id="page-count">1 / ${scenes.length}</span><button id="next">PRÓXIMA</button><button id="save-project">PROJETO JSON</button><button id="print">IMPRIMIR</button></nav><main>${pages}</main><script type="application/json" id="project">${json(project)}</script><script type="application/json" id="clips">${json(videos)}</script><script type="application/json" id="clip-mimes">${json(videoTypes)}</script><script>
(()=>{'use strict';const pages=[...document.querySelectorAll('.export-page')];let current=0;const show=index=>{current=Math.max(0,Math.min(index,pages.length-1));pages[current].scrollIntoView({block:'start'});document.getElementById('page-count').textContent=(current+1)+' / '+pages.length;};document.getElementById('next').onclick=()=>show(current+1);document.getElementById('previous').onclick=()=>show(current-1);document.addEventListener('keydown',event=>{if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();show(current+1);}if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();show(current-1);}});document.getElementById('print').onclick=()=>print();document.getElementById('save-project').onclick=()=>{const blob=new Blob([document.getElementById('project').textContent],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='labmattar-projeto.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000);};const clips=JSON.parse(document.getElementById('clips').textContent);const urls={};for(const[id,value]of Object.entries(clips)){const data=Uint8Array.from(atob(value),char=>char.charCodeAt(0));urls[id]=URL.createObjectURL(new Blob([data],{type:(JSON.parse(document.getElementById('clip-mimes').textContent)[id]||'video/mp4')}));}document.querySelectorAll('video[data-asset]').forEach(video=>{video.muted=true;video.src=urls[video.dataset.asset];video.play().catch(()=>{});});if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){current=pages.indexOf(entry.target);document.getElementById('page-count').textContent=(current+1)+' / '+pages.length;}},{threshold:.5});pages.forEach(page=>observer.observe(page));}})();
</script></body></html>`;
}
