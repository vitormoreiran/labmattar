from pathlib import Path
import json

root=Path("design")
manifest=json.loads((root/"identity-system.json").read_text(encoding="utf-8"))
assert manifest["schemaVersion"]=="1.0.0"
assert len(manifest["sections"])==7
assert len(manifest["symbols"]["vessels"])==9
assert manifest["image"]["textContrast"]["veilColor"]=="#000000"
assert manifest["image"]["textContrast"]["veilOpacity"]==0.2
assert manifest["image"]["textContrast"]["otherwise"]=="no automatic veil"
assert len(set(manifest["colors"]["palette"].values()))==5
for name in ("manual.html","tipografia.html","cores.html","composicao.html","imagem.html"):
 page=Path("public")/name
 assert page.exists(),f"Missing page: {page}"
 text=page.read_text(encoding="utf-8")
 assert '<nav class="lm-site-nav"' in text,f"Missing shared navigation in {name}"
 for expected in ("/manual.html","/tipografia.html","/cores.html","/composicao.html","/imagem.html"):
  assert expected in text,f"Missing navigation link {expected} in {name}"
for page in ("tipografia.html","cores.html"):
 text=(Path("public")/page).read_text(encoding="utf-8")
 for font in ("univers-lt-std-45-light.otf","perpetua-titling-light.ttf"):
  assert font in text,f"{page} missing {font}"
composition=(Path("public")/"composicao.html").read_text(encoding="utf-8")
assert 'id="contraste"' in composition and "20% DE PRETO" in composition
assert ".lm-case-image::after" in composition, "Mask must carry its own text contrast veil"
assert 'id="construcao"' in composition and 'id="laboratorio"' in composition
assert 'href="/composicao-lab.css"' in composition
assert 'src="/composicao-lab.js"' in composition
lab_css=(Path("public")/"composicao-lab.css").read_text(encoding="utf-8")
lab_js=(Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
for selector in ('lm-lab-workspace','lm-lab-m-photo','lm-lab-main-copy','lm-lab-photo-contrast'):
 assert selector in lab_css,f"Missing lab element: {selector}"
for action in ('labFormat','labMPosition','labFocusX','labTitleScale','labTitleInput','labBodyInput','labReset'):
 assert action in composition and action in lab_js,f"Unwired lab control: {action}"
for variant in ('tipografia','mascara','imagem'):
 assert 'data-lab-preset="'+variant+'"' in composition
 assert variant+':' in lab_js
assert "rgba(0,0,0,.20)" in lab_css, "Photo contrast must remain at 20 percent"
assert "labContrast" not in composition, "Approved veil opacity must not be an uncontrolled experiment"

print("LABMATTAR system foundations validated")

assert Path('public/identidade.html').exists()
