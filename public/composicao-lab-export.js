/* LABMATTAR | Exportação PNG 2K / 4K.
 * Renderização Canvas 2D a partir da geometria DOM calculada (fonte única).
 * Nunca ampliar uma captura nem usar foreignObject/SVG como imagem: em
 * navegadores modernos isso contamina o canvas e impede o download.
 * O original editável, a Matriz e as regras de identidade são somente leitura.
 */
(()=>{
  "use strict";
  const board=document.getElementById("labArtboard");
  const button=document.getElementById("labExportPng");
  const sizeSelect=document.getElementById("labExportSize");
  const status=document.getElementById("labExportStatus");
  if(!board||!button||!sizeSelect||!status)return;
  const maskUrl="/ambiente-editorial/media/m-publicado.svg";
  let exporting=false;

  function report(message,state="idle"){
    status.textContent=message;
    status.dataset.state=state;
  }
  function fail(message){report(message,"error");throw new Error(message)}
  function logical(){
    const box=board.getBoundingClientRect();
    return {width:board.offsetWidth,height:board.offsetHeight,
      zoom:box.width/board.offsetWidth||1,left:box.left,top:box.top};
  }
  function rectangle(element,frame){
    const b=element.getBoundingClientRect();
    return {x:(b.left-frame.left)/frame.zoom,y:(b.top-frame.top)/frame.zoom,
      w:b.width/frame.zoom,h:b.height/frame.zoom};
  }
  function isVisible(element){
    if(!element)return false;
    let current=element;
    while(current&&current!==board.parentElement){
      const s=getComputedStyle(current);
      if(s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0)return false;
      current=current.parentElement;
    }
    return true;
  }
  function dimensions(edge,frame){
    const factor=edge/Math.max(frame.width,frame.height);
    return [Math.round(frame.width*factor),Math.round(frame.height*factor)];
  }
  function focal(element){
    const p=getComputedStyle(element).objectPosition.match(/[-\d.]+%?/g)||["50%","50%"];
    return [parseFloat(p[0])/100,parseFloat(p[1]||p[0])/100];
  }
  function drawCover(ctx,img,x,y,w,h,position){
    const isVideo=img instanceof HTMLVideoElement;
    const iw=isVideo?img.videoWidth:img.naturalWidth,ih=isVideo?img.videoHeight:img.naturalHeight;
    if(!iw||!ih||(isVideo?img.readyState<2:!img.complete))
      fail("Mídia de fundo indisponível. Aguarde o carregamento e tente novamente.");
    const fit=Math.max(w/iw,h/ih),sw=w/fit,sh=h/fit;
    const [px,py]=position;
    ctx.drawImage(img,(iw-sw)*px,(ih-sh)*py,sw,sh,x,y,w,h);
  }
  function imagePreflight(outW,frame){
    const zoom=outW/frame.width;
    const warnings=[];
    for(const img of board.querySelectorAll(".lm-lab-photo-ambient,.lm-lab-m-photo img,.lm-lab-photo-layer video.lm-lab-background-video")){
      if(!isVisible(img))continue;
      const isVideo=img instanceof HTMLVideoElement;
      const iw=isVideo?img.videoWidth:img.naturalWidth,ih=isVideo?img.videoHeight:img.naturalHeight;
      if(!iw||!ih||(!isVideo&&!img.complete)){warnings.push("Uma mídia de fundo ainda não carregou.");continue}
      const rect=rectangle(img,frame);
      const factor=Math.max(rect.w*zoom/iw,rect.h*zoom/ih);
      if(factor>1.01)warnings.push((isVideo?"Vídeo ":"Imagem ")+iw+"×"+ih+
        " px será ampliado aproximadamente "+factor.toFixed(1)+"×.");
    }
    return [...new Set(warnings)];
  }
  function photoRectangle(img,frame){
    const box=rectangle(img,frame),transform=getComputedStyle(img).transform;
    if(transform!=="none"){const m=new DOMMatrixReadOnly(transform);const w=box.w/m.a,h=box.h/m.d;box.x+=(box.w-w)/2;box.y+=(box.h-h)/2;box.w=w;box.h=h;}
    return box;
  }
  function drawBackground(ctx,frame){
    const css=getComputedStyle(board);
    ctx.fillStyle=css.backgroundColor==="rgba(0, 0, 0, 0)"?
      css.getPropertyValue("--lab-bg"):css.backgroundColor;
    ctx.fillRect(0,0,frame.width,frame.height);
    if(board.dataset.backdrop==="color")return;
    const img=board.querySelector(board.dataset.videoBackground==="true"?"#labAmbientVideo":"#labAmbientPhoto");
    if(!isVisible(img))return;
    const style=getComputedStyle(img),box=photoRectangle(img,frame);
    const centerX=box.x+box.w/2,centerY=box.y+box.h/2;
    ctx.save();
    ctx.filter=style.filter==="none"?"none":style.filter.replace(/blur\(([\d.]+)px\)/g,(_,n)=>"blur("+(Number(n)*frame.outputScale)+"px)");
    if(style.transform!=="none"){
      // Approved backdrop transform is scale(1.045), centered on the image.
      const m=new DOMMatrixReadOnly(style.transform);
      ctx.translate(centerX,centerY);
      ctx.transform(m.a,m.b,m.c,m.d,0,0);
      ctx.translate(-centerX,-centerY);
    }
    drawCover(ctx,img,box.x,box.y,box.w,box.h,focal(img));
    ctx.restore();
    const scrim=board.querySelector(".lm-lab-photo-contrast");
    if(isVisible(scrim)){
      const s=getComputedStyle(scrim);
      ctx.save();ctx.globalAlpha=Number(s.opacity)||0;ctx.fillStyle=s.backgroundColor;
      ctx.fillRect(0,0,frame.width,frame.height);ctx.restore();
    }
  }
  function styleFont(ctx,element){
    const s=getComputedStyle(element);
    ctx.font=[s.fontStyle,s.fontWeight,s.fontSize,s.fontFamily].join(" ");
    if("letterSpacing" in ctx)ctx.letterSpacing=s.letterSpacing==="normal"?"0px":s.letterSpacing;
    ctx.textBaseline="alphabetic";
    ctx.textAlign="left";
    ctx.fillStyle=s.color;
    return s;
  }
  function textNodes(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    return nodes;
  }
  function drawWords(ctx,root,frame){
    if(!root||!isVisible(root))return;
    for(const node of textNodes(root)){
      const parent=node.parentElement;
      if(!parent||!isVisible(parent)||!node.nodeValue?.trim())continue;
      // Words preserve actual glyph shaping and kerning; each word's x/y
      // comes from the DOM Range, including browser line wraps.
      const style=styleFont(ctx,parent);
      const content=node.nodeValue;
      const matches=[...content.matchAll(/\S+/gu)];
      for(const match of matches){
        const start=match.index,end=start+match[0].length;
        const range=document.createRange();
        range.setStart(node,start);range.setEnd(node,end);
        const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
        if(rects.length!==1)continue; // oversized words are a preflight error
        const r=rects[0];
        const metrics=ctx.measureText("Hg");
        const ascent=metrics.fontBoundingBoxAscent||parseFloat(style.fontSize)*.8;
        const descent=metrics.fontBoundingBoxDescent||parseFloat(style.fontSize)*.2;
        const top=(r.top-frame.top)/frame.zoom,h=r.height/frame.zoom;
        const baseline=top+(h-ascent-descent)/2+ascent;
        const x=(r.left-frame.left)/frame.zoom;
        const word=style.textTransform==="uppercase"?match[0].toLocaleUpperCase("pt-BR"):
          style.textTransform==="lowercase"?match[0].toLocaleLowerCase("pt-BR"):match[0];
        ctx.fillText(word,x,baseline);
      }
    }
  }
  const vectorCache=new Map();
  async function vector(source,box,tone=null){
    const uri=new URL(source,location.href);
    if(uri.origin!==location.origin||!(/^\/identidade\//.test(uri.pathname)||uri.pathname===maskUrl))
      throw Error("Referência vetorial fora do acervo oficial.");
    if(!vectorCache.has(uri.pathname))vectorCache.set(uri.pathname,(async()=>{
      const response=await fetch(uri.pathname);if(!response.ok)throw Error("Vetor indisponível.");
      const xml=new DOMParser().parseFromString(await response.text(),"image/svg+xml"),root=xml.documentElement;
      if(xml.querySelector("parsererror")||xml.querySelector("[transform]"))throw Error("Vetor oficial incompatível.");
      const viewBox=root.getAttribute("viewBox")?.trim().split(/[ ,]+/).map(Number);
      if(viewBox?.length!==4||!viewBox.every(Number.isFinite))throw Error("Vetor sem dimensões válidas.");
      const paths=[...xml.querySelectorAll("path")].map(path=>{
        let node=path,fill=null;
        while(node&&!fill){fill=node.getAttribute?.("fill");node=node.parentElement;}
        return {d:path.getAttribute("d"),fill:fill||"#000000",rule:path.getAttribute("fill-rule")||"nonzero"};
      }).filter(path=>path.d&&path.fill!=="none");
      return {viewBox,paths};
    })());
    const data=await vectorCache.get(uri.pathname);
    return data.paths.map(path=>({kind:"vector",viewBox:data.viewBox,paths:[{d:path.d}],box,color:tone||path.fill,rule:path.rule}));
  }
  function words(root,frame){
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d"),items=[];
    const recorder=new Proxy(ctx,{
      get(target,key){
        if(key==="fillText")return (text,x,y)=>items.push({kind:"text",text,x,y,
          family:target.font.includes("PerpetuaMattar")?"PerpetuaMattar":"UniversMattar",
          size:parseFloat(target.font.match(/([\d.]+)px/)[1]),spacing:parseFloat(target.letterSpacing)||0,color:target.fillStyle});
        const value=Reflect.get(target,key,target);return typeof value==="function"?value.bind(target):value;
      },
      set(target,key,value){Reflect.set(target,key,value,target);return true;}
    });
    drawWords(recorder,root,frame);return items;
  }
  function pixels(width,height,frame,paint){
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.ceil(width*frame.outputScale));canvas.height=Math.max(1,Math.ceil(height*frame.outputScale));
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("Memória insuficiente para a camada de imagem.");
    ctx.setTransform(frame.outputScale,0,0,frame.outputScale,0,0);ctx.imageSmoothingQuality="high";paint(ctx);
    return canvas.toDataURL("image/png");
  }
  function imageLayer(ctx,img,frame){
    const box=photoRectangle(img,frame),style=getComputedStyle(img),cx=box.x+box.w/2,cy=box.y+box.h/2;
    ctx.save();
    ctx.filter=style.filter==="none"?"none":style.filter.replace(/blur\(([\d.]+)px\)/g,(_,n)=>"blur("+(Number(n)*frame.outputScale)+"px)");
    if(style.transform!=="none"){
      const m=new DOMMatrixReadOnly(style.transform);ctx.translate(cx,cy);ctx.transform(m.a,m.b,m.c,m.d,0,0);ctx.translate(-cx,-cy);
    }
    drawCover(ctx,img,box.x,box.y,box.w,box.h,focal(img));ctx.restore();
  }
  async function captureScene({edge=Number(sizeSelect.value),ask=true}={}){
    window.LabPages?.applySectionVisual?.();
    await document.fonts.ready;
    if(board.dataset.motionPlaying==="true")throw Error("Conclua a entrada dos textos antes de exportar.");
    await Promise.all([...board.querySelectorAll("img")].filter(isVisible).map(img=>img.decode().catch(()=>{throw Error("Imagem indisponível. Conecte o acervo ou aguarde o carregamento.");})));
    if(board.dataset.videoBackground==="true"){
      const videos=[...board.querySelectorAll("video.lm-lab-background-video")]
        .filter(isVisible);
      if(!videos.length)throw Error("Vídeo de fundo não encontrado.");
      await Promise.all(videos.map(async video=>{
        if(video.readyState<2)await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>{cleanup();reject(Error("Vídeo de fundo não carregou."));},20000);
          const ready=()=>{cleanup();resolve();},error=()=>{cleanup();reject(Error("Vídeo de fundo indisponível."));};
          const cleanup=()=>{clearTimeout(timeout);video.removeEventListener("loadeddata",ready);video.removeEventListener("error",error);};
          video.addEventListener("loadeddata",ready,{once:true});video.addEventListener("error",error,{once:true});
        });
        if(video.error||!video.videoWidth)throw Error("Vídeo de fundo indisponível.");
      }));
    }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(board.dataset.state!=="ok"||board.getAttribute("aria-invalid")==="true")
      throw Error("A composição apresenta conflitos de leitura. Corrija antes de exportar.");
    if(![1920,3840].includes(edge))throw Error("Resolução não reconhecida.");
    const frame=logical(),[width,height]=dimensions(edge,frame);
    frame.outputScale=width/frame.width;frame.outputWidth=width;frame.outputHeight=height;
    const warnings=imagePreflight(width,frame),items=[],rasterized=[];
    if(ask&&warnings.length&&!confirm("LABMATTAR / Qualidade dos originais\n\n"+warnings.join("\n")+"\n\nExportar mesmo assim?"))return null;
    const css=getComputedStyle(board),background=css.backgroundColor==="rgba(0, 0, 0, 0)"?css.getPropertyValue("--lab-bg"):css.backgroundColor;
    const hasVideo=board.dataset.videoBackground==="true";
    const videoVisual=hasVideo?{backdrop:board.dataset.backdrop,markerFocus:board.dataset.markerFocus,
      focusX:parseFloat(board.style.getPropertyValue("--lab-focus-x"))||50,
      focusY:parseFloat(board.style.getPropertyValue("--lab-focus-y"))||50,
      contrast:board.dataset.photoText==="true",mContrast:board.dataset.mText==="true"}:null;
    items.push({kind:"rect",...(hasVideo?{layer:"video-bg-base"}:{layer:"background"}),
      x:0,y:0,w:frame.width,h:frame.height,color:background});
    if(board.dataset.backdrop!=="color"){
      const image=pixels(frame.width,frame.height,frame,ctx=>drawBackground(ctx,frame));
      items.push({kind:"image",...(hasVideo?{layer:"video-bg-base"}:{layer:"background"}),source:image,x:0,y:0,w:frame.width,h:frame.height});rasterized.push("imagem e tratamento do fundo");
    }
    const maskNode=board.querySelector("#labMask");
    let maskVector=null;
    if(isVisible(maskNode)){
      const box=rectangle(maskNode,frame),shapes=await vector(maskUrl,box);
      maskVector={...shapes[0],paths:shapes.flatMap(shape=>shape.paths)};
      if(board.dataset.mContent==="solid")items.push({...maskVector,color:getComputedStyle(maskNode).backgroundColor});
      else{
        const filter=getComputedStyle(maskNode).filter;
        if(filter!=="none"){
          const shadow=pixels(frame.width,frame.height,frame,ctx=>{
            const shape=new Path2D();const [vx,vy,vw,vh]=maskVector.viewBox;
            for(const path of maskVector.paths)shape.addPath(new Path2D(path.d),new DOMMatrix([box.w/vw,0,0,box.h/vh,box.x-vx*box.w/vw,box.y-vy*box.h/vh]));
            ctx.filter=filter.replace(/(-?[\d.]+)px/g,(_,n)=>(Number(n)*frame.outputScale)+"px");ctx.fillStyle="#000000";ctx.fill(shape);
            ctx.filter="none";ctx.globalCompositeOperation="destination-out";ctx.fill(shape);ctx.globalCompositeOperation="source-over";
          });items.push({kind:"image",source:shadow,x:0,y:0,w:frame.width,h:frame.height});rasterized.push("sombra fotográfica do M");
        }
        const source=pixels(box.w,box.h,frame,ctx=>{
          const img=maskNode.querySelector(hasVideo?"video":"img");
          drawCover(ctx,img,0,0,box.w,box.h,focal(img));
          if(board.dataset.mText==="true"){ctx.fillStyle="rgba(0,0,0,.2)";ctx.fillRect(0,0,box.w,box.h);}
        });
        items.push({kind:"group",...(hasVideo?{layer:"video-bg-m"}:{}),
          clip:maskVector,items:[{kind:"image",source,x:box.x,y:box.y,w:box.w,h:box.h}]});rasterized.push("imagem do M");
      }
    }
    const markerPhoto=board.querySelector("#labMarkerPhotoLayer");
    if(isVisible(markerPhoto)){
      const source=pixels(frame.width,frame.height,frame,ctx=>imageLayer(ctx,markerPhoto.querySelector(hasVideo?"video":"img"),frame));
      for(const svg of board.querySelectorAll("#labMMarkers svg")){
        if(getComputedStyle(svg).display==="none")continue;
        const v=svg.viewBox.baseVal,box=rectangle(svg,frame),d=svg.querySelector("path")?.getAttribute("d");
        if(d)items.push({kind:"group",...(hasVideo?{layer:"video-bg-marker"}:{}),
          clip:{viewBox:[v.x,v.y,v.width,v.height],box,paths:[{d}]},
          items:[{kind:"image",source,x:0,y:0,w:frame.width,h:frame.height}]});
      }
      rasterized.push("tratamento fotográfico dos marcadores");
    }
    for(const svg of board.querySelectorAll("#labMMarkers svg")){
      if(!isVisible(svg))continue;
      const v=svg.viewBox.baseVal,d=svg.querySelector("path")?.getAttribute("d");
      if(d)items.push({kind:"vector",viewBox:[v.x,v.y,v.width,v.height],paths:[{d}],box:rectangle(svg,frame),color:getComputedStyle(svg).color});
    }
    const motions=await window.LabPages?.captureMotions?.(frame.width,frame.height)||[];
    for(const motion of motions){
      items.push(motion);
      if(motion.w*frame.outputScale>motion.sourceWidth*1.01)warnings.push((motion.privateClipId?"Vídeo ":"Motion ")+motion.assetName+" ampliado além da resolução original.");
    }
    if(motions.length)rasterized.push("quadros estáticos dos motions e vídeos privados");
    items.push(...words(board.querySelector("#labReading"),frame).map(op=>({...op,layer:"reading"})));
    const solid=board.querySelector(".lm-lab-solid-contrast");
    if(maskVector&&board.dataset.mContent==="solid"&&isVisible(solid))
      items.push({kind:"group",clip:maskVector,items:words(solid.querySelector(".lm-lab-reading"),frame)});
    const signature=board.querySelector("#labSignatureLayer");
    for(const img of [...signature.querySelectorAll("img"),board.querySelector("#labSignature")].filter(Boolean)){
      if(!isVisible(img))continue;
      const filter=getComputedStyle(img).filter,tone=filter.includes("invert(1)")?"#ffffff":filter.includes("brightness(0)")?"#000000":null;
      items.push(...(await vector(img.currentSrc||img.src,rectangle(img,frame),tone)).map(op=>({...op,layer:"signature"})));
    }
    items.push(...words(signature,frame).map(op=>({...op,layer:"detail"})));
    return {width:frame.width,height:frame.height,outputWidth:width,outputHeight:height,items,...(videoVisual?{videoVisual}:{}),sectionBackground:window.LabPages?.sectionBackground?.(),warnings:[...new Set(warnings)],rasterized};
  }
  async function rasterize(){
    const scene=await captureScene();if(!scene)return null;
    report("RENDERIZANDO "+scene.outputWidth+" × "+scene.outputHeight+" PX…","busy");
    const {sceneCanvas}=await import("./lab-scene.mjs");
    const canvas=await sceneCanvas(scene,Number(sizeSelect.value));
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(Error("Falha na codificação PNG.")),"image/png"));
    if(blob.size<2048)throw Error("PNG incompleto.");
    return {blob,width:canvas.width,height:canvas.height,warnings:scene.warnings};
  }
  function download(blob,name){
    const link=document.createElement("a"),url=URL.createObjectURL(blob);
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),6000);
  }
  async function exportPng(){
    if(exporting)return;
    exporting=true;button.disabled=true;report("VALIDANDO COMPOSIÇÃO…","busy");
    try{
      const result=await rasterize();
      if(!result){report("EXPORTAÇÃO CANCELADA.");return;}
      download(result.blob,"labmattar-"+(board.dataset.format||"horizontal")+"-"+
        result.width+"x"+result.height+".png");
      report("PNG "+result.width+" × "+result.height+" PX / "+
        (result.warnings.length?"ORIGINAL COM RESOLUÇÃO LIMITADA":"CONCLUÍDO"),
        result.warnings.length?"warning":"success");
    }catch(error){report("EXPORTAÇÃO NÃO CONCLUÍDA / "+(error?.message||"Erro desconhecido"),"error")}
    finally{button.disabled=false;exporting=false}
  }
  button.addEventListener("click",exportPng);
  window.LabExportPNG={capture:rasterize,dimensions,isExporting:()=>exporting};
  window.LabRenderer={capture:captureScene};
})();
