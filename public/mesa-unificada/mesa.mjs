const home = document.querySelector('#mesa-inicio');
const workspaces = document.querySelector('#mesa-workspaces');
const views = {
  aleteia: { src: '/mesa-editor/portfolio.html', title: 'Editor do Portfólio' },
  apresentacao: { src: '/montar.html?modelo=aleteia&mesa=1#laboratorio', title: 'Laboratório de Composição' },
  'como-trabalhamos': { src: '/mesa-editor/chapter.html', title: 'Editor de Como trabalhamos' },
};
const frames = new Map();
let compositionReady = false;
let pendingImage;

function frameFor(view) {
  if (frames.has(view)) return frames.get(view);
  const frame = document.createElement('iframe');
  frame.title = views[view].title;
  frame.src = views[view].src;
  frame.allow = 'fullscreen';
  frames.set(view, frame);
  workspaces.append(frame);
  return frame;
}

function render() {
  const hash = location.hash.slice(1).split('/')[0];
  const aliases = { obras: 'aleteia', criacoes: 'apresentacao', site: 'como-trabalhamos' };
  const view = Object.hasOwn(aliases, hash) ? aliases[hash] : Object.hasOwn(views, hash) ? hash : 'inicio';
  if (view !== 'inicio') frameFor(view);
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

window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.source === frames.get('aleteia')?.contentWindow && event.data?.type === 'mesa:compose-image') {
    if (typeof event.data.url !== 'string' || !event.data.url.startsWith('/mesa-media/')) return;
    pendingImage = event.data;
    location.hash = 'apresentacao';
    forwardImage();
  }
  if (event.source === frames.get('apresentacao')?.contentWindow && event.data?.type === 'mesa:composition-ready') {
    compositionReady = true;
    forwardImage();
  }
});

window.addEventListener('hashchange', render);
render();
