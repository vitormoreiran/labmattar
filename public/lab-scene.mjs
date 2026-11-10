import {fitBox,vectorTransform,drawFittedImage} from './lab-geometry.mjs';
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function image(source,imageCache){
  if(!imageCache.has(source))imageCache.set(source,(async()=>{
    const prefix='data:image/png;base64,';
    if(typeof createImageBitmap==='function'&&source.startsWith(prefix)){
      const encoded=source.slice(prefix.length),parts=[];
      for(let offset=0;offset<encoded.length;offset+=65536){
        const binary=atob(encoded.slice(offset,offset+65536)),bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        parts.push(bytes);
      }
      return createImageBitmap(new Blob(parts,{type:'image/png'}));
    }
    const img=new Image();img.src=source;await img.decode();return img;
  })());
  return imageCache.get(source);
}
function pathFor(vector){
  const path=new Path2D(),{scale,x,y}=vectorTransform(vector);
  for(const item of vector.paths)path.addPath(new Path2D(item.d),new DOMMatrix([
    scale,0,0,scale,x,y]));
  return path;
}
export async function sceneCanvas(scene,edge=3840,options={}){
  const imageCache=options.imageCache||new Map();
  const canvas=options.canvas||document.createElement('canvas');
  const scale=(options.width||scene.width*edge/Math.max(scene.width,scene.height))/scene.width;
  canvas.width=options.width||Math.round(scene.width*scale);canvas.height=options.height||Math.round(scene.height*scale);
  const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
  if(!ctx)throw Error('Memória insuficiente para renderizar a página.');
  const page=fitBox(scene.width,scene.height,{x:0,y:0,w:canvas.width,h:canvas.height});
  ctx.fillStyle=scene.items.find(op=>op.kind==='rect')?.color||'#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(page.scale,0,0,page.scale,page.x,page.y);ctx.imageSmoothingQuality='high';
  async function draw(ops){for(const op of ops){
    ctx.save();
    if(op.kind==='rect'){ctx.fillStyle=op.color;ctx.fillRect(op.x,op.y,op.w,op.h);}
    else if(op.kind==='image'){
      if(op.paint)await op.paint(ctx);
      else {
        const bitmap=await image(op.source,imageCache);
        const {a,b,c,d,e,f}=ctx.getTransform();
        // Keep raster downsampling in output pixels, including WebKit's PNG
        // encoding path. The native image still uses one proportional scale.
        if(b===0&&c===0&&a>0&&d>0){
          ctx.setTransform(1,0,0,1,0,0);
          drawFittedImage(ctx,bitmap,{x:op.x*a+e,y:op.y*d+f,w:op.w*a,h:op.h*d},{fit:op.fit||'contain'});
        }else drawFittedImage(ctx,bitmap,op,{fit:op.fit||'contain'});
      }
    }
    else if(op.kind==='vector'){ctx.fillStyle=op.color;ctx.fill(pathFor(op),op.rule||'nonzero');}
    else if(op.kind==='group'){ctx.clip(pathFor(op.clip),op.clip.rule||'nonzero');await draw(op.items);}
    else if(op.kind==='text'){
      ctx.font=`300 ${op.size}px ${op.family}`;ctx.textBaseline='alphabetic';ctx.fillStyle=op.color;
      if('letterSpacing' in ctx)ctx.letterSpacing=op.spacing+'px';
      const text=options.textEffect?.(ctx,op)??op.text;
      ctx.fillText(text,op.x,op.y);
    }
    ctx.restore();
  }}
  await draw(scene.items);ctx.setTransform(1,0,0,1,0,0);return canvas;
}
export function sceneSvg(scene,{motionStills=true}={}){
  let count=0;const definitions=[];
  const vectorPath=vector=>{
    const {scale,x,y}=vectorTransform(vector);
    return `<g transform="translate(${x} ${y}) scale(${scale})">${vector.paths.map(path=>`<path d="${esc(path.d)}"/>`).join('')}</g>`;
  };
  function draw(ops){return ops.map(op=>{
    if(!motionStills&&op.motionId)return '';
    if(op.kind==='rect')return `<rect x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" fill="${esc(op.color)}"/>`;
    if(op.kind==='image')return `<image x="${op.x}" y="${op.y}" width="${op.w}" height="${op.h}" href="${esc(op.source)}" preserveAspectRatio="xMidYMid ${op.fit==='cover'?'slice':'meet'}"/>`;
    if(op.kind==='vector')return `<g fill="${esc(op.color)}" fill-rule="${op.rule||'nonzero'}">${vectorPath(op)}</g>`;
    if(op.kind==='text')return `<text x="${op.x}" y="${op.y}" font-family="${op.family}" font-weight="300" font-size="${op.size}" letter-spacing="${op.spacing}" fill="${esc(op.color)}">${esc(op.text)}</text>`;
    if(op.kind==='group'){
      const id=(scene.id||'scene')+'-clip-'+(++count),{scale,x,y}=vectorTransform(op.clip);
      // clipPath aceita contornos diretamente. Um <g> aqui pode fazer a
      // máscara desaparecer quando o SVG é carregado como imagem no HTML.
      definitions.push(`<clipPath id="${id}" clipPathUnits="userSpaceOnUse" transform="translate(${x} ${y}) scale(${scale})" clip-rule="${op.clip.rule||'nonzero'}">${op.clip.paths.map(path=>`<path d="${esc(path.d)}"/>`).join('')}</clipPath>`);
      return `<g clip-path="url(#${id})">${draw(op.items)}</g>`;
    }
    throw Error('Elemento de renderização desconhecido.');
  }).join('');}
  const body=draw(scene.items);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" aria-label="${esc(scene.name||'Página LABMATTAR')}"><defs>${definitions.join('')}</defs>${body}</svg>`;
}
export const escapeMarkup=esc;
