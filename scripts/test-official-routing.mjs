import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('Laboratório serves the overview while composition, portfolio and API keep their destinations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'lab-routing-test-'));
  try {
    await copyFile(new URL('../site-oficial/worker/entry.mjs', import.meta.url), path.join(root, 'entry.mjs'));
    await copyFile(new URL('../site-oficial/worker/identity-domain.mjs', import.meta.url), path.join(root, 'identity-domain.mjs'));
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    await writeFile(path.join(root, 'index.js'), 'export default {fetch(request){return new Response("original:"+new URL(request.url).pathname)}};');
    await writeFile(path.join(root, 'acervo-api.mjs'), 'export function handleAcervoRequest(){return new Response("api")}');
    const { default: worker } = await import(pathToFileURL(path.join(root, 'entry.mjs')).href);
    const overview = await readFile(new URL('../design/laboratorio.html', import.meta.url), 'utf8');
    const requests = [];
    const introduction = await readFile(new URL('../design/inicio.html', import.meta.url), 'utf8');
    const env = { ASSETS: { fetch(request) { requests.push(request.url); return new Response(new URL(request.url).pathname==='/inicio'?introduction:overview, { headers: { 'content-type': 'text/html' } }); } } };
    for (const route of ['/laboratorio?origem=menu', '/laboratorio/']) {
      const request = new Request('https://labmattar.com' + route);
      const response = await worker.fetch(request, env, {});
      assert.equal(response.status, 200); assert.equal(response.headers.has('location'), false);
      const html = await response.text(); assert.ok(html.includes('class="lm-lab-tool-grid"')); assert.ok(html.includes('CARTÃO MATTAR'));
      assert.equal(html.includes('id="labArtboard"'), false);
      assert.equal(requests.at(-1), request.url);
    }
    for (const route of ['/compor.html?studio=1', '/', '/capitulo-4/sesc']) {
      const response = await worker.fetch(new Request('https://labmattar.com' + route), env, {});
      assert.equal(await response.text(), 'original:' + new URL(route, 'https://labmattar.com').pathname);
    }
    assert.equal(await (await worker.fetch(new Request('https://labmattar.com/api/acervo/projects'), env, {})).text(), 'api');
    assert.equal(requests.length, 2);
    const portal = await worker.fetch(new Request('https://identidade.labmattar.com/?origem=teste'), env, {});
    assert.ok((await portal.text()).includes('id="sistemas"'));
    assert.equal(requests.at(-1), 'https://identidade.labmattar.com/inicio?origem=teste');
    const portalLab = await worker.fetch(new Request('https://identidade.labmattar.com/laboratorio'), env, {});
    assert.ok((await portalLab.text()).includes('class="lm-lab-tool-grid"'));
    const portfolio = await worker.fetch(new Request('https://identidade.labmattar.com/capitulo-4/sesc?from=portal'), env, {});
    assert.equal(portfolio.headers.get('location'), 'https://labmattar.com/capitulo-4/sesc?from=portal');
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('lab-routing-test-'));
    await rm(root, { recursive: true, force: true });
  }
});
