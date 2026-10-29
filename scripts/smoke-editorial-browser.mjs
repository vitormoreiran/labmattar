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
  if(await page.locator('.area-group').count()!==4)throw Error('Editor must start with four editorial areas');
  if(await page.locator('.area-group[data-area-group="atos"] .page-entry').count()!==3)throw Error('Atos should group three pages in initial data');
  if(await page.locator('.page-entry').count()!==7)throw Error('No page may be lost during migration');
  await page.locator('#structureTab').click();
  if(await page.locator('.profile-choice').count()!==7)throw Error('Seven structural models must be visually demonstrated');
  if(await page.locator('#pageSectionSelect').inputValue()!=='intro')throw Error('Opening must belong to introduction');
  await page.screenshot({path:'editorial-inspector-structure.png',fullPage:true});
  await page.locator('#contentTab').click();
  if(await page.locator('#textFlowOverview .reading-role').count()<3)throw Error('Reading hierarchy not shown');
  if(await page.locator('.field-metrics').count()<3)throw Error('Text metrics not shown');
  await page.screenshot({path:'editorial-inspector-text.png',fullPage:true});
  await page.locator('#mediaTab').click();
  if(await page.locator('#mediaLibrary .media-library-item').count()!==3)throw Error('Three Cada Corpo images must be in integrated library');
  if(await page.locator('#treatmentCards .treatment-choice').count()!==5)throw Error('Five media treatments must be demonstrated');
  await page.locator('#librarySearch').fill('Detalhe');
  if(await page.locator('#mediaLibrary .media-library-item').count()!==1)throw Error('Media library search is not filtering');
  await page.locator('#librarySearch').fill('');
  await page.screenshot({path:'editorial-inspector-library.png',fullPage:true});
  await page.locator('#structureTab').click();
  await page.locator('.page-entry').nth(2).click();
  if(await page.locator('#pageSectionSelect').inputValue()!=='atos')throw Error('Development must belong to Atos');
  await page.locator('#sectionBackgroundSelect').selectOption('179');
  await page.locator('.page-entry').nth(3).click();
  if(!(await page.locator('#ambientPhoto').getAttribute('src')).includes('BOXDOSENTIR-179.jpg'))
    throw Error('Background did not persist across pages in same area');
  await page.locator('#sectionBackgroundSelect').selectOption('151');
  await page.locator('.page-entry').first().click();
  await page.locator('#addAreaButton').click();
  if(await page.locator('.area-group').count()!==5)throw Error('Adding editorial area failed');
  await page.locator('#undoButton').click();
  if(await page.locator('.area-group').count()!==4)throw Error('Undo did not restore four areas');
  await page.locator('.page-entry').first().click();

  // The UI icon language must render from symbols, not from missing-font glyphs.
  const uiCheck=await page.evaluate(()=>{
    const useIds=[...document.querySelectorAll('.editor-header .ui-icon use')].map(el=>el.getAttribute('href'));
    const missing=useIds.filter(href=>!document.querySelector(href));
    const rgb=style=>{const match=style.match(/[\d.]+/g);return match?.slice(0,3).map(Number)||[]};
    const luminance=values=>{const v=values.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
    const ratio=(fg,bg)=>{const l1=luminance(rgb(fg)),l2=luminance(rgb(bg));return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)};
    const pairs=[
      ['#pagesTotal','.page-section-head'],
      ['#inspectorPageName','.inspector-heading'],
      ['#previewButton','#previewButton'],
      ['#layoutStatus','.stage-footline']
    ].map(([fgSelector,bgSelector])=>{
      const fg=getComputedStyle(document.querySelector(fgSelector)).color;
      const bg=getComputedStyle(document.querySelector(bgSelector)).backgroundColor;
      return{element:fgSelector,ratio:Number(ratio(fg,bg).toFixed(2)),fg,bg};
    });
    return{symbolCount:document.querySelectorAll('.ui-icon-sprite symbol').length,missing,useIds,pairs};
  });
  if(uiCheck.symbolCount<20||uiCheck.missing.length)throw Error('Missing or unusable SVG icons: '+JSON.stringify(uiCheck));
  if(uiCheck.pairs.some(item=>item.ratio<4.5))throw Error('Low contrast in main UI: '+JSON.stringify(uiCheck.pairs));
  if(!(await page.locator('#viewportIconUse').getAttribute('href')).includes('ui-smartphone'))throw Error('Incorrect initial viewport icon');
  if(!(await page.locator('#previewIconUse').getAttribute('href')).includes('ui-eye'))throw Error('Incorrect initial preview icon');
  console.log('UI CONTRAST',JSON.stringify(uiCheck.pairs));

  const typography=await page.evaluate(()=>{
    const selectors=[
      '.editor-header .editor-brand',
      '#documentTitle',
      '.sidebar-tabs button',
      '.page-section-head strong',
      '.editor-sidebar .page-meta strong',
      '.inspector-tabs button',
      '.inspector-panel .field-group label',
      '.inspector-panel textarea',
      '.editor-stage .stage-topline'
    ];
    const values=selectors.map(selector=>{
      const node=document.querySelector(selector);
      const s=getComputedStyle(node);
      return {selector,family:s.fontFamily,weight:s.fontWeight,synthesis:s.fontSynthesis,
        size:s.fontSize,color:s.color};
    });
    const backgrounds=['.editor-header','.editor-sidebar','.editor-inspector',
      '.page-section-head','.editor-stage .stage-topline']
      .map(selector=>({selector,background:getComputedStyle(document.querySelector(selector)).backgroundColor}));
    const flag=getComputedStyle(document.querySelector('.editor-header .save-status'),'::before').display;
    return {values,backgrounds,statusDot:flag};
  });
  for(const entry of typography.values){
    if(!entry.family.includes('LMUnivers')||entry.weight!=='300'||entry.synthesis!=='none')
      throw Error('Univers Light mismatch on editor chrome: '+JSON.stringify(entry));
  }
  for(const item of typography.backgrounds){
    const channels=item.background.match(/[\d.]+/g)?.slice(0,3).map(Number);
    if(!channels||Math.max(...channels)-Math.min(...channels)>10)
      throw Error('Decorative color in editor chrome: '+JSON.stringify(item));
  }
  if(typography.statusDot!=='none')throw Error('Decorative colored status marker remains');
  console.log('UI TYPE',JSON.stringify(typography.values));


  // Contrast is not a permanently darkened photo: test the actual on/off
  // state by moving the original M behind the title, then restore geometry.
  const initialContrast=await page.evaluate(()=>{
    const art=document.querySelector('#artboard');
    return {background:art.dataset.contrastBackground,m:art.dataset.contrastM};
  });
  if(initialContrast.background!=='true'||initialContrast.m!=='false')
    throw Error('Unexpected automatic contrast in separated desktop layout: '+JSON.stringify(initialContrast));
  const testGeometry=await page.evaluate(()=>{
    const art=document.querySelector('#artboard');
    const mask=document.querySelector('.masked-photo');
    const title=document.querySelector('.content-title');
    const bounds=art.getBoundingClientRect();
    const titleRect=title.getBoundingClientRect();
    mask.style.left=(titleRect.left-bounds.left+8)+'px';
    mask.style.top=(titleRect.top-bounds.top+8)+'px';
    mask.style.transform='none';
    window.dispatchEvent(new Event('resize'));
    const m=mask.getBoundingClientRect();
    return {title:{x:titleRect.x,y:titleRect.y,w:titleRect.width,h:titleRect.height},m:{x:m.x,y:m.y,w:m.width,h:m.height}};
  });
  console.log('MASK CONTRAST TEST GEOMETRY',JSON.stringify(testGeometry));
  await page.waitForFunction(()=>document.querySelector('#artboard')?.dataset.contrastM==='true',null,{timeout:6000});
  const maskShade=await page.evaluate(()=>({
    background:getComputedStyle(document.querySelector('.masked-photo'),'::after').backgroundColor,
    opacity:getComputedStyle(document.querySelector('.masked-photo'),'::after').opacity
  }));
  if(!maskShade.background.includes('0.2')||maskShade.opacity!=='1')
    throw Error('20% black veil missing when text overlaps M: '+JSON.stringify(maskShade));
  await page.evaluate(()=>{
    const mask=document.querySelector('.masked-photo');
    mask.style.removeProperty('left');
    mask.style.removeProperty('top');
    mask.style.removeProperty('transform');
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForFunction(()=>document.querySelector('#artboard')?.dataset.contrastM==='false');
  await geometry('restored after overlap test',{expectedLayout:'compact'});
  for(let i=0;i<7;i++){
    await page.locator('.page-entry').nth(i).click();
    await geometry('edit page '+(i+1));
  }
  await page.locator('.page-entry').first().click();
  const thumbnailCount=await page.locator('.page-thumb img').count();
  if(thumbnailCount<4)throw Error('Navigation must show real project thumbnails: '+thumbnailCount);
  const pageWidth=async()=>(await page.locator('#artboard').boundingBox()).width;
  const canvasInitial=await pageWidth();
  await page.locator('#togglePagesButton').click();
  if(await page.locator('#editorSidebar').isVisible())throw Error('Pages panel was not collapsed');
  const canvasNoPages=await pageWidth();
  if(canvasNoPages<canvasInitial+140)throw Error('Collapsing pages did not enlarge the canvas');
  await page.locator('#togglePagesButton').click();
  if(!(await page.locator('#editorSidebar').isVisible()))throw Error('Pages panel did not reopen');
  await page.locator('#toggleInspectorButton').click();
  if(await page.locator('#editorInspector').isVisible())throw Error('Inspector did not collapse');
  const canvasNoInspector=await pageWidth();
  if(canvasNoInspector<canvasInitial+160)throw Error('Collapsing inspector did not enlarge the canvas');
  await page.locator('#toggleInspectorButton').click();
  if(!(await page.locator('#editorInspector').isVisible()))throw Error('Inspector did not reopen');
  await page.locator('#fileActions summary').click();
  if(!(await page.locator('#importButton').isVisible()))throw Error('File menu is inaccessible');
  await page.locator('#fileActions summary').click();
  const firstPage=await page.locator('.page-entry').nth(2).getAttribute('data-p');
  const secondPage=await page.locator('.page-entry').nth(3).getAttribute('data-p');
  await page.locator('.page-entry').nth(3).dragTo(page.locator('.page-entry').nth(2));
  if((await page.locator('.page-entry').nth(2).getAttribute('data-p'))!==secondPage)throw Error('Drag and drop did not reorder pages inside area');
  await page.locator('.page-entry').nth(2).dragTo(page.locator('.page-entry').nth(3));
  if((await page.locator('.page-entry').nth(2).getAttribute('data-p'))!==firstPage)throw Error('Drag and drop did not restore area order');
  await page.locator('.page-entry').first().click();
  await page.screenshot({path:'editorial-interface-panels.png',fullPage:true});
  await page.screenshot({path:'editorial-composition-edit.png',fullPage:true});
  await page.locator('#previewButton').click();
  await page.locator('.editor.is-preview').waitFor();
  if(await page.locator('#previewLabel').textContent()!=='Editar')throw Error('Preview label was not updated');
  if(await page.locator('#previewIconUse').getAttribute('href')!=='#ui-pencil')throw Error('Preview icon disappeared while switching mode');
  await geometry('opening full bleed',{expectedLayout:'wide',fullBleed:true});
  if(!(await page.locator('#storyViewer').isVisible()))throw Error('Continuous reading viewport is hidden');
  if(await page.locator('#storyViewer .story-area').count()!==4)throw Error('Reading preview must contain the four areas');
  const readingPages=await page.locator('#storyViewer .story-page').count();
  if(readingPages!==7)throw Error('Continuous reading lost some page content: '+readingPages);
  if(await page.locator('#storyViewer .story-area[data-story-area-id="atos"] .story-page').count()!==3)
    throw Error('Atos must be continuous inside one background region');
  const fixed=await page.evaluate(async()=>{
    const view=document.querySelector('#storyViewer');
    const area=view.querySelector('[data-story-area-id="atos"]');
    const top=area.getBoundingClientRect().top-view.getBoundingClientRect().top+view.scrollTop;
    view.scrollTop=top+70;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const backdrop=area.querySelector('.story-area-backdrop');
    const text=area.querySelector('.story-page-copy');
    const initial={back:backdrop.getBoundingClientRect().top,text:text.getBoundingClientRect().top};
    view.scrollTop+=180;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const after={back:backdrop.getBoundingClientRect().top,text:text.getBoundingClientRect().top};
    return {initial,after,areaHeight:area.getBoundingClientRect().height,viewportHeight:view.clientHeight};
  });
  if(Math.abs(fixed.after.back-fixed.initial.back)>4 || Math.abs(fixed.after.text-fixed.initial.text+180)>6)
    throw Error('Area background must stay fixed while content scrolls: '+JSON.stringify(fixed));
  await page.screenshot({path:'editorial-sequence-sticky-background.png',fullPage:true});
  await page.evaluate(()=>{document.querySelector('#storyViewer').scrollTop=0});
  await page.screenshot({path:'editorial-composition-wide.png',fullPage:true});
  for(let i=1;i<7;i++){
    await page.evaluate(i=>document.querySelectorAll('.page-entry')[i].click(),i);
    await geometry('preview page '+(i+1),{fullBleed:true});
  }
  await page.evaluate(()=>document.querySelectorAll('.page-entry')[0].click());
  await page.locator('#viewportButton').click();
  if(await page.locator('#viewportLabel').textContent()!=='Desktop'||await page.locator('#viewportIconUse').getAttribute('href')!=='#ui-monitor')throw Error('Viewport icon/label did not switch');
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
  await page.locator('.profile-choice[data-profile-choice="development"]').click();
  await geometry('changed editorial profile');
  await page.locator('#mediaTab').click();
  await page.locator('.treatment-choice[data-treatment-choice="m-detalhe"]').click();
  await geometry('changed media treatment');
  await page.locator('.media-library-item[data-library-id="151"]').click();
  if(!(await page.locator('#mediaPreviewImage').getAttribute('src')).includes('BOXDOSENTIR-151.jpg'))throw Error('Contextual media preview did not update');
  await page.locator('#mediaZoom').fill('135');
  if(await page.locator('#mediaZoomValue').textContent()!=='135%')throw Error('Media zoom is not reflected in inspector');
  if(await page.locator('#mediaAlt').isDisabled())throw Error('Image accessibility fields should be editable');
  await page.screenshot({path:'editorial-interface-media.png',fullPage:true});
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
