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
