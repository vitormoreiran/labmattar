import {normalizeStory,storyTopic,storyLabel} from './lab-story-model.mjs';
import {sceneSvg,escapeMarkup as esc} from './lab-scene.mjs';
import {publishedNavigationCSS,publishedNavigationAssets,mountPublishedPresentation} from './lab-presentation-chrome.mjs';
import {textMotionProfile,installTextEntrances} from './lab-text-motion.mjs';
import {photoFrameProgress,installTopicScroll,topicScrollCSS} from './lab-story-scroll.mjs';
import {sectionTransitionState,installSectionTransitions,sectionTransitionCSS} from './lab-story-section-transition.mjs';
import {actSlideState,installActSlides,actSlidesCSS} from './lab-story-act-slides.mjs';
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const inks={neutral:'#f7f6f2',white:'#fff',black:'#181818',beige:'#e5d9ca',green:'#9be000',red:'#ed251c',blue:'#1c3658',brown:'#604b43'};
async function webPhotoScenes(scenes){
 // Captured photo treatments arrive as full-resolution PNGs. Keep their exact
 // dimensions and alpha; use high-quality WebP only when it reduces the file.
 // The original project, vectors and native PDF scenes remain untouched.
 const cache=new Map();
 const photo=source=>{if(!cache.has(source))cache.set(source,(async()=>{const image=new Image();image.src=source;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);const encoded=canvas.toDataURL('image/webp',.94);return encoded.startsWith('data:image/webp;')&&encoded.length<source.length*.9?encoded:source;})());return cache.get(source);};
 const result=[];for(const scene of scenes){const items=[];for(const op of scene.items)items.push(op.kind==='image'&&op.source?.startsWith('data:image/png;')&&!op.motionId&&!op.privateClipId?{...op,source:await photo(op.source)}:op);result.push({...scene,items});}return result;
}
function headingMarkup(title,value=title.value,startWord=0){
 let wordIndex=startWord;return value.split('\n').map((line,index)=>{
  const family=title.treatment==='perpetua'||title.treatment==='alternada'&&index===Math.min(1,value.split('\n').length-1)?'perpetua':'univers';
  const words=(line.match(/\s+|\S+/g)||[]).map(token=>{if(/^\s+$/.test(token))return esc(token);const font=title.wordFonts?.[wordIndex++]||family;return '<span data-text-entrance style="font-family:'+(font==='perpetua'?'PerpetuaMattar':'UniversMattar')+'">'+esc(token)+'</span>';}).join('');
  return '<span class="story-title-line">'+words+'</span>';
 }).join('');
}
function topicReading(topic){
 const title=topic.first.text.title;let value=title.value,kicker='',wordOffset=0;
 if(topic.role==='act'){const prefix=value.match(/^ATO\s+\d+:?\s*/i);kicker=prefix?prefix[0].trim():'ATO '+topic.act;value=prefix?value.slice(prefix[0].length):value;wordOffset=prefix?(prefix[0].match(/\S+/g)||[]).length:0;}
 else if(topic.role==='introduction'&&/\nINTRODUÇÃO$/.test(value)){kicker=value.slice(0,value.lastIndexOf('\n'));value='INTRODUÇÃO';wordOffset=(kicker.match(/\S+/g)||[]).length;}
 const tag=topic.role==='cover'?'h1':'h2',header='<header class="topic-heading" data-native-title="'+esc(topic.pages[0].id)+'">'+(kicker?'<p class="topic-eyebrow" data-text-entrance>'+esc(kicker)+'</p>':'')+'<'+tag+' class="topic-title">'+headingMarkup({...title,treatment:topic.role==='act'&&title.treatment==='alternada'?'perpetua':title.treatment},value,wordOffset)+'</'+tag+'></header>';
 const blocks=[];let pending='';const flush=()=>{if(pending){blocks.push('<p data-text-entrance>'+esc(pending)+'</p>');pending='';}};
 for(const [index,page]of topic.pages.entries()){
  const native=page.composition.pages[0];if(index&&native.text.title.value){flush();blocks.push('<h3 data-text-entrance>'+esc(native.text.title.value)+'</h3>');}
  if(topic.captionPageIds.includes(page.id)||!native.text.body.visible||!native.text.body.value)continue;
  if(pending&&(topic.joins[page.id]??'\n\n')!==''){flush();}pending+=native.text.body.value;
 }flush();
 return header+(blocks.length?'<div class="topic-body">'+blocks.join('')+'</div>':'');
}
export async function storyWebDocument(scenes,project,catalog,fonts,helpers){
 scenes=await webPhotoScenes(scenes);
 const {resource,base64,motionBytes,privateVideoBytes,animatedBackground,animatedBackgroundCSS='',motionInkPixels,installMotionInk}=helpers;
 const story=normalizeStory(project.story,project.pages),byScene=new Map(scenes.map(scene=>[scene.id,scene]));
 const fontCSS='@font-face{font-family:UniversMattar;src:url(data:font/otf;base64,'+base64(fonts.UniversMattar)+');font-weight:300}@font-face{font-family:PerpetuaMattar;src:url(data:font/ttf;base64,'+base64(fonts.PerpetuaMattar)+');font-weight:300}';
 const navigationAssets={brand:'data:image/svg+xml;base64,'+base64(await resource('/presentation-assets/mattar-published.svg')),...Object.fromEntries(Object.entries(publishedNavigationAssets).map(([key,svg])=>[key,'data:image/svg+xml;base64,'+base64(new TextEncoder().encode(svg))])),symbols:{}};
 for(const slot of Object.values(project.signature?.slots||{}))if(['symbol','symbol-label'].includes(slot.kind)&&!navigationAssets.symbols[slot.symbol])navigationAssets.symbols[slot.symbol]='data:image/svg+xml;base64,'+base64(await resource('/identidade/'+slot.symbol));
 const mask='data:image/svg+xml;base64,'+base64(await resource('/identidade/M.svg'));
 const videos={},videoTypes={};for(const id of new Set(scenes.flatMap(scene=>scene.motions.map(motion=>motion.assetId)))){const asset=catalog.find(asset=>asset.id===id);if(!asset)throw Error('Motion não encontrado no acervo.');videos[id]=base64(await motionBytes(asset));videoTypes[id]='video/mp4';}
 const privateClips=new Map(scenes.flatMap(scene=>[...(scene.clips||[]),...(scene.backgroundVideo?[scene.backgroundVideo]:[])].map(clip=>[clip.id,clip])));let privateTotal=0;
 for(const clip of privateClips.values()){const bytes=await privateVideoBytes(clip);privateTotal+=bytes.byteLength;if(privateTotal>64*1024*1024)throw Error('Os vídeos privados ultrapassam 64 MB no total.');videos['private:'+clip.id]=base64(bytes);videoTypes['private:'+clip.id]=clip.mimeType;}
 const nativeFrames=new Map();
 for(const page of project.pages){
  const scene=byScene.get(page.id);if(!scene)throw Error('Página não renderizada: '+page.name);const p=page.composition.pages[0];
  const ink=scene.items.find(op=>op.layer==='reading'&&op.kind==='text')?.color||inks[p.text.inkColor]||scene.items.find(op=>op.kind==='text')?.color||(p.surface.background==='photo'?'#fff':'#181818');
  const hasBackgroundVideo=Boolean(scene.backgroundVideo),art={...scene,id:scene.id+'-visual',items:scene.items.filter(op=>!['reading','signature','detail'].includes(op.layer)&&!op.motionId&&!op.privateClipId&&(!hasBackgroundVideo||!op.layer?.startsWith('video-bg-')))};
  let svg=sceneSvg(art,{motionStills:false});if(art.items.some(op=>op.kind==='text'))svg=svg.replace(/(<svg\b[^>]*>)/,'$1<style>'+fontCSS+'</style>');
  const still='data:image/svg+xml;base64,'+base64(new TextEncoder().encode(svg));
  const live=[...scene.motions,...(scene.clips||[]).map(clip=>({...clip,assetId:'private:'+clip.id,private:true}))].map(motion=>{const op=scene.items.find(op=>(motion.private?op.privateClipId:op.motionId)===motion.id);if(!op)throw Error('Elemento de vídeo não renderizado.');return '<video '+(motion.private?'autoplay ':'data-motion-ink ')+'muted loop playsinline aria-hidden="true" data-asset="'+esc(motion.assetId)+'" style="left:'+op.x/scene.width*100+'%;top:'+op.y/scene.height*100+'%;width:'+op.w/scene.width*100+'%;height:'+op.h/scene.height*100+'%"></video>';}).join('');
  const visual='<div class="topic-native-art story-art" style="--art-aspect:'+scene.width/scene.height+';color:'+esc(ink)+'">'+(hasBackgroundVideo?animatedBackground(scene,scene.backgroundVideo):'')+'<img class="story-native-still" alt="" src="'+still+'">'+live+'</div>';
  nativeFrames.set(page.id,{visual,ink,scene,p});
 }
 const cover=storyTopic(project,story.topics[0].id),coverPhoto=cover.photos[0].page.composition.assets.find(asset=>asset.id===cover.photos[0].native.media.photoAssetId)?.uri;
 let mainPhoto=coverPhoto||nativeFrames.get(cover.photos[0].page.id).visual.match(/src="([^"]+)/)?.[1];
 if(mainPhoto&&!mainPhoto.startsWith('data:')){
  const url=URL.createObjectURL(new Blob([await resource(mainPhoto)]));try{const image=new Image();image.src=url;await image.decode();const ratio=Math.min(1,1920/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);mainPhoto=canvas.toDataURL('image/webp',.92);}finally{URL.revokeObjectURL(url);}
 }
 const actCount=story.topics.filter(topic=>topic.role==='act').length,actLabel=actCount===5?'CINCO ATOS':'OS ATOS';let mInserted=false;
 const markup=story.topics.map(spec=>{
  const topic=storyTopic(project,spec.id),native=topic.first,firstFrame=nativeFrames.get(topic.photos[0].page.id),act=story.actEntrances&&topic.role==='act';
  const m=story.mTransition&&topic.role==='act'&&!mInserted?(mInserted=true,'<aside class="section-transition" id="'+esc(topic.id)+'-passagem-m" data-section-transition style="--transition-photo:url(&quot;'+mainPhoto+'&quot;);--transition-mask:url(&quot;'+mask+'&quot;)"><div class="section-transition-stage"><div class="section-transition-background" aria-hidden="true"></div><div class="section-transition-shade" aria-hidden="true"></div><div class="section-transition-m" aria-hidden="true"></div><header class="section-transition-copy" data-presentation-label="true"><p>'+esc(project.name)+'</p><h2>'+esc(actLabel)+'</h2></header></div></aside>'):'';
  const opening=act?'<div class="act-opener" id="'+esc(topic.id)+'-divisao" data-act-opener="'+topic.act+'" data-first-page="'+esc(topic.photos[0].page.id)+'" aria-hidden="true" style="--act-photo:url(&quot;'+nativeFrames.get(topic.photos[0].page.id).visual.match(/src="([^"]+)/)[1]+'&quot;);--act-photo-contrast:0"><div class="act-slide-stage"><div class="act-slide-photo"></div><div class="act-slide-copy" data-presentation-label="true"><p class="act-slide-kicker">ATO</p><div class="act-slide-heading"><span class="act-slide-number">'+String(topic.act).padStart(2,'0')+'</span><h2 class="act-slide-name">'+esc(topic.title)+'</h2></div></div></div></div>':'';
  const anchors=topic.photos.map(({page},index)=>'<i class="frame-anchor" id="'+esc(page.id)+'" style="--frame-index:'+index+'" aria-hidden="true"></i>').join('');
  const frames=topic.photos.map(({page,caption},index)=>{const frame=nativeFrames.get(page.id);return '<div class="photo-backdrop" data-native-page="'+esc(page.id)+'" data-story-ink="'+esc(frame.ink)+'" style="--photo-contrast:0;opacity:'+(index?0:1)+';visibility:'+(index?'hidden':'visible')+'">'+frame.visual+(caption?'<p class="frame-caption" data-native-caption="'+esc(page.id)+'">'+esc(caption)+'</p>':'')+'</div>';}).join('');
  return m+'<section class="presentation-section section" id="'+esc(topic.id)+'" data-presentation-kind="'+esc(topic.role)+'" data-nav-title="'+esc(storyLabel(project,topic.id))+'">'+opening+'<section class="scroll-topic" id="'+esc(topic.id)+'-topic"'+(act?' data-act="'+topic.act+'"':'')+' data-frame-count="'+topic.photos.length+'" style="--frame-count:'+topic.photos.length+';--topic-margin:'+native.surface.marginPercent+'%;--story-reading:'+native.reading.widthPercent+'%;--story-reading-factor:'+native.reading.widthPercent/100+';--story-title-size:'+7.6*native.text.title.scalePercent/100+'vw;--topic-ink:'+esc(firstFrame.ink)+'">'+anchors+'<div class="topic-stage"><div class="photo-stack">'+frames+'</div><div class="topic-copy story-reading story-page'+(topic.role==='cover'?' is-cover':'')+'" data-reading-position="'+native.reading.positionYPercent+'">'+topicReading(topic)+'</div></div></section></section>';
 }).join('');
 const printRules=scenes.map(scene=>'@page print-'+scene.id+'{size:'+scene.width*.75+'pt '+scene.height*.75+'pt;margin:0}').join('');
 const printed=scenes.map(scene=>'<article class="story-print-page" style="page:print-'+esc(scene.id)+';width:'+scene.width*.75+'pt;height:'+scene.height*.75+'pt">'+sceneSvg(scene)+'</article>').join('');
 const navigation={signature:project.signature,assets:navigationAssets,presentationLinks:story.topics.map(topic=>['#'+topic.id,storyLabel(project,topic.id)])};
 const count=story.topics.reduce((n,topic)=>n+topic.photoPageIds.length,0),script='('+installTextEntrances.toString()+')('+json(textMotionProfile)+');('+mountPublishedPresentation.toString()+')('+json(navigation)+');('+installStoryMedia.toString()+')();('+installMotionInk.toString()+')(document,'+motionInkPixels.toString()+');('+installTopicScroll.toString()+')('+photoFrameProgress.toString()+');('+installSectionTransitions.toString()+')('+sectionTransitionState.toString()+');('+installActSlides.toString()+')('+actSlideState.toString()+');';
 return '<!doctype html><html lang="pt-BR" data-presentation-format="'+esc(story.template)+'" data-image-scroll="'+esc(story.imageScroll||'horizontal')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(project.name)+'</title><style>'+fontCSS+publishedNavigationCSS+topicScrollCSS+sectionTransitionCSS+actSlidesCSS+animatedBackgroundCSS+storyWebCSS+printRules+'</style></head><body><svg aria-hidden="true" width="0" height="0" style="position:absolute"><defs><filter id="story-nav-color"><feFlood id="story-nav-flood" style="flood-color:var(--story-forced-ink,var(--presentation-ink,#fff))"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs></svg><nav class="presentation-pagination" aria-label="Imagens da apresentação"><button id="previous" aria-label="Imagem anterior">←</button><span id="page-count" aria-live="polite">01 / '+String(count).padStart(2,'0')+'</span><button id="next" aria-label="Próxima imagem">→</button></nav><main class="story-screen">'+markup+'</main><div class="story-print">'+printed+'</div><script type="application/json" id="project">'+json(project)+'</script><script type="application/json" id="clips">'+json(videos)+'</script><script type="application/json" id="video-types">'+json(videoTypes)+'</script><script>'+script+'</script></body></html>';
}
function installStoryMedia(){
 const values=JSON.parse(document.getElementById('clips').textContent),types=JSON.parse(document.getElementById('video-types').textContent),urls={};
 for(const [id,data]of Object.entries(values)){
  if(/^assets\/[a-f0-9]{64}\.(mp4|webm|mov)$/.test(data)){urls[id]=new URL(data,document.baseURI).href;continue;}
  urls[id]=URL.createObjectURL(new Blob([Uint8Array.from(atob(data),char=>char.charCodeAt(0))],{type:types[id]||'video/mp4'}));
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');for(const video of document.querySelectorAll('video[data-asset]')){video.muted=true;video.src=urls[video.dataset.asset];if(!video.hasAttribute('data-motion-ink')&&!reduced.matches)video.play().catch(()=>{});}
 reduced.addEventListener('change',()=>{for(const video of document.querySelectorAll('video'))if(reduced.matches)video.pause();else video.play().catch(()=>{});});
}
const storyWebCSS=`
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#181818;color:#fff;font:300 19px/1.45 UniversMattar,Arial,sans-serif}
.presentation-pagination{position:fixed;bottom:clamp(20px,3vh,32px);left:50%;transform:translateX(-50%);z-index:1001;display:flex;align-items:center;gap:18px;font-size:13px;color:var(--presentation-ink,#fff)}.presentation-pagination button{appearance:none;border:0;background:none;color:inherit;font:inherit;font-size:20px;min-width:36px;min-height:36px;padding:8px;cursor:pointer}.presentation-pagination button:disabled{opacity:.3;cursor:default}
:root:has(.presentation-pagination.is-section-transition),:root:has(.presentation-pagination.is-act-slide){--story-forced-ink:#f7f6f2}.lm-nav.lm-nav{color:var(--story-forced-ink,var(--presentation-ink,#fff))}.lm-nav.lm-nav .lm-home img,.lm-nav.lm-nav .lm-toggle img,.lm-nav.lm-nav .lm-year img{filter:url(#story-nav-color)}
.photo-backdrop{container-type:size}.topic-native-art{position:absolute;left:50%;top:50%;width:max(100cqw,calc(100cqh * var(--art-aspect)));aspect-ratio:var(--art-aspect);transform:translate(-50%,-50%);overflow:hidden;container-type:inline-size}.photo-backdrop .topic-native-art>img{display:block;width:100%;height:100%;object-fit:contain}.topic-native-art>video{position:absolute;object-fit:contain;pointer-events:none}.story-native-still{position:absolute;inset:0;z-index:1}.topic-native-art>video{z-index:2}.topic-native-art:has(.animated-background) .story-native-still{z-index:1}
.topic-stage{padding-left:var(--topic-margin,9%);padding-right:var(--topic-margin,9%)}.topic-copy{width:min(var(--story-reading,100%),840px);color:var(--presentation-ink,var(--topic-ink,#fff))}.topic-copy.is-cover{width:min(100%,1100px)}.topic-copy .topic-eyebrow{margin:0 0 16px;font:300 13px/1.35 UniversMattar,Arial,sans-serif;letter-spacing:.04em}.topic-copy .topic-title{margin:0;font-size:clamp(40px,var(--story-title-size,5.7vw),116px);font-weight:300;line-height:1.05;letter-spacing:0}.topic-copy.is-cover .topic-title{font-size:clamp(48px,calc(var(--story-title-size,5.7vw)*1.27),128px)}.topic-body{margin-top:28px}.topic-copy .topic-body p{margin:0;max-width:560px;font-size:19px;line-height:1.45;white-space:pre-wrap}.topic-copy .topic-body p+p,.topic-copy .topic-body h3{margin-top:18px}.topic-body h3{font:300 24px/1.2 PerpetuaMattar,Georgia,serif}
.frame-caption{position:absolute;left:9%;right:9%;bottom:var(--reading-bottom);z-index:3;margin:0;max-width:560px;color:var(--presentation-ink,#fff);font:300 13px/1.35 UniversMattar,Arial,sans-serif;white-space:pre-wrap}.scroll-topic[data-reading-overflow=true] .topic-copy{left:var(--topic-margin,9%);width:min(calc((100% - var(--topic-margin,9%) * 2) * var(--story-reading-factor,.7)),840px)}.story-print{display:none}:focus-visible{outline:2px solid currentColor;outline-offset:4px}
@media(max-width:760px){.topic-copy{width:100%}.scroll-topic[data-reading-overflow=true] .topic-copy{width:calc(100% - var(--topic-margin,9%) * 2)}.topic-copy .topic-title{font-size:clamp(29px,7.8vw,52px)}.topic-copy.is-cover .topic-title{font-size:clamp(30px,9vw,60px)}.topic-copy .topic-body p{font-size:17px}.topic-copy .topic-eyebrow{margin-bottom:14px}.topic-body{margin-top:24px}}
@media(max-height:560px) and (min-width:600px){.topic-copy .topic-title{font-size:clamp(30px,4.7vw,46px)}.topic-copy.is-cover .topic-title{font-size:clamp(34px,5vw,54px)}.topic-copy .topic-body p{font-size:16px}.topic-copy .topic-eyebrow{margin-bottom:12px}.topic-body{margin-top:20px}}
@media print{.story-screen,.lm-nav,.presentation-pagination,.background-viewport,.viewport-probe{display:none!important}.story-print{display:block}.story-print-page{display:block;break-after:page;overflow:hidden}.story-print-page svg{display:block;width:100%;height:100%}body{background:none}}
`;
