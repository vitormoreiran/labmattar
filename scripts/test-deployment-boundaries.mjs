import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {assembleIdentity,IDENTITY_SERVICE,IDENTITY_ORIGIN} from './build-identity.mjs';

test('identity builds independently from the portfolio and without D1',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'identity-service-'));
 const client=path.join(root,'client'),server=path.join(root,'server'),output=path.join(root,'identity');
 try{
  await mkdir(client,{recursive:true});await mkdir(server,{recursive:true});
  for(const name of ['inicio','manual','tipografia','compor','laboratorio','assinatura-email']){
   await writeFile(path.join(client,name+'.html'),'<html>'+name+'</html>');
  }
  await mkdir(path.join(server,'chunks'),{recursive:true});
  await writeFile(path.join(server,'index.js'),'export {default} from "./chunks/app.js";');
  await writeFile(path.join(server,'chunks/app.js'),'export default {fetch:()=>new Response("identity")};');
  const result=await assembleIdentity({client,server,output,sha:'1'.repeat(40)});
  assert.equal(result.service,IDENTITY_SERVICE);
  const config=JSON.parse(await readFile(path.join(output,'wrangler.jsonc'),'utf8'));
  assert.equal(config.name,IDENTITY_SERVICE);
  assert.equal(config.vars.LM_ACERVO_ORIGIN,IDENTITY_ORIGIN);
  assert.equal(config.routes,undefined,'domain cutover must be a separate controlled operation');
  assert.equal(config.d1_databases,undefined,'institutional D1 is not copied');
  assert.equal((await readFile(path.join(output,'worker/chunks/app.js'),'utf8')).includes('identity'),true);
  assert.ok(await stat(path.join(output,'public/manual.html')));
  const release=JSON.parse(await readFile(path.join(output,'public/laboratorio-release.json'),'utf8'));
  assert.equal(release.sha,'1'.repeat(40));
  assert.equal(release.service,IDENTITY_SERVICE);
  assert.equal(await stat(path.join(output,'public/capitulo-4')).catch(()=>null),null);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('portfolio assembly source can no longer append the identity build',async()=>{
 const code=await readFile(new URL('./build-official.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(code,/readdir\(lab,\{recursive:true/);
 assert.match(code,/galleryOverride/);
});
