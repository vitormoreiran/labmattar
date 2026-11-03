/* LABMATTAR / intercambio v1 do documento de producao.
 * Somente JSON editavel: nao simula PDF, After Effects ou integracao ativa
 * com a timeline da Matriz Vetorial.
 */
import {createProductionDocument,verifyRoundTrip} from "./composicao-document.mjs";
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
      const doc=createProductionDocument({state,photoCatalog,maxEdge});
      verifyRoundTrip(doc,photoCatalog);
      const json=JSON.stringify(doc,null,2)+"\n";
      const blob=new Blob([json],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;
      link.download="labmattar-"+state.format+"-composicao-v1.json";
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
      if(file.size>512000)throw new Error("Arquivo maior do que o limite de 500 KB para este documento.");
      const parsed=JSON.parse(await file.text());
      const {photoCatalog}=bridge().snapshot();
      const state=verifyRoundTrip(parsed,photoCatalog);
      // Reject incompatible or tampered documents before touching current work.
      if(!confirm("Abrir esta composição? O documento substituirá o rascunho atual do Laboratório, que pode ser salvo como JSON antes.")){
        notify("Importação cancelada. O rascunho atual foi preservado.","idle");
        return;
      }
      bridge().restore(state);
      by("labExportSize").value=String(parsed.output.maxEdge);
      notify("Documento v1 aberto. Textos, M, composição e assinatura restaurados.","success");
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
