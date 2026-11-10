import test from 'node:test';
import assert from 'node:assert/strict';
import {fitBox,vectorTransform} from '../public/lab-geometry.mjs';
import {sceneSvg} from '../public/lab-scene.mjs';

test('encaixe e recorte preservam a proporção, inclusive em caixas incompatíveis',()=>{
  for(const [w,h] of [[990.08,743.18],[200.33,164.82],[316.29,110.71],[1,20],[20,1]])
    for(const box of [{x:7,y:11,w:800,h:90},{x:0,y:0,w:40,h:500}])
      for(const fit of ['contain','cover']){
        const result=fitBox(w,h,box,{fit});
        assert(Math.abs(result.w/result.h-w/h)<1e-10);
        if(fit==='contain')assert(result.w<=box.w+1e-9&&result.h<=box.h+1e-9);
        else assert(result.w>=box.w-1e-9&&result.h>=box.h-1e-9);
      }
});
test('fragmentos conservam origem e alinhamento sem alterar seus contornos',()=>{
  const vector={viewBox:[10,20,100,50],box:{x:5,y:7,w:60,h:90}};
  assert.deepEqual(vectorTransform({...vector,alignY:0}),{scale:.6,x:-1,y:-5});
  assert.deepEqual(vectorTransform({...vector,alignY:1}),{scale:.6,x:-1,y:55});
});
test('dimensões inválidas interrompem o render em vez de deformar o conteúdo',()=>{
  for(const n of [0,-1,NaN,Infinity]){
    assert.throws(()=>fitBox(n,100,{x:0,y:0,w:100,h:100}),/Dimensão inválida/);
    assert.throws(()=>vectorTransform({viewBox:[0,0,100,n],box:{x:0,y:0,w:100,h:100}}),/Dimensão inválida/);
  }
});
test('SVG e HTML usam escala única e preservam a proporção das imagens',()=>{
  const source=sceneSvg({width:300,height:200,items:[
    {kind:'vector',viewBox:[0,0,100,100],box:{x:0,y:0,w:200,h:50},paths:[{d:'M0 0H100V100Z'}],color:'#000'},
    {kind:'image',source:'data:image/png;base64,AA==',x:0,y:0,w:50,h:200}
  ]});
  assert.match(source,/translate\(75 0\) scale\(0.5\)/);
  assert.match(source,/preserveAspectRatio="xMidYMid meet"/);
  assert(!source.includes('preserveAspectRatio="none"'));
  const mask=sceneSvg({width:100,height:100,items:[{kind:'group',clip:{viewBox:[0,0,100,100],box:{x:0,y:0,w:80,h:50},paths:[{d:'M0 0H100V100Z'}]},items:[]}]});
  assert.match(mask,/<clipPath[^>]*><path/);
});
