"use client";
import {useEffect,useRef,useState} from "react";
import "./editorial-workspace.css";
type Mode="editorial"|"cover"|"gallery"|"essay";
type Node={id:string;role:"title"|"subtitle"|"body";text:string};
type Page={id:string;name:string;mode:Mode;nodes:Node[];images:string[]};
const uid=()=>Math.random().toString(36).slice(2,10);
const seed=():Page[]=>[{id:"abertura",name:"Abertura",mode:"cover",nodes:[{id:"t1",role:"title",text:"CADA CORPO ABRE UM MUNDO"},{id:"s1",role:"subtitle",text:"GASTROPERFORMANCE"},{id:"b1",role:"body",text:"Uma experiência de encontro entre diferentes formas de sentir e perceber o mundo."}],images:[]},{id:"desenvolvimento",name:"Desenvolvimento",mode:"editorial",nodes:[{id:"t2",role:"title",text:"CORPO, IMAGEM E MEMÓRIA"},{id:"s2",role:"subtitle",text:"01 / INVESTIGAÇÃO SENSÍVEL"},{id:"b2",role:"body",text:"A obra organiza uma investigação sobre os sentidos. A composição articula texto, matéria, imagens e gestos em uma narrativa que se transforma ao longo da experiência."}],images:[]}];
const samples:Record<Mode,string>={cover:"Abertura",editorial:"Texto + imagem",gallery:"Galeria",essay:"Leitura"};
const newPage=():Page=>({id:uid(),name:"Nova página",mode:"editorial",nodes:[{id:uid(),role:"title",text:"NOVO TÍTULO"},{id:uid(),role:"subtitle",text:"SUBTÍTULO"},{id:uid(),role:"body",text:"Escreva aqui o conteúdo da página."}],images:[]});
export default function AmbienteEditorial(){
 const [pages,setPages]=useState<Page[]>(seed);
 const [active,setActive]=useState("abertura");
 const [side,setSide]=useState<"pages"|"library"|"models">("pages");
 const [selection,setSelection]=useState<string>("page");
 const [mobile,setMobile]=useState(false);
 const [preview,setPreview]=useState(false);
 const [status,setStatus]=useState("RASCUNHO LOCAL");
 const [docTitle,setDocTitle]=useState("Cada corpo abre um mundo");
 const [imageUrl,setImageUrl]=useState("");
 const file=useRef<HTMLInputElement>(null);
 const page=pages.find(p=>p.id===active)||pages[0];
 const selected=page.nodes.find(n=>n.id===selection);
 useEffect(()=>{try{const raw=localStorage.getItem("labmattar-editorial-v1");if(raw){const saved=JSON.parse(raw);if(Array.isArray(saved.pages)&&saved.pages.length){setPages(saved.pages);setActive(saved.pages[0].id);setDocTitle(saved.title||"Apresentação");}}}catch{}},[]);
 useEffect(()=>{const t=window.setTimeout(()=>{try{localStorage.setItem("labmattar-editorial-v1",JSON.stringify({title:docTitle,pages}));setStatus("SALVO NESTE NAVEGADOR")}catch{setStatus("ARMAZENAMENTO INDISPONÍVEL")}},450);return()=>clearTimeout(t)},[pages,docTitle]);
 const mutate=(f:(p:Page)=>Page)=>setPages(all=>all.map(p=>p.id===active?f(p):p));
 const edit=(id:string,text:string)=>mutate(p=>({...p,nodes:p.nodes.map(n=>n.id===id?{...n,text}:n)}));
 const changeMode=(mode:Mode)=>mutate(p=>({...p,mode}));
 const addImage=(url:string)=>{if(!url.trim())return;mutate(p=>({...p,images:[...p.images,url.trim()]}));setImageUrl("");setSide("library")};
 const upload=(f?:File)=>{if(!f)return;if(f.size>1500000){alert("Para o rascunho local, escolha uma imagem de até 1,5 MB.");return}const reader=new FileReader();reader.onload=()=>addImage(String(reader.result||""));reader.readAsDataURL(f)};
 const add=()=>{const p=newPage();setPages(a=>[...a,p]);setActive(p.id);setSelection("page");setSide("pages")};
 const reorder=(delta:number)=>{setPages(old=>{const i=old.findIndex(x=>x.id===active),j=i+delta;if(j<0||j>=old.length)return old;const a=[...old];[a[i],a[j]]=[a[j],a[i]];return a})};
 const exportJson=()=>{const b=new Blob([JSON.stringify({schemaVersion:1,title:docTitle,pages},null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="labmattar-apresentacao.json";a.click();URL.revokeObjectURL(u)};
 const enter=(e:React.KeyboardEvent<HTMLElement>)=>{if(e.key==="Escape"){(e.currentTarget as HTMLElement).blur();setSelection("page")}};
 return <main className={"ed-root"+(preview?" is-preview":"")}>
  <header className="ed-head"><a className="ed-brand" href="/manual.html">LABMATTAR</a><span className="ed-head-divider"/><div className="ed-document"><input aria-label="Nome da apresentação" value={docTitle} onChange={e=>setDocTitle(e.target.value)}/><small>{status}</small></div><div className="ed-head-actions"><button onClick={()=>setMobile(m=>!m)}>{mobile?"DESKTOP":"MOBILE"}</button><button onClick={()=>setPreview(v=>!v)}>{preview?"EDITAR":"VISUALIZAR"}</button><button onClick={exportJson}>EXPORTAR JSON ↗</button></div></header>
  <div className="ed-main">
   <aside className="ed-side"><div className="ed-side-nav">{(["pages","library","models"] as const).map(k=><button key={k} className={side===k?"current":""} onClick={()=>setSide(k)}>{k==="pages"?"PÁGINAS":k==="library"?"ACERVO":"MODELOS"}</button>)}</div>
    {side==="pages"&&<div className="ed-side-content"><div className="ed-section-heading"><span>SEQUÊNCIA / {String(pages.length).padStart(2,"0")}</span><button onClick={add}>+ NOVA</button></div>{pages.map((p,i)=><button key={p.id} className={"ed-page-item"+(p.id===active?" active":"")} onClick={()=>{setActive(p.id);setSelection("page")}}><span className="ed-page-num">{String(i+1).padStart(2,"0")}</span><span>{p.name}<small>{samples[p.mode]}</small></span><span className="ed-page-arrow">↗</span></button>)}<div className="ed-side-help">Arraste sua narrativa pela sequência. Selecione uma página para editar o conteúdo.</div></div>}
    {side==="library"&&<div className="ed-side-content"><div className="ed-section-heading"><span>IMAGENS</span></div><p className="ed-small">Insira imagens na composição. O original é preservado na página.</p><input ref={file} hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/><button className="ed-solid" onClick={()=>file.current?.click()}>+ ADICIONAR IMAGEM</button><label className="ed-label" htmlFor="ed-imageurl">OU INSERIR URL DA IMAGEM</label><input id="ed-imageurl" className="ed-input" placeholder="https://..." value={imageUrl} onChange={e=>setImageUrl(e.target.value)}/><button className="ed-linkbtn" onClick={()=>addImage(imageUrl)}>INSERIR ↗</button><div className="ed-media-list">{page.images.map((img,i)=><div className="ed-media" key={i}><img src={img} alt={`Imagem ${i+1}`}/><button aria-label="Remover imagem" onClick={()=>mutate(p=>({...p,images:p.images.filter((_,j)=>j!==i)}))}>×</button></div>)}</div><p className="ed-small">Esta versão salva imagens pequenas apenas no navegador. A conexão com o acervo institucional virá na integração.</p></div>}
    {side==="models"&&<div className="ed-side-content"><div className="ed-section-heading"><span>COMPOSIÇÕES</span></div>{(Object.keys(samples) as Mode[]).map(k=><button key={k} onClick={()=>changeMode(k)} className={"ed-model"+(page.mode===k?" active":"")}><div className={"ed-model-diagram "+k}><i/><i/><i/></div><span>{samples[k]}</span><span>{page.mode===k?"●":"↗"}</span></button>)}<p className="ed-small">Os modelos reorganizam o mesmo conteúdo e preservam os textos e imagens.</p></div>}
   </aside>
   <section className="ed-stage"><div className="ed-stage-bar"><span>COMPOSIÇÃO / {String(pages.indexOf(page)+1).padStart(2,"0")}</span><span>{mobile?"VISUALIZAÇÃO VERTICAL":"VISUALIZAÇÃO HORIZONTAL"} · {samples[page.mode]}</span></div>
    <div className={"ed-sheet-wrap"+(mobile?" mobile":"")}>
     <article className={"ed-sheet mode-"+page.mode} aria-label="Página editável" onClick={()=>setSelection("page")}>
      <div className="ed-sheet-top"><span>LABMATTAR</span><span>{String(pages.indexOf(page)+1).padStart(2,"0")} / {String(pages.length).padStart(2,"0")}</span></div>
      <div className="ed-sheet-content">
       <div className="ed-texts">{page.nodes.map(n=><div key={n.id} className={"ed-text-node role-"+n.role+(selection===n.id?" selected":"")} contentEditable={!preview} suppressContentEditableWarning spellCheck onBlur={e=>edit(n.id,e.currentTarget.innerText)} onClick={e=>{e.stopPropagation();setSelection(n.id)}} onKeyDown={enter} role="textbox" aria-label={n.role==="title"?"Título":n.role==="subtitle"?"Subtítulo":"Corpo"}>{n.text}</div>)}</div>
       {page.mode!=="essay"&&<div className={"ed-image-field"+(!page.images.length?" empty":"")}>{page.images.length?page.images.map((src,i)=><img key={i} src={src} alt={`Imagem da composição ${i+1}`}/>):<div className="ed-image-empty"><span>IMAGEM</span><button onClick={e=>{e.stopPropagation();setSide("library")}}>+ INSERIR DO ACERVO</button></div>}</div>}
      </div>
      <div className="ed-sheet-bottom"><span>LABMATTAR / IDENTIDADE VISUAL</span><span>2026</span></div>
     </article>
    </div>
    <div className="ed-stage-bottom"><button onClick={()=>reorder(-1)} disabled={pages[0].id===active}>← ANTERIOR</button><span>EDIÇÃO DIRETA / TEXTO E COMPOSIÇÃO</span><button onClick={()=>reorder(1)} disabled={pages.at(-1)?.id===active}>PRÓXIMA →</button></div>
   </section>
   <aside className="ed-inspector"><div className="ed-section-heading">PROPRIEDADES <span>↗</span></div>{selected?<div className="ed-prop"><p>ELEMENTO / {selected.role.toUpperCase()}</p><label>FUNÇÃO EDITORIAL</label><strong>{selected.role==="title"?"TÍTULO":selected.role==="subtitle"?"SUBTÍTULO":"CORPO"}</strong><label>CONTEÚDO</label><textarea value={selected.text} onChange={e=>edit(selected.id,e.target.value)} rows={selected.role==="body"?8:4}/><div className="ed-prop-note">A tipografia e o alinhamento seguem a identidade LABMATTAR. Clique no texto para editar diretamente na página.</div></div>:<div className="ed-prop"><p>SUPERFÍCIE / {page.name.toUpperCase()}</p><label>NOME DA PÁGINA</label><input value={page.name} onChange={e=>mutate(p=>({...p,name:e.target.value}))}/><label>ESTRUTURA</label><select value={page.mode} onChange={e=>changeMode(e.target.value as Mode)}>{(Object.keys(samples) as Mode[]).map(k=><option key={k} value={k}>{samples[k]}</option>)}</select><label>ORGANIZAÇÃO</label><div className="ed-prop-buttons"><button onClick={()=>{const copy={...page,id:uid(),name:page.name+" — cópia",nodes:page.nodes.map(n=>({...n,id:uid()}))};setPages(x=>[...x.slice(0,x.indexOf(page)+1),copy,...x.slice(x.indexOf(page)+1)]);setActive(copy.id)}}>DUPLICAR</button><button disabled={pages.length===1} onClick={()=>{if(!window.confirm("Excluir esta página?"))return;setPages(x=>x.filter(p=>p.id!==active));setActive(pages.find(p=>p.id!==active)?.id||"")}}>EXCLUIR</button></div><div className="ed-prop-note">O conteúdo pertence à página. Trocar o modelo não apaga títulos, textos ou imagens.</div></div>}</aside>
  </div>
 </main>
}