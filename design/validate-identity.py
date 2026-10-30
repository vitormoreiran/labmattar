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
assert 'id="contraste"' in composition and ("PRETO 20%" in composition or "20% DE PRETO" in composition)
assert ".lm-case-image::after" in composition, "Mask must carry its own text contrast veil"
assert 'id="construcao"' in composition and 'id="laboratorio"' in composition
assert 'href="/composicao-lab.css"' in composition
assert 'src="/composicao-lab.js"' in composition
assert 'href="/composicao-lab-controls.css"' in composition, "Illustrated control stylesheet missing"
assert 'href="/composicao-studio.css"' in composition, "Viewport studio stylesheet missing"
assert 'href="/composicao-editor-clean.css"' in composition, "Focused editor treatment missing"
clean_css=(Path("public")/"composicao-editor-clean.css").read_text(encoding="utf-8")
studio_css=(Path("public")/"composicao-studio.css").read_text(encoding="utf-8")
studio_js=(Path("public")/"composicao-studio.js").read_text(encoding="utf-8")
lab_css=(Path("public")/"composicao-lab.css").read_text(encoding="utf-8")
lab_js=(Path("public")/"composicao-lab.js").read_text(encoding="utf-8")

assert 'src="/composicao-studio.js"' in composition, "Viewport studio behavior missing"
assert 'id="labStudioToggle"' in composition, "Focused editing entry must be visible"
assert "lm-unified-studio" in studio_js and "lm-studio-open" in studio_js
assert "data-studio-tool" not in studio_js, "Focused mode must not build a second tool architecture"
assert "lm-composition-module-index" in composition
assert "UMA COMPOSIÇÃO" in composition
assert "lm-composition-submodule" in composition
assert 'id="labBackground"' in composition and 'id="labMContent"' in composition
assert "dataset.background" in lab_js and "dataset.mContent" in lab_js
assert "data-background=photo" in lab_css and "data-m-content=solid" in lab_css
assert "m-publicado.svg" in lab_css
assert 'id="regras-de-composicao"' in composition, "Composition rules section missing"
for rule in ("Régua","Margem","Eixo","M central","Marcadores","Adaptação"):
 assert rule in composition,f"Missing composition rule: {rule}"
assert 'data-lab-choice="mMode"' not in composition, "Invented M usage modes must not be exposed"
assert ".20" in lab_css, "Fixed 20% must be preserved"
assert "state.mMode" in lab_js
assert "lm-composition-module" in clean_css and "lm-composition-submodule" in clean_css


controls=(Path("public")/"composicao-lab-controls.css").read_text(encoding="utf-8")
for sample in ("lm-ctrl-choice","lm-ctrl-mini-sheet","lm-ctrl-mini-type","lm-ctrl-mini-photo","lm-marker-grid"):
 assert sample in controls and sample in composition,f"Missing illustrated control: {sample}"
for key in ("format","marker","type","background","mContent","photo","bodyMode"):
 assert 'data-lab-choice="'+key+'"' in composition,f"Missing visual control group: {key}"
assert "fitTitleToReadingArea" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
# The inspector is one composition with persistent modules; every approved control remains.
for key in ("pagina","texto","imagem"):
 assert 'data-lab-panel="'+key+'"' in composition,f"Missing composition module: {key}"
assert 'data-lab-more="pagina"' in composition
assert 'data-lab-more="texto"' in composition
assert 'data-lab-more="imagem"' in composition
for control in ("labFormat","labColor","labMargin","labGuides",
                "labPlacement","labType","labTitleScale","labTextWidth","labBodyMode",
                "labTitleInput","labBodyInput","labBackground","labMContent","labImage","labMMode","labPhoto","labMarker","labRelation",
                "labMPosition","labGap","labMScale","labFocalPreview","labFocusX","labFocusY","labSymbol"):
 assert composition.count('id="'+control+'"')==1,f"Missing or duplicate composition field: {control}"
lab_js=(Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert "labPrecision-" in lab_js and "number.type=\"number\"" in lab_js
assert "setFieldVisible" in lab_js and "selectPanel(activePanel)" in lab_js
# Guidance is contextual; no instructions or numbered pseudo-steps clutter the UI.
assert 'id="labOverviewHelp"' in composition
assert '<strong>01 / Tipografia</strong>' not in composition
for field in ("labFormat","labMargin","labTitleScale","labType","labBackground","labMContent",
              "labMarker","labMScale","labFocalPreview","labSymbol"):
 assert field+':["' in lab_js,f"Missing contextual help for {field}"
assert "showHelp(trigger,panel)" in lab_js
assert "trigger.dataset.labHelp=id" in lab_js and 'aria-expanded' in lab_js, "Help triggers must expose contextual targets and accessible state"
assert ".lm-help-popover[hidden]" in controls
assert ".lm-lab>.lm-lab-legend" in controls
assert "labHelp-overview" in lab_js

assert "const inlineEditors=" in lab_js
assert "rgba(0,0,0,.20)" in (Path("public")/"composicao-lab.css").read_text(encoding="utf-8")

assert 'id="labPlacement"' in composition
assert 'id="labMPosition"' in composition
assert 'id="labMarker"' in composition
assert "M central" in composition and "Marcadores" in composition
assert "lm-marker-grid" in composition
for key in ("title","body","kicker","footerLeft","footerRight"):
 assert 'data-lab-inline="'+key+'"' in composition,f"Missing editable text layer: {key}"
assert 'contenteditable="plaintext-only"' in composition
assert "const inlineEditors=" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert "renderTitleLines()" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert "lm-lab-inline-edit" in controls, "Direct-edit focus styles missing"

# One illustrated action for each state; duplicated controls undermine clarity.
assert "data-choice-for=" not in composition
for key,count in (("format",4),("marker",4),("background",2),("mContent",3)):
 assert composition.count('data-lab-choice="'+key+'"')==count,f"Duplicate UI in {key}"
for kind in ("margin","width","title"):
 assert 'data-control-effect="'+kind+'"' in composition,f"Missing scale diagram: {kind}"
assert 'id="labMScale"' in composition, "M scale control missing"
assert 'id="labFocalPreview"' in composition
assert "const illustrated=" not in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")


lab_css=(Path("public")/"composicao-lab.css").read_text(encoding="utf-8")
lab_js=(Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
for selector in ('lm-lab-workspace','lm-lab-m-photo','lm-lab-main-copy','lm-lab-photo-contrast'):
 assert selector in lab_css,f"Missing lab element: {selector}"
for action in ('labFormat','labMarker','labMScale','labFocusX','labTitleScale','labTitleInput','labBodyInput','labReset'):
 assert action in composition and action in lab_js,f"Unwired lab control: {action}"
assert 'id="labBackground"' in composition and 'id="labMContent"' in composition
assert "UMA COMPOSIÇÃO" in composition
assert "lm-composition-module-index" in composition
assert "data-lab-preset" not in composition, "Presets must not define composition types"
assert "lm-inspector-tabs" not in composition, "Contextual tabs must not divide the single composition"
assert "rgba(0,0,0,.20)" in lab_css, "Photo contrast must remain at 20 percent"
assert "labContrast" not in composition, "Approved veil opacity must not be an uncontrolled experiment"

print("LABMATTAR system foundations validated")

assert Path('public/identidade.html').exists()
