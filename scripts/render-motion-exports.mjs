// Reproducible asset build on an isolated CI browser, using the same UI and
// WebCodecs exporter as the Matriz. No local browser/profile is accessed.
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root=process.env.GITHUB_WORKSPACE||process.cwd();
const {motionProjects}=await import(pathToFileURL(path.join(root,'tools/matriz-vetorial/src/motion-catalog.mjs')));
const {fingerprint,rendererFingerprint}=await import(pathToFileURL(path.join(root,'scripts/motion-fingerprint.mjs')));
const rendererHash=await rendererFingerprint();
let existing={};
try{existing=JSON.parse(await readFile(path.join(root,'public/motion/exports.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const output=path.join(root,'motion-render-output');
await mkdir(output,{recursive:true});
const base=process.env.MOTION_URL||'http://127.0.0.1:8768';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const report={exports:[],gallery:[]};
async function download(page,selector,file){
  const [result]=await Promise.all([page.waitForEvent('download',{timeout:300000}),page.locator(selector).click()]);
  await result.saveAs(file);
  const failure=await result.failure();
  assert.equal(failure,null,'Download não concluído: '+file);
}
try{
  for(const entry of motionProjects()){
    if(existing[entry.id]?.projectHash===fingerprint(entry.project)&&existing[entry.id]?.rendererHash===rendererHash){
      report.exports.push({id:entry.id,status:'verified-existing',duration:entry.duration});
      console.log('RENDER_REUSED',entry.id);
      continue;
    }
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{
      console.log('RENDER_START',entry.id,entry.duration.toFixed(2)+'s');
      const response=await page.goto(`${base}/motion/matriz/index.html?roteiro=${entry.id}`,{waitUntil:'networkidle',timeout:60000});
      assert.equal(response.status(),200);
      await page.waitForFunction(()=>{
        const button=document.querySelector('#play');
        return button&&!button.disabled;
      },undefined,{timeout:60000});
      assert.equal(await page.locator('#project-name').inputValue(),entry.project.name);
      const posterTime=entry.cut??entry.duration;
      await page.locator('#time-input').fill(String(posterTime));
      await page.locator('#time-input').press('Tab');
      await page.getByRole('button',{name:'Exportar',exact:true}).click();
      const project=path.join(output,entry.id+'.json');
      const poster=path.join(output,entry.id+'.png');
      const video=path.join(output,entry.id+'.mp4');
      await download(page,'#download-project',project);
      await download(page,'#export-image',poster);
      await page.locator('#export-size').selectOption('1080');
      await page.locator('#export-fps').selectOption('30');
      const encoding=await page.evaluate(async()=>{
        if(typeof VideoEncoder==='undefined')return {supported:false,reason:'WebCodecs indisponível'};
        return await VideoEncoder.isConfigSupported({codec:'avc1.420033',width:1080,height:608,bitrate:10000000,framerate:30,avc:{format:'avc'}});
      });
      assert.ok(encoding.supported,'H.264 não disponível neste ambiente: '+JSON.stringify(encoding));
      await download(page,'#export-mp4',video);
      await page.waitForFunction(()=>document.querySelector('#export-notice')?.textContent.includes('Vídeo concluído'),undefined,{timeout:10000});
      assert.deepEqual(errors,[],entry.id+': erro durante a renderização');
      const registration=execFileSync(process.execPath,[path.join(root,'scripts/register-motion-export.mjs'),entry.id,video,poster,project],{cwd:root,encoding:'utf8'});
      console.log(registration.trim());
      report.exports.push({id:entry.id,status:'verified',duration:entry.duration});
      console.log('RENDER_DONE',entry.id);
    }finally{await page.close();}
  }
  execFileSync(process.execPath,[path.join(root,'scripts/prepare-motion.mjs')],{cwd:root,stdio:'inherit'});
  execFileSync('python3',['design/integrate-areas.py','motion.html'],{cwd:root,stdio:'inherit'});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    try{
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/motion.html',{waitUntil:'networkidle'});
      assert.equal(await page.locator('.motion-card').count(),8);
      assert.equal(await page.locator('.motion-card[data-status="approved"]').count(),3);
      assert.equal(await page.locator('.motion-card video').count(),8);
      assert.equal(await page.locator('video[autoplay]').count(),0);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert.equal(overflow,false,'Galeria com rolagem horizontal');
      const video=page.locator('.motion-card video').first();
      await video.evaluate(async element=>{await element.play();});
      await page.waitForFunction(()=>document.querySelector('video').currentTime>0.1);
      await video.evaluate(element=>element.pause());
      assert.deepEqual(errors,[],'Erro na galeria');
      await page.screenshot({path:path.join(output,`gallery-${viewport.width}.png`),fullPage:true});
      report.gallery.push({width:viewport.width,players:8,approved:3,playback:true});
    }finally{await page.close();}
  }
  console.log('MOTION_EXPORTS_VERIFIED',report.exports.length);
}finally{
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
