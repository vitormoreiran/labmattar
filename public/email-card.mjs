import { normalizeSignature, validateSignature, signatureText } from './email-signature.mjs';
import { motionInkPixels } from './lab-motion-ink.mjs';
import { emailComposition, signatureLayout, paintSignature, paintNativeMark } from './email-compositions.mjs?v=simples-20261117';

// A single composition drives the preview, PNG and GIF. Native brand geometry
// and the approved film are fitted uniformly; no editable scale per axis.
export const CARD_FORMATS = Object.freeze({
  card: { label: 'Cartão digital', width: 480, height: 280 },
  email: { label: 'Assinatura de e-mail', width: 480, height: 100 }
});
export function cardSize({ format = 'card', composition = 'm-horizontal' } = {}) {
  if (format === 'email') { const model = emailComposition(composition); return { width: model.width, height: model.height }; }
  if (format !== 'card') throw Error('Formato desconhecido.');
  return { width: CARD_FORMATS.card.width, height: CARD_FORMATS.card.height };
}
export const CARD_THEMES = Object.freeze({
  blue: { label: 'Azul + verde', paper: '#1F3554', ink: '#F7F6F2', accent: '#8FD81B' },
  paper: { label: 'Papel + vermelho', paper: '#F7F6F2', ink: '#181818', accent: '#E22E24' }
});
export const CARD_COLORS = Object.freeze([
  { name: 'Papel', value: '#F7F6F2' }, { name: 'Branco', value: '#FFFFFF' },
  { name: 'Preto', value: '#181818' }, { name: 'Bege', value: '#E6DBCF' },
  { name: 'Verde', value: '#8FD81B' }, { name: 'Vermelho', value: '#E22E24' },
  { name: 'Azul', value: '#1F3554' }, { name: 'Marrom', value: '#5B463E' }
]);
export function resolveCardColors(theme = 'paper', custom = {}) {
  if (!CARD_THEMES[theme]) throw Error('Composição desconhecida.');
  const result = { ...CARD_THEMES[theme] };
  for (const key of ['paper', 'ink', 'accent']) {
    if (custom[key] === undefined) continue;
    if (!CARD_COLORS.some(color => color.value === custom[key])) throw Error('Escolha uma das cores da marca.');
    result[key] = custom[key];
  }
  return result;
}
export function cardContrast(colors) {
  const luminance = hex => {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const ratio = (first, second) => { const a = luminance(first), b = luminance(second); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  return { text: ratio(colors.ink, colors.paper), motion: ratio(colors.accent, colors.paper) };
}
export const CARD_MOTION = Object.freeze({
  source: '/motion/videos/m-form.mp4', duration: 10.8, fps: 20,
  crop: { x: 76, y: 192, width: 928, height: 696 },
  // Full ink bounds of all 216 frames, with 2 px of source padding. This
  // keeps the approved large M aligned when its still poster starts moving.
  publishedCrop: { x: 102, y: 210, width: 876, height: 660 }
});
export function containedMotionRect(crop, area, density = 1) {
  const scale = Math.min(area.width * density / crop.width, area.height * density / crop.height);
  const width = crop.width * scale, height = crop.height * scale;
  return { x: (area.width * density - width) / 2, y: (area.height * density - height) / 2, width, height };
}

const canvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
const font = (context, size) => { context.font = '300 ' + size + 'px UniversMattar'; context.textBaseline = 'top'; };
let resources;
export function cardResources() {
  return resources ||= (async () => {
    await document.fonts.load('300 30px UniversMattar');
    if (!document.fonts.check('300 30px UniversMattar')) throw Error('Não foi possível carregar a fonte da marca.');
    const logo = new Image(); logo.src = '/presentation-assets/mattar-published.svg';
    const m = new Image(); m.src = '/identidade/M.svg';
    const mPublished = new Image(); mPublished.src = '/ambiente-editorial/media/m-publicado.svg';
    await Promise.all([logo.decode(), m.decode(), mPublished.decode()]);
    return { logo, m, mPublished };
  })().catch(error => { resources = null; throw error; });
}

function lines(context, text, width, size) {
  font(context, size);
  const result = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = result.length ? result.at(-1) + ' ' + word : word;
    if (result.length && context.measureText(candidate).width <= width) result[result.length - 1] = candidate;
    else result.push(word);
  }
  return result;
}

export function cardLayout(data, { format = 'card', composition = 'm-horizontal', context } = {}) {
  const value = normalizeSignature(data), compact = format === 'email';
  context ||= canvas(1, 1).getContext('2d');
  if (compact) return signatureLayout(value, { composition, context });
  const titleSize = 30, titleLine = 32, nameWidth = 276;
  const name = lines(context, value.name, nameWidth, titleSize);
  const role = lines(context, value.role, 276, 14);
  const errors = {};
  const exceeds = (text, size, width) => { font(context, size); return context.measureText(text).width > width; };
  if (name.length > 2 || name.some(line => exceeds(line, titleSize, nameWidth))) errors.name = 'Use um nome de apresentação que ocupe até duas linhas.';
  if (role.length > 2 || role.some(line => exceeds(line, 14, 276))) errors.role = 'Abrevie a função para até duas linhas.';
  if (exceeds(value.email, 14, 432)) errors.email = 'O e-mail ultrapassa a área de leitura desta composição.';
  if (exceeds(value.phone, 14, 255)) errors.phone = 'Abrevie o telefone sem retirar DDD ou código do país.';
  return { value, compact, name, role, titleSize, titleLine, errors,
    nameX: 24, nameY: 94,
    roleY: Math.max(140, 94 + name.length * titleLine + 10),
    motion: { x: 310, y: 83, width: 148, height: 111 }
  };
}

export async function createCard(data, { format = 'card', composition = 'm-horizontal', theme = 'paper', colors: customColors, density = 2 } = {}) {
  if (!CARD_FORMATS[format] || !CARD_THEMES[theme]) throw Error('Composição desconhecida.');
  if (!Number.isInteger(density) || density < 1 || density > 4) throw Error('Resolução de desenho inválida.');
  const resources = await cardResources();
  const dimensions = cardSize({ format, composition }), colors = resolveCardColors(theme, customColors);
  if (format === 'email' && theme === 'paper' && customColors?.paper === undefined) colors.paper = emailComposition(composition).paper;
  const target = canvas(dimensions.width * density, dimensions.height * density);
  const context = target.getContext('2d', { willReadFrequently: true });
  context.scale(density, density);
  const layout = cardLayout(data, { format, composition, context });
  const { value, compact } = layout;
  if (compact) {
    paintSignature(context, layout, colors, resources, { includeM: false });
  } else {
    context.fillStyle = colors.paper; context.fillRect(0, 0, dimensions.width, dimensions.height);
    context.fillStyle = colors.ink;
    const text = (label, x, y, size, align = 'left') => { font(context, size); context.textAlign = align; context.fillText(label, x, y); };
    paintNativeMark(context, resources.logo, { x: 24, y: 22, width: 122, height: 122 * 179.77 / 954.32 }, colors.ink);
    text('GASTROPERFORMANCE', 456, 29, 10, 'right');
    context.globalAlpha = .3; context.fillRect(24, 62, 432, .5); context.fillRect(24, 204, 432, .5); context.globalAlpha = 1;
    layout.name.slice(0, 2).forEach((line, index) => text(line, layout.nameX, layout.nameY + index * layout.titleLine, layout.titleSize));
    layout.role.slice(0, 2).forEach((line, index) => text(line, layout.nameX, layout.roleY + index * 18, 14));
    text(value.email, 24, 218, 14);
    if (value.phone) text(value.phone, 24, 244, 14);
    text('labmattar.com', 456, 244, 14, 'right');
  }
  const base = canvas(target.width, target.height); base.getContext('2d').drawImage(target, 0, 0);
  if (compact && layout.motion) paintNativeMark(context, layout.mark.source === 'published' ? resources.mPublished : resources.m, layout.mark, colors.accent);
  const poster = canvas(target.width, target.height); poster.getContext('2d').drawImage(target, 0, 0);
  const area = layout.motion;
  const ink = area ? canvas(Math.ceil(area.width * density), Math.ceil(area.height * density)) : null;
  const inkContext = ink?.getContext('2d', { willReadFrequently: true });
  const rgb = colors.accent.slice(1).match(/../g).map(value => parseInt(value, 16));
  return {
    canvas: target, base, layout, colors, format, composition, theme, density, size: dimensions, canAnimate: Boolean(area),
    reset() { context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(poster, 0, 0); },
    draw(video) {
      if (!area) return;
      // Contain the complete crop using one scale. The new M rectangles have
      // a different aspect ratio from the 4:3 film; stretching is forbidden.
      const c = compact && layout.mark.source === 'published' ? CARD_MOTION.publishedCrop : CARD_MOTION.crop;
      const fit = containedMotionRect(c, area, density);
      inkContext.clearRect(0, 0, ink.width, ink.height);
      inkContext.drawImage(video, c.x, c.y, c.width, c.height, fit.x, fit.y, fit.width, fit.height);
      const pixels = inkContext.getImageData(0, 0, ink.width, ink.height); motionInkPixels(pixels.data);
      for (let i = 0; i < pixels.data.length; i += 4) {
        pixels.data[i] = rgb[0]; pixels.data[i + 1] = rgb[1]; pixels.data[i + 2] = rgb[2];
      }
      inkContext.putImageData(pixels, 0, 0);
      context.setTransform(1, 0, 0, 1, 0, 0); context.drawImage(base, 0, 0);
      context.drawImage(ink, area.x * density, area.y * density);
    }
  };
}

export async function loadCardVideo() {
  const video = document.createElement('video');
  video.muted = true; video.defaultMuted = true; video.playsInline = true; video.preload = 'auto';
  video.src = CARD_MOTION.source;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('O filme aprovado não carregou. Tente novamente.')), 30000);
    video.addEventListener('loadeddata', () => { clearTimeout(timer); resolve(); }, { once: true });
    video.addEventListener('error', () => { clearTimeout(timer); reject(Error('Não foi possível abrir o filme aprovado.')); }, { once: true });
  });
  return video;
}

