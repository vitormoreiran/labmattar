import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { motionProjects } from '../tools/matriz-vetorial/src/motion-catalog.mjs';
import { fingerprint } from '../scripts/motion-fingerprint.mjs';
import { signatureText, validateSignature, normalizeSignature } from '../public/email-signature.mjs';
import { CARD_FORMATS, CARD_THEMES, CARD_COLORS, CARD_MOTION, cardDocument, cardContact, resolveCardColors, cardContrast } from '../public/email-card.mjs';
const contact = { name:'Ana Ribeiro', role:'Produção e projetos', email:'ana+projetos@example.com', phone:'+55 (11) 99999-9999' };

test('requires actual contact fields; optional fields remain optional', () => {
 assert.deepEqual(Object.keys(validateSignature({})),['name','email']);
 assert.deepEqual(validateSignature(contact),{});
 assert.deepEqual(validateSignature({name:contact.name,email:contact.email}),{});
 assert.doesNotMatch(signatureText({name:contact.name,email:contact.email}),/undefined|null/);
});
test('normalizes control characters without interpreting contact content',()=>{
 assert.equal(normalizeSignature({name:'A\r\nB'}).name,'A  B');
 assert.equal(normalizeSignature({name:'A'.repeat(200)}).name.length,100);
 assert.equal(normalizeSignature({name:'Ana <img>'}).name,'Ana <img>');
});
test('rejects malformed email and phone values',()=>{
 for(const email of ['ana','a@','x"@exemplo.com','<a>@exemplo.com','a b@exemplo.com'])assert.ok(validateSignature({...contact,email}).email,email);
 for(const phone of ['123','+55 javascript:','1234567890123456','+55+11 99999999'])assert.ok(validateSignature({...contact,phone}).phone,phone);
});
test('image-based offline document escapes contact text and preserves real links',()=>{
 const html=cardDocument({...contact,name:'Ana & João <img src=x onerror=alert(1)>'},{imageURL:'data:image/png;base64,AAAA',format:'email'});
 assert.equal((html.match(/<img /g)||[]).length,1);assert.match(html,/Ana &amp; João &lt;img/);
 assert.match(html,/mailto:ana\+projetos@example.com/);assert.match(html,/tel:\+5511999999999/);
 assert.match(html,/width="480" height="100"/);assert.doesNotMatch(html,/<script|<svg|onerror="/);
});
test('vCard contains supplied contact details and escapes structural punctuation',()=>{
 const vcard=cardContact({...contact,name:'Ana; Ribeiro, Jr.'});
 assert.ok(vcard.includes('FN:Ana\\; Ribeiro\\, Jr.'));assert.ok(vcard.includes('EMAIL;TYPE=WORK:'+contact.email));
 assert.ok(vcard.endsWith('END:VCARD\r\n'));assert.doesNotMatch(cardContact({name:'Ana',email:'ana@example.com'}),/TITLE:|TEL;/);
});
test('all colors are exact entries of the current manual palette',()=>{
 const system=JSON.parse(readFileSync(new URL('../design/identity-system.json',import.meta.url)));
 const allowed=Object.values({...system.colors.base,...system.colors.palette});
 for(const theme of Object.values(CARD_THEMES))for(const key of ['paper','ink','accent'])assert.ok(allowed.includes(theme[key]),theme[key]);
 for(const color of CARD_COLORS)assert.ok(allowed.includes(color.value)||color.value==='#FFFFFF',color.value);
 assert.equal(CARD_FORMATS.email.height,100);assert.equal(CARD_FORMATS.card.width/CARD_FORMATS.card.height,12/7);
});
test('independent colors retain exact values and reject colors outside the brand',()=>{
 const selected={paper:'#5B463E',ink:'#FFFFFF',accent:'#8FD81B'};
 assert.deepEqual(Object.fromEntries(Object.entries(resolveCardColors('blue',selected)).filter(([key])=>key!=='label')),selected);
 assert.throws(()=>resolveCardColors('blue',{paper:'#123456'}),/cores da marca/);
 const contrast=cardContrast(selected);assert.ok(contrast.text>=4.5);assert.ok(contrast.motion>=3);
 assert.equal(cardContrast({paper:'#FFFFFF',ink:'#FFFFFF',accent:'#FFFFFF'}).text,1);
});
test('approved motion and native geometry remain the sources of both image formats',()=>{
 const entry=motionProjects().find(item=>item.id==='m-form');
 const record=JSON.parse(readFileSync(new URL('../public/motion/exports.json',import.meta.url)))['m-form'];
 const bytes=readFileSync(new URL('../public'+CARD_MOTION.source,import.meta.url));
 assert.equal(entry.status,'approved');assert.equal(fingerprint(entry.project),record.projectHash);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
 assert.equal(Math.round(CARD_MOTION.duration*1000),Math.round(entry.duration*1000));assert.equal(CARD_MOTION.crop.width/CARD_MOTION.crop.height,4/3);
});
