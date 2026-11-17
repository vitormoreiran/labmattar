import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assembleOfficial} from './build-official.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
async function setup(){const root=await mkdtemp(path.join(tmpdir(),'lab-official-test-'));const base=path.join(root,'base'),lab=path.join(root,'lab'),presentations=path.join(root,'presentations');for(const dir of [base+'/public/assets',base+'/worker',lab,presentations])await mkdir(dir,{recursive:true});await writeFile(base+'/public/assets/original.js','original');await writeFile(base+'/worker/index.js','export default {}');await writeFile(base+'/wrangler.jsonc','{}');await writeFile(base+'/baseline.json',JSON.stringify({version:'baseline',files:{'public/assets/original.js':hash('original')}}));return {root,base,lab,presentations,output:path.join(root,'output')};}
test('oficial preserva arquivos existentes, ignora a home da prévia e adiciona o Laboratório',async()=>{const f=await setup();try{await writeFile(f.lab+'/index.html','home da prévia');await writeFile(f.lab+'/compor.html','Laboratório');await assembleOfficial(f);assert.equal(await readFile(f.output+'/public/assets/original.js','utf8'),'original');assert.equal(await readFile(f.output+'/public/compor.html','utf8'),'Laboratório');await assert.rejects(readFile(f.output+'/public/index.html'),{code:'ENOENT'});}finally{await rm(f.root,{recursive:true,force:true});}});
test('recusa colisões e base divergente antes de publicar',async()=>{const f=await setup();try{await mkdir(f.lab+'/assets');await writeFile(f.lab+'/assets/original.js','alterado');await assert.rejects(assembleOfficial(f),/colide/);await writeFile(f.base+'/public/assets/original.js','alterado');await assert.rejects(assembleOfficial({...f,output:f.output+'-2'}),/Base oficial alterada/);}finally{await rm(f.root,{recursive:true,force:true});}});
test('rascunhos ficam fora do site e endereços dos projetos existentes são protegidos',async()=>{const f=await setup();try{await mkdir(f.presentations+'/ensaio');await writeFile(f.presentations+'/ensaio/publication.json',JSON.stringify({status:'draft'}));assert.equal((await assembleOfficial(f)).presentations,0);await mkdir(f.presentations+'/simposio');await assert.rejects(assembleOfficial({...f,output:f.output+'-2'}),/reservado/);}finally{await rm(f.root,{recursive:true,force:true});}});

test('complemento da galeria preserva a base e só altera o CSS montado',async()=>{
 const f=await setup();try{
  const file='public/assets/index-DaKY3Ax1.css',original='.chapter2-lightbox{display:grid}',override='\n.chapter2-lightbox{padding:20px}';
  await writeFile(path.join(f.base,file),original);
  const baseline=JSON.parse(await readFile(f.base+'/baseline.json','utf8'));baseline.files[file]=hash(original);
  await writeFile(f.base+'/baseline.json',JSON.stringify(baseline));
  await writeFile(f.lab+'/chapter2-gallery-scale.css',override);
  await assembleOfficial(f);
  assert.equal(await readFile(path.join(f.base,file),'utf8'),original);
  assert.equal(await readFile(path.join(f.output,file),'utf8'),original+override);
  assert.equal(JSON.parse(await readFile(f.base+'/baseline.json','utf8')).files[file],hash(original));
  await writeFile(path.join(f.base,file),'alteração não conferida');
  await assert.rejects(assembleOfficial({...f,output:f.output+'-tampered'}),/Base oficial alterada/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
