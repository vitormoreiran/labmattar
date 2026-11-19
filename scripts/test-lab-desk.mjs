import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {readSequence} from '../public/lab-sequence.mjs';
import {createStoryTemplate,updateStoryText,addStoryPhotos,setStoryCaption} from '../public/lab-story-project.mjs';
import {storyTopic} from '../public/lab-story-model.mjs';
import {pageRows,pageFingerprint,changeContent,duplicatePage,moveSelected} from '../public/lab-desk-model.mjs';
const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const photos={'64':data};
const signature={preset:'navigation',scale:100,slots:{tl:{kind:'brand',symbol:'M.svg',text:''},tr:{kind:'symbol',symbol:'M.svg',text:''},bl:{kind:'symbol',symbol:'vaso_03.svg',text:''},br:{kind:'text',symbol:'M.svg',text:'2026'}}};
const state={format:'horizontal',color:'neutral',margin:9,guides:'nenhuma',marker:'none',markerFocus:'blur',textWidth:70,textPositionY:50,titleScale:85,type:'perpetua',background:'photo',mContent:'off',mPresentation:'elemento',photo:'64',photoContrast:45,photoEffect:'auto',photoBlur:0,photoGlass:0,mScale:100,focusX:50,focusY:50,symbol:'none',title:'',body:'',bodyMode:'oculto',kicker:'',footerLeft:'',footerRight:'',signature};
const model=()=>createStoryTemplate({state,photoCatalog:photos,name:'Meu projeto',signature}),clone=value=>JSON.parse(JSON.stringify(value));

test('mesa começa com capa e introdução; o modelo anterior conserva suas dez seções',()=>{
 const minimal=createStoryTemplate({state,photoCatalog:photos,name:'Novo',minimal:true});assert.equal(minimal.story.topics.length,2);assert.equal(minimal.pages.length,2);readSequence(minimal,photos,[]);assert.equal(model().story.topics.length,10);
});
test('edição no inspector conserva texto integral, fotografia, geometria do M e dados de outras seções',()=>{
 const original=model(),id=original.story.topics[1].photoPageIds[0],before=clone(original),body=('Toda a leitura — com acentos, espaços e parágrafos.\n\n').repeat(24);
 const next=changeContent(original,id,{title:'Introdução',body},photos),topic=storyTopic(next,original.story.topics[1].id);
 assert.equal(topic.body,body);assert.equal(topic.title,'Introdução');assert.deepEqual(original,before);assert.deepEqual(next.pages[0],original.pages[0]);
 assert.deepEqual(next.pages.find(p=>p.id===id).composition.pages[0].m,original.pages.find(p=>p.id===id).composition.pages[0].m);readSequence(next,photos,[]);
 const rows=pageRows(next);assert.equal(rows.find(p=>p.id===id).body,body);assert.notEqual(pageFingerprint(next.pages.find(p=>p.id===id)),pageFingerprint(original.pages.find(p=>p.id===id)));
});
test('duplicar e ordenar uma imagem conserva a leitura integral e a legenda com IDs únicos',()=>{
 let doc=model(),topicId=doc.story.topics[1].id;doc=updateStoryText(doc,topicId,{title:'Introdução',body:'Texto completo. '.repeat(40)},photos);doc=addStoryPhotos(doc,topicId,[{key:'loc-aabbccddeeff0011',uri:data,name:'Segunda imagem'}],photos);
 const id=doc.story.topics[1].photoPageIds[1];doc=setStoryCaption(doc,topicId,id,'Legenda preservada',photos);const before=clone(doc),result=duplicatePage(doc,id,photos),topic=storyTopic(result.document,topicId);
 assert.equal(result.document.pages.length,doc.pages.length+1);assert.equal(topic.body,storyTopic(doc,topicId).body);assert.equal(topic.photos.find(p=>p.page.id===result.id).caption,'Legenda preservada');assert.deepEqual(doc,before);
 assert.equal(new Set(result.document.pages.map(p=>p.id)).size,result.document.pages.length);const moved=moveSelected(result.document,result.id,-1,photos);assert.equal(storyTopic(moved.document,topicId).body,topic.body);assert.equal(storyTopic(moved.document,topicId).photos.find(p=>p.page.id===moved.id).caption,'Legenda preservada');readSequence(moved.document,photos,[]);
 assert.throws(()=>duplicatePage(doc,'inexistente',photos),/não encontrada/);assert.throws(()=>moveSelected(doc,doc.pages[0].id,-1,photos),/mesma seção/);assert.deepEqual(doc,before);
});
test('as 86 miniaturas correspondem exatamente aos documentos nativos publicados',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../public/presentation-models/thumbs/manifest.json',import.meta.url)));let count=0;
 for(const item of manifest.projects){const doc=JSON.parse(await fs.readFile(new URL('../public/presentation-models/'+item.id+'.labmattar.json',import.meta.url)));assert.equal(item.pages.length,doc.pages.length);for(const page of item.pages){const native=doc.pages.find(p=>p.id===page.id);assert(native);assert.equal(page.fingerprint,pageFingerprint(native));await fs.access(new URL('../public'+page.image,import.meta.url));count++;}}assert.equal(count,86);
});

test('páginas avulsas editam título e corpo mantendo o formato e as proporções',()=>{
 const story=model(),doc={...story,story:undefined,pages:[clone(story.pages[0])]};delete doc.story;const before=clone(doc),id=doc.pages[0].id;const next=changeContent(doc,id,{title:'OUTRO TÍTULO',body:'Texto da página'},photos);assert.equal(pageRows(next)[0].title,'OUTRO TÍTULO');assert.equal(pageRows(next)[0].body,'Texto da página');assert.deepEqual(next.pages[0].composition.pages[0].m,doc.pages[0].composition.pages[0].m);assert.deepEqual(next.pages[0].composition.pages[0].surface,doc.pages[0].composition.pages[0].surface);assert.deepEqual(doc,before);readSequence(next,photos,[]);
});
