const main = document.querySelector('main');
const viewer = document.querySelector('#visualizador');
const cover = '/presentation-models/covers/aleteia.webp';
const materials = {
  capa: { label: 'Capa de Aleteia', src: cover },
  detalhe: { label: 'Imagem da apresentação', src: '/presentation-models/thumbs/aleteia-02.webp' },
};
const languages = { pt: 'Português', en: 'English', es: 'Español' };
const chapters = ['Gastroperformance', 'Portfólio', 'Como trabalhamos', 'Apresentação', 'Contato'];

const examples = {
  obra: {
    info: { title: 'Aleteia', category: 'Gastroperformance', year: '', summary: 'Estudo de uma experiência à mesa, contado em imagens e gestos.' },
    pages: [
      { label: 'Capa', title: 'Aleteia', body: 'Um estudo sobre o encontro à mesa.', image: 'capa' },
      { label: 'Contexto', title: 'Em torno da mesa', body: 'Uma sequência de gestos, matérias e imagens organiza a experiência.', image: 'detalhe' },
      { label: 'Encerramento', title: 'Depois do encontro', body: 'A apresentação se encerra no que permanece na memória.', image: '' },
    ],
  },
  site: {
    sections: [
      { label: 'Escuta', pt: { title: 'Escuta', body: 'Partimos de uma conversa para entender o contexto, o público e o que a experiência precisa propor.' }, en: { title: 'Listening', body: 'We begin with a conversation about the context, the audience and what the experience should offer.' }, es: { title: 'Escucha', body: 'Empezamos con una conversación para entender el contexto, el público y lo que debe proponer la experiencia.' } },
      { label: 'Pesquisa', pt: { title: 'Pesquisa e criação', body: 'Experimentamos materiais, preparos e sequências para dar forma à experiência.' }, en: { title: 'Research and creation', body: 'We experiment with materials, preparations and sequences to shape the experience.' }, es: { title: 'Investigación y creación', body: 'Experimentamos con materiales, preparaciones y secuencias para dar forma a la experiencia.' } },
      { label: 'Realização', pt: { title: 'Realização', body: 'Alinhamos equipe, espaço e ritmo para que o trabalho aconteça do início ao fim.' }, en: { title: 'Production', body: 'We bring the team, space and timing together to carry the work through.' }, es: { title: 'Realización', body: 'Coordinamos equipo, espacio y ritmo para llevar adelante el trabajo de principio a fin.' } },
    ],
  },
};

const workTabs = { geral: 'Visão geral', informacoes: 'Informações', materiais: 'Materiais', apresentacoes: 'Apresentações' };
const formats = { obra: 'Portfólio / Aleteia', site: 'Site / Como trabalhamos' };
const pages = new Set(['inicio', 'site', 'obras', 'criacoes', 'acervo', 'aleteia', 'apresentacao', 'como-trabalhamos']);
const storageKey = 'labmattar:mesa-unificada:v1:';
const defaultRecord = scope => ({ revision: 0, date: null, data: structuredClone(examples[scope]) });

function sameShape(value, template) {
  if (typeof template === 'string') return typeof value === 'string';
  if (Array.isArray(template)) {
    return Array.isArray(value) && value.length === template.length && template.every((part, i) => sameShape(value[i], part));
  }
  return Boolean(value) && typeof value === 'object' && Object.keys(template).every(key => sameShape(value[key], template[key]));
}

function readRecord(scope) {
  try {
    const result = JSON.parse(localStorage.getItem(storageKey + scope));
    if (Number.isSafeInteger(result?.revision) && result.revision > 0 && Number.isFinite(Date.parse(result.date)) && sameShape(result.data, examples[scope])) {
      return result;
    }
  } catch {
    // Start with the fixtures when local storage is unavailable or invalid.
  }
  return defaultRecord(scope);
}

