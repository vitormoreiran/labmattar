import { chromium } from "playwright";
import { readFile, copyFile } from "node:fs/promises";

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true,deviceScaleFactor:1});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const base=process.env.COMPOSITION_URL||"http://127.0.0.1:8765/laboratorio.html";
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
page.on("dialog",dialog=>dialog.accept());
async function choose(group,value){
  const module={format:"superficie",background:"fundo",mContent:"m",photo:"m",bodyMode:"texto"}[group];
  if(module)await page.locator('button[data-mobile-module="'+module+'"]').click();
  await page.locator('[data-lab-choice="'+group+'"][data-value="'+value+'"]').click();
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
  await choose("mContent","solid");
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
  assert(errors.length===0,"Browser errors: "+errors.join("; "));
  console.log("LABMATTAR PNG EXPORT BROWSER OK");
}finally{
  await browser.close();
}
