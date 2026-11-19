import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectWriteQueue,isActiveProjectSave} from '../public/lab-project-write-queue.mjs';

test('project writes remain ordered even when earlier writes are delayed',async()=>{
 const values=new Map(),order=[];
 const write=createProjectWriteQueue(async record=>{
  if(record.version===1)await new Promise(resolve=>setTimeout(resolve,20));
  values.set(record.id,record.version);order.push(record.version);
 });
 await Promise.all([write({id:'p',version:1}),write({id:'p',version:2})]);
 assert.deepEqual(order,[1,2]);assert.equal(values.get('p'),2);
});
test('a failed save does not prevent a later save',async()=>{
 const values=new Map(),write=createProjectWriteQueue(async record=>{
  if(record.version===1)throw Error('quota');
  values.set(record.id,record.version);
 });
 await assert.rejects(write({id:'p',version:1}),/quota/);
 await write({id:'p',version:2});
 assert.equal(values.get('p'),2);
});
test('writes preserve their captured project identifiers',async()=>{
 const items=[],write=createProjectWriteQueue(async record=>items.push([record.id,record.name]));
 await Promise.all([write({id:'first',name:'Um'}),write({id:'second',name:'Dois'})]);
 assert.deepEqual(items,[['first','Um'],['second','Dois']]);
});

test('completion from a previous project cannot replace the active marker',()=>{
 assert.equal(isActiveProjectSave('project-b','project-a'),false);
 assert.equal(isActiveProjectSave('project-b','project-b'),true);
 assert.equal(isActiveProjectSave('', 'project-b'),false);
});
