import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('public/vendor',{recursive:true});
await build({entryPoints:['tools/laboratorio-export/pdf.mjs'],outfile:'public/vendor/lab-pdf.js',bundle:true,
  format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'linked'});
console.log('Laboratório: exportador PDF preparado.');