const saved = { obra: readRecord('obra'), site: readRecord('site') };
const draft = { obra: structuredClone(saved.obra.data), site: structuredClone(saved.site.data) };
const changed = scope => JSON.stringify(draft[scope]) !== JSON.stringify(saved[scope].data);
const selected = { obra: 0, site: 0 };
let language = 'pt';
let route;
let openPreview;

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const heading = (group, title, description = '') => `<div class="heading"><p class="eyebrow">${group}</p><h1 tabindex="-1">${title}</h1>${description ? `<p class="lead">${description}</p>` : ''}</div>`;
const back = (href, label) => `<a class="back text-link" href="#${href}">${label}</a>`;
const link = (href, label, style = '') => `<a class="button ${style}" href="#${href}">${label}</a>`;
const primary = text => `<button class="button primary" type="submit">${text}</button>`;
const present = (mode = 'draft', label = 'Visualizar') => `<button class="button" type="button" data-preview="${mode}">${label}</button>`;

function coverCard() {
  return `<a class="flow-card" href="#aleteia">
    <img class="cover" src="${cover}" alt="" width="960" height="540">
    <div class="card-meta"><p class="eyebrow">Obra · Portfólio</p><span class="card-action">Abrir obra</span></div>
    <h3>${escape(draft.obra.info.title || 'Aleteia')}</h3>
  </a>`;
}

function chapterCard() {
  return `<a class="flow-card" href="#como-trabalhamos">
    <div class="type-cover" aria-hidden="true"><span>Capítulo 03</span><strong>Como<br>trabalhamos</strong></div>
    <div class="card-meta"><p class="eyebrow">Site · Institucional</p><span class="card-action">Abrir capítulo</span></div>
    <h3>Como trabalhamos</h3>
  </a>`;
}

function home() {
  return `<section class="hero">
    <p class="eyebrow">Ambiente de criação</p>
    <h1 tabindex="-1">Mesa <span class="serif">Unificada</span></h1>
    <p class="lead">Obras, conteúdos do site e criações do LABMATTAR em um mesmo lugar.</p>
    <div class="actions">${link('obras', 'Explorar obras', 'primary')}${link('site', 'Abrir capítulos')}</div>
  </section>
  <section class="section" aria-labelledby="flows-title">
    <div class="section-head"><h2 id="flows-title">Fluxos de teste</h2></div>
    <div class="card-grid">${coverCard()}${chapterCard()}</div>
  </section>`;
}

function siteIndex() {
  return `${heading('Conteúdo institucional', 'Site <span class="serif">LABMATTAR</span>', 'O capítulo Como trabalhamos está disponível para edição nesta prévia.')}
  <div class="page-index" aria-label="Capítulos do site">${chapters.map((name, index) => {
    const active = index === 2;
    return `<div class="index-row"><span>0${index + 1}</span><span class="index-title">${name}</span>${active ? '<a class="text-link" href="#como-trabalhamos">Editar capítulo<span class="sr-only"> Como trabalhamos</span></a>' : '<span class="muted">Fora deste teste</span>'}</div>`;
  }).join('')}</div>`;
}

function works() {
  return `${heading('Portfólio', 'Obras', 'Informações, materiais e apresentações reunidos por obra.')}
    <section class="section" aria-label="Obras de teste"><div class="card-grid">${coverCard()}</div></section>`;
}

function mediaGrid() {
  return `<div class="media-grid">${Object.values(materials).map(material => `
    <figure><img class="cover" src="${material.src}" alt=""><figcaption>${material.label}</figcaption></figure>`).join('')}</div>`;
}

function creations() {
  return `${heading('Composição', 'Criações', 'Abra a apresentação vinculada à obra de teste.')}
  <section class="section"><article class="item"><h2>Apresentação principal de ${escape(draft.obra.info.title || 'Aleteia')}</h2>${link('apresentacao', 'Editar apresentação', 'primary')}</article></section>`;
}

function library() {
  return `${heading('Materiais', 'Acervo', 'Materiais de Aleteia disponíveis na apresentação de teste.')}
  <section class="section" aria-label="Imagens de Aleteia">${mediaGrid()}<a class="text-link" href="#aleteia/materiais">Ver materiais na obra</a></section>`;
}

