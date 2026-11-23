/* LABMATTAR / REVIEW3 — exportador de composição tipográfica para After Effects.
   O movimento de referência vive em design/tipografia.html; exportação AE exige QA visual. */
(function(){
  "use strict";
  var form=document.getElementById("lm-ae-form");
  if(!form)return;
  var input=document.getElementById("lm-ae-text");
  var mode=document.getElementById("lm-ae-mode");
  var custom=document.getElementById("lm-ae-custom");
  var duration=document.getElementById("lm-ae-duration");
  var distance=document.getElementById("lm-ae-distance");
  var blur=document.getElementById("lm-ae-blur");
  var opacity=document.getElementById("lm-ae-opacity");
  var exportMode=document.getElementById("lm-ae-target");
  var preview=document.getElementById("lm-ae-preview");
  var status=document.getElementById("lm-ae-status");
  var run=document.getElementById("lm-ae-preview-play");
  var line1=document.querySelector("#motion-composition [data-motion-role='title'] [data-original]");
  var baseline={duration:1.5,distance:22,blur:10,opacity:8};
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  function settings(){
    return mode.value==="original" ? baseline : {
      duration:Number(duration.value)||1.5,
      distance:Number(distance.value)||0,
      blur:Number(blur.value)||0,
      opacity:Number(opacity.value)||0
    };
  }
  function update(){
    var text=input.value.trim()||"A PALAVRA\nEM MOVIMENTO";
    preview.textContent=text;
    custom.hidden=mode.value==="original";
    if(status)status.textContent=mode.value==="original"?"Parâmetros originais ativos.":"Parâmetros especiais ativos.";
  }
  input.addEventListener("input",update);
  mode.addEventListener("change",update);
  run.addEventListener("click",function(){
    preview.getAnimations().forEach(function(a){a.cancel();});
    preview.textContent=input.value.trim()||"A PALAVRA\nEM MOVIMENTO";
    if(reduced.matches)return;
    var p=settings();
    preview.animate([{opacity:p.opacity/100,transform:"translateY("+p.distance+"px)",filter:"blur("+p.blur+"px)"},{opacity:1,transform:"translateY(0)",filter:"blur(0)"}],{duration:p.duration/1.5*1250,easing:"cubic-bezier(.16,1,.3,1)",fill:"none"});
    // A prévia completa com troca de caracteres é a demonstração oficial acima.
    document.getElementById("lm-motion-play").click();
  });
  function jsx(config){
    var code=[];
    function add(s){code.push(s);}
    // JSX generated on demand; text is safely encoded as a JavaScript string literal.
    add("// LABMATTAR — Texto em movimento / Exportação experimental REVIEW3");
    add("// Executar em File > Scripts > Run Script File no After Effects.");
    add("// Correspondência exata da substituição de caracteres depende de validação em AE.");
    add("(function(){");
    add("app.beginUndoGroup('LABMATTAR / Texto em movimento');");
    add("try {");
    add("var comp=app.project.activeItem;");
    add("if (!(comp instanceof CompItem)) throw new Error('Abra uma composicao antes de executar.');");
    add("var useSelected="+(config.target==="selected"?"true":"false")+";");
    add("var content="+JSON.stringify(config.text)+";");
    add("var p="+JSON.stringify(config.p)+";");
    add("var layers=[];");
    add("if (useSelected) { for(var i=0;i<comp.selectedLayers.length;i++) if(comp.selectedLayers[i].property('ADBE Text Properties')) layers.push(comp.selectedLayers[i]); if(!layers.length) throw new Error('Selecione pelo menos uma camada de texto.'); }");
    add("else { var parts=content.split(/\\r?\\n/); for(var i=0;i<parts.length;i++){var layer=comp.layers.addText(parts[i]||' ');layer.name='LM / '+(parts[i]||'TEXTO');layer.property('ADBE Transform Group').property('ADBE Position').setValue([comp.width/2,comp.height/2+(i-(parts.length-1)/2)*120]);layers.push(layer);} }");
    add("function slider(l,name,val){var e=l.property('ADBE Effect Parade').addProperty('ADBE Slider Control');e.name='LM / '+name;e.property(1).setValue(val);return e;}");
    add("function bezier(){return 'function lmEase(x){x=Math.max(0,Math.min(1,x));var lo=0,hi=1,t=0;for(var k=0;k<14;k++){t=(lo+hi)/2;var xx=3*.16*(1-t)*(1-t)*t+3*.3*(1-t)*t*t+t*t*t;if(xx<x)lo=t;else hi=t;}return 3*(1-t)*(1-t)*t+3*(1-t)*t*t+t*t*t;}';}");
    add("for(var n=0;n<layers.length;n++){var l=layers[n];");
    add("slider(l,'Duração (s)',p.duration); slider(l,'Deslocamento (px)',p.distance);slider(l,'Desfoque (px)',p.blur);slider(l,'Opacidade inicial (%)',p.opacity);");
    add("var prefix=\"var t=Math.max(0,time-inPoint);var dur=Math.max(.01,effect('LM / Duração (s)')('Slider'));var q=Math.min(1,t/(dur*1250/1500));\"+bezier()+\"var f=lmEase(q);\";");
    add("var tr=l.property('ADBE Transform Group');var op=tr.property('ADBE Opacity');op.expression=prefix+\"var a=effect('LM / Opacidade inicial (%)')('Slider');a+(100-a)*f;\";");
    add("var pos=tr.property('ADBE Position');pos.expression=prefix+\"var d=effect('LM / Deslocamento (px)')('Slider');value.length>2?[value[0],value[1]+(1-f)*d,value[2]]:[value[0],value[1]+(1-f)*d];\";");
    add("try{var fx=l.property('ADBE Effect Parade').addProperty('ADBE Gaussian Blur 2');fx.name='LM / Foco';fx.property(1).expression=prefix+\"effect('LM / Desfoque (px)')('Slider')*(1-f);\";}catch(e){}");
    add("var source=l.property('ADBE Text Properties').property('ADBE Text Document');");
    add("if (source && !source.expressionEnabled){");
    add("source.expression=\"var txt=value.text;var t=Math.max(0,time-inPoint);var dur=Math.max(.01,effect('LM / Duração (s)')('Slider'));var progress=Math.min(1,t/dur);var alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÃÂÉÊÍÓÔÕÚÇ0123456789';var count=Math.max(1,txt.replace(/\\\\s/g,'').length-1);var n=0,out='';for(var i=0;i<txt.length;i++){var ch=txt.charAt(i);if(/\\\\s/.test(ch)){out+=ch;continue;}var off=n++/count;if(progress>=off){out+=ch;continue;}var seed=Math.abs(Math.floor(Math.sin((n+1)*12.9898+Math.floor(progress*42)*9.17)*43758.5453));out+=alphabet.charAt(seed%alphabet.length);}out;\";");
    add("}");
    add("}");
    add("alert('LABMATTAR: animação aplicada a '+layers.length+' camada(s). Revise a troca de caracteres e o resultado visual.');");
    add("} catch(err){alert('LABMATTAR: '+err.message);} finally {app.endUndoGroup();}");
    add("})();");
    return code.join("\n");
  }
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var text=input.value.trim();
    if(!text && exportMode.value!=="selected"){status.textContent="Escreva o texto antes de exportar.";return;}
    var payload=jsx({text:text,target:exportMode.value,p:settings()});
    var blob=new Blob([payload],{type:"text/plain;charset=utf-8"});
    var url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="LABMATTAR_TEXTO_EM_MOVIMENTO.jsx";document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1500);
    status.textContent="Script JSX gerado. Execute no After Effects; confira a equivalência visual antes de uso final.";
  });
  update();
})();