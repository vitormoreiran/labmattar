import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {configureIdentityDomain} from './configure-identity-domain.mjs';
import {migrateIdentityDomain,IDENTITY_HOST,TARGET_WORKER,PREVIOUS_WORKER,PROBE_ORIGIN} from './migrate-identity-domain.mjs';
import {verifyIdentityDomain} from './verify-identity-domain.mjs';

const baseline={accountId:'a'.repeat(32),domain:'labmattar.com',worker:PREVIOUS_WORKER};
const settings={token:'unit-test-credential',accountId:baseline.accountId,baseline};
const sha='b'.repeat(40);
const confirmation='VINCULAR IDENTIDADE AO WORKER EXCLUSIVO';

function fakeCloudflare({service=PREVIOUS_WORKER,google=true,portfolio=PREVIOUS_WORKER,version=sha,failPage='',noIdentity=false}={}){
 const calls=[];
 let identityService=service;
 const fetcher=async (url,options={})=>{
  const method=options.method||'GET';
  calls.push({url,method,body:options.body});
  if(url.startsWith(PROBE_ORIGIN)){
   const route=new URL(url).pathname;
   if(route==='/laboratorio-release.json')
    return Response.json({sha:version,service:TARGET_WORKER,origin:'https://'+IDENTITY_HOST});
   if(route==='/api/acervo/status')
    return Response.json({providers:{google:{configured:google},dropbox:{configured:false}}});
   if(route===failPage)return new Response('Not Found',{status:404});
   return new Response('<html>LABMATTAR</html>',{headers:{'content-type':'text/html'}});
  }
  if(url==='https://labmattar.com/')
   return new Response('<html>Portfolio preservado</html>',{headers:{'content-type':'text/html'}});
  if(url.includes('/workers/domains')){
   if(method==='PUT'){
    const body=JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(),['enabled','hostname','override_existing_origin','previews_enabled','service','zone_name']);
    assert.deepEqual(body,{
     hostname:IDENTITY_HOST,service:TARGET_WORKER,zone_name:baseline.domain,
     enabled:true,previews_enabled:false,override_existing_origin:true
    });
    // Cloudflare 409/100116 if the existing origin is not explicitly overridden.
    // The fake models the same constraint so no future change can silently
    // remove the flag and break the real custom-domain cutover again.
    identityService=TARGET_WORKER;
    return Response.json({success:true,result:{hostname:IDENTITY_HOST,service:TARGET_WORKER}});
   }
   const result=[
    {hostname:baseline.domain,zone_name:baseline.domain,service:portfolio,enabled:true},
    ...(!noIdentity?[{hostname:IDENTITY_HOST,zone_name:baseline.domain,service:identityService,enabled:true}]:[])
   ];
   return Response.json({success:true,result,result_info:{total_pages:1}});
  }
  throw Error('HTTP inesperado '+url);
 };
 return {calls,fetcher,getIdentity:()=>identityService};
}

test('legacy action cannot restore coupling between portfolio and identity',async()=>{
 const api=fakeCloudflare();
 await assert.rejects(configureIdentityDomain({...settings,apply:true,fetcher:api.fetcher}),/desativado/);
 assert.equal(api.calls.length,0);
 const checked=await configureIdentityDomain({...settings,fetcher:api.fetcher});
 assert.equal(checked.mode,'read-only');
 assert.ok(api.calls.every(x=>x.method==='GET'));
});

test('read-only legacy check accepts migrated identity Worker without restoring old coupling',async()=>{
 const api=fakeCloudflare({service:TARGET_WORKER});
 const result=await configureIdentityDomain({...settings,fetcher:api.fetcher});
 assert.equal(result.service,TARGET_WORKER);
 assert.equal(result.mode,'read-only');
 assert.equal(result.changed,false);
 assert.equal(result.alreadyActive,true);
 assert.ok(api.calls.every(x=>x.method==='GET'));
});

test('audit checks the exact identity release and portfolio without any writes',async()=>{
 const api=fakeCloudflare();
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,fetcher:api.fetcher});
 assert.equal(result.changed,false);
 assert.equal(result.from,PREVIOUS_WORKER);
 assert.equal(result.to,TARGET_WORKER);
 assert.equal(result.portfolioWorker,PREVIOUS_WORKER);
 assert.equal(result.googleConfigured,true);
 assert.ok(api.calls.some(x=>x.url==='https://labmattar.com/'));
 assert.equal(api.calls.filter(x=>x.method==='PUT').length,0);
 await assert.rejects(migrateIdentityDomain({...settings,expectedSha:sha,apply:true,fetcher:api.fetcher}),/explicitamente/);
 assert.ok(api.calls.every(x=>x.method==='GET'));
});

test('apply transfers only identidade.labmattar.com and confirms mapping',async()=>{
 const api=fakeCloudflare();
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,apply:true,confirmation,fetcher:api.fetcher});
 assert.equal(result.changed,true);
 assert.equal(api.getIdentity(),TARGET_WORKER);
 const writes=api.calls.filter(x=>x.method!=='GET');
 assert.equal(writes.length,1);
 assert.equal(writes[0].method,'PUT');
 assert.equal(writes[0].url,'https://api.cloudflare.com/client/v4/accounts/'+baseline.accountId+'/workers/domains');
 assert.equal(result.portfolio,baseline.domain);
});

