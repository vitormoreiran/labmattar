"""Assemble the symbols chapter once; preserve official SVG path data."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET

p = Path('public/manual.html')
html = p.read_text(encoding='utf-8')
assert 'id="estrutura"' in html and '<div class="symbol-row">' in html

a = html.index('<section class="chapter" id="estrutura">')
b = html.index('<div class="symbol-row">', a)
intro = '<div class="lm-reading-intro"><h2>Assinatura e símbolo</h2><p>A assinatura Mattar identifica a instituição. O M é o símbolo principal, também utilizado como máscara e elemento de composição.</p></div>'
html = html[:a] + '<section class="chapter" id="estrutura"><div class="inner">' + intro + html[b:]
html = re.sub(r'<h1 class="title">.*?</h1>', '<h1 class="title"><span class="line">SISTEMA DE</span><span class="line perpetua">SÍMBOLOS</span></h1>', html, count=1, flags=re.S)
html = html.replace('Sistema de identidade / Elementos gráficos / 2026', 'LABMATTAR / IDENTIDADE VISUAL / 01 — SÍMBOLOS', 1)
for id_ in ('manual-responsive-fix','manual-morph-interaction','lm-reading-hierarchy'):
    html = re.sub(r'<style id="'+id_+r'">.*?</style>', '', html, flags=re.S)
html = re.sub(r'<script id="manual-states-script">.*?</script>', '', html, flags=re.S)
html = re.sub(r'<script>\s*\(function\(\)\{const titles=.*?</script>', '', html, flags=re.S)

NS = '{http://www.w3.org/2000/svg}'
def artwork(name):
    root = ET.fromstring((Path('public/identidade')/name).read_text(encoding='utf-8'))
    paths = ''.join('<path d="'+node.attrib['d']+'"/>' for node in root.iter(NS+'path'))
    return '<svg viewBox="'+root.attrib['viewBox']+'" fill="currentColor" aria-hidden="true">'+paths+'</svg>'

buttons = []
for n in range(10):
    label = 'M' if n == 0 else f'{n:02}'
    title = 'Símbolo master M' if n == 0 else f'Vaso {n:02}'
    buttons.append('<button type="button" data-state="'+str(n)+'" aria-label="'+title+'" aria-pressed="'+('true' if n==0 else 'false')+'"'+(' class="active"' if n==0 else '')+' disabled>'+artwork('M.svg' if n==0 else f'vaso_{n:02}.svg')+'<span>'+label+'</span></button>')

section = '''<section class="chapter chapter-spacious" id="transformacao"><div class="inner">
<p class="eyebrow">03 / Sistema de transformação</p>
<h2 class="title"><span class="line">UM SÍMBOLO</span><span class="line perpetua">MÚLTIPLOS</span><span class="line">ESTADOS</span></h2>
<p class="copy section-lead">O M gira e se transforma em vaso. Rotação e mudança de forma acontecem em um movimento contínuo.</p>
<div class="state-explorer" data-symbols-version="20261029-verified" data-ready="false" aria-label="Transformação vetorial interativa">
<div class="state-heading"><span class="detail">TRANSFORMAÇÃO VETORIAL</span><span class="detail" id="state-name" aria-live="polite">M / SÍMBOLO MASTER</span></div>
<div class="state-preview"><svg id="state-morph-svg" viewBox="0 0 600 460" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Símbolo master M"><g id="state-morph-paths" fill="currentColor"></g></svg></div>
<div class="state-transport">
<button type="button" id="state-play" aria-pressed="false" disabled>Reproduzir</button>
<div class="state-timeline"><label for="state-progress">Transformação <output id="state-progress-value" for="state-progress">0%</output></label><input id="state-progress" type="range" min="0" max="100" step="1" value="0" disabled/><div class="state-endpoints"><span>M</span><span id="state-target">Escolha um vaso</span></div></div>
<button type="button" id="state-reset" disabled>Voltar ao M</button>
</div>
<div class="state-picker" role="group" aria-label="Escolher estado vetorial">BUTTONS</div>
<p class="state-help" id="state-help" role="status">Escolha um vaso. Use Reproduzir ou arraste o controle para percorrer a transformação.</p>
<noscript><p>Ative o JavaScript para usar os controles. Os nove vetores originais estão apresentados na seção anterior.</p></noscript>
</div></div></section>'''.replace('BUTTONS', ''.join(buttons))
mroot = ET.fromstring((Path('public/identidade/M.svg')).read_text(encoding='utf-8'))
md = next(mroot.iter(NS+'path')).attrib['d']
scale = min(500/822,380/627)
transform = f'translate({(600-822*scale)/2} {(460-627*scale)/2}) scale({scale})'
section = section.replace('<g id="state-morph-paths" fill="currentColor"></g>', '<g id="state-morph-paths" fill="currentColor" transform="'+transform+'"><path d="'+md+'"/></g>')
html, count = re.subn(r'<section\b[^>]*id="transformacao"[^>]*>.*?</section>', lambda _:section, html, count=1, flags=re.S)
assert count == 1
html = re.sub(r'<link[^>]*href="/manual-symbols\.css[^>]*>', '', html)
html = re.sub(r'<script[^>]*src="/(?:vendor/MorphSVGPlugin|manual-symbols)\.js[^>]*>\s*</script>', '', html)
html = html.replace('</head>', '<link rel="stylesheet" href="/manual-symbols.css?v=20261029b"/>\n<script defer src="/vendor/MorphSVGPlugin.js"></script>\n<script defer src="/manual-symbols.js?v=20261029b"></script>\n</head>', 1)
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
    'ferramenta': 'Organize os estados, ajuste as transições e exporte animações.',
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

assert html.count('id="state-morph-svg"') == 1
assert html.count('id="manual-states-script"') == 0
assert html.count('class="lm-reading-intro"') == 1
html = re.sub(r'\n*(<link rel="stylesheet" href="/manual-symbols)', r'\n\1', html)
p.write_text(html, encoding='utf-8')
print('Symbols: concise approved copy; original artwork and controls preserved')
