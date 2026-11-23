import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

export const IDENTITY_HOST='identidade.labmattar.com';
export const TARGET_WORKER='labmattar-identidade';
export const PREVIOUS_WORKER='mattar-portfolio';
export const PROBE_ORIGIN='https://labmattar-identidade.vitormoreiran.workers.dev';
const PORTFOLIO_ORIGIN='https://labmattar.com';
const PAGES=['/inicio','/manual','/tipografia','/laboratorio','/compor',
 '/assinatura-email','/motion/matriz/index.html'];

// Read-only by default. No DNS changes, deletions, or deployment of the portfolio.
export async function migrateIdentityDomain({
 token,accountId,baseline,apply=false,expectedSha,confirmation,fetcher=fetch
}) {
 if(!token||accountId!==baseline.accountId||baseline.worker!==PREVIOUS_WORKER||
   baseline.domain!=='labmattar.com') {
  throw Error('A conta Cloudflare nao corresponde a base institucional preservada.');
 }
 if(!/^[a-f0-9]{40}$/.test(expectedSha||''))throw Error('Revisao da identidade invalida.');
 if(apply&&confirmation!=='VINCULAR IDENTIDADE AO WORKER EXCLUSIVO'){
  throw Error('Migracao nao autorizada explicitamente.');
 }
 const endpoint='https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/domains';
 async function api(url,options={}) {
  const response=await fetcher(url,{
   ...options,
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   signal:AbortSignal.timeout(20000)
  });
  const data=await response.json();
  if(!response.ok||data.success!==true){
   const detail=(data.errors||[]).map(e=>e.code+': '+e.message).join('; ').slice(0,250);
   throw Error('Cloudflare recusou a operacao (HTTP '+response.status+'). '+detail);
  }
  return data;
 }
 async function listDomains() {
  const data=await api(endpoint+'?per_page=100&page=1');
  if((data.result_info?.total_pages||1)!==1)throw Error('Lista paginada: verificar manualmente.');
  if(!Array.isArray(data.result))throw Error('Resposta de dominios inesperada.');
  const portfolio=data.result.find(d=>d.hostname===baseline.domain);
  const identity=data.result.find(d=>d.hostname===IDENTITY_HOST);
  if(!portfolio||portfolio.service!==PREVIOUS_WORKER||portfolio.zone_name!==baseline.domain||
     portfolio.enabled!==true)throw Error('O dominio institucional deve permanecer em mattar-portfolio.');
  if(!identity||identity.zone_name!==baseline.domain||identity.enabled!==true){
   throw Error('Dominio da identidade ausente ou desativado. Nenhum vinculo foi alterado.');
  }
  if(![PREVIOUS_WORKER,TARGET_WORKER].includes(identity.service)){
   throw Error('Dominio da identidade pertence a outro Worker.');
  }
  return {portfolio,identity};
 }

 const before=await listDomains();
 const manifestResponse=await fetcher(
  PROBE_ORIGIN+'/laboratorio-release.json?revision='+expectedSha,
  {cache:'no-store',signal:AbortSignal.timeout(15000)}
 );
 if(!manifestResponse.ok)throw Error('Manifesto do Worker independente indisponivel.');
 const manifest=await manifestResponse.json();
 if(manifest.sha!==expectedSha||manifest.service!==TARGET_WORKER||
   manifest.origin!=='https://'+IDENTITY_HOST){
  throw Error('Worker independente nao corresponde a revisao e origem esperadas.');
 }
 for(const route of PAGES){
  const response=await fetcher(PROBE_ORIGIN+route+'?cutover='+expectedSha,
   {redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html')){
   throw Error('Pagina da identidade nao validada: '+route+' ('+response.status+').');
  }
  await response.body?.cancel();
 }
 const googleResponse=await fetcher(PROBE_ORIGIN+'/api/acervo/status',
  {cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!googleResponse.ok)throw Error('API do acervo indisponivel no Worker independente.');
 const providers=await googleResponse.json();
 if(providers.providers?.google?.configured!==true){
  throw Error('Google Drive nao configurado no Worker independente: corrigir antes da migracao.');
 }
 const portfolioResponse=await fetcher(PORTFOLIO_ORIGIN+'/',
  {redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!portfolioResponse.ok){
  throw Error('Site institucional indisponivel: interromper a migracao.');
 }
 await portfolioResponse.body?.cancel();

 let changed=false;
 if(apply&&before.identity.service===PREVIOUS_WORKER){
  // Preserve the active hostname and its preview-routing state; no DELETE or DNS writes.
  // These fields are documented optional parameters for PUT /workers/domains.
  const bound=await api(endpoint,{method:'PUT',body:JSON.stringify({
   hostname:IDENTITY_HOST,service:TARGET_WORKER,zone_name:baseline.domain,
   enabled:true,previews_enabled:before.identity.previews_enabled===true
  })});
  if(bound.result?.service!==TARGET_WORKER||bound.result?.hostname!==IDENTITY_HOST){
   throw Error('Resposta do novo vinculo nao corresponde ao Worker da identidade.');
  }
  changed=true;
 }
 if(apply){
  // Verify the persisted mapping, not only the PUT response. Portfolio must be unchanged.
  let confirmed=false;
  for(let attempt=0;attempt<4;attempt++){
   const after=await listDomains();
   if(after.identity.service===TARGET_WORKER){confirmed=true;break;}
   if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1500));
  }
  if(!confirmed)throw Error('A Cloudflare ainda nao confirmou a transferencia.');
 }
 return {
  hostname:IDENTITY_HOST,
  from:before.identity.service,
  to:TARGET_WORKER,
  portfolio:baseline.domain,
  portfolioWorker:PREVIOUS_WORKER,
  revision:expectedSha,
  googleConfigured:true,
  mode:apply?'apply':'read-only',
  changed
 };
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
 if(result.changed){
  await mkdir('dist',{recursive:true});
  await writeFile('dist/identity-domain-migration.json',JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result));
}
