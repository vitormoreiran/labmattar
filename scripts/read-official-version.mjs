import {readFile,appendFile} from 'node:fs/promises';
const entries=(await readFile(process.env.WRANGLER_OUTPUT_FILE_PATH,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const entry=entries.filter(e=>e.type==='version-upload').at(-1);
if(entry?.worker_name!=='mattar-portfolio'||!/^[a-f0-9-]{36}$/.test(entry.version_id||''))throw Error('Versão oficial não identificada no resultado do Wrangler.');
const url=new URL(entry.preview_url);
if(url.protocol!=='https:'||!(/^[a-f0-9]+-mattar-portfolio\.vitormoreiran\.workers\.dev$/).test(url.hostname))throw Error('Prévia não pertence ao serviço oficial.');
await appendFile(process.env.GITHUB_ENV,'OFFICIAL_VERSION_ID='+entry.version_id+'\nOFFICIAL_PREVIEW_URL='+url.origin+'\n');
console.log('Versão preparada no serviço oficial: '+entry.version_id);
