const artists=[
['Antoni Miralda','Espanha · Estados Unidos','/assets/chapter4/simposio/artists/antoni-miralda.jpg','Artista multidisciplinar catalão e referência internacional no uso da comida como linguagem artística, ritual político e matéria para instalações de grande escala.'],
['RETRIEVE / Coletivos de Food Design','Índia','/assets/chapter4/simposio/roda.webp','Iniciativas indianas dedicadas ao resgate e ao redesenho de sistemas alimentares, aproximando tradição, cultura gastronômica e design sustentável.'],
['Marije Vogelzang','Países Baixos','/assets/chapter4/simposio/artists/marije-vogelzang.jpg','Pioneira do Eating Design, investiga a psicologia, a sociologia e os rituais da alimentação, além das relações sensoriais entre pessoas e alimentos.'],
['Francesca Zampollo','Itália · Nova Zelândia','/assets/chapter4/simposio/artists/francesca-zampollo.jpg','Pesquisadora e metodologista, fundou a International Food Design Society e desenvolveu uma abordagem própria para o Food Design Thinking.'],
['Rirkrit Tiravanija','Tailândia · Estados Unidos','/assets/chapter4/simposio/artists/rirkrit-tiravanija.jpg','Expoente da arte relacional, transforma o preparo e o compartilhamento de refeições em performance, convivência e experiência social.'],
['Bompas & Parr','Reino Unido','/assets/chapter4/simposio/artists/bompas-parr.jpg','Estúdio britânico de Sam Bompas e Harry Parr, conhecido por instalações imersivas, arquitetura comestível e experiências sensoriais em grande escala.'],
['Laila Gohar','Egito · Estados Unidos','/assets/chapter4/simposio/artists/laila-gohar.jpg','Artista e designer que trabalha a comida como instalação escultórica e elemento cenográfico em jantares, eventos de moda e exposições.'],
['Honey & Bunny','Áustria','/assets/chapter4/simposio/artists/honey-bunny.jpg','Dupla que atua na interseção entre design, arquitetura e o ato de comer, investigando alimentos industrializados, etiqueta e sustentabilidade.'],
['Marta Cárdenas e Martí Guixé','Espanha','/assets/chapter4/simposio/artists/marti-guixe.jpg','A dupla aproxima arte, design e alimentação em projetos que tratam a comida como linguagem, produto e experiência cotidiana.'],
['Luki Huber','Suíça · Espanha','/assets/chapter4/simposio/artists/luki-huber.jpg','Designer de produtos que colaborou com o elBulli na criação de utensílios, ferramentas e novas formas para a cozinha tecnoemocional.'],
['Ferran Adrià & elBullifoundation','Espanha','/assets/chapter4/simposio/artists/ferran-adria.jpg','Seu trabalho transcendeu a culinária tradicional ao introduzir metodologias de design, desconstrução e pesquisa de materiais à gastronomia contemporânea.'],
['Chloé Rutzerveld','Países Baixos','/assets/chapter4/simposio/artists/chloe-rutzerveld.jpg','Designer e pesquisadora do futuro da alimentação, atua na interseção entre tecnologia, biologia e gastronomia e é conhecida pelo projeto Edible Growth.'],
['Steinbeisser / Experimental Gastronomy','Países Baixos · Alemanha','/assets/chapter4/simposio/teaser.webp','Plataforma de Martin Kullik e Jouw Wijnsma que reúne artistas e designers para redesenhar o banquete e estimular uma alimentação consciente e sensorial.'],
['Carole Collet','Reino Unido','/assets/chapter4/simposio/artists/carole-collet.jpg','Professora e pesquisadora da Central Saint Martins focada em Biodesign e no uso de biomateriais agrícolas e alimentares.'],
['Kirsten Tibballs e Dinara Kasko','Austrália · Ucrânia','/assets/chapter4/simposio/artists/dinara-kasko.jpg','Referências da confeitaria contemporânea, combinam precisão técnica, arquitetura, modelagem tridimensional e experimentação formal.'],
['Sonia Massari','Itália','/assets/chapter4/simposio/artists/sonia-massari.png','Pesquisadora e diretora pedagógica do FORK Organization, especialista na integração entre Food Design, educação e sustentabilidade.'],
['Katja Gruijters','Países Baixos','/assets/chapter4/simposio/artists/katja-gruijters.jpg','Designer conceitual dedicada a sistemas alimentares, redução do desperdício, reaproveitamento gastronômico e proteínas sustentáveis.'],
['Emiliana Design Studio','Espanha','/assets/chapter4/simposio/areas.webp','Estúdio de Ana Mir e Emili Padrós que desenvolve projetos sobre rituais de consumo, embalagens comestíveis e utensílios para a mesa.'],
['Studio Appétit / Ido Garini','Países Baixos · Israel','/assets/chapter4/simposio/artists/studio-appetit.jpg','Estúdio de design e pesquisa culinária voltado ao consumo emocional, às instalações sensoriais e aos banquetes conceituais.'],
['Pedro Reissig','Argentina','/assets/chapter4/simposio/ingredientes.webp','Arquiteto, pesquisador e professor pioneiro no estudo da morfologia dos alimentos e na sistematização do Food Design na América Latina.']
];

