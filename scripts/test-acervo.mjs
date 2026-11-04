import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {handleAcervoRequest} from "./acervo-api.mjs";
function request(path,options={}){
  return new Request("https://preview.example.test/api/acervo/"+path,options);
}
const notConfigured=await handleAcervoRequest(request("status"),{});
assert.equal(notConfigured.status,200);
const state=await notConfigured.json();
assert.equal(state.providers.google.configured,false);
assert.equal(state.providers.dropbox.configured,false);
assert.equal(state.providers.google.connected,false);
for(const provider of ["google","dropbox"]){
  const response=await handleAcervoRequest(request("connect/"+provider),{});
  assert.equal(response.status,503,"No OAuth redirect before secrets and origin configuration");
}
assert.equal((await handleAcervoRequest(request("media?provider=google&id=../../bad"))).status,400);
assert.equal((await handleAcervoRequest(request("media?provider=dropbox&id=foo"))).status,400);
assert.equal((await handleAcervoRequest(request("thumb?provider=google&id=123456"))).status,401);
assert.equal((await handleAcervoRequest(request("picker-token",{method:"POST",headers:{"Origin":"https://preview.example.test"}}))).status,401);
assert.equal((await handleAcervoRequest(request("picker-token",{method:"POST",headers:{"Origin":"https://attacker.test"}}))).status,403);
assert.equal((await handleAcervoRequest(request("dropbox/list"))).status,401);
assert.equal((await handleAcervoRequest(request("google/inspect",{
  method:"POST",headers:{"Origin":"https://attacker.test","Content-Type":"application/json"},
  body:JSON.stringify({ids:["foobar"]})
}))).status,403);
assert.equal((await handleAcervoRequest(request("disconnect",{
  method:"POST",headers:{"Origin":"https://attacker.test","Content-Type":"application/json"},
  body:JSON.stringify({provider:"google"})
}))).status,403);
const disconnected=await handleAcervoRequest(request("disconnect",{
  method:"POST",headers:{"Origin":"https://preview.example.test","Content-Type":"application/json"},
  body:JSON.stringify({provider:"google"})
}));
assert.equal(disconnected.status,200);
assert.match(disconnected.headers.get("set-cookie"),/HttpOnly/);
assert.match(disconnected.headers.get("set-cookie"),/Secure/);
assert.match(disconnected.headers.get("set-cookie"),/SameSite=Lax/);
assert.match(disconnected.headers.get("set-cookie"),/Max-Age=0/);

const configured={
  LM_ACERVO_ORIGIN:"https://preview.example.test",
  LM_ACERVO_ENCRYPTION_KEY:Buffer.alloc(32,7).toString("base64url"),
  LM_GOOGLE_CLIENT_ID:"test-google-client",
  LM_GOOGLE_CLIENT_SECRET:"test-google-secret",
  LM_GOOGLE_PICKER_API_KEY:"test-picker-key",
  LM_GOOGLE_APP_ID:"123456",
  LM_DROPBOX_CLIENT_ID:"test-dropbox-client",
  LM_DROPBOX_CLIENT_SECRET:"test-dropbox-secret"
};
for(const provider of ["google","dropbox"]){
  const oauth=await handleAcervoRequest(request("connect/"+provider),configured);
  assert.equal(oauth.status,302,"OAuth should redirect to provider");
  const cookie=oauth.headers.get("set-cookie");
  assert.ok(cookie,"OAuth state cookie required");
  assert.match(cookie,/HttpOnly/);
  assert.match(cookie,/Secure/);
  assert.match(cookie,/SameSite=Lax/);
  const location=new URL(oauth.headers.get("location"));
  assert.equal(location.hostname,provider==="google"?"accounts.google.com":"www.dropbox.com");
  assert.equal(location.searchParams.get("code_challenge_method"),"S256");
  assert.ok(location.searchParams.get("state"),"CSRF state required");
  assert.equal(location.searchParams.get("redirect_uri"),
    "https://preview.example.test/api/acervo/callback/"+provider);
  const unmatched=await handleAcervoRequest(
    request("callback/"+provider+"?code=bogus&state=bad",{
      headers:{Cookie:cookie.split(";")[0]}
    }),configured);
  assert.equal(unmatched.status,403,"Callback must reject invalid state");
  const originalFetch=globalThis.fetch;
  try{
    globalThis.fetch=async target=>{
      assert.equal(new URL(target).hostname,
        provider==="google"?"oauth2.googleapis.com":"api.dropboxapi.com");
      return new Response(JSON.stringify({
        access_token:"fake-test-token",refresh_token:"fake-refresh-token",expires_in:3600
      }),{status:200,headers:{"Content-Type":"application/json"}});
    };
    const callback=await handleAcervoRequest(
      request("callback/"+provider+"?code=valid-code&state="+
        encodeURIComponent(location.searchParams.get("state")),{
        headers:{Cookie:cookie.split(";")[0]}
      }),configured);
    assert.equal(callback.status,302,"Valid OAuth callback must redirect");
    const destination=new URL(callback.headers.get("location"));
    assert.equal(destination.pathname,"/compor.html","OAuth must return to composition editor");
    assert.equal(destination.searchParams.get("studio"),"1");
    assert.equal(destination.searchParams.get("acervo"),provider);
    assert.equal(destination.hash,"#laboratorio");
    assert.match(callback.headers.get("set-cookie"),/HttpOnly/,"Callback session must be private");
  }finally{globalThis.fetch=originalFetch}
}


