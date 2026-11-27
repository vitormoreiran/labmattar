import { chapterCopy, chapterVisual } from './chapter-visual.mjs';

const get = id => document.getElementById(id);
const form = get('editor'), lang = get('lang'), status = get('status');
let sections, etag, selected = 0;

async function request(init) {
  const res = await fetch('/mesa-api/chapter', init);
  const value = await res.json();
  if (!res.ok) throw Error(value.error || 'Não foi possível acessar o capítulo.');
  return value;
}

function render() {
  const language = lang.value;
  const section = sections[selected];
  const entry = section[language];
  get('title').value = entry.title;
  get('body').value = entry.body.join('\n\n');
  get('stage').replaceChildren(chapterVisual(section, language));
}

function setSaved(version) {
  etag = version.etag; sections = version.state;
  status.textContent = version.savedAt ? 'Versão ' + etag + ' salva na prévia' : 'Sessão de teste';
}

async function start() {
  setSaved(await request());
  lang.addEventListener('change', render);
  render();
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
  const mobileModes = buttons('button[data-mobile-view]');
  for (const button of mobileModes) button.onclick = () => {
    document.body.dataset.mobileView = button.dataset.mobileView;
    for (const option of mobileModes) option.setAttribute('aria-pressed', option === button);
  };
  form.addEventListener('input', event => {
    if (!['title','body'].includes(event.target.id)) return;
    const section = sections[selected], entry = section[lang.value];
    entry.title = get('title').value;
    entry.body = get('body').value.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const copy = get('stage').querySelector('.chapter-copy');
    copy.replaceWith(chapterCopy(entry, section.id === 'abertura'));
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

start().catch(error => { get('error').textContent = error.message; status.textContent = ''; });
