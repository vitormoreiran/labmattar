import {chromium} from "playwright";

const url=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/compor.html";
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
  await choose("marker","both");
  assert(await page.locator('[data-lab-choice="mContent"][data-value="solid"]').isHidden(),
    "M sólido não pode aparecer nas composições de fotografia");
  assert(await page.locator("#labMContent option[value=solid]").isDisabled(),
    "O valor sólido não pode ser selecionado por controles nativos");
  const photograph=async()=>page.locator("#labArtboard").evaluate(board=>{
    const ambient=board.querySelector("#labAmbientPhoto");
    const overlay=board.querySelector("#labMarkerPhotoLayer");
    const marker=board.querySelector("#labMarkerPhoto");
    const shape=board.querySelector(".lm-lab-m-marker-top");
    return {background:board.dataset.background,backdrop:board.dataset.backdrop,
      content:board.dataset.mContent,focus:board.dataset.markerFocus,
      marked:board.dataset.markerBlur,source:ambient.getAttribute("src"),
      overlaySource:marker.getAttribute("src"),
      ambientFilter:getComputedStyle(ambient).filter,
      overlayFilter:getComputedStyle(marker).filter,
      overlayDisplay:getComputedStyle(overlay).display,
      colorMarkerVisible:getComputedStyle(board.querySelector("#labMMarkers")).visibility,
      mask:getComputedStyle(overlay).webkitMaskImage||getComputedStyle(overlay).maskImage,
      vector:shape.querySelector("path").getAttribute("d"),
      focused:getComputedStyle(ambient).objectPosition===getComputedStyle(marker).objectPosition};
  });
  let photo=await photograph();
  assert(photo.background==="photo"&&photo.backdrop==="photo"&&photo.content==="photo"&&
         photo.marked==="true"&&photo.focus==="blur"&&
         photo.overlayDisplay!=="none"&&photo.overlayFilter.includes("blur(")&&
         !photo.ambientFilter.includes("blur(")&&photo.colorMarkerVisible==="hidden"&&
         photo.mask.includes("data:image/svg")&&photo.source===photo.overlaySource&&photo.focused,
    "O marcador deve recortar blur sobre a mesma fotografia nítida: "+JSON.stringify(photo));
  await page.locator("#labArtboard").screenshot({path:"laboratorio-marcadores-blur-foto.png"});

  await choose("markerFocus","sharp");
  photo=await photograph();
  assert(photo.backdrop==="blur"&&photo.focus==="sharp"&&photo.ambientFilter.includes("blur(")&&
         !photo.overlayFilter.includes("blur(")&&photo.source===photo.overlaySource,
    "A inversão deve manter os marcadores nítidos e o restante desfocado: "+JSON.stringify(photo));
  await page.locator("#labArtboard").screenshot({path:"laboratorio-marcadores-nitidos-foto.png"});

  for(const which of ["top","bottom","both"]){
    await choose("marker",which);
    const mask=await page.locator("#labMarkerPhotoLayer").evaluate(el=>getComputedStyle(el).webkitMaskImage);
    assert(mask.includes("data:image/svg"),"Cada marcador deve usar máscara vetorial real: "+which);
  }
  await choose("marker","none");
  photo=await photograph();
  assert(photo.marked==="false"&&photo.overlayDisplay==="none"&&photo.backdrop==="blur",
    "Desativar marcadores restaura M fotográfico nítido sobre fundo desfocado");

  await choose("background","color");
  await choose("mContent","off");
  assert(await page.locator('[data-lab-choice="mContent"][data-value="solid"]').isVisible(),
    "M sólido deve retornar nas composições de cor");
  await choose("mContent","solid");
  const color=await page.locator("#labArtboard").evaluate(board=>({
    effective:board.dataset.background,content:board.dataset.mContent,
    photo:getComputedStyle(board.querySelector(".lm-lab-photo-layer")).display
  }));
  assert(color.effective==="color"&&color.content==="solid"&&color.photo==="none",
    "Composição de cor permite M sólido sem introduzir fotografia");

  // A project saved under the obsolete photo + solid combination is normalized.
  await choose("background","photo");
  assert((await page.locator("#labArtboard").getAttribute("data-m-content"))==="photo",
    "Trocar para fotografia deve substituir M sólido por M fotográfico");
  await choose("marker","top");
  await choose("mContent","off");
  photo=await photograph();
  assert(photo.background==="photo"&&photo.marked==="true"&&photo.overlayDisplay!=="none",
    "Marcadores sem M central também precisam recortar a fotografia");
  await choose("marker","none");
  photo=await photograph();
  assert(photo.backdrop==="photo"&&photo.overlayDisplay==="none"&&
         !photo.ambientFilter.includes("blur("),
    "Sem M e sem marcadores, a fotografia deve ser nítida");

  const legacy=await browser.newPage();
  await legacy.goto(new URL("/composicao.html?studio=1#laboratorio",url).href,{waitUntil:"load",timeout:60000});
  assert(new URL(legacy.url()).pathname==="/compor.html",
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
  assert(await constructionPage.locator('.lm-case-facts, .lm-case-aside').count()===0,
    "Fixed construction explanations must move to Laboratory help");
  assert(await constructionPage.locator('a[href="/compor.html?studio=1#laboratorio"]').count()===1,
    "The demonstration must open the guided Laboratory help entrypoint");
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
  assert(await constructionPage.locator("#caseReadingMap").count()===0,
    "The structural preview keeps its overlays without a second explanatory column");
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
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-view")==="resultado",
    "Result mode must show the clean composed page");
  await constructionPage.screenshot({path:"composition-manual-desktop.png",fullPage:true});
  await constructionPage.locator('[data-case-format="mobile"]').click();
  assert(await constructionPage.locator('#caseFrame').evaluate(el=>el.classList.contains("is-mobile")),
    "Construction must demonstrate responsive recomposition");
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-m-presentation")==="elemento",
    "The vertical demonstration must retain the actual M in Elemento mode");
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
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-m-presentation")==="completo",
    "The vertical demo must retain the complete M without a redundant sidebar");
  await constructionPage.locator("#caseFrame").screenshot({path:"composition-vertical-m-completo.png"});
  await constructionPage.locator('[data-case-format="desktop"]').click();
  const horizontalFull=await measureM();
  assert(await constructionPage.locator(".lm-case-m-presentation").isVisible() &&
         horizontalFull.mode==="completo" &&
         Math.abs(horizontalFull.mask.height-horizontalFull.frame.height)<2 &&
         Math.abs(horizontalFull.mask.width/horizontalFull.mask.height-990.08/743.18)<.005,
    "Horizontal case must also allow a full-height M without distorting the vector: "+JSON.stringify(horizontalFull));
  await constructionPage.locator('[data-case-format="mobile"]').click();
  assert(await constructionPage.locator("#caseFrame").getAttribute("data-m-presentation")==="completo",
    "Changing orientation must preserve M presentation mode");
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