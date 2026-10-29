import {chromium} from "playwright";

const url=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/composicao.html";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const failures=[];
page.on("pageerror",e=>failures.push(e.message));
page.on("console",msg=>{if(msg.type()==="error")failures.push(msg.text())});

const assert=(value,label)=>{if(!value)throw Error(label)};
async function read(){
  return page.evaluate(()=>{
    const b=document.querySelector("#labArtboard");
    const photo=document.querySelector("#labMask");
    const rect=b.getBoundingClientRect(),m=photo.getBoundingClientRect();
    const title=b.querySelector("#labRenderedTitle");
    const computed=getComputedStyle(b);
    return {
      state:b.dataset.state,format:b.dataset.format,image:b.dataset.image,relation:b.dataset.relation,
      photoText:b.dataset.photoText,mText:b.dataset.mText,board:{width:rect.width,height:rect.height},
      m:{width:m.width,height:m.height,mask:getComputedStyle(photo).maskImage,
        opacity:getComputedStyle(photo,"::after").opacity},
      backgroundOpacity:getComputedStyle(b.querySelector(".lm-lab-photo-contrast")).opacity,
      margin:computed.getPropertyValue("--lab-pad").trim(),
      title: title.textContent,lines:title.querySelectorAll(".lm-lab-title-line").length,
      body:b.querySelector("#labRenderedBody").textContent,
      bodyHidden:b.querySelector("#labRenderedBody").hidden,
      photoSrc:b.querySelector("#labAmbientPhoto").currentSrc,
      status:document.querySelector("#labStatus").textContent,
      symbol:document.querySelector("#labSignature").src
    };
  });
}
async function select(id,value){
  await page.locator("#"+id).selectOption(value);
  await page.waitForTimeout(75);
}
async function range(id,value){
  await page.locator("#"+id).evaluate((el,v)=>{
    el.value=String(v);
    el.dispatchEvent(new Event("input",{bubbles:true}));
  },value);
  await page.waitForTimeout(75);
}
async function allPhotos(){
  return page.evaluate(async()=>{
    const all=["64","179","151"];
    return Promise.all(all.map(async n=>{
      const r=await fetch("/ambiente-editorial/media/BOXDOSENTIR-"+n+".jpg");
      return r.status===200&&(await r.arrayBuffer()).byteLength>20000;
    }));
  });
}
try{
  await page.goto(url,{waitUntil:"load",timeout:60000});
  await page.locator("#labArtboard").waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(250);
  assert((await allPhotos()).every(Boolean),"Original Cada Corpo photos not available");
  const original=await read();
  assert(original.format==="horizontal"&&original.image==="nenhuma","Initial visual identity specimen was changed");
  assert(original.lines===3&&original.title.includes("PRÁTICAS"),"Base typography disappeared");
  assert(original.board.width/original.board.height>1.7,"Horizontal aspect ratio invalid");
  assert(original.photoText==="false"&&original.mText==="false","No-image mode should not use a darkening veil");
  assert(await page.locator("#construcao").count()===1,"Applied study removed");
  assert(original.state==="ok","Original typographic composition overflows its page");
  // Editorial-control UI has illustrated, keyboard-focusable choices.
  assert(await page.locator("[data-lab-choice]").count()>=30,"Illustrated choices are missing");
  assert(await page.locator("[data-lab-choice='format'][data-value='horizontal']").getAttribute("aria-pressed")==="true","Initial choice is not synchronized");
  assert(await page.locator(".lm-lab-presets .lm-ctrl-preset-visual").count()===3,"Three source presets should each have an illustration");
  await page.evaluate(()=>{
    const el=document.querySelector(".lm-lab-workspace");
    window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-65,behavior:"instant"});
  });
  await page.screenshot({path:"composition-lab-controls-desktop.png",fullPage:false});
  await page.locator("[data-lab-choice='format'][data-value='quadrado']").click();
  assert((await read()).format==="quadrado","Clicking the format illustration must change the actual canvas");
  assert(await page.locator("#labFormat").inputValue()==="quadrado","Illustrated format and native control got out of sync");
  assert(await page.locator("[data-lab-choice='format'][data-value='quadrado']").getAttribute("aria-pressed")==="true","Chosen card lacks an active state");
  await page.locator("[data-lab-choice='format'][data-value='horizontal']").click();
  await page.locator("[data-lab-choice='placement'][data-value='central']").click();
  assert(await page.locator("#labPlacement").inputValue()==="central","Placement illustration is inert");
  await page.locator("[data-lab-choice='placement'][data-value='esquerda']").click();
  await page.locator("[data-lab-choice='color'][data-value='red']").click();
  assert(await page.locator("#labColor").inputValue()==="red","Color swatch is inert");
  await page.locator("[data-lab-choice='color'][data-value='neutral']").click();
  await page.locator("[data-lab-choice='guides'][data-value='grid']").click();
  assert(await page.locator("#labArtboard").getAttribute("data-guide")==="grid","Illustrated guides are inert");
  await page.locator("[data-lab-choice='guides'][data-value='nenhuma']").click();
  await page.locator("[data-lab-choice='bodyMode'][data-value='visivel']").click();
  assert((await read()).bodyHidden===false,"Show-body illustration did not reveal text");
  await page.locator("[data-lab-choice='bodyMode'][data-value='oculto']").click();
  assert((await read()).bodyHidden===true,"Hide-body illustration did not conceal text");
  await page.locator("[data-lab-choice='type'][data-value='perpetua']").click();
  assert(await page.locator("#labType").inputValue()==="perpetua","Typeface illustration is inert");
  await page.locator("[data-lab-choice='type'][data-value='alternada']").click();
  const colorStateBefore=await page.locator("#labColor").inputValue();
  await page.locator("[data-lab-choice='image'][data-value='recorte']").click();
  assert((await read()).image==="recorte","M mask illustration did not activate the image");
  assert(await page.locator("[data-lab-choice='color'][data-value='green']").isDisabled(),"Color selector must disable while photography is present");
  await page.locator("[data-lab-choice='photo'][data-value='151']").click();
  assert((await read()).photoSrc.includes("BOXDOSENTIR-151.jpg"),"Thumbnail did not change the photograph");
  assert(await page.locator("#labFocusImage").evaluate(el=>getComputedStyle(el).backgroundImage.includes("151.jpg")),"Focus diagram did not follow the selected photo");
  await page.locator("[data-lab-choice='mPosition'][data-value='esquerda']").click();
  assert(await page.locator("#labMPosition").inputValue()==="esquerda","M-placement illustration is inert");
  await page.locator("[data-lab-choice='image'][data-value='nenhuma']").click();
  assert(await page.locator("#labColor").inputValue()===colorStateBefore,"Switching image mode should preserve color selection");
  assert(await page.locator("[data-lab-choice='color'][data-value='green']").isEnabled(),"Color swatches did not reactivate");
  await page.locator("#labReset").click();
  await page.locator("#labArtboard").screenshot({path:"composition-lab-typography.png"});

  await page.locator('[data-lab-preset="mascara"]').click();
  await page.waitForTimeout(200);
  let data=await read();
  assert(data.image==="recorte"&&data.lines===3,"Masked photo preset did not change composition");
  console.log("MASK PRESET STATUS",data.state,data.status);
  assert(data.photoText==="true"&&data.backgroundOpacity==="1","20% background veil did not activate");
  assert(data.m.mask.includes("m-publicado.svg"),"Original M geometry not used as mask");
  assert(Math.abs(data.m.width/data.m.height-990.08/743.18)<.05,"M image distorted");
  await select("labMPosition","esquerda");
  await range("labMScale",95);
  data=await read();
  assert(data.mText==="true"&&data.m.opacity==="1","M must darken by 20% when the text intersects it");
  const color=await page.locator("#labMask").evaluate(el=>getComputedStyle(el,"::after").backgroundColor);
  assert(color.includes("0.2")||color.includes("0.20"),"M overlay is not 20% opaque black");
  await page.locator("#labArtboard").screenshot({path:"composition-lab-m-overlay.png"});

  await select("labRelation","separada");
  await select("labMPosition","direita");
  await range("labMScale",45);
  await range("labTextWidth",40);
  data=await read();
  assert(data.mText==="false"&&data.m.opacity==="0","M must not darken automatically when no text overlaps");
  await range("labFocusX",30);
  await range("labFocusY",70);
  const foc=await page.locator("#labArtboard").evaluate(el=>getComputedStyle(el).getPropertyValue("--lab-focus-x").trim()+","+getComputedStyle(el).getPropertyValue("--lab-focus-y").trim());
  assert(foc==="30%,70%","Photo focus control not connected");

  await select("labFormat","vertical");
  data=await read();
  assert(data.format==="vertical"&&Math.abs(data.board.width/data.board.height-9/16)<.02,"Vertical canvas not responsive");
  await page.locator("#labArtboard").screenshot({path:"composition-lab-vertical.png"});
  await select("labFormat","quadrado");
  data=await read();
  assert(Math.abs(data.board.width/data.board.height-1)<.02,"Square canvas ratio invalid");
  await select("labFormat","editorial");
  data=await read();
  assert(Math.abs(data.board.width/data.board.height-1.414)<.02,"Editorial canvas ratio invalid");

  await page.locator('[data-lab-preset="imagem"]').click();
  await page.waitForTimeout(100);
  data=await read();
  assert(data.image==="inteira"&&data.photoText==="true"&&data.backgroundOpacity==="1","Fullbleed photo text needs 20% black overlay");
  console.log("FULL IMAGE PRESET STATUS",data.state,data.status);
  await page.locator("#labArtboard").screenshot({path:"composition-lab-full-image.png"});
  await select("labGuides","grid");
  assert(await page.locator("#labArtboard").getAttribute("data-guide")==="grid","12-column guide toggle is inert");
  await select("labSymbol","vaso_09.svg");
  data=await read();
  assert(data.symbol.endsWith("/identidade/vaso_09.svg"),"Ninth official vessel unavailable");
  await select("labPhoto","151");
  data=await read();
  assert(data.photoSrc.includes("BOXDOSENTIR-151.jpg"),"Photo selection not linked");
  await page.locator("#labTitleInput").fill("CORPOS\nEM MOVIMENTO");
  await select("labType","perpetua");
  data=await read();
  assert(data.lines===2&&data.title==="CORPOSEM MOVIMENTO","Live title editing not applied");
  await page.locator("#labBodyInput").fill("Texto de leitura experimental com outra densidade.");
  data=await read();
  assert(data.body.includes("outra densidade")&&!data.bodyHidden,"Live body editing not applied");
  await select("labImage","nenhuma");
  data=await read();
  assert(data.photoText==="false"&&data.mText==="false","Photo veil survives without a photograph");
  await select("labColor","green");
  const bgcolor=await page.locator("#labArtboard").evaluate(el=>getComputedStyle(el).backgroundColor);
  assert(bgcolor==="rgb(143, 216, 27)","Background color not applied");

  await page.reload({waitUntil:"load"});
  await page.waitForTimeout(175);
  assert(await page.locator("#labColor").inputValue()==="green","Local experiment state is not preserved");
  await page.locator("#labReset").click();
  data=await read();
  assert(data.image==="nenhuma"&&data.format==="horizontal"&&data.lines===3,"Restore does not recover the original study");
  assert(await page.locator("#labSymbol").inputValue()==="none","Restore should preserve the original no-symbol state");
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    const el=document.querySelector(".lm-ctrl-inspector-intro");
    window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-24,behavior:"instant"});
  });
  const mobileChoices=await page.evaluate(()=>{
    const bounds=document.querySelector(".lm-lab-inspector").getBoundingClientRect();
    return [...document.querySelectorAll(".lm-lab-inspector .lm-ctrl-choice")].map(el=>{
      const r=el.getBoundingClientRect();
      return {x:r.left,right:r.right,sw:r.width,inside:r.left>=bounds.left-1&&r.right<=bounds.right+1};
    });
  });
  assert(mobileChoices.every(x=>x.inside&&x.sw>45),"Illustrated control leaves the mobile inspector: "+JSON.stringify(mobileChoices.slice(0,8)));
  await page.screenshot({path:"composition-lab-controls-mobile.png",fullPage:false});
  // Regression from the actual 1:1 red-square composition:
  // GASTROPERFORMANCE in Perpetua must never overrun the safe text margin.
  async function assertReadingBoundary(label){
    await page.waitForTimeout(90);
    const data=await page.evaluate(()=>{
      const board=document.querySelector("#labArtboard");
      const safe=document.querySelector("#labReading").getBoundingClientRect();
      const column=document.querySelector("#labCopy").getBoundingClientRect();
      const title=document.querySelector("#labRenderedTitle");
      const nodes=[...title.querySelectorAll(".lm-lab-title-line")];
      const body=document.querySelector("#labRenderedBody");
      if(!body.hidden)nodes.push(body);
      const rects=nodes.flatMap(node=>{
        const range=document.createRange();
        range.selectNodeContents(node);
        const found=[...range.getClientRects()];
        return found.map(r=>({x:r.left,right:r.right,y:r.top,bottom:r.bottom,w:r.width,h:r.height,text:node.textContent.slice(0,35)}));
      });
      const epsilon=2.5;
      return {
        fit:board.dataset.typeFit,state:board.dataset.state,mode:board.dataset.titleBreak,
        safe:{left:safe.left,right:safe.right,top:safe.top,bottom:safe.bottom},
        column:{left:column.left,right:column.right,top:column.top,bottom:column.bottom},
        titleSize:parseFloat(getComputedStyle(title).fontSize),
        sourceScale:document.querySelector("#labTitleScale").value,
        invalid:rects.filter(r=>r.w>0&&r.h>0&&(
          r.x<safe.left-epsilon||r.right>safe.right+epsilon||
          r.x<column.left-epsilon||r.right>column.right+epsilon||
          r.y<safe.top-epsilon||r.bottom>safe.bottom+epsilon
        )),
        scroll: nodes.filter(n=>n.scrollWidth>n.clientWidth+2.5).map(n=>n.textContent.slice(0,35))
      };
    });
    assert(data.fit!=="review"&&data.state!=="overflow",
      label+" could not be fitted to the reading zone: "+JSON.stringify(data));
    assert(!data.invalid.length&&!data.scroll.length,
      label+" text crosses the reading margin: "+JSON.stringify(data));
    return data;
  }
  await page.locator('[data-lab-preset="tipografia"]').click();
  await select("labFormat","quadrado");
  await select("labColor","red");
  await range("labMargin",4);
  await range("labTextWidth",90);
  await range("labTitleScale",110);
  await select("labType","perpetua");
  await page.locator("#labTitleInput").fill("GASTROPERFORMANCE");
  await select("labBodyMode","visivel");
  let boundary=await assertReadingBoundary("Screenshot: red square GASTROPERFORMANCE");
  assert(["natural","adjusted","compromised"].includes(boundary.fit),
    "The title may retain its requested size when it fits; it must never overflow");
  console.log("SQUARE AUTOMATIC FIT",JSON.stringify({size:boundary.titleSize,fit:boundary.fit}));
  await page.locator("#labArtboard").screenshot({path:"composition-lab-margin-fit-square.png"});

  // Stress the interaction itself: after changing width, margin, format and
  // typography, the requested 140% is a CAP, never a right to cross safe limits.
  await range("labTitleScale",140);
  await range("labMargin",16);
  await range("labTextWidth",40);
  for(const fmt of ["horizontal","vertical","quadrado","editorial"]){
    await select("labFormat",fmt);
    for(const face of ["univers","perpetua","alternada"]){
      await select("labType",face);
      await assertReadingBoundary(fmt+" / "+face+" / margin 16% / scale 140%");
    }
  }
  await page.locator("#labTitleInput").fill("COMPOSIÇÕES EXTREMAMENTE LONGAS\nENTRE PALAVRAS COMPLETAS\nGASTROPERFORMANCE");
  await assertReadingBoundary("Long title with explicit editorial breaks");
  await page.locator("#labTitleInput").fill("MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM");
  await assertReadingBoundary("Long unbreakable title safety fallback");
  await page.locator("#labBodyInput").fill("Um texto mais longo que também precisa permanecer dentro da coluna de leitura. ".repeat(4));
  await assertReadingBoundary("Long body plus title");

  // Physical phone viewport changes layout geometry without permitting
  // the typography to expand outside the column.
  await page.setViewportSize({width:390,height:844});
  for(const fmt of ["horizontal","vertical","quadrado"]){
    await select("labFormat",fmt);
    await assertReadingBoundary("Physical mobile viewport / "+fmt);
  }
  await page.locator("#labReset").click();
  const restored=await assertReadingBoundary("Restored base composition");
  assert(restored.fit!=="review","Baseline degraded after typography test");

  assert(failures.length===0,"Javascript/browser errors: "+failures.join(" / "));
  console.log("LABMATTAR composition lab browser check OK");
}catch(e){
  console.error("LABMATTAR composition lab failed:",e);
  throw e;
}finally{
  await browser.close();
}
