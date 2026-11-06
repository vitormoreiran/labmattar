import {chromium,webkit} from "playwright";

const engine=process.env.COMPOSITION_BROWSER==="webkit"?webkit:chromium;
const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/compor.html";
const browser=await engine.launch({headless:true,...(engine===chromium?{args:["--no-sandbox"]}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
const assert=(value,message)=>{if(!value)throw Error(message)};
const frame=()=>page.locator("#labArtboard");
const inspect=()=>frame().evaluate(board=>({
  title:board.querySelector("#labRenderedTitle")?.textContent,
  slots:[...board.querySelectorAll("#labSignatureLayer [data-corner]")].map(x=>({
    corner:x.dataset.corner,kind:x.dataset.kind,
    text:x.textContent.trim(),
    image:x.querySelector("img")?.getAttribute("src"),
    role:x.querySelector(".detail")?.dataset.lmTextRole
  })),
  legacy:getComputedStyle(board.querySelector("#labKicker")).visibility,
  mark:getComputedStyle(board.querySelector("#labSignature")).display
}));
const choosePreset=async name=>page.locator('[data-signature-preset="'+name+'"]').click();
const chooseCorner=async name=>page.locator('[data-signature-corner="'+name+'"]').click();
try{
  await page.goto(base+"?studio=1#laboratorio",{waitUntil:"load",timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('button[data-mobile-module="assinatura"]').click();
  assert(await page.locator("#labPanel-assinatura").isVisible(),"Assinatura needs its own inspector panel");
  assert(await page.locator("#labPanel-imagem").isHidden(),"Signature must not expose image and M controls");
  assert(await page.locator("#labSignatureKind").isVisible(),"Corner content type must be editable");
  await page.screenshot({path:"laboratorio-assinatura-controles-desktop.png"});
  assert(await page.locator("[data-signature-corner]").count()===4,"Four signature corners must be reachable");
  const originalTitle=(await inspect()).title;

  await choosePreset("none");
  const empty=await inspect();
  assert(empty.slots.length===0&&empty.title===originalTitle&&empty.legacy==="hidden",
    "Sem assinatura must hide every signature element without changing the title: "+JSON.stringify(empty));
  await frame().screenshot({path:"laboratorio-assinatura-sem.png"});

  await choosePreset("editorial");
  const editorial=await inspect();
  assert(editorial.slots.some(x=>x.corner==="tl"&&x.text.includes("LABMATTAR"))&&
    editorial.slots.some(x=>x.corner==="tr"&&x.image?.includes("vaso_03.svg"))&&
    editorial.slots.some(x=>x.corner==="bl"&&x.text.includes("GASTROPERFORMANCE"))&&
    editorial.slots.some(x=>x.corner==="br"&&x.text.includes("IDENTIDADE VISUAL")),
    "Editorial must include identification, symbol and footer: "+JSON.stringify(editorial));
  await frame().screenshot({path:"laboratorio-assinatura-editorial.png"});

  await choosePreset("navigation");
  const navigation=await inspect();
  assert(navigation.slots.length===4&&
    navigation.slots.some(x=>x.corner==="tl"&&x.image?.includes("mattar.svg"))&&
    navigation.slots.some(x=>x.corner==="tr"&&x.image?.includes("M.svg")&&x.text==="SUMÁRIO")&&
    navigation.slots.some(x=>x.corner==="bl"&&x.image?.includes("vaso_03.svg")&&x.text==="MENU")&&
    navigation.slots.some(x=>x.corner==="br"&&x.text==="2026")&&
    navigation.slots.filter(x=>x.text).every(x=>x.role==="detail"),
    "Navigation must reproduce the official four-corner signature with Detalhe: "+JSON.stringify(navigation));
  await frame().screenshot({path:"laboratorio-assinatura-navegacao.png"});

  await chooseCorner("tr");
  await page.locator("#labSignatureText").fill("CAPÍTULOS");
  await page.locator("#labSignatureText").dispatchEvent("input");
  const custom=await inspect();
  assert(custom.slots.find(x=>x.corner==="tr")?.text==="CAPÍTULOS"&&
    await page.locator("#labSignaturePresetStatus").textContent().then(t=>t.includes("Personalizada")),
    "The selected corner must update live without overwriting other slots");

  await chooseCorner("bl");
  await page.locator("#labSignatureSymbol").selectOption("vaso_09.svg");
  const edited=await inspect();
  assert(edited.slots.find(x=>x.corner==="bl")?.image?.includes("vaso_09.svg")&&
    edited.slots.find(x=>x.corner==="tr")?.text==="CAPÍTULOS",
    "Each corner must retain its own icon and label");
  await page.locator("#labSignatureScale").fill("120");
  await page.locator("#labSignatureScale").dispatchEvent("input");
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("labmattar-composicao-lab-v1"))?.signature);
  assert(saved?.scale===120&&saved?.slots?.tr?.text==="CAPÍTULOS"&&
    saved?.slots?.bl?.symbol==="vaso_09.svg","Composition must persist as the same editor draft");

  for(const format of ["vertical","horizontal","quadrado","editorial"]){
    await page.locator('button[data-mobile-module="superficie"]').click();
    await page.locator('[data-lab-choice="format"][data-value="'+format+'"]').click();
    await page.waitForTimeout(110);
    const geometry=await frame().evaluate(board=>{
      const b=board.getBoundingClientRect();
      const all=[...board.querySelectorAll(".lm-lab-signature-slot")].map(node=>{
        const r=node.getBoundingClientRect();
        return {corner:node.dataset.corner,inside:r.left>=b.left-3&&r.top>=b.top-3&&
          r.right<=b.right+3&&r.bottom<=b.bottom+3};
      });
      return {all,bounds:{width:b.width,height:b.height}};
    });
    assert(geometry.all.length===4&&geometry.all.every(x=>x.inside),
      "Signature positions must remain within the surface in "+format+": "+JSON.stringify(geometry));
  }

  await page.reload({waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  const restored=await inspect();
  assert(restored.slots.find(x=>x.corner==="tr")?.text==="CAPÍTULOS"&&
    restored.slots.find(x=>x.corner==="bl")?.image?.includes("vaso_09.svg"),
    "Custom signatures must persist across reloads");

  await page.locator('button[data-mobile-module="assinatura"]').click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('button[data-mobile-module="assinatura"]').click();
  await page.waitForTimeout(180);
  assert(await page.locator("#labPanel-assinatura").isVisible()&&
         await page.locator("#labSignatureKind").isVisible(),
    "Signature controls must remain accessible on mobile");
  await page.screenshot({path:"laboratorio-assinatura-controles-mobile.png"});
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(120);
  await page.locator('button[data-mobile-module="assinatura"]').click();
  await choosePreset("symbol");
  const only=await inspect();
  assert(only.slots.length===1&&only.slots[0].kind==="symbol",
    "Symbol-only preset must not force metadata or a footer");
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#labReset").click();
  const reset=await inspect();
  assert(reset.slots.length===1&&reset.slots[0].kind==="symbol",
    "Restoring a page study must retain the document signature");
  assert(errors.length===0,"Browser errors: "+errors.join("; "));
  console.log("LABMATTAR signature composer browser OK");
}finally{
  await browser.close();
}
