import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url=process.env.REDES_URL||'http://127.0.0.1:8765/redes.html';
await mkdir('redes-proof',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={url,viewports:[],errors:[]};
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    page.on('pageerror',e=>report.errors.push(e.message));
    const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
    assert.equal(await page.locator('.lm-site-nav a[data-area="redes"][aria-current="page"]').count(),1);
    assert.equal(await page.locator('main>section').count(),7,'Cover plus six editorial sections');
    assert.equal(await page.locator('.profile-posts img').count(),12,'Twelve thumbnails forming a single continuous profile');
    assert.equal(await page.locator('.profile-posts figcaption').count(),0,'No labels over the photographs');
    assert.equal(await page.locator('.profile-highlight').count(),3,'Three project highlights');
    assert.equal(await page.locator('.rationale-grid article').count(),3,'Three defended editorial decisions');
    assert.equal(await page.locator('.identity-studies article').count(),2,'Official symbol and signature applications');
    assert.equal(await page.locator('.motion-examples video').count(),2,'Two official motion examples');
    assert.equal(await page.locator('main a[href="/motion.html"]').count(),1,'Connection to canonical motion system');
    const motionSources=await page.locator('.motion-examples video source').evaluateAll(items=>items.map(x=>x.getAttribute('src')));
    assert.deepEqual(motionSources,['/motion/videos/m-form.mp4','/motion/videos/perfil-corte.mp4'],'Canonical motion videos');

    assert.equal(await page.locator('.edition-rows article').count(),3,'Three intervention decisions');
    assert.equal(await page.locator('.formats article').count(),3,'Three platform applications');
    assert.equal(await page.locator('.principles article').count(),6,'Six normative criteria');
    assert.equal(await page.locator('#lmSeasonPlanner').count(),0);
    const body=(await page.locator('main').textContent()).toLocaleLowerCase('pt-BR');
    assert.ok(body.includes('cada corpo abre um mundo'));
    assert.ok(body.includes('poiesis')&&body.includes('aleteia'));
    assert.ok(!body.includes('fome come'));
    const media=await page.locator('img').evaluateAll(list=>list.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));
    assert.ok(media.every(x=>x.loaded),'All project photographs loaded');
    assert.equal(new Set((await page.locator('.profile-posts img').evaluateAll(list=>list.map(x=>x.src)))).size,12,'Twelve distinct photographs in the timeline');
    const seasonalSources=await page.locator('.profile-posts img').evaluateAll(list=>list.map(i=>i.getAttribute('src')));
    assert.ok(seasonalSources.slice(0,3).every(s=>s.includes('aleteia')));
    assert.ok(seasonalSources.slice(3,6).every(s=>s.includes('poiesis')));
    assert.ok(seasonalSources.slice(6).every(s=>s.includes('BOXDOSENTIR')));
    assert.equal(await page.locator('.graphic-only .type-mark').getAttribute('data-lm-text-role'),'title');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'No horizontal overflow');
    await page.screenshot({path:'redes-proof/redes-'+viewport.width+'.png',fullPage:true,animations:'disabled'});
    report.viewports.push({viewport,photos:media.length,overflow});
    await page.close();
  }
  assert.equal(report.errors.length,0,'No page errors');
}finally{
  await writeFile('redes-proof/report.json',JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify(report,null,2));
