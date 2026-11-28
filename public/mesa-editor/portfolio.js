import { pickMesaMedia } from './acervo.mjs';
import { assetURL, portfolioAssetKey } from './acervo-reference.mjs';

function singleCaption(s){
 if(!s.caption_initialized){
  // Keep an existing custom edit; otherwise use the displayed-text baseline.
  const custom=typeof s.caption_official==='string'&&s.caption_official.length>0&&s.caption_official!==s.caption_original;
  s.caption_official=custom?s.caption_official:(s.caption_displayed_original??s.caption_official??'');
  s.caption_initialized=true;
 }
 return s;
}
const $=id=>document.getElementById(id);
let state,etag,projectId,slideId,dirty=false,undo=[],drag=null,previewIndex=0,saving=false;
const categories=()=>[...new Set([...(state.project_categories||[]),...state.projects.map(p=>p.category)])];
const project=()=>state.projects.find(p=>p.id===projectId);
const slide=()=>project().slides.find(s=>s.id===slideId);
function mediaUrl(project,file) {
  if (file.startsWith('youtube/')) return 'https://i.ytimg.com/vi/'+file.slice(8)+'/hqdefault.jpg';
  const slide = project.slides.find(item => [item.file,item.thumbnail,item.display_file].includes(file));
  if (slide?.asset_key) return assetURL(slide.asset_key);
  const url = '/mesa-media/'+[project.folder,...file.split('/')].map(encodeURIComponent).join('/');
  return slide?.media_version ? url+'?v='+encodeURIComponent(slide.media_version) : url;
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const media=(p,s,controls=false)=>s.type==='youtube'?(controls?'<iframe src="https://www.youtube-nocookie.com/embed/'+s.youtube_id+'" title="Vídeo do YouTube" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>':'<img src="'+mediaUrl(p,s.file)+'" alt="Vídeo do YouTube">'):(s.missing||s.sync_error)?'<div class="missingMedia">'+(s.missing?'Arquivo ausente na pasta':'Não foi possível ler a imagem')+'</div>':s.type==='video'?'<video src="'+mediaUrl(p,s.file)+'" preload="metadata" '+(controls?'controls':'muted')+'></video>':'<img src="'+mediaUrl(p,(!controls&&s.thumbnail)?s.thumbnail:(s.display_file||s.file))+'" alt="'+esc(s.alt||p.title)+'" loading="lazy">';
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',5000);}
function remember(){undo.push(JSON.stringify(state));if(undo.length>60)undo.shift();$('undo').disabled=false;}
function changed(){dirty=true;$('saveState').textContent='Alterações não salvas';}
function mutate(fn){remember();fn();changed();render();}
function renderProjects(){
 let out='',category='';
 for(const p of state.projects){if($('projectSearch').value&&!p.title.toLocaleLowerCase('pt-BR').includes($('projectSearch').value.toLocaleLowerCase('pt-BR')))continue;if(category!==p.category){category=p.category;out+='<div class="group">'+esc(category)+'</div>';}
 out+='<button class="project '+(p.id===projectId?'active':'')+'" draggable="true" data-project="'+esc(p.id)+'">'+(p.cover?(p.slides.find(s=>s.file===p.cover)?.type==='video'?'<video src="'+mediaUrl(p,p.cover)+'" muted playsinline preload="metadata"></video>':'<img src="'+mediaUrl(p,p.cover)+'" alt="">'):'<span class="emptyCover">＋</span>')+'<span>'+esc(p.title)+'<small>'+p.slides.filter(s=>s.included&&!s.missing&&!s.sync_error).length+' slides · '+(p.active===false?'Inativo':'Ativo')+'</small></span></button>';
 }$('projects').innerHTML=out||'<p class="muted">Nenhum projeto encontrado.</p>';
}
function renderGallery(){const p=project();$('category').textContent=p.category;$('title').textContent=p.title;$('progress').textContent=(p.active===false?'Inativo · ':'Ativo · ')+p.slides.filter(s=>s.included&&!s.missing&&!s.sync_error).length+' de '+p.slides.length+' slides incluídos';
 $('gallery').innerHTML=p.slides.map((s,i)=>'<button draggable="true" class="card '+(s.id===slideId?'selected ':'')+(!s.included?'excluded':'')+'" data-slide="'+esc(s.id)+'">'+media(p,s)+(p.cover===s.file?'<span class="badge">CAPA</span>':'')+'<div class="meta"><span class="num">'+String(i+1).padStart(2,'0')+' / '+(s.type==='youtube'?'YOUTUBE':s.type==='video'?'VÍDEO':'IMAGEM')+'</span><span class="caption">'+esc(s.caption_official.slice(0,90)||'Escrever legenda')+'</span><span class="state">'+''+(s.missing?' · ARQUIVO AUSENTE':'')+(s.sync_error?' · ERRO NO ARQUIVO':'')+(!s.included?' · fora da apresentação':'')+'</span></div></button>').join('');
}
function inspector(){const p=project(),s=slide(),i=p.slides.indexOf(s);$('inspector').hidden=!s;$('sendToComposition').hidden=window.parent===window||s?.type!=='image';if(!s)return;$('slideTitle').textContent='Imagem '+String(i+1).padStart(2,'0');$('selectedMedia').innerHTML=media(p,s,true);$('identity').textContent=s.original_name ? s.original_name+' · '+s.width+' × '+s.height+' · '+Math.round(s.bytes_optimized/1024)+' KB' : s.id;$('caption').value=s.caption_official;$('included').checked=s.included;$('cover').disabled=p.cover===s.file;$('cover').textContent=p.cover===s.file?'Capa atual do projeto':'Usar como capa do projeto';$('back').disabled=i===0;$('forward').disabled=i===p.slides.length-1;}
function render(){renderProjects();renderGallery();if(!project().slides.length)$('gallery').innerHTML='<div class="emptyProject">Seu projeto está pronto.<br>Adicione imagens pelo botão acima.</div>';inspector();$('undo').disabled=!undo.length;}
$('projects').onclick=e=>{const b=e.target.closest('[data-project]');if(!b)return;projectId=b.dataset.project;slideId=project().slides[0]?.id;render();};
$('gallery').onclick=e=>{const b=e.target.closest('[data-slide]');if(b){slideId=b.dataset.slide;renderGallery();inspector();if(innerWidth<=800)$("inspector").scrollIntoView({behavior:"smooth",block:"start"});}};
$('caption').onfocus=()=>remember();$('caption').oninput=()=>{slide().caption_official=$('caption').value;slide().caption_initialized=true;changed();renderGallery();};
$('included').onchange=()=>mutate(()=>slide().included=$('included').checked);
$('cover').onclick=()=>mutate(()=>{project().cover=slide().file;project().cover_mode='single';});
function move(delta){mutate(()=>{const list=project().slides,i=list.findIndex(s=>s.id===slideId);list.splice(i+delta,0,list.splice(i,1)[0]);});}
$('back').onclick=()=>move(-1);$('forward').onclick=()=>move(1);
$('undo').onclick=()=>{if(!undo.length)return;state=JSON.parse(undo.pop());if(!project())projectId=state.projects[0].id;if(!slide())slideId=project().slides[0]?.id;changed();render();};
for(const id of ['projects','gallery']){
 $(id).ondragstart=e=>{const b=e.target.closest('[data-slide],[data-project]');if(!b)return;drag={kind:id,id:b.dataset.slide||b.dataset.project};e.dataTransfer.setData('text/plain',drag.id);e.dataTransfer.effectAllowed='move';};
 $(id).ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';};
 $(id).ondrop=e=>{e.preventDefault();const b=e.target.closest('[data-slide],[data-project]');if(!b||!drag||drag.kind!==id)return;
 const target=b.dataset.slide||b.dataset.project;if(drag.id===target)return;
 if(id==='projects'&&state.projects.find(p=>p.id===drag.id).category!==state.projects.find(p=>p.id===target).category){toast('Reordene dentro da mesma categoria.');return;}
 mutate(()=>{const list=id==='projects'?state.projects:project().slides;const from=list.findIndex(x=>x.id===drag.id),to=list.findIndex(x=>x.id===target);list.splice(to,0,list.splice(from,1)[0]);});drag=null;};
}
$('save').onclick=async()=>{
 if(saving||uploading||syncing)return;saving=true;$('save').disabled=true;
 // Freeze the editable surface while committing this snapshot.
 document.querySelectorAll('main,aside,#inspector').forEach(el=>el.inert=true);
 try{const r=await fetch('/mesa-api/portfolio/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,etag})});const data=await r.json();if(!r.ok)throw Error(data.error);state=data.state;etag=data.etag;dirty=false;$('saveState').textContent='Salvo na prévia · '+new Date(state.updated_at).toLocaleTimeString('pt-BR');toast('Prévia atualizada. A versão anterior está no Histórico.');}
 catch(e){toast('Não foi possível salvar: '+e.message);}
 finally{saving=false;$('save').disabled=false;document.querySelectorAll('main,aside,#inspector').forEach(el=>el.inert=false);}
};
function download(name,text){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('export').onclick=()=>{download('curadoria-capitulo-2.json',JSON.stringify(state,null,2));toast('Exportação inclui todas as decisões atuais, mesmo antes de salvar.');};
function showPreview(){const list=project().slides.filter(s=>s.included&&!s.missing&&!s.sync_error);if(!list.length){toast('Inclua ao menos um slide na apresentação.');return false;}previewIndex=Math.max(0,Math.min(previewIndex,list.length-1));const s=list[previewIndex];$('previewTitle').textContent=project().title+(project().active===false?' · Inativo — prévia interna':'');$('previewMedia').innerHTML=media(project(),s,true);$('previewCaption').textContent=s.caption_official;$('previewCount').textContent=(previewIndex+1)+' / '+list.length;$('prevSlide').disabled=previewIndex===0;$('nextSlide').disabled=previewIndex===list.length-1;return true;}
$('preview').onclick=()=>{previewIndex=0;if(showPreview())$('previewDialog').showModal();};
$('closePreview').onclick=()=>$('previewDialog').close();
$('previewDialog').onclose=()=>$('previewMedia').innerHTML='';
$('prevSlide').onclick=()=>{previewIndex--;showPreview();};$('nextSlide').onclick=()=>{previewIndex++;showPreview();};
document.onkeydown=e=>{if($('previewDialog').open){if(e.key==='ArrowRight')$('nextSlide').click();if(e.key==='ArrowLeft')$('prevSlide').click();}else if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('save').click();}};
window.onbeforeunload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};
(async()=>{try{const r=await fetch('/mesa-api/portfolio/state');if(!r.ok)throw Error('Falha ao carregar catálogo');({state,etag}=await r.json());state.projects.forEach(p=>p.slides.forEach(singleCaption));projectId=state.projects[0].id;slideId=project().slides[0]?.id;render();$('pickSharedMedia').disabled=false;$('saveState').textContent=state.updated_at?'Todas as alterações salvas':'Pronto para começar';fetch('/mesa-api/portfolio/me').then(r=>r.json()).then(u=>$('syncStatus').textContent=u.email+' · Alterações salvas na prévia');}catch(e){$('saveState').textContent=e.message;}})();
let uploading=false;
$('addImages').onclick=()=>{if(!uploading)$('imageFiles').click();};
$('dropImages').onclick=()=>{if(!uploading)$('imageFiles').click();};
$('dropImages').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('dropImages').click();}};
$('imageFiles').onchange=()=>importImages([...$('imageFiles').files]);
$('dropImages').ondragover=e=>{e.preventDefault();$('dropImages').classList.add('over');};
$('dropImages').ondragleave=()=>$('dropImages').classList.remove('over');
$('dropImages').ondrop=e=>{e.preventDefault();$('dropImages').classList.remove('over');if(e.dataTransfer.files.length)importImages([...e.dataTransfer.files]);};
async function importImages(files){
 if(uploading||saving||syncing||!files.length)return;
 uploading=true;const p=project(),failures=[];let added=0,duplicates=0,bytesIn=0,bytesOut=0;
 remember();$('save').disabled=true;$('addImages').disabled=true;
 document.querySelectorAll('main,aside,#inspector').forEach(el=>el.inert=true);
 try{
 for(let i=0;i<files.length;i++){
 const file=files[i];$('uploadProgress').textContent='Otimizando '+(i+1)+' de '+files.length+': '+file.name;
 try{
 if(file.size>11*1024*1024)throw Error('Acima do limite da prévia');
 if(!/\.(jpe?g|png|webp|avif)$/i.test(file.name))throw Error('Formato não suportado');
 const bitmap=await createImageBitmap(file);
 const form=new FormData(); form.append('original',file);form.append('width',bitmap.width);form.append('height',bitmap.height);
 async function optimized(max,quality){const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não foi possível otimizar a imagem.')),'image/webp',quality));}
 try{form.append('optimized',await optimized(2560,.88),'imagem.webp');form.append('thumbnail',await optimized(480,.75),'mini.webp');}finally{bitmap.close();}
 const r=await fetch('/mesa-api/portfolio/upload?project='+encodeURIComponent(p.id),{method:'POST',body:form});
 const result=await r.json();if(!r.ok)throw Error(result.error);
 if(p.slides.some(s=>s.id===result.slide.id)){duplicates++;continue;}
 p.slides.push(singleCaption(result.slide));slideId=result.slide.id;added++;bytesIn+=result.slide.bytes_original;bytesOut+=result.slide.bytes_optimized;changed();
 }catch(e){failures.push(file.name+': '+e.message);}
 }
 render();
 const reduction=bytesIn?Math.round((1-bytesOut/bytesIn)*100):0;
 $('uploadProgress').textContent=added+' imagem(ns) adicionada(s). '+(reduction>0?reduction+'% menos peso. ':'')+(duplicates?duplicates+' já presente(s). ':'')+(failures.length?'Não importadas: '+failures.join('; '):'')+(added?' Clique em Salvar e atualizar site.':'');
 if(added)toast('Imagens adicionadas ao final. Arraste para posicionar e salve.');
 }finally{uploading=false;$('save').disabled=false;$('addImages').disabled=false;$('imageFiles').value='';document.querySelectorAll('main,aside,#inspector').forEach(el=>el.inert=false);}
}

const syncing=false;
document.addEventListener('dragend',()=>drag=null);

let creatingProject=false;
$('newProject').onclick=()=>{
 if(saving||uploading||syncing||creatingProject){toast('Aguarde a operação atual terminar.');return;}
 $('newProjectName').value='';$('newProjectError').textContent='';
 $('newProjectCategory').innerHTML=categories().map(c=>'<option>'+esc(c)+'</option>').join('');
 $('newProjectCategory').value=project().category;$('newProjectDialog').showModal();$('newProjectName').focus();
};
$('cancelProject').onclick=()=>$('newProjectDialog').close();
$('newProjectForm').onsubmit=async e=>{
 e.preventDefault();if(creatingProject||saving||uploading||syncing)return;
 creatingProject=true;saving=true;$('createProject').disabled=true;$('cancelProject').disabled=true;
 document.querySelectorAll('main,aside,#inspector,header').forEach(el=>el.inert=true);
 try{
 const r=await fetch('/mesa-api/portfolio/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,etag,title:$('newProjectName').value,category:$('newProjectCategory').value})});
 const data=await r.json();if(!r.ok)throw Error(data.error);
 state=data.state;etag=data.etag;projectId=data.project.id;slideId=undefined;dirty=false;undo=[];
 $('saveState').textContent='Projeto criado e alterações salvas';$('newProjectDialog').close();render();toast('Projeto criado. Adicione as primeiras imagens.');
 }catch(e){$('newProjectError').textContent=e.message;}
 finally{creatingProject=false;saving=false;$('createProject').disabled=false;$('cancelProject').disabled=false;document.querySelectorAll('main,aside,#inspector,header').forEach(el=>el.inert=false);}
};

$('editProject').onclick=()=>{const p=project();$('projectCategory').innerHTML=categories().map(c=>'<option>'+esc(c)+'</option>').join('');$('projectCategory').value=p.category;$('projectActive').checked=p.active!==false;$('projectName').value=p.title;$('projectYear').value=p.year||'';$('projectSummary').value=p.summary||'';$('projectBody').value=(p.body||[]).join('\n\n');$('projectCovers').innerHTML=p.slides.filter(s=>['image','video','youtube'].includes(s.type)&&!s.missing&&!s.sync_error).map((s,i)=>'<label class="coverOption"><input type="radio" name="projectCover" value="'+esc(s.file)+'" '+(p.cover===s.file?'checked':'')+'>'+media(p,s)+'<span>'+(s.type==='youtube'?'YouTube ':s.type==='video'?'Vídeo ':'Imagem ')+(i+1)+'</span></label>').join('')||'<p class="muted">Adicione imagens ao projeto para escolher a capa.</p>';$('coverMode').value=p.cover_mode||'single';$('coverInterval').value=p.cover_interval||5;$('sequenceSettings').hidden=$('coverMode').value!=='sequence';document.querySelector('#projectDialog .coverPicker').hidden=$('coverMode').value==='sequence';$('sequenceImages').innerHTML=p.slides.filter(s=>s.type==='image'&&!s.missing&&!s.sync_error).map((s,i)=>'<label class="coverOption"><input type="checkbox" name="coverSequence" value="'+esc(s.file)+'" '+((p.cover_sequence||[]).includes(s.file)?'checked':'')+'><img src="'+mediaUrl(p,s.thumbnail||s.display_file||s.file)+'" alt=""><span>Imagem '+(i+1)+'</span></label>').join('');$('projectDialog').showModal();};
$('cancelTexts').onclick=()=>$('projectDialog').close();
$('projectForm').onsubmit=e=>{e.preventDefault();if($('coverMode').value==='sequence'&&document.querySelectorAll('input[name=coverSequence]:checked').length<2){toast('Selecione pelo menos duas imagens para a sequência.');return;}mutate(()=>{const p=project();state.project_categories=categories();const category=$('projectCategory').value;if(category!==p.category){state.projects.splice(state.projects.indexOf(p),1);p.category=category;const end=state.projects.findLastIndex(x=>x.category===category);state.projects.splice(end<0?state.projects.length:end+1,0,p);}p.cover_mode=$('coverMode').value;p.cover_interval=Number($('coverInterval').value);p.cover_sequence=Array.from(document.querySelectorAll('input[name=coverSequence]:checked')).map(el=>el.value);const cover=document.querySelector('input[name=projectCover]:checked');if(cover)p.cover=cover.value;if(p.cover_mode==='sequence')p.cover=p.cover_sequence[0];p.active=$('projectActive').checked;p.title=$('projectName').value.trim();p.year=$('projectYear').value.trim();p.summary=$('projectSummary').value.trim();p.body=$('projectBody').value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);});$('projectDialog').close();toast('Projeto atualizado. Salve para registrar na nuvem.');};
$('closeHistory').onclick=()=>$('historyDialog').close();
$('history').onclick=async()=>{if(saving||uploading)return;$('historyDialog').showModal();$('historyList').textContent='Carregando…';try{const r=await fetch('/mesa-api/portfolio/history'),data=await r.json();if(!r.ok)throw Error(data.error);$('historyList').innerHTML=data.versions.length?data.versions.map(v=>'<div class="historyRow"><span>Versão '+v.revision+'<small>'+esc(new Date(v.created_at).toLocaleString('pt-BR'))+' · '+esc(v.created_by)+'</small></span><button data-restore="'+v.revision+'">Restaurar</button></div>').join(''):'Seu primeiro salvamento criará uma versão no histórico.';}catch(e){$('historyList').textContent=e.message;}};
$('historyList').onclick=async e=>{const b=e.target.closest('[data-restore]');if(!b)return;if(dirty){toast('Salve ou exporte suas alterações e recarregue antes de restaurar.');return;}if(!confirm('Restaurar os textos, capas e a ordem da versão '+b.dataset.restore+'? O estado atual ficará no histórico.'))return;b.disabled=true;try{const r=await fetch('/mesa-api/portfolio/history/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:b.dataset.restore,etag})}),data=await r.json();if(!r.ok)throw Error(data.error);state=data.state;etag=data.etag;undo=[];render();$('saveState').textContent='Versão restaurada e salva na nuvem';$('historyDialog').close();toast('Versão restaurada.');}catch(e){toast(e.message);}finally{b.disabled=false;}};

function youtubeId(value){try{const u=new URL(value.trim());if(u.protocol!=='https:'&&u.protocol!=='http:')return null;const host=u.hostname.toLowerCase();let id;if(host==='youtu.be')id=u.pathname.split('/')[1];else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){id=u.pathname==='/watch'?u.searchParams.get('v'):(/^\/(shorts|embed|live)\//.test(u.pathname)?u.pathname.split('/')[2]:null);}return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;}catch{return null;}}
$('addYoutube').onclick=()=>{$('youtubeForm').reset();$('youtubeError').textContent='';$('youtubePosition').max=project().slides.length+1;$('youtubePosition').value=project().slides.length+1;$('youtubeDialog').showModal();};
$('cancelYoutube').onclick=()=>$('youtubeDialog').close();
$('youtubeForm').onsubmit=e=>{e.preventDefault();const id=youtubeId($('youtubeUrl').value);if(!id){$('youtubeError').textContent='Cole um link válido do YouTube (vídeo, Shorts ou live).';return;}if(project().slides.some(s=>s.youtube_id===id)){ $('youtubeError').textContent='Este vídeo já está na galeria deste projeto.';return;}mutate(()=>{const p=project(),s={id:p.id+'/youtube/'+crypto.randomUUID(),file:'youtube/'+id,type:'youtube',youtube_id:id,caption_official:$('youtubeCaption').value,caption_initialized:true,included:true,alt:''};p.slides.splice(Math.max(0,Math.min(p.slides.length,Number($('youtubePosition').value)-1)),0,s);slideId=s.id;});$('youtubeDialog').close();toast('Vídeo adicionado. Salve as alterações para registrar na nuvem.');};

$('deleteSlide').onclick=async()=>{
 if(saving||uploading||syncing||!slide())return;
 const selected=slide(),p=project(),index=p.slides.indexOf(selected);
 const warning='Excluir este item da galeria?'+(p.cover===selected.file?' Ele é a capa atual; o projeto ficará sem capa até você escolher outra.':'')+' A exclusão e as alterações pendentes serão salvas na nuvem. Você poderá recuperar pelo Histórico.';
 if(!confirm(warning))return;
 saving=true;document.querySelectorAll('main,aside,#inspector,header').forEach(el=>el.inert=true);
 try{const r=await fetch('/mesa-api/portfolio/slides/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,etag,projectId,slideId:selected.id})});const data=await r.json();if(!r.ok)throw Error(data.error);state=data.state;etag=data.etag;dirty=false;undo=[];slideId=project().slides[Math.min(index,project().slides.length-1)]?.id;render();$('saveState').textContent='Exclusão salva na nuvem';toast('Item excluído da galeria. A versão anterior está no Histórico.');}catch(e){toast('Não foi possível excluir: '+e.message);}finally{saving=false;document.querySelectorAll('main,aside,#inspector,header').forEach(el=>el.inert=false);}
};

$('coverMode').onchange=()=>{$('sequenceSettings').hidden=$('coverMode').value!=='sequence';document.querySelector('#projectDialog .coverPicker').hidden=$('coverMode').value==='sequence';};

$('projectSearch').addEventListener('input',()=>{if(state)renderProjects()});document.querySelector('.editorMore').addEventListener('click',e=>{if(e.target.closest('button'))document.querySelector('.editorMore').open=false});document.addEventListener('click',e=>{if(!e.target.closest('.editorMore'))document.querySelector('.editorMore').open=false});

// A Mesa encaminha a imagem selecionada ao motor original do Compor.
$('sendToComposition').onclick=()=>{
  const activeProject=project(), item=slide();
  if(window.parent===window||item?.type!=='image')return;
  window.parent.postMessage({ type:'mesa:compose-image', url:assetURL(portfolioAssetKey(activeProject,item)), label:item.alt||activeProject.title },location.origin);
};

$('pickSharedMedia').onclick=async()=>{
  if (!state || saving || uploading) return;
  const item = await pickMesaMedia('image');
  if (!item) return;
  const target = project();
  const existing = target.slides.find(entry => entry.type === 'image' && portfolioAssetKey(target,entry) === item.key);
  if (existing) {
    slideId = existing.id;
    render();
    toast('Esta imagem já está na galeria de '+target.title+'.');
    return;
  }
  const file = 'acervo/'+item.key;
  mutate(()=>{
    slideId = target.id+'/'+file;
    target.slides.push({id:slideId,file,asset_key:item.key,type:'image',alt:item.alt || item.name,
      included:true,caption_official:'',caption_initialized:true});
  });
  toast('Imagem do acervo adicionada à galeria. Salve para atualizar a prévia.');
};
