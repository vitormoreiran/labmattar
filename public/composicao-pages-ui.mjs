import {installMotionInk} from './lab-motion-ink.mjs';
import {lowContrastPages} from './lab-application-rules.mjs';
import {createPage,createMotion,motionBox,createClip,clipBox,privateClipUrl,createBackgroundVideo,backgroundVideoUrl,readSequence,sequenceDocument,movePage,SEQUENCE_KIND,privatePhotoCatalog,createSection,sectionState,hasSectionText,applyDocumentSignature} from './lab-sequence.mjs';
import {createProductionDocument,verifyRoundTrip} from './composicao-document.mjs';
import {motionFrame,officialFonts,webDocument,download} from './lab-presentation-export.mjs';
import {persistProjectDraft,pagesToSections,fetchMotionCatalog} from './lab-project-lifecycle.mjs';
const by=id=>document.getElementById(id),copy=value=>JSON.parse(JSON.stringify(value));
const board=by('labArtboard'),bridge=()=>window.LabProductionBridge;
const key='labmattar-pages-v1';
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const notify=(message,error=false)=>{by('labPagesStatus').textContent=message;by('labPagesStatus').dataset.state=error?'error':'idle';by('labExportStatus').textContent=message;by('labExportStatus').dataset.state=error?'error':busy?'busy':'idle';};
let documentSignature=null,sections=null,pages=[],current=0,name='Apresentação LABMATTAR',catalog=null,catalogLoading=false,switching=false,busy=false,timer=0,enabled=false,still=true,selectedMotion='',selectedClip='',clipsPlaying=true;
const panel=by('labPages');
if(board&&panel){init().catch(error=>notify(error.message,true));}
function nativePage(id=uid('page'),pageName='Página 1',motions=[],clips=[],backgroundVideo=null){
  const {state,photoCatalog}=bridge().snapshot();
  const result=createPage({id,name:pageName,state,photoCatalog,maxEdge:Number(by('labExportSize').value),motions,clips,backgroundVideo});
  if(sections)result.sectionId=pages[current]?.sectionId||sections[0].id;return result;
}
function commit(){
  if(switching||busy||!pages.length)return {deferred:true};
  clearTimeout(timer);if(sections)syncSectionBackground();const old=pages[current];pages[current]=nativePage(old.id,old.name,old.motions,old.clips||[],old.backgroundVideo||null);
  pages=applyDocumentSignature(pages,documentSignature,bridge().snapshot().photoCatalog);
  const result=persistProjectDraft(localStorage,key,{document:sequenceDocument(name,pages,sections,documentSignature),current,enabled});
  by('labSaveState').textContent=result.message;by('labSaveState').dataset.state=result.ok?'success':'error';
  if(!result.ok)notify(result.message,true);
  renderPages();applySectionVisual();
  return result;
}
let pageListKey='',deliveryFormat='pdf',videoAbort=null;
function deliveryBusy(){return busy||switching||Boolean(window.LabExportPNG?.isExporting?.());}
function closeDelivery(){if(deliveryBusy())return;by('labDeliveryDialog').close();commit();}
function renderDelivery(){
  by('labWebPublishing').hidden=deliveryFormat!=='html';
  by('labVideoOptions').hidden=deliveryFormat!=='mp4';
  document.querySelector('.lab-delivery-quality').hidden=deliveryFormat==='mp4';
  const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72)||'nova-apresentacao';
  by('labPublicationAddress').textContent='labmattar.com/capitulo-4/'+slug+'/';
  const names={horizontal:'Horizontal / 16:9',vertical:'Vertical / 9:16',quadrado:'Quadrado / 1:1',editorial:'Editorial / √2:1'};
  const included=deliveryFormat==='png'||(deliveryFormat==='mp4'&&by('labVideoScope').value==='current')?[{page:pages[current],index:current}]:pages.map((page,index)=>({page,index}));
  by('labDeliveryName').textContent=name;by('labDeliveryCount').textContent=included.length+' PÁGINA'+(included.length>1?'S':'');
  const list=by('labDeliveryPages');list.replaceChildren();
  for(const {page,index} of included){const item=document.createElement('li'),number=document.createElement('span'),caption=document.createElement('div'),title=document.createElement('span'),detail=document.createElement('small');
    number.textContent=String(index+1).padStart(2,'0');number.className='lab-delivery-page-number';title.textContent=page.name;detail.textContent=names[page.composition.pages[0].surface.format];caption.append(title,detail);item.append(number,caption);list.append(item);}
  for(const button of document.querySelectorAll('button[data-delivery-format]'))button.setAttribute('aria-pressed',String(button.dataset.deliveryFormat===deliveryFormat));
  for(const [id,format] of [['labExportPdf','pdf'],['labExportHtml','html'],['labExportPng','png'],['labExportMp4','mp4']])by(id).hidden=format!==deliveryFormat;
  by('labDeliveryScope').textContent=deliveryFormat==='mp4'?`MP4 / ${included.length} página${included.length>1?'s':''} / ${Number(by('labVideoSeconds').value)*included.length} s / 30 fps / sem áudio`:deliveryFormat==='png'?`PNG / página ${current+1}: ${pages[current].name}`:deliveryFormat==='pdf'?`PDF / ${pages.length} página${pages.length>1?'s':''} / motions como quadros estáticos`:`SITE HTML / ${pages.length} página${pages.length>1?'s':''} / motions animados e recursos incorporados`;
}
function openDelivery(){
  if(deliveryBusy())return;commit();renderDelivery();by('labVideoProgress').hidden=true;by('labVideoProgress').value=0;by('labExportStatus').textContent='';by('labExportStatus').dataset.state='idle';by('labDeliveryDialog').showModal();
}
function initDelivery(){
  by('labOpenDelivery').addEventListener('click',openDelivery);by('labReviewDelivery').addEventListener('click',openDelivery);
  by('labDeliveryClose').addEventListener('click',closeDelivery);by('labDeliveryBack').addEventListener('click',closeDelivery);
  by('labDeliveryDialog').addEventListener('cancel',event=>{event.preventDefault();closeDelivery();});
  for(const button of document.querySelectorAll('button[data-delivery-format]'))button.addEventListener('click',()=>{if(deliveryBusy())return;deliveryFormat=button.dataset.deliveryFormat;renderDelivery();});
  for(const id of ['labVideoScope','labVideoSeconds','labVideoQuality'])by(id).addEventListener('change',renderDelivery);
  by('labVideoCancel').addEventListener('click',()=>videoAbort?.abort());
  const status=by('labExportStatus');const sync=()=>{
    by('labDeliveryStatus').textContent=status.textContent;by('labDeliveryStatus').dataset.state=status.dataset.state;
    const locked=deliveryBusy();by('labDeliveryDialog').setAttribute('aria-busy',String(locked));
    for(const button of by('labDeliveryDialog').querySelectorAll('button'))button.disabled=locked&&button.id!=='labVideoCancel';
    for(const input of by('labVideoOptions').querySelectorAll('input,select'))input.disabled=locked;
    by('labVideoCancel').hidden=!videoAbort;by('labExportSize').disabled=locked;
    by('labOpenDelivery').disabled=locked;by('labReviewDelivery').disabled=locked;
  };new MutationObserver(sync).observe(status,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state']});sync();
}

function setWorkspaceView(view){
  const inspector=by('laboratorio').querySelector('.lm-lab-inspector');
  inspector.dataset.workspaceContext=view;
  by('labPages').hidden=view!=='pages';by('labWorkflowMotion').hidden=view!=='motion';
  for(const button of document.querySelectorAll('button[data-workspace-view]'))button.setAttribute('aria-pressed',String(button.dataset.workspaceView===view));
}
function renderPages(){
  const select=by('labPageSelect');select.replaceChildren();
  pages.forEach((page,index)=>select.add(new Option(String(index+1).padStart(2,'0')+' / '+page.name,String(index))));
  select.value=String(current);by('labPageName').value=pages[current].name;by('labSequenceName').value=name;
  by('labPageCount').textContent=`${current+1} / ${pages.length}`;
  by('labWorkflowContext').textContent=`${sections?sections.find(section=>section.id===pages[current].sectionId).name+' / ':''}${pages[current].name}`;
  const listKey=JSON.stringify([sections,pages.map((page,index)=>[page.id,page.name,page.sectionId,page.composition.pages[0].surface.format,index===current])]);
  if(listKey!==pageListKey){
    const list=by('labPageList');list.replaceChildren();const targets=new Map();
    if(sections)for(const section of sections){
      const group=document.createElement('section');group.className='lab-section-group';group.dataset.sectionId=section.id;
      const header=document.createElement('div');header.className='lab-section-heading';
      const caption=document.createElement('span');caption.textContent=section.name+' / '+pages.filter(page=>page.sectionId===section.id).length+' páginas';
      const add=document.createElement('button');add.type='button';add.textContent='+ PÁGINA';add.dataset.addToSection=section.id;add.addEventListener('click',()=>addPageToSection(section.id).catch(error=>notify(error.message,true)));
      header.append(caption,add);group.append(header);const entries=document.createElement('div');entries.className='lab-section-pages';group.append(entries);list.append(group);targets.set(section.id,entries);
    }
    pages.forEach((page,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.pageId=page.id;button.dataset.pageIndex=String(index);
      button.setAttribute('aria-pressed',String(index===current));
      const number=document.createElement('span');number.className='lab-page-number';number.textContent=String(index+1).padStart(2,'0');
      const caption=document.createElement('span'),name=document.createElement('span'),format=document.createElement('small');
      name.textContent=page.name;format.textContent=({horizontal:'16:9 / Horizontal',vertical:'9:16 / Vertical',quadrado:'1:1 / Quadrado',editorial:'Editorial'})[page.composition.pages[0].surface.format];
      caption.append(name,format);button.append(number,caption);
      button.addEventListener('click',async()=>{try{await switchPage(index);by('labPageList').querySelector('[data-page-index="'+index+'"]')?.focus({preventScroll:true});}catch(error){notify(error.message,true);}});(targets.get(page.sectionId)||list).append(button);
    });pageListKey=listKey;
  }
  by('labPageEarlier').disabled=current===0||Boolean(sections&&pages[current-1]?.sectionId!==pages[current].sectionId);by('labPageLater').disabled=current===pages.length-1||Boolean(sections&&pages[current+1]?.sectionId!==pages[current].sectionId);
  renderSectionControls();
  by('labPageDelete').disabled=pages.length===1;
}

function currentSection(){return sections?.find(section=>section.id===pages[current]?.sectionId)||null;}
function currentSectionBackground(){
  const section=currentSection();return section?{...copy(section.background),id:section.id,hasText:hasSectionText(section.id,pages)}:null;
}
function applySectionVisual(){
  const background=currentSectionBackground();
  if(!background){delete board.dataset.sectionActive;delete board.dataset.sectionPhotoText;by('labSectionScope').hidden=true;return;}
  board.dataset.sectionActive='true';board.dataset.sectionPhotoText=String(background.mode==='photo'&&background.hasText);
  board.dataset.backdrop=background.mode==='color'?'color':background.treatment;
  by('labSectionScope').hidden=false;by('labSectionScope').textContent='Fundo da seção '+currentSection().name+' / compartilhado por '+pages.filter(page=>page.sectionId===background.id).length+' páginas.';
}
function syncSectionBackground(){
  const section=currentSection();if(!section)return;
  const snapshot=bridge().snapshot(),candidate=createSection(section.id,section.name,snapshot.state,snapshot.photoCatalog).background;
  candidate.treatment=section.background.treatment;
  if(pages[current].backgroundVideo)candidate.video=copy(pages[current].backgroundVideo);
  if(candidate.mode==='photo'&&(snapshot.state.mContent==='photo'||pages.some((page,index)=>index!==current&&page.sectionId===section.id&&page.composition.pages[0].m.content==='photo')))candidate.treatment='blur';
  const changed=JSON.stringify(candidate)!==JSON.stringify(section.background);section.background=candidate;
  const expected=sectionState(snapshot.state,section);
  if(['background','color','photo','focusX','focusY','mContent','photoContrast'].some(key=>snapshot.state[key]!==expected[key])){
    const previous=switching;switching=true;try{bridge().restore(expected);}finally{switching=previous;}
  }
  if(changed)for(let index=0;index<pages.length;index++){
    if(index===current||pages[index].sectionId!==section.id)continue;
    if(candidate.video)pages[index].backgroundVideo=copy(candidate.video);else delete pages[index].backgroundVideo;
    const state=verifyRoundTrip(pages[index].composition,snapshot.photoCatalog);
    pages[index].composition=createProductionDocument({state:sectionState(state,section),photoCatalog:snapshot.photoCatalog,maxEdge:pages[index].composition.output.maxEdge});
  }
}
function renderSectionControls(){
  const section=currentSection();by('labEnableSections').hidden=Boolean(sections);by('labSectionTools').hidden=!sections;by('labPageSectionField').hidden=!sections;
  try{by('labSectionRestore').hidden=!localStorage.getItem(key+'-before-section-demo');}catch{by('labSectionRestore').hidden=true;}
  if(!section)return;
  by('labSectionName').value=section.name;by('labSectionSettingsTitle').textContent='FUNDO E AJUSTES / '+section.name;
  by('labSectionBackgroundInfo').textContent=section.background.mode==='photo'?(section.background.video?'Vídeo compartilhado / ':'Fotografia compartilhada / ')+(section.background.treatment==='blur'?'desfocada':'nítida'):'Cor compartilhada / '+section.background.color;
  by('labSectionTreatment').value=section.background.treatment;
  by('labSectionTreatment').disabled=section.background.mode==='color'||pages.some(page=>page.sectionId===section.id&&page.composition.pages[0].m.content==='photo');
  const index=sections.indexOf(section);by('labSectionEarlier').disabled=index===0;by('labSectionLater').disabled=index===sections.length-1;
  by('labSectionDelete').disabled=sections.length===1||pages.every(page=>page.sectionId===section.id);
  const select=by('labPageSection');select.replaceChildren();for(const item of sections)select.add(new Option(item.name,item.id));select.value=section.id;
}
function sortSectionPages(){const id=pages[current]?.id;pages.sort((a,b)=>sections.findIndex(section=>section.id===a.sectionId)-sections.findIndex(section=>section.id===b.sectionId));current=pages.findIndex(page=>page.id===id);}
function blankPage(state,photoCatalog,sectionId){
  const value={...copy(state),title:'NOVA\nPÁGINA',titleFonts:[],mCaption:'',body:'',bodyMode:'oculto'};
  const page=createPage({id:uid('page'),name:'Página '+(pages.length+1),state:value,photoCatalog,maxEdge:Number(by('labExportSize').value)});page.sectionId=sectionId;const video=sections?.find(section=>section.id===sectionId)?.background.video;if(video)page.backgroundVideo=copy(video);return page;
}
async function addPageToSection(sectionId){
  if(pages.length>=100){notify('Esta sequência já tem 100 páginas.',true);return;}
  commit();const section=sections.find(section=>section.id===sectionId),snapshot=bridge().snapshot();
  const page=blankPage(sectionState(snapshot.state,section),snapshot.photoCatalog,sectionId);pages.push(page);sortSectionPages();
  enabled=true;await switchPage(pages.findIndex(item=>item.id===page.id),{capture:false});
}
async function moveCurrentPageToSection(sectionId){
  const target=sections.find(section=>section.id===sectionId);if(!target||target===currentSection())return;
  commit();const id=pages[current].id,snapshot=bridge().snapshot();
  pages[current].composition=createProductionDocument({state:sectionState(snapshot.state,target),photoCatalog:snapshot.photoCatalog,maxEdge:Number(by('labExportSize').value)});pages[current].sectionId=sectionId;if(target.background.video)pages[current].backgroundVideo=copy(target.background.video);else delete pages[current].backgroundVideo;
  sortSectionPages();await switchPage(pages.findIndex(page=>page.id===id),{capture:false});
}
function enableSections(){
  if(sections)return;
  if(pages.length>30)throw Error('A conversão cria uma seção por página e aceita até 30 páginas. O projeto atual foi preservado.');
  commit();const snapshot=bridge().snapshot(),next=pagesToSections(pages,snapshot.photoCatalog,()=>uid('section'));
  readSequence(sequenceDocument(name,next.pages,next.sections,documentSignature),snapshot.photoCatalog,catalog);
  pages=next.pages;sections=next.sections;enabled=true;commit();notify('Seções ativadas. As páginas existentes conservaram seus fundos. Use Seção desta página para agrupar.');
}
function resetAvailability(){
  let available=false;try{available=Boolean(localStorage.getItem(key+'-before-reset'));}catch{}
  window.dispatchEvent(new CustomEvent('labmattar:reset-availability',{detail:{available}}));
}
function backupBeforeReset(){
  if(deliveryBusy())return false;
  commit();
  const result=persistProjectDraft(localStorage,key+'-before-reset',{document:sequenceDocument(name,pages,sections,documentSignature),current,enabled});
  if(!result.ok){notify('Não foi possível guardar a cópia de recuperação. Baixe o projeto JSON antes de restaurar.',true);return false;}
  resetAvailability();return true;
}
async function undoReset(){
  if(deliveryBusy())return;
  const previous=JSON.parse(localStorage.getItem(key+'-before-reset')||'null');
  if(!previous)throw Error('Não há restauração para desfazer.');
  await load(previous.document,{currentIndex:previous.current});
  enabled=Boolean(previous.enabled);
  const result=commit();
  if(!result?.ok){notify('Estudo recuperado nesta sessão. A cópia de recuperação foi preservada; baixe o projeto JSON para guardar as alterações.',true);return;}
  localStorage.removeItem(key+'-before-reset');resetAvailability();
  notify('Apresentação anterior recuperada, incluindo páginas, seções, fundos e motions.');
}
function confirmSectionAction(message,label='CONTINUAR'){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='lab-section-confirm';dialog.setAttribute('aria-label','Confirmar alteração da apresentação');
    const text=document.createElement('p');text.textContent=message;
    const actions=document.createElement('div'),cancel=document.createElement('button'),accept=document.createElement('button');cancel.textContent='CANCELAR';accept.textContent=label;accept.dataset.sectionConfirm='true';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});actions.append(cancel,accept);dialog.append(text,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
}
async function sectionDemo(){
  if(!await confirmSectionAction('Abrir o ensaio com duas seções e seis páginas? Uma cópia do projeto atual será guardada neste navegador para restaurar depois.','ABRIR ENSAIO'))return;
  commit();if(!localStorage.getItem(key+'-before-section-demo'))localStorage.setItem(key+'-before-section-demo',JSON.stringify(sequenceDocument(name,pages,sections,documentSignature)));
  const snapshot=bridge().snapshot(),nextSections=[],nextPages=[];
  const titles=['UM INÍCIO\nEM COMUM','O QUE NOS\nAPROXIMA','UMA IDEIA\nEM MOVIMENTO','O PROJETO\nGANHA FORMA','CONTEÚDO\nEM SEQUÊNCIA','UM NOVO\nPERCURSO'];
  const bodies=['Uma imagem permanece enquanto a narrativa avança.','Role para percorrer as páginas desta seção.','O mesmo fundo reúne momentos diferentes de leitura.','Uma nova seção traz outra imagem e outro conjunto de páginas.','Os textos usam a entrada do sistema de identidade.','Ao voltar a rolagem, você revisita o conteúdo com a mesma organização.'];
  const names=['Abertura','Contexto','Proposta','Conceito','Desenvolvimento','Encerramento'];
  for(let group=0;group<2;group++){
    const state={...copy(snapshot.state),format:'horizontal',background:'photo',photo:group===0?'64':'179',mContent:'off',marker:'none',focusX:50,focusY:50,guides:'nenhuma',type:'alternada',titleFonts:[],titleScale:85,textWidth:65,margin:7,
      signature:{preset:'editorial',scale:100,slots:{tl:{kind:'text',text:'LABMATTAR / ENSAIO',symbol:'M.svg'},tr:{kind:'symbol',text:'',symbol:'vaso_03.svg'},bl:{kind:'text',text:'APRESENTAÇÃO POR SEÇÕES',symbol:'M.svg'},br:{kind:'text',text:'2026',symbol:'M.svg'}}}};
    const section=createSection(uid('section'),group===0?'Introdução':'O projeto',state,snapshot.photoCatalog);nextSections.push(section);
    for(let n=0;n<3;n++){const index=group*3+n;const page=createPage({id:uid('page'),name:names[index],state:{...state,title:titles[index],body:bodies[index],bodyMode:'visivel'},photoCatalog:snapshot.photoCatalog,maxEdge:1920});page.sectionId=section.id;nextPages.push(page);}
  }
  await load(sequenceDocument('Ensaio / apresentação por seções',nextPages,nextSections));setWorkspaceView('pages');notify('Ensaio aberto. Use Revisar e exportar → Site HTML ou Ver apresentação para percorrer as seções.');
}
function initSections(){
  const handle=action=>()=>Promise.resolve().then(action).catch(error=>notify(error.message,true));
  by('labEnableSections').addEventListener('click',handle(enableSections));
  by('labSectionDemo').addEventListener('click',handle(sectionDemo));
  by('labSectionRestore').addEventListener('click',handle(async()=>{const previous=localStorage.getItem(key+'-before-section-demo');if(!previous||!await confirmSectionAction('Restaurar o projeto anterior ao ensaio? Salve o ensaio como projeto antes, se quiser guardá-lo.','RESTAURAR PROJETO'))return;await load(JSON.parse(previous));localStorage.removeItem(key+'-before-section-demo');renderSectionControls();}));
  by('labSectionAdd').addEventListener('click',handle(async()=>{
    if(sections.length>=30||pages.length>=100){notify('Limite de seções ou páginas atingido.',true);return;}
    commit();const snapshot=bridge().snapshot(),section=createSection(uid('section'),'Seção '+(sections.length+1),snapshot.state,snapshot.photoCatalog);
    sections.splice(sections.indexOf(currentSection())+1,0,section);const page=blankPage(sectionState(snapshot.state,section),snapshot.photoCatalog,section.id);pages.push(page);sortSectionPages();await switchPage(pages.findIndex(item=>item.id===page.id),{capture:false});
  }));
  by('labSectionName').addEventListener('change',event=>{currentSection().name=event.target.value.trim().slice(0,120)||'Seção';commit();});
  by('labSectionTreatment').addEventListener('change',event=>{currentSection().background.treatment=event.target.value;commit();});
  by('labSectionEditBackground').addEventListener('click',()=>{setWorkspaceView('edit');by('laboratorio').querySelector('button[data-mobile-module=fundo]').click();});
  by('labPageSection').addEventListener('change',event=>{const id=event.target.value;handle(()=>moveCurrentPageToSection(id))();});
  for(const [id,delta] of [['labSectionEarlier',-1],['labSectionLater',1]])by(id).addEventListener('click',()=>{commit();const section=currentSection(),from=sections.indexOf(section),to=from+delta;if(to<0||to>=sections.length)return;sections.splice(from,1);sections.splice(to,0,section);sortSectionPages();commit();});
  by('labSectionDelete').addEventListener('click',handle(async()=>{const section=currentSection();if(sections.length<2||pages.every(page=>page.sectionId===section.id)||!await confirmSectionAction('Excluir a seção '+section.name+' e suas páginas?','EXCLUIR SEÇÃO'))return;pages=pages.filter(page=>page.sectionId!==section.id);sections=sections.filter(item=>item!==section);current=0;await switchPage(0,{capture:false});}));
}

