import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {prepareChapter4Publication} from '../tools/laboratorio-export/publication.mjs';
const [input,slug,directory]=process.argv.slice(2);if(!input||!slug||!directory)throw Error('Uso: node scripts/prepare-chapter4-publication.mjs <HTML exportado> <endereço> <pasta de saída nova>');
const result=prepareChapter4Publication(await readFile(input,'utf8'),slug),output=path.resolve(directory);
await mkdir(output);await mkdir(path.join(output,'assets'));
for(const [file,bytes]of result.files)await writeFile(path.join(output,file),bytes);
console.log(JSON.stringify({route:result.manifest.route,status:result.manifest.status,files:result.files.size,directory:output},null,2));
