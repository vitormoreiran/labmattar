import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),engine=process.env.COMPOSITION_BROWSER==='webkit'?webkit:chromium,origin=new URL(process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html').origin,out=path.resolve('presentation-proof');await fs.mkdir(out,{recursive:true});
const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/apresentacoes/'))failed.push([r.status(),r.url()]);});
 await page.goto(origin+'/laboratorio.html#apresentacoes');assert.equal(await page.locator('.lm-lab-presentation').count(),3);await page.screenshot({path:out+'/overview.png'});
 for(const [id,images]of [['aleteia',32],['poiesis',27],['cada-corpo-abre-um-mundo',27]]){
  await page.locator('.lm-lab-presentation-watch[href="/apresentacoes/'+id+'/"]').click();await page.evaluate(()=>document.fonts.ready);
  assert.equal(new URL(page.url()).pathname,'/apresentacoes/'+id+'/');assert.equal(await page.locator('.presentation-section').count(),10);assert.equal(await page.locator('.photo-backdrop[data-native-page]').count(),images);assert.equal(await page.locator('[data-act-opener]').count(),5);assert.equal(await page.locator('[data-section-transition]').count(),1);
  const project=JSON.parse(await page.locator('#project').textContent()),original=JSON.parse(await fs.readFile('public/presentation-models/'+id+'.labmattar.json','utf8'));assert.deepEqual(project,original);
  assert.equal(await page.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),true);
  await page.screenshot({path:out+'/'+id+'.png'});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/'+id+'-mobile.png'});await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/laboratorio.html#apresentacoes');
 }
 await page.locator('.lm-lab-presentation-actions a[href*="modelo=poiesis"]').click();await page.locator('.lab-section-confirm [data-section-confirm]').waitFor();await page.evaluate(()=>document.fonts.ready);const prior=await page.evaluate(()=>window.LabPages.create());await page.locator('.lab-section-confirm').getByRole('button',{name:'CANCELAR',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('modelo'));assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),prior);
 await page.goto(origin+'/laboratorio.html#apresentacoes');await page.locator('.lm-lab-presentation-actions a[href*="modelo=poiesis"]').click();await page.locator('.lab-section-confirm [data-section-confirm]').click();await page.waitForFunction(()=>window.LabPages.create().name==='Poiésis');await page.waitForFunction(()=>!new URL(location.href).searchParams.has('modelo'));assert.equal(await page.locator('[data-story-topic]').count(),10);
 await page.reload();await page.waitForFunction(()=>document.getElementById('labPages')?.dataset.ready==='true');assert.equal(await page.locator('.lab-section-confirm').count(),0);assert.equal(await page.evaluate(()=>window.LabPages.create().name),'Poiésis');

 // Project choices do not occupy the page sequence. Opening another topic keeps only one unfolded.
 assert.equal(await page.locator('#labSequenceName').inputValue(),'Poiésis');
 assert.equal(await page.locator('#labDownloadDocument').isVisible(),true);assert.equal(await page.locator('#labReviewDelivery').isVisible(),true);
 assert.equal(await page.locator('[data-story-topic][open]').count(),1);
 await page.locator('[data-story-topic]>summary').nth(1).click();await page.waitForFunction(()=>document.querySelectorAll('[data-story-topic][open]').length===1);
 await page.locator('[data-story-topic]>summary').nth(2).click();await page.waitForFunction(()=>document.querySelectorAll('[data-story-topic][open]').length===1);
 await page.screenshot({path:out+'/pages-organized.png'});
 const edited=await page.evaluate(()=>window.LabPages.create());await page.locator('#labProjectOpen').click();assert.equal(await page.locator('#labStoryPresets article').count(),3);assert.equal(await page.locator('#labStoryPresets a').count(),3);
 await page.screenshot({path:out+'/project-chooser.png'});await page.locator('#labProjectDialog').getByRole('button',{name:'Fechar projetos'}).click();assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),edited);
 await page.setViewportSize({width:390,height:844});await page.locator('#labProjectOpen').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/project-chooser-mobile.png'});
 await page.locator('#labProjectDialog').getByRole('button',{name:'Fechar projetos'}).click();await page.screenshot({path:out+'/pages-organized-mobile.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await fs.writeFile(out+'/report.json',JSON.stringify({presentations:3,images:86,readyPages:true,directModelLink:true,cancelPreservesDraft:true,reloadPreservesEditing:true,mobile:true,errors,failed},null,2));console.log('Three ready presentations, assets and direct editing links passed.');
}finally{await browser.close();}
