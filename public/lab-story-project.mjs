import {createPage,sequenceDocument,readSequence,privatePhotoCatalog} from './lab-sequence.mjs?v=20261118-apresentacoes';
import {createProductionDocument,verifyRoundTrip} from './composicao-document.mjs';
import {STORY_TEMPLATE,STORY_ROLES,storyTopic,normalizeStory} from './lab-story-model.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const topicsOf=project=>project.story.topics;
const check=(value,message)=>{if(!value)throw Error(message);};
function catalogOf(project,base){let catalog={...base};for(const page of project.pages)catalog=privatePhotoCatalog(page.composition,catalog);return catalog;}
function checked(project,catalog){normalizeStory(project.story,project.pages);readSequence(project,catalog,null);return project;}
function rebuild(project,page,state,catalog){page.composition=createProductionDocument({state,photoCatalog:catalog,maxEdge:page.composition.output.maxEdge});}
function stateOf(page,catalog){return verifyRoundTrip(page.composition,privatePhotoCatalog(page.composition,catalog));}
function flatten(project){const lookup=new Map(project.pages.map(page=>[page.id,page]));project.pages=topicsOf(project).flatMap(topic=>topic.pageIds.map(id=>lookup.get(id)));}
function actTitles(project,catalog){let number=0;for(const topic of topicsOf(project)){if(topic.role!=='act')continue;number++;const page=project.pages.find(page=>page.id===topic.pageIds[0]),state=stateOf(page,catalog);state.title='ATO '+number+':\n'+state.title.replace(/^ATO\s+\d+:?\s*/i,'');rebuild(project,page,state,catalog);}}
export function splitStoryBody(value,max=380){
 check(typeof value==='string'&&value.length<=24000,'Use até 24.000 caracteres por seção.');const chunks=[];let remaining=value;
 while(remaining.length>max){let cut=remaining.lastIndexOf(' ',max);const paragraph=remaining.lastIndexOf('\n',max);cut=Math.max(cut,paragraph);if(cut<1)cut=max;if(/[\uD800-\uDBFF]/.test(remaining[cut-1])&&/[\uDC00-\uDFFF]/.test(remaining[cut]))cut--;chunks.push(remaining.slice(0,cut));remaining=remaining.slice(cut);}
 if(remaining)chunks.push(remaining);return chunks;
}
function writeText(project,id,{title,body},catalog){
 const topic=topicsOf(project).find(item=>item.id===id);check(topic,'Seção não encontrada.');check(typeof title==='string'&&title.length<=120,'Use até 120 caracteres no título.');
 const chunks=splitStoryBody(body),byId=new Map(project.pages.map(page=>[page.id,page]));let slots=topic.pageIds.filter(pageId=>!topic.captionPageIds.includes(pageId)&&(!title.trim()||pageId!==topic.pageIds[0]));
 const first=byId.get(topic.pageIds[0]),base=stateOf(first,catalog);
 // A chapter heading receives its own native frame. Body continuations cannot
 // collide with a large title in the PDF; the website reunites the same text.
 if(title.trim()&&!topic.captionPageIds.includes(first.id)){const headingState=stateOf(first,catalog);headingState.body='';headingState.bodyMode='oculto';rebuild(project,first,headingState,catalog);}
 // Captions occupy a native body field; long reading receives its own native
 // continuation pages instead of replacing a caption or truncating the text.
 while(slots.length<chunks.length){check(project.pages.length<100,'O texto exige mais de 100 páginas. Divida a apresentação.');
  const page=createPage({id:uid('story-text'),name:'Texto / continuação',state:{...base,title:'',titleFonts:[],body:'',bodyMode:'oculto'},photoCatalog:catalog,maxEdge:first.composition.output.maxEdge});project.pages.push(page);byId.set(page.id,page);topic.pageIds.push(page.id);slots.push(page.id);
 }
 topic.joins={};for(const [index,pageId]of slots.entries()){const page=byId.get(pageId),state=stateOf(page,catalog);state.body=chunks[index]??'';state.bodyMode=state.body?'visivel':'oculto';rebuild(project,page,state,catalog);if(index>0&&state.body)topic.joins[pageId]='';}
 const firstState=stateOf(first,catalog),nextTitle=topic.role==='act'?'ATO '+storyTopic(project,id).act+':\n'+title:title;if(firstState.title!==nextTitle)firstState.titleFonts=[];firstState.title=nextTitle;rebuild(project,first,firstState,catalog);
 // Only generated, empty continuations are removed. Author-created pages and
 // every photograph, caption, motion and clip remain in the project.
 const empty=topic.pageIds.filter(pageId=>pageId.startsWith('story-text-')&&!topic.photoPageIds.includes(pageId)).filter(pageId=>{const page=byId.get(pageId),native=page.composition.pages[0];return !native.text.title.value&&!native.text.body.value&&!page.motions.length&&!(page.clips||[]).length&&!page.gallery&&!page.backgroundVideo;});
 topic.pageIds=topic.pageIds.filter(pageId=>!empty.includes(pageId));project.pages=project.pages.filter(page=>!empty.includes(page.id));flatten(project);
}
export function updateStoryText(input,id,value,baseCatalog){const project=clone(input),catalog=catalogOf(project,baseCatalog);writeText(project,id,value,catalog);return checked(project,catalog);}
export function setStoryCaption(input,topicId,pageId,caption,baseCatalog){
 check(typeof caption==='string'&&caption.length<=380,'Use até 380 caracteres na legenda.');const project=clone(input),catalog=catalogOf(project,baseCatalog),before=storyTopic(project,topicId),topic=topicsOf(project).find(item=>item.id===topicId);check(topic.photoPageIds.includes(pageId),'Imagem não encontrada.');
 topic.captionPageIds=topic.captionPageIds.filter(id=>id!==pageId);if(caption)topic.captionPageIds.push(pageId);
 const page=project.pages.find(page=>page.id===pageId),state=stateOf(page,catalog);state.body=caption;state.bodyMode=caption?'visivel':'oculto';rebuild(project,page,state,catalog);
 writeText(project,topicId,{title:before.title,body:before.body},catalog);return checked(project,catalog);
}
export function addStoryPhotos(input,topicId,photos,baseCatalog){
 const project=clone(input),catalog=catalogOf(project,baseCatalog),topic=topicsOf(project).find(item=>item.id===topicId);check(topic,'Seção não encontrada.');const first=project.pages.find(page=>page.id===topic.pageIds[0]),base=stateOf(first,catalog);
 check(project.pages.length+photos.length<=100,'Use até 100 páginas por apresentação.');
 for(const photo of photos){check(/^loc-[a-z0-9]{10,25}$/.test(photo.key),'Identificador da fotografia inválido.');catalog[photo.key]=photo.uri;
  const page=createPage({id:uid('story-photo'),name:photo.name.slice(0,120),state:{...base,photo:photo.key,background:'photo',title:'',titleFonts:[],body:'',bodyMode:'oculto',focusX:50,focusY:50},photoCatalog:catalog,maxEdge:first.composition.output.maxEdge});project.pages.push(page);topic.pageIds.push(page.id);topic.photoPageIds.push(page.id);
 }
 flatten(project);return checked(project,catalog);
}
export function moveStoryPhoto(input,topicId,pageId,delta,baseCatalog){
 const project=clone(input),catalog=catalogOf(project,baseCatalog),before=storyTopic(project,topicId),topic=topicsOf(project).find(item=>item.id===topicId),index=topic.photoPageIds.indexOf(pageId),target=index+delta;check([-1,1].includes(delta)&&index>=0&&target>=0&&target<topic.photoPageIds.length,'Ordem da fotografia inválida.');
 const first=project.pages.find(page=>page.id===pageId),second=project.pages.find(page=>page.id===topic.photoPageIds[target]),a=stateOf(first,catalog),b=stateOf(second,catalog);
 // Move the complete visual between stable page slots. Reading stays in order,
 // and PDF/PNG/MP4 inherit exactly the same photograph order as the website.
 const visual=['format','background','color','photo','photoContrast','photoEffect','photoBlur','photoGlass','focusX','focusY','mContent','mPresentation','mScale','mPositionY','mExpandedPositionY','mCaption','marker','markerFocus','symbol','mContinuousVersion'];
 const nextA={...a},nextB={...b};for(const key of visual){if(Object.hasOwn(b,key))nextA[key]=b[key];else delete nextA[key];if(Object.hasOwn(a,key))nextB[key]=a[key];else delete nextB[key];}
 const captionA=topic.captionPageIds.includes(first.id)?a.body:'',captionB=topic.captionPageIds.includes(second.id)?b.body:'';
 topic.captionPageIds=topic.captionPageIds.filter(id=>id!==first.id&&id!==second.id);if(captionB)topic.captionPageIds.push(first.id);if(captionA)topic.captionPageIds.push(second.id);nextA.body=captionB;nextA.bodyMode=captionB?'visivel':'oculto';nextB.body=captionA;nextB.bodyMode=captionA?'visivel':'oculto';
 rebuild(project,first,nextA,catalog);rebuild(project,second,nextB,catalog);
 for(const key of ['name','motions','clips','backgroundVideo','gallery']){const x=first[key],y=second[key];if(y===undefined)delete first[key];else first[key]=y;if(x===undefined)delete second[key];else second[key]=x;}
 writeText(project,topicId,{title:before.title,body:before.body},catalog);return checked(project,catalog);
}
export function removeStoryPhoto(input,topicId,pageId,baseCatalog){
 const project=clone(input),catalog=catalogOf(project,baseCatalog),before=storyTopic(project,topicId),topic=topicsOf(project).find(item=>item.id===topicId);check(topic.photoPageIds.length>1,'Mantenha ao menos uma imagem na seção.');check(topic.photoPageIds.includes(pageId),'Fotografia não encontrada.');
 // The first native page owns the heading and its styles. Keep it as a text
 // page when its photograph is removed, so no content or identity is lost.
 topic.photoPageIds=topic.photoPageIds.filter(id=>id!==pageId);topic.captionPageIds=topic.captionPageIds.filter(id=>id!==pageId);
 if(pageId!==topic.pageIds[0]){topic.pageIds=topic.pageIds.filter(id=>id!==pageId);project.pages=project.pages.filter(page=>page.id!==pageId);}
 else{const first=project.pages.find(page=>page.id===pageId),next=project.pages.find(page=>page.id===topic.photoPageIds[0]),state=stateOf(first,catalog),photoState=stateOf(next,catalog);state.photo=photoState.photo;rebuild(project,first,state,catalog);}
 writeText(project,topicId,{title:before.title,body:before.body},catalog);return checked(project,catalog);
}
export function setStoryRole(input,id,role,baseCatalog){const project=clone(input),catalog=catalogOf(project,baseCatalog),topic=topicsOf(project).find(item=>item.id===id),before=storyTopic(project,id);check(Object.hasOwn(STORY_ROLES,role)&&role!=='cover'&&topic.role!=='cover','A abertura é sempre a primeira seção.');topic.role=role;writeText(project,id,{title:before.title,body:before.body},catalog);actTitles(project,catalog);return checked(project,catalog);}
export function moveStoryTopic(input,id,delta,baseCatalog){const project=clone(input),catalog=catalogOf(project,baseCatalog),index=topicsOf(project).findIndex(topic=>topic.id===id),target=index+delta;check(index>0&&target>0&&target<topicsOf(project).length,'A abertura deve permanecer no início.');const [topic]=topicsOf(project).splice(index,1);topicsOf(project).splice(target,0,topic);flatten(project);actTitles(project,catalog);return checked(project,catalog);}
export function removeStoryTopic(input,id,baseCatalog){const project=clone(input),catalog=catalogOf(project,baseCatalog),topic=topicsOf(project).find(item=>item.id===id);check(topic&&topic.role!=='cover','A abertura não pode ser excluída.');project.story.topics=topicsOf(project).filter(item=>item.id!==id);project.pages=project.pages.filter(page=>!topic.pageIds.includes(page.id));actTitles(project,catalog);return checked(project,catalog);}
export function addStoryTopic(input,afterId,role,baseCatalog){
 const project=clone(input),catalog=catalogOf(project,baseCatalog);check(topicsOf(project).length<30&&project.pages.length<100,'O modelo aceita até 30 seções e 100 páginas.');check(Object.hasOwn(STORY_ROLES,role)&&role!=='cover','Tipo de seção inválido.');
 const previous=topicsOf(project).find(topic=>topic.id===afterId)||topicsOf(project).at(-1),source=project.pages.find(page=>page.id===previous.photoPageIds[0]),state=stateOf(source,catalog),page=createPage({id:uid('story-photo'),name:STORY_ROLES[role],state:{...state,title:STORY_ROLES[role].toLocaleUpperCase('pt-BR'),titleFonts:[],body:'',bodyMode:'oculto'},photoCatalog:catalog,maxEdge:source.composition.output.maxEdge});
 const topic={id:uid('topic'),role,pageIds:[page.id],photoPageIds:[page.id],captionPageIds:[],joins:{}};project.pages.push(page);topicsOf(project).splice(topicsOf(project).indexOf(previous)+1,0,topic);flatten(project);actTitles(project,catalog);return checked(project,catalog);
}
export function createStoryTemplate({state,photoCatalog,name='Nova apresentação',signature=state.signature,minimal=false}){
 const roles=minimal?['cover','introduction']:['cover','introduction','experience',...Array(5).fill('act'),'details','closing'],pages=[],topics=[];let act=0;
 for(const role of roles){const title=role==='cover'?name:role==='act'?'ATO '+(++act)+':\nTÍTULO DO ATO':STORY_ROLES[role].toLocaleUpperCase('pt-BR');
  const page=createPage({id:uid('story-photo'),name:role==='act'?'Ato '+act:STORY_ROLES[role],state:{...state,format:'horizontal',background:'photo',mContent:'off',marker:'none',guides:'nenhuma',photoContrast:45,photoEffect:'auto',photoBlur:0,photoGlass:0,title,titleFonts:[],type:role==='act'?'alternada':'perpetua',titleScale:75,textWidth:70,textPositionY:50,margin:9,inkColor:'white',body:'',bodyMode:'oculto',signature},photoCatalog,maxEdge:1920});pages.push(page);topics.push({id:uid('topic'),role,pageIds:[page.id],photoPageIds:[page.id],captionPageIds:[],joins:{}});
 }
 return sequenceDocument(name,pages,null,signature,[],{template:STORY_TEMPLATE,version:1,topics,mTransition:true,actEntrances:true});
}
export function syncStoryReading(pages,current,story,photoCatalog){
 if(!story)return pages;const topic=story.topics.find(item=>item.pageIds.includes(pages[current].id));if(!topic)return pages;const source=stateOf(pages[current],photoCatalog);
 return pages.map(page=>{if(!topic.pageIds.includes(page.id)||page.id===pages[current].id)return page;const state=stateOf(page,photoCatalog),next=clone(page);
  for(const key of ['margin','textWidth','textPositionY','type','titleScale','inkColor','autoInkVersion'])state[key]=source[key];
  next.composition=createProductionDocument({state,photoCatalog,maxEdge:page.composition.output.maxEdge});return next;
 });
}
