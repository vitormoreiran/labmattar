const get = id => document.getElementById(id);
const form = get('editor'), fields = form.querySelector('fieldset'), lang = get('lang');
const frame = get('chapter-frame'), stage = get('stage'), menu = get('insert-menu');
const sectionControl = get('section'), titleInput = get('title'), paragraphs = get('paragraphs');
const save = get('save'), status = get('status'), errorBox = get('error');
const toggleEditor = get('toggle-editor'), frameStatus = get('frame-status');
const originalLabels = new Map([['abertura','Abertura'],['obras-comissionadas','Obras comissionadas'],['processo-criativo','Processo criativo']]);
const languages = ['pt','en','es'];
const maxSections = 12, maxParagraphs = 12;
let sections, etag, active = 'abertura', ready = false, dirty = false, saving = false, queued, reveal;

menu.inert = true;

function send(type, data) {
  if (ready) frame.contentWindow.postMessage({ type, ...data },location.origin);
}

function preview() {
  clearTimeout(queued);
  if (sections) send('mesa:chapter-draft',{ sections, language:lang.value });
}

function seek(id) {
  send('mesa:chapter-seek',{section:id});
}

function showError(text) {
  errorBox.textContent = text;
  errorBox.hidden = !text;
}

function setDirty(value) {
  dirty = value;
  document.body.toggleAttribute('data-dirty',value);
  status.textContent = value ? 'Alterações pendentes' : etag === '0' ? 'Sessão de teste' : 'Prévia salva';
  save.disabled = !value || saving;
}

function interceptExit(event) {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
}

function current() {
  return sections.find(section => section.id === active);
}

function label(section) {
  return originalLabels.get(section.id) || [lang.value,...languages].map(code => section[code].title.trim()).find(Boolean) || 'Nova seção';
}

function updateSectionControl() {
  sectionControl.replaceChildren(...sections.map(section => new Option(label(section),section.id)));
  sectionControl.value = active;
  get('add-section').disabled = saving || sections.length >= maxSections;
}

function updateEditorLabel() {
  const section = current();
  const labelText = label(section);
  get('editing-section').textContent = labelText;
  sectionControl.selectedOptions[0].text = labelText;
  get('remove-section').hidden = originalLabels.has(section.id);
  const full = section[lang.value].body.length >= maxParagraphs;
  get('add-paragraph').disabled = saving || full;
  get('append-paragraph').disabled = full;
}

function paragraphButton(text, label, disabled, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.title = label;
  button.setAttribute('aria-label',label);
  button.disabled = disabled;
  button.onclick = action;
  return button;
}

function renderParagraphs() {
  const entry = current()[lang.value];
  paragraphs.replaceChildren(...entry.body.map((value,index) => {
    const row = document.createElement('div'), bar = document.createElement('div'), controls = document.createElement('div');
    const textarea = document.createElement('textarea'), label = document.createElement('label');
    row.className = 'paragraph';
    bar.className = 'paragraph-head';
    textarea.id = 'paragraph-' + index;
    textarea.rows = value.length > 160 ? 5 : 3;
    textarea.maxLength = 4000;
    textarea.value = value;
    textarea.oninput = () => {
      entry.body[index] = textarea.value;
      if (reveal?.section === active && reveal.field === index && textarea.value.trim()) {
        send('mesa:chapter-reveal',reveal);
        reveal = null;
      }
      changed();
    };
    const name = 'Parágrafo ' + (index + 1);
    label.htmlFor = textarea.id;
    label.textContent = name;
    controls.append(
      paragraphButton('↑','Subir ' + name.toLowerCase(),index === 0,() => moveParagraph(index,-1)),
      paragraphButton('↓','Descer ' + name.toLowerCase(),index === entry.body.length - 1,() => moveParagraph(index,1)),
      paragraphButton('Remover','Remover ' + name.toLowerCase(),entry.body.length < 2,() => {
        entry.body.splice(index,1);
        updateParagraphs(Math.min(index,entry.body.length - 1));
      })
    );
    bar.append(label,controls);
    row.append(bar,textarea);
    return row;
  }));
  updateEditorLabel();
}

