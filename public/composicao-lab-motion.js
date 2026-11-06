import {textMotionProfile} from './lab-text-motion.mjs';
/* LABMATTAR / Entrada dos textos no Laboratorio.
 * Reproduz a unica entrada normativa do capitulo Tipografia:
 * opacidade, deslocamento 22px, blur 10px e transformacao de caracteres.
 * Os clones sao apenas visuais; nunca alteram o documento editavel ou seu estado. */
(()=>{
  "use strict";
  const board=document.getElementById("labArtboard");
  const button=document.getElementById("labMotionPlay");
  const label=document.getElementById("labMotionPlayText");
  const status=document.getElementById("labMotionStatus");
  if(!board||!button||!label||!status)return;

  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const alphabet=textMotionProfile.alphabet;
  const ctx=document.createElement("canvas").getContext("2d");
  const frames=textMotionProfile.frames;
  const timing=textMotionProfile.timing;
  let frame=0,animations=[],ghosts=[],running=false;

  function stop(message=""){
    cancelAnimationFrame(frame);
    frame=0;
    for(const animation of animations)animation.cancel();
    animations=[];
    for(const ghost of ghosts)ghost.remove();
    ghosts=[];
    running=false;
    delete board.dataset.motionPlaying;
    button.setAttribute("aria-label","Reproduzir entrada dos textos");
    label.textContent="ENTRADA";
    if(message)status.textContent=message;
  }

  function cleanClone(root){
    for(const element of [root,...root.querySelectorAll("*")]){
      for(const attribute of ["id","contenteditable","tabindex","role","aria-label","aria-multiline","data-lab-inline"])
        element.removeAttribute(attribute);
    }
    root.setAttribute("aria-hidden","true");
    root.inert=true;
    return root;
  }

  function createGhosts(){
    const visual=document.createElement("div");
    visual.className="lm-lab-motion-layer";
    visual.setAttribute("aria-hidden","true");
    visual.inert=true;
    visual.append(cleanClone(board.querySelector("#labReading").cloneNode(true)));
    board.append(visual);
    ghosts.push(visual);

    // Keep the exact solid-M contrast pass, including its measured vector mask.
    const contrast=[...board.children].find(node=>
      node.classList.contains("lm-lab-solid-contrast")&&!node.hasAttribute("data-motion-clone"));
    if(contrast&&board.dataset.mContent==="solid"){
      const ink=cleanClone(contrast.cloneNode(true));
      ink.setAttribute("data-motion-clone","");
      board.append(ink);
      ghosts.push(ink);
    }
    // Signature details follow the same motion as the other three roles.
    // Clone them in place: no mutation of the live signature or its saved slots.
    const signature=board.querySelector("#labSignatureLayer");
    if(signature?.childElementCount){
      const clone=cleanClone(signature.cloneNode(true));
      clone.classList.add("lm-lab-signature-motion-layer");
      board.append(clone);
      ghosts.push(clone);
    }
    return ghosts.map(ghost=>ghost.querySelector(".lm-lab-reading")).filter(Boolean);
  }

  function prepareLine(line,scale){
    const original=line.textContent;
    if(!original.trim())return null;
    const tokenFonts=[...line.querySelectorAll(".lm-lab-title-word")].map(node=>getComputedStyle(node).fontFamily);
    const cs=getComputedStyle(line);
    ctx.font=cs.fontWeight+" "+cs.fontSize+" "+cs.fontFamily;
    const glyphWidths=[...alphabet].map(char=>[char,ctx.measureText(char).width]);
    const choices=[...original].map(char=>{
      const width=ctx.measureText(char).width;
      return glyphWidths.filter(item=>item[1]<=width*.96).map(item=>item[0]).join("")||char;
    });
    const fragment=document.createDocumentFragment(),words=[];
    let offset=0;
    for(const token of original.match(/\s+|\S+/g)||[]){
      if(/^\s+$/.test(token))fragment.append(document.createTextNode(token));
      else{
        const word=document.createElement("span");
        word.className="lm-lab-motion-word";
        if(tokenFonts[words.length])word.style.fontFamily=tokenFonts[words.length];
        word.textContent=token;
        fragment.append(word);
        words.push({node:word,original:token,offset});
      }
      offset+=token.length;
    }
    line.replaceChildren(fragment);
    for(const word of words)
      word.node.style.width=(word.node.getBoundingClientRect().width/scale)+"px";
    return {words,choices,count:Math.max(1,original.replace(/\s/g,"").length-1)};
  }

  function play(){
    stop();
    const focused=document.activeElement;
    if(focused&&board.contains(focused)&&focused.matches("[contenteditable]"))focused.blur();
    if(reduced.matches){
      status.textContent="Texto exibido sem movimento conforme a preferencia de acessibilidade.";
      return;
    }
    const scale=board.getBoundingClientRect().width/board.offsetWidth||1;
    const readings=createGhosts();
    const prepared=[];
    const targets=[];
    for(const reading of readings){
      targets.push(...reading.querySelectorAll(
        ".lm-lab-kicker,.lm-lab-title,.lm-lab-body:not([hidden]),.lm-lab-bottom"
      ));
      for(const line of reading.querySelectorAll(
        ".lm-lab-kicker,.lm-lab-title-line,.lm-lab-body:not([hidden]),.lm-lab-bottom span"
      )){
        const unit=prepareLine(line,scale);
        if(unit)prepared.push(unit);
      }
    }
    const signatureGhost=ghosts.find(ghost=>ghost.classList.contains("lm-lab-signature-motion-layer"));
    if(signatureGhost){
      targets.push(...signatureGhost.querySelectorAll(".lm-lab-signature-slot"));
      for(const line of signatureGhost.querySelectorAll(".lm-lab-signature-caption")){
        const preparedLine=prepareLine(line,scale);
        if(preparedLine)prepared.push(preparedLine);
      }
    }
    board.dataset.motionPlaying="true";
    running=true;
    label.textContent="REINICIAR";
    button.setAttribute("aria-label","Reiniciar entrada dos textos");
    status.textContent="Reproduzindo Titulo, Corpo e Detalhe.";

    const sync=document.timeline.currentTime;
    animations=targets.map(target=>target.animate(frames,timing));
    if(sync!==null)animations.forEach(animation=>{animation.startTime=sync;});
    const start=performance.now(),duration=1500;
    const tick=now=>{
      if(!running)return;
      const progress=Math.min(1,(now-start)/duration);
      prepared.forEach((line,seed)=>{
        let n=0;
        for(const word of line.words){
          word.node.textContent=[...word.original].map((char,index)=>{
            const offset=n++/line.count;
            if(progress>=offset)return char;
            const id=Math.abs(Math.floor(Math.sin((n+seed+1)*12.9898+Math.floor(progress*42)*9.17)*43758.5453));
            const choices=line.choices[word.offset+index];
            return choices[id%choices.length];
          }).join("");
        }
      });
      if(progress<1)frame=requestAnimationFrame(tick);
      else stop("Entrada concluida.");
    };
    frame=requestAnimationFrame(tick);
  }

  button.addEventListener("click",play);
  // Editing and changing composition always take precedence over playback.
  document.addEventListener("pointerdown",event=>{
    if(running&&event.target.closest("#labReading"))stop();
  },true);
  document.addEventListener("click",event=>{
    if(running&&event.target.closest("#laboratorio button")&&!event.target.closest("#labMotionPlay"))stop();
  },true);
  document.addEventListener("input",event=>{
    if(running&&event.target.closest("#laboratorio"))stop();
  },true);
  document.addEventListener("change",event=>{
    if(running&&event.target.closest("#laboratorio"))stop();
  },true);
  window.addEventListener("resize",()=>{if(running)stop();},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&running)stop();});
  reduced.addEventListener?.("change",()=>{if(running)stop();});
})();
