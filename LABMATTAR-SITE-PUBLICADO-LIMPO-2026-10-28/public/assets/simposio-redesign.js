const artists=[
['Antoni Miralda','Espanha / EUA','/assets/chapter4/simposio/artists/antoni-miralda.jpg','Artista multidisciplinar catalão de referência internacional, pioneiro na utilização da comida como linguagem artística, ritual político e objeto de instalação em grande escala desde os anos 1960.'],
['RETRIEVE / Coletivos de Food Design','Índia','/assets/chapter4/simposio/roda.webp','Projetos e iniciativas indianas focadas no resgate e redesenho de sistemas alimentares, explorando a relação entre tradição, design sustentável e a rica cultura gastronômica do país.'],
['Marije Vogelzang','Holanda','/assets/chapter4/simposio/artists/marije-vogelzang.jpg','Uma das maiores pioneiras do Eating Design mundial. Seu trabalho explora a psicologia, a sociologia, os rituais da alimentação e a relação sensorial com o alimento.'],
['Francesca Zampollo','Itália / Nova Zelândia','/assets/chapter4/simposio/artists/francesca-zampollo.jpg','Pesquisadora e metodologista fundadora da International Food Design Society. É a principal referência acadêmica e conceitual no desenvolvimento do método Food Design Thinking.'],
['Rirkrit Tiravanija','Tailândia / EUA','/assets/chapter4/simposio/artists/rirkrit-tiravanija.jpg','Expoente da Arte Relacional. Suas instalações transformam o preparo e o serviço de refeições em performance e experiência social.'],
['Bompas & Parr','Reino Unido','/assets/chapter4/simposio/artists/bompas-parr.jpg','Estúdio britânico de Sam Bompas e Harry Parr, conhecido por instalações imersivas, arquitetura comestível e experiências sensoriais em grande escala.'],
['Laila Gohar','Egito / EUA','/assets/chapter4/simposio/artists/laila-gohar.jpg','Artista e designer que utiliza a comida como instalação escultural e cenográfica para jantares, eventos de moda e exposições de arte.'],
['Honey & Bunny','Áustria','/assets/chapter4/simposio/artists/honey-bunny.jpg','Dupla que atua na interseção entre design, arquitetura e o ato de comer, investigando alimentos industrializados, etiqueta e sustentabilidade.'],
['Marta Cárdenas e Martí Guixé','Espanha','/assets/chapter4/simposio/artists/marti-guixe.jpg','Martí Guixé é um dos precursores em tratar a comida como produto de design industrial, criando objetos alimentícios e embalagens funcionais.'],
['Luki Huber','Suíça / Espanha','/assets/chapter4/simposio/artists/luki-huber.jpg','Designer de produtos que colaborou por anos com o El Bulli, projetando utensílios, ferramentas e formas para a cozinha tecnoemocional.'],
['Ferran Adrià & elBullifoundation','Espanha','/assets/chapter4/simposio/artists/ferran-adria.jpg','Seu trabalho transcendeu a culinária tradicional ao introduzir metodologias de design, desconstrução e pesquisa de materiais à gastronomia contemporânea.'],
['Chloé Rutzerveld','Holanda','/assets/chapter4/simposio/artists/chloe-rutzerveld.jpg','Designer e pesquisadora do futuro da comida, pioneira na interseção entre tecnologia, biologia e gastronomia, conhecida pelo projeto Edible Growth.'],
['Steinbeisser / Experimental Gastronomy','Holanda / Alemanha','/assets/chapter4/simposio/teaser.webp','Plataforma de Martin Kullik e Jouw Wijnsma que reúne artistas e designers para redesenhar o banquete e provocar uma alimentação mais consciente e sensorial.'],
['Carole Collet','Reino Unido','/assets/chapter4/simposio/artists/carole-collet.jpg','Professora e pesquisadora da Central Saint Martins focada em Biodesign e no uso de biomateriais agrícolas e alimentares.'],
['Kirsten Tibballs e Dinara Kasko','Austrália e Ucrânia','/assets/chapter4/simposio/artists/dinara-kasko.jpg','Referências da confeitaria contemporânea. Dinara Kasko une arquitetura, modelagem 3D e impressão de moldes para criar sobremesas geométricas.'],
['Sonia Massari','Itália','/assets/chapter4/simposio/artists/sonia-massari.png','Pesquisadora e diretora pedagógica do FORK Organization, especialista na integração entre Food Design, educação e sustentabilidade.'],
['Katja Gruijters','Holanda','/assets/chapter4/simposio/artists/katja-gruijters.jpg','Designer conceitual dedicada a sistemas alimentares, redução do desperdício, upcycling gastronômico e proteínas sustentáveis.'],
['Emiliana Design Studio','Espanha','/assets/chapter4/simposio/areas.webp','Estúdio de Ana Mir e Emili Padrós que desenvolve projetos sobre rituais de consumo, embalagens comestíveis e utensílios para a mesa.'],
['Studio Appétit / Ido Garini','Holanda / Israel','/assets/chapter4/simposio/artists/studio-appetit.jpg','Estúdio de design e pesquisa culinária focado no consumo emocional, nas instalações sensoriais e nos banquetes conceituais.'],
['Pedro Reissig','Argentina','/assets/chapter4/simposio/ingredientes.webp','Arquiteto, pesquisador e professor pioneiro no estudo da morfologia dos alimentos e na sistematização do Food Design na América Latina.']
];

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
  navLinks.forEach(link=>link.classList.toggle('is-active',link.hash===`#${visible.target.id}`));
  siteChrome?.classList.toggle('is-dark',!visible.target.classList.contains('hero'));
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

const chromePanels=[...document.querySelectorAll('.chrome-panel')];
function closeChromePanels(){
  chromePanels.forEach(panel=>{panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');});
  document.querySelectorAll('[data-open-panel]').forEach(button=>button.setAttribute('aria-expanded','false'));
  document.documentElement.style.overflow='';
}
document.querySelectorAll('[data-open-panel]').forEach(button=>button.addEventListener('click',()=>{
  const panel=document.getElementById(button.dataset.openPanel);
  const willOpen=!panel.classList.contains('is-open');
  closeChromePanels();
  if(!willOpen)return;
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden','false');
  button.setAttribute('aria-expanded','true');
  document.documentElement.style.overflow='hidden';
  panel.querySelector('.panel-close')?.focus();
}));
chromePanels.forEach(panel=>{
  panel.querySelector('.panel-close')?.addEventListener('click',closeChromePanels);
  panel.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeChromePanels));
});
document.querySelector('[data-confirm-home]')?.addEventListener('click',event=>{
  if(!window.confirm('Voltar à página inicial?'))event.preventDefault();
});
window.addEventListener('keydown',event=>{if(event.key==='Escape')closeChromePanels();});
