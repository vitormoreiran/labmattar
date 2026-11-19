import {STORY_ROLES,storyTopic,storyLabel,storyCaption} from './lab-story-model.mjs';
import {STORY_PRESETS} from './lab-story-presets.mjs';
import {updateStoryText,setStoryCaption,addStoryPhotos,moveStoryPhoto,removeStoryPhoto,setStoryRole,moveStoryTopic,removeStoryTopic,addStoryTopic} from './lab-story-project.mjs';
const el=(tag,attrs={},text)=>{const node=document.createElement(tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node;};
const clone=value=>JSON.parse(JSON.stringify(value));
export function installStoryEditor({panel,list,getProject,getContext,beforeEdit,applyProject,selectPage,createTemplate,openPreset,isBusy,onError,confirmAction=async message=>confirm(message)}){
 const link=el('link',{rel:'stylesheet',href:'/composicao-story.css?v=20261118-paginas-organizadas'});document.head.append(link);
 const tools=el('section',{class:'lab-story-tools','aria-label':'Seções da apresentação'}),start=el('button',{type:'button',id:'labStoryNew'},'CRIAR APRESENTAÇÃO');
 const settings=el('details',{id:'labStorySettings'}),summary=el('summary',{},'TRANSIÇÕES ENTRE SEÇÕES'),hint=el('p',{class:'detail'},'Abra uma seção para escolher a foto ou editar seu conteúdo.'),add=el('button',{type:'button',id:'labStoryAdd'},'+ NOVA SEÇÃO');
 const flags=el('div',{class:'lab-story-flags'});for(const [key,label]of [['mTransition','Passagem com o M antes dos atos'],['actEntrances','Abertura com número e título em cada ato']]){const input=el('input',{type:'checkbox','data-story-setting':key,id:'labStory-'+key}),caption=el('label',{for:input.id});caption.append(input,document.createTextNode(label));flags.append(caption);input.onchange=async()=>{try{if(isBusy())return;const value=input.checked;beforeEdit();const project=clone(getProject());project.story[key]=value;await applyProject(project);}catch(error){onError(error.message);render();}};}
 settings.append(summary,flags);tools.append(el('p',{class:'detail'},'SEÇÕES E PÁGINAS'),hint,add,settings);document.getElementById('labSequenceTools').append(tools);

 // Starting another project is separate from editing the current sequence.
 const manager=el('dialog',{id:'labProjectDialog',class:'lab-project-dialog','aria-labelledby':'labProjectDialogTitle'}),managerHead=el('header'),managerTitle=el('h3',{id:'labProjectDialogTitle'},'NOVO / ABRIR'),managerClose=el('button',{type:'button','aria-label':'Fechar projetos'},'×');
 managerHead.append(managerTitle,managerClose);manager.append(managerHead);
 const choices=el('div',{class:'lab-project-choices'}),create=el('section'),openFile=el('section'),fileControls=document.getElementById('labProjectFileControls');fileControls.hidden=false;
 create.append(el('h3',{},'Nova apresentação'),el('p',{},'Uma estrutura editável com capa, introdução, experiência, atos e encerramento.'),start);
 openFile.append(el('h3',{},'Continuar um projeto'),el('p',{},'Abra o arquivo JSON salvo no Laboratório para retomar sua edição.'),fileControls);choices.append(create,openFile);manager.append(choices);
 const presets=el('section',{class:'lab-story-presets',id:'labStoryPresets'});presets.append(el('h3',{},'PROJETOS DE REFERÊNCIA'),el('p',{class:'detail'},'Assista ao projeto completo ou abra uma cópia para editar.'));
 const presetList=el('div',{class:'lab-project-examples'});for(const item of STORY_PRESETS){
  const row=el('article'),image=el('img',{src:'/presentation-models/covers/'+item.id+'.webp',alt:'',loading:'lazy'}),caption=el('div'),actions=el('div',{class:'lab-project-example-actions'}),watch=el('a',{href:'/apresentacoes/'+item.id+'/',target:'_blank',rel:'noopener'},'ASSISTIR ↗'),button=el('button',{type:'button','data-story-preset':item.id},'ABRIR CÓPIA');
  caption.append(el('h4',{},item.name));button.onclick=async()=>{if(isBusy()||loading)return;loading=true;for(const control of presetList.querySelectorAll('button'))control.disabled=true;manager.close();try{await openPreset(item.id);}catch(error){onError(error.message);}finally{loading=false;for(const control of presetList.querySelectorAll('button'))control.disabled=false;}};
  actions.append(watch,button);caption.append(actions);row.append(image,caption);presetList.append(row);
 }presets.append(presetList);manager.append(presets);
 // Keep the old section study available without mixing it with current projects.
 const legacy=el('details',{id:'labLegacyProjects'});legacy.append(el('summary',{},'ENSAIO DE SEÇÕES / ANTERIOR'));
 for(const id of ['labSectionDemo','labSectionRestore']){const button=document.getElementById(id);button.addEventListener('click',()=>manager.close());legacy.append(button);}manager.append(legacy);document.body.append(manager);
 const openManager=()=>{if(!isBusy()){manager.showModal();managerClose.focus();}};document.getElementById('labProjectOpen').onclick=openManager;managerClose.onclick=()=>manager.close();document.getElementById('labImportDocument').addEventListener('click',()=>manager.close());
 const dialog=el('dialog',{id:'labStoryDialog',class:'lab-story-dialog','aria-labelledby':'labStoryDialogTitle'}),form=el('form',{method:'dialog'}),header=el('header'),heading=el('h3',{id:'labStoryDialogTitle'},'Editar seção'),close=el('button',{type:'button','aria-label':'Fechar edição da seção'},'×');header.append(heading,close);
 const content=el('div',{class:'lab-story-dialog-content'}),role=el('select',{id:'labStoryRole'});for(const [value,label]of Object.entries(STORY_ROLES))role.add(new Option(label,value));
 const title=el('input',{id:'labStoryTitle',maxlength:'120',type:'text','data-lm-text-role':'body'}),body=el('textarea',{id:'labStoryBody',maxlength:'24000',rows:'8','data-lm-text-role':'body'}),photos=el('div',{id:'labStoryPhotos',class:'lab-story-photos'});
 const file=el('input',{id:'labStoryFiles',type:'file',accept:'image/png,image/jpeg,image/webp',multiple:'',hidden:''}),upload=el('button',{id:'labStoryUpload',type:'button'},'+ ADICIONAR FOTOS');
 for(const [text,input]of [['Tipo de seção',role],['Título',title],['Texto completo',body]]){content.append(el('label',{for:input.id},text),input);}
 content.append(el('p',{class:'detail'},'O texto fica fixo durante a sequência de fotos. Textos longos continuam completos no projeto e no PDF.'),el('h3',{},'FOTOS / ORDEM DE ENTRADA'),upload,file,photos);
 const status=el('output',{id:'labStoryDialogStatus',role:'status'}),footer=el('footer'),cancel=el('button',{type:'button'},'CANCELAR'),save=el('button',{id:'labStorySave',type:'submit'},'SALVAR SEÇÃO');footer.append(status,cancel,save);form.append(header,content,footer);dialog.append(form);document.body.append(dialog);
 let draft=null,topicId=null,loading=false,lastKey='',expandedId=null,lastSelected=null;
 const catalog=()=>getContext().photoCatalog;
 const photoUri=page=>page.composition.assets.find(asset=>asset.id===page.composition.pages[0].media.photoAssetId)?.uri||'';
 const error=message=>{status.textContent=message;status.dataset.state='error';};
 const action=async callback=>{if(isBusy()||loading)return;try{beforeEdit();await callback();}catch(error){onError(error.message);}};
 function renderPhotos(){
  photos.replaceChildren();const topic=storyTopic(draft,topicId);
  for(const [index,item]of topic.photos.entries()){
   const row=el('article',{class:'lab-story-photo','data-story-photo':item.page.id}),image=el('img',{src:photoUri(item.page),alt:'Foto '+(index+1)}),details=el('div'),caption=el('textarea',{'aria-label':'Legenda da foto '+(index+1),maxlength:'380',rows:'2'});caption.value=item.caption;
   caption.placeholder='Legenda / opcional';caption.onchange=()=>{try{draft=setStoryCaption(draft,topicId,item.page.id,caption.value,catalog());}catch(caught){error(caught.message);}};
   details.append(el('p',{},'FOTO '+String(index+1).padStart(2,'0')),caption);const actions=el('div',{class:'lab-story-photo-actions'});
   for(const [text,label,delta]of [['↑','Mover foto para antes',-1],['↓','Mover foto para depois',1]]){const button=el('button',{type:'button','aria-label':label},text);button.disabled=index+delta<0||index+delta>=topic.photos.length;button.onclick=()=>{try{draft=moveStoryPhoto(draft,topicId,item.page.id,delta,catalog());renderPhotos();}catch(caught){error(caught.message);}};actions.append(button);}
   const remove=el('button',{type:'button','aria-label':'Remover foto '+(index+1)},'REMOVER');remove.disabled=topic.photos.length===1;remove.onclick=()=>{try{draft=removeStoryPhoto(draft,topicId,item.page.id,catalog());renderPhotos();}catch(caught){error(caught.message);}};actions.append(remove);row.append(image,details,actions);photos.append(row);
  }
 }
 function open(id){
  if(isBusy())return;beforeEdit();draft=clone(getProject());topicId=id;const topic=storyTopic(draft,id);title.value=topic.title;body.value=topic.body;role.value=topic.role;role.disabled=topic.role==='cover';for(const option of role.options)option.disabled=option.value==='cover'&&topic.role!=='cover';status.textContent='';heading.textContent='Editar / '+STORY_ROLES[topic.role];renderPhotos();dialog.showModal();title.focus();
 }
 role.onchange=()=>{try{draft=setStoryRole(draft,topicId,role.value,catalog());}catch(caught){error(caught.message);}};
 const dismiss=()=>{if(!loading){dialog.close();draft=null;}};close.onclick=cancel.onclick=dismiss;dialog.addEventListener('cancel',event=>{if(loading)event.preventDefault();else draft=null;});
 form.onsubmit=async event=>{event.preventDefault();if(loading)return;save.disabled=true;try{draft=updateStoryText(draft,topicId,{title:title.value,body:body.value},catalog());await applyProject(draft,draft.story.topics.find(topic=>topic.id===topicId).photoPageIds[0]);dialog.close();draft=null;}catch(caught){error(caught.message);}finally{save.disabled=false;}};
 upload.onclick=()=>file.click();file.onchange=async()=>{
  const files=[...file.files];file.value='';if(!files.length)return;loading=true;upload.disabled=save.disabled=true;status.textContent='Preparando fotos…';
  try{const added=[];for(const selected of files){if(!['image/png','image/jpeg','image/webp'].includes(selected.type))throw Error('Use fotos PNG, JPEG ou WebP.');const url=URL.createObjectURL(selected);try{const image=new Image();image.src=url;await image.decode();const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const uri=canvas.toDataURL('image/webp',.82),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uri)))].map(n=>n.toString(16).padStart(2,'0')).join('');added.push({key:'loc-'+hash.slice(0,20),uri,name:selected.name});}finally{URL.revokeObjectURL(url);}}
   draft=addStoryPhotos(draft,topicId,added,catalog());renderPhotos();status.textContent=added.length+' foto(s) adicionada(s). Salve a seção para concluir.';
  }catch(caught){error(caught.message);}finally{loading=false;upload.disabled=save.disabled=false;}
 };
 start.onclick=()=>{manager.close();return action(createTemplate);};
 add.onclick=()=>action(async()=>{const project=getProject(),currentId=getContext().pageId,after=project.story.topics.find(topic=>topic.pageIds.includes(currentId))||project.story.topics.at(-1),next=addStoryTopic(project,after.id,'section',catalog());await applyProject(next);open(next.story.topics[next.story.topics.findIndex(topic=>topic.id===after.id)+1].id);});
 function render(){
  const project=getProject(),active=Boolean(project.story);panel.classList.toggle('lab-story-mode',active);tools.hidden=!active;
  if(!active){lastKey='';return;}
  for(const input of flags.querySelectorAll('input'))input.checked=project.story[input.dataset.storySetting];
  const current=getContext().pageId,key=JSON.stringify([project.story,project.pages.map(page=>[page.id,page.name,page.composition.pages[0].media.photoKey,page.composition.pages[0].text.title.value]),current]);if(key===lastKey)return;lastKey=key;list.replaceChildren();
  const selected=project.story.topics.find(topic=>topic.pageIds.includes(current));if(current!==lastSelected){expandedId=selected?.id;lastSelected=current;}
  for(const [index,topic]of project.story.topics.entries()){
   const view=storyTopic(project,topic.id),group=el('details',{class:'lab-story-group','data-story-topic':topic.id,'data-current':String(topic.id===selected?.id)}),head=el('summary'),label=el('span',{class:'lab-story-topic-label'});
   label.append(el('span',{},storyLabel(project,topic.id)),el('span',{class:'detail'},String(index).padStart(2,'0')+' / '+STORY_ROLES[topic.role]+' · '+view.photos.length+' foto'+(view.photos.length===1?'':'s')));
   head.append(label);group.append(head);group.open=topic.id===expandedId;group.addEventListener('toggle',()=>{if(group.open){expandedId=topic.id;for(const other of list.querySelectorAll('details[data-story-topic]'))if(other!==group)other.open=false;}else if(expandedId===topic.id)expandedId=null;});
   const content=el('div',{class:'lab-story-topic-content'}),edit=el('button',{type:'button','data-story-edit':topic.id},'EDITAR TEXTO E FOTOS');edit.onclick=()=>open(topic.id);content.append(edit);
   const photoGrid=el('div',{class:'lab-story-photo-grid'});
   for(const [imageIndex,item]of view.photos.entries()){const button=el('button',{type:'button',class:'lab-story-photo-select','data-page-id':item.page.id,'aria-pressed':String(item.page.id===current)});button.append(el('img',{src:photoUri(item.page),alt:''}),el('span',{},'Foto '+String(imageIndex+1).padStart(2,'0')));button.onclick=()=>action(()=>selectPage(item.page.id));photoGrid.append(button);}content.append(photoGrid);
   const readingPages=view.pages.filter(page=>!topic.photoPageIds.includes(page.id));if(readingPages.length){const reading=el('details',{class:'lab-story-reading-pages'});reading.append(el('summary',{},'PÁGINAS DE LEITURA / PDF'));for(const [n,page]of readingPages.entries()){const button=el('button',{type:'button','data-page-id':page.id,'aria-pressed':String(page.id===current)},page.composition.pages[0].text.title.value?'Abertura da seção':'Leitura / continuação '+(n+1));button.onclick=()=>action(()=>selectPage(page.id));reading.append(button);}content.append(reading);}
   const options=el('details',{class:'lab-story-section-options'}),actions=el('div',{class:'lab-story-section-actions'});options.append(el('summary',{},'ORDEM / EXCLUSÃO'));
   for(const [text,label,delta]of [['SUBIR','Mover seção para antes',-1],['DESCER','Mover seção para depois',1]]){const button=el('button',{type:'button','aria-label':label},text);button.disabled=index===0||index+delta<1||index+delta>=project.story.topics.length;button.onclick=()=>action(()=>applyProject(moveStoryTopic(getProject(),topic.id,delta,catalog())));actions.append(button);}
   if(index>0){const remove=el('button',{type:'button','aria-label':'Excluir seção '+view.title},'EXCLUIR');remove.onclick=()=>action(async()=>{if(!await confirmAction('Excluir a seção “'+view.title+'” e suas fotos desta apresentação?','EXCLUIR SEÇÃO'))return;await applyProject(removeStoryTopic(getProject(),topic.id,catalog()));});actions.append(remove);}options.append(actions);content.append(options);group.append(content);list.append(group);
  }
 }
 render();return {render,open,openManager};
}
