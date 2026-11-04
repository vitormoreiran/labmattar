import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import {Buffer} from 'buffer';
function color(value){
  if(value.startsWith('#'))return value;
  const numbers=value.match(/[\d.]+/g);
  if(!numbers||numbers.length<3)throw Error('Cor inválida no documento.');
  return numbers.slice(0,3).map(Number);
}
function path(doc,vector){
  const [x,y,w,h]=vector.viewBox,b=vector.box;
  doc.transform(b.w/w,0,0,b.h/h,b.x-x*b.w/w,b.y-y*b.h/h);
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
    else if(op.kind==='image')doc.image(op.source,op.x,op.y,{width:op.w,height:op.h});
    else if(op.kind==='vector'){doc.fillColor(color(op.color));path(doc,op);doc.fill(op.rule==='evenodd'?'even-odd':'non-zero');}
    else if(op.kind==='text')doc.font(op.family).fontSize(op.size).fillColor(color(op.color)).text(op.text,op.x,op.y,{baseline:'alphabetic',lineBreak:false,characterSpacing:op.spacing});
    else if(op.kind==='group'){
      const [x,y,w,h]=op.clip.viewBox,b=op.clip.box;
      path(doc,op.clip);doc.clip(op.clip.rule==='evenodd'?'even-odd':'non-zero');
      // Restore the page coordinate system while keeping the vector clip.
      const sx=b.w/w,sy=b.h/h;doc.transform(1/sx,0,0,1/sy,x-b.x/sx,y-b.y/sy);
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
