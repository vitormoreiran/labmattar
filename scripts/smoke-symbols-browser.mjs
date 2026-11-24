import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.MANUAL_URL || 'http://127.0.0.1:8765/manual.html';
const phase = process.env.CHECK_EDITOR ? 'published' : 'built';
await mkdir('symbols-proof', {recursive:true});
const report = {url,phase,viewports:[],states:[],errors:[],failedRequests:[],cancelledMediaRequests:[],editor:null};
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
page.on('pageerror', error => report.errors.push(error.message));
page.on('requestfailed', request => {
  const failure={url:request.url(),error:request.failure()?.errorText},asset=new URL(request.url());
  // Paused media preloads, seeking and navigation can cancel a valid transfer.
  // Playback and looping are verified below; other network failures still fail.
  if(request.resourceType()==='media'&&failure.error==='net::ERR_ABORTED'&&
    asset.origin===new URL(url).origin&&/^\/motion\/videos\/[^/]+\.mp4$/.test(asset.pathname)){
    report.cancelledMediaRequests.push(failure);return;
  }
  report.failedRequests.push(failure);
});
const check = (ok,message) => assert.ok(ok,message);
// The published Worker may reset a navigation during route changes.
// Retry only transient transport errors, never HTTP errors or broken content.
async function navigateArea(page, href) {
  for (let attempt=0; attempt<3; attempt++) {
    try {
      // Later assertions already await fonts, role assignment, and page content.
      return await page.goto(href,{waitUntil:'domcontentloaded',timeout:60000});
    } catch (error) {
      const transient = /net::ERR_CONNECTION_RESET|net::ERR_CONNECTION_CLOSED|net::ERR_TIMED_OUT/.test(String(error));
      if (phase!=='published' || !transient || attempt===2) throw error;
      console.warn('Preview navigation retry',attempt+1,href,String(error).slice(0,180));
      await page.waitForTimeout((attempt+1)*750);
    }
  }
}
try {
  const response = await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  assert.equal(response.status(),200,'Manual HTTP 200');
  await page.waitForSelector('#uso.lm-identity-application .lm-expanded-center img');
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
  // The compiled artifact is exhaustively tested at five viewports.
  // Check both desktop and mobile on the published Worker without multiplying
  // cross-network navigations across unrelated manual chapters.
  const viewportCases=phase==='published'?[[1440,900],[390,844]]:[[1440,900],[1024,768],[768,1024],[390,844],[320,640]];
  for (const [viewportWidth,viewportHeight] of viewportCases) {
    const group=[];
    const geometry=[];
    for (const area of areas) {
      const areaPage=await browser.newPage({viewport:{width:viewportWidth,height:viewportHeight},reducedMotion:'reduce'});
      try {
        const response=await navigateArea(areaPage,new URL('/'+area,url).href);
        assert.equal(response.status(),200,'Area HTTP 200 '+area);
        const navLinks=await areaPage.locator('.lm-nav-list a').evaluateAll(links=>links.map(link=>({
          index:link.querySelector('.lm-nav-index').textContent.trim(),area:link.dataset.area,href:link.getAttribute('href')
        })));
        assert.deepEqual(navLinks,[
          {index:'00',area:'introducao',href:'/inicio.html'},
          {index:'01',area:'simbolos',href:'/manual.html'},
          {index:'02',area:'motion',href:'/motion.html'},
          {index:'03',area:'tipografia',href:'/tipografia.html'},
          {index:'04',area:'cores',href:'/cores.html'},
          {index:'05',area:'composicao',href:'/composicao.html'},
          {index:'06',area:'laboratorio',href:'/laboratorio.html'},
          {index:'07',area:'redes',href:'/redes.html'}
        ],'Introduction precedes all seven manual chapters: '+area);
        assert.equal(await areaPage.locator('.lm-site-nav a[href="/imagem.html"]').count(),0,
          'Imagem must not reappear as a separate chapter');
        if(area==='composicao.html'){
          assert.equal(await areaPage.locator('#laboratorio, #labArtboard, #labStudioToggle').count(),0,
            'Composição must not contain the interactive laboratory');
          assert.equal(await areaPage.locator('main a[href="/laboratorio.html"]').count(),1,
            'Composição must link to the Laboratory');
          assert.equal(await areaPage.locator('#construcao .lm-case-facts article').count(),0,
            'Construction guidance belongs in Compor, not in a fixed explanatory grid');
          assert.equal(await areaPage.locator('#regras-de-composicao .lm-m-guide-grid article').count(),6,
            'Six identity composition rules remain available');
        }
        if(area==='laboratorio.html' && viewportWidth===1440){
          const oldImagePage=await browser.newPage();
          try {
            await oldImagePage.goto(new URL('/imagem.html',url).href,{waitUntil:'load',timeout:60000});
            // The Worker may canonicalize /compor.html as /compor; both
            // routes address the same separated editor. Verify its actual
            // functional canvas rather than insisting on a file extension.
            const isCompor=next=>/^[/]compor(?:[.]html)?[/]?$/.test(new URL(next).pathname);
            try{await oldImagePage.waitForURL(isCompor,{timeout:15000});}
            catch(error){throw new Error('Legacy image redirect ended at '+oldImagePage.url()+': '+error.message);}
            assert.ok(isCompor(oldImagePage.url()),
              'Legacy image URL must redirect into Compor: '+oldImagePage.url());
            assert.equal(await oldImagePage.locator('#labArtboard').count(),1,
              'Legacy image link must preserve access to the functional Compor tool');
          } finally { await oldImagePage.close(); }
        }
        if(area==='laboratorio.html'){
          assert.equal(await areaPage.locator('#labArtboard, #labStudioToggle').count(),0,
            'The Laboratory index must not embed Compor');
          assert.equal(await areaPage.locator('.lm-lab-tool').count(),3,
            'The Laboratory index must show the Matrix, Compor and Cartão MATTAR');
          assert.equal(await areaPage.locator('a.lm-lab-tool[href="/motion/matriz/index.html"]').count(),1,
            'Matrix preview must open the current spatial Matrix');
          assert.equal(await areaPage.locator('a.lm-lab-tool[href="/montar.html"]').count(),1,
            'Compor preview must open the separate composition editor');
          assert.equal(await areaPage.locator('a.lm-lab-tool[href="/assinatura-email.html?origem=laboratorio"]').count(),1,
            'Cartão MATTAR preview must open the personalized signature tool');
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
          if(!inner||!lower||!title||!titleContent||!body)return {error:'Missing canonical cover content'};
          const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
          return {kicker:kicker?rect(kicker):null,title:rect(title),titleContent:rect(titleContent),body:rect(body),detail:detail?rect(detail):null,
            cover:rect(section),frame:rect(inner),titleOverflow:title.scrollWidth-title.clientWidth,
            gridColumns:getComputedStyle(inner).gridTemplateColumns.split(' ').length};
        });
        assert.ok(!placement.error,'Cover field contract '+area+': '+placement.error);
        assert.ok(Math.abs(placement.title.left-placement.frame.left)<=2,
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
        if(viewportWidth<=700&&placement.detail)assert.ok(placement.detail.top>=placement.body.top+placement.body.height,
          'Mobile detail follows the body: '+area);
        geometry.push({area,...placement});
        const internalSelectors={
          'manual.html':'#estrutura .lm-reading-intro h2',
          'motion.html':'#roteiros h2',
          'tipografia.html':'#titulo h2',
          'cores.html':'#paleta .section-head > p:first-child',
          'composicao.html':'#construcao .lm-case-intro h2',
          'laboratorio.html':'#ferramentas .inner > p.eyebrow'
        };
        const internal=areaPage.locator(internalSelectors[area]);
        assert.equal(await internal.count(),1,'One representative internal chapter heading: '+area);
        const internalX=await internal.evaluate(el=>el.getBoundingClientRect().left);
        assert.ok(Math.abs(internalX-placement.title.left)<=2,
          'Chapter section uses the exact same editorial left axis: '+area+'/'+viewportWidth+
          ' internal='+internalX+' cover='+placement.title.left);
        if(area==='composicao.html'){
          for(const selector of ['#regras-de-composicao h2','#reducao-protecao h2','.lm-composition-next .inner > p.eyebrow']){
            const x=await areaPage.locator(selector).evaluate(el=>el.getBoundingClientRect().left);
            assert.ok(Math.abs(x-placement.kicker.left)<=2,'Composition internal section shares ruler: '+selector+'/'+viewportWidth);
          }
        }


        const audit=await areaPage.evaluate(()=>{
          const text=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          const seen=[],errors=[];let node;
          const title=Math.max(31,Math.min(innerWidth*.07,104)),subtitle=Math.max(24,Math.min(innerWidth*.033,49)),body=innerWidth<=760?17:19,detail=innerWidth<=760?12:13;
          const expect={title:{size:title,leading:title*.98},subtitle:{size:subtitle,leading:subtitle*1.1},body:{size:body,leading:body*(innerWidth<=760?1.5:1.45)},detail:{size:detail,leading:detail*(innerWidth<=760?1.4:1.35)}};
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
            const cover=e.closest('.lm-lab-tool-preview'),coverWidth=cover?.getBoundingClientRect().width;
            const sizes=coverWidth?
              {title:coverWidth*.073,body:coverWidth*.032,detail:scale(8,.0225,11,coverWidth)}:
              width?vertical?
              {title:scale(18,.096,38,width),body:scale(9.5,.0385,15,width),detail:scale(7,.0255,10,width)}:
              {title:scale(12,.069,84,width),body:scale(8.5,.0185,19,width),detail:scale(6,.0125,13,width)}:null;
            const lab=e.closest('#labArtboard');
            const labVars=lab?getComputedStyle(lab):null;
            const labSize=labVars?parseFloat(labVars.getPropertyValue('--lm-type-'+role+'-size')):NaN;
            const nominal=Number.isFinite(labSize)?
              {size:labSize,leading:labSize*(role==='title'?.98:role==='subtitle'?1.1:role==='body'?(innerWidth<=760?1.5:1.45):(innerWidth<=760?1.4:1.35))}:
              sizes?{title:{size:sizes.title,leading:sizes.title*.98},
                subtitle:{size:sizes.subtitle,leading:sizes.subtitle*1.1},
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
            const tracking=role==='title'?(alt?0:-.025*nominal.size):role==='subtitle'?-0.025*nominal.size:role==='body'?0:.04*nominal.size;
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
          return {count:seen.length,pseudoCount,counts:Object.fromEntries(['title','subtitle','body','detail'].map(r=>[r,seen.filter(x=>x.role===r).length])),errors:errors.slice(0,40),errorCount:errors.length};
        });
        assert.ok(audit.count>=15,'Text audit must cover real content on every chapter: '+area);
        assert.equal(audit.errorCount,0,'Only four typography treatments in '+area+' / '+viewportWidth+': '+JSON.stringify(audit.errors));
        report.typeAudit??=[];
        report.typeAudit.push({area,viewportWidth,count:audit.count,counts:audit.counts});
        const headings=areaPage.locator('main h1.lm-manual-page-title, main h2.lm-manual-section-title');
        const expected={'manual.html':5,'motion.html':6,'tipografia.html':5,'cores.html':1,'composicao.html':4,'laboratorio.html':1};
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
    for(const field of ['title.left','body.left']) {
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
  // All anchors in the authored introduction belong to chapter 00.
  for(const width of [1440,390]){
    const introPage=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    try{
      const response=await introPage.goto(new URL('/inicio.html#sistemas',url).href,{waitUntil:'networkidle',timeout:60000});
      assert.equal(response.status(),200,'Introduction HTTP 200');
      assert.equal(await introPage.locator('.lm-site-nav').count(),1,'One shared chapter menu');
      assert.equal(await introPage.locator('.lm-site-nav [data-area="introducao"][aria-current="page"]').count(),1,'Entire introduction is chapter 00');
      assert.equal(await introPage.locator('.lm-site-nav [aria-current="page"]').count(),1);
      assert.deepEqual(await introPage.locator('#sistemas .entry>span:first-child').allTextContents(),['01','02','03','04','05','06','07'],'Introduction index follows the chapter menu');
       const titles=await introPage.locator('main h1, main h2').allTextContents();
       assert.ok(titles.every(t=>t.trim()===t.trim().toLocaleUpperCase('pt-BR')),'REVIEW1: introduction titles are uppercase');
       const titleSize=await introPage.locator('main h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
       assert.ok(Math.abs(titleSize-Math.min(104,Math.max(31,width*.07)))<1,'REVIEW1: introduction cover uses standard title size');
       assert.equal(await introPage.locator('#arquivo .archive-card').count(),3,'REVIEW1: archive has three real linked resources');
       assert.equal(await introPage.locator('#arquivo video source[src="/motion/videos/m-form.mp4"]').count(),1);
       assert.equal(await introPage.locator('#arquivo .placeholder').count(),0,'REVIEW1: no empty archival placeholders');
       if(width===1440)assert.equal(await introPage.locator('#sistemas .entry p').evaluateAll(items=>items.every(el=>getComputedStyle(el).whiteSpace==='nowrap')),true,'REVIEW1: index descriptions use one line on desktop');
       assert.ok(await introPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'REVIEW1: no intro horizontal overflow');
      assert.equal(await introPage.locator('main>.section>.eyebrow').filter({hasText:/^0[1-9] \/ /}).count(),0,'Introduction sections do not start new chapters');
      await introPage.locator('header a[href="#arquivo"]').click();
      assert.equal(new URL(introPage.url()).hash,'#arquivo');
      assert.equal(await introPage.locator('.lm-site-nav [data-area="introducao"][aria-current="page"]').count(),1,'Acervo remains inside introduction');
      await introPage.evaluate(()=>scrollTo(0,0));await introPage.screenshot({path:'symbols-proof/'+phase+'-introduction-'+width+'.png'});
    }finally{await introPage.close();}
  }
  // Chapter 07: the feed is a temporal archive of project seasons.
  // The dedicated social test also checks the real photographs and mobile layout.
  const socialPage=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  try {
    const socialResponse=await socialPage.goto(new URL('/redes.html',url).href,{waitUntil:'networkidle',timeout:60000});
    assert.equal(socialResponse.status(),200,'Redes Sociais HTTP 200');
    await socialPage.waitForFunction(()=>document.body.dataset.lmTypographyReady==='true',{timeout:15000});
    assert.equal(await socialPage.locator('main > section.lm-manual-cover').count(),1,'Social page has canonical cover');
    assert.equal(await socialPage.locator('.lm-site-nav a[data-area="redes"][aria-current="page"]').count(),1,'Social nav active');
    assert.equal(await socialPage.locator('main>section.chapter').count(),7,'Cover and six editorial sections');
    assert.equal(await socialPage.locator('.profile-posts img').count(),12,'Continuous profile has twelve photographs');
    assert.equal(await socialPage.locator('.motion-examples video').count(),2,'Two examples from the motion system');
    assert.equal(await socialPage.locator('main a[href="/motion.html"]').count(),1,'Editorial link to the motion chapter');
    assert.equal(await socialPage.locator('#lmSeasonPlanner').count(),0,'Retired planner stays absent');
    const content=(await socialPage.locator('main').textContent()).toLocaleLowerCase('pt-BR');
    for(const project of ['Cada Corpo Abre um Mundo','Poiesis','Aleteia'])assert.ok(content.includes(project.toLocaleLowerCase('pt-BR')),'Current editorial seasons: '+project);
    assert.equal(await socialPage.locator('[data-feed-mode]').count(),0,'Obsolete aesthetic alternation is absent');
  } finally { await socialPage.close(); }
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
  assert.equal(await page.locator('.state-explorer, #state-morph-svg, #transformacao, #ferramenta, #regras').count(),0,
    'Retired contour, Motion and tools sections must not reappear in Symbols');
  assert.equal(await page.locator('#tridimensional.lm-3d-section').count(),1,
    'Exactly one 3D section in the Symbols chapter');
  assert.deepEqual(await page.locator('#lm-vasos3d [data-vaso]').evaluateAll(els=>els.map(x=>x.getAttribute('data-vaso'))),
    ['1','2','3','4','5','6','7','8','9'], '3D models are indexed by approved numeric names, not array order');
  assert.equal(await page.locator('#tridimensional canvas').count(),1,
    '3D models are presented in a single navigable canvas');
  assert.equal(await page.locator('#uso.lm-identity-application .lm-application-axis').count(),6,
    'Six approved application units remain in Symbols');
  assert.equal(await page.locator('#uso video, .motion-symbol-preview video').count(),0,
    'Motion videos belong to the Motion chapter only');
  const expanded = page.locator('#uso .lm-application-expanded');
  assert.equal(await expanded.locator('.lm-expanded-field').count(),2,'Expanded M has two continuous side fields');
  assert.equal(await expanded.locator('.lm-expanded-center img').getAttribute('src'),'/identidade/M.svg',
    'Expanded M uses approved central geometry');
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    const fields=await expanded.evaluate(el=>{
      const left=el.querySelector('.lm-expanded-field');
      const right=el.querySelector('.lm-expanded-field:last-child');
      const img=el.querySelector('.lm-expanded-center img');
      const bb=e=>e.getBoundingClientRect();
      const a=bb(left),b=bb(right),m=bb(img),frame=bb(el);
      return {
        frameWidth:frame.width,leftWidth:a.width,rightWidth:b.width,
        sideColor:getComputedStyle(left).backgroundColor,
        otherColor:getComputedStyle(right).backgroundColor,
        imageLoaded:img.complete&&img.naturalWidth>0,
        aspectError:Math.abs((m.width/m.height)-(img.naturalWidth/img.naturalHeight))
      };
    });
    assert.ok(fields.frameWidth>0&&fields.leftWidth>8&&fields.rightWidth>8,
      'Expanded M must fill both sides on '+width);
    assert.equal(fields.sideColor,fields.otherColor,'Expanded sides use a single color');
    assert.ok(fields.imageLoaded&&fields.aspectError<0.02,
      'Expanded M must preserve the SVG central proportions on '+width);
    await expanded.screenshot({path:`symbols-proof/${phase}-expanded-m-${width}.png`});
  }
  // The 3D gallery loads only when visible. Complete the real GLB downloads
  // before navigating this page to /editor, otherwise Chromium aborts an
  // in-flight P1.glb fetch and reports a false network regression.
  // Do not suppress ERR_ABORTED: assert that the viewer actually loads all
  // nine approved numeric models and that the selection is functional.
  const vesselGallery=page.locator('#lm-vasos3d');
  await vesselGallery.scrollIntoViewIfNeeded();
  const loadedVessels=[];
  for(const number of [1,2,3,4,5,6,7,8,9]){
    if(number!==1) await vesselGallery.locator('[data-vaso="'+number+'"]').click();
    await page.waitForFunction(n=>{
      const el=document.querySelector('#lm-vasos3d');
      return el?.dataset.active===String(n)&&el.dataset.ready==='true';
    },number,{timeout:45000});
    assert.equal(await vesselGallery.locator('[data-vaso="'+number+'"]').getAttribute('aria-pressed'),'true',
      'Selected 3D vessel '+number+' must be active after its model loads');
    const modelState=await vesselGallery.evaluate(el=>({
      rendered:el.dataset.rendered,
      modelCount:el.dataset.modelCount,
      fallback:getComputedStyle(el.querySelector('.lm-3d-fallback')).display
    }));
    assert.equal(modelState.rendered,String(number),'Rendered 3D vessel must match the selected number');
    assert.equal(modelState.modelCount,'1','Exactly one 3D model may occupy the scene');
    assert.equal(modelState.fallback,'none','Temporary silhouette must not overlap a rendered 3D vessel');
    loadedVessels.push(number);
  }
  // Revisit a cached model and switch quickly: the previous model must be
  // removed and its centering must not accumulate across selections.
  for(const number of [1,9,2,1]){
    await vesselGallery.locator('[data-vaso="'+number+'"]').click();
    await page.waitForFunction(n=>{
      const el=document.querySelector('#lm-vasos3d');
      return el?.dataset.rendered===String(n)&&el?.dataset.modelCount==='1';
    },number,{timeout:15000});
  }
  assert.equal(await vesselGallery.getAttribute('data-rendered'),'1','Rapid re-selection ends at the final requested vessel');
  const canvasSize=await vesselGallery.locator('canvas').evaluate(el=>({width:el.width,height:el.height}));
  assert.ok(canvasSize.width>0&&canvasSize.height>0,'The 3D canvas must have a rendering surface');
  report.threeDimensional={loadedVessels,canvasSize};
  await vesselGallery.screenshot({path:`symbols-proof/${phase}-vessels-3d-390.png`});
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
    assert.equal(await motionPage.locator('video[data-motion-ink][muted][loop][playsinline]:not([controls])').count(),8);
    assert.equal(await motionPage.locator('.motion-card video').evaluateAll(videos=>videos.every(v=>v.paused&&!v.autoplay)),true);
    await motionPage.locator('.motion-card .motion-ink-toggle').first().click();
    await motionPage.waitForFunction(()=>document.querySelector('.motion-card video').currentTime>0.1);
    assert.match(await motionPage.locator('main').innerText(),/M, VASOS E MATTAR/,'Approved transformations are explained');
    for(const width of [1440,390]){
      await motionPage.setViewportSize({width,height:900});
      assert.equal(await motionPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No Motion document overflow');
      await motionPage.screenshot({path:`symbols-proof/${phase}-motion-gallery-${width}.png`,fullPage:true});
    }
    report.motion={groups:[1,4,3],players:8,statusLabels:false,readerInitiatedPlayback:true};
  }finally{await motionPage.close();}
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('header.top').count(),0,'Obsolete local navigation removed');
  assert.equal(await page.locator('.lm-site-nav a[data-area="simbolos"][aria-current="page"]').count(),1,
    'Canonical navigation identifies the Symbols chapter');
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
