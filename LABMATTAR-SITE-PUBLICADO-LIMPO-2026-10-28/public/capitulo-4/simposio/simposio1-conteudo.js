const sections=[...document.querySelectorAll('.section[id]')];
const chapters=sections.map(s=>[s.id,s.dataset.title||s.querySelector('h1,h2,h3')?.textContent.trim().replace(/\s+/g,' ')||s.id]);
const ambientSources=['./assets/bg-01.png','./assets/bg-02.png','./assets/bg-03.png','./assets/bg-04.png','./assets/bg-05.png','./assets/bg-06.png','./assets/bg-07.png','./assets/bg-08.png'];
const ambient=document.createElement('div');ambient.className='simposio-ambient';ambient.setAttribute('aria-hidden','true');ambient.innerHTML=`<div class="simposio-ambient-images">${ambientSources.map((src,i)=>`<img src="${src}" alt="" class="${i===0?'is-active':''}">`).join('')}</div><div class="simposio-ambient-veil"></div>`;document.body.prepend(ambient);
function setAmbient(index){ambient.querySelectorAll('img').forEach((img,i)=>img.classList.toggle('is-active',i===index));}
const ambientImages=[...ambient.querySelectorAll('img')];
function updateAmbientBlend(){
  const focus=scrollY+innerHeight*.5;
  let current=0;
  for(let i=1;i<sections.length;i++){
    if(focus>=sections[i].offsetTop)current=i;else break;
  }
  const next=Math.min(sections.length-1,current+1);
  const boundary=sections[next]?.offsetTop??Infinity;
  const band=Math.max(320,innerHeight*.92);
  const raw=next===current?0:Math.max(0,Math.min(1,(focus-(boundary-band*.5))/band));
  const progress=raw*raw*(3-2*raw);
  const transitionBlur=next===current?0:Math.sin(Math.PI*progress)*5;
  ambientImages.forEach((img,i)=>{
    img.classList.remove('is-active');
    let opacity=0,scale=1.1;
    if(i===current){opacity=1-progress;scale=1.025+progress*.045}
    if(i===next&&next!==current){opacity=progress;scale=1.07-progress*.045}
    img.style.opacity=opacity.toFixed(4);
    img.style.transform=`scale(${scale.toFixed(4)})`;
    img.style.setProperty('--ambient-transition-blur',(i===current||i===next)?`${transitionBlur.toFixed(2)}px`:'0px');
  });
  return progress>.5?next:current;
}
document.documentElement.classList.add('motion-ready');
const motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-in-view',entry.isIntersecting)),{threshold:.04});sections.forEach(s=>motionObserver.observe(s));
let stageFrame=0,activeId='';function updateScrollStage(){stageFrame=0;const ambientIndex=updateAmbientBlend();const center=innerHeight*.5;let active=null,best=Infinity;sections.forEach((s,i)=>{const r=s.getBoundingClientRect();const c=r.top+Math.min(r.height,innerHeight)*.5;const d=Math.abs(c-center);s.style.setProperty('--panel-opacity','1');if(r.bottom>0&&r.top<innerHeight&&d<best){best=d;active=[s,i]}});const activeSection=sections[ambientIndex]||active?.[0];if(activeSection&&activeSection.id!==activeId){activeId=activeSection.id;document.querySelectorAll('.page-nav a').forEach(a=>a.classList.toggle('is-active',a.getAttribute('href')===`#${activeId}`));}}
function requestStageUpdate(){if(!stageFrame)stageFrame=requestAnimationFrame(updateScrollStage)}addEventListener('scroll',requestStageUpdate,{passive:true});addEventListener('resize',requestStageUpdate);addEventListener('hashchange',requestStageUpdate);addEventListener('load',()=>requestAnimationFrame(requestStageUpdate),{once:true});updateScrollStage();
let settleTimer=0,settleLock=false;function settleCompleteSection(){if(settleLock)return;const viewport=innerHeight;let closest=null,distance=Infinity;sections.filter(s=>s.getBoundingClientRect().height<=viewport*1.08).forEach(s=>{const d=Math.abs(s.getBoundingClientRect().top);if(d<distance){closest=s;distance=d}});if(!closest||distance<2||distance>viewport*.42)return;settleLock=true;scrollTo({top:scrollY+closest.getBoundingClientRect().top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});setTimeout(()=>settleLock=false,650)}addEventListener('scroll',()=>{if(settleLock)return;clearTimeout(settleTimer);settleTimer=setTimeout(settleCompleteSection,170)},{passive:true});
const pageNav=document.querySelector('.page-nav ol');chapters.forEach(([id,title],i)=>{const li=document.createElement('li');li.innerHTML=`<a href="#${id}" data-chapter="${i+1}" aria-label="${title}">${i+1}</a>`;pageNav?.append(li)});
const scrambleAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÃÂÉÊÍÓÔÕÚÇ0123456789';function scrambleText(value,progress,seed){let pos=0;const len=Math.max(1,value.replace(/\s/g,'').length-1);return Array.from(value).map(ch=>{if(/\s/.test(ch))return ch;const threshold=pos/len;const rand=Math.abs(Math.floor(Math.sin((pos+1)*12.9898+seed*8.43)*43758.5453));pos++;return progress>=threshold?ch:scrambleAlphabet[rand%scrambleAlphabet.length]}).join('')}
document.querySelectorAll('.section h1,.section h2').forEach(heading=>{const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())if(walker.currentNode.nodeValue.trim())nodes.push([walker.currentNode,walker.currentNode.nodeValue]);heading.setAttribute('aria-label',heading.textContent.trim().replace(/\s+/g,' '));let frame=0;const play=()=>{cancelAnimationFrame(frame);if(matchMedia('(prefers-reduced-motion: reduce)').matches){nodes.forEach(([n,v])=>n.nodeValue=v);return}const start=performance.now();const tick=now=>{const p=Math.min(1,(now-start)/620);nodes.forEach(([n,v],i)=>n.nodeValue=scrambleText(v,p,p*41+i));if(p<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)};new IntersectionObserver(([e])=>{if(e.isIntersecting)play()},{threshold:.5}).observe(heading)});
document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.artist-carousel').forEach(carousel=>{
  const slides=[...carousel.querySelectorAll('.artist-slide')];
  const credit=carousel.querySelector('.artist-carousel-credit');
  if(slides.length<2||!credit)return;
  let current=0;
  const show=index=>{
    current=index;
    slides.forEach((slide,i)=>{const active=i===current;slide.classList.toggle('is-active',active);slide.setAttribute('aria-hidden',String(!active))});
    const slide=slides[current];
    credit.innerHTML=`<strong>${slide.dataset.artist}</strong><span>${slide.dataset.work}</span>`;
  };
  show(0);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const interval=Math.max(1500,Number(carousel.dataset.interval)||1500);
    setInterval(()=>{if(!document.hidden)show((current+1)%slides.length)},interval);
  }
}));




