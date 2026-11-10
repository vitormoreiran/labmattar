// Conteúdo tem uma única escala. Recortar é permitido; esticar não é.
const positive=(value,name)=>{
  if(!Number.isFinite(value)||value<=0)throw Error('Dimensão inválida: '+name+'.');
  return value;
};
export function fitBox(width,height,box,{fit='contain',alignX=.5,alignY=.5}={}){
  positive(width,'largura original');positive(height,'altura original');
  positive(box.w,'largura disponível');positive(box.h,'altura disponível');
  if(!Number.isFinite(box.x)||!Number.isFinite(box.y)||!['contain','cover'].includes(fit)||
    !Number.isFinite(alignX)||alignX<0||alignX>1||!Number.isFinite(alignY)||alignY<0||alignY>1)
    throw Error('Encaixe de conteúdo inválido.');
  const scale=Math[fit==='cover'?'max':'min'](box.w/width,box.h/height);
  const w=width*scale,h=height*scale;
  return {x:box.x+(box.w-w)*alignX,y:box.y+(box.h-h)*alignY,w,h,scale};
}
export function vectorTransform(vector){
  const [x,y,w,h]=vector.viewBox;
  if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Origem vetorial inválida.');
  const fitted=fitBox(w,h,vector.box,{alignX:vector.alignX??.5,alignY:vector.alignY??.5});
  return {scale:fitted.scale,x:fitted.x-x*fitted.scale,y:fitted.y-y*fitted.scale};
}
export function drawFittedImage(ctx,image,box,options={}){
  const width=image.videoWidth||image.naturalWidth||image.width;
  const height=image.videoHeight||image.naturalHeight||image.height;
  const fitted=fitBox(width,height,box,options);
  ctx.save();ctx.beginPath();ctx.rect(box.x,box.y,box.w,box.h);ctx.clip();
  ctx.drawImage(image,fitted.x,fitted.y,fitted.w,fitted.h);ctx.restore();
}
