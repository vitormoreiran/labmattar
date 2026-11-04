import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const url=process.env.REDES_URL || 'http://127.0.0.1:8765/redes.html';
await mkdir('redes-proof',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const report={url,viewports:[],errors,media:[],checks:[]};
try {
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
    assert.equal(response.status(),200,'Capitulo 06 responde 200');
    await page.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
    assert.equal(await page.locator('.lm-site-nav a[data-area="redes"][aria-current="page"]').count(),1,'Navegacao ativa');
    assert.equal(await page.locator('main>.lm-social').count(),7,'Capa + seis secoes editoriais');
    assert.equal(await page.locator('.rule-card').count(),3,'Tres intensidades visuais');
    assert.equal(await page.locator('.application article').count(),4,'Quatro enquadramentos');
    assert.equal(await page.locator('.method article').count(),6,'Seis funcoes editoriais');
    assert.equal(await page.locator('#lmSeasonPlanner').count(),0,'Sem antigo planejador');
    const content=(await page.locator('main').textContent()).toLocaleLowerCase('pt-BR');
    assert.ok(content.includes('cada corpo abre um mundo'),'Projeto-base');
    assert.ok(content.includes('poiesis') && content.includes('aleteia'),'Temporadas seguintes');
    assert.ok(!content.includes('fome come'),'Temporada incorreta removida');
    const media=await page.locator('img[src*="BOXDOSENTIR-"]').evaluateAll(images=>images.map(img=>({
      src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight
    })));
    assert.ok(media.length>=9,'Exemplos fotografados do caso-base');
    assert.equal(await page.locator('.case-visual-real .image-tile img').count(),5,'Cinco imagens distintas da temporada');
    assert.equal(await page.locator('.case-visual-real .image-tile img').evaluateAll(imgs=>new Set(imgs.map(img=>img.getAttribute('src'))).size),5,'Acervo sem repeticao na matriz principal');
    assert.ok(await page.locator('.rule-card h3.title').count()===3,'Tres aplicacoes com tratamento Titulo');
    assert.equal(await page.locator('.case-visual-real .poster-title').getAttribute('data-lm-text-role'),'title','Composicao usa Titulo oficial');
    assert.equal(await page.locator('.case-visual-real .poster-footer').getAttribute('data-lm-text-role'),'detail','Creditos usam Detalhe oficial');
    assert.ok(media.every(image=>image.loaded),'Fotografias carregadas');
    report.media=media;
    const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
    assert.equal(horizontalOverflow,false,'Sem transbordamento horizontal');
    await page.screenshot({path:'redes-proof/redes-'+viewport.width+'.png',fullPage:true,animations:'disabled'});
    report.viewports.push({viewport,media:media.length,horizontalOverflow});
    await page.close();
  }
  assert.equal(errors.length,0,'Sem erros JS');
  report.checks.push('estrutura','fotografias','tipografia','mobile','sem ferramentas redundantes');
} finally {
  await writeFile('redes-proof/report.json',JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify(report,null,2));
