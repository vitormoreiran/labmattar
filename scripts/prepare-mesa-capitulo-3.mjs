import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { chapterAssetRoot, chapterAssets, chapterDataModule, chapterModule } from './mesa-capitulo-3-runtime.mjs';

// These public assets were patched after the recovered official build.
// Acquire the exact inspected revisions with read-only requests at build time.
const published = new Map([
  ['/assets/index-DaKY3Ax1.css','efb4b8e840460a47c44ffb1de89ef5b91251f4a9bdb6ca22504c0dfc388c7316'],
  ['/assets/i18n.js','4f76730807ecefa2e0619feb5f5ca0b5003c64021d74aced0455a0c235588a28'],
  ['/i18n/pt.json','2adf0dfb034388d796274d2b2d0f56a572b21dd382884024b2ebaeab1ecc2f28'],
  ['/i18n/en.json','0073d2cf642ef05027688793e45fb50bb69d69fc8d99507c41460963f4711cce'],
  ['/i18n/es.json','2cc956c1caf2ca4dbe60667d61aec2147022c9be8c090c4c257941128dd0e9e7'],
]);

function replaceOnce(text, old, replacement) {
  if (text.split(old).length !== 2) throw Error('O pacote oficial de Como trabalhamos mudou. Revise o ponto de ligação da prévia.');
  return text.replace(old, replacement);
}

export async function prepareChapterRuntime(directory = 'dist/client') {
  const root = directory + chapterAssetRoot;
  await mkdir(root,{recursive:true});
  await copyFile('scripts/mesa-capitulo-3-publicado.html',root+'/capitulo-3.txt');
  await Promise.all(chapterAssets.map(async path => {
    const target = root + path;
    await mkdir(dirname(target),{recursive:true});
    if (path === chapterDataModule) {
      await writeFile(target, "export { useChapterDraft as t } from '/mesa-editor/chapter-runtime-data.mjs';\n");
    } else if (path === chapterModule) {
      let code = await readFile('site-oficial/public'+path,'utf8');
      // The original animation cleans up the text nodes it previously owned.
      // A content key lets React renew only the changed copy, leaving video and layout mounted.
      code = replaceOnce(code,'children:l.summary})]})','children:l.summary})]},JSON.stringify([l.title,l.summary]))');
      code = replaceOnce(code,'(d.body??[]).map(e=>(0,c.jsx)(`p`,{children:e},e))]})','(d.body??[]).map(e=>(0,c.jsx)(`p`,{children:e},e))]},JSON.stringify([d.title,d.summary,d.body]))');
      code = replaceOnce(code,'(f.body??[]).map(e=>(0,c.jsx)(`p`,{children:e},e))]})','(f.body??[]).map(e=>(0,c.jsx)(`p`,{children:e},e))]},JSON.stringify([f.title,f.summary,f.body]))');
      await writeFile(target,code);
    } else if (published.has(path)) {
      const source = await fetch(new URL(path,'https://labmattar.com'),{redirect:'error',signal:AbortSignal.timeout(20_000)});
      if (!source.ok) throw Error('Não foi possível obter o asset público '+path);
      const bytes = Buffer.from(await source.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== published.get(path)) throw Error('A versão publicada de '+path+' mudou. Confira a paridade antes de publicar a prévia.');
      await writeFile(target,bytes);
    } else {
      await copyFile('site-oficial/public'+path,target);
    }
  }));
}
