"""Assemble the symbols chapter once; preserve official SVG path data."""
from pathlib import Path
import re

p = Path('public/manual.html')
html = p.read_text(encoding='utf-8')
assert 'id="estrutura"' in html and '<div class="symbol-row">' in html

a = html.index('<section class="chapter" id="estrutura">')
b = html.index('<div class="symbol-row">', a)
intro = '<div class="lm-reading-intro"><h2 class="lm-manual-section-title"><span class="line">Assinatura e</span><span class="line perpetua">símbolo</span></h2><p>A assinatura Mattar identifica a instituição. O M é o símbolo principal, também utilizado como máscara e elemento de composição.</p></div>'
html = html[:a] + '<section class="chapter" id="estrutura"><div class="inner">' + intro + html[b:]
html = re.sub(r'<h1 class="title(?: lm-manual-page-title)?">.*?</h1>', '<h1 class="title lm-manual-page-title"><span class="lm-cover-title-content"><span class="line">SISTEMA DE</span><span class="line perpetua">SÍMBOLOS</span></span></h1>', html, count=1, flags=re.S)
html = html.replace('Sistema de identidade / Elementos gráficos / 2026', 'LABMATTAR / IDENTIDADE VISUAL / 01 — SÍMBOLOS', 1)
for id_ in ('manual-responsive-fix','manual-morph-interaction','lm-reading-hierarchy'):
    html = re.sub(r'<style id="'+id_+r'">.*?</style>', '', html, flags=re.S)
html = re.sub(r'<script id="manual-states-script">.*?</script>', '', html, flags=re.S)
html = re.sub(r'<script>\s*\(function\(\)\{const titles=.*?</script>', '', html, flags=re.S)

section = '''<section class="chapter chapter-spacious" id="transformacao"><div class="inner">
<p class="eyebrow" id="motion">03 / Motion</p>
<h2 class="title"><span class="line">SÍMBOLOS EM</span><span class="line perpetua">MOVIMENTO</span></h2>
<p class="copy section-lead">O M encontra os pictogramas por giros e transformações. Explore os roteiros de símbolo, assinaturas e transições ou componha um percurso na Matriz.</p>
<div class="motion-symbol-preview" data-motion-version="20261104-groups">
<video data-motion-ink muted loop playsinline preload="auto" poster="/motion/posters/m-form.png" aria-label="M + Forma — símbolo em movimento"><source src="/motion/videos/m-form.mp4" type="video/mp4"/><a href="/motion/videos/m-form.mp4">Baixar vídeo M + Forma</a></video>
</div>
<div class="motion-group-links detail"><a href="/motion.html#roteiros">SÍMBOLO EM MOVIMENTO ↗</a><a href="/motion.html#assinaturas">ASSINATURAS E ABERTURAS ↗</a><a href="/motion.html#transicoes">TRANSIÇÕES ↗</a><a href="/motion/matriz/index.html">ABRIR MATRIZ ↗</a></div>
</div></section>'''
html, count = re.subn(r'<section\b[^>]*id="transformacao"[^>]*>.*?</section>', lambda _:section, html, count=1, flags=re.S)
assert count == 1
html = re.sub(r'<link[^>]*href="/manual-symbols\.css[^>]*>', '', html)
html = re.sub(r'<script[^>]*src="/(?:vendor/MorphSVGPlugin|manual-symbols)\.js[^>]*>\s*</script>', '', html)
html = re.sub(r'<link[^>]*href="/motion\.css[^>]*>', '', html)
html = re.sub(r'<script[^>]*src="/motion\.js[^>]*>\s*</script>', '', html)
html = html.replace('</head>', '<link rel="stylesheet" href="/motion.css"/>\n<script defer src="/motion.js"></script>\n</head>', 1)
html = html.replace('href="#transformacao">Transformação', 'href="#transformacao">Motion')
rules = re.search(r'<section class="chapter" id="regras">.*?</section>', html, re.S)
if rules:
    rule_text = rules.group().replace('05 / Matriz normativa','04 / Matriz normativa')
    html = html[:rules.start()]+html[rules.end():]
    pos = html.index('<section class="chapter" id="ferramenta">')
    html = html[:pos]+rule_text+html[pos:]

# Approved concise copy. Change only editorial text; preserve SVGs and controls.
copy = {
    'principio': 'Uma assinatura, um símbolo principal e nove vasos.',
    'vasos': 'Os nove vasos integram a identidade e têm a mesma importância. Nenhum é principal.',
    'ferramenta': 'Abra a Matriz atual para compor giros, transformações e roteiros. Encontre os vídeos prontos organizados por função na área Motion.',
}
for section_id, text in copy.items():
    pattern = r'(<section\b[^>]*id="'+section_id+r'"[^>]*>.*?<p class="copy">).*?(</p>)'
    html, count = re.subn(pattern, lambda m: m.group(1)+text+m.group(2), html, count=1, flags=re.S)
    assert count == 1, f'Missing copy paragraph: {section_id}'

rules_copy = 'Nas aplicações estáticas, preserve os desenhos e as proporções originais. Nas animações, siga o princípio de rotação e transformação.'
rules = re.search(r'<section class="chapter" id="regras">.*?</section>', html, re.S)
assert rules and '<div class="rules">' in rules.group(), 'Missing usage rules'
rule_text = rules.group().split('<div class="rules">', 1)[0]+'<div class="rules"><p class="copy">'+rules_copy+'</p></div></div></section>'
html = html[:rules.start()]+rule_text+html[rules.end():]
html = re.sub(r'<p class="detail"[^>]*>EDITOR INTEGRAL / BACKUP ORIGINAL V72</p>', '', html)
html = html.replace('>Símbolo master<', '>Símbolo principal<')
html = html.replace('01—09 / MESMO PESO', '01—09 / VASOS')

assert html.count('data-motion-version="20261104-groups"') == 1
assert 'id="state-morph-svg"' not in html
assert html.count('id="manual-states-script"') == 0
assert html.count('class="lm-reading-intro"') == 1
html = re.sub(r'\n*(<link rel="stylesheet" href="/motion)', r'\n\1', html)
html = re.sub(r'\n*(<script defer src="/motion)', r'\n\1', html)
html = re.sub(r'<h2 class="title">', '<h2 class="title lm-manual-section-title">', html)
p.write_text(html, encoding='utf-8')
print('Symbols: original artwork preserved; current Motion replaces contour demo')
