import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.COLORS_URL||'http://127.0.0.1:8765/cores.html';
await mkdir('colors-proof',{recursive:true});
const report={url,viewports:[],errors:[]};
const browser=await chromium.launch({headless:true});
const sourceSnapshot=sample=>sample.evaluate(sample=>[...sample.querySelectorAll('p,h2')]
  .filter(node=>!node.closest('.color-motion-ghost')).map(node=>({text:node.textContent,
    x:node.offsetLeft,y:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight,
    color:getComputedStyle(node).color})));
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',error=>report.errors.push(error.message));
    try{
      assert.equal((await page.goto(url,{waitUntil:'networkidle'})).status(),200);
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('#uso .sample').count(),4);
      assert.equal(await page.locator('.color-motion-replay').count(),4);
      const samples=page.locator('#uso .sample');
      const originals=await Promise.all(Array.from({length:4},(_,i)=>sourceSnapshot(samples.nth(i))));
      await page.emulateMedia({reducedMotion:'no-preference'});
      await samples.first().scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.querySelector('#uso .sample').dataset.colorMotion==='playing');
      assert.deepEqual(await sourceSnapshot(samples.first()),originals[0],'Automatic entry preserves source and layout');
      await page.waitForFunction(()=>document.querySelector('#uso .sample').dataset.colorMotion==='idle');
      for(let index=0;index<4;index++){
        const sample=samples.nth(index),button=page.locator('.color-motion-replay').nth(index);
        await button.click();
        await page.waitForTimeout(100);
        const active=await sample.evaluate(sample=>{
          const ghosts=[...sample.querySelectorAll('.color-motion-ghost')];
          return {playing:sample.dataset.colorMotion,ghosts:ghosts.length,
            accessible:ghosts.every(node=>node.getAttribute('aria-hidden')==='true'&&node.inert),
            timing:ghosts.map(node=>({start:node.getAnimations()[0]?.startTime,duration:node.getAnimations()[0]?.effect.getTiming().duration})),
            words:sample.querySelectorAll('.color-motion-word').length};
        });
        assert.equal(active.playing,'playing');assert.equal(active.ghosts,3);
        assert.ok(active.accessible&&active.words>0,'Animated copies are visual only');
        assert.ok(active.timing.every(animation=>animation.duration===1250));
        assert.equal(new Set(active.timing.map(animation=>animation.start)).size,1,'Three text blocks enter together');
        assert.deepEqual(await sourceSnapshot(sample),originals[index],'No text, geometry or color change during playback');
        if(index===0)await sample.screenshot({path:`colors-proof/entry-${width}.png`});
        await page.waitForFunction(index=>document.querySelectorAll('#uso .sample')[index].dataset.colorMotion==='idle',index);
        assert.equal(await sample.locator('.color-motion-ghost').count(),0);
        assert.deepEqual(await sourceSnapshot(sample),originals[index],'Exact authored example restored');
      }
      await page.locator('.color-motion-replay').first().click();
      await page.waitForTimeout(100);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.color-motion-ghost').count(),0,'Reduced motion stops and restores active text');
      await page.locator('.color-motion-replay').first().click();
      assert.equal(await page.locator('.color-motion-ghost').count(),0,'Reduced motion keeps text static');
      assert.deepEqual(await sourceSnapshot(samples.first()),originals[0]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.locator('#uso').screenshot({path:`colors-proof/examples-${width}.png`});
      report.viewports.push({width,examples:4,automaticEntry:true,replay:true,fixedLayout:true,exactText:true,reducedMotion:true});
    }finally{await page.close();}
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;throw error;}
finally{await writeFile('colors-proof/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
