import { findModel } from '/mesa-editor/modelos-data.mjs';
import { libraryList } from '/lab-project-library.mjs';
import { assetURL } from '/mesa-editor/acervo-reference.mjs';

const get = id => document.getElementById(id);
const workspaces = get('mesa-workspaces');
const screens = { inicio:get('mesa-inicio'), site:get('mesa-site'), portfolio:get('mesa-portfolio') };
const tools = {
  acervo:{src:'/mesa-editor/acervo.html',title:'Acervo de modelos'},
  obra:{src:'/mesa-editor/portfolio.html',title:'Editor do Portfólio',style:'aleteia'},
  montar:{src:'/montar.html?modelo=aleteia&mesa=1#laboratorio',title:'Laboratório de Composição',style:'apresentacao'},
  capitulo:{src:'/mesa-editor/chapter.html',title:'Editor de Como trabalhamos'},
};
const frames = new Map();
let compositionReady = false, portfolioReady = false;
let pendingImage, pendingModel, pendingCreation, pendingPortfolio;
let portfolioProjects = [], catalogLoad;
const projectSearch = get('mesa-project-search');

function route() {
  const [place,arg,id] = location.hash.slice(1).split('/');
  switch (place) {
    case 'acervo': return {area:'acervo',screen:'acervo'};
    case 'montar': return {area:'montar',screen:'montar',action:arg==='nova' ? {type:'mesa:new-composition'} :
      arg==='rascunho' && /^project-[a-z0-9-]+$/i.test(id) ? {type:'mesa:open-draft',id} : undefined};
    case 'criacao':
    case 'criacoes':
    case 'apresentacao': return {area:'montar',screen:'montar'};
    case 'aleteia': return {area:'portfolio',screen:'obra',action:{id:'aleteia'}};
    case 'obras':
    case 'portfolio': return /^[a-z0-9][a-z0-9-]{0,110}$/.test(arg||'') ?
      {area:'portfolio',screen:'obra',action:arg==='nova' ? {create:true} : {id:arg}} :
      {area:'portfolio',screen:'portfolio'};
    case 'como-trabalhamos': return {area:'site',screen:'capitulo'};
    case 'site': return {area:'site',screen:arg==='como-trabalhamos'?'capitulo':'site'};
    default: return {area:'inicio',screen:'inicio'};
  }
}

function styleTool(frame,screen) {
  const tool = tools[screen];
  const doc = frame.contentDocument;
  if (!tool.style || !doc?.body || new URL(doc.URL).origin !== location.origin || doc.body.dataset.mesaTool) return;
  doc.body.dataset.mesaTool = tool.style;
  const sheet = doc.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = '/mesa-unificada/mesa-tools.css';
  doc.head.append(sheet);
}

function frameFor(screen) {
  if (frames.has(screen)) return frames.get(screen);
  const frame = document.createElement('iframe');
  frame.title = tools[screen].title;
  frame.src = tools[screen].src;
  frame.allow = 'fullscreen';
  frame.addEventListener('load', () => styleTool(frame,screen));
  frames.set(screen,frame);
  workspaces.append(frame);
  return frame;
}

async function showLatestDraft() {
  try {
    const records = await libraryList();
    const latest = records.filter(record => /^project-[a-z0-9-]+$/i.test(record.id)).sort((a,b) => b.updatedAt-a.updatedAt)[0];
    if (!latest) return;
    get('resume-project-name').textContent = latest.name;
    get('resume-project-meta').textContent = 'Montar · Rascunho neste navegador';
    get('resume-montar').href = '#montar/rascunho/'+latest.id;
  } catch {}
}

