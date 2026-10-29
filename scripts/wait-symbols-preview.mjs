import {chromium} from 'playwright';
const base='https://labmattar-identidade-previa.vitormoreiran.workers.dev';
const browser=await chromium.launch();
const page=await browser.newPage();
let ready=false;
try {
 for(let attempt=0;attempt<18;attempt++){
  const stamp=Date.now();
  const manual=await page.goto(base+'/manual?publication='+stamp,{waitUntil:'networkidle',timeout:30000});
  const correct=manual.status()===200&&await page.locator('.state-explorer[data-ready="true"][data-symbols-version="20261029-verified"]').count()===1;
  const editor=await page.goto(base+'/editor?publication='+stamp,{waitUntil:'networkidle',timeout:30000});
  if(correct&&editor.status()===200){
   await page.waitForSelector('.lm-root[aria-busy="false"]',{timeout:60000});
   ready=true;console.log('Published manual revision and original matrix are ready.');break;
  }
  console.log('Published assets not yet consistent; rechecking both routes.');
  await page.waitForTimeout(5000);
 }
 if(!ready)throw new Error('Published manual and editor did not become consistent');
} finally {await browser.close();}
