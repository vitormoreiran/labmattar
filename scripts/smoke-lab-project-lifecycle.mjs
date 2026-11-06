import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createPage,createMotion,createSection,sectionState,readSequence,sequenceDocument} from '../public/lab-sequence.mjs';
const origin=process.env.COMPOSITION_URL||'http://127.0.0.1:8765/compor.html';
const browserName=process.env.COMPOSITION_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (browserName==='webkit'?webkit:chromium).launch({headless:true});
const dir='lifecycle-proof/'+browserName;await mkdir(dir,{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[],proof=[];page.on('pageerror',error=>errors.push(error.message));
const waitReady=async p=>{await p.waitForSelector('#labPages[data-ready="true"]',{state:'attached'});};
const project=()=>page.evaluate(()=>window.LabPages.create());
const workspace=async(name,p=page)=>p.locator('button[data-workspace-view="'+name+'"]').click();
async function openProjectTools(p=page){await workspace('pages',p);await p.locator('#labDownloadDocument').evaluate(el=>{for(let parent=el.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;});}
try{
  await page.goto(origin+'?studio=1',{waitUntil:'networkidle'});await waitReady(page);
  await page.waitForSelector('#labPages[data-motion-catalog="ready"]',{state:'attached'});
  const baseline=await page.evaluate(()=>window.LabProductionBridge.snapshot());
  const catalog=await (await page.request.get(new URL('/motion/catalog.json',origin).href)).json();
  const state=baseline.state,photos=baseline.photoCatalog;
  const makePage=(id,s=state,motions=[])=>createPage({id,name:id,state:s,photoCatalog:photos,maxEdge:1920,motions});

  // A03: o arquivo realmente baixado, com >5 MiB, deve ser aceito novamente.
  const photo='loc-01234567890123456789';
  const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
  const uri='data:image/png;base64,'+Buffer.concat([pixel,Buffer.alloc(2_250_000)]).toString('base64');
  const largePages=['large-one','large-two'].map(id=>createPage({id,name:id,state:{...state,photo},photoCatalog:{...photos,[photo]:uri},maxEdge:1920}));
  const large=sequenceDocument('Fotografias incorporadas',largePages,null,state.signature);
  await page.evaluate(doc=>window.LabPages.load(doc),large);await openProjectTools();
  const downloadPromise=page.waitForEvent('download');await page.locator('#labDownloadDocument').click();
  const downloaded=await downloadPromise,downloadedText=await readFile(await downloaded.path(),'utf8');assert(Buffer.byteLength(downloadedText)>5*1024*1024);
  const saved=JSON.parse(downloadedText);readSequence(saved,photos,catalog.items);
  await page.evaluate(doc=>window.LabPages.load(doc),sequenceDocument('Outro projeto',[makePage('blank')],null,state.signature));
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#labDocumentFile').setInputFiles({name:'projeto-grande.json',mimeType:'application/json',buffer:Buffer.from(downloadedText)});
  await page.waitForFunction(()=>document.querySelector('#labDocumentStatus').textContent==='Sequência aberta / 2 páginas.');
  assert.deepEqual(await project(),large);proof.push({case:'large-json',bytes:Buffer.byteLength(downloadedText),pages:2});

  // A02: 31 permanece intacto; 30 converte em um documento v2 válido.
  const thirtyOne=sequenceDocument('Trinta e uma páginas',Array.from({length:31},(_,i)=>makePage('p'+i)),null,state.signature);
  await page.evaluate(doc=>window.LabPages.load(doc),thirtyOne);await workspace('pages');await page.locator('#labEnableSections').click();
  await page.waitForFunction(()=>document.querySelector('#labPagesStatus').textContent.includes('até 30'));
  assert.deepEqual(await project(),thirtyOne);
  const thirty={...thirtyOne,pages:thirtyOne.pages.slice(0,30)};await page.evaluate(doc=>window.LabPages.load(doc),thirty);await page.locator('#labEnableSections').click();
  await page.waitForFunction(()=>window.LabPages.create().schemaVersion===2);
  const converted=await project();assert.equal(converted.sections.length,30);readSequence(converted,photos,catalog.items);proof.push({case:'section-limit',accepted:30,rejectedWithoutMutation:31});

  // A04: cancelar não altera nada; confirmar guarda a apresentação inteira.
  const sections=['intro','final'].map((id,i)=>createSection(id,id,{...state,color:i?'red':'blue'},photos));
  const resetPages=sections.map((section,i)=>({...makePage('autoral-'+i,{...sectionState(state,section),title:'CONTEÚDO\nAUTORAL '+i},i?[createMotion(catalog.items[0],'motion-original')]:[]),sectionId:section.id}));
  const original=sequenceDocument('Estudo autoral',resetPages,sections,state.signature);
  await page.evaluate(doc=>window.LabPages.load(doc),original);await workspace('pages');await page.locator('#labPageList button[data-page-index="1"]').click();
  await page.waitForFunction(()=>document.querySelector('#labPageCount').textContent==='2 / 2');
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#labStudioQuickReset').click();assert.deepEqual(await project(),original);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#labReset').click();await page.locator('#labUndoReset').waitFor({state:'visible'});
  assert.notDeepEqual(await project(),original);
  await page.reload({waitUntil:'networkidle'});await waitReady(page);await page.waitForSelector('#labPages[data-motion-catalog="ready"]',{state:'attached'});
  // A recuperação também não pode apagar sua cópia se a nova gravação falhar.
  await page.evaluate(()=>{const real=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='labmattar-pages-v1')throw new DOMException('Quota cheia','QuotaExceededError');return real.call(this,key,value);};});
  await page.locator('#labUndoReset').waitFor({state:'visible'});page.once('dialog',dialog=>dialog.accept());await page.locator('#labUndoReset').click();
  await page.waitForFunction(()=>document.querySelector('#labPagesStatus').textContent.includes('recuperação foi preservada'));
  assert.deepEqual(await project(),original);
  assert(await page.evaluate(()=>Boolean(localStorage.getItem('labmattar-pages-v1-before-reset'))));
  await page.reload({waitUntil:'networkidle'});await waitReady(page);await page.waitForSelector('#labPages[data-motion-catalog="ready"]',{state:'attached'});
  await page.locator('#labUndoReset').waitFor({state:'visible'});page.once('dialog',dialog=>dialog.accept());await page.locator('#labUndoReset').click();
  await page.waitForFunction(()=>document.querySelector('#labPagesStatus').textContent.includes('anterior recuperada'));
  assert.deepEqual(await project(),original);assert.equal(await page.locator('#labPageCount').textContent(),'2 / 2');
  proof.push({case:'reset-undo',survivesReload:true,pages:2,sections:2,selection:1,motions:1});
  await page.screenshot({path:dir+'/restauracao-recuperada.png'});

  // A10: falha na chave canônica não pode ser mascarada por salvar a página.
  const storageBefore=await page.evaluate(()=>({sequence:localStorage.getItem('labmattar-pages-v1'),legacy:localStorage.getItem('labmattar-composicao-lab-v1')}));
  await page.evaluate(()=>{
    const real=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='labmattar-pages-v1')throw new DOMException('Quota cheia','QuotaExceededError');return real.call(this,key,value);};
    const snapshot=window.LabProductionBridge.snapshot();window.LabProductionBridge.restore({...snapshot.state,title:'ALTERAÇÃO NÃO GRAVADA'});
  });
  assert.match(await page.locator('#labSaveState').textContent(),/não foi salva/);
  assert.deepEqual(await page.evaluate(()=>({sequence:localStorage.getItem('labmattar-pages-v1'),legacy:localStorage.getItem('labmattar-composicao-lab-v1')})),storageBefore);
  proof.push({case:'quota',falseSuccess:false,previousDraftPreserved:true});

  // A05: a indisponibilidade do catálogo não impede recuperar/editar/salvar.
  const offlineContext=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),offline=await offlineContext.newPage();offline.on('pageerror',e=>errors.push(e.message));
  await offlineContext.route('**/motion/catalog.json',route=>route.fulfill({status:503,body:'Temporariamente indisponível'}));
  await offlineContext.addInitScript(value=>localStorage.setItem('labmattar-pages-v1',JSON.stringify({document:value,current:0,enabled:true})),original);
  await offline.goto(origin+'?studio=1',{waitUntil:'networkidle'});await waitReady(offline);await offline.waitForSelector('#labPages[data-motion-catalog="unavailable"]',{state:'attached'});
  assert.deepEqual(await offline.evaluate(()=>window.LabPages.create()),original);
  await workspace('pages',offline);await offline.locator('#labPageAdd').click();await offline.waitForFunction(()=>window.LabPages.create().pages.length===3);
  const offlineEdited=await offline.evaluate(()=>window.LabPages.create());assert.equal(offlineEdited.pages.reduce((n,p)=>n+p.motions.length,0),1);
  await openProjectTools(offline);const offlineDownload=offline.waitForEvent('download');await offline.locator('#labDownloadDocument').click();
  const offlineFile=await offlineDownload;assert.equal(JSON.parse(await readFile(await offlineFile.path(),'utf8')).pages.length,3);
  await workspace('motion',offline);await offline.screenshot({path:dir+'/catalogo-indisponivel.png'});
  await offlineContext.unroute('**/motion/catalog.json');await offline.locator('#labMotionOpen').click();await offline.waitForSelector('#labPages[data-motion-catalog="ready"]',{state:'attached'});
  assert.equal(await offline.locator('[data-motion-asset]').count(),8);assert.equal((await offline.evaluate(()=>window.LabPages.create())).pages.reduce((n,p)=>n+p.motions.length,0),1);
  proof.push({case:'catalog-offline',pagesEditable:true,motionsPreserved:true,downloadVerified:true,retryRecovered:8});
  await offlineContext.close();assert.deepEqual(errors,[]);
  await writeFile(dir+'/report.json',JSON.stringify({browser:browserName,passed:true,proof,errors},null,2));
  console.log('Ciclo de projeto validado / '+browserName+' / cinco regressões críticas.');
}finally{await context.close();await browser.close();}