function field(name, label, value, { long = false, required = false, max = 100 } = {}) {
  const attrs = `id="field-${name}" name="${name}" maxlength="${max}" ${required ? 'required' : ''}`;
  return `<div class="field"><label for="field-${name}">${label}</label>${long
    ? `<textarea ${attrs}>${escape(value)}</textarea>`
    : `<input ${attrs} value="${escape(value)}" autocomplete="off">`}</div>`;
}

function status(scope) {
  if (changed(scope)) return 'Alterações pendentes';
  if (!saved[scope].revision) return 'Versão inicial de teste';
  const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(saved[scope].date));
  return `Versão ${saved[scope].revision} atualizada neste navegador · ${date}`;
}

function destination(scope) {
  return `<p class="destination"><strong>Destino simulado</strong> · ${formats[scope]}</p>
    <p class="status" id="save-status" role="status">${status(scope)}</p><p class="notice" id="save-error" role="alert"></p>`;
}

function work() {
  const info = draft.obra.info;
  const panels = {
    geral: () => `<div class="card-grid">
      <article class="item"><h2>Apresentação principal</h2><p>Edite e visualize três páginas usando os materiais da obra.</p>${link('apresentacao', 'Abrir apresentação', 'primary')}</article>
      <article class="item"><h2>Informações da obra</h2><p>${escape(info.summary || 'Adicione um resumo à obra.')}</p><a class="text-link" href="#aleteia/informacoes">Editar informações</a></article>
    </div>`,
    informacoes: () => `<form id="editor-form" class="edit-fields standalone" data-scope="obra" data-fields="info">
      ${field('title', 'Nome da obra', info.title, { required: true, max: 52 })}
      ${field('category', 'Categoria', info.category, { max: 64 })}
      ${field('year', 'Ano', info.year, { max: 12 })}
      ${field('summary', 'Resumo', info.summary, { long: true, max: 420 })}
      <div>${destination('obra')}<div class="actions">${primary('Salvar e atualizar')}</div></div>
    </form>`,
    materiais: () => `${mediaGrid()}<p class="notice">Escolha a imagem de cada página no editor da apresentação.</p>`,
    apresentacoes: () => `<article class="item"><h2>Apresentação principal</h2><p>Capa, contexto e encerramento.</p>${link('apresentacao', 'Editar apresentação', 'primary')}</article>`,
  };
  return `${back('obras', 'Todas as obras')}
    <div class="work-hero"><div>${heading('Obra de teste', escape(info.title || 'Aleteia'))}<p class="lead" id="work-metadata">${escape([info.category, info.year].filter(Boolean).join(' · '))}</p></div><img class="cover" src="${cover}" alt="Capa de Aleteia"></div>
    <nav class="tab-links" aria-label="Áreas da obra">${Object.entries(workTabs).map(([key, label]) =>
      `<a href="#aleteia/${key}" ${route.tab === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <section aria-label="${workTabs[route.tab]}">${panels[route.tab]()}</section>`;
}

function scenes(scope, data) {
  return scope === 'obra' ? data.pages : data.sections;
}

function displayScene(scope, scene, lang) {
  const content = scope === 'obra' ? scene : scene[lang];
  const image = materials[content.image];
  const type = scope === 'obra' ? 'Aleteia · Apresentação' : 'Como trabalhamos · Capítulo 03';
  return `<article class="canvas ${scope === 'site' ? 'institutional' : ''}" ${scope === 'site' ? `lang="${lang}"` : ''}>
    ${image ? `<img src="${image.src}" alt="">` : ''}
    <div class="canvas-kicker">${type}</div><h3>${escape(content.title || scene.label)}</h3>
    <p>${escape(content.body)}</p>
  </article>`;
}

function editorFields(scope) {
  const scene = scenes(scope, draft[scope])[selected[scope]];
  const content = scope === 'obra' ? scene : scene[language];
  return `${field('title', 'Título', content.title, { required: true, max: 76 })}
    ${field('body', 'Texto', content.body, { long: true, max: 320 })}
    ${scope === 'obra' ? `<div class="field"><label for="field-image">Imagem da página</label><select id="field-image" name="image">
      <option value="" ${!content.image ? 'selected' : ''}>Sem imagem</option>
      ${Object.entries(materials).map(([key, material]) => `<option value="${key}" ${content.image === key ? 'selected' : ''}>${material.label}</option>`).join('')}
    </select></div>` : ''}`;
}

function editor(scope) {
  const institution = scope === 'site';
  const collection = scenes(scope, draft[scope]);
  const index = selected[scope];
  return `${institution ? back('site', 'Capítulos do site') : back('aleteia/apresentacoes', 'Apresentações da obra')}
    ${heading(institution ? 'Site · Capítulo 03' : 'Aleteia · Criação', institution ? 'Como <span class="serif">trabalhamos</span>' : 'Apresentação <span class="serif">principal</span>')}
    <form id="editor-form" data-scope="${scope}" data-fields="scene">
      <div class="editing-nav">
        <div class="switch" role="group" aria-label="${institution ? 'Seções do capítulo' : 'Páginas da apresentação'}">${collection.map((scene, i) =>
          `<button type="button" data-scene="${i}" aria-pressed="${i === index}">${scene.label}</button>`).join('')}</div>
        ${institution ? `<div class="switch" role="group" aria-label="Idioma do conteúdo">${Object.entries(languages).map(([code, name]) =>
          `<button type="button" data-lang="${code}" aria-label="${name}" aria-pressed="${code === language}">${code.toUpperCase()}</button>`).join('')}</div>` : ''}
      </div>
      <div class="editor-grid">
        <div id="inline-preview">${displayScene(scope, collection[index], language)}</div>
        <div class="edit-fields" id="active-fields">${editorFields(scope)}</div>
      </div>
      ${destination(scope)}
      <div class="actions">${primary('Salvar e atualizar')}${present('draft', institution ? 'Visualizar capítulo' : 'Apresentar')}${present('saved', 'Ver versão atualizada')}</div>
    </form>`;
}

function render() {
  const [hash = '', tab = ''] = window.location.hash.slice(1).split('/');
  const page = pages.has(hash) ? hash : 'inicio';
  route = { page, tab: Object.hasOwn(workTabs, tab) ? tab : 'geral' };
  const nav = { aleteia: 'obras', apresentacao: 'obras', 'como-trabalhamos': 'site' }[page] || page;
  document.querySelectorAll('[data-nav]').forEach(anchor => {
    if (anchor.dataset.nav === nav) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  });
  const renderers = { inicio: home, site: siteIndex, obras: works, criacoes: creations, acervo: library, aleteia: work, apresentacao: () => editor('obra'), 'como-trabalhamos': () => editor('site') };
  main.innerHTML = renderers[page]();
  document.title = `${main.querySelector('h1').textContent} · Mesa Unificada · LABMATTAR`;
}

function refreshEditor(scope) {
  const index = selected[scope];
  document.querySelector('#inline-preview').innerHTML = displayScene(scope, scenes(scope, draft[scope])[index], language);
}

main.addEventListener('input', event => {
  const { target } = event;
  const form = target.closest('#editor-form');
  if (!form || !target.name || !['title', 'body', 'image', 'category', 'year', 'summary'].includes(target.name)) return;
  const { scope, fields } = form.dataset;
  const scene = scenes(scope, draft[scope])[selected[scope]];
  const content = fields === 'info' ? draft.obra.info : scope === 'site' ? scene[language] : scene;
  content[target.name] = target.value;
  if (fields === 'scene') refreshEditor(scope);
  document.querySelector('#save-status').textContent = status(scope);
  document.querySelector('#save-error').textContent = '';
});

function updateSaved(scope) {
  const error = document.querySelector('#save-error');
  const record = draft[scope];
  const titles = scope === 'obra' ? [record.info.title, ...record.pages.map(page => page.title)]
    : record.sections.flatMap(section => Object.keys(languages).map(lang => section[lang].title));
  if (titles.some(title => !title.trim())) {
    error.textContent = 'Preencha todos os títulos antes de salvar.';
    return;
  }
  if (readRecord(scope).revision !== saved[scope].revision) {
    error.textContent = 'Este conteúdo foi atualizado em outra aba. Copie as edições pendentes antes de recarregar.';
    return;
  }
  if (!changed(scope) && saved[scope].revision) {
    document.querySelector('#save-status').textContent = 'A versão atualizada já contém estas edições.';
    return;
  }
  const version = { revision: saved[scope].revision + 1, date: new Date().toISOString(), data: structuredClone(record) };
  try {
    localStorage.setItem(storageKey + scope, JSON.stringify(version));
  } catch {
    error.textContent = 'O navegador não permitiu salvar. Mantenha esta aba aberta para preservar a edição.';
    return;
  }
  saved[scope] = version;
  error.textContent = '';
  document.querySelector('#save-status').textContent = status(scope);
  if (scope === 'obra' && route.page === 'aleteia') {
    main.querySelector('h1').textContent = record.info.title;
    main.querySelector('#work-metadata').textContent = [record.info.category, record.info.year].filter(Boolean).join(' · ');
  }
}

main.addEventListener('submit', event => {
  if (event.target.id !== 'editor-form') return;
  event.preventDefault();
  updateSaved(event.target.dataset.scope);
});

function paintViewer() {
  const { scope, source, index, width, lang } = openPreview;
  const record = source === 'saved' ? saved[scope].data : draft[scope];
  const collection = scenes(scope, record);
  const stage = viewer.querySelector('#viewer-stage');
  stage.innerHTML = displayScene(scope, collection[index], lang);
  stage.classList.toggle('mobile', width === 'mobile');
  viewer.querySelector('#viewer-position').textContent = `${index + 1} de ${collection.length}`;
  viewer.querySelector('#viewer-language').textContent = scope === 'site' ? languages[lang] : '';
  viewer.querySelector('[data-step="-1"]').disabled = index === 0;
  viewer.querySelector('[data-step="1"]').disabled = index === collection.length - 1;
  viewer.querySelectorAll('[data-width]').forEach(button => button.setAttribute('aria-pressed', button.dataset.width === width));
}

main.addEventListener('click', event => {
  const button = event.target.closest('button');
  const form = button?.closest('#editor-form');
  if (!form) return;
  const { scope } = form.dataset;
  if (button.dataset.scene !== undefined) selected[scope] = Number(button.dataset.scene);
  if (button.dataset.lang) language = button.dataset.lang;
  if (button.dataset.scene !== undefined || button.dataset.lang) {
    const selector = button.dataset.scene !== undefined ? '[data-scene]' : '[data-lang]';
    form.querySelectorAll(selector).forEach(control => control.setAttribute('aria-pressed', control === button));
    form.querySelector('#active-fields').innerHTML = editorFields(scope);
    refreshEditor(scope);
  }
  if (!button.dataset.preview) return;
  const source = button.dataset.preview;
  openPreview = { scope, source, index: selected[scope], width: 'desktop', lang: language };
  const data = source === 'saved' ? saved[scope].data : draft[scope];
  viewer.querySelector('#viewer-title').textContent = scope === 'obra' ? data.info.title || 'Aleteia' : 'Como trabalhamos';
  viewer.querySelector('#viewer-version').textContent = source === 'draft' ? 'Visualização da edição' : saved[scope].revision ? `Destino simulado · Versão ${saved[scope].revision}` : 'Destino simulado · Versão inicial';
  paintViewer();
  viewer.showModal();
});

function stepViewer(amount) {
  const next = openPreview.index + amount;
  const count = scenes(openPreview.scope, examples[openPreview.scope]).length;
  if (next < 0 || next >= count) return;
  openPreview.index = next;
  paintViewer();
  if (viewer.contains(document.activeElement) && document.activeElement.disabled) {
    viewer.querySelector(`[data-step="${-amount}"]`).focus();
  }
}

viewer.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-close')) viewer.close();
  if (button.dataset.step) stepViewer(Number(button.dataset.step));
  if (button.dataset.width) {
    openPreview.width = button.dataset.width;
    paintViewer();
  }
});

viewer.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  stepViewer(event.key === 'ArrowLeft' ? -1 : 1);
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#conteudo') return;
  render();
  window.scrollTo(0, 0);
  main.querySelector('h1').focus({ preventScroll: true });
});

render();
