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