const ambientSources=[
 '/assets/chapter4/simposio/instituto.webp','/assets/chapter4/simposio/cacau.webp',
 '/assets/chapter4/simposio/whashinton-da-selva.webp','/assets/chapter4/simposio/areas-detalhe.webp',
 '/assets/chapter4/simposio/opa-vivara-detalhe.webp',
 '/assets/chapter4/simposio/opa-vivara.webp','/assets/chapter4/simposio/ambua.webp',
 '/assets/chapter4/simposio/ingredientes.webp','/assets/chapter4/simposio/roda.webp',
 '/assets/chapter4/simposio/teaser.webp','/assets/chapter4/simposio/como-penso-bg.png',
 '/assets/chapter4/simposio/caranguejada.webp',
 '/assets/chapter4/simposio/parceria.webp','/assets/chapter4/simposio/cocao.webp',
 '/assets/chapter4/simposio/mesa.webp',
 '/assets/projects-v2/aleteia/15.jpg','/assets/projects-v2/covers/section-jantares-imersivos.jpg'
];
const ambient=document.createElement('div');
ambient.className='simposio-ambient';
ambient.setAttribute('aria-hidden','true');
ambient.innerHTML=`<div class="simposio-ambient-images">${ambientSources.map((src,index)=>`<img src="${src}" alt="" class="${index===0?'is-active':''}">`).join('')}</div><div class="simposio-ambient-veil"></div>`;
document.body.prepend(ambient);
function setAmbient(src,tone='dark'){
  ambient.querySelectorAll('img').forEach(image=>image.classList.toggle('is-active',image.getAttribute('src')===src));
  document.documentElement.dataset.ambientTone=tone;
}
const ambientBySection={
 abertura:['/assets/chapter4/simposio/instituto.webp','dark'],tese:['/assets/chapter4/simposio/instituto.webp','light'],
 porque:['/assets/chapter4/simposio/instituto.webp','why-green'],'dialogo-intercultural':['/assets/chapter4/simposio/instituto.webp','why-green'],
 'endosso-institucional':['/assets/chapter4/simposio/instituto.webp','why-green'],interdisciplinaridade:['/assets/chapter4/simposio/instituto.webp','why-green'],
 internacionalizacao:['/assets/chapter4/simposio/instituto.webp','why-green'],sustentabilidade:['/assets/chapter4/simposio/instituto.webp','why-green'],
 formacao:['/assets/chapter4/simposio/instituto.webp','why-green'],plataforma:['/assets/chapter4/simposio/instituto.webp','why-green'],
 instituto:['/assets/chapter4/simposio/instituto.webp','institute'],saberes:['/assets/chapter4/simposio/whashinton-da-selva.webp','institute-art'],
 campo:['/assets/chapter4/simposio/areas-detalhe.webp','institute-art'],pratica:['/assets/chapter4/simposio/opa-vivara-detalhe.webp','institute-art'],
 linguagem:['/assets/chapter4/simposio/cacau.webp','language'],'frente-1':['/assets/chapter4/simposio/opa-vivara.webp','dark'],
 'como-penso':['/assets/chapter4/simposio/como-penso-bg.png','manifesto'],questoes:['/assets/chapter4/simposio/instituto.webp','soft-green'],
 formato:['/assets/chapter4/simposio/instituto.webp','soft-green'],parceria:['/assets/chapter4/simposio/caranguejada.webp','warm-dark'],
 'contribuicoes-parceria':['/assets/chapter4/simposio/parceria.webp','warm-dark'],
 'conteudo-legado':['/assets/chapter4/simposio/cocao.webp','warm-dark'],
 legado:['/assets/chapter4/simposio/mesa.webp','warm-dark'],convidados:['/assets/chapter4/simposio/teaser.webp','dark']
};

