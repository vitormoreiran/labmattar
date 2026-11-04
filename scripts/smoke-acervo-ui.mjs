/* LABMATTAR / Biblioteca pública + upload local (sem OAuth, fixtures). */
import {chromium} from "playwright";
import {readFileSync} from "node:fs";
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/compor.html";
const projectId="11OYn_dAihamP4E0PqmuIUcmo0Uk41rpZ",folderId="1TEST_FOLDER_ID";
const imageId="1aJPoakDL6XiESCJyEsAbZtm8_lDzyt2H",videoId="1RrVnSrK2_RZCwzhGx8senNWlu4GIYvhn";
const dot=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+sH+EAAAAASUVORK5CYII=","base64");
const movieManifest=await page.request.get(new URL("/motion/catalog.json",base).href);
assert(movieManifest.ok(),"Missing motion catalog for MP4 fixture");
const movieData=await movieManifest.json();
const videoResponse=await page.request.get(new URL(movieData.items[0].video,base).href);
assert(videoResponse.ok(),"Missing MP4 fixture");
const mp4=await videoResponse.body();
await page.route("**/acervo/index.json",route=>route.fulfill({status:200,contentType:"application/json",
  body:JSON.stringify({schemaVersion:1,rootId:"13SMGPjdZF3jxEmM4OmWi0T1OoBPCNJqW",
    projects:[{id:projectId,name:"Aleteia"}]})}));
await page.route("**/acervo/projects/*.json",route=>route.fulfill({status:200,contentType:"application/json",
  body:JSON.stringify({schemaVersion:1,projectId,entries:[
    {id:folderId,parent:projectId,kind:"folder",name:"Ato 1"},
    {id:imageId,parent:folderId,kind:"image",name:"Fotografia de Aleteia.jpg",mime:"image/jpeg"},
    {id:videoId,parent:folderId,kind:"video",name:"Aleteia Evento horizontal.mp4",mime:"video/mp4"}
  ]})}));
await page.route("**/api/acervo/public-thumb?*",route=>route.fulfill({
  status:200,contentType:"image/png",body:dot}));
await page.route("**/api/acervo/public-media?*",route=>{
  const video=route.request().url().includes(videoId);
  return route.fulfill({status:200,contentType:video?"video/mp4":"image/png",body:video?mp4:dot});
});
try{
  await page.goto(base,{waitUntil:"load",timeout:60000});
  await page.locator('button[data-mobile-module="fundo"]').click();
  assert(await page.locator("#labAcervoLaunch").isVisible(),"Library entry missing");
  assert(await page.locator("#labAcervoLocal").isVisible(),"Local upload entry missing");
  const choose=async()=>{
    await page.locator("#labAcervoLaunch").click();
    await page.locator("#labAcervoBrowser").waitFor({state:"visible"});
    assert(await page.locator("#labAcervoProviders").isHidden(),
      "Public library must not show Google OAuth first");
    await page.locator(".lm-acervo-folder").filter({hasText:"Aleteia"}).click();
    await page.locator(".lm-acervo-folder").filter({hasText:"Ato 1"}).click();
  };
  await choose();
  assert((await page.locator("#labAcervoPath").textContent()).includes("Ato 1"),
    "Nested project navigation failed");
  await page.locator(".lm-acervo-item").filter({hasText:"Fotografia de Aleteia.jpg"}).click();
  assert(await page.locator("#labAcervoDialog").isHidden(),"Picking photo closes library");
  assert((await page.locator("#labPhoto").inputValue()).startsWith("ext-"),
    "Photo was not applied to the editor");
  await choose();
  await page.locator(".lm-acervo-item").filter({hasText:"Aleteia Evento horizontal.mp4"}).click();
  await page.locator("#labClipSettings").waitFor({state:"visible"});
  assert(await page.locator("#labPageVideos video").count()===1,"Public video not added to page");
  const remote=await page.evaluate(()=>window.LabPages.create());
  assert(remote.pages[0].clips[0].provider==="public","Video must retain public-link origin");
  assert(remote.pages[0].clips[0].projectId===projectId,"Video project scoping lost");
  const localImageResponse=await page.request.get(new URL("/ambiente-editorial/media/BOXDOSENTIR-64.jpg",base).href);
  assert(localImageResponse.ok(),"Missing local JPG test fixture");
  await page.locator("#labAcervoLocalInput").setInputFiles({
    name:"imagem-local.jpg",mimeType:"image/jpeg",buffer:await localImageResponse.body()});
  try{
    await page.waitForFunction(()=>document.getElementById("labPhoto").value.startsWith("loc-"),
      null,{timeout:12000});
  }catch(error){
    const debug=await page.evaluate(()=>({
      current:document.getElementById("labAcervoCurrent").textContent,
      value:document.getElementById("labPhoto").value,
      file:document.getElementById("labAcervoLocalInput").files?.[0]?.name
    }));
    throw Error("Local image upload did not reach composition: "+JSON.stringify(debug)+" / "+error.message);
  }
  const embedded=await page.evaluate(()=>window.LabPages.create());
  assert(embedded.pages[0].composition.assets.some(a=>a.id.startsWith("photo:loc-")&&
    a.uri.startsWith("data:image/webp;base64,")),"Local image must be included in JSON");
  await page.evaluate(async doc=>window.LabPages.load(doc),embedded);
  assert((await page.locator("#labPhoto").inputValue()).startsWith("loc-"),
    "Local image missing after opening saved project");
  await page.locator("#labAcervoLocalInput").setInputFiles({
    name:"video-local.mp4",mimeType:"video/mp4",buffer:mp4});
  await page.waitForFunction(()=>window.LabPages?.create?.().pages[0].clips?.some(c=>c.provider==="local"),
    null,{timeout:25000});
  const mixed=await page.evaluate(()=>window.LabPages.create());
  assert(mixed.pages[0].clips.length===2,"Both public and local videos should be on the same page");
  assert(!JSON.stringify(mixed).includes("access_token"),"Project must not persist OAuth tokens");
  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR: public folder gallery without OAuth, nested project photos/videos, local image JSON and local IndexedDB video OK");
}finally{await browser.close();}
