from pathlib import Path
from bs4 import BeautifulSoup

p=Path("public/manual.html")
html=p.read_text(encoding="utf-8")
soup=BeautifulSoup(html,"html.parser")
cover=soup.find(id="principio")
structure=soup.find(id="estrutura")
assert cover and structure
inner=structure.find(class_="inner")
corners=structure.find(class_="corners")
assert inner and corners and corners.find(class_="center-piece")
# Remove the four disconnected corner descriptions. The corresponding elements
# are described alongside their actual visual samples below.
for item in corners.find_all(class_="note"):
    item.decompose()
intro=soup.new_tag("div",attrs={"class":"lm-reading-intro"})
heading=soup.new_tag("h2")
heading.string="Assinatura e símbolo"
description=soup.new_tag("p")
description.string="A assinatura Mattar identifica a instituição. O M é o símbolo principal. Os nove vasos formam uma família de elementos gráficos utilizada nas aplicações da identidade."
intro.append(heading)
intro.append(description)
corners.insert_before(intro)
# The diagram now contains only the primary brand drawing. The explanatory
# caption is placed immediately underneath it, not detached from the artwork.
center=corners.find(class_="center-piece")
paragraph=center.find("p",class_="copy")
if paragraph:
    paragraph.string="Assinatura Mattar / identificação institucional."
# Reorganize the landing content so it identifies the section rather than
# repeating another abstract tagline.
cover_title=cover.find("h1",class_="title")
if cover_title:
    cover_title.clear()
    for label,cl in [("SISTEMA DE","line"),("SÍMBOLOS","line perpetua")]:
        span=soup.new_tag("span",attrs={"class":cl})
        span.string=label
        cover_title.append(span)
cover_label=cover.find(class_="eyebrow")
if cover_label:
    cover_label.string="LABMATTAR / IDENTIDADE VISUAL / 01 — SÍMBOLOS"
# Preserve artwork, transformation engine and remaining sections.
style=soup.new_tag("style",id="lm-reading-hierarchy")
style.string=""" 
#estrutura .lm-reading-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;gap:clamp(20px,5vw,90px);border-top:1px solid var(--line);padding-top:20px;margin:20px 0 clamp(30px,5vw,85px)}
#estrutura .lm-reading-intro h2{font:300 clamp(32px,4.8vw,68px)/1.03 var(--u);letter-spacing:-.025em;margin:0;text-transform:uppercase}
#estrutura .lm-reading-intro p{font:300 clamp(16px,1.45vw,19px)/1.5 var(--u);max-width:51ch;margin:0}
#estrutura .corners{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:auto!important;padding:clamp(24px,5vw,70px) 0;margin:0}
#estrutura .corners .center-piece{position:static!important;inset:auto!important;transform:none!important;width:min(100%,1050px);max-width:100%;margin:auto!important;padding:0!important;display:flex;flex-direction:column;align-items:center;gap:clamp(18px,3vw,35px)}
#estrutura .corners .center-piece svg{display:block;max-width:100%;height:auto}
#estrutura .corners .center-piece .copy{max-width:70ch!important;width:100%;font-size:14px;line-height:1.5;text-align:left;margin:0!important}
#estrutura .symbol-row{margin-top:clamp(65px,9vw,140px)!important}
#estrutura .symbol-row .meta{line-height:1.5}
@media(max-width:760px){#estrutura .lm-reading-intro{grid-template-columns:1fr;gap:18px;margin-bottom:25px}#estrutura .lm-reading-intro h2{font-size:clamp(35px,10vw,58px)}#estrutura .corners{padding:25px 0}#estrutura .corners .center-piece .copy{font-size:13px}}
"""
soup.head.append(style)
p.write_text(str(soup),encoding="utf-8")
print("Revised symbols hierarchy with preserved original artwork")
