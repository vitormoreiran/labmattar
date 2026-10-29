import { chromium } from 'playwright';
const url=process.env.EDITORIAL_URL||'https://labmattar-identidade-previa.vitormoreiran.workers.dev/ambiente-editorial/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
let errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#sheet').waitFor();
 const initialState=await page.locator('#sheet').evaluate(el=>({source:el.classList.contains('ed-source-page'),media:el.dataset.mediaState,background:getComputedStyle(el).backgroundColor}));
 if(!initialState.source)throw new Error('Original renderer must remain active on every page: '+JSON.stringify(initialState));

 const official=await page.evaluate(async()=>{await document.fonts.load('300 20px "LM Univers Official"');await document.fonts.load('300 20px "LM Perpetua Official"');return {univers:document.fonts.check('300 20px "LM Univers Official"'),perpetua:document.fonts.check('300 20px "LM Perpetua Official"'),assets:await Promise.all(['/fonts/univers-lt-std-45-light.otf','/fonts/perpetua-titling-light.ttf'].map(async p=>{const r=await fetch(p);return {status:r.status,type:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength}}))}});
 if(!official.univers||!official.perpetua||official.assets.some(a=>a.status!==200||a.bytes<3000))throw new Error('Fontes oficiais nao carregadas: '+JSON.stringify(official));

 await page.locator('#undo').waitFor();
 await page.locator('#filmstrip [data-film]').first().waitFor();
 const count=await page.locator('#filmstrip [data-film]').count();
 if(count<3)throw new Error('Exige ao menos 3 paginas ilustradas: '+count);
 await page.locator('[data-tab="models"]').click();
 await page.locator('[data-model="project"]').click();
 await page.locator('[data-treatment="portfolio"]').click();
 await page.locator('[data-example="1"]').click();
 const titleFont=await page.locator('#sheet .role-title').evaluate(el=>({family:getComputedStyle(el).fontFamily,chosen:el.dataset.family,left:getComputedStyle(el).left,top:getComputedStyle(el).top}));
 if(titleFont.chosen!=='perpetua'||!titleFont.family.includes('LM Perpetua Official'))throw new Error('Perpetua nao aplicada ao titulo de projeto: '+JSON.stringify(titleFont));
 await page.locator('#sheet .role-title').click();
 const familyControl=page.locator('#titleFamily');
 await familyControl.selectOption('univers');
 const universFont=await page.locator('#sheet .role-title').evaluate(el=>getComputedStyle(el).fontFamily);
 if(!universFont.includes('LM Univers Official'))throw new Error('Univers nao aplicada ao titulo: '+universFont);
 await familyControl.selectOption('perpetua');

 await page.locator('#sheet.ed-source-page[data-editorial-role="project"][data-treatment="portfolio"] .chapter2-stage-stack .chapter2-m-image').waitFor();
 const ratio=await page.locator('.chapter2-stage-stack').evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height});
 if(Math.abs(ratio-990.08/743.18)>.03)throw new Error('M distorcido: '+ratio);
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
 console.log('PASS: 3 paginas, estrutura editorial independente do M, exemplo real, inserir, historico, camadas, focal point, responsividade, preview');
}catch(e){await page.screenshot({path:'editorial-browser-failure.png',fullPage:true}).catch(()=>{});console.error(e);process.exitCode=1}
finally{await browser.close()}