function focusField(field) {
  requestAnimationFrame(() => {
    const input = field === 'title' ? titleInput : get('paragraph-' + field);
    if (form.hidden || !input) return;
    input.focus({preventScroll:true});
    input.scrollIntoView({block:'nearest'});
  });
}

function renderEditor() {
  titleInput.value = current()[lang.value].title;
  form.scrollTop = 0;
  renderParagraphs();
}

function choose(id) {
  if (active === id || !sections?.some(section => section.id === id)) return;
  reveal = null;
  active = id;
  sectionControl.value = id;
  renderEditor();
}

function setPane(open, focus) {
  form.hidden = !open;
  toggleEditor.setAttribute('aria-expanded',open);
  toggleEditor.textContent = open ? 'Fechar edição' : 'Editar seção';
  if (open && focus !== undefined) focusField(focus);
  if (!open) toggleEditor.focus();
}

function changed(immediate = false) {
  setDirty(true);
  showError('');
  clearTimeout(queued);
  if (immediate) preview();
  else queued = setTimeout(preview,140);
}

function updateParagraphs(focus) {
  changed(true);
  renderParagraphs();
  focusField(focus);
}

function moveParagraph(index, direction) {
  const body = current()[lang.value].body, destination = index + direction;
  [body[index],body[destination]] = [body[destination],body[index]];
  updateParagraphs(destination);
}

function addParagraph() {
  if (!sections || saving) return;
  const body = current()[lang.value].body;
  if (body.length >= maxParagraphs) return;
  menu.open = false;
  setPane(true);
  body.push('');
  reveal = { section:active,field:body.length - 1 };
  updateParagraphs(body.length - 1);
}

function addSection() {
  if (!sections || saving || sections.length >= maxSections) return;
  menu.open = false;
  const section = { id:'trecho-' + crypto.randomUUID() };
  for (const code of languages) section[code] = { title:'',body:[''] };
  sections.splice(sections.indexOf(current()) + 1,0,section);
  updateSectionControl();
  choose(section.id);
  changed(true);
  setPane(true,'title');
  seek(section.id);
}

window.addEventListener('message',event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  const { type, section, field } = event.data ?? {};
  if (type === 'mesa:chapter-ready') {
    ready = true;
    frameStatus.hidden = true;
    preview();
    if (active !== 'abertura') seek(active);
  }
  if (!sections || saving) return;
  if (type === 'mesa:chapter-visible') choose(section);
  if (type === 'mesa:chapter-language' && languages.includes(event.data.language) && lang.value !== event.data.language) {
    lang.value = event.data.language;
    lang.onchange();
  }
  if (type === 'mesa:chapter-edit') {
    choose(section);
    menu.open = false;
    setPane(true,field);
  }
  if (type === 'mesa:chapter-dismiss') {
    menu.open = false;
    if (!form.hidden) setPane(false);
  }
});
setTimeout(() => {
  if (!ready) frameStatus.textContent = 'Recarregue a Mesa para tentar abrir o capítulo.';
},15000);

function fitPhone() {
  if (stage.dataset.size !== 'narrow' || !stage.clientWidth || !stage.clientHeight) return;
  const scale = Math.min(stage.clientWidth / 390,stage.clientHeight / 844,1);
  stage.style.setProperty('--device-scale',scale);
}

const sizes = [...document.querySelectorAll('[data-size][aria-pressed]')];
for (const button of sizes) button.onclick = () => {
  stage.dataset.size = button.dataset.size;
  for (const option of sizes) option.setAttribute('aria-pressed',option === button);
  fitPhone();
  seek(active);
};
const compactViewport = matchMedia('(max-width:670px)');
compactViewport.addEventListener('change',event => {
  if (event.matches && stage.dataset.size === 'narrow') sizes[0].click();
});
new ResizeObserver(fitPhone).observe(stage);

