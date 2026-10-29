import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.MANUAL_URL || 'http://127.0.0.1:8765/manual.html';
const phase = process.env.CHECK_EDITOR ? 'published' : 'built';
await mkdir('symbols-proof', {recursive:true});
const report = {url,phase,viewports:[],states:[],errors:[],failedRequests:[],editor:null};
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
page.on('pageerror', error => report.errors.push(error.message));
page.on('requestfailed', request => report.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
const check = (ok,message) => assert.ok(ok,message);
const scrub = value => page.locator('#state-progress').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
try {
  const response = await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  assert.equal(response.status(),200,'Manual HTTP 200');
  await page.waitForSelector('.state-explorer[data-ready="true"][data-symbols-version="20261029-verified"]',{timeout:30000});
  await page.evaluate(()=>document.fonts.ready);
  report.fonts = await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
  for (const family of ['UniversMattar','PerpetuaMattar']) check(report.fonts.some(f=>f.family===family&&f.status==='loaded'),`Official font loaded: ${family}`);
  assert.equal(await page.locator('#estrutura .symbol').count(),2,'Only signature and M');
  assert.equal(await page.locator('#estrutura svg').count(),2,'No duplicate signature');
  for (const [width,height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[375,667],[320,640]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const geometry = await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('h1,h2,.title .line,.symbol-row,.state-explorer,.lm-site-nav,header.top,header.top a,.state-picker button')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1;}).map(e=>e.tagName+'.'+e.className)}));
    report.viewports.push(geometry);assert.equal(geometry.document,width,`No horizontal scroll at ${width}`);assert.deepEqual(geometry.overflow,[],`No clipped element at ${width}`);
    if ([1440,390,320].includes(width)) {
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`symbols-proof/${phase}-cover-${width}.png`});
      await page.locator('#estrutura').screenshot({path:`symbols-proof/${phase}-signature-${width}.png`});
    }
  }
  await page.setViewportSize({width:1440,height:900});
  const master = await page.locator('#estrutura .art-zone.m path').evaluateAll(els=>els.map(e=>e.getAttribute('d')).join(' '));
  for (let n=1;n<=9;n++) {
    await page.locator(`[data-state="${n}"]`).click();
    const original=await page.locator('#vasos .vase').nth(n-1).locator('path').evaluateAll(els=>els.map(e=>e.getAttribute('d')).join(' '));
    assert.equal(await page.locator('#state-morph-paths path').getAttribute('d'),original,`Exact endpoint ${n}`);
    const matrix=await page.locator('#state-morph-paths').evaluate(el=>{const m=el.transform.baseVal.consolidate().matrix;return {x:m.a,y:m.d};});
    assert.equal(matrix.x,matrix.y,`Uniform scale ${n}`);
    for (const value of [0,25,50,75,100]) {
      await scrub(value);
      const d=await page.locator('#state-morph-paths path').getAttribute('d');check(!/NaN|Infinity/.test(d),`Valid frame ${n}/${value}`);
      if(value===0)assert.equal(d,master,`Exact master ${n}`);
      else if(value===100)assert.equal(d,original,`Exact final ${n}`);
      else check(d.includes('C'),`Bezier curves retained ${n}/${value}`);
    }
    report.states.push({state:n,frames:5,exactEndpoints:true,uniformScale:true});
  }
  await page.locator('[data-state="1"]').click();
  await page.locator('.state-explorer').screenshot({path:`symbols-proof/${phase}-morph-endpoint.png`});
  await scrub(50);await page.locator('.state-explorer').screenshot({path:`symbols-proof/${phase}-morph-midpoint.png`});
  await scrub(0);await page.locator('#state-play').click();await page.waitForTimeout(450);await page.locator('#state-play').click();
  const paused=await page.locator('#state-progress').inputValue();check(+paused>0&&+paused<100,'Playback advances');await page.waitForTimeout(200);assert.equal(await page.locator('#state-progress').inputValue(),paused,'Pause holds frame');
  await page.locator('#state-play').click();await page.waitForTimeout(2800);assert.equal(await page.locator('#state-progress').inputValue(),'100','Resume reaches endpoint');
  await page.locator('#state-reset').click();assert.equal(await page.locator('#state-progress').inputValue(),'0','Reset returns to M');
  await page.locator('#state-progress').focus();await page.keyboard.press('End');assert.equal(await page.locator('#state-progress').inputValue(),'100','Keyboard End');await page.keyboard.press('Home');assert.equal(await page.locator('#state-progress').inputValue(),'0','Keyboard Home');
  for(const n of [2,9,4,8]) await page.locator(`[data-state="${n}"]`).click();
  assert.equal(await page.locator('.state-explorer').getAttribute('data-target'),'8','Latest selection wins');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.state-explorer').screenshot({path:`symbols-proof/${phase}-controls-mobile.png`});
  await page.locator('header.top a[href="#estrutura"]').click();await page.waitForTimeout(100);
  const menus=await page.evaluate(()=>({nav:document.querySelector('.lm-site-nav').getBoundingClientRect().bottom,header:document.querySelector('header.top').getBoundingClientRect().top,headerBottom:document.querySelector('header.top').getBoundingClientRect().bottom,title:document.querySelector('#estrutura h2').getBoundingClientRect().top}));
  check(menus.header>=menus.nav-1,'Sticky menus do not overlap');check(menus.title>=menus.headerBottom-1,'Anchor title is visible');
  for(const file of ['M.svg',...Array.from({length:9},(_,i)=>`vaso_${String(i+1).padStart(2,'0')}.svg`)]) {
    const r=await page.request.get(new URL('/identidade/'+file,url).href);assert.equal(r.status(),200,'Official asset '+file);
  }
  if(process.env.CHECK_EDITOR) {
    await page.setViewportSize({width:1440,height:1000});
    const response=await page.goto(new URL('/editor',url).href,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200,'Editor HTTP 200');
    await page.waitForSelector('.lm-root[aria-busy="false"]',{timeout:60000});
    assert.equal(await page.locator('.lm-state').count(),10,'Editor has M and all nine vessels');
    const button=page.locator('.lm-play');await button.click();await page.waitForTimeout(700);await button.click();
    const time=await page.locator('.lm-track input').inputValue();check(+time>0,'Original editor timeline advances');
    const geometry=await page.locator('.lm-art svg').innerHTML();check(geometry.includes('path'),'Original editor renders SVG');
    await page.screenshot({path:`symbols-proof/${phase}-editor.png`});
    report.editor={loaded:true,states:10,playPause:true,time};
  }
  assert.deepEqual(report.errors,[],'No browser JavaScript errors');
  assert.deepEqual(report.failedRequests,[],'No failed network requests');
  report.passed=true;
} catch(error) {
  report.passed=false;report.failure=error.stack;
  await page.screenshot({path:`symbols-proof/${phase}-failure.png`}).catch(()=>{});
  throw error;
} finally {
  await writeFile(`symbols-proof/${phase}-report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await browser.close();
}
