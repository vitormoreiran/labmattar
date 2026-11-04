import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.MANUAL_URL || 'http://127.0.0.1:8765/manual.html';
const phase = process.env.CHECK_EDITOR ? 'published' : 'built';
await mkdir('symbols-proof', {recursive:true});
const report = {url,phase,viewports:[],states:[],errors:[],failedRequests:[],editor:null};
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
page.on('pageerror', error => report.errors.push(error.message));
page.on('requestfailed', request => report.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
const check = (ok,message) => assert.ok(ok,message);
try {
  const response = await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  assert.equal(response.status(),200,'Manual HTTP 200');
  await page.waitForSelector('.motion-symbol-preview[data-motion-version="20261104-groups"] video');
  await page.evaluate(()=>document.fonts.ready);
  report.fonts = await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
  for (const family of ['UniversMattar','PerpetuaMattar']) check(report.fonts.some(f=>f.family===family&&f.status==='loaded'),`Official font loaded: ${family}`);
  assert.equal(await page.locator('#estrutura .symbol').count(),2,'Only signature and M');
  assert.equal(await page.locator('#estrutura svg').count(),2,'No duplicate signature');
  // Regression: all five area-opening H1 headings must have identical typography.
  // Each page owns distinct local CSS; a shared title rule must win across them.
  report.manualHeadings=[];
  const areas=['manual.html','motion.html','tipografia.html','cores.html','composicao.html','laboratorio.html'];
  report.manualGeometry=[];
  for (const [viewportWidth,viewportHeight] of [[1440,900],[1024,768],[768,1024],[390,844],[320,640]]) {
    const group=[];
    const geometry=[];
    for (const area of areas) {
      const areaPage=await browser.newPage({viewport:{width:viewportWidth,height:viewportHeight},reducedMotion:'reduce'});
      try {
        const response=await areaPage.goto(new URL('/'+area,url).href,{waitUntil:'networkidle',timeout:60000});
        assert.equal(response.status(),200,'Area HTTP 200 '+area);
        const navLinks=await areaPage.locator('.lm-site-nav a').allTextContents();
        assert.deepEqual(navLinks.map(x=>x.trim()),[
          '01 / SÍMBOLOS','MOTION','02 / TIPOGRAFIA','03 / CORES','04 / COMPOSIÇÃO','05 / LABORATÓRIO DE COMPOSIÇÃO'
        ],'Motion follows Symbols with a separate composition laboratory: '+area);
        assert.equal(await areaPage.locator('.lm-site-nav a[href="/imagem.html"]').count(),0,
          'Imagem must not reappear as a separate chapter');
        if(area==='composicao.html'){
          assert.equal(await areaPage.locator('#laboratorio, #labArtboard, #labStudioToggle').count(),0,
            'Composição must not contain the interactive laboratory');
          assert.equal(await areaPage.locator('main a[href="/laboratorio.html"]').count(),1,
            'Composição must link to chapter 05');
          assert.equal(await areaPage.locator('#construcao .lm-case-facts article').count(),4,
            'Construction must show four clear assembly decisions');
          assert.equal(await areaPage.locator('#regras-de-composicao .lm-m-guide-grid article').count(),6,
            'Six identity composition rules remain available');
        }
        if(area==='laboratorio.html' && viewportWidth===1440){
          const oldImagePage=await browser.newPage();
          try {
            await oldImagePage.goto(new URL('/imagem.html',url).href,{waitUntil:'load',timeout:60000});
            await oldImagePage.waitForURL(next=>['/laboratorio.html','/laboratorio'].includes(new URL(next).pathname),{timeout:15000});
            assert.ok(['/laboratorio.html','/laboratorio'].includes(new URL(oldImagePage.url()).pathname),
              'Legacy image URL must redirect into the laboratory: '+oldImagePage.url());
            assert.equal(await oldImagePage.locator('#labArtboard').count(),1,
              'Legacy image link must open the functional Laboratory instead of an image chapter');
          } finally { await oldImagePage.close(); }
        }
        if(area==='laboratorio.html'){
          assert.equal(await areaPage.locator('#labArtboard').count(),1,
            'Laboratory retains one functional artboard');
          assert.equal(await areaPage.locator('#labStudioToggle').count(),1,
            'Laboratory retains the focused editor');
        }
        await areaPage.evaluate(()=>document.fonts.ready);
        await areaPage.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
        const cover=areaPage.locator('main > section.lm-manual-cover');
        assert.equal(await cover.count(),1,'Exactly one shared chapter cover: '+area);
        const placement=await cover.evaluate(section=>{
          const inner=section.querySelector(':scope > .inner');
          const lower=inner?.querySelector(':scope > .bottomline,:scope > .cover-bottom,:scope > .intro-bottom,:scope > .intro');
          const kicker=inner?.firstElementChild;
          const title=inner?.querySelector(':scope > h1');
          const titleContent=title?.querySelector(':scope > .lm-cover-title-content');
          const body=lower?.querySelector(':scope > p:first-child');
          const detail=lower?.querySelector(':scope > p:nth-child(2)');
          if(!inner||!lower||!kicker||!title||!titleContent||!body||!detail)return {error:'Missing one of six canonical cover fields'};
          const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
          return {kicker:rect(kicker),title:rect(title),titleContent:rect(titleContent),body:rect(body),detail:rect(detail),
            cover:rect(section),frame:rect(inner),titleOverflow:title.scrollWidth-title.clientWidth,
            gridColumns:getComputedStyle(inner).gridTemplateColumns.split(' ').length};
        });
        assert.ok(!placement.error,'Cover field contract '+area+': '+placement.error);
        assert.ok(Math.abs(placement.kicker.left-placement.frame.left)<=2,
          'Editorial axis must start at the existing content frame, without an extra grid inset: '+area+'/'+viewportWidth);
        assert.equal(placement.gridColumns,viewportWidth<=700?1:12,'Shared cover grid columns: '+area);
        assert.ok(placement.titleOverflow<=1.5,'Title fits its assigned column without automatic shrinking: '+area);
        const coverCenter=(placement.frame.top+placement.frame.bottom)/2;
        const visualTargetCenter=(viewportHeight+54)/2;
        assert.ok(Math.abs(coverCenter-visualTargetCenter)<=26,
          'Cover composition must be vertically balanced under the navigation: '+area+'/'+viewportWidth+
          ' center='+coverCenter+' expected='+visualTargetCenter);
        const titleCenter=(placement.title.top+placement.title.bottom)/2;
        const titleContentCenter=(placement.titleContent.top+placement.titleContent.bottom)/2;
        assert.ok(Math.abs(titleCenter-titleContentCenter)<=3,
          'Short and long titles must be optically centered within the same title band: '+area+'/'+viewportWidth);
        assert.ok(placement.title.top<placement.body.top,'Cover title precedes copy: '+area);
        if(viewportWidth<=700)assert.ok(placement.detail.top>=placement.body.top+placement.body.height,
          'Mobile detail follows the body: '+area);
        geometry.push({area,...placement});
        const internalSelectors={
          'manual.html':'#estrutura .lm-reading-intro h2',
          'motion.html':'#roteiros h2',
          'tipografia.html':'#titulo h2',
          'cores.html':'#paleta .section-head > p:first-child',
          'composicao.html':'#construcao .lm-case-intro h2',
          'laboratorio.html':'#laboratorio .lm-lab-heading h2'
        };
        const internal=areaPage.locator(internalSelectors[area]);
        assert.equal(await internal.count(),1,'One representative internal chapter heading: '+area);
        const internalX=await internal.evaluate(el=>el.getBoundingClientRect().left);
        assert.ok(Math.abs(internalX-placement.kicker.left)<=2,
          'Chapter section uses the exact same editorial left axis: '+area+'/'+viewportWidth+
          ' internal='+internalX+' cover='+placement.kicker.left);
        if(area==='composicao.html'){
          for(const selector of ['#regras-de-composicao h2','.lm-composition-next .inner > p.eyebrow']){
            const x=await areaPage.locator(selector).evaluate(el=>el.getBoundingClientRect().left);
            assert.ok(Math.abs(x-placement.kicker.left)<=2,'Composition internal section shares ruler: '+selector+'/'+viewportWidth);
          }
        }


        const audit=await areaPage.evaluate(()=>{
          const text=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          const seen=[],errors=[];let node;
          const title=Math.max(31,Math.min(innerWidth*.07,104)),body=innerWidth<=760?16:18,detail=innerWidth<=760?12:13;
          const expect={title:{size:title,leading:title*.98},body:{size:body,leading:body*(innerWidth<=760?1.5:1.45)},detail:{size:detail,leading:detail*(innerWidth<=760?1.4:1.35)}};
          const scale=(min,mult,max,width)=>Math.min(max,Math.max(min,width*mult));
          while((node=text.nextNode())){
            const value=node.nodeValue?.trim();if(!value)continue;
            const e=node.parentElement;
            if(!e||e.closest('script,style,noscript,template,svg,math,[hidden]'))continue;
            const cs=getComputedStyle(e),rect=e.getBoundingClientRect();
            if(cs.display==='none'||cs.visibility==='hidden'||rect.width===0||rect.height===0||parseFloat(cs.fontSize)===0)continue;
            const role=e.getAttribute('data-lm-text-role');
            const artboard=e.closest('.lm-case-frame');
            const width=artboard?.getBoundingClientRect().width;
            const vertical=artboard?.classList.contains('is-mobile');
            const sizes=width?vertical?
              {title:scale(18,.096,38,width),body:scale(9,.0365,14,width),detail:scale(7,.0255,10,width)}:
              {title:scale(12,.069,84,width),body:scale(8,.0175,18,width),detail:scale(6,.0125,13,width)}:null;
            const lab=e.closest('#labArtboard');
            const labVars=lab?getComputedStyle(lab):null;
            const labSize=labVars?parseFloat(labVars.getPropertyValue('--lm-type-'+role+'-size')):NaN;
            const nominal=Number.isFinite(labSize)?
              {size:labSize,leading:labSize*(role==='title'?.98:role==='body'?(innerWidth<=760?1.5:1.45):(innerWidth<=760?1.4:1.35))}:
              sizes?{title:{size:sizes.title,leading:sizes.title*.98},
                body:{size:sizes.body,leading:sizes.body*(innerWidth<=760?1.5:1.45)},
                detail:{size:sizes.detail,leading:sizes.detail*(innerWidth<=760?1.4:1.35)}}[role]:expect[role];
            const item={role,tag:e.tagName,className:String(e.className).slice(0,90),text:value.slice(0,50),size:parseFloat(cs.fontSize),leading:parseFloat(cs.lineHeight),weight:cs.fontWeight,family:cs.fontFamily,tracking:parseFloat(cs.letterSpacing)||0};
            seen.push(item);
            if(!nominal){errors.push({...item,reason:'missing role'});continue;}
            if(Math.abs(item.size-nominal.size)>.12)errors.push({...item,reason:'non-token font size',expected:nominal.size});
            if(Math.abs(item.leading-nominal.leading)>.25)errors.push({...item,reason:'non-token line height',expected:nominal.leading});
            if(item.weight!=='300')errors.push({...item,reason:'weight must be 300'});
            if(!/^(UniversMattar|PerpetuaMattar)/.test(item.family))errors.push({...item,reason:'unapproved font family'});
            const alt=role==='title'&&item.family.startsWith('PerpetuaMattar');
            const tracking=role==='title'?(alt?0:-.025*nominal.size):role==='body'?0:.04*nominal.size;
            if(Math.abs(item.tracking-tracking)>.12)errors.push({...item,reason:'non-token letter spacing',expected:tracking});
          }
          let pseudoCount=0;
          for(const e of document.querySelectorAll('body *')){
            if(e.closest('[hidden]')||getComputedStyle(e).display==='none')continue;
            for(const pseudo of ['::before','::after']){
              const c=getComputedStyle(e,pseudo),value=c.content;
              if(!value||value==='none'||value==='normal'||value==='""'||value==="''"||c.display==='none'||c.visibility==='hidden')continue;
              pseudoCount++;
              const actual={text:String(value).slice(0,40),pseudo,element:e.tagName+'.'+String(e.className).slice(0,45),size:parseFloat(c.fontSize),leading:parseFloat(c.lineHeight),family:c.fontFamily,weight:c.fontWeight,tracking:parseFloat(c.letterSpacing)||0};
              const pseudoLab=e.closest('#labArtboard');
              const pseudoSize=pseudoLab?
                parseFloat(getComputedStyle(pseudoLab).getPropertyValue('--lm-type-detail-size')):detail;
              const pseudoLeading=pseudoSize*(innerWidth<=760?1.4:1.35);
              if(Math.abs(actual.size-pseudoSize)>.12||Math.abs(actual.leading-pseudoLeading)>.25||
                 actual.weight!=='300'||!actual.family.startsWith('UniversMattar')||
                 Math.abs(actual.tracking-.04*pseudoSize)>.12)
                errors.push({...actual,reason:'CSS-generated label is not Detalhe'});
            }
          }
          return {count:seen.length,pseudoCount,counts:Object.fromEntries(['title','body','detail'].map(r=>[r,seen.filter(x=>x.role===r).length])),errors:errors.slice(0,40),errorCount:errors.length};
        });
        assert.ok(audit.count>=15,'Text audit must cover real content on every chapter: '+area);
        assert.equal(audit.errorCount,0,'Only three typography treatments in '+area+' / '+viewportWidth+': '+JSON.stringify(audit.errors));
        report.typeAudit??=[];
        report.typeAudit.push({area,viewportWidth,count:audit.count,counts:audit.counts});
        const headings=areaPage.locator('main h1.lm-manual-page-title, main h2.lm-manual-section-title');
        const expected={'manual.html':6,'motion.html':6,'tipografia.html':5,'cores.html':1,'composicao.html':3,'laboratorio.html':1};
        assert.equal(await headings.count(),expected[area],'All structural headings identified in '+area);
        const styles=await headings.evaluateAll(els=>els.map(el=>{
          const css=getComputedStyle(el),rect=el.getBoundingClientRect();
          return {size:parseFloat(css.fontSize),lineHeight:parseFloat(css.lineHeight),family:css.fontFamily,weight:css.fontWeight,tracking:css.letterSpacing,left:rect.left,right:rect.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
        }));
        for(const style of styles){
          check(style.size>0,'Valid title font size '+area);
          check(style.left>=-1 && style.right<=viewportWidth+1,'Title box inside viewport '+area+'/'+viewportWidth);
          check(style.scrollWidth<=style.clientWidth+1,'Title text fits viewport '+area+'/'+viewportWidth);
        }
        if ([1440,390].includes(viewportWidth)) await areaPage.screenshot({path:`symbols-proof/${phase}-heading-${area.replace('.html','')}-${viewportWidth}.png`});
        for(const style of styles) group.push({area,...style});
      } finally { await areaPage.close(); }
    }
    const reference=geometry[0];
    for(const field of ['kicker.left','kicker.top','title.left','title.top','body.left','body.top','detail.left',...(viewportWidth>700?['detail.top']:[])]) {
      const [region,coordinate]=field.split('.');
      for(const current of geometry.slice(1)) {
        const deviation=Math.abs(current[region][coordinate]-reference[region][coordinate]);
        assert.ok(deviation<=2,'Shared cover '+field+' diverges by '+deviation.toFixed(2)+' px: '+current.area+'/'+viewportWidth);
      }
    }
    report.manualGeometry.push({viewportWidth,chapters:geometry.map(x=>({
      area:x.area,kicker:x.kicker,title:x.title,body:x.body,detail:x.detail
    }))});
    for(const field of ['size','lineHeight','family','weight','tracking']) {
      const values=new Set(group.map(item=>typeof item[field]==='number'?item[field].toFixed(2):item[field]));
      assert.equal(values.size,1,'Uniform opening title '+field+' at '+viewportWidth+': '+JSON.stringify(group));
    }
    report.manualHeadings.push({viewportWidth,areas:group});
  }
  for (const [width,height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[375,667],[320,640]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const geometry = await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('h1,h2,.title .line,.symbol-row,.state-explorer,.lm-site-nav,header.top,.state-picker button')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1;}).map(e=>e.tagName+'.'+e.className)}));
    report.viewports.push(geometry);assert.equal(geometry.document,width,`No horizontal scroll at ${width}`);assert.deepEqual(geometry.overflow,[],`No clipped element at ${width}`);
    if ([1440,390,320].includes(width)) {
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`symbols-proof/${phase}-cover-${width}.png`});
      await page.locator('#estrutura').screenshot({path:`symbols-proof/${phase}-signature-${width}.png`});
    }
  }
  await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.locator('.state-explorer, #state-morph-svg').count(),0,'Contour demo has been replaced');
  const symbolVideo=page.locator('.motion-symbol-preview video');
  assert.equal(await symbolVideo.locator('source').getAttribute('src'),'/motion/videos/m-form.mp4');
  assert.deepEqual(await symbolVideo.evaluate(video=>({autoplay:video.autoplay,muted:video.muted,loop:video.loop,controls:video.controls,inline:video.playsInline})),{autoplay:true,muted:true,loop:true,controls:false,inline:true});
  await page.waitForFunction(()=>document.querySelector('.motion-symbol-preview video').currentTime>0.1);
  await symbolVideo.evaluate(video=>{video.currentTime=video.duration-0.15;});
  await page.waitForFunction(()=>{const v=document.querySelector('.motion-symbol-preview video');return !v.paused&&v.currentTime<1.5;});
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('#transformacao').screenshot({path:`symbols-proof/${phase}-motion-${width}.png`});
  }
  const motionPage=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await motionPage.goto(new URL('/motion.html',url).href,{waitUntil:'networkidle'});
    assert.equal(await motionPage.locator('.lm-site-nav [data-area="motion"][aria-current="page"]').count(),1);
    assert.equal(await motionPage.locator('.lm-site-nav [data-area="laboratorio"][aria-current]').count(),0);
    assert.deepEqual(await motionPage.locator('[data-motion-group]').evaluateAll(sections=>sections.map(s=>({id:s.id,cards:s.querySelectorAll('.motion-card').length}))),[
      {id:'roteiros',cards:1},{id:'assinaturas',cards:4},{id:'transicoes',cards:3}
    ]);
    assert.equal(await motionPage.locator('.motion-card video').count(),8);
    assert.equal(await motionPage.locator('.motion-status,[data-status]').count(),0);
    assert.equal(await motionPage.locator('video[autoplay][muted][loop][playsinline]:not([controls])').count(),8);
    await motionPage.waitForFunction(()=>[...document.querySelectorAll('.motion-card video')].slice(0,2).every(v=>!v.paused&&v.muted&&v.currentTime>0.1));
    assert.doesNotMatch(await motionPage.locator('main').innerText(),/aprovad|avaliação/i);
    for(const width of [1440,390]){
      await motionPage.setViewportSize({width,height:900});
      assert.equal(await motionPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No Motion document overflow');
      await motionPage.screenshot({path:`symbols-proof/${phase}-motion-gallery-${width}.png`,fullPage:true});
    }
    report.motion={groups:[1,4,3],players:8,statusLabels:false,symbolVideoPlayback:true};
  }finally{await motionPage.close();}
  await page.setViewportSize({width:390,height:844});
  await page.locator('header.top a[href="#estrutura"]').click();await page.waitForTimeout(100);
  const menus=await page.evaluate(()=>({nav:document.querySelector('.lm-site-nav').getBoundingClientRect().bottom,header:document.querySelector('header.top').getBoundingClientRect().top,headerBottom:document.querySelector('header.top').getBoundingClientRect().bottom,title:document.querySelector('#estrutura h2').getBoundingClientRect().top}));
  check(menus.header>=menus.nav-1,'Sticky menus do not overlap');check(menus.title>=menus.headerBottom-1,'Anchor title is visible');
  for(const file of ['M.svg',...Array.from({length:9},(_,i)=>`vaso_${String(i+1).padStart(2,'0')}.svg`)]) {
    const r=await page.request.get(new URL('/identidade/'+file,url).href);assert.equal(r.status(),200,'Official asset '+file);
  }
  if(process.env.CHECK_EDITOR) {
    await page.setViewportSize({width:1440,height:1000});
    const response=await page.goto(new URL('/editor',url).href,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200,'Editor HTTP 200');
    await page.waitForSelector('.lm-root[aria-busy="false"]',{timeout:60000});
    assert.equal(await page.locator('.lm-state').count(),10,'Editor has M and all nine vessels');
    const button=page.locator('.lm-play');await button.click();await page.waitForTimeout(700);await button.click();
    const time=await page.locator('.lm-track input').inputValue();check(+time>0,'Original editor timeline advances');
    const geometry=await page.locator('.lm-art svg').innerHTML();check(geometry.includes('path'),'Original editor renders SVG');
    await page.screenshot({path:`symbols-proof/${phase}-editor.png`});
    report.editor={loaded:true,states:10,playPause:true,time};
  }
  assert.deepEqual(report.errors,[],'No browser JavaScript errors');
  assert.deepEqual(report.failedRequests,[],'No failed network requests');
  report.passed=true;
} catch(error) {
  report.passed=false;report.failure=error.stack;
  await page.screenshot({path:`symbols-proof/${phase}-failure.png`}).catch(()=>{});
  throw error;
} finally {
  await writeFile(`symbols-proof/${phase}-report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await browser.close();
}
