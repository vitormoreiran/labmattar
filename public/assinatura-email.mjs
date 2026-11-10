import { normalizeSignature, validateSignature, signatureText } from './email-signature.mjs';
import { CARD_COLORS, CARD_THEMES, cardContrast, createCard, loadCardVideo, seekCardVideo, canvasBlob, exportCardGIF, cardDocument, cardContact } from './email-card.mjs';

const form = document.getElementById('signatureForm');
const fields = ['name', 'role', 'email', 'phone'];
const mount = document.getElementById('cardMount');
const status = document.getElementById('status');
const stage = document.getElementById('previewStage');
const previewLoading = document.getElementById('previewLoading');
const toggle = document.getElementById('togglePreview');
const progress = document.getElementById('exportProgress');
const example = { name: 'Seu nome', role: 'Função / área', email: 'nome@exemplo.com', phone: '+55 11 99999-9999' };
let format = 'card', card, video, generation = 0, validated = false, controller;
let colors = { paper: CARD_THEMES.paper.paper, ink: CARD_THEMES.paper.ink, accent: CARD_THEMES.paper.accent };
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
const read = () => normalizeSignature(Object.fromEntries(fields.map(key => [key, form.elements.namedItem(key).value])));
const options = () => ({ format, colors: { ...colors }, density: format === 'card' ? 2 : 1 });
for (const group of document.querySelectorAll('[data-color-palette]')) {
  const key = group.dataset.colorPalette;
  for (const color of CARD_COLORS) {
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.colorKey = key; button.dataset.colorValue = color.value;
    button.title = color.name + ' · ' + color.value;
    button.setAttribute('aria-label', group.querySelector('.color-options').getAttribute('aria-label') + ': ' + color.name);
    const swatch = document.createElement('span'); swatch.style.backgroundColor = color.value; swatch.setAttribute('aria-hidden', 'true'); button.append(swatch);
    button.addEventListener('click', () => { colors[key] = color.value; update(); }); group.querySelector('.color-options').append(button);
  }
}
function updateColors() {
  for (const button of document.querySelectorAll('[data-color-key]')) button.setAttribute('aria-pressed', String(colors[button.dataset.colorKey] === button.dataset.colorValue));
  for (const group of document.querySelectorAll('[data-color-palette]')) group.querySelector('output').textContent = CARD_COLORS.find(color => color.value === colors[group.dataset.colorPalette]).name;
  const ratio = cardContrast(colors), notices = [];
  if (ratio.text < 4.5) notices.push('Pouco contraste entre texto e fundo (' + ratio.text.toFixed(1).replace('.', ',') + ':1).');
  if (ratio.motion < 3) notices.push('Pouco contraste entre a forma e o fundo.');
  const output = document.getElementById('colorStatus'); output.textContent = notices.join(' ') || 'Contraste adequado para leitura.'; output.classList.toggle('warning', notices.length > 0);
}
function say(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
function showErrors(errors) {
  for (const key of fields) {
    document.getElementById(key + 'Error').textContent = errors[key] || '';
    form.elements.namedItem(key).setAttribute('aria-invalid', String(Boolean(errors[key])));
  }
}
async function update() {
  const ticket = ++generation;
  const value = read(), isExample = !fields.some(key => value[key]);
  document.getElementById('exampleLabel').textContent = isExample ? 'PREENCHA SEUS DADOS' : 'COM SEUS DADOS';
  for (const button of document.querySelectorAll('[data-format]')) if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.format === format));
  updateColors();
  stage.dataset.format = format;
  document.getElementById('formatNote').textContent = format === 'card' ? 'Mais espaço para a apresentação da marca e de quem faz parte dela.' : 'Formato compacto, com os contatos integrados à imagem. Pronto para o e-mail.';
  document.getElementById('exportDescription').textContent = format === 'card' ? 'Cartão digital · 960 × 560 px' : 'Assinatura de e-mail · 480 × 100 px';
  try {
    const next = await createCard(isExample ? example : value, options());
    if (ticket !== generation) return;
    card = next;
    if (video?.readyState >= 2) card.draw(video);
    mount.replaceChildren(card.canvas);
    mount.setAttribute('aria-label', signatureText(isExample ? example : value).replace(/\n+/g, '. '));
    stage.dataset.ready = String(Boolean(video));
    const errors = validated ? { ...validateSignature(value), ...card.layout.errors } : card.layout.errors;
    showErrors(errors);
    if (!controller) say(Object.keys(errors).length && !validated ? 'O texto precisa caber na composição antes de exportar.' : '');
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
  for (const input of document.querySelectorAll('input, button[data-format], button[data-color-key], #resetColors, #downloadMotion, #downloadPNG, #downloadHTML, #downloadContact, #copyText')) input.disabled = active;
  form.setAttribute('aria-busy', String(active));
  document.querySelector('.export-progress').hidden = !active || !controller;
}
function download(blob, extension, value = read(), selection = options()) {
  const slug = value.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'mattar-' + slug + '-' + selection.format + '-personalizado.' + extension; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function sizeLabel(blob) { return blob.size < 1024 * 1024 ? Math.round(blob.size / 1024) + ' KB' : (blob.size / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; }
async function poster(value, selection) {
  const result = await createCard(value, selection), source = await loadCardVideo();
  try { await seekCardVideo(source, 0); result.draw(source); return await canvasBlob(result.canvas); }
  finally { source.removeAttribute('src'); source.load(); }
}
form.addEventListener('input', update);
for (const button of document.querySelectorAll('button[data-format]')) button.addEventListener('click', () => { format = button.dataset.format; update(); });
document.getElementById('resetColors').addEventListener('click', () => { colors = { paper: CARD_THEMES.paper.paper, ink: CARD_THEMES.paper.ink, accent: CARD_THEMES.paper.accent }; update(); });
function updateToggle() { toggle.textContent = paused ? 'REPRODUZIR MOTION ▷' : 'PAUSAR MOTION Ⅱ'; toggle.setAttribute('aria-pressed', String(paused)); }
toggle.addEventListener('click', async () => {
  if (!video) return;
  paused = !paused;
  if (paused) video.pause(); else try { await video.play(); } catch { paused = true; say('O navegador bloqueou a reprodução. Tente novamente.', true); }
  updateToggle();
});
form.addEventListener('submit', async event => {
  event.preventDefault(); if (!valid() || controller) return;
  const value = read(), selection = options(); controller = new AbortController(); busy(true); progress.value = 0;
  say('Preparando o cartão em movimento…');
  let reported = -1;
  try {
    const blob = await exportCardGIF(value, selection, { signal: controller.signal, progress: fraction => {
      progress.value = Math.round(fraction * 100);
      const step = Math.floor(fraction * 10);
      if (step !== reported) { reported = step; say('Gerando seu GIF · ' + Math.round(fraction * 100) + '%'); }
    } });
    download(blob, 'gif', value, selection);
    say('GIF personalizado pronto · ' + sizeLabel(blob) + '. Nome e contatos fazem parte da imagem.');
  } catch (error) { say(error.name === 'AbortError' ? 'Exportação cancelada. Seus dados continuam na página.' : error.message, error.name !== 'AbortError'); }
  finally { controller = null; busy(false); }
});
document.getElementById('cancelExport').addEventListener('click', () => controller?.abort());
document.getElementById('downloadPNG').addEventListener('click', async () => {
  if (!valid()) return;
  busy(true); const value = read(), selection = options();
  try { const blob = await poster(value, selection); download(blob, 'png', value, selection); say('Imagem fixa pronta · ' + sizeLabel(blob) + '. Mesma composição, com o M no primeiro quadro.'); }
  catch (error) { say(error.message, true); } finally { busy(false); }
});
document.getElementById('downloadHTML').addEventListener('click', async () => {
  if (!valid()) return; busy(true); const value = read(), selection = options();
  try {
    const image = await poster(value, selection);
    const imageURL = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(image); });
    download(new Blob([cardDocument(value, { ...selection, imageURL })], { type: 'text/html;charset=utf-8' }), 'html', value, selection);
    say('Cartão HTML pronto, com a imagem incorporada e links de contato. Abre também offline.');
  } catch (error) { say(error.message, true); } finally { busy(false); }
});
document.getElementById('downloadContact').addEventListener('click', () => {
  if (!valid()) return; download(new Blob([cardContact(read())], { type: 'text/vcard;charset=utf-8' }), 'vcf'); say('Contato pronto para salvar na agenda.');
});
document.getElementById('copyText').addEventListener('click', async () => {
  if (!valid()) return;
  try { await navigator.clipboard.writeText(signatureText(read())); say('Contatos copiados em texto.'); }
  catch { say('O navegador bloqueou a cópia. Você pode usar os contatos do cartão HTML.', true); }
});
async function start() {
  updateToggle();
  await update();
  try {
    video = await loadCardVideo(); video.loop = true; card?.draw(video); stage.dataset.ready = 'true';
    if (!paused) try { await video.play(); } catch { paused = true; updateToggle(); }
    const tick = () => { if (!video.paused && card) card.draw(video); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  } catch (error) { say(error.message, true); }
}
start();
