import { maximumGap } from './chapter-blocks.mjs';
import { pickMesaMedia } from './acervo.mjs';

const blockLabels = {text:'Texto',image:'Imagem',video:'Vídeo'};
const accepted = {image:'image/png,image/jpeg,image/webp,image/avif',video:'video/mp4,video/webm'};
const sizeLimit = {image:8,video:24};
const get = id => document.getElementById(id);

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function labelFor(id, text) {
  const label = element('label','',text);
  label.htmlFor = id;
  return label;
}

function button(text, name, disabled, action) {
  const el = element('button','',text);
  el.type = 'button';
  el.setAttribute('aria-label',name);
  el.disabled = disabled;
  el.onclick = action;
  return el;
}

function gapControl(id, name, value, change) {
  const group = element('div','gap-control'), input = element('input'), output = element('output');
  input.type = 'range';
  input.id = id;
  input.min = 0;
  input.max = maximumGap;
  input.value = value;
  output.htmlFor = id;
  output.textContent = value+' px';
  input.oninput = () => {
    output.textContent = input.value+' px';
    change(Number(input.value));
  };
  group.append(labelFor(id,name),output,input);
  return group;
}

export function createComposer(callbacks) {
  const uploading = new Set();
  let openId;

  async function upload(block, file) {
    if (!file) return;
    if (!accepted[block.type].split(',').includes(file.type) || file.size > sizeLimit[block.type]*1024*1024) {
      callbacks.error(block.type === 'image' ? 'Escolha uma imagem PNG, JPEG, WebP ou AVIF de até 8 MB.' : 'Escolha um vídeo MP4 ou WebM de até 24 MB.');
      return;
    }
    uploading.add(block.id);
    callbacks.busy(1);
    callbacks.error('');
    callbacks.refresh(block.id);
    try {
      const res = await fetch('/mesa-api/chapter/upload?type='+block.type,{method:'POST',headers:{'Content-Type':file.type,'X-Mesa-File-Name':encodeURIComponent(file.name)},body:file});
      const value = await res.json();
      if (!res.ok) throw Error(value.error || 'Não foi possível enviar o arquivo.');
      block.media = {key:value.key,name:file.name.slice(0,180)};
      callbacks.change(true);
      callbacks.reveal(block.id);
    } catch(error) {
      callbacks.error(error.message);
    } finally {
      uploading.delete(block.id);
      callbacks.busy(-1);
      callbacks.refresh(block.id);
    }
  }

  async function chooseAsset(block,language) {
    const item = await pickMesaMedia(block.type);
    if (!item) return;
    block.media = {key:item.key,name:item.name};
    if (!block.copy[language].trim() && item.alt) block.copy[language] = item.alt.slice(0,240);
    callbacks.change(true);
    callbacks.refresh(block.id);
    callbacks.reveal(block.id);
  }

  function editorFor(block, language, updateCaption) {
    const id = 'copy-'+block.id, label = blockLabels[block.type];
    const input = element(block.type === 'text' ? 'textarea' : 'input');
    const group = document.createDocumentFragment();
    input.id = id;
    input.maxLength = block.type === 'text' ? 4000 : 240;
    input.value = block.copy[language];
    input.oninput = () => {
      block.copy[language] = input.value;
      updateCaption();
      callbacks.change();
    };
    if (block.type === 'text') {
      input.rows = 3;
      group.append(labelFor(id,'Texto do bloco'),input);
      return group;
    }
    const file = element('input');
    file.id = 'file-'+block.id;
    file.type = 'file';
    file.accept = accepted[block.type];
    file.disabled = uploading.has(block.id);
    file.onchange = () => upload(block,file.files[0]);
    const limit = block.type === 'image' ? 'PNG, JPEG, WebP ou AVIF · até 8 MB' : 'MP4 ou WebM · até 24 MB';
    const name = uploading.has(block.id) ? 'Enviando arquivo…' : block.media?.name;
    const choose = button('Escolher do acervo','Escolher '+label.toLowerCase()+' do acervo',file.disabled,() => chooseAsset(block,language));
    choose.className = 'choose-shared-asset';
    group.append(choose,labelFor(file.id,name && !file.disabled ? 'Substituir '+label.toLowerCase() : 'Arquivo de '+label.toLowerCase()),file);
    if (name) group.append(element('p','upload-name',name));
    group.append(element('p','upload-hint',limit),labelFor(id,block.type === 'image' ? 'Texto alternativo' : 'Descrição do vídeo'),input);
    return group;
  }

  function render(section, language, selected) {
    if (selected !== undefined) openId = selected;
    get('block-count').textContent = section.blocks.length === 1 ? '1 bloco' : section.blocks.length+' blocos';
    get('section-spacing').replaceChildren(
      gapControl('space-section-before','Espaço extra antes',section.spacing.before,value => { section.spacing.before = value; callbacks.layoutChange(); }),
      gapControl('space-section-after','Espaço extra depois',section.spacing.after,value => { section.spacing.after = value; callbacks.layoutChange(); })
    );
    get('blocks').replaceChildren(...section.blocks.map((block,index) => {
      const item = element('details','block-card'), summary = element('summary');
      const caption = element('span','block-caption'), controls = element('div','block-controls'), order = element('div','block-order');
      const text = () => block.type === 'text' ? block.copy[language].trim() || 'Sem texto' : block.media?.name || 'Sem arquivo';
      const number = index+1;
      const name = blockLabels[block.type];
      item.open = openId === block.id;
      item.id = 'card-'+block.id;
      summary.id = 'block-'+block.id;
      caption.textContent = text();
      summary.append(element('span','block-name',name),caption);
      summary.onclick = event => {
        event.preventDefault();
        openId = item.open ? undefined : block.id;
        for (const card of get('blocks').children) card.open = card === item && Boolean(openId);
        if (openId) callbacks.reveal(block.id);
      };
      order.append(
        button('↑ Subir','Subir bloco '+number,index === 0,() => callbacks.move(block.id,-1)),
        button('↓ Descer','Descer bloco '+number,index === section.blocks.length-1,() => callbacks.move(block.id,1)),
        button('Remover','Remover bloco '+number,uploading.has(block.id),() => callbacks.remove(block.id))
      );
      controls.append(editorFor(block,language,() => { caption.textContent = text(); }),
        gapControl('space-'+block.id,'Espaço antes do bloco',block.space,value => { block.space = value; callbacks.layoutChange(); }),order);
      item.append(summary,controls);
      return item;
    }));
  }

  function focus(id, edit = true) {
    const item = get('card-'+id);
    if (!item) return;
    openId = id;
    for (const card of get('blocks').children) card.open = card === item;
    return edit ? item.querySelector('textarea,input[type="file"]') ?? item.querySelector('summary') : item.querySelector('summary');
  }

  return {render,focus};
}
