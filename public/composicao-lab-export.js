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
  let exporting=false,maskImage=null;

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
  async function svgMask(){
    if(maskImage)return maskImage;
    const img=new Image();
    img.src=maskUrl;
    await img.decode();
    if(!img.naturalWidth||!img.naturalHeight)fail("O vetor oficial do M não carregou.");
    maskImage=img;return img;
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
    if(!img.complete||!img.naturalWidth||!img.naturalHeight)
      fail("Fotografia indisponível. Aguarde o carregamento e tente novamente.");
    const iw=img.naturalWidth,ih=img.naturalHeight;
    const fit=Math.max(w/iw,h/ih),sw=w/fit,sh=h/fit;
    const [px,py]=position;
    ctx.drawImage(img,(iw-sw)*px,(ih-sh)*py,sw,sh,x,y,w,h);
  }
  function imagePreflight(outW,frame){
    const zoom=outW/frame.width;
    const warnings=[];
    for(const img of board.querySelectorAll(".lm-lab-photo-ambient,.lm-lab-m-photo img")){
      if(!isVisible(img))continue;
      if(!img.complete||!img.naturalWidth){warnings.push("Uma fotografia ainda não carregou.");continue}
      const rect=rectangle(img,frame);
      const factor=Math.max(rect.w*zoom/img.naturalWidth,rect.h*zoom/img.naturalHeight);
      if(factor>1.01)warnings.push("Imagem "+img.naturalWidth+"×"+img.naturalHeight+
        " px será ampliada aproximadamente "+factor.toFixed(1)+"×.");
    }
    return [...new Set(warnings)];
  }
  function drawBackground(ctx,frame){
    const css=getComputedStyle(board);
    ctx.fillStyle=css.backgroundColor==="rgba(0, 0, 0, 0)"?
      css.getPropertyValue("--lab-bg"):css.backgroundColor;
    ctx.fillRect(0,0,frame.width,frame.height);
    if(board.dataset.backdrop==="color")return;
    const img=board.querySelector("#labAmbientPhoto");
    if(!isVisible(img))return;
    const style=getComputedStyle(img),box=rectangle(img,frame);
    const centerX=box.x+box.w/2,centerY=box.y+box.h/2;
    ctx.save();
    ctx.filter=style.filter==="none"?"none":style.filter;
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
  function maskedCanvas(maskBox,frame,render,mask){
    const scale=frame.outputScale;
    const layer=document.createElement("canvas");
    layer.width=Math.max(1,Math.ceil(maskBox.w*scale));
    layer.height=Math.max(1,Math.ceil(maskBox.h*scale));
    const layerCtx=layer.getContext("2d",{alpha:true});
    if(!layerCtx)fail("Memória insuficiente para rasterizar o M em alta resolução.");
    layerCtx.setTransform(scale,0,0,scale,0,0);
    render(layerCtx);
    layerCtx.globalCompositeOperation="destination-in";
    layerCtx.drawImage(mask,0,0,maskBox.w,maskBox.h);
    layerCtx.globalCompositeOperation="source-over";
    return layer;
  }
  function drawM(ctx,frame,mask){
    const node=board.querySelector("#labMask");
    if(!isVisible(node))return null;
    const r=rectangle(node,frame);
    // A mask is ALWAYS the original official SVG, regardless of source image.
    const layer=maskedCanvas(r,frame,layerCtx=>{
      if(board.dataset.mContent==="solid"){
        layerCtx.fillStyle=getComputedStyle(node).backgroundColor;
        layerCtx.fillRect(0,0,r.w,r.h);
      }else{
        const image=node.querySelector("img");
        drawCover(layerCtx,image,0,0,r.w,r.h,focal(image));
        if(board.dataset.mText==="true"){
          layerCtx.fillStyle="rgba(0,0,0,.2)";layerCtx.fillRect(0,0,r.w,r.h);
        }
      }
    },mask);
    ctx.drawImage(layer,r.x,r.y,r.w,r.h);
    return r;
  }
  function drawMarkers(ctx,frame){
    const markers=board.querySelector("#labMMarkers");
    if(!markers||markers.dataset.marker==="none")return;
    const photo=board.dataset.background==="photo";
    const image=board.querySelector("#labMarkerPhoto");
    if(photo&&(!image||board.dataset.markerBlur!=="true"))return;
    for(const svg of markers.querySelectorAll("svg")){
      // The preview hides the colored marker layer in photo mode, but the
      // exact same SVG path must still clip the photographic export.
      if(getComputedStyle(svg).display==="none")continue;
      const path=svg.querySelector("path"),v=svg.viewBox.baseVal;
      if(!path||!v?.width||!v?.height)continue;
      const box=rectangle(svg,frame);
      const geometry=new Path2D(path.getAttribute("d"));
      ctx.save();
      ctx.translate(box.x,box.y);
      ctx.scale(box.w/v.width,box.h/v.height);
      if(!photo){
        ctx.fillStyle=getComputedStyle(svg).color;
        ctx.fill(geometry);
      }else{
        ctx.clip(geometry);
        ctx.setTransform(frame.outputScale,0,0,frame.outputScale,0,0);
        const imgStyle=getComputedStyle(image),r=rectangle(image,frame);
        const cx=r.x+r.w/2,cy=r.y+r.h/2;
        ctx.filter=imgStyle.filter==="none"?"none":imgStyle.filter;
        if(imgStyle.transform!=="none"){
          const transform=new DOMMatrixReadOnly(imgStyle.transform);
          ctx.translate(cx,cy);
          ctx.transform(transform.a,transform.b,transform.c,transform.d,0,0);
          ctx.translate(-cx,-cy);
        }
        // Draw across the entire page then clip with the official marker.
        // Drawing into each marker's own rectangle would shift the crop.
        drawCover(ctx,image,r.x,r.y,r.w,r.h,focal(image));
      }
      ctx.restore();
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
  async function drawSolidContrast(ctx,frame,mask){
    const solid=board.querySelector(".lm-lab-solid-contrast");
    if(board.dataset.mContent!=="solid"||!isVisible(solid))return;
    const m=board.querySelector("#labMask");
    const r=rectangle(m,frame);
    // Ink is rasterized at full page resolution and then intersected with the
    // SAME alpha mask used to fill the solid M. No duplicate vector geometry.
    const layer=document.createElement("canvas");
    layer.width=frame.outputWidth;layer.height=frame.outputHeight;
    const ink=layer.getContext("2d",{alpha:true});
    if(!ink)fail("Memória insuficiente para o contraste de texto do M.");
    ink.setTransform(frame.outputScale,0,0,frame.outputScale,0,0);
    drawWords(ink,solid.querySelector(".lm-lab-reading"),frame);
    ink.globalCompositeOperation="destination-in";
    ink.drawImage(mask,r.x,r.y,r.w,r.h);
    ink.globalCompositeOperation="source-over";
    ctx.drawImage(layer,0,0,frame.width,frame.height);
  }
  function drawSignature(ctx,frame){
    const layer=board.querySelector("#labSignatureLayer");
    if(layer&&isVisible(layer)){
      for(const image of layer.querySelectorAll("img")){
        if(!isVisible(image))continue;
        if(!image.complete||!image.naturalWidth)fail("Símbolo de assinatura indisponível.");
        const b=rectangle(image,frame);
        ctx.save();
        const filter=getComputedStyle(image).filter;
        ctx.filter=filter==="none"?"none":filter;
        ctx.drawImage(image,b.x,b.y,b.w,b.h);
        ctx.restore();
      }
      drawWords(ctx,layer,frame);
    }
    const legacy=board.querySelector("#labSignature");
    if(isVisible(legacy)&&legacy.complete&&legacy.naturalWidth){
      const b=rectangle(legacy,frame);
      ctx.drawImage(legacy,b.x,b.y,b.w,b.h);
    }
  }
  async function rasterize(){
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(board.dataset.motionPlaying==="true")fail("Conclua a animação de entrada antes de exportar.");
    if(board.dataset.state!=="ok"||board.getAttribute("aria-invalid")==="true")
      fail("A composição apresenta conflitos de leitura. Corrija antes de exportar.");
    const frame=logical();
    const edge=Number(sizeSelect.value);
    if(![1920,3840].includes(edge))fail("Resolução de exportação não reconhecida.");
    const [width,height]=dimensions(edge,frame);
    const warnings=imagePreflight(width,frame);
    if(warnings.length){
      const accepted=confirm("LABMATTAR / Qualidade dos originais\n\n"+warnings.join("\n")+
        "\n\nA exportação terá a dimensão solicitada, mas não recuperará detalhes ausentes. Exportar mesmo assim?");
      if(!accepted){report("Exportação cancelada. Substitua as imagens por originais maiores.","warning");return null}
    }
    report("RENDERIZANDO "+width+" × "+height+" PX…","busy");
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d",{alpha:false,colorSpace:"srgb"});
    if(!ctx)fail("O navegador não conseguiu reservar a memória de exportação.");
    frame.outputScale=width/frame.width;frame.outputWidth=width;frame.outputHeight=height;
    ctx.setTransform(frame.outputScale,0,0,frame.outputScale,0,0);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    drawBackground(ctx,frame);
    const mask=await svgMask();
    drawM(ctx,frame,mask);
    drawMarkers(ctx,frame);
    drawWords(ctx,board.querySelector("#labReading"),frame);
    await drawSolidContrast(ctx,frame,mask);
    drawSignature(ctx,frame);
    const blob=await new Promise((resolve,reject)=>{
      try{canvas.toBlob(output=>output?resolve(output):reject(new Error("Falha na codificação PNG.")),"image/png")}
      catch(error){reject(error)}
    });
    if(blob.size<2048)fail("O PNG gerado está incompleto.");
    return {blob,width,height,warnings};
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
      if(!result)return;
      download(result.blob,"labmattar-"+(board.dataset.format||"horizontal")+"-"+
        result.width+"x"+result.height+".png");
      report("PNG "+result.width+" × "+result.height+" PX / "+
        (result.warnings.length?"ORIGINAL COM RESOLUÇÃO LIMITADA":"CONCLUÍDO"),
        result.warnings.length?"warning":"success");
    }catch(error){report("EXPORTAÇÃO NÃO CONCLUÍDA / "+(error?.message||"Erro desconhecido"),"error")}
    finally{button.disabled=false;exporting=false}
  }
  button.addEventListener("click",exportPng);
  window.LabExportPNG={capture:rasterize,dimensions};
})();
