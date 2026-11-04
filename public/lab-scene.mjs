const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function image(source,imageCache){
  if(!imageCache.has(source))imageCache.set(source,(async()=>{const img=new Image();img.src=source;await img.decode();return img;})());
  return imageCache.get(source);
}
function pathFor(vector){
  const path=new Path2D(),[x,y,w,h]=vector.viewBox;
  for(const item of vector.paths)path.addPath(new Path2D(item.d),new DOMMatrix([
    vector.box.w/w,0,0,vector.box.h/h,vector.box.x-x*vector.box.w/w,vector.box.y-y*vector.box.h/h]));
  return path;
}
export async function sceneCanvas(scene,edge=3840){
  const imageCache=new Map();
  const canvas=document.createElement('canvas'),scale=edge/Math.max(scene.width,scene.height);
  canvas.width=Math.round(scene.width*scale);canvas.height=Math.round(scene.height*scale);
  const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
  if(!ctx)throw Error('Memória insuficiente para renderizar a página.');
  ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingQuality='high';
  async function draw(ops){for(const op of ops){
    ctx.save();
    if(op.kind==='rect'){ctx.fillStyle=op.color;ctx.fillRect(op.x,op.y,op.w,op.h);}
    else if(op.kind==='image')ctx.drawImage(await image(op.source,imageCache),op.x,op.y,op.w,op.h);
    else if(op.kind==='vector'){ctx.fillStyle=op.color;ctx.fill(pathFor(op),op.rule||'nonzero');}
    else if(op.kind==='group'){ctx.clip(pathFor(op.clip),op.clip.rule||'nonzero');await draw(op.items);}
    else if(op.kind==='text'){
      ctx.font=`300 ${op.size}px ${op.family}`;ctx.textBaseline='alphabetic';ctx.fillStyle=op.color;
      if('letterSpacing' in ctx)ctx.letterSpacing=op.spacing+'px';ctx.fillText(op.text,op.x,op.y);
    }
    ctx.restore();
  }}
  await draw(scene.items);return canvas;
}
export function sceneSvg(scene,{motionStills=true}={}){
  let count=0;const definitions=[];
  const vectorPath=vector=>{
    const [x,y,w,h]=vector.viewBox,b=vector.box;
    return `<g transform="translate(${b.x} ${b.y}) scale(${b.w/w} ${b.h/h}) translate(${-x} ${-y})">${vector.paths.map(path=>`<path d="${esc(path.d)}"/>`).join('')}</g>`;
  };
  function draw(ops){return ops.map(op=>{
    if(!motionStills&&op.motionId)return '';
    if(op.kind==='rect')return `<rect x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" fill="${esc(op.color)}"/>`;
    if(op.kind==='image')return `<image x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" href="${esc(op.source)}" preserveAspectRatio="none"/>`;
    if(op.kind==='vector')return `<g fill="${esc(op.color)}" fill-rule="${op.rule||'nonzero'}">${vectorPath(op)}</g>`;
    if(op.kind==='text')return `<text x="${op.x}" y="${op.y}" font-family="${op.family}" font-weight="300" font-size="${op.size}" letter-spacing="${op.spacing}" fill="${esc(op.color)}">${esc(op.text)}</text>`;
    if(op.kind==='group'){
      const id=(scene.id||'scene')+'-clip-'+(++count);definitions.push(`<clipPath id="${id}">${vectorPath(op.clip)}</clipPath>`);
      return `<g clip-path="url(#${id})">${draw(op.items)}</g>`;
    }
    throw Error('Elemento de renderização desconhecido.');
  }).join('');}
  const body=draw(scene.items);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" aria-label="${esc(scene.name||'Página LABMATTAR')}"><defs>${definitions.join('')}</defs>${body}</svg>`;
}
export const escapeMarkup=esc;
