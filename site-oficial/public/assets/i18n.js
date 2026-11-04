const KEY='mattar-language';
const SUPPORTED=new Set(['pt','en','es']);
const WORK_TITLES=new Set(['COMOPENSOCOMO','PARALLAX','PÉDEVERSO','BELUZCO','MULHERVIDALIBERDADE','CONCHAYTORO','POIESIS','POIÉSIS','URBANFLORA','35FRAGMENTOS','NUVEMNEGRA','SOVIETROULETTE','CONCRETOEFÊMERO','ALETEIA','LOCOMELOCURA','FOMECOME','MORANGOSCARNÍVOROS','DÁDIVA','GELÚMINAS','ÓPERADOSPORCOS']);
let catalog=null;
let ready=null;
let observer=null;
let overlaySwitch=null;
let overlayFrame=0;
let activeLanguage=getLanguage();
let switchToken=0;
const originalText=new WeakMap();
const renderedText=new WeakMap();
const originalAttributes=new WeakMap();
const openingMarkup={
  pt:'<span>OFERECER <span class="perpetua-accent">UM</span></span><span><span class="perpetua-accent">ALIMENTO</span> NÃO</span><span>FUNCIONAL PARA</span><span><span class="perpetua-accent">UM</span>&nbsp;<span class="perpetua-accent">CORPO</span></span><span>IMATERIAL.</span>',
  en:'<span>OFFER <span class="perpetua-accent">A</span></span><span>NONFUNCTIONAL</span><span><span class="perpetua-accent">FOOD</span> TO <span class="perpetua-accent">AN</span></span><span>IMMATERIAL</span><span class="perpetua-accent">BODY.</span>',
  es:'<span>OFRECER <span class="perpetua-accent">UN</span></span><span><span class="perpetua-accent">ALIMENTO</span> NO</span><span>FUNCIONAL PARA</span><span><span class="perpetua-accent">UN</span>&nbsp;<span class="perpetua-accent">CUERPO</span></span><span>INMATERIAL.</span>',
};
const openingLabel={pt:'OFERECER UM ALIMENTO NÃO FUNCIONAL PARA UM CORPO IMATERIAL.',en:'OFFER NONFUNCTIONAL FOOD TO AN IMMATERIAL BODY.',es:'OFRECER UN ALIMENTO NO FUNCIONAL PARA UN CUERPO INMATERIAL.'};
const openingDescription={
  pt:'Experiências artísticas, filosóficas e culturais desenvolvidas através da criação gastronômica.',
  en:'Artistic, philosophical and cultural experiences developed through gastronomic creation.',
  es:'Experiencias artísticas, filosóficas y culturales desarrolladas a través de la creación gastronómica.',
};
const originalEditorialLabels=new WeakMap();
const splitTitleMarkup={
  pt:'<span class="chapter5-univers-line">COMO</span><span class="chapter5-perpetua-line">TRABALHAMOS</span>',
  en:'<span class="chapter5-univers-line">HOW WE</span><span class="chapter5-perpetua-line">WORK</span>',
  es:'<span class="chapter5-univers-line">CÓMO</span><span class="chapter5-perpetua-line">TRABAJAMOS</span>',
};
const performanceMarkup={
  pt:'<span>2. PERFORMANCES</span><span>ARTÍSTICAS</span>',
  en:'<span>2. PERFORMANCE</span><span>ART</span>',
  es:'<span>2. PERFORMANCES</span><span>ARTÍSTICAS</span>',
};

export function getLanguage(){
  try{const value=localStorage.getItem(KEY);if(SUPPORTED.has(value))return value}catch{}
  return 'pt';
}

async function loadCatalog(language){
  if(language==='pt')return null;
  const response=await fetch(`/i18n/${language}.json`,{cache:'force-cache'});
  if(!response.ok)throw new Error(`Missing ${language} translation catalog`);
  return response.json();
}

export async function setLanguage(language){
  if(!SUPPORTED.has(language)||language===activeLanguage)return;
  const token=++switchToken;
  try{
    const nextCatalog=await loadCatalog(language);
    if(token!==switchToken)return;
    catalog=nextCatalog;activeLanguage=language;
    try{localStorage.setItem(KEY,language)}catch{}
    document.documentElement.lang=language==='pt'?'pt-BR':language;
    translateTree(document.body);translateTree(document.head);
    localizeSpecialContent(language);
    overlaySwitch?.setAttribute('aria-label',language==='en'?'Language':'Idioma');
    for(const button of overlaySwitch?.querySelectorAll('button')||[]){button.setAttribute('aria-pressed',String(button.lang===language));button.setAttribute('aria-label',`${overlaySwitch.getAttribute('aria-label')}: ${button.lang.toUpperCase()}`)}
    window.dispatchEvent(new CustomEvent('mattar:language-changed',{detail:{language}}));
  }catch(error){console.error('LABMATTAR language catalog:',error)}
}

const normalize=text=>text.trim().replace(/\s+/g,' ');

export function translateText(text){
  if(!catalog||!text)return text;
  return catalog[normalize(text)]||text;
}

function translateTextNode(node){
  if(!node?.nodeValue||node.parentElement?.closest('script,style,noscript,svg,code,pre,[contenteditable]'))return;
  const heading=node.parentElement?.closest('h1,h2,h3,h4,[data-project-title]');
  if(heading&&WORK_TITLES.has(normalize(heading.textContent).toUpperCase().replace(/[^\p{L}\p{N}]/gu,'')))return;
  const current=node.nodeValue,normalized=normalize(current);
  let source=originalText.get(node);
  if(!source||normalized!==renderedText.get(node)){
    source=normalized;originalText.set(node,source);
  }
  const translated=catalog?.[source]||source;
  renderedText.set(node,translated);
  if(translated===normalized)return;
  const start=current.match(/^\s*/)?.[0]||'',end=current.match(/\s*$/)?.[0]||'';
  node.nodeValue=start+translated+end;
}

