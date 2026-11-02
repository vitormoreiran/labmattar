// Three treatments only: Título, Corpo, Detalhe.
// Fail before build/deploy if a manual source reintroduces local text formats.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = [
  'design/tipografia.html', 'design/cores.html', 'design/composicao.html',
  'design/imagem.html', 'public/manual.html'
];
const styles = [
  'public/manual-symbols.css', 'public/composicao-lab.css',
  'public/composicao-lab-controls.css', 'public/composicao-studio.css',
  'public/composicao-editor-clean.css'
];
// Font faces, scales, tracking, leading and casing belong to the shared CSS.
// Preserve font-size:0 only where an invisible control label is replaced
// by accessible text or a visual pseudo-label; it is not a text treatment.
const fontDecl = /(?<=[;{])\s*(font|font-size|font-family|font-weight|font-style|font-synthesis|line-height|letter-spacing|text-transform)\s*:\s*([^;{}]+);?/g;
let audited = 0;
function checkCss(source, path) {
  assert.doesNotMatch(source, /@font-face\s*\{/, path + ': duplicate @font-face');
  for (const match of source.matchAll(fontDecl)) {
    const [declaration, property, value] = match;
    if (property === 'font-size' && /^0(?:px|rem|em|%)?\s*(?:!important)?$/i.test(value.trim())) continue;
    throw new Error(path + ': noncanonical text format ' + declaration.trim());
  }
}
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  assert.equal((html.match(/href="\/manual-headings\.css/g)||[]).length,1,file+': normative CSS missing/duplicated');
  assert.equal((html.match(/src="\/manual-type-roles\.js/g)||[]).length,1,file+': role assignment missing/duplicated');
  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) checkCss(match[1],file);
  for (const match of html.matchAll(/style="([^"]*)"/g)) checkCss('{' + match[1] + '}',file+' inline');
  audited++;
}
for (const file of styles) { checkCss(readFileSync(file,'utf8'),file);audited++; }
for (const file of ['public/manual-symbols.js','public/composicao-lab.js','design/cores.html']) {
  const code = readFileSync(file,'utf8');
  assert.doesNotMatch(code,/\.style\.fontSize\s*=|\.style\.setProperty\(['"]font-size['"]/,file+': individual font downscaling');
}
// Obsolete typography scale variables must not survive the cleanup.
for (const file of [...pages,...styles]) {
  assert.doesNotMatch(readFileSync(file,'utf8'),
    /--(?:manual-title-size|title-size|title-fit|lab-(?:title-base|body-base|detail-base|title-scale))\\s*:/,
    file+': obsolete alternate typography token');
}
const canonical = readFileSync('public/manual-headings.css','utf8');
for (const token of ['--lm-type-title-size','--lm-type-body-size','--lm-type-detail-size']) {
  assert.ok(canonical.includes(token),'Missing canonical token '+token);
}
console.log('Typography sources OK: '+audited+' manual files; three roles, zero conflicting declarations.');
