/* LABMATTAR / redes sociais
   Ferramentas de estudo editorial. Nenhum dado é enviado para serviços externos. */
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const asset = (key) => '/redes-acervo/' + key + '.jpg';
  const library = [
    ['aleteia-08','Aleteia','08'],
    ['aleteia-14','Aleteia','14'],
    ['aleteia-18','Aleteia','18'],
    ['poiesis-34','Poiesis','34'],
    ['poiesis-37','Poiesis','37'],
    ['fome-come-01','Fome Come','01'],
    ['fome-come-03','Fome Come','03'],
    ['concreto-efemero-04','Concreto Efêmero','04'],
    ['geluminas-03','Gelúminas','03'],
    ['morangos-carnivoros-02','Morangos Carnívoros','02'],
    ['pe-de-verso-01','Pé de Verso','01'],
    ['dadiva-01','Dádiva','01']
  ].map(([id,title,number]) => ({id,title,number,src:asset(id)}));
  const catalog = new Map(library.map(item => [item.id,item]));

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),3000);
  }
  async function copy(text) {
    if (!navigator.clipboard?.writeText) throw new Error('Sem permissão de cópia');
    await navigator.clipboard.writeText(text);
  }

  function initAvatar() {
    const buttons = [...document.querySelectorAll('[data-avatar-source]')];
    const main = byId('lmSocialAvatarArt');
    const little = byId('lmSocialAvatarSmall');
    const description = byId('lmSocialAvatarLabel');
    const exportButton = byId('lmSocialAvatarExport');
    if (!main || !little || !description || !exportButton || !buttons.length) return;
    let selected = 'M.svg';
    const names = {
      'M.svg': 'M MESTRE',
      'vaso_01.svg': 'VASO 01',
      'vaso_03.svg': 'VASO 03',
      'vaso_06.svg': 'VASO 06',
      'vaso_09.svg': 'VASO 09'
    };
    function apply(filename) {
      if (!Object.hasOwn(names,filename)) return;
      selected = filename;
      const url = '/identidade/' + filename;
      main.src = url;
      main.alt = 'Prévia circular: ' + names[filename];
      little.src = url;
      description.textContent = names[filename] + ' / RECORTE CIRCULAR';
      buttons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.avatarSource === filename)));
    }
    buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.avatarSource)));
    exportButton.addEventListener('click',async () => {
      exportButton.disabled = true;
      try {
        const image = new Image();
        image.src = '/identidade/' + selected;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f7f6f2';
        ctx.fillRect(0,0,1080,1080);
        const maximumWidth = 705, maximumHeight = 705;
        const ratio = Math.min(maximumWidth / image.naturalWidth, maximumHeight / image.naturalHeight);
        const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
        ctx.drawImage(image,(1080-width)/2,(1080-height)/2,width,height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
        if (!blob) throw new Error('Não foi possível gerar o PNG.');
        download(blob,'labmattar-'+selected.replace('.svg','').toLowerCase()+'-avatar.png');
      } catch (error) {
        description.textContent = 'FALHA AO EXPORTAR / '+error.message;
      } finally {exportButton.disabled = false;}
    });
    apply('M.svg');
  }

  function initStoryboard() {
    const slides = [...document.querySelectorAll('[data-sequence-slide]')];
    const controls = [...document.querySelectorAll('[data-story-index]')];
    const counter = byId('lmSocialStoryCounter');
    const title = byId('lmSocialStoryTitle');
    const description = byId('lmSocialStoryDescription');
    const feedback = byId('lmSocialStoryFeedback');
    if (!slides.length || !counter || !title || !description) return;
    const parts = [
      ['Abertura','A primeira imagem situa o projeto antes de introduzir detalhes.'],
      ['Desenvolvimento','O segundo registro acrescenta outra dimensão visual ao mesmo assunto.'],
      ['Detalhe','Uma aproximação desloca o olhar e amplia a percepção da experiência.'],
      ['Identificação','A página editorial identifica o projeto sem precisar cobrir as fotografias.']
    ];
    let current = 0;
    function show(index) {
      current = (index+slides.length)%slides.length;
      slides.forEach((slide,i) => {slide.hidden = i!==current;});
      controls.forEach((button,i) => {
        if (i===current) button.setAttribute('aria-current','step');
        else button.removeAttribute('aria-current');
      });
      counter.textContent = String(current+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
      title.textContent = parts[current][0];
      description.textContent = parts[current][1];
      if (feedback) feedback.textContent = '';
    }
    byId('lmSocialStoryBack')?.addEventListener('click',() => show(current-1));
    byId('lmSocialStoryNext')?.addEventListener('click',() => show(current+1));
    controls.forEach(button => button.addEventListener('click',() => show(Number(button.dataset.storyIndex))));
    byId('lmSocialStoryCopy')?.addEventListener('click',async () => {
      const text = parts.map(([label,desc],i)=>String(i+1).padStart(2,'0')+' / '+label+' — '+desc).join('\n');
      try {await copy('LABMATTAR / ALETEIA / ESTUDO DE CARROSSEL\n'+text);feedback.textContent='ROTEIRO COPIADO.';}
      catch {feedback.textContent='A CÓPIA NÃO FOI PERMITIDA NESTE NAVEGADOR.';}
    });
    show(0);
  }

  /* Temporadas são a unidade de composição. Dentro delas, as publicações
     se acumulam em ordem de envio: antigas -> recentes. O perfil inverte a leitura. */
  function initSeasons() {
    const feed = byId('lmSeasonFeed');
    const timeline = byId('lmSeasonTimeline');
    const selectSeason = byId('lmSeasonSelect');
    const selectPost = byId('lmSeasonPostSelect');
    const roleInput = byId('lmSeasonRole');
    const frameInput = byId('lmSeasonFrame');
    const assetInput = byId('lmSeasonAsset');
    const focusInput = byId('lmSeasonFocus');
    const periodInput = byId('lmSeasonPeriod');
    const selectedPreview = byId('lmSeasonSelectedPreview');
    const status = byId('lmSeasonStatus');
    const addProject = byId('lmSeasonNewProject');
    const count = byId('lmSeasonCount');
    if (![feed,timeline,selectSeason,selectPost,roleInput,frameInput,assetInput,focusInput,periodInput,selectedPreview,status,addProject,count].every(Boolean))return;
    const projectNames = [...new Set(library.map(item=>item.title))];
    const roles = {
      capa:'CAPA',abertura:'ABERTURA',conteudo:'CONTEÚDO',
      detalhe:'DETALHE',contexto:'CONTEXTO',encerramento:'ENCERRAMENTO'
    };
    const frames = {
      integral:'IMAGEM INTEGRAL',
      titulo:'TÍTULO SOBRE IMAGEM',
      respiro:'IMAGEM + RESPIRO',
      recorte:'DETALHE AMPLIADO'
    };
    const focusNames = {
      center:'CENTER',top:'TOP',bottom:'BOTTOM',left:'LEFT',right:'RIGHT'
    };
    const positions = {
      center:[.5,.5],top:[.5,.10],bottom:[.5,.90],
      left:[.1,.5],right:[.9,.5]
    };
    const allowedFrames = role =>
      role==='capa' ? Object.keys(frames) :
      role==='contexto' ? ['integral','titulo','respiro'] : ['integral','recorte'];
    const storageKey = 'labmattar:manual:temporadas:2026:v1';
    let counter = 1;
    const createPost = (asset,role='conteudo',frame='integral') =>
      ({id:'post-'+counter++,asset,role,frame,focus:'center'});
    const defaultState = () => {
      counter=1;
      return {
        seasons:[
          {id:'season-'+counter++,project:'Fome Come',period:'',posts:[
            createPost('fome-come-01','capa','integral'),
            createPost('fome-come-03','conteudo','integral')
          ]},
          {id:'season-'+counter++,project:'Poiesis',period:'',posts:[
            createPost('poiesis-34','capa','respiro'),
            createPost('poiesis-37','detalhe','recorte')
          ]},
          {id:'season-'+counter++,project:'Aleteia',period:'',posts:[
            createPost('aleteia-08','capa','titulo'),
            createPost('aleteia-14','conteudo','integral'),
            createPost('aleteia-18','detalhe','recorte')
          ]}
        ]
      };
    };
    let state=defaultState();
    let seasonId=state.seasons[state.seasons.length-1].id;
    let postId=state.seasons[state.seasons.length-1].posts[0].id;
    function validate(data) {
      if(!data||!Array.isArray(data.seasons)||data.seasons.length<1||data.seasons.length>25)return false;
      const allIds=new Set();
      for(const season of data.seasons){
        if(typeof season.id!=='string'||allIds.has(season.id)||!projectNames.includes(season.project))return false;
        allIds.add(season.id);
        if(typeof season.period!=='string'||season.period.length>32||!Array.isArray(season.posts)||season.posts.length<1||season.posts.length>28)return false;
        let covers=0;
        for(const post of season.posts){
          if(typeof post.id!=='string'||allIds.has(post.id)||!roles[post.role]||!frames[post.frame]||!positions[post.focus])return false;
          if(!allowedFrames(post.role).includes(post.frame))return false;
          if(catalog.get(post.asset)?.title!==season.project)return false;
          covers+=Number(post.role==='capa');allIds.add(post.id);
        }
        if(covers>1)return false;
      }
      return true;
    }
    try{
      const stored=JSON.parse(localStorage.getItem(storageKey)||'null');
      if(validate(stored)){
        state=stored;
        counter=1+Math.max(0,...state.seasons.flatMap(season=>
          [season.id,...season.posts.map(post=>post.id)].map(id=>Number(id.match(/(\d+)$/)?.[1])||0)));
        seasonId=state.seasons[state.seasons.length-1].id;
        postId=state.seasons[state.seasons.length-1].posts[0].id;
      }
    }catch{/* Sem armazenamento local; o exercício continua disponível. */}
    const seasonById = id=>state.seasons.find(season=>season.id===id);
    const selectedSeason=()=>seasonById(seasonId)??state.seasons[0];
    const selectedPost=()=>{
      const s=selectedSeason();return s.posts.find(post=>post.id===postId)??s.posts[0];
    };
    const gallery=project=>library.filter(item=>item.title===project);
    function save(){
      try{localStorage.setItem(storageKey,JSON.stringify(state));}
      catch{announce('O NAVEGADOR NÃO PERMITIU GUARDAR ESTE ESTUDO.');}
    }
    function announce(text){status.textContent=text;}
    function chooseSeason(id){
      const season=seasonById(id);if(!season)return;
      seasonId=id;postId=season.posts[0].id;draw();
    }
    function appendOption(parent,value,label){
      const option=document.createElement('option');
      option.value=value;option.textContent=label;parent.append(option);
    }
    function artwork(season,post){
      const media=catalog.get(post.asset);
      const art=document.createElement('div');
      art.className='lm-season-art';
      art.dataset.frame=post.frame;
      const xy=positions[post.focus];
      art.style.setProperty('--social-focus',(xy[0]*100)+'% '+(xy[1]*100)+'%');
      const image=document.createElement('img');
      image.src=media.src;image.alt='';
      image.loading='lazy';
      art.append(image);
      if(post.frame==='titulo'||post.frame==='respiro'){
        const title=document.createElement('span');
        title.className='lm-season-art-title title';
        title.setAttribute('data-lm-text-role','title');
        title.textContent=season.project;
        art.append(title);
      }
      return art;
    }
    function draw(){
      const current=selectedSeason();
      if(!current)return;
      seasonId=current.id;
      const currentPost=selectedPost();
      postId=currentPost.id;
      timeline.replaceChildren();
      state.seasons.forEach((season,index)=>{
        const button=document.createElement('button');
        button.type='button';
        button.setAttribute('aria-pressed',String(season.id===seasonId));
        button.dataset.seasonId=season.id;
        button.append(
          Object.assign(document.createElement('span'),{className:'detail',textContent:String(index+1).padStart(2,'0')+' / TEMPORADA'}),
          Object.assign(document.createElement('span'),{textContent:season.project}),
          Object.assign(document.createElement('span'),{className:'detail',textContent:season.posts.length+' PUBLICAÇÕES'+(season.period?' / '+season.period:'')})
        );
        button.addEventListener('click',()=>chooseSeason(season.id));
        timeline.append(button);
      });

      feed.replaceChildren();
      const preview=state.seasons.slice().reverse().flatMap(season=>season.posts.slice().reverse().map((post,index)=>
        ({season,post,seasonStart:index===0})));
      preview.forEach(({season,post,seasonStart})=>{
        const button=document.createElement('button');
        button.type='button';button.className='lm-season-post';
        button.dataset.seasonId=season.id;button.dataset.postId=post.id;
        button.dataset.role=post.role;button.dataset.frame=post.frame;
        button.dataset.boundary=String(seasonStart);
        button.setAttribute('aria-pressed',String(season.id===seasonId && post.id===postId));
        button.setAttribute('aria-label',season.project+' / '+roles[post.role]+' / selecionar publicação');
        button.append(artwork(season,post));
        button.addEventListener('click',()=>{seasonId=season.id;postId=post.id;draw();});
        feed.append(button);
      });
      count.textContent=preview.length+' PUBLICAÇÕES / '+state.seasons.length+' TEMPORADAS';

      selectSeason.replaceChildren();
      state.seasons.forEach((season,i)=>appendOption(selectSeason,season.id,
        String(i+1).padStart(2,'0')+' / '+season.project));
      selectSeason.value=seasonId;
      periodInput.value=current.period;
      const si=state.seasons.indexOf(current);
      byId('lmSeasonMoveOlder').disabled=si===0;
      byId('lmSeasonMoveNewer').disabled=si===state.seasons.length-1;

      selectPost.replaceChildren();
      current.posts.forEach((post,i)=>appendOption(selectPost,post.id,
        String(i+1).padStart(2,'0')+' / '+roles[post.role]));
      selectPost.value=postId;
      byId('lmSeasonSelectedCounter').textContent=
        String(current.posts.indexOf(currentPost)+1).padStart(2,'0')+' / '+String(current.posts.length).padStart(2,'0');
      selectedPreview.replaceChildren(artwork(current,currentPost));
      roleInput.value=currentPost.role;
      frameInput.replaceChildren();
      allowedFrames(currentPost.role).forEach(frame=>appendOption(frameInput,frame,frames[frame]));
      frameInput.value=currentPost.frame;
      assetInput.replaceChildren();
      gallery(current.project).forEach(item=>appendOption(assetInput,item.id,item.title+' / '+item.number));
      assetInput.value=currentPost.asset;
      focusInput.value=currentPost.focus;
      const pi=current.posts.indexOf(currentPost);
      byId('lmSeasonPostOlder').disabled=pi===0||current.posts[pi-1]?.role==='capa';
      byId('lmSeasonPostNewer').disabled=pi===current.posts.length-1||currentPost.role==='capa';
      byId('lmSeasonRemovePost').disabled=current.posts.length===1;
      byId('lmSeasonAddPost').disabled=current.posts.length>=gallery(current.project).length;
      byId('lmSeasonRemoveSeason').disabled=state.seasons.length===1;
      addProject.replaceChildren();
      projectNames.forEach(name=>appendOption(addProject,name,name));
      // The chosen season remains legible in a separate inspector; no fake post labels in the grid.
    }
    function changed(note){save();draw();announce(note);}
    function changeSeasonOrder(direction){
      const i=state.seasons.indexOf(selectedSeason()),j=i+direction;
      if(j<0||j>=state.seasons.length)return;
      [state.seasons[i],state.seasons[j]]=[state.seasons[j],state.seasons[i]];
      changed('ORDEM DAS TEMPORADAS ATUALIZADA. CADA PROJETO PERMANECE AGRUPADO.');
    }
    function changePostOrder(direction){
      const season=selectedSeason(),post=selectedPost();
      const i=season.posts.indexOf(post),j=i+direction;
      if(j<0||j>=season.posts.length||post.role==='capa'||season.posts[j].role==='capa')return;
      [season.posts[i],season.posts[j]]=[season.posts[j],season.posts[i]];
      changed('PUBLICAÇÃO REORDENADA DENTRO DA TEMPORADA.');
    }
    selectSeason.addEventListener('change',()=>chooseSeason(selectSeason.value));
    selectPost.addEventListener('change',()=>{postId=selectPost.value;draw();});
    periodInput.addEventListener('input',()=>{
      selectedSeason().period=periodInput.value.slice(0,32);
      save();
      announce('PERÍODO INFORMADO SALVO. NÃO ALTERA AUTOMATICAMENTE A ORDEM DAS TEMPORADAS.');
    });
    periodInput.addEventListener('change',()=>draw());
    byId('lmSeasonMoveOlder').addEventListener('click',()=>changeSeasonOrder(-1));
    byId('lmSeasonMoveNewer').addEventListener('click',()=>changeSeasonOrder(1));
    byId('lmSeasonPostOlder').addEventListener('click',()=>changePostOrder(-1));
    byId('lmSeasonPostNewer').addEventListener('click',()=>changePostOrder(1));
    roleInput.addEventListener('change',()=>{
      const season=selectedSeason(),post=selectedPost(),next=roleInput.value;
      if(!Object.hasOwn(roles,next))return;
      if(next==='capa'){
        season.posts.forEach(other=>{if(other.id!==post.id&&other.role==='capa'){other.role='conteudo';other.frame='integral';}});
        const i=season.posts.indexOf(post);
        if(i>0){season.posts.splice(i,1);season.posts.unshift(post);}
      }
      post.role=next;
      if(!allowedFrames(next).includes(post.frame))post.frame='integral';
      changed('FUNÇÃO EDITORIAL ATUALIZADA. A CAPA, QUANDO PRESENTE, ABRE A TEMPORADA.');
    });
    frameInput.addEventListener('change',()=>{
      const post=selectedPost(),frame=frameInput.value;
      if(!allowedFrames(post.role).includes(frame))return;
      post.frame=frame;changed('ENQUADRAMENTO ATUALIZADO NA TEMPORADA.');
    });
    focusInput.addEventListener('change',()=>{
      const post=selectedPost();
      if(!Object.hasOwn(positions,focusInput.value))return;
      post.focus=focusInput.value;changed('FOCO ATUALIZADO.');
    });
    assetInput.addEventListener('change',()=>{
      const season=selectedSeason(),post=selectedPost();
      const next=assetInput.value;
      if(catalog.get(next)?.title!==season.project)return;
      const duplicate=season.posts.find(other=>other.id!==post.id&&other.asset===next);
      if(duplicate)duplicate.asset=post.asset;
      post.asset=next;
      changed('IMAGEM SUBSTITUÍDA SEM MISTURAR PROJETOS.');
    });
    byId('lmSeasonAddPost').addEventListener('click',()=>{
      const season=selectedSeason();
      const next=gallery(season.project).find(media=>!season.posts.some(post=>post.asset===media.id));
      if(!next){announce('NÃO HÁ MAIS IMAGENS DESTE PROJETO NESTE ACERVO DE DEMONSTRAÇÃO.');return;}
      const post=createPost(next.id);
      season.posts.push(post);postId=post.id;
      changed('PUBLICAÇÃO ADICIONADA À TEMPORADA, SEM ALTERAR OUTROS PROJETOS.');
    });
    byId('lmSeasonRemovePost').addEventListener('click',()=>{
      const season=selectedSeason();
      if(season.posts.length<2)return;
      season.posts.splice(season.posts.findIndex(post=>post.id===postId),1);
      postId=season.posts[season.posts.length-1].id;
      changed('PUBLICAÇÃO RETIRADA APENAS DA TEMPORADA SELECIONADA.');
    });
    byId('lmSeasonAddSeason').addEventListener('click',()=>{
      const project=addProject.value;
      if(!projectNames.includes(project)||state.seasons.length>=25)return;
      const season={id:'season-'+counter++,project,period:'',posts:[createPost(gallery(project)[0].id,'capa','integral')]};
      state.seasons.push(season);seasonId=season.id;postId=season.posts[0].id;
      changed('NOVA TEMPORADA INSERIDA COMO A MAIS RECENTE DO ESTUDO.');
    });
    byId('lmSeasonRemoveSeason').addEventListener('click',()=>{
      if(state.seasons.length<=1)return;
      const season=selectedSeason();
      if(!window.confirm('Retirar a temporada '+season.project+' deste estudo local?'))return;
      state.seasons.splice(state.seasons.indexOf(season),1);
      seasonId=state.seasons[state.seasons.length-1].id;
      postId=selectedSeason().posts[0].id;
      changed('TEMPORADA RETIRADA DO ESTUDO LOCAL.');
    });
    byId('lmSeasonReset').addEventListener('click',()=>{
      if(!window.confirm('Restaurar a ordem demonstrativa das temporadas?'))return;
      state=defaultState();seasonId=state.seasons[state.seasons.length-1].id;
      postId=selectedSeason().posts[0].id;
      changed('ESTUDO DEMONSTRATIVO RESTAURADO. NENHUMA DATA HISTÓRICA FOI INFERIDA.');
    });
    document.querySelectorAll('[data-apply-frame]').forEach(button=>button.addEventListener('click',()=>{
      const next=button.dataset.applyFrame;
      if(!Object.hasOwn(frames,next))return;
      const season=selectedSeason();
      let cover=season.posts.find(post=>post.role==='capa');
      if(!cover){
        cover=season.posts[0];cover.role='capa';
        if(!allowedFrames('capa').includes(cover.frame))cover.frame='integral';
      }
      cover.frame=next;postId=cover.id;
      changed('ENQUADRAMENTO APLICADO À CAPA DE '+season.project.toUpperCase()+'.');
      document.getElementById('temporadas')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));

    function listChronological(){
      return state.seasons.flatMap(season=>season.posts.map(post=>({season,post})));
    }
    function listProfile(){return listChronological().reverse();}
    async function preload(keys){
      const found=[...new Set(keys)];
      return new Map(await Promise.all(found.map(async key=>{
        const image=new Image();image.src=catalog.get(key).src;
        await image.decode();return [key,image];
      })));
    }
    function drawPhoto(ctx,image,x,y,width,height,focus,zoom=1){
      const ratio=Math.max(width/image.naturalWidth,height/image.naturalHeight)*zoom;
      const sw=width/ratio,sh=height/ratio;
      const offset=positions[focus]||[.5,.5];
      const sx=(image.naturalWidth-sw)*offset[0];
      const sy=(image.naturalHeight-sh)*offset[1];
      ctx.drawImage(image,Math.max(0,sx),Math.max(0,sy),sw,sh,x,y,width,height);
    }
    function writeTitle(ctx,text,x,y,maxWidth,size,color){
      ctx.fillStyle=color;ctx.textBaseline='alphabetic';
      ctx.font='300 '+size+'px UniversMattar, Arial, sans-serif';
      const words=text.toUpperCase().split(/\s+/);
      const lines=[];let line='';
      for(const word of words){
        const next=line?line+' '+word:word;
        if(line && ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}
        else line=next;
      }
      if(line)lines.push(line);
      // The layout follows the same title treatment; line breaks are editorial, not a new type scale.
      const advance=size*.98;
      lines.forEach((part,i)=>ctx.fillText(part,x,y-(lines.length-1-i)*advance,maxWidth));
    }
    function drawCanvasArtwork(ctx,image,season,post,x,y,width,height){
      ctx.save();
      ctx.fillStyle='#f7f6f2';ctx.fillRect(x,y,width,height);
      const zone=post.frame==='respiro' ? height*.76 : height;
      drawPhoto(ctx,image,x,y,width,zone,post.focus,post.frame==='recorte'?1.3:1);
      if(post.frame==='titulo'){
        ctx.fillStyle='rgba(0,0,0,.20)';ctx.fillRect(x,y,width,height);
        writeTitle(ctx,season.project,x+width*.07,y+height*.92,width*.86,Math.min(70,Math.max(20,width*.083)),'#fff');
      }
      if(post.frame==='respiro'){
        writeTitle(ctx,season.project,x+width*.07,y+height*.96,width*.86,Math.min(70,Math.max(20,width*.083)),'#181818');
      }
      ctx.restore();
    }
    async function exportImage(items,filename){
      if(!items.length)throw Error('A seleção não contém publicações.');
      await document.fonts.ready;
      const max=30;
      const subset=items.slice(0,max);
      const images=await preload(subset.map(({post})=>post.asset));
      const width=subset.length===1?1080:1200;
      const tileWidth=subset.length===1?1080:Math.floor((1200-2*5)/3);
      const tileHeight=Math.round(tileWidth*4/3);
      const rows=subset.length===1?1:Math.ceil(subset.length/3);
      const canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=rows*tileHeight+Math.max(0,rows-1)*5;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Canvas indisponível.');
      ctx.fillStyle='#f7f6f2';ctx.fillRect(0,0,canvas.width,canvas.height);
      subset.forEach(({season,post},i)=>{
        const column=subset.length===1?0:i%3;
        const row=subset.length===1?0:Math.floor(i/3);
        drawCanvasArtwork(ctx,images.get(post.asset),season,post,column*(tileWidth+5),row*(tileHeight+5),tileWidth,tileHeight);
      });
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw Error('Não foi possível gerar PNG.');
      download(blob,filename);
      return subset.length;
    }
    byId('lmSeasonExportPost').addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        const season=selectedSeason(),post=selectedPost();
        await exportImage([{season,post}],'labmattar-'+season.project.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')+'-'+post.role+'.png');
        announce('PUBLICAÇÃO EXPORTADA EM PNG 1080 × 1440.');
      }catch(e){announce('ERRO NA EXPORTAÇÃO: '+e.message);}
      finally{button.disabled=false;}
    });
    byId('lmSeasonExportFeed').addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        const total=await exportImage(listProfile(),'labmattar-temporadas-estudo-feed.png');
        announce('FEED EXPORTADO / '+total+' PUBLICAÇÕES'+(listProfile().length>30?' MAIS RECENTES':'')+'.');
      }catch(e){announce('ERRO AO EXPORTAR FEED: '+e.message);}
      finally{button.disabled=false;}
    });
    byId('lmSeasonCopyPlan').addEventListener('click',async ()=>{
      const lines=['LABMATTAR / PLANO DE TEMPORADAS / ESTUDO EXEMPLIFICATIVO','ORDEM CRONOLÓGICA INFORMADA / MAIS ANTIGO → MAIS RECENTE'];
      state.seasons.forEach((season,i)=>{
        lines.push('',String(i+1).padStart(2,'0')+' / '+season.project.toUpperCase()+(season.period?' / '+season.period:' / PERÍODO NÃO INFORMADO'));
        season.posts.forEach((post,j)=>lines.push(
          '  '+String(j+1).padStart(2,'0')+' / '+roles[post.role]+' / '+frames[post.frame]+' / '+catalog.get(post.asset).number));
      });
      try{await copy(lines.join('\n'));announce('PLANO EDITORIAL COPIADO EM ORDEM TEMPORAL.');}
      catch{announce('O NAVEGADOR NÃO PERMITIU A CÓPIA.');}
    });
    draw();
    announce('ESTUDO EDITORIAL SALVO NESTE NAVEGADOR. ORDEM INICIAL MERAMENTE ILUSTRATIVA.');
  }

  function init() {
    initAvatar();
    initStoryboard();
    initSeasons();
  }
  if (document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();