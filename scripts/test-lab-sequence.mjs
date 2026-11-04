import test from 'node:test';
import assert from 'node:assert/strict';
import {createPage,createMotion,motionBox,createClip,clipBox,privateClipUrl,createBackgroundVideo,backgroundVideoUrl,readSequence,sequenceDocument,movePage,createSection,sectionState,hasSectionText} from '../public/lab-sequence.mjs';
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
test('seções preservam fundo, páginas e conteúdo no JSON v2',()=>{const section=createSection('intro','Introdução',{...state,background:'photo'},photos);const p=createPage({id:'one',name:'Um',state:sectionState(state,section),photoCatalog:photos});p.sectionId=section.id;const doc=sequenceDocument('Seções',[p],[section]),loaded=readSequence(clone(doc),photos,[]);assert.deepEqual(sequenceDocument(loaded.name,loaded.pages,loaded.sections),doc);assert.equal(hasSectionText('intro',loaded.pages),true);const bad=clone(doc);bad.pages[0].sectionId='missing';assert.throws(()=>readSequence(bad,photos,[]),/seção da página/);const mismatch=clone(doc);mismatch.sections[0].background.focusX=20;assert.throws(()=>readSequence(mismatch,photos,[]),/diverge/);const unsafe=clone(doc);unsafe.sections[0].background.uri='https://outside.invalid/photo';assert.throws(()=>readSequence(unsafe,photos,[]));});
test('recusa grupos intercalados e seções duplicadas sem alterar o original',()=>{const sections=['s1','s2'].map(id=>createSection(id,id,state,photos));const pages=['s1','s2','s1'].map((sectionId,index)=>({...page('p'+index),sectionId}));const doc=sequenceDocument('Ordem',pages,sections);assert.throws(()=>readSequence(doc,photos,[]),/ordem das seções/);const duplicate=sequenceDocument('Duplicado',[pages[0]],[sections[0],sections[0]]);assert.throws(()=>readSequence(duplicate,photos,[]),/seção repetido/);assert.equal(doc.pages[2].sectionId,'s1');});

test('foto pública do portfólio e foto local incorporada reabrem no JSON',()=>{
  const id='177GD8UXcmudDYJ8-UKv5O9Mrdd3oOrAv',provider='public';
  const hash=Array.from(new TextEncoder().encode(provider+':'+id)).
    reduce((n,v)=>(n*33+v)>>>0,5381).toString(36);
  const photoKey='ext-'+hash;
  const url='/api/acervo/public-media?project=1_IohLr8kwZIQudxG8lmzJvO6GjB3VAWN&id='+id;
  const localKey='loc-0123456789abcdefabcd';
  const embedded='data:image/webp;base64,'+'AAECAwQ=';
  for(const [key,uri] of [[photoKey,url],[localKey,embedded]]){
    const catalogue={...photos,[key]:uri};
    const p=createPage({id:'page-1',name:'Foto',state:{...state,photo:key},photoCatalog:catalogue});
    const doc=sequenceDocument('Projeto com foto',[p]);
    const restored=readSequence(doc,photos,[asset]);
    assert.equal(restored.photoCatalog[key],uri);
    assert.deepEqual(sequenceDocument(restored.name,restored.pages),doc);
  }
  const invalid='/api/acervo/public-media?project=1_IohLr8kwZIQudxG8lmzJvO6GjB3VAWN&id='+id+'&token=abc';
  assert.throws(()=>createPage({id:'page-1',name:'Invalido',state:{...state,photo:photoKey},
    photoCatalog:{...photos,[photoKey]:invalid}}),/fotografia do catálogo local/);
});
test('vídeos públicos e locais guardam referência sem credenciais',()=>{
  const publicClip=createClip({kind:'video',provider:'public',
    projectId:'11OYn_dAihamP4E0PqmuIUcmo0Uk41rpZ',
    id:'1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn',name:'Aleteia.mp4',mimeType:'video/mp4'},'clip-public');
  const localClip=createClip({kind:'video',provider:'local',
    id:'local-123e4567-e89b-12d3-a456-426614174000',
    name:'Vídeo local.mp4',mimeType:'video/mp4'},'clip-local');
  const p=page('page-1');p.clips.push(publicClip,localClip);
  const doc=sequenceDocument('Vídeos',[p]),read=readSequence(doc,photos,[asset]);
  assert.deepEqual(sequenceDocument(read.name,read.pages),doc);
  assert.equal(privateClipUrl(publicClip),
    '/api/acervo/public-media?project=11OYn_dAihamP4E0PqmuIUcmo0Uk41rpZ&id=1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn');
  assert.ok(!JSON.stringify(doc).includes('Bearer'));
  const forged=clone(doc);forged.pages[0].clips[0].projectId='https://evil.test';
  assert.throws(()=>readSequence(forged,photos,[asset]),/projeto do vídeo/);
});

