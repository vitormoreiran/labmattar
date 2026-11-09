// The delivered signature is deliberately independent of the editor's CSS.
// Gmail receives a small presentation table, inline styles and a hosted PNG.
export const MOTION_URL = 'https://labmattar.com/identidade/email/mattar-onda.gif';
export const POSTER_URL = 'https://labmattar.com/identidade/email/mattar-onda-poster.png';
export const WEBSITE = 'https://labmattar.com/';
export const EXAMPLE = Object.freeze({
  name: 'Nome Sobrenome', role: 'Área de atuação', email: 'nome@exemplo.com', phone: '+55 11 99999-9999'
});

const clean = (value, limit) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function normalizeSignature(data = {}) {
  return {
    name: clean(data.name, 100), role: clean(data.role, 100),
    email: clean(data.email, 150), phone: clean(data.phone, 40)
  };
}

export function validateSignature(data) {
  const value = normalizeSignature(data), errors = {};
  if (!value.name) errors.name = 'Preencha o nome que aparecerá na assinatura.';
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value.email)) errors.email = 'Informe um e-mail válido.';
  if (value.phone && !/^\+?[\d\s().-]+$/.test(value.phone)) errors.phone = 'Use apenas números, espaços, +, parênteses, ponto ou hífen.';
  const digits = value.phone.replace(/\D/g, '');
  if (value.phone && (digits.length < 8 || digits.length > 15)) errors.phone = 'Confira o número, incluindo DDD e, se possível, o código do país.';
  return errors;
}

export function signatureText(data) {
  const value = normalizeSignature(data);
  return [value.name, value.role, '', value.email, value.phone, 'labmattar.com', '', 'MATTAR'].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n');
}

export function signatureHTML(data, { animated = true, imageURL } = {}) {
  const value = normalizeSignature(data);
  const text = 'font-family:Arial,Helvetica,sans-serif;font-weight:400;color:#181818;overflow-wrap:anywhere;word-break:break-word;';
  const link = text + 'text-decoration:none;';
  const tel = (value.phone.startsWith('+') ? '+' : '') + value.phone.replace(/\D/g, '');
  const image = imageURL || (animated ? MOTION_URL : POSTER_URL);
  const paper = '#F7F6F2';
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="340" bgcolor="' + paper + '" style="border-collapse:collapse;width:100%;max-width:340px;background-color:' + paper + ';' + text + 'font-size:13px;line-height:20px;text-align:left;">' +
    '<tbody><tr><td style="padding:18px 18px 0;' + text + 'font-size:18px;line-height:24px;">' + escape(value.name) +
    (value.role ? '<br><span style="' + text + 'font-size:12px;line-height:19px;">' + escape(value.role) + '</span>' : '') +
    '</td></tr><tr><td style="padding:6px 18px 4px;">' +
    '<a href="' + WEBSITE + '" style="text-decoration:none;"><img src="' + escape(image) + '" alt="MATTAR" width="304" height="95" border="0" style="display:block;width:100%;max-width:304px;height:auto;border:0;outline:none;text-decoration:none;"></a></td></tr>' +
    '<tr><td style="padding:0 18px 18px;' + text + 'font-size:12px;line-height:19px;">' +
    '<a href="mailto:' + escape(encodeURIComponent(value.email).replace(/%40/g, '@')) + '" style="' + link + '">' + escape(value.email) + '</a>' +
    (value.phone ? '<br><a href="tel:' + tel + '" style="' + link + '">' + escape(value.phone) + '</a>' : '') +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;margin-top:12px;"><tbody><tr><td style="padding:0;' + text + 'font-size:9px;line-height:15px;letter-spacing:.04em;">LABMATTAR</td>' +
    '<td align="right" style="padding:0;text-align:right;font-size:12px;line-height:19px;"><a href="' + WEBSITE + '" style="' + link + 'border-bottom:1px solid #cbc9c4;">labmattar.com</a></td></tr></tbody></table></td></tr>' +
    '</tbody></table>';
}

export function signatureDocument(data, options) {
  return '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Assinatura MATTAR — ' + escape(normalizeSignature(data).name) + '</title></head><body style="margin:24px;background:#FFFFFF;">\n' + signatureHTML(data, options) + '\n</body></html>\n';
}
