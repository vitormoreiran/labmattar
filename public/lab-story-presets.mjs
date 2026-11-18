// Published examples are same-origin project documents, never arbitrary URLs.
export const STORY_PRESETS=Object.freeze([
 {id:'aleteia',name:'Aleteia',sha256:'ebc81211616b1df73c4170ebedfe0a01acf38969d6e2645ce2c9c174f0e63912'},
 {id:'poiesis',name:'Poiésis',sha256:'fd549efa343664b6812eb11f0a14205bde9bfeb27811318d5fdc3847a714b6a1'},
 {id:'cada-corpo-abre-um-mundo',name:'Cada Corpo Abre um Mundo',sha256:'88f43bef17ededb377290d0a7648ba046f723bbb14c0d8d3c4cf40896e756631'}
].map(Object.freeze));
export async function loadStoryPreset(id,{fetcher=fetch}={}){
 const preset=STORY_PRESETS.find(item=>item.id===id);if(!preset)throw Error('Modelo de apresentação não encontrado.');
 const response=await fetcher('/presentation-models/'+preset.id+'.labmattar.json',{credentials:'same-origin'});
 if(!response.ok)throw Error('Não foi possível abrir o modelo. Tente novamente.');
 const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw Error('O modelo ultrapassa o tamanho previsto.');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(hash!==preset.sha256)throw Error('O modelo não corresponde à versão publicada. Atualize a página e tente novamente.');
 const project=JSON.parse(new TextDecoder().decode(bytes));
 if(project.kind!=='labmattar.presentation'||project.story?.template!=='mattar-apresentacoes-01')throw Error('Modelo de apresentação incompatível.');
 return project;
}
