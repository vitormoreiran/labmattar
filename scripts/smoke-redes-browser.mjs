import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,stat} from 'node:fs/promises';

const root=process.env.REDES_URL||'http://127.0.0.1:8765/redes.html';
await mkdir('redes-proof',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},acceptDownloads:true,reducedMotion:'reduce'});
  page.on('pageerror',error=>failures.push(error.message));
  try{
   const res=await page.goto(root,{waitUntil:'networkidle',timeout:60000});
   assert.equal(res.status(),200,'Redes HTML 200');
   await page.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('main section.lm-manual-cover').count(),1);
   assert.equal(await page.locator('main section.lm-manual-section').count(),5,'Cinco seções editoriais');
   assert.equal(await page.locator('.ss-feed-post').count(),9,'Nove publicações únicas');
   assert.equal(await page.locator('.ss-symbol-choice').count(),5,'Símbolos oficiais');
   assert.equal(await page.locator('.lm-site-nav [data-area="redes"][aria-current="page"]').count(),1);
   const photos=await page.locator('.ss-feed-post img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')));
   assert.equal(new Set(photos).size,photos.length,'Feed não repete fotografias');
   for(const area of ['#criterio','#derivacoes','#feed','#sequencia','#publicar']){
    await page.locator(area).scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    const rect=await page.locator(area).boundingBox();
    assert.ok(rect.width>0,'Seção presente: '+area);
   }
   await page.locator('#criterio').scrollIntoViewIfNeeded();
   await page.locator('[data-case="identificar"]').click();
   assert.ok(await page.locator('#ssCaseCanvas').evaluate(el=>el.classList.contains('is-identified')));
   assert.match(await page.locator('#ssCaseRationale').innerText(),/nome organiza/i);
   await page.locator('[data-case="compor"]').click();
   assert.equal(await page.locator('#ssCaseCanvas .ss-case-editorial-title').count(),1);
   await page.locator('[data-case="preservar"]').click();
   await page.locator('#derivacoes').scrollIntoViewIfNeeded();
   await page.locator('[data-symbol="vaso_03.svg"]').click();
   assert.match(await page.locator('#ssSymbolBig').getAttribute('src'),/vaso_03\.svg/);
   if(width===1440){
    const download=page.waitForEvent('download');
    await page.locator('#ssExportSymbol').click();
    const d=await download;
    assert.match(d.suggestedFilename(),/1080\.png/);
    await d.saveAs('redes-proof/simbolo-1080.png');
    assert.ok((await stat('redes-proof/simbolo-1080.png')).size>1000,'PNG símbolo gerado');
   }
   await page.locator('#feed').scrollIntoViewIfNeeded();
   const ordered=await page.locator('.ss-feed-post').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
   assert.equal(ordered.length,9);
   await page.locator('[data-feed-preset="projetos"]').click();
   const grouped=await page.locator('.ss-feed-post').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
   assert.notDeepEqual(grouped,ordered,'Preset agrupado reorganiza');
   await page.locator('#ssFeedNext').click();
   const changed=await page.locator('.ss-feed-post').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
   assert.notDeepEqual(changed,grouped,'Mover publicação altera a ordem');
   if(width===1440){
    const download=page.waitForEvent('download');
    await page.locator('#ssFeedExport').click();
    const d=await download;
    await d.saveAs('redes-proof/feed-preview.png');
    assert.ok((await stat('redes-proof/feed-preview.png')).size>1000,'PNG do feed gerado');
   }
   await page.locator('#ssFeedReset').click();
   await page.locator('#sequencia').scrollIntoViewIfNeeded();
   await page.locator('[data-story="2"]').click();
   assert.match(await page.locator('#ssStoryImage').getAttribute('src'),/aleteia-03/);
   await page.locator('#publicar').scrollIntoViewIfNeeded();
   await page.locator('[data-format="9:16"]').click();
   assert.equal(await page.locator('#ssFormatFrame').getAttribute('data-ratio'),'9:16');
   await page.locator('#ssFormatGuides').check();
   assert.ok(await page.locator('#ssFormatFrame').evaluate(el=>el.classList.contains('show-guides')));
   await page.locator('[data-review]').first().check();
   assert.match(await page.locator('#ssReviewCount').innerText(),/1 \/ 4/);
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,screen:innerWidth}));
   assert.ok(overflow.page<=overflow.screen+1,'Sem rolagem horizontal: '+JSON.stringify(overflow));
   for(const [name,sel] of [['capa','.ss-cover'],['criterio','#criterio'],['derivacoes','#derivacoes'],['feed','#feed'],['sequencia','#sequencia'],['publicar','#publicar']]){
    await page.locator(sel).screenshot({path:'redes-proof/'+name+'-'+width+'.png',timeout:60000});
   }
  }finally{await page.close();}
 }
 assert.deepEqual(failures,[],'Sem erros JavaScript no navegador');
 console.log('REDES: visual, navegação, exportação de PNG, feed e enquadramento OK');
}finally{await browser.close();}
