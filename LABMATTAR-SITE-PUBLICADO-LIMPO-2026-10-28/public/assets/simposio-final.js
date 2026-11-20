(()=>{
  const A='/assets/simposio-final';
  const credit='Imagem: acervo do projeto';
  const img=(file,title,caption=title,source=credit,classes='')=>`
    <figure class="m-figure ${classes}">
      <button class="m-frame zoomable" type="button" data-src="${A}/${file}" data-title="${title}" data-credit="${source}" aria-label="Ampliar: ${title}">
        <img src="${A}/${file}" alt="${title}" loading="lazy">
      </button>
      <figcaption class="image-credit"><span>${source}</span></figcaption>
    </figure>`;
  const panel=(content,classes='')=>`<div class="flow-group ${classes}">${content}</div>`;
  const copy=paragraphs=>`<div class="body-copy">${paragraphs.map(p=>`<p>${p}</p>`).join('')}</div>`;

  const chapters=[
    {
      id:'instituto', tone:'light', title:'I Simpósio Internacional de Gastroperformance e Food Design', short:'O Instituto de Gastroperformance', bg:'1.png',
      panels:[
        panel(`<div class="cover-copy"><h1 class="display-title fit-long title-lines"><span>I Simpósio</span><span>Internacional de</span><span>Gastroperformance</span><span>e Food Design</span></h1><p class="cover-subtitle">Uma iniciativa do Instituto de Gastroperformance em parceria com o Ministério das Relações Exteriores.</p></div>`),
        panel(`<article class="text-block"><h2 class="section-title fit-long">O Instituto de<br>Gastroperformance</h2>${copy([
          'É uma organização privada sem fins lucrativos criada para fomentar, articular e difundir projetos e pesquisas relacionados à Gastroperformance.',
          'O termo Gastroperformance, criado pela artista e food designer Simone Mattar, propõe novas reflexões sobre as relações entre gastronomia, arte e design, expandindo seus limites para abordar questões ainda pouco contempladas nos espaços acadêmicos e profissionais tradicionais.'
        ])}</article><article class="text-block text-block--right">${copy([
          'O Instituto nasce da necessidade de consolidar essa área de investigação e criação, ampliando sua presença no debate contemporâneo.',
          'Sua atuação compreende a realização de simpósios, exposições, publicações e projetos culturais, além da formação de redes de colaboração voltadas à experimentação e à circulação de conhecimento.'
        ])}</article>`),
        panel(`<article class="text-block text-block--wide"><h2 class="section-title">O Simpósio</h2><div class="body-copy body-copy--wide"><p>Realizado em parceria com o Ministério das Relações Exteriores, o I Simpósio Internacional de Gastroperformance e Food Design é uma das primeiras iniciativas do Instituto, concebida para se consolidar como um evento anual.</p></div></article>`)
      ]
    },
    {
      id:'comer-organiza', tone:'dark', title:'Comer organiza o mundo', short:'Comer organiza o mundo', bg:'2.png',
      panels:[
        panel(`${img('apresentacao/governo-fortalece-a-agricultura-familiar-no-acre-25331157504.jpg','Frutos de dendê','',credit)}<article class="text-block text-block--wide"><h2 class="display-title">Comer organiza o mundo</h2></article>`),
        panel(`<article class="text-block">${copy([
          'A realização do Simpósio de Gastroperformance em âmbito internacional parte da necessidade de compreender o alimento como objeto transversal de pesquisa, criação artística e produção de conhecimento, reunindo arte, design, ciência, tecnologia, antropologia, cultura e questões socioambientais. O Simpósio conecta as dimensões educacional, social, cultural e artística, propondo novas perspectivas conceituais e práticas sobre a comida e seus múltiplos contextos.'
        ])}</article><article class="text-block text-block--right">${copy([
          'Mais do que nutriente, o alimento constitui um sistema complexo que envolve produção, distribuição e acesso, hábitos culturais, desenvolvimento tecnológico, sustentabilidade e os futuros da alimentação.',
          'Em um mundo cada vez mais interligado, no qual ações locais repercutem globalmente, questões como mudanças climáticas, segurança alimentar, desperdício e desigualdade de acesso exigem perspectivas diversas e respostas compartilhadas. A presença de pesquisadores, artistas e pensadores de vários países permite confrontar realidades e repertórios diante de desafios de alcance global.'
        ])}</article>`),
        panel(`<article class="text-block">${copy([
          'O contato entre experiências culturais amplia referências para a revisão de práticas e metodologias, ao mesmo tempo que favorece o reconhecimento e a preservação de identidades e saberes locais. Esses encontros podem desdobrar-se em publicações, projetos conjuntos e acordos de cooperação entre instituições.'
        ])}</article><article class="text-block text-block--right">${copy([
          'Para estudantes, docentes e pesquisadores, o Simpósio estimula dissertações, teses, artigos e projetos experimentais, contribuindo para a consolidação da Gastroperformance como área de investigação e para o pensamento crítico sobre as transformações que atravessam nossa relação com o alimento. Sua dimensão internacional é, portanto, constitutiva da proposta, reunindo saberes e experiências de diversos territórios para pensar questões que pertencem a todos.'
        ])}</article>`)
      ]
    },
    {
      id:'quatro-campos', tone:'dark', title:'Quatro campos articulam um novo saber', short:'Quatro campos', bg:'3.png',
      panels:[
        panel(`<div class="split-media">${img('apresentacao/auqeknnyclf9ozoe-everyonegives-everyonereceivesfinal.avif','Ilustração de partilha coletiva','',credit)}</div><article class="split-copy"><h2 class="display-title fit-stack">Quatro campos articulam um novo saber</h2></article>`),
        panel(`<article class="split-copy"><h2 class="field-title"><span class="field-number">01</span>Food Design</h2><p class="correlates">Termos correlatos: food branding, design thinking, turismo sustentável</p>${copy([
          'A Gastroperformance interage com o design como estratégia para a sustentabilidade das cadeias alimentares e para a construção de identidades gastronômicas. Ao valorizar as relações entre comida e território, propicia novas percepções sobre regiões, cidades e bairros, fortalecendo vínculos afetivos entre pessoas e lugares.',
          'Nesse contexto, utiliza ferramentas de branding para reconhecer e comunicar características culturais próprias de cada território, valorizando alimentos e práticas ancestrais ou tradicionais, sua recriação no presente e a preservação de espécies. Essa abordagem mobiliza conhecimentos e práticas capazes de associar gastronomia e desenvolvimento social, envolvendo comunidades, organizações e poder público na formulação de estratégias que contribuam para as economias locais e para o turismo gastronômico sustentável.'
        ])}</article><div class="split-media">${img('apresentacao/blueplate-leonkelly-american-ca1940.jpg','Composição de alimentos','Food Design',credit)}</div>`),
        panel(`<div class="split-media">${img('apresentacao/champagne.jpg','Caves de Champagne','Champagne: território e patrimônio',credit)}</div><article class="text-block text-block--wide"><div class="body-copy body-copy--wide"><p>Há séculos, a França constrói sua identidade gastronômica vinculando produtos como Champagne, Cognac e Roquefort aos seus territórios e saberes, protegendo famílias produtoras e transformando origem em patrimônio e reconhecimento mundial.</p></div></article>`),
        panel(`<div class="split-media split-media--left">${img('apresentacao/encuentro-nacional-rgsv-pasto-narino-2024.jpg','Encontro nacional em Pasto, Nariño','Performances artísticas',credit)}</div><article class="split-copy--right"><h2 class="field-title"><span class="field-number">02</span>Performances artísticas</h2><p class="correlates">Termos correlatos: instalações artísticas, Food Design Experience</p>${copy([
          'O termo Gastroperformance surge no cenário contemporâneo com o intuito de refletir e propor contornos para uma forma de expressão artística que faz do ato de comer e das possibilidades estéticas e culturais do alimento formas de linguagem. Suas experiências multissensoriais partem da efemeridade e das características sensíveis da comida para produzir reflexão.',
          'Cores, formas e texturas estabelecem relações diretas com a materialidade da arte. Ao mesmo tempo, o alimento carrega uma dimensão simbólica constituída por rituais, saberes ancestrais, hábitos culturais e conteúdos do inconsciente coletivo.'
        ])}</article>`),
        panel(`<article class="text-block">${copy([
          'Tendo o pensamento crítico como premissa do campo artístico, a Gastroperformance ressignifica a noção de “arte culinária” ao deslocar a comida de sua função habitual e incorporá-la em uma realidade sensível, na qual adquire linguagem própria.',
          'Os hábitos alimentares tornam-se vias de acesso à memória, aos afetos e às formas de sociabilidade. Por meio deles, a comida revela valores e significados relacionados à identidade, ao pertencimento e às relações que uma sociedade estabelece consigo mesma e com seu entorno.'
        ])}</article>`),
        panel(`<div class="split-media">${img('apresentacao/frutas-y-vegetales-de-mexico-en-mercado.jpg','Mercado de frutas e vegetais no México','Gastronomia social e ambiental',credit)}</div><article class="split-copy"><h2 class="field-title fit-long"><span class="field-number">03</span>Gastronomia social e ambiental</h2><p class="correlates">Termos correlatos: instalações artísticas, Food Design Experience</p>${copy([
          'No campo da Gastronomia Social e Ambiental, a proposta compreende o alimento a partir de suas relações ecológicas, sociais, econômicas e culturais, acolhendo iniciativas comprometidas com o equilíbrio dos sistemas alimentares e com uma análise crítica dos atuais modelos de produção, distribuição e consumo.',
          'Nesse contexto, propõe refletir sobre as contradições de um cenário em que a superprodução e o desperdício coexistem com a fome, a insegurança alimentar e diferentes formas de má nutrição. As crises climáticas, sanitárias, econômicas e geopolíticas tornam ainda mais urgente a discussão sobre o uso dos recursos naturais e as condições de acesso à alimentação.'
        ])}</article>`),
        panel(`<article class="text-block text-block--wide"><div class="body-copy body-copy--wide"><p>A proposta contempla práticas de preservação e regeneração ambiental, como a reciclagem de nutrientes e energia, e estimula ações ligadas à agroecologia, à promoção da saúde, à biodiversidade e à conservação dos bens naturais, aproximando conhecimento científico, saberes tradicionais e práticas locais.</p><p>Busca ainda fortalecer o desenvolvimento sustentável por meio da cooperação entre instituições, órgãos públicos, comunidades e sociedade civil, além de fomentar o empreendedorismo gastronômico e modelos de economia circular capazes de gerar renda e fortalecer cadeias produtivas locais.</p></div></article>`),
        panel(`<div class="split-media">${img('apresentacao/plantacao-de-hortalicas-de-agricultores-familiares.jpg','Plantação de hortaliças','Pensamento e pesquisa',credit)}</div><article class="split-copy"><h2 class="field-title"><span class="field-number">04</span>Pensamento e pesquisa</h2><p class="correlates">Termos correlatos: teoria, pesquisa acadêmica</p>${copy([
          'O projeto pretende articular discursos e metodologias criativas que aproximem os campos acadêmico e profissional. Propõe também estimular a reflexão em torno das questões tratadas anteriormente, atravessando disciplinas como gastronomia, design, nutrição, economia, ecologia, antropologia, sociologia e artes.',
          'A Gastroperformance abre, assim, novas possibilidades nos campos criativo e teórico, a partir de uma abordagem questionadora que privilegia o pensamento multidimensional nos diversos contextos em que a comida está inserida.'
        ])}</article>`)
      ]
    },
    {
      id:'pensamento-pratica', tone:'dark', title:'Pensamento em prática', short:'Pensamento em prática', bg:'4.png',
      panels:[
        panel(`${img('apresentacao/governo-fortalece-a-agricultura-familiar-no-acre-25937957316.jpg','Alimentos em feira','',credit)}<article class="split-copy"><h2 class="display-title">Pensamento em prática</h2>${copy([
          'Em resumo, o Simpósio é um espaço de encontro entre disciplinas e fazeres como gastronomia, design, arte e cultura questionando as fronteiras entre os territórios profissional, acadêmico e criativo, revendo ideias e conceitos estabelecidos.'
        ])}</article>`),
        panel(`<article class="text-block">${copy([
          'Aberto a estudantes, educadores, designers, artistas, empreendedores ligados à gastronomia, chefs de cozinha, pesquisadores e demais interessados, o evento reúne conversas, encontros, cursos, degustações, criações, refeições coletivas, performances, exposições e mostras de filmes em diferentes espaços culturais e gastronômicos.'
        ])}</article><article class="text-block text-block--right">${copy([
          'As experiências propostas convidam o público a participar ativamente das ações, compartilhando processos e contribuindo para a produção coletiva de novos significados.'
        ])}</article>`)
      ]
    },
    {
      id:'como-penso', tone:'dark', title:'Simpósio Como Penso Como', short:'Como Penso Como', bg:'5.png',
      panels:[
        panel(`<article class="split-copy"><h2 class="display-title">Simpósio Como Penso Como</h2></article><div class="split-media">${img('apresentacao/main-image-2.jpg','Gravura histórica de simpósio','',credit)}</div>`),
        panel(`<div class="split-media split-media--left">${img('apresentacao/dt1570.jpg','Natureza-morta com alimentos','A mesa como espaço de encontro',credit)}</div><article class="split-copy--right">${copy([
          'O projeto recupera a origem da palavra simpósio, do grego sympósion, que designava um encontro em torno da mesa, no qual se comia e bebia enquanto eram travados diálogos e conversas intelectuais, acompanhados por apresentações de dança e música. No lugar de um simpósio tradicional, os participantes se reúnem em mesas de conversa em torno das refeições, convocando o diálogo inter e transdisciplinar em torno de temas contemporâneos e urgentes.'
        ])}</article>`),
        panel(`<article class="text-block">${copy([
          'Programada em dois momentos, a proposta se inicia com uma ação acadêmica conduzida por integrantes do Instituto de Gastroperformance.',
          'Estudantes de graduação de diferentes instituições brasileiras, nos campos da gastronomia, design, arte e moda, desenvolverão projetos sob mentoria e coordenação da equipe do Instituto e de profissionais convidados. As propostas serão acompanhadas e avaliadas ao longo do processo, podendo integrar o menu e a experiência do Simpósio Como Penso Como, aberto ao público.'
        ])}</article><article class="text-block text-block--right">${copy([
          'Os trabalhos desenvolvidos poderão ainda compor uma exposição coletiva, reunindo a produção de estudantes de diferentes regiões do Brasil e ampliando o intercâmbio entre formação, pesquisa e criação.'
        ])}</article>`)
      ]
    },
    {
      id:'funcionamento', tone:'light', title:'Como funciona', short:'Como funciona', bg:'6.png',
      panels:[
        panel(`<article class="text-block"><h2 class="display-title">Como funciona</h2><div class="body-copy"><p>Os temas a serem abordados serão definidos a partir da interlocução com especialistas convidados. Entre as possibilidades, destacam-se:</p></div></article><article class="text-block text-block--right"><div class="body-copy"><ul><li>O papel da mulher nas políticas de segurança alimentar.</li><li>Identidade e pertencimento das populações por meio da comida.</li><li>Antropofagia na sociedade contemporânea a partir de Oswald de Andrade.</li><li>Geopolítica e alimentação global.</li><li>Educação alimentar nos programas de educação infantil.</li><li>Desnutrição e sobrepeso.</li><li>O futuro da alimentação mundial.</li><li>Rituais e símbolos presentes no ato de comer ao longo da história.</li><li>Holodomor: a fome como estratégia de poder.</li></ul></div></article>`),
        panel(`<article class="text-block text-block--wide"><div class="body-copy body-copy--wide"><p>Os especialistas serão selecionados por uma comissão de curadores independentes convidados, e o público participará das mesas por ordem de inscrição. Obras audiovisuais e performances integrarão o espaço das refeições, ampliando a experiência do simpósio. O encontro será gravado e disponibilizado posteriormente, expandindo seu alcance para além do público presencial.</p></div></article>`),
        panel(`<article class="text-block"><h2 class="section-title">Formato proposto</h2>${copy(['Local: SESC (a ser confirmado)','Período: maio de 2028 (a ser confirmado)','Espaço: mínimo de 1.000 m²'])}</article><div class="metric-grid"><div class="metric"><strong>7</strong><span>sessões</span></div><div class="metric"><strong>20</strong><span>mesas por sessão</span></div><div class="metric"><strong>840</strong><span>inscrições abertas ao público</span></div><div class="metric"><strong>40</strong><span>especialistas convidados</span></div><div class="metric"><strong>80</strong><span>temas explorados</span></div><div class="metric"><strong>70 h</strong><span>de conteúdo audiovisual</span></div></div>`),
        panel(`<article class="text-block text-block--wide"><h2 class="section-title">Ecos do encontro</h2><div class="body-copy body-copy--wide"><p>Alcançar diretamente 840 participantes, além dos especialistas convidados, promovendo conexões entre diferentes áreas do conhecimento. Por meio de cerca de 70 horas de registros audiovisuais, posteriormente disponibilizados em plataformas digitais, além de conteúdos para redes sociais e podcasts, o Simpósio prolonga sua duração e expande seu alcance, atingindo novos públicos e permitindo mensurar visualizações, acessos e engajamento.</p></div></article>`),
        '__GUESTS__'
      ]
    },
    {
      id:'mostra', tone:'dark', title:'Mostra Como Penso Como', short:'Mostra', bg:'7.png',
      panels:[
        panel(`<article class="split-copy"><h2 class="display-title">Mostra Como Penso Como</h2>${copy([
          'A Mostra Como Penso Como expande o Simpósio para o campo das artes, reunindo instalações, performances, vídeos, esculturas e projetos coletivos que exploram a comida como linguagem e campo de reflexão. A proposta estabelece diálogos entre arte, gastronomia, design, comunicação, política, antropologia e sociologia.',
          'Entre as referências curatoriais está o conceito de Escultura Social, de Joseph Beuys, que compreende o pensamento e a ação humana como forças de transformação social, política e cultural. Soma-se a ele o conceito de Lumbung, que orientou a 15ª documenta a partir de princípios de coletividade, compartilhamento de recursos e distribuição equitativa.'
        ])}</article><div class="split-media">${img('apresentacao/encuentro-nacional-rgsv-pasto-narino-2024.jpg','Encontro coletivo em Pasto, Nariño','Mostra Como Penso Como',credit)}</div>`),
        panel(`<article class="text-block text-block--wide">${copy([
          'A mostra contempla coletivos e artistas independentes, além de homenagear pessoas que pensaram na comida como meio expressivo. Alguns nomes: Ayrson Heráclito, Antoni Miralda, Judy Chicago, Regina Silveira, Gordon Matta-Clark.'
        ])}</article>`),
        panel(`<div class="media-centered"><figure class="m-figure"><button class="m-frame artist-reel zoomable" type="button" aria-label="Ampliar obra em exibição"><img class="is-active" src="${A}/apresentacao/ayrson-heraclito.jpg" alt="Obra de Ayrson Heráclito" data-title="Ayrson Heráclito" data-credit="Obra: Ayrson Heráclito"><img src="${A}/apresentacao/antoni-miralda.jpg" alt="Obra de Antoni Miralda" data-title="Antoni Miralda" data-credit="Obra: Antoni Miralda"><img src="${A}/apresentacao/judychicago.jpg" alt="Obra de Judy Chicago" data-title="Judy Chicago" data-credit="Obra: Judy Chicago"><img src="${A}/apresentacao/regina-silveira.jpg" alt="Obra de Regina Silveira" data-title="Regina Silveira" data-credit="Obra: Regina Silveira"><img src="${A}/apresentacao/gordon-matta-clark.webp" alt="Obra de Gordon Matta-Clark" data-title="Gordon Matta-Clark" data-credit="Obra: Gordon Matta-Clark"></button><figcaption class="artist-reel-meta"><span class="artist-name">Ayrson Heráclito</span></figcaption></figure></div>`)
      ]
    },
    {
      id:'impacto', tone:'dark', title:'Como funciona', short:'Como funciona', bg:'8.png',
      panels:[
        panel(`<article class="text-block"><h2 class="section-title">Como funciona</h2>${copy(['10 artistas internacionais convidados','10 artistas brasileiros ou coletivos de arte','Local: SESC Pompeia (confirmar)','Período: maio de 2028 (confirmar)','Espaço: mínimo 1.000 m²'])}</article><article class="text-block text-block--right"><h2 class="section-title">Impacto cultural e social</h2>${copy(['O simpósio amplia a sensibilização do público por meio de projetos artísticos que fazem da comida e do ato de comer formas de expressão. A iniciativa articula diferentes saberes, ressignifica as artes culinárias e fomenta projetos de impacto social, artístico e cultural.'])}</article>`),
        panel(`<article class="text-block text-block--wide"><h2 class="display-title">O que permanece</h2><div class="body-copy body-copy--wide"><p>Ao integrar formação acadêmica, programação cultural, participação pública e produção audiovisual, o Simpósio deixa como legado a circulação de conhecimento e a formação de redes entre instituições, pesquisadores, artistas e sociedade.</p></div></article>`)
      ]
    }
  ];

  const guests=[
    ['2021-07-11-carol-dini0036-1.jpg','Carol Dini'],['adriana-salay.png','Adriana Salay'],['ambua.webp','Ambua'],['andrea-hygino.jpg','Andrea Hygino'],['antoni-miralda.jpg','Antoni Miralda'],['ayrson-heraclito.jpg','Ayrson Heráclito'],['barbara-cordovani.jpg','Barbara Cordovani'],['carol-goodden.jpg','Carol Goodden'],['claudia-visoni.jpg','Claudia Visoni'],['daniela-avelar.jpg','Daniela Avelar'],['elaine-de-azevedo.jpg','Elaine de Azevedo'],['entretenimento-circuito-de-literatura-e-cafes-literaturac-cafes-em-bh-1727469557.avif','Convidada'],['guilherme-ranieri.png','Guilherme Ranieri'],['images.jpg','Convidada'],['izabella-coelho.jpg','Izabella Coelho'],['jessamyn-waldman.jpg','Jessamyn Waldman'],['jessica-b-harris.jpg','Jessica B. Harris'],['jonas-van.png','Jonas Van'],['juan-ochoa.jpg','Juan Ochoa'],['kerry-diamond.jpg','Kerry Diamond'],['leda-maria-martins.webp','Leda Maria Martins'],['marianasantarelli-250x250.jpg','Mariana Santarelli'],['marisa-benjamim.jpg','Marisa Benjamim'],['marta-cardenas.jpg','Marta Cárdenas'],['nati-canto.avif','Nati Canto'],['neide-rigo.jpg','Neide Rigo'],['neli-pereira.jpeg','Neli Pereira'],['pablo-piovano.jpg','Pablo Piovano'],['pattu-duraes.jpg','Pattu Durães'],['regina-tchelly.jpg','Regina Tchelly'],['sidiana-macedo.webp','Sidiana Macedo'],['solange-borges.jpg','Solange Borges'],['stephen-satterfield.jpeg','Stephen Satterfield'],['taina-marajoara.jpg','Taina Marajoara'],['tais-de-sant-anna-machado.webp',"Taís de Sant'anna Machado"],['viviane-aguiar.png','Viviane Aguiar'],['washington-da-selva.avif','Washington da Selva']
  ];
  const guestPanel=panel(`<header class="guest-intro"><div><h2 class="section-title">Convidados</h2></div></header><div class="guest-grid">${guests.map(([file,name])=>`<figure class="guest"><button class="zoomable" type="button" data-src="${A}/convidados/${file}" data-title="${name}" data-credit="Retrato: acervo do projeto"><img src="${A}/convidados/${file}" alt="${name}" loading="lazy"></button><figcaption>${name}</figcaption></figure>`).join('')}</div>`,'guest-panel');

  const transition=(from,to,index)=>`<section class="transition" data-transition="${index}" aria-label="Transição de ${from.short} para ${to.short}"><div class="transition-stage"><img class="transition-bg" src="${A}/fundos/${to.bg}" alt=""><div class="transition-label transition-from"><span>${String(index+1).padStart(2,'0')}</span><strong>${from.short}</strong></div><div class="transition-label transition-to"><span>${String(index+2).padStart(2,'0')}</span><strong>${to.short}</strong></div></div></section>`;
  const main=document.querySelector('#presentation');
  main.innerHTML=chapters.map((chapter,index)=>{
    const panels=chapter.panels.map(p=>p==='__GUESTS__'?guestPanel:p).join('');
    const section=`<article class="chapter" id="${chapter.id}" data-chapter="${index+1}" data-tone="${chapter.tone}" style="--bg:url('${A}/fundos/${chapter.bg}')" aria-label="${chapter.title}"><div class="chapter-flow"><div class="chapter-flow-inner">${panels}</div></div></article>`;
    return section+(index<chapters.length-1?transition(chapter,chapters[index+1],index):'');
  }).join('');

  const summary=document.querySelector('.summary');
  const summaryButton=document.querySelector('.summary-button');
  const summaryClose=document.querySelector('.summary-close');
  document.querySelector('#summary-list').innerHTML=chapters.map(c=>`<li><a href="#${c.id}">${c.title}</a></li>`).join('');
  const setSummary=open=>{summary.classList.toggle('is-open',open);summary.setAttribute('aria-hidden',String(!open));summaryButton.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':''};
  summaryButton.addEventListener('click',()=>setSummary(true));
  summaryClose.addEventListener('click',()=>setSummary(false));
  summary.addEventListener('click',event=>{if(event.target===summary||event.target.closest('a'))setSummary(false)});

  const lightbox=document.querySelector('.lightbox');
  const lbImage=document.querySelector('.lightbox-image');
  const lbTitle=document.querySelector('.lightbox-title');
  const lbCredit=document.querySelector('.lightbox-credit');
  const closeLightbox=()=>{lightbox.classList.remove('is-open');lightbox.setAttribute('aria-hidden','true');document.body.style.overflow=''};
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('.zoomable'); if(!trigger)return;
    let src=trigger.dataset.src,title=trigger.dataset.title,source=trigger.dataset.credit;
    if(trigger.classList.contains('artist-reel')){const active=trigger.querySelector('.is-active');src=active.src;title=active.dataset.title;source=active.dataset.credit}
    lbImage.src=src;lbImage.alt=title||'';lbTitle.textContent=title||'';lbCredit.textContent=source||credit;lightbox.classList.add('is-open');lightbox.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  });
  document.querySelector('.lightbox-close').addEventListener('click',closeLightbox);
  lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox()});
  addEventListener('keydown',event=>{if(event.key==='Escape'){closeLightbox();setSummary(false)}});

  const reel=document.querySelector('.artist-reel');
  if(reel){let current=0;const images=[...reel.querySelectorAll('img')],name=document.querySelector('.artist-name');setInterval(()=>{images[current].classList.remove('is-active');current=(current+1)%images.length;images[current].classList.add('is-active');name.textContent=images[current].dataset.title},3200)}

  const transitions=[...document.querySelectorAll('.transition')];
  const chaptersEls=[...document.querySelectorAll('.chapter')];
  const currentLabel=document.querySelector('#current-section');
  let raf=0;
  const clamp=v=>Math.max(0,Math.min(1,v));
  const range=(v,a,b)=>clamp((v-a)/(b-a));
  const update=()=>{
    raf=0;
    transitions.forEach(el=>{const rect=el.getBoundingClientRect(),travel=Math.max(1,rect.height-innerHeight),p=clamp(-rect.top/travel);el.style.setProperty('--transition-progress',p.toFixed(4));el.style.setProperty('--transition-out',range(p,.25,.55).toFixed(4));el.style.setProperty('--transition-in',range(p,.42,.75).toFixed(4))});
    let active=0;chaptersEls.forEach((el,i)=>{const r=el.getBoundingClientRect();if(r.top<=innerHeight*.45&&r.bottom>innerHeight*.45)active=i});
    currentLabel.textContent=String(active+1).padStart(2,'0');document.documentElement.style.setProperty('--section-progress',((active+1)/chapters.length).toFixed(3));
  };
  const requestUpdate=()=>{if(!raf)raf=requestAnimationFrame(update)};
  addEventListener('scroll',requestUpdate,{passive:true});addEventListener('resize',requestUpdate);update();
})();
