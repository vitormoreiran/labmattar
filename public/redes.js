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

  function initFeed() {
    const grid = byId('lmSocialFeedGrid');
    const image = byId('lmFeedActiveImage');
    const title = byId('lmFeedActiveTitle');
    const info = byId('lmFeedActiveInfo');
    const position = byId('lmFeedActivePosition');
    const replace = byId('lmFeedReplace');
    const status = byId('lmSocialFeedStatus');
    const presets = [...document.querySelectorAll('[data-feed-mode]')];
    const left = byId('lmFeedMoveLeft'), right = byId('lmFeedMoveRight');
    if (!grid || !image || !title || !position || !replace || !status || !left || !right) return;

    const defaultOrder = ['aleteia-08','fome-come-01','poiesis-34','concreto-efemero-04','geluminas-03','morangos-carnivoros-02','pe-de-verso-01','dadiva-01','aleteia-14'];
    const sequences = {
      alternado:defaultOrder,
      agrupado:['aleteia-08','aleteia-14','poiesis-34','fome-come-01','concreto-efemero-04','geluminas-03','morangos-carnivoros-02','pe-de-verso-01','dadiva-01']
    };
    const storageKey = 'labmattar:manual:feed:2026:v2';
    let ordered = [...defaultOrder], active = 0, mode = 'alternado';

    function validOrder(list) {
      return Array.isArray(list) && list.length===9 && new Set(list).size===9 && list.every(id=>catalog.has(id));
    }
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey)||'null');
      if (validOrder(stored?.ordered)) {
        ordered = stored.ordered;
        mode = ['alternado','agrupado','manual'].includes(stored.mode)?stored.mode:'manual';
      }
    } catch {/* No storage; manual still works. */}
    function remember() {
      try {
        localStorage.setItem(storageKey,JSON.stringify({ordered,mode}));
      } catch {/* Storage may be disabled. */}
    }
    function announce(text) { status.textContent = text; }
    function getMedia(index) { return catalog.get(ordered[index]); }
    function changeMode(next) {
      mode = next;
      grid.dataset.mode = next;
      presets.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.feedMode===next)));
    }
    function inspect() {
      const item = getMedia(active);
      if (!item) return;
      image.src = item.src;
      image.alt = 'Prévia do projeto '+item.title;
      title.textContent = item.title.toUpperCase()+' / '+item.number;
      position.textContent = String(active+1).padStart(2,'0');
      replace.value = item.id;
      info.textContent = 'Registro do acervo '+item.title+'. A decisão de composição deve partir do conteúdo da imagem.';
      left.disabled = active===0;
      right.disabled = active===ordered.length-1;
    }
    function paint() {
      grid.replaceChildren();
      ordered.forEach((id,index) => {
        const item = catalog.get(id);
        const button = document.createElement('button');
        button.className = 'lm-social-tile';
        button.type = 'button';
        button.draggable = true;
        button.dataset.media = id;
        button.dataset.index = String(index);
        button.setAttribute('aria-pressed',String(index===active));
        button.setAttribute('aria-label',String(index+1).padStart(2,'0')+' / '+item.title+' / selecionar para editar');
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = '';
        img.loading = 'lazy';
        button.appendChild(img);
        button.addEventListener('click',()=>{active=index;paint();});
        button.addEventListener('dragstart',event=>{
          event.dataTransfer.effectAllowed='move';
          event.dataTransfer.setData('text/plain',String(index));
          button.classList.add('lm-social-dragging');
        });
        button.addEventListener('dragend',()=>{
          grid.querySelectorAll('.lm-social-drop-target,.lm-social-dragging').forEach(el=>el.classList.remove('lm-social-drop-target','lm-social-dragging'));
        });
        button.addEventListener('dragover',event=>{
          event.preventDefault();
          event.dataTransfer.dropEffect='move';
          button.classList.add('lm-social-drop-target');
        });
        button.addEventListener('dragleave',()=>button.classList.remove('lm-social-drop-target'));
        button.addEventListener('drop',event=>{
          event.preventDefault();button.classList.remove('lm-social-drop-target');
          const from = Number(event.dataTransfer.getData('text/plain'));
          move(from,index);
        });
        grid.appendChild(button);
      });
      changeMode(mode);
      inspect();
    }
    function move(from,to) {
      if (!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=ordered.length||to>=ordered.length||from===to)return;
      const next=[...ordered];
      next.splice(to,0,next.splice(from,1)[0]);
      ordered=next;active=to;mode='manual';
      paint();remember();announce('SEQUÊNCIA ALTERADA E SALVA NESTE NAVEGADOR.');
    }
    presets.forEach(button=>button.addEventListener('click',()=>{
      const next=button.dataset.feedMode;
      if (!Object.hasOwn(sequences,next))return;
      ordered=[...sequences[next]];active=0;mode=next;
      paint();remember();
      announce(next==='alternado'?'ALTERNADO / ESTUDO REORGANIZADO.':'POR PROJETO / ESTUDO REORGANIZADO.');
    }));
    left.addEventListener('click',()=>move(active,active-1));
    right.addEventListener('click',()=>move(active,active+1));
    replace.addEventListener('change',()=>{
      const nextId=replace.value;
      if (!catalog.has(nextId))return;
      const duplicate=ordered.indexOf(nextId);
      if (duplicate!==-1 && duplicate!==active) {
        [ordered[active],ordered[duplicate]]=[ordered[duplicate],ordered[active]];
      } else {ordered[active]=nextId;}
      mode='manual';paint();remember();announce('PUBLICAÇÃO SUBSTITUÍDA E SALVA NESTE NAVEGADOR.');
    });
    byId('lmFeedReset')?.addEventListener('click',()=>{
      ordered=[...defaultOrder];active=0;mode='alternado';paint();remember();announce('ESTUDO ORIGINAL RESTAURADO.');
    });
    byId('lmFeedCopy')?.addEventListener('click',async ()=>{
      const text='LABMATTAR / ESTUDO DE FEED\n'+ordered.map((id,index)=>{
        const item=catalog.get(id);
        return String(index+1).padStart(2,'0')+' / '+item.title+' / '+item.number;
      }).join('\n');
      try {await copy(text);announce('SEQUÊNCIA COPIADA PARA A ÁREA DE TRANSFERÊNCIA.');}
      catch {announce('NÃO FOI POSSÍVEL COPIAR; VERIFIQUE AS PERMISSÕES DO NAVEGADOR.');}
    });
    byId('lmFeedExport')?.addEventListener('click',async (event)=>{
      const button=event.currentTarget;
      button.disabled=true;announce('GERANDO PRÉVIA PNG...');
      try {
        const photos=await Promise.all(ordered.map(async id=>{
          const img=new Image();img.src=catalog.get(id).src;await img.decode();return img;
        }));
        const canvas=document.createElement('canvas');
        canvas.width=1200;canvas.height=1600;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#f7f6f2';ctx.fillRect(0,0,canvas.width,canvas.height);
        const gutter=6, width=(canvas.width-gutter*2)/3, height=(canvas.height-gutter*2)/3;
        photos.forEach((photo,i)=>{
          const column=i%3,row=Math.floor(i/3),x=column*(width+gutter),y=row*(height+gutter);
          const scale=Math.max(width/photo.naturalWidth,height/photo.naturalHeight);
          const sw=width/scale,sh=height/scale;
          const sx=(photo.naturalWidth-sw)/2,sy=(photo.naturalHeight-sh)/2;
          ctx.drawImage(photo,sx,sy,sw,sh,x,y,width,height);
        });
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        if(!blob)throw new Error('Canvas não gerou arquivo');
        download(blob,'labmattar-estudo-feed.png');
        announce('PRÉVIA PNG GERADA / 1200 × 1600 PX.');
      }catch(error){
        announce('NÃO FOI POSSÍVEL GERAR O PNG / '+error.message);
      }finally{button.disabled=false;}
    });
    paint();remember();
    announce('ESTUDO SALVO NESTE NAVEGADOR. SELECIONE OU ARRASTE PARA EDITAR.');
  }

  function init() {
    initAvatar();
    initStoryboard();
    initFeed();
  }
  if (document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();