const editorialSections=['abertura','tese','porque','dialogo-intercultural','endosso-institucional','instituto','saberes','campo','pratica'].map(id=>document.getElementById(id));
const editorialRun=document.createElement('div');
editorialRun.className='editorial-run';
editorialSections[0].before(editorialRun);
editorialSections.forEach(section=>editorialRun.append(section));
const editorialBackdrop=document.createElement('div');
editorialBackdrop.className='editorial-backdrop';
editorialBackdrop.setAttribute('aria-hidden','true');
editorialRun.prepend(editorialBackdrop);
const editorialBackgroundObserver=new IntersectionObserver(entries=>{
  const current=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(!current)return;
  const step=editorialSections.indexOf(current.target);
  const state=step===0?{scale:1.08,y:54}:step===1?{scale:1.42,y:43}:{scale:1.18,y:34};
  editorialRun.style.setProperty('--editorial-scale',state.scale);
  editorialRun.style.setProperty('--editorial-y',`${state.y}%`);
},{threshold:[.25,.5,.75]});
editorialSections.forEach(section=>editorialBackgroundObserver.observe(section));

/* Reapply deep links after the editorial sections have been moved into their run. */
const initialSectionId=window.location.hash.slice(1);
if(initialSectionId){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.getElementById(initialSectionId)?.scrollIntoView({behavior:'auto',block:'start'});
  }));
}

