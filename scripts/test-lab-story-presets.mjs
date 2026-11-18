import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {STORY_PRESETS,loadStoryPreset} from '../public/lab-story-presets.mjs';
import {readSequence} from '../public/lab-sequence.mjs';
const fixture=async url=>new Response(await fs.readFile(new URL('../public'+url,import.meta.url)));
test('os três modelos publicados abrem completos e correspondem aos hashes registrados',async()=>{
 const counts=[];for(const item of STORY_PRESETS){const project=await loadStoryPreset(item.id,{fetcher:fixture});readSequence(project,{},[]);assert.equal(project.story.topics.length,10);counts.push(project.story.topics.reduce((n,t)=>n+t.photoPageIds.length,0));}
 assert.deepEqual(counts,[32,27,27]);
});
test('modelo desconhecido, indisponível ou alterado não substitui o projeto',async()=>{
 let calls=0;await assert.rejects(()=>loadStoryPreset('../arquivo',{fetcher:()=>{calls++;}}),/não encontrado/);assert.equal(calls,0);
 await assert.rejects(()=>loadStoryPreset('aleteia',{fetcher:async()=>new Response('',{status:404})}),/Não foi possível/);
 await assert.rejects(()=>loadStoryPreset('aleteia',{fetcher:async()=>new Response('{"name":"alterado"}')}),/não corresponde/);
});
