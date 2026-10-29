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
assert.match(html,/class="editorial-stack"/);
const composition=readFileSync(base+"editorial-composition.css","utf8");
assert.match(composition,/\.editorial-content\{/);
assert.match(composition,/\.editorial-stack\{/);
assert.match(composition,/\.masked-photo\{/);
assert.match(composition,/m-publicado\.svg/);
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
assert.match(css,/\.artboard\[data-profile="gallery"\]/);
assert.match(css,/@media\(max-width:650px\)/);
console.log("PASS: editor v2, 7 perfis, 5 tratamentos, conteudo, acervo, fontes e modelo verificados.");
