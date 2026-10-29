import {chromium} from 'playwright';

const url=process.env.EDITORIAL_URL||'https://labmattar-identidade-previa.vitormoreiran.workers.dev/ambiente-editorial/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));

async function geometry(label,{expectedLayout,fullBleed=false,portrait=false}={}){
  await page.waitForFunction(()=>document.querySelector('#artboard')?.dataset.layout,{timeout:10000});
  await page.waitForTimeout(50);
  const data=await page.evaluate(()=>{
    const art=document.querySelector('#artboard'),stack=document.querySelector('#editorialStack');
    const rect=e=>{const a=e.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom}};
    const a=rect(art),s=rect(stack),v=rect(document.querySelector('#stageViewport'));
    const content=[...stack.querySelectorAll('[data-content-slot]')].filter(n=>!n.hidden&&n.dataset.empty!=='true').map(n=>({role:n.dataset.contentSlot,rect:rect(n),scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,overflowY:getComputedStyle(n).overflowY,font:getComputedStyle(n).fontFamily,text:n.innerText.slice(0,32)}));
    const m=document.querySelector('.masked-photo'),ms=getComputedStyle(m),mr=rect(m);
    return{board:a,stage:v,stack:s,content,m:{rect:mr,display:ms.display,mask:ms.maskImage},overflow:art.dataset.overflow,profile:art.dataset.profile,layout:art.dataset.layout,treatment:art.dataset.treatment,hasMedia:art.dataset.hasMedia,viewportWidth:window.innerWidth,stackScrollHeight:stack.scrollHeight,stackClientHeight:stack.clientHeight};
  });
  const fail=(why)=>{throw new Error(label+': '+why+' / '+JSON.stringify(data))};
  if(data.board.w<200||data.board.h<300)fail('canvas has invalid size');
  if(expectedLayout&&data.layout!==expectedLayout)fail('unexpected editorial layout');
  if(fullBleed&&(Math.abs(data.board.w-data.stage.w)>3||Math.abs(data.board.h-data.stage.h)>3||Math.abs(data.board.w-data.viewportWidth)>3))fail('canvas is not full bleed');
  if(portrait&&Math.abs(data.board.w/data.board.h-9/16)>.03)fail('portrait mode ratio changed');
  if(data.overflow==='true')fail('content does not fit in editorial region');
  if(data.stackScrollHeight>data.stackClientHeight+4)fail('content stack overflows');
  for(let i=0;i<data.content.length;i++){
    const n=data.content[i],r=n.rect;
    if(r.w<10||r.h<5)fail('empty text box: '+n.role);
    if(r.x<data.board.x-3||r.right>data.board.right+3||r.y<data.board.y-3||r.bottom>data.board.bottom+3)fail('text outside canvas: '+n.role);
    if(n.scrollWidth>n.clientWidth+3)fail('word outside text column: '+n.role);
    if(n.overflowY!=='visible'&&n.scrollHeight>n.clientHeight+4)fail('paragraph clipped vertically: '+n.role);
    for(let j=0;j<i;j++){
      const o=data.content[j].rect;
      if(r.x<o.right-2&&r.right>o.x+2&&r.y<o.bottom-2&&r.bottom>o.y+2)fail('content collision: '+n.role+' / '+data.content[j].role);
    }
  }
  if(data.hasMedia==='true'&&['m-central','m-detalhe'].includes(data.treatment)&&data.profile!=='gallery'){
    if(!data.m.mask.includes('m-publicado.svg'))fail('official M mask missing');
    const ratio=data.m.rect.w/data.m.rect.h;
    if(Math.abs(ratio-990.08/743.18)>.04)fail('M shape distorted: '+ratio);
    if(data.layout!=='narrow'){
      const r=data.m.rect,o=data.stack;
      if(r.x<o.right-3&&r.right>o.x+3&&r.y<o.bottom-3&&r.bottom>o.y+3)fail('M intersects text reading column');
    }
  }
  console.log('COMPOSITION',label,data.layout,data.profile,data.board.w.toFixed(0)+'x'+data.board.h.toFixed(0),data.content.map(n=>n.role).join(','));
  return data;
}

try{
  await page.goto(url,{waitUntil:'load',timeout:60000});
  await page.locator('#artboard').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelectorAll('.page-entry').length===7);
  for(const n of ['64','179','151']){
    const response=await page.evaluate(async n=>{const r=await fetch('./media/BOXDOSENTIR-'+n+'.jpg');return {status:r.status,bytes:(await r.arrayBuffer()).byteLength}},n);
    if(response.status!==200||response.bytes<20000)throw Error('Cada Corpo file not loaded: '+n+' '+JSON.stringify(response));
  }
  const fonts=await page.evaluate(async()=>{
    await Promise.all([document.fonts.load('300 24px LMUnivers'),document.fonts.load('300 24px LMPerpetua')]);
    return [document.fonts.check('300 24px LMUnivers'),document.fonts.check('300 24px LMPerpetua')];
  });
  if(fonts.some(x=>!x))throw Error('Official fonts are not available');
  await geometry('opening edit',{expectedLayout:'compact'});
  for(let i=0;i<7;i++){
    await page.locator('.page-entry').nth(i).click();
    await geometry('edit page '+(i+1));
  }
  await page.locator('.page-entry').first().click();
  await page.screenshot({path:'editorial-composition-edit.png',fullPage:true});
  await page.locator('#previewButton').click();
  await page.locator('.editor.is-preview').waitFor();
  await geometry('opening full bleed',{expectedLayout:'wide',fullBleed:true});
  await page.screenshot({path:'editorial-composition-wide.png',fullPage:true});
  for(let i=1;i<7;i++){
    await page.evaluate(i=>document.querySelectorAll('.page-entry')[i].click(),i);
    await geometry('preview page '+(i+1),{fullBleed:true});
  }
  await page.evaluate(()=>document.querySelectorAll('.page-entry')[0].click());
  await page.locator('#viewportButton').click();
  await geometry('mobile simulation',{expectedLayout:'narrow',portrait:true});
  await page.screenshot({path:'editorial-composition-mobile.png',fullPage:true});
  for(let i=1;i<7;i++){
    await page.evaluate(i=>document.querySelectorAll('.page-entry')[i].click(),i);
    await geometry('portrait page '+(i+1),{expectedLayout:'narrow',portrait:true});
  }
  await page.evaluate(()=>document.querySelectorAll('.page-entry')[0].click());
  await page.locator('#viewportButton').click();
  await page.locator('#previewButton').click();
  await page.locator('#structureTab').click();
  await page.locator('#pageProfile').selectOption('development');
  await geometry('changed editorial profile');
  await page.locator('#mediaTab').click();
  await page.locator('#mediaTreatment').selectOption('m-detalhe');
  await geometry('changed media treatment');
  await page.locator('#mediaAssetSelect').selectOption('151');
  await page.locator('#undoButton').click();
  await page.locator('#redoButton').click();
  await page.setViewportSize({width:390,height:844});
  await geometry('physical mobile viewport',{expectedLayout:'narrow'});
  if(errors.length)throw Error('JavaScript errors: '+errors.join(' | '));
  console.log('PASS: no clipped or colliding text, measured official M, seven profiles, full bleed, responsive composition, editable media and history');
}catch(err){
  await page.screenshot({path:'editorial-browser-failure.png',fullPage:true}).catch(()=>{});
  console.error(err);
  process.exitCode=1;
}finally{await browser.close()}
