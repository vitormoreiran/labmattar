import { EXAMPLE, MOTION_URL, POSTER_URL, signatureHTML, signatureText, signatureDocument, normalizeSignature, validateSignature } from './email-signature.mjs';

const form = document.getElementById('signatureForm');
const preview = document.getElementById('signaturePreview');
const status = document.getElementById('status');
const label = document.getElementById('exampleLabel');
const copyButton = document.getElementById('copySignature');
const fields = ['name', 'role', 'email', 'phone'];
const useMotion = document.getElementById('useMotion');
const togglePreview = document.getElementById('togglePreview');
useMotion.checked = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let previewPaused = !useMotion.checked;
let previewCycle = 0;
let validated = false;
const options = () => ({ animated: useMotion.checked });

function read() { return normalizeSignature(Object.fromEntries(fields.map(key => [key, form.elements.namedItem(key).value]))); }
function say(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
function showErrors(errors) {
  for (const key of ['name', 'email', 'phone']) {
    document.getElementById(key + 'Error').textContent = errors[key] || '';
    form.elements.namedItem(key).setAttribute('aria-invalid', String(Boolean(errors[key])));
  }
}
function update() {
  const value = read(), example = !fields.some(key => value[key]);
  const image = useMotion.checked && !previewPaused ? MOTION_URL : POSTER_URL;
  const localImage = new URL(new URL(image).pathname, location.href);
  if (image === MOTION_URL) localImage.searchParams.set('preview', String(previewCycle));
  const imageURL = localImage.href;
  const previous = preview.querySelector('img');
  preview.innerHTML = signatureHTML(example ? EXAMPLE : value, { imageURL });
  const current = preview.querySelector('img');
  if (previous?.src === current.src) current.replaceWith(previous);
  togglePreview.disabled = !useMotion.checked;
  togglePreview.textContent = previewPaused ? 'REINICIAR PRÉVIA' : 'PAUSAR PRÉVIA';
  label.textContent = example ? 'EXEMPLO — PREENCHA SEUS DADOS' : 'SUA ASSINATURA';
  if (validated) showErrors(validateSignature(value));
  say('');
}
function valid() {
  validated = true;
  const errors = validateSignature(read());
  showErrors(errors);
  if (Object.keys(errors).length) {
    form.elements.namedItem(Object.keys(errors)[0]).focus();
    say('Confira os campos indicados antes de copiar ou baixar.', true);
    return false;
  }
  return true;
}
function select() {
  preview.tabIndex = -1;
  preview.focus({ preventScroll: true });
  const range = document.createRange(); range.selectNodeContents(preview);
  const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
}
function legacyCopy() {
  select();
  const copy = event => {
    event.clipboardData.setData('text/html', signatureHTML(read(), options()));
    event.clipboardData.setData('text/plain', signatureText(read()));
    event.preventDefault();
  };
  document.addEventListener('copy', copy);
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Keep the selection for manual copying. */ }
  finally { document.removeEventListener('copy', copy); }
  return copied;
}
async function copySignature() {
  if (!valid()) return;
  copyButton.disabled = true;
  try {
    if (navigator.clipboard?.write && globalThis.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([signatureHTML(read(), options())], { type: 'text/html' }),
          'text/plain': new Blob([signatureText(read())], { type: 'text/plain' })
        })]);
      } catch { if (!legacyCopy()) throw Error('manual'); }
    } else if (!legacyCopy()) throw Error('manual');
    say('Assinatura copiada. Agora cole na caixa de assinatura do Gmail.');
  } catch {
    select();
    say('A assinatura está selecionada. Copie com Ctrl+C ou ⌘C e cole no Gmail.');
  } finally { copyButton.disabled = false; }
}
form.addEventListener('input', update);
useMotion.addEventListener('change', () => { previewPaused = !useMotion.checked; previewCycle++; update(); });
togglePreview.addEventListener('click', () => { previewPaused = !previewPaused; previewCycle++; update(); });
form.addEventListener('submit', event => { event.preventDefault(); copySignature(); });
document.getElementById('copyText').addEventListener('click', async () => {
  if (!valid()) return;
  try { await navigator.clipboard.writeText(signatureText(read())); say('Versão em texto copiada.'); }
  catch { say('A cópia em texto foi bloqueada pelo navegador. Use Copiar assinatura ou baixe o HTML.', true); }
});
document.getElementById('selectSignature').addEventListener('click', () => {
  if (!valid()) return;
  select(); say('Copie com Ctrl+C ou ⌘C. Depois cole na assinatura do Gmail.');
});
// Manual copying also uses the public logo URL, including in the local preview.
document.addEventListener('copy', event => {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !preview.contains(selection.anchorNode) || !preview.contains(selection.focusNode)) return;
  if (Object.keys(validateSignature(read())).length) return;
  event.clipboardData.setData('text/html', signatureHTML(read(), options()));
  event.clipboardData.setData('text/plain', signatureText(read())); event.preventDefault();
});
document.getElementById('downloadHTML').addEventListener('click', () => {
  if (!valid()) return;
  const value = read();
  const file = 'assinatura-mattar-' + value.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.html';
  const url = URL.createObjectURL(new Blob([signatureDocument(value, options())], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = file; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  say('HTML baixado. Abra o arquivo no navegador para consultar a assinatura.');
});
document.getElementById('downloadMotion').addEventListener('click', async () => {
  try {
    const response = await fetch(new URL(MOTION_URL).pathname);
    if (!response.ok) throw Error('GIF unavailable');
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mattar-onda.gif'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    say('Motion baixado. O GIF pode ser inserido na assinatura pelo próprio Gmail.');
  } catch { say('Não foi possível baixar o motion. Tente novamente.', true); }
});
update();