function registerPhotos(photoCatalog){
  const known=bridge().snapshot().photoCatalog;
  for(const [photoKey,original] of Object.entries(photoCatalog)){
    if(known[photoKey]||!(/^(ext|loc)-/.test(photoKey)))continue;
    const isLocal=photoKey.startsWith('loc-');
    const url=isLocal?null:new URL(original,location.origin);
    const provider=isLocal?'local':url.pathname==='/api/acervo/public-media'?'public':url.searchParams.get('provider');
    window.dispatchEvent(new CustomEvent('labmattar:acervo-select',{detail:{photoKey,original,provider,
      id:isLocal?photoKey:url.searchParams.get('id'),projectId:url?.searchParams.get('project')||undefined,
      name:isLocal?'Fotografia local do projeto':'Fotografia do projeto',restore:true}}));
  }
}
async function settled(){
  await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function switchPage(index,{capture=true}={}){
  if(busy||index<0||index>=pages.length)return;
  if(capture)commit();switching=true;
  try{
    current=index;const base=bridge().snapshot().photoCatalog;
    const photoCatalog=privatePhotoCatalog(pages[current].composition,base);registerPhotos(photoCatalog);
    bridge().restore(verifyRoundTrip(pages[current].composition,photoCatalog));
    by('labExportSize').value=String(pages[current].composition.output.maxEdge);
    await settled();applySectionVisual();selectedMotion=pages[current].motions[0]?.id||'';renderMotions();renderBackgroundVideo();renderPages();
  }finally{switching=false;commit();}
}
function syncBackgroundVideoControls(){
  const video=pages[current]?.backgroundVideo||null;
  const label=by('labBackgroundVideoStatus');
  const remove=by('labBackgroundVideoRemove');
  if(label)label.textContent=video?'Vídeo de fundo · '+video.name+' · loop sem áudio':'';
  if(remove)remove.hidden=!video;
}
let backgroundRenderRevision=0;
function renderBackgroundVideo(){
  const revision=++backgroundRenderRevision;
  for(const video of document.querySelectorAll('.lm-lab-background-video')){
    video.pause();video.removeAttribute('src');video.load();video.remove();
  }
  const currentPage=pages[current],background=currentPage?.backgroundVideo||null;
  board.dataset.videoBackground=background?'true':'false';
  syncBackgroundVideoControls();
  if(!background)return;
  const ambient=by('labAmbientPhoto'),mask=by('labMaskPhoto'),marker=by('labMarkerPhoto');
  const targets=[[ambient,'labAmbientVideo'],[mask,'labMaskVideo'],[marker,'labMarkerVideo'],
    [by('labFocusImage'),'labFocusVideo']];
  const players=targets.map(([img,id])=>{
    const video=document.createElement('video');
    video.id=id;video.className='lm-lab-background-video';
    video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
    video.autoplay=true;video.preload='auto';video.setAttribute('aria-hidden','true');
    if(id==='labFocusVideo'){
      video.classList.add('lm-lab-focus-video');
      video.style.objectPosition=by('labFocusX').value+'% '+by('labFocusY').value+'%';
      img.append(video);
    }else img.insertAdjacentElement('afterend',video);
    video.addEventListener('error',()=>{
      if(revision===backgroundRenderRevision)notify('Vídeo de fundo indisponível. Confira o arquivo e o acesso ao acervo.',true);
    });
    return video;
  });
  const pageId=currentPage.id;
  const apply=src=>{
    if(revision!==backgroundRenderRevision||pages[current]?.id!==pageId)return;
    for(const video of players){video.src=src;video.play().catch(()=>{});}
  };
  if(background.provider==='local'){
    window.LabAcervo?.localVideoUrl?.(background.fileId).then(apply).catch(error=>{
      if(revision===backgroundRenderRevision)notify('Vídeo de fundo local indisponível: '+error.message,true);
    });
  }else apply(backgroundVideoUrl(background));
}
function renderMotions(){
  const layer=by('labPageMotions');
  for(const video of layer.querySelectorAll('video')){video.motionInk?.dispose();video.pause();video.removeAttribute('src');video.load();}
  layer.replaceChildren();
  if(!catalog){renderMotionControls();renderClips();return;}
  for(const motion of pages[current].motions){
    const asset=catalog.find(asset=>asset.id===motion.assetId),video=document.createElement('video');
    video.dataset.motionId=motion.id;video.dataset.motionInk="";video.dataset.motionControls="false";video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
    video.poster=asset.poster;video.src=asset.video;video.preload='auto';video.autoplay=!still;
    const update=()=>{
      if(still){video.pause();video.currentTime=Math.max(0,Math.min(motion.frameSeconds,video.duration-1/30));}
      else video.play().catch(()=>{});
    };
    video.addEventListener('loadedmetadata',update,{once:true});layer.append(video);
  }
  placeMotions();installMotionInk(layer);requestAnimationFrame(placeMotions);renderMotionControls();
  renderClips();
}
function placeMotions(){
  if(!pages.length||!catalog)return;
  for(const motion of pages[current].motions){
    const video=by('labPageMotions').querySelector(`[data-motion-id="${motion.id}"]`);
    if(!video)continue;
    const asset=catalog.find(asset=>asset.id===motion.assetId),box=motionBox(motion,asset,board.offsetWidth,board.offsetHeight);
    Object.assign(video.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});video.motionInk?.sync();
  }
  placeClips();
}
function renderMotionControls(){
  const list=by('labMotionInstance');list.replaceChildren();
  if(!catalog){
    by('labMotionSettings').hidden=true;by('labMotionEmpty').hidden=false;
    by('labMotionEmpty').textContent=catalogLoading?'Carregando o acervo Motion. Você já pode editar e salvar as páginas.':'Acervo Motion indisponível. Os motions do projeto estão preservados. Recarregue o catálogo para visualizar e exportar esses elementos.';
    by('labMotionOpen').textContent=catalogLoading?'CARREGANDO MOTION…':'RECARREGAR CATÁLOGO MOTION';by('labMotionOpen').disabled=catalogLoading;
    return;
  }
  by('labMotionOpen').disabled=false;by('labMotionOpen').textContent='ADICIONAR MOTION';
  by('labMotionEmpty').textContent='Adicione uma animação da Matriz à página atual.';
  for(const motion of pages[current].motions){const asset=catalog.find(asset=>asset.id===motion.assetId);list.add(new Option(asset.title,motion.id));}
  if(!pages[current].motions.some(motion=>motion.id===selectedMotion))selectedMotion=pages[current].motions[0]?.id||'';
  by('labMotionSettings').hidden=!selectedMotion;by('labMotionEmpty').hidden=Boolean(selectedMotion);list.value=selectedMotion;
  const motion=pages[current].motions.find(motion=>motion.id===selectedMotion);if(!motion)return;
  const asset=catalog.find(asset=>asset.id===motion.assetId);
  for(const [input,field] of [['labMotionX','x'],['labMotionY','y'],['labMotionWidth','width'],['labMotionFrame','frameSeconds']])by(input).value=String(motion[field]);
  by('labMotionFrame').max=String(asset.duration);by('labMotionEdit').href=asset.editor;
  by('labMotionPreview').textContent=still?'VER MOVIMENTO':'VER QUADRO DO PDF';
  by('labMotionPreview').setAttribute('aria-pressed',String(still));
}