const carouselSlides=[
 ['/assets/chapter4/simposio/opa-vivara.webp','Gastronomia socioambiental','<p>O Instituto de Gastroperformance desenvolve projetos que fomentam o equilíbrio dos sistemas alimentares globais, analisam os atuais modelos agrícolas e propõem ações de prevenção ao esgotamento dos recursos ecológicos.</p><p>Além disso, busca construir um olhar crítico para a superprodução e o consumo exagerado de alimentos ultraprocessados e auxiliar no desenho de políticas de combate à fome e aos transtornos alimentares.</p><p>Fomenta a preservação ambiental, por meio de práticas que vão do aproveitamento integral dos alimentos e estímulo ao consumo de produtos e serviços locais, passando pela diversificação das espécies e pela melhoria da atividade orgânica do solo. Incentiva projetos ligados à agroecologia e à promoção da saúde, e apoia ações voltadas ao desenvolvimento sustentável, ampliando a cooperação com órgãos públicos e com a sociedade civil.</p>','Instalação Opá Vivara com redes e materiais reutilizados'],
 ['/assets/chapter4/simposio/ingredientes.webp','Food Design','<p>A Gastroperformance lança mão do design como disciplina estratégica para a sustentabilidade das cadeias alimentares, por meio do planejamento e da implementação de planos de desenvolvimento de identidade gastronômica.</p><p>Constrói, assim, novas percepções sobre locais (regiões, cidades, bairros) e promove o envolvimento afetivo das populações com seus territórios, por meio da comida.</p>','Ingredientes dispostos em recipientes'],
 ['/assets/chapter4/simposio/roda.webp','Performance artística','<p>Mais do que conduzir o participante de uma gastroperformance a compreender os vínculos históricos e culturais que conferem significado aos alimentos, busca-se instaurar uma experiência que mobilize o corpo por inteiro, atravessada por percepções e afetos.</p><p>Ela se desenrola simultaneamente nos planos narrativo e sensorial. Imagens, sons e sabores se entrelaçam como em uma ópera que reúne música, poesia, drama, artes visuais e cênicas. Nesse palco expandido, a comida se afirma como linguagem expressiva, capaz de articular enunciados críticos e poéticos.</p><p>Inspiradas pela efemeridade da performance e pela ritualização do ato de comer, as gastroperformances são acontecimentos únicos, compostos de comida, imagens, sons e, sobretudo, pessoas.</p>','Pessoas reunidas ao redor de uma mesa'],
 ['/assets/chapter4/simposio/ambua.webp','Pensamento','<p>Os projetos desenvolvidos no Instituto de Gastroperformance articulam discursos e metodologias que recusam a separação entre o pensamento acadêmico e a prática profissional.</p><p>Há um compromisso com a des-hierarquização dos saberes e com o fomento à reflexão crítica como motor para a inovação eticamente comprometida.</p><p>Na confluência de gastronomia, design, nutrição, economia, ecologia, antropologia, sociologia e artes, apostamos na construção de um pensamento livre das amarras disciplinares e comprometido com as complexidades das práticas alimentares.</p>','Espigas de milho em instalação']
];
const carousel=document.getElementById('frente-1');
carousel.className='section field-carousel front-sequence';
carousel.innerHTML=`<div class="front-sticky"><div class="front-copy-stack"></div><div class="front-visual-stack"></div></div>`;
['frente-2','frente-3','frente-4'].forEach(id=>document.getElementById(id)?.remove());
const frontCopyStack=carousel.querySelector('.front-copy-stack');
const frontVisualStack=carousel.querySelector('.front-visual-stack');
const mixedFrontTitle=(label,index)=>label.split(' ').map((word,wordIndex)=>`<b class="${(wordIndex+index)%2?'mix-p':'mix-u'}">${word}</b>`).join(' ');
carouselSlides.forEach(([src,label,description,alt],index)=>{
  frontCopyStack.insertAdjacentHTML('beforeend',`<article class="front-copy ${index===0?'is-active':''}" data-front="${index}"><p class="eyebrow">${String(index+1).padStart(2,'0')} · Quatro áreas · um só campo</p><h2 class="mix-title"><span class="mix-line">${mixedFrontTitle(label,index)}</span></h2><div class="front-description">${description}</div></article>`);
  frontVisualStack.insertAdjacentHTML('beforeend',`<figure class="front-visual ${index===0?'is-active':''}" data-front="${index}"><div class="front-m"><img src="${src}" alt="${alt}"></div><figcaption>${label}</figcaption></figure>`);
});
const mobileFrontDeck=document.createElement('div');
mobileFrontDeck.className='front-mobile-deck';
carouselSlides.forEach((slide,index)=>{
  const page=document.createElement('article');
  page.className='front-mobile-page';
  page.append(
    frontCopyStack.querySelector(`[data-front="${index}"]`).cloneNode(true),
    frontVisualStack.querySelector(`[data-front="${index}"]`).cloneNode(true)
  );
  mobileFrontDeck.append(page);
});
carousel.append(mobileFrontDeck);
let carouselIndex=0;
function showCarouselSlide(index){
  carouselIndex=index;
  carousel.querySelectorAll('.front-copy,.front-visual').forEach(item=>item.classList.toggle('is-active',Number(item.dataset.front)===index));
  if(carousel.classList.contains('is-in-view'))setAmbient(carouselSlides[index][0],'dark');
}
showCarouselSlide(0);

['gastronomia','preservacao','food-design','performance'].forEach(id=>document.getElementById(id)?.remove());

