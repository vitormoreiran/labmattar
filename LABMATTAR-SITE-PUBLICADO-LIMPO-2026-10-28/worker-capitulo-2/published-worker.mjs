import {makePreview} from './lib/preview-snapshot.mjs';
import {page,navData} from './lib/preview-data.mjs';
import {storage} from './lib/storage.mjs';
import html from './lib/published-html.mjs';
export default {async fetch(request,env){
 const p=new URL(request.url).pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(!['/capitulo-2','/capitulo-2/','/api/content/portfolio','/assets/page-oorIu5QC.js','/assets/navigation-data.js'].includes(p)&&!p.startsWith('/media/'))return new Response('Not found',{status:404});
 let snapshot;try{const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;const row=await db.prepare('SELECT body FROM portfolio WHERE id=1').first();if(!row)throw Error('Missing portfolio');snapshot=makePreview(JSON.parse(row.body));}catch{return new Response('Conteúdo temporariamente indisponível. Tente novamente.',{status:503,headers:{'Cache-Control':'no-store'}})}
 const allowed=new Set(Object.values(snapshot.content.projects).flatMap(p=>[p.cover,...p.coverSequence,...p.gallery.map(x=>x.url)]).filter(x=>x.startsWith('/media/')).map(x=>decodeURIComponent(x.slice(7))));
const nav='export const projectGroups='+JSON.stringify(snapshot.groups)+';\n'+navData.slice(navData.indexOf('export const chapterTopics'),navData.indexOf('\nsetTimeout'));

 const headers={'Cache-Control':'no-store','X-Portfolio-Revision':String(snapshot.revision)};
 const send=(data,type)=>new Response(request.method==='HEAD'?null:data,{headers:{...headers,'Content-Type':type}});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(p==='/capitulo-2'||p==='/capitulo-2/')return send(html,'text/html; charset=utf-8');
 if(p==='/api/content/portfolio')return send(JSON.stringify({content:snapshot.content}),'application/json');
 if(p==='/assets/page-oorIu5QC.js')return send(page,'text/javascript; charset=utf-8');
 if(p==='/assets/navigation-data.js')return send(nav,'text/javascript; charset=utf-8');
 if(p.startsWith('/media/')){let key;try{key=decodeURIComponent(p.slice(7))}catch{return new Response('Not found',{status:404})}if(!allowed.has(key))return new Response('Not found',{status:404});try{const obj=await storage(env).get(key,{range:request.headers});if(!obj)return new Response('Not found',{status:404});const h=new Headers(headers);obj.writeHttpMetadata(h);if(obj.range)h.set('Content-Range',`bytes ${obj.range.offset}-${obj.range.offset+obj.range.length-1}/${obj.size}`);return new Response(request.method==='HEAD'?null:obj.body,{status:obj.range?206:200,headers:h})}catch(e){return new Response('Media unavailable',{status:e.status||502})}}
 return env.ASSETS.fetch(request);
}};
