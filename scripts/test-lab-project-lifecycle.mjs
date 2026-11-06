import test from 'node:test';
import assert from 'node:assert/strict';
import {createPage,createMotion,readSequence,sequenceDocument} from '../public/lab-sequence.mjs';
import {MAX_PROJECT_BYTES,checkProjectBytes,serializeProject,parseProject,persistProjectDraft,pagesToSections,fetchMotionCatalog} from '../public/lab-project-lifecycle.mjs';
const photos={'64':'/ambiente-editorial/media/BOXDOSENTIR-64.jpg'};
const signature={preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(c=>[c,{kind:'none',symbol:'M.svg',text:''}]))};
const state={format:'horizontal',color:'neutral',inkColor:'auto',autoInkVersion:2,photoContrast:40,margin:7,guides:'nenhuma',marker:'none',markerFocus:'sharp',textWidth:80,titleScale:100,type:'univers',background:'color',mContent:'off',mPresentation:'elemento',photo:'64',mScale:60,mPositionY:50,mCaption:'',focusX:0,focusY:100,symbol:'none',title:'AUTORIA',titleFonts:[],body:'Texto.',bodyMode:'visivel',kicker:'',footerLeft:'',footerRight:'',signature};
const asset={id:'m-form',projectHash:'a'.repeat(64),sha256:'b'.repeat(64),video:'/motion/videos/m-form.mp4',poster:'/motion/posters/m-form.png',width:1080,height:1080,duration:10.8};
const page=id=>createPage({id,name:id,state,photoCatalog:photos});
test('duas fotografias incorporadas acima de 5 MiB salvam e reabrem sem perda',()=>{
  const photo='loc-01234567890123456789',uri='data:image/webp;base64,'+'A'.repeat(3_000_000),catalog={...photos,[photo]:uri};
  const pages=['p1','p2'].map(id=>createPage({id,name:id,state:{...state,photo},photoCatalog:catalog}));
  const doc=sequenceDocument('Fotografias',pages),json=serializeProject(doc);
  assert(new TextEncoder().encode(json).length>5*1024*1024);
  const result=readSequence(parseProject(json),photos,[asset]);
  assert.deepEqual(sequenceDocument(result.name,result.pages),doc);
});
test('salvar e abrir têm um teto comum e contam bytes UTF-8',()=>{
  checkProjectBytes(MAX_PROJECT_BYTES);assert.throws(()=>checkProjectBytes(MAX_PROJECT_BYTES+1),/64 MB/);
  const value={title:'AÇÃO / にほんご / 🍃'};assert.deepEqual(parseProject(serializeProject(value)),value);
});
test('conversão de 30 páginas conserva conteúdo e não modifica o original',()=>{
  const pages=Array.from({length:30},(_,i)=>page('p'+i)),before=structuredClone(pages);
  const result=pagesToSections(pages,photos,i=>'s'+i);
  const doc=sequenceDocument('Seções',result.pages,result.sections),restored=readSequence(doc,photos,[]);
  assert.equal(restored.sections.length,30);assert.deepEqual(pages,before);assert.equal(restored.pages[29].state.title,'AUTORIA');
});
test('31 páginas são recusadas antes de alterar IDs, ordem ou fundos',()=>{
  const pages=Array.from({length:31},(_,i)=>page('p'+i)),before=structuredClone(pages);let allocated=0;
  assert.throws(()=>pagesToSections(pages,photos,()=>{allocated++;return 's'+allocated;}),/até 30/);
  assert.equal(allocated,0);assert.deepEqual(pages,before);
});
test('cópia anterior à restauração contém a sequência inteira e a seleção',()=>{
  const a=page('p1');a.motions=[createMotion(asset,'motion1')];const converted=pagesToSections([a,page('p2')],photos,i=>'s'+i);
  const snapshot={document:sequenceDocument('Recuperação',converted.pages,converted.sections),current:1,enabled:true};
  const values=new Map(),storage={setItem:(key,value)=>values.set(key,value)};
  assert.equal(persistProjectDraft(storage,'before-reset',snapshot).ok,true);
  snapshot.document.pages[0].name='Alterado depois';
  const previous=JSON.parse(values.get('before-reset')),restored=readSequence(previous.document,photos,[asset]);
  assert.equal(previous.current,1);assert.equal(restored.pages[0].name,'p1');assert.equal(restored.pages[0].motions.length,1);assert.equal(restored.sections.length,2);
});
test('falha ao gravar a apresentação não produz sucesso nem altera a cópia anterior',()=>{
  const previous=JSON.stringify({document:sequenceDocument('Original',[page('p1')]),current:0}),values=new Map([['project',previous]]);
  const result=persistProjectDraft({setItem(){throw new Error('QuotaExceededError');}},'project',{document:'Novo'});
  assert.equal(result.ok,false);assert.match(result.message,/não foi salva/);assert.equal(values.get('project'),previous);
});
test('sem catálogo, referências Motion podem ser editadas e salvas sem fingir verificação de hashes',()=>{
  const a=page('p1');a.motions=[createMotion(asset,'motion1')];const doc=sequenceDocument('Motion preservado',[a]);
  const offline=readSequence(doc,photos,null);assert.deepEqual(offline.pages[0].motions,a.motions);
  assert.throws(()=>readSequence(doc,photos,[]),/motion não encontrado/);
  const changed={...asset,sha256:'c'.repeat(64)};assert.throws(()=>readSequence(doc,photos,[changed]),/motion mudou/);
  const broken=structuredClone(doc);broken.pages[0].motions[0].x=101;assert.throws(()=>readSequence(broken,photos,null),/posição horizontal/);
});
test('catálogo ausente, incompleto e interrompido falham com erro recuperável',async()=>{
  await assert.rejects(fetchMotionCatalog(async()=>({ok:false})),/indisponível/);
  await assert.rejects(fetchMotionCatalog(async()=>({ok:true,json:async()=>({schemaVersion:1,items:[]})})),/incompleto/);
  await assert.rejects(fetchMotionCatalog((_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Abortado')))),10),/Abortado/);
});
test('catálogo válido recupera as referências e volta a verificar seus hashes',async()=>{
  const catalog=await fetchMotionCatalog(async()=>({ok:true,json:async()=>({schemaVersion:1,items:[asset]})}));
  const a=page('p1');a.motions=[createMotion(asset,'motion1')];const doc=sequenceDocument('Recuperado',[a]);
  assert.deepEqual(readSequence(doc,photos,catalog).pages[0].motions,a.motions);
});
