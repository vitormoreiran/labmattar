import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProductionDocument,verifyRoundTrip} from '../public/composicao-document.mjs';
import {createSection,sectionState,createPage,sequenceDocument,readSequence} from '../public/lab-sequence.mjs';
const read=p=>readFileSync(p,'utf8');
const manifest=JSON.parse(read('design/identity-system.json'));
const photos={'64':'/ambiente-editorial/media/BOXDOSENTIR-64.jpg'};
const state={format:'horizontal',color:'red',inkColor:'auto',autoInkVersion:2,photoContrast:40,margin:7,guides:'nenhuma',marker:'none',markerFocus:'blur',textWidth:61,titleScale:100,type:'alternada',background:'photo',mContent:'photo',mPresentation:'elemento',photo:'64',mScale:60,focusX:50,focusY:50,symbol:'none',title:'CADA CORPO',body:'LEITURA',bodyMode:'visivel',kicker:'LABMATTAR',footerLeft:'2026',footerRight:'IDENTIDADE',signature:{preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(c=>[c,{kind:'none',text:'',symbol:'M.svg'}]))}};
const make=s=>createProductionDocument({state:{...state,...s},photoCatalog:photos});
test('capítulos, capas e Matriz têm referências coerentes',()=>{
 assert.deepEqual(manifest.sections.map(s=>s.number),['00','01','02','03','04','05','06','07']);
 assert.deepEqual(manifest.layout.chapters,manifest.sections.map(s=>s.id));
 for(const section of manifest.sections.slice(1)){
  const file='design'+section.path;
  const html=read(file==='design/manual.html'?'public/manual.html':file);
  const label=section.label.toLocaleUpperCase('pt-BR');
  assert.ok(html.includes(section.number+' — '+label)||html.includes(section.number+' &mdash; '+label),section.label+': identificação antiga');
 }
 assert.match(read('design/laboratorio.html'),/href="\/motion\/matriz\/index.html" aria-label="Abrir Matriz Vetorial atual"/);
 assert.doesNotMatch(read('design/laboratorio.html'),/href="\/editor\/" aria-label="Abrir Matriz Vetorial"/);
});
test('o pacote usa exatamente as duas fontes Light vigentes',()=>{
 const fonts=JSON.parse(read('content/identity-fonts.json')).fonts;assert.equal(fonts.length,2);
 for(const f of fonts){const b=readFileSync(f.source);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.equal(b.length,f.bytes);assert.match(f.name,/Light$/);}
});
test('os quatro formatos preservam todas as intensidades ao salvar e reabrir',()=>{
 for(const format of ['horizontal','vertical','quadrado','editorial'])for(const photoContrast of [0,20,40,60,73,80]){
  const doc=make({format,photoContrast}),before=JSON.stringify(doc),restored=verifyRoundTrip(doc,photos);
  assert.equal(restored.photoContrast,photoContrast);assert.equal(restored.autoInkVersion,2);assert.equal(JSON.stringify(doc),before);
 }
 for(const photoContrast of [-1,81,NaN,Infinity,'40'])assert.throws(()=>make({photoContrast}),/tratamento de leitura/);
 for(const autoInkVersion of [0,3,1.5])assert.throws(()=>make({autoInkVersion}),/perfil de cor automática/);
});
test('documento antigo mantém 20% e o perfil anterior de tinta sem ser reescrito',()=>{
 const old=make({color:'red'});delete old.pages[0].media.photoContrastPercent;delete old.pages[0].text.autoInkVersion;
 const before=JSON.stringify(old),restored=verifyRoundTrip(old,photos);assert.equal(restored.photoContrast,20);assert.equal(restored.autoInkVersion,1);assert.equal(JSON.stringify(old),before);
});
test('a intensidade é compartilhada pela seção e divergências são recusadas',()=>{
 const section=createSection('intro','Introdução',state,photos);
 const pages=['a','b'].map(id=>({...createPage({id,name:id,state:sectionState(state,section),photoCatalog:photos}),sectionId:section.id}));
 const doc=sequenceDocument('Ensaio',pages,[section]);assert.equal(readSequence(doc,photos,[]).pages[1].state.photoContrast,40);
 const bad=structuredClone(doc);bad.pages[1].composition.pages[0].media.photoContrastPercent=60;
 assert.throws(()=>readSequence(bad,photos,[]),/fundo compartilhado/);
 const old=structuredClone(doc);delete old.sections[0].background.contrastPercent;for(const p of old.pages){delete p.composition.pages[0].media.photoContrastPercent;}
 assert.equal(readSequence(old,photos,[]).pages[0].state.photoContrast,20);
});
test('o caderno original e as 12 respostas validadas permanecem rastreáveis',()=>{
 const review=JSON.parse(read('content/application-review.json'));assert.equal(review.status,'pending-author-validation');assert.equal(review.decisions.length,12);assert.equal(new Set(review.decisions.map(d=>d.id)).size,12);
 for(const d of review.decisions){assert.ok(d.question&&d.recommendation&&d.scope);assert.ok(d.options.length>=2);}
 const approved=JSON.parse(read('content/application-review-approved.json'));assert.equal(approved.status,'approved-with-requested-adjustments');assert.equal(approved.decisions.length,12);assert.deepEqual(approved.decisions.map(d=>d.id),review.decisions.map(d=>d.id));assert.equal(manifest.governance.applicationReview.status,'approved');
 const html=read('design/validacao-aplicacoes.html');assert.match(html,/Pendente/);assert.match(html,/author-feedback/);assert.doesNotMatch(html,/fetch\(/);
});
