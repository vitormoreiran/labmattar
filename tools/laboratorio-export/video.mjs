import {Muxer,ArrayBufferTarget} from 'mp4-muxer';

export function videoSize(width,height,quality='fullhd'){
  if(!(width>0&&height>0)||!['hd','fullhd'].includes(quality))throw Error('Formato de vídeo não reconhecido.');
  const edge=quality==='hd'?1280:1920;
  const size=width===height?(quality==='hd'?720:1080):edge;
  const scale=size/Math.max(width,height),even=n=>Math.max(2,Math.round(n/2)*2);
  return {width:even(width*scale),height:even(height*scale)};
}
export async function videoConfig(width,height){
  if(!globalThis.VideoEncoder||!globalThis.VideoFrame)
    throw Error('Este navegador não oferece exportação MP4. Abra o Laboratório no Chrome ou Edge atualizado.');
  const config={codec:'avc1.420033',width,height,framerate:30,
    bitrate:Math.round(width*height*4),avc:{format:'avc'}};
  if(!(await VideoEncoder.isConfigSupported(config)).supported)
    throw Error('MP4 indisponível neste dispositivo. Tente a qualidade HD ou outro navegador Chrome/Edge.');
  return config;
}
const abort=signal=>{if(signal?.aborted)throw new DOMException('Exportação cancelada.','AbortError');};
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));

// The caller supplies the native page renderer. Only this module owns the encoder.
export async function encodeMP4({width,height,seconds,pageCount,preparePage,renderFrame,onProgress=()=>{},signal}){
  if(!Number.isFinite(seconds)||seconds<2||seconds>30||!Number.isInteger(pageCount)||pageCount<1||seconds*pageCount>180)
    throw Error('Escolha de 2 a 30 segundos por página, com até 3 minutos no total.');
  abort(signal);
  const config=await videoConfig(width,height),fps=30,frames=Math.round(seconds*fps),total=frames*pageCount;
  const target=new ArrayBufferTarget(),muxer=new Muxer({target,
    video:{codec:'avc',width,height},fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let failure=null;
  const encoder=new VideoEncoder({output:(chunk,metadata)=>{try{muxer.addVideoChunk(chunk,metadata);}catch(error){failure=error;}},error:error=>{failure=error;}});
  try{
    encoder.configure(config);
    for(let page=0;page<pageCount;page++){
      abort(signal);onProgress(page*frames,total,page,'preparing');await yieldUI();
      await preparePage(page,signal);abort(signal);
      for(let frame=0;frame<frames;frame++){
        abort(signal);if(failure)throw failure;
        const canvas=await renderFrame(page,frame/fps,signal),index=page*frames+frame;
        abort(signal);
        const timestamp=Math.round(index*1e6/fps),end=Math.round((index+1)*1e6/fps);
        const videoFrame=new VideoFrame(canvas,{timestamp,duration:end-timestamp});
        try{encoder.encode(videoFrame,{keyFrame:frame===0||index%(fps*2)===0});}finally{videoFrame.close();}
        if(encoder.encodeQueueSize>8)await encoder.flush();
        if(index%5===0){onProgress(index+1,total,page,'rendering');await yieldUI();}
      }
    }
    abort(signal);await encoder.flush();abort(signal);if(failure)throw failure;
    muxer.finalize();onProgress(total,total,pageCount-1,'done');
    return new Blob([target.buffer],{type:'video/mp4'});
  }finally{if(encoder.state!=='closed')encoder.close();}
}
