/* LABMATTAR / contrato de projeto v1.
 * Modelo puro, serializavel e reversivel. Nao renderiza nem altera a Matriz.
 * Formatos futuros usam novos adaptadores, nao alteram este schema retroativamente.
 */
export const DOCUMENT_KIND="labmattar.composition";
export const SCHEMA_VERSION=1;
export const OFFICIAL_M_MASK="/ambiente-editorial/media/m-publicado.svg";
const FORMATS={horizontal:[16,9],vertical:[9,16],quadrado:[1,1],editorial:[Math.SQRT2,1]};
const CHOICES={
  color:["neutral","beige","green","red","blue","brown"],
  guides:["nenhuma","margens","grid"],
  type:["alternada","univers","perpetua"],
  background:["color","photo"],
  mContent:["off","solid","photo"],
  mPresentation:["elemento","completo"],
  bodyMode:["oculto","visivel"],
  marker:["none","top","bottom","both"],
  markerFocus:["blur","sharp"],
  symbol:["none","M.svg",...Array.from({length:9},(_,i)=>"vaso_"+String(i+1).padStart(2,"0")+".svg")]
};
const CORNERS=["tl","tr","bl","br"];
const KINDS=["none","brand","symbol","symbol-label","text"];
const SIGNATURE_PRESETS=["none","editorial","navigation","symbol","custom"];
const isObject=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const copy=v=>JSON.parse(JSON.stringify(v));
function check(condition,message){if(!condition)throw new Error("Documento incompatível: "+message)}
function enumValue(v,options,name){check(typeof v==="string"&&options.includes(v),name);return v}
function bounded(v,min,max,name){check(typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max,name);return v}
function text(v,max,name){check(typeof v==="string"&&v.length<=max,name);return v}
function safeImagePath(v){
  if(typeof v!=="string"||!v.startsWith("/")||v.startsWith("//")||v.includes(".."))return false;
  if(!/[?#]/.test(v))return true;
  // External images must pass through our same-origin auth proxy. Never allow
  // public share links, arbitrary hosts, token parameters or path traversal.
  if(!v.startsWith("/api/acervo/media?"))return false;
  try{
    const u=new URL(v,"https://acervo.local");
    const p=u.searchParams;
    if(u.origin!=="https://acervo.local"||u.pathname!=="/api/acervo/media"||
      [...p.keys()].sort().join(",")!=="id,provider")return false;
    const provider=p.get("provider"),id=p.get("id");
    return provider==="google"?/^[A-Za-z0-9_-]{5,200}$/.test(id||""):
      provider==="dropbox"&&/^id:[A-Za-z0-9_=-]{5,200}$/.test(id||"");
  }catch{return false}
}
function signatureOf(value){
  check(isObject(value)&&isObject(value.slots),"assinatura");
  const slots={};
  for(const corner of CORNERS){
    const slot=value.slots[corner];
    check(isObject(slot),"assinatura "+corner);
    slots[corner]={
      kind:enumValue(slot.kind,KINDS,"tipo do canto "+corner),
      symbol:enumValue(slot.symbol,CHOICES.symbol.slice(1),"símbolo do canto "+corner),
      text:text(slot.text,100,"texto do canto "+corner).replace(/[\r\n]+/g," ")
    };
  }
  return {
    preset:enumValue(value.preset,SIGNATURE_PRESETS,"preset de assinatura"),
    scale:bounded(value.scale,60,140,"escala da assinatura"),
    slots
  };
}
export function dimensionsFor(format,maxEdge){
  const ratio=FORMATS[enumValue(format,Object.keys(FORMATS),"formato")];
  check(maxEdge===1920||maxEdge===3840,"perfil de qualidade");
  const a=ratio[0],b=ratio[1],major=Math.max(a,b);
  return {width:Math.round(maxEdge*a/major),height:Math.round(maxEdge*b/major)};
}
function captureState(state,photoCatalog){
  check(isObject(state),"estado do Laboratório");
  check(isObject(photoCatalog),"catálogo de fotografia");
  const clean={
    format:enumValue(state.format,Object.keys(FORMATS),"formato"),
    color:enumValue(state.color,CHOICES.color,"cor"),
    margin:bounded(state.margin,4,16,"margem"),
    guides:enumValue(state.guides,CHOICES.guides,"guias"),
    marker:text(state.marker,40,"marcadores"),
    markerFocus:enumValue(state.markerFocus??"blur",CHOICES.markerFocus,"nitidez dos marcadores"),
    textWidth:bounded(state.textWidth,40,100,"largura de leitura"),
    titleScale:bounded(state.titleScale,70,140,"escala do título"),
    type:enumValue(state.type,CHOICES.type,"tratamento do título"),
    background:enumValue(state.background,CHOICES.background,"fundo"),
    mContent:enumValue(state.mContent,CHOICES.mContent,"conteúdo do M"),
    mPresentation:enumValue(state.mPresentation,CHOICES.mPresentation,"apresentação do M"),
    photo:text(state.photo,30,"foto"),
    mScale:bounded(state.mScale,1,140,"escala do M"),
    focusX:bounded(state.focusX,0,100,"foco horizontal"),
    focusY:bounded(state.focusY,0,100,"foco vertical"),
    symbol:enumValue(state.symbol,CHOICES.symbol,"símbolo"),
    title:text(state.title,140,"Título"),
    body:text(state.body,380,"Corpo"),
    bodyMode:enumValue(state.bodyMode,CHOICES.bodyMode,"visibilidade do Corpo"),
    kicker:text(state.kicker,80,"identificação superior"),
    footerLeft:text(state.footerLeft,100,"identificação inferior esquerda"),
    footerRight:text(state.footerRight,100,"identificação inferior direita"),
    signature:signatureOf(state.signature)
  };
  check(CHOICES.marker.includes(clean.marker),"marcadores do M");
  check(!(clean.background==="photo"&&clean.mContent==="solid"),"M sólido não existe sobre fotografia");
  check(Object.hasOwn(photoCatalog,clean.photo)&&safeImagePath(photoCatalog[clean.photo]),"fotografia do catálogo local");
  return clean;
}
function assetList(state,photoCatalog){
  const result=[
    {id:"identity:m-mask",type:"vector",uri:OFFICIAL_M_MASK,source:"identidade-oficial"},
    {id:"photo:"+state.photo,type:"image",uri:photoCatalog[state.photo],source:state.photo.startsWith("ext-")?"acervo-privado":"prévia-local",masterVerified:false}
  ];
  const refs=new Set();
  if(state.symbol!=="none")refs.add(state.symbol);
  for(const slot of Object.values(state.signature.slots)){
    if(slot.kind==="brand")refs.add("mattar.svg");
    else if(slot.kind==="symbol"||slot.kind==="symbol-label")refs.add(slot.symbol);
  }
  for(const file of [...refs].sort()){
    result.push({id:"identity:"+file,type:"vector",uri:"/identidade/"+file,source:"identidade-oficial"});
  }
  return result;
}
export function createProductionDocument({state,photoCatalog,maxEdge=3840}){
  const s=captureState(state,photoCatalog);
  const dimensions=dimensionsFor(s.format,maxEdge);
  return {
    kind:DOCUMENT_KIND,
    schemaVersion:SCHEMA_VERSION,
    identity:{id:"LABMATTAR",textRoles:["title","body","detail"],mMaskAssetId:"identity:m-mask"},
    pages:[{
      id:"page-1",
      surface:{format:s.format,color:s.color,background:s.background,guides:s.guides,marginPercent:s.margin},
      reading:{widthPercent:s.textWidth},
      text:{
        title:{role:"title",value:s.title,treatment:s.type,scalePercent:s.titleScale},
        body:{role:"body",value:s.body,visible:s.bodyMode==="visivel"},
        detail:{role:"detail",metadata:{kicker:s.kicker,footerLeft:s.footerLeft,footerRight:s.footerRight},signature:s.signature}
      },
      media:{photoAssetId:"photo:"+s.photo,photoKey:s.photo,focalPoint:{x:s.focusX,y:s.focusY}},
      m:{maskAssetId:"identity:m-mask",content:s.mContent,presentation:s.mPresentation,
        scalePercent:s.mScale,marker:s.marker,markerFocus:s.markerFocus,legacySymbol:s.symbol}
    }],
    assets:assetList(s,photoCatalog),
    output:{format:"image/png",maxEdge,...dimensions,reference:"laboratorio-canvas-2d",masterVerified:false},
    motion:{engine:"matriz-vetorial",projectRef:null,status:"não-vinculado",
      catalogPath:"tools/matriz-vetorial/src/library.json"}
  };
}
export function readProductionDocument(doc,photoCatalog){
  check(isObject(doc)&&doc.kind===DOCUMENT_KIND&&doc.schemaVersion===SCHEMA_VERSION,"versão do documento");
  check(doc.identity?.id==="LABMATTAR"&&doc.identity?.mMaskAssetId==="identity:m-mask","origem da identidade");
  check(Array.isArray(doc.pages)&&doc.pages.length===1,"somente uma página neste contrato");
  check(Array.isArray(doc.assets),"manifesto de assets");
  const page=doc.pages[0], t=page.text||{},m=page.m||{},media=page.media||{};
  check(page.id==="page-1"&&m.maskAssetId==="identity:m-mask","vetor oficial da página");
  check(typeof media.photoKey==="string"&&media.photoAssetId==="photo:"+media.photoKey,"fotografia da página");
  check(doc.assets.some(a=>a.id==="identity:m-mask"&&a.uri===OFFICIAL_M_MASK&&a.type==="vector"),"M oficial");
  check(doc.assets.some(a=>a.id===media.photoAssetId&&a.uri===photoCatalog?.[media.photoKey]&&a.type==="image"),"origem da fotografia");
  check(doc.motion?.engine==="matriz-vetorial"&&doc.motion?.projectRef===null,"referência de motion ainda não suportada");
  check(doc.output?.format==="image/png","perfil de saída");
  const expected=dimensionsFor(page.surface?.format,doc.output.maxEdge);
  check(doc.output.width===expected.width&&doc.output.height===expected.height,"dimensões da página");
  const state={
    format:page.surface.format,color:page.surface.color,margin:page.surface.marginPercent,
    guides:page.surface.guides,marker:m.marker,markerFocus:m.markerFocus??"blur",textWidth:page.reading?.widthPercent,
    titleScale:t.title?.scalePercent,type:t.title?.treatment,background:page.surface.background,
    mContent:m.content,mPresentation:m.presentation,photo:media.photoKey,mScale:m.scalePercent,
    focusX:media.focalPoint?.x,focusY:media.focalPoint?.y,symbol:m.legacySymbol,
    title:t.title?.value,body:t.body?.value,bodyMode:t.body?.visible===true?"visivel":"oculto",
    kicker:t.detail?.metadata?.kicker,footerLeft:t.detail?.metadata?.footerLeft,
    footerRight:t.detail?.metadata?.footerRight,signature:t.detail?.signature
  };
  check(t.title?.role==="title"&&t.body?.role==="body"&&t.detail?.role==="detail","três funções de texto");
  return captureState(state,photoCatalog);
}
export function verifyRoundTrip(doc,photoCatalog){
  const state=readProductionDocument(doc,photoCatalog);
  const normalized=createProductionDocument({state,photoCatalog,maxEdge:doc.output.maxEdge});
  // Earlier v1 documents have no markerFocus. Keep them readable without
  // inventing a new schema version; a missing value means blur in markers.
  if(doc.pages[0].m.markerFocus===undefined)delete normalized.pages[0].m.markerFocus;
  check(JSON.stringify(doc)===JSON.stringify(normalized),"documento alterado ou campos não reconhecidos");
  return state;
}
