from pathlib import Path
import re
import sys
import json

manifest=json.loads(Path("design/identity-system.json").read_text(encoding="utf-8"))
FAVICON='<link rel="icon" href="/favicon.svg?v=m-preto-20261112" type="image/svg+xml">'
area_ids={"introduction":"introducao","symbols":"simbolos","motion":"motion","typography":"tipografia","color":"cores","composition":"composicao","laboratory":"laboratorio","social":"redes"}
NAV='<nav class="lm-site-nav" aria-label="Capítulos do manual LABMATTAR" data-lm-text-role="detail"><a class="lm-nav-home" href="/inicio.html" aria-label="LABMATTAR — introdução"><span class="lm-nav-monogram">M</span><span class="lm-nav-home-label">MANUAL DE IDENTIDADE</span></a><div class="lm-nav-list" role="group" aria-label="Capítulos">'
for chapter in manifest["sections"]:
 NAV+=f'<a href="{chapter["path"]}" data-area="{area_ids[chapter["id"]]}"><span class="lm-nav-index">{chapter["number"]}</span><span>{chapter["label"]}</span></a>'
NAV+='</div></nav>'
STYLE='''<style id="lm-site-navigation-style">
/* Editorial navigation: single canonical source for all chapters. */
html body > nav.lm-site-nav {
  box-sizing:border-box; display:flex; align-items:center; justify-content:space-between;
  flex-wrap:nowrap; gap:clamp(18px,2vw,32px); position:sticky; top:0; z-index:100;
  height:54px; min-height:54px; padding:0 clamp(20px,3vw,48px);
  background:rgba(247,246,242,.97); color:#181818; border-bottom:1px solid #c9c8c2;
  overflow:visible;
}
html body > nav.lm-site-nav a { color:inherit; text-decoration:none; }
html body > nav.lm-site-nav .lm-nav-home {
  display:flex; align-items:center; gap:12px; flex:none; padding:0;
  height:100%; white-space:nowrap; border:0;
}
html body > nav.lm-site-nav .lm-nav-monogram {
}
html body > nav.lm-site-nav .lm-nav-home-label { opacity:.7; white-space:nowrap;
}
html body > nav.lm-site-nav .lm-nav-list {
  min-width:0; display:flex; gap:clamp(12px,1.35vw,24px); align-items:stretch;
  height:100%; overflow-x:auto; overflow-y:hidden;
  scrollbar-width:none; overscroll-behavior-x:contain;
}
html body > nav.lm-site-nav .lm-nav-list::-webkit-scrollbar { display:none; }
html body > nav.lm-site-nav .lm-nav-list a {
  display:inline-flex; position:relative; align-items:center; gap:5px;
  flex:none; height:100%; white-space:nowrap;
  color:inherit; opacity:.58; transition:opacity .18s ease;
}
html body > nav.lm-site-nav .lm-nav-list a:hover,
html body > nav.lm-site-nav .lm-nav-list a[aria-current="page"] { opacity:1; }
html body > nav.lm-site-nav .lm-nav-list a[aria-current="page"]::after {
  content:""; position:absolute; bottom:0; left:0; right:0;
  height:2px; background:currentColor;
}
html body > nav.lm-site-nav .lm-nav-index {
  opacity:.72; font-variant-numeric:tabular-nums; margin-right:2px;
}
html body > nav.lm-site-nav a:focus-visible { outline:1px solid currentColor; outline-offset:-4px; }
@media(max-width:1250px) {
  html body > nav.lm-site-nav { gap:18px; padding-inline:20px; }
  html body > nav.lm-site-nav .lm-nav-home-label { display:none; }
  html body > nav.lm-site-nav .lm-nav-list { gap:20px; }
}
@media(max-width:700px) {
  html body > nav.lm-site-nav { gap:15px; padding-inline:16px; }
  html body > nav.lm-site-nav .lm-nav-list { gap:19px; }
}
@media(prefers-reduced-motion:reduce) {
  html body > nav.lm-site-nav .lm-nav-list a { transition:none; }
}
</style>'''
areas={"manual.html":"simbolos","tipografia.html":"tipografia","cores.html":"cores","composicao.html":"composicao","laboratorio.html":"laboratorio","compor.html":"laboratorio","redes.html":"redes"}
if Path("public/inicio.html").exists():
 areas["inicio.html"]="introducao"
