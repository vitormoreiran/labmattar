import assert from "node:assert/strict";
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

console.log("Acervo: controles de origem, tipos, conexões e isolamento de sessão conferidos.");
