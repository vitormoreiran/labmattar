import { normalizeSignature } from './email-signature.mjs';

// All four email compositions use the former 480 × 100 px strip. Elements are
// recomposed at this size; native marks and contact text never stretch to fit.
export const EMAIL_COMPOSITIONS = Object.freeze([
  { id: 'm-horizontal', label: 'M horizontal', width: 480, height: 132, motion: true, paper: '#FFFFFF', thumbnail: '/identidade/email/modelos/01-m-horizontal.png?v=simples-20261117' }
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

export function signatureLayout(data, { composition = 'm-horizontal', context, channels = {} }) {
  const meta = emailComposition(composition), value = normalizeSignature(data);
  const fields = [], errors = {};
  const add = (key, label, x, y, size, maxWidth, color = 'ink', align = 'left', baseline) => {
    setFont(context, size);
    if (context.measureText(label).width > maxWidth) {
      errors[key] ||= key === 'name'
        ? (composition === 'm-compacto' ? 'Use um nome de apresentação que caiba em duas linhas.' : 'Abrevie o nome de apresentação ou escolha M compacto, com duas linhas.')
        : key === 'email' ? 'O e-mail não cabe nesta composição. Escolha outro modelo para manter o endereço completo.'
          : key === 'phone' ? 'Confira o telefone completo ou escolha uma composição com mais espaço.'
            : 'Abrevie a função para caber em uma linha.';
    }
    fields.push({ key, label, x, y, size, maxWidth, color, align, baseline });
  };
  let mark, divider = null, footer = null, name;
  if (composition === 'm-horizontal') {
    // Approved 960 × 200 artwork: 921 × 171 content, at half size for e-mail.
    // Explicit baselines keep preview, PNG and GIF on the same text grid.
    const height = 85.5, width = height * 990.08 / 743.18;
    mark = { family: 'm', source: 'published', x: 470.5 - width, y: 7.5, width, height };
    const textWidth = mark.x - 30;
    const at = (key, label, baseline, size) => add(key, label, 10, baseline - size * 5 / 6, size, textWidth, 'ink', 'left', baseline);
    name = [value.name];
    at('name', value.name, 23, 17.5);
    at('role', value.role, 38, 11);
    at('email', value.email, 58, 11);
    at('phone', value.phone, 73, 11);
    at('website', 'labmattar.com', 88, 11);
  } else if (composition === 'm-compacto') {
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
    name = [value.name];
    add('name', value.name, 20, 12, 18, 366);
    add('role', value.role, 20, 35, 12, 366);
    add('email', value.email, 20, 65, 12, 440);
    add('phone', value.phone, 20, 82, 12, 240);
    add('website', 'labmattar.com', 460, 82, 12, 100, 'accent', 'right');
    mark = { family: 'm', x: 410, y: 7, width: 50, height: 50 * 627 / 822 };
    divider = { x: 20, y: 56, width: 440 };
  }
  const channelFooter = {
    links: ['instagram', 'whatsapp', 'linkedin', 'youtube'].filter(key => Boolean(channels[key])),
    privacy: Boolean(channels.privacyUrl)
  };
  return { value, compact: true, composition, meta, fields, errors, name, role: [value.role], titleSize: composition === 'm-horizontal' ? 17.5 : 18, titleLine: 21, channelFooter,
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
  const baseline = field.baseline ?? field.y + textBaseline(field.size);
  context.save();
  context.beginPath();
  context.rect(field.align === 'right' ? field.x - field.maxWidth : field.x, field.y, field.maxWidth, field.size * 1.12);
  context.clip();
  context.textAlign = field.align; context.textBaseline = 'alphabetic'; context.fillStyle = colors[field.color];
  context.fillText(field.label, field.x, baseline);
  context.restore();
}

const SOCIAL_MARKS = Object.freeze({
  instagram: 'M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.295.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.006 3.259.021 3.667.083 4.947.061 1.277.264 2.148.564 2.911.308.789.72 1.457 1.388 2.123.668.665 1.336 1.074 2.128 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.38-2.128.295-.763.496-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.298 1.33 20.628.921 19.838.617 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.059-1.264-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.245-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.583.005 4.85.061 1.169.051 1.805.245 2.228.408.561.216.96.475 1.382.895.422.419.682.818.9 1.379.166.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.229-.216.56-.476.96-.895 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.417-1.266.06-1.645.072-4.849.079-3.205.007-3.583-.006-4.848-.061M16.953 5.586A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.442M5.839 12.012c.007 3.403 2.771 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.156-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  linkedin: 'M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.94v5.666H9.356V9h3.413v1.561h.049c.476-.9 1.637-1.852 3.37-1.852 3.602 0 4.267 2.37 4.267 5.455v6.288ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.114 20.452H3.56V9h3.554v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.225 0Z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'
});

function paintChannelFooter(context, footer, colors) {
  if (!footer || !footer.links.length) return;
  context.save();
  context.fillStyle = colors.paper; context.fillRect(0, 100, 480, 32);
  context.globalAlpha = .28; context.fillStyle = colors.ink; context.fillRect(10, 100, 460, .5); context.globalAlpha = 1;
  let x = 12;
  for (const key of footer.links) {
    const mark = SOCIAL_MARKS[key]; if (!mark) continue;
    context.save(); context.translate(x, 108); context.scale(.58, .58);
    context.fillStyle = colors.accent; context.fill(new Path2D(mark)); context.restore();
    x += 20;
  }
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
  paintChannelFooter(context, layout.channelFooter, colors);
  if (layout.mark.family === 'mattar') paintNativeMark(context, resources.logo, layout.mark, colors.paper);
  else if (includeM) paintNativeMark(context, layout.mark.source === 'published' ? resources.mPublished : resources.m, layout.mark, colors.accent);
}
