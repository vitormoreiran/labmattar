import {sceneCanvas} from './lab-scene.mjs';
import {textMotionProfile} from './lab-text-motion.mjs';

const abort=signal=>{if(signal?.aborted)throw new DOMException('Exportação cancelada.','AbortError');};
function mediaEvent(video,event,action,signal){
  abort(signal);
  return new Promise((resolve,reject)=>{
    const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('Vídeo indisponível. Aguarde o carregamento ou reconecte o acervo.'));};
    const cancel=()=>{cleanup();reject(new DOMException('Exportação cancelada.','AbortError'));};
    const timeout=setTimeout(fail,20000);
    const cleanup=()=>{clearTimeout(timeout);video.removeEventListener(event,done);video.removeEventListener('error',fail);signal?.removeEventListener('abort',cancel);};
    video.addEventListener(event,done,{once:true});video.addEventListener('error',fail,{once:true});signal?.addEventListener('abort',cancel,{once:true});
    try{action?.();}catch(error){cleanup();reject(error);}
    if(video.error)fail();
  });
}
export async function readyMedia(media,signal){
  await Promise.all(media.map(async video=>{
    video.pause();video.preload='auto';
    if(video.readyState<2)await mediaEvent(video,'loadeddata',null,signal);
    video.pause();if(!video.videoWidth||!Number.isFinite(video.duration)||video.duration<=0)throw Error('Duração ou dimensões do vídeo indisponíveis.');
  }));
}
export async function seekMedia(media,time,backgroundTime,signal){
  await Promise.all(media.map(async video=>{
    abort(signal);video.pause();
    const elapsed=video.classList.contains('lm-lab-background-video')?backgroundTime:time;
    const target=Math.min(elapsed%video.duration,Math.max(0,video.duration-1/120));
    if(Math.abs(video.currentTime-target)>1/1000)
      await mediaEvent(video,'seeked',()=>{video.currentTime=target;},signal);
    if(video.readyState<2)await mediaEvent(video,'loadeddata',null,signal);
  }));
}
function easeOut(progress){
  // Invert the shared cubic-bezier(.16,1,.3,1) without a DOM animation clock.
  let low=0,high=1,t=progress;
  for(let n=0;n<16;n++){t=(low+high)/2;const x=3*(1-t)**2*t*.16+3*(1-t)*t*t*.3+t**3;if(x<progress)low=t;else high=t;}
  return 1-(1-t)**3;
}
export function textEntrance(time){
  return (ctx,op)=>{
    const progress=Math.min(1,Math.max(0,time/(textMotionProfile.timing.duration/1000))),eased=easeOut(progress);
    ctx.globalAlpha=.08+.92*eased;ctx.translate(0,22*(1-eased));
    ctx.filter=`blur(${10*(1-eased)*ctx.getTransform().a}px)`;
    const reveal=Math.min(1,time/(textMotionProfile.scrambleDuration/1000));
    if(reveal>=1)return op.text;
    const tick=Math.floor(time*20),letters=[...op.text],alphabet=[...textMotionProfile.alphabet];
    return letters.map((char,index)=>{
      if(/\s/.test(char)||index<Math.floor(reveal*letters.length))return char;
      const width=ctx.measureText(char).width,choices=alphabet.filter(letter=>ctx.measureText(letter).width<=width*.96);
      return choices.length?choices[(tick*17+index*13)%choices.length]:char;
    }).join('');
  };
}
export function frameRenderer(width,height,animateText){
  const canvas=document.createElement('canvas'),imageCache=new Map();
  return (scene,time)=>sceneCanvas(scene,Math.max(width,height),{width,height,canvas,imageCache,
    ...(animateText?{textEffect:textEntrance(time)}:{})});
}
