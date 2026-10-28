const CHUNK=8*1024*1024;
export function storage(env){
 const head=key=>env.DB.prepare('SELECT * FROM objects WHERE key=?').bind(key).first();
 return {head,async put(key,input,metadata={}){
  const bytes=typeof input==='string'?new TextEncoder().encode(input):new Uint8Array(input);
  const prefix='upload/'+crypto.randomUUID(),chunks=[];
  for(let i=0;i<bytes.length;i+=CHUNK){const name=prefix+'/'+chunks.length;await env.MEDIA.put(name,bytes.slice(i,i+CHUNK).buffer);chunks.push(name);}
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare('INSERT OR REPLACE INTO objects (key,size,mime,chunks,sha256) VALUES (?,?,?,?,?)').bind(key,bytes.length,metadata.httpMetadata?.contentType||'application/octet-stream',JSON.stringify(chunks),hash).run();
 },async get(key,options={}){
  const row=await head(key);if(!row)return null;const chunks=JSON.parse(row.chunks);
  let start=0,end=row.size-1,range;
  const raw=options.range?.get('range');
  if(raw){const m=/^bytes=(\d*)-(\d*)$/.exec(raw);if(!m||(!m[1]&&!m[2]))throw Object.assign(Error('Intervalo inválido.'),{status:416});
   if(!m[1])start=Math.max(0,row.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
   if(start>end||start>=row.size)throw Object.assign(Error('Intervalo inválido.'),{status:416});range={offset:start,length:end-start+1};
  }
  let position=start;
  const body=new ReadableStream({async pull(controller){try{
   if(position>end){controller.close();return;}
   const index=Math.floor(position/CHUNK),data=await env.MEDIA.get(chunks[index],{type:'arrayBuffer'});
   if(!data)throw Error('Arquivo ainda sendo disponibilizado. Recarregue em instantes.');
   const offset=position%CHUNK,length=Math.min(data.byteLength-offset,end-position+1);if(length<=0)throw Error('Arquivo incompleto.');
   controller.enqueue(new Uint8Array(data,offset,length));position+=length;
  }catch(e){controller.error(e);}}});
  return {body,size:row.size,range,writeHttpMetadata(headers){headers.set('Content-Type',row.mime);}};
 }};
}
