from pathlib import Path
import re

NAV='''<nav class="lm-site-nav" aria-label="Sistemas da identidade LABMATTAR">
<a href="/manual.html" data-area="simbolos">01 / SÍMBOLOS</a>
<a href="/tipografia.html" data-area="tipografia">02 / TIPOGRAFIA</a>
<a href="/cores.html" data-area="cores">03 / CORES</a>
<a href="/composicao.html" data-area="composicao">04 / COMPOSIÇÃO</a>
<a href="/laboratorio.html" data-area="laboratorio">05 / LABORATÓRIO</a>
<a href="/imagem.html" data-area="imagem">06 / IMAGEM</a>
</nav>'''
STYLE='''<style>
.lm-site-nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:flex-end;flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;gap:clamp(16px,3vw,48px);min-height:54px;padding:13px clamp(22px,4vw,62px);background:#f7f6f2;color:#181818;border-bottom:1px solid #c9c8c2;}
.lm-site-nav a{color:inherit;text-decoration:none;flex-shrink:0;padding:4px 0;border-bottom:1px solid transparent;white-space:nowrap}
.lm-site-nav::-webkit-scrollbar{display:none}
.lm-site-nav a[aria-current=page]{border-color:currentColor}
.lm-site-nav a:hover{text-decoration:underline;text-underline-offset:4px}
.lm-site-nav a:focus-visible{outline:2px solid currentColor;outline-offset:4px}
@media(max-width:600px){.lm-site-nav{justify-content:flex-start;gap:18px;padding:10px 16px;min-height:48px}}
</style>'''
areas={"manual.html":"simbolos","tipografia.html":"tipografia","cores.html":"cores","composicao.html":"composicao","laboratorio.html":"laboratorio","imagem.html":"imagem"}
for filename,area in areas.items():
 p=Path("public")/filename
 assert p.exists(),filename
 s=p.read_text(encoding="utf-8")
 # Replace any source-local menu by the one unified menu.
 s=re.sub(r'<nav class="lm-site-nav"[^>]*>.*?</nav>',"",s,flags=re.S)
 # Remove the earlier exploratory cross-navigation and its styling.
 s=re.sub(r'<nav class="lm-crossnav"[^>]*>.*?</nav>',"",s,flags=re.S)
 s=re.sub(r'<style>\.lm-crossnav\{.*?</style>',"",s,flags=re.S)
 assert "</head>" in s and "<body>" in s
 # All six page-level H1 headings share exactly one typographic treatment.
 title_match = re.search(r'<h1\b[^>]*>', s, flags=re.I)
 assert title_match, f"Missing page-level H1 in {filename}"
 title_open = title_match.group(0)
 if 'class="' in title_open:
  title_open = re.sub(r'class="([^"]*)"', lambda m: 'class="' + m.group(1) + ' lm-manual-page-title"', title_open, count=1)
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
 assert s.count('src="/manual-type-roles.js')==1, f"Missing text-role classifier: {filename}"
 s=s.replace("</head>",STYLE+"</head>",1)
 s=s.replace("<body>","<body>"+NAV.replace('data-area="'+area+'"','aria-current="page" data-area="'+area+'"'),1)
 p.write_text(s,encoding="utf-8")
 print(filename, "global navigation OK")
