// The approved films are monochrome ink on #f2efe7. Remove only that paper.
export function motionInkPixels(data){
  const paper=.2126*242+.7152*239+.0722*231,ink=24;
  for(let i=0;i<data.length;i+=4){const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
    const alpha=Math.max(0,Math.min(1,(paper-l-2)/(paper-ink-2)));
    data[i]=data[i+1]=data[i+2]=ink;data[i+3]=Math.round(data[i+3]*alpha);
  }return data;
}
const frames=new WeakMap();
export function motionInkFrame(video,maxEdge=1920){
  let canvas=frames.get(video);if(!canvas){canvas=document.createElement('canvas');frames.set(video,canvas);}
  const scale=Math.min(1,maxEdge/Math.max(video.videoWidth,video.videoHeight));
  const w=Math.max(1,Math.round(video.videoWidth*scale)),h=Math.max(1,Math.round(video.videoHeight*scale));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,w,h);ctx.drawImage(video,0,0,w,h);
  const image=ctx.getImageData(0,0,w,h);motionInkPixels(image.data);ctx.putImageData(image,0,0);return canvas;
}
// Self-contained installer: the same renderer is embedded into offline HTML.
export function installMotionInk(root=document,removePaper=motionInkPixels){
  if(!document.getElementById('motion-ink-style')){const style=document.createElement('style');style.id='motion-ink-style';style.textContent='.motion-ink-canvas{object-fit:contain;object-position:center;position:absolute;pointer-events:none;z-index:1}.motion-ink-toggle{position:absolute;left:12px;bottom:12px;z-index:3;pointer-events:auto;font:300 13px/1.35 UniversMattar,Arial,sans-serif;letter-spacing:.04em;padding:9px 12px;background:#f7f6f2;color:#181818;border:1px solid #cbc9c4;cursor:pointer}.motion-ink-toggle:focus-visible{outline:2px solid currentColor;outline-offset:3px}@media print{.motion-ink-toggle{display:none}}';document.head.append(style);}
  for(const video of root.querySelectorAll('video[data-motion-ink]')){
    if(video.motionInk)continue;video.autoplay=false;video.removeAttribute('autoplay');video.muted=true;video.defaultMuted=true;video.pause();
    const parent=video.parentElement;if(getComputedStyle(parent).position==='static')parent.style.position='relative';
    const canvas=document.createElement('canvas');canvas.className='motion-ink-canvas';canvas.setAttribute('aria-hidden','true');video.after(canvas);video.style.opacity='0';
    const ctx=canvas.getContext('2d',{willReadFrequently:true});let handle=0,disposed=false;
    const sync=()=>{Object.assign(canvas.style,{left:video.offsetLeft+'px',top:video.offsetTop+'px',width:video.offsetWidth+'px',height:video.offsetHeight+'px'});};
    const draw=()=>{if(disposed||video.readyState<2||!video.videoWidth)return;const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));const w=Math.round(video.videoWidth*scale),h=Math.round(video.videoHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.clearRect(0,0,w,h);ctx.drawImage(video,0,0,w,h);const image=ctx.getImageData(0,0,w,h);removePaper(image.data);ctx.putImageData(image,0,0);sync();};
    const tick=()=>{handle=0;if(!video.isConnected){dispose();return;}draw();if(!video.paused)handle=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);};
    const stop=()=>{if(handle){if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(handle);else cancelAnimationFrame(handle);handle=0;}};
    const start=()=>{stop();tick();};const observer=new ResizeObserver(()=>{sync();draw();});observer.observe(video);
    let button=null;if(video.dataset.motionControls!=='false'){button=document.createElement('button');button.type='button';button.className='motion-ink-toggle';const label=video.getAttribute('aria-label')||'motion';button.setAttribute('aria-label','Reproduzir '+label);button.textContent='REPRODUZIR';button.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>{});else video.pause();});parent.append(button);}
    const update=()=>{if(button){button.textContent=video.paused?'REPRODUZIR':'PAUSAR';button.setAttribute('aria-label',(video.paused?'Reproduzir ':'Pausar ')+(video.getAttribute('aria-label')||'motion'));}};
    function dispose(){disposed=true;stop();observer.disconnect();canvas.remove();button?.remove();video.motionInk=null;}
    video.motionInk={draw,sync,dispose};video.addEventListener('loadeddata',draw);video.addEventListener('seeked',draw);video.addEventListener('play',()=>{update();start();});video.addEventListener('pause',()=>{stop();draw();update();});draw();sync();
  }
}
