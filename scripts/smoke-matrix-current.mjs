import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const url=process.env.MATRIX_URL||'http://127.0.0.1:8765/motion/matriz/index.html';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],failures=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('requestfailed',request=>failures.push(request.url()+': '+request.failure()?.errorText));
await mkdir('matrix-proof',{recursive:true});
try{
 const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
 assert.equal(response.status(),200,'A Matriz deve estar acessivel pela rota atual');
 await page.locator('.app .topbar').waitFor({timeout:30000});
 await page.locator('[data-action="inspector-scope"][data-value="project"]').click();
 await page.locator('#project-speed').waitFor();
 await page.locator('#project-speed').fill('1.5');
 await page.locator('#project-speed').dispatchEvent('change');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mattar-spatial-current-v2')||'{}').speed===1.5);
 await page.reload({waitUntil:'networkidle'});
 await page.locator('[data-action="inspector-scope"][data-value="project"]').click();
 assert.equal(await page.locator('#project-speed').inputValue(),'1.5','Velocidade editada deve sobreviver ao reload');
 assert.deepEqual(errors,[],'Sem erros de modulo ou de interface');
 assert.deepEqual(failures,[],'Sem falha de requisicoes');
 await page.screenshot({path:'matrix-proof/current-desktop.png'});
 console.log('Matriz atual: carregamento, controle e persistencia local aprovados.');
}catch(error){
 await page.screenshot({path:'matrix-proof/current-failure.png'}).catch(()=>{});
 throw error;
}finally{
 await writeFile('matrix-proof/report.json',JSON.stringify({url,errors,failures},null,2));
 await browser.close();
}
