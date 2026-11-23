/* One navigation owner for React chapters and independent presentations. */
import {projectGroups,chapterTopics} from './navigation-data.js';
import {getLanguage,setLanguage,startI18n} from './i18n.js';
const chapters=[['/','GASTROPERFORMANCE'],['/capitulo-2','PORTFÓLIO'],['/capitulo-3','COMO TRABALHAMOS'],['/capitulo-4','APRESENTAÇÃO'],['/capitulo-5','CONTATO']];
const interfaceCopy={
  pt:{title:['COMO ','NAVEGAR'],scroll:'Role para percorrer a página',menu:'Acesse os cinco capítulos',summary:'Explore o conteúdo do capítulo',understood:'ENTENDI',menuLabel:'MENU',summaryLabel:'SUMÁRIO',languageLabel:'Idioma'},
  en:{title:['HOW TO ','NAVIGATE'],scroll:'Scroll to move through the page',menu:'Explore the five chapters',summary:'Explore this chapter’s contents',understood:'GOT IT',menuLabel:'MENU',summaryLabel:'CONTENTS',languageLabel:'Language'},
  es:{title:['CÓMO ','NAVEGAR'],scroll:'Desplázate para recorrer la página',menu:'Accede a los cinco capítulos',summary:'Explora el contenido del capítulo',understood:'ENTENDIDO',menuLabel:'MENÚ',summaryLabel:'ÍNDICE',languageLabel:'Idioma'}
};
const chapterLabels={pt:chapters.map(x=>x[1]),en:['GASTROPERFORMANCE','PORTFOLIO','HOW WE WORK','PRESENTATION','CONTACT'],es:['GASTROPERFORMANCE','PORTAFOLIO','CÓMO TRABAJAMOS','PRESENTACIÓN','CONTACTO']};
let owner=null;
const element=(tag,attrs={},text)=>{const node=document.createElement(tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node};
export function mountNavigation(config={}){
  owner?.destroy();
  if(!document.querySelector('link[href="/assets/navigation-shared.css"]'))document.head.append(element('link',{rel:'stylesheet',href:'/assets/navigation-shared.css','data-navigation-css':'shared'}));
  const abort=new AbortController(),options={signal:abort.signal};
  const chapter=config.currentChapter||Number(location.pathname.match(/capitulo-(\d)/)?.[1]||1);
  const language=getLanguage(),copy=interfaceCopy[language];
  const root=element('div',{class:'lm-nav','data-navigation':'shared','data-chapter':chapter});
  const home=element('a',{class:'lm-home',href:'/', 'aria-label':'Mattar — Capítulo 1'});home.append(element('img',{src:'/assets/mattar.svg',alt:'Mattar'}));root.append(home);
  const makeToggle=(kind,src,label)=>{const b=element('button',{class:`lm-toggle lm-${kind}-toggle`,type:'button','aria-label':label,'aria-expanded':'false','aria-controls':`lm-${kind}`});b.append(element('img',{src,alt:''}),element('span',{class:'lm-label'},label));root.append(b);return b};
  const menuButton=makeToggle('menu','/assets/vaso.svg',copy.menuLabel),summaryButton=makeToggle('summary','/assets/m.svg',copy.summaryLabel);
  root.append(element('span',{class:'lm-year','aria-label':'Ano 2026'},'2026'));
  const makePanel=(kind,label)=>{const p=element('nav',{class:`lm-panel lm-${kind}`,id:`lm-${kind}`,'aria-label':label,'data-open':'false'});p.inert=true;const list=element('div',{class:'lm-list'});p.append(list);root.append(p);return[p,list]};
  const [menu,menuList]=makePanel('menu','Capítulos'),[summary,summaryList]=makePanel('summary','Sumário local');
  chapters.forEach(([href],i)=>{const a=element('a',{href});if(i+1===chapter)a.setAttribute('aria-current','page');a.append(element('span',{class:'lm-number'},i+1),element('span',{class:'lm-name'},chapterLabels[language][i]));menuList.append(a)});
  const languageSwitch=className=>{
    const switcher=element('div',{class:`lm-language-switch ${className}`,'aria-label':copy.languageLabel});
    for(const code of ['pt','en','es']){
      const button=element('button',{type:'button',lang:code,'aria-label':`${copy.languageLabel}: ${code.toUpperCase()}`,'aria-pressed':String(language===code)},code.toUpperCase());
      button.addEventListener('click',()=>setLanguage(code),options);switcher.append(button);
    }
    return switcher;
  };
  menu.append(languageSwitch('lm-menu-languages'));
  const guideKey='mattar-navigation-guide-seen';
  let guideSeen=false;
  try{guideSeen=sessionStorage.getItem(guideKey)==='1'}catch{}
  let guide=null;
  const dismissGuide=()=>{
    if(!guide)return;
    try{sessionStorage.setItem(guideKey,'1')}catch{}
    guide.remove();guide=null;
    document.documentElement.classList.remove('lm-guide-open');
    window.dispatchEvent(new CustomEvent('mattar:guide-dismissed'));
  };
  if(!guideSeen){
    guide=element('aside',{class:'lm-guide navigation-guide','aria-label':'Guia de navegação'});
    const content=element('div',{class:'lm-guide-content'});
    const title=element('h2',{class:'lm-guide-title'});
    title.append(element('span',{},copy.title[0]),element('span',{class:'lm-guide-title-accent'},copy.title[1]));
    content.append(title);
    const items=element('div',{class:'lm-guide-items'});
    for(const [symbol,instruction] of [['↓',copy.scroll],[copy.menuLabel,copy.menu],[copy.summaryLabel,copy.summary]]){
      const item=element('p');item.append(element('b',{},symbol),element('span',{},instruction));items.append(item);
    }
    const understood=element('button',{type:'button',class:'lm-guide-dismiss'},copy.understood);
    understood.addEventListener('click',dismissGuide,options);
    content.append(items,languageSwitch('lm-guide-languages'),understood);guide.append(content);root.append(guide);
    for(const type of ['wheel','touchmove'])guide.addEventListener(type,event=>event.preventDefault(),{...options,passive:false});
    document.documentElement.classList.add('lm-guide-open');
    requestAnimationFrame(()=>{if(guide?.isConnected)understood.focus({preventScroll:true})});
  }
  document.body.append(root);
  startI18n().catch(error=>console.error('LABMATTAR language catalog:',error));
  window.addEventListener('mattar:language-changed',event=>{
    const next=event.detail?.language;if(!interfaceCopy[next])return;
    const labels=interfaceCopy[next];
    menuButton.querySelector('.lm-label').textContent=labels.menuLabel;menuButton.setAttribute('aria-label',labels.menuLabel);
    summaryButton.querySelector('.lm-label').textContent=labels.summaryLabel;summaryButton.setAttribute('aria-label',labels.summaryLabel);
    [...menuList.children].forEach((link,index)=>{link.querySelector('.lm-name').textContent=chapterLabels[next][index]});
    if(guide){
      const title=guide.querySelectorAll('.lm-guide-title span');title[0].textContent=labels.title[0];title[1].textContent=labels.title[1];
      const items=guide.querySelectorAll('.lm-guide-items p');
      for(const [index,value] of [labels.scroll,labels.menu,labels.summary].entries())items[index].querySelector('span').textContent=value;
      items[1].querySelector('b').textContent=labels.menuLabel;items[2].querySelector('b').textContent=labels.summaryLabel;
      guide.querySelector('.lm-guide-dismiss').textContent=labels.understood;
    }
    for(const button of root.querySelectorAll('.lm-language-switch button')){button.setAttribute('aria-pressed',String(button.lang===next));button.setAttribute('aria-label',`${labels.languageLabel}: ${button.lang.toUpperCase()}`)}
  },options);
  let opened=null,frame=0,jumpTimer=0,destroyed=false,jumping=false,pinnedId=null,entries=[],signature='';
  const setOpen=(next,restoreFocus=false)=>{const previous=opened;opened=next;for(const [kind,p,b] of [['menu',menu,menuButton],['summary',summary,summaryButton]]){const open=kind===next;p.dataset.open=String(open);p.inert=!open;b.setAttribute('aria-expanded',String(open))}if(restoreFocus&&previous)(previous==='menu'?menuButton:summaryButton).focus()};
  menuButton.addEventListener('click',()=>{dismissGuide();setOpen(opened==='menu'?null:'menu')},options);summaryButton.addEventListener('click',()=>{dismissGuide();refresh();setOpen(opened==='summary'?null:'summary')},options);
  document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))setOpen(null)},options);
  const validEntries=()=>{
    const sectionNodes=[...document.querySelectorAll('.section[id],.story-panel[id]')];
    // Presentation metadata belongs to its real slides, never another presentation.
    if(chapter===4&&location.pathname.replace(/\/$/,'')!=='/capitulo-4'){
      const mappedTitle=id=>id==='inicio'&&location.pathname.includes('/sesc')?'ABERTURA':id==='inicio'&&location.pathname.includes('/bradesco')?'APRESENTAÇÃO':config.presentationLinks?.find(([href])=>decodeURIComponent(href.split('#')[1]||'')===id)?.[1]||(location.pathname.includes('/sesc')?chapterTopics[4].items.find(([key])=>key===id)?.[1]:null);
      return sectionNodes.map(node=>({id:node.id,label:mappedTitle(node.id)||node.dataset.navTitle||node.dataset.title||node.querySelector('h1[aria-label],h2[aria-label],h3[aria-label]')?.getAttribute('aria-label')||node.querySelector('h1,h2,h3')?.textContent.trim()})).filter(x=>x.label);
    }
    if(chapter===2)return projectGroups.flatMap(g=>[{id:g.id,label:g.title,group:true},...g.projects.map(([id,label])=>({id,label}))]).concat({id:'como-trabalhamos',label:'COMO TRABALHAMOS'}).filter(x=>document.getElementById(x.id));
    if(chapter===4&&config.presentationLinks)return config.presentationLinks.map(([href,label])=>({href,label,id:href.includes('#')?decodeURIComponent(href.split('#')[1]):''}));
    return (chapterTopics[chapter]?.items||[]).map(([id,label])=>({id,label})).filter(x=>document.getElementById(x.id));
  };
  const refresh=()=>{const next=validEntries(),key=JSON.stringify(next);if(key!==signature){signature=key;entries=next;summaryList.replaceChildren(...entries.map(x=>element('a',{href:x.href||`#${x.id}`,...(x.group?{'data-group':'true'}:{})},x.label)))}updateActive()};
  const updateActive=()=>{frame=0;if(destroyed||jumping)return;const rgb=getComputedStyle(root).color.match(/\d+(?:\.\d+)?/g);root.dataset.ink=rgb&&rgb.slice(0,3).reduce((sum,x)=>sum+Number(x),0)/3<128?'dark':'light';const guide=innerHeight*.48;let chosen=null,best=Infinity;entries.forEach(x=>{const n=document.getElementById(x.id);if(!n)return;const r=n.getBoundingClientRect();const distance=r.top<=guide&&r.bottom>guide?0:Math.min(Math.abs(r.top-guide),Math.abs(r.bottom-guide));if(distance<best){best=distance;chosen=x.id}});if(scrollY+innerHeight>=document.documentElement.scrollHeight-8){const last=[...entries].reverse().find(x=>{const r=document.getElementById(x.id)?.getBoundingClientRect();return r&&r.top<innerHeight&&r.bottom>0});if(last)chosen=last.id};const requested=pinnedId||decodeURIComponent(location.hash.slice(1));if(requested){const r=document.getElementById(requested)?.getBoundingClientRect();if(r&&r.top<innerHeight&&r.bottom>0)chosen=requested;else pinnedId=null}[...summaryList.children].forEach((a,i)=>{const active=entries[i].id?entries[i].id===chosen:new URL(a.href).pathname.replace(/\/$/,'')===location.pathname.replace(/\/$/,'');if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(updateActive)};
  const navigate=(id,historyMode='push')=>{
    const target=document.getElementById(id);if(!target)return false;
    setOpen(null);clearTimeout(jumpTimer);
    if(historyMode)history[historyMode+'State'](null,'','#'+encodeURIComponent(id));
    [...summaryList.children].forEach((a,i)=>{if(entries[i]?.id===id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let range=Math.max(0,target.offsetHeight-innerHeight),progress=Number(target.dataset.directProgress??(chapter===4?0:.36));
    let top=scrollY+target.getBoundingClientRect().top+range*progress;
    const portfolio=chapter===2;
    if(portfolio){top=target.offsetTop;document.documentElement.dataset.directProjectJump='true'}
    jumping=true;pinnedId=id;
    const finish=()=>{jumping=false;if(portfolio){window.dispatchEvent(new CustomEvent('mattar:direct-project',{detail:{id,slug:target.dataset.projectSlug}}));delete document.documentElement.dataset.directProjectJump}updateActive()};
    // Keep the portfolio's pinned stage adapter. The smooth travel moves its real document.
    scrollTo({top,behavior:reduced?'instant':'smooth'});
    let last=scrollY,stable=0,start=performance.now();
    const settled=()=>{if(destroyed)return;stable=Math.abs(scrollY-last)<.5?stable+1:0;last=scrollY;if((stable>=4&&performance.now()-start>120)||performance.now()-start>2200){finish();return}jumpTimer=setTimeout(settled,40)};
    jumpTimer=setTimeout(settled,40);return true;
  };
  root.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const u=new URL(a.href);if(u.origin===location.origin&&u.pathname.replace(/\/$/,'')===location.pathname.replace(/\/$/,'')&&u.hash){if(navigate(decodeURIComponent(u.hash.slice(1))))e.preventDefault()}setOpen(null)},options);
  // List gestures must not reach the portfolio's wheel/keyboard project controller.
  for(const type of ['wheel','touchmove'])root.addEventListener(type,event=>event.stopPropagation(),{...options,passive:true});
  root.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp','Home','End',' '].includes(event.key))return;
    event.stopPropagation();
    const list=event.target.closest('.lm-list');if(!list)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const links=[...list.querySelectorAll('a')],at=links.indexOf(event.target);links[Math.max(0,Math.min(links.length-1,at+(event.key==='ArrowDown'?1:-1)))]?.focus()}
    else if(['PageDown','PageUp','Home','End',' '].includes(event.key)){event.preventDefault();list.scrollTop=event.key==='Home'?0:event.key==='End'?list.scrollHeight:list.scrollTop+(event.key==='PageUp'?-1:1)*list.clientHeight}
  },options);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(guide){dismissGuide();return}setOpen(null,true);return}if(guide&&['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','PageDown','PageUp','Home','End',' '].includes(e.key)){e.preventDefault();return}if(opened||root.contains(e.target)||document.querySelector('[role="dialog"]')||e.target.matches('input,textarea,select,[contenteditable=true]'))return;if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)||(chapter===2&&['ArrowDown','ArrowUp'].includes(e.key)))return;const panels=[...document.querySelectorAll('.story-panel[id]')];if(!panels.length)return;if(document.documentElement.dataset.chapter2TransitionActive==='true'){e.preventDefault();return}const guideLine=innerHeight/2;const at=panels.reduce((best,n,i)=>Math.abs(n.getBoundingClientRect().top+Math.min(n.offsetHeight,innerHeight)/2-guideLine)<Math.abs(panels[best].getBoundingClientRect().top+Math.min(panels[best].offsetHeight,innerHeight)/2-guideLine)?i:best,0);const next=Math.max(0,Math.min(panels.length-1,at+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)));if(at!==next){e.preventDefault();navigate(panels[next].id)}},options);
  window.addEventListener('scroll',schedule,{...options,passive:true});window.addEventListener('resize',schedule,options);
  window.addEventListener('wheel',()=>{pinnedId=null;schedule()},{...options,passive:true});
  window.addEventListener('touchstart',()=>{pinnedId=null;schedule()},{...options,passive:true});
  window.addEventListener('popstate',()=>{setOpen(null);if(location.hash)navigate(decodeURIComponent(location.hash.slice(1)),null);else schedule()},options);
  window.addEventListener('hashchange',schedule,options);
  // One coalesced observer only for section additions; ignores title animations and nav updates.
  const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!root.contains(n)&&(n.matches?.('.story-panel,.section')||n.querySelector?.('.story-panel,.section')))))refresh()});
  observer.observe(document.querySelector('main,.site-shell')||document.body,{childList:true,subtree:true});
  refresh();
  const api={navigate,update(next){config=next;refresh()},destroy(){if(destroyed)return;destroyed=true;abort.abort();observer.disconnect();cancelAnimationFrame(frame);clearTimeout(jumpTimer);if(jumping)delete document.documentElement.dataset.directProjectJump;document.documentElement.classList.remove('lm-guide-open');root.remove();if(owner===api)owner=null}};owner=api;
  if(guideSeen)window.dispatchEvent(new CustomEvent('mattar:guide-dismissed'));
  return api;
}