// Expanded editorial images and source credits. Portraits and artist works are intentionally excluded.
const editorialFigures=[...document.querySelectorAll('.editorial-image-expandable-disabled')];
if(editorialFigures.length){
  const viewer=document.createElement('div');
  viewer.className='image-viewer';
  viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Imagem ampliada e crédito');
  viewer.innerHTML='<button class="image-viewer-close" type="button" aria-label="Fechar imagem">×</button><div class="image-viewer-media"><img class="image-viewer-image" alt=""></div><div class="image-viewer-footer"><span class="image-viewer-credit"></span><a class="image-viewer-source" target="_blank" rel="noopener noreferrer">Ver fonte</a></div>';
  document.body.append(viewer);
  const image=viewer.querySelector('.image-viewer-image'),credit=viewer.querySelector('.image-viewer-credit'),source=viewer.querySelector('.image-viewer-source'),close=viewer.querySelector('.image-viewer-close');
  let returnFocus=null;
  const hide=()=>{viewer.classList.remove('is-open');document.body.classList.remove('has-image-viewer');image.removeAttribute('src');returnFocus?.focus()};
  const show=figure=>{const thumb=figure.querySelector('img');returnFocus=figure;image.src=figure.dataset.fullSrc||thumb.src;image.alt=thumb.alt;credit.textContent=figure.dataset.credit||'Crédito em verificação';if(figure.dataset.sourceUrl){source.href=figure.dataset.sourceUrl;source.hidden=false}else{source.hidden=true;source.removeAttribute('href')}viewer.classList.add('is-open');document.body.classList.add('has-image-viewer');close.focus()};
  editorialFigures.forEach(figure=>{figure.tabIndex=0;figure.setAttribute('role','button');figure.setAttribute('aria-label',`Ampliar imagem: ${figure.querySelector('img')?.alt||'imagem editorial'}`);figure.addEventListener('click',()=>show(figure));figure.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();show(figure)}})});
  close.addEventListener('click',hide);viewer.addEventListener('click',event=>{if(event.target===viewer||event.target.classList.contains('image-viewer-media'))hide()});addEventListener('keydown',event=>{if(event.key==='Escape'&&viewer.classList.contains('is-open'))hide()});
}
