import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { signatureHTML, signatureText, signatureDocument, validateSignature, normalizeSignature, MOTION_URL, POSTER_URL } from '../public/email-signature.mjs';

const contact = {name:'Ana Ribeiro', role:'Produção e projetos', email:'ana+projetos@example.com', phone:'+55 (11) 99999-9999'};

test('requires real contact fields and omits optional lines', () => {
  assert.deepEqual(Object.keys(validateSignature({})), ['name','email']);
  assert.deepEqual(validateSignature(contact), {});
  const minimal = {name:contact.name, email:contact.email};
  assert.deepEqual(validateSignature(minimal), {});
  assert.doesNotMatch(signatureHTML(minimal), /tel:|Produção|undefined|null/);
  assert.match(signatureText(minimal), /labmattar.com/);
});

test('treats names, roles and attribute content as text', () => {
  const html = signatureHTML({...contact,name:'Ana & João <img src=x onerror=alert(1)>',role:'"Direção"'});
  assert.match(html, /Ana &amp; João &lt;img/);
  assert.match(html, /&quot;Direção&quot;/);
  assert.equal((html.match(/<img /g)||[]).length, 1);
  assert.doesNotMatch(html, /<script|<svg|onerror="|<style|@font-face/);
  assert.equal(normalizeSignature({name:'A\r\nB'}).name,'A  B');
});

test('produces public image and actual contact links', () => {
  const html=signatureHTML(contact);
  assert.ok(html.includes(MOTION_URL));
  assert.match(html,/mailto:ana%2Bprojetos@example.com/);
  assert.match(html,/href="tel:\+5511999999999"/);
  assert.match(html,/width="304" height="95"/);
  assert.doesNotMatch(html,/localhost|127\.0\.0\.1|data:image|file:/);
});

test('static alternative preserves the composition and all editable text', () => {
  const animated=signatureHTML(contact), still=signatureHTML(contact,{animated:false});
  assert.ok(still.includes(POSTER_URL));
  assert.equal(animated.replace(MOTION_URL,POSTER_URL),still);
  assert.match(still,/Ana Ribeiro/);
});

test('rejects malformed email and phone values', () => {
  for (const email of ['ana','a@','x\"@exemplo.com','<a>@exemplo.com','a b@exemplo.com']) {
    assert.ok(validateSignature({...contact,email}).email, email);
  }
  for (const phone of ['123','+55 javascript:','1234567890123456','+55+11 99999999']) assert.ok(validateSignature({...contact,phone}).phone,phone);
});

test('download contains the exact copied fragment and remains within Gmail limit', () => {
  const html=signatureHTML(contact), full=signatureDocument(contact);
  assert.ok(full.includes(html));
  assert.ok(html.length<10000);
  assert.match(full, /lang="pt-BR"/);
});

test('GIF is derived from the approved film with the recorded size and fingerprint', () => {
  const evidence=JSON.parse(readFileSync(new URL('../content/email-signature-motion.json',import.meta.url)));
  const catalog=JSON.parse(readFileSync(new URL('../content/motion.json',import.meta.url)));
  const motion=catalog.items.find(item=>item.id==='mattar-rhythm');
  const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
  const gif=readFileSync(new URL('../public/identidade/email/mattar-onda.gif',import.meta.url));
  const source=readFileSync(new URL('../public'+motion.video,import.meta.url));
  assert.equal(motion.status,'approved');
  assert.equal(digest(source),motion.sha256);
  assert.equal(evidence.sourceSha256,motion.sha256);
  assert.equal(evidence.projectHash,motion.projectHash);
  assert.equal(digest(gif),evidence.gifSha256);
  assert.equal(gif.length,evidence.bytes);
  assert.equal(gif.subarray(0,6).toString(),'GIF89a');
  assert.equal(gif.readUInt16LE(6),320);assert.equal(gif.readUInt16LE(8),100);
  assert.equal(evidence.durationMs,Math.round(motion.duration*1000));
  assert.ok(evidence.frames>1&&evidence.bytes<100000);
  assert.equal(evidence.iterations,3);
});