const outcomesSequence=document.getElementById('parceria');
const legacySection=document.getElementById('legado');
let outcomeSequenceStage='participation';
if(outcomesSequence&&legacySection){
  const articles=[...outcomesSequence.querySelectorAll('.outcome-list article')];
  const baseFigure=outcomesSequence.querySelector('figure');
  const baseList=outcomesSequence.querySelector('.outcome-list');
  const pageData=[
    ['parceria','Participação ampliada','/assets/chapter4/simposio/caranguejada.webp','Caranguejada servida como experiência coletiva','Caranguejada servida como experiência coletiva'],
    ['contribuicoes-parceria','Publicações e cursos','/assets/chapter4/simposio/parceria.webp','Objeto artístico do Instituto de Gastroperformance','Instituto de Gastroperformance'],
    ['conteudo-legado','Conteúdo pós-simpósio','/assets/chapter4/simposio/cocao.webp','Composição ritual com alimentos e objetos sobre a mesa','Conhecimento, experiência e circulação']
  ];
  articles.forEach((article,index)=>{
    if(index===0){
      baseList.replaceChildren(article);
      outcomesSequence.dataset.title=pageData[index][1];
      return;
    }
    const page=outcomesSequence.cloneNode(false);
    page.id=pageData[index][0];
    page.dataset.title=pageData[index][1];
    const figure=baseFigure.cloneNode(true);
    const image=figure.querySelector('img');
    const caption=figure.querySelector('figcaption');
    image.src=pageData[index][2];
    image.alt=pageData[index][3];
    caption.textContent=pageData[index][4];
    const list=baseList.cloneNode(false);
    list.append(article);
    page.append(figure,list);
    legacySection.before(page);
  });
}
/* Na versão editorial de teste, participação e legado permanecem como
   páginas independentes. Assim a página usa apenas a rolagem principal. */
if(false&&outcomesSequence&&legacySection){
  const participationFigure=outcomesSequence.querySelector('figure');
  const participationCopy=outcomesSequence.querySelector('.outcome-list');
  const legacyFigure=legacySection.querySelector('figure');
  const legacyCopy=legacySection.querySelector(':scope > div');
  const sticky=document.createElement('div');
  sticky.className='outcomes-sticky';
  const participationState=document.createElement('div');
  participationState.className='outcome-state outcome-state-participation is-active';
  const legacyState=document.createElement('div');
  legacyState.className='outcome-state outcome-state-legacy legacy';
  participationState.append(participationFigure,participationCopy);
  legacyState.append(legacyFigure,legacyCopy);
  sticky.append(participationState,legacyState);
  outcomesSequence.replaceChildren(sticky);
  outcomesSequence.classList.add('outcomes-sequence');
  legacySection.remove();
}

