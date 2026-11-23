import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

export const IDENTITY_HOST='identidade.labmattar.com';
export const TARGET_WORKER='labmattar-identidade';
export const PREVIOUS_WORKER='mattar-portfolio';
export const PROBE_ORIGIN='https://labmattar-identidade.vitormoreiran.workers.dev';

// Read-only by default. Domain migration is an explicit guarded step AFTER
// deploying, reviewing, and configuring OAuth secrets on the standalone Worker.
export async function migrateIdentityDomain({
 token,accountId,baseline,apply=false,expectedSha,confirmation,
 fetcher=fetch
}) {
 if(!token||accountId!==baseline.accountId||baseline.worker!==PREVIOUS_WORKER||baseline.domain!=='labmattar.com') {
  throw Error('Conta Cloudflare não corresponde à base institucional preservada.');
 }
 if(!/^[a-f0-9]{40}$/.test(expectedSha||''))throw Error('Informe a revisão exata do Worker de identidade.');
 if(apply&&confirmation!=='VINCULAR IDENTIDADE AO WORKER EXCLUSIVO')throw Error('Migração não autorizada explicitamente.');
 async function requestJson(url,opts={}) {
  const response=await fetcher(url,{...opts,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});
  const body=await response.json();
  if(!response.ok||!body.success)throw Error('Cloudflare recusou a consulta/alteração do domínio (HTTP '+response.status+').');
  return body;
 }
 const url='https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/domains';
 const response=await requestJson(url+'?per_page=100&page=1');
 if((response.result_info?.total_pages||1)>1)throw Error('Paginação adicional de domínios: conferir manualmente antes da migração.');
 const bindings=response.result||[];
 const current=bindings.find(x=>x.hostname.toLowerCase()===IDENTITY_HOST);
 if(!current||current.zone_name!==baseline.domain||!current.enabled)throw Error('Vínculo atual inesperado: não alterar o domínio.');
 if(![PREVIOUS_WORKER,TARGET_WORKER].includes(current.service))throw Error('Domínio pertence a outro Worker.');
 // Readiness must be measured against the standalone service, not the old Worker.
 const check=await fetcher(PROBE_ORIGIN+'/laboratorio-release.json?sha='+expectedSha,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
 if(!check.ok)throw Error('Worker independente sem manifesto acessível.');
 const released=await check.json();
 if(released.sha!==expectedSha||released.service!==TARGET_WORKER)throw Error('Worker independente não corresponde à revisão esperada.');
 for(const page of ['/inicio','/manual','/tipografia','/laboratorio','/compor','/assinatura-email','/motion/matriz/index.html']){
  const pageResponse=await fetcher(PROBE_ORIGIN+page+'?migration='+expectedSha,{redirect:'follow',signal:AbortSignal.timeout(20000)});
  if(!pageResponse.ok)throw Error('Worker independente falhou em '+page+': '+pageResponse.status);
  await pageResponse.body?.cancel();
 }
 let changed=false;
 if(apply&&current.service===PREVIOUS_WORKER){
  const bound=await requestJson(url,{method:'PUT',body:JSON.stringify({
   hostname:IDENTITY_HOST,service:TARGET_WORKER,zone_name:baseline.domain,
   enabled:true,previews_enabled:current.previews_enabled===true
  })});
  if(bound.result?.service!==TARGET_WORKER||bound.result?.hostname!==IDENTITY_HOST||!bound.result?.enabled)throw Error('Cloudflare não confirmou o novo vínculo.');
  changed=true;
 }
 return {hostname:IDENTITY_HOST,from:current.service,to:TARGET_WORKER,
  revision:expectedSha,mode:apply?'apply':'read-only',changed};
}

if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 const baseline=JSON.parse(await readFile('site-oficial/baseline.json','utf8'));
 const result=await migrateIdentityDomain({
  token:process.env.CLOUDFLARE_API_TOKEN,
  accountId:process.env.CLOUDFLARE_ACCOUNT_ID,
  baseline,
  apply:process.argv.includes('--apply'),
  expectedSha:process.env.IDENTITY_RELEASE_SHA,
  confirmation:process.env.IDENTITY_CUTOVER_CONFIRM
 });
 console.log(JSON.stringify(result));
 if(result.changed){
  await mkdir('dist',{recursive:true});
  await writeFile('dist/identity-domain-migration.json',JSON.stringify(result,null,2));
 }
}
