import {chromium} from "playwright";

const url=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/composicao.html";
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
    background:el.dataset.background,mContent:el.dataset.mContent,
    photo:getComputedStyle(el.querySelector(".lm-lab-photo-layer")).display,
    m:getComputedStyle(el.querySelector("#labMask")).display,
    mImage:getComputedStyle(el.querySelector("#labMaskPhoto")).display
  }));
  assert(state.background==="color"&&state.photo==="none"&&state.m!=="none"&&state.mImage!=="none",
    "A photographic M must work over a color background");

  await choose("mContent","off");
  assert(await page.locator("#labMask").evaluate(el=>getComputedStyle(el).display)==="none",
    "M off state must remove the M without changing the composition type");

  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR unified composition browser OK");
}finally{
  await browser.close();
}