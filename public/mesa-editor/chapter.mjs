const get = id => document.getElementById(id);
const form = get('editor'), lang = get('lang'), status = get('status');
const media = 'https://labmattar.com/assets/ambient-breeze.mp4';
let sections, etag, selected = 0;

async function request(init) {
  const res = await fetch('/mesa-api/chapter', init);
  const value = await res.json();
  if (!res.ok) throw Error(value.error || 'Não foi possível acessar o capítulo.');
  return value;
}

function copyFor(content) {
  const copy = document.createElement('div');
  copy.className = 'read-copy';
  const heading = document.createElement('h2');
  heading.textContent = content.title;
  copy.append(heading);
  for (const text of content.body) {
    const p = document.createElement('p');
    p.textContent = text;
    copy.append(p);
  }
  return copy;
}

function panel(id, content, language) {
  const article = document.createElement('article');
  article.className = 'panel-chapter';
  article.lang = language;
  const video = document.createElement('video');
  video.src = media;
  video.autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  video.preload = 'metadata';
  video.playsInline = video.muted = video.loop = true;
  video.setAttribute('aria-hidden', 'true');
  article.id = id;
  article.append(video, copyFor(content));
  return article;
}

function render() {
  const language = lang.value;
  if (!form) {
    const main = get('saved-chapter');
    main.replaceChildren(...sections.map(section => panel(section.id, section[language], language)));
    return;
  }
  const section = sections[selected];
  const entry = section[language];
  get('title').value = entry.title;
  get('body').value = entry.body.join('\n\n');
  get('stage').replaceChildren(panel(section.id, entry, language));
}

function setSaved(version) {
  etag = version.etag; sections = version.state;
  if (status) status.textContent = version.savedAt ? 'Versão ' + etag + ' salva na prévia' : 'Sessão de teste';
}

async function start() {
  setSaved(await request());
  lang.addEventListener('change', render);
  render();
  if (!form) return;
  form.querySelector('fieldset').disabled = get('save').disabled = false;
  const buttons = selector => [...document.querySelectorAll(selector)];
  for (const button of buttons('[data-block]')) button.onclick = () => {
    selected = Number(button.dataset.block);
    for (const item of buttons('[data-block]')) item.setAttribute('aria-pressed', item === button);
    render();
  };
  for (const button of buttons('[data-size]')) button.onclick = () => {
    for (const item of buttons('[data-size]')) item.setAttribute('aria-pressed', item === button);
    get('stage').classList.toggle('narrow', button.dataset.size === 'narrow');
  };
  form.addEventListener('input', event => {
    if (!['title','body'].includes(event.target.id)) return;
    const section = sections[selected], entry = section[lang.value];
    entry.title = get('title').value;
    entry.body = get('body').value.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const copy = get('stage').querySelector('.read-copy');
    copy.replaceWith(copyFor(entry));
    status.textContent = 'Alterações pendentes';
    get('error').textContent = '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    get('save').disabled = form.querySelector('fieldset').disabled = true;
    status.textContent = 'Salvando…';
    try {
      const version = await request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: sections, etag }) });
      setSaved(version);
      get('error').textContent = '';
    } catch (error) {
      status.textContent = 'Alterações pendentes';
      get('error').textContent = error.message;
    } finally {
      get('save').disabled = form.querySelector('fieldset').disabled = false;
    }
  });
}

start().catch(error => { get('error').textContent = error.message; if (status) status.textContent = ''; });
