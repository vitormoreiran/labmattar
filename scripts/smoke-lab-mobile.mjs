import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {selectInspectorModule} from './studio-test-controls.mjs';

const base=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const engine=process.env.COMPOSITION_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true});
const output=process.env.MOBILE_PROOF_DIR||'mobile-proof';
await mkdir(output,{recursive:true});
const errors=[],proof=[];
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{
 for(const [width,height]of [[320,568],[360,740],[390,844],[430,932],[844,390],[768,1024],[1024,768]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?studio=1#laboratorio');
  await page.waitForFunction(()=>window.LabPages&&window.LabRenderer);
  await page.evaluate(()=>document.fonts.ready);await settle(page);
  const geometry=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const buttons=['.lab-tool-navigation>button','#labTourStudioHelp','#labMotionPlay','#labOpenDelivery','#labStudioToggle'].map(selector=>{
    const e=document.querySelector(selector),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return{selector,...rect(selector),reachable:hit===e||e.contains(hit)};
   });
   return{width:innerWidth,height:innerHeight,scrollY,root:rect('#laboratorio'),preview:rect('.lm-lab-preview'),board:rect('#labArtboard'),stage:rect('.lm-lab-stage'),inspector:rect('.lm-lab-inspector'),buttons,logical:[document.querySelector('#labArtboard').offsetWidth,document.querySelector('#labArtboard').offsetHeight]};
  });
  assert.equal(geometry.root.y,0);assert.equal(geometry.scrollY,0);
  assert(Math.abs(geometry.root.h-height)<2);assert.deepEqual(geometry.logical,[1280,720]);
  assert(geometry.preview.bottom<=height+1&&geometry.inspector.bottom<=height+1);
  assert(geometry.board.w<=geometry.stage.w&&geometry.board.h<=geometry.stage.h);
  assert(geometry.board.w>250&&geometry.board.h>140,'The complete horizontal page must remain useful');
  for(const button of geometry.buttons)assert(button.reachable&&button.w>=44&&button.h>=44&&button.y>=0&&button.bottom<=49,'Toolbar action must be reachable: '+JSON.stringify(button));
  for(const name of ['fundo','texto','m','assinatura']){
   const button=page.locator('.lm-composition-module-index>button[data-mobile-module="'+name+'"]');
   await button.tap();assert.equal(await button.getAttribute('aria-pressed'),'true');
  }
  const more=page.locator('.lm-studio-secondary>summary');await more.tap();
  for(const name of ['superficie','construcao'])assert(await page.locator('button[data-mobile-module="'+name+'"]').isVisible());
  assert(await page.locator('.lm-studio-secondary #labReset').isVisible(),'Restore must remain reachable in More');
  await page.locator('button[data-mobile-module="construcao"]').tap();
  assert.equal(await page.locator('.lm-studio-secondary').evaluate(e=>e.open),false);
  await selectInspectorModule(page,'fundo',{fine:true});
  const panel=page.locator('#labPanel-imagem');
  const before=await page.locator('.lm-lab-preview').boundingBox();
  await panel.evaluate(e=>e.scrollTop=e.scrollHeight);await settle(page);
  assert((await panel.evaluate(e=>e.scrollTop))>0,'Controls must have their own scroll');
  assert.deepEqual(await page.locator('.lm-lab-preview').boundingBox(),before);
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.screenshot({path:output+'/'+width+'x'+height+'.png'});
  if(width===390){
   const snapshot=()=>page.evaluate(()=>window.LabProductionBridge.snapshot());
   const saved=await snapshot();
   const first=await page.evaluate(()=>window.LabRenderer.capture({edge:1920,ask:false}));
   await page.locator('#labPreviewToggle').tap();
   assert.equal(await page.locator('.lm-lab-inspector').isVisible(),false);
   const fit=await page.locator('#labArtboard').boundingBox();
   await page.locator('#labPreviewZoomIn').tap();await page.locator('#labPreviewZoomIn').tap();
   const zoomed=await page.locator('#labArtboard').boundingBox();assert(zoomed.width>fit.width*1.5);
   await page.locator('.lm-lab-stage').evaluate(e=>{e.scrollLeft=100;e.scrollTop=100;});
   assert((await page.locator('.lm-lab-stage').evaluate(e=>e.scrollLeft))>0);
   const enlarged=await page.evaluate(()=>window.LabRenderer.capture({edge:1920,ask:false}));
   assert.deepEqual(await snapshot(),saved,'Display zoom must not alter composition state');
   assert.equal(first.outputWidth,enlarged.outputWidth);assert.equal(first.outputHeight,enlarged.outputHeight);
   assert.equal(first.items.length,enlarged.items.length);
   for(let i=0;i<first.items.length;i++)for(const key of ['x','y','width','height']){
    if(typeof first.items[i][key]==='number')assert(Math.abs(first.items[i][key]-enlarged.items[i][key])<.6,'Zoom must not change exported '+key);
   }
   await page.screenshot({path:output+'/expanded-zoom.png'});
   await page.locator('#labPreviewFit').tap();
   assert(Math.abs((await page.locator('#labArtboard').boundingBox()).width-fit.width)<1);
   await page.locator('#labPreviewToggle').tap();assert(await page.locator('.lm-lab-inspector').isVisible());
   await page.locator('#labOpenDelivery').tap();assert(await page.locator('#labDeliveryDialog').isVisible());
   await page.locator('#labDeliveryClose').tap();
   await selectInspectorModule(page,'texto',{fine:true});
   const editText=page.locator('[data-lab-more="texto"]');if(!await editText.evaluate(e=>e.open))await editText.locator(':scope>summary').tap();
   await page.locator('#labTitleInput').focus();
   assert((await page.locator('#labTitleInput').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)))>=16,'Typing must not trigger iOS viewport zoom');
   await page.setViewportSize({width:390,height:480});await settle(page);
   assert.equal(await page.locator('#laboratorio').getAttribute('data-keyboard'),'true');
   const input=await page.locator('#labTitleInput').boundingBox();
   assert(input.y>=48&&input.y+input.height<=480,'Focused text must stay reachable with keyboard');
   await page.locator('#labTitleInput').blur();await page.setViewportSize({width,height});await page.waitForTimeout(180);
   await page.locator('#labStudioToggle').tap();assert(!await page.locator('body').evaluate(e=>e.classList.contains('lm-studio-open')));
   assert.equal(await page.locator('.lm-lab-mini-actions #labReset').count(),1,'Leaving compact mode must restore original actions');
  }
  proof.push(geometry);await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/report.json',JSON.stringify({engine:engine.name(),proof},null,2));
 console.log('Mobile editor: 7 touch viewports, persistent preview, reachable toolbar, independent controls, zoom/export invariance and keyboard passed.');
}finally{await browser.close();}
