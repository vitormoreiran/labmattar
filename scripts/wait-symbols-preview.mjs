import {chromium} from 'playwright';
import {checkLaboratoryLinks} from './laboratory-readiness.mjs';
const base='https://labmattar-identidade-previa.vitormoreiran.workers.dev';
const browser=await chromium.launch();
const page=await browser.newPage();
let ready=false;
// The editor loads media and background assets after the DOM is ready.
// networkidle can remain pending indefinitely despite a fully usable page.
// Verify actual page anchors and the matrix readiness state instead.
try {
 for(let attempt=0;attempt<18;attempt++){
  const stamp=Date.now();
  const manual=await page.goto(base+'/manual?publication='+stamp,{waitUntil:'domcontentloaded',timeout:30000});
  const correct=manual.status()===200&&await page.locator('.motion-symbol-preview[data-motion-version="20261104-groups"]').count()===1;
  const composition=await page.goto(base+'/composicao.html?publication='+stamp,{waitUntil:'domcontentloaded',timeout:30000});
  const constructionReady=composition.status()===200&&
    await page.locator('#construcao').count()===1&&
    await page.locator('#laboratorio').count()===0&&
    await page.locator('main a[href="/laboratorio.html"]').count()===1;
  const laboratory=await page.goto(base+'/laboratorio.html?publication='+stamp,{waitUntil:'domcontentloaded',timeout:30000});
  const toolLinks=await page.locator('a.lm-lab-tool').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  const tools=checkLaboratoryLinks(toolLinks,base);
  const labReady=laboratory.status()===200&&
    tools.ready&&
    await page.locator('a[href="/motion/matriz/index.html"]').count()===1&&
    await page.locator('a[href="/compor.html?studio=1#laboratorio"]').count()===1&&
    await page.locator('#labArtboard').count()===0;
  const compositionTool=await page.goto(base+'/compor.html?publication='+stamp,{waitUntil:'domcontentloaded',timeout:30000});
  const compositionReady=compositionTool.status()===200&&
    await page.locator('#laboratorio #labArtboard').count()===1&&
    await page.locator('#labStudioToggle').count()===1;
  const editor=await page.goto(base+'/editor?publication='+stamp,{waitUntil:'domcontentloaded',timeout:30000});
  if(correct&&constructionReady&&labReady&&compositionReady&&editor.status()===200){
   await page.waitForSelector('.lm-root[aria-busy="false"]',{timeout:60000});
   ready=true;console.log('Published laboratory index points to the current Matrix; isolated Compor and the preserved contour editor are ready.');break;
  }
  console.log('Published assets not yet consistent:',JSON.stringify({manual:correct,construction:constructionReady,laboratory:labReady,composition:compositionReady,editor:editor.status(),tools}));
  await page.waitForTimeout(5000);
 }
 if(!ready)throw new Error('Published manual and editor did not become consistent');
} finally {await browser.close();}
