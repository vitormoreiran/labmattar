// Chapter changes have their own rhythm: identify the act, reveal its first
// photograph, then release the reading and the continuous image sequence.
export function actSlideState(progress,reduced=false){
 const clamp=value=>Math.max(0,Math.min(1,value));
 const smooth=(a,b)=>{const x=clamp((progress-a)/(b-a));return x*x*(3-2*x);};
 if(!Number.isFinite(progress)||progress<0||progress>=1)return {opacity:0,reveal:0,titleOpacity:0,titleY:0,photoX:0};
 if(reduced){const photo=progress>=.56;return {opacity:1,reveal:photo?1:0,titleOpacity:photo?0:1,titleY:0,photoX:0};}
 const x=clamp((progress-.5)/.38),reveal=1-(1-x)**3;
 return {opacity:smooth(0,.1)*(1-smooth(.96,1)),reveal,titleOpacity:smooth(.08,.22)*(1-smooth(.51,.7)),titleY:18*(1-smooth(.08,.22))-12*smooth(.51,.7),photoX:12*(1-reveal)};
}

export function installActSlides(stateAt){
 const elements=[...document.querySelectorAll('[data-act-opener]')];if(!elements.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),print=matchMedia('print'),pagination=document.querySelector('.presentation-pagination');
 const entries=elements.map(element=>({element,stage:element.querySelector('.act-slide-stage'),topic:element.nextElementSibling,copy:element.nextElementSibling.querySelector('.topic-copy'),start:0,duration:1,readingAt:0,height:1}));
 let scheduled=0;
 const clamp=value=>Math.max(0,Math.min(1,value));
 function update(){
  scheduled=0;let active=false;
  for(const entry of entries){
   const progress=(scrollY-entry.start)/entry.duration,state=stateAt(progress,reduced.matches),visible=!print.matches&&state.opacity>0;
   entry.element.dataset.slideProgress=String(clamp(progress));
   Object.assign(entry.stage.style,{visibility:visible?'visible':'hidden',opacity:String(state.opacity)});
   entry.stage.style.setProperty('--act-image-reveal',state.reveal);
   entry.stage.style.setProperty('--act-title-opacity',state.titleOpacity);
   entry.stage.style.setProperty('--act-title-y',state.titleY+'px');
   entry.stage.style.setProperty('--act-photo-x',state.photoX+'%');
   let reading=clamp((scrollY-entry.readingAt)/(.24*entry.height));
   reading=reduced.matches?(reading>=.5?1:0):reading*reading*(3-2*reading);
   entry.copy.style.setProperty('--act-reading-opacity',print.matches?1:reading);
   entry.copy.style.setProperty('--act-reading-y',(print.matches||reduced.matches?0:12*(1-reading))+'px');active||=visible;
  }
  pagination?.classList.toggle('is-act-slide',active);
 }
 function layout(){
  const height=document.querySelector('.viewport-probe')?.offsetHeight||innerHeight;
  for(const entry of entries){const top=entry.element.getBoundingClientRect().top+scrollY,topicTop=entry.topic.getBoundingClientRect().top+scrollY;
   entry.start=top-.35*height;entry.duration=entry.element.offsetHeight+.6*height;entry.readingAt=topicTop+.18*height;entry.height=height;
  }
  update();
 }
 const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(update);};
 function restoreHash(){let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const entry=entries.find(item=>item.element.id===id||item.element.parentElement.id===id);if(!entry)return;
  const html=document.documentElement,behavior=html.style.scrollBehavior;html.style.scrollBehavior='auto';scrollTo({top:entry.start+entry.duration*.32,behavior:'instant'});html.style.scrollBehavior=behavior;update();
 }
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',layout,{passive:true});addEventListener('load',layout);addEventListener('pageshow',layout);addEventListener('hashchange',restoreHash);reduced.addEventListener('change',layout);print.addEventListener('change',layout);
 const observer=new ResizeObserver(layout);for(const entry of entries)observer.observe(entry.topic);
 layout();document.fonts.ready.then(()=>{layout();restoreHash();});
}

export const actSlidesCSS=`
.act-opener{position:relative;height:75svh;pointer-events:none}
.act-slide-stage{position:fixed;inset:0;z-index:30;isolation:isolate;overflow:hidden;background:#181818;color:#f7f6f2;visibility:hidden;opacity:0;--act-image-reveal:0;--act-title-opacity:0;--act-title-y:0px;--act-photo-x:0%}
.act-slide-photo{position:absolute;inset:0;overflow:hidden;clip-path:inset(0 0 0 calc(100% * (1 - var(--act-image-reveal))))}
.act-slide-photo:before{content:'';position:absolute;inset:0;background-image:var(--act-photo);background-position:50% 50%;background-size:cover;background-repeat:no-repeat;transform:translate3d(var(--act-photo-x),0,0)}
html[data-image-scroll=vertical] .act-slide-photo{clip-path:inset(calc(100% * (1 - var(--act-image-reveal))) 0 0 0)}
html[data-image-scroll=vertical] .act-slide-photo:before{transform:translate3d(0,var(--act-photo-x),0)}
html[data-image-scroll=fade] .act-slide-photo{clip-path:none;opacity:var(--act-image-reveal)}
html[data-image-scroll=fade] .act-slide-photo:before{transform:none}
.act-slide-photo:after{content:'';position:absolute;inset:0;background:rgba(0,0,0,var(--act-photo-contrast))}
.act-slide-copy{position:absolute;left:9%;right:9%;top:50%;opacity:var(--act-title-opacity);transform:translate3d(0,calc(-50% + var(--act-title-y)),0)}
.act-slide-kicker{margin:0 0 20px;font:300 13px/1.4 UniversMattar,Arial,sans-serif;letter-spacing:.04em}
.act-slide-heading{display:flex;align-items:baseline;gap:clamp(32px,4.5vw,88px)}
.act-slide-number{flex:none;font:300 clamp(100px,14vw,210px)/.85 UniversMattar,Arial,sans-serif;letter-spacing:-.035em}
.act-slide-name{min-width:0;margin:0;font:300 clamp(48px,7.2vw,118px)/1.04 PerpetuaMattar,Georgia,serif;letter-spacing:0;overflow-wrap:normal}
.presentation-pagination.is-act-slide{visibility:hidden;pointer-events:none}
@media screen{html[data-image-track=true] .scroll-topic[data-act] .topic-copy{opacity:var(--act-reading-opacity,1);transform:translate3d(0,var(--act-reading-y,0px),0)}}
@media screen{html[data-image-track=true] .scroll-topic[data-act][data-reading-overflow=true] .topic-copy{top:calc(var(--reading-top) + var(--act-reading-offset,0px))}}
@media(max-width:760px){.act-slide-heading{flex-direction:column;align-items:flex-start;gap:24px}.act-slide-number{font-size:clamp(84px,25vw,118px)}.act-slide-name{font-size:clamp(36px,10vw,64px)}.act-slide-kicker{font-size:12px;margin-bottom:20px}}
@media(max-height:560px) and (min-width:761px){.act-slide-number{font-size:100px}.act-slide-name{font-size:54px}.act-slide-kicker{margin-bottom:16px}}
@media print{.act-opener{display:none!important}.scroll-topic[data-act] .topic-copy{opacity:1!important;transform:none!important}}
`;
