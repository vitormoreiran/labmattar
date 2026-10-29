import { chromium } from 'playwright';
const url=process.env.EDITORIAL_URL||'https://labmattar-identidade-previa.vitormoreiran.workers.dev/ambiente-editorial/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
let errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#sheet').waitFor();
 await page.locator('#undo').waitFor();
 await page.locator('#filmstrip [data-film]').first().waitFor();
 const count=await page.locator('#filmstrip [data-film]').count();
 if(count<3)throw new Error('Exige ao menos 3 paginas ilustradas: '+count);
 await page.locator('[data-tab="models"]').click();
 await page.locator('[data-model="portfolio"]').click();
 await page.locator('[data-example="1"]').click();
 await page.locator('#sheet.ed-original-media[data-treatment="portfolio"]').waitFor();
 const src=await page.locator('#sharp').count();
 if(src)throw new Error('Editor deve usar renderizador principal, nao demo');
 await page.locator('[data-tab="insert"]').click();
 await page.locator('#addTitle').click();
 await page.locator('#undo').click();
 await page.locator('#redo').click();
 await page.locator('[data-tab="layers"]').click();
 await page.locator('#layerImage').click();
 await page.locator('[data-image-prop="x"]').evaluate(el=>{el.value='66';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#device').click();
 await page.locator('.ed-sheet-wrap.mobile').waitFor();
 await page.locator('#device').click();
 await page.locator('#preview').click();
 await page.locator('.is-preview').waitFor();
 await page.locator('#preview').click();
 await page.screenshot({path:'editorial-desktop-smoke.png',fullPage:true});
 if(errors.length)throw new Error('Erros JavaScript: '+errors.join(' | '));
 console.log('PASS: 3 paginas, modelos, exemplo real, inserir, historico, camadas, focal point, responsividade, preview');
}catch(e){await page.screenshot({path:'editorial-browser-failure.png',fullPage:true}).catch(()=>{});console.error(e);process.exitCode=1}
finally{await browser.close()}