test('cutover does not touch the institutional hostname when overriding the identity origin',async()=>{
 const api=fakeCloudflare();
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,apply:true,confirmation,fetcher:api.fetcher});
 assert.equal(result.portfolio,'labmattar.com');
 assert.equal(result.portfolioWorker,PREVIOUS_WORKER);
 assert.equal(api.getIdentity(),TARGET_WORKER);
 assert.equal(api.calls.filter(x=>x.method==='PUT').length,1);
 const put=JSON.parse(api.calls.find(x=>x.method==='PUT').body);
 assert.equal(put.hostname,IDENTITY_HOST);
 assert.notEqual(put.hostname,'labmattar.com');
 assert.equal(put.override_existing_origin,true);
 assert.equal(Object.hasOwn(put,'override_existing_dns_record'),false);
 assert.equal(Object.hasOwn(put,'override_scope'),false);
 assert.equal(api.calls.filter(x=>x.method==='DELETE').length,0);
});

test('already-transferred identity is idempotent; never attempts PUT again',async()=>{
 const api=fakeCloudflare({service:TARGET_WORKER});
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,apply:true,confirmation,fetcher:api.fetcher});
 assert.equal(result.changed,false);
 assert.equal(result.to,TARGET_WORKER);
 assert.ok(api.calls.every(x=>x.method==='GET'));
});

test('fails closed on another domain worker, missing domain, unready identity or Google',async()=>{
 for(const options of [
  {service:'unrelated-worker'}, {portfolio:'unrelated-worker'}, {noIdentity:true},
  {google:false}, {version:'a'.repeat(40)}, {failPage:'/manual'}
 ]){
  const api=fakeCloudflare(options);
  await assert.rejects(migrateIdentityDomain({...settings,expectedSha:sha,apply:true,confirmation,fetcher:api.fetcher}));
  assert.ok(api.calls.every(x=>x.method==='GET'),JSON.stringify(options));
 }
});


test('read-only audit retries a transient ECONNRESET without touching domains',async()=>{
 const api=fakeCloudflare();
 let attempts=0;
 const fetcher=(url,options)=>{
  if(url.startsWith(PROBE_ORIGIN+'/manual?')&&attempts++===0){
   return Promise.reject(Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}}));
  }
  return api.fetcher(url,options);
 };
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,fetcher});
 assert.equal(result.mode,'read-only');
 assert.equal(result.changed,false);
 assert.equal(attempts,2);
 assert.equal(api.calls.filter(x=>x.method!=='GET').length,0);
});

test('repeated TLS read failures stop the transfer before any PUT',async()=>{
 const api=fakeCloudflare();
 let attempts=0;
 const fetcher=(url,options)=>{
  if(url.startsWith(PROBE_ORIGIN+'/manual?')){
   attempts++;
   return Promise.reject(Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}}));
  }
  return api.fetcher(url,options);
 };
 await assert.rejects(migrateIdentityDomain({
  ...settings,expectedSha:sha,apply:true,confirmation,fetcher
 }),/Falha de rede ao conferir \/manual apos 3 tentativas/);
 assert.equal(attempts,3);
 assert.equal(api.calls.filter(x=>x.method!=='GET').length,0);
});

test('identity Worker and portfolio Worker have independent releases and D1',async()=>{
 const original=JSON.parse(await readFile(new URL('../site-oficial/wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(original.name,PREVIOUS_WORKER);
 assert.equal(original.keep_vars,true);
 assert.equal(original.d1_databases?.[0]?.binding,'DB');
 const source=await readFile(new URL('./build-identity.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("IDENTITY_SERVICE='labmattar-identidade'"));
 assert.ok(source.includes('LM_ACERVO_ORIGIN'));
});

test('identity domain verification checks manual and tools on exact release',async()=>{
 const visited=[];
 const fetcher=async (url,options={})=>{
  visited.push(url);const pathname=new URL(url).pathname;
  if(pathname==='/laboratorio-release.json')return Response.json({sha});
  if(pathname==='/api/acervo/status')return Response.json({providers:{google:{},dropbox:{}}});
  if(options.headers?.Range)return new Response('media');
  const marks={'/':'00 / Introdução id="sistemas"',
   '/laboratorio':'class="lm-lab-tool-grid" CARTÃO MATTAR',
   '/compor':'id="labArtboard" id="labAcervo"',
   '/assinatura-email':'Cartão MATTAR id="signatureForm"'};
  return new Response('<html>LABMATTAR '+(marks[pathname]||'')+'</html>',
   {headers:{'content-type':'text/html'}});
 };
 const result=await verifyIdentityDomain({expected:sha,fetcher});
 assert.equal(result.pages,11);
 assert.ok(visited.every(url=>url.startsWith('https://'+IDENTITY_HOST+'/')));
});
