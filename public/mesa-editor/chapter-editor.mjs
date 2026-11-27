const get = id => document.getElementById(id);
const form = get('editor'), lang = get('lang'), status = get('status');
const frame = get('chapter-frame'), stage = get('stage'), frameStatus = get('frame-status');
let sections, etag, selected = 0;
let loaded = false, queued, size = 'wide';

function send(type, data) {
  if (loaded) frame.contentWindow.postMessage({ type, ...data }, location.origin);
}

function preview() {
  if (sections) send('mesa:chapter-draft',{ sections, language:lang.value });
}

window.addEventListener('message',event=>{
  if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'mesa:chapter-ready') return;
  loaded=true;
  frameStatus.textContent='';
  preview();
  if (sections && selected) send('mesa:chapter-seek',{section:sections[selected].id});
});
setTimeout(()=>{
  if (!loaded) frameStatus.textContent='Não foi possível carregar a página do site. Recarregue a Mesa para tentar novamente.';
},15000);

function layoutFrame() {
  const mobileView = matchMedia('(max-width:670px)').matches;
  const [width,height] = (mobileView || size === 'narrow') ? [390,844] : [1440,900];
  const available = stage.clientWidth;
  if (!available) return;
  const scale = Math.min(available / width,1);
  Object.assign(frame.style,{ width:width+'px',height:height+'px',left:(available-width*scale)/2+'px',transform:'scale('+scale+')' });
  stage.style.height = Math.round(height * scale)+'px';
}

new ResizeObserver(layoutFrame).observe(stage);
window.addEventListener('resize',layoutFrame);
layoutFrame();

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
  get('paragraph-help').textContent = section.id === 'abertura' ? 'A abertura usa um parágrafo.' : 'Separe os parágrafos com uma linha em branco.';
  preview();
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
    send('mesa:chapter-seek',{ section:sections[selected].id });
  };
  for (const button of buttons('[data-size]')) button.onclick = () => {
    for (const item of buttons('[data-size]')) item.setAttribute('aria-pressed', item === button);
    size=button.dataset.size;
    layoutFrame();
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
    const text = get('body').value;
    entry.body = (section.id === 'abertura' ? [text.replace(/\s*\n\s*/g,' ')] : text.split(/\n\s*\n/)).map(p => p.trim()).filter(Boolean);
    clearTimeout(queued);
    queued=setTimeout(preview,180);
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
      preview();
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
