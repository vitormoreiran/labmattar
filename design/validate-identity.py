from pathlib import Path
import json

root=Path("design")
manifest=json.loads((root/"identity-system.json").read_text(encoding="utf-8"))
assert manifest["schemaVersion"]=="1.0.0"
assert len(manifest["sections"])==7
assert len(manifest["symbols"]["vessels"])==9
assert len(set(manifest["colors"]["palette"].values()))==5
contrast=manifest["composition"]["imageTextContrast"]
assert contrast["status"]=="approved"
assert contrast["overlayColor"]=="#000000"
assert contrast["overlayOpacity"]==0.2
assert contrast["overlayOrder"]==["photograph","black overlay","editorial text"]
assert 'data-contrast="on"' in (Path("public")/"composicao.html").read_text(encoding="utf-8")
assert 'data-case-contrast="off"' in (Path("public")/"composicao.html").read_text(encoding="utf-8")
editor=(Path("public")/"ambiente-editorial")
assert "ambient-photo-contrast" in (editor/"index.html").read_text(encoding="utf-8")
assert 'data-text-on-mask="true"' in (editor/"editorial-composition.css").read_text(encoding="utf-8")
assert "applyImageTextContrast(art,visible)" in (editor/"editorial-v2.js").read_text(encoding="utf-8")
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
print("LABMATTAR system foundations validated")

assert Path('public/identidade.html').exists()
