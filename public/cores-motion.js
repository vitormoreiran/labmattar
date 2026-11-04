/* Entrada normativa de Tipografia: 22px, blur 10px, 1250ms e caracteres
 * resolvidos em 1500ms. Os originais preservam a leitura e a geometria;
 * somente cópias visuais recebem a animação. */
(()=>{
  'use strict';
  const samples=[...document.querySelectorAll('#uso .sample')];
  if(!samples.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÃÂÉÊÍÓÔÕÚÇ0123456789';
  const ctx=document.createElement('canvas').getContext('2d');
  const keyframes=[
    {opacity:.08,transform:'translate3d(0,22px,0)',filter:'blur(10px)'},
    {opacity:1,transform:'translate3d(0,0,0)',filter:'blur(0px)'}
  ];
  const timing={duration:1250,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'};
  const states=samples.map((sample,index)=>{
    const button=document.createElement('button');
    button.type='button';button.className='color-motion-replay';
    button.textContent='REPETIR TEXTO';
    button.setAttribute('aria-label',`Repetir animação do exemplo ${index+1}`);
    sample.insertAdjacentElement('afterend',button);
    sample.dataset.colorMotion='idle';
    sample.dataset.motionStandard='site-wide';
    const state={sample,button,played:false,frame:0,animations:[],ghosts:[],sources:[]};
    button.addEventListener('click',()=>play(state));
    return state;
  });
  function stop(state){
    cancelAnimationFrame(state.frame);state.frame=0;
    state.animations.forEach(animation=>animation.cancel());state.animations=[];
    state.ghosts.forEach(ghost=>ghost.remove());state.ghosts=[];
    for(const {node,value,priority} of state.sources){
      if(value)node.style.setProperty('opacity',value,priority);
      else node.style.removeProperty('opacity');
    }
    state.sources=[];state.sample.dataset.colorMotion='idle';
  }
  function prepareLine(line){
    const original=line.textContent,cs=getComputedStyle(line);
    ctx.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    const widths=[...alphabet].map(char=>[char,ctx.measureText(char).width]);
    const choices=[...original].map(char=>{
      const limit=ctx.measureText(char).width;
      return widths.filter(item=>item[1]<=limit*.96).map(item=>item[0]).join('')||char;
    });
    const words=[],fragment=document.createDocumentFragment();let offset=0;
    for(const token of original.match(/\s+|\S+/g)||[]){
      if(/^\s+$/.test(token))fragment.append(document.createTextNode(token));
      else{
        const word=document.createElement('span');word.className='color-motion-word';
        word.textContent=token;fragment.append(word);words.push({node:word,original:token,offset});
      }
      offset+=token.length;
    }
    line.replaceChildren(fragment);
    for(const word of words)word.node.style.width=word.node.getBoundingClientRect().width+'px';
    return {words,choices,count:Math.max(1,original.replace(/\s/g,'').length-1)};
  }
  function play(state){
    stop(state);
    if(reduced.matches)return;
    state.played=true;
    const sample=state.sample,box=sample.getBoundingClientRect();
    const sources=[...sample.querySelectorAll('p,h2')];
    const prepared=[];
    for(const source of sources){
      const bounds=source.getBoundingClientRect(),ghost=source.cloneNode(true);
      for(const node of [ghost,...ghost.querySelectorAll('*')])node.removeAttribute('id');
      ghost.classList.add('color-motion-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
      Object.assign(ghost.style,{position:'absolute',left:(bounds.left-box.left-sample.clientLeft)+'px',
        top:(bounds.top-box.top-sample.clientTop)+'px',width:bounds.width+'px',height:bounds.height+'px',margin:'0'});
      sample.append(ghost);state.ghosts.push(ghost);
      state.sources.push({node:source,value:source.style.getPropertyValue('opacity'),priority:source.style.getPropertyPriority('opacity')});
      source.style.opacity='0';
      const lines=ghost.querySelectorAll('.line');
      for(const line of lines.length?lines:[ghost])prepared.push(prepareLine(line));
    }
    sample.dataset.colorMotion='playing';
    const sync=document.timeline.currentTime;
    state.animations=state.ghosts.map(ghost=>ghost.animate(keyframes,timing));
    if(sync!==null)state.animations.forEach(animation=>{animation.startTime=sync;});
    const start=performance.now();
    const tick=now=>{
      const progress=Math.min(1,(now-start)/1500);
      prepared.forEach((line,seed)=>{
        let n=0;
        for(const word of line.words){
          word.node.textContent=[...word.original].map((char,index)=>{
            const offset=n++/line.count;if(progress>=offset)return char;
            const id=Math.abs(Math.floor(Math.sin((n+seed+1)*12.9898+Math.floor(progress*42)*9.17)*43758.5453));
            const choices=line.choices[word.offset+index];return choices[id%choices.length];
          }).join('');
        }
      });
      if(progress<1)state.frame=requestAnimationFrame(tick);else stop(state);
    };
    state.frame=requestAnimationFrame(tick);
  }
  const stopAll=()=>states.forEach(stop);
  window.addEventListener('resize',stopAll,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
  reduced.addEventListener('change',stopAll);
  document.fonts.ready.then(()=>{
    if(!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        const state=states.find(state=>state.sample===entry.target);
        if(entry.isIntersecting&&!state.played&&!reduced.matches)play(state);
      }
    },{threshold:.3});
    samples.forEach(sample=>observer.observe(sample));
  });
})();
