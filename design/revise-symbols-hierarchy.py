"""Assemble the symbols chapter once; preserve official SVG path data."""
from pathlib import Path
import re

p = Path('public/manual.html')
html = p.read_text(encoding='utf-8')
assert 'id="estrutura"' in html and '<div class="symbol-row">' in html

a = html.index('<section class="chapter" id="estrutura">')
b = html.index('<div class="symbol-row">', a)
intro = '<div class="lm-reading-intro"><h2 class="lm-manual-section-title"><span class="line">M E</span><span class="line perpetua">MATTAR</span></h2><p>O M é o elemento estruturante: identifica e assina autonomamente, como vetor, máscara ou elemento gráfico. MATTAR é o logotipo institucional oficial, preferencial nas comunicações externas e em aplicações com outras marcas. Não precisam aparecer juntos.</p></div>'
html = html[:a] + '<section class="chapter" id="estrutura"><div class="inner">' + intro + html[b:]
html = re.sub(r'<h1 class="title(?: lm-manual-page-title)?">.*?</h1>', '<h1 class="title lm-manual-page-title"><span class="lm-cover-title-content"><span class="line">SISTEMA DE</span><span class="line perpetua">SÍMBOLOS</span></span></h1>', html, count=1, flags=re.S)
html = html.replace('Sistema de identidade / Elementos gráficos / 2026', 'LABMATTAR / IDENTIDADE VISUAL / 01 — SÍMBOLOS', 1)
for id_ in ('manual-responsive-fix','manual-morph-interaction','lm-reading-hierarchy'):
    html = re.sub(r'<style id="'+id_+r'">.*?</style>', '', html, flags=re.S)
html = re.sub(r'<script id="manual-states-script">.*?</script>', '', html, flags=re.S)
html = re.sub(r'<script>\s*\(function\(\)\{const titles=.*?</script>', '', html, flags=re.S)
# Remove the temporary browser-side assembly used during the local review.
html = re.sub(r'<script>document\.addEventListener\(\'DOMContentLoaded\'.*?</script>', '', html, flags=re.S)

# Do not duplicate Motion in the Symbols chapter.
html, count = re.subn(r'<section\b[^>]*id="transformacao"[^>]*>.*?</section>', '', html, count=1, flags=re.S)
assert count == 1 or 'lm-identity-application' in html, 'Missing transformation section on first pass'
html = re.sub(r'<link[^>]*href="/manual-symbols\.css[^>]*>', '', html)
html = re.sub(r'<script[^>]*src="/(?:vendor/MorphSVGPlugin|manual-symbols)\.js[^>]*>\s*</script>', '', html)
html = re.sub(r'<link[^>]*href="/motion\.css[^>]*>', '', html)
html = re.sub(r'<script[^>]*src="/motion\.js[^>]*>\s*</script>', '', html)
html = html.replace('</head>', '<link rel="stylesheet" href="/manual-symbols.css"/>\n<link rel="stylesheet" href="/motion.css"/>\n<script defer src="/motion.js"></script>\n</head>', 1)
html = html.replace('href="#transformacao">Transformação', 'href="#transformacao">Motion')
rules = re.search(r'<section class="chapter" id="regras">.*?</section>', html, re.S)
if rules:
    rule_text = rules.group().replace('05 / Matriz normativa','04 / Matriz normativa')
    html = html[:rules.start()]+html[rules.end():]
    pos = html.index('<section class="chapter" id="ferramenta">')
    html = html[:pos]+rule_text+html[pos:]

# Approved concise copy. Change only editorial text; preserve SVGs and controls.
copy = {
    'principio': 'Um símbolo estruturante, um logotipo oficial e nove vasos.',
    'vasos': 'Os nove vasos integram a identidade e têm a mesma importância. Nenhum é principal.',
}
for section_id, text in copy.items():
    pattern = r'(<section\b[^>]*id="'+section_id+r'"[^>]*>.*?<p class="copy">).*?(</p>)'
    html, count = re.subn(pattern, lambda m: m.group(1)+text+m.group(2), html, count=1, flags=re.S)
    assert count == 1, f'Missing copy paragraph: {section_id}'

