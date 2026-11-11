import { normalizeSignature, validateSignature, signatureText } from './email-signature.mjs';
import { EMAIL_COMPOSITIONS, emailComposition, emailDefaultColors } from './email-compositions.mjs?v=modelos-20261111';
import { CARD_COLORS, CARD_THEMES, cardSize, cardContrast, createCard, loadCardVideo, seekCardVideo, canvasBlob, exportCardGIF, cardDocument, cardContact } from './email-card.mjs?v=modelos-20261111';

const form = document.getElementById('signatureForm');
const fields = ['name', 'role', 'email', 'phone'];
const mount = document.getElementById('cardMount'), status = document.getElementById('status');
const stage = document.getElementById('previewStage'), previewLoading = document.getElementById('previewLoading');
const toggle = document.getElementById('togglePreview'), progress = document.getElementById('exportProgress');
const picker = document.getElementById('compositionPicker');
const example = { name: 'Joana Oliveira', role: 'Comunicação e projetos', email: 'joana@labmattar.com', phone: '+55 11 99999-9999' };
const params = new URLSearchParams(location.search);
let composition = EMAIL_COMPOSITIONS.some(item => item.id === params.get('modelo')) ? params.get('modelo') : 'm-horizontal';
let format = params.get('formato') === 'card' ? 'card' : 'email';
let card, video, videoPromise, generation = 0, validated = false, controller, working = false, frameHandle = 0;
let customColors = false, paused = true;
const defaults = () => format === 'email' ? emailDefaultColors(composition) : { paper: CARD_THEMES.paper.paper, ink: CARD_THEMES.paper.ink, accent: CARD_THEMES.paper.accent };
let colors = defaults();
const read = () => normalizeSignature(Object.fromEntries(fields.map(key => [key, form.elements.namedItem(key).value])));
const options = (density = 2) => ({ format, composition, colors: { ...colors }, density });
const exportDensity = () => format === 'email' ? 1 : 2;

