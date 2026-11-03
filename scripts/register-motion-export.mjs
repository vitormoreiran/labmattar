import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {motionProjects} from '../tools/matriz-vetorial/src/motion-catalog.mjs';
import {fingerprint} from './motion-fingerprint.mjs';

const [id,videoPath,posterPath,projectPath]=process.argv.slice(2);
assert.ok(id&&videoPath&&posterPath&&projectPath,'Uso: node scripts/register-motion-export.mjs ID VIDEO.mp4 POSTER.png PROJETO.json');
const entry=motionProjects().find(x=>x.id===id);
assert.ok(entry,'Roteiro desconhecido');
const project=JSON.parse(await readFile(projectPath,'utf8'));
const projectHash=fingerprint(project);
assert.equal(projectHash,fingerprint(entry.project),'O projeto exportado não corresponde ao catálogo atual');
const video=await readFile(videoPath);
assert.ok(video.length>32&&video.subarray(4,8).toString()==='ftyp','Arquivo MP4 inválido');
assert.ok(video.length<20*1024*1024,'Otimize este export para web antes de registrar');
assert.ok(video.includes(Buffer.from('avc1')),'Export H.264 esperado');
function boxes(start,end){
  const entries=[];
  for(let cursor=start;cursor+8<=end;){
    let size=video.readUInt32BE(cursor),header=8;
    if(size===1){size=Number(video.readBigUInt64BE(cursor+8));header=16;}
    if(size===0)size=end-cursor;
    assert.ok(size>=header&&cursor+size<=end,'Estrutura MP4 corrompida');
    entries.push({type:video.subarray(cursor+4,cursor+8).toString(),start:cursor+header,end:cursor+size});
    cursor+=size;
  }
  return entries;
}
const child=(box,type)=>{const match=boxes(box.start,box.end).find(x=>x.type===type);assert.ok(match,'MP4 sem '+type);return match;};
const moov=boxes(0,video.length).find(x=>x.type==='moov');
assert.ok(moov,'MP4 sem metadados');
const track=boxes(moov.start,moov.end).filter(x=>x.type==='trak').find(track=>{
  const handler=child(child(track,'mdia'),'hdlr');
  return video.subarray(handler.start+8,handler.start+12).toString()==='vide';
});
assert.ok(track,'MP4 sem trilha de vídeo');
const mdia=child(track,'mdia'),header=child(mdia,'mdhd'),version=video[header.start];
const timescale=video.readUInt32BE(header.start+(version===1?20:12));
const ticks=version===1?Number(video.readBigUInt64BE(header.start+24)):video.readUInt32BE(header.start+16);
const duration=ticks/timescale;
assert.ok(Math.abs(duration-entry.duration)<0.1,'Duração do vídeo diverge do roteiro');
const tkhd=child(track,'tkhd');
const width=video.readUInt32BE(tkhd.end-8)/65536,height=video.readUInt32BE(tkhd.end-4)/65536;
const [a,b]=entry.project.aspect.split(':').map(Number);
assert.ok(Math.abs(width/height-a/b)<0.01,'Formato do vídeo diverge do projeto');
assert.ok(width>=400&&height>=400,'Resolução insuficiente para a galeria');
const poster=await readFile(posterPath);
assert.ok(poster.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Pôster PNG esperado');
const root=path.resolve(import.meta.dirname,'..');
for(const directory of ['videos','posters'])await mkdir(path.join(root,'public/motion',directory),{recursive:true});
await copyFile(videoPath,path.join(root,'public/motion/videos',id+'.mp4'));
await copyFile(posterPath,path.join(root,'public/motion/posters',id+'.png'));
const manifestPath=path.join(root,'public/motion/exports.json');
let manifest={};
try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
manifest[id]={projectHash,sha256:createHash('sha256').update(video).digest('hex'),bytes:video.length,durationSeconds:duration,width,height};
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`${entry.title}: ${width}×${height}, ${duration.toFixed(2)} s; export verificado.`);
