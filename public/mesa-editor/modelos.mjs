import { models } from './modelos-data.mjs';

const get = id => document.getElementById(id);
const collection = get('model-collection');
const dialog = get('model-dialog');
const form = dialog.querySelector('form');
const projectName = get('project-name');
const status = get('model-status');
const cancel = get('cancel-model');
const submit = form.querySelector('[type="submit"]');
const sheet = document.querySelector('.model-sheet');
const previous = get('model-prev'), next = get('model-next');
const options = new Map();
let selected = models[0], pageIndex = 0, pending;

function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function showPage(index) {
  pageIndex = index;
  const page = selected.pages[index];
  sheet.dataset.format = selected.format;
  sheet.dataset.paper = page.color || 'neutral';
  sheet.style.setProperty('--title-scale',(page.scale || 70) / 100);
  get('sheet-title').textContent = page.title;
  const body = get('sheet-body');
  body.textContent = page.body || '';
  body.hidden = !page.body;
  get('model-page').textContent = page.name;
  get('model-page-count').textContent = (index+1)+' / '+selected.pages.length;
  previous.disabled = index === 0;
  next.disabled = index === selected.pages.length - 1;
}

function select(model) {
  selected = model;
  for (const [id,button] of options) button.setAttribute('aria-pressed',id === model.id);
  get('model-name').textContent = model.name;
  const length = model.pages.length;
  get('model-meta').textContent = model.formatLabel+' · '+(length === 1 ? '1 página' : length+' páginas');
  get('model-pager').hidden = length === 1;
  showPage(0);
}

function openModel() {
  get('model-dialog-title').textContent = selected.name;
  projectName.value = selected.name;
  status.textContent = '';
  dialog.showModal();
  projectName.select();
}

function busy(value) {
  cancel.disabled = submit.disabled = projectName.disabled = value;
}

if (window.top === window) {
  location.replace('/mesa-unificada#acervo');
} else {
  for (const [group,id] of [['Páginas','model-pages'],['Documentos','model-documents']]) {
    const section = element('section','','model-group');
    const heading = element('h2',group);
    heading.id = id;
    section.setAttribute('aria-labelledby',id);
    section.append(heading);
    for (const model of models.filter(model => model.group === group)) {
      const button = element('button',model.name);
      button.type = 'button';
      button.setAttribute('aria-controls','model-detail');
      button.onclick = () => { if (selected !== model) select(model); };
      options.set(model.id,button);
      section.append(button);
    }
    collection.append(section);
  }
  select(selected);
}

previous.onclick = () => showPage(pageIndex-1);
next.onclick = () => showPage(pageIndex+1);
get('use-model').onclick = openModel;
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
