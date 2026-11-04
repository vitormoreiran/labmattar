import { chromium } from "playwright";
import { readFile, copyFile } from "node:fs/promises";

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true,deviceScaleFactor:1});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/compor.html";
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
page.on("dialog",dialog=>dialog.accept());
async function choose(group,value){
  const module={format:"superficie",background:"fundo",color:"fundo",mContent:"m",
    marker:"m",markerFocus:"m",mPresentation:"m",photo:"fundo",type:"texto",bodyMode:"texto"}[group];
  if(module&&await page.locator("body").evaluate(el=>el.classList.contains("lm-studio-open")))
    await page.locator('button[data-mobile-module="'+module+'"]').click();
  if(group==="mContent"&&value!=="off"){
    const mode=await page.locator("#labArtboard").getAttribute("data-m-content");
    if(mode==="off"){
      await page.locator('[data-lab-choice="mPresentation"][data-value="elemento"]').click();
    }
    // On photographic backgrounds the material is necessarily photography
    // and is not offered as a redundant second decision.
    if(value==="photo"&&await page.locator("#labBackground").inputValue()==="photo"){
      assert(await page.locator("#labArtboard").getAttribute("data-m-content")==="photo",
        "Photo background must activate a photo M");
      return;
    }
  }
  await page.locator('[data-lab-choice="'+group+'"][data-value="'+value+'"]').click();
  await page.waitForTimeout(80);
}
async function audit(){
  const shot=await page.locator("#labArtboard").screenshot();
  return page.evaluate(async screenshot=>{
    const result=await window.LabExportPNG.capture();
    if(!result)return {error:"cancelled"};
    const full=await createImageBitmap(result.blob);
    const sourceBlob=await (await fetch("data:image/png;base64,"+screenshot)).blob();
    const preview=await createImageBitmap(sourceBlob);
    const sampled=document.createElement("canvas");
    sampled.width=96;sampled.height=54;
    const ctx=sampled.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(preview,0,0,96,54);
    const expected=ctx.getImageData(0,0,96,54).data;
    ctx.clearRect(0,0,96,54);
    ctx.drawImage(full,0,0,96,54);
    const actual=ctx.getImageData(0,0,96,54).data;
    let diff=0,different=0,brightness=0;
    const palette=new Set();
    for(let i=0;i<expected.length;i+=4){
      for(let c=0;c<3;c++)diff+=Math.abs(expected[i+c]-actual[i+c]);
      const key=actual[i]>>4|((actual[i+1]>>4)<<4)|((actual[i+2]>>4)<<8);
      palette.add(key);
      brightness+=actual[i]+actual[i+1]+actual[i+2];
      if(Math.abs(expected[i]-actual[i])+Math.abs(expected[i+1]-actual[i+1])+Math.abs(expected[i+2]-actual[i+2])>90)different++;
    }
    return {
      width:result.width,height:result.height,byteSize:result.blob.size,
      meanAbsDiff:diff/(96*54*3),different,
      uniqueColors:palette.size,brightness:Math.round(brightness/(96*54*3)),
      warnings:result.warnings.length
    };
  },shot.toString("base64"));
}
try{
  await page.goto(base+"?studio=1#laboratorio",{waitUntil:"load",timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.locator("#labExportPng").isVisible(),"Export control must be visible inside the laboratory");
  assert(await page.locator("#labExportSize").inputValue()==="3840","4K must be the default export profile");
  assert(await page.locator("#labExportStatus").count()===1,"Accessible status is required");
  await choose("format","horizontal");
  await choose("background","photo");
  await choose("mContent","photo");
  await choose("marker","both");
  await choose("bodyMode","visivel");
  await page.waitForTimeout(300);
  const state=await page.locator("#labArtboard").getAttribute("data-state");
  assert(state==="ok","Reference composition must be valid before exporting: "+state);
  const first=await audit();
  console.log("PNG FIDELITY",JSON.stringify(first));
  assert(first.width===3840&&first.height===2160,"4K horizontal dimensions must be exact: "+JSON.stringify(first));
  assert(first.byteSize>8000&&first.uniqueColors>70&&first.brightness>15,
    "Export must contain the photograph and actual page elements: "+JSON.stringify(first));
  assert(first.meanAbsDiff<26,"Export cannot diverge visibly from the approved page: "+JSON.stringify(first));

  const promise=page.waitForEvent("download",{timeout:60000});
  await page.locator("#labExportPng").click();
  const download=await promise;
  assert(/labmattar-horizontal-3840x2160\.png$/.test(download.suggestedFilename()),"Filename must include format and dimensions");
  const data=await readFile(await download.path());
  await copyFile(await download.path(),"laboratorio-export-4k.png");
  assert(data.subarray(1,4).toString("ascii")==="PNG","Download must be a PNG");
  assert(data.readUInt32BE(16)===3840&&data.readUInt32BE(20)===2160,
    "PNG file header dimensions must match requested output");

  // Same authoring state must also be reversible as a versioned document.
  // This does not assert the Matriz motion renderer is already connected.
  await page.locator('[data-workspace-view=pages]').click();
  await page.locator('.lab-project-settings>summary').click();
  assert(await page.locator("#labDownloadDocument").isVisible(),
    "The document action must be accessible next to the page sequence");
  const authored=await page.evaluate(()=>window.LabProductionBridge.snapshot().state);
  const projectDownloadPromise=page.waitForEvent("download",{timeout:30000});
  await page.locator("#labDownloadDocument").click();
  const projectDownload=await projectDownloadPromise;
  assert(/-composicao-v1\.json$/.test(projectDownload.suggestedFilename()),
    "Project download must have a versioned JSON filename");
  const projectJson=await readFile(await projectDownload.path(),"utf8");
  const project=JSON.parse(projectJson);
  assert(project.kind==="labmattar.composition"&&project.schemaVersion===1,
    "Project must use a versioned document contract");
  assert(project.pages[0].m.maskAssetId==="identity:m-mask"&&
    project.assets.some(asset=>asset.uri==="/ambiente-editorial/media/m-publicado.svg"),
    "Document must reference the original identity vector");
  assert(project.motion.engine==="matriz-vetorial"&&project.motion.projectRef===null,
    "The Matriz must be referenced but not falsely claimed as integrated");
  assert(project.output.width===3840&&project.output.height===2160,
    "Document 4K profile must match the exported PNG");

  await page.locator('[data-workspace-view=edit]').click();
  await page.locator('button[data-mobile-module="texto"]').click();
  await page.locator('#labPanel-texto [data-lab-more="texto"]').evaluate(details=>{details.open=true;});
  await page.locator("#labTitleInput").fill("TÍTULO ALTERADO PROVISORIAMENTE");
  await page.locator("#labTitleInput").dispatchEvent("input");
  assert((await page.locator("#labRenderedTitle").textContent()).includes("ALTERADO"),
    "The edit before import should actually affect the page");
  const incoming={name:"restaurar-v1.json",mimeType:"application/json",buffer:Buffer.from(projectJson)};
  await page.locator("#labDocumentFile").setInputFiles(incoming);
  await page.waitForTimeout(160);
  const restored=await page.evaluate(()=>window.LabProductionBridge.snapshot().state);
  assert(JSON.stringify(restored)===JSON.stringify(authored),
    "Import must faithfully restore the authored state and all three text roles");
  assert(await page.locator("#labDocumentStatus").getAttribute("data-state")==="success",
    "A valid document must be acknowledged");

  const rejected=JSON.parse(projectJson);
  rejected.pages[0].m.maskAssetId="vector:not-official";
  await page.locator("#labDocumentFile").setInputFiles({
    name:"vetor-invalido.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(rejected))
  });
  await page.waitForTimeout(100);
  assert(await page.locator("#labDocumentStatus").getAttribute("data-state")==="error",
    "A foreign or corrupted M vector must fail before import");
  assert(JSON.stringify(await page.evaluate(()=>window.LabProductionBridge.snapshot().state))===
    JSON.stringify(authored),"Rejected document must not modify the existing composition");

  await choose("marker","none");
  await choose("format","vertical");
  await choose("mContent","off");
  await choose("background","color");
  await page.locator("#labExportSize").selectOption("1920");
  await page.waitForTimeout(250);
  const second=await audit();
  console.log("PORTRAIT PNG",JSON.stringify(second));
  assert(second.width===1080&&second.height===1920,"2K portrait dimensions must be correct: "+JSON.stringify(second));
  assert(second.uniqueColors>8&&second.meanAbsDiff<26,"Simple portrait page must match the preview: "+JSON.stringify(second));
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(160);
  assert(await page.locator("#labExportPng").isVisible(),
    "PNG export must remain accessible on mobile");
  const mobile=await page.evaluate(()=>{
    const exportBar=document.querySelector("#laboratorio .lm-lab-export-tools").getBoundingClientRect();
    const play=document.getElementById("labMotionPlay").getBoundingClientRect();
    return {exportBar:{left:exportBar.left,right:exportBar.right,top:exportBar.top},
      play:{left:play.left,right:play.right,top:play.top},viewport:innerWidth};
  });
  assert(mobile.exportBar.left>=0&&mobile.exportBar.right<=mobile.viewport&&
    mobile.play.right<=mobile.viewport&&mobile.play.left-mobile.exportBar.right>=2,
    "Export and Play must remain visible without overlapping on mobile: "+JSON.stringify(mobile));
  await page.screenshot({path:"laboratorio-export-controles-mobile.png"});
  assert(errors.length===0,"Browser errors: "+errors.join("; "));
  console.log("LABMATTAR PNG EXPORT BROWSER OK");
}finally{
  await browser.close();
}
