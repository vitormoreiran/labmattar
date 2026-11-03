import {readFile,writeFile,mkdir,cp,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {motionProjects} from '../tools/matriz-vetorial/src/motion-catalog.mjs';
import {fingerprint,rendererFingerprint} from './motion-fingerprint.mjs';

const root=path.resolve(import.meta.dirname,'..');
const allowPending=process.argv.includes('--allow-pending-exports');
const entries=motionProjects();
const rendererHash=await rendererFingerprint();
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projectsDirectory=path.join(root,'public/motion/projects');
await mkdir(projectsDirectory,{recursive:true});
let exported={};
try{exported=JSON.parse(await readFile(path.join(root,'public/motion/exports.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const catalog=[];
for(const entry of entries){
  const projectHash=fingerprint(entry.project);
  const video=`/motion/videos/${entry.id}.mp4`;
  const poster=`/motion/posters/${entry.id}.png`;
  const record=exported[entry.id];
  let ready=false;
  if(record && record.projectHash===projectHash && record.rendererHash===rendererHash){
    const bytes=await readFile(path.join(root,'public',video));
    assert.ok(bytes.length>32&&bytes.subarray(4,8).toString()==='ftyp',`MP4 inválido: ${entry.id}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,`Vídeo alterado sem registro: ${entry.id}`);
    assert.ok(bytes.length<20*1024*1024,`Otimize o vídeo para web: ${entry.id}`);
    assert.ok((await stat(path.join(root,'public',poster))).size>0,`Pôster ausente: ${entry.id}`);
    ready=true;
  }
  assert.ok(ready||allowPending,`Export ausente ou desatualizado: ${entry.id}; use --allow-pending-exports somente para revisão local.`);
  await writeFile(path.join(projectsDirectory,`${entry.id}.json`),JSON.stringify(entry.project,null,2)+'\n');
  catalog.push({id:entry.id,title:entry.title,status:entry.status,group:entry.group,duration:entry.duration,aspect:entry.project.aspect,cut:entry.cut??null,projectHash,video:ready?video:null,poster:ready?poster:null,project:`/motion/projects/${entry.id}.json`,editor:`/motion/matriz/index.html?roteiro=${entry.id}`});
}
function cards(group){return catalog.filter(entry=>entry.group===group).map(entry=>{
  const duration=entry.duration.toLocaleString('pt-BR',{maximumFractionDigits:2});
  const label=entry.status==='approved'?'Aprovado':'Em avaliação';
  const ratio=entry.aspect.replace(':',' / ');
  const content=entry.video?`<video controls playsinline preload="none" poster="${entry.poster}" aria-label="${esc(entry.title)}"><source src="${entry.video}" type="video/mp4"><a href="${entry.video}">Baixar vídeo</a></video>`:'<p class="detail">Prévia local: exportação pendente.</p>';
  return `<article class="motion-card" data-motion-id="${entry.id}" data-status="${entry.status}"><p class="motion-status detail">${label}</p><h3>${esc(entry.title)}</h3><div class="motion-meta detail"><span>${duration} s · ${entry.aspect}</span>${entry.cut!==null?`<span>Corte sugerido: ${entry.cut.toLocaleString('pt-BR')} s em 1×</span>`:''}</div><div class="motion-frame" style="aspect-ratio:${ratio}">${content}</div><div class="motion-links detail">${entry.video?`<a href="${entry.video}" download>BAIXAR MP4</a>`:''}<a href="${entry.project}" download>BAIXAR ROTEIRO JSON</a><a href="${entry.editor}">EDITAR NA MATRIZ ↗</a></div></article>`;
}).join('\n');}
const gallery=`<section class="chapter lm-manual-section" id="roteiros"><div class="inner"><p class="eyebrow">02 / ASSINATURAS</p><h2 class="lm-manual-section-title">ROTEIROS PRONTOS</h2><p>Os três primeiros percursos estão aprovados. Acervo vira MATTAR e Abertura e fecho são estudos em avaliação. Reprodução, MP4 e projeto editável correspondem à mesma versão.</p><div class="motion-grid">${cards('assinaturas')}</div></div></section><section class="chapter lm-manual-section" id="transicoes"><div class="inner"><p class="eyebrow">03 / TRANSIÇÕES</p><h2 class="lm-manual-section-title">CONECTAR CONTEÚDOS</h2><p>Três testes em avaliação. Os pontos de corte indicam onde experimentar a troca A→B na edição; o ritmo deve ser validado com os conteúdos reais.</p><div class="motion-grid">${cards('transicoes')}</div></div></section>`;
const template=await readFile(path.join(root,'design/motion.html'),'utf8');
assert.equal(template.split('<!--MOTION_GALLERY-->').length,2);
await writeFile(path.join(root,'public/motion.html'),template.replace('<!--MOTION_GALLERY-->',gallery));
await writeFile(path.join(root,'content/motion.json'),JSON.stringify({schemaVersion:1,items:catalog},null,2)+'\n');
await mkdir(path.join(root,'public/motion/matriz'),{recursive:true});
await cp(path.join(root,'tools/matriz-vetorial/dist'),path.join(root,'public/motion/matriz'),{recursive:true});
console.log(`Motion: ${catalog.length} roteiros; ${catalog.filter(x=>x.video).length} vídeos verificados.`);
