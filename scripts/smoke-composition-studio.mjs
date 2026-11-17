import {chromium,webkit} from "playwright";
import {revealInspectorOptions,selectInspectorModule} from './studio-test-controls.mjs';

const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/compor.html";
const engine=process.env.COMPOSITION_BROWSER==="webkit"?webkit:chromium;
const browser=await engine.launch({headless:true,...(engine===chromium?{args:["--no-sandbox"]}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
const assert=(v,m)=>{if(!v)throw Error(m)};

async function choose(group,value){
  const module={format:"superficie",background:"fundo",color:"fundo",mContent:"m",
    marker:"m",markerFocus:"m",mPresentation:"m",photo:"fundo",type:"texto",bodyMode:"texto"}[group];
  if(module&&await page.locator("body").evaluate(el=>el.classList.contains("lm-studio-open")))
    await selectInspectorModule(page,module,{fine:true});
  if(group==="mContent"||group==="marker"||group==="mPresentation"){
    const id=group==="mContent"?"labMContent":group==="marker"?"labMarker":"labMPresentation";
    await page.locator("#"+id).evaluate((el,next)=>{
      el.value=next;
      el.dispatchEvent(new Event("change",{bubbles:true}));
    },value);
    await page.waitForTimeout(80);
    return;
  }
  await page.locator('[data-lab-choice="'+group+'"][data-value="'+value+'"]').click();
  await page.waitForTimeout(80);
}

try{
  await page.goto(base+"?studio=1#laboratorio",{waitUntil:"load",timeout:60000});
  await page.evaluate(()=>document.fonts.ready);

  assert(await page.locator("body").evaluate(el=>el.classList.contains("lm-studio-open")),
    "Focused editor did not open");
  assert(await page.locator("#labStudioToggleText").textContent()==="VOLTAR AO LABORATÓRIO",
    "Focused editor exit is missing");
  assert(await page.locator("[data-studio-tool]").count()===0,
    "Focused mode must not build a second tool architecture");
  assert(await page.locator(".lm-composition-module-index").isVisible(),
    "Unified module index must remain visible in focused mode");

  // The inspector is a tool, not a second printed manual. Keep live controls
  // and explicit help; static declarations must not occupy its workspace.
  assert(await page.locator(".lm-image-invariant, .lm-composition-submodule-head, .lm-lab-system-statement, .lm-inspector-more-count").count()===0,
    "Decorative statements and inert legends must not return to the official inspector");
  assert(await page.locator("#labPanel-texto .lm-inspector-panel-heading small, #labPanel-imagem .lm-inspector-panel-heading small").count()===0,
    "Panel headings must not duplicate their live control names");
  for(const group of ["type","bodyMode","color"]){
    assert(await page.locator('[data-lab-choice="'+group+'"] .lm-ctrl-meta').count()===0,
      group+" choices must show function labels, not editorial filler");
  }
  await page.screenshot({path:"laboratorio-interface-desktop.png"});
  assert((await page.locator('.lm-composition-module-index>button').allTextContents()).join('|')==='IMAGEM|TEXTO|M|ASSINAR',
    'The four everyday tools must remain visible in order');
  assert(await page.locator('.lm-studio-secondary').evaluate(element=>!element.open),
    'Secondary controls start collapsed');
  await revealInspectorOptions(page,{fine:true});
  assert(await page.locator('.lm-studio-details-toggle').getAttribute('aria-expanded')==='true',
    'Advanced controls must be reachable through Mais opções and Ajustes finos');
  // O M é uma única figura escalável, com ativação e deslocamento.
  await page.locator('button[data-mobile-module="m"]').click();
  const toggle=page.locator('#labMEnabled');
  assert(await toggle.isVisible(),'M must expose a single enabled switch');
  await toggle.uncheck();
  assert(await page.locator('#labArtboard').getAttribute('data-m-content')==='off',
    'Switch must remove M without modifying authored page');
  await toggle.check();
  assert(await page.locator('#labArtboard').getAttribute('data-m-content')!=='off',
    'Switch must restore M using existing material');
  const scale=page.locator('#labMScale');
  assert(await scale.isVisible()&&!await scale.isDisabled(),
    'Scale must remain editable in M tool');
  await scale.fill('60');
  const small=await page.locator('#labMask').evaluate(n=>n.getBoundingClientRect().width);
  await scale.fill('100');
  const expanded=await page.locator('#labMask').evaluate(n=>n.getBoundingClientRect().width);
  assert(expanded>small*2,'M must grow continuously to expanded state');
  assert(await page.locator('#labArtboard').getAttribute('data-m-presentation')==='completo',
    'Maximum scale must reach the expanded M');
  assert(await scale.isVisible()&&!await scale.isDisabled(),
    'Expanded M must remain adjustable');
  const vertical=page.locator('#labMPositionY');
  assert(await vertical.isVisible(),'M has one vertical position control at every scale');
  const centered=await page.locator('#labMask').evaluate(n=>({
    top:n.getBoundingClientRect().top,mask:n.style.webkitMaskImage
  }));
  await vertical.fill('80');
  const moved=await page.locator('#labMask').evaluate(n=>({
    top:n.getBoundingClientRect().top,mask:n.style.webkitMaskImage
  }));
  assert(Math.abs(moved.top-centered.top)<1&&moved.mask!==centered.mask,
    'Vertical position must move the apertures while the expanded M still fills the page');
  await page.locator('#labMPositionField [data-lab-center="mPositionY"]').click();
  assert(await vertical.inputValue()==='50','Center action must restore 50 percent');
  await scale.fill('99');
  assert(await page.locator('#labArtboard').getAttribute('data-m-presentation')==='elemento',
    'Reducing scale must recover the entire M element');
  await toggle.uncheck();
  await choose("background","color");
  // Reproduce the exact text entrance used in the normative Typography chapter.
  // Playback must be reversible and must never mutate authored or editable text.
  const playButton=page.locator("#labMotionPlay");
  assert(await playButton.isVisible(),"Play must be available next to the page preview");
  await choose("bodyMode","visivel");
  const authored=await page.locator("#labReading").evaluate(reading=>reading.textContent);
  await playButton.click();
  const firstPass=await page.locator("#labArtboard").evaluate(board=>({
    active:board.dataset.motionPlaying,
    layers:board.querySelectorAll(".lm-lab-motion-layer").length,
    roles:[...board.querySelectorAll(".lm-lab-motion-layer .lm-lab-kicker, .lm-lab-motion-layer .lm-lab-title, .lm-lab-motion-layer .lm-lab-body, .lm-lab-motion-layer .lm-lab-bottom")].length,
    source:board.querySelector("#labReading").textContent,
    duplicates:board.querySelectorAll("#labRenderedTitle").length,
    ghostA11y:board.querySelector(".lm-lab-motion-layer")?.getAttribute("aria-hidden"),
    motion:board.querySelector(".lm-lab-motion-word")?.getAnimations().length||0
  }));
  assert(firstPass.active==="true"&&firstPass.layers===1&&firstPass.roles===4&&
    firstPass.source===authored&&firstPass.duplicates===1&&firstPass.ghostA11y==="true",
    "Text entrance must animate 3 existing roles without cloning editable IDs: "+JSON.stringify(firstPass));
  assert(await playButton.locator("#labMotionPlayText").textContent()==="REINICIAR",
    "Play must replay immediately, not change to a dead button");
  await playButton.click();
  assert(await page.locator("#labArtboard").getAttribute("data-motion-playing")==="true",
    "Play must restart the same animation on every click");
  await page.waitForTimeout(1650);
  const finished=await page.locator("#labArtboard").evaluate(board=>({
    active:board.hasAttribute("data-motion-playing"),
    ghosts:board.querySelectorAll(".lm-lab-motion-layer, [data-motion-clone]").length,
    source:board.querySelector("#labReading").textContent
  }));
  assert(!finished.active&&finished.ghosts===0&&finished.source===authored,
    "Playback must restore the original editable document after completion: "+JSON.stringify(finished));

  await choose("mContent","solid");
  await playButton.click();
  const solidPass=await page.locator("#labArtboard").evaluate(board=>({
    active:board.dataset.motionPlaying,
    base:board.querySelectorAll(".lm-lab-motion-layer").length,
    contrast:board.querySelectorAll(".lm-lab-solid-contrast[data-motion-clone]").length
  }));
  assert(solidPass.active==="true"&&solidPass.base===1&&solidPass.contrast===1,
    "A solid M requires the same moving dark text inside its vector mask: "+JSON.stringify(solidPass));
  await page.locator('button[data-mobile-module="texto"]').click();
  assert(await page.locator(".lm-lab-motion-layer, .lm-lab-solid-contrast[data-motion-clone]").count()===0,
    "Changing a tool must stop playback and unblock direct editing");
  await choose("mContent","off");
  await choose("bodyMode","oculto");
  await page.locator('button[data-mobile-module="m"]').click();
  assert(await page.locator('#labMEnabled').isVisible(),
    'M tool must stay simple and accessible after editing other panels');
  // Seven operational help cards replace the static construction prose.
  const tourTrigger=page.locator("#labTourStudioHelp");
  assert(await tourTrigger.isVisible(),"Focused editor must expose Dúvidas in its own toolbar");
  const beforeTour=await page.locator("#labArtboard").evaluate(board=>({
    format:board.dataset.format,title:board.querySelector("#labRenderedTitle").textContent,
    body:board.querySelector("#labRenderedBody").textContent
  }));
  await tourTrigger.click();
  await page.screenshot({path:"laboratorio-ajuda-desktop.png"});
  const tour=page.locator("#labHelp-overview");
  const titles=[
    "Como funciona","Superfície e margem","M e geometria",
    "Área de leitura","Título, Corpo e Detalhe","Imagem e contraste","Revisar e exportar"
  ];
  assert(await tour.isVisible()&&await tour.getAttribute("role")==="dialog"&&
         await tourTrigger.getAttribute("aria-expanded")==="true",
    "Dúvidas must open the accessible guided help dialog");
  for(let step=0;step<titles.length;step++){
    assert((await page.locator("#labTourTitle").textContent())===titles[step],
      "Tour card order must be stable at step "+(step+1));
    assert((await page.locator("#labTourProgress").textContent())===
      String(step+1).padStart(2,"0")+" / 07",
      "Tour must show its current step");
    const spotlight=await page.locator(".lm-help-tour-spotlight").evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {visible:!el.hidden,width:r.width,height:r.height,top:r.top,left:r.left};
    });
    assert(spotlight.visible&&spotlight.width>0&&spotlight.height>0,
      "Each card must highlight a real target: "+JSON.stringify(spotlight));
    if(step===1){
      await page.locator("#labTourBack").click();
      assert((await page.locator("#labTourTitle").textContent())===titles[0],
        "Voltar returns to the preceding help card");
      await page.locator("#labTourNext").click();
    }
    await page.locator("#labTourNext").click();
  }
  assert(await tour.isHidden()&&await tourTrigger.getAttribute("aria-expanded")==="false",
    "Concluir must close the tour");
  assert(await page.locator('button[data-mobile-module="m"]').getAttribute("aria-pressed")==="true",
    "Closing tour restores the previous inspector module");
  const afterTour=await page.locator("#labArtboard").evaluate(board=>({
    format:board.dataset.format,title:board.querySelector("#labRenderedTitle").textContent,
    body:board.querySelector("#labRenderedBody").textContent
  }));
  assert(JSON.stringify(beforeTour)===JSON.stringify(afterTour),
    "Help must not change authored composition state");
  await tourTrigger.click();
  await page.keyboard.press("Escape");
  assert(await tour.isHidden()&&await tourTrigger.getAttribute("aria-expanded")==="false",
    "Escape must close the tour at any point");



  assert(await page.locator("#labPanel-imagem").isVisible() &&
         await page.locator("#labPanel-pagina").isHidden() &&
         await page.locator("#labPanel-texto").isHidden(),
    "The selected module alone must be visible in the focused editor");

  const baseline=await page.locator("#labArtboard").evaluate(el=>({
    mx:getComputedStyle(el).getPropertyValue("--lab-m-x").trim(),
    scale:document.querySelector("#labMScale").value,
    logicalWidth:parseFloat(getComputedStyle(el).width),
    logicalHeight:parseFloat(getComputedStyle(el).height)
  }));

  // Measure the compact everyday menu after exercising its optional controls.
  if(await page.locator('.lm-studio-secondary').evaluate(element=>element.open))
    await page.locator('.lm-studio-secondary>summary').click();
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(120);
  const desktopLayout=await page.evaluate(()=>{
    const workspace=document.querySelector(".lm-lab-workspace").getBoundingClientRect();
    const preview=document.querySelector(".lm-lab-preview").getBoundingClientRect();
    const inspector=document.querySelector(".lm-lab-inspector").getBoundingClientRect();
    const menu=document.querySelector(".lm-composition-module-index").getBoundingClientRect();
    const board=document.querySelector("#labArtboard").getBoundingClientRect();
    return {
      workspace:{width:workspace.width,height:workspace.height},
      preview:{width:preview.width,height:preview.height},
      inspector:{width:inspector.width,height:inspector.height},
      menu:{width:menu.width,height:menu.height},
      board:{width:board.width,height:board.height}
    };
  });
  assert(desktopLayout.preview.width>desktopLayout.inspector.width*2,
    "Desktop canvas must dominate the inspector: "+JSON.stringify(desktopLayout));
  assert(desktopLayout.inspector.width>=330&&desktopLayout.inspector.width<=380,
    "Desktop inspector must remain compact: "+JSON.stringify(desktopLayout.inspector));
  assert(desktopLayout.board.width>500&&desktopLayout.board.height>280,
    "Desktop artboard must remain clearly visible: "+JSON.stringify(desktopLayout.board));
  assert(desktopLayout.menu.height<170,
    "Desktop module menu must remain compact: "+JSON.stringify(desktopLayout.menu));
  const layoutIntegrity=await page.evaluate(()=>{
    const inspector=document.querySelector(".lm-lab-inspector").getBoundingClientRect();
    const stage=document.querySelector(".lm-lab-stage").getBoundingClientRect();
    const board=document.querySelector("#labArtboard").getBoundingClientRect();
    const buttons=[...document.querySelectorAll(".lm-composition-module-index button")];
    const exit=document.querySelector("#labStudioToggleText");
    return {inspectorRight:inspector.right, viewport:innerWidth,
      boardInside:board.left>=stage.left-1&&board.right<=stage.right+1&&board.top>=stage.top-1&&board.bottom<=stage.bottom+1,
      labelsFit:buttons.every(b=>b.scrollWidth<=b.clientWidth+1),
      exitVisible:exit.getBoundingClientRect().width>20};
  });
  assert(layoutIntegrity.inspectorRight<=layoutIntegrity.viewport+1 && layoutIntegrity.boardInside &&
         layoutIntegrity.labelsFit && layoutIntegrity.exitVisible,
    "Editor controls and artboard must fit without clipping: "+JSON.stringify(layoutIntegrity));
  assert(baseline.mx==="50%","M must remain on the central axis");
  assert(Math.abs(baseline.logicalWidth-1280)<1&&Math.abs(baseline.logicalHeight-720)<1,
    "Horizontal artboard must keep fixed logical geometry");

  await choose("background","photo");
  await choose("mContent","photo");
  const scaleBefore=await page.locator("#labMScale").inputValue();
  await choose("marker","top");
  assert(await page.locator("#labMScale").inputValue()===scaleBefore,
    "Marcadores não alteram a escala do M");
  const marked=await page.locator("#labArtboard").evaluate(board=>({
    background:board.dataset.background,focus:board.dataset.markerFocus,
    marker:board.dataset.markerBlur,backdrop:board.dataset.backdrop,
    mask:getComputedStyle(board.querySelector("#labMarkerPhotoLayer")).webkitMaskImage,
    source:board.querySelector("#labAmbientPhoto").getAttribute("src"),
    overlay:board.querySelector("#labMarkerPhoto").getAttribute("src"),
    solid:getComputedStyle(board.querySelector("#labMask")).backgroundColor
  }));
  assert(marked.marker==="true"&&marked.background==="photo"&&
    marked.source===marked.overlay&&marked.mask.includes("data:image/svg"),
    "Marcador em fotografia recorta a mesma imagem, sem bloco de cor: "+JSON.stringify(marked));
  assert(await page.locator('[data-lab-choice="mContent"][data-value="solid"]').isVisible(),
    "M de cor deve permanecer disponível quando o fundo for fotografia");
  await choose("mContent","solid");
  assert(await page.locator("#labArtboard").getAttribute("data-m-content")==="solid",
    "A seleção de cor deve renderizar o M sólido sem alterar o fundo");
  await choose("mContent","photo");
  await choose("markerFocus","sharp");
  assert(await page.locator("#labArtboard").getAttribute("data-backdrop")==="blur",
    "Marcador nítido deve inverter a nitidez do restante da fotografia");

  await page.locator("#labMScale").fill("55");
  await page.locator("#labMScale").dispatchEvent("input");
  const geometry=await page.locator("#labArtboard").evaluate(el=>{
    const b=el.getBoundingClientRect();
    const m=el.querySelector("#labMask").getBoundingClientRect();
    return {mx:getComputedStyle(el).getPropertyValue("--lab-m-x").trim(),
      board:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},
      m:{left:m.left,right:m.right,top:m.top,bottom:m.bottom}};
  });
  assert(geometry.mx==="50%","M scale must not move the central axis");
  assert(geometry.m.left>=geometry.board.left-2&&geometry.m.right<=geometry.board.right+2,
    "M must stay within the page at the selected scale");

  await choose("marker","none");
  await choose("background","color");
  await choose("mContent","off");
  await choose("mContent","solid");
  assert(await page.locator('#labMEnabled').isVisible()&&
         await page.locator('#labArtboard').getAttribute('data-m-content')==='solid',
    "M sólido deve estar ativo na composição de cor");
  await choose("mContent","off");
  // Mesmo vetor, escala contínua e clipping consistente em cada formato.
  await choose("mContent","photo");
  await choose("format","vertical");
  assert(await page.locator("#labTextWidth").inputValue()==="100",
    "Vertical must preserve full reading width");
  await page.locator('button[data-mobile-module="m"]').click();
  const mMeasurement=async()=>page.locator("#labArtboard").evaluate(board=>{
    const b=board.getBoundingClientRect(),m=board.querySelector("#labMask").getBoundingClientRect();
    return {mode:board.dataset.mPresentation,
      frame:{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height},
      mask:{left:m.left,right:m.right,top:m.top,bottom:m.bottom,width:m.width,height:m.height}};
  });
  await page.locator("#labMScale").fill("70");
  const mElement=await mMeasurement();
  assert(mElement.mode==="elemento"&&mElement.mask.height<mElement.frame.height &&
         await page.locator("#labMask").isVisible(),
    "Smaller M must remain an intact element: "+JSON.stringify(mElement));
  await page.locator("#labMScale").fill("100");
  const mFull=await mMeasurement();
  const fullBackdrop=await page.locator("#labArtboard").evaluate(el=>{
    const ambient=el.querySelector(".lm-lab-photo-ambient");
    return {mode:el.dataset.backdrop,filter:getComputedStyle(ambient).filter,
      display:getComputedStyle(ambient).display,
      samePhoto:ambient.getAttribute("src")===el.querySelector("#labMaskPhoto").getAttribute("src")};
  });
  assert(fullBackdrop.mode==="blur"&&fullBackdrop.filter.includes("blur(")&&
         fullBackdrop.display!=="none"&&fullBackdrop.samePhoto,
    "Expanded M must retain photographic background: "+JSON.stringify(fullBackdrop));
  assert(mFull.mode==="completo"&&Math.abs(mFull.mask.height-mFull.frame.height)<2 &&
         Math.abs(mFull.mask.width-mFull.frame.width)<2 &&
         Math.abs(mFull.mask.left-mFull.frame.left)<2,
    "M at 200% must fill the entire artboard: "+JSON.stringify(mFull));
  const maskProof=await page.locator('#labMask').evaluate(node=>({
    mask:getComputedStyle(node).webkitMaskImage||getComputedStyle(node).maskImage,
    scale:node.closest('#labArtboard').querySelector('#labMScale')?.value
  }));
  assert(maskProof.mask.includes('data:image/svg'),"Expanded M must use a calculated aperture mask");
  assert(await page.locator("#labMScale").isEnabled(),
    "M at 200% must remain editable");
  await page.locator("#labArtboard").screenshot({path:"laboratorio-m-completo-vertical.png"});
  for(const format of ["horizontal","quadrado","editorial","vertical"]){
    await choose("format",format);
    await page.locator('button[data-mobile-module="m"]').click();
    await page.locator("#labMScale").fill("100");
    const geometry=await mMeasurement(),frame=geometry.frame,mask=geometry.mask;
    const aperture=await page.locator("#labArtboard").evaluate(board=>{
      const g=window.LabExpandedMaskGeometry(board.offsetWidth,board.offsetHeight,50);
      const other=window.LabExpandedMaskGeometry(board.offsetWidth*1.2,board.offsetHeight,50);
      return {rule:g.rule,hasHoles:g.path.includes("C"),equalY:g.path===other.path};
    });
    assert(geometry.mode==="completo" &&
           Math.abs(mask.height-frame.height)<2 &&
           Math.abs(mask.left-frame.left)<2 &&
           Math.abs(mask.right-frame.right)<2 &&
           aperture.rule==="evenodd"&&aperture.hasHoles&&!aperture.equalY,
      "Expanded M must cover the page with two invariant notches in "+format+": "+JSON.stringify({geometry,aperture}));
    const reading=await page.locator("#labArtboard").evaluate(board=>{
      const title=board.querySelector("#labRenderedTitle"),safe=board.querySelector("#labReading");
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right}};
      return {title:rect(title),safe:rect(safe),
        fragments:[...title.querySelectorAll(".lm-lab-title-line")].map(span=>({
          scroll:span.scrollWidth,width:span.clientWidth
        }))};
    });
    assert(reading.fragments.every(line=>line.scroll<=line.width+2) &&
           reading.title.left>=reading.safe.left-2 &&
           reading.title.right<=reading.safe.right+2,
      "Title must remain readable in "+format+": "+JSON.stringify(reading));
    await page.locator("#labArtboard").screenshot({path:"laboratorio-m-completo-"+format+".png"});
  }
  await page.locator("#labMScale").fill("70");
  assert((await mMeasurement()).mode==="elemento" &&
         await page.locator("#labMScale").isEnabled(),
    "Reducing scale must return to element without switching modes");
  await choose("format","horizontal");

  // The editor preview uses 90% of the limiting workspace dimension,
  // including when that requires enlarging a page above its logical size.
  await page.setViewportSize({width:2560,height:1440});
  for(const format of ["horizontal","vertical","quadrado","editorial"]){
    await choose("format",format);
    await page.waitForTimeout(120);
    const fit=await page.evaluate(()=>{
      const board=document.querySelector("#labArtboard"),stage=document.querySelector(".lm-lab-stage");
      const b=board.getBoundingClientRect(),s=stage.getBoundingClientRect();
      return {format:board.dataset.format,width:b.width,height:b.height,
        logicalW:board.offsetWidth,logicalH:board.offsetHeight,
        coverage:Math.max(b.width/s.width,b.height/s.height),
        inside:b.left>=s.left&&b.top>=s.top&&b.right<=s.right+1&&b.bottom<=s.bottom+1};
    });
    assert(Math.abs(fit.coverage-.9)<.005,
      "Desktop page preview must use 90% of its workspace: "+JSON.stringify(fit));
    assert(fit.inside&&Math.abs(fit.width/fit.height-fit.logicalW/fit.logicalH)<.002,
      "Enlarging the preview must keep every edge visible without distortion: "+JSON.stringify(fit));
    if(format==="editorial")assert(fit.width>fit.logicalW,
      "Large-screen preview must not be capped at the original 1000px page width");
  }
  await page.setViewportSize({width:1440,height:900});
  await choose("format","horizontal");

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(120);
  const previewGeometry=await page.evaluate(()=>{
    const workspace=document.querySelector(".lm-lab-workspace");
    const preview=document.querySelector(".lm-lab-preview");
    const stage=document.querySelector(".lm-lab-stage");
    const artboard=document.querySelector("#labArtboard");
    return {viewport:innerWidth,active:document.body.classList.contains("lm-studio-open"),
      workspaceStyle:workspace.getAttribute("style"),
      rows:getComputedStyle(workspace).gridTemplateRows,
      workspaceHeight:workspace.getBoundingClientRect().height,
      previewHeight:preview.getBoundingClientRect().height,
      previewCSSHeight:getComputedStyle(preview).height,
      stageHeight:stage.getBoundingClientRect().height,
      boardFormat:artboard.dataset.format,boardStyle:artboard.getAttribute("style")};
  });
  assert(previewGeometry.previewHeight>=200&&previewGeometry.previewHeight<previewGeometry.workspaceHeight*.5,
    "Mobile studio must fit the page while reserving space for its controls: "+JSON.stringify(previewGeometry));
  // A preview must scale the complete page uniformly, including all three
  // typography roles. Screen-size minimums must not change the composition.
  for(const format of ["vertical","horizontal","quadrado","editorial"]){
    await choose("format",format);
    await page.waitForTimeout(120);
    const legible=await page.locator("#labArtboard").evaluate(el=>{
      const zoom=el.getBoundingClientRect().width/el.offsetWidth;
      const size=selector=>parseFloat(getComputedStyle(el.querySelector(selector)).fontSize)*zoom;
      return {format:el.dataset.format,zoom,body:size("#labRenderedBody"),
        title:size("#labRenderedTitle"),detail:size("#labKicker"),
        preview:el.getBoundingClientRect().height,
        tokens:["title","body","detail"].map(role=>getComputedStyle(el).getPropertyValue("--lm-type-"+role+"-size").trim())};
    });
    assert(legible.preview>150&&legible.tokens.every(token=>parseFloat(token)>0),
      "Preview must keep all three page-relative typography roles: "+JSON.stringify(legible));
    const official=await page.locator("#labArtboard").evaluate(board=>{
      const read=selector=>parseFloat(getComputedStyle(board.querySelector(selector)).fontSize);
      const caption=board.querySelector(".lm-lab-signature-caption");
      return {
        body:read("#labRenderedBody"),
        detail:read("#labKicker"),
        footer:read("#labFooterRight"),
        composedDetail:caption?parseFloat(getComputedStyle(caption).fontSize):null,
        logicalBody:getComputedStyle(board).getPropertyValue("--lm-type-body-size").trim(),
        logicalDetail:getComputedStyle(board).getPropertyValue("--lm-type-detail-size").trim()
      };
    });
    assert(official.body===19&&official.detail===13&&official.footer===13&&
      official.composedDetail===13&&official.logicalBody==="19px"&&official.logicalDetail==="13px",
      "Corpo/Detalhe must use the manual's exact logical-page sizes, never a per-format override: "+
        format+" "+JSON.stringify(official));
    await page.setViewportSize({width:1440,height:900});
    await page.waitForTimeout(120);
    const desktopTokens=await page.locator("#labArtboard").evaluate(el=>
      ["title","body","detail"].map(role=>getComputedStyle(el).getPropertyValue("--lm-type-"+role+"-size").trim()));
    assert(JSON.stringify(legible.tokens)===JSON.stringify(desktopTokens),
      "Resizing the preview must not change the logical typography in "+format);
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(120);
    await page.locator("#labArtboard").screenshot({path:"laboratorio-tipografia-"+format+".png"});
  }
  await choose("format","horizontal");
  assert(await page.locator(".lm-composition-module-index").isVisible(),
    "Mobile module rail must remain visible");
  assert(await page.locator('button[data-mobile-module="superficie"]').getAttribute("aria-pressed")==="true",
    "Mobile editor must open with Surface selected");

  await page.locator('button[data-mobile-module="m"]').click();
  assert(await page.locator("#labPanel-imagem").isVisible()&&
         await page.locator("[data-submodule=m]").isVisible()&&
         await page.locator("[data-submodule=fundo]").isHidden(),
    "Mobile M module must isolate M controls without changing composition type");

  await page.locator('button[data-mobile-module="fundo"]').click();
  assert(await page.locator("[data-submodule=fundo]").isVisible()&&
         await page.locator("[data-submodule=m]").isHidden(),
    "Mobile Background module must isolate background controls");

  await page.locator('button[data-mobile-module="texto"]').click();
  assert(await page.locator("#labPanel-texto").isVisible()&&
         await page.locator("#labPanel-pagina").isHidden(),
    "Mobile Text module must show only text controls");

  const selectedStyle=await page.locator('button[data-mobile-module="texto"]').evaluate(el=>({
    pressed:el.getAttribute("aria-pressed"), background:getComputedStyle(el).backgroundColor,
    color:getComputedStyle(el).color
  }));
  assert(selectedStyle.pressed==="true" && selectedStyle.background==="rgb(38, 41, 35)" && selectedStyle.color==="rgb(255, 255, 255)",
    "Selected mobile module must remain clearly visible: "+JSON.stringify(selectedStyle));
  await page.screenshot({path:"laboratorio-interface-mobile.png"});
  // Three normative text treatments must be explicit and operational.
  const hierarchy=await page.locator("#labPanel-texto").evaluate(panel=>({
    title:panel.querySelector("#labTypeTitle")?.textContent.trim(),
    body:panel.querySelector("#labBodyModeTitle")?.textContent.trim(),
    detail:panel.querySelector("#labEditDetail")?.textContent.trim()
  }));
  assert(hierarchy.title?.includes("01 / TÍTULO")&&
         hierarchy.body?.includes("02 / CORPO")&&
         hierarchy.detail?.includes("03 / DETALHE"),
    "Text panel must explain the exact 3 normative treatments: "+JSON.stringify(hierarchy));
  const titleBefore=await page.locator("#labRenderedTitle").textContent();
  const bodyBefore=await page.locator("#labRenderedBody").textContent();
  await page.locator("#labEditDetail").click();
  assert(await page.locator("#labPanel-assinatura").isVisible()&&
         await page.locator('button[data-mobile-module="assinatura"]').getAttribute("aria-pressed")==="true",
    "Detail action must open the actual Signature editor, not an inert explanation");
  const detailEditor=page.locator("#labSignatureText");
  const previousDetail=await detailEditor.inputValue();
  await detailEditor.fill("DETALHE DE TESTE / 2026");
  const detailApplied=await page.locator("#labArtboard").evaluate(board=>
    [...board.querySelectorAll(".lm-lab-signature-slot[data-corner=tl] .lm-lab-signature-caption")]
      .some(node=>node.textContent==="DETALHE DE TESTE / 2026"));
  assert(detailApplied&&
         await page.locator("#labRenderedTitle").textContent()===titleBefore&&
         await page.locator("#labRenderedBody").textContent()===bodyBefore,
    "Editing Detalhe must alter only its existing signature content");
  await detailEditor.fill(previousDetail);
  await page.locator('button[data-mobile-module="texto"]').click();
  assert(await page.locator("#labEditDetail").isVisible(),
    "Return to Text must restore the Detalhe action");
  const mobilePlay=await playButton.evaluate(button=>{
    const r=button.getBoundingClientRect();
    return {visible:getComputedStyle(button).display!=="none"&&
      getComputedStyle(button).visibility!=="hidden",
      x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};
  });
  assert(mobilePlay.visible&&mobilePlay.x>=0&&mobilePlay.y>=0&&
    mobilePlay.x+mobilePlay.width<=mobilePlay.viewportWidth+1&&
    mobilePlay.y+mobilePlay.height<=mobilePlay.viewportHeight+1,
    "Text Play must stay inside the mobile editor viewport: "+JSON.stringify(mobilePlay));
  const mobileLayout=await page.evaluate(()=>{
    const workspace=document.querySelector(".lm-lab-workspace").getBoundingClientRect();
    const preview=document.querySelector(".lm-lab-preview").getBoundingClientRect();
    const inspector=document.querySelector(".lm-lab-inspector").getBoundingClientRect();
    return {workspace,preview,inspector,viewport:innerHeight};
  });
  const mobileBoard=await page.locator("#labArtboard").evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {width:r.width,height:r.height,display:getComputedStyle(el).display};
  });
  assert(mobileBoard.width>120&&mobileBoard.height>70&&mobileBoard.display!=="none",
    "Mobile artboard must remain visibly sized: "+JSON.stringify(mobileBoard));


  for(const vp of [
    {width:320,height:568},
    {width:390,height:844},
    {width:500,height:700},
    {width:768,height:1024},
    {width:834,height:1112},
    {width:1024,height:768}
  ]){
    await page.setViewportSize(vp);
    await page.waitForTimeout(120);

    const previewState=await page.evaluate(()=>{
      const board=document.querySelector("#labArtboard");
      const frame=document.querySelector("#labArtboardFrame");
      const stage=document.querySelector(".lm-lab-stage");
      const preview=document.querySelector(".lm-lab-preview");
      const cs=getComputedStyle(board), ps=getComputedStyle(preview);
      const br=board.getBoundingClientRect(), fr=frame.getBoundingClientRect(), sr=stage.getBoundingClientRect();
      return {
        logicalW:parseFloat(cs.width),logicalH:parseFloat(cs.height),
        boardW:br.width,boardH:br.height,
        frameW:fr.width,frameH:fr.height,
        stageW:sr.width,stageH:sr.height,
        previewPosition:ps.position,
        rootPosition:getComputedStyle(document.querySelector('#laboratorio')).position,
        inViewport:sr.top>=0&&sr.bottom<=innerHeight+1,
        previewTop:ps.top
      };
    });

    assert(Math.abs(previewState.logicalW-1280)<1&&Math.abs(previewState.logicalH-720)<1,
      "Device viewport must not alter horizontal artboard geometry at "+vp.width+"x"+vp.height);
    assert(previewState.boardW<=previewState.stageW+1&&previewState.boardH<=previewState.stageH+1,
      "Scaled artboard must fit preview at "+vp.width+"x"+vp.height);
    assert(previewState.frameW>100&&previewState.frameH>50,
      "Scaled artboard frame must stay visible at "+vp.width+"x"+vp.height);
    assert(previewState.rootPosition==="fixed"&&previewState.inViewport,
      "Compact editor must keep its preview inside the viewport at "+vp.width+"x"+vp.height);

    const menuState=await page.evaluate(()=>{
      const menu=document.querySelector(".lm-composition-module-index");
      const buttons=[...menu.querySelectorAll(":scope>button[data-mobile-module]")];
      const mr=menu.getBoundingClientRect();
      return {
        menuWidth:mr.width,
        buttonCount:buttons.length,
        visible:buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=40;}),
        labels:buttons.map(b=>b.textContent.trim())
      };
    });
    assert(menuState.buttonCount===4&&menuState.visible,
      "The four everyday tools must remain fully visible at "+vp.width+"x"+vp.height);
    await page.locator('.lm-studio-secondary>summary').click();
    for(const name of ['superficie','construcao'])assert(await page.locator('button[data-mobile-module="'+name+'"]').isVisible(),
      'Secondary tool must be reachable through More: '+name);
    await page.locator('.lm-studio-secondary>summary').click();

    await page.locator('button[data-mobile-module="m"]').click();
    // A photographic M must be turned off before the color-only solid option
    // is available. This is a deliberate product rule, not a visual failure.
    await choose("mContent","off");
    await page.locator('button[data-mobile-module="m"]').click();
    const mButton=page.locator('#labMEnabled');
    await mButton.scrollIntoViewIfNeeded();
    await mButton.check();
    const scrollState=await page.evaluate(()=>({
      y:window.scrollY,
      bodyScroll:getComputedStyle(document.body).overflowY,
      htmlScroll:getComputedStyle(document.documentElement).overflowY
    }));
    assert(scrollState.y===0,
      "Compact controls must scroll independently without losing the preview at "+vp.width+"x"+vp.height);
  }

  // Reproduce the reported saved mobile composition, not only a blank preset.
  await page.setViewportSize({width:390,height:720});
  await choose("format","vertical");
  await choose("mContent","solid");
  await choose("bodyMode","visivel");
  await page.locator('[data-lab-more="texto"] > summary').click();
  await page.locator("#labTitleInput").fill("PRÁTICAS\nMATERIAIS E\nPROCESSOS");
  await page.locator("#labTitleInput").dispatchEvent("input");
  const inspectCopy=()=>page.locator("#labArtboard").evaluate(board=>{
    const safe=board.querySelector("#labReading").getBoundingClientRect();
    const nodes=[...board.querySelectorAll(".lm-lab-title-line, #labRenderedBody, #labKicker, .lm-lab-bottom span")];
    const failures=nodes.flatMap(node=>{
      const range=document.createRange(); range.selectNodeContents(node);
      return [...range.getClientRects()].filter(r=>
        r.left<safe.left-1||r.right>safe.right+1||r.top<safe.top-1||r.bottom>safe.bottom+1
      ).map(r=>({
        className:node.className||node.id||node.tagName,
        text:(node.textContent||"").slice(0,80),
        rect:[r.left,r.top,r.right,r.bottom].map(x=>Math.round(x*10)/10),
        safe:[safe.left,safe.top,safe.right,safe.bottom].map(x=>Math.round(x*10)/10)
      }));
    });
    return {contrast:!!board.querySelector('.lm-lab-solid-contrast[aria-hidden="true"]'),
      fits:failures.length===0,failures};
  });
  for(const format of ["vertical","horizontal","quadrado","editorial"]){
    await choose("format",format);
    await page.waitForTimeout(120);
    const copy=await inspectCopy();
    assert(copy.fits,"Saved mobile title and body must stay inside the page: "+format+" "+JSON.stringify(copy.failures));
    assert(copy.contrast,"White copy must remain visible across the solid M");
    await page.locator(".lm-lab-workspace").evaluate(el=>el.scrollIntoView({block:"start"}));
    await page.screenshot({path:"laboratorio-regressao-mobile-"+format+".png"});
  }

  // The guide remains usable on compact devices, and the normal manual
  // exposes the same sequence without entering the focused editor.
  await page.setViewportSize({width:390,height:720});
  await page.locator("#labTourStudioHelp").click();
  assert(await page.locator("#labHelp-overview").isVisible(),
    "Dúvidas must remain accessible in the compact focused toolbar");
  await page.screenshot({path:"laboratorio-ajuda-mobile.png"});
  await page.locator("#labTourClose").click();
  assert(await page.locator("#labHelp-overview").isHidden(),
    "Fechar must dismiss compact help");

  await page.locator("#labStudioToggle").click();
  assert(await page.locator("body").evaluate(el=>!el.classList.contains("lm-studio-open")),
    "Focused mode did not close");
  assert(await page.locator("#labPanel-pagina").isVisible()&&
         await page.locator("#labPanel-texto").isVisible()&&
         await page.locator("#labPanel-imagem").isVisible(),
    "Closing focused mode must preserve the same unified inspector");

  await page.locator("#labOverviewHelp").click();
  assert(await page.locator("#labHelp-overview").isVisible(),
    "Normal Laboratory page must launch the same guided help");
  await page.locator("#labTourClose").click();
  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR unified composition studio OK");
}finally{
  await browser.close();
}
