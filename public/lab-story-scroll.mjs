// Native vertical scrolling drives the selected image transition.
// The image geometry stays intact in every direction.
export function photoFrameProgress(position,count,reduced=false){
 let value=Math.max(0,Math.min(count-1,Number.isFinite(position)?position:0));
 // Native scroll positions round to pixels; anchored photos still settle fully.
 if(Math.abs(value-Math.round(value))<.001)value=Math.round(value);
 if(reduced){const index=Math.round(value);return {base:index,next:index,progress:0,current:index};}
 const base=Math.floor(value),next=Math.min(count-1,base+1),progress=value-base;
 return {base,next,progress,current:progress>=.5?next:base};
}

// Self-contained: the downloaded presentations run without a server or library.
export function installTopicScroll(frameAt){
 const topics=[...document.querySelectorAll('.scroll-topic')],frames=[...document.querySelectorAll('.photo-backdrop[data-native-page]')];
 const topicImages=new Map(topics.map(topic=>[topic,[...topic.querySelectorAll('.photo-backdrop[data-native-page]')]])),homes=new Map(frames.map(frame=>[frame,frame.parentElement]));
 const html=document.documentElement,direction=['vertical','horizontal','fade'].includes(document.documentElement.dataset.imageScroll)?document.documentElement.dataset.imageScroll:'horizontal',viewport=document.createElement('div'),track=document.createElement('div');viewport.className='background-viewport';track.className='background-track';viewport.append(track);document.body.prepend(viewport);
 const previous=document.getElementById('previous'),next=document.getElementById('next'),counter=document.getElementById('page-count'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const probe=document.createElement('div');probe.className='viewport-probe';probe.setAttribute('aria-hidden','true');document.body.append(probe);
 let entries=[],positions=[],current=-1,scrollFrame=0,layoutFrame=0,printing=false,printY=0,lastScreenY=scrollY,renderKey='',visibleKey='',readingTop=80,readingBottom=innerHeight-80;
 function mountTrack(){
  for(const [index,frame]of frames.entries()){frame.dataset.scrollTopic=[...topicImages].find(([,images])=>images.includes(frame))[0].id;track.append(frame);Object.assign(frame.style,{left:(direction==='horizontal'?index*100:0)+'%',top:(direction==='vertical'?index*100:0)+'%',right:'auto',bottom:'auto',width:'100%',height:'100%',opacity:'1'});}
  html.dataset.imageTrack='true';html.dataset.imageScroll=direction;html.dataset.horizontalImages=String(direction==='horizontal');renderKey='';visibleKey='';
 }
 function protectReading(copy){
  if(!copy)return;const rect=copy.getBoundingClientRect(),start=Math.max(0,readingTop-rect.top),end=Math.min(rect.height,readingBottom-rect.top);
  const mask=end<=start?'linear-gradient(transparent,transparent)':'linear-gradient(to bottom,'+(start>0?'transparent '+start+'px,#000 '+(start+12)+'px':'#000 0px')+','+(end<rect.height?'#000 '+Math.max(start+12,end-12)+'px,transparent '+end+'px,transparent 100%':'#000 100%')+')';
  copy.style.maskImage=mask;copy.style.webkitMaskImage=mask;
 }
 function render(state){
  const visible=state.base+':'+state.next;
  if(visible!==visibleKey){visibleKey=visible;for(const [index,frame]of frames.entries()){frame.style.visibility=index===state.base||index===state.next?'visible':'hidden';if(direction==='fade')frame.style.opacity=index===state.next&&state.next!==state.base?String(state.progress):'1';}}
  const key=String(Math.round((state.base+state.progress)*1e6));if(key===renderKey)return;renderKey=key;
  const offset=(-(state.base+state.progress)*100).toFixed(5)+'%';
  track.style.transform=direction==='vertical'?'translate3d(0,'+offset+',0)':direction==='horizontal'?'translate3d('+offset+',0,0)':'translate3d(0,0,0)';
  if(direction==='fade'){frames[state.base].style.opacity='1';if(state.next!==state.base)frames[state.next].style.opacity=String(state.progress);}
 }
 function update(){
  scrollFrame=0;if(printing||printMedia.matches||layoutFrame||!entries.length)return;lastScreenY=scrollY;
  for(const entry of entries)if(entry.overflow)protectReading(entry.copy);
  let low=0,high=positions.length-1;
  while(low<high){const middle=Math.ceil((low+high)/2);if(positions[middle]<=scrollY)low=middle;else high=middle-1;}
  let fraction=low<positions.length-1?(scrollY-positions[low])/(positions[low+1]-positions[low]):0;
  // New acts arrive decisively, then hold their first image while the copy enters.
  // The ordinary gallery keeps its direct one-to-one relationship with scroll.
  const incoming=entries.find(entry=>entry.act&&entry.images[0]===frames[low+1]);
  if(incoming){const x=Math.max(0,Math.min(1,(scrollY-incoming.top+.5*incoming.step)/(.5*incoming.step)));fraction=x*x*(3-2*x);}
  const state=frameAt(low+Math.max(0,Math.min(1,fraction)),frames.length,reduced.matches);render(state);
  const index=state.current;
  const ink=frames[index].dataset.storyInk;if(ink)html.style.setProperty('--presentation-ink',ink);
  for(const entry of entries)entry.element.dataset.currentImage=String(Math.max(0,entry.images.indexOf(frames[index]))+1);
  if(index!==current){current=index;counter.textContent=String(index+1).padStart(2,'0')+' / '+String(frames.length).padStart(2,'0');previous.disabled=index<=0;next.disabled=index>=frames.length-1;}
 }
 const schedule=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(update);};
 function layout(){
  layoutFrame=0;if(printing)return;
  const tracked=frames[current],before=entries.find(entry=>entry.images.includes(tracked));
  // CSS viewport units and browser anchoring can shift scrollY during rotation.
  // Restore from the last rendered position rather than that transient value.
  const offset=before?(lastScreenY-before.positions[before.images.indexOf(tracked)])/before.step:0;
  const height=probe.offsetHeight,style=getComputedStyle(probe),top=parseFloat(style.paddingTop),bottom=parseFloat(style.paddingBottom);
  readingTop=Math.max(80,...[...document.querySelectorAll('.lm-nav .lm-home,.lm-nav .lm-summary-toggle')].map(node=>node.getBoundingClientRect().bottom+12));
  readingBottom=Math.min(height-80,...[...document.querySelectorAll('.lm-nav .lm-menu-toggle,.lm-nav .lm-year,.presentation-pagination')].map(node=>node.getBoundingClientRect().top-12));
  entries=topics.map(element=>{
   const copy=element.querySelector('.topic-copy'),images=topicImages.get(element),reading=copy?Math.ceil(copy.getBoundingClientRect().height+top+bottom):height;
   const overflow=reading>height+1;element.dataset.readingOverflow=String(overflow);element.style.setProperty('--reading-height',reading+'px');
   const act=element.hasAttribute('data-act'),hold=act ? .6*height : 0;
   element.style.setProperty('--act-reading-offset',hold+'px');
   const total=(overflow?reading+(images.length-1+.45)*height:(images.length+.45)*height)+hold;
   element.style.height=total+'px';element.style.setProperty('--topic-flow-height',total+'px');
   if(copy&&!overflow){copy.style.maskImage='';copy.style.webkitMaskImage='';const room=Math.max(0,height-top-bottom-copy.offsetHeight);copy.style.top=((Number(copy.dataset.readingPosition??50)/100-.5)*room)+'px';}else if(copy)copy.style.top='';
   return {element,images,copy,reading,overflow,act,hold,step:height};
  });
  for(const entry of entries){
   entry.top=entry.element.getBoundingClientRect().top+scrollY;entry.height=entry.element.offsetHeight;
   entry.positions=entry.images.map((image,index)=>entry.top+entry.hold+(entry.overflow&&index>0?entry.reading+(index-1)*entry.step:index*entry.step));
   for(const [index,anchor]of [...entry.element.querySelectorAll('.frame-anchor')].entries())anchor.style.top=(entry.positions[index]-entry.top)+'px';
  }
  positions=entries.flatMap(entry=>entry.positions);
  if(before&&before.step!==height){
   const after=entries.find(entry=>entry.images.includes(tracked)),html=document.documentElement,behavior=html.style.scrollBehavior;
   html.style.scrollBehavior='auto';scrollTo({top:after.positions[after.images.indexOf(tracked)]+offset*height,behavior:'auto'});html.style.scrollBehavior=behavior;
  }
  update();
 }
 const scheduleLayout=()=>{if(!layoutFrame)layoutFrame=requestAnimationFrame(layout);};
 function show(index,instant=false){
  const frame=frames[Math.max(0,Math.min(index,frames.length-1))],entry=entries.find(item=>item.images.includes(frame));if(!entry)return;
  scrollTo({top:entry.positions[entry.images.indexOf(frame)],behavior:instant||reduced.matches?'auto':'smooth'});
 }
 previous.onclick=()=>show(current-1);next.onclick=()=>show(current+1);
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',scheduleLayout,{passive:true});addEventListener('pageshow',scheduleLayout);addEventListener('load',scheduleLayout);
 reduced.addEventListener('change',()=>{renderKey='';visibleKey='';schedule();});
 // Trackpads can also scroll sideways. The ordinary vertical wheel is left
 // entirely native and uses the same document timeline as keyboard and touch.
 addEventListener('wheel',event=>{
  if(direction!=='horizontal'||printing||Math.abs(event.deltaX)<=Math.abs(event.deltaY)||event.target.closest('.lm-nav,input,textarea,select,[contenteditable=true]'))return;
  if(!event.cancelable)return;event.preventDefault();const previous=html.style.scrollBehavior;html.style.scrollBehavior='auto';scrollBy({top:event.deltaX*(event.deltaMode===1?16:event.deltaMode===2?probe.offsetHeight:1),behavior:'auto'});html.style.scrollBehavior=previous;
 },{passive:false});
 const observer=new ResizeObserver(scheduleLayout);observer.observe(probe);for(const topic of topics){const copy=topic.querySelector('.topic-copy');if(copy)observer.observe(copy);}
 function restoreFrameHash(){let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const index=frames.findIndex(frame=>frame.dataset.nativePage===id);if(index>=0)show(index,true);}
 addEventListener('hashchange',restoreFrameHash);
 function enterPrint(){
  // Print styles can shrink the screen track before the media event arrives.
  // Keep the last screen position so leaving print restores the same image.
  if(printing)return;printing=true;printY=lastScreenY;delete html.dataset.horizontalImages;delete html.dataset.imageTrack;
  for(const frame of frames){homes.get(frame).append(frame);for(const property of ['left','right','top','bottom','width','height','opacity','visibility'])frame.style[property]='';}
 }
 function leavePrint(){
  if(!printing)return;printing=false;mountTrack();layout();const previous=html.style.scrollBehavior;html.style.scrollBehavior='auto';scrollTo({top:printY,behavior:'auto'});html.style.scrollBehavior=previous;update();
 }
 const printMedia=matchMedia('print');printMedia.addEventListener('change',event=>event.matches?enterPrint():leavePrint());addEventListener('beforeprint',enterPrint);addEventListener('afterprint',leavePrint);
 document.addEventListener('keydown',event=>{
  if(document.documentElement.classList.contains('lm-guide-open')||event.target.closest('.lm-nav,input,textarea,select,[contenteditable=true]'))return;
  if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();show(current+1);}if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();show(current-1);}
 });
 if(printMedia.matches)enterPrint();else mountTrack();layout();document.fonts.ready.then(()=>{layout();restoreFrameHash();});
}

