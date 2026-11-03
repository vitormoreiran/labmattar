import {chromium} from "playwright";

const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/laboratorio.html";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
const assert=(v,m)=>{if(!v)throw Error(m)};

async function choose(group,value){
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

  for(const id of ["labPanel-pagina","labPanel-texto","labPanel-imagem"]){
    assert(await page.locator("#"+id).isVisible(),id+" must remain visible in the unified editor");
  }

  const baseline=await page.locator("#labArtboard").evaluate(el=>({
    mx:getComputedStyle(el).getPropertyValue("--lab-m-x").trim(),
    scale:document.querySelector("#labMScale").value,
    logicalWidth:parseFloat(getComputedStyle(el).width),
    logicalHeight:parseFloat(getComputedStyle(el).height)
  }));

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
  assert(desktopLayout.menu.height<100,
    "Desktop module menu must remain compact: "+JSON.stringify(desktopLayout.menu));
  assert(baseline.mx==="50%","M must remain on the central axis");
  assert(Math.abs(baseline.logicalWidth-1280)<1&&Math.abs(baseline.logicalHeight-720)<1,
    "Horizontal artboard must keep fixed logical geometry");

  await choose("background","photo");
  await choose("mContent","solid");
  const scaleBefore=await page.locator("#labMScale").inputValue();
  await choose("marker","top");
  assert(await page.locator("#labMScale").inputValue()===scaleBefore,
    "Changing marker state must not change M scale");
  const markerBackground=await page.locator("#labArtboard").evaluate(el=>{
    const photo=el.querySelector(".lm-lab-photo-ambient");
    const cs=getComputedStyle(photo);
    return {
      background:el.dataset.background,
      markerBlur:el.dataset.markerBlur,
      filter:cs.filter,
      src:photo.getAttribute("src"),
      focus:getComputedStyle(el).getPropertyValue("--lab-focus-x").trim()+" "+getComputedStyle(el).getPropertyValue("--lab-focus-y").trim()
    };
  });
  assert(markerBackground.background==="photo"&&markerBackground.markerBlur==="true",
    "Active M marker must force the composition photograph into the background");
  assert(markerBackground.filter.includes("blur(")&&markerBackground.src,
    "Active M marker background must use the same photograph with blur");

  await choose("mContent","photo");
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

  await choose("background","color");
  assert(await page.locator("#labColor").isEnabled(),
    "Background color must remain a complete independent function");
  const forcedWhileMarked=await page.locator("#labArtboard").evaluate(el=>({
    background:el.dataset.background,markerBlur:el.dataset.markerBlur
  }));
  assert(forcedWhileMarked.background==="photo"&&forcedWhileMarked.markerBlur==="true",
    "Choosing a color while an M marker is active must keep the blurred photo background");
  await choose("marker","none");
  const restoredAfterMarker=await page.locator("#labArtboard").evaluate(el=>({
    background:el.dataset.background,requested:el.dataset.backgroundRequested,
    backdrop:el.dataset.backdrop,markerBlur:el.dataset.markerBlur,
    ambient:getComputedStyle(el.querySelector(".lm-lab-photo-ambient")).display,
    filter:getComputedStyle(el.querySelector(".lm-lab-photo-ambient")).filter
  }));
  assert(restoredAfterMarker.background==="photo"&&restoredAfterMarker.requested==="color"&&
         restoredAfterMarker.backdrop==="blur"&&restoredAfterMarker.markerBlur==="false"&&
         restoredAfterMarker.ambient!=="none"&&restoredAfterMarker.filter.includes("blur("),
    "After removing markers, an active M must STILL have the photo blurred underneath");
  assert((await page.locator("#labBackdropContext").textContent()).includes("fotografia desfocada"),
    "Background inspector must explain why the selected color is temporarily overridden");
  await choose("mContent","off");
  const restoredAfterM=await page.locator("#labArtboard").evaluate(el=>({
    background:el.dataset.background,backdrop:el.dataset.backdrop,
    layer:getComputedStyle(el.querySelector(".lm-lab-photo-layer")).display
  }));
  assert(restoredAfterM.background==="color"&&restoredAfterM.backdrop==="color"&&restoredAfterM.layer==="none",
    "Turning the last M off restores the originally selected color, not an empty blurred layer");


  // In portrait the same published M has two geometric appearances.


  // In portrait the same published M has two geometric appearances.
  // Elemento keeps the author-controlled scale; Completo fits page height
  // without changing the vector ratio or carrying the bleed into other formats.
  await choose("mContent","photo");
  await choose("format","vertical");
  assert(await page.locator("#labMPresentationField").isVisible(),
    "Portrait format must reveal M appearance controls");
  await choose("mPresentation","elemento");
  const mMeasurement=async()=>page.locator("#labArtboard").evaluate(board=>{
    const b=board.getBoundingClientRect(),m=board.querySelector("#labMask").getBoundingClientRect();
    return {mode:board.dataset.mPresentation,
      frame:{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height},
      mask:{left:m.left,right:m.right,top:m.top,bottom:m.bottom,width:m.width,height:m.height}};
  });
  const mElement=await mMeasurement();
  const savedScale=await page.locator("#labMScale").inputValue();
  assert(mElement.mode==="elemento"&&mElement.mask.width>50 &&
         mElement.mask.width<mElement.frame.width &&
         await page.locator("#labMask").isVisible(),
    "Elemento must preserve the visible, aligned variable-size M: "+JSON.stringify(mElement));
  await choose("mPresentation","completo");
  const mFull=await mMeasurement();
  const fullBackdrop=await page.locator("#labArtboard").evaluate(el=>{
    const ambient=el.querySelector(".lm-lab-photo-ambient");
    return {mode:el.dataset.backdrop,filter:getComputedStyle(ambient).filter,
      display:getComputedStyle(ambient).display,
      samePhoto:ambient.getAttribute("src")===el.querySelector("#labMaskPhoto").getAttribute("src")};
  });
  assert(fullBackdrop.mode==="blur"&&fullBackdrop.filter.includes("blur(")&&
         fullBackdrop.display!=="none"&&fullBackdrop.samePhoto,
    "Completo in 9:16 keeps the SAME blurred photograph below the full-height M: "+JSON.stringify(fullBackdrop));
  await page.locator("#labArtboard").screenshot({path:"laboratorio-fundo-blur-completo.png"});
  assert(await page.locator("#labMask").isVisible(),
    "M must remain visible when the background is a solid color");
  assert(mFull.mode==="completo" && Math.abs(mFull.mask.height-mFull.frame.height)<2 &&
         mFull.mask.left<mFull.frame.left-10&&mFull.mask.right>mFull.frame.right+10 &&
         Math.abs(mFull.mask.width/mFull.mask.height-990.08/743.18)<.005,
    "Complete M should cover portrait height with symmetric side bleed and no deformation: "+JSON.stringify(mFull));
  assert(await page.locator("#labMScale").isDisabled() && await page.locator("#labMarker").isDisabled(),
    "Manual scale and duplicate end markers must be inactive in Completo");
  assert((await page.locator("#labMScale").inputValue())===savedScale,
    "Completo must not overwrite Elemento's saved scale");
  assert(await page.evaluate(()=>JSON.parse(localStorage.getItem("labmattar-composicao-lab-v1")).mPresentation)==="completo",
    "M appearance must persist in the same saved editor state");
  await page.locator("#labArtboard").screenshot({path:"laboratorio-m-completo-vertical.png"});
  await choose("format","horizontal");
  assert(await page.locator("#labMPresentationField").isHidden() &&
         (await mMeasurement()).mode==="elemento",
    "Horizontal must stay unchanged regardless of the vertical M option");
  await choose("format","vertical");
  assert((await mMeasurement()).mode==="completo",
    "Returning to portrait must restore the chosen M appearance");
  await choose("mPresentation","elemento");
  assert((await page.locator("#labMScale").inputValue())===savedScale &&
         await page.locator("#labMScale").isEnabled(),
    "Returning to Elemento must restore its previous scale");
  await choose("format","horizontal");

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(120);
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
        previewTop:ps.top
      };
    });

    assert(Math.abs(previewState.logicalW-1280)<1&&Math.abs(previewState.logicalH-720)<1,
      "Device viewport must not alter horizontal artboard geometry at "+vp.width+"x"+vp.height);
    assert(previewState.boardW<=previewState.stageW+1&&previewState.boardH<=previewState.stageH+1,
      "Scaled artboard must fit preview at "+vp.width+"x"+vp.height);
    assert(previewState.frameW>100&&previewState.frameH>50,
      "Scaled artboard frame must stay visible at "+vp.width+"x"+vp.height);
    assert(previewState.previewPosition==="static",
      "Compact preview must use normal document flow at "+vp.width+"x"+vp.height);

    const menuState=await page.evaluate(()=>{
      const menu=document.querySelector(".lm-composition-module-index");
      const buttons=[...menu.querySelectorAll("button[data-mobile-module]")];
      const mr=menu.getBoundingClientRect();
      return {
        menuWidth:mr.width,
        buttonCount:buttons.length,
        visible:buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=40;}),
        labels:buttons.map(b=>b.textContent.trim())
      };
    });
    assert(menuState.buttonCount===6&&menuState.visible,
      "All six compact module buttons must remain fully visible at "+vp.width+"x"+vp.height);

    await page.locator('button[data-mobile-module="m"]').click();
    const mButton=page.locator('[data-lab-choice="mContent"][data-value="solid"]');
    await mButton.scrollIntoViewIfNeeded();
    await mButton.click();
    const scrollState=await page.evaluate(()=>({
      y:window.scrollY,
      bodyScroll:getComputedStyle(document.body).overflowY,
      htmlScroll:getComputedStyle(document.documentElement).overflowY
    }));
    assert(scrollState.y>0,
      "Compact editor document must scroll to controls at "+vp.width+"x"+vp.height);
  }

  await page.locator("#labStudioToggle").click();
  assert(await page.locator("body").evaluate(el=>!el.classList.contains("lm-studio-open")),
    "Focused mode did not close");
  assert(await page.locator("#labPanel-pagina").isVisible()&&
         await page.locator("#labPanel-texto").isVisible()&&
         await page.locator("#labPanel-imagem").isVisible(),
    "Closing focused mode must preserve the same unified inspector");

  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR unified composition studio OK");
}finally{
  await browser.close();
}