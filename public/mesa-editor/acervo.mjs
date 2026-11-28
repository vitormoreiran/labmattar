import { assetURL } from './acervo-reference.mjs';

const imageTypes = ['image/jpeg','image/png','image/webp','image/avif'];
const videoTypes = ['video/mp4','video/webm'];
const supported = [...imageTypes,...videoTypes];
let style;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(text, action) {
  const node = element('button',text);
  node.type = 'button';
  node.onclick = action;
  return node;
}

function applyStyle() {
  if (style || document.querySelector('link[href="/mesa-editor/acervo.css"]')) return;
  style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/mesa-editor/acervo.css';
  document.head.append(style);
}

function createDialog(title) {
  applyStyle();
  const dialog = element('dialog','','asset-library-dialog');
  const header = element('header','','asset-library-header');
  const heading = element('h2',title);
  heading.id = 'acervo-heading';
  const close = button('Fechar',() => dialog.close());
  header.append(heading,close);
  dialog.setAttribute('aria-labelledby',heading.id);
  dialog.append(header);
  document.body.append(dialog);
  dialog.addEventListener('close',() => dialog.remove(),{once:true});
  return dialog;
}

async function request(path,init) {
  const response = await fetch('/mesa-api/acervo'+path,init);
  const value = await response.json();
  if (!response.ok) throw Error(value.error || 'Não foi possível acessar o acervo.');
  return value;
}

function mount(root,{type,select}) {
  root.classList.add('asset-library');
  const tools = element('div','','asset-library-tools');
  const search = element('input');
  search.type = 'search';
  search.placeholder = 'Buscar por arquivo ou projeto';
  search.setAttribute('aria-label','Buscar mídias');
  const file = element('input');
  file.type = 'file';
  file.accept = (type === 'image' ? imageTypes : type === 'video' ? videoTypes : supported).join(',');
  file.multiple = true;
  file.hidden = true;
  const upload = button('Enviar arquivos',() => file.click());
  const status = element('p','','asset-library-status');
  status.setAttribute('role','status');
  const grid = element('div','','asset-library-grid');
  tools.append(search,upload,file);
  root.append(tools,status,grid);
  let items = [];

  function render() {
    const term = search.value.trim().toLocaleLowerCase('pt-BR');
    const matches = items.filter(item => (!type || item.type === type) &&
      [item.name,item.source,item.alt].some(value => value.toLocaleLowerCase('pt-BR').includes(term)));
    grid.replaceChildren(...matches.map(item => {
      const card = button('',() => select(item));
      card.className = 'asset-library-item';
      card.setAttribute('aria-label','Usar '+item.name);
      const visual = element('span','','asset-library-thumb');
      if (item.type === 'image') {
        const img = element('img');
        img.src = assetURL(item.key);
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        visual.append(img);
      } else visual.append(element('span','▶ Vídeo'));
      card.append(visual,element('strong',item.name),element('small',item.source));
      return card;
    }));
    if (!matches.length) grid.append(element('p',term ? 'Nenhum arquivo corresponde à busca.' : 'Ainda não há arquivos deste tipo.'));
  }

  async function refresh() {
    ({items} = await request(''));
    render();
  }

  search.oninput = render;
  file.onchange = async () => {
    const files = [...file.files], errors = [];
    let sent = 0, duplicates = 0;
    upload.disabled = true;
    for (const entry of files) {
      status.textContent = 'Enviando '+entry.name+'…';
      try {
        const kind = imageTypes.includes(entry.type) ? 'image' : videoTypes.includes(entry.type) ? 'video' : null;
        if (!kind || entry.size > (kind === 'image' ? 8 : 24)*1024*1024) throw Error('Formato ou tamanho fora do limite.');
        const result = await request('/upload?type='+kind,{method:'POST',headers:{
          'Content-Type':entry.type,'X-Mesa-File-Name':encodeURIComponent(entry.name),
        },body:entry});
        if (result.duplicate) duplicates++;
        else sent++;
      } catch(error) {
        errors.push(entry.name+' — '+error.message);
      }
    }
    try { await refresh(); }
    catch(error) { errors.push(error.message); }
    status.textContent = [sent ? sent+(sent===1 ? ' arquivo adicionado.' : ' arquivos adicionados.') : '',
      duplicates ? duplicates+(duplicates===1 ? ' já estava no acervo.' : ' já estavam no acervo.') : '',...errors].filter(Boolean).join(' ');
    file.value = '';
    upload.disabled = false;
  };

  upload.disabled = true;
  status.textContent = 'Carregando acervo…';
  refresh().then(() => { status.textContent = ''; upload.disabled = false; },error => { status.textContent = error.message; });
}

export function pickMesaMedia(type) {
  return new Promise(resolve => {
    const dialog = createDialog(type === 'video' ? 'Selecionar vídeo' : 'Selecionar imagem');
    const content = element('div');
    dialog.append(content);
    let selected;
    dialog.addEventListener('close',() => resolve(selected ?? null),{once:true});
    mount(content,{type,select:item => { selected = item; dialog.close(); }});
    dialog.showModal();
  });
}

