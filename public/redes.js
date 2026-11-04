/* LABMATTAR / 06 — interações editoriais com materiais e vetores oficiais.
   A página não altera o editor, o acervo nem a identidade. */
(() => {
 'use strict';
 const $ = (selector, root=document) => root.querySelector(selector);
 const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
 const number = value => String(value).padStart(2,'0');

 const caseData = {
  preservar:{
   markup:'<img src="/redes/acervo/morangos-gesto.jpg" alt="Registro original de Morangos Carnívoros: mão e recipientes vermelhos, sem tratamento gráfico.">',
   className:'is-photo',
   source:'ESTUDO 01 / MORANGOS CARNÍVOROS / REGISTRO',
   rationale:'O registro já contém a informação visual necessária. Publicar sem sobreposições preserva o gesto e a matéria.'
  },
  identificar:{
   markup:'<img src="/redes/acervo/aleteia-03.jpg" alt="Instalação de Aleteia, com identificação editorial fora da fotografia."><div class="ss-case-caption"><span class="detail">ALETEIA / PROJETO</span><span class="detail">LABMATTAR / ACERVO</span></div>',
   className:'is-identified',
   source:'ESTUDO 02 / ALETEIA / IDENTIFICAÇÃO DISCRETA',
   rationale:'O nome organiza a leitura sem cobrir a obra. Prefira legenda ou uma área editorial separada da fotografia.'
  },
  compor:{
   markup:'<span class="detail">LABMATTAR / ACERVO</span><span class="title ss-case-editorial-title" data-lm-text-role="title">ÓPERA<br><span class="perpetua">DOS PORCOS</span></span><div class="ss-case-editorial-bottom"><span class="detail">PROJETO / DOCUMENTAÇÃO</span><img src="/identidade/vaso_03.svg" alt="" aria-hidden="true"></div>',
   className:'is-editorial',
   source:'ESTUDO 03 / ÓPERA DOS PORCOS / ABERTURA EDITORIAL',
   rationale:'Quando o texto é a informação principal, a tipografia e os elementos existentes podem construir a imagem. Não é necessário criar um novo template.'
  }
 };
 const caseFrame=$('#ssCaseCanvas');
 if(caseFrame){
  const caseTabs=$$('[data-case]');
  function setCase(key){
   const d=caseData[key];if(!d)return;
   caseFrame.className='ss-case-canvas '+d.className;
   caseFrame.innerHTML=d.markup;
   $('#ssCaseSource').textContent=d.source;
   $('#ssCaseRationale').textContent=d.rationale;
   caseTabs.forEach(button=>button.setAttribute('aria-selected',String(button.dataset.case===key)));
  }
  caseTabs.forEach(button=>button.addEventListener('click',()=>setCase(button.dataset.case)));
 }

 const symbolButtons=$$('[data-symbol]');
 let activeSymbol='M.svg';
 function selectSymbol(button){
  if(!button)return;
  activeSymbol=button.dataset.symbol;
  const src='/identidade/'+activeSymbol;
  $('#ssSymbolBig').src=src;
  $('#ssSymbolSmall').src=src;
  $('#ssSymbolBig').alt=(button.dataset.symbolLabel||'Símbolo oficial')+' em recorte circular.';
  $('#ssSymbolLabel').textContent=(button.dataset.symbolLabel||'SÍMBOLO')+' / RECORTE CIRCULAR';
  symbolButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
 }
 symbolButtons.forEach(button=>button.addEventListener('click',()=>selectSymbol(button)));
 const symbolExport=$('#ssExportSymbol');
 if(symbolExport)symbolExport.addEventListener('click',async()=>{
  symbolExport.disabled=true;
  try{
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponível');
   ctx.fillStyle='#f7f6f2';ctx.fillRect(0,0,1080,1080);
   const img=new Image();
   img.src='/identidade/'+activeSymbol;
   await img.decode();
   const width=img.naturalWidth||822,height=img.naturalHeight||627;
   const scale=Math.min(760/width,760/height);
   const dw=width*scale,dh=height*scale;
   ctx.drawImage(img,(1080-dw)/2,(1080-dh)/2,dw,dh);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('PNG indisponível');
   downloadBlob(blob,'labmattar-'+activeSymbol.replace('.svg','').toLowerCase()+'-1080.png');
  }catch(err){
   const status=$('#ssSymbolLabel');
   if(status)status.textContent='NÃO FOI POSSÍVEL GERAR PNG. TENTE NOVAMENTE.';
  }finally{symbolExport.disabled=false;}
 });

 function downloadBlob(blob,filename){
  const href=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=href;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1500);
 }

 const feedGrid=$('#ssFeedGrid');
 if(feedGrid){
  const originalIds=$$('.ss-feed-post',feedGrid).map(el=>el.dataset.id);
  const byId=new Map($$('.ss-feed-post',feedGrid).map(el=>[el.dataset.id,el]));
  const rhythm=originalIds.slice();
  const byProject=['aleteia','bastidor','titulo','morangos','poiesis','opera','nuvem','verso','box'];
  let order=originalIds.slice();
  let selectedId=order[0];
  let draggingId=null;
  const presetButtons=$$('[data-feed-preset]');
  function status(msg){$('#ssFeedStatus').textContent=msg;}
  function currentIndex(){return order.indexOf(selectedId);}
  function paint(){
   order.forEach(id=>feedGrid.appendChild(byId.get(id)));
   $('.ss-feed-post',feedGrid).forEach(el=>{
    const selected=String(el.dataset.id===selectedId);
    el.dataset.selected=selected;
    (el.querySelector('.ss-post-hotspot')||el).setAttribute('aria-pressed',selected);
   });
   const chosen=byId.get(selectedId);
   const index=currentIndex();
   $('#ssFeedIndex').textContent=number(index+1)+' / '+number(order.length);
   $('#ssFeedProject').textContent=chosen.dataset.project;
   $('#ssFeedKind').textContent=chosen.dataset.kind.toUpperCase();
   $('#ssFeedNote').textContent=chosen.dataset.note;
   $('#ssFeedPrev').disabled=index===0;
   $('#ssFeedNext').disabled=index===order.length-1;
   presetButtons.forEach(b=>{
    const expectation=b.dataset.feedPreset==='projetos'?byProject:rhythm;
    b.setAttribute('aria-pressed',String(order.every((id,i)=>id===expectation[i])));
   });
  }
  function select(id){if(!byId.has(id))return;selectedId=id;paint();}
  function move(from,to){
   if(from<0||to<0||from>=order.length||to>=order.length||from===to)return;
   const moved=order.splice(from,1)[0];order.splice(to,0,moved);
   selectedId=moved;paint();status('ORDEM EDITADA / COMPARE O RITMO DO CONJUNTO.');
  }
  byId.forEach(el=>{
   el.addEventListener('click',()=>select(el.dataset.id));
   el.addEventListener('keydown',ev=>{
    if(ev.altKey && (ev.key==='ArrowLeft'||ev.key==='ArrowRight')){
      ev.preventDefault();
      select(el.dataset.id);
      move(currentIndex(),currentIndex()+(ev.key==='ArrowLeft'?-1:1));
      (el.querySelector('.ss-post-hotspot')||el).focus();
    }
   });
   el.addEventListener('dragstart',ev=>{
     draggingId=el.dataset.id;el.classList.add('is-dragging');
     ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',draggingId);
   });
   el.addEventListener('dragover',ev=>{if(draggingId){ev.preventDefault();el.classList.add('is-drop-target');}});
   el.addEventListener('dragleave',()=>el.classList.remove('is-drop-target'));
   el.addEventListener('drop',ev=>{
     ev.preventDefault();el.classList.remove('is-drop-target');
     const source=draggingId||ev.dataTransfer.getData('text/plain');
     if(!byId.has(source))return;
     move(order.indexOf(source),order.indexOf(el.dataset.id));
   });
   el.addEventListener('dragend',()=>{
    draggingId=null;
    byId.forEach(x=>x.classList.remove('is-dragging','is-drop-target'));
   });
  });
  $('#ssFeedPrev').addEventListener('click',()=>move(currentIndex(),currentIndex()-1));
  $('#ssFeedNext').addEventListener('click',()=>move(currentIndex(),currentIndex()+1));
  presetButtons.forEach(button=>button.addEventListener('click',()=>{
   order=(button.dataset.feedPreset==='projetos'?byProject:rhythm).slice();
   selectedId=order[0];paint();
   status(button.dataset.feedPreset==='projetos'?
      'POR PROJETO / AGRUPAMENTO DESTACA A CONTINUIDADE DE UMA SÉRIE.':
      'RITMO / ASSUNTOS E DENSIDADES VISUAIS DIFERENTES COEXISTEM.');
  }));
  $('#ssFeedReset').addEventListener('click',()=>{
    order=rhythm.slice();selectedId=order[0];paint();status('ESTUDO RESTAURADO.');
  });
  $('#ssFeedCopy').addEventListener('click',async()=>{
   const text=order.map((id,index)=>number(index+1)+' / '+byId.get(id).dataset.project+' — '+byId.get(id).dataset.kind).join('\n');
   try {
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
    else {
     const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.left='-9999px';
     document.body.appendChild(field);field.select();if(!document.execCommand('copy'))throw new Error('Sem acesso');
     field.remove();
    }
    status('SEQUÊNCIA COPIADA / 09 PUBLICAÇÕES.');
   }catch(err){status('A CÓPIA NÃO FOI PERMITIDA NESTE NAVEGADOR.');}
  });
  $('#ssFeedExport').addEventListener('click',async()=>{
   const button=$('#ssFeedExport');button.disabled=true;status('PREPARANDO PRÉVIA...');
   try {
    const size=1080,gap=9,tile=(size-2*gap)/3,tileHeight=tile*4/3;
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=Math.round(tileHeight*3+gap*2);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponível');
    ctx.fillStyle='#f7f6f2';ctx.fillRect(0,0,canvas.width,canvas.height);
    await document.fonts.ready;
    for(let index=0;index<order.length;index++){
     const el=byId.get(order[index]),col=index%3,row=Math.floor(index/3);
     const x=col*(tile+gap),y=row*(tileHeight+gap);
     if(el.classList.contains('is-editorial')){
       ctx.fillStyle='#f7f6f2';ctx.fillRect(x,y,tile,tileHeight);
       ctx.fillStyle='#181818';ctx.font='300 18px UniversMattar, Arial, sans-serif';
       ctx.fillText('LABMATTAR / ACERVO',x+26,y+39);
       ctx.font='300 65px UniversMattar, Arial, sans-serif';ctx.fillText('ALE',x+26,y+tileHeight*.53);
       ctx.font='300 65px PerpetuaMattar, Georgia, serif';ctx.fillText('TEIA',x+26,y+tileHeight*.70);
       ctx.font='300 17px UniversMattar, Arial, sans-serif';ctx.fillText('PROJETO / REGISTRO',x+26,y+tileHeight-26);
     }else{
       const image=el.querySelector('img'),src=image.currentSrc||image.src;
       const loaded=new Image();loaded.src=src;await loaded.decode();
       const sw=loaded.naturalWidth,sh=loaded.naturalHeight;
       const crop=Math.max(tile/sw,tileHeight/sh);
       const cropWidth=tile/crop,cropHeight=tileHeight/crop;
       ctx.drawImage(loaded,(sw-cropWidth)/2,(sh-cropHeight)/2,cropWidth,cropHeight,x,y,tile,tileHeight);
     }
    }
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Falha no PNG');
    downloadBlob(blob,'labmattar-estudo-feed-9-publicacoes.png');
    status('PRÉVIA PNG GERADA / ESTUDO DO CONJUNTO.');
   }catch(err){status('NÃO FOI POSSÍVEL EXPORTAR. CONFIRA AS IMAGENS E TENTE NOVAMENTE.');}
   finally{button.disabled=false;}
  });
  paint();
 }

 const storyItems=[
  {src:'/redes/acervo/aleteia-18.jpg',alt:'Mesa de Aleteia e projeção imersiva vista com participantes',title:'Abrir com a experiência',description:'Apresentar primeiro o acontecimento, sem pedir que o público atravesse uma capa de marca.'},
  {src:'/redes/acervo/aleteia-bastidores.jpg',alt:'Equipe prepara mesas e pratos nos bastidores de Aleteia',title:'Situar o processo',description:'Mostrar o trabalho por trás da experiência. A sequência acrescenta contexto ao primeiro registro.'},
  {src:'/redes/acervo/aleteia-03.jpg',alt:'Mesa e projeções em detalhe na instalação de Aleteia',title:'Aproximar o olhar',description:'Mudar de escala revela matéria, superfície e construção sem recorrer a um grafismo novo.'},
  {src:'/redes/acervo/aleteia-14.jpg',alt:'Convidados e instalação de Aleteia em plano amplo',title:'Fechar com contexto',description:'Retomar o conjunto. Identificação e créditos podem acompanhar a legenda, sem encobrir a imagem.'}
 ];
 if($('#ssStoryImage')){
  let storyIndex=0;
  const storyButtons=$$('[data-story]');
  function setStory(i){
   storyIndex=Math.max(0,Math.min(storyItems.length-1,i));
   const d=storyItems[storyIndex],image=$('#ssStoryImage');
   image.src=d.src;image.alt=d.alt;
   $('#ssStoryTitle').textContent=d.title;
   $('#ssStoryDescription').textContent=d.description;
   $('#ssStoryIndex').textContent=number(storyIndex+1)+' / '+number(storyItems.length);
   storyButtons.forEach((b,index)=>b.setAttribute('aria-pressed',String(index===storyIndex)));
   $('#ssStoryPrev').disabled=storyIndex===0;
   $('#ssStoryNext').disabled=storyIndex===storyItems.length-1;
  }
  storyButtons.forEach(b=>b.addEventListener('click',()=>setStory(Number(b.dataset.story))));
  $('#ssStoryPrev').addEventListener('click',()=>setStory(storyIndex-1));
  $('#ssStoryNext').addEventListener('click',()=>setStory(storyIndex+1));
  setStory(0);
 }

 const formats={
  '3:4':{dimensions:'3:4 / 1080 × 1440 PX',note:'Formato fotográfico vertical. Verifique se o elemento principal se mantém no recorte do perfil.'},
  '4:5':{dimensions:'4:5 / 1080 × 1350 PX',note:'Proporção editorial alternativa. Confira se a imagem não perde informações essenciais ao adaptar o corte.'},
  '9:16':{dimensions:'9:16 / 1080 × 1920 PX',note:'Story ou Reel. Mantenha texto e dados importantes afastados da interface, que varia por dispositivo.'}
 };
 if($('#ssFormatFrame')){
  const frame=$('#ssFormatFrame'),image=$('img',frame);
  const modeButtons=$$('[data-format]');
  function chooseFormat(value){
   if(!formats[value])return;
   frame.dataset.ratio=value;
   $('#ssFormatDimensions').textContent=formats[value].dimensions;
   $('#ssFormatDescription').textContent=formats[value].note;
   modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===value)));
  }
  modeButtons.forEach(b=>b.addEventListener('click',()=>chooseFormat(b.dataset.format)));
  $('#ssFormatGuides').addEventListener('change',ev=>frame.classList.toggle('show-guides',ev.target.checked));
  // Manual crop inspection: drag the photograph without changing the original.
  let start=null,pos={x:50,y:50};
  frame.style.touchAction='none';
  frame.addEventListener('pointerdown',ev=>{
    if(ev.button!==0)return;
    start={x:ev.clientX,y:ev.clientY,px:pos.x,py:pos.y};
    frame.setPointerCapture(ev.pointerId);
  });
  frame.addEventListener('pointermove',ev=>{
    if(!start)return;
    const rect=frame.getBoundingClientRect();
    pos.x=Math.max(0,Math.min(100,start.px-(ev.clientX-start.x)/rect.width*90));
    pos.y=Math.max(0,Math.min(100,start.py-(ev.clientY-start.y)/rect.height*90));
    image.style.objectPosition=pos.x+'% '+pos.y+'%';
  });
  frame.addEventListener('pointerup',()=>{start=null;});
  frame.addEventListener('pointercancel',()=>{start=null;});
  chooseFormat('3:4');
 }

 const checklist=$$('[data-review]');
 if(checklist.length){
  function updateChecklist(){
    const done=checklist.filter(c=>c.checked).length;
    $('#ssReviewCount').textContent=done+' / '+checklist.length+
      (done===checklist.length?' CRITÉRIOS CONFERIDOS / CONFIRA A INFORMAÇÃO FINAL.':' CRITÉRIOS CONFERIDOS');
  }
  checklist.forEach(box=>box.addEventListener('change',updateChecklist));
  updateChecklist();
 }
})();
