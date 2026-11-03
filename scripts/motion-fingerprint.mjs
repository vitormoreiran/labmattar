import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {sanitizeProject} from '../tools/matriz-vetorial/src/timeline.mjs';
export function fingerprint(project){
  return createHash('sha256').update(JSON.stringify(sanitizeProject(project),(key,value)=>key==='id'?undefined:value)).digest('hex');
}
export async function rendererFingerprint(){
  const root=path.resolve(import.meta.dirname,'../tools/matriz-vetorial');
  const sources=['src/stage.js','src/line-volume.mjs','src/entrance.mjs','src/timeline.mjs','src/vector-engine.tsx','src/morph-continuity.mjs','src/word-layout.mjs','src/library.json','src/export-video.js','package-lock.json'];
  async function collect(directory){
    for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
      const relative=directory+'/'+entry.name;
      if(entry.isDirectory())await collect(relative);
      else if(/\.(glb|svg)$/.test(entry.name))sources.push(relative);
    }
  }
  await collect('static/models');await collect('static/library');
  const hash=createHash('sha256');
  for(const file of sources.sort())hash.update(file+'\0').update(await readFile(path.join(root,file)));
  return hash.digest('hex');
}
