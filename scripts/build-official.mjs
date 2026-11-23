import {cp,mkdir,readdir,readFile,writeFile,appendFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function assembleOfficial({base,lab,presentations,output,sha='local'}){
 await mkdir(path.dirname(output),{recursive:true});await mkdir(output);await cp(path.join(base,'public'),path.join(output,'public'),{recursive:true});
 await cp(path.join(base,'worker'),path.join(output,'worker'),{recursive:true,
  filter:source=>!['identity-domain.mjs','acervo-api.mjs'].includes(path.basename(source))});
 const baseline=JSON.parse(await readFile(path.join(base,'baseline.json'),'utf8'));
 for(const [file,expected]of Object.entries(baseline.files))if(hash(await readFile(path.join(base,file)))!==expected)throw Error('Base oficial alterada sem nova conferência: '+file);
 // The portfolio package contains ONLY the verified original site and explicit
 // portfolio publications. Identity files are never copied into this output.
 // The 'lab' input is retained solely for the approved gallery stylesheet.
 const added=0;
 // Keep the recovered archive byte-for-byte intact. The already merged
 // Chapter 2 gallery adjustment is applied only to the assembled stylesheet.
 const galleryOverride=path.join(lab,'chapter2-gallery-scale.css');
 if(await stat(galleryOverride).catch(error=>{if(error.code!=='ENOENT')throw error;return null;})){
  const stylesheet='public/assets/index-DaKY3Ax1.css';
  if(!baseline.files[stylesheet])throw Error('Estilo da galeria não pertence à base conferida.');
  await appendFile(path.join(output,stylesheet),await readFile(galleryOverride));
 }
 const published=[];let folders=[];try{folders=await readdir(presentations,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const folder of folders.filter(x=>x.isDirectory())){
  const slug=folder.name;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||['sesc','bradesco','simposio','apresentacoes'].includes(slug))throw Error('Endereço de apresentação reservado: '+slug);
  const dir=path.join(presentations,slug),manifest=JSON.parse(await readFile(path.join(dir,'publication.json'),'utf8'));
  if(manifest.status!=='published')continue;
  if(manifest.slug!==slug||manifest.route!=='/capitulo-4/'+slug+'/'||manifest.source!=='labmattar.laboratory')throw Error('Manifesto de publicação inválido: '+slug);
  if(hash(await readFile(path.join(dir,'index.html')))!==manifest.htmlSha256)throw Error('HTML diverge do manifesto: '+slug);
  const files=new Set(['index.html','publication.json']);for(const asset of manifest.assets){if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(asset.path))throw Error('Caminho de mídia inválido');const bytes=await readFile(path.join(dir,asset.path));if(bytes.length!==asset.bytes||hash(bytes)!==asset.sha256)throw Error('Mídia diverge do manifesto');files.add(asset.path);}
  const target=path.join(output,'public','capitulo-4',slug);try{await stat(target);throw Error('Apresentação substituiria um projeto existente');}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const file of files){await mkdir(path.dirname(path.join(target,file)),{recursive:true});await cp(path.join(dir,file),path.join(target,file));}published.push({title:manifest.title,route:manifest.route});
 }
 await cp(path.join(base,'wrangler.jsonc'),path.join(output,'wrangler.jsonc'));
 await writeFile(path.join(output,'public','portfolio-release.json'),JSON.stringify({sha,baselineVersion:baseline.version,presentations:published},null,2));
 return {added,presentations:published.length,baselineVersion:baseline.version};
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){console.log(await assembleOfficial({base:path.resolve('site-oficial'),lab:path.resolve(process.argv[2]||'dist/laboratorio-client'),presentations:path.resolve('presentations'),output:path.resolve(process.argv[3]||'dist/oficial'),sha:process.env.GITHUB_SHA||'local'}));}
