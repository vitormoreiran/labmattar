import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url=process.env.TYPOGRAPHY_URL||'http://127.0.0.1:8766/tipografia.html';
const report={url,viewports:[],errors:[],failedRequests:[]};
await mkdir('typography-proof',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
page.on('pageerror',e=>report.errors.push(e.message));
page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
const geometry=()=>page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,styles:[...new Set([...document.querySelectorAll('.type-title')].map(e=>{const c=getComputedStyle(e);return [c.fontSize,c.lineHeight,c.fontWeight,c.letterSpacing,c.textAlign].join('|');}))],overflow:[...document.querySelectorAll('.title-line')].filter(e=>{const r=document.createRange();r.selectNodeContents(e);const text=r.getBoundingClientRect(),box=e.getBoundingClientRect();return text.right>box.right+1||text.left<box.left-1;}).map(e=>e.textContent)}));
try{
 const r=await page.goto(url,{waitUntil:'networkidle',timeout:60000});assert.equal(r.status(),200);
 await page.waitForSelector('[data-typography-version="20261029-one-title"]');
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
 report.fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
 for(const family of ['UniversMattar','PerpetuaMattar'])assert.ok(report.fonts.some(f=>f.family===family&&f.status==='loaded'),family);
 assert.equal(await page.locator('[data-text-role]').count(),3);
 assert.deepEqual(await page.locator('[data-text-role]').evaluateAll(els=>els.map(e=>e.dataset.textRole)),['title','body','detail']);
 assert.equal(await page.locator('.lm-motion-unit').count(),1);
 assert.equal(await page.locator('.massive,.display,.category,.editorial').count(),0);
 assert.equal(await page.locator('.rules .rule').count(),5);
 for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[375,667],[320,640]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  const g=await geometry();report.viewports.push(g);assert.equal(g.document,width,'No horizontal scroll');assert.deepEqual(g.overflow,[],'No clipped words');assert.equal(g.styles.length,1,'Exactly ONE title style everywhere');
  const bodySize=await page.locator('.body-sample').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
  const detailSize=await page.locator('.detail-specimen .detail').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.ok(bodySize>detailSize);
  if([1440,390].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`typography-proof/cover-${width}.png`});await page.locator('#titulo').screenshot({path:`typography-proof/title-${width}.png`});}
  await page.locator('header.top a[href="#titulo"]').click();await page.waitForTimeout(100);
  const nav=await page.evaluate(()=>({global:document.querySelector('.lm-site-nav').getBoundingClientRect().bottom,local:document.querySelector('header.top').getBoundingClientRect().top,bottom:document.querySelector('header.top').getBoundingClientRect().bottom,title:document.querySelector('#titulo h2').getBoundingClientRect().top}));assert.ok(nav.local>=nav.global-1,'Menus do not overlap');assert.ok(nav.title>=nav.bottom-1,'Anchor title not covered');
 }
 await page.locator('#type-guides').click();assert.equal(await page.locator('#type-guides').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.board-guides').evaluate(e=>getComputedStyle(e).display),'block');
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);await page.locator('#regras').screenshot({path:'typography-proof/composition-1440.png'});
 await page.locator('#type-guides').click();assert.equal(await page.locator('#type-guides').getAttribute('aria-pressed'),'false');
 const original=await page.locator('#lm-motion-text').innerText();
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(100);await page.locator('#lm-motion-play').click();await page.waitForTimeout(220);
  assert.equal(await page.locator('#lm-motion-text').getAttribute('data-playing'),'true');assert.notEqual(await page.locator('#lm-motion-text').innerText(),original,'Characters reorganize');
  for(let i=0;i<4;i++){assert.deepEqual((await geometry()).overflow,[],'Animated text stays inside margins');await page.waitForTimeout(200);}
  await page.waitForTimeout(700);assert.equal(await page.locator('#lm-motion-text').innerText(),original,'Final wording is exact');assert.equal(await page.locator('#lm-motion-text').getAttribute('data-playing'),'false');assert.equal((await geometry()).styles.length,1);
 }
 await page.locator('#lm-motion-play').click();await page.waitForTimeout(100);await page.locator('#lm-motion-play').click();await page.waitForTimeout(1800);assert.equal(await page.locator('#lm-motion-text').innerText(),original,'Restart settles correctly');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#lm-motion-play').click();assert.equal(await page.locator('#lm-motion-text').innerText(),original);assert.equal(await page.locator('#lm-motion-text').getAttribute('data-playing'),'false');
 await page.setViewportSize({width:390,height:844});await page.locator('#movimento').screenshot({path:'typography-proof/motion-390.png'});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.animation=true;report.reducedMotion=true;report.guides=true;report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;await page.screenshot({path:'typography-proof/failure.png'}).catch(()=>{});throw e;}finally{await writeFile('typography-proof/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
