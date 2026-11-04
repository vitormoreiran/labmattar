import {createHash} from 'node:crypto';
const reserved=new Set(['sesc','bradesco','simposio']);
const extensions={'image/svg+xml':'svg','image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','font/otf':'otf','font/ttf':'ttf','video/mp4':'mp4'};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c');
// A build artifact, never a public upload endpoint or an automatic deployment.
export function prepareChapter4Publication(html,slug){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>72||reserved.has(slug))throw Error('Escolha um endereço novo; os projetos existentes são preservados.');
 const match=html.match(/<script type="application\/json" id="project">([\s\S]*?)<\/script>/);
 if(!match)throw Error('O HTML não contém um projeto editável.');
 const project=JSON.parse(match[1]);if(project.kind!=='labmattar.presentation'||project.schemaVersion!==2||!project.sections?.length||!project.pages?.length||project.pages.length>100||!html.includes('mountPublishedPresentation'))throw Error('Use o HTML por seções exportado pelo Laboratório.');
 const files=new Map();
 function asset(type,encoded){const extension=extensions[type];if(!extension)throw Error('Tipo de mídia não previsto: '+type);const bytes=Buffer.from(encoded,'base64');if(!bytes.length)throw Error('Mídia vazia.');const name='assets/'+digest(bytes)+'.'+extension;files.set(name,bytes);return name;}
 // Keep the editable project byte-for-byte; its text is not an asset URL.
 let output=html.replace(match[0],'<!--LABMATTAR_PROJECT_DOCUMENT-->');
 output=output.replace(/<script type="application\/json" id="clips">([\s\S]*?)<\/script>/,(_,payload)=>{
  const clips=JSON.parse(payload);for(const [id,value]of Object.entries(clips)){if(typeof value!=='string'||!/^([A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('Motion não incorporado no HTML de origem.');clips[id]=asset('video/mp4',value);}
  return '<script type="application/json" id="clips">'+safeJSON(clips)+'</script>';
 });
 output=output.replace(/data:([a-z0-9+./-]+);base64,([a-z0-9+/=]+)/gi,(_,type,encoded)=>asset(type.toLowerCase(),encoded));
 output=output.replace('<!--LABMATTAR_PROJECT_DOCUMENT-->',match[0]);
 files.set('index.html',Buffer.from(output));
 const manifest={schemaVersion:1,status:'draft',title:project.name,slug,route:'/capitulo-4/'+slug+'/',pages:project.pages.length,sections:project.sections.map(s=>({id:s.id,name:s.name})),source:'labmattar.laboratory',htmlSha256:digest(files.get('index.html')),assets:[...files].filter(([name])=>name!=='index.html').map(([name,bytes])=>({path:name,bytes:bytes.length,sha256:digest(bytes)}))};
 files.set('publication.json',Buffer.from(JSON.stringify(manifest,null,2)));return {manifest,files};
}