const sectionData=[...document.querySelectorAll('.section[id]')];
const manifestoPoster=document.querySelector('.manifesto-poster');
manifestoPoster?.addEventListener('click',()=>{
  const frame=manifestoPoster.nextElementSibling;
  if(frame?.dataset.src){frame.src=frame.dataset.src;delete frame.dataset.src;}
  manifestoPoster.classList.add('is-playing');
});
document.documentElement.classList.add('motion-ready');
const motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  entry.target.classList.toggle('is-in-view',entry.isIntersecting);
}),{threshold:.04,rootMargin:'0px'});
sectionData.forEach(section=>motionObserver.observe(section));
let activeStageId='';
let stageFrame=0;
function updateScrollStage(){
  stageFrame=0;
  const instituteStart=document.getElementById('instituto');
  const instituteEnd=document.getElementById('pratica');
  if(instituteStart&&instituteEnd){
    const travel=Math.max(1,instituteEnd.offsetTop-instituteStart.offsetTop);
    const progress=Math.max(0,Math.min(1,(window.scrollY-instituteStart.offsetTop)/travel));
    document.documentElement.style.setProperty('--institute-shift',`${(-progress*18).toFixed(2)}vh`);
  }
  const questionsSection=document.getElementById('questoes');
  const formatSection=document.getElementById('formato');
  if(questionsSection&&formatSection){
    const travel=Math.max(1,formatSection.offsetTop-questionsSection.offsetTop);
    const progress=Math.max(0,Math.min(1,(window.scrollY-questionsSection.offsetTop)/travel));
    document.documentElement.style.setProperty('--soft-green-shift',`${(-progress*14).toFixed(2)}vh`);
  }
  if(carousel?.classList.contains('front-sequence')){
    const rect=carousel.getBoundingClientRect();
    const travel=Math.max(1,rect.height-window.innerHeight);
    const progress=Math.max(0,Math.min(1,-rect.top/travel));
    const active=Math.min(carouselSlides.length-1,Math.floor(progress*carouselSlides.length));
    carousel.querySelectorAll('.front-copy,.front-visual').forEach(item=>{
      const index=Number(item.dataset.front);
      item.style.opacity=index===active?'1':'0';
      item.style.transform='none';
      item.style.pointerEvents=index===active?'auto':'none';
    });
    if(active!==carouselIndex&&rect.bottom>0&&rect.top<window.innerHeight)showCarouselSlide(active);
  }
  if(outcomesSequence?.classList.contains('outcomes-sequence')){
    const rect=outcomesSequence.getBoundingClientRect();
    const travel=Math.max(1,rect.height-window.innerHeight);
    const progress=Math.max(0,Math.min(1,-rect.top/travel));
    const nextStage=progress<.52?'participation':'legacy';
    outcomesSequence.classList.toggle('is-legacy',nextStage==='legacy');
    if(nextStage!==outcomeSequenceStage&&rect.bottom>0&&rect.top<window.innerHeight){
      outcomeSequenceStage=nextStage;
      const state=nextStage==='legacy'?ambientBySection.legado:ambientBySection.parceria;
      setAmbient(state[0],state[1]);
    }
  }
  const viewportCenter=window.innerHeight*.5;
  let activeSection=null;
  let activeDistance=Infinity;
  sectionData.forEach(section=>{
    const rect=section.getBoundingClientRect();
    if(section.classList.contains('roster')){section.style.setProperty('--panel-opacity','1');return;}
    const coversViewport=rect.top<=0&&rect.bottom>=window.innerHeight;
    const center=rect.top+Math.min(rect.height,window.innerHeight)*.5;
    const distance=Math.abs(center-viewportCenter);
    const opacity=coversViewport?1:Math.max(0,Math.min(1,1-distance/(window.innerHeight*.53)));
    section.style.setProperty('--panel-opacity',opacity.toFixed(3));
    if(rect.bottom>0&&rect.top<window.innerHeight&&distance<activeDistance){activeDistance=distance;activeSection=section;}
  });
  if(activeSection&&activeSection.id!==activeStageId){
    activeStageId=activeSection.id;
    const state=ambientBySection[activeStageId];
    if(state)setAmbient(activeStageId==='frente-1'?carouselSlides[carouselIndex][0]:state[0],state[1]);
  }
}
function requestStageUpdate(){if(!stageFrame)stageFrame=requestAnimationFrame(updateScrollStage);}
window.addEventListener('scroll',requestStageUpdate,{passive:true});
window.addEventListener('resize',requestStageUpdate);
updateScrollStage();

let sectionSettleTimer=0;
let sectionSettleLock=false;
function settleCompleteSection(){
  if(sectionSettleLock)return;
  const viewport=window.innerHeight;
  const candidates=sectionData.filter(section=>section.getBoundingClientRect().height<=viewport*1.05);
  let closest=null;
  let distance=Infinity;
  candidates.forEach(section=>{
    const top=section.getBoundingClientRect().top;
    const currentDistance=Math.abs(top);
    if(currentDistance<distance){closest=section;distance=currentDistance;}
  });
  if(!closest||distance<2||distance>viewport*.48)return;
  sectionSettleLock=true;
  const top=window.scrollY+closest.getBoundingClientRect().top;
  window.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  window.setTimeout(()=>{sectionSettleLock=false;},650);
}
window.addEventListener('scroll',()=>{
  if(sectionSettleLock)return;
  window.clearTimeout(sectionSettleTimer);
  sectionSettleTimer=window.setTimeout(settleCompleteSection,170);
},{passive:true});
const chapters=[
 ['abertura','Abertura'],['tese','Ponto de partida'],['porque','Por que este simpósio?'],['instituto','O Instituto'],
 ['linguagem','Quatro áreas'],['frente-1','Áreas de atuação'],['como-penso','Como penso como'],
 ['questoes','Questões'],['formato','Formato'],['parceria','Participação e legado'],['convidados','Vozes convidadas']
];
const pageNav=document.querySelector('.page-nav ol');
chapters.forEach(([id,title],index)=>{
  const li=document.createElement('li');
  li.innerHTML=`<a href="#${id}" data-chapter="${index+1}" aria-label="${title}">${index+1}</a>`;
  pageNav.append(li);
});
const siteChapters=[
  ['01','Gastroperformance','/'],['02','Portfólio','/capitulo-2'],['03','Sobre','/capitulo-3'],
  ['04','Apresentação','/capitulo-4'],['05','Contato','/capitulo-5']
];
function populateChapterNav(nav){
  siteChapters.forEach(([number,title,href],index)=>{
    const link=document.createElement('a');
    link.href=href;
    link.dataset.label=title;
    link.setAttribute('aria-label',`${Number(number)} — ${title}`);
    link.innerHTML=`<span class="chapter-nav-number" aria-hidden="true">${Number(number)}</span><span class="chapter-nav-label">${title}</span>`;
    link.style.setProperty('--item-index',index);
    if(number==='04')link.setAttribute('aria-current','page');
    nav.append(link);
  });
}
document.querySelectorAll('.chapter-nav,.mobile-numbers').forEach(populateChapterNav);
function populateProjectMenu(nav){
  const group=document.createElement('div');
  group.className='project-menu-group contextual-menu-group';
  group.style.setProperty('--group-index',0);
  group.innerHTML='<div class="project-menu-items"></div>';
  const items=group.querySelector('.project-menu-items');
  chapters.forEach(([id,title],index)=>{
    const link=document.createElement('a');
    link.href=`#${id}`; link.textContent=title; link.style.setProperty('--item-index',index);
    items.append(link);
  });
  nav.append(group);
}
document.querySelectorAll('.project-menu,.mobile-project-menu').forEach(populateProjectMenu);

const scrambleAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÃÂÉÊÍÓÔÕÚÇ0123456789';
function scrambleText(value,progress,seed){
  let position=0;
  const length=Math.max(1,value.replace(/\s/g,'').length-1);
  return Array.from(value).map(character=>{
    if(/\s/.test(character))return character;
    const threshold=position/length;
    const random=Math.abs(Math.floor(Math.sin((position+1)*12.9898+seed*8.43)*43758.5453));
    position+=1;
    return progress>=threshold?character:scrambleAlphabet[random%scrambleAlphabet.length];
  }).join('');
}
document.querySelectorAll('.section h1,.section h2').forEach(heading=>{
  if(heading.closest('.roster'))return;
  const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())if(walker.currentNode.nodeValue.trim())nodes.push([walker.currentNode,walker.currentNode.nodeValue]);
  heading.setAttribute('aria-label',heading.textContent.trim().replace(/\s+/g,' '));
  let frame=0;
  const play=()=>{
    cancelAnimationFrame(frame);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){nodes.forEach(([node,value])=>node.nodeValue=value);return;}
    const start=performance.now();
    const tick=now=>{
      const progress=Math.min(1,(now-start)/620);
      nodes.forEach(([node,value],index)=>node.nodeValue=scrambleText(value,progress,progress*41+index));
      if(progress<1)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
  };
  const headingObserver=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)play();},{threshold:.5});
  headingObserver.observe(heading);
});

const list=document.querySelector('.artist-list');
artists.forEach(([name,region,photo,description],index)=>{
  const item=document.createElement('li');
  item.innerHTML=`<details class="artist"><summary><img class="artist-photo zoomable" src="${photo}" alt="${name}" loading="lazy"><span class="artist-no">${String(index+1).padStart(2,'0')}</span><span class="artist-name">${name}</span><span class="artist-region">${region}</span><span class="artist-plus" aria-hidden="true">+</span></summary><div class="artist-detail"><span class="artist-region">${region}</span><p>${description}</p></div></details>`;
  list.append(item);
});

const sections=[...document.querySelectorAll('.section[id]')];
const navLinks=[...document.querySelectorAll('.page-nav a')];
const progress=document.querySelector('.progress-label');
const siteChrome=document.querySelector('.site-chrome');
const observer=new IntersectionObserver(entries=>{
  const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(!visible)return;
  const index=sections.indexOf(visible.target);
  const chapterForIndex=chapters.reduce((active,[id],chapterIndex)=>{
    const chapterSection=document.getElementById(id);
    return chapterSection&&sections.indexOf(chapterSection)<=index?chapterIndex+1:active;
  },1);
  navLinks.forEach(link=>link.classList.toggle('is-active',Number(link.dataset.chapter)===chapterForIndex));
  const needsDarkChrome=visible.target.matches('.themes,.format,.outcomes,.legacy');
  siteChrome?.classList.toggle('is-dark',needsDarkChrome);
  if(progress)progress.textContent=`${String(index+1).padStart(2,'0')} / ${String(sections.length).padStart(2,'0')}`;
},{threshold:[.2,.45,.7]});
sections.forEach(section=>observer.observe(section));

