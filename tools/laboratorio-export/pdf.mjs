import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import {Buffer} from 'buffer';
import {fitBox,vectorTransform} from '../../public/lab-geometry.mjs';
function color(value){
  if(value.startsWith('#'))return value;
  const numbers=value.match(/[\d.]+/g);
  if(!numbers||numbers.length<3)throw Error('Cor inválida no documento.');
  return numbers.slice(0,3).map(Number);
}
function path(doc,vector){
  const {scale,x,y}=vectorTransform(vector);
  doc.transform(scale,0,0,scale,x,y);
  for(const item of vector.paths)doc.path(item.d);
}
export async function createPDF(scenes,fonts){
  const doc=new PDFDocument({autoFirstPage:false,margin:0,font:null,compress:true,
    info:{Title:'LABMATTAR / '+(scenes[0]?.documentName||'Apresentação'),Creator:'LABMATTAR / Laboratório'}});
  const chunks=[];
  const output=new Promise((resolve,reject)=>{
    doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(new Blob(chunks,{type:'application/pdf'})));doc.on('error',reject);
  });
  doc.registerFont('UniversMattar',Buffer.from(fonts.UniversMattar));
  doc.registerFont('PerpetuaMattar',Buffer.from(fonts.PerpetuaMattar));
  function draw(ops){for(const op of ops){
    doc.save();
    if(op.kind==='rect')doc.fillColor(color(op.color)).rect(op.x,op.y,op.w,op.h).fill();
    else if(op.kind==='image'){
      const image=doc.openImage(op.source),box=fitBox(image.width,image.height,op,{fit:op.fit||'contain'});
      doc.rect(op.x,op.y,op.w,op.h).clip();
      doc.image(image,box.x,box.y,{width:box.w,height:box.h});
    }
    else if(op.kind==='vector'){doc.fillColor(color(op.color));path(doc,op);doc.fill(op.rule==='evenodd'?'even-odd':'non-zero');}
    else if(op.kind==='text')doc.font(op.family).fontSize(op.size).fillColor(color(op.color)).text(op.text,op.x,op.y,{baseline:'alphabetic',lineBreak:false,characterSpacing:op.spacing});
    else if(op.kind==='group'){
      const {scale,x,y}=vectorTransform(op.clip);
      path(doc,op.clip);doc.clip(op.clip.rule==='evenodd'?'even-odd':'non-zero');
      // Restore the page coordinate system while keeping the vector clip.
      doc.transform(1/scale,0,0,1/scale,-x/scale,-y/scale);
      draw(op.items);
    }else throw Error('Elemento PDF não reconhecido.');
    doc.restore();
  }}
  try{
    for(const scene of scenes){
      doc.addPage({size:[scene.width*.75,scene.height*.75],margin:0});
      doc.save().scale(.75).rect(0,0,scene.width,scene.height).clip();draw(scene.items);doc.restore();
    }
    doc.end();return await output;
  }catch(error){doc.end();throw error;}
}
