import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, stat, writeFile } from 'node:fs/promises';

const url = process.env.REDES_URL || 'http://127.0.0.1:8765/redes.html';
await mkdir('redes-proof',{recursive:true});
const report = {url,viewports:[],media:[],checks:[],errors:[]};
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true,reducedMotion:'reduce'});
page.on('pageerror',error=>report.errors.push(error.message));
try {
  const response = await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  assert.equal(response.status(),200,'Capítulo 06 deve responder HTTP 200.');
  await page.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
  assert.equal(await page.locator('.lm-site-nav a[data-area="redes"][aria-current="page"]').count(),1,'Capítulo ativo na navegação.');
  assert.equal(await page.locator('main>.lm-manual-cover').count(),1,'Capa editorial oficial.');
  assert.equal(await page.locator('h2.lm-manual-section-title').count(),5,'Cinco partes editoriais.');
  assert.equal(await page.locator('.lm-social-case-stage').count(),3,'Três níveis de intervenção.');
  assert.equal(await page.locator('#lmSocialFeedGrid>.lm-social-tile').count(),9,'Nove imagens no feed.');
  await page.evaluate(async()=>{
    const images=[...document.querySelectorAll('img[src*="/redes-acervo/"]')];
    images.forEach(img=>img.loading='eager');
    await Promise.all(images.map(img=>img.decode()));
  });
  const missing=await page.locator('img[src*="/redes-acervo/"]').evaluateAll(imgs=>
    imgs.filter(img=>!img.naturalWidth).map(img=>img.getAttribute('src')));
  assert.deepEqual(missing,[],'Todas as fotografias reais carregam.');
  report.media=await page.locator('img[src*="/redes-acervo/"]').evaluateAll(imgs=>
    [...new Set(imgs.map(img=>img.getAttribute('src')))]);
  for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,640]]){
    await page.setViewportSize({width,height});
    const doc=await page.evaluate(()=>({width:document.documentElement.scrollWidth,window:innerWidth}));
    if(doc.width>width+1){
      const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>{
        const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
        return {tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className.slice(0,85):'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width),scroll:el.scrollWidth,client:el.clientWidth,display:style.display};
      }).filter(x=>x.width>0&&x.display!=='none'&&(x.left < -1 || x.right > innerWidth + 1)).sort((a,b)=>b.right-a.right).slice(0,25));
      await page.screenshot({path:'redes-proof/overflow-'+width+'.png',fullPage:true});
      throw new Error('Sem rolagem horizontal em '+width+': '+doc.width+' / ofensores '+JSON.stringify(offenders));
    }
    report.viewports.push({width,height,...doc});
    if(width===1440||width===390){
      for(const [id,name] of [['abertura','capa'],['criterio','criterio'],['derivacoes','derivacoes'],
        ['sequencia','sequencia'],['feed','feed'],['boas-praticas','publicar']]){
        await page.locator('#'+id).screenshot({path:'redes-proof/'+name+'-'+width+'.png',timeout:60000});
      }
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('[data-avatar-source="vaso_03.svg"]').click();
  assert.match(await page.locator('#lmSocialAvatarLabel').innerText(),/VASO 03/);
  const avatarDownload=page.waitForEvent('download');
  await page.locator('#lmSocialAvatarExport').click();
  const avatar=await avatarDownload;
  assert.match(avatar.suggestedFilename(),/vaso_03.*avatar.png/);
  await avatar.saveAs('redes-proof/simbolo-1080.png');
  assert.ok((await stat('redes-proof/simbolo-1080.png')).size>10000,'Avatar é um PNG real.');
  report.checks.push('avatar-export');
  await page.locator('#lmSocialStoryNext').click();
  assert.match(await page.locator('#lmSocialStoryCounter').innerText(),/02 \/ 04/);
  report.checks.push('carrossel');
  await page.locator('[data-feed-mode="agrupado"]').click();
  assert.equal(await page.locator('#lmSocialFeedGrid').getAttribute('data-mode'),'agrupado');
  const original=await page.locator('#lmSocialFeedGrid>.lm-social-tile').evaluateAll(els=>els.map(el=>el.dataset.media));
  assert.equal(original[1],'aleteia-14','Agrupamento realmente aproxima registros do mesmo projeto.');
  await page.locator('#lmSocialFeedGrid>.lm-social-tile').nth(1).click();
  await page.locator('#lmFeedMoveRight').click();
  assert.equal(await page.locator('#lmSocialFeedGrid').getAttribute('data-mode'),'manual');
  const altered=await page.locator('#lmSocialFeedGrid>.lm-social-tile').evaluateAll(els=>els.map(el=>el.dataset.media));
  assert.notDeepEqual(altered,original,'Mover altera a ordem.');
  await page.reload({waitUntil:'networkidle'});
  const persisted=await page.locator('#lmSocialFeedGrid>.lm-social-tile').evaluateAll(els=>els.map(el=>el.dataset.media));
  assert.deepEqual(persisted,altered,'A ordem persiste após recarregar no mesmo navegador.');
  report.checks.push('feed-reorder-persistence');
  await page.locator('#lmSocialFeedGrid>.lm-social-tile').nth(2).click();
  await page.locator('#lmFeedReplace').selectOption('poiesis-37');
  assert.equal(await page.locator('#lmSocialFeedGrid>.lm-social-tile').nth(2).getAttribute('data-media'),'poiesis-37');
  report.checks.push('feed-replace');
  const imageDownload=page.waitForEvent('download');
  await page.locator('#lmFeedExport').click();
  const snapshot=await imageDownload;
  assert.equal(snapshot.suggestedFilename(),'labmattar-estudo-feed.png');
  await snapshot.saveAs('redes-proof/feed-preview.png');
  assert.ok((await stat('redes-proof/feed-preview.png')).size>15000,'PNG do feed contém imagens reais.');
  report.checks.push('feed-export');
  assert.deepEqual(report.errors,[],'Sem erros de JavaScript.');
  await writeFile('redes-proof/report.json',JSON.stringify(report,null,2));
  console.log('REDES 06 OK',JSON.stringify({checks:report.checks,viewports:report.viewports,media:report.media.length}));
} finally {await browser.close();}
