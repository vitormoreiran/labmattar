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
assert.equal((await handleAcervoRequest(request("picker-token"))).status,401);
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
console.log("Acervo: controles de origem, tipos, conexões e isolamento de sessão conferidos.");
