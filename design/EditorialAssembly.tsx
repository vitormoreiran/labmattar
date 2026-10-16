"use client";
import { ReactNode, useState } from "react";
import "./editorial.css";

type StateItem={name:string;viewBox:string;contours:string[]};
type Props={
  assets:StateItem[];selected:number;time:number;totalDuration:number;
  playing:boolean;ready:boolean;loop:boolean;
  render:ReactNode;
  go:(index:number)=>void;seek:(time:number)=>void;
  play:()=>void;previous:()=>void;next:()=>void;
  addFiles:(files:FileList|null)=>void;
  move:(index:number,delta:number)=>void;remove:()=>void;
  replace:()=>void;reset:()=>void;save:()=>void;download:()=>void;
  openTechnical:(mode:string)=>void;
};
export default function EditorialAssembly(p:Props){
  const [mode,setMode]=useState<"observar"|"montar">("observar");
  const [expanded,setExpanded]=useState(false);
  const current=p.assets[p.selected];
  return <main className="lm-root" aria-busy={!p.ready}>
    <header className="lm-mast"><a href="/manual.html" className="lm-wordmark">LABMATTAR</a><div className="lm-topright">SISTEMA VETORIAL<span>IDENTIDADE / 2026</span></div></header>
    <div className="lm-rule"/>
    <div className="lm-chapter"><span>03 / A FORMA EM TRANSFORMAÇÃO</span><nav className="lm-modebar" aria-label="Modos de trabalho">
      <button className={mode==="observar"?"active":""} onClick={()=>{setMode("observar");setExpanded(false)}}>Observar</button>
      <button className={mode==="montar"?"active":""} onClick={()=>{setMode("montar");setExpanded(true)}}>Montar</button>
      <button onClick={()=>p.openTechnical("Correspondência")}>Correspondência ↗</button>
      <button onClick={()=>p.openTechnical("Exportar")}>Exportar ↗</button>
    </nav></div>
    <section className="lm-intro"><h1>MATRIZ<br/><em>VETORIAL</em></h1><aside>Um símbolo master. Nove estados equivalentes. Uma mesma superfície para observar e construir a transformação.</aside></section>
    <section className="lm-stage" aria-label="Visualização do motor vetorial">
      <div className="lm-stage-tools"><button onClick={p.previous}>← Estado</button><button onClick={p.next}>Próximo →</button></div>
      <div className="lm-art">{p.render}</div>
      <div className="lm-index"><span>ESTADO SELECIONADO</span><strong>{current?.name??"CARREGANDO"}</strong></div>
      <div className="lm-counter">{String(p.selected+1).padStart(2,"0")} / {String(p.assets.length).padStart(2,"0")}</div>
    </section>
    <div className="lm-transport"><button className="lm-play" disabled={!p.ready} onClick={p.play}><span>{p.playing?"Ⅱ":"▶"}</span>{p.playing?"PAUSAR":"REPRODUZIR"}</button>
      <label className="lm-track"><span className="lm-sr">Posição na sequência</span><input type="range" min="0" max={Math.max(.1,p.totalDuration)} step=".001" value={p.time} onChange={e=>p.seek(Number(e.target.value))}/></label>
      <output className="lm-time">{p.time.toFixed(1)} / {p.totalDuration.toFixed(1)}s</output></div>
    <nav className="lm-states" aria-label="Estados vetoriais">
      {p.assets.map((asset,i)=><button key={i} className={"lm-state "+(p.selected===i?"active":"")} onClick={()=>p.go(i)} aria-pressed={p.selected===i}>
        <span className="lm-num">{String(i+1).padStart(2,"0")}</span>
        <svg viewBox={asset.viewBox} role="img" aria-label={asset.name} preserveAspectRatio="xMidYMid meet"><path d={asset.contours.join(" ")} fill="currentColor" fillRule="evenodd"/></svg>
        <span className="lm-state-name">{asset.name}</span>
      </button>)}
    </nav>
    <div className="lm-bottom"><p>Os estados formam uma sequência editável. A geometria, as correspondências e o movimento pertencem ao motor original da Matriz Vetorial.</p>
      <button onClick={()=>{setMode("montar");setExpanded(v=>!v)}}>{expanded?"FECHAR MONTAGEM ↑":"ABRIR MONTAGEM ↓"}</button></div>
    {expanded&&<section className="lm-panel" aria-label="Montagem de estados">
      <div><span className="lm-kicker">01 / MONTAGEM</span><h2>Organização dos estados</h2><p>{p.assets.length} estados · seleção atual {String(p.selected+1).padStart(2,"0")}</p></div>
      <div className="lm-panel-body"><p>Importe desenhos vetoriais e reorganize a sequência. As ações modificam diretamente o projeto original; duração, easing e exportações são mantidos no editor técnico.</p>
        <div className="lm-actions">
          <label className="lm-chip lm-upload">＋ Importar SVG<input hidden type="file" accept=".svg,image/svg+xml" multiple onChange={e=>{p.addFiles(e.target.files);e.target.value=""}}/></label>
          <button className="lm-chip" onClick={p.replace}>Substituir seleção</button>
          <button className="lm-chip" onClick={()=>p.move(p.selected,-1)} disabled={p.selected===0}>← Anterior</button>
          <button className="lm-chip" onClick={()=>p.move(p.selected,1)} disabled={p.selected===p.assets.length-1}>Próximo →</button>
          <button className="lm-chip" onClick={p.remove} disabled={p.assets.length<=2}>Excluir estado</button>
          <button className="lm-chip" onClick={p.reset}>Carregar M + 9 vasos</button>
          <button className="lm-chip" onClick={p.save}>Salvar</button>
          <button className="lm-chip" onClick={p.download}>Baixar projeto v72</button>
        </div>
      </div>
    </section>}
    <footer className="lm-footer"><span>LABMATTAR / ELEMENTOS GRÁFICOS</span><button onClick={()=>p.openTechnical("Composição")}>EDIÇÃO TÉCNICA COMPLETA ↗</button></footer>
  </main>;
}
