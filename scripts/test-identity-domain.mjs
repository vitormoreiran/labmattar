import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {configureIdentityDomain} from './configure-identity-domain.mjs';
import {migrateIdentityDomain,IDENTITY_HOST,TARGET_WORKER,PREVIOUS_WORKER,PROBE_ORIGIN} from './migrate-identity-domain.mjs';
import {verifyIdentityDomain} from './verify-identity-domain.mjs';

const baseline={accountId:'a'.repeat(32),domain:'labmattar.com',worker:'mattar-portfolio'};
const settings={token:'unit-test-credential',accountId:baseline.accountId,baseline};
const sha='b'.repeat(40);
function fakeCloudflare(existingService=PREVIOUS_WORKER){
 const calls=[];
 const fetcher=async (url,options={})=>{
  calls.push({url,method:options.method||'GET'});
  if(url.startsWith(PROBE_ORIGIN)){
   if(url.includes('laboratorio-release.json'))return Response.json({sha,service:TARGET_WORKER});
   return new Response('<html>LABMATTAR</html>',{headers:{'content-type':'text/html'}});
  }
  if(url.includes('/workers/domains')){
   if(options.method==='PUT')return Response.json({success:true,result:{...JSON.parse(options.body),enabled:true}});
   return Response.json({success:true,result:[{hostname:IDENTITY_HOST,zone_name:'labmattar.com',service:existingService,enabled:true,previews_enabled:false}]});
  }
  throw Error('Unexpected HTTP call '+url);
 };
 return {calls,fetcher};
}
test('legacy action cannot restore the identity/portfolio coupling',async()=>{
 const api=fakeCloudflare();
 await assert.rejects(configureIdentityDomain({...settings,apply:true,fetcher:api.fetcher}),/desativado/);
 assert.equal(api.calls.length,0);
 const checked=await configureIdentityDomain({...settings,fetcher:api.fetcher});
 assert.equal(checked.mode,'read-only');
 assert.equal(api.calls.every(x=>x.method==='GET'),true);
});

test('migration audits the standalone Worker before any binding change',async()=>{
 const api=fakeCloudflare();
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,fetcher:api.fetcher});
 assert.equal(result.changed,false);
 assert.equal(result.from,PREVIOUS_WORKER);
 assert.equal(result.to,TARGET_WORKER);
 assert.equal(api.calls.some(x=>x.method==='PUT'),false);
 await assert.rejects(migrateIdentityDomain({...settings,expectedSha:sha,apply:true,fetcher:api.fetcher}),/explicitamente/);
 assert.equal(api.calls.some(x=>x.method==='PUT'),false);
});
test('migration changes exactly the identity domain only with explicit cutover authorization',async()=>{
 const api=fakeCloudflare();
 const result=await migrateIdentityDomain({...settings,expectedSha:sha,apply:true,
  confirmation:'VINCULAR IDENTIDADE AO WORKER EXCLUSIVO',fetcher:api.fetcher});
 assert.equal(result.changed,true);
 const puts=api.calls.filter(x=>x.method==='PUT');
 assert.equal(puts.length,1);
 assert.equal(puts[0].url,'https://api.cloudflare.com/client/v4/accounts/'+baseline.accountId+'/workers/domains');
 const other=fakeCloudflare('other-service');
 await assert.rejects(migrateIdentityDomain({...settings,expectedSha:sha,fetcher:other.fetcher}),/outro Worker/);
 assert.equal(other.calls.some(x=>x.method==='PUT'),false);
});

test('identity Worker and portfolio Worker use different releases and no shared D1',async()=>{
 const original=JSON.parse(await readFile(new URL('../site-oficial/wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(original.name,PREVIOUS_WORKER);
 assert.equal(original.keep_vars,true);
 assert.equal(original.d1_databases?.[0]?.binding,'DB','institutional D1 stays with the portfolio');
 const source=await readFile(new URL('./build-identity.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("IDENTITY_SERVICE='labmattar-identidade'"));
 assert.ok(source.includes('LM_ACERVO_ORIGIN'));
});

test('identity domain verification checks manual and tools on the exact release',async()=>{
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
  return new Response('<html>LABMATTAR '+(marks[pathname]||'')+'</html>',{headers:{'content-type':'text/html'}});
 };
 const result=await verifyIdentityDomain({expected:sha,fetcher});
 assert.equal(result.pages,11);
 assert.ok(visited.every(url=>url.startsWith('https://'+IDENTITY_HOST+'/')));
});
