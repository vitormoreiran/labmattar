/* LABMATTAR / JSON editável. Preserva composições v1 e delega
 * sequências ao contrato de páginas, sem substituir o editor atual. */
import {createProductionDocument,verifyRoundTrip} from "./composicao-document.mjs";
import {serializeProject,parseProject,checkProjectBytes} from './lab-project-lifecycle.mjs';
const by=id=>document.getElementById(id);
const downloadButton=by("labDownloadDocument");
const importButton=by("labImportDocument");
const fileInput=by("labDocumentFile");
const status=by("labDocumentStatus");
const board=by("labArtboard");
if(downloadButton&&importButton&&fileInput&&status&&board){
  const notify=(message,state="idle")=>{
    status.textContent=message;
    status.dataset.state=state;
  };
  const bridge=()=>window.LabProductionBridge;
  const ready=()=>{
    if(!bridge()||typeof bridge().snapshot!=="function"||typeof bridge().restore!=="function"){
      throw new Error("O editor ainda não terminou de carregar.");
    }
    if(board.dataset.motionPlaying==="true")throw new Error("Conclua a entrada dos textos antes de salvar ou abrir o projeto.");
  };
  downloadButton.addEventListener("click",()=>{
    try{
      ready();
      const {state,photoCatalog}=bridge().snapshot();
      const maxEdge=Number(by("labExportSize")?.value)||3840;
      const single=createProductionDocument({state,photoCatalog,maxEdge});
      const doc=window.LabPages?.hasSequence()?window.LabPages.create():single;
      if(doc.kind===single.kind)verifyRoundTrip(doc,photoCatalog);
      const json=serializeProject(doc);
      const blob=new Blob([json],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;
      link.download=doc.kind==="labmattar.presentation"?"labmattar-apresentacao-v"+doc.schemaVersion+".json":"labmattar-"+state.format+"-composicao-v1.json";
      document.body.append(link);
      link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      notify("Documento JSON salvo. Preserve as fotografias originais separadamente.","success");
    }catch(error){
      notify("NÃO FOI POSSÍVEL SALVAR / "+(error?.message||"Erro desconhecido"),"error");
    }
  });
  importButton.addEventListener("click",()=>fileInput.click());
  fileInput.addEventListener("change",async()=>{
    const file=fileInput.files?.[0];
    if(!file)return;
    try{
      ready();
      checkProjectBytes(file.size);
      const parsed=parseProject(await file.text());
      const {photoCatalog}=bridge().snapshot();
      const sequence=parsed.kind==="labmattar.presentation";
      if(sequence){if(!window.LabPages)throw Error("As páginas ainda estão carregando.");window.LabPages.validate(parsed);}
      else if(window.LabPages)window.LabPages.validateComposition(parsed);
      else verifyRoundTrip(parsed,photoCatalog);
      // Reject incompatible or tampered documents before touching current work.
      if(!confirm("Abrir esta composição? O documento substituirá o rascunho atual do Laboratório, que pode ser salvo como JSON antes.")){
        notify("Importação cancelada. O rascunho atual foi preservado.","idle");
        return;
      }
      if(sequence)await window.LabPages.load(parsed);
      else if(window.LabPages)await window.LabPages.loadComposition(parsed);
      else bridge().restore(verifyRoundTrip(parsed,photoCatalog));
      if(!sequence)by("labExportSize").value=String(parsed.output.maxEdge);
      notify(sequence?"Sequência aberta / "+parsed.pages.length+" páginas.":"Documento v1 aberto. Textos, M, composição e assinatura restaurados.","success");
    }catch(error){
      notify("DOCUMENTO RECUSADO / "+(error?.message||"JSON inválido"),"error");
    }finally{
      fileInput.value="";
    }
  });
  window.LabProductionDocument={
    create:()=>{
      ready();
      const {state,photoCatalog}=bridge().snapshot();
      return createProductionDocument({state,photoCatalog,maxEdge:Number(by("labExportSize")?.value)||3840});
    }
  };
}
