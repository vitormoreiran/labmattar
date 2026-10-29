import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('symbols-proof',{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const report={url:process.env.EDITOR_URL||'http://127.0.0.1:8765/editor/',errors:[],failedRequests:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
try {
 const response=await page.goto(report.url,{waitUntil:'networkidle'});
 assert.equal(response.status(),200);
 await page.waitForSelector('.lm-root[aria-busy="false"]',{timeout:60000});
 assert.equal(await page.locator('.lm-state').count(),10);
 const before=await page.locator('.lm-art svg').innerHTML();
 await page.locator('.lm-play').click();
 await page.waitForTimeout(900);
 await page.locator('.lm-play').click();
 const time=await page.locator('.lm-track input').inputValue();
 assert.ok(Number(time)>0,'Native timeline must advance');
 const after=await page.locator('.lm-art svg').innerHTML();
 assert.notEqual(after,before,'Native vector geometry must animate');
 await page.screenshot({path:'symbols-proof/editor-built-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(150);
 await page.screenshot({path:'symbols-proof/editor-built-mobile.png'});
 assert.deepEqual(report.errors,[]);
 assert.deepEqual(report.failedRequests,[]);
 report.passed=true;report.states=10;report.time=time;report.geometryAnimated=true;
} catch(error) {
 report.passed=false;report.failure=error.stack;
 await page.screenshot({path:'symbols-proof/editor-built-failure.png'}).catch(()=>{});
 throw error;
} finally {
 await writeFile('symbols-proof/editor-built-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));await browser.close();
}
