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
assert 'href="/composicao-lab-controls.css"' in composition, "Illustrated control stylesheet missing"
assert 'href="/composicao-studio.css"' in composition, "Viewport studio stylesheet missing"
assert 'href="/composicao-editor-clean.css"' in composition, "Focused editor treatment missing"
clean_css=(Path("public")/"composicao-editor-clean.css").read_text(encoding="utf-8")
assert "grid-template-columns:minmax(0,1fr) 322px" in clean_css
assert "lm-studio-tool[aria-expanded=true]" in clean_css
assert "lm-studio-image-flat" in clean_css
assert "entry.button.after(layout.detail)" in (Path("public")/"composicao-studio.js").read_text(encoding="utf-8")
assert "lm-studio-detail-body" in clean_css

assert 'src="/composicao-studio.js"' in composition, "Viewport studio behavior missing"
assert 'id="labStudioToggle"' in composition, "Focused editing entry must be visible"
studio_css=(Path("public")/"composicao-studio.css").read_text(encoding="utf-8")
studio_js=(Path("public")/"composicao-studio.js").read_text(encoding="utf-8")
for key in ("lm-studio-tools","lm-studio-detail","lm-studio-open","data-format"):
 assert key in studio_css or key in studio_js,f"Studio integration missing: {key}"
for key in ("fitBoard()","openTool(entry)","startStudio()","stopStudio()","labStudioToggle"):
 assert key in studio_js,f"Studio control not connected: {key}"
assert 'grid-template-columns:repeat(3,minmax(0,1fr))' in studio_css
assert "innerDimensions(stage)" in studio_js
assert "m-publicado.svg" in (Path("public")/"composicao-lab.css").read_text(encoding="utf-8")
assert 'id="regras-de-composicao"' in composition, "Composition rules section missing"
for rule in ("Régua","Margem","Eixo","Alinhamento","Espaçamento","Adaptação"):
 assert rule in composition,f"Missing composition rule: {rule}"
assert 'data-lab-choice="mMode"' not in composition, "Invented M usage modes must not be exposed"
assert "mountFlatImage()" in studio_js and "restoreFlatImage()" in studio_js
# The inspector is spatially continuous: a property expands under the full
# tool index rather than replacing or covering the original menu.
assert "layout.menu.hidden=true" not in studio_js
assert "layout.detail.hidden=false" in studio_js
assert 'entry.button.setAttribute("aria-expanded","true")' in studio_js
assert "EXPANSION BELOW THE PALETTE" in studio_css
assert "position:relative;" in studio_css
assert "lm-studio-image-flat" in studio_css, "The existing flat M inspector must remain intact"
assert "lm-studio-image-flat" in studio_css, "Image controls still use nested studio folders"
assert "state.mMode" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert ".20" in (Path("public")/"composicao-lab.css").read_text(encoding="utf-8"), "Fixed 20% must be preserved"


controls=(Path("public")/"composicao-lab-controls.css").read_text(encoding="utf-8")
for sample in ("lm-ctrl-choice","lm-ctrl-mini-sheet","lm-ctrl-mini-image","lm-ctrl-mini-type","lm-ctrl-mini-photo","lm-m-position-grid"):
 assert sample in controls and sample in composition,f"Missing illustrated control: {sample}"
for key in ("format","placement","relation","type","image","photo","mPosition","bodyMode"):
 assert 'data-lab-choice="'+key+'"' in composition,f"Missing visual control group: {key}"
assert "fitTitleToReadingArea" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
# The inspector has three focused work areas; every approved control remains.
for key in ("pagina","texto","imagem"):
 assert 'data-lab-tab="'+key+'"' in composition,f"Missing navigation: {key}"
 assert 'data-lab-panel="'+key+'"' in composition,f"Missing panel: {key}"
 assert 'data-lab-more="'+key+'"' in composition,f"Advanced options not discoverable: {key}"
for control in ("labFormat","labColor","labMargin","labGuides",
                "labPlacement","labType","labTitleScale","labTextWidth","labBodyMode",
                "labTitleInput","labBodyInput","labImage","labMMode","labPhoto","labRelation",
                "labMPosition","labMScale","labFocalPreview","labFocusX","labFocusY","labSymbol"):
 assert composition.count('id="'+control+'"')==1,f"Missing or duplicate composition field: {control}"
lab_js=(Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert "labPrecision-" in lab_js and "number.type=\"number\"" in lab_js
assert "setFieldVisible" in lab_js and "sessionStorage" in lab_js
# Guidance is contextual; no instructions or numbered pseudo-steps clutter the UI.
assert 'id="labOverviewHelp"' in composition
assert '<strong>01 / Tipografia</strong>' not in composition
for field in ("labFormat","labMargin","labPlacement","labTitleScale","labType","labImage",
              "labRelation","labMPosition","labMScale","labFocalPreview","labSymbol"):
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
assert 'class="lm-m-position-grid"' in composition
for key in ("title","body","kicker","footerLeft","footerRight"):
 assert 'data-lab-inline="'+key+'"' in composition,f"Missing editable text layer: {key}"
assert 'contenteditable="plaintext-only"' in composition
assert "const inlineEditors=" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert "renderTitleLines()" in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
assert "lm-lab-inline-edit" in controls, "Direct-edit focus styles missing"

# One illustrated action for each state; duplicated controls undermine clarity.
assert "data-choice-for=" not in composition
for key,count in (("format",4),("image",3)):
 assert composition.count('data-lab-choice="'+key+'"')==count,f"Duplicate UI in {key}"
for kind in ("margin","width","title","mask"):
 assert 'data-control-effect="'+kind+'"' in composition,f"Missing scale diagram: {kind}"
assert 'id="labFocalPreview"' in composition
assert "const illustrated=" not in (Path("public")/"composicao-lab.js").read_text(encoding="utf-8")


lab_css=(Path("public")/"composicao-lab.css").read_text(encoding="utf-8")
lab_js=(Path("public")/"composicao-lab.js").read_text(encoding="utf-8")
for selector in ('lm-lab-workspace','lm-lab-m-photo','lm-lab-main-copy','lm-lab-photo-contrast'):
 assert selector in lab_css,f"Missing lab element: {selector}"
for action in ('labFormat','labPlacement','labMPosition','labFocusX','labTitleScale','labTitleInput','labBodyInput','labReset'):
 assert action in composition and action in lab_js,f"Unwired lab control: {action}"
for variant in ('tipografia','mascara','imagem'):
 assert 'data-lab-preset="'+variant+'"' in composition
 assert variant+':' in lab_js
assert "rgba(0,0,0,.20)" in lab_css, "Photo contrast must remain at 20 percent"
assert "labContrast" not in composition, "Approved veil opacity must not be an uncontrolled experiment"

print("LABMATTAR system foundations validated")

assert Path('public/identidade.html').exists()
