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
    {id:videoId,parent:folderId,kind:"video",name:"Aleteia Evento horizontal.mp4",mime:"video/mp4"},
    ...Array.from({length:39},(_,i)=>({id:"1testeFoto"+String(i).padStart(3,"0")+"Abcd12",
      parent:folderId,kind:"image",name:"Fotografia adicional "+String(i+1).padStart(2,"0")+".jpg",
      mime:"image/jpeg"}))
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
  assert(await page.locator('[data-acervo-group="media"] .lm-acervo-group-grid .lm-acervo-item').count()===41,
    "Photographs and videos must remain visible in the media section");
  await page.setViewportSize({width:751,height:892});
  const layout=await page.evaluate(()=>{
    const dialog=document.querySelector(".lm-acervo-dialog"),
      items=document.querySelector("#labAcervoItems"),
      thumb=document.querySelector(".lm-acervo-file .lm-acervo-thumb"),
      title=document.querySelector("#labAcervoTitle"),
      header=document.querySelector(".lm-acervo-browser-tools"),
      footer=document.querySelector(".lm-acervo-dialog-bottom"),
      grid=document.querySelector(".lm-acervo-media-grid");
    const box=el=>{const b=el.getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    return {dialogHeight:dialog.clientHeight,dialogScrollHeight:dialog.scrollHeight,
      itemsHeight:items.clientHeight,itemsScrollHeight:items.scrollHeight,
      thumb:box(thumb),title:box(title),header:box(header),footer:box(footer),
      cols:getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      totalButtons:grid.querySelectorAll("button").length,
      scrollbar:getComputedStyle(items).overflowY};
  });
  assert(layout.dialogScrollHeight<=layout.dialogHeight+3,
    "Modal must not create a second vertical scrollbar: "+JSON.stringify(layout));
  assert(layout.itemsScrollHeight>layout.itemsHeight*1.6,
    "Long photo galleries must scroll inside the asset area: "+JSON.stringify(layout));
  assert(layout.thumb.width>140&&layout.thumb.height>100,
    "Thumbnails must remain large enough to identify photos: "+JSON.stringify(layout));
  assert(layout.header.bottom<layout.footer.top&&layout.title.height>15,
    "Location, search and footer must remain visible: "+JSON.stringify(layout));
  assert(layout.cols>=2,"Media gallery should remain multi-column at 751px: "+JSON.stringify(layout));
  await page.setViewportSize({width:1440,height:900});
  await page.locator(".lm-acervo-item").filter({hasText:"Fotografia de Aleteia.jpg"}).click();
  assert(await page.locator("#labAcervoDialog").isHidden(),"Picking photo closes library");
  assert((await page.locator("#labPhoto").inputValue()).startsWith("ext-"),
    "Photo was not applied to the editor");
  await choose();
  await page.locator(".lm-acervo-item").filter({hasText:"Aleteia Evento horizontal.mp4"}).click();
  await page.locator("#labAmbientVideo").waitFor({state:"visible"});
  assert(await page.locator("#labArtboard").getAttribute("data-video-background")==="true",
    "Selecting a public video must apply it as background");
  assert(await page.locator("#labPageVideos video").count()===0,
    "Selecting a background must not create a movable clip");
  const remote=await page.evaluate(()=>window.LabPages.create());
  assert(remote.pages[0].backgroundVideo.provider==="public","Video background must retain public-link origin");
  assert(remote.pages[0].backgroundVideo.projectId===projectId,"Video background project scoping lost");
  assert(remote.pages[0].composition.pages[0].surface.background==="photo","Video must activate visual background");
  const localImageResponse=await page.request.get(new URL("/ambiente-editorial/media/BOXDOSENTIR-64.jpg",base).href);
  assert(localImageResponse.ok(),"Missing local JPG test fixture");
  await page.locator("#labAcervoLocalInput").setInputFiles({
    name:"imagem-local.jpg",mimeType:"image/jpeg",buffer:await localImageResponse.body()});
  await page.waitForFunction(()=>!window.LabPages?.create?.().pages[0].backgroundVideo,
    null,{timeout:12000});
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
  await page.waitForFunction(()=>window.LabPages?.create?.().pages[0].backgroundVideo?.provider==="local",
    null,{timeout:25000});
  const mixed=await page.evaluate(()=>window.LabPages.create());
  assert(mixed.pages[0].backgroundVideo.provider==="local","Local video should replace the background");
  assert(!mixed.pages[0].clips?.length,"New videos may not become independent page elements");
  assert(!JSON.stringify(mixed).includes("access_token"),"Project must not persist OAuth tokens");
  assert(errors.length===0,"Browser errors: "+errors.join(" / "));
  console.log("LABMATTAR: public/local videos replace the page background; local photos and JSON remain intact");
}finally{await browser.close();}
