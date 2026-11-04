(()=>{
  const root=document.documentElement;
  const study=document.querySelector('.transition-study');
  const progressLabel=document.querySelector('.progress');
  let frame=0;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const range=(value,start,end)=>clamp((value-start)/(end-start));
  const update=()=>{
    frame=0;
    const rect=study.getBoundingClientRect();
    const travel=Math.max(1,rect.height-window.innerHeight);
    const progress=clamp(-rect.top/travel);
    const thoughtOut=range(progress,.34,.62);
    const manifestIn=range(progress,.43,.72);
    root.style.setProperty('--progress',progress.toFixed(4));
    root.style.setProperty('--thought-out',thoughtOut.toFixed(4));
    root.style.setProperty('--manifest-in',manifestIn.toFixed(4));
    root.style.setProperty('--cue-out',range(progress,0,.2).toFixed(4));
    progressLabel.value=String(Math.round(progress*100)).padStart(2,'0');
  };
  const requestUpdate=()=>{if(!frame)frame=requestAnimationFrame(update)};
  addEventListener('scroll',requestUpdate,{passive:true});
  addEventListener('resize',requestUpdate);
  update();
})();