function placeClips(){
  if(!pages.length)return;
  const layer=by('labPageVideos');
  if(!layer)return;
  for(const clip of pages[current].clips||[]){
    const video=[...layer.querySelectorAll('video')].find(node=>node.dataset.clipId===clip.id);
    if(!video)continue;
    const box=clipBox(clip,board.offsetWidth,board.offsetHeight);
    Object.assign(video.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});
  }
}
function renderClips(){
  const layer=by('labPageVideos');
  if(!layer||!pages.length)return;
  for(const video of layer.querySelectorAll('video')){
    video.pause();video.removeAttribute('src');video.load();
  }
  layer.replaceChildren();
  for(const clip of pages[current].clips||[]){
    const video=document.createElement('video');
    video.dataset.clipId=clip.id;video.setAttribute('aria-label',clip.name);
    video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
    video.preload='metadata';video.autoplay=clipsPlaying;
    if(clip.provider==='local'){
      window.LabAcervo?.localVideoUrl?.(clip.fileId).then(src=>{
        if(layer.contains(video)){video.src=src;if(clipsPlaying)video.play().catch(()=>{});}
      }).catch(()=>{
        if(layer.contains(video))
          by('labClipStatus').textContent='Vídeo local não encontrado neste navegador. Reimporte o arquivo original.';
      });
    }else video.src=privateClipUrl(clip);
    video.addEventListener('loadedmetadata',()=>{
      if(pages[current]?.clips?.includes(clip)&&video.videoWidth&&video.videoHeight){
        const aspect=video.videoWidth/video.videoHeight;
        if(aspect>=.25&&aspect<=4&&Math.abs(aspect-clip.aspect)>.005){
          clip.aspect=aspect;placeClips();commit();
        }
      }
      if(clipsPlaying)video.play().catch(()=>{});
    });
    video.addEventListener('error',()=>{
      if(layer.contains(video)){
        by('labClipStatus').textContent='Vídeo indisponível. Verifique o acesso à conta ou o formato original.';
      }
    });
    layer.append(video);
    if(clipsPlaying)video.play().catch(()=>{});
  }
  placeClips();requestAnimationFrame(placeClips);renderClipControls();
}
function renderClipControls(){
  const clips=pages[current]?.clips||[],select=by('labClipInstance');
  select.replaceChildren();
  for(const clip of clips)select.add(new Option(clip.name,clip.id));
  if(!clips.some(clip=>clip.id===selectedClip))selectedClip=clips[0]?.id||'';
  by('labClipSettings').hidden=!selectedClip;
  by('labClipEmpty').hidden=Boolean(clips.length);
  const clip=clips.find(item=>item.id===selectedClip);
  if(!clip)return;
  select.value=selectedClip;
  for(const [input,field] of [['labClipX','x'],['labClipY','y'],['labClipWidth','width'],['labClipFrame','frameSeconds']]){
    by(input).value=String(clip[field]);
  }
  by('labClipPlay').textContent=clipsPlaying?'PAUSAR VÍDEO':'REPRODUZIR VÍDEO';
  by('labClipPlay').setAttribute('aria-pressed',String(clipsPlaying));
}
async function capturePrivateClips(width,height){
  const items=[],layer=by('labPageVideos');
  for(const clip of pages[current].clips||[]){
    const video=[...layer.querySelectorAll('video')].find(node=>node.dataset.clipId===clip.id);
    if(!video)throw Error('Vídeo do projeto não encontrado: '+clip.name);
    if(video.readyState<2)await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{cleanup();reject(Error('Vídeo não carregou: '+clip.name));},15000);
      const done=()=>{cleanup();resolve();};
      const fail=()=>{cleanup();reject(Error('Vídeo indisponível: '+clip.name));};
      const cleanup=()=>{clearTimeout(timeout);video.removeEventListener('loadeddata',done);video.removeEventListener('error',fail);};
      video.addEventListener('loadeddata',done,{once:true});
      video.addEventListener('error',fail,{once:true});
    });
    if(video.error)throw Error('Vídeo indisponível: '+clip.name);
    video.pause();
    const target=Math.max(0,Math.min(clip.frameSeconds,Number.isFinite(video.duration)?
      Math.max(0,video.duration-.05):clip.frameSeconds));
    if(Math.abs(video.currentTime-target)>.08)await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{cleanup();reject(Error('Quadro de vídeo não carregou: '+clip.name));},15000);
      const done=()=>{cleanup();resolve();};
      const fail=()=>{cleanup();reject(Error('Vídeo indisponível: '+clip.name));};
      const cleanup=()=>{clearTimeout(timeout);video.removeEventListener('seeked',done);video.removeEventListener('error',fail);};
      video.addEventListener('seeked',done,{once:true});
      video.addEventListener('error',fail,{once:true});
      video.currentTime=target;
    });
    const canvas=document.createElement('canvas');
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    if(!canvas.width||!canvas.height)throw Error('Dimensões do vídeo indisponíveis: '+clip.name);
    canvas.getContext('2d').drawImage(video,0,0);
    const box=clipBox(clip,width,height);
    items.push({kind:'image',privateClipId:clip.id,source:canvas.toDataURL('image/png'),
      sourceWidth:canvas.width,assetName:clip.name,...box});
    if(clipsPlaying)video.play().catch(()=>{});
  }
  return items;
}

