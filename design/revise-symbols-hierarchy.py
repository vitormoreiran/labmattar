from pathlib import Path
import re

p=Path("public/manual.html")
html=p.read_text(encoding="utf-8")
assert 'id="estrutura"' in html
assert '<div class="corners">' in html
assert '<div class="center-piece">' in html
intro='''<div class="lm-reading-intro"><h2>Assinatura e símbolo</h2><p>A assinatura Mattar identifica a instituição. O M é o símbolo principal. Os nove vasos formam uma família de elementos gráficos utilizada nas aplicações da identidade.</p></div>'''
html=html.replace('<div class="corners">',intro+'<div class="corners">',1)
# Only the four corner notes belonging to the diagram are removed.
start=html.index('<div class="corners">')
end=html.index('<div class="symbol-row">',start)
fragment=html[start:end]
fragment,n=re.subn(r'<div class="note(?: right)?(?: bottom)?"><b>0[1-4] / [^<]+</b>[^<]*</div>',"",fragment)
assert n==4, f"Expected exactly four peripheral captions, got {n}"
fragment=fragment.replace('Mattar identifica. O M estrutura. Os vasos constituem estados equivalentes da marca.','Assinatura Mattar / identificação institucional.')
html=html[:start]+fragment+html[end:]
# Keep the actual SVG markup byte-for-byte.
title_start=html.index('<h1 class="title">')
title_end=html.index('</h1>',title_start)+len('</h1>')
html=html[:title_start]+'<h1 class="title"><span class="line">SISTEMA DE</span><span class="line perpetua">SÍMBOLOS</span></h1>'+html[title_end:]
html=html.replace('Sistema de identidade / Elementos gráficos / 2026','LABMATTAR / IDENTIDADE VISUAL / 01 — SÍMBOLOS',1)
style='''<style id="lm-reading-hierarchy">
#estrutura .lm-reading-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(20px,5vw,90px);border-top:1px solid var(--line);padding-top:20px;margin:20px 0 clamp(30px,5vw,85px)}
#estrutura .lm-reading-intro h2{font:300 clamp(32px,4.8vw,68px)/1.03 var(--u);letter-spacing:-.025em;margin:0;text-transform:uppercase}
#estrutura .lm-reading-intro p{font:300 clamp(16px,1.45vw,19px)/1.5 var(--u);max-width:51ch;margin:0}
#estrutura .corners{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0!important;padding:clamp(24px,5vw,70px) 0;margin:0}
#estrutura .corners .center-piece{position:static!important;inset:auto!important;transform:none!important;width:min(100%,1050px);max-width:100%;margin:auto!important;padding:0!important;display:flex;flex-direction:column;align-items:center;gap:clamp(18px,3vw,35px)}
#estrutura .corners .center-piece svg{display:block;max-width:100%;height:auto}
#estrutura .corners .center-piece .copy{max-width:70ch!important;width:100%;font-size:14px;line-height:1.5;text-align:left;margin:0!important}
#estrutura .symbol-row{margin-top:clamp(65px,9vw,140px)!important}
#estrutura .symbol-row .meta{line-height:1.5}
@media(max-width:760px){#estrutura .lm-reading-intro{grid-template-columns:1fr;gap:18px;margin-bottom:25px}#estrutura .lm-reading-intro h2{font-size:clamp(35px,10vw,58px)}#estrutura .corners{padding:25px 0}#estrutura .corners .center-piece .copy{font-size:13px}}
</style>'''
assert '</head>' in html
html=html.replace('</head>',style+'</head>',1)
p.write_text(html,encoding="utf-8")
print("Symbols: heading, explanation and artwork reorganized without SVG mutation")
