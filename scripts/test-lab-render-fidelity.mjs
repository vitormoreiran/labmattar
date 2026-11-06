import test from 'node:test';
import assert from 'node:assert/strict';
import {createPage,createSection,sectionState,sequenceDocument,readSequence,hasSectionText} from '../public/lab-sequence.mjs';
import {staticFrameTime,seekStillMedia} from '../public/lab-video-export.mjs';
const photos={'64':'/ambiente-editorial/media/BOXDOSENTIR-64.jpg'};
const signature={preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(c=>[c,{kind:'none',symbol:'M.svg',text:''}]))};
const state={format:'horizontal',color:'neutral',inkColor:'auto',autoInkVersion:2,photoContrast:40,margin:7,guides:'nenhuma',marker:'none',markerFocus:'sharp',textWidth:80,titleScale:100,type:'univers',background:'photo',mContent:'photo',mPresentation:'elemento',photo:'64',mScale:45,mPositionY:50,mCaption:'LEGENDA VISÍVEL',focusX:0,focusY:100,symbol:'none',title:'',titleFonts:[],body:'',bodyMode:'oculto',kicker:'',footerLeft:'',footerRight:'',signature};
function sectionProject(patch={}){const s={...state,...patch},section=createSection('intro','Introdução',s,photos);const page={...createPage({id:'one',name:'Legenda',state:sectionState(s,section),photoCatalog:photos}),sectionId:'intro'};return sequenceDocument('Legenda',[page],[section],signature);}
test('legenda do M é texto da seção somente quando está visível',()=>{
  const doc=sectionProject();assert.equal(hasSectionText('intro',doc.pages),true);
  for(const patch of [{mContent:'off'},{mPresentation:'completo'},{mCaption:'  '}])assert.equal(hasSectionText('intro',sectionProject(patch).pages),false);
});
test('legenda isolada conserva intensidade e extremos de foco no JSON',()=>{
  for(const photoContrast of [0,20,40,60,80]){const doc=sectionProject({photoContrast}),before=structuredClone(doc),loaded=readSequence(doc,photos,[]);assert.equal(loaded.sections[0].background.contrastPercent,photoContrast);assert.equal(loaded.pages[0].state.focusX,0);assert.equal(loaded.pages[0].state.focusY,100);assert(hasSectionText('intro',loaded.pages));assert.deepEqual(doc,before);}
});
test('escalas existentes de 1–140% são legíveis nos quatro formatos',()=>{
  for(const format of ['horizontal','vertical','quadrado','editorial'])for(const mScale of [1,15,45,74,94,95,140]){const page=createPage({id:'one',name:'M',state:{...state,format,mScale},photoCatalog:photos});const doc=sequenceDocument('Escala',[page],null,signature);assert.equal(readSequence(doc,photos,[]).pages[0].state.mScale,mScale);}
});
test('quadro estático preserva zero e recusa duração incompatível',()=>{
  assert.equal(staticFrameTime(0,3),0);assert.equal(staticFrameTime(1.25,3),1.25);assert(staticFrameTime(3,3)<3);
  for(const pair of [[-1,3],[4,3],[NaN,3],[0,0],[0,Infinity]])assert.throws(()=>staticFrameTime(...pair),/quadro escolhido/);
});
class Video extends EventTarget{
  constructor(time){super();this.time=time;this.duration=3;this.readyState=2;this.videoWidth=640;this.paused=false;this.seeking=false;}
  pause(){this.paused=true;}
  get currentTime(){return this.time;}
  set currentTime(time){this.seeking=true;queueMicrotask(()=>{this.time=time;this.seeking=false;this.dispatchEvent(new Event('seeked'));});}
}
test('as quatro variantes do fundo buscam o mesmo quadro, inclusive zero',async()=>{
  const media=[0.5,1,1.5,2].map(time=>new Video(time));await seekStillMedia(media,1.25);assert(media.every(v=>v.currentTime===1.25&&v.paused));await seekStillMedia(media,0);assert(media.every(v=>v.currentTime===0));
});
