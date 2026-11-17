import {galleryCells,containImage} from './lab-gallery-model.mjs';
const element=(tag,attrs={},text)=>{const node=document.createElement(tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node;};
export function installGalleryEditor({board,container,getState,onChange,onError}){
 if(!board||!container)return null;
 if(!document.querySelector('link[data-gallery-styles]'))document.head.append(element('link',{rel:'stylesheet',href:'/composicao-gallery.css', 'data-gallery-styles':''}));
 const layer=element('div',{id:'labGalleryLayer',class:'lab-gallery-layer','aria-label':'Imagens da página'});board.append(layer);
 const tools=element('details',{class:'lab-gallery-tools'}),summary=element('summary',{},'IMAGENS DA PÁGINA');
 const add=element('button',{type:'button',id:'labGalleryAdd'},'+ ADICIONAR IMAGENS');
 const file=element('input',{type:'file',accept:'image/png,image/jpeg,image/webp',multiple:'',hidden:'',id:'labGalleryFiles'});
 const hint=element('p',{class:'lm-ctrl-helper'},'As imagens ficam inteiras. Organize a sequência e as legendas abaixo.');
 const columns=element('select',{id:'labGalleryColumns','aria-label':'Colunas da galeria'});
 for(let n=1;n<=5;n++)columns.add(new Option(n+' coluna'+(n>1?'s':''),String(n)));
 const label=element('label',{for:'labGalleryColumns'},'COLUNAS'),list=element('div',{class:'lab-gallery-list',id:'labGalleryList'}),status=element('output',{id:'labGalleryStatus',role:'status'});
 tools.append(summary,add,file,hint,label,columns,list,status);(container.querySelector('.lm-lab-fields')||container).append(tools);
 let key='',loading=false,lastAssets=null;const cache=new Map();
 const lookup=()=>new Map(getState().assets.map(asset=>[asset.id,asset]));
 const bitmap=asset=>{if(!cache.has(asset.uri))cache.set(asset.uri,(async()=>{const img=new Image();img.src=asset.uri;await img.decode();return img;})());return cache.get(asset.uri);};
 const update=async(gallery,assets=[],create=false)=>{const state=getState();try{await onChange({pageId:state.pageId,gallery,assets,create});}catch(error){onError(error.message);}render();};
 function cells(width=board.offsetWidth,height=board.offsetHeight){
  const {gallery}=getState(),reading=board.querySelector('#labCopy'),state=getState().state;
  const hasText=Boolean(state?.title?.trim()||(state?.bodyMode==='visivel'&&state.body?.trim()));
  const rect=board.getBoundingClientRect(),copy=reading?.getBoundingClientRect(),zoom=rect.width/board.offsetWidth||1;
  const text=hasText&&copy?{x:(copy.x-rect.x)/zoom,y:(copy.y-rect.y)/zoom,w:copy.width/zoom,h:copy.height/zoom}:null;
  const gap=height*.025;let top=Math.max(height*.2,width*(state?.margin??8)/100),bottom=height-top;
  for(const slot of board.querySelectorAll('#labSignatureLayer [data-corner]')){
   const box=slot.getBoundingClientRect();if(!box.width||!box.height)continue;
   if(['tl','tr'].includes(slot.dataset.corner))top=Math.max(top,(box.bottom-rect.top)/zoom+gap);
   if(['bl','br'].includes(slot.dataset.corner))bottom=Math.min(bottom,(box.top-rect.top)/zoom-gap);
  }
  return galleryCells(gallery,width,height,{margin:state?.margin??8,text,top,bottom});
 }
 function position(){
  const state=getState();layer.hidden=!state.gallery;
  board.dataset.galleryOnly=String(Boolean(state.gallery)&&!state.state?.title?.trim()&&!(state.state?.bodyMode==='visivel'&&state.state?.body?.trim()));
  if(!state.gallery)return;
  try{
   for(const cell of cells()){
    const figure=[...layer.children].find(node=>node.dataset.galleryOccurrence===cell.item.id);if(!figure)continue;
    Object.assign(figure.style,{left:cell.x+'px',top:cell.y+'px',width:cell.w+'px',height:(cell.h+cell.captionH)+'px'});
    figure.querySelector('img').style.height=cell.h+'px';const caption=figure.querySelector('figcaption');if(caption){caption.style.height=cell.captionH+'px';caption.style.paddingTop=cell.captionH?'8px':'0';if(caption.scrollHeight>caption.clientHeight+2)throw Error('A legenda precisa de mais espaço. Reduza as colunas ou use outra página.');}
   }
   if(!loading){status.textContent='';status.dataset.state='idle';}
  }catch(error){layer.hidden=true;status.textContent=error.message;status.dataset.state='error';}
 }
 function render(){
  const state=getState(),nextKey=JSON.stringify([state.pageId,state.gallery,state.assets.map(a=>a.id)]);
  if(lastAssets!==state.assets){lastAssets=state.assets;key='';}
  if(nextKey!==key){
   key=nextKey;layer.replaceChildren();list.replaceChildren();const assets=lookup(),gallery=state.gallery;
   columns.hidden=label.hidden=!gallery;columns.value=String(gallery?.columns||2);
   for(const [index,item]of (gallery?.items||[]).entries()){
    const asset=assets.get(item.assetId);if(!asset)continue;
    const figure=element('figure',{'data-gallery-occurrence':item.id});figure.append(element('img',{src:asset.uri,alt:item.caption||asset.name}));
    if(item.caption)figure.append(element('figcaption',{'data-lm-text-role':'detail'},item.caption));layer.append(figure);
    const row=element('div',{class:'lab-gallery-item'}),preview=element('img',{src:asset.uri,alt:asset.name}),caption=element('input',{type:'text',value:item.caption,maxlength:'220','aria-label':'Legenda da imagem '+(index+1)});
    caption.addEventListener('change',()=>{const next=structuredClone(getState().gallery);next.items[index].caption=caption.value;update(next);});
    const actions=element('div',{class:'lab-gallery-item-actions'});
    for(const [text,label,delta]of [['↑','Mover imagem para antes',-1],['↓','Mover imagem para depois',1]]){
     const button=element('button',{type:'button','aria-label':label},text);button.disabled=index+delta<0||index+delta>=gallery.items.length;
     button.onclick=()=>{const next=structuredClone(getState().gallery);const [moved]=next.items.splice(index,1);next.items.splice(index+delta,0,moved);update(next);};actions.append(button);
    }
    const remove=element('button',{type:'button','aria-label':'Remover imagem '+(index+1)},'REMOVER');remove.onclick=()=>{const next=structuredClone(getState().gallery);next.items.splice(index,1);update(next.items.length?next:null);};actions.append(remove);
    row.append(preview,caption,actions);list.append(row);
   }
   summary.textContent='IMAGENS DA PÁGINA'+(gallery?' / '+gallery.items.length:'');
  }
  position();
 }
 add.onclick=()=>file.click();columns.onchange=()=>{const gallery=structuredClone(getState().gallery);if(gallery){gallery.columns=Number(columns.value);update(gallery);}};
 file.onchange=async()=>{
  const initial=getState(),files=[...file.files];file.value='';if(!files.length)return;
  if(files.length+(initial.gallery?.items.length||0)>12){onError('Use até 12 imagens por página. Adicione outra página para continuar.');return;}
  loading=true;add.disabled=true;status.textContent='Preparando imagens…';
  try{
   const assets=[],items=[];
   for(const selected of files){
    if(!['image/png','image/jpeg','image/webp'].includes(selected.type))throw Error('Use imagens PNG, JPEG ou WebP.');
    const url=URL.createObjectURL(selected);try{
     const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
     const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
     const uri=canvas.toDataURL('image/webp',.76),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uri)))].map(n=>n.toString(16).padStart(2,'0')).join('');
     const asset={id:'image-'+hash.slice(0,20),name:selected.name.slice(0,180),uri,width:canvas.width,height:canvas.height};assets.push(asset);items.push({id:'image-use-'+crypto.randomUUID(),assetId:asset.id,caption:''});
    }finally{URL.revokeObjectURL(url);}
   }
   const gallery={columns:initial.gallery?.columns||Math.min(5,items.length),items:[...(initial.gallery?.items||[]),...items]};
   await onChange({pageId:initial.pageId,gallery,assets,create:!initial.gallery});tools.open=true;
  }catch(error){onError(error.message);}finally{loading=false;add.disabled=false;render();}
 };
 const observer=new ResizeObserver(position);observer.observe(board);const reading=board.querySelector('#labCopy');if(reading)observer.observe(reading);
 new MutationObserver(()=>requestAnimationFrame(position)).observe(board,{attributes:true,attributeFilter:['data-format','style']});
 render();
 return {render,async capture(width,height){
  render();if(status.dataset.state==='error')throw Error(status.textContent);
  const assets=lookup(),items=[];
  for(const cell of cells(width,height)){
   const asset=assets.get(cell.item.assetId);if(!asset)throw Error('Imagem da galeria não encontrada.');
   const img=await bitmap(asset),box=containImage(img.naturalWidth,img.naturalHeight,cell);
   items.push({kind:'image',layer:'gallery',galleryId:cell.item.id,sourceId:cell.item.sourceId,source:asset.uri,sourceWidth:img.naturalWidth,sourceHeight:img.naturalHeight,...box});
  }
  return items;
 }};
}