function translateAttributes(element){
  if(element.nodeType!==1)return;
  let state=originalAttributes.get(element);
  if(!state){state={};originalAttributes.set(element,state)}
  for(const name of ['alt','aria-label','title','placeholder']){
    const value=element.getAttribute(name);if(!value)continue;
    let entry=state[name];
    if(!entry||value!==entry.rendered){entry={source:normalize(value),rendered:value};state[name]=entry}
    const translated=catalog?.[entry.source]||entry.source;
    entry.rendered=translated;
    if(translated!==value)element.setAttribute(name,translated);
  }
}

function translateTree(root){
  if(!root)return;
  if(root.nodeType===3){translateTextNode(root);return}
  if(root.nodeType!==1&&root.nodeType!==9)return;
  if(root.nodeType===1){if(root.matches('script,style,noscript,svg,code,pre,[contenteditable]'))return;translateAttributes(root)}
  const elements=root.querySelectorAll?.('[alt],[aria-label],[title],[placeholder]')||[];
  for(const element of elements)translateAttributes(element);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode()))translateTextNode(node);
}

function localizeSpecialContent(language){
  const workTitle=document.querySelector('.chapter5-copy h1');
  if(workTitle&&workTitle.dataset.lmLanguage!==language){
    if(language!=='pt'||workTitle.dataset.lmLanguage)workTitle.innerHTML=splitTitleMarkup[language];
    workTitle.dataset.lmLanguage=language;
    if(language!=='pt'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)workTitle.animate([{opacity:.15,filter:'blur(8px)'},{opacity:1,filter:'blur(0)'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  const performanceTitle=document.querySelector('.field-fixed-title--performance');
  if(performanceTitle&&performanceTitle.dataset.lmLanguage!==language){
    if(language!=='pt'||performanceTitle.dataset.lmLanguage)performanceTitle.innerHTML=performanceMarkup[language];
    performanceTitle.dataset.lmLanguage=language;
  }
  const monument=document.querySelector('#gastro-title .gastro-monument');
  if(monument)monument.setAttribute('aria-label','Gastroperformance');
  const heading=document.querySelector('#abertura h1');
  if(heading&&heading.dataset.lmLanguage!==language){
    if(language!=='pt'||heading.dataset.lmLanguage)heading.innerHTML=openingMarkup[language];
    heading.dataset.lmLanguage=language;
    if(language!=='pt'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      heading.animate([{opacity:.15,transform:'translateY(12px)',filter:'blur(8px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0)'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }
  const openingParagraph=document.querySelector('#abertura .opening-block p');
  if(openingParagraph&&openingParagraph.dataset.lmLanguage!==language){
    if(language!=='pt'||openingParagraph.dataset.lmLanguage)openingParagraph.textContent=openingDescription[language];
    openingParagraph.dataset.lmLanguage=language;
  }
  for(const block of document.querySelectorAll('.opening-block,.editorial-block')){
    if(!originalEditorialLabels.has(block))originalEditorialLabels.set(block,block.getAttribute('aria-label'));
    if(block.classList.contains('opening-block')){
      block.setAttribute('aria-label',openingLabel[language]+' '+openingDescription[language]);
    }else if(language==='pt'){
      const original=originalEditorialLabels.get(block);if(original)block.setAttribute('aria-label',original);
    }else block.setAttribute('aria-label',normalize(block.textContent));
  }
}

function updateOverlaySwitch(){
  overlayFrame=0;
  if(overlaySwitch)overlaySwitch.hidden=!document.querySelector('.chapter2-lightbox,[class*="presentation"][role="dialog"]');
}

function makeOverlaySwitch(language){
  if(overlaySwitch)return;
  if(!document.querySelector('link[href="/assets/i18n.css"]')){
    const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/i18n.css';document.head.append(style);
  }
  overlaySwitch=document.createElement('nav');overlaySwitch.className='lm-overlay-languages';overlaySwitch.setAttribute('aria-label',language==='en'?'Language':language==='es'?'Idioma':'Idioma');overlaySwitch.hidden=true;
  for(const code of ['pt','en','es']){
    const button=document.createElement('button');button.type='button';button.lang=code;button.textContent=code.toUpperCase();button.setAttribute('aria-label',`${overlaySwitch.getAttribute('aria-label')}: ${code.toUpperCase()}`);button.setAttribute('aria-pressed',String(language===code));button.addEventListener('click',()=>setLanguage(code));overlaySwitch.append(button);
  }
  document.body.append(overlaySwitch);updateOverlaySwitch();
}

function observeContent(){
  observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData')translateTextNode(record.target);
      else if(record.type==='attributes')translateAttributes(record.target);
      else for(const node of record.addedNodes)translateTree(node);
    }
    if(!overlayFrame)overlayFrame=requestAnimationFrame(()=>{updateOverlaySwitch();if(document.querySelector('#abertura h1:not([data-lm-language]),.chapter5-copy h1:not([data-lm-language]),.field-fixed-title--performance:not([data-lm-language])'))localizeSpecialContent(activeLanguage)});
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['alt','aria-label','title','placeholder']});
  observer.observe(document.head,{subtree:true,childList:true,characterData:true});
}

export function startI18n(){
  if(ready)return ready;
  const language=activeLanguage;document.documentElement.lang=language==='pt'?'pt-BR':language;
  makeOverlaySwitch(language);
  observeContent();
  const token=++switchToken;
  ready=loadCatalog(language).then(data=>{
    if(token!==switchToken)return;
    catalog=data;translateTree(document.body);translateTree(document.head);localizeSpecialContent(language);
  });
  return ready;
}