const lightbox=document.querySelector('.lightbox');
const lightboxImage=lightbox.querySelector('img');
const lightboxCaption=lightbox.querySelector('figcaption');
function closeLightbox(){lightbox.classList.remove('is-open');document.documentElement.style.overflow='';}
document.addEventListener('click',event=>{
  let image=event.target.closest('.zoomable');
  if(!image){
    const imageCard=event.target.closest('.field');
    image=imageCard?.querySelector('img.zoomable');
  }
  if(!image)return;
  event.preventDefault();
  lightboxImage.src=image.currentSrc||image.src;
  lightboxImage.alt=image.alt;
  lightboxCaption.textContent=image.alt;
  lightbox.classList.add('is-open');
  document.documentElement.style.overflow='hidden';
  lightbox.querySelector('button').focus();
});
lightbox.addEventListener('click',event=>{if(event.target===lightbox||event.target.closest('button'))closeLightbox();});
window.addEventListener('keydown',event=>{if(event.key==='Escape')closeLightbox();});

const chapterMenus=[...document.querySelectorAll('.chapter-nav,.mobile-numbers')];
const projectMenus=[...document.querySelectorAll('.project-menu,.mobile-project-menu')];
const chapterButtons=[...document.querySelectorAll('.vase-button,.mobile-vase-toggle')];
const projectButtons=[...document.querySelectorAll('.monogram-button,.mobile-monogram-toggle')];
let chapterMenuOpen=false;
let projectMenuOpen=false;
function applyMenuState(){
  chapterMenus.forEach(menu=>menu.classList.toggle('is-open',chapterMenuOpen));
  projectMenus.forEach(menu=>menu.classList.toggle('is-open',projectMenuOpen));
  chapterButtons.forEach(button=>{button.classList.toggle('is-open',chapterMenuOpen);button.setAttribute('aria-expanded',chapterMenuOpen);button.setAttribute('aria-label',`${chapterMenuOpen?'Fechar':'Abrir'} menu de capítulos`);});
  projectButtons.forEach(button=>{button.classList.toggle('is-open',projectMenuOpen);button.setAttribute('aria-expanded',projectMenuOpen);button.setAttribute('aria-label',`${projectMenuOpen?'Fechar':'Abrir'} sumário do capítulo`);});
  document.querySelector('.left-rail')?.classList.toggle('has-chapter-menu',chapterMenuOpen);
  document.querySelector('.right-rail')?.classList.toggle('has-project-menu',projectMenuOpen);
}
chapterButtons.forEach(button=>button.addEventListener('click',()=>{
  chapterMenuOpen=!chapterMenuOpen;
  projectMenuOpen=false;
  applyMenuState();
}));
projectButtons.forEach(button=>button.addEventListener('click',()=>{
  projectMenuOpen=!projectMenuOpen;
  chapterMenuOpen=false;
  applyMenuState();
}));
document.querySelectorAll('.project-menu a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  const target=document.querySelector(link.getAttribute('href'));
  chapterMenuOpen=false; projectMenuOpen=false; applyMenuState();
  if(target){history.replaceState(null,'',link.getAttribute('href'));target.scrollIntoView({behavior:'smooth'});}
}));
document.addEventListener('pointerdown',event=>{
  if(!chapterMenuOpen&&!projectMenuOpen)return;
  if(event.target.closest('.left-rail,.right-rail,.mobile-topbar'))return;
  chapterMenuOpen=false; projectMenuOpen=false; applyMenuState();
});
document.querySelectorAll('[data-confirm-home]').forEach(link=>link.addEventListener('click',event=>{
  if(!window.confirm('Voltar à página inicial?'))event.preventDefault();
}));
window.addEventListener('keydown',event=>{if(event.key==='Escape'){chapterMenuOpen=false;projectMenuOpen=false;applyMenuState();}});






