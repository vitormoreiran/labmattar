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
  assert(failures.length===0,"Javascript/browser errors: "+failures.join(" / "));
  console.log("LABMATTAR composition lab browser check OK");
}catch(e){
  console.error("LABMATTAR composition lab failed:",e);
  throw e;
}finally{
  await browser.close();
}
