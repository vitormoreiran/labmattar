/* Teste do fluxo de interface de mídia, sem acessar contas ou tokens reais. */
import {chromium} from "playwright";
const assert=(value,message)=>{if(!value)throw Error(message)};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",err=>errors.push(err.message));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/compor.html";
let configured=false;
await page.route("**/api/acervo/status",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({
    providers:{
      google:{configured:false,connected:false},
      dropbox:{configured,connected:configured}
    },
    picker:{apiKey:null,appId:null}
  })
}));
const dot="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+sH+EAAAAASUVORK5CYII=";
await page.route("**/api/acervo/dropbox/list?*",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({
    entries:[{kind:"image",provider:"dropbox",id:"id:abcdefghij",
      name:"Fotografia de teste.jpg",mimeType:"image/jpeg",
      original:"/api/acervo/media?provider=dropbox&id=id%3Aabcdefghij",
      preview:"/api/acervo/thumb?provider=dropbox&id=id%3Aabcdefghij"}],
    hasMore:false,cursor:null
  })
}));
for(const part of ["media","thumb"]){
  await page.route("**/api/acervo/"+part+"?*",route=>route.fulfill({
    status:200,contentType:"image/png",body:Buffer.from(dot,"base64")
  }));
}
try{
  await page.goto(base,{waitUntil:"load",timeout:60000});
  await page.locator('button[data-mobile-module="fundo"]').click();
  assert(await page.locator("#labAcervoDialog").isHidden(),"Dialog should never be forced on editor load");
  assert(await page.locator("#labAcervoLaunch").isVisible(),"One clear media library entry");
  assert(await page.locator("#labAcervoLaunch .lm-acervo-provider-icon").count()===2,
    "Both provider icons appear in the compact entry");
  await page.locator("#labAcervoLaunch").click();
  await page.locator("#labAcervoConnect-google").waitFor({state:"visible"});
  assert(await page.locator("#labAcervoConnect-google .lm-acervo-provider-icon").count()===1,
    "Google Drive icon displayed in modal");
  assert(await page.locator("#labAcervoConnect-dropbox .lm-acervo-provider-icon").count()===1,
    "Dropbox icon displayed in modal");
  await page.locator("#labAcervoConnect-google").click();
  await page.locator("#labAcervoSetup").waitFor({state:"visible"});
  await page.waitForFunction(()=>document.getElementById("labAcervoSetupTitle")?.textContent?.includes("Google Drive"));
  assert((await page.locator("#labAcervoSetupTitle").innerText()).includes("Google Drive"),
    "Missing OAuth setup shows an actionable inline explanation");
  assert((await page.locator("#labAcervoSetupText").innerText()).includes("Cloudflare"),
    "Missing OAuth must clearly identify what configuration is needed");
  assert(await page.locator("#labAcervoSetupDocs").isVisible(),"Help link available");
  await page.screenshot({path:"laboratorio-acervo-ativacao.png"});
  await page.locator("#labAcervoClose").click();
  assert(await page.locator("#labAcervoDialog").isHidden(),"Dialog closes without affecting the canvas");
  assert(await page.evaluate(()=>document.activeElement?.id==="labAcervoLaunch"),
    "Focus returns to the library button");
  configured=true;
  await page.locator("#labAcervoLaunch").click();
  await page.locator("#labAcervoConnect-dropbox").waitFor({state:"visible"});
  await page.waitForFunction(()=>document.getElementById("labAcervoConnection-dropbox")?.textContent?.includes("Conectado"));
  await page.locator("#labAcervoConnect-dropbox").click();
  await page.locator("#labAcervoBrowser").waitFor({state:"visible"});
  await page.locator(".lm-acervo-item").first().click();
  assert(await page.locator("#labAcervoDialog").isHidden(),"Selecting a photo closes the modal");
  const selection=await page.locator("#labPhoto").inputValue();
  assert(selection.startsWith("ext-"),"Existing photo input receives the authorized media key");
  assert((await page.locator("#labAcervoCurrent").innerText()).includes("Fotografia de teste"),
    "Selected asset shown in the library");
  assert(await page.locator("#labArtboard").isVisible(),"The same composition preview remains active");
  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR acervo UI: icons, missing OAuth, connected source and photo selection OK");
}finally{await browser.close()}
