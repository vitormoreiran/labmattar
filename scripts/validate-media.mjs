import {readFileSync} from 'node:fs';
const file=JSON.parse(readFileSync(new URL('../content/media.json',import.meta.url),'utf8'));
if(file.schemaVersion!==1||!Array.isArray(file.items))throw Error('Formato do catálogo inválido');
const ids=new Set();
for(const item of file.items){
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Item inválido');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id??''))throw Error('ID inválido');
  if(ids.has(item.id))throw Error('ID duplicado: '+item.id);
  ids.add(item.id);
  if(typeof item.title!=='string'||!item.title.trim())throw Error('Título ausente: '+item.id);
  if(!['video','image','document'].includes(item.kind))throw Error('Tipo inválido: '+item.id);
  if(!['draft','published'].includes(item.status))throw Error('Estado inválido: '+item.id);
  if(typeof item.source!=='string')throw Error('Origem inválida: '+item.id);
  if(item.status==='published'&&!/^https:\/\//i.test(item.source))throw Error('URL HTTPS obrigatória: '+item.id);
  if(item.source&& !/^https:\/\//i.test(item.source))throw Error('Não publicar caminhos locais: '+item.id);
}
console.log('Catálogo LABMATTAR validado:',file.items.length,'itens');