document.addEventListener('pointerdown',event => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown',event => {
  if (event.key !== 'Escape') return;
  if (menu.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  } else if (!form.hidden) setPane(false);
});

async function request(init) {
  const res = await fetch('/mesa-api/chapter',init);
  const value = await res.json();
  if (!res.ok) throw Error(value.error || 'Não foi possível acessar o capítulo.');
  return value;
}

function prepareSave() {
  const state = structuredClone(sections);
  for (const section of state) {
    let hasContent = false;
    for (const code of languages) {
      const entry = section[code];
      entry.title = entry.title.trim();
      entry.body = entry.body.map(text => text.trim());
      if (!originalLabels.has(section.id) && !entry.title && !entry.body.some(Boolean)) {
        entry.body = [''];
        continue;
      }
      const blank = entry.body.findIndex(text => !text);
      if (!entry.title || blank !== -1) {
        return { section:section.id, language:code, field:entry.title ? blank : 'title', error:entry.title ? 'Preencha ou remova o parágrafo vazio.' : 'Informe o título da seção.' };
      }
      hasContent = true;
    }
    if (!hasContent) return { section:section.id, language:lang.value, field:'title', error:'Escreva um título e um parágrafo para salvar a nova seção.' };
  }
  return { state };
}

async function saveChapter(event) {
  event.preventDefault();
  if (!dirty || saving) return;
  const data = prepareSave();
  if (data.error) {
    lang.value = data.language;
    choose(data.section);
    updateSectionControl();
    renderEditor();
    preview();
    seek(active);
    setPane(true,data.field);
    showError(data.error);
    return;
  }
  saving = true;
  toggleEditor.disabled = save.disabled = fields.disabled = sectionControl.disabled = menu.inert = true;
  status.textContent = 'Salvando…';
  try {
    const result = await request({ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ state:data.state,etag }) });
    ({ state:sections,etag } = result);
    renderEditor();
    updateSectionControl();
    setDirty(false);
    preview();
    showError('');
  } catch (error) {
    setDirty(true);
    showError(error.message);
  } finally {
    saving = false;
    toggleEditor.disabled = fields.disabled = sectionControl.disabled = menu.inert = false;
    updateSectionControl();
    updateEditorLabel();
    save.disabled = !dirty;
  }
}

async function start() {
  ({ state:sections,etag } = await request());
  setDirty(false);
  updateSectionControl();
  renderEditor();
  preview();
  toggleEditor.disabled = fields.disabled = sectionControl.disabled = menu.inert = false;

  sectionControl.onchange = () => {
    choose(sectionControl.value);
    seek(active);
  };
  toggleEditor.onclick = () => setPane(form.hidden,form.hidden ? 'title' : undefined);
  get('close-editor').onclick = () => setPane(false);
  lang.onchange = () => {
    reveal = null;
    updateSectionControl();
    renderEditor();
    preview();
    seek(active);
  };
  titleInput.oninput = () => {
    current()[lang.value].title = titleInput.value;
    updateEditorLabel();
    changed();
  };
  get('add-paragraph').onclick = get('append-paragraph').onclick = addParagraph;
  get('add-section').onclick = addSection;
  get('remove-section').onclick = () => {
    const section = current();
    if (!confirm('Remover “' + label(section) + '” do rascunho?')) return;
    const index = sections.indexOf(section);
    sections.splice(index,1);
    active = sections[index-1].id;
    updateSectionControl();
    renderEditor();
    changed(true);
    seek(active);
  };
  form.onsubmit = saveChapter;
  window.addEventListener('beforeunload',interceptExit);
}

start().catch(error => { showError(error.message); status.textContent = 'Sessão indisponível'; });
