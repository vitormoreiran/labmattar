import {chromium} from "playwright";

const url=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/laboratorio.html";
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
  await page.goto(url,{waitUntil:"load",timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  const manual=await page.request.get(new URL("/composicao.html",url).href);
  assert(manual.status()===200,"Construction chapter must be available");
  const manualHtml=await manual.text();
  assert(manualHtml.includes('id="construcao"')&&manualHtml.includes('href="/laboratorio.html"'),"Composition must teach construction and link to 05");
  assert(!manualHtml.includes('id="labArtboard"'),"Laboratory controls must not be embedded in Composition");

  assert(await page.locator("[data-lab-preset]").count()===0,
    "Composition presets must not define separate composition types");
  assert(await page.locator(".lm-inspector-tabs").count()===0,
    "Contextual tabs must not divide the single composition");
  assert(await page.locator(".lm-composition-module-index").count()===1,
    "Unified composition module index is missing");
  assert(await page.locator("#labPanel-pagina").isVisible()&&
         await page.locator("#labPanel-texto").isVisible()&&
         await page.locator("#labPanel-imagem").isVisible(),
    "Surface, text, background and M functions must remain visible in one composition");

  assert(await page.locator("#labBackground").count()===1&&
         await page.locator("#labMContent").count()===1,
    "Background and M must have independent controls");

  await choose("background","photo");
  await choose("mContent","photo");
  let state=await page.locator("#labArtboard").evaluate(el=>({
    background:el.dataset.background,mContent:el.dataset.mContent,
    photo:getComputedStyle(el.querySelector(".lm-lab-photo-layer")).display,
    m:getComputedStyle(el.querySelector("#labMask")).display,
    mx:getComputedStyle(el).getPropertyValue("--lab-m-x").trim(),
    veil:getComputedStyle(el.querySelector(".lm-lab-photo-contrast")).opacity
  }));
  assert(state.background==="photo"&&state.mContent==="photo",
    "Background photo and photographic M must combine independently");
  assert(state.photo!=="none"&&state.m!=="none"&&state.mx==="50%",
    "Background and central M must render together");
  assert(state.veil==="1","Text over background photography must keep the 20% contrast layer");

  const scale=await page.locator("#labMScale").inputValue();
  await choose("marker","both");
  assert(await page.locator("#labMScale").inputValue()===scale,
    "Markers must not modify M scale");
  assert(await page.locator("#labMMarkers").getAttribute("data-marker")==="both",
    "M-tip markers must reach the canvas");

  await choose("mContent","solid");
  state=await page.locator("#labArtboard").evaluate(el=>({
    background:el.dataset.background,mContent:el.dataset.mContent,
    m:getComputedStyle(el.querySelector("#labMask")).display,
    mImage:getComputedStyle(el.querySelector("#labMaskPhoto")).display
  }));
  assert(state.background==="photo"&&state.mContent==="solid"&&state.m!=="none"&&state.mImage==="none",
    "A solid M must coexist with a photographic background");

  await choose("background","color");
  await choose("mContent","photo");
  state=await page.locator("#labArtboard").evaluate(el=>({
    background:el.dataset.background,mContent:el.dataset.mContent,markerBlur:el.dataset.markerBlur,
    photo:getComputedStyle(el.querySelector(".lm-lab-photo-layer")).display,
    m:getComputedStyle(el.querySelector("#labMask")).display,
    mImage:getComputedStyle(el.querySelector("#labMaskPhoto")).display
  }));
  assert(state.background==="photo"&&state.markerBlur==="true"&&state.mImage!=="none",
    "Active M-tip markers preserve the blurred photographic background");
  // The lower layer is a blurred rendition of the selected photograph in
  // EVERY composition containing M or M markers, even if Cor was selected.
  const backdrop=async()=>page.locator("#labArtboard").evaluate(el=>{
    const ambient=el.querySelector(".lm-lab-photo-ambient");
    const mask=el.querySelector("#labMaskPhoto");
    const layer=el.querySelector(".lm-lab-photo-layer");
    return {
      requested:el.dataset.backgroundRequested,background:el.dataset.background,
      backdrop:el.dataset.backdrop,markerBlur:el.dataset.markerBlur,
      layer:getComputedStyle(layer).display,display:getComputedStyle(ambient).display,
      opacity:getComputedStyle(ambient).opacity,filter:getComputedStyle(ambient).filter,
      src:ambient.getAttribute("src"),maskSrc:mask.getAttribute("src"),
      loaded:ambient.complete&&ambient.naturalWidth>0,
      focus:getComputedStyle(ambient).objectPosition,
      m:getComputedStyle(el.querySelector("#labMask")).display,
      mImage:getComputedStyle(mask).display
    };
  });
  const assertBlur=async(label)=>{
    const b=await backdrop();
    assert(b.backdrop==="blur"&&b.background==="photo"&&b.layer!=="none"&&
           b.display!=="none"&&b.opacity==="1"&&b.loaded&&b.filter.includes("blur("),
      label+": lower layer must contain a LOADED blurred photograph: "+JSON.stringify(b));
    return b;
  };
  let blurred=await assertBlur("M with both markers over color");
  assert(blurred.requested==="color"&&blurred.src===blurred.maskSrc,
    "Both layers must use exactly the same selected photograph");

  await choose("marker","none");
  blurred=await assertBlur("M without markers, color requested");
  assert(blurred.markerBlur==="false"&&blurred.m!=="none"&&blurred.mImage!=="none"&&
         await page.locator("#labMask").isVisible(),
    "Disabling markers must NOT hide blur while a photographic M remains");
  await page.locator("#labArtboard").screenshot({path:"laboratorio-fundo-blur-m.png"});

  await choose("mContent","solid");
  blurred=await assertBlur("solid M");
  assert(blurred.m!=="none"&&blurred.mImage==="none",
    "Solid M still preserves its blurred photograph below");
  await choose("mContent","photo");
  await choose("marker","top");
  blurred=await assertBlur("top marker");
  assert(blurred.markerBlur==="true",
    "Top marker must activate photo blur");
  await page.locator("#labArtboard").screenshot({path:"laboratorio-fundo-blur-marcador.png"});
  await choose("marker","bottom");
  await assertBlur("bottom marker");
  await choose("marker","both");
  await assertBlur("both markers");
  await choose("marker","none");

  await choose("photo","179");
  blurred=await assertBlur("updated selected photograph");
  assert(blurred.src?.includes("179")&&blurred.src===blurred.maskSrc,
    "Changing the photo must update both blurred background and the M immediately");

  await choose("mContent","off");
  let restored=await backdrop();
  assert(restored.backdrop==="color"&&restored.requested==="color"&&restored.layer==="none"&&
         restored.display==="none"&&restored.m==="none",
    "Only with M and markers off should the chosen plain color return: "+JSON.stringify(restored));
  await choose("marker","top");
  blurred=await assertBlur("marker without a central M");
  assert(blurred.m==="none"&&blurred.markerBlur==="true",
    "The marker alone must produce the same blurred photograph underneath");
  await choose("marker","none");
  restored=await backdrop();
  assert(restored.backdrop==="color"&&restored.layer==="none",
    "Turning the final marker off restores the saved color background");
  await choose("background","photo");
  restored=await backdrop();
  assert(restored.backdrop==="photo"&&restored.layer!=="none"&&
         restored.display!=="none"&&!restored.filter.includes("blur("),
    "Without M or markers a chosen photograph is not forcibly blurred");

  const legacy=await browser.newPage();
  await legacy.goto(new URL("/composicao.html?studio=1#laboratorio",url).href,{waitUntil:"load",timeout:60000});
  assert(new URL(legacy.url()).pathname==="/laboratorio.html",
    "Old composition editor links must reopen the independent Laboratory");
  assert(await legacy.locator("body").evaluate(el=>el.classList.contains("lm-studio-open")),
    "Legacy editor links must retain focused mode");
  await legacy.close();
  const constructionPage=await browser.newPage({viewport:{width:1440,height:900}});
  constructionPage.on("pageerror",e=>errors.push("Construction: "+e.message));
  await constructionPage.goto(new URL("/composicao.html",url).href,{waitUntil:"load",timeout:60000});
  await constructionPage.evaluate(()=>document.fonts.ready);
  assert(await constructionPage.locator('#caseFrame').count()===1,
    "Construction chapter must contain the original applied example");
  for(const step of ["campo","mascara","completa"]){
    await constructionPage.locator('[data-case-step="'+step+'"]').click();
    assert(await constructionPage.locator('#caseFrame').getAttribute("data-step")===step,
      "Construction layers must remain interactive: "+step);
  }
  assert(await constructionPage.locator("#caseGuides, .lm-case-safe").count()===0,
    "Decorative safe-area guide must be removed");
  assert(await constructionPage.locator("[data-case-view]").count()===2,
    "The composition must explain both the finished result and the actual reading structure");
  await constructionPage.locator('[data-case-step="completa"]').click();
  await constructionPage.locator('[data-case-view="estrutura"]').click();
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-view")==="estrutura",
    "Structure mode must be a real preview state");
  assert(await constructionPage.locator("#caseReadingMap").isVisible(),
    "Structure mode must explain the four semantic reading fields");
  const structural=await constructionPage.locator("#caseFrame").evaluate(frame=>({
    surface:getComputedStyle(frame).backgroundColor,
    titleOutline:getComputedStyle(frame.querySelector("h3")).outlineStyle,
    footerOutline:getComputedStyle(frame.querySelector(".lm-case-footer")).outlineStyle,
    label:getComputedStyle(frame.querySelector(".lm-case-reading h3"),"::after").content
  }));
  assert(structural.titleOutline!=="none"&&structural.footerOutline!=="none"&&structural.label.includes("TÍTULO"),
    "Structural guide must follow real text fields rather than one arbitrary safe-area rectangle: "+JSON.stringify(structural));
  assert(await constructionPage.locator('[data-case-contrast="on"]').isDisabled(),
    "Contrast is irrelevant in the unphotographed structural diagram");
  await constructionPage.screenshot({path:"composition-structure-horizontal.png",fullPage:false});
  await constructionPage.locator('[data-case-view="resultado"]').click();
  assert(await constructionPage.locator("#caseReadingMap").isHidden(),
    "Result mode must show the clean composed page");
  await constructionPage.screenshot({path:"composition-manual-desktop.png",fullPage:true});
  await constructionPage.locator('[data-case-format="mobile"]').click();
  assert(await constructionPage.locator('#caseFrame').evaluate(el=>el.classList.contains("is-mobile")),
    "Construction must demonstrate responsive recomposition");
  assert((await constructionPage.locator("#caseStepBody").textContent()).includes("M como elemento"),
    "The vertical example must explain the M in Elemento mode");
  assert(await constructionPage.locator(".lm-case-m-presentation").isVisible(),
    "Vertical mode must expose the two M appearances");
  const measureM=async()=>constructionPage.locator("#caseFrame").evaluate(frame=>{
    const b=frame.getBoundingClientRect();
    const m=frame.querySelector(".lm-case-image").getBoundingClientRect();
    return {frame:{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height},
      mask:{left:m.left,right:m.right,top:m.top,bottom:m.bottom,width:m.width,height:m.height},
      mode:frame.dataset.mPresentation};
  });
  const initialM=await measureM();
  assert(initialM.mode==="elemento"&&initialM.mask.width<initialM.frame.width,
    "Elemento must preserve the original fully visible aligned M: "+JSON.stringify(initialM));
  await constructionPage.locator('[data-case-m-presentation="completo"]').click();
  const fullM=await measureM();
  assert(fullM.mode==="completo"&&Math.abs(fullM.mask.height-fullM.frame.height)<2 &&
         fullM.mask.left<fullM.frame.left-10&&fullM.mask.right>fullM.frame.right+10,
    "Completo must fit the full page height and bleed symmetrically beyond the sides: "+JSON.stringify(fullM));
  assert(Math.abs(fullM.mask.width/fullM.mask.height-990.08/743.18)<.005,
    "Completo must preserve the published M vector aspect: "+JSON.stringify(fullM));
  assert((await constructionPage.locator("#caseStepBody").textContent()).includes("M completo"),
    "Sidebar must describe the complete vertical behavior");
  await constructionPage.locator("#caseFrame").screenshot({path:"composition-vertical-m-completo.png"});
  await constructionPage.locator('[data-case-format="desktop"]').click();
  assert(await constructionPage.locator(".lm-case-m-presentation").isHidden() &&
         await constructionPage.locator("#caseFrame").getAttribute("data-m-presentation")==="elemento",
    "Horizontal format must not inherit the portrait full-bleed mask");
  await constructionPage.locator('[data-case-format="mobile"]').click();
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-m-presentation")==="completo",
    "Portrait M appearance must be restored after switching formats");
  await constructionPage.locator('[data-case-m-presentation="elemento"]').click();
  const checkVertical=async(viewport)=>{
    await constructionPage.setViewportSize(viewport);
    await constructionPage.evaluate(()=>document.fonts.ready);
    const proof=await constructionPage.locator("#caseFrame").evaluate(frame=>{
      const rect=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
      const content=frame.querySelector(".lm-case-content");
      const title=frame.querySelector(".lm-case-reading h3");
      const body=frame.querySelector(".lm-case-reading p");
      const kicker=frame.querySelector(".lm-case-kicker");
      const footer=frame.querySelector(".lm-case-footer");
      return {frame:rect(frame),safe:rect(content),title:rect(title),body:rect(body),
        kicker:rect(kicker),footer:rect(footer),
        font:{title:parseFloat(getComputedStyle(title).fontSize),body:parseFloat(getComputedStyle(body).fontSize)},
        lines:[...title.querySelectorAll("span")].map(el=>({text:el.textContent,box:rect(el),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth})),
        clipped:frame.scrollHeight>frame.clientHeight+2,
        aria:frame.getAttribute("data-step")};
    });
    const tolerance=2;
    assert(proof.aria==="completa","Responsive checks must target the complete composition");
    assert(Math.abs(proof.frame.width/proof.frame.height-9/16)<.004,
      "Vertical page must have a genuine 9:16 surface: "+JSON.stringify(proof));
    assert(proof.title.top>=proof.kicker.bottom+8,
      "Title must begin below its identification: "+JSON.stringify({viewport,proof}));
    assert(proof.body.top>=proof.title.bottom+Math.max(7,proof.frame.width*.037),
      "The Body must keep a surface-proportional gap below the Title: "+JSON.stringify({viewport,proof}));
    assert(proof.footer.top>=proof.body.bottom+8,
      "Credits must not overlap the Body: "+JSON.stringify({viewport,proof}));
    for(const block of [proof.kicker,proof.title,proof.body,proof.footer]){
      assert(block.left>=proof.safe.left-tolerance && block.right<=proof.safe.right+tolerance,
        "Text must remain inside the reading margins: "+JSON.stringify({viewport,proof}));
    }
    for(const line of proof.lines){
      assert(line.scrollWidth<=line.clientWidth+tolerance && line.box.right<=proof.safe.right+tolerance,
        "Vertical title line must fit the reading field without horizontal clipping: "+JSON.stringify({viewport,line,proof}));
    }
    assert(proof.font.title<proof.frame.width*.125 && proof.font.body<proof.frame.width*.045,
      "Type must scale relative to the physical artboard, not browser viewport: "+JSON.stringify({viewport,proof}));
    await constructionPage.locator("#caseFrame").screenshot({path:"composition-vertical-"+viewport.width+".png"});
    return proof;
  };
  const desktopVertical=await checkVertical({width:1440,height:900});
  assert(desktopVertical.title.bottom<desktopVertical.body.top,
    "Desktop preview of vertical format must also be fully legible");
  await constructionPage.locator('[data-case-view="estrutura"]').click();
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-view")==="estrutura",
    "Vertical format must preserve actual field-by-field structural visualization");
  await constructionPage.locator("#caseFrame").screenshot({path:"composition-structure-vertical.png"});
  await constructionPage.locator('[data-case-view="resultado"]').click();
  await checkVertical({width:390,height:844});
  await checkVertical({width:320,height:640});
  await constructionPage.setViewportSize({width:390,height:844});
  await constructionPage.setViewportSize({width:390,height:844});
  await constructionPage.screenshot({path:"composition-manual-mobile.png",fullPage:true});
  await constructionPage.close();
  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR unified composition browser OK");
}finally{
  await browser.close();
}