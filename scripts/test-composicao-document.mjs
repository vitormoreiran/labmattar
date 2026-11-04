import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  DOCUMENT_KIND,SCHEMA_VERSION,OFFICIAL_M_MASK,
  createProductionDocument,readProductionDocument,verifyRoundTrip,dimensionsFor
} from "../public/composicao-document.mjs";

const photoCatalog={
  "64":"/ambiente-editorial/media/BOXDOSENTIR-64.jpg",
  "179":"/ambiente-editorial/media/BOXDOSENTIR-179.jpg",
  "151":"/ambiente-editorial/media/BOXDOSENTIR-151.jpg"
};
const state={
  format:"horizontal",color:"neutral",margin:7,guides:"margens",
  marker:"both",textWidth:61,titleScale:100,type:"alternada",
  background:"photo",mContent:"photo",mPresentation:"elemento",photo:"64",markerFocus:"blur",
  mScale:60,focusX:45,focusY:55,symbol:"M.svg",
  title:"CADA CORPO\nABRE UM MUNDO",body:"Uma experiência de encontro.",
  bodyMode:"visivel",kicker:"LABMATTAR / 2026",
  footerLeft:"GASTROPERFORMANCE & FOOD DESIGN",
  footerRight:"LABMATTAR / IDENTIDADE VISUAL",
  signature:{preset:"editorial",scale:100,slots:{
    tl:{kind:"text",text:"LABMATTAR / 2026",symbol:"M.svg"},
    tr:{kind:"symbol-label",text:"SUMÁRIO",symbol:"vaso_03.svg"},
    bl:{kind:"text",text:"GASTROPERFORMANCE & FOOD DESIGN",symbol:"M.svg"},
    br:{kind:"text",text:"LABMATTAR / IDENTIDADE VISUAL",symbol:"M.svg"}
  }}
};
const generate=(overrides={},maxEdge=3840)=>createProductionDocument({
  state:{...state,...overrides},photoCatalog,maxEdge
});
test("o projeto preserva a composição e os três tratamentos de texto",()=>{
  const doc=generate();
  assert.equal(doc.kind,DOCUMENT_KIND);
  assert.equal(doc.schemaVersion,SCHEMA_VERSION);
  assert.equal(doc.pages.length,1);
  assert.equal(doc.pages[0].text.title.role,"title");
  assert.equal(doc.pages[0].text.body.role,"body");
  assert.equal(doc.pages[0].text.detail.role,"detail");
  assert.deepEqual(readProductionDocument(doc,photoCatalog),state);
  assert.deepEqual(verifyRoundTrip(JSON.parse(JSON.stringify(doc)),photoCatalog),state);
  assert.equal(doc.pages[0].m.maskAssetId,"identity:m-mask");
  assert.ok(doc.assets.some(asset=>asset.uri===OFFICIAL_M_MASK));
  assert.ok(doc.assets.some(asset=>asset.uri==="/identidade/vaso_03.svg"));
  assert.equal(doc.motion.engine,"matriz-vetorial");
  assert.equal(doc.motion.projectRef,null);
  assert.equal(doc.output.masterVerified,false);
  assert.equal(doc.pages[0].m.markerFocus,"blur");
});
test("2K e 4K independem da janela e respeitam as proporções",()=>{
  const profiles={
    horizontal:[[1920,1080],[3840,2160]],
    vertical:[[1080,1920],[2160,3840]],
    quadrado:[[1920,1920],[3840,3840]],
    editorial:[[1920,1358],[3840,2715]]
  };
  for(const [format,sizes] of Object.entries(profiles)){
    for(const [index,edge] of [1920,3840].entries()){
      const doc=generate({format},edge);
      assert.deepEqual([doc.output.width,doc.output.height],sizes[index]);
      assert.deepEqual(dimensionsFor(format,edge),{
        width:sizes[index][0],height:sizes[index][1]
      });
      assert.deepEqual(readProductionDocument(doc,photoCatalog),{...state,format});
    }
  }
});
test("não reinterpreta ou sobrescreve documentos manipulados",()=>{
  const doc=generate();
  for(const mutate of [
    d=>{d.schemaVersion=2},
    d=>{d.pages[0].m.maskAssetId="custom:m"},
    d=>{d.assets[0].uri="https://outra-origem.invalid/m.svg"},
    d=>{d.motion.projectRef="roteiro-experimental"},
    d=>{d.pages[0].text.title.role="subtitle"},
    d=>{d.pages[0].surface.marginPercent=1},
    d=>{d.pages[0].media.photoKey="arquivo-exterior"},
    d=>{d.output.width=42},
    d=>{d.inventado="outro-editor"}
  ]){
    const copy=JSON.parse(JSON.stringify(doc));
    mutate(copy);
    assert.throws(()=>verifyRoundTrip(copy,photoCatalog),/Documento incompatível/);
  }
});
test("trata ausência de originais como pendência, não como um master declarado",()=>{
  const doc=generate({mContent:"photo",photo:"179",background:"color"});
  assert.equal(doc.assets.find(x=>x.id==="photo:179").masterVerified,false);
  assert.equal(doc.output.masterVerified,false);
  assert.equal(doc.pages[0].media.photoAssetId,"photo:179");
});
console.log("LABMATTAR COMPOSITION DOCUMENT V1 OK");

test("o contrato consulta a fonte real de IDs da Matriz sem copiar o motor",()=>{
  const doc=generate();
  const file=doc.motion.catalogPath;
  assert.equal(file,"tools/matriz-vetorial/src/library.json");
  const catalog=JSON.parse(readFileSync(file,"utf8"));
  const ids=new Set(catalog.assets.map(asset=>asset.id));
  for(const expected of ["M","P1","P8","P9"]){
    assert.ok(ids.has(expected),"ID ausente do catálogo da Matriz: "+expected);
  }
  assert.equal(doc.motion.status,"não-vinculado");
  assert.equal(doc.pages[0].m.maskAssetId,"identity:m-mask");
  assert.notEqual(doc.pages[0].m.maskAssetId,"M");
});

test("foco dos marcadores preserva a inversão da fotografia na montagem",()=>{
  const doc=generate({markerFocus:"sharp"});
  assert.equal(doc.pages[0].m.markerFocus,"sharp");
  assert.deepEqual(verifyRoundTrip(doc,photoCatalog),{...state,markerFocus:"sharp"});
  assert.throws(()=>generate({background:"photo",mContent:"solid"}),/M sólido/);
  const legacy=generate();
  delete legacy.pages[0].m.markerFocus;
  assert.equal(verifyRoundTrip(legacy,photoCatalog).markerFocus,"blur");
});
