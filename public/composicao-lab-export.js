/* LABMATTAR | First production export: a lossless PNG at real output dimensions.
 * The current DOM is the single layout source; the visible preview is NEVER
 * upscaled. An isolated SVG foreignObject snapshot is rasterized at the
 * requested size using the browser graphics engine (Chromium/Edge).
 * Originals, rules, masks, vectors and installed fonts are read-only.
 */
(()=>{
  "use strict";
  const board=document.getElementById("labArtboard");
  const button=document.getElementById("labExportPng");
  const sizeSelect=document.getElementById("labExportSize");
  const status=document.getElementById("labExportStatus");
  if(!board||!button||!sizeSelect||!status)return;

  const imageCache=new Map();
  const validTypes=new Map([
    ["/fonts/univers-lt-std-45-light.otf","font/otf"],
    ["/fonts/perpetua-titling-light.ttf","font/ttf"]
  ]);
  let exporting=false;

  function report(message,state="idle"){
    status.textContent=message;
    status.dataset.state=state;
  }
  function fail(message){
    report(message,"error");
    throw new Error(message);
  }
  function dataURL(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error("Não foi possível incorporar um recurso visual."));
      reader.onload=()=>resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
  async function resource(url){
    const absolute=new URL(url,location.href);
    if(absolute.origin!==location.origin)throw new Error("Arquivo externo sem permissão de exportação: "+absolute.pathname);
    const key=absolute.href;
    if(!imageCache.has(key)){
      const pending=(async()=>{
        const response=await fetch(key,{credentials:"same-origin"});
        if(!response.ok)throw new Error("Recurso indisponível: "+absolute.pathname+" ("+response.status+")");
        const blob=await response.blob();
        if(!blob.size)throw new Error("Arquivo vazio: "+absolute.pathname);
        return dataURL(blob);
      })();
      imageCache.set(key,pending);
    }
    try{return await imageCache.get(key)}
    catch(error){imageCache.delete(key);throw error}
  }
  async function embedUrls(css){
    if(!css||css.indexOf("url(")<0)return css;
    // Only the image, mask and font assets used in our own rendered styles are
    // embedded. No arbitrary external URLs leave the document.
    const matcher=/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)]*))\s*\)/g;
    const found=[...css.matchAll(matcher)],values=new Map();
    for(const match of found){
      const url=(match[1]||match[2]||match[3]||"").trim();
      if(!url||url.startsWith("data:")||url.startsWith("#"))continue;
      if(!values.has(url))values.set(url,await resource(url));
    }
    return css.replace(matcher,(whole,double,single,plain)=>{
      const url=(double||single||plain||"").trim();
      return values.has(url)?'url("'+values.get(url)+'")':whole;
    });
  }
  async function writeStyle(original,target,pseudo=false){
    const style=getComputedStyle(original,pseudo||null);
    for(const name of style){
      if(name==="transition"||name.startsWith("transition-")||name==="animation"||name.startsWith("animation-"))continue;
      let value=style.getPropertyValue(name);
      if(!value)continue;
      value=await embedUrls(value);
      try{target.style.setProperty(name,value,"important")}catch{}
    }
  }
  function hasPseudo(original,kind){
    const style=getComputedStyle(original,kind);
    return style.content!=="none"&&style.content!=="normal"&&style.display!=="none"&&
      style.visibility!=="hidden";
  }
  async function cloneBoard(){
    const copy=board.cloneNode(true);
    const source=[board,...board.querySelectorAll("*")];
    const dest=[copy,...copy.querySelectorAll("*")];
    if(source.length!==dest.length)fail("Não foi possível preservar a estrutura da composição.");

    // Every element receives the browser's final computed properties. This
    // preserves actual line breaks, page margins, blur, masks and M placement.
    for(let i=0;i<source.length;i++){
      const from=source[i],to=dest[i];
      await writeStyle(from,to);
      if(to.nodeType!==1)continue;
      to.removeAttribute("contenteditable");
      to.removeAttribute("tabindex");
      to.removeAttribute("role");
      to.removeAttribute("aria-label");
      to.removeAttribute("aria-live");
      if(from.tagName.toLowerCase()==="img"&&from.getAttribute("src")){
        to.setAttribute("src",await resource(from.currentSrc||from.src));
        to.removeAttribute("srcset");
      }
      if(from.hasAttribute("hidden"))to.style.setProperty("display","none","important");
    }

    // CSS generated contrast/scrim layers are real render layers; draw them as
    // temporary physical elements with their computed pseudo-element styles.
    for(let i=0;i<source.length;i++){
      const from=source[i],to=dest[i];
      for(const kind of ["::before","::after"]){
        if(!hasPseudo(from,kind))continue;
        const element=document.createElement("span");
        await writeStyle(from,element,kind);
        const value=getComputedStyle(from,kind).content;
        if(value&&value!=='""'&&value!=="''"&&!value.startsWith("url("))
          element.textContent=value.replace(/^["']|["']$/g,"");
        if(kind==="::before")to.prepend(element);
        else to.append(element);
      }
    }

    // Do not export editor guides or transient animation clones.
    copy.querySelectorAll(".lm-lab-grid,.lm-lab-safeline,.lm-lab-motion-layer,.lm-lab-signature-motion-layer,[data-motion-clone]").forEach(node=>node.remove());
    copy.style.setProperty("box-shadow","none","important");
    copy.style.setProperty("transform","none","important");
    copy.style.setProperty("transform-origin","top left","important");
    copy.style.setProperty("margin","0","important");
    copy.style.setProperty("overflow","hidden","important");
    copy.style.setProperty("width",board.offsetWidth+"px","important");
    copy.style.setProperty("height",board.offsetHeight+"px","important");
    copy.style.setProperty("max-width","none","important");
    copy.style.setProperty("max-height","none","important");
    copy.style.setProperty("aspect-ratio","auto","important");
    copy.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
    return copy;
  }
  async function fontDeclarations(){
    const [univers,perpetua]=await Promise.all([...validTypes.keys()].map(resource));
    return [
      '@font-face{font-family:UniversMattar;src:url("'+univers+'") format("opentype");font-style:normal;font-weight:300;font-display:block}',
      '@font-face{font-family:PerpetuaMattar;src:url("'+perpetua+'") format("truetype");font-style:normal;font-weight:300;font-display:block}'
    ].join("\n");
  }
  function dimensions(edge){
    const width=board.offsetWidth,height=board.offsetHeight;
    if(width<=0||height<=0)fail("A superfície não possui dimensões válidas.");
    const factor=edge/Math.max(width,height);
    return [Math.round(width*factor),Math.round(height*factor)];
  }
  function imagePreflight(targetW,targetH){
    const scale=targetW/board.offsetWidth;
    const photos=[...board.querySelectorAll(".lm-lab-photo-ambient,.lm-lab-m-photo img")]
      .filter(img=>getComputedStyle(img).display!=="none"&&
        getComputedStyle(img.closest(".lm-lab-photo-layer")).display!=="none"&&
        getComputedStyle(img.closest(".lm-lab-m-photo")||img).display!=="none");
    const warnings=[];
    for(const img of photos){
      if(!img.complete||!img.naturalWidth||!img.naturalHeight){
        warnings.push("Uma fotografia ainda não carregou.");
        continue;
      }
      const rect=img.getBoundingClientRect(),zoom=board.getBoundingClientRect().width/board.offsetWidth||1;
      const requiredW=rect.width/zoom*scale,requiredH=rect.height/zoom*scale;
      const cover=Math.max(requiredW/img.naturalWidth,requiredH/img.naturalHeight);
      if(cover>1.01)warnings.push("Imagem "+img.naturalWidth+"×"+img.naturalHeight+" px será ampliada "+cover.toFixed(1)+"×.");
    }
    return [...new Set(warnings)];
  }
  async function rasterize(){
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(board.dataset.motionPlaying==="true")fail("Conclua a animação de entrada antes de exportar.");
    if(board.dataset.state!=="ok"||board.getAttribute("aria-invalid")==="true")
      fail("A composição apresenta conflitos de leitura. Corrija antes de exportar.");

    const edge=Number(sizeSelect.value);
    if(![1920,3840].includes(edge))fail("Resolução de exportação não reconhecida.");
    const [width,height]=dimensions(edge);
    const warnings=imagePreflight(width,height);
    if(warnings.length){
      const accepted=confirm("LABMATTAR / Qualidade dos originais\n\n"+warnings.join("\n")+
        "\n\nA exportação terá a dimensão solicitada, mas não recuperará detalhes ausentes. Exportar mesmo assim?");
      if(!accepted){report("Exportação cancelada. Substitua as imagens por originais maiores.","warning");return null}
    }
    report("PREPARANDO "+width+" × "+height+" PX…","busy");
    const clone=await cloneBoard();
    const fontStyle=document.createElement("style");
    fontStyle.textContent=await fontDeclarations();
    clone.prepend(fontStyle);
    const doc=new XMLSerializer().serializeToString(clone);
    const logicalW=board.offsetWidth,logicalH=board.offsetHeight;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+logicalW+'" height="'+logicalH+'" viewBox="0 0 '+logicalW+' '+logicalH+'">'+
      '<foreignObject x="0" y="0" width="100%" height="100%">'+doc+'</foreignObject></svg>';
    const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    let image;
    try{
      image=new Image();
      await new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=()=>reject(new Error("O navegador não conseguiu interpretar a composição vetorial. Tente Chrome ou Edge atualizado."));
        image.src=url;
      });
      const canvas=document.createElement("canvas");
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext("2d",{alpha:false,colorSpace:"srgb"});
      if(!ctx)fail("Sem memória disponível para esta resolução.");
      ctx.imageSmoothingQuality="high";
      ctx.drawImage(image,0,0,width,height);
      const output=await new Promise((resolve,reject)=>{
        try{canvas.toBlob(x=>x?resolve(x):reject(new Error("Falha na codificação PNG.")),"image/png")}catch(e){reject(e)}
      });
      if(output.size<2048)fail("O arquivo gerado está incompleto.");
      return {blob:output,width,height,warnings};
    }finally{URL.revokeObjectURL(url)}
  }
  function download(blob,name){
    const link=document.createElement("a"),url=URL.createObjectURL(blob);
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),6000);
  }
  async function exportPng(){
    if(exporting)return;
    exporting=true;button.disabled=true;
    report("VALIDANDO COMPOSIÇÃO…","busy");
    try{
      const result=await rasterize();
      if(!result)return;
      const format=board.dataset.format||"horizontal";
      download(result.blob,"labmattar-"+format+"-"+result.width+"x"+result.height+".png");
      report("PNG "+result.width+" × "+result.height+" PX / "+(result.warnings.length?"ORIGINAL COM RESOLUÇÃO LIMITADA":"CONCLUÍDO"),result.warnings.length?"warning":"success");
    }catch(error){report("EXPORTAÇÃO NÃO CONCLUÍDA / "+(error?.message||"Erro desconhecido"),"error");}
    finally{button.disabled=false;exporting=false}
  }
  button.addEventListener("click",exportPng);
  // Expose the same path to browser QA, not a second renderer.
  window.LabExportPNG={capture:rasterize,dimensions};
})();
