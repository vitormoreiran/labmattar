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
print("LABMATTAR system foundations validated")

assert Path('public/identidade.html').exists()
