const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const base=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const output=path.resolve(process.env.PROPORTION_OUTPUT||'proportion-proof');
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await (process.env.COMPOSITION_BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.COMPOSITION_EXECUTABLE_PATH?{executablePath:process.env.COMPOSITION_EXECUTABLE_PATH}:{})});
 const proof=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?studio=1#laboratorio');await page.waitForFunction(()=>window.LabRenderer&&window.LabPages&&document.querySelector('#labPages').dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);
  const original=await page.evaluate(()=>LabProductionBridge.snapshot().state);
  for(const vw of [1440,1024,390]){
   await page.setViewportSize({width:vw,height:1000});
   for(const format of ['horizontal','vertical','quadrado','editorial'])for(const mode of ['elemento','completo'])for(const content of ['solid','photo']){
    await page.evaluate(({original,format,mode,content})=>LabProductionBridge.restore({...original,format,mPresentation:mode,mContent:content,marker:'both',title:'',body:'',mCaption:'',signature:{preset:'none',scale:100,slots:Object.fromEntries(['tl','tr','bl','br'].map(c=>[c,{kind:'none',symbol:'M.svg',text:''}]))}}),{original,format,mode,content});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const row=await page.evaluate(async()=>{
     const board=document.querySelector('#labArtboard'),m=document.querySelector('#labMask'),box=m.getBoundingClientRect(),style=getComputedStyle(m);
     const markers=[...document.querySelectorAll('#labMMarkers svg')].filter(s=>getComputedStyle(s).display!=='none').map(s=>{const t=s.querySelector('path').getScreenCTM();return {sx:Math.hypot(t.a,t.b),sy:Math.hypot(t.c,t.d)};});
     return {vw:innerWidth,format:board.dataset.format,mode:board.dataset.mPresentation,content:board.dataset.mContent,ratio:box.width/box.height,mask:style.maskSize,markers};
    });
    assert(Math.abs(row.ratio/(990.08/743.18)-1)<.001,'M fora da proporção: '+JSON.stringify(row));assert.equal(row.mask,'contain');
    for(const marker of row.markers)assert(Math.abs(marker.sx-marker.sy)<1e-6,'Fragmento distorcido: '+JSON.stringify(row));
    proof.push(row);
    if(vw===1440&&mode==='elemento'){
     const match=await page.evaluate(async()=>{
      const {vectorTransform}=await import('/lab-geometry.mjs'),scene=await LabRenderer.capture({edge:1920,ask:false});
      const board=document.querySelector('#labArtboard'),b=board.getBoundingClientRect(),zoom=b.width/board.offsetWidth;
      return [...document.querySelectorAll('#labMMarkers svg')].filter(s=>getComputedStyle(s).display!=='none').map(svg=>{
       const v=svg.viewBox.baseVal,t=svg.querySelector('path').getScreenCTM();
       const ops=scene.items.flatMap(op=>op.kind==='group'?[op.clip]:[op]);
       const op=ops.find(op=>op.viewBox?.[2]===v.width),exported=vectorTransform(op);
       return {dx:Math.abs(exported.x-(t.e-b.left)/zoom),dy:Math.abs(exported.y-(t.f-b.top)/zoom),ds:Math.abs(exported.scale-t.a/zoom)};
      });
     });
     for(const m of match){assert(m.dx<.05&&m.dy<.05&&m.ds<.001,'Prévia e export divergentes: '+JSON.stringify(m));}
    }
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(original=>LabProductionBridge.restore({...original,title:'',body:'',mCaption:'',mContent:'solid',marker:'both',mPresentation:'elemento'}),original);
  await page.locator('#labArtboard').screenshot({path:path.join(output,'fragmentos-proporcionais.png')});
  const rejected=await page.evaluate(async original=>{
   LabProductionBridge.restore({...original,title:'',body:'',mCaption:'',background:'photo',mContent:'off',marker:'none'});
   const img=document.querySelector('#labAmbientPhoto');img.style.setProperty('transform','scale(2,1)','important');
   try{await LabRenderer.capture({edge:1920,ask:false});return 'não interrompeu / '+document.querySelector('#labArtboard').dataset.backdrop;}
   catch(error){return error.message;}
   finally{img.style.removeProperty('transform');}
  },original);
  assert.match(rejected,/proporção original/,'Escala fotográfica desigual deveria interromper a exportação: '+rejected);
  const fixture=await page.evaluate(async()=>{
   const {sceneCanvas,sceneSvg}=await import('/lab-scene.mjs');
   const {createPDF}=await import('/vendor/lab-pdf.js');
   const {frameRenderer}=await import('/lab-video-export.mjs');
   const {encodeMP4}=await import('/vendor/lab-video.js');
   const image=document.createElement('canvas');image.width=200;image.height=100;const ic=image.getContext('2d');ic.fillStyle='#fff';ic.fillRect(0,0,200,100);ic.fillStyle='#0000ff';ic.beginPath();ic.arc(100,50,30,0,Math.PI*2);ic.fill();
   const circle={viewBox:[0,0,100,100],box:{x:10,y:10,w:150,h:80},paths:[{d:'M0 50a50 50 0 1 0 100 0a50 50 0 1 0 -100 0'}]};
   const scene={width:300,height:220,items:[{kind:'rect',x:0,y:0,w:300,h:220,color:'#fff'},{...circle,kind:'vector',color:'#000000'},{kind:'image',source:image.toDataURL(),x:170,y:10,w:80,h:80},{kind:'group',clip:{...circle,box:{x:10,y:110,w:150,h:80}},items:[{kind:'rect',x:0,y:0,w:300,h:220,color:'#00aa00'}]}]};
   const png=await sceneCanvas(scene,300),svg=sceneSvg(scene),square=await sceneCanvas(scene,300,{width:300,height:300});
   const svgImg=new Image();svgImg.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await svgImg.decode();const svgCanvas=document.createElement('canvas');svgCanvas.width=300;svgCanvas.height=220;svgCanvas.getContext('2d').drawImage(svgImg,0,0,300,220);
   const bounds=canvas=>{const c=canvas.getContext('2d'),p=c.getImageData(0,0,canvas.width,canvas.height).data;return [0,1,2].map(color=>{let x1=Infinity,y1=Infinity,x2=-1,y2=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,r=p[i],g=p[i+1],b=p[i+2];if(color===0?r<25&&g<25&&b<25:color===1?b>220&&r<25&&g<25:g>120&&r<25&&b<25){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}}return {w:x2-x1+1,h:y2-y1+1,x:x1,y:y1};});};
   window.proportionBounds=bounds;
   const fonts={UniversMattar:new Uint8Array(await (await fetch('/fonts/univers-lt-std-45-light.otf')).arrayBuffer()),PerpetuaMattar:new Uint8Array(await (await fetch('/fonts/perpetua-titling-light.ttf')).arrayBuffer())};
   const bytes=async blob=>{let s='';const v=new Uint8Array(await blob.arrayBuffer());for(let i=0;i<v.length;i+=16384)s+=String.fromCharCode(...v.subarray(i,i+16384));return btoa(s);};
   const render=frameRenderer(300,300,false);const video=await encodeMP4({width:300,height:300,seconds:2,pageCount:1,preparePage:async()=>{},renderFrame:()=>render(scene,0)});
   return {bounds:{png:bounds(png),svg:bounds(svgCanvas),square:bounds(square)},png:png.toDataURL().split(',')[1],svg,video:await bytes(video),pdf:await bytes(await createPDF([scene],fonts))};
  });
  for(const [format,shapes] of Object.entries(fixture.bounds))for(const shape of shapes){assert(shape.w>0&&shape.h>0,format+JSON.stringify(fixture.bounds));assert(Math.abs(shape.w-shape.h)<=1,'Círculo achatado em '+format+': '+JSON.stringify(shape));}
  await fs.writeFile(path.join(output,'proof.png'),Buffer.from(fixture.png,'base64'));await fs.writeFile(path.join(output,'proof.svg'),fixture.svg);await fs.writeFile(path.join(output,'proof.pdf'),Buffer.from(fixture.pdf,'base64'));await fs.writeFile(path.join(output,'proof.mp4'),Buffer.from(fixture.video,'base64'));
  execFileSync(process.env.PDFTOPPM||'pdftoppm',['-png','-singlefile','-r','96',path.join(output,'proof.pdf'),path.join(output,'pdf-proof')]);
  const pdfImage=(await fs.readFile(path.join(output,'pdf-proof.png'))).toString('base64');
  const pdfBounds=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);return window.proportionBounds(canvas);},pdfImage);
  for(const shape of pdfBounds)assert(shape.w>0&&Math.abs(shape.w-shape.h)<=1,'PDF deformou o conteúdo: '+JSON.stringify(shape));
  const videoProof=await page.evaluate(async base64=>{const v=document.createElement('video');v.muted=true;v.src='data:video/mp4;base64,'+base64;await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=j;});v.currentTime=.5;await new Promise(r=>v.onseeked=r);const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);const data=x.getImageData(0,0,c.width,c.height).data;let x1=Infinity,y1=Infinity,x2=-1,y2=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(data[i]<25&&data[i+1]<25&&data[i+2]<25){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}}return {w:x2-x1+1,h:y2-y1+1,width:c.width,height:c.height};},fixture.video);
  assert(Math.abs(videoProof.w-videoProof.h)<=2,'MP4 achatou o círculo');
  // Uma seção web pode ter proporção diferente da cena exportada.
  // A máscara de motion precisa acompanhar o encaixe do SVG, sem se esticar.
  const responsiveMasks=[];
  for(const [width,height] of [[200,400],[400,200]]){
   await page.evaluate(async ({width,height})=>{
    const {animatedBackgroundCSS}=await import('/lab-presentation-export.mjs');
    if(!document.querySelector('#proportion-mask-style')){const style=document.createElement('style');style.id='proportion-mask-style';style.textContent=animatedBackgroundCSS;document.head.append(style);}
    document.querySelector('#proportion-mask')?.remove();
    const host=document.createElement('div');host.id='proportion-mask';host.className='story-art';host.style.cssText='position:fixed;inset:0 auto auto 0;z-index:99999;pointer-events:none;background:white;width:'+width+'px;height:'+height+'px';
    const mask='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220"><circle cx="150" cy="110" r="40" fill="white"/></svg>');
    host.innerHTML='<div class="animated-background"><div class="bg-video-markers"></div></div>';
    const shape=host.querySelector('.bg-video-markers');shape.style.background='#0000ff';shape.style.maskImage='url("'+mask+'")';document.body.append(host);
   },{width,height});
   const shot=await page.locator('#proportion-mask').screenshot();
   const shape=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d').drawImage(i,0,0);return window.proportionBounds(c)[1];},shot.toString('base64'));
   assert(shape.w>0&&Math.abs(shape.w-shape.h)<=1,'Máscara da seção web se deformou: '+JSON.stringify(shape));responsiveMasks.push({width,height,shape});
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({cases:proof.length,proof,fixture:fixture.bounds,pdfBounds,videoProof,responsiveMasks,errors},null,2));
  console.log(JSON.stringify({cases:proof.length,fixtures:fixture.bounds,pdfBounds,videoProof,responsiveMasks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
