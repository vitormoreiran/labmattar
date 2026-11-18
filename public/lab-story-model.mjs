// Editorial structure references the native pages. Text and images have one
// source of truth, shared by editing, saved projects and every export adapter.
export const STORY_TEMPLATE='mattar-apresentacoes-01';
export const STORY_ROLES={cover:'Abertura',introduction:'Introdução',experience:'Experiência',act:'Ato',section:'Seção',details:'Detalhes',closing:'Encerramento'};
const check=(condition,message)=>{if(!condition)throw Error('Apresentação incompatível: '+message);};
const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
export function normalizeStory(value,pages){
 if(value==null)return null;
 check(keys(value,['template','version','topics','mTransition','actEntrances'])&&value.template===STORY_TEMPLATE&&value.version===1,'modelo');
 check(typeof value.mTransition==='boolean'&&typeof value.actEntrances==='boolean','movimento do modelo');
 check(Array.isArray(value.topics)&&value.topics.length>0&&value.topics.length<=30,'use de 1 a 30 seções');
 const pageIds=new Set(pages.map(page=>page.id)),topicIds=new Set(),members=[];
 const topics=value.topics.map(topic=>{
  check(keys(topic,['id','role','pageIds','photoPageIds','captionPageIds','joins'])&&identifier(topic.id)&&!topicIds.has(topic.id),'identificador da seção');topicIds.add(topic.id);
  check(Object.hasOwn(STORY_ROLES,topic.role),'tipo da seção');
  check(Array.isArray(topic.pageIds)&&topic.pageIds.length>0&&topic.pageIds.every(id=>pageIds.has(id))&&new Set(topic.pageIds).size===topic.pageIds.length,'páginas da seção');members.push(...topic.pageIds);
  check(Array.isArray(topic.photoPageIds)&&topic.photoPageIds.length>0&&topic.photoPageIds.every(id=>topic.pageIds.includes(id))&&new Set(topic.photoPageIds).size===topic.photoPageIds.length,'imagens da seção');
  const captions=topic.captionPageIds??[];check(Array.isArray(captions)&&captions.every(id=>topic.photoPageIds.includes(id))&&new Set(captions).size===captions.length,'legendas da seção');
  const joins=topic.joins??{};check(keys(joins,topic.pageIds)&&Object.values(joins).every(join=>join===''||join==='\n\n'),'continuação do texto');
  return {id:topic.id,role:topic.role,pageIds:[...topic.pageIds],photoPageIds:[...topic.photoPageIds],captionPageIds:[...captions],joins:{...joins}};
 });
 check(topics[0].role==='cover'&&topics.filter(topic=>topic.role==='cover').length===1,'a primeira seção deve ser a única abertura');
 check(members.length===pages.length&&members.every((id,index)=>id===pages[index].id),'as páginas devem pertencer a uma seção e seguir sua ordem');
 return {template:STORY_TEMPLATE,version:1,topics,mTransition:value.mTransition,actEntrances:value.actEntrances};
}
export function storyTopic(project,id){
 const topic=project.story?.topics.find(item=>item.id===id);if(!topic)throw Error('Seção não encontrada.');
 const lookup=new Map(project.pages.map(page=>[page.id,page])),pages=topic.pageIds.map(id=>lookup.get(id)),first=pages[0].composition.pages[0];
 let body='';for(const page of pages){const text=page.composition.pages[0].text.body;if(topic.captionPageIds.includes(page.id)||!text.visible||!text.value)continue;body+=(body?(topic.joins[page.id]??'\n\n'):'')+text.value;}
 const act=topic.role==='act'?project.story.topics.filter(item=>item.role==='act').findIndex(item=>item.id===id)+1:null;
 const rawTitle=first.text.title.value,title=topic.role==='act'?rawTitle.replace(/^ATO\s+\d+:?\s*/i,''):rawTitle;
 return {...topic,pages,first,rawTitle,title,body,act,photos:topic.photoPageIds.map(id=>{const page=lookup.get(id),native=page.composition.pages[0];return {page,native,caption:topic.captionPageIds.includes(id)?native.text.body.value:''};})};
}
export function storyCaption(project,topicId,pageId){const topic=project.story.topics.find(item=>item.id===topicId);return topic.captionPageIds.includes(pageId)?project.pages.find(page=>page.id===pageId).composition.pages[0].text.body.value:'';}
export function storyLabel(project,topicId){const topic=storyTopic(project,topicId);return topic.role==='act'?'Ato '+topic.act+' / '+topic.title.replace(/\s+/g,' '):topic.title.replace(/\s+/g,' ')||STORY_ROLES[topic.role];}