for (const [index, model] of EMAIL_COMPOSITIONS.entries()) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'composition-choice';
  button.dataset.composition = model.id;
  const image = new Image(); image.src = model.thumbnail;
  image.srcset = model.thumbnail.replace('.png', '@2x.png') + ' 2x';
  image.width = model.width; image.height = model.height; image.alt = ''; image.decoding = 'async';
  const label = document.createElement('span'); label.className = 'model-name'; label.textContent = '0' + (index + 1) + ' / ' + model.label;
  const size = document.createElement('span'); size.className = 'model-size'; size.textContent = model.width + ' × ' + model.height + ' px';
  button.append(image, label, size);
  button.addEventListener('click', () => {
    pauseMotion(); composition = model.id; format = 'email';
    if (!customColors) colors = defaults();
    const url = new URL(location.href); url.searchParams.set('modelo', model.id); url.searchParams.delete('formato'); history.replaceState(null, '', url);
    update();
  });
  document.getElementById('compositionOptions').append(button);
}
for (const group of document.querySelectorAll('[data-color-palette]')) {
  const key = group.dataset.colorPalette;
  for (const color of CARD_COLORS) {
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.colorKey = key; button.dataset.colorValue = color.value;
    button.title = color.name + ' · ' + color.value;
    button.setAttribute('aria-label', group.querySelector('.color-options').getAttribute('aria-label') + ': ' + color.name);
    const swatch = document.createElement('span'); swatch.style.backgroundColor = color.value; swatch.setAttribute('aria-hidden', 'true'); button.append(swatch);
    button.addEventListener('click', () => { customColors = true; colors[key] = color.value; update(); });
    group.querySelector('.color-options').append(button);
  }
}
function updateColors() {
  for (const button of document.querySelectorAll('[data-color-key]')) button.setAttribute('aria-pressed', String(colors[button.dataset.colorKey] === button.dataset.colorValue));
  for (const group of document.querySelectorAll('[data-color-palette]')) group.querySelector('output').textContent = CARD_COLORS.find(color => color.value === colors[group.dataset.colorPalette]).name;
  const ratio = cardContrast(colors), notices = [], footer = format === 'email' && composition === 'mattar-faixa';
  if (ratio.text < 4.5) notices.push('Pouco contraste entre texto e fundo (' + ratio.text.toFixed(1).replace('.', ',') + ':1).');
  if (footer && ratio.motion < 4.5) notices.push('Pouco contraste do texto e da marca na faixa.');
  else if (!footer && ratio.motion < 3) notices.push('Pouco contraste entre a forma e o fundo.');
  const output = document.getElementById('colorStatus'); output.textContent = notices.join(' ') || 'Contraste adequado para leitura.'; output.classList.toggle('warning', notices.length > 0);
}
function say(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
function showErrors(errors) {
  for (const key of fields) {
    document.getElementById(key + 'Error').textContent = errors[key] || '';
    form.elements.namedItem(key).setAttribute('aria-invalid', String(Boolean(errors[key])));
  }
}
function controls() {
  const canAnimate = card ? card.canAnimate : format === 'card' || emailComposition(composition).motion;
  toggle.hidden = !canAnimate; toggle.disabled = working;
  document.getElementById('downloadMotion').hidden = !canAnimate;
  document.getElementById('downloadMotion').disabled = working || !canAnimate;
  document.getElementById('downloadPNG').classList.toggle('primary', !canAnimate);
  toggle.textContent = paused ? 'REPRODUZIR MOTION ▷' : 'PAUSAR MOTION Ⅱ';
  toggle.setAttribute('aria-pressed', String(paused));
}
function pauseMotion() {
  paused = true; video?.pause(); cancelAnimationFrame(frameHandle); frameHandle = 0;
  if (card?.format === 'email') card.reset();
  controls();
}
function animate() {
  frameHandle = 0;
  if (!paused && video && !video.paused && card?.canAnimate) {
    card.draw(video); frameHandle = requestAnimationFrame(animate);
  }
}
async function ensureVideo() {
  if (video) return video;
  videoPromise ||= loadCardVideo().then(source => { video = source; video.loop = true; return source; }).catch(error => { videoPromise = null; throw error; });
  return videoPromise;
}
async function update() {
  const ticket = ++generation, value = read(), isExample = !fields.some(key => value[key]), size = cardSize(options());
  document.getElementById('exampleLabel').textContent = isExample ? 'DADOS DE EXEMPLO' : 'COM SEUS DADOS';
  picker.hidden = format !== 'email';
  for (const button of document.querySelectorAll('button[data-format]')) button.setAttribute('aria-pressed', String(button.dataset.format === format));
  for (const button of document.querySelectorAll('button[data-composition]')) button.setAttribute('aria-pressed', String(button.dataset.composition === composition));
  document.getElementById('emailFormatSize').textContent = emailComposition(composition).width + ' × ' + emailComposition(composition).height;
  stage.dataset.format = format; mount.style.width = size.width + 'px'; updateColors();
  document.getElementById('formatNote').textContent = format === 'email'
    ? emailComposition(composition).label + ' · ' + size.width + ' × ' + size.height + ' px'
    : 'Mais espaço para a apresentação da marca e de quem faz parte dela.';
  document.getElementById('exportDescription').textContent = format === 'email'
    ? 'Tamanho de uso: ' + size.width + ' × ' + size.height + ' px · Alta: ' + size.width * 2 + ' × ' + size.height * 2 + ' px'
    : 'Cartão digital · 960 × 560 px';
  document.getElementById('downloadPNGHigh').hidden = format !== 'email';
  document.getElementById('previewNote').textContent = format === 'email' && !emailComposition(composition).motion
    ? 'Este modelo usa a assinatura MATTAR fixa. O PNG preserva a composição completa com seus dados.'
    : 'O PNG mantém a composição fixa. O GIF mantém os dados visíveis enquanto o M se transforma.';
  try {
    const next = await createCard(isExample ? example : value, options());
    if (format === 'card') { const source = await ensureVideo(); next.draw(source); }
    else if (!paused && video?.readyState >= 2 && next.canAnimate) next.draw(video);
    if (ticket !== generation) return;
    card = next;
    if (!card.canAnimate) pauseMotion();
    mount.replaceChildren(card.canvas); mount.setAttribute('aria-label', signatureText(isExample ? example : value).replace(/\n+/g, '. '));
    stage.dataset.composition = format === 'email' ? composition : 'card';
    stage.dataset.ready = 'true'; controls();
    const errors = validated ? { ...validateSignature(value), ...card.layout.errors } : card.layout.errors;
    showErrors(errors);
    if (!working) say(Object.keys(errors).length && !validated ? 'O texto precisa caber na composição antes de exportar.' : '');
  } catch (error) { say(error.message, true); previewLoading.textContent = 'A COMPOSIÇÃO NÃO CARREGOU. RECARREGUE A PÁGINA.'; }
}
function valid() {
  validated = true;
  const errors = { ...validateSignature(read()), ...card?.layout.errors };
  showErrors(errors);
  if (!card || Object.keys(errors).length) {
    if (Object.keys(errors).length) form.elements.namedItem(Object.keys(errors)[0]).focus();
    say('Confira os campos indicados antes de exportar.', true); return false;
  }
  return true;
}
function busy(active) {
  working = active;
  for (const input of document.querySelectorAll('input, button[data-format], button[data-composition], button[data-color-key], #resetColors, #downloadMotion, #downloadPNG, #downloadPNGHigh, #downloadHTML, #downloadContact, #copyText')) input.disabled = active;
  form.setAttribute('aria-busy', String(active));
  document.querySelector('.export-progress').hidden = !active || !controller;
  controls();
}
function download(blob, extension, value = read(), selection = options()) {
  const slug = value.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  const model = selection.format === 'email' ? '-' + selection.composition + (selection.density === 2 ? '-alta' : '') : '';
  anchor.href = url; anchor.download = 'mattar-' + slug + '-' + selection.format + model + '.' + extension; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function sizeLabel(blob) { return blob.size < 1024 * 1024 ? Math.round(blob.size / 1024) + ' KB' : (blob.size / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; }
async function poster(value, selection) {
  const result = await createCard(value, selection);
  const errors = { ...validateSignature(value), ...result.layout.errors };
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  if (selection.format === 'email') return canvasBlob(result.canvas);
  const source = await loadCardVideo();
  try { await seekCardVideo(source, 0); result.draw(source); return await canvasBlob(result.canvas); }
  finally { source.removeAttribute('src'); source.load(); }
}
async function downloadPNG(high = false) {
  if (!valid() || working) return;
  const value = read(), selection = options(high ? 2 : exportDensity()); busy(true);
  try {
    const blob = await poster(value, selection); download(blob, 'png', value, selection);
    const size = cardSize(selection); say('PNG pronto · ' + size.width * selection.density + ' × ' + size.height * selection.density + ' px · ' + sizeLabel(blob) + '.');
  } catch (error) { say(error.message, true); } finally { busy(false); }
}
form.addEventListener('input', update);
for (const button of document.querySelectorAll('button[data-format]')) button.addEventListener('click', () => {
  pauseMotion(); format = button.dataset.format;
  if (!customColors) colors = defaults();
  const url = new URL(location.href); if (format === 'card') url.searchParams.set('formato', 'card'); else url.searchParams.delete('formato'); history.replaceState(null, '', url); update();
});
document.getElementById('resetColors').addEventListener('click', () => { customColors = false; colors = defaults(); update(); });
toggle.addEventListener('click', async () => {
  if (working || !card?.canAnimate) return;
  if (!paused) { pauseMotion(); return; }
  try {
    const source = await ensureVideo(); await seekCardVideo(source, 0);
    paused = false; await source.play(); animate();
  } catch (error) { paused = true; say(error.message, true); }
  controls();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!card?.canAnimate) { await downloadPNG(); return; }
  if (!valid() || working) return;
  const value = read(), selection = options(exportDensity()); controller = new AbortController(); busy(true); progress.value = 0;
  say('Preparando o GIF personalizado…');
  let reported = -1;
  try {
    const blob = await exportCardGIF(value, selection, { signal: controller.signal, progress: fraction => {
      progress.value = Math.round(fraction * 100);
      const step = Math.floor(fraction * 10);
      if (step !== reported) { reported = step; say('Gerando seu GIF · ' + Math.round(fraction * 100) + '%'); }
    } });
    download(blob, 'gif', value, selection); say('GIF personalizado pronto · ' + sizeLabel(blob) + '. Nome e contatos fazem parte da imagem.');
  } catch (error) { say(error.name === 'AbortError' ? 'Exportação cancelada. Seus dados continuam na página.' : error.message, error.name !== 'AbortError'); }
  finally { controller = null; busy(false); }
});
document.getElementById('cancelExport').addEventListener('click', () => controller?.abort());
document.getElementById('downloadPNG').addEventListener('click', () => downloadPNG());
document.getElementById('downloadPNGHigh').addEventListener('click', () => downloadPNG(true));
document.getElementById('downloadHTML').addEventListener('click', async () => {
  if (!valid() || working) return;
  busy(true); const value = read(), selection = options();
  try {
    const image = await poster(value, selection);
    const imageURL = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(image); });
    download(new Blob([cardDocument(value, { ...selection, imageURL })], { type: 'text/html;charset=utf-8' }), 'html', value, selection);
    say('Cartão HTML pronto, com a imagem incorporada e links de contato. Abre também offline.');
  } catch (error) { say(error.message, true); } finally { busy(false); }
});
document.getElementById('downloadContact').addEventListener('click', () => {
  if (!valid() || working) return; download(new Blob([cardContact(read())], { type: 'text/vcard;charset=utf-8' }), 'vcf'); say('Contato pronto para salvar na agenda.');
});
document.getElementById('copyText').addEventListener('click', async () => {
  if (!valid() || working) return;
  try { await navigator.clipboard.writeText(signatureText(read())); say('Contatos copiados em texto.'); }
  catch { say('O navegador bloqueou a cópia. Você pode usar os contatos do cartão HTML.', true); }
});
controls();
update();
