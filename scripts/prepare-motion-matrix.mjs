import { cp, mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const built = path.join(root, 'tools/matriz-vetorial/dist');
const target = path.join(root, 'public/matriz-vetorial');
// Fail before copying if the independently versioned application was not built.
for (const file of ['index.html', 'legacy.html', 'guia.html', 'models/letters/M.glb', 'models/dense/P8.glb']) {
  await access(path.join(built, file));
}
const html = await readFile(path.join(built, 'index.html'), 'utf8');
assert.ok(!html.includes('{{APP_'), 'HTML deve apontar para bundles compilados');
await mkdir(target, { recursive: true });
await cp(built, target, { recursive: true });
console.log('Matriz de roteiros preparada em public/matriz-vetorial/');