function closeLibrary(){
  by('labMotionLibrary').close();
  for(const video of by('labMotionLibrary').querySelectorAll('video')){video.motionInk?.dispose();video.pause();video.removeAttribute('src');video.load();}
  by('labMotionLibraryItems').replaceChildren();
}
async function openLibrary(){
  if(!catalog&&!await loadMotionCatalog())return;
  const list=by('labMotionLibraryItems');list.replaceChildren();
  for(const asset of catalog){
    const button=document.createElement('button');button.type='button';button.dataset.motionAsset=asset.id;
    const video=document.createElement('video');video.src=asset.video;video.poster=asset.poster;
    video.dataset.motionInk="";video.dataset.motionControls="false";video.autoplay=false;video.muted=true;video.loop=true;video.playsInline=true;video.addEventListener("loadedmetadata",()=>{video.currentTime=asset.cut??Math.max(0,video.duration-1/30);},{once:true});
    const text=document.createElement('span');text.textContent=asset.title;
    const detail=document.createElement('small');detail.textContent=asset.duration.toLocaleString('pt-BR')+' s · '+asset.aspect;
    button.append(video,text,detail);button.addEventListener('click',()=>{
      if(pages[current].motions.length>=20){notify('Esta página já tem 20 elementos de motion.',true);return;}
      commit();const motion=createMotion(asset,uid('motion'));pages[current].motions.push(motion);selectedMotion=motion.id;
      enabled=true;closeLibrary();renderMotions();commit();notify(asset.title+' adicionado à página.');
    });list.append(button);
  }
  by('labMotionLibrary').showModal();installMotionInk(list);
}
async function load(document,{currentIndex=0}={}){
  const validated=readSequence(document,bridge().snapshot().photoCatalog,catalog);
  switching=true;
  try{registerPhotos(validated.photoCatalog);sections=validated.sections||null;pages=validated.pages.map(({state,...page})=>page);documentSignature=copy(validated.signature||validated.pages[0].state.signature);pages=applyDocumentSignature(pages,documentSignature,validated.photoCatalog);name=validated.name;current=0;enabled=true;}
  finally{switching=false;}
  await switchPage(Math.max(0,Math.min(Number(currentIndex)||0,pages.length-1)),{capture:false});
}
async function loadComposition(document){
  const photoCatalog=privatePhotoCatalog(document,bridge().snapshot().photoCatalog),state=verifyRoundTrip(document,photoCatalog);
  switching=true;
  try{sections=null;documentSignature=copy(state.signature);registerPhotos(photoCatalog);bridge().restore(state);pages=[{id:uid('page'),name:'Página 1',composition:copy(document),motions:[],clips:[]}];current=0;enabled=false;}
  finally{switching=false;}
  await switchPage(0,{capture:false});
}
async function captureMotions(width,height){
  if(!catalog&&pages[current].motions.length)throw Error('Recarregue o catálogo Motion antes de exportar uma página com motions. As referências estão preservadas.');
  const items=[];
  for(const motion of pages[current].motions){
    const asset=catalog.find(asset=>asset.id===motion.assetId),box=motionBox(motion,asset,width,height);
    items.push({kind:'image',motionId:motion.id,assetName:asset.title,sourceWidth:asset.width,
      source:await motionFrame(asset,motion.frameSeconds),...box});
  }
  items.push(...await capturePrivateClips(width,height));
  return items;
}
function confirmStudy(pages){const names=lowContrastPages(pages);return !names.length||confirm("Contraste baixo em: "+names.join(", ")+". Revise a combinação ou confirme a exportação como estudo.");}
async function exportVideo(){
  if(deliveryBusy())return;
  commit();
  const seconds=Number(by('labVideoSeconds').value),all=by('labVideoScope').value==='all';
  const indices=all?pages.map((_,index)=>index):[current];
  if(!catalog&&indices.some(index=>pages[index].motions.length)){notify('Recarregue o catálogo Motion antes de exportar os motions preservados.',true);return;}
  if(!confirmStudy(indices.map(index=>pages[index])))return;
  const format=pages[indices[0]].composition.pages[0].surface.format;
  if(indices.some(index=>pages[index].composition.pages[0].surface.format!==format)){
    notify('Para reunir a sequência em um MP4, use o mesmo formato em todas as páginas. Você também pode exportar apenas a página em edição.',true);return;
  }
  if(!Number.isFinite(seconds)||seconds<2||seconds>30||seconds*indices.length>180){
    notify('Escolha de 2 a 30 segundos por página, com até 3 minutos no total.',true);return;
  }
  const original=current,originalState=bridge().snapshot().state;
  const selected={motion:selectedMotion,clip:selectedClip};
  const lab=by('laboratorio'),previousInert=lab.inert;
  const progress=by('labVideoProgress');progress.value=0;progress.hidden=false;
  videoAbort=new AbortController();const signal=videoAbort.signal;
  busy=true;switching=true;lab.inert=true;panel.setAttribute('aria-busy','true');
  notify('Preparando vídeo MP4…');
  try{
    const [{encodeMP4,videoSize,videoConfig},{readyMedia,seekMedia,frameRenderer}]=await Promise.all([
      import('./vendor/lab-video.js'),import('./lab-video-export.mjs')]);
    let scene,renderFrame,size;
    const receipts=[];
    const preparePage=async position=>{
      signal.throwIfAborted();current=indices[position];
      notify(`Preparando página ${position+1} de ${indices.length}…`);
      const photos=privatePhotoCatalog(pages[current].composition,bridge().snapshot().photoCatalog);
      registerPhotos(photos);bridge().restore(verifyRoundTrip(pages[current].composition,photos));
      await settled();applySectionVisual();renderMotions();renderBackgroundVideo();await settled();
      scene=await window.LabRenderer.capture({edge:1920,ask:false,live:true});
      await readyMedia(scene.media,signal);
      const ratio={horizontal:[16,9],vertical:[9,16],quadrado:[1,1],editorial:[Math.SQRT2,1]}[pages[current].composition.pages[0].surface.format];
      const dimensions=videoSize(...ratio,by('labVideoQuality').value);
      if(size&&(size.width!==dimensions.width||size.height!==dimensions.height))throw Error('As páginas da sequência precisam ter as mesmas dimensões.');
      size=dimensions;renderFrame=frameRenderer(size.width,size.height,by('labVideoText').checked);
      receipts.push({id:pages[current].id,name:pages[current].name,...size});
    };
    await preparePage(0);await videoConfig(size.width,size.height);
    const blob=await encodeMP4({...size,seconds,pageCount:indices.length,signal,
      preparePage:position=>position===0?undefined:preparePage(position),
      renderFrame:async(position,time)=>{
        // A shared section backdrop continues across its pages; page motions restart.
        let preceding=0;
        if(sections)for(let p=position-1;p>=0&&pages[indices[p]].sectionId===pages[current].sectionId;p--)preceding+=seconds;
        await seekMedia(scene.media,time,preceding+time,signal);
        return renderFrame(scene,time);
      },
      onProgress:(done,total,position,stage)=>{
        progress.value=Math.round(done/total*100);
        notify(stage==='done'?'Finalizando MP4…':`MP4 / página ${position+1} de ${indices.length} / ${progress.value}%`);
      }});
    signal.throwIfAborted();
    const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase().slice(0,64)||'apresentacao';
    download(blob,`labmattar-${slug}-${size.width}x${size.height}.mp4`);
    window.LabPages.lastExport={schemaVersion:1,renderer:'labmattar-scene-v1',type:'mp4',...size,
      fps:30,seconds:seconds*indices.length,audio:false,pages:receipts,bytes:blob.size};
    notify(`MP4 concluído / ${size.width} × ${size.height} / ${seconds*indices.length} s / sem áudio.`);
  }catch(error){notify(error.name==='AbortError'?'Vídeo cancelado. O projeto foi preservado.':'MP4 não concluído: '+error.message,error.name!=='AbortError');}
  finally{
    try{
      current=original;bridge().restore(originalState);await settled();
      selectedMotion=selected.motion;selectedClip=selected.clip;
      renderMotions();renderBackgroundVideo();renderPages();
    }finally{
      lab.inert=previousInert;switching=false;busy=false;videoAbort=null;
      panel.removeAttribute('aria-busy');by('labVideoCancel').hidden=true;
      by('labExportStatus').dataset.state=by('labExportStatus').dataset.state==='error'?'error':'idle';
      commit();
    }
  }
}
async function exportSequence(type){
  if(deliveryBusy())return;
  if(type==='mp4')return exportVideo();
  if(!catalog&&pages.some(page=>page.motions.length)){notify('Recarregue o catálogo Motion antes de exportar os motions preservados.',true);return;}
  commit();if(type!=='preview'&&!confirmStudy(pages))return;
  if(['html','preview'].includes(type)&&pages.some(page=>(page.clips||[]).length||page.backgroundVideo)){
    if(!confirm('LABMATTAR / VÍDEOS PRIVADOS\\n\\nO HTML offline incorpora os vídeos de fundo e os outros vídeos selecionados. Quem receber o arquivo poderá assisti-los mesmo sem acesso ao Drive. O limite é 32 MB por vídeo e 64 MB por apresentação.\\n\\nDeseja incorporar esses vídeos no arquivo?'))return;
  }
  let preview=null;if(type==='preview'){preview=window.open('about:blank','_blank');if(preview){preview.opener=null;preview.document.body.textContent='Preparando apresentação…';}}
  commit();const original=current,originalState=bridge().snapshot().state,project=sequenceDocument(name,pages,sections,documentSignature);
  readSequence(project,bridge().snapshot().photoCatalog,catalog);
  const active=pages[current];busy=true;switching=true;panel.setAttribute('aria-busy','true');
  const lab=by('laboratorio'),previousInert=lab.inert;lab.inert=true;
  try{
    const scenes=[];
    for(let index=0;index<pages.length;index++){
      current=index;notify(`Renderizando página ${index+1} de ${pages.length}…`);
      const photoCatalog=privatePhotoCatalog(pages[index].composition,bridge().snapshot().photoCatalog);
      registerPhotos(photoCatalog);bridge().restore(verifyRoundTrip(pages[index].composition,photoCatalog));
      await settled();applySectionVisual();renderMotions();renderBackgroundVideo();
      await settled();
      const scene=await window.LabRenderer.capture({edge:Number(by('labExportSize').value),ask:false});
      scene.id=pages[index].id;scene.name=pages[index].name;scene.documentName=name;
      scene.motions=copy(pages[index].motions);scene.clips=copy(pages[index].clips||[]);
       scene.backgroundVideo=pages[index].backgroundVideo?copy(pages[index].backgroundVideo):null;scenes.push(scene);
    }
    const warnings=[...new Set(scenes.flatMap((scene,index)=>scene.warnings.map(warning=>`Página ${index+1}: ${warning}`)))];
    if(warnings.length&&!confirm('LABMATTAR / Qualidade dos originais\n\n'+warnings.join('\n')+'\n\nExportar na dimensão selecionada?')){
      preview?.close();notify('Exportação cancelada. O projeto foi preservado.');return;
    }
    const fonts=await officialFonts();
    if(type==='pdf'){
      const {createPDF}=await import('./vendor/lab-pdf.js');
      download(await createPDF(scenes,fonts),'labmattar-apresentacao.pdf');
    }else{
      const html=await webDocument(scenes,project,catalog||[],fonts),blob=new Blob([html],{type:'text/html;charset=utf-8'});
      if(type==='preview'&&preview){const url=URL.createObjectURL(blob);preview.location.replace(url);const cleanup=setInterval(()=>{if(preview.closed){URL.revokeObjectURL(url);clearInterval(cleanup);}},1000);}
      else download(blob,'labmattar-site.html');
    }
    window.LabPages.lastExport={schemaVersion:1,renderer:'labmattar-scene-v1',type,maxEdge:Number(by('labExportSize').value),pages:scenes.map(scene=>({id:scene.id,name:scene.name,width:scene.width,height:scene.height,outputWidth:scene.outputWidth,outputHeight:scene.outputHeight,rasterized:scene.rasterized})),warnings};
    notify(`${pages.length} página${pages.length>1?'s':''} / ${type==='pdf'?'PDF':type==='html'?'SITE HTML':'APRESENTAÇÃO'} concluído.`);
  }catch(error){preview?.close();notify('Exportação não concluída: '+error.message,true);}
  finally{
    current=original;bridge().restore(originalState);await settled();selectedMotion=active.motions[0]?.id||'';renderMotions();renderBackgroundVideo();renderPages();
    lab.inert=previousInert;switching=false;busy=false;panel.removeAttribute('aria-busy');commit();
    by('labExportStatus').setAttribute('data-state',by('labExportStatus').dataset.state==='busy'?'idle':by('labExportStatus').dataset.state);
  }
}
async function loadMotionCatalog(){
  if(catalogLoading)return false;
  catalogLoading=true;panel.dataset.motionCatalog='loading';renderMotionControls();
  try{
    const next=await fetchMotionCatalog();
    // Só liberar renderização após conferir hashes de todas as referências.
    readSequence(sequenceDocument(name,pages,sections,documentSignature),bridge().snapshot().photoCatalog,next);
    catalog=next;panel.dataset.motionCatalog='ready';return true;
  }catch(error){catalog=null;panel.dataset.motionCatalog='unavailable';notify('Páginas disponíveis / Motion: '+error.message,true);return false;}
  finally{catalogLoading=false;renderMotions();}
}
async function init(){
  pages=[nativePage()];documentSignature=copy(bridge().snapshot().state.signature);
  window.LabPages={create:()=>{commit();const doc=sequenceDocument(name,pages,sections,documentSignature);readSequence(doc,bridge().snapshot().photoCatalog,catalog);return doc;},load,loadComposition,captureMotions,getSignature:()=>copy(documentSignature),setSignature:signature=>{documentSignature=copy(signature);pages=applyDocumentSignature(pages,signature,bridge().snapshot().photoCatalog);enabled=true;notify("Assinatura atualizada em todas as páginas do documento.");},
    validate:document=>readSequence(document,bridge().snapshot().photoCatalog,catalog),
    validateComposition:document=>verifyRoundTrip(document,privatePhotoCatalog(document,bridge().snapshot().photoCatalog)),
    hasSequence:()=>Boolean(sections)||enabled||pages.length>1||pages.some(page=>page.motions.length||(page.clips||[]).length||page.backgroundVideo),
    sectionBackground:currentSectionBackground,applySectionVisual,
    persist:commit,backupBeforeReset,undoReset,reloadMotionCatalog:loadMotionCatalog,
    export:exportSequence,kind:SEQUENCE_KIND};
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved){const result=readSequence(saved.document,bridge().snapshot().photoCatalog,catalog);
      switching=true;sections=result.sections||null;registerPhotos(result.photoCatalog);pages=result.pages.map(({state,...page})=>page);documentSignature=copy(result.signature||result.pages[0].state.signature);pages=applyDocumentSignature(pages,documentSignature,result.photoCatalog);name=result.name;enabled=saved.enabled;current=Math.min(Number(saved.current)||0,pages.length-1);
      bridge().restore({...result.pages[current].state,signature:documentSignature});by('labExportSize').value=String(pages[current].composition.output.maxEdge);switching=false;await settled();}
  }catch{switching=false;let recovered=false;try{localStorage.setItem(key+'-recovery',localStorage.getItem(key)||'');recovered=true;}catch{}notify('O rascunho anterior não pôde ser reaberto.'+(recovered?' Uma cópia de recuperação foi preservada neste navegador.':' Abra seu projeto JSON para recuperar a sequência.'),true);}
  initSections();
  initDelivery();
  const initialView=new URLSearchParams(location.search).get('workspace');
  setWorkspaceView(['pages','edit','motion'].includes(initialView)?initialView:'edit');
  for(const button of document.querySelectorAll('button[data-workspace-view]'))button.addEventListener('click',()=>setWorkspaceView(button.dataset.workspaceView));
  by('labEditCurrentPage').addEventListener('click',()=>{setWorkspaceView('edit');by('laboratorio').querySelector('button[data-mobile-module=superficie]').click();});
  renderPages();applySectionVisual();renderMotions();renderBackgroundVideo();
  window.addEventListener('labmattar:background-source-change',()=>{
    if(busy||switching||!pages[current]?.backgroundVideo)return;
    pages[current].backgroundVideo=null;renderBackgroundVideo();commit();
    notify('Fundo alterado. O vídeo anterior foi retirado somente desta página.');
  });
  by('labBackgroundVideoRemove')?.addEventListener('click',()=>{
    if(busy||!pages[current]?.backgroundVideo)return;
    pages[current].backgroundVideo=null;renderBackgroundVideo();commit();
    notify('Vídeo de fundo removido. Escolha uma fotografia ou outro vídeo.');
  });
  window.addEventListener('labmattar:composition-change',event=>{
    const focus=by('labFocusVideo');
    if(focus)focus.style.objectPosition=by('labFocusX').value+'% '+by('labFocusY').value+'%';
    if(!switching&&!busy&&event.detail?.persist!==false){try{commit();}catch(error){notify(error.message,true);}}
  });
  by('labPageSelect').addEventListener('change',event=>switchPage(Number(event.target.value)).catch(error=>notify(error.message,true)));
  by('labSequenceName').addEventListener('change',event=>{name=event.target.value.slice(0,120);enabled=true;commit();});
  by('labPageName').addEventListener('change',event=>{pages[current].name=event.target.value.slice(0,120);enabled=true;commit();});
  by('labPageAdd').addEventListener('click',async()=>{
    if(pages.length>=100){notify('Esta sequência já tem 100 páginas.',true);return;}
    commit();const snapshot=bridge().snapshot(),state=copy(snapshot.state);state.title='NOVA\nPÁGINA';state.titleFonts=[];state.mCaption='';state.body='';state.bodyMode='oculto';
    const page=createPage({id:uid('page'),name:'Página '+(pages.length+1),state,photoCatalog:snapshot.photoCatalog,maxEdge:Number(by('labExportSize').value)});
    if(sections){page.sectionId=pages[current].sectionId;if(currentSection().background.video)page.backgroundVideo=copy(currentSection().background.video);}pages.splice(current+1,0,page);enabled=true;await switchPage(current+1);
  });
  by('labPageDuplicate').addEventListener('click',async()=>{
    if(pages.length>=100){notify('Esta sequência já tem 100 páginas.',true);return;}
    commit();const duplicate=copy(pages[current]);duplicate.id=uid('page');duplicate.name=(duplicate.name+' / cópia').slice(0,120);
    duplicate.motions.forEach(motion=>{motion.id=uid('motion');});
     (duplicate.clips||[]).forEach(clip=>{clip.id=uid('clip');});pages.splice(current+1,0,duplicate);enabled=true;await switchPage(current+1);
  });
  for(const [id,delta] of [['labPageEarlier',-1],['labPageLater',1]])by(id).addEventListener('click',()=>{if(sections&&pages[current+delta]?.sectionId!==pages[current].sectionId)return;commit();current=movePage(pages,current,delta);enabled=true;renderPages();commit();});
  by('labPageDelete').addEventListener('click',async()=>{
    if(pages.length<2||!confirm('Excluir esta página da sequência?'))return;
    const index=current;pages.splice(index,1);current=Math.min(index,pages.length-1);switching=true;
    try{const photoCatalog=privatePhotoCatalog(pages[current].composition,bridge().snapshot().photoCatalog);registerPhotos(photoCatalog);bridge().restore(verifyRoundTrip(pages[current].composition,photoCatalog));await settled();}
    finally{switching=false;enabled=true;renderMotions();renderBackgroundVideo();commit();}
  });
  // Acervo videos are backgrounds, never movable composition elements.
  // Legacy clips are still rendered for previously saved projects.
  by('labClipOpen').addEventListener('click',()=>window.LabAcervo?.openPublic?.());
  window.addEventListener('labmattar:acervo-video-select',event=>{
    if(!pages.length||busy||switching)return;
    try{
      const backgroundVideo=createBackgroundVideo(event.detail,uid('background'));
      commit();pages[current].backgroundVideo=backgroundVideo;
      const state=bridge().snapshot().state;
      bridge().restore({...state,background:'photo',
        mContent:state.mContent==='solid'?'photo':state.mContent});
      enabled=true;renderBackgroundVideo();commit();
      setWorkspaceView('edit');
      document.querySelector('button[data-mobile-module="fundo"]')?.click();
      notify(backgroundVideo.name+' aplicado como vídeo de fundo.');
    }catch(error){notify(error.message,true);}
  });
  by('labClipInstance').addEventListener('change',event=>{selectedClip=event.target.value;renderClipControls();});
  for(const [input,field] of [['labClipX','x'],['labClipY','y'],['labClipWidth','width'],['labClipFrame','frameSeconds']]){
    by(input).addEventListener('input',event=>{
      const clip=(pages[current]?.clips||[]).find(item=>item.id===selectedClip);
      if(!clip||busy)return;
      const n=Number(event.target.value);if(!Number.isFinite(n))return;
      clip[field]=Math.max(field==='width'?5:0,Math.min(field==='frameSeconds'?3600:100,n));
      placeClips();commit();
    });
  }
  by('labClipRemove').addEventListener('click',()=>{
    if(busy)return;
    pages[current].clips=(pages[current].clips||[]).filter(clip=>clip.id!==selectedClip);
    selectedClip='';enabled=true;renderClips();commit();
    notify('Vídeo removido da página. O original permanece no acervo.');
  });
  by('labClipPlay').addEventListener('click',()=>{
    clipsPlaying=!clipsPlaying;
    for(const video of by('labPageVideos').querySelectorAll('video')){
      if(clipsPlaying)video.play().catch(()=>{});
      else video.pause();
    }
    renderClipControls();
  });
  by('labMotionOpen').addEventListener('click',openLibrary);by('labMotionClose').addEventListener('click',closeLibrary);
  by('labMotionLibrary').addEventListener('cancel',event=>{event.preventDefault();closeLibrary();});
  by('labMotionInstance').addEventListener('change',event=>{selectedMotion=event.target.value;renderMotionControls();});
  for(const [id,field] of [['labMotionX','x'],['labMotionY','y'],['labMotionWidth','width'],['labMotionFrame','frameSeconds']])by(id).addEventListener('input',event=>{
    if(!catalog)return;
    const motion=pages[current].motions.find(motion=>motion.id===selectedMotion);if(!motion)return;
    const raw=Number(event.target.value);if(!Number.isFinite(raw))return;
    const asset=catalog.find(asset=>asset.id===motion.assetId);
    const value=Math.max(field==='width'?5:0,Math.min(field==='frameSeconds'?asset.duration:100,raw));
    motion[field]=value;if(field==='frameSeconds')still=true;placeMotions();
    if(field==='frameSeconds')renderMotions();commit();
  });
  by('labMotionRemove').addEventListener('click',()=>{pages[current].motions=pages[current].motions.filter(motion=>motion.id!==selectedMotion);renderMotions();commit();});
  by('labMotionPreview').addEventListener('click',()=>{still=!still;renderMotions();});
  by('labExportMp4').addEventListener('click',()=>exportSequence('mp4'));
  by('labExportPdf').addEventListener('click',()=>exportSequence('pdf'));
  by('labExportHtml').addEventListener('click',()=>exportSequence('html'));
  by('labPresentation').addEventListener('click',()=>exportSequence('preview'));
  new MutationObserver(()=>requestAnimationFrame(placeMotions)).observe(board,{attributes:true,attributeFilter:['data-format']});
  window.addEventListener('resize',()=>requestAnimationFrame(placeMotions),{passive:true});
  panel.dataset.ready='true';
  resetAvailability();
  loadMotionCatalog();
}
