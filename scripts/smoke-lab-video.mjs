import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const output=path.resolve('production-proof');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
const errors=[],report={exports:[],fidelity:[]};let downloads=0;
page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
page.on('download',()=>downloads++);
const settle=()=>page.waitForTimeout(300);
async function state(patch){await page.evaluate(patch=>{const b=window.LabProductionBridge;b.restore({...b.snapshot().state,...patch});},patch);await settle();}
async function review(){
  if(!await page.locator('#labDeliveryDialog').isVisible())await page.locator('#labOpenDelivery').click();
  await page.locator('[data-delivery-format=mp4]').click();
  await page.locator('#labVideoSeconds').fill('2');await page.locator('#labVideoQuality').selectOption('hd');
}
async function exportVideo(file,seconds,width,height){
  assert.equal(await page.locator('#labArtboard').getAttribute('data-state'),'ok',await page.locator('#labStatus').textContent());
  const waiting=page.waitForEvent('download',{timeout:180000});
  await page.locator('#labExportMp4').click();const download=await waiting;
  const target=path.join(output,file);await download.saveAs(target);assert.equal(await download.failure(),null);
  await page.waitForFunction(()=>document.querySelector('#labDeliveryDialog').getAttribute('aria-busy')==='false');
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',target],{encoding:'utf8'}));
  assert.equal(probe.streams.length,1,'No audio track');
  assert.equal(probe.streams[0].codec_name,'h264');assert.equal(probe.streams[0].width,width);assert.equal(probe.streams[0].height,height);
  assert.equal(probe.streams[0].avg_frame_rate,'30/1');assert.ok(Math.abs(Number(probe.format.duration)-seconds)<.08);
  const frames=execFileSync('ffmpeg',['-v','error','-i',target,'-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(l=>l&&!l.startsWith('#'));
  assert.equal(frames.length,seconds*30);assert.ok(new Set(frames.map(l=>l.split(',').at(-1))).size>10,'Animation must contain different decoded frames');
  report.exports.push({file,width,height,seconds,codec:probe.streams[0].codec_name,bytes:Number(probe.format.size)});
  return target;
}
try{
  await page.goto((process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html')+'?studio=1#laboratorio',{waitUntil:'networkidle'});
  await page.locator('#labPages[data-ready=true]').waitFor({state:'attached'});
  await state({title:'MATTAR EM MOVIMENTO',titleFonts:[null,'perpetua',null],body:'Composição, motion e vídeo.',bodyMode:'visivel',mContent:'off',background:'color',marker:'none',guides:'nenhuma',titleScale:70,textWidth:100,mPresentation:'elemento'});
  await page.evaluate(()=>{
    const capture=window.LabRenderer.capture;
    window.LabRenderer.capture=async options=>{const scene=await capture(options);if(options?.live)window.videoCapturedScene=scene;return scene;};
  });
  const original=await page.evaluate(()=>window.LabPages.create());
  for(const [format,width,height]of [['horizontal',1280,720],['vertical',720,1280],['quadrado',720,720],['editorial',1280,906]]){
    await state({format});await review();
    const before=await page.evaluate(()=>window.LabPages.create());
    const target=await exportVideo('video-'+format+'.mp4',2,width,height);
    assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),before,'Export preserves editable project');
    // Compare the settled final video frame to the same native static scene.
    const png=target+'.png';execFileSync('ffmpeg',['-v','error','-y','-sseof','-0.034','-i',target,'-frames:v','1',png]);
    const reference=await readFile(png);
    const difference=await page.evaluate(async({bytes,width,height})=>{
      const {sceneCanvas}=await import('/lab-scene.mjs');
      const scene=await window.LabRenderer.capture({edge:1920,ask:false});
      const canvas=await sceneCanvas(scene,1280,{width,height}),ctx=canvas.getContext('2d');
      const nativePng=canvas.toDataURL('image/png').split(',')[1];
      const a=ctx.getImageData(0,0,width,height).data;
      const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
      ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bitmap,0,0);bitmap.close();const b=ctx.getImageData(0,0,width,height).data;
      let delta=0;for(let i=0;i<a.length;i+=4)delta+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
      const texts=items=>items.flatMap(op=>op.kind==='group'?texts(op.items):op.kind==='text'?[op]:[]);
      return {mae:delta/(width*height*3),nativePng,firstNative:[...a.slice(0,4)],firstVideo:[...b.slice(0,4)],
        captured:{width:window.videoCapturedScene.width,height:window.videoCapturedScene.height,texts:texts(window.videoCapturedScene.items)},
        restored:{width:scene.width,height:scene.height,texts:texts(scene.items)}};
    },{bytes:[...reference],width,height});
    await writeFile(target+'.native.png',Buffer.from(difference.nativePng,'base64'));
    delete difference.nativePng;
    assert.deepEqual(difference.captured,difference.restored,'Native text geometry is preserved');
    delete difference.captured;delete difference.restored;
    report.fidelity.push({format,...difference});console.log(JSON.stringify({format,...difference}));
    await page.locator('#labDeliveryBack').click();
  }
  await page.evaluate(doc=>window.LabPages.load(doc),original);await settle();
  await page.locator('[data-workspace-view=motion]').click();await page.locator('#labMotionOpen').click();
  await page.locator('[data-motion-asset="m-form"]').click();await settle();
  const bytes=await(await page.request.get(new URL('/motion/videos/m-form.mp4',page.url()).href)).body();
  await page.route('**/api/acervo/public-media?project=videoproject123&id=videobackdrop123',route=>route.fulfill({body:bytes,contentType:'video/mp4'}));
  await state({background:'photo'});
  const withMedia=await page.evaluate(()=>window.LabPages.create());
  withMedia.pages[0].backgroundVideo={id:'bg-video',provider:'public',projectId:'videoproject123',fileId:'videobackdrop123',name:'Vídeo de fundo.mp4',mimeType:'video/mp4',frameSeconds:0};
  await page.evaluate(doc=>window.LabPages.load(doc),withMedia);await settle();
  await page.locator('[data-workspace-view=pages]').click();await page.locator('#labPageDuplicate').click();await settle();
  const before=await page.evaluate(()=>window.LabPages.create());
  await review();await page.locator('#labVideoScope').selectOption('all');
  await page.locator('#labVideoText').uncheck();
  await page.screenshot({path:path.join(output,'video-delivery-desktop.png')});
  await exportVideo('video-sequence-motion-background.mp4',4,1280,720);
  assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),before);
  assert.equal((await page.evaluate(()=>window.LabPages.lastExport)).pages.length,2);
  const count=downloads;
  await page.locator('#labVideoSeconds').fill('30');await page.locator('#labExportMp4').click();
  await page.locator('#labVideoCancel').waitFor({state:'visible'});await page.locator('#labVideoCancel').click();
  await page.waitForFunction(()=>document.querySelector('#labDeliveryDialog').getAttribute('aria-busy')==='false');
  assert.match(await page.locator('#labDeliveryStatus').textContent(),/cancelado/);assert.equal(downloads,count);
  assert.deepEqual(await page.evaluate(()=>window.LabPages.create()),before);
  await page.locator('#labDeliveryBack').click();await state({format:'vertical'});await review();
  await page.locator('#labVideoScope').selectOption('all');await page.locator('#labExportMp4').click();await settle();
  assert.match(await page.locator('#labDeliveryStatus').textContent(),/mesmo formato/);assert.equal(downloads,count);
  await page.locator('#labVideoScope').selectOption('current');
  await page.evaluate(()=>{window.savedVideoEncoder=window.VideoEncoder;window.VideoEncoder=undefined;});
  await page.locator('#labExportMp4').click();await page.waitForFunction(()=>document.querySelector('#labDeliveryDialog').getAttribute('aria-busy')==='false');
  assert.match(await page.locator('#labDeliveryStatus').textContent(),/Chrome ou Edge/);assert.equal(downloads,count);
  await page.evaluate(()=>{window.VideoEncoder=window.savedVideoEncoder;});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'video-delivery-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);report.cancelled=true;report.mixedFormatsRefused=true;report.unsupportedCodecHandled=true;
  await writeFile(path.join(output,'lab-video-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  for(const item of report.fidelity)assert.ok(item.mae<4,`Native/video final frame differs (${item.format}): ${item.mae}`);
}finally{await browser.close();}