function node(tag,text,className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function portfolioRow(project) {
  const row = node('article','','portfolio-row');
  const cover = project.slides.find(slide => slide.file===project.cover);
  let preview = node('span','','portfolio-cover');
  if (cover?.type==='image') {
    try {
      const src = cover.asset_key ? assetURL(cover.asset_key) :
        '/mesa-media/'+[project.folder,...(cover.thumbnail || cover.display_file || cover.file).split('/')].map(encodeURIComponent).join('/');
      preview = node('img','','portfolio-cover');
      preview.src = src;
      preview.alt = '';
      preview.loading = 'lazy';
    } catch {}
  }
  const details = node('div');
  details.append(node('strong',project.title),node('small',[project.category,project.year].filter(Boolean).join(' · ')));
  const edit = node('a','Editar obra','index-action');
  edit.href = '#portfolio/'+project.id;
  edit.setAttribute('aria-label','Editar '+project.title);
  row.append(preview,details,node('span',project.active===false?'Oculta na prévia':'Visível na prévia','index-state'),edit);
  return row;
}

function drawCatalog() {
  const term = projectSearch.value.trim().toLocaleLowerCase('pt-BR');
  const list = portfolioProjects.filter(project => [project.title,project.category].some(value=>value.toLocaleLowerCase('pt-BR').includes(term)));
  get('mesa-projects').replaceChildren(...list.map(portfolioRow));
  get('mesa-portfolio-status').textContent = list.length ? list.length+(list.length===1?' obra':' obras') : 'Nenhuma obra encontrada.';
}

function loadCatalog() {
  if (catalogLoad) return;
  get('mesa-portfolio-status').textContent = 'Abrindo obras…';
  catalogLoad = fetch('/mesa-api/portfolio/state').then(async response=>{
    if (!response.ok) throw Error();
    portfolioProjects = (await response.json()).state.projects;
    drawCatalog();
  }).catch(()=>{ get('mesa-portfolio-status').textContent = 'Não foi possível abrir as obras. Recarregue a página.'; })
    .finally(()=>{ catalogLoad = undefined; });
}
projectSearch.addEventListener('input',drawCatalog);

function post(screen,data) {
  frames.get(screen)?.contentWindow.postMessage(data,location.origin);
}

function forwardPortfolio() {
  if (!portfolioReady || !pendingPortfolio) return;
  post('obra',{type:'mesa:select-portfolio',...pendingPortfolio});
  pendingPortfolio = undefined;
}

function forwardCreation() {
  if (!compositionReady || !pendingCreation) return;
  post('montar',pendingCreation);
  if (pendingCreation.type==='mesa:new-composition' && location.hash==='#montar/nova') history.replaceState(null,'','#montar');
  pendingCreation = undefined;
}

function setContext(screen) {
  const back = get('mesa-back'), detail = get('mesa-detailbar');
  detail.hidden = screen!=='obra' && screen!=='capitulo';
  if (detail.hidden) return;
  const portfolio = screen==='obra';
  back.href = portfolio?'#portfolio':'#site';
  back.textContent = portfolio?'← Obras do Portfólio':'← Capítulos do site';
  get('mesa-destination').textContent = portfolio?'Ficha e galeria':'Capítulo 03';
}

function render() {
  const {area,screen,action} = route();
  if (tools[screen]) {
    frameFor(screen);
    document.body.dataset.workspace = screen;
  } else delete document.body.dataset.workspace;
  for (const [name,section] of Object.entries(screens)) section.hidden = name!==screen;
  for (const [name,frame] of frames) frame.hidden = name!==screen;
  for (const link of document.querySelectorAll('.mesa-nav a')) {
    if (link.hash==='#'+area) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  setContext(screen);
  document.title = (tools[screen]?.title || ({site:'Capítulos do site',portfolio:'Obras do Portfólio'})[screen] || 'Mesa Unificada')+' · LABMATTAR';
  window.scrollTo(0,0);
  pendingPortfolio = screen==='obra' ? action : undefined;
  pendingCreation = screen==='montar' ? action : undefined;
  forwardPortfolio();
  forwardCreation();
  if (screen==='inicio') showLatestDraft();
  if (screen==='portfolio') loadCatalog();
}

function forwardImage() {
  if (!pendingImage || !compositionReady) return;
  post('montar',pendingImage);
  pendingImage = null;
}

function finishModel(error) {
  if (!pendingModel) return;
  const {request,timer} = pendingModel;
  pendingModel = undefined;
  clearTimeout(timer);
  post('acervo',{type:'mesa:model-result',request,error});
  if (error && route().screen==='montar') location.hash = 'acervo';
}

function forwardModel() {
  if (!pendingModel || !compositionReady || pendingModel.sent) return;
  const {id,name,request} = pendingModel;
  clearTimeout(pendingModel.timer);
  pendingModel.sent = true;
  post('montar',{type:'mesa:create-from-model',id,name,request});
}

window.addEventListener('message',event=>{
  if (event.origin!==location.origin) return;
  const data = event.data;
  if (event.source===frames.get('acervo')?.contentWindow && data?.type==='mesa:create-from-model') {
    const {id,name,request} = data;
    if (pendingModel || !findModel(id) || typeof name!=='string' || !name.trim() || name.length>120 || typeof request!=='string') return;
    pendingModel = {id,name:name.trim(),request,timer:setTimeout(()=>finishModel('Montar demorou para abrir. Tente novamente.'),45_000)};
    location.hash = 'montar';
    forwardModel();
  }
  if (event.source===frames.get('obra')?.contentWindow) {
    if (data?.type==='mesa:portfolio-ready') {
      portfolioReady = true;
      forwardPortfolio();
    }
    if (data?.type==='mesa:portfolio-opened' && route().screen==='obra' && /^[a-z0-9][a-z0-9-]{0,110}$/.test(data.id)) {
      history.replaceState(null,'','#portfolio/'+data.id);
    }
    if (data?.type==='mesa:compose-image' && typeof data.url==='string' && data.url.startsWith('/mesa-media/')) {
      pendingImage = data;
      location.hash = 'montar';
      forwardImage();
    }
  }
  if (event.source===frames.get('montar')?.contentWindow) {
    if (data?.type==='mesa:composition-ready') {
      compositionReady = true;
      forwardImage();
      forwardModel();
      forwardCreation();
    }
    if (data?.type==='mesa:open-models') location.hash = 'acervo';
    if (data?.type==='mesa:model-result' && pendingModel?.request===data.request) finishModel(data.error);
  }
});

window.addEventListener('hashchange',render);
const top = document.querySelector('.mesa-top');
new ResizeObserver(()=>document.documentElement.style.setProperty('--mesa-top-height',top.offsetHeight+'px')).observe(top);
render();
