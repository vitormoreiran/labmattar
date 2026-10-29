import {chromium} from 'playwright';
const url=process.env.EDITORIAL_URL||'https://labmattar-identidade-previa.vitormoreiran.workers.dev/ambiente-editorial/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
await page.locator('#artboard').waitFor();
await page.waitForFunction(()=>document.querySelectorAll('.page-entry').length===7);
const files=await page.evaluate(async()=>Promise.all(['64','179','151'].map(async n=>{const r=await fetch('./media/BOXDOSENTIR-'+n+'.jpg');return {status:r.status,bytes:(await r.arrayBuffer()).byteLength}})));
if(files.some(f=>f.status!==200||f.bytes<20000))throw Error('Assets absent: '+JSON.stringify(files));
await page.locator('#structureTab').click();await page.locator('#pageProfile').selectOption('gallery');await page.locator('#artboard[data-profile="gallery"]').waitFor();
await page.locator('#mediaTab').click();await page.locator('#mediaTreatment').selectOption('m-detalhe');await page.locator('#artboard[data-treatment="m-detalhe"]').waitFor();
await page.locator('#mediaAssetSelect').selectOption('151');
await page.locator('#assetsTab').click();await page.locator('.asset-entry').first().click();
await page.locator('#viewportButton').click();await page.locator('.editor[data-viewport="mobile"]').waitFor();
await page.locator('#viewportButton').click();
await page.locator('#previewButton').click();await page.locator('.editor.is-preview').waitFor();await page.locator('#previewButton').click();
await page.locator('#undoButton').click();await page.locator('#redoButton').click();
await page.screenshot({path:'editorial-desktop-smoke.png',fullPage:true});
if(errors.length)throw Error(errors.join(' | '));
console.log('PASS: assets, seven pages, profiles, treatments, acervo, viewport, preview and history');
}catch(e){await page.screenshot({path:'editorial-browser-failure.png',fullPage:true}).catch(()=>{});console.error(e);process.exitCode=1}finally{await browser.close()}
