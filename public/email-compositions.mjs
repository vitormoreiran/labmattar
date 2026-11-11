import { normalizeSignature } from './email-signature.mjs';

// These are the four layouts reviewed as PNGs. Native marks keep their aspect
// ratios; names and contact details never shrink to force a fit.
export const EMAIL_COMPOSITIONS = Object.freeze([
  { id: 'm-horizontal', label: 'M horizontal', width: 360, height: 180, motion: true, paper: '#F7F6F2', thumbnail: '/identidade/email/modelos/01-m-horizontal.png' },
  { id: 'm-compacto', label: 'M compacto', width: 320, height: 160, motion: true, paper: '#F7F6F2', thumbnail: '/identidade/email/modelos/02-m-compacto.png' },
  { id: 'mattar-faixa', label: 'MATTAR na faixa', width: 360, height: 180, motion: false, paper: '#F7F6F2', thumbnail: '/identidade/email/modelos/03-mattar-faixa.png' },
  { id: 'm-linha', label: 'M com linha', width: 360, height: 180, motion: true, paper: '#FFFFFF', thumbnail: '/identidade/email/modelos/04-m-linha.png' }
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
  setFont(context, 22);
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
    name = splitName(value.name, context, 148);
    add('name', name[0], 24, 24, 22, 148);
    add('name', name[1], 24, 50, 22, 148);
    add('role', value.role, 24, 78, 13, 148);
    add('email', value.email, 24, 104, 13, 148);
    add('phone', value.phone, 24, 124, 13, 148);
    add('website', 'labmattar.com', 296, 124, 13, 100, 'ink', 'right');
    mark = { family: 'm', x: 196, y: 124 - 16 - 100 * 627 / 822, width: 100, height: 100 * 627 / 822 };
  } else if (composition === 'mattar-faixa') {
    name = [value.name];
    add('name', value.name, 24, 42, 22, 152);
    add('role', value.role, 24, 70, 13, 152);
    add('email', value.email, 200, 46, 13, 136);
    add('phone', value.phone, 200, 68, 13, 136);
    add('website', 'labmattar.com', 336, 148, 13, 100, 'paper', 'right');
    footer = { x: 0, y: 132, width: 360, height: 48 };
    mark = { family: 'mattar', x: 24, y: 145.37753552267583, width: 100, height: 100 * 179.77 / 954.32 };
  } else {
    const lined = composition === 'm-linha';
    name = [value.name];
    add('name', value.name, 24, 38, 22, lined ? 232 : 188);
    add('role', value.role, 24, 66, 13, lined ? 232 : 188);
    add('email', value.email, 24, 106, 13, lined ? 312 : 188);
    add('phone', value.phone, 24, 126, 13, 188);
    add('website', 'labmattar.com', 336, 126, 13, 100, lined ? 'accent' : 'ink', 'right');
    mark = lined
      ? { family: 'm', x: 280.2208433014354, y: 38, width: 55.77915669856459, height: 42.546875 }
      : { family: 'm', x: 236, y: 38, width: 100, height: 100 * 627 / 822 };
    if (lined) divider = { x: 24, y: 94, width: 312 };
  }
  return { value, compact: true, composition, meta, fields, errors, name, role: [value.role], titleSize: 22, titleLine: 26,
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

const baselines = new Map();
function textBaseline(size) {
  if (baselines.has(size)) return baselines.get(size);
  // Measure the CSS line used in the approved PNGs. Browser font-box rounding
  // differs from canvas fontBoundingBox metrics by up to a pixel.
  const line = document.createElement('span'), marker = document.createElement('i');
  line.style.cssText = 'all:initial;display:block;position:fixed;left:0;top:0;visibility:hidden;white-space:nowrap;font-family:UniversMattar;font-weight:300;font-size:' + size + 'px;line-height:1.12;pointer-events:none';
  marker.style.cssText = 'all:initial;display:inline-block;width:0;height:0;vertical-align:baseline';
  line.append(document.createTextNode('Hg'), marker); document.body.append(line);
  const baseline = marker.getBoundingClientRect().top - line.getBoundingClientRect().top;
  line.remove(); baselines.set(size, baseline); return baseline;
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
