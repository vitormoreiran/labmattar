import { findModel } from '/mesa-editor/modelos-data.mjs';

const home = document.querySelector('#mesa-inicio');
const workspaces = document.querySelector('#mesa-workspaces');
const views = {
  acervo: { src: '/mesa-editor/acervo.html', title: 'Acervo de modelos' },
  aleteia: { src: '/mesa-editor/portfolio.html', title: 'Editor do Portfólio', tool: 'Editor do Portfólio' },
  apresentacao: { src: '/montar.html?modelo=aleteia&mesa=1#laboratorio', title: 'Laboratório de Composição', tool: 'Páginas e apresentações' },
  'como-trabalhamos': { src: '/mesa-editor/chapter.html', title: 'Editor de Como trabalhamos' },
};
const frames = new Map();
let compositionReady = false;
let pendingImage;
let pendingModel;

function styleTool(frame, view) {
  const tool = views[view].tool;
  if (!tool || !frame.contentDocument?.body) return;
  const doc = frame.contentDocument;
  if (new URL(doc.URL).origin !== location.origin || doc.body.dataset.mesaTool) return;
  const header = doc.querySelector('body > header .brand');
  if (header) {
    const label = doc.createElement('span');
    label.textContent = tool;
    header.replaceChildren(label);
  }
  if (view === 'apresentacao') {
    doc.getElementById('import').textContent = 'Abrir arquivo';
    doc.getElementById('save').textContent = 'Baixar projeto';
    doc.getElementById('configure').textContent = 'Editar no Compor';
  }
  doc.body.dataset.mesaTool = view;
  const sheet = doc.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = '/mesa-unificada/mesa-tools.css';
  doc.head.append(sheet);
}

function frameFor(view) {
  if (frames.has(view)) return frames.get(view);
  const frame = document.createElement('iframe');
  frame.title = views[view].title;
  frame.src = views[view].src;
  frame.allow = 'fullscreen';
  frame.addEventListener('load', () => styleTool(frame, view));
  frames.set(view, frame);
  workspaces.append(frame);
  return frame;
}

function render() {
  const hash = location.hash.slice(1).split('/')[0];
  const aliases = { obras: 'aleteia', criacoes: 'apresentacao', site: 'como-trabalhamos' };
  const view = Object.hasOwn(aliases, hash) ? aliases[hash] : Object.hasOwn(views, hash) ? hash : 'inicio';
  if (view !== 'inicio') frameFor(view);
  if (view === 'inicio') delete document.body.dataset.workspace;
  else document.body.dataset.workspace = view;
  for (const [key, frame] of frames) frame.hidden = key !== view;
  home.hidden = view !== 'inicio';
  for (const link of document.querySelectorAll('.mesa-nav a')) {
    if (link.hash === '#' + view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.title = view === 'inicio' ? 'Mesa Unificada · LABMATTAR' : views[view].title + ' · Mesa Unificada';
  window.scrollTo(0, 0);
}

function forwardImage() {
  if (!pendingImage || !compositionReady) return;
  frames.get('apresentacao').contentWindow.postMessage(pendingImage, location.origin);
  pendingImage = null;
}

function finishModel(error) {
  if (!pendingModel) return;
  const { request, timer } = pendingModel;
  pendingModel = undefined;
  clearTimeout(timer);
  frames.get('acervo')?.contentWindow.postMessage({type:'mesa:model-result',request,error},location.origin);
  if (error && location.hash === '#apresentacao') location.hash = 'acervo';
}

function forwardModel() {
  if (!pendingModel || !compositionReady || pendingModel.sent) return;
  const { id, name, request } = pendingModel;
  clearTimeout(pendingModel.timer);
  pendingModel.sent = true;
  frames.get('apresentacao').contentWindow.postMessage({type:'mesa:create-from-model',id,name,request},location.origin);
}

window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.source === frames.get('acervo')?.contentWindow && event.data?.type === 'mesa:create-from-model') {
    const { id, name, request } = event.data;
    if (pendingModel || !findModel(id) || typeof name !== 'string' || !name.trim() || name.length > 120 || typeof request !== 'string') return;
    pendingModel = {id,name:name.trim(),request,timer:setTimeout(()=>finishModel('Montar demorou para abrir. Tente novamente.'),45_000)};
    location.hash = 'apresentacao';
    forwardModel();
  }
  if (event.source === frames.get('aleteia')?.contentWindow && event.data?.type === 'mesa:compose-image') {
    if (typeof event.data.url !== 'string' || !event.data.url.startsWith('/mesa-media/')) return;
    pendingImage = event.data;
    location.hash = 'apresentacao';
    forwardImage();
  }
  if (event.source === frames.get('apresentacao')?.contentWindow && event.data?.type === 'mesa:composition-ready') {
    compositionReady = true;
    forwardImage();
    forwardModel();
  }
  if (event.source === frames.get('apresentacao')?.contentWindow && event.data?.type === 'mesa:open-models') {
    location.hash = 'acervo';
  }
  if (event.source === frames.get('apresentacao')?.contentWindow && event.data?.type === 'mesa:model-result' &&
      pendingModel?.request === event.data.request) {
    finishModel(event.data.error);
  }
});

window.addEventListener('hashchange', render);
const top = document.querySelector('.mesa-top');
new ResizeObserver(() => document.documentElement.style.setProperty('--mesa-top-height', top.offsetHeight + 'px')).observe(top);
render();
