import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeImageAssets,normalizeGallery,galleryCells,containImage,galleryMarkup} from '../public/lab-gallery-model.mjs';
const asset={id:'image-fixture',name:'Fotografia',uri:'data:image/png;base64,YQ==',width:200,height:100};
const gallery={columns:2,items:[{id:'use-1',assetId:asset.id,caption:'ATO 1: UTOPIA',sourceId:'pdf-936120-image-1'},{id:'use-2',assetId:asset.id,caption:''}]};
test('cada ocorrência é preservada e a fotografia é cadastrada uma vez',()=>{
 const assets=normalizeImageAssets([asset]),result=normalizeGallery(gallery,assets);assert.deepEqual(result,gallery);assert.equal(assets.length,1);assert.equal(result.items.length,2);
 assert.throws(()=>normalizeImageAssets([asset,asset]),/identificador/);assert.throws(()=>normalizeGallery({...gallery,items:[{...gallery.items[0],assetId:'missing'}]},assets),/cadastrada/);
 assert.throws(()=>normalizeImageAssets([{...asset,uri:'https://outside.invalid/photo.jpg'}]),/arquivo/);assert.throws(()=>normalizeGallery({...gallery,columns:6},assets),/colunas/);
});
test('ajustar à célula mantém proporção e conteúdo completos nos quatro formatos',()=>{
 for(const [width,height]of [[1280,720],[720,1280],[900,900],[1000,707]])for(const columns of [1,2,3,5]){
  const images={columns,items:Array.from({length:5},(_,i)=>({...gallery.items[0],id:'use-'+i}))};
  const cells=galleryCells(images,width,height);assert.equal(cells.length,5);
  for(const cell of cells)for(const [w,h]of [[200,100],[100,200],[100,100]]){
   const box=containImage(w,h,cell);assert(Math.abs(box.w/box.h-w/h)<1e-10);assert(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height);
   assert(box.x>=cell.x-1e-6&&box.y>=cell.y-1e-6&&box.x+box.w<=cell.x+cell.w+1e-6&&box.y+box.h<=cell.y+cell.h+1e-6);
  }
 }
});
test('texto não é coberto pela galeria e legendas mantêm sua redação',()=>{
 const text={x:100,y:220,w:500,h:250};for(const cell of galleryCells(gallery,1280,720,{text})){const overlaps=cell.x<text.x+text.w&&cell.x+cell.w>text.x&&cell.y<text.y+text.h&&cell.y+cell.h>text.y;assert(!overlaps);}
 const html=galleryMarkup(gallery,[asset]);assert.equal((html.match(/<figure /g)||[]).length,2);assert(html.includes('ATO 1: UTOPIA'));assert(html.includes('data-source-image="pdf-936120-image-1"'));
});
