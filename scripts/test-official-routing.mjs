import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

test('portfolio routes remain original and identity routes are not served by labmattar.com',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'portfolio-routing-'));
 try{
  await copyFile(new URL('../site-oficial/worker/entry.mjs',import.meta.url),path.join(root,'entry.mjs'));
  await writeFile(path.join(root,'package.json'),'{"type":"module"}');
  await writeFile(path.join(root,'index.js'),'export default {fetch(request){return new Response("original:"+new URL(request.url).pathname)}};');
  const {default:worker}=await import(pathToFileURL(path.join(root,'entry.mjs')).href);
  const env={};
  // All preexisting portfolio endpoints retain the original handling.
  for(const route of ['/','/capitulo-4/sesc','/capitulo-4/bradesco',
   '/capitulo-4/simposio/','/editar','/assets/chapter1-opening.mp4',
   '/assets/chapter-text-motion-v1.js','/fonts/univers-lt-std-45-light.otf',
   '/api/projects','/chapter2']){
   const response=await worker.fetch(new Request('https://labmattar.com'+route),env,{});
   assert.equal(await response.text(),'original:'+new URL(route,'https://labmattar.com').pathname,route);
  }
  // Neither duplicate HTML nor redirect-to-manual pages remain on the portfolio.
  for(const route of ['/inicio','/inicio.html','/manual','/motion.html',
   '/tipografia','/tipografia.html','/cores','/composicao.html',
   '/laboratorio','/compor.html?studio=1','/montar','/identidade',
   '/redes','/imagem.html','/assinatura-email','/aplicacoes-validadas',
   '/validacao-identidade','/motion/matriz/index.html',
   '/motion/videos/m-form.mp4','/identidade-kit/fontes-vigentes.zip',
   '/api/acervo/projects']){
   const response=await worker.fetch(new Request('https://labmattar.com'+route),env,{});
   assert.equal(response.status,404,route);
   assert.equal(response.headers.get('location'),null,route);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
