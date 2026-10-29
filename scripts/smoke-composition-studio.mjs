import {chromium} from "playwright";

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/composicao.html";
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const approx=(a,b,eps=2)=>Math.abs(a-b)<=eps;
const tool=id=>page.locator('[data-studio-tool="'+id+'"]');

async function geometry(){
  return page.evaluate(()=>{
    const b=document.querySelector("#labArtboard");
    const stage=document.querySelector(".lm-lab-stage");
    const preview=document.querySelector(".lm-lab-preview");
    const inspector=document.querySelector(".lm-lab-inspector");
    const rect=b.getBoundingClientRect(),space=stage.getBoundingClientRect();
    const bounds=inspector.getBoundingClientRect();
    const data={
      format:b.dataset.format,
      board:{x:rect.left,y:rect.top,width:rect.width,height:rect.height},
      stage:{left:space.left,right:space.right,top:space.top,bottom:space.bottom,width:space.width,height:space.height},
      inspector:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom,height:bounds.height,scrollHeight:inspector.scrollHeight},
      selectedTab:[...document.querySelectorAll("[data-lab-tab]")].find(x=>x.getAttribute("aria-selected")==="true")?.dataset.labTab,
      toolRects:[],
      contentOverflow:document.body.scrollHeight>window.innerHeight+3,
      bodyOverflow:getComputedStyle(document.body).overflow
    };
    const panel=document.querySelector('.lm-inspector-panel:not([hidden])');
    const pr=panel.getBoundingClientRect();
    data.panel={top:pr.top,bottom:pr.bottom};
    for(const item of panel.querySelectorAll(".lm-studio-tool")){
      if(item.hidden)continue;
      const r=item.getBoundingClientRect();
      data.toolRects.push({id:item.dataset.studioTool,x:r.left,y:r.top,right:r.right,bottom:r.bottom,w:r.width,h:r.height,visible:item.getClientRects().length>0});
    }
    return data;
  });
}
async function assertEditorialTitleGroups(label){
  const lines=await page.evaluate(()=>{
    return [...document.querySelectorAll("#labRenderedTitle .lm-lab-title-line")].map(node=>{
      const range=document.createRange();
      range.selectNodeContents(node);
      return {text:node.textContent,fragments:range.getClientRects().length};
    });
  });
  assert(lines.length===3&&lines[2].text==="E PROCESSOS"&&
    lines.every(line=>line.fragments===1),
    label+": editorial title groups unexpectedly wrap: "+JSON.stringify(lines));
}
async function proveBoard(label){
  await page.waitForTimeout(110);
  const g=await geometry();
  const ratio={horizontal:16/9,vertical:9/16,quadrado:1,editorial:Math.SQRT2}[g.format];
  assert(g.board.width>50&&g.board.height>50,label+": invalid board size "+JSON.stringify(g));
  assert(Math.abs(g.board.width/g.board.height-ratio)<.008,label+": format distorted: "+JSON.stringify(g));
  assert(g.board.x>=g.stage.left-2&&g.board.x+g.board.width<=g.stage.right+2,
    label+": page escapes stage horizontally: "+JSON.stringify(g));
  assert(g.board.y>=g.stage.top-2&&g.board.y+g.board.height<=g.stage.bottom+2,
    label+": page escapes stage vertically: "+JSON.stringify(g));
  assert(g.stage.bottom<=page.viewportSize().height+1.5,label+": stage clips the screen");
  assert(g.inspector.bottom<=page.viewportSize().height+1.5,label+": inspector clips the screen");
  assert(g.inspector.scrollHeight<=g.inspector.height+3,label+": inspector requires vertical scrolling");
  assert(g.bodyOverflow==="hidden",label+": page background is scrollable");
  return g;
}
async function menuVisible(label){
  const g=await geometry();
  assert(g.toolRects.length>=2,label+": tool menu missing");
  assert(g.toolRects.every(t=>t.visible&&t.w>75&&t.h>40&&
    t.y>=g.panel.top-1&&t.bottom<=g.panel.bottom+1.5&&
    t.x>=g.inspector.left-1&&t.right<=g.inspector.right+1.5),
    label+": some controls require scrolling or are clipped: "+JSON.stringify(g.toolRects));
  return g;
}
async function flatImageVisible(label){
  await page.waitForTimeout(90);
  const g=await page.evaluate(()=>{
    const flat=document.querySelector("#labStudioImageFlat");
    const panel=document.querySelector("#labPanel-imagem");
    const f=flat.getBoundingClientRect(),p=panel.getBoundingClientRect();
    return {
      flatVisible:getComputedStyle(flat).display!=="none",
      menuHidden:getComputedStyle(panel.querySelector(".lm-studio-tools")).display==="none",
      flat:{top:f.top,bottom:f.bottom,height:f.height,scrollHeight:flat.scrollHeight},
      panel:{top:p.top,bottom:p.bottom,height:p.height},
      groups:[...flat.querySelectorAll(".lm-studio-image-block")].filter(el=>!el.hidden).map(el=>{
        const r=el.getBoundingClientRect();
        return {key:el.dataset.studioImageBlock,top:r.top,bottom:r.bottom,height:r.height,width:r.width}
      })
    };
  });
  assert(g.flatVisible&&g.menuHidden,label+": image editor remains a folder menu: "+JSON.stringify(g));
  assert(g.groups.length>=2&&g.groups.every(x=>x.top>=g.panel.top-2&&x.bottom<=g.panel.bottom+3),
    label+": some Image/M controls are clipped or demand scrolling: "+JSON.stringify(g));
  assert(g.flat.bottom<=g.panel.bottom+3,label+": image controls exceed visible panel: "+JSON.stringify(g));
  return g;
}
async function mGeometry(){
  return page.evaluate(()=>{
    const b=document.querySelector("#labArtboard").getBoundingClientRect();
    const m=document.querySelector("#labMask").getBoundingClientRect();
    const board=document.querySelector("#labArtboard");
    return {
      board:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},
      m:{left:m.left,right:m.right,top:m.top,bottom:m.bottom},
      mode:board.dataset.mMode,
      break:board.dataset.titleBreak,
      contentStatus:board.dataset.state,
      veil:getComputedStyle(document.querySelector(".lm-lab-photo-contrast")).backgroundColor,
      veilOpacity:getComputedStyle(document.querySelector(".lm-lab-photo-contrast")).opacity,
      mOpacity:getComputedStyle(document.querySelector("#labMask")).opacity,
      imageHidden:getComputedStyle(document.querySelector("#labMaskPhoto")).display==="none",
      vector:getComputedStyle(document.querySelector("#labMask")).maskImage
    };
  });
}
async function tab(name){
  await page.locator('[data-lab-tab="'+name+'"]').click();
  await page.waitForTimeout(35);
}
async function clickCard(group,value){
  await page.locator('[data-lab-choice="'+group+'"][data-value="'+value+'"]').click();
  await page.waitForTimeout(100);
}
try{
  await page.goto(base+"?studio=1#laboratorio",{waitUntil:"load",timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(220);
  assert(await page.locator("body").evaluate(el=>el.classList.contains("lm-studio-open")),
    "Focused mode did not open from its direct URL");
  assert(await page.locator("#labStudioToggleText").textContent()==="VOLTAR AO MANUAL",
    "Exit from focus mode is not visible");
  assert(await page.locator("[data-studio-tool]").count()===21,
    "All previous tools and the new M-use control must retain one canonical input");
  const baseline=await proveBoard("Desktop horizontal 1440x900");
  assert(baseline.board.width>720,"Horizontal composition should receive the remaining desktop width");
  await menuVisible("Desktop page properties");
  await page.screenshot({path:"composition-studio-desktop-horizontal.png"});

  await tab("pagina");
  await tool("labFormat").click();
  assert(await page.locator("#labStudioDetail-pagina").isVisible()&&
    await page.locator(".lm-studio-tools[data-studio-tools=pagina]").isHidden(),
    "Property selection should replace the index rather than expand the page");
  await clickCard("format","vertical");
  const portrait=await proveBoard("Desktop vertical 1440x900");
  await assertEditorialTitleGroups("Vertical title group");
  assert(portrait.board.height>500&&portrait.board.width>250,
    "Portrait layout should grow to use the available height");
  await page.screenshot({path:"composition-studio-desktop-portrait.png"});
  await clickCard("format","quadrado");
  const square=await proveBoard("Desktop square 1440x900");
  await assertEditorialTitleGroups("Square title group");
  assert(approx(square.board.width,square.board.height,1),"Square was not rendered 1:1");
  await page.screenshot({path:"composition-studio-desktop-square.png"});
  await clickCard("format","editorial");
  await proveBoard("Desktop editorial 1440x900");
  await clickCard("format","horizontal");
  await page.locator("#labStudioDetail-pagina .lm-studio-back").click();
  await menuVisible("Page menu restored without scrolling");

  await tab("texto");
  await menuVisible("Text tools no scrolling");
  await tool("labTitleScale").click();
  assert(await page.locator("#labTitleScale").isVisible(),"Typography slider should be visible when selected");
  await page.locator("#labPrecision-titleScale").fill("120");
  await page.locator("#labPrecision-titleScale").press("Enter");
  assert(await page.locator("#labTitleScale").inputValue()==="120",
    "The focused palette must preserve exact scale values");
  await page.locator("#labStudioDetail-texto .lm-studio-back").click();
  await page.locator("#labRenderedTitle").click();
  assert(await page.locator('[data-lab-tab="texto"]').getAttribute("aria-selected")==="true",
    "Direct title editing should keep Typography active");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("EDIÇÃO AO VIVO");
  assert((await page.locator("#labTitleInput").inputValue()).includes("EDIÇÃO AO VIVO"),
    "Page copy no longer synchronizes with inspector");

  await tab("imagem");
  assert(await page.locator("#labStudioImageFlat").isVisible(),
    "Image / M must be a single flat editing surface");
  await flatImageVisible("Photo panel without image");
  await clickCard("image","recorte");
  assert(await page.locator("#labMMode").isVisible(),"M-use modes must be visible without opening a folder");
  await flatImageVisible("Full M controls visible");
  await clickCard("mMode","janela");
  let mask=await mGeometry();
  assert(mask.mode==="janela"&&mask.vector.includes("m-publicado.svg"),
    "Window mode must use the original M SVG");
  assert(mask.m.left>=mask.board.left-2&&mask.m.right<=mask.board.right+2,
    "Window M must fit completely inside the page: "+JSON.stringify(mask));
  assert(mask.veil.includes("0.2")&&mask.veilOpacity==="1",
    "Photo text contrast must remain an automatic 20% black veil");
  assert(await page.locator("#labRelation").inputValue()==="separada"&&
    await page.locator("#labArtboard").getAttribute("data-m-text")==="false",
    "Window mode should start with distinct typography and M fields");
  await page.screenshot({path:"composition-studio-m-janela.png"});

  await page.locator("#labPrecision-mScale").fill("88");
  await page.locator("#labPrecision-mScale").press("Enter");
  mask=await mGeometry();
  assert(mask.m.left>=mask.board.left-2&&mask.m.right<=mask.board.right+2,
    "Increasing window scale must not crop the M: "+JSON.stringify(mask));
  await clickCard("mMode","corte");
  mask=await mGeometry();
  assert(mask.mode==="corte"&&mask.m.right>mask.board.right+8,
    "Lateral cut must be deliberate and visibly bleed beyond the page: "+JSON.stringify(mask));
  await page.screenshot({path:"composition-studio-m-corte.png"});

  await clickCard("mMode","sutil");
  mask=await mGeometry();
  assert(mask.mode==="sutil"&&mask.imageHidden&&Number(mask.mOpacity)<.25,
    "Subtle mode must become a quiet M over a full photograph: "+JSON.stringify(mask));
  await page.screenshot({path:"composition-studio-m-sutil.png"});

  await clickCard("mMode","janela");
  await clickCard("photo","151");
  const focal=page.locator("#labFocalPreview");
  const rect=await focal.boundingBox();
  await focal.click({position:{x:rect.width*.8,y:rect.height*.3}});
  assert(await page.locator("#labFocusX").inputValue()==="80"&&
    await page.locator("#labFocusY").inputValue()==="30",
    "Direct photo-focus adjustment must remain available without a subfolder");
  await flatImageVisible("Image / M with changed photograph and focus");
  await page.screenshot({path:"composition-studio-desktop-image.png"});

  await tab("pagina");
  await tool("labFormat").click();
  await clickCard("format","quadrado");
  await page.locator("#labStudioDetail-pagina .lm-studio-back").click();
  await tab("texto");
  await tool("labTitleInput").click();
  await page.locator("#labTitleInput").fill("GASTROPERFORMANCE");
  await page.waitForTimeout(200);
  const longWord=await page.evaluate(()=>{
    const board=document.querySelector("#labArtboard");
    const line=document.querySelector("#labRenderedTitle .lm-lab-title-line");
    const rects=(()=>{const r=document.createRange();r.selectNodeContents(line);return [...r.getClientRects()]})();
    return {break:board.dataset.titleBreak,state:board.dataset.state,fragments:rects.length,font:getComputedStyle(line).fontSize};
  });
  assert(longWord.break==="normal"&&longWord.fragments===1&&longWord.state!=="overflow",
    "Long title must be scaled, never scattered into single-letter lines: "+JSON.stringify(longWord));
  await page.screenshot({path:"composition-studio-m-square-title.png"});
  await page.locator("#labStudioDetail-texto .lm-studio-back").click();
  await tab("pagina");
  await tool("labFormat").click();
  await clickCard("format","horizontal");
  await page.locator("#labStudioDetail-pagina .lm-studio-back").click();
  await tab("imagem");
  await flatImageVisible("Image / M after direct title editing");

  await page.setViewportSize({width:1366,height:768});
  await proveBoard("Laptop viewport 1366x768");
  await flatImageVisible("Laptop flat Image / M controls");
  await page.screenshot({path:"composition-studio-laptop.png"});

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(120);
  const mobile=await proveBoard("Mobile viewport 390x844");
  assert(mobile.board.width<=390,"Mobile canvas is cropped");
  assert(mobile.stage.height<=844*.47,
    "Horizontal mobile sheet must not leave an excessive empty letterbox");
  assert(await page.locator("#labStudioQuickReset").isVisible(),
    "Mobile studio must keep restore action within the viewport");
  await flatImageVisible("Mobile flat Image / M controls");
  await page.screenshot({path:"composition-studio-mobile.png"});
  await tab("pagina");
  await menuVisible("Mobile all page tools");
  await tool("labFormat").click();
  await clickCard("format","vertical");
  await proveBoard("Mobile portrait");
  await page.screenshot({path:"composition-studio-mobile-portrait.png"});
  await page.locator("#labStudioDetail-pagina .lm-studio-back").click();
  await tool("labFormat").click();
  await clickCard("format","quadrado");
  await proveBoard("Mobile square");
  await page.locator("#labStudioDetail-pagina .lm-studio-back").click();
  await tab("texto");
  await menuVisible("Mobile all text properties");
  await page.setViewportSize({width:390,height:700});
  await proveBoard("Short mobile 390x700");
  await menuVisible("Short mobile all text tools");
  await tab("imagem");
  await flatImageVisible("Short mobile flat Image / M controls");

  await page.locator("#labStudioToggle").click();
  assert(await page.locator("body").evaluate(el=>!el.classList.contains("lm-studio-open")),
    "Closing studio should restore normal manual");
  assert(await page.locator(".lm-studio-tool:visible").count()===0,
    "Studio-only controls leak into the original manual");
  assert(await page.locator("#labStudioQuickReset").isHidden(),
    "Mobile reset button must not intrude on the original manual");
  assert(await page.locator("#labArtboard").isVisible(),"Original applied page disappeared");
  assert(await page.locator("#construcao").count()===1,"The existing applied study was removed");
  assert(await page.locator("#aplicacoes-do-m").count()===1,"Three original-M applications need an accompanying guide");
  assert(await page.locator("#labMMode").count()===1&&
    await page.locator("#labMMode").evaluate(el=>Boolean(el.closest(".lm-inspector-primary"))),
    "M use control must return to the original manual without duplication");
  await page.locator("#labStudioToggle").click();
  assert(await page.locator("body").evaluate(el=>el.classList.contains("lm-studio-open")),
    "The studio cannot be reopened");
  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR viewport studio / proportions / all tools / editing OK");
}catch(error){
  console.error("STUDIO TEST FAILED",error);
  throw error;
}finally{
  await browser.close();
}