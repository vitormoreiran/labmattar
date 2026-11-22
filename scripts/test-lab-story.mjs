import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {readSequence,sequenceDocument} from '../public/lab-sequence.mjs';
import {normalizeStory,storyTopic,storyLabel} from '../public/lab-story-model.mjs';
import {createStoryTemplate,splitStoryBody,updateStoryText,addStoryPhotos,moveStoryPhoto,removeStoryPhoto,setStoryCaption,moveStoryTopic,addStoryTopic,removeStoryTopic,syncStoryReading,setStoryImageScroll} from '../public/lab-story-project.mjs';
import {storyWebDocument} from '../public/lab-story-web.mjs';
import {prepareChapter4Publication} from '../tools/laboratorio-export/publication.mjs';
const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const photos={'64':data};
const signature={preset:'navigation',scale:100,slots:{tl:{kind:'brand',symbol:'M.svg',text:''},tr:{kind:'symbol',symbol:'M.svg',text:''},bl:{kind:'symbol',symbol:'vaso_03.svg',text:''},br:{kind:'text',symbol:'M.svg',text:'2026'}}};
const state={format:'horizontal',color:'neutral',margin:9,guides:'nenhuma',marker:'none',markerFocus:'blur',textWidth:70,textPositionY:50,titleScale:85,type:'perpetua',background:'photo',mContent:'off',mPresentation:'elemento',photo:'64',photoContrast:45,photoEffect:'auto',photoBlur:0,photoGlass:0,mScale:100,focusX:50,focusY:50,symbol:'none',title:'',body:'',bodyMode:'oculto',kicker:'',footerLeft:'',footerRight:'',signature};
const model=()=>createStoryTemplate({state,photoCatalog:photos,name:'Meu projeto',signature}),clone=value=>JSON.parse(JSON.stringify(value));
test('modelo conserva seções, fotos, opções de motion e dados nativos ao salvar e reabrir',()=>{
 const project=model(),loaded=readSequence(clone(project),photos,[]);assert.equal(loaded.story.topics.length,10);assert.equal(loaded.story.topics.filter(topic=>topic.role==='act').length,5);
 assert.deepEqual(sequenceDocument(loaded.name,loaded.pages,null,loaded.signature,loaded.imageAssets||[],loaded.story),project);
 assert.deepEqual(loaded.pages.map(page=>page.state.format),Array(10).fill('horizontal'));
});
test('texto extenso atravessa páginas sem perder espaços, acentos ou pares Unicode',()=>{
 const project=model(),id=project.story.topics[1].id,text=('Introdução completa — ação, memória e criação.\n\n').repeat(45)+'x'.repeat(379)+'😀 fim';
 assert.equal(splitStoryBody(text).join(''),text);assert(splitStoryBody(text).every(part=>part.length<=380&&!/[\uD800-\uDBFF]$/.test(part)));
 const next=updateStoryText(project,id,{title:'INTRODUÇÃO',body:text},photos),reopened=readSequence(clone(next),photos,[]);
 assert.equal(storyTopic(next,id).body,text);assert.equal(storyTopic({...next,pages:reopened.pages},id).body,text);assert(next.pages.length>project.pages.length);assert.equal(storyTopic(project,id).body,'');
 assert.equal(next.pages.find(page=>page.id===next.story.topics[1].pageIds[0]).composition.pages[0].text.body.visible,false,'A página de título não acumula o texto extenso do PDF.');
});
test('ordem da foto muda também na composição nativa, preservando leitura e legenda',()=>{
 let project=model();const id=project.story.topics[3].id;project=updateStoryText(project,id,{title:'PRIMEIRO ATO',body:'O texto permanece na mesma ordem. '.repeat(25)},photos);
 project=addStoryPhotos(project,id,[{key:'loc-abcdef1234567890',uri:data,name:'Segunda foto'}],photos);const topic=storyTopic(project,id),second=topic.photoPageIds[1],body=topic.body;
 project=setStoryCaption(project,id,second,'Legenda da segunda foto',photos);const next=moveStoryPhoto(project,id,second,-1,photos),moved=storyTopic(next,id);
 assert.equal(moved.photos[0].native.media.photoKey,'loc-abcdef1234567890');assert.equal(moved.photos[0].caption,'Legenda da segunda foto');assert.equal(moved.body,body);
 const nativeOrder=next.pages.filter(page=>moved.photoPageIds.includes(page.id)).map(page=>page.composition.pages[0].media.photoKey);assert.deepEqual(nativeOrder,moved.photos.map(photo=>photo.native.media.photoKey));assert.equal(storyTopic(project,id).photos[0].native.media.photoKey,'64');
});
test('remover uma fotografia mantém título e texto completos e protege a última foto',()=>{
 let project=model();const id=project.story.topics[1].id;project=updateStoryText(project,id,{title:'TÍTULO PRESERVADO',body:'Conteúdo que permanece completo. '.repeat(20)},photos);project=addStoryPhotos(project,id,[{key:'loc-aabbccddeeff0011',uri:data,name:'Nova'}],photos);
 const before=storyTopic(project,id),next=removeStoryPhoto(project,id,before.photoPageIds[0],photos),after=storyTopic(next,id);assert.equal(after.body,before.body);assert.equal(after.title,before.title);assert.equal(after.photos.length,1);assert.throws(()=>removeStoryPhoto(next,id,after.photoPageIds[0],photos),/ao menos uma/);
});
test('reordenar atos atualiza sua numeração e não altera a redação',()=>{
 let project=model();const first=project.story.topics[3].id,second=project.story.topics[4].id;project=updateStoryText(project,first,{title:'UM',body:'Texto um'},photos);project=updateStoryText(project,second,{title:'DOIS',body:'Texto dois'},photos);
 const next=moveStoryTopic(project,second,-1,photos);assert.equal(storyLabel(next,second),'Ato 1 / DOIS');assert.equal(storyLabel(next,first),'Ato 2 / UM');assert.equal(storyTopic(next,first).body,'Texto um');assert.equal(storyTopic(next,second).body,'Texto dois');assert.throws(()=>moveStoryTopic(next,next.story.topics[0].id,1,photos),/abertura/);
});
test('novas seções e remoção são transações e deixam um projeto válido',()=>{
 const project=model(),next=addStoryTopic(project,project.story.topics[1].id,'act',photos);assert.equal(next.story.topics.length,11);assert.equal(project.story.topics.length,10);readSequence(next,photos,[]);const removed=removeStoryTopic(next,next.story.topics[2].id,photos);assert.equal(removed.story.topics.length,10);readSequence(removed,photos,[]);
});
test('estrutura malformada não pode perder páginas nem duplicar referências',()=>{
 const project=model(),bad=clone(project);bad.story.topics[1].pageIds=[];assert.throws(()=>readSequence(bad,photos,[]),/páginas da seção/);const unknown=clone(project);unknown.story.token='proibido';assert.throws(()=>normalizeStory(unknown.story,unknown.pages),/modelo/);
 const repeated=clone(project);repeated.story.topics[1].pageIds=[repeated.pages[0].id];repeated.story.topics[1].photoPageIds=[repeated.pages[0].id];assert.throws(()=>readSequence(repeated,photos,[]),/pertencer a uma seção/);assert.equal(project.story.topics.length,10);
});
test('ajuste de leitura afeta a seção inteira e mantém imagens e outras seções',()=>{
 let project=model();const id=project.story.topics[3].id;project=addStoryPhotos(project,id,[{key:'loc-aabbccddeeff0011',uri:data,name:'Outra foto'}],photos);const topic=storyTopic(project,id),current=project.pages.findIndex(page=>page.id===topic.photoPageIds[1]);project.pages[current].composition.pages[0].reading.positionYPercent=70;
 const result=syncStoryReading(project.pages,current,project.story,photos);assert(topic.pageIds.every(pageId=>result.find(page=>page.id===pageId).composition.pages[0].reading.positionYPercent===70));assert.equal(result[0].composition.pages[0].reading.positionYPercent,50);assert.equal(result[current].composition.pages[0].media.photoKey,'loc-aabbccddeeff0011');
});
test('HTML deriva a mesma estrutura e incorpora projeto editável, fontes e navegação',async()=>{
 const project=model(),scenes=project.pages.map(page=>({id:page.id,name:page.name,width:1280,height:720,outputWidth:1920,outputHeight:1080,items:[{kind:'rect',layer:'background',x:0,y:0,w:1280,h:720,color:'#181818'}],motions:[],clips:[]}));
 const svg=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 822 627"><path d="M0 0H822V627H0Z"/></svg>'),fonts={UniversMattar:new Uint8Array([1]),PerpetuaMattar:new Uint8Array([2])};
 const html=await storyWebDocument(scenes,project,[],fonts,{resource:async()=>svg,base64:bytes=>Buffer.from(bytes).toString('base64'),motionBytes:async()=>new Uint8Array(),privateVideoBytes:async()=>new Uint8Array(),animatedBackground:()=>'',motionInkPixels:()=>{},installMotionInk:()=>{}});
 assert(html.includes('data-image-scroll="vertical"'));assert.equal((html.match(/data-act-opener=/g)||[]).length,5);assert.equal((html.match(/data-native-page=/g)||[]).length,10);assert(html.includes('story-print-page'));assert(html.includes('aspect-ratio:var(--art-aspect)')&&html.includes('object-fit:contain'));assert(html.includes('type="application/json" id="project"'));const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];scripts.forEach(match=>new vm.Script(match[1]));
 const published=prepareChapter4Publication(html,'novo-estudo'),prepared=published.files.get('index.html').toString();
 assert.equal(published.manifest.sections.length,10);assert.equal(published.manifest.template,'mattar-apresentacoes-01');assert.equal(published.manifest.navigation,'embedded');assert(prepared.includes('function installTopicScroll('));assert(prepared.includes('function installSectionTransitions('));assert(prepared.includes('function installActSlides('));assert(prepared.includes('function mountPublishedPresentation('));assert.deepEqual(JSON.parse(prepared.match(/id="project">([\s\S]*?)<\/script>/)[1]),project);
});

test('passagem das imagens é salva no projeto sem alterar páginas, texto ou geometria',()=>{
 const original=model();assert.equal(original.story.imageScroll,'vertical');
 for(const mode of ['vertical','horizontal','fade']){const next=setStoryImageScroll(original,mode,photos);assert.equal(next.story.imageScroll,mode);assert.equal(readSequence(clone(next),photos,[]).story.imageScroll,mode);assert.deepEqual(next.pages,original.pages);assert.equal(original.story.imageScroll,'vertical');}
 const legacy=clone(original);delete legacy.story.imageScroll;assert.equal(Object.hasOwn(readSequence(legacy,photos,[]).story,'imageScroll'),false);
 assert.throws(()=>setStoryImageScroll(original,'inexistente',photos),/passagem das imagens/);assert.equal(original.story.imageScroll,'vertical');
});
