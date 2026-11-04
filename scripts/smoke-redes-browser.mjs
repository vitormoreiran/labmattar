import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, stat, writeFile } from 'node:fs/promises';

const url=process.env.REDES_URL||'http://127.0.0.1:8765/redes.html';
await mkdir('redes-proof',{recursive:true});
const report={url,viewports:[],media:[],checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true,reducedMotion:'reduce'});
page.on('pageerror',error=>report.errors.push(error.message));
page.on('dialog',dialog=>dialog.accept());
const sample=()=>page.locator('#lmSeasonFeed>.lm-season-post');
try {
  const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  assert.equal(response.status(),200,'Capítulo 06 deve responder HTTP 200');
  await page.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
  assert.equal(await page.locator('.lm-site-nav a[data-area="redes"][aria-current="page"]').count(),1,'Capítulo 06 ativo');
  assert.equal(await page.locator('main>.lm-manual-cover').count(),1,'Capa editorial oficial');
  assert.equal(await page.locator('h2.lm-manual-section-title').count(),6,'Seis partes editoriais do novo capítulo');
  assert.equal(await page.locator('.lm-social-case-stage').count(),3,'Três intensidades de aplicação');
  assert.equal(await page.locator('.lm-season-frame-demo').count(),4,'Quatro enquadramentos demonstrados');
  assert.equal(await page.locator('[data-feed-mode]').count(),0,'Sem ordenação aleatória de mosaico');
  assert.equal(await page.locator('#lmSeasonTimeline>button').count(),3,'Três temporadas de exemplo');
  assert.equal(await sample().count(),7,'O feed usa quantidade variável por temporada');
  assert.equal(await sample().first().getAttribute('data-season-id'),'season-7','Perfil começa pela temporada mais recente');
  assert.equal(await sample().first().getAttribute('data-role'),'detalhe','Perfil inverte ordem de publicação dentro da temporada');

  const media=await page.locator('img[src*="/redes-acervo/"]').evaluateAll(imgs=>[...new Set(imgs.map(img=>img.getAttribute('src')))]);
  report.media=media;
  await page.evaluate(async()=>{
    const images=[...document.querySelectorAll('img[src*="/redes-acervo/"]')];
    images.forEach(img=>img.loading='eager');
    await Promise.all(images.map(img=>img.decode()));
  });
  const missing=await page.locator('img[src*="/redes-acervo/"]').evaluateAll(imgs=>
    imgs.filter(img=>!img.naturalWidth).map(img=>img.src));
  assert.deepEqual(missing,[],'Fotografias reais carregadas');

  for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,640]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>document.fonts.ready);
    const actual=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
    if(actual.scrollWidth>width+1){
      const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>{
        const r=el.getBoundingClientRect(),css=getComputedStyle(el);
        return {node:el.tagName,className:String(el.className).slice(0,75),left:r.left,right:r.right,visible:css.display!=='none'};
      }).filter(el=>el.visible&&el.right>innerWidth+1).sort((a,b)=>b.right-a.right).slice(0,25));
      throw Error('Horizontal scroll '+width+' / '+actual.scrollWidth+' / '+JSON.stringify(offenders));
    }
    report.viewports.push({width,height,...actual});
    if(width===1440||width===390){
      for(const [id,name] of [['abertura','capa'],['temporadas','temporadas'],
        ['enquadramentos','enquadramentos'],['criterio','criterio'],
        ['sequencia','carrossel'],['derivacoes','derivacoes'],['boas-praticas','boas-praticas']]){
        await page.locator('#'+id).screenshot({path:'redes-proof/'+name+'-'+width+'.png',timeout:60000});
      }
    }
  }
  report.checks.push('mobile-and-images');

  await page.setViewportSize({width:1440,height:900});
  await page.locator('[data-apply-frame="respiro"]').click();
  assert.equal(await page.locator('.lm-season-selected-preview .lm-season-art').getAttribute('data-frame'),'respiro','Exemplo de enquadramento aplica-se à capa da temporada');
  assert.equal(await page.locator('#lmSeasonRole').inputValue(),'capa');
  report.checks.push('cover-frames');
  await page.locator('#lmSeasonFrame').selectOption('titulo');
  assert.equal(await page.locator('.lm-season-selected-preview .lm-season-art').getAttribute('data-frame'),'titulo');
  await page.locator('#lmSeasonFocus').selectOption('left');
  assert.match(await page.locator('.lm-season-selected-preview .lm-season-art').getAttribute('style'),/10% 50%/);
  report.checks.push('cover-framing-and-focus');

  const coverReady=page.waitForEvent('download');
  await page.locator('#lmSeasonExportPost').click();
  const cover=await coverReady;
  assert.match(cover.suggestedFilename(),/labmattar-aleteia-capa.png/);
  await cover.saveAs('redes-proof/capa-projeto.png');
  assert.ok((await stat('redes-proof/capa-projeto.png')).size>20000,'Export de capa produz PNG real');
  report.checks.push('cover-export');

  await page.locator('#lmSeasonMoveOlder').click();
  assert.equal(await sample().first().getAttribute('data-season-id'),'season-4','Mover temporada muda o histórico sem alternar imagens');
  const sequence=await sample().evaluateAll(els=>els.map(x=>x.dataset.seasonId));
  assert.deepEqual(sequence,['season-4','season-4','season-7','season-7','season-7','season-1','season-1'],'Temporadas permanecem blocos consecutivos');
  await page.locator('#lmSeasonPeriod').fill('período confirmado');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await sample().first().getAttribute('data-season-id'),'season-4','Ordem das temporadas persiste');
  await page.locator('#lmSeasonSelect').selectOption('season-7');
  assert.equal(await page.locator('#lmSeasonPeriod').inputValue(),'período confirmado','Período informado persiste sem inventar data');
  report.checks.push('season-chronology-persistence');

  await page.locator('#lmSeasonNewProject').selectOption('Poiesis');
  await page.locator('#lmSeasonAddSeason').click();
  assert.equal(await page.locator('#lmSeasonTimeline>button').count(),4);
  assert.equal(await sample().first().getAttribute('data-role'),'capa');
  assert.equal(await page.locator('#lmSeasonPostSelect option').count(),1);
  await page.locator('#lmSeasonAddPost').click();
  assert.equal(await page.locator('#lmSeasonPostSelect option').count(),2);
  assert.equal(await sample().first().getAttribute('data-role'),'conteudo');
  await page.locator('#lmSeasonRole').selectOption('contexto');
  await page.locator('#lmSeasonFrame').selectOption('respiro');
  assert.equal(await page.locator('.lm-season-selected-preview .lm-season-art').getAttribute('data-frame'),'respiro');
  await page.locator('#lmSeasonPostOlder').click();
  assert.equal(await page.locator('#lmSeasonPostSelect').inputValue(),await sample().nth(1).getAttribute('data-post-id')===null?'':'post-0');
  report.checks.push('season-create-add-role-framing');

  const feedReady=page.waitForEvent('download');
  await page.locator('#lmSeasonExportFeed').click();
  const picture=await feedReady;
  assert.equal(picture.suggestedFilename(),'labmattar-temporadas-estudo-feed.png');
  await picture.saveAs('redes-proof/feed-temporadas.png');
  assert.ok((await stat('redes-proof/feed-temporadas.png')).size>25000,'PNG de feed temporal real');
  report.checks.push('timeline-feed-export');

  await page.locator('[data-avatar-source="vaso_03.svg"]').click();
  assert.match(await page.locator('#lmSocialAvatarLabel').innerText(),/VASO 03/);
  const avatarReady=page.waitForEvent('download');
  await page.locator('#lmSocialAvatarExport').click();
  const avatar=await avatarReady;
  await avatar.saveAs('redes-proof/avatar.png');
  assert.ok((await stat('redes-proof/avatar.png')).size>10000);
  report.checks.push('official-avatar');
  await page.locator('#lmSocialStoryNext').click();
  assert.match(await page.locator('#lmSocialStoryCounter').innerText(),/02 \/ 04/);
  report.checks.push('carousel');
  await page.locator('#lmSeasonReset').click();
  assert.equal(await page.locator('#lmSeasonTimeline>button').count(),3,'Estudo restaurado');
  assert.equal(await sample().count(),7,'O reset preserva a unidade de cada temporada');
  assert.deepEqual(report.errors,[],'Sem exceções JS');
  report.checks.push('reset');
  await writeFile('redes-proof/report.json',JSON.stringify(report,null,2));
  console.log('REDES TEMPORADAS OK',JSON.stringify({checks:report.checks,media:report.media.length,viewports:report.viewports}));
}finally{await browser.close();}
