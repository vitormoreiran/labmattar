const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const output=path.resolve(process.env.VERTICAL_OUTPUT||'vertical-proof');
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.COMPOSITION_EXECUTABLE_PATH?{executablePath:process.env.COMPOSITION_EXECUTABLE_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[],proof=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'?studio=1#laboratorio',{waitUntil:'domcontentloaded'});await page.waitForSelector('#labPages[data-ready=true]',{state:'attached'});await page.evaluate(()=>document.fonts.ready);
  const settle=async()=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));await page.waitForTimeout(50);};
  const initial=await page.evaluate(()=>LabProductionBridge.snapshot());
  const signature={preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(c=>[c,{kind:'none',symbol:'M.svg',text:''}]))};
  const fixture={...initial.state,signature,title:'UM\nENCONTRO',body:'Uma experiência em comum.',bodyMode:'visivel',type:'univers',titleFonts:[],titleScale:70,textWidth:100,mScale:40,mPositionY:50,mExpandedPositionY:50,textPositionY:50,mCaption:'',marker:'none',guides:'nenhuma',background:'color',mContent:'solid',mPresentation:'elemento'};
  const input=async(id,value)=>{await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));await settle();};
  const geometry=()=>page.evaluate(()=>{const q=s=>document.querySelector(s),b=q('#labArtboard').getBoundingClientRect(),copy=q('#labReading .lm-lab-main-copy').getBoundingClientRect(),title=q('#labRenderedTitle').getBoundingClientRect(),body=q('#labRenderedBody').getBoundingClientRect(),m=q('#labMask').getBoundingClientRect(),zoom=b.width/q('#labArtboard').offsetWidth;return {copy:{y:(copy.top-b.top)/zoom,h:copy.height/zoom,w:copy.width/zoom},titleOffset:(title.top-copy.top)/zoom,bodyOffset:(body.top-copy.top)/zoom,gap:(body.top-title.bottom)/zoom,m:{y:(m.top-b.top)/zoom,h:m.height/zoom,w:m.width/zoom,center:(m.top-b.top+m.height/2)/b.height},state:LabProductionBridge.snapshot().state};});
  for(const format of ['horizontal','vertical','quadrado','editorial']){
   await page.evaluate(s=>LabProductionBridge.restore(s),{...fixture,format});await settle();
   const rows=[];
   for(const position of [0,50,100]){await input('labTextPositionY',position);rows.push(await geometry());}
   assert(rows[0].copy.y<rows[1].copy.y&&rows[1].copy.y<rows[2].copy.y,format+' não moveu o bloco');
   for(const r of rows){assert(Math.abs(r.copy.h-rows[0].copy.h)<.1,JSON.stringify({format,rows}));assert(Math.abs(r.copy.w-rows[0].copy.w)<.1);assert(Math.abs(r.bodyOffset-rows[0].bodyOffset)<.1);assert(Math.abs(r.titleOffset-rows[0].titleOffset)<.1);assert(Math.abs(r.gap-rows[0].gap)<.1);assert(Math.abs(r.m.y-rows[0].m.y)<.1);}
   await page.locator('button[data-mobile-module=texto]').click();await page.locator('[data-lab-center=textPositionY]').click();await settle();assert.equal((await geometry()).state.textPositionY,50);
   await page.locator('button[data-mobile-module=m]').click();await input('labMPositionY',20);const upper=await geometry();await input('labMPositionY',80);const lower=await geometry();assert(upper.m.y<lower.m.y);assert(Math.abs(upper.copy.y-lower.copy.y)<.1);assert(Math.abs(upper.m.h-lower.m.h)<.1);assert(Math.abs(upper.m.w-lower.m.w)<.1);
   await page.locator('[data-lab-choice=mPresentation][data-value=completo]').click();await settle();
   await input('labMExpandedPositionY',30);const expanded=await geometry();assert(Math.abs(expanded.m.center-.3)<.001,format+' não posicionou o M expandido');
   await page.locator('[data-lab-center=mExpandedPositionY]').click();await settle();assert(Math.abs((await geometry()).m.center-.5)<.001);
   proof.push({format,top:rows[0].copy.y,center:rows[1].copy.y,bottom:rows[2].copy.y,gap:rows[0].gap,expandedCenter:expanded.m.center});
  }
  const project=await page.evaluate(({fixture,signature})=>import('/lab-sequence.mjs').then(({createPage,createSection,sectionState,sequenceDocument})=>{
   const photos=LabProductionBridge.snapshot().photoCatalog,base={...fixture,format:'horizontal',background:'photo',mContent:'photo',mPresentation:'elemento',mScale:35,textWidth:80,title:'UM ENCONTRO',body:'Uma experiência em comum.'},section=createSection('intro','Introdução',base,photos);
   const pages=[20,80].map((textPositionY,i)=>({...createPage({id:'vertical-'+i,name:'Página '+(i+1),state:sectionState({...base,textPositionY,mPositionY:i?75:25},section),photoCatalog:photos,maxEdge:1920}),sectionId:'intro'}));
   return sequenceDocument('Posições por página',pages,[section],signature);
  }),{fixture,signature});
  await page.evaluate(doc=>LabPages.load(doc),project);await settle();assert.deepEqual(await page.evaluate(()=>LabPages.create()),project);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#labPages[data-ready=true]',{state:'attached'});await settle();assert.deepEqual(await page.evaluate(()=>LabPages.create()),project);
  await page.locator('button[data-mobile-module=texto]').click();await page.screenshot({path:path.join(output,'controle-texto.png')});await page.locator('button[data-mobile-module=m]').click();await page.screenshot({path:path.join(output,'controle-m.png')});
  async function download(type,name){
   if(!await page.locator('#labDeliveryDialog').isVisible())await page.locator('#labOpenDelivery').click();
   await page.locator('[data-delivery-format='+type+']').click();if(type!=='mp4')await page.locator('#labExportSize').selectOption('1920');
   if(type==='mp4'){await page.locator('#labVideoScope').selectOption('current');await page.locator('#labVideoSeconds').fill('2');await page.locator('#labVideoQuality').selectOption('hd');await page.locator('#labVideoText').uncheck();}
   const pending=page.waitForEvent('download',{timeout:180000});await page.locator('#'+({html:'labExportHtml',pdf:'labExportPdf',png:'labExportPng',mp4:'labExportMp4'})[type]).click();const item=await pending;assert.equal(await item.failure(),null);await item.saveAs(path.join(output,name));await page.locator('#labDeliveryBack').click();return path.join(output,name);
  }
  const html=await download('html','apresentacao.html');await download('pdf','apresentacao.pdf');await download('png','pagina.png');await download('mp4','pagina.mp4');
  const viewer=await context.newPage();await viewer.goto(require('node:url').pathToFileURL(html).href);await viewer.evaluate(()=>document.fonts.ready);await viewer.waitForTimeout(100);
  const web=await viewer.locator('.story-page').evaluateAll(pages=>pages.map(p=>{const c=p.querySelector('.story-reading'),b=p.getBoundingClientRect(),r=c.getBoundingClientRect();return {position:p.dataset.readingPosition,y:r.top-b.top,h:r.height,gap:getComputedStyle(c).gap};}));
  assert.equal(web[0].position,'20');assert.equal(web[1].position,'80');assert(web[0].y<web[1].y);assert.equal(web[0].h,web[1].h);assert.equal(web[0].gap,web[1].gap);await viewer.screenshot({path:path.join(output,'html.png')});await viewer.close();
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({proof,web,roundTrip:true,exports:['png','pdf','html','mp4'],errors},null,2));console.log(JSON.stringify({formats:proof.length,internalSpacingPreserved:true,roundTrip:true,web,exports:4,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
