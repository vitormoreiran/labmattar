import {assetURL,mesaPhotoKey} from './mesa-editor/acervo-reference.mjs';
import {pickMesaMedia} from './mesa-editor/acervo.mjs';
import {findModel} from './mesa-editor/modelos-data.mjs';
import {createPage,sequenceDocument} from './lab-sequence.mjs';
import {checkProjectBytes} from './lab-project-lifecycle.mjs';
import {STORY_PRESETS,loadStoryPreset} from './lab-story-presets.mjs';
import {storyTopic} from './lab-story-model.mjs';
import {addStoryTopic,removeStoryPhoto,createStoryTemplate,setStoryImageScroll} from './lab-story-project.mjs';
import {pageRows,pageFingerprint,fullCatalog,changeContent,duplicatePage,moveSelected} from './lab-desk-model.mjs';
import {libraryList,librarySave} from './lab-project-library.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const frame=$('engine'),hadDraft=Boolean(localStorage.getItem('labmattar-pages-v1'));
const inMesa=new URLSearchParams(location.search).get('mesa')==='1'&&window.parent!==window;
let api,host,documentValue,rows=[],selectedId='',currentKey='',records=[],view='all',filter='',panel='content',mode='desk',loading=true,inputTimer,saveTimer,readTimer,pendingText=false,fieldKey='',history=[],queue=Promise.resolve(),thumbTimer,thumbPending=new Map(),previewBusy=false,previewURL='';
const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="%23eeefeb"/><text x="320" y="184" text-anchor="middle" fill="%23767873" font-family="Arial,sans-serif" font-size="18">Preparando prévia…</text></svg>'.replaceAll('%23','#'));
const thumbs=new Map(),knownThumbs=new Map(),formatName={horizontal:'Horizontal / 16:9',vertical:'Vertical / 9:16',quadrado:'Quadrado / 1:1',editorial:'Editorial'};
const row=()=>rows.find(p=>p.id===selectedId)||rows[0];
const context=()=>host.LabProductionBridge.snapshot();
function toast(text,error=false){$('toast').textContent=text;$('toast').dataset.error=String(error);$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',6500);}
function native(task){const promise=queue.then(async()=>{for(let n=0;api.isBusy();n++){if(n>600)throw Error('A operação atual ainda está em andamento.');await new Promise(r=>setTimeout(r,50));}return task();});queue=promise.catch(()=>{});return promise;}
function run(task){return Promise.resolve().then(task).catch(error=>{toast(error.message,true);$('saveState').textContent='Revise a mensagem para continuar.';});}
function read(){if(api.isBusy())return false;const snapshot=api.snapshot();documentValue=snapshot.document;rows=pageRows(documentValue);selectedId=snapshot.currentPageId||rows[0]?.id;return true;}
function scheduleRead(){clearTimeout(readTimer);readTimer=setTimeout(()=>{if(loading)return;if(!read()){scheduleRead();return;}render();scheduleSave();},120);}
async function saveCurrent(){if(!currentKey||!documentValue||pendingText)return;const record={id:currentKey,name:documentValue.name,document:documentValue,currentPageId:selectedId,updatedAt:Date.now()};await librarySave(record);records=records.filter(p=>p.id!==currentKey);records.push(record);localStorage.setItem('labmattar-desk-active-v1',currentKey);$('saveState').textContent='Rascunho salvo neste navegador';renderProjects();}
function scheduleSave(){clearTimeout(saveTimer);$('saveState').textContent='Salvando rascunho local…';saveTimer=setTimeout(()=>run(saveCurrent),400);}
function renderProjects(){const search=$('search').value.toLocaleLowerCase('pt-BR'),working=records.filter(p=>!p.id.startsWith('reference:'));let html=working.length?'<p class="list-label">'+(inMesa?'RASCUNHOS':'MEUS PROJETOS')+'</p>':'';for(const item of working)if(item.name.toLocaleLowerCase('pt-BR').includes(search))html+=projectButton(item.id,item.name,item.document.pages.length,item.document.story?.topics.length||item.document.sections?.length||0);html+='<p class="list-label">'+(inMesa?'REFERÊNCIAS':'PROJETOS DE REFERÊNCIA')+'</p>';for(const ref of STORY_PRESETS){const saved=records.find(p=>p.id==='reference:'+ref.id),name=saved?.name||ref.name;if(name.toLocaleLowerCase('pt-BR').includes(search))html+=projectButton('reference:'+ref.id,name,saved?.document.pages.length||({aleteia:32,poiesis:27,'cada-corpo-abre-um-mundo':27})[ref.id],saved?.document.story?.topics.length||10,ref.id);} $('projects').innerHTML=html;}
function projectButton(id,name,count,sections,slug){const item=records.find(x=>x.id===id),first=item?.document.pages[0],preview=first?thumbs.get(first.id+':'+pageFingerprint(first)):'',src=preview|| (slug?'/presentation-models/covers/'+slug+'.webp':'/identidade/M.svg');return '<button class="project" data-project="'+esc(id)+'" aria-pressed="'+(id===currentKey)+'"><img src="'+esc(src)+'" alt=""><span><strong>'+esc(name)+'</strong><small>'+count+' páginas'+(sections?' · '+sections+' seções':'')+'</small></span></button>';}
function thumbnail(item){const key=item.id+':'+item.fingerprint;if(!thumbs.has(key))thumbPending.set(key,item);return thumbs.get(key)||knownThumbs.get(item.id)||placeholder;}
function card(item){const known=thumbs.has(item.id+':'+item.fingerprint),label=documentValue.pages[item.index].composition.pages[0].text.title.value||item.caption||'Imagem '+String(rows.filter(p=>p.topicId===item.topicId).indexOf(item)+1).padStart(2,'0');return '<button class="page-card '+(!known?'updating':'')+'" draggable="'+String(!documentValue.story||item.isPhoto)+'" data-page="'+esc(item.id)+'" aria-pressed="'+(item.id===selectedId)+'"><img src="'+esc(thumbnail(item))+'" alt="'+esc(item.name)+'" loading="lazy"><div class="page-meta"><small>'+String(item.index+1).padStart(2,'0')+' / '+esc(item.section)+'</small><span>'+esc(label.replace(/\s+/g,' '))+'</span></div></button>';}
function renderGallery(){
  if(!documentValue)return;
  $('projectTitle').textContent=documentValue.name;
  const sectionCount=documentValue.story?.topics.length||documentValue.sections?.length;
  $('projectCount').textContent=rows.length+(rows.length===1?' página':' páginas')+(sectionCount?' · '+sectionCount+(sectionCount===1?' seção':' seções'):'');
  if(inMesa){
    $('project-kind').textContent=currentKey.startsWith('reference:')?'Apresentação de referência':documentValue.story?'Rascunho de apresentação':rows.length===1?'Rascunho de página':'Rascunho de documento';
    $('newSection').hidden=!documentValue.story;
    $('newPage').textContent=documentValue.story?'Editar seção':'Adicionar página';
  }
  const gallery=$('gallery'),visible=rows.filter(p=>!filter||p.topicId===filter);
  const positions=new Map([...gallery.querySelectorAll('[data-page-strip]')].map(el=>[el.dataset.pageStrip,el.scrollLeft]));
  if(view==='all')gallery.innerHTML='<div class="page-grid" data-page-strip="'+esc(currentKey+':'+filter)+'">'+visible.map(card).join('')+'</div>';
  else{
    const groups=[...new Set(visible.map(p=>p.topicId))];
    gallery.innerHTML=groups.map(id=>{
      const group=visible.filter(p=>p.topicId===id);
      return '<section class="section-group"><h2 class="section-title">'+esc(group[0].section)+'<small>'+group.length+' páginas</small></h2><div class="page-grid" data-page-strip="'+esc(currentKey+':'+id)+'">'+group.map(card).join('')+'</div></section>';
    }).join('');
  }
  for(const element of gallery.querySelectorAll('[data-page-strip]'))element.scrollLeft=positions.get(element.dataset.pageStrip)||0;
  $('undo').disabled=!history.length;clearTimeout(thumbTimer);thumbTimer=setTimeout(renderThumb,350);
}
function refreshFilter(){const value=filter,groups=[...new Map(rows.map(p=>[p.topicId,p.section])).entries()];$('sectionFilter').innerHTML='<option value="">Todas as seções</option>'+groups.filter(([id])=>id).map(([id,label])=>'<option value="'+esc(id)+'">'+esc(label)+'</option>').join('');if(!groups.some(([id])=>id===value))filter='';$('sectionFilter').value=filter;}
function showPageImage(src){
  $('selectedImage').src=src;
  if(inMesa)$('montar-stage-image').src=src;
}
function renderInspector(){const item=row();if(!item)return;$('pageTitle').textContent='Página '+String(item.index+1).padStart(2,'0');$('pageSection').textContent=item.section+' · '+(formatName[item.format]||item.format);showPageImage(thumbnail(item));
if(inMesa)$('montar-stage-page').textContent='Página '+(item.index+1)+' de '+rows.length;
const key=item.id+':'+panel;if(fieldKey!==key){fieldKey=key;if(panel==='content')$('inspectorFields').innerHTML='<label for="deskTitle">Título'+(documentValue.story?' da seção':'')+'<textarea id="deskTitle" rows="2" maxlength="120"></textarea></label><label for="deskBody">Texto'+(documentValue.story?' da seção':' da página')+'<textarea id="deskBody" rows="7" maxlength="24000"></textarea></label>'+(documentValue.story&&item.isPhoto?'<label for="deskCaption">Legenda desta imagem<textarea id="deskCaption" rows="2" maxlength="380"></textarea></label>':'');if(panel==='layout')$('inspectorFields').innerHTML='<div class="property"><span>Formato</span><span>'+esc(formatName[item.format])+'</span></div><div class="property"><span>Fundo</span><span>'+esc(item.background==='photo'?'Fotografia / vídeo':'Cor')+'</span></div><div class="property"><span>M</span><span>'+esc(item.m==='off'?'Sem M':item.m==='photo'?'Imagem no M':'M sólido')+'</span></div><button class="configure-action" data-config="edit">Configurar composição</button>';if(panel==='motion')$('inspectorFields').innerHTML='<div class="property"><span>Motions da página</span><span>'+item.motions+'</span></div><button class="configure-action" data-config="motion">Configurar motion</button>';}
if(panel==='content'&&!pendingText){for(const [id,value]of [['deskTitle',item.title],['deskBody',item.body],['deskCaption',item.caption]])if($(id)&&document.activeElement!==$(id))$(id).value=value;}
$('back').disabled=item.index===0;$('forward').disabled=item.index===rows.length-1;$('duplicate').disabled=documentValue.story&&!item.isPhoto;$('remove').disabled=rows.length===1;}
function render(){if(!documentValue)return;$('presentationSettings').hidden=!documentValue.story;$('imageScroll').value=documentValue.story?.imageScroll||'horizontal';renderProjects();refreshFilter();renderGallery();renderInspector();}
async function renderThumb(){if(mode!=='desk'||loading||pendingText||previewBusy||$('presentationPreview').open){thumbTimer=setTimeout(renderThumb,650);return;}const visible=[...$('gallery').querySelectorAll('[data-page]')].filter(el=>{const r=el.getBoundingClientRect();return r.bottom>72&&r.top<innerHeight+400;}).map(el=>el.dataset.page),selected=row(),candidates=[selected,...visible.map(id=>rows.find(p=>p.id===id))].filter(Boolean);const item=candidates.find(p=>!thumbs.has(p.id+':'+p.fingerprint));if(!item)return;
try{await native(async()=>{if(mode!=='desk'||loading||pendingText||previewBusy||$('presentationPreview').open)return;const actual=pageRows(api.snapshot().document).find(p=>p.id===item.id);if(!actual||actual.fingerprint!==item.fingerprint)return;const data=await api.thumbnail(item.id);thumbs.set(item.id+':'+item.fingerprint,data);for(const img of $('gallery').querySelectorAll('[data-page="'+CSS.escape(item.id)+'"] img')){img.src=data;img.closest('.page-card').classList.remove('updating');}if(item.id===selectedId)showPageImage(data);});}catch(error){thumbs.set(item.id+':'+item.fingerprint,knownThumbs.get(item.id)||placeholder);toast('Prévia: '+error.message,true);}finally{thumbTimer=setTimeout(renderThumb,100);}}
async function apply(next,id=selectedId){history.push({document:documentValue,id:selectedId});if(history.length>8)history.shift();await api.load(next,{currentIndex:Math.max(0,next.pages.findIndex(p=>p.id===id))});api.persist();read();render();await saveCurrent();}
async function flushText(){clearTimeout(inputTimer);if(!pendingText||panel!=='content')return;const id=selectedId,value={title:$('deskTitle').value,body:$('deskBody').value,...($('deskCaption')?{caption:$('deskCaption').value}:{})};pendingText=false;try{await native(()=>apply(changeContent(api.snapshot().document,id,value,context().photoCatalog),id));}catch(error){pendingText=true;throw error;}}
async function select(id){await flushText();await native(()=>api.selectPage(id));read();fieldKey='';render();if(!inMesa&&innerWidth<=800)document.body.dataset.inspectorOpen='true';}
function setMode(value){mode=value;document.body.dataset.mode=value;$('returnToPages').hidden=value==='desk';$('configurationName').textContent=documentValue.name+' / '+row()?.section+' / Página '+String((row()?.index||0)+1).padStart(2,'0');}
async function configure(target='edit'){await flushText();await native(async()=>{await api.selectPage(selectedId);api.workspace(target);setMode('configure');});}
async function backToPages(){if(api.isBusy()){toast('Aguarde a operação atual terminar.');return;}const dialog=host.document.getElementById('labDeliveryDialog');if(dialog.open)host.document.getElementById('labDeliveryBack').click();setMode('desk');read();fieldKey='';render();await saveCurrent();}
async function openProject(key){if(loading||key===currentKey)return;await flushText();await saveCurrent();loading=true;$('saveState').textContent='Abrindo projeto…';const old=api.snapshot(),oldKey=currentKey;try{const saved=records.find(p=>p.id===key),next=saved?.document||await loadStoryPreset(key.replace('reference:',''));await native(()=>api.load(next,{currentIndex:Math.max(0,next.pages.findIndex(p=>p.id===saved?.currentPageId))}));currentKey=key;history=[];filter='';read();fieldKey='';render();await saveCurrent();}catch(error){currentKey=oldKey;await api.load(old.document,{currentIndex:old.document.pages.findIndex(p=>p.id===old.currentPageId)});throw error;}finally{loading=false;scheduleRead();}}
async function createDraft(build){
  if(loading || previewBusy)throw Error('Conclua a operação atual antes de criar um projeto.');
  loading=true;
  try{
    await flushText();
    await native(read);
    await saveCurrent();
    const before=api.snapshot(), oldKey=currentKey;
    const next=build();
    try{
      await native(()=>api.load(next));
      api.persist();
      currentKey='project-'+crypto.randomUUID();
      history=[];filter='';fieldKey='';read();setMode('desk');render();
      setPageInspector(false);
      await saveCurrent();
    }catch(error){
      currentKey=oldKey;
      await native(()=>api.load(before.document,{currentIndex:before.document.pages.findIndex(page=>page.id===before.currentPageId)}));
      api.persist();read();fieldKey='';render();
      throw error;
    }
  }finally{loading=false;}
}
async function newProject(){
  const name=$('newProjectName').value.trim();
  if(!name)return;
  if(inMesa&&$('creationKind').value==='page')await newModel(findModel('abertura'),name);
  else await createDraft(()=>createStoryTemplate({...context(),name,minimal:true}));
  $('newProjectDialog').close();
}
function newModel(model,name){
  return createDraft(()=>{
    const {state,photoCatalog}=context();
    const signature={preset:'custom',scale:100,slots:{
      tl:{kind:'text',symbol:'M.svg',text:'LABMATTAR'},
      tr:{kind:'none',symbol:'M.svg',text:''},bl:{kind:'none',symbol:'M.svg',text:''},br:{kind:'none',symbol:'M.svg',text:''},
    }};
    const style={...state,format:model.format,background:'color',photo:'64',photoEffect:'auto',photoContrast:20,photoBlur:0,photoGlass:0,
      focusX:50,focusY:50,mContent:'off',mCaption:'',marker:'none',symbol:'none',guides:'nenhuma',margin:9,textWidth:100,textPositionY:50,
      type:'perpetua',titleFonts:[],signature,kicker:'',footerLeft:'',footerRight:''};
    const pages=model.pages.map((page,index)=>{
      const body=page.body || '';
      return createPage({id:'page-'+crypto.randomUUID(),name:page.name,photoCatalog,maxEdge:1920,state:{...style,
        color:page.color||'neutral',inkColor:page.ink||'black',titleScale:page.scale||70,
        title:index===0?name:page.title,body,bodyMode:body?'visivel':'oculto',
      }});
    });
    return sequenceDocument(name,pages,null,signature);
  });
}
async function exportProject(){await flushText();await saveCurrent();const json=JSON.stringify(api.snapshot().document,null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(documentValue.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()||'apresentacao')+'.labmattar.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Projeto editável salvo em JSON.');}
async function present(){
 if(loading)return;
 const dialog=$('presentationPreview');
 if(!dialog.open)dialog.showModal();
 if(previewBusy)return;
 previewBusy=true;dialog.dataset.state='loading';
 $('presentationTitle').textContent=documentValue.name;
 $('presentationFrame').hidden=false;$('presentationStatus').hidden=false;
 $('presentationStatus').textContent='Preparando apresentação…';
 try{
  await flushText();
  const blob=await native(()=>api.export('preview',{returnPreview:true}));
  if(!blob?.size||blob.type!=='text/html;charset=utf-8')throw Error(host.document.getElementById('labExportStatus').textContent||'Não foi possível preparar a apresentação.');
  if(!dialog.open)return;
  if(previewURL)URL.revokeObjectURL(previewURL);
  previewURL=URL.createObjectURL(blob);
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{cleanup();reject(Error('A apresentação não terminou de abrir.'));},30000);const cleanup=()=>{clearTimeout(timeout);$('presentationFrame').removeEventListener('load',loaded);};const loaded=()=>{cleanup();resolve();};$('presentationFrame').addEventListener('load',loaded,{once:true});$('presentationFrame').src=previewURL;});
  if(!dialog.open)return;
  $('presentationStatus').hidden=true;$('presentationFrame').hidden=false;dialog.dataset.state='ready';
 }catch(error){dialog.dataset.state='error';$('presentationStatus').textContent='Não foi possível abrir a apresentação. '+error.message;throw error;}
 finally{previewBusy=false;}
}
function closePresentation(){
 $('presentationFrame').src='about:blank';$('presentationFrame').hidden=true;
 if(previewURL){URL.revokeObjectURL(previewURL);previewURL='';}
 clearTimeout(thumbTimer);thumbTimer=setTimeout(renderThumb,180);
}
function attachEvents(){
$('imageScroll').onchange=()=>{const value=$('imageScroll').value;run(async()=>{try{await flushText();await native(()=>apply(setStoryImageScroll(api.snapshot().document,value,context().photoCatalog)));}catch(error){render();throw error;}});};
$('projects').onclick=e=>{const button=e.target.closest('[data-project]');if(button)run(()=>openProject(button.dataset.project));};$('search').oninput=renderProjects;$('gallery').onclick=e=>{const b=e.target.closest('[data-page]');if(b)run(()=>select(b.dataset.page));};$('gallery').ondblclick=e=>{const b=e.target.closest('[data-page]');if(b)run(async()=>{await select(b.dataset.page);await configure();});};
let dragId;$('gallery').ondragstart=e=>{const b=e.target.closest('[data-page]');if(b){dragId=b.dataset.page;e.dataTransfer.setData('text/plain',dragId);}};$('gallery').ondragover=e=>e.preventDefault();$('gallery').ondrop=e=>{e.preventDefault();const b=e.target.closest('[data-page]');if(!b||!dragId||dragId===b.dataset.page)return;const from=dragId;dragId=null;run(async()=>{await flushText();await native(async()=>{let next=api.snapshot().document,id=from,source=pageRows(next).find(p=>p.id===from),target=pageRows(next).find(p=>p.id===b.dataset.page);if(source.topicId!==target.topicId)throw Error('Reordene as imagens dentro da mesma seção.');const photoIds=next.story?.topics.find(t=>t.id===source.topicId)?.photoPageIds;const distance=photoIds?photoIds.indexOf(target.id)-photoIds.indexOf(from):target.index-source.index;if(photoIds&&(photoIds.indexOf(from)<0||photoIds.indexOf(target.id)<0))throw Error('Reordene apenas as imagens da seção.');const delta=distance>0?1:-1;for(let n=0;n<Math.abs(distance);n++){const moved=moveSelected(next,id,delta,context().photoCatalog);next=moved.document;id=moved.id;}await apply(next,id);});});};
$('sectionFilter').onchange=e=>{filter=e.target.value;renderGallery();};$('gallery').parentElement.addEventListener('scroll',()=>{clearTimeout(thumbTimer);thumbTimer=setTimeout(renderThumb,180);});
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;for(const x of document.querySelectorAll('[data-view]'))x.setAttribute('aria-pressed',String(x===b));renderGallery();};
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>run(async()=>{await flushText();panel=b.dataset.panel;fieldKey='';for(const x of document.querySelectorAll('[data-panel]'))x.setAttribute('aria-pressed',String(x===b));renderInspector();});
$('inspectorFields').oninput=e=>{if(!e.target.matches('textarea'))return;pendingText=true;$('saveState').textContent='Salvando conteúdo…';clearTimeout(inputTimer);inputTimer=setTimeout(()=>run(flushText),450);};$('inspectorFields').onclick=e=>{const b=e.target.closest('[data-config]');if(b)run(()=>configure(b.dataset.config));};
$('configure').onclick=$('largePreview').onclick=$('enlarge').onclick=()=>run(()=>configure());$('returnToPages').onclick=()=>run(backToPages);$('save').onclick=()=>run(exportProject);$('export').onclick=()=>run(async()=>{await flushText();await native(async()=>{await api.selectPage(selectedId);setMode('export');});host.document.getElementById('labOpenDelivery').click();});
$('present').onclick=()=>run(present);$('closePresentation').onclick=()=>$('presentationPreview').close();$('presentationPreview').addEventListener('close',closePresentation);
for(const [id,delta]of [['back',-1],['forward',1]])$(id).onclick=()=>run(async()=>{await flushText();await native(async()=>{const moved=moveSelected(api.snapshot().document,selectedId,delta,context().photoCatalog);await apply(moved.document,moved.id);});});
$('duplicate').onclick=()=>run(async()=>{await flushText();await native(async()=>{const result=duplicatePage(api.snapshot().document,selectedId,context().photoCatalog);await apply(result.document,result.id);});});
$('undo').onclick=()=>run(async()=>{await flushText();const before=history.pop();if(!before)return;await native(()=>api.load(before.document,{currentIndex:before.document.pages.findIndex(p=>p.id===before.id)}));api.persist();read();fieldKey='';render();await saveCurrent();});
$('remove').onclick=()=>run(async()=>{if(!confirm('Excluir esta página do projeto? Você pode desfazer pela mesa.'))return;await flushText();await native(async()=>{let next=api.snapshot().document;if(next.story){const topic=next.story.topics.find(t=>t.pageIds.includes(selectedId));next=removeStoryPhoto(next,topic.id,selectedId,context().photoCatalog);}else{next=JSON.parse(JSON.stringify(next));if(next.pages.length<2)return;const page=next.pages.find(p=>p.id===selectedId);if(next.sections&&next.pages.filter(p=>p.sectionId===page.sectionId).length===1)throw Error('Mantenha ao menos uma página na seção.');next.pages=next.pages.filter(p=>p.id!==selectedId);}await apply(next,next.pages[Math.min(row().index,next.pages.length-1)].id);});});
$('newPage').onclick=()=>run(async()=>{await flushText();if(documentValue.story){const topic=documentValue.story.topics.find(t=>t.pageIds.includes(selectedId));await native(()=>{host.LabPages.workspace('pages');setMode('section');host.document.querySelector('[data-story-edit="'+CSS.escape(topic.id)+'"]').click();});}else{await native(()=>api.selectPage(selectedId));host.document.getElementById('labPageAdd').click();scheduleRead();}});
$('newSection').onclick=()=>run(async()=>{await flushText();if(!documentValue.story){toast('Crie uma apresentação por seções em Nova apresentação.');return;}await native(async()=>{const topic=documentValue.story.topics.find(t=>t.pageIds.includes(selectedId)),next=addStoryTopic(api.snapshot().document,topic.id,'section',context().photoCatalog),created=next.story.topics[next.story.topics.findIndex(t=>t.id===topic.id)+1];await apply(next,created.photoPageIds[0]);});});
$('newProject').onclick=()=>{$('newProjectName').value='';$('newProjectDialog').showModal();$('newProjectName').focus();};$('newProjectForm').onsubmit=e=>{e.preventDefault();run(newProject);};$('cancelNew').onclick=()=>$('newProjectDialog').close();
$('import').onclick=()=>$('projectFile').click();$('projectFile').onchange=()=>run(async()=>{const file=$('projectFile').files[0];if(!file)return;loading=true;try{await flushText();await saveCurrent();$('saveState').textContent='Abrindo projeto…';checkProjectBytes(file.size);const value=JSON.parse(await file.text());await native(()=>value.kind==='labmattar.composition'?api.loadComposition(value):api.load(value));currentKey='project-'+crypto.randomUUID();read();fieldKey='';filter='';render();await saveCurrent();$('projectFile').value='';}finally{loading=false;scheduleRead();}});
$('closeInspector').onclick=$('inspectorBackdrop').onclick=()=>{
  setPageInspector(false);
  if(inMesa&&innerWidth<=800)$('montar-stage-content').focus();
};
window.addEventListener('beforeunload',event=>{if(pendingText){event.preventDefault();event.returnValue='';}});
}
function setPageInspector(open){
  if(open)document.body.dataset.inspectorOpen='true';
  else delete document.body.dataset.inspectorOpen;
  $('montar-stage-content')?.setAttribute('aria-expanded',open);
}
async function boot(){
const manifest=await fetch('/presentation-models/thumbs/manifest.json').then(r=>{if(!r.ok)throw Error('Não foi possível carregar as miniaturas.');return r.json();});for(const p of manifest.projects)for(const page of p.pages){thumbs.set(page.id+':'+page.fingerprint,page.image);knownThumbs.set(page.id,page.image);}
records=await libraryList();frame.src='/compor.html?studio=1&workspace=edit&embedded=mesa#laboratorio';for(let n=0;n<1200;n++){try{host=frame.contentWindow;api=host.LabPages;if(api?.snapshot&&host.LabRenderer&&host.document.getElementById('labPages')?.dataset.ready==='true')break;}catch{}await new Promise(r=>setTimeout(r,50));}if(!api?.snapshot)throw Error('O editor de páginas não terminou de carregar. Recarregue a ferramenta.');
const style=host.document.createElement('style');style.textContent='#labStudioToggle{display:none!important}';host.document.head.append(style);host.document.querySelector('[data-workspace-view=pages]').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();run(backToPages);},true);
for(const id of ['labDeliveryDialog','labStoryDialog'])host.document.getElementById(id).addEventListener('close',()=>{if(mode==='export'||mode==='section'){setMode('desk');scheduleRead();}});
host.addEventListener('labmattar:pages-commit',scheduleRead);new MutationObserver(()=>{const status=host.document.getElementById('labExportStatus');if(status.textContent)$('operationStatus').textContent=status.textContent;if(previewBusy&&status.textContent)$('presentationStatus').textContent=status.textContent;if(status.dataset.state==='error')toast(status.textContent,true);}).observe(host.document.getElementById('labExportStatus'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-state']});
read();const previous=records.find(p=>p.id===localStorage.getItem('labmattar-desk-active-v1'));if(previous&&(!hadDraft||inMesa)){await api.load(previous.document,{currentIndex:previous.document.pages.findIndex(p=>p.id===previous.currentPageId)});currentKey=previous.id;read();}else{const preset=STORY_PRESETS.find(p=>documentValue.pages.some(page=>page.id.startsWith(p.id+'-page-')));currentKey=previous?.document.pages.some(p=>p.id===selectedId)?previous.id:preset?'reference:'+preset.id:'project-'+crypto.randomUUID();}
const requested=new URLSearchParams(location.search).get('modelo'),requestedKey='reference:'+requested;
if((!inMesa||!previous)&&requested&&STORY_PRESETS.some(p=>p.id===requested)){if(hadDraft||previous)await saveCurrent();const saved=records.find(p=>p.id===requestedKey),next=saved?.document||await loadStoryPreset(requested);await api.load(next,{currentIndex:Math.max(0,next.pages.findIndex(p=>p.id===saved?.currentPageId))});currentKey=requestedKey;read();}
attachEvents();loading=false;render();await saveCurrent();window.LabDesk={ready:true,flush:flushText,snapshot:()=>({document:documentValue,currentPageId:selectedId,mode,loading}),select:id=>run(()=>select(id)),configure:target=>run(()=>configure(target)),back:()=>run(backToPages)};document.body.dataset.ready='true';
if(inMesa)connectMesaLibrary();
if(requested&&STORY_PRESETS.some(p=>p.id===requested)){const url=new URL(location.href);url.searchParams.delete('modelo');window.history.replaceState(null,'',url);}
}
function connectMesaLibrary(){
  document.querySelector('.sidebar-note').textContent='Rascunhos salvos neste navegador. As mídias vinculadas ficam na sessão de prévia.';
  document.querySelector('.topbar .brand > div').textContent='Montar';
  $('import').textContent='Abrir arquivo';
  $('save').textContent='Baixar projeto';
  $('configure').textContent='Editar no Compor';
  $('mount-project-heading').textContent='Criações';
  $('newProject').textContent='＋ Nova criação';
  $('newProjectTitle').textContent='Nova criação';
  $('new-project-submit').textContent='Criar rascunho';
  $('mesa-creation-kind').hidden=false;
  const kind=$('creationKind');
  kind.onchange=()=>{
    $('new-project-help').textContent=kind.value==='page'?'Uma página que você pode editar no Compor.':'Uma apresentação com capa e introdução, pronta para receber novas páginas.';
  };
  kind.onchange();
  $('montar-stage').hidden=false;
  $('montar-stage-edit').onclick=()=>run(()=>configure());
  $('inspectorBackdrop').setAttribute('aria-hidden','true');
  $('inspectorBackdrop').tabIndex=-1;
  $('montar-stage-content').onclick=()=>{setPageInspector(true);$('closeInspector').focus();};
  const projectActions=document.createElement('div');
  projectActions.className='montar-project-actions';
  const projectToggle=document.createElement('button');
  projectToggle.type='button';projectToggle.id='montar-show-projects';projectToggle.textContent='Ver criações';
  projectToggle.setAttribute('aria-controls','projects');projectToggle.setAttribute('aria-expanded','false');
  projectToggle.onclick=()=>{
    const open=!document.body.hasAttribute('data-mesa-projects-open');
    document.body.toggleAttribute('data-mesa-projects-open',open);
    projectToggle.setAttribute('aria-expanded',open);
  };
  $('newProject').before(projectActions);
  projectActions.append($('newProject'),projectToggle);
  const choose=document.createElement('button');
  choose.type='button';choose.textContent='Imagem de fundo';
  const button=document.createElement('button');
  button.type='button';button.textContent='Aplicar imagem do Portfólio';button.hidden=true;
  document.querySelector('.montar-page-actions').prepend(choose,button);
  const templates=document.createElement('button');
  templates.type='button';templates.textContent='Ver modelos do Acervo';
  templates.onclick=()=>{
    $('newProjectDialog').close();
    window.parent.postMessage({type:'mesa:open-models'},location.origin);
  };
  $('cancelNew').before(templates);
  let importedImage;
  async function applyToPage(uri,name){
    const photoKey=mesaPhotoKey(uri);
    if(!photoKey)throw Error('Referência de imagem inválida.');
    const response=await fetch(uri,{method:'HEAD'});
    if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error('Não foi possível abrir esta imagem na sessão.');
    await flushText();
    await native(async()=>{
      await api.selectPage(selectedId);
      const detail={provider:'mesa',photoKey,original:uri,name};
      host.dispatchEvent(new host.CustomEvent('labmattar:acervo-select',{detail}));
      const background=host.document.getElementById('labBackground');
      if(background&&[...background.options].some(option=>option.value==='photo')){
        background.value='photo';background.dispatchEvent(new host.Event('change',{bubbles:true}));
      }
      api.persist();read();render();await saveCurrent();
    });
    toast('Imagem aplicada à página selecionada.');
  }
  choose.onclick=()=>run(async()=>{
    if(choose.disabled)return;
    choose.disabled=true;
    try{
      const item=await pickMesaMedia('image');
      if(item)await applyToPage(assetURL(item.key),item.name);
    }finally{choose.disabled=false;}
  });
  window.addEventListener('message',async event=>{
    if(event.origin!==location.origin||event.source!==window.parent)return;
    if(event.data?.type==='mesa:new-composition'){
      $('newProject').click();
      return;
    }
    if(event.data?.type==='mesa:open-draft'){
      const {id}=event.data;
      if(!records.some(item=>item.id===id))toast('Este rascunho não está disponível neste navegador.',true);
      else run(async()=>{if(mode!=='desk')await backToPages();await openProject(id);});
      return;
    }
    if(event.data?.type==='mesa:create-from-model'){
      const {id,name,request}=event.data;
      const model=findModel(id);
      let error;
      try{
        if(!model||typeof name!=='string'||!name.trim()||name.length>120)throw Error('Modelo ou nome de projeto inválido.');
        await newModel(model,name.trim());
      }catch(exception){error=exception.message;}
      window.parent.postMessage({type:'mesa:model-result',request,error},location.origin);
      return;
    }
    if(event.data?.type!=='mesa:compose-image')return;
    if(!mesaPhotoKey(event.data.url))return;
    importedImage={url:event.data.url,label:String(event.data.label||'Imagem do Portfólio').slice(0,100)};
    button.hidden=false;
    toast('Imagem do Portfólio disponível. Selecione uma página e aplique a imagem.');
  });
  button.onclick=()=>run(async()=>{
    if(!importedImage||button.disabled)return;
    button.disabled=true;
    const item=importedImage;
    try{
      await applyToPage(item.url,item.label);
      if(importedImage===item){importedImage=null;button.hidden=true;}
    }finally{button.disabled=false;}
  });
  window.parent.postMessage({type:'mesa:composition-ready'},location.origin);
}
boot().catch(error=>{$('operationStatus').textContent=error.message;toast(error.message,true);document.body.dataset.error='true';});
