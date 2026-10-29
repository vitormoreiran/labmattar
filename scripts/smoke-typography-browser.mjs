import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url=process.env.TYPOGRAPHY_URL||'http://127.0.0.1:8766/tipografia.html';
const report={url,viewports:[],errors:[],failedRequests:[],motion:[]};
await mkdir('typography-proof',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
page.on('pageerror',e=>report.errors.push(e.message));
page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
const geometry=()=>page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,styles:[...new Set([...document.querySelectorAll('.type-title')].map(e=>{const c=getComputedStyle(e);return [c.fontSize,c.lineHeight,c.fontWeight,c.letterSpacing,c.textAlign].join('|');}))],overflow:[...document.querySelectorAll('.title-line,.motion-word')].filter(e=>{const r=document.createRange();r.selectNodeContents(e);const text=r.getBoundingClientRect(),box=e.getBoundingClientRect();return text.right>box.right+1||text.left<box.left-1;}).map(e=>e.textContent)}));
const texts=()=>page.locator('#motion-composition [data-original]').evaluateAll(els=>els.map(e=>e.textContent));
const ruler=()=>page.locator('[data-motion-role]').evaluateAll(els=>els.map(e=>({role:e.dataset.motionRole,x:e.offsetLeft,y:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight})));
try{
 const r=await page.goto(url,{waitUntil:'networkidle',timeout:60000});assert.equal(r.status(),200);
 await page.waitForSelector('[data-typography-version="20261029-one-title"]');
 await page.waitForSelector('[data-motion-standard="site-wide"]');
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
 report.fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
 for(const family of ['UniversMattar','PerpetuaMattar'])assert.ok(report.fonts.some(f=>f.family===family&&f.status==='loaded'),family);
 assert.deepEqual(await page.locator('[data-text-role]').evaluateAll(els=>els.map(e=>e.dataset.textRole)),['title','body','detail']);
 assert.equal(await page.locator('.lm-motion-unit').count(),1);
 assert.equal(await page.locator('.massive,.display,.category,.editorial').count(),0);
 assert.equal(await page.locator('.rules .rule').count(),5);
 assert.match(await page.locator('.rules .rule').first().innerText(),/fixo na r\u00e9gua da p\u00e1gina/);
 assert.ok(!(await page.locator('main').innerText()).includes('posicionado livremente'));
 assert.match(await page.locator('[data-motion-role="body"] [data-original]').innerText(),/devem usar a mesma anima\u00e7\u00e3o de entrada em todo o site/);
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
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(150);await page.locator('#regras').screenshot({path:'typography-proof/composition-1440.png'});
 await page.locator('#type-guides').click();assert.equal(await page.locator('#type-guides').getAttribute('aria-pressed'),'false');
 const originals=await texts();
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(150);
  const before=await ruler();await page.locator('#lm-motion-play').click();await page.waitForTimeout(150);
  assert.equal(await page.locator('#motion-composition').getAttribute('data-playing'),'true');
  const states=await page.locator('[data-motion-role]').evaluateAll(els=>els.map(e=>({role:e.dataset.motionRole,animated:e.getAnimations().length===1,start:e.getAnimations()[0]?.startTime,text:[...e.querySelectorAll('[data-original]')].some(l=>l.textContent!==l.dataset.original)})));
  assert.equal(states.length,3);assert.ok(states.every(s=>s.animated&&s.text),'Title, body and detail all animate');assert.equal(new Set(states.map(s=>s.start)).size,1,'One synchronized entrance');
  assert.deepEqual(await ruler(),before,'Layout stays fixed on the page ruler');
  for(let i=0;i<4;i++){assert.deepEqual((await geometry()).overflow,[],'Animated characters stay inside their reserved words');await page.waitForTimeout(200);}
  await page.waitForTimeout(750);assert.deepEqual(await texts(),originals,'Exact final text in every role');assert.equal(await page.locator('#motion-composition').getAttribute('data-playing'),'false');assert.equal((await geometry()).styles.length,1);
  report.motion.push({width,roles:states.map(s=>s.role),synchronized:true,fixedRuler:true});
  if([1440,390].includes(width))await page.locator('#movimento').screenshot({path:`typography-proof/motion-${width}.png`});
 }
 await page.locator('#lm-motion-play').click();await page.waitForTimeout(100);await page.locator('#lm-motion-play').click();await page.waitForTimeout(1800);assert.deepEqual(await texts(),originals,'Restart settles correctly');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#lm-motion-play').click();assert.deepEqual(await texts(),originals);assert.equal(await page.locator('#motion-composition').getAttribute('data-playing'),'false');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.animation=true;report.reducedMotion=true;report.guides=true;report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;await page.screenshot({path:'typography-proof/failure.png'}).catch(()=>{});throw e;}finally{await writeFile('typography-proof/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
