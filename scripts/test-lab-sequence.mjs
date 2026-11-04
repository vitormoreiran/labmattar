import test from 'node:test';
import assert from 'node:assert/strict';
import {createPage,createMotion,motionBox,createClip,clipBox,privateClipUrl,readSequence,sequenceDocument,movePage} from '../public/lab-sequence.mjs';
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

test('vídeos de projetos são serializados, validados e não expõem credenciais',()=>{
  const clip=createClip({kind:'video',provider:'google',id:'1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn',
    name:'Aleteia Evento horizontal.mp4',mimeType:'video/mp4'},'clip-1');
  const pageA=page('page-1');
  pageA.clips.push(clip);
  const document=sequenceDocument('Projeto com vídeos',[pageA,page('page-2')]);
  assert.equal(document.pages[0].clips.length,1);
  assert.equal(document.pages[1].clips,undefined,'projetos anteriores continuam compatíveis');
  assert.ok(!JSON.stringify(document).includes('access_token'));
  const parsed=readSequence(clone(document),photos,[asset]);
  assert.deepEqual(sequenceDocument(parsed.name,parsed.pages),document);
  assert.equal(privateClipUrl(parsed.pages[0].clips[0]),
    '/api/acervo/media?provider=google&id=1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn');
  const box=clipBox({...clip,x:100,y:100},1280,720);
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=1280&&box.y+box.h<=720);
  const bad=clone(document);bad.pages[0].clips[0].access_token='not-a-token';
  assert.throws(()=>readSequence(bad,photos,[asset]),/campos do vídeo/);
  const rogue=clone(document);rogue.pages[0].clips[0].fileId='https://evil.example/video';
  assert.throws(()=>readSequence(rogue,photos,[asset]),/identificador privado do vídeo/);
});
