import handleRequest from './index.js';
import {handleAcervoRequest} from './acervo-api.mjs';

// Dedicated identity Worker. No imported institutional site, portfolio code or D1.
// All manual content and composition tools are served from this Worker's assets.
export default {
 fetch(request,env,ctx) {
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/acervo/'))return handleAcervoRequest(request,env);
  if(url.pathname==='/'||url.pathname==='') {
   url.pathname='/inicio';
   return env.ASSETS.fetch(new Request(url,request));
  }
  if(url.pathname==='/imagem'||url.pathname==='/imagem.html'){
   url.pathname='/compor';url.hash='#laboratorio';
   return Response.redirect(url.href,302);
  }
  // Public portfolio presentations have their own destination.
  if(url.pathname.startsWith('/capitulo-')||url.pathname.startsWith('/editar')){
   url.hostname='labmattar.com';
   return Response.redirect(url.href,302);
  }
  return handleRequest(request,ctx);
 }
};
