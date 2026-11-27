import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { chapterAssets, chapterPage, chapterPreviewAliases } from './mesa-capitulo-3-runtime.mjs';
import { prepareChapterRuntime } from './prepare-mesa-capitulo-3.mjs';

if (process.env.GITHUB_REF !== 'refs/heads/preview/mesa-unificada') {
  throw Error('O pacote da Mesa só pode ser preparado na branch de prévia.');
}
const path = 'wrangler.preview.jsonc';
const config = JSON.parse(await readFile(path, 'utf8'));
if (config.name !== 'labmattar-identidade-previa' || config.routes || config.d1_databases) {
  throw Error('A configuração de origem não corresponde ao Worker isolado de prévia.');
}
for (const name of ['mesa-preview-entry.mjs','mesa-editor-worker.mjs','mesa-editor-fixtures.mjs','mesa-capitulo-3-runtime.mjs']) {
  await copyFile(`scripts/${name}`, `dist/server/${name}`);
}
config.name = 'labmattar-mesa-previa';
config.main = 'dist/server/mesa-preview-entry.mjs';
config.assets.run_worker_first = ['/', '/mesa-api/*', '/mesa-media/*', chapterPage, chapterPage + '/', ...chapterPreviewAliases, ...chapterAssets];
config.vars.LM_ACERVO_ORIGIN = 'https://labmattar-mesa-previa.vitormoreiran.workers.dev';
config.durable_objects = { bindings: [{ name: 'MESA_EDITOR', class_name: 'MesaEditorSession' }] };
config.migrations = [{ tag: 'mesa-v1', new_sqlite_classes: ['MesaEditorSession'] }];
await prepareChapterRuntime();
await writeFile(path, JSON.stringify(config, null, 2) + '\n');
