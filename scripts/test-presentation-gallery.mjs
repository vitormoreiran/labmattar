import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {STORY_PRESETS} from '../public/lab-story-presets.mjs';
const source=new URL('../public/',import.meta.url);
test('overview apresenta os três projetos com acesso separado para assistir e editar',async()=>{
 const html=await fs.readFile(new URL('../design/laboratorio.html',import.meta.url),'utf8');
 assert(html.includes('id="apresentacoes"'));assert.equal((html.match(/class="lm-lab-presentation"/g)||[]).length,3);assert.equal((html.match(/class="lm-lab-tool"/g)||[]).length,3);
 for(const preset of STORY_PRESETS){assert(html.includes('href="/apresentacoes/'+preset.id+'/"'));assert(html.includes('/montar.html?modelo='+preset.id));await fs.access(new URL('presentation-models/covers/'+preset.id+'.webp',source));}
});
test('apresentações prontas preservam projetos completos e todos os arquivos de mídia',async()=>{
 const counts=[];for(const preset of STORY_PRESETS){
  const dir=new URL('apresentacoes/'+preset.id+'/',source),html=await fs.readFile(new URL('index.html',dir),'utf8'),project=JSON.parse(html.match(/id="project">([\s\S]*?)<\/script>/)[1]),original=JSON.parse(await fs.readFile(new URL('presentation-models/'+preset.id+'.labmattar.json',source),'utf8'));
  assert.deepEqual(project,original);assert.equal((html.match(/ data-act-opener="/g)||[]).length,5);assert.equal((html.match(/ data-section-transition /g)||[]).length,1);assert(html.includes('function installTopicScroll('));assert(!html.includes('preserveAspectRatio="none"'));
  const references=new Set(html.match(/\bassets\/[a-f0-9]{64}\.[a-z0-9]+/g)||[]);assert(references.size>10);
  for(const relative of references){const bytes=await fs.readFile(new URL(relative,dir));assert.equal(createHash('sha256').update(bytes).digest('hex'),relative.match(/assets\/([a-f0-9]{64})/)[1]);}
  counts.push(project.story.topics.reduce((n,t)=>n+t.photoPageIds.length,0));
 }assert.deepEqual(counts,[32,27,27]);
});
