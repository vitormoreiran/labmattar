import test from 'node:test';
import assert from 'node:assert/strict';
import {createPage,createMotion,motionBox,readSequence,sequenceDocument,movePage,createSection,sectionState,hasSectionText} from '../public/lab-sequence.mjs';
const photos={'64':'/ambiente-editorial/media/BOXDOSENTIR-64.jpg'};
const state={format:'horizontal',color:'neutral',margin:7,guides:'nenhuma',marker:'none',markerFocus:'blur',
  textWidth:61,titleScale:100,type:'alternada',background:'color',mContent:'off',mPresentation:'elemento',photo:'64',
  mScale:60,focusX:50,focusY:50,symbol:'none',title:'PRIMEIRA PÁGINA',body:'Conteúdo editável.',bodyMode:'visivel',
  kicker:'LABMATTAR',footerLeft:'2026',footerRight:'IDENTIDADE',signature:{preset:'editorial',scale:100,slots:Object.fromEntries(
    ['tl','tr','bl','br'].map(corner=>[corner,{kind:'text',symbol:'M.svg',text:corner}]))}};
const asset={id:'m-form',projectHash:'a'.repeat(64),sha256:'b'.repeat(64),video:'/motion/videos/m-form.mp4',
  poster:'/motion/posters/m-form.png',width:1080,height:1080,duration:10.8};
const page=(id,format='horizontal')=>createPage({id,name:id,state:{...state,format},photoCatalog:photos});
const clone=value=>JSON.parse(JSON.stringify(value));
test('sequência mantém conteúdo, formatos e ordem ao salvar e reabrir',()=>{
  const pages=['horizontal','vertical','quadrado','editorial'].map((format,n)=>page('page-'+n,format));
  pages[0].motions.push(createMotion(asset,'motion-1'));
  const document=sequenceDocument('Apresentação',pages),loaded=readSequence(clone(document),photos,[asset]);
  assert.deepEqual(loaded.pages.map(page=>page.state.format),['horizontal','vertical','quadrado','editorial']);
  assert.deepEqual(sequenceDocument(loaded.name,loaded.pages),document);
  assert.equal(movePage(pages,0,1),1);assert.equal(pages[1].id,'page-0');
  assert.equal(pages[1].motions[0].assetId,'m-form');assert.equal(movePage(pages,0,-1),0);
});
test('recusa referência de motion de outra versão e páginas repetidas',()=>{
  const p=page('page-1');p.motions=[createMotion(asset,'motion-1')];
  const document=sequenceDocument('Projeto',[p]);
  const bad=clone(document);bad.pages[0].motions[0].videoHash='c'.repeat(64);
  assert.throws(()=>readSequence(bad,photos,[asset]),/motion mudou/);
  const duplicate=clone(document);duplicate.pages.push(clone(duplicate.pages[0]));
  assert.throws(()=>readSequence(duplicate,photos,[asset]),/página repetido/);
  assert.equal(document.pages.length,1);
});
test('valida todas as páginas sem alterar o projeto anterior em caso de erro',()=>{
  const document=sequenceDocument('Projeto',[page('page-1'),page('page-2')]),original=clone(document);
  document.pages[1].composition.assets[0].uri='/identidade/vaso_03.svg';
  assert.throws(()=>readSequence(document,photos,[asset]),/M oficial/);
  assert.deepEqual(original.pages[0],document.pages[0]);
  const injected=clone(original);injected.access_token='não deve entrar no projeto';
  assert.throws(()=>readSequence(injected,photos,[asset]),/campos da sequência/);
});
test('elemento mantém proporção e permanece dentro dos quatro formatos',()=>{
  for(const [w,h] of [[1280,720],[720,1280],[900,900],[1000,707]]){
    const motion={...createMotion(asset,'motion-1'),x:100,y:100,width:100},box=motionBox(motion,asset,w,h);
    assert.ok(Math.abs(box.w/box.h-asset.width/asset.height)<1e-10);
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=w&&box.y+box.h<=h);
  }
});
test('fotografia privada usa apenas referência estável, sem token ou host externo',()=>{
  const provider='google',id='arquivo123',hash=Array.from(new TextEncoder().encode(provider+':'+id)).reduce((n,v)=>(n*33+v)>>>0,5381).toString(36);
  const key='ext-'+hash,uri='/api/acervo/media?provider=google&id='+id;
  const p=createPage({id:'page-1',name:'Foto',state:{...state,photo:key},photoCatalog:{...photos,[key]:uri}});
  const document=sequenceDocument('Projeto',[p]);
  const loaded=readSequence(document,photos,[asset]);assert.equal(loaded.photoCatalog[key],uri);
  const bad=clone(document);bad.pages[0].composition.assets[1].uri+='&token=proibido';
  assert.throws(()=>readSequence(bad,photos,[asset]),/origem da fotografia/);
  const host=clone(document);host.pages[0].composition.assets[1].uri='https://outro.example/image.jpg';
  assert.throws(()=>readSequence(host,photos,[asset]),/origem da fotografia/);
});

test('seções preservam fundo, páginas e conteúdo no JSON v2',()=>{const section=createSection('intro','Introdução',{...state,background:'photo'},photos);const p=createPage({id:'one',name:'Um',state:sectionState(state,section),photoCatalog:photos});p.sectionId=section.id;const doc=sequenceDocument('Seções',[p],[section]),loaded=readSequence(clone(doc),photos,[]);assert.deepEqual(sequenceDocument(loaded.name,loaded.pages,loaded.sections),doc);assert.equal(hasSectionText('intro',loaded.pages),true);const bad=clone(doc);bad.pages[0].sectionId='missing';assert.throws(()=>readSequence(bad,photos,[]),/seção da página/);const mismatch=clone(doc);mismatch.sections[0].background.focusX=20;assert.throws(()=>readSequence(mismatch,photos,[]),/diverge/);const unsafe=clone(doc);unsafe.sections[0].background.uri='https://outside.invalid/photo';assert.throws(()=>readSequence(unsafe,photos,[]));});
test('recusa grupos intercalados e seções duplicadas sem alterar o original',()=>{const sections=['s1','s2'].map(id=>createSection(id,id,state,photos));const pages=['s1','s2','s1'].map((sectionId,index)=>({...page('p'+index),sectionId}));const doc=sequenceDocument('Ordem',pages,sections);assert.throws(()=>readSequence(doc,photos,[]),/ordem das seções/);const duplicate=sequenceDocument('Duplicado',[pages[0]],[sections[0],sections[0]]);assert.throws(()=>readSequence(duplicate,photos,[]),/seção repetido/);assert.equal(doc.pages[2].sectionId,'s1');});