application = '''<section class="chapter lm-identity-application" id="uso"><div class="inner">
<p class="eyebrow">04 / REGRAS DE APLICAÇÃO</p>
<h2 class="title lm-manual-section-title"><span class="line">REGRAS DE</span><span class="line perpetua">APLICAÇÃO</span></h2>
<div class="lm-application-axis"><div><p class="detail">01 / ASSINATURAS</p><p class="copy">M e MATTAR assinam de forma autônoma. O M pode identificar e-mails e documentos; MATTAR é o logotipo oficial preferencial em comunicações externas, inclusive com outras marcas. A presença conjunta não é obrigatória.</p></div><div class="lm-application-brand"><figure><img src="/identidade/M.svg" alt="Símbolo M"><figcaption class="detail">M / ASSINATURA AUTÔNOMA</figcaption></figure><figure><img src="/identidade/mattar.svg" alt="Logotipo oficial MATTAR"><figcaption class="detail">MATTAR / LOGOTIPO OFICIAL</figcaption></figure></div></div>
<div class="lm-application-axis"><div><p class="detail">02 / GEOMETRIA</p><h3 class="detail lm-application-subtitle">M INTEGRAL E EXPANDIDO</h3><p class="copy">No estado integral, o vetor mantém sua geometria. No expandido, as laterais ocupam horizontalmente o campo enquanto as reentrâncias centrais permanecem intactas. Os cantos externos não precisam aparecer.</p><p class="detail lm-application-reference">REFERÊNCIA REAL: SIMPÓSIO / MÁSCARA DE IMAGEM. EXPANSÃO ESTÁTICA, NÃO MOTION.</p></div><div class="lm-application-comparison"><figure><div class="lm-application-integral"><img src="/identidade/M.svg" alt="M integral, com sua geometria completa"></div><figcaption class="detail">M INTEGRAL</figcaption></figure><figure><div class="lm-application-expanded" aria-label="M expandido horizontalmente, com núcleo central preservado"><span class="lm-expanded-field" aria-hidden="true"></span><span class="lm-expanded-center"><img src="/identidade/M.svg" alt="M com as reentrâncias centrais preservadas"></span><span class="lm-expanded-field" aria-hidden="true"></span></div><figcaption class="detail">M EXPANDIDO</figcaption></figure></div></div>
<div class="lm-application-axis"><div><p class="detail">03 / VASOS</p><p class="copy">Os nove vasos têm a mesma importância. Funcionam como vetores ou máscaras; sozinhos, não garantem a identificação da marca. Uma transformação originada no M pode estabelecer essa relação.</p></div><div class="lm-application-vases"><figure><img src="/identidade/vaso_01.svg" alt="Vaso 01 em vetor"><figcaption class="detail">VETOR</figcaption></figure><figure><span class="lm-application-vase-mask" role="img" aria-label="Vaso 01 usado como máscara em um campo vermelho oficial"></span><figcaption class="detail">MÁSCARA</figcaption></figure></div></div>
<div class="lm-application-axis"><div><p class="detail">04 / LIMITES</p><p class="copy">Explorar escala e posição é permitido; distorcer a geometria e aplicar cores fora do sistema oficial, não.</p></div><dl class="lm-application-rules"><div><dt class="detail">INTEGRIDADE</dt><dd class="copy">Não distorcer vetores. A expansão horizontal é exclusiva do M estático.</dd></div><div><dt class="detail">COR</dt><dd class="copy">Usar somente cores e preenchimentos oficiais.</dd></div><div><dt class="detail">ESCALA MÍNIMA DIGITAL</dt><dd class="copy">M: 24 px de altura; vasos: 32 px de altura; MATTAR: 120 px de largura.</dd></div><div><dt class="detail">ESCALA MÁXIMA</dt><dd class="copy">Sem máximo fixo: ampliar e recortar preservando o reconhecimento.</dd></div></dl></div>
<p class="detail lm-application-endnote">AS TRANSFORMAÇÕES ENTRE M, VASOS E LETRAS DE MATTAR SÃO APRESENTADAS EM <a href="/motion.html">MOTION ↗</a>.</p>
</div></section>'''
existing_application = 'lm-identity-application' in html
html = re.sub(r'<section\b[^>]*class="[^"]*lm-identity-application[^"]*"[^>]*>.*?</section>', '', html, count=1, flags=re.S)
for section_id in ('regras', 'ferramenta'):
    html, count = re.subn(r'<section\b[^>]*id="'+section_id+r'"[^>]*>.*?</section>', '', html, count=1, flags=re.S)
    assert count == 1 or existing_application, f'Missing application section: {section_id}'
html = re.sub(r'\n*</main>', '\n'+application+'\n</main>', html, count=1)