export async function seekCardVideo(video, time) {
  if (Math.abs(video.currentTime - time) < .00001 && video.readyState >= 2) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(Error('Não foi possível ler um quadro do motion.')); }, 10000);
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(Error('Falha ao decodificar o motion.')); };
    function cleanup() { clearTimeout(timer); video.removeEventListener('seeked', done); video.removeEventListener('error', failed); }
    video.addEventListener('seeked', done, { once: true }); video.addEventListener('error', failed, { once: true }); video.currentTime = time;
  });
}

export const canvasBlob = target => new Promise((resolve, reject) => target.toBlob(blob => blob ? resolve(blob) : reject(Error('Não foi possível gerar a imagem.')), 'image/png'));
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
function cardPalette(colors) {
  const background = rgb(colors.paper), foreground = rgb(colors.ink), accent = rgb(colors.accent);
  const palette = [background, foreground, accent];
  for (const target of [foreground, accent]) for (let step = 1; step <= 126; step++) {
    const alpha = step / 127;
    palette.push(background.map((channel, index) => Math.round(channel + (target[index] - channel) * alpha)));
  }
  // Index 255 is reserved for unchanged pixels in subsequent frames.
  return palette;
}

export async function exportCardGIF(data, options, { progress = () => {}, signal } = {}) {
  if (signal?.aborted) throw new DOMException('Exportação cancelada.', 'AbortError');
  const { GIFEncoder, applyPalette } = await import('./vendor/gifenc/gifenc-1.0.3.mjs');
  const card = await createCard(data, options);
  const errors = { ...validateSignature(data), ...card.layout.errors };
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  if (!card.canAnimate) {
    const gif = GIFEncoder(), context = card.canvas.getContext('2d');
    const pixels = applyPalette(context.getImageData(0, 0, card.canvas.width, card.canvas.height).data, cardPalette(card.colors));
    gif.writeFrame(pixels, card.canvas.width, card.canvas.height, { palette: cardPalette(card.colors), delay: 1000, repeat: -1 });
    gif.finish(); progress(1); return new Blob([gif.bytes()], { type: 'image/gif' });
  }
  const video = await loadCardVideo();
  const gif = GIFEncoder(), palette = cardPalette(card.colors);
  const width = card.canvas.width, height = card.canvas.height;
  const context = card.canvas.getContext('2d', { willReadFrequently: true });
  let previous = null, pending = null, pendingDelay = 0, written = 0;
  const write = () => {
    if (!pending) return;
    gif.writeFrame(pending, width, height, { ...(written === 0 ? { palette } : { transparent: true, transparentIndex: 255 }), delay: pendingDelay, repeat: 2, dispose: 1 });
    written++;
  };
  try {
    const frames = Math.round(CARD_MOTION.duration * CARD_MOTION.fps);
    for (let index = 0; index < frames; index++) {
      if (signal?.aborted) throw new DOMException('Exportação cancelada.', 'AbortError');
      await seekCardVideo(video, index / CARD_MOTION.fps);
      if (index === 0 && card.format === 'email') card.reset(); else card.draw(video);
      const current = applyPalette(context.getImageData(0, 0, width, height).data, palette);
      let changed = !previous;
      const delta = new Uint8Array(current);
      if (previous) for (let pixel = 0; pixel < current.length; pixel++) {
        if (current[pixel] === previous[pixel]) delta[pixel] = 255;
        else changed = true;
      }
      if (!changed) pendingDelay += 1000 / CARD_MOTION.fps;
      else { write(); pending = delta; pendingDelay = 1000 / CARD_MOTION.fps; }
      previous = current;
      progress((index + 1) / frames);
      // Let keyboard, progress announcements and cancellation remain responsive.
      if (index % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    write(); gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  } finally { video.pause(); video.removeAttribute('src'); video.load(); }
}

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const emailIcon = (kind, color) => {
  const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if (kind === 'instagram') return '<svg ' + common + '><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.8h.01"/></svg>';
  if (kind === 'whatsapp') return '<svg ' + common + '><path d="M20.2 11.7a8.1 8.1 0 0 1-11.9 7.1L4 20l1.2-4.1A8.1 8.1 0 1 1 20.2 11.7Z"/><path d="M8.7 8.5c.2-.5.5-.5.7-.5h.6c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4 0 .6l-.5.7c.5 1 1.3 1.8 2.3 2.3l.7-.5c.2-.1.4-.1.6 0l1.7.7c.3.1.4.3.4.5v.6c0 .3 0 .5-.5.7-.5.2-1.3.3-2.4-.2-2.1-.9-3.7-2.5-4.6-4.6-.5-1.1-.4-1.9-.2-2.4Z"/></svg>';
  return '<svg ' + common + '><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8.5 10v6M8.5 7.5v.1M12 16v-3.4a2.6 2.6 0 0 1 5.2 0V16M12 12a2.6 2.6 0 0 1 2.6-2.3"/></svg>';
};
const safeEmailUrl = value => {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : ''; }
  catch { return ''; }
};
export function cardDocument(data, { imageURL, format = 'card', composition = 'm-horizontal', colors = {}, channels = {} }) {
  const value = normalizeSignature(data), size = cardSize({ format, composition });
  const phone = value.phone.replace(/[^+\d]/g, ''), accent = colors.accent || '#E22E24';
  const channelLinks = [['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['linkedin', 'LinkedIn']]
    .map(([key, label]) => { const href = safeEmailUrl(channels[key] || ''); return href ? '<a href="' + escape(href) + '" title="' + label + '" aria-label="' + label + '" style="display:inline-block;margin-right:10px;text-decoration:none;vertical-align:middle">' + emailIcon(key, accent) + '</a>' : ''; }).join('');
  const privacyHref = safeEmailUrl(channels.privacyUrl || '');
  const privacyLink = privacyHref ? '<a href="' + escape(privacyHref) + '" style="color:#626058;text-decoration:underline">PRIVACY POLICY / POLÍTICA DE PRIVACIDADE · PT</a>' : 'PRIVACY POLICY / POLÍTICA DE PRIVACIDADE · PT';
  const contact = '<p style="margin:10px 0 0;font:14px/1.5 Arial,sans-serif"><a href="mailto:' + escape(value.email) + '">' + escape(value.email) + '</a>' + (phone ? ' · <a href="tel:' + escape(phone) + '">' + escape(value.phone) + '</a>' : '') + ' · <a href="https://labmattar.com/">labmattar.com</a></p>';
  const channelsMarkup = channelLinks ? '<p style="margin:10px 0 0;line-height:18px">' + channelLinks + '</p>' : '';
  const privacy = '<p style="max-width:' + size.width + 'px;margin:14px 0 0;color:#626058;font:10px/1.45 Arial,sans-serif">Esta mensagem e seus anexos são confidenciais e destinados exclusivamente ao destinatário. Se recebida por engano, avise o remetente e elimine-a. Tratamos dados conforme a LGPD.<br>' + privacyLink + '</p>';
  return '<!doctype html>\n<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartão MATTAR — ' + escape(value.name) + '</title><body style="margin:24px;background:#fff;color:#181818;font:14px/1.6 Arial,sans-serif"><main style="max-width:' + size.width + 'px"><a href="https://labmattar.com/"><img src="' + escape(imageURL) + '" width="' + size.width + '" height="' + size.height + '" alt="' + escape(signatureText(value).replace(/\n+/g, ' · ')) + '" style="display:block;width:100%;height:auto;border:0"></a>' + contact + channelsMarkup + privacy + '</main></body></html>\n';
}

export function cardContact(data) {
  const value = normalizeSignature(data);
  const v = text => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  return ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + v(value.name), 'N:;' + v(value.name) + ';;;', 'ORG:LABMATTAR', ...(value.role ? ['TITLE:' + v(value.role)] : []), 'EMAIL;TYPE=WORK:' + v(value.email), ...(value.phone ? ['TEL;TYPE=WORK:' + v(value.phone)] : []), 'URL:https://labmattar.com/', 'END:VCARD', ''].join('\r\n');
}
