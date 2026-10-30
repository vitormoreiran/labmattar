import {chromium} from "playwright";

const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/composicao.html";
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
  assert(await page.locator("#labStudioToggleText").textContent()==="VOLTAR AO MANUAL",
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
    scale:document.querySelector("#labMScale").value
  }));
  assert(baseline.mx==="50%","M must remain on the central axis");

  await choose("background","photo");
  await choose("mContent","solid");
  const scaleBefore=await page.locator("#labMScale").inputValue();
  await choose("marker","top");
  assert(await page.locator("#labMScale").inputValue()===scaleBefore,
    "Changing marker state must not change M scale");

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


  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(120);
  assert(await page.locator(".lm-composition-module-index").isVisible(),
    "Mobile module rail must remain visible");
  assert(await page.locator('[data-mobile-module="superficie"]').getAttribute("aria-pressed")==="true",
    "Mobile editor must open with Surface selected");

  await page.locator('[data-mobile-module="m"]').click();
  assert(await page.locator("#labPanel-imagem").isVisible()&&
         await page.locator("[data-submodule=m]").isVisible()&&
         await page.locator("[data-submodule=fundo]").isHidden(),
    "Mobile M module must isolate M controls without changing composition type");

  await page.locator('[data-mobile-module="fundo"]').click();
  assert(await page.locator("[data-submodule=fundo]").isVisible()&&
         await page.locator("[data-submodule=m]").isHidden(),
    "Mobile Background module must isolate background controls");

  await page.locator('[data-mobile-module="texto"]').click();
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

  assert(mobileLayout.preview.bottom<=mobileLayout.inspector.top+2,
    "Mobile canvas and controls must not overlap");
  assert(mobileLayout.workspace.bottom<=mobileLayout.viewport+2,
    "Mobile editor must fit inside one viewport with internal control scrolling");

  for(const vp of [{width:360,height:740},{width:430,height:932}]){
    await page.setViewportSize(vp);
    await page.waitForTimeout(80);
    const responsive=await page.evaluate(()=>{
      const board=document.querySelector("#labArtboard").getBoundingClientRect();
      const preview=document.querySelector(".lm-lab-preview").getBoundingClientRect();
      const inspector=document.querySelector(".lm-lab-inspector").getBoundingClientRect();
      const rail=document.querySelector(".lm-composition-module-index").getBoundingClientRect();
      return {board,preview,inspector,rail,vw:innerWidth,vh:innerHeight};
    });
    assert(responsive.board.width>110&&responsive.board.right<=responsive.vw+1,
      "Artboard must remain visible and contained at "+vp.width+"x"+vp.height);
    assert(responsive.preview.bottom<=responsive.inspector.top+2,
      "Preview and inspector must not overlap at "+vp.width+"x"+vp.height);
    assert(responsive.rail.width<=responsive.vw+2,
      "Module rail must stay within viewport width at "+vp.width+"x"+vp.height);
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