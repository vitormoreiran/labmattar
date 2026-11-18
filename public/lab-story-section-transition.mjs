// A photographic M marks the passage from the introduction to the five acts.
// Motion follows native scroll in either direction; the approved M is only
// scaled uniformly as a mask. The image and the vector are never stretched.
export function sectionTransitionState(progress,reduced=false){
 const clamp=value=>Math.max(0,Math.min(1,value));
 const ease=(from,to)=>{const x=clamp((progress-from)/(to-from));return x*x*(3-2*x);};
 if(!Number.isFinite(progress)||progress<0||progress>=1)return {opacity:0,maskOpacity:0,maskScale:1,blur:0,shade:.22,textOpacity:0,textY:0};
 if(reduced)return {opacity:1,maskOpacity:1,maskScale:1,blur:12,shade:.7,textOpacity:1,textY:0};
 const reveal=ease(.14,.46),label=ease(.31,.49);
 return {opacity:ease(0,.13)*(1-ease(.84,1)),maskOpacity:reveal,maskScale:1+.18*(1-reveal),blur:12*reveal,shade:.22+.48*reveal,textOpacity:label,textY:16*(1-label)};
}

export function installSectionTransitions(stateAt){
 const sections=[...document.querySelectorAll('[data-section-transition]')];if(!sections.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),print=matchMedia('print'),pagination=document.querySelector('.presentation-pagination');
 const entries=sections.map(section=>({section,stage:section.querySelector('.section-transition-stage'),start:0,duration:1,maskWidth:0}));
 let scheduled=0;
 function update(){
  scheduled=0;let visible=false;
  for(const entry of entries){
   const progress=(scrollY-entry.start)/entry.duration,state=stateAt(progress,reduced.matches),active=!print.matches&&state.opacity>0;
   entry.section.dataset.transitionProgress=String(Math.max(0,Math.min(1,progress)));
   entry.stage.style.visibility=active?'visible':'hidden';entry.stage.style.opacity=String(state.opacity);
   entry.stage.style.setProperty('--transition-m-width',entry.maskWidth*state.maskScale+'px');
   entry.stage.style.setProperty('--transition-mask-opacity',state.maskOpacity);
   entry.stage.style.setProperty('--transition-blur',state.blur+'px');
   entry.stage.style.setProperty('--transition-shade',state.shade);
   entry.stage.style.setProperty('--transition-text-opacity',state.textOpacity);
   entry.stage.style.setProperty('--transition-text-y',state.textY+'px');visible||=active;
  }
  pagination?.classList.toggle('is-section-transition',visible);
 }
 function layout(){
  const height=document.querySelector('.viewport-probe')?.offsetHeight||innerHeight;
  for(const entry of entries){
   entry.start=entry.section.getBoundingClientRect().top+scrollY-.2*height;entry.duration=entry.section.offsetHeight;
   entry.maskWidth=innerWidth<=760?innerWidth*.88:Math.min(innerWidth*.62,height*.96);
  }
  update();
 }
 const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(update);};
 function restoreHash(){let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const entry=entries.find(item=>item.section.id===id);if(!entry)return;
  const html=document.documentElement,behavior=html.style.scrollBehavior;html.style.scrollBehavior='auto';scrollTo({top:entry.start+entry.duration*.56,behavior:'instant'});html.style.scrollBehavior=behavior;update();
 }
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',layout,{passive:true});addEventListener('load',layout);addEventListener('pageshow',layout);addEventListener('hashchange',restoreHash);
 reduced.addEventListener('change',layout);print.addEventListener('change',layout);
 layout();document.fonts.ready.then(()=>{layout();restoreHash();});
}

export const sectionTransitionCSS=`
.section-transition{position:relative;height:220svh;pointer-events:none}
.section-transition-stage{position:fixed;inset:0;z-index:20;isolation:isolate;overflow:hidden;background:#181818;color:#fff;opacity:0;visibility:hidden;--transition-m-width:62vw;--transition-mask-opacity:1;--transition-blur:12px;--transition-shade:.7;--transition-text-opacity:1;--transition-text-y:0px}
.section-transition-background,.section-transition-m{position:absolute;inset:0;background-image:var(--transition-photo);background-size:cover;background-position:50% 50%;background-repeat:no-repeat}
.section-transition-background{filter:blur(var(--transition-blur));transform:scale(1.035)}
.section-transition-shade{position:absolute;inset:0;background:rgba(0,0,0,var(--transition-shade))}
.section-transition-m{opacity:var(--transition-mask-opacity);mask-image:var(--transition-mask);mask-repeat:no-repeat;mask-size:var(--transition-m-width) auto;mask-position:60% 50%;-webkit-mask-image:var(--transition-mask);-webkit-mask-repeat:no-repeat;-webkit-mask-size:var(--transition-m-width) auto;-webkit-mask-position:60% 50%}
.section-transition-m:after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.12)}
.section-transition-copy{position:absolute;left:9%;top:50%;width:17%;max-width:230px;opacity:var(--transition-text-opacity);transform:translateY(calc(-50% + var(--transition-text-y)))}
.section-transition-copy p{margin:0 0 22px;font:300 13px/1.4 UniversMattar,Arial,sans-serif;letter-spacing:.04em;overflow-wrap:normal}
.section-transition-copy h2{margin:0;font:300 clamp(34px,3.7vw,64px)/1.04 PerpetuaMattar,Georgia,serif;letter-spacing:0}.section-transition-copy h2 span{display:block}
.presentation-pagination.is-section-transition{visibility:hidden;pointer-events:none}
@media(max-width:760px){.section-transition-m{mask-position:50% 60%;-webkit-mask-position:50% 60%}.section-transition-copy{top:clamp(148px,24svh,210px);width:82%;max-width:none}.section-transition-copy p{margin-bottom:14px;font-size:12px}.section-transition-copy h2{font-size:clamp(30px,8vw,42px)}.section-transition-copy h2 span{display:inline}.section-transition-copy h2 span+span:before{content:' '}}
@media(max-height:560px) and (min-width:761px){.section-transition-copy h2{font-size:32px}.section-transition-copy p{font-size:11px;margin-bottom:14px}}
/* Motion preferences share the same timeline so existing image anchors stay put. */
@media print{.section-transition{display:none!important}}
`;
