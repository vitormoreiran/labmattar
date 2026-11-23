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
# Remove the temporary browser-side assembly used during the local review.
html = re.sub(r'<script>document\.addEventListener\(\'DOMContentLoaded\'.*?</script>', '', html, flags=re.S)

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
}
for section_id, text in copy.items():
    pattern = r'(<section\b[^>]*id="'+section_id+r'"[^>]*>.*?<p class="copy">).*?(</p>)'
    html, count = re.subn(pattern, lambda m: m.group(1)+text+m.group(2), html, count=1, flags=re.S)
    assert count == 1, f'Missing copy paragraph: {section_id}'

application = '''<section class="chapter lm-identity-application" id="uso"><div class="inner">
<p class="eyebrow">04 / APLICAÇÃO DA IDENTIDADE</p>
<h2 class="title lm-manual-section-title"><span class="line">COMPOSIÇÃO E</span><span class="line perpetua">APLICAÇÃO</span></h2>
<div class="lm-application-axis"><div><p class="detail">01 / M E MATTAR</p><p class="copy">M atua como elemento ou máscara; MATTAR é a assinatura institucional. A assinatura permanece isolada e não divide o mesmo campo com outras marcas.</p></div><div class="lm-application-brand"><img src="/identidade/M.svg" alt="M do LABMATTAR"><img src="/identidade/mattar.svg" alt="Assinatura MATTAR"></div></div>
<div class="lm-application-axis"><div><p class="detail">02 / SÍMBOLOS E VASOS</p><p class="copy">Os vasos são equivalentes entre si. Use-os como vetores ou máscaras, preservando desenho, proporção e leitura.</p></div><div class="lm-application-vases"><img src="/identidade/vaso_01.svg" alt="Vaso 01"><img src="/identidade/vaso_03.svg" alt="Vaso 03"><img src="/identidade/vaso_06.svg" alt="Vaso 06"><img src="/identidade/vaso_09.svg" alt="Vaso 09"></div></div>
<div class="lm-application-axis"><div><p class="detail">03 / REGRAS DE COMPOSIÇÃO</p><p class="copy">Defina hierarquia, cor e escala antes de inserir símbolos. Alinhe os elementos à mesma estrutura e confira a leitura no formato final.</p></div><div class="lm-application-rules"><span>ESCALA</span><span>POSIÇÃO</span><span>HIERARQUIA</span><span>COR</span></div></div>
<div class="lm-application-motion"><p class="detail">VARIAÇÕES 3D APROVADAS</p><div><video data-motion-ink muted loop playsinline preload="metadata" poster="/motion/posters/m-form.png" aria-label="Variação 3D M e forma"><source src="/motion/videos/m-form.mp4" type="video/mp4"></video><video data-motion-ink muted loop playsinline preload="metadata" poster="/motion/posters/mattar-rhythm.png" aria-label="Variação 3D da assinatura Mattar"><source src="/motion/videos/mattar-rhythm.mp4" type="video/mp4"></video></div><p class="detail">ROTEIROS APROVADOS / VER MOTION PARA REPRODUÇÃO E EDIÇÃO.</p></div>
</div></section>'''
existing_application = 'lm-identity-application' in html
html = re.sub(r'<section\b[^>]*class="[^"]*lm-identity-application[^"]*"[^>]*>.*?</section>', '', html, count=1, flags=re.S)
for section_id in ('regras', 'ferramenta'):
    html, count = re.subn(r'<section\b[^>]*id="'+section_id+r'"[^>]*>.*?</section>', '', html, count=1, flags=re.S)
    assert count == 1 or existing_application, f'Missing application section: {section_id}'
html = re.sub(r'\n*</main>', '\n'+application+'\n</main>', html, count=1)
html = re.sub(r'<p class="detail"[^>]*>EDITOR INTEGRAL / BACKUP ORIGINAL V72</p>', '', html)
html = html.replace('>Símbolo master<', '>Símbolo principal<')
html = html.replace('01—09 / MESMO PESO', '01—09 / VASOS')

assert html.count('data-motion-version="20261104-groups"') == 1
assert 'id="state-morph-svg"' not in html
assert html.count('id="manual-states-script"') == 0
assert html.count('class="lm-reading-intro"') == 1
assert html.count('lm-identity-application') == 1
html = re.sub(r'\n*(<link rel="stylesheet" href="/motion)', r'\n\1', html)
html = re.sub(r'\n*(<script defer src="/motion)', r'\n\1', html)
html = re.sub(r'<h2 class="title">', '<h2 class="title lm-manual-section-title">', html)
html = re.sub(r'[ \t]+(?=\n)', '', html)
p.write_text(html, encoding='utf-8', newline='\n')
print('Symbols: original artwork preserved; current Motion replaces contour demo')
