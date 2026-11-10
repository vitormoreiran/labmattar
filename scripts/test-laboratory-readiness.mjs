import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLaboratoryLinks } from './laboratory-readiness.mjs';
const base = 'https://labmattar.com';
const tools = ['/motion/matriz/index.html', '/compor.html?studio=1#laboratorio', '/assinatura-email.html?origem=laboratorio'];
test('the three published tools match the navigation, including workspace queries', () => {
  assert.equal(checkLaboratoryLinks(tools, base).ready, true);
  assert.equal(checkLaboratoryLinks(tools.map(href => new URL(href, base).href), base).ready, true);
});
test('an index missing Cartão MATTAR cannot pass publication readiness', () => {
  const result = checkLaboratoryLinks(tools.slice(0, 2), base);
  assert.equal(result.ready, false); assert.deepEqual(result.missing, ['/assinatura-email.html']);
});
test('duplicates and external destinations cannot substitute for the card', () => {
  assert.equal(checkLaboratoryLinks([...tools.slice(0, 2), tools[0]], base).ready, false);
  assert.equal(checkLaboratoryLinks([...tools.slice(0, 2), 'https://example.com/assinatura-email.html'], base).ready, false);
});
