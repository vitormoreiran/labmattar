import original from './index.js';
import {handleAcervoRequest} from './acervo-api.mjs';
import {IDENTITY_HOST,IDENTITY_ENTRY} from './identity-domain.mjs';
export default {
 fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/acervo/'))return handleAcervoRequest(request,env);
  if(url.hostname===IDENTITY_HOST){
   if(url.pathname.startsWith('/capitulo-')||url.pathname.startsWith('/editar')){
    url.hostname='labmattar.com';return Response.redirect(url.href,302);
   }
   if(url.pathname==='/'){
    url.pathname=IDENTITY_ENTRY;
    return env.ASSETS.fetch(new Request(url,request));
   }
   if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  }
  if(['/laboratorio','/laboratorio/'].includes(url.pathname)){
   return env.ASSETS.fetch(request);
  }
  return original.fetch(request,env,ctx);
 }
};
