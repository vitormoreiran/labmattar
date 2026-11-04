/* LABMATTAR / Acervo conectado (Google Drive + Dropbox).
 * Read-only provider access. Tokens are AES-GCM sealed in per-browser HttpOnly
 * cookies, never persisted in Git, localStorage, URLs or the composition JSON.
 * The Google Picker receives only a short-lived access token in memory.
 */
const BASE="/api/acervo/";
const SESSION_AGE=7*24*60*60;
const STATE_AGE=10*60*1000;
const SESSION_COOKIES={google:"__Host-lm-acervo-google",dropbox:"__Host-lm-acervo-dropbox"};
const STATE_COOKIE="__Host-lm-acervo-pending";
const PROVIDERS=["google","dropbox"];
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif"]);
const VIDEO_TYPES=new Set(["video/mp4","video/webm","video/quicktime"]);
const FILE_TYPES=new Set([...IMAGE_TYPES,...VIDEO_TYPES]);
const DROPBOX_EXT={
  jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",
  mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime"
};
const JSON_HEADERS={
  "Cache-Control":"private, no-store, max-age=0",
  "Content-Type":"application/json; charset=utf-8",
  "X-Content-Type-Options":"nosniff",
  "Cross-Origin-Resource-Policy":"same-origin",
  "Referrer-Policy":"no-referrer",
  "X-Frame-Options":"DENY"
};
const utf8=new TextEncoder();
function json(data,status=200,extras={}){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extras}})}
function deny(message,status=400){return json({error:message},status)}
function random(bytes=24){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return base64url(b)}
function base64url(bytes){
  let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function unbase64url(value){
  if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error("invalid encoding");
  const s=atob(value.replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from(s,c=>c.charCodeAt(0));
}
function cookies(request){
  const all={};
  for(const entry of (request.headers.get("cookie")||"").split(";")){
    const pos=entry.indexOf("=");
    if(pos>0)all[entry.slice(0,pos).trim()]=entry.slice(pos+1).trim();
  }
  return all;
}
function cookieName(name,request){
  // Browser localhost has no HTTPS; never relax Secure on a public hostname.
  if(new URL(request.url).hostname==="localhost"||new URL(request.url).hostname==="127.0.0.1")
    return name.replace("__Host-","lm-dev-");
  return name;
}
function cookieHeader(name,value,request,maxAge=SESSION_AGE){
  const local=cookieName(name,request).startsWith("lm-dev-");
  return cookieName(name,request)+"="+value+"; Path=/; HttpOnly; SameSite=Lax; "+
    (local?"":"Secure; ")+(maxAge===0?"Max-Age=0":"Max-Age="+maxAge);
}
function withCookie(response,value){response.headers.append("Set-Cookie",value);return response}
function origin(request,env){
  const url=new URL(request.url);
  const local=url.hostname==="localhost"||url.hostname==="127.0.0.1";
  if(!local && url.protocol!=="https:")throw Error("HTTPS obrigatório");
  if(env.LM_ACERVO_ORIGIN && env.LM_ACERVO_ORIGIN!==url.origin)
    throw Error("Origem não autorizada");
  if(!local && !env.LM_ACERVO_ORIGIN)throw Error("Origem OAuth não configurada");
  return url.origin;
}
function sameOriginPost(request){
  return request.headers.get("origin")===new URL(request.url).origin &&
    request.headers.get("sec-fetch-site")!=="cross-site";
}
function isBrowserSameOrigin(request){
  const site=request.headers.get("sec-fetch-site");
  return site!=="cross-site" && site!=="same-site";
}
function connectedConfigured(env,provider){
  if(!env.LM_ACERVO_ENCRYPTION_KEY||!env.LM_ACERVO_ORIGIN)return false;
  return provider==="google"?
    Boolean(env.LM_GOOGLE_CLIENT_ID&&env.LM_GOOGLE_CLIENT_SECRET&&env.LM_GOOGLE_PICKER_API_KEY&&env.LM_GOOGLE_APP_ID):
    Boolean(env.LM_DROPBOX_CLIENT_ID&&env.LM_DROPBOX_CLIENT_SECRET);
}
async function encryptionKey(env){
  const encoded=env.LM_ACERVO_ENCRYPTION_KEY;
  if(typeof encoded!=="string")throw Error("Chave de sessão não configurada");
  const raw=unbase64url(encoded.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""));
  if(raw.length!==32)throw Error("Chave de sessão inválida");
  return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
}
async function seal(value,name,env){
  const key=await encryptionKey(env),iv=crypto.getRandomValues(new Uint8Array(12));
  const body=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:utf8.encode(name)},key,utf8.encode(JSON.stringify(value)));
  return base64url(new Uint8Array([...iv,...new Uint8Array(body)]));
}
async function unseal(value,name,env){
  try{
    if(!value||value.length>3900)return null;
    const bytes=unbase64url(value);
    if(bytes.length<29)return null;
    const key=await encryptionKey(env);
    const data=await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes.slice(0,12),
      additionalData:utf8.encode(name)},key,bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(data));
  }catch{return null}
}
async function sessionOf(request,provider,env){
  if(!PROVIDERS.includes(provider))return null;
  const name=SESSION_COOKIES[provider];
  const session=await unseal(cookies(request)[cookieName(name,request)],name,env);
  if(!session||session.provider!==provider||!session.access_token||
    !Number.isFinite(session.created)||Date.now()-session.created>SESSION_AGE*1000)return null;
  return session;
}
function providerTokenUrl(provider){
  return provider==="google"?"https://oauth2.googleapis.com/token":"https://api.dropboxapi.com/oauth2/token";
}
async function tokenRequest(provider,params){
  const response=await fetch(providerTokenUrl(provider),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams(params),redirect:"error"});
  if(!response.ok)throw Error("Autorização recusada pelo provedor");
  const data=await response.json();
  if(!data.access_token||typeof data.access_token!=="string")throw Error("Token inválido");
  return data;
}
async function authorized(request,provider,env){
  let session=await sessionOf(request,provider,env);
  if(!session)return null;
  let updated=false;
  if(session.expires_at<Date.now()+90_000){
    if(!session.refresh_token)return null;
    const id=provider==="google"?env.LM_GOOGLE_CLIENT_ID:env.LM_DROPBOX_CLIENT_ID;
    const secret=provider==="google"?env.LM_GOOGLE_CLIENT_SECRET:env.LM_DROPBOX_CLIENT_SECRET;
    try{
      const token=await tokenRequest(provider,{
        grant_type:"refresh_token",refresh_token:session.refresh_token,
        client_id:id,client_secret:secret
      });
      session={...session,access_token:token.access_token,
        refresh_token:token.refresh_token||session.refresh_token,
        expires_at:Date.now()+Math.max(60,Number(token.expires_in)||3600)*1000};
      updated=true;
    }catch{return null}
  }
  return {session,updated,async finish(response){
    if(updated){
      const sealed=await seal(session,SESSION_COOKIES[provider],env);
      if(sealed.length>=3800)return deny("Sessão muito grande; reconecte a conta",401);
      withCookie(response,cookieHeader(SESSION_COOKIES[provider],sealed,request));
    }
    return response;
  }};
}
function safeId(provider,id){
  return typeof id==="string" && (provider==="google"?
    /^[A-Za-z0-9_-]{5,200}$/.test(id):/^id:[A-Za-z0-9_=-]{5,200}$/.test(id));
}
function mimeForDropbox(name){
  const ext=(name||"").split(".").pop().toLowerCase();
  return DROPBOX_EXT[ext]||"";
}
function mediaItem(provider,file){
  const mime=provider==="google"?file.mimeType:mimeForDropbox(file.name);
  if(!FILE_TYPES.has(mime)||!safeId(provider,file.id))return null;
  return {provider,id:file.id,name:String(file.name||"Sem título").slice(0,300),
    mimeType:mime,kind:mime.startsWith("image/")?"image":"video",
    size:Number(file.size)||null,
    preview:BASE+"thumb?provider="+provider+"&id="+encodeURIComponent(file.id),
    original:BASE+"media?provider="+provider+"&id="+encodeURIComponent(file.id)};
}
async function providerJson(url,accessToken,body){
  const r=await fetch(url,{method:body?"POST":"GET",
    headers:{"Authorization":"Bearer "+accessToken,...(body?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:"error"});
  if(!r.ok)throw Error("Arquivo ou pasta indisponível ("+r.status+")");
  return r.json();
}
async function googleMeta(id,token){
  return providerJson("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+
    "?fields=id,name,mimeType,size,thumbnailLink&supportsAllDrives=true",token);
}
async function dropboxMeta(id,token){
  return providerJson("https://api.dropboxapi.com/2/files/get_metadata",token,{path:id});
}
async function fileMetadata(provider,id,token){
  if(!safeId(provider,id))return null;
  const file=provider==="google"?await googleMeta(id,token):await dropboxMeta(id,token);
  const item=mediaItem(provider,file);
  if(!item)throw Error("Tipo de arquivo não aceito");
  return {item,file};
}
async function readBody(request,max=8000){
  const reader=request.body?.getReader();
  if(!reader)return {};
  let total=0,parts=[];
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      total+=value.byteLength;if(total>max)throw Error("Solicitação excede o limite");
      parts.push(value);
    }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let n=0;
  for(const part of parts){bytes.set(part,n);n+=part.byteLength}
  return JSON.parse(new TextDecoder().decode(bytes));
}
function safePath(path){
  return typeof path==="string" && path.length<=600 && (path===""||path.startsWith("/")) &&
    !/[\u0000-\u001f\\]/.test(path) && !path.split("/").includes("..");
}
async function dropboxList(token,path,cursor){
  const more=Boolean(cursor);
  const body=more?{cursor}:{path,recursive:false,include_deleted:false,limit:100};
  const result=await providerJson("https://api.dropboxapi.com/2/files/"+(more?"list_folder/continue":"list_folder"),token,body);
  return {entries:(result.entries||[]).map(file=>{
    if(file[".tag"]==="folder")return {kind:"folder",name:String(file.name||"Pasta").slice(0,300),
      path:file.path_display};
    return mediaItem("dropbox",file);
  }).filter(Boolean),hasMore:Boolean(result.has_more),cursor:result.has_more?result.cursor:null};
}
function externalRedirect(url,message){
  // OAuth must return to the active composition editor, not the tools index.
  const destination=new URL("/compor.html",url.origin);
  destination.searchParams.set("studio","1");
  destination.searchParams.set("acervo",message);
  destination.hash="laboratorio";
  return new Response(null,{status:302,headers:{Location:destination.toString()}});
}
async function connect(request,url,env,provider){
  if(!connectedConfigured(env,provider))return deny("Integração não configurada",503);
  origin(request,env);
  const state=random(24),verifier=random(32);
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest("SHA-256",utf8.encode(verifier))));
  const redirect=url.origin+BASE+"callback/"+provider;
  const client=provider==="google"?env.LM_GOOGLE_CLIENT_ID:env.LM_DROPBOX_CLIENT_ID;
  const auth=provider==="google"?
    new URL("https://accounts.google.com/o/oauth2/v2/auth"):
    new URL("https://www.dropbox.com/oauth2/authorize");
  const params={
    client_id:client,redirect_uri:redirect,response_type:"code",state,
    code_challenge:challenge,code_challenge_method:"S256"
  };
  if(provider==="google"){
    params.scope="https://www.googleapis.com/auth/drive.file";
    params.access_type="offline";
    params.prompt="consent";
  }else{
    params.scope="files.metadata.read files.content.read";
    params.token_access_type="offline";
  }
  for(const [k,v] of Object.entries(params))auth.searchParams.set(k,v);
  const pending=await seal({provider,state,verifier,created:Date.now()},STATE_COOKIE,env);
  const response=new Response(null,{status:302,headers:{Location:auth.toString()}});
  return withCookie(response,cookieHeader(STATE_COOKIE,pending,request,STATE_AGE/1000));
}
async function callback(request,url,env,provider){
  origin(request,env);
  if(!connectedConfigured(env,provider))return deny("Integração não configurada",503);
  const pending=await unseal(cookies(request)[cookieName(STATE_COOKIE,request)],STATE_COOKIE,env);
  const clear=cookieHeader(STATE_COOKIE,"",request,0);
  if(!pending||pending.provider!==provider||!pending.state||
    url.searchParams.get("state")!==pending.state||Date.now()-pending.created>STATE_AGE)
    return withCookie(deny("Autorização não corresponde à sessão deste navegador",403),clear);
  const code=url.searchParams.get("code");
  if(!code||code.length>4000||url.searchParams.has("error"))
    return withCookie(externalRedirect(url,"cancelado"),clear);
  const client_id=provider==="google"?env.LM_GOOGLE_CLIENT_ID:env.LM_DROPBOX_CLIENT_ID;
  const client_secret=provider==="google"?env.LM_GOOGLE_CLIENT_SECRET:env.LM_DROPBOX_CLIENT_SECRET;
  try{
    const token=await tokenRequest(provider,{
      grant_type:"authorization_code",code,client_id,client_secret,
      code_verifier:pending.verifier,redirect_uri:url.origin+BASE+"callback/"+provider
    });
    const session={provider,access_token:token.access_token,refresh_token:token.refresh_token||null,
      expires_at:Date.now()+Math.max(60,Number(token.expires_in)||3600)*1000,created:Date.now()};
    const sealed=await seal(session,SESSION_COOKIES[provider],env);
    if(sealed.length>=3800)return deny("Sessão excede o tamanho permitido",503);
    const response=externalRedirect(url,provider);
    withCookie(response,clear);
    return withCookie(response,cookieHeader(SESSION_COOKIES[provider],sealed,request));
  }catch{return withCookie(externalRedirect(url,"erro"),clear)}
}
async function disconnect(request,env){
  if(!sameOriginPost(request))return deny("Origem não autorizada",403);
  const {provider}=await readBody(request);
  if(!PROVIDERS.includes(provider))return deny("Provedor inválido");
  const session=await sessionOf(request,provider,env);
  // Revoke remotely on best effort. Local session always removed.
  if(session){
    try{
      if(provider==="google"){
        await fetch("https://oauth2.googleapis.com/revoke",{method:"POST",
          headers:{"Content-Type":"application/x-www-form-urlencoded"},
          body:new URLSearchParams({token:session.refresh_token||session.access_token}),redirect:"error"});
      }else{
        await fetch("https://api.dropboxapi.com/2/auth/token/revoke",{method:"POST",
          headers:{"Authorization":"Bearer "+session.access_token},redirect:"error"});
      }
    }catch{/* User can also revoke via provider account settings. */}
  }
  return withCookie(json({disconnected:provider}),cookieHeader(SESSION_COOKIES[provider],"",request,0));
}
async function mediaStream(request,url,env,thumb){
  const provider=url.searchParams.get("provider"),id=url.searchParams.get("id");
  if(!PROVIDERS.includes(provider)||!safeId(provider,id))return deny("Identificador de mídia inválido");
  const auth=await authorized(request,provider,env);
  if(!auth)return deny("Conecte novamente a conta para acessar esta mídia",401);
  try{
    const {item,file}=await fileMetadata(provider,id,auth.session.access_token);
    const isVideo=item.kind==="video";
    if(thumb&&provider==="google"&&file.thumbnailLink){
      const thumbnail=new URL(file.thumbnailLink);
      if(thumbnail.protocol!=="https:"||
        !/(^|\.)googleusercontent\.com$|(^|\.)google\.com$/.test(thumbnail.hostname))
        throw Error("Origem da miniatura não autorizada");
      const upstream=await fetch(thumbnail.toString(),{
        headers:{"Authorization":"Bearer "+auth.session.access_token},redirect:"error"});
      if(!upstream.ok)throw Error("Miniatura indisponível");
      return auth.finish(new Response(upstream.body,{
        status:200,headers:{...JSON_HEADERS,"Content-Type":"image/jpeg"}
      }));
    }
    if(thumb&&provider==="dropbox"&&item.kind==="image"){
      const upstream=await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2",{
        method:"POST",headers:{"Authorization":"Bearer "+auth.session.access_token,
          "Dropbox-API-Arg":JSON.stringify({resource:{".tag":"path",path:id},
            format:{".tag":"jpeg"},size:{".tag":"w256h256"}})},redirect:"error"});
      if(upstream.ok)return auth.finish(new Response(upstream.body,{
        status:200,headers:{...JSON_HEADERS,"Content-Type":"image/jpeg"}
      }));
    }
    if(thumb&&isVideo)return deny("Miniatura de vídeo não disponível",404);
    const range=request.headers.get("range");
    if(range&&!/^bytes=\d+-\d*$/.test(range))return deny("Intervalo de vídeo inválido",416);
    const headers=provider==="google"?
      {"Authorization":"Bearer "+auth.session.access_token}:
      {"Authorization":"Bearer "+auth.session.access_token,"Dropbox-API-Arg":JSON.stringify({path:id})};
    if(range&&isVideo)headers.Range=range;
    const upstream=provider==="google"?
      await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+
        "?alt=media&supportsAllDrives=true",{headers,redirect:"error"}):
      await fetch("https://content.dropboxapi.com/2/files/download",{method:"POST",headers,redirect:"error"});
    if(!upstream.ok||![200,206].includes(upstream.status))
      throw Error("Original indisponível ("+upstream.status+")");
    const responseHeaders={...JSON_HEADERS,"Content-Type":item.mimeType,
      "Content-Disposition":"inline"};
    for(const header of ["content-length","content-range","accept-ranges"])
      if(upstream.headers.has(header))responseHeaders[header]=upstream.headers.get(header);
    return auth.finish(new Response(upstream.body,{status:upstream.status,headers:responseHeaders}));
  }catch{return auth.finish(deny("Mídia indisponível ou permissão revogada",404))}
}
export async function handleAcervoRequest(request,env={}){
  const url=new URL(request.url);
  const path=url.pathname.startsWith(BASE)?url.pathname.slice(BASE.length):"";
  const parts=path.split("/").filter(Boolean),method=request.method;
  if(!path)return deny("Rota desconhecida",404);
  try{
    if(method==="GET"&&parts[0]==="status"&&parts.length===1){
      const providers={};
      for(const provider of PROVIDERS){
        providers[provider]={configured:connectedConfigured(env,provider),
          connected:Boolean(await sessionOf(request,provider,env))};
      }
      return json({providers,picker:{apiKey:env.LM_GOOGLE_PICKER_API_KEY||null,
        appId:env.LM_GOOGLE_APP_ID||null}});
    }
    if(method==="GET"&&parts[0]==="connect"&&parts.length===2&&PROVIDERS.includes(parts[1]))
      return connect(request,url,env,parts[1]);
    if(method==="GET"&&parts[0]==="callback"&&parts.length===2&&PROVIDERS.includes(parts[1]))
      return callback(request,url,env,parts[1]);
    if(method==="POST"&&path==="disconnect")return disconnect(request,env);
    if(method==="POST"&&path==="picker-token"){
      if(!sameOriginPost(request))return deny("Origem não autorizada",403);
      const auth=await authorized(request,"google",env);
      return auth?auth.finish(json({accessToken:auth.session.access_token,
        expiresAt:auth.session.expires_at})):deny("Conecte sua conta Google",401);
    }
    if(method==="POST"&&path==="google/inspect"){
      if(!sameOriginPost(request))return deny("Origem não autorizada",403);
      const auth=await authorized(request,"google",env);
      if(!auth)return deny("Conecte sua conta Google",401);
      const body=await readBody(request);
      if(!Array.isArray(body.ids)||body.ids.length>40||body.ids.some(id=>!safeId("google",id)))
        return deny("Seleção inválida (até 40 arquivos)");
      const entries=[];
      for(const id of [...new Set(body.ids)]){
        try{const item=mediaItem("google",await googleMeta(id,auth.session.access_token));if(item)entries.push(item)}
        catch{/* Skip deleted/unshared files; never expose provider errors. */}
      }
      return auth.finish(json({entries}));
    }
    if(method==="GET"&&path==="dropbox/list"){
      const auth=await authorized(request,"dropbox",env);
      if(!auth)return deny("Conecte sua conta Dropbox",401);
      const folder=url.searchParams.get("path")||"",cursor=url.searchParams.get("cursor")||"";
      if(!safePath(folder)||cursor.length>2000)return deny("Caminho inválido");
      const data=await dropboxList(auth.session.access_token,folder,cursor);
      return auth.finish(json(data));
    }
    if(method==="GET"&&(path==="thumb"||path==="media"))
      return mediaStream(request,url,env,path==="thumb");
    return deny("Rota ou método não disponível",405);
  }catch(error){
    if(String(error?.message||"").includes("Origem")||String(error?.message||"").includes("HTTPS"))
      return deny("Origem do Laboratório não autorizada",403);
    return deny("Não foi possível acessar o acervo",503);
  }
}
