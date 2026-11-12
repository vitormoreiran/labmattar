import { normalizeSignature } from './email-signature.mjs';

// All four email compositions use the former 480 × 100 px strip. Elements are
// recomposed at this size; native marks and contact text never stretch to fit.
export const EMAIL_COMPOSITIONS = Object.freeze([
  { id: 'm-horizontal', label: 'M horizontal', width: 480, height: 100, motion: true, paper: '#F7F6F2', thumbnail: '/identidade/email/modelos/01-m-horizontal.png' },
  { id: 'm-compacto', label: 'M compacto', width: 480, height: 100, motion: true, paper: '#F7F6F2', thumbnail: '/identidade/email/modelos/02-m-compacto.png' },
  { id: 'mattar-faixa', label: 'MATTAR na faixa', width: 480, height: 100, motion: false, paper: '#F7F6F2', thumbnail: '/identidade/email/modelos/03-mattar-faixa.png' },
  { id: 'm-linha', label: 'M com linha', width: 480, height: 100, motion: true, paper: '#FFFFFF', thumbnail: '/identidade/email/modelos/04-m-linha.png' }
].map(Object.freeze));

export function emailComposition(id = EMAIL_COMPOSITIONS[0].id) {
  const composition = EMAIL_COMPOSITIONS.find(item => item.id === id);
  if (!composition) throw Error('Escolha uma das quatro composições de assinatura.');
  return composition;
}

export function emailDefaultColors(id) {
  return { paper: emailComposition(id).paper, ink: '#181818', accent: '#E22E24' };
}

const setFont = (context, size) => { context.font = '300 ' + size + 'px UniversMattar'; };

function splitName(value, context, width) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [value, ''];
  setFont(context, 18);
  const candidates = words.slice(1).map((_, index) => {
    const first = words.slice(0, index + 1).join(' '), second = words.slice(index + 1).join(' ');
    const a = context.measureText(first).width, b = context.measureText(second).width;
    return { lines: [first, second], overflow: Math.max(0, a - width, b - width), difference: Math.abs(a - b) };
  });
  candidates.sort((a, b) => a.overflow - b.overflow || a.difference - b.difference);
  return candidates[0].lines;
}

export function signatureLayout(data, { composition = 'm-horizontal', context }) {
  const meta = emailComposition(composition), value = normalizeSignature(data);
  const fields = [], errors = {};
  const add = (key, label, x, y, size, maxWidth, color = 'ink', align = 'left') => {
    setFont(context, size);
    if (context.measureText(label).width > maxWidth) {
      errors[key] ||= key === 'name'
        ? (composition === 'm-compacto' ? 'Use um nome de apresentação que caiba em duas linhas.' : 'Abrevie o nome de apresentação ou escolha M compacto, com duas linhas.')
        : key === 'email' ? 'O e-mail não cabe nesta composição. Escolha outro modelo para manter o endereço completo.'
          : key === 'phone' ? 'Confira o telefone completo ou escolha uma composição com mais espaço.'
            : 'Abrevie a função para caber em uma linha.';
    }
    fields.push({ key, label, x, y, size, maxWidth, color, align });
  };
  let mark, divider = null, footer = null, name;
  if (composition === 'm-compacto') {
    name = splitName(value.name, context, 320);
    add('name', name[0], 20, 8, 18, 320);
    add('name', name[1], 20, 29, 18, 320);
    add('role', value.role, 20, 50, 12, 320);
    add('email', value.email, 20, 68, 12, 320);
    add('phone', value.phone, 20, 84, 12, 240);
    add('website', 'labmattar.com', 460, 84, 12, 100, 'ink', 'right');
    mark = { family: 'm', x: 370, y: 8, width: 90, height: 90 * 627 / 822 };
  } else if (composition === 'mattar-faixa') {
    name = [value.name];
    add('name', value.name, 20, 12, 18, 220);
    add('role', value.role, 20, 38, 12, 220);
    add('email', value.email, 270, 14, 12, 190);
    add('phone', value.phone, 270, 38, 12, 190);
    add('website', 'labmattar.com', 460, 79, 12, 100, 'paper', 'right');
    footer = { x: 0, y: 70, width: 480, height: 30 };
    const markHeight = 110 * 179.77 / 954.32;
    mark = { family: 'mattar', x: 20, y: 70 + (30 - markHeight) / 2, width: 110, height: markHeight };
  } else {
    const lined = composition === 'm-linha';
    name = [value.name];
    add('name', value.name, 20, lined ? 12 : 14, 18, lined ? 366 : 320);
    add('role', value.role, 20, lined ? 35 : 38, 12, lined ? 366 : 320);
    add('email', value.email, 20, lined ? 65 : 62, 12, lined ? 440 : 320);
    add('phone', value.phone, 20, 82, 12, 240);
    add('website', 'labmattar.com', 460, 82, 12, 100, lined ? 'accent' : 'ink', 'right');
    mark = lined
      ? { family: 'm', x: 410, y: 7, width: 50, height: 50 * 627 / 822 }
      : { family: 'm', x: 370, y: 10, width: 90, height: 90 * 627 / 822 };
    if (lined) divider = { x: 20, y: 56, width: 440 };
  }
  return { value, compact: true, composition, meta, fields, errors, name, role: [value.role], titleSize: 18, titleLine: 21,
    mark, divider, footer, motion: meta.motion ? mark : null, size: { width: meta.width, height: meta.height } };
}

