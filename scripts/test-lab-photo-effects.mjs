import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductionDocument,verifyRoundTrip} from '../public/composicao-document.mjs';
import {createSection,sectionState,createPage,sequenceDocument,readSequence} from '../public/lab-sequence.mjs';
const photoCatalog={'64':'/ambiente-editorial/media/BOXDOSENTIR-64.jpg'};
const signature={preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(corner=>[corner,{kind:'none',symbol:'M.svg',text:''}]))};
const state={format:'editorial',color:'neutral',margin:7,guides:'nenhuma',marker:'none',markerFocus:'blur',textWidth:61,titleScale:100,type:'alternada',background:'photo',mContent:'off',mPresentation:'elemento',photo:'64',mScale:60,focusX:50,focusY:50,symbol:'none',title:'NOVA\nPÁGINA',body:'',bodyMode:'oculto',kicker:'',footerLeft:'',footerRight:'',signature};
test('efeito e intensidade sobrevivem ao projeto salvo sem alterar a geometria',()=>{
 for(const photoEffect of ['auto','blur','glass'])for(const photoBlur of [0,15.5,50,100]){
  const document=createProductionDocument({state:{...state,photoEffect,photoBlur},photoCatalog});
  const restored=verifyRoundTrip(document,photoCatalog);
  assert.equal(restored.photoEffect,photoEffect);assert.equal(restored.photoBlur,photoBlur);
  assert.equal(document.pages[0].m.maskAssetId,'identity:m-mask');
  assert.equal(document.pages[0].surface.format,'editorial');
 }
});
test('projetos anteriores conservam o tratamento original',()=>{
 const document=createProductionDocument({state,photoCatalog});
 delete document.pages[0].media.photoEffect;delete document.pages[0].media.photoBlurPercent;delete document.pages[0].media.photoGlassPercent;
 const restored=verifyRoundTrip(document,photoCatalog);
 assert.equal(restored.photoEffect,'auto');assert.equal(restored.photoBlur,50);
});
test('valores inválidos não entram no renderizador',()=>{
 for(const photoBlur of [-1,101,NaN,Infinity])assert.throws(()=>createProductionDocument({state:{...state,photoBlur},photoCatalog}));
 for(const photoEffect of ['unknown','url(script)',''])assert.throws(()=>createProductionDocument({state:{...state,photoEffect},photoCatalog}));
});
test('as páginas de uma seção compartilham o efeito e a intensidade',()=>{
 const original={...state,photoEffect:'glass',photoBlur:72,photoGlass:35};
 const section=createSection('intro','Introdução',original,photoCatalog);
 const pages=[0,1].map(index=>({...createPage({id:'page-'+index,name:'Página '+index,state:sectionState(original,section),photoCatalog}),sectionId:section.id}));
 const project=sequenceDocument('Efeito compartilhado',pages,[section]);
 const restored=readSequence(project,photoCatalog,[]);
 assert.equal(restored.sections[0].background.photoEffect,'glass');
 for(const page of restored.pages){assert.equal(page.state.photoEffect,'glass');assert.equal(page.state.photoBlur,72);assert.equal(page.state.photoGlass,35);}
 const invalid=structuredClone(project);invalid.sections[0].background.unknown=true;
 assert.throws(()=>readSequence(invalid,photoCatalog,[]));
});
