import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const url=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const output=path.resolve('production-proof');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),report={url,steps:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
const pause=()=>page.waitForTimeout(170);
async function surface(){await page.locator('[data-workspace-view=pages]').click();}
async function state(patch){
  await page.evaluate(patch=>{const b=window.LabProductionBridge;if(patch.signature)window.LabPages.setSignature(patch.signature);b.restore({...b.snapshot().state,...patch});},patch);await pause();
}
async function downloadButton(id,file){
  const result=page.waitForEvent('download',{timeout:180000});
  if(!await page.locator('#labDeliveryDialog').isVisible())await page.locator('#labOpenDelivery').click();
  await page.locator('[data-delivery-format="'+(id==='labExportPdf'?'pdf':'html')+'"]').click();
  assert.equal(await page.locator('#labDeliveryPages li').count(),4);
  await page.screenshot({path:path.join(output,'delivery-'+(id==='labExportPdf'?'pdf':'html')+'-desktop.png')});
  await page.locator('#'+id).click();
  const download=await result;await download.saveAs(path.join(output,file));assert.equal(await download.failure(),null);
}
async function reference(index){
  const result=await page.evaluate(async()=>{
    const output=await window.LabExportPNG.capture();if(!output)throw Error('PNG cancelado');
    const data=new Uint8Array(await output.blob.arrayBuffer());let text='';
    for(let n=0;n<data.length;n+=32768)text+=String.fromCharCode(...data.subarray(n,n+32768));
    return btoa(text);
  });await writeFile(path.join(output,`reference-${index+1}.png`),Buffer.from(result,'base64'));
}
try{
  await page.goto(url+'?studio=1#laboratorio',{waitUntil:'networkidle'});
  await page.waitForSelector('#labPages[data-ready="true"]',{state:'attached'});
  if(!await page.locator('body').evaluate(body=>body.classList.contains('lm-studio-open')))await page.locator('#labStudioToggle').click();
  await surface();assert.equal(await page.locator('#labPageSelect option').count(),1);
  await page.locator('.lab-project-settings>summary').click();
  await page.locator('#labSequenceName').fill('MATTAR </script><script>window.injected=true</script>');
  await page.locator('#labSequenceName').press('Tab');
  await state({title:'PÁGINA UM',body:'Uma sequência editável.',bodyMode:'visivel',mContent:'off',background:'color',guides:'nenhuma'});
  await page.locator('#labPageName').fill('Abertura');await page.locator('#labPageName').press('Tab');
  await page.locator('[data-workspace-view=motion]').click();
  assert.equal(await page.locator('#labMotionOpen').isVisible(),true,'Motion library must have its own workspace');
  await page.locator('#labMotionOpen').click();
  assert.equal(await page.locator('#labMotionLibraryItems [data-motion-asset]').count(),8);
  await page.locator('[data-motion-asset="m-form"]').click();
  assert.equal(await page.locator('#labPageMotions video').count(),1);
  await page.locator('#labMotionFrame').fill('0.6');
  assert.equal(await page.locator('#labMotionPreview').textContent(),'VER MOVIMENTO');
  await page.screenshot({path:path.join(output,'controls-motion-desktop.png')});
  await page.locator('[data-workspace-view=edit]').click();await page.locator('button[data-mobile-module=superficie]').click();
  assert.ok(await page.locator('#labFormatTitle').isVisible());
  await page.screenshot({path:path.join(output,'controls-edit-desktop.png')});
  report.steps.push('Motion catalog, insertion and static frame');

  await surface();await page.locator('#labPageAdd').click();await pause();
  await state({format:'vertical',title:'PÁGINA\nDOIS',body:'Outra página da apresentação.',bodyMode:'visivel',
    background:'photo',mContent:'off',marker:'none',titleScale:90,textWidth:80});
  await page.locator('#labPageName').fill('Fotografia');await page.locator('#labPageName').press('Tab');
  await page.locator('#labPageAdd').click();await pause();
  const signature=await page.evaluate(()=>window.LabProductionBridge.snapshot().state.signature);
  signature.slots.tl.text='PÁGINA TRÊS';
  await state({format:'quadrado',title:'',body:'',bodyMode:'oculto',background:'color',mContent:'solid',
    color:'beige',marker:'none',signature,mScale:50,mCaption:'VETOR OFICIAL'});
  await page.locator('#labPageName').fill('Vetor oficial');await page.locator('#labPageName').press('Tab');
  await page.locator('#labPageAdd').click();await pause();
  signature.slots.tl.text='LABMATTAR / 2026';
  await state({format:'editorial',title:'PÁGINA\nQUATRO',body:'Marcadores e fotografia.',bodyMode:'visivel',
    background:'photo',mContent:'off',marker:'both',markerFocus:'sharp',titleScale:90,textWidth:80,signature});
  await page.locator('#labPageName').fill('Marcadores');await page.locator('#labPageName').press('Tab');
  assert.equal(await page.locator('#labPageSelect option').count(),4);

  await page.locator('#labPageDuplicate').click();await pause();
  assert.equal(await page.locator('#labPageSelect option').count(),5);
  await page.locator('#labPageDelete').click();await pause();
  assert.equal(await page.locator('#labPageSelect option').count(),4);
  await page.locator('#labPageEarlier').click();await page.locator('#labPageLater').click();
  const authored=await page.evaluate(()=>window.LabPages.create());
  assert.deepEqual(authored.pages.map(page=>page.name),['Abertura','Fotografia','Vetor oficial','Marcadores']);
  assert.deepEqual(authored.pages.map(page=>page.composition.pages[0].surface.format),['horizontal','vertical','quadrado','editorial']);
  await page.evaluate(async document=>{await window.LabPages.load(document);},authored);await pause();
  assert.equal(await page.locator('#labTitleInput').inputValue(),'PÁGINA UM','Import must not replace the first page with the previous active page');
  assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),authored,'Sequence round-trip');
  const corrupted=structuredClone(authored);corrupted.pages[1].composition.assets[0].uri='/identidade/vaso_03.svg';
  const refused=await page.evaluate(async document=>{try{await window.LabPages.load(document);return false;}catch{return true;}},corrupted);
  assert.ok(refused);assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),authored);
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#labPages[data-ready="true"]',{state:'attached'});
  assert.equal(await page.locator('#labPageSelect option').count(),4,'Local sequence survives reload');
  await surface();
  for(let index=0;index<4;index++){
    await page.locator('[data-page-index="'+index+'"]').click();await pause();
    assert.equal(await page.locator('#labArtboard').getAttribute('data-state'),'ok',`Page ${index+1} must pass layout preflight`);
    await page.locator('#labOpenDelivery').click();
    await page.locator('#labExportSize').selectOption('1920');await page.locator('#labDeliveryBack').click();
    if(index===2){
      assert.ok(await page.locator('#labMask').isVisible(),'Solid M must remain visible over a color background');
      const vector=await page.evaluate(async()=>{const scene=await window.LabRenderer.capture({ask:false});return scene.items.some(item=>item.kind==='vector'&&item.paths.length&&item.box.w>0);});
      assert.ok(vector,'The official M must be present as a vector in the scene');
    }
    await reference(index);
  }
  await page.screenshot({path:path.join(output,'controls-pages-desktop.png')});
  const before=await page.evaluate(()=>window.LabProductionBridge.snapshot().state);
  await writeFile(path.join(output,'expected.json'),JSON.stringify(await page.evaluate(()=>window.LabPages.create()),null,2));
  await downloadButton('labExportPdf','labmattar-apresentacao.pdf');
  assert.deepEqual(await page.evaluate(()=>window.LabProductionBridge.snapshot().state),before,'PDF export restores the editable page');
  await downloadButton('labExportHtml','labmattar-site.html');
  assert.deepEqual(await page.evaluate(()=>window.LabProductionBridge.snapshot().state),before,'HTML export restores the editable page');
  await page.locator('[data-delivery-format=png]').click();
  assert.equal(await page.locator('#labDeliveryPages li').count(),1,'PNG scope must be the selected page');
  assert.ok((await page.locator('#labDeliveryScope').textContent()).includes('página 4'));
  await page.locator('#labDeliveryBack').click();
  report.steps.push('Four formats, duplicate, delete, order, reversible JSON and exports');

  const htmlPage=await context.newPage();
  const network=[];await htmlPage.route(/^https?:\/\//,route=>{network.push(route.request().url());route.abort();});
  await htmlPage.goto(pathToFileURL(path.join(output,'labmattar-site.html')).href,{waitUntil:'networkidle'});
  await htmlPage.evaluate(()=>document.fonts.ready);
  assert.equal(await htmlPage.locator('.export-page').count(),4);
  assert.equal(await htmlPage.locator('svg text').count()>5,true,'Web pages retain actual text and vectors');
  assert.equal(await htmlPage.locator('video[data-motion-ink][muted][loop]:not([controls])').count(),1);
  assert.equal(await htmlPage.locator('video').evaluate(v=>v.paused&&!v.autoplay),true);
  await htmlPage.locator('.motion-ink-toggle').click();
  await htmlPage.waitForFunction(()=>document.querySelector('video').currentTime>0.1);
  assert.equal(await htmlPage.evaluate(()=>window.injected),undefined,'Authored HTML-like text cannot execute');
  assert.deepEqual(await htmlPage.locator('#project').evaluate(node=>JSON.parse(node.textContent)),await page.evaluate(()=>window.LabPages.create()));
  await htmlPage.locator('#next').click();await htmlPage.waitForTimeout(350);
  assert.equal(await htmlPage.locator('#page-count').textContent(),'2 / 4');
  assert.deepEqual(network,[],'Standalone web document must not depend on the editor, CDN or private account');
  await htmlPage.screenshot({path:path.join(output,'web-presentation.png')});await htmlPage.close();

  await page.setViewportSize({width:390,height:844});await surface();await pause();
  assert.equal(await page.locator('#labPageList button').count(),4);
  assert.equal(await page.locator('#labPageList').isVisible(),true);
  assert.equal(await page.locator('#labPageAdd').isVisible(),true);
  assert.equal(await page.locator('#labOpenDelivery').isVisible(),true);
  await page.locator('#labReviewDelivery').click();await page.locator('[data-delivery-format=pdf]').click();
  assert.equal(await page.locator('#labDeliveryDialog').isVisible(),true);
  assert.ok(await page.locator('#labExportPdf').isVisible());
  await page.screenshot({path:path.join(output,'delivery-mobile.png')});await page.locator('#labDeliveryBack').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:path.join(output,'editor-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  execFileSync('python3',['scripts/verify-lab-pdf.py',output],{stdio:'inherit'});
  report.pdf=JSON.parse(await readFile(path.join(output,'pdf-report.json'),'utf8'));
  report.fidelity=[];
  for(let index=0;index<4;index++){
    const reference=await readFile(path.join(output,`reference-${index+1}.png`)),actual=await readFile(path.join(output,`pdf-page-${index+1}.png`));
    const diff=await page.evaluate(async images=>{
      const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
      const ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=[];
      for(const source of images){const bitmap=await createImageBitmap(await (await fetch('data:image/png;base64,'+source)).blob());ctx.clearRect(0,0,160,160);ctx.drawImage(bitmap,0,0,160,160);pixels.push(ctx.getImageData(0,0,160,160).data);bitmap.close();}
      let sum=0;for(let n=0;n<pixels[0].length;n+=4)for(let c=0;c<3;c++)sum+=Math.abs(pixels[0][n+c]-pixels[1][n+c]);
      return sum/(160*160*3);
    },[reference.toString('base64'),actual.toString('base64')]);
    assert.ok(diff<18,`PDF page ${index+1} diverges from the PNG renderer: ${diff}`);report.fidelity.push({page:index+1,meanAbsoluteDifference:diff});
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