export const topicScrollCSS=`
:root{--reading-top:clamp(124px,15svh,170px);--reading-bottom:clamp(136px,17svh,180px)}
.presentation-section,.scroll-topic{position:relative}.scroll-topic{height:calc(var(--frame-count)*100svh)}
.topic-stage{position:sticky;top:0;isolation:isolate;height:100svh;display:flex;align-items:center;padding:var(--reading-top) 9% var(--reading-bottom);overflow:hidden;color:#fff}
.photo-stack{position:absolute;inset:0;z-index:-1;overflow:hidden;background:#181818}.photo-backdrop{position:absolute;inset:0;overflow:hidden;background:#181818}
.photo-backdrop img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 50%}.photo-backdrop:after{content:'';position:absolute;inset:0;background:rgba(0,0,0,var(--photo-contrast))}
.topic-copy{position:relative;flex:0 0 auto;width:min(100%,680px);z-index:1}.topic-copy h2{margin:0 0 30px;font-size:clamp(44px,6.1vw,104px);font-weight:300;line-height:1.02;letter-spacing:-.025em}.story-title-line{display:block;overflow-wrap:break-word}.story-title-line:nth-child(2){letter-spacing:0}.topic-copy p{margin:0;max-width:560px;font-size:19px;line-height:1.45;white-space:pre-wrap}
.frame-anchor{position:absolute;left:0;top:calc(var(--frame-index)*100svh);width:1px;height:1px;visibility:hidden;pointer-events:none}.viewport-probe{position:fixed;left:0;top:0;width:1px;height:100svh;padding:var(--reading-top) 0 var(--reading-bottom);visibility:hidden;pointer-events:none;z-index:-10}
.background-viewport{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#181818}.background-track{position:absolute;inset:0;will-change:transform}
@media screen{html[data-image-track=true]{overflow-anchor:none}html[data-image-track=true] main{position:relative;z-index:1}html[data-image-track=true] .photo-stack{background:transparent}html[data-image-track=true] .scroll-topic[data-reading-overflow=true] .topic-stage{height:var(--topic-flow-height)}}
/* Keep all copy readable when a short viewport cannot contain a pinned topic. */
.scroll-topic[data-reading-overflow=true] .topic-stage{position:relative;height:auto;display:block;padding:0;overflow:visible}.scroll-topic[data-reading-overflow=true] .photo-stack{position:relative;inset:auto;overflow:visible}.scroll-topic[data-reading-overflow=true] .photo-backdrop{position:relative;inset:auto;height:100svh;opacity:1!important;visibility:visible!important;will-change:auto}.scroll-topic[data-reading-overflow=true] .photo-backdrop:first-child{height:max(100svh,var(--reading-height))}.scroll-topic[data-reading-overflow=true] .topic-copy{position:absolute;top:var(--reading-top);left:9%;width:min(82%,680px)}
@media(max-width:760px){.topic-copy h2{font-size:clamp(34px,9vw,60px);margin-bottom:26px}.topic-copy p{font-size:17px}}
@media(max-height:560px) and (min-width:600px){:root{--reading-top:94px;--reading-bottom:100px}.topic-copy h2{font-size:clamp(32px,5vw,48px);margin-bottom:20px}.topic-copy p{font-size:16px}}
@media print{.topic-copy{mask-image:none!important;-webkit-mask-image:none!important}@page{size:landscape;margin:0}.background-viewport,.lm-nav,.presentation-pagination,.frame-anchor,.viewport-probe{display:none!important}.scroll-topic{height:auto!important}.topic-stage,.scroll-topic[data-reading-overflow=true] .topic-stage{position:relative;height:auto;display:block;padding:0;overflow:visible}.photo-stack{position:relative;inset:auto;overflow:visible}.photo-backdrop,.scroll-topic[data-reading-overflow=true] .photo-backdrop,.scroll-topic[data-reading-overflow=true] .photo-backdrop:first-child{position:relative;inset:auto;height:100vh;opacity:1!important;visibility:visible!important;break-after:page;will-change:auto;print-color-adjust:exact;-webkit-print-color-adjust:exact}.topic-copy,.scroll-topic[data-reading-overflow=true] .topic-copy{position:absolute;top:9%;left:9%;width:min(82%,680px)}.topic-copy h2{font-size:46pt}.topic-copy p{font-size:15pt}[data-text-entrance]{color:inherit!important;position:static!important}[data-text-entrance]>span[aria-hidden=true]{display:none!important}}
`;
