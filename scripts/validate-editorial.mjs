import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {Script} from "node:vm";

const base="public/ambiente-editorial/";
const html=readFileSync(base+"index.html","utf8");
const js=readFileSync(base+"editorial-v2.js","utf8");
const css=readFileSync(base+"editorial-v2.css","utf8");

new Script(js,{filename:"editorial-v2.js"});
assert.match(html,/editorial-v2\.js/);
assert.match(html,/editorial-v2\.css/);
assert.match(html,/editorial-composition\.css/);
assert.match(html,/editorial-interface\.css/);
const interfaceCss=readFileSync(base+"editorial-interface.css","utf8");
assert.match(interfaceCss,/\.editor-header/);
assert.match(interfaceCss,/\.page-thumb/);
assert.match(interfaceCss,/\.editor-inspector/);
assert.doesNotMatch(interfaceCss,/\.artboard\b/,"UI stylesheet must not override the editorial composition");
for(const id of ["togglePagesButton","toggleInspectorButton","fileActions","mediaPreviewImage","inspectorPageName"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing editor UI control: "+id);
}
assert.match(js,/dragstart/);
assert.match(js,/panelStateKey/);
assert.match(html,/class="ui-icon-sprite"/);
for(const icon of ["undo","redo","panel-left","panel-right","smartphone","monitor","eye","pencil","folder","chevron-down","files","images","plus","arrow-up","arrow-down","file-text","layers","image","grip","copy","trash"]){
  assert.ok(html.includes('id="ui-'+icon+'"'),"Missing icon symbol: "+icon);
}
for(const id of ["viewportLabel","previewLabel","viewportIconUse","previewIconUse"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing state-safe icon label: "+id);
}
assert.match(js,/\$\("viewportLabel"\)\.textContent/);
assert.match(js,/\$\("previewLabel"\)\.textContent/);
assert.doesNotMatch(js,/\$\("viewportButton"\)\.textContent=/);
assert.doesNotMatch(js,/\$\("previewButton"\)\.textContent=/);
assert.match(interfaceCss,/\.ui-icon\{/);
assert.match(interfaceCss,/--ui-type:LMUnivers,Arial,sans-serif/);
assert.match(interfaceCss,/font-synthesis:none/);
assert.match(interfaceCss,/--ui-ink:#181818/);
assert.match(interfaceCss,/--ui-paper:#f7f6f2/);
assert.doesNotMatch(interfaceCss,/system-ui|-apple-system|Segoe UI/,"Interface must use official Univers, not system fonts");
assert.doesNotMatch(interfaceCss,/font-weight:\s*(?:500|600|700)|font:\s*(?:500|600|700)\b/,"Light typography may not be synthesized as bold");
const uiColors=[...interfaceCss.matchAll(/#([0-9a-fA-F]{6})\b/g)].map(m=>m[1]);
for(const hex of uiColors){
  const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
  assert.ok(Math.max(...rgb)-Math.min(...rgb)<=8,"Non-neutral color in editor chrome: #"+hex);
}



assert.match(html,/class="editorial-stack"/);
const composition=readFileSync(base+"editorial-composition.css","utf8");
assert.match(composition,/\.editorial-content\{/);
assert.match(composition,/\.editorial-stack\{/);
assert.match(composition,/\.masked-photo\{/);
assert.match(composition,/m-publicado\.svg/);
assert.match(composition,/--lm-image-contrast-alpha:\.20/);
assert.match(composition,/\[data-contrast-m="true"\] \.masked-photo::after/);
assert.match(composition,/\[data-contrast-background="true"\] \.media-scene::before/);
assert.match(js,/function updateImageContrast\(/);
assert.match(composition,/data-layout="narrow"/);
assert.doesNotMatch(css,/\.content-title\{top:/);
assert.doesNotMatch(composition,/\.content-title\{top:/);

for(const id of ["editor","artboard","pagesList","assetsList","contentFields","pageProfile","mediaTreatment","mediaAssetSelect","focusX","focusY","undoButton","redoButton","viewportButton","previewButton","exportButton","importButton","recoverLegacyButton"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing editor control: "+id);
}
for(const name of ["opening","project","development","gallery","text","closing","credits"]){
  assert.match(html,new RegExp('value="'+name+'"'),"Missing editorial profile "+name);
}
for(const name of ["m-central","m-detalhe","fundo-com-blur","imagem-livre","sem-imagem"]){
  assert.match(html,new RegExp('value="'+name+'"'),"Missing independent media treatment "+name);
}
for(const name of ["title","subtitle","body","caption","credits"]){
  assert.ok(html.includes('data-content-slot="'+name+'"'),"Missing content slot "+name);
}
for(const name of ["BOXDOSENTIR-64.jpg","BOXDOSENTIR-179.jpg","BOXDOSENTIR-151.jpg","m-publicado.svg"]){
  assert.ok(existsSync(base+"media/"+name),"Missing Cada Corpo asset "+name);
}
assert.match(js,/labmattar-editorial-v2/);
assert.match(js,/labmattar-editorial-v1/);
assert.match(js,/function (checkpoint|undo|render|save)\(/);
assert.doesNotMatch(html,/titleFamily|fontPicker|marginSlider/);
assert.match(composition,/\.artboard\[data-profile="gallery"\]/);
assert.match(css,/@media\(max-width:650px\)/);
console.log("PASS: editor v2, 7 perfis, 5 tratamentos, conteudo, acervo, fontes e modelo verificados.");
