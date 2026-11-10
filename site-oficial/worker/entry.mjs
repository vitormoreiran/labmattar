import original from './index.js';
import {handleAcervoRequest} from './acervo-api.mjs';
export default {
 fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/acervo/'))return handleAcervoRequest(request,env);
  if(['/laboratorio','/laboratorio/'].includes(url.pathname)){
   return env.ASSETS.fetch(request);
  }
  return original.fetch(request,env,ctx);
 }
};
