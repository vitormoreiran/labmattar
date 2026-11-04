import test from 'node:test';
import assert from 'node:assert/strict';
import {webDocument} from '../public/lab-presentation-export.mjs';

const clip={id:'clip-1',provider:'google',fileId:'videoFile1234',
  name:'Registro do projeto.mp4',mimeType:'video/mp4',
  x:20,y:15,width:60,aspect:16/9,frameSeconds:0};
const fonts={UniversMattar:new Uint8Array([1]),PerpetuaMattar:new Uint8Array([2])};
const scene={id:'page-1',name:'Página 1',width:1280,height:720,motions:[],clips:[clip],
  items:[{kind:'rect',x:0,y:0,w:1280,h:720,color:'#fff'},
    {kind:'image',privateClipId:clip.id,x:256,y:108,w:768,h:432,
      source:'data:image/png;base64,AA=='}]};
const project={name:'Projeto privado',pages:[{composition:{pages:[{text:{
  title:{value:'PROJETO'},body:{visible:false,value:''}
}}]}}]};
const originalFetch=globalThis.fetch;
test('HTML offline integra clipe autorizado com posição e tipo, sem token',async()=>{
  globalThis.fetch=async(url,options)=>{
    assert.match(url,/^\/api\/acervo\/media\?provider=google&id=videoFile1234$/);
    assert.equal(options.credentials,'same-origin');
    return new Response(new Uint8Array([0,0,0,32,102,116,121,112]),{
      headers:{'Content-Type':'video/mp4','Content-Length':'8'}
    });
  };
  try{
    const html=await webDocument([scene],project,[],fonts);
    assert.match(html,/data-asset="private:clip-1"/);
    assert.match(html,/"private:clip-1":"video\/mp4"/);
    assert.match(html,/"private:clip-1":"AAAAIGZ0eXA="/);
    assert.doesNotMatch(html,/access_token|refresh_token|Bearer/);
  }finally{globalThis.fetch=originalFetch;}
});
test('HTML offline recusa vídeo privado acima de 32 MB',async()=>{
  globalThis.fetch=async()=>new Response(new Uint8Array([1]),{
    headers:{'Content-Length':String(33*1024*1024)}
  });
  try{
    await assert.rejects(()=>webDocument([scene],project,[],fonts),/maior que 32 MB/);
  }finally{globalThis.fetch=originalFetch;}
});

test('HTML exporta fundo em vídeo vivo com M e poster para impressão',async()=>{
  const backgroundVideo={id:'background-1',provider:'google',fileId:'videoFile1234',
    name:'Fundo da cena.mp4',mimeType:'video/mp4',frameSeconds:0};
  const mask={viewBox:[0,0,100,100],box:{x:300,y:150,w:400,h:400},
    paths:[{d:'M0 0H100V100H0Z'}]};
  const sceneVideo={...scene,clips:[],backgroundVideo,videoVisual:{
    backdrop:'blur',markerFocus:'sharp',focusX:40,focusY:65,contrast:true,mContrast:false},
    items:[
      {kind:'rect',layer:'video-bg-base',x:0,y:0,w:1280,h:720,color:'#fff'},
      {kind:'image',layer:'video-bg-base',x:0,y:0,w:1280,h:720,source:'data:image/png;base64,AA=='},
      {kind:'group',layer:'video-bg-m',clip:mask,
        items:[{kind:'image',x:300,y:150,w:400,h:400,source:'data:image/png;base64,AA=='}]},
      {kind:'text',text:'LABMATTAR',x:20,y:35,family:'UniversMattar',size:24,spacing:0,color:'#fff'}
    ]};
  const projectVideo={...project,pages:[{...project.pages[0],backgroundVideo}]};
  globalThis.fetch=async()=>new Response(new Uint8Array([0,0,0,32,102,116,121,112]),{
    headers:{'Content-Type':'video/mp4','Content-Length':'8'}
  });
  try{
    const output=await webDocument([sceneVideo],projectVideo,[],fonts);
    assert.match(output,/class="animated-background"/);
    assert.match(output,/data-asset="private:background-1"/);
    assert.match(output,/class="bg-video-m"/);
    assert.match(output,/class="print-scene"/);
    assert.match(output,/data-video-background="true"/);
    assert.match(output,/"private:background-1":"video\/mp4"/);
    assert.doesNotMatch(output,/access_token|Bearer/);
  }finally{globalThis.fetch=originalFetch;}
});