if Path("public/motion.html").exists():
 areas["motion.html"]="motion"
if len(sys.argv)>1:
 requested=set(sys.argv[1:])
 assert requested <= set(areas), "Unknown page for shared navigation"
 areas={name:area for name,area in areas.items() if name in requested}
for filename,area in areas.items():
 p=Path("public")/filename
 assert p.exists(),filename
 s=p.read_text(encoding="utf-8")
 # Remove reviewed redundancies from the authored source rather than hiding
 # them with review-only CSS.
 if area=="introducao":
  s=s.replace('<p class="eyebrow">00 / INTRODUÇÃO</p>', '')
  s=s.replace('<a class="link" href="#sistemas">CONHECER OS SISTEMAS ↓</a>', '')
  s=s.replace('<p class="eyebrow">APRESENTAÇÃO AUDIOVISUAL</p>', '')
  s=s.replace('<h2>Apresentação <em>da identidade</em></h2>', '<h2>APRESENTAÇÃO <em>DA IDENTIDADE</em></h2>')
  replacements={
   'Esta plataforma reúne os elementos gráficos da identidade, suas regras de aplicação e ferramentas para estudar composições. O arquivo audiovisual e os materiais de referência serão incorporados nesta mesma área.':'Este manual reúne os elementos da identidade visual do LABMATTAR, seus princípios de construção, regras de aplicação e ferramentas de composição.',
   '<p>Espaço reservado para o vídeo de abertura. O material será incorporado aqui quando você selecionar o arquivo definitivo.</p><div class="film-slot" aria-label="Espaço reservado para vídeo de abertura"><p>LABMATTAR / APRESENTAÇÃO</p><div class="film-middle"><span class="play-icon" aria-hidden="true">▷</span></div><div class="film-bottom"><span>VÍDEO A INSERIR</span><span>SEM ARQUIVO PUBLICADO</span></div></div>':'<div class="film-slot" aria-label="Apresentação audiovisual indisponível"><div class="film-middle"><span>VÍDEO INDISPONÍVEL.</span></div></div>',
   'M e nove vasos do acervo':'M, LOGOTIPO E RECIPIENTES.',
   'Giros, transformações, assinaturas e transições':'GIROS, TRANSFORMAÇÕES E SEQUÊNCIAS DE MOVIMENTO.',
   'Fontes oficiais, hierarquia, exemplos e animação':'FAMÍLIAS TIPOGRÁFICAS, HIERARQUIA E REGRAS DE USO.',
   'Paleta, contraste e modos de aplicação':'PALETA CROMÁTICA, CONTRASTE E APLICAÇÕES.',
   'Construção, alinhamentos, M central e adaptação de formatos':'ESTRUTURA, ALINHAMENTOS E RELAÇÕES ENTRE ELEMENTOS.',
   'Criação de páginas, apresentações e exportações':'FERRAMENTAS DE CRIAÇÃO E APLICAÇÃO DA IDENTIDADE.',
   'Critérios editoriais, temporadas e formatos de publicação':'FORMATOS E APLICAÇÕES DA COMUNICAÇÃO DIGITAL.',
   'Recursos já disponíveis para consulta e aplicação da identidade.':'Acervo de materiais audiovisuais, documentos e estudos relacionados à identidade visual do LABMATTAR.',
   'NOVE VASOS EM VOLUME':'NOVE RECIPIENTES EM VOLUME',
   'Variações tridimensionais para observação':'PESQUISAS E EXPERIMENTAÇÕES GRÁFICAS.'
  }
  for old,new in replacements.items(): s=s.replace(old,new)
  s=re.sub(r'>(Símbolos|Motion|Tipografia|Cores|Composição|Laboratório|Redes sociais) ↗<', lambda m:'>'+m.group(1).upper()+' ↗<', s)
  s=s.replace('>Ver capítulo<','>VER CAPÍTULO ↗<').replace('>Abrir ferramentas<','>ABRIR FERRAMENTAS ↗<')
  s=re.sub(r'<a class="archive-card" href="/aplicacoes-validadas\.html">.*?</a>', '', s, flags=re.S)
  intro_style='<style>main[aria-label="00 / Introdução"] .hero{justify-content:center;gap:0}main[aria-label="00 / Introdução"] .hero-end{display:block;margin-top:clamp(24px,4vw,55px)}main[aria-label="00 / Introdução"] .hero-end p{max-width:57ch}</style>'
  s=s.replace('</head>',intro_style+'</head>',1)
 # Replace any source-local menu by the one unified menu.
 s=re.sub(r'<nav class="lm-site-nav"[^>]*>.*?</nav>',"",s,flags=re.S)
 s=re.sub(r'<style id="lm-site-navigation-style">.*?</style>',"",s,flags=re.S)
 # Remove the earlier exploratory cross-navigation and its styling.
 s=re.sub(r'<nav class="lm-crossnav"[^>]*>.*?</nav>',"",s,flags=re.S)
 s=re.sub(r'<style>\.lm-crossnav\{.*?</style>',"",s,flags=re.S)
 assert "</head>" in s and "<body>" in s
 # The introduction keeps its authored opening; it shares the chapter menu.
 if area!="introducao":
  # All chapter H1 headings share exactly one typographic treatment.
  title_match = re.search(r'<h1\b[^>]*>', s, flags=re.I)
  assert title_match, f"Missing page-level H1 in {filename}"
  title_open = title_match.group(0)
  if 'class="' in title_open:
   title_open = re.sub(r'class="([^"]*)"', lambda m: 'class="' + ' '.join(dict.fromkeys(m.group(1).split()+['lm-manual-page-title'])) + '"', title_open, count=1)
  else:
   title_open = title_open[:-1] + ' class="lm-manual-page-title">'
  s = s[:title_match.start()] + title_open + s[title_match.end():]
  assert 'lm-manual-page-title' in s
  # Estrutural headings receive shared treatment; specimen / canvas headings do not.
  if area=="tipografia":
   s=s.replace('<h2 class="type-title"', '<h2 class="type-title lm-manual-section-title"')
   s=s.replace('<h2 class="type-title lm-manual-section-title" id="lm-motion-text"', '<h2 class="type-title" id="lm-motion-text"')
  if area=="composicao":
   s=s.replace('<h2>', '<h2 class="lm-manual-section-title">')
   s=s.replace('<h2 id="lmCompositionRulesTitle"', '<h2 class="lm-manual-section-title" id="lmCompositionRulesTitle"')
  assert s.count('href="/manual-headings.css')==1, f"Missing normative typography link: {filename}"
  assert s.count('href="/manual-layout.css')==1, f"Missing shared editorial layout: {filename}"
  assert s.count('lm-manual-cover')==1, f"Exactly one canonical cover is required: {filename}"
  assert s.count('src="/manual-type-roles.js')==1, f"Missing text-role classifier: {filename}"
 s=re.sub(r'<link\b(?=[^>]*\brel=["\'](?:shortcut\s+)?icon["\'])[^>]*>\s*',"",s,flags=re.I)
 s=s.replace("</head>",FAVICON+STYLE+"</head>",1)
 s=s.replace("<body>","<body>"+NAV.replace('data-area="'+area+'"','aria-current="page" data-area="'+area+'"'),1)
 p.write_text(s,encoding="utf-8")
 print(filename, "global navigation OK")
