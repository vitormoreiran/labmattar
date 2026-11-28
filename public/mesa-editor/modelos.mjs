import { models } from './modelos-data.mjs';

const collection = document.getElementById('model-collection');
const dialog = document.getElementById('model-dialog');
const form = dialog.querySelector('form');
const projectName = document.getElementById('project-name');
const status = document.getElementById('model-status');
const cancel = document.getElementById('cancel-model');
const submit = form.querySelector('[type="submit"]');
let selected, pending;

function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function openModel(model) {
  selected = model;
  document.getElementById('model-dialog-title').textContent = model.name;
  projectName.value = model.name;
  status.textContent = '';
  dialog.showModal();
  projectName.select();
}

function modelCard(model) {
  const card = element('article','','model-card');
  const preview = element('div','','model-preview');
  const cover = model.pages[0];
  preview.setAttribute('aria-hidden','true');
  preview.dataset.format = model.format;
  if (model.pages.length > 1) preview.dataset.document = '';
  const sheet = element('div','','model-sheet');
  sheet.dataset.paper = cover.color;
  sheet.append(
    element('span','LABMATTAR','model-sheet-signature'),
    element('strong',cover.title,'model-sheet-title')
  );
  if (cover.body) sheet.append(element('p',cover.body,'model-sheet-body'));
  preview.append(sheet);
  const detail = element('div','','model-copy');
  const name = element('h3',model.name);
  const description = element('p',model.description);
  const meta = element('p',model.formatLabel+' · '+(model.pages.length === 1 ? '1 página' : model.pages.length+' páginas'),'model-meta');
  const action = element('button','Usar modelo');
  action.type = 'button';
  action.setAttribute('aria-label','Usar modelo '+model.name);
  action.onclick = () => openModel(model);
  detail.append(name,meta,description);
  if (model.pages.length > 1) {
    const outline = element('p',model.pages.map(page => page.name).join(' / '),'model-outline');
    detail.append(outline);
  }
  card.append(preview,detail,action);
  return card;
}

function busy(value) {
  cancel.disabled = submit.disabled = projectName.disabled = value;
}

if (window.top === window) {
  location.replace('/mesa-unificada#acervo');
} else {
  for (const group of ['Páginas','Documentos']) {
    const section = element('section','','model-group');
    const heading = element('h2',group);
    heading.id = group === 'Páginas' ? 'model-pages' : 'model-documents';
    section.setAttribute('aria-labelledby',heading.id);
    const grid = element('div','','model-grid');
    grid.append(...models.filter(model => model.group === group).map(modelCard));
    section.append(heading,grid);
    collection.append(section);
  }
}

cancel.onclick = () => dialog.close();
dialog.addEventListener('cancel',event => { if (pending) event.preventDefault(); });
form.addEventListener('submit',event => {
  event.preventDefault();
  const name = projectName.value.trim();
  if (!name || pending) {
    if (!pending) { status.textContent = 'Informe o nome do projeto.'; projectName.focus(); }
    return;
  }
  pending = crypto.randomUUID();
  busy(true);
  status.textContent = 'Abrindo o modelo em Montar…';
  window.parent.postMessage({type:'mesa:create-from-model',request:pending,id:selected.id,name},location.origin);
});

window.addEventListener('message',event => {
  if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'mesa:model-result' || event.data.request !== pending) return;
  pending = undefined;
  busy(false);
  if (event.data.error) status.textContent = event.data.error;
  else dialog.close();
});