export function paintNativeMark(context, image, area, color) {
  const density = Math.abs(context.getTransform().a) || 1;
  const width = area.width * density, height = area.height * density;
  const layer = document.createElement('canvas'); layer.width = Math.ceil(width); layer.height = Math.ceil(height);
  const ink = layer.getContext('2d');
  ink.drawImage(image, 0, 0, width, height);
  ink.globalCompositeOperation = 'source-in'; ink.fillStyle = color; ink.fillRect(0, 0, layer.width, layer.height);
  context.drawImage(layer, 0, 0, width, height, area.x, area.y, area.width, area.height);
}

// Fixed alphabetic baselines for Univers at 12/18 px.
// CSS line boxes use different OS font metrics on Windows and Linux. Keep the
// baseline in the composition so the exported layout is independent of the OS.
const TEXT_BASELINES = Object.freeze({ 12: 10, 18: 15 });
function textBaseline(size) {
  const baseline = TEXT_BASELINES[size];
  if (baseline === undefined) throw Error('Tamanho de texto sem alinhamento definido.');
  return baseline;
}

function paintText(context, field, colors) {
  if (!field.label) return;
  setFont(context, field.size);
  const baseline = field.y + textBaseline(field.size);
  context.save();
  context.beginPath();
  context.rect(field.align === 'right' ? field.x - field.maxWidth : field.x, field.y, field.maxWidth, field.size * 1.12);
  context.clip();
  context.textAlign = field.align; context.textBaseline = 'alphabetic'; context.fillStyle = colors[field.color];
  context.fillText(field.label, field.x, baseline);
  context.restore();
}

export function paintSignature(context, layout, colors, resources, { includeM = true } = {}) {
  context.fillStyle = colors.paper; context.fillRect(0, 0, layout.size.width, layout.size.height);
  if (layout.footer) { const f = layout.footer; context.fillStyle = colors.accent; context.fillRect(f.x, f.y, f.width, f.height); }
  if (layout.divider) {
    const d = layout.divider; context.save(); context.globalAlpha = .25; context.fillStyle = colors.ink;
    context.fillRect(d.x, d.y, d.width, .5); context.restore();
  }
  for (const field of layout.fields) paintText(context, field, colors);
  if (layout.mark.family === 'mattar') paintNativeMark(context, resources.logo, layout.mark, colors.paper);
  else if (includeM) paintNativeMark(context, resources.m, layout.mark, colors.accent);
}

