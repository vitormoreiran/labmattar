// Images are stored once in the document and referenced by each occurrence.
// Their natural ratio, not a user-entered box ratio, controls every renderer.
const check=(value,message)=>{if(!value)throw Error('Galeria incompatível: '+message);};
const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
export function normalizeImageAssets(value=[]){
 check(Array.isArray(value)&&value.length<=300,'quantidade de imagens');const ids=new Set();
 return value.map(asset=>{
  check(keys(asset,['id','name','uri','width','height'])&&identifier(asset.id)&&!ids.has(asset.id),'identificador da imagem');ids.add(asset.id);
  check(typeof asset.name==='string'&&asset.name.length<=180,'nome da imagem');
  check(typeof asset.uri==='string'&&asset.uri.length<=5_000_000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(asset.uri),'arquivo da imagem');
  check(['width','height'].every(key=>Number.isInteger(asset[key])&&asset[key]>0&&asset[key]<=40000),'dimensões da imagem');
  return {id:asset.id,name:asset.name,uri:asset.uri,width:asset.width,height:asset.height};
 });
}
export function normalizeGallery(value,assets){
 if(value===undefined||value===null)return null;
 check(keys(value,['columns','items'])&&Number.isInteger(value.columns)&&value.columns>=1&&value.columns<=5,'colunas');
 check(Array.isArray(value.items)&&value.items.length>0&&value.items.length<=12,'quantidade na página');
 const ids=new Set(),known=new Set(assets.map(asset=>asset.id));
 const items=value.items.map(item=>{
  check(keys(item,['id','assetId','caption','sourceId'])&&identifier(item.id)&&!ids.has(item.id),'ocorrência da imagem');ids.add(item.id);
  check(known.has(item.assetId),'imagem não cadastrada');
  check(typeof item.caption==='string'&&item.caption.length<=220,'legenda');
  check(item.sourceId===undefined||identifier(item.sourceId),'referência de origem');
  return {id:item.id,assetId:item.assetId,caption:item.caption,...(item.sourceId!==undefined?{sourceId:item.sourceId}:{})};
 });
 return {columns:value.columns,items};
}
export function galleryCells(gallery,width,height,{margin=8,text=null,top=null,bottom=null}={}){
 if(!gallery)return [];
 const pad=width*margin/100,gap=width*14/1280;
 const start=top??Math.max(height*.2,pad),end=bottom??height-Math.max(height*.2,pad);
 let region={x:pad,y:start,w:width-2*pad,h:end-start};
 check(region.w>0&&region.h>=60,'espaço disponível na página');
 if(text&&text.w>0&&text.h>0){
  const right=region.x+region.w,bottom=region.y+region.h;
  const options=[
   {x:text.x+text.w+gap,y:region.y,w:right-text.x-text.w-gap,h:region.h},
   {x:region.x,y:region.y,w:region.w,h:text.y-gap-region.y},
   {x:region.x,y:text.y+text.h+gap,w:region.w,h:bottom-text.y-text.h-gap}
  ].filter(box=>box.w>=60&&box.h>=60);
  check(options.length,'reserve espaço para as imagens ou use uma página de galeria');
  region=options.sort((a,b)=>b.w*b.h-a.w*a.h)[0];
 }
 const columns=Math.min(gallery.columns,gallery.items.length),rows=Math.ceil(gallery.items.length/columns);
 const cellW=(region.w-gap*(columns-1))/columns,cellH=(region.h-gap*(rows-1))/rows;
 return gallery.items.map((item,index)=>{
  const caption=item.caption?Math.min(cellH*.3,Math.max(28,54*width/1280)):0;
  const x=region.x+(index%columns)*(cellW+gap),y=region.y+Math.floor(index/columns)*(cellH+gap);
  return {item,x,y,w:cellW,h:Math.max(1,cellH-caption),captionY:y+cellH-caption,captionH:caption};
 });
}
export function containImage(width,height,box){
 const scale=Math.min(box.w/width,box.h/height);return {x:box.x+(box.w-width*scale)/2,y:box.y+(box.h-height*scale)/2,w:width*scale,h:height*scale};
}
export function galleryMarkup(gallery,assets){
 if(!gallery)return '';
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const lookup=new Map(assets.map(asset=>[asset.id,asset]));
 return '<div class="story-gallery" style="--gallery-columns:'+gallery.columns+'">'+gallery.items.map(item=>{
  const asset=lookup.get(item.assetId);check(asset,'imagem não cadastrada');
  return '<figure data-image-occurrence="'+escape(item.id)+'"'+(item.sourceId?' data-source-image="'+escape(item.sourceId)+'"':'')+'><img src="'+asset.uri+'" width="'+asset.width+'" height="'+asset.height+'" alt="'+escape(item.caption||asset.name)+'">'+(item.caption?'<figcaption>'+escape(item.caption)+'</figcaption>':'')+'</figure>';
 }).join('')+'</div>';
}
export const galleryWebCSS=`.story-page.has-gallery{display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:32px}.story-page.has-gallery .story-reading{margin:0}.story-page.has-gallery .story-reading:has(h2:empty):not(:has(p)){display:none}.story-gallery{position:relative;z-index:2;display:grid;grid-template-columns:repeat(var(--gallery-columns),minmax(0,1fr));align-items:center;gap:24px;width:100%;min-width:0}.story-gallery figure{min-width:0;margin:0}.story-gallery img{display:block;width:100%;height:auto;max-height:65svh;object-fit:contain}.story-gallery figcaption{font-size:13px;line-height:1.35;letter-spacing:.04em;margin-top:12px;overflow-wrap:anywhere}@media(max-width:760px){.story-gallery{grid-template-columns:minmax(0,1fr);gap:32px}.story-gallery img{max-height:80svh}.story-page.has-gallery{padding-top:130px;padding-bottom:130px}}`;
