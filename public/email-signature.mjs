// Shared contact contract. The actual image composition lives in email-card.mjs.
const clean = (value, limit) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);
export function normalizeSignature(data = {}) {
  return { name: clean(data.name, 100), role: clean(data.role, 100), email: clean(data.email, 150), phone: clean(data.phone, 40) };
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
