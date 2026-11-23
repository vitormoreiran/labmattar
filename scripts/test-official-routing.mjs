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
    // Old manual URLs stay usable but resolve to the sole canonical identity domain.
    for (const route of ['/inicio', '/inicio.html', '/manual', '/motion.html', '/tipografia',
      '/cores', '/composicao.html', '/laboratorio?origem=menu', '/laboratorio/',
      '/compor.html?studio=1', '/montar', '/identidade', '/redes',
      '/assinatura-email.html', '/motion/matriz/index.html']) {
      const request = new Request('https://labmattar.com' + route);
      const response = await worker.fetch(request, env, {});
      assert.equal(response.status, 302, 'Reversible canonical redirect for ' + route);
      assert.equal(response.headers.get('location'), 'https://identidade.labmattar.com' + route);
    }
    // Portfolio, public archives, release manifest, media and API remain on the main domain.
    for (const route of ['/', '/capitulo-4/sesc', '/editar', '/assets/chapter1-opening.mp4',
      '/motion/videos/m-form.mp4', '/laboratorio-release.json', '/api/unrelated']) {
      const response = await worker.fetch(new Request('https://labmattar.com' + route), env, {});
      assert.equal(await response.text(), 'original:' + new URL(route, 'https://labmattar.com').pathname);
    }
    assert.equal(await (await worker.fetch(new Request('https://labmattar.com/api/acervo/projects'), env, {})).text(), 'api');
    assert.equal(requests.length, 0);
    const portal = await worker.fetch(new Request('https://identidade.labmattar.com/?origem=teste'), env, {});
    assert.ok((await portal.text()).includes('id="sistemas"'));
    assert.equal(requests.at(-1), 'https://identidade.labmattar.com/inicio?origem=teste');
    const portalLab = await worker.fetch(new Request('https://identidade.labmattar.com/laboratorio'), env, {});
    assert.ok((await portalLab.text()).includes('class="lm-lab-tool-grid"'));
    const composition = await worker.fetch(new Request('https://identidade.labmattar.com/compor.html?studio=1'), env, {});
    assert.equal(composition.status, 200);
    const portfolio = await worker.fetch(new Request('https://identidade.labmattar.com/capitulo-4/sesc?from=portal'), env, {});
    assert.equal(portfolio.headers.get('location'), 'https://labmattar.com/capitulo-4/sesc?from=portal');
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('lab-routing-test-'));
    await rm(root, { recursive: true, force: true });
  }
});
