import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createPage,createSection,sectionState,sequenceDocument} from '../public/lab-sequence.mjs';
const url=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const name=process.env.COMPOSITION_BROWSER==='webkit'?'webkit':'chromium',dir=path.resolve('fidelity-proof',name);
await mkdir(dir,{recursive:true});
const fixture=path.join(dir,'reference-video.mp4');
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30:duration=3','-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an',fixture]);
const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[],proof=[];
page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
const settled=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
const getProject=()=>page.evaluate(()=>window.LabPages.create());
async function download(type,file){
  const pending=page.waitForEvent('download',{timeout:180000});
  if(!await page.locator('#labDeliveryDialog').isVisible())await page.locator('#labOpenDelivery').click();
  await page.locator('[data-delivery-format="'+type+'"]').click();
  if(type==='mp4'){await page.locator('#labVideoScope').selectOption('current');await page.locator('#labVideoSeconds').fill('2');await page.locator('#labVideoQuality').selectOption('hd');await page.locator('#labVideoText').uncheck();}
  else await page.locator('#labExportSize').selectOption('1920');
  await page.locator('#'+({png:'labExportPng',pdf:'labExportPdf',html:'labExportHtml',mp4:'labExportMp4'})[type]).click();
  const item=await pending;await item.saveAs(path.join(dir,file));assert.equal(await item.failure(),null);
  await page.locator('#labDeliveryBack').click();return path.join(dir,file);
}
async function rgbDifference(a,b){return page.evaluate(async images=>{
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d'),pixels=[];
  for(const image of images){const bitmap=await createImageBitmap(new Blob([new Uint8Array(image)]));ctx.clearRect(0,0,96,96);ctx.drawImage(bitmap,0,0,96,96);bitmap.close();pixels.push(ctx.getImageData(0,0,96,96).data);}
  let delta=0;for(let i=0;i<pixels[0].length;i+=4)for(let c=0;c<3;c++)delta+=Math.abs(pixels[0][i+c]-pixels[1][i+c]);return delta/(96*96*3);
},[[...a],[...b]]);}
try{
  await page.goto(url+'?studio=1',{waitUntil:'networkidle'});await page.locator('#labPages[data-ready=true]').waitFor({state:'attached'});
  await page.locator('#labPages[data-motion-catalog=ready]').waitFor({state:'attached'});
  const snapshot=await page.evaluate(()=>window.LabProductionBridge.snapshot());
  const signature={preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(c=>[c,{kind:'none',symbol:'M.svg',text:''}]))};
  const base={...snapshot.state,signature,title:'FORMA',type:'univers',titleFonts:[],body:'',bodyMode:'oculto',textWidth:100,titleScale:70,kicker:'',footerLeft:'',footerRight:'',marker:'none',guides:'nenhuma',background:'color',mContent:'solid',mPresentation:'elemento',mCaption:'',mPositionY:50};
  const makePage=(id,state)=>createPage({id,name:id,state,photoCatalog:snapshot.photoCatalog,maxEdge:1920});
  const scales=[['horizontal',74],['vertical',95],['quadrado',95],['editorial',94],['horizontal',1],['editorial',140],['vertical',15.5]];
  const scaleProject=sequenceDocument('Escalas preservadas',scales.map(([format,mScale],i)=>makePage('scale-'+i,{...base,format,mScale})),null,signature);
  await page.evaluate(doc=>window.LabPages.load(doc),scaleProject);await page.locator('[data-workspace-view=pages]').click();
  for(let i=0;i<scales.length;i++){
    await page.locator('#labPageList [data-page-index="'+i+'"]').click();await settled();
    const state=await page.evaluate(()=>({scale:window.LabProductionBridge.snapshot().state.mScale,slider:Number(document.querySelector('#labMScale').value),number:Number(document.querySelector('#labPrecision-mScale').value),max:document.querySelector('#labMScale').max,label:document.querySelector('#labMScale').nextElementSibling.lastElementChild.textContent}));
    assert.equal(state.scale,scales[i][1]);assert.equal(state.slider,state.scale);assert.equal(state.number,state.scale);assert.equal(state.label,state.max+'%');
  }
  assert.deepEqual(await getProject(),scaleProject);await page.reload({waitUntil:'networkidle'});await page.locator('#labPages[data-ready=true]').waitFor({state:'attached'});assert.deepEqual(await getProject(),scaleProject);
  proof.push({case:'m-scale',formats:4,pages:7,legacy:[1,140,15.5],projectUnchangedAfterReload:true});

  // Legenda isolada determina o véu da seção, inclusive nas páginas sem texto.
  const captionPixels=[];let captionProject;
  for(const intensity of [0,20,40,60,80]){
    const state={...base,title:'',background:'photo',mContent:'photo',mScale:45,mCaption:'LEGENDA DO ELEMENTO',photoContrast:intensity};
    const section=createSection('intro','Introdução',state,snapshot.photoCatalog);
    const pages=[state,{...state,mCaption:''}].map((s,i)=>({...makePage('caption-'+i,sectionState(s,section)),sectionId:section.id}));
    captionProject=sequenceDocument('Legenda e leitura',pages,[section],signature);
    await page.evaluate(doc=>window.LabPages.load(doc),captionProject);await settled();
    const reading=await page.evaluate(async()=>{
      const {sceneCanvas}=await import('/lab-scene.mjs'),scene=await window.LabRenderer.capture({edge:1920,ask:false}),canvas=await sceneCanvas(scene,320);
      return {hasText:scene.sectionBackground.hasText,opacity:getComputedStyle(document.querySelector('.lm-lab-photo-contrast')).opacity,rgba:[...canvas.getContext('2d').getImageData(5,5,1,1).data]};
    });assert(reading.hasText);assert.equal(reading.opacity,'1');captionPixels.push({intensity,...reading});
    if(intensity===40){const htmlFile=await download('html','caption-section.html');const viewer=await context.newPage();await viewer.goto(pathToFileURL(htmlFile).href);const veil=await viewer.locator('.section-backdrop .veil').evaluate(el=>getComputedStyle(el).backgroundColor);assert.match(veil,/0\.4\)/);await viewer.close();}
    await page.locator('[data-workspace-view=pages]').click();await page.locator('#labPageList [data-page-index="1"]').click();await settled();assert.equal(await page.locator('#labArtboard').getAttribute('data-section-photo-text'),'true');
  }
  for(const sample of captionPixels.slice(1))for(let c=0;c<3;c++)assert(Math.abs(sample.rgba[c]-captionPixels[0].rgba[c]*(1-sample.intensity/100))<3);
  proof.push({case:'caption-treatment',intensities:captionPixels,htmlVeil:.4});

  // Vídeo com mudança real de quadros; a mídia do teste usa o proxy permitido.
  const videoBytes=await readFile(fixture);await page.route('**/api/acervo/public-media?project=fidelity123&id=video12345',route=>route.fulfill({body:videoBytes,contentType:'video/mp4'}));
  const videoState={...base,format:'quadrado',title:'',mContent:'off',background:'photo',focusX:0,focusY:100,photoContrast:40};
  const videoPage=makePage('video',videoState);videoPage.backgroundVideo={id:'video-reference',provider:'public',projectId:'fidelity123',fileId:'video12345',name:'Referência de vídeo',mimeType:'video/mp4',frameSeconds:0};
  await page.evaluate(doc=>window.LabPages.load(doc),sequenceDocument('Quadro de referência',[videoPage],null,signature));await page.locator('[data-workspace-view=edit]').click();await page.locator('[data-mobile-module=fundo]').click();
  await page.waitForFunction(()=>document.querySelector('#labAmbientVideo')?.readyState>=2&&!document.querySelector('#labBackgroundFrame').disabled);
  await page.locator('#labBackgroundFrame').fill('1.25');await page.locator('#labBackgroundFrame').press('Tab');
  await page.waitForFunction(()=>[...document.querySelectorAll('video.lm-lab-background-video')].every(v=>v.paused&&!v.seeking&&Math.abs(v.currentTime-1.25)<.001));
  const chosen=await getProject();assert.equal(chosen.pages[0].backgroundVideo.frameSeconds,1.25);
  const firstScene=await page.evaluate(async()=>{const scene=await window.LabRenderer.capture({edge:1920,ask:false});const bg=scene.items.find(op=>op.layer==='video-bg-base');return {frame:scene.backgroundFrameSeconds,focus:scene.videoVisual,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bg.source)))].map(x=>x.toString(16).padStart(2,'0')).join('')};});
  assert.equal(firstScene.frame,1.25);assert.equal(firstScene.focus.focusX,0);assert.equal(firstScene.focus.focusY,100);
  await page.evaluate(async()=>{const {seekStillMedia}=await import('/lab-video-export.mjs');await seekStillMedia([...document.querySelectorAll('video.lm-lab-background-video')],2.2);});
  const secondScene=await page.evaluate(async()=>{const scene=await window.LabRenderer.capture({edge:1920,ask:false});const bg=scene.items.find(op=>op.layer==='video-bg-base');return {frame:scene.backgroundFrameSeconds,time:document.querySelector('#labAmbientVideo').currentTime,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bg.source)))].map(x=>x.toString(16).padStart(2,'0')).join('')};});
  assert.equal(secondScene.hash,firstScene.hash);assert(Math.abs(secondScene.time-2.2)<.001);assert.deepEqual(await getProject(),chosen);
  await page.screenshot({path:path.join(dir,'video-frame-controls.png')});
  const png=await download('png','selected-frame.png'),pdf=await download('pdf','selected-frame.pdf');
  execFileSync('pdftoppm',['-scale-to','1920','-singlefile','-png',pdf,path.join(dir,'selected-frame-pdf')]);
  const pdfDifference=await rgbDifference(await readFile(png),await readFile(path.join(dir,'selected-frame-pdf.png')));assert(pdfDifference<3,'PNG/PDF divergence: '+pdfDifference);
  const htmlFile=await download('html','selected-frame.html'),html=await readFile(htmlFile,'utf8');assert(html.includes('object-position:0% 100%'));
  const viewer=await context.newPage();await viewer.goto(pathToFileURL(htmlFile).href);const poster=await viewer.locator('.print-scene image').first().getAttribute('href');assert(poster?.startsWith('data:image/png;base64,'));
  const posterDifference=await rgbDifference(await readFile(png),Buffer.from(poster.split(',')[1],'base64'));assert(posterDifference<3);await viewer.close();
  assert.deepEqual(await getProject(),chosen);
  const mp4Supported=await page.evaluate(async()=>{try{const {videoConfig}=await import('/vendor/lab-video.js');await videoConfig(720,720);return true;}catch{return false;}});
  if(name==='chromium')assert(mp4Supported,'O ambiente Chromium de referência precisa oferecer H.264.');
  let mp4Frames=0;
  if(mp4Supported){
    const mp4=await download('mp4','moving-background.mp4');const hashes=execFileSync('ffmpeg',['-v','error','-i',mp4,'-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(line=>line&&!line.startsWith('#'));
    assert.equal(hashes.length,60);assert(new Set(hashes.map(line=>line.split(',').at(-1))).size>10);mp4Frames=hashes.length;
  }else{
    await page.locator('#labOpenDelivery').click();await page.locator('[data-delivery-format=mp4]').click();await page.locator('#labVideoSeconds').fill('2');await page.locator('#labExportMp4').click();
    await page.waitForFunction(()=>document.querySelector('#labDeliveryStatus').textContent.includes('MP4 não concluído'));
    assert.match(await page.locator('#labDeliveryStatus').textContent(),/navegador|dispositivo/);await page.locator('#labDeliveryBack').click();
  }
  assert.deepEqual(await getProject(),chosen);
  await page.evaluate(doc=>window.LabPages.load(doc),chosen);await settled();assert.equal((await getProject()).pages[0].backgroundVideo.frameSeconds,1.25);
  proof.push({case:'background-frame',selectedSeconds:1.25,previewRestoredTo:secondScene.time,pdfDifference,htmlPosterDifference:posterDifference,focus:[0,100],mp4Frames,mp4UnsupportedHandled:!mp4Supported,projectUnchanged:true});
  assert.deepEqual(errors,[]);await writeFile(path.join(dir,'report.json'),JSON.stringify({browser:name,passed:true,proof,errors},null,2));console.log('Fidelidade de escala, legenda, foco e quadros de vídeo validada / '+name);
}catch(error){const status=await page.evaluate(()=>({composition:document.querySelector('#labStatus')?.textContent,pages:document.querySelector('#labPagesStatus')?.textContent,export:document.querySelector('#labExportStatus')?.textContent})).catch(()=>({}));await writeFile(path.join(dir,'failure.json'),JSON.stringify({failure:error.stack,status,proof,errors},null,2));await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});console.error(JSON.stringify({status,proof,errors},null,2));throw error;}
finally{await context.close();await browser.close();}