test('seções conservam os vídeos ao salvar e reabrir',()=>{const section=createSection('s1','Introdução',state,photos),p=page('p1');p.sectionId=section.id;p.clips=[createClip({kind:'video',provider:'google',id:'videoFile1234',name:'Registro.mp4',mimeType:'video/mp4'},'clip-1')];const doc=sequenceDocument('Seções com vídeo',[p],[section]),parsed=readSequence(doc,photos,[asset]);assert.deepEqual(sequenceDocument(parsed.name,parsed.pages,parsed.sections),doc);});
test('vídeo selecionado é fundo da página, não elemento livre',()=>{
  const media={kind:'video',provider:'public',projectId:'11OYn_dAihamP4E0PqmuIUcmo0Uk41rpZ',
    id:'1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn',name:'Fundo da cena.mp4',mimeType:'video/mp4'};
  const backgroundVideo=createBackgroundVideo(media,'background-1');
  const first=createPage({id:'page-1',name:'Vídeo ao fundo',state:{...state,background:'photo'},
    photoCatalog:photos,backgroundVideo});
  const second=page('page-2');
  const document=sequenceDocument('Fundo em vídeo',[first,second]);
  assert.deepEqual(document.pages[0].backgroundVideo,backgroundVideo);
  assert.equal(document.pages[0].clips,undefined);
  assert.equal(document.pages[1].backgroundVideo,undefined);
  assert.equal(backgroundVideoUrl(backgroundVideo),
    '/api/acervo/public-media?project=11OYn_dAihamP4E0PqmuIUcmo0Uk41rpZ&id=1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn');
  const restored=readSequence(clone(document),photos,[asset]);
  assert.deepEqual(sequenceDocument(restored.name,restored.pages),document);
  const contaminated=clone(document);
  contaminated.pages[0].backgroundVideo.access_token='segredo';
  assert.throws(()=>readSequence(contaminated,photos,[asset]),/campos do vídeo de fundo/);
  const broken=clone(document);broken.pages[0].composition.pages[0].surface.background='color';
  assert.throws(()=>readSequence(broken,photos,[asset]),/vídeo de fundo exige superfície de imagem/);
});

test('o vídeo é único na seção e sobrevive ao JSON v2',()=>{const section=createSection('s-video','Vídeo', {...state,background:'photo'},photos),video=createBackgroundVideo({kind:'video',provider:'google',id:'videoFile1234',name:'Fundo.mp4',mimeType:'video/mp4'},'bg-1');section.background.video=video;const pages=['p1','p2'].map(id=>({...createPage({id,name:id,state:sectionState(state,section),photoCatalog:photos,backgroundVideo:video}),sectionId:section.id}));const doc=sequenceDocument('Vídeo compartilhado',pages,[section]),parsed=readSequence(doc,photos,[asset]);assert.deepEqual(sequenceDocument(parsed.name,parsed.pages,parsed.sections),doc);const bad=clone(doc);delete bad.pages[1].backgroundVideo;assert.throws(()=>readSequence(bad,photos,[asset]),/diverge do fundo compartilhado/);});

test('a ordem dos campos do vídeo não muda a validade nem altera o JSON recebido',()=>{const section=createSection('s-order','Ordem',{...state,background:'photo'},photos),video=createBackgroundVideo({kind:'video',provider:'public',projectId:'sectionproject123',id:'sectionvideo123',name:'Fundo.mp4',mimeType:'video/mp4'},'bg-order');section.background.video={id:video.id,provider:video.provider,projectId:video.projectId,fileId:video.fileId,name:video.name,mimeType:video.mimeType,frameSeconds:0};const page={...createPage({id:'p-order',name:'Ordem',state:sectionState(state,section),photoCatalog:photos,backgroundVideo:video}),sectionId:section.id};const doc=sequenceDocument('Ordem',[page],[section]),before=JSON.stringify(doc);readSequence(doc,photos,[asset]);assert.equal(JSON.stringify(doc),before);});
