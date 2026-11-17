import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {selectInspectorModule} from './studio-test-controls.mjs';
const origin=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const output=process.env.PHOTO_EFFECT_OUTPUT||'photo-effects-proof';
await mkdir(output,{recursive:true});
const browser=await (process.env.COMPOSITION_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
const errors=[],proof=[];
try{
 const page=await browser.newPage({viewport:{width:2560,height:1440},acceptDownloads:true});
 page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(origin+'?studio=1#laboratorio');
 await page.waitForFunction(()=>window.LabPages&&window.LabRenderer);
 await selectInspectorModule(page,'superficie',{fine:true});
 await page.locator('[data-lab-choice=format][data-value=editorial]').click();
 await selectInspectorModule(page,'m');
 await page.locator('#labMEnabled').uncheck();
 await selectInspectorModule(page,'fundo',{fine:true});
 await page.locator('[data-lab-choice=background][data-value=photo]').click();
 assert(await page.locator('#labPhotoEffects').isVisible());
 const inspect=()=>page.evaluate(()=>{
  const b=document.querySelector('#labArtboard'),s=document.querySelector('.lm-lab-stage'),r=b.getBoundingClientRect(),stage=s.getBoundingClientRect();
  const filter=getComputedStyle(document.querySelector('#labAmbientPhoto')).filter;
  return {coverage:Math.max(r.width/stage.width,r.height/stage.height),logical:[b.offsetWidth,b.offsetHeight],
   filter,radius:Number(filter.match(/blur\(([\d.]+)px\)/)?.[1]||0),effect:b.dataset.photoEffect,
   strength:Number(getComputedStyle(b).getPropertyValue('--lab-glass-strength')),
   contrast:window.LabProductionBridge.snapshot().state.photoContrast,
   state:window.LabProductionBridge.snapshot().state};
 });
 await page.locator('[data-lab-choice=photoEffect][data-value=blur]').click();
 const initial=await inspect();assert(Math.abs(initial.coverage-.9)<.005);assert.deepEqual(initial.logical,[1000,707]);
 const slider=page.locator('#labPhotoBlur');await slider.focus();await slider.press('Home');
 const zero=await inspect();assert.equal(zero.radius,0);
 await slider.press('End');const strong=await inspect();assert(strong.radius>initial.radius*1.9);
 assert.equal(strong.contrast,initial.contrast,'Blur must not change the reading veil');
 await page.screenshot({path:output+'/desfoque-editor.png'});
 await page.locator('[data-lab-choice=photoEffect][data-value=glass]').click();
 const reflection=page.locator('#labPhotoGlass');await reflection.focus();await reflection.press('Home');
 const noReflection=await inspect();assert.equal(noReflection.strength,0);
 await reflection.press('End');
 const glass=await inspect();assert.equal(glass.effect,'glass');assert.equal(glass.strength,1);
 assert.equal(glass.radius,noReflection.radius,'Reflection must not change blur');
 assert(glass.radius>0&&glass.radius<strong.radius);assert(glass.filter.includes('saturate(1.16)'));
 await page.locator('#labPrecision-photoBlur').fill('40');
 await page.locator('#labPrecision-photoBlur').press('Enter');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.locator('[data-lab-choice=photoEffect][data-value=glass]').getAttribute('aria-pressed'),'true');
 const preview=await inspect();
 await page.screenshot({path:output+'/vidro-editor.png'});
 const scene=await page.evaluate(()=>window.LabRenderer.capture({edge:1920,ask:false}));
 assert.equal(scene.photoVisual.filter,preview.filter);assert.equal(scene.photoVisual.glassStrength,1);
 const backdrop=scene.items.find(item=>item.layer==='background'&&item.kind==='image');
 assert(backdrop?.source.startsWith('data:image/png;base64,'));
 await writeFile(output+'/vidro-render.png',Buffer.from(backdrop.source.split(',')[1],'base64'));
 const screenshot=await page.locator('#labArtboard').screenshot();
 const meanRGB=await page.evaluate(async images=>{
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=226;
  const context=canvas.getContext('2d'),pixels=[];
  for(const value of images){const image=new Image();image.src=value;await image.decode();context.drawImage(image,0,0,320,226);pixels.push(context.getImageData(0,0,320,226).data);}
  let difference=0,count=0;
  for(let y=34;y<180;y++)for(let x=282;x<307;x++){const at=(y*320+x)*4;for(let c=0;c<3;c++){difference+=Math.abs(pixels[0][at+c]-pixels[1][at+c]);count++;}}
  return difference/count;
 },['data:image/png;base64,'+screenshot.toString('base64'),backdrop.source]);
 assert(meanRGB<8,'The exported glass background must match the enlarged editor: '+meanRGB);
 const project=await page.evaluate(()=>window.LabPages.create());
 assert.equal(project.pages[0].composition.pages[0].media.photoEffect,'glass');
 assert.equal(project.pages[0].composition.pages[0].media.photoBlurPercent,40);
 assert.equal(project.pages[0].composition.pages[0].media.photoGlassPercent,100);
 await page.reload();await page.waitForFunction(()=>window.LabPages&&window.LabRenderer);
 assert.equal((await inspect()).state.photoEffect,'glass');assert.equal((await inspect()).state.photoBlur,40);
 await page.locator('#labEnableSections').evaluate(button=>button.scrollIntoView());
 if(!await page.locator('#labEnableSections').isVisible())await page.locator('[data-workspace-view=pages]').click();
 await page.locator('#labEnableSections').click();
 const sectionProject=await page.evaluate(()=>window.LabPages.create());
 assert.equal(sectionProject.sections[0].background.photoEffect,'glass');
 assert.equal(sectionProject.sections[0].background.photoBlurPercent,40);
 await page.locator('#labOpenDelivery').click();await page.locator('[data-delivery-format=html]').click();
 const pending=page.waitForEvent('download',{timeout:120000});await page.locator('#labExportHtml').click();
 const download=await pending;const exported=await download.path();assert.equal(await download.failure(),null);
 await download.saveAs(output+'/vidro-secoes.html');
 const viewer=await browser.newPage({viewport:{width:1440,height:900}});await viewer.goto(pathToFileURL(path.resolve(output+'/vidro-secoes.html')).href);
 const web=await viewer.locator('.section-backdrop').evaluate(element=>({filter:getComputedStyle(element.querySelector('img')).filter,glass:getComputedStyle(element.querySelector('.photo-glass')).opacity}));
 assert(web.filter.includes('saturate(1.16)'));assert.equal(web.glass,'1');await viewer.close();
 let mp4=null;
 if(process.env.COMPOSITION_BROWSER!=='webkit'){
  await page.locator('[data-delivery-format=mp4]').click();
  await page.locator('#labVideoScope').selectOption('current');await page.locator('#labVideoSeconds').fill('2');await page.locator('#labVideoQuality').selectOption('hd');await page.locator('#labVideoText').uncheck();
  const pendingVideo=page.waitForEvent('download',{timeout:180000});await page.locator('#labExportMp4').click();
  const videoDownload=await pendingVideo;await videoDownload.saveAs(output+'/vidro.mp4');assert.equal(await videoDownload.failure(),null);
  const bytes=await readFile(output+'/vidro.mp4');
  await page.route('**/__photo_effect_proof.mp4',route=>route.fulfill({contentType:'video/mp4',body:bytes}));
  mp4=await page.evaluate(async ({url,reference})=>{
   const video=document.createElement('video');video.muted=true;video.src=url;
   await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('Video decode failed'));});
   video.currentTime=1;await new Promise(resolve=>video.onseeked=resolve);
   const image=new Image();image.src=reference;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=226;const ctx=canvas.getContext('2d');
   ctx.drawImage(image,0,0,320,226);const a=ctx.getImageData(0,0,320,226).data;
   ctx.drawImage(video,0,0,320,226);const b=ctx.getImageData(0,0,320,226).data;
   let delta=0,count=0;for(let y=34;y<180;y++)for(let x=282;x<307;x++){const at=(y*320+x)*4;for(let c=0;c<3;c++){delta+=Math.abs(a[at+c]-b[at+c]);count++;}}
   const result={width:video.videoWidth,height:video.videoHeight,duration:video.duration,meanRGB:delta/count};video.removeAttribute('src');video.load();return result;
  },{url:new URL('/__photo_effect_proof.mp4',origin).href,reference:backdrop.source});
  assert(Math.abs(mp4.duration-2)<.1);assert(mp4.meanRGB<8,'MP4 must preserve the selected glass treatment: '+JSON.stringify(mp4));
 }
 proof.push({zero:zero.radius,blur50:initial.radius,blur100:strong.radius,glass100:glass.radius,workspaceCoverage:initial.coverage,previewExportMeanRGB:meanRGB,projectReopened:true,sectionShared:true,html:web,mp4});
 assert.deepEqual(errors,[]);await writeFile(output+'/report.json',JSON.stringify({status:'passed',proof,errors},null,2));
 console.log(JSON.stringify({status:'passed',proof}));
}finally{await browser.close();}
