import {cp,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';

export const IDENTITY_SERVICE='labmattar-identidade';
export const IDENTITY_ORIGIN='https://identidade.labmattar.com';
export async function assembleIdentity({client,server,output,sha='local'}) {
 if(await stat(output).catch(()=>null))throw Error('Identity output already exists: '+output);
 for(const file of ['inicio.html','manual.html','tipografia.html','compor.html','laboratorio.html','assinatura-email.html']){
  if(!(await stat(path.join(client,file)).catch(()=>null)))throw Error('Missing identity asset: '+file);
 }
 if(!(await stat(path.join(server,'index.js')).catch(()=>null)))throw Error('Missing identity server bundle');
 await mkdir(path.join(output,'worker'),{recursive:true});
 await cp(client,path.join(output,'public'),{recursive:true});
 // Keep all Vinext server chunks: index.js can import siblings at runtime.
 await cp(server,path.join(output,'worker'),{recursive:true,force:true});
 await cp(path.resolve('scripts/acervo-api.mjs'),path.join(output,'worker/acervo-api.mjs'));
 await cp(path.resolve('identity/worker/entry.mjs'),path.join(output,'worker/entry.mjs'));
 // Uses no portfolio Worker, legacy published assets, or institutional D1 database.
 const wrangler={
  $schema:'node_modules/wrangler/config-schema.json',
  name:IDENTITY_SERVICE,
  main:'worker/entry.mjs',
  compatibility_date:'2026-10-01',
  compatibility_flags:['nodejs_compat'],
  assets:{directory:'public',binding:'ASSETS',run_worker_first:['/','/api/acervo/*','/imagem','/imagem.html','/capitulo-4/*','/editar*']},
  workers_dev:true,
  keep_vars:true,
  vars:{
   LM_ACERVO_ORIGIN:IDENTITY_ORIGIN,
   LM_GOOGLE_CLIENT_ID:'805873227008-c9524mq3ld7apu4rpcb4uo4p4acrcjtn.apps.googleusercontent.com',
   LM_GOOGLE_APP_ID:'805873227008'
  }
 };
 await writeFile(path.join(output,'wrangler.jsonc'),JSON.stringify(wrangler,null,2)+'\n');
 await writeFile(path.join(output,'public/laboratorio-release.json'),JSON.stringify({sha,service:IDENTITY_SERVICE,origin:IDENTITY_ORIGIN},null,2)+'\n');
 return {sha,service:IDENTITY_SERVICE,origin:IDENTITY_ORIGIN};
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 console.log(await assembleIdentity({
  client:path.resolve(process.argv[2]||'dist/client'),
  server:path.resolve(process.argv[3]||'dist/server'),
  output:path.resolve(process.argv[4]||'dist/identity'),
  sha:process.env.GITHUB_SHA||'local'
 }));
}
