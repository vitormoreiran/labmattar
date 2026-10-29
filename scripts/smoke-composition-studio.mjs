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
/* Editorial integrity: the browser zoom must not become a typography
   parameter. All roles share the same left ruler in every artboard ratio. */
async function editorialMetrics(label){
  await page.waitForTimeout(80);
  const m=await page.evaluate(()=>{
    const board=document.querySelector("#labArtboard");
    const b=board.getBoundingClientRect();
    const safe=document.querySelector("#labReading").getBoundingClientRect();
    const copy=document.querySelector("#labCopy").getBoundingClientRect();
    const title=document.querySelector("#labRenderedTitle");
    const body=document.querySelector("#labRenderedBody");
    const kicker=document.querySelector("#labKicker");
    const footer=document.querySelector(".lm-lab-bottom");
    const tr=title.getBoundingClientRect(),br=body.getBoundingClientRect();
    const kr=kicker.getBoundingClientRect(),fr=footer.getBoundingClientRect();
    const styles={
      title:getComputedStyle(title),body:getComputedStyle(body),
      kicker:getComputedStyle(kicker),copy:getComputedStyle(document.querySelector("#labCopy"))
    };
    return {
      format:board.dataset.format,state:board.dataset.state,width:b.width,
      titleRatio:parseFloat(styles.title.fontSize)/b.width,
      bodyRatio:parseFloat(styles.body.fontSize)/b.width,
      detailRatio:parseFloat(styles.kicker.fontSize)/b.width,
      leftAligned:styles.copy.textAlign==="left"&&
        styles.body.textAlign!=="center"&&(body.hidden||Math.abs(tr.left-br.left)<2),
      safe:{
        copyLeft:copy.left>=safe.left-1.5,copyRight:copy.right<=safe.right+1.5,
        copyTop:copy.top>=kr.bottom-2,copyBottom:copy.bottom<=fr.top+2,
        kicker:kr.top>=safe.top-1.5,footer:fr.bottom<=safe.bottom+1.5
      },
      titleBreak:board.dataset.titleBreak
    };
  });
  assert(m.leftAligned,label+": title and body diverged from the left ruler "+JSON.stringify(m));
  assert(Object.values(m.safe).every(Boolean),label+": text is outside the useful area "+JSON.stringify(m));
  assert(m.titleBreak==="normal",label+": words fragmented instead of keeping editorial groups "+JSON.stringify(m));
  return m;
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
  assert(g.inspector.scrollHeight<=g.inspector.height+3,
    label+": inspector requires vertical scrolling "+JSON.stringify(g));
  assert(g.bodyOverflow==="hidden",label+": page background is scrollable");
  return g;
}
async function menuVisible(label){
  const g=await geometry();
  assert(g.toolRects.length>=2,label+": tool menu missing");
  assert(g.toolRects.every(t=>t.visible&&t.w>75&&t.h>30&&
    t.y>=g.panel.top-1&&t.bottom<=g.panel.bottom+1.5&&
    t.x>=g.inspector.left-1&&t.right<=g.inspector.right+1.5),
    label+": some controls require scrolling or are clipped: "+JSON.stringify(g.toolRects));
  return g;
}
async function expandedBelow(panelName,label){
  await page.waitForTimeout(75);
  const state=await page.evaluate(name=>{
    const panel=document.querySelector("#labPanel-"+name);
    const menu=panel.querySelector(".lm-studio-tools");
    const detail=panel.querySelector(".lm-studio-detail");
    const inspector=document.querySelector(".lm-lab-inspector");
    const m=menu.getBoundingClientRect(),d=detail.getBoundingClientRect(),p=panel.getBoundingClientRect();
    const ir=inspector.getBoundingClientRect();
    return {
      menuVisible:getComputedStyle(menu).display!=="none"&&menu.getClientRects().length>0,
      detailVisible:!detail.hidden&&getComputedStyle(detail).display!=="none",
      menu:{top:m.top,bottom:m.bottom,height:m.height},
      detail:{top:d.top,bottom:d.bottom,height:d.height},
      panel:{top:p.top,bottom:p.bottom},
      inspector:{height:ir.height,scrollHeight:inspector.scrollHeight},
      buttons:[...menu.querySelectorAll(".lm-studio-tool")].filter(b=>!b.hidden).map(b=>{
        const r=b.getBoundingClientRect();
        return {id:b.dataset.studioTool,expanded:b.getAttribute("aria-expanded"),top:r.top,bottom:r.bottom}
      })
    };
  },panelName);
  assert(state.menuVisible&&state.detailVisible,label+": menu must remain visible with its inline options "+JSON.stringify(state));
  assert(state.detail.bottom<=state.panel.bottom+2,label+": options are clipped below inspector "+JSON.stringify(state));
  assert(state.inspector.scrollHeight<=state.inspector.height+3,label+": showing options requires scrolling "+JSON.stringify(state));
  assert(state.buttons.every(b=>b.top>=state.panel.top-2&&b.bottom<=state.panel.bottom+2),
    label+": a property disappeared or was pushed below the inspector "+JSON.stringify(state));
  const activeRow=state.buttons.find(b=>b.expanded==="true");
  assert(activeRow&&state.buttons.filter(b=>b.expanded==="true").length===1,
    label+": only the selected property should be expanded "+JSON.stringify(state));
  assert(state.detail.top>=activeRow.bottom-2&&state.detail.top<=activeRow.bottom+8,
    label+": options should open IMMEDIATELY below the chosen property "+JSON.stringify(state));
  assert(state.buttons.filter(b=>b.top>activeRow.top).every(b=>b.top>=state.detail.bottom-1),
    label+": the remaining list must continue below the inline options "+JSON.stringify(state));
  return state;
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
  assert(await page.locator("[data-studio-tool]").count()===19,
    "All 19 page, typography and image tools must retain one canonical input");
  await page.screenshot({path:"composition-studio-desktop-initial-review.png",fullPage:false});
  const baseline=await proveBoard("Desktop horizontal 1440x900");
  const initialType=await editorialMetrics("Desktop horizontal typography");
  await page.setViewportSize({width:1280,height:850});
  await page.waitForTimeout(180);
  const resizedType=await editorialMetrics("Resized horizontal typography");
  for(const role of ["titleRatio","bodyRatio","detailRatio"]){
    assert(Math.abs(initialType[role]-resizedType[role])<.002,
      "Resizing the studio must change zoom, not typography: "+role+" / "+
      JSON.stringify({initialType,resizedType}));
  }
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(130);
  assert(baseline.board.width>720,"Horizontal composition should receive the remaining desktop width");
  assert(await page.locator(".lm-inspector-head>span").textContent()==="AJUSTES",
    "Inspector hierarchy should be concise");
  const studioStyling=await page.evaluate(()=>({
    backdrop:getComputedStyle(document.querySelector(".lm-lab-stage")).backgroundColor,
    pane:getComputedStyle(document.querySelector(".lm-lab-inspector")).backgroundColor,
    rowDirection:getComputedStyle(document.querySelector('[data-studio-tool="labFormat"]')).flexDirection,
    itemCount:document.querySelectorAll('[data-studio-tool="labFormat"] .lm-ctrl-visual').length
  }));
  assert(studioStyling.rowDirection==="row"&&!studioStyling.itemCount,
    "Property tools should be quiet label/value rows, not decorative cards "+JSON.stringify(studioStyling));
  await menuVisible("Desktop page properties");
  await page.screenshot({path:"composition-studio-desktop-horizontal.png"});

  await tab("pagina");
  await tool("labFormat").click();
  assert(await page.locator("#labStudioDetail-pagina").isVisible()&&
    await page.locator(".lm-studio-tools[data-studio-tools=pagina]").isVisible(),
    "Opening a property must preserve the menu and reveal a section underneath");
  await expandedBelow("pagina","Desktop format expanded");
  await page.screenshot({path:"composition-studio-desktop-expanded-below.png"});
  await tool("labMargin").click();
  await expandedBelow("pagina","Switched to margin without losing menu");
  assert(await page.locator("#labMargin").isVisible(),"Newly selected property was not placed below the list");
  assert(await page.locator('.lm-studio-tools[data-studio-tools="pagina"] .lm-studio-detail').count()===1,
    "Inline detail must remain inside the selected menu hierarchy");
  assert(await page.locator("#labFormat").isHidden(),"Previous property should close when another is selected");
  await tool("labFormat").click();
  await expandedBelow("pagina","Format restored below menu");
  await clickCard("format","vertical");
  assert(await page.locator("#labTextWidth").inputValue()==="90",
    "Portrait must recompose its column rather than inherit narrow landscape width");
  const portrait=await proveBoard("Desktop vertical 1440x900");
  await assertEditorialTitleGroups("Vertical title group");
  await editorialMetrics("Vertical editorial ruler");
  assert(portrait.board.height>500&&portrait.board.width>250,
    "Portrait layout should grow to use the available height");
  await page.screenshot({path:"composition-studio-desktop-portrait.png"});
  await clickCard("format","quadrado");
  assert(await page.locator("#labTextWidth").inputValue()==="78",
    "Square must use its own editorial column width");
  const square=await proveBoard("Desktop square 1440x900");
  await assertEditorialTitleGroups("Square title group");
  await editorialMetrics("Square editorial ruler");
  assert(approx(square.board.width,square.board.height,1),"Square was not rendered 1:1");
  await page.screenshot({path:"composition-studio-desktop-square.png"});
  await clickCard("format","editorial");
  assert(await page.locator("#labTextWidth").inputValue()==="70",
    "Editorial format must have its own column width");
  await proveBoard("Desktop editorial 1440x900");
  await editorialMetrics("Editorial format ruler");
  await clickCard("format","horizontal");
  assert(await page.locator("#labTextWidth").inputValue()==="61",
    "Returning to landscape must restore the original column width");
  await tool("labFormat").click();
  await menuVisible("Page menu restored without scrolling");

  await tab("texto");
  await menuVisible("Text tools no scrolling");
  await tool("labTitleScale").click();
  await expandedBelow("texto","Desktop typography slider expanded");
  assert(await page.locator("#labTitleScale").isVisible(),"Typography slider should be visible when selected");
  await page.locator("#labPrecision-titleScale").fill("120");
  await page.locator("#labPrecision-titleScale").press("Enter");
  assert(await page.locator("#labTitleScale").inputValue()==="120",
    "The focused palette must preserve exact scale values");
  await tool("labTitleScale").click();
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
  assert(await page.locator("#labMMode").isHidden(),"Invented M-use modes must not be exposed");
  assert(await page.locator("#labMMode").inputValue()==="janela","M geometry must use the single structural mode");
  await flatImageVisible("Full M controls visible");
  let mask=await mGeometry();
  assert(mask.mode==="janela"&&mask.vector.includes("m-publicado.svg"),
    "The composition must use the original M SVG");
  assert(mask.m.left>=mask.board.left-2&&mask.m.right<=mask.board.right+2,
    "The M must remain inside the structural page area: "+JSON.stringify(mask));
  assert(mask.veil.includes("0.2")&&mask.veilOpacity==="1",
    "Photo text contrast must remain an automatic 20% black veil");
  const maskTextState=await page.locator("#labArtboard").evaluate(el=>({
    relation:document.querySelector("#labRelation").value,
    overlaps:el.dataset.mText==="true",validation:el.dataset.state
  }));
  assert(maskTextState.relation==="lado-a-lado"&&
    ["ok","collision","overflow"].includes(maskTextState.validation),
    "The text/M relationship must stay selected and expose its validation state: "+
    JSON.stringify(maskTextState));
  await page.screenshot({path:"composition-studio-m-structural.png"});

  const formatScaleMax=Number(await page.locator("#labMScale").getAttribute("max"));
  await page.locator("#labPrecision-mScale").fill(String(Math.min(88,formatScaleMax)));
  await page.locator("#labPrecision-mScale").press("Enter");
  const scaleBeforeMove=await page.locator("#labMScale").inputValue();
  await page.locator('[data-lab-choice="relation"][data-value="topo"]').click();
  assert(await page.locator("#labMScale").inputValue()===scaleBeforeMove,
    "Changing the text + M relationship must not change M scale");
  await page.locator("#labGap").fill("7");
  await page.locator("#labGap").dispatchEvent("input");
  assert(await page.locator("#labMScale").inputValue()===scaleBeforeMove,
    "Changing text + M distance must not change M scale");
  mask=await mGeometry();
  assert(mask.m.left>=mask.board.left-2&&mask.m.right<=mask.board.right+2&&
    mask.m.top>=mask.board.top-2&&mask.m.bottom<=mask.board.bottom+2,
    "Format-aware M scale must keep the full M inside the page: "+JSON.stringify(mask));

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
  await tool("labFormat").click();
  await tab("texto");
  await tool("labTitleInput").click();
  await expandedBelow("texto","Desktop direct text field below menu");
  await page.locator("#labTitleInput").fill("GASTROPERFORMANCE");
  await page.waitForTimeout(200);
  const longWord=await page.evaluate(()=>{
    const board=document.querySelector("#labArtboard");
    const line=document.querySelector("#labRenderedTitle .lm-lab-title-line");
    const rects=(()=>{const r=document.createRange();r.selectNodeContents(line);return [...r.getClientRects()]})();
    return {break:board.dataset.titleBreak,state:board.dataset.state,fragments:rects.length,font:getComputedStyle(line).fontSize};
  });
  const longWordStatus=await page.locator("#labStatus").textContent();
  assert(longWord.break==="normal"&&longWord.fragments===1&&
    (longWord.state!=="overflow"||/REVER/.test(longWordStatus||"")),
    "Long title must preserve whole words and expose any invalid layout: "+
    JSON.stringify({longWord,longWordStatus}));
  await page.screenshot({path:"composition-studio-m-square-title.png"});
  await tool("labTitleInput").click();
  await tab("pagina");
  await tool("labFormat").click();
  await clickCard("format","horizontal");
  await tool("labFormat").click();
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
  await expandedBelow("pagina","Mobile menu remains visible with format options");
  const illustratedOptions=await page.locator("#labStudioDetail-pagina .lm-ctrl-choice").evaluateAll(cards=>
    cards.map(card=>{
      const visual=card.querySelector(".lm-ctrl-visual"),name=card.querySelector(".lm-ctrl-name");
      const art=visual?.firstElementChild;
      return {name:name?.textContent||"",iconBottom:art?.getBoundingClientRect().bottom||0,
        labelTop:name?.getBoundingClientRect().top||0};
    }));
  assert(illustratedOptions.length===4&&illustratedOptions.every(x=>x.iconBottom<=x.labelTop+1),
    "Mobile icons and labels should not overlap in the expanded section: "+JSON.stringify(illustratedOptions));
  await page.screenshot({path:"composition-studio-mobile-expanded-below.png"});
  await clickCard("format","vertical");
  await proveBoard("Mobile portrait");
  const portraitTitle=await page.evaluate(()=>{
    const b=document.querySelector("#labArtboard");
    const title=document.querySelector("#labRenderedTitle");
    const line=title.querySelector(".lm-lab-title-line")||title;
    const range=document.createRange();range.selectNodeContents(line);
    return {text:title.textContent.trim(),break:b.dataset.titleBreak,
      fragments:range.getClientRects().length,
      width:title.getBoundingClientRect().width,
      font:parseFloat(getComputedStyle(title).fontSize)};
  });
  assert(portraitTitle.text==="GASTROPERFORMANCE"&&portraitTitle.break==="normal"&&
    portraitTitle.fragments===1&&portraitTitle.font>=12,
    "Portrait M composition must keep long words intact on a usable full-width title axis: "+
    JSON.stringify(portraitTitle));
  await page.screenshot({path:"composition-studio-mobile-portrait.png"});
  await tool("labFormat").click();
  await tool("labFormat").click();
  await clickCard("format","quadrado");
  await proveBoard("Mobile square");
  await tool("labFormat").click();
  await tab("texto");
  await menuVisible("Mobile all text properties");
  await page.setViewportSize({width:390,height:700});
  await proveBoard("Short mobile 390x700");
  await menuVisible("Short mobile all text tools");
  await tool("labType").click();
  await expandedBelow("texto","Short mobile 390x700 text options below persistent menu");
  await tool("labType").click();
  await menuVisible("Short mobile text tools restored");
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
  assert(await page.locator(".lm-studio-detail:visible").count()===0,
    "Expanded studio controls must not leak into the regular manual");
  assert(await page.locator("#construcao").count()===1,"The existing applied study was removed");
  assert(await page.locator("#regras-de-composicao").count()===1,"Composition rules must remain visible in the manual");
  assert(await page.locator("#labMMode").count()===1&&await page.locator("#labMMode").isHidden(),
    "The fixed M structural mode must remain internal and not become a user-facing choice");
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