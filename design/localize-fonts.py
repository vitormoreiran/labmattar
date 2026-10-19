from pathlib import Path
import re

root=Path("public")
files=["manual.html","tipografia.html","cores.html","composicao.html","imagem.html","identidade.html"]
for name in files:
 p=root/name
 if not p.exists():raise SystemExit(f"Missing page: {name}")
 s=p.read_text(encoding="utf-8")
 s=re.sub(r"local\(['\"][^'\"]+['\"]\)\s*,\s*","",s)
 s=s.replace("https://labmattar.com/fonts/univers-lt-std-45-light.otf","/fonts/univers-lt-std-45-light.otf")
 s=s.replace("https://labmattar.com/fonts/perpetua-titling-light.ttf","/fonts/perpetua-titling-light.ttf")
 # The general overview used @font-face without weight: on a different machine
 # synthetic faces could yield inconsistent type rendering.
 if name=="identidade.html":
  s=s.replace("url('/fonts/univers-lt-std-45-light.otf')}","url('/fonts/univers-lt-std-45-light.otf') format('opentype');font-weight:300;font-style:normal;font-display:swap}")
  s=s.replace("url('/fonts/perpetua-titling-light.ttf')}","url('/fonts/perpetua-titling-light.ttf') format('truetype');font-weight:300;font-style:normal;font-display:swap}")
 p.write_text(s,encoding="utf-8")
 print("font assets localized:",name)

for name in ("globals.css","editor/editorial.css"):
 p=Path("app")/name
 if not p.exists():raise SystemExit(f"Missing stylesheet {name}")
 s=p.read_text(encoding="utf-8")
 s=re.sub(r"local\(['\"][^'\"]+['\"]\)\s*,\s*","",s)
 s=s.replace("https://labmattar.com/fonts/univers-lt-std-45-light.otf","/fonts/univers-lt-std-45-light.otf")
 s=s.replace("https://labmattar.com/fonts/perpetua-titling-light.ttf","/fonts/perpetua-titling-light.ttf")
 p.write_text(s,encoding="utf-8")
 print("font assets localized:",name)