// Public-link gallery: only indexed 01_Portfolio IDs may pass to Google.
{
  const rootId='13SMGPjdZF3jxEmM4OmWi0T1OoBPCNJqW';
  const projectId='1_IohLr8kwZIQudxG8lmzJvO6GjB3VAWN';
  const imageId='177GD8UXcmudDYJ8-UKv5O9Mrdd3oOrAv';
  const assets={fetch:async req=>{
    const path=new URL(req.url).pathname;
    if(path==='/acervo/index.json')return Response.json({schemaVersion:1,rootId,
      projects:[{id:projectId,name:'Concreto Efêmero'}]});
    if(path==='/acervo/projects/'+projectId+'.json')return Response.json({
      schemaVersion:1,projectId,entries:[{id:imageId,name:'Fotografia.jpg',
        kind:'image',mime:'image/jpeg'}]});
    return new Response('Not found',{status:404});
  }};
  let upstreamCalls=0;const originalFetch=globalThis.fetch;
  try{
    globalThis.fetch=async target=>{
      upstreamCalls++;
      assert.ok(String(target).includes('googleapis.com/drive/v3/files/'));
      return new Response(new Uint8Array([255,216,255,217]),{
        status:200,headers:{'Content-Type':'image/jpeg'}
      });
    };
    const env={ASSETS:assets,LM_GOOGLE_PICKER_API_KEY:'restricted-test-key',
      LM_ACERVO_ORIGIN:'https://preview.example.test'};
    const valid=await handleAcervoRequest(request(
      'public-media?project='+projectId+'&id='+imageId),env);
    assert.equal(valid.status,200);
    assert.equal(valid.headers.get('Content-Type'),'image/jpeg');
    assert.deepEqual([...new Uint8Array(await valid.arrayBuffer())],[255,216,255,217]);
    const before=upstreamCalls;
    const forbidden=await handleAcervoRequest(request(
      'public-media?project='+projectId+'&id=1OUTSIDEFOLDER123'),env);
    assert.equal(forbidden.status,404);
    assert.equal(upstreamCalls,before,'Unindexed files may not be fetched');
    const wrongProject=await handleAcervoRequest(request(
      'public-media?project=1OTHERPROJECT123&id='+imageId),env);
    assert.equal(wrongProject.status,404);
  }finally{globalThis.fetch=originalFetch;}
}

// Regression test: a CI deploy must not remove Dashboard OAuth variables.
const previewWorkflow=readFileSync(new URL("../.github/workflows/preview-cloudflare.yml",import.meta.url),"utf8");
assert.match(previewWorkflow,/"keep_vars": true/,"Wrangler must preserve dashboard variables");
assert.match(previewWorkflow,/wrangler deploy --config wrangler\.preview\.jsonc --keep-vars/,
  "Preview deploy must explicitly preserve dashboard variables");
for(const key of ["LM_ACERVO_ORIGIN","LM_GOOGLE_CLIENT_ID","LM_GOOGLE_APP_ID"])
  assert.ok(previewWorkflow.includes('"'+key+'"'),"Public OAuth binding missing from Worker preview config: "+key);
assert.ok(!previewWorkflow.includes('"LM_GOOGLE_CLIENT_SECRET"') &&
  !previewWorkflow.includes('"LM_GOOGLE_PICKER_API_KEY"'),
  "Sensitive/credential-bearing keys cannot be committed as Wrangler vars");
console.log("Acervo: OAuth, rotas privadas e preservação de vars no deploy conferidos.");