# A static, nine-object viewer lives in Symbols, not in the Motion chapter.
three_dimensional = '''<section class="chapter lm-3d-section" id="tridimensional"><div class="inner">
<p class="eyebrow">03 / VARIAÇÕES TRIDIMENSIONAIS</p>
<h2 class="title lm-manual-section-title"><span class="line">VARIAÇÕES</span><span class="line perpetua">TRIDIMENSIONAIS</span></h2>
<p class="copy lm-3d-intro">Os nove vasos também podem ser apresentados em volume. Selecione cada forma para observar sua tridimensionalidade. Os vasos continuam sendo elementos gráficos do sistema, não assinaturas autônomas.</p>
<div class="lm-3d-stage" id="lm-vasos3d" data-asset-root="/motion/matriz/models/dense" data-active="1" data-ready="false">
<div class="lm-3d-canvas-wrap"><img class="lm-3d-fallback" src="/identidade/vaso_01.svg" alt="" aria-hidden="true"/><canvas aria-label="Modelo tridimensional do vaso selecionado; arraste para girar"></canvas></div>
<div class="lm-3d-panel"><p class="detail">SELECIONE O VASO</p>
<div class="lm-3d-selector" role="group" aria-label="Nove vasos tridimensionais"><button type="button" data-vaso="1" aria-label="Visualizar vaso 01 em 3D" aria-pressed="true">01</button><button type="button" data-vaso="2" aria-label="Visualizar vaso 02 em 3D" aria-pressed="false">02</button><button type="button" data-vaso="3" aria-label="Visualizar vaso 03 em 3D" aria-pressed="false">03</button><button type="button" data-vaso="4" aria-label="Visualizar vaso 04 em 3D" aria-pressed="false">04</button><button type="button" data-vaso="5" aria-label="Visualizar vaso 05 em 3D" aria-pressed="false">05</button><button type="button" data-vaso="6" aria-label="Visualizar vaso 06 em 3D" aria-pressed="false">06</button><button type="button" data-vaso="7" aria-label="Visualizar vaso 07 em 3D" aria-pressed="false">07</button><button type="button" data-vaso="8" aria-label="Visualizar vaso 08 em 3D" aria-pressed="false">08</button><button type="button" data-vaso="9" aria-label="Visualizar vaso 09 em 3D" aria-pressed="false">09</button></div>
<p class="detail lm-3d-status" data-lm-3d-status role="status" aria-live="polite">PRÉVIA TRIDIMENSIONAL / ESCOLHA UM VASO</p>
<p class="detail lm-3d-explain">GEOMETRIAS ORIGINAIS, OTIMIZADAS PARA A WEB. A ROTAÇÃO AQUI SERVE SOMENTE PARA EXAMINAR O VOLUME.</p></div></div>
</div></section>'''
html = re.sub(r'\s*<section class="chapter lm-3d-section" id="tridimensional">.*?</section>', '', html, count=1, flags=re.S)
assert html.count('<section class="chapter lm-identity-application" id="uso">') == 1
html = html.replace('<section class="chapter lm-identity-application" id="uso">', three_dimensional+'\n<section class="chapter lm-identity-application" id="uso">', 1)
if '<script type="module" src="/motion/matriz/symbols-3d-gallery.js"></script>' not in html:
    html = html.replace('</head>', '<script type="module" src="/motion/matriz/symbols-3d-gallery.js"></script>\n</head>', 1)
assert html.count('id="tridimensional"') == 1
assert html.count('data-vaso=') == 9

html = re.sub(r'<p class="detail"[^>]*>EDITOR INTEGRAL / BACKUP ORIGINAL V72</p>', '', html)
# Signatures already carry concise captions below their artwork; keep no second role label above.
for label in ('Assinatura principal', 'LOGOTIPO OFICIAL', 'SÍMBOLO / ASSINATURA'):
    html = html.replace('<article class="symbol"><p class="eyebrow">'+label+'</p>', '<article class="symbol">')
html = html.replace('>Símbolo master<', '>Símbolo principal<')
html = html.replace('01—09 / MESMO PESO', '01—09 / VASOS')
# Keep a single identifier per vessel; remove repetitive state and group labels.
html = re.sub(r'<footer>ESTADO 0[1-9]</footer>', '', html)
html = html.replace('<span class="detail">01—09 / VASOS</span>', '')
# Shorten the opening and label the two autonomous signatures accurately.
html = html.replace('<p class="detail">SISTEMA VETORIAL<br/>ASSINATURA / M / VASOS</p>', '')
html = html.replace('>Assinatura principal<', '>LOGOTIPO OFICIAL<')
html = html.replace('>Símbolo principal<', '>SÍMBOLO / ASSINATURA<')

assert html.count('data-motion-version="20261104-groups"') == 0
assert 'id="state-morph-svg"' not in html
assert html.count('id="manual-states-script"') == 0
assert html.count('class="lm-reading-intro"') == 1
assert html.count('lm-identity-application') == 1
html = re.sub(r'\n*(<link rel="stylesheet" href="/manual-symbols\.css)', r'\n\1', html)
html = re.sub(r'\n*(<link rel="stylesheet" href="/motion)', r'\n\1', html)
html = re.sub(r'\n*(<script defer src="/motion)', r'\n\1', html)
html = re.sub(r'<h2 class="title">', '<h2 class="title lm-manual-section-title">', html)
html = re.sub(r'<header class="top">.*?</header>', '', html, count=1, flags=re.S)
html = re.sub(r'[ \t]+(?=\n)', '', html)
p.write_text(html, encoding='utf-8', newline='\n')
print('Symbols: original artwork preserved; current Motion replaces contour demo')
