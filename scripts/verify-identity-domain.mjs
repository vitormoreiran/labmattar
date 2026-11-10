import assert from 'node:assert/strict';
import path from 'node:path';
import { IDENTITY_ORIGIN } from '../site-oficial/worker/identity-domain.mjs';

export async function verifyIdentityDomain({ expected, fetcher = fetch, origin = IDENTITY_ORIGIN }) {
  if (origin !== IDENTITY_ORIGIN || !/^[a-f0-9]{40}$/.test(expected || '')) throw Error('Domínio ou revisão da identidade inválidos.');
  const request = (route, options = {}) => fetcher(origin + route, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(15000), ...options });
  const release = await request('/laboratorio-release.json?revision=' + expected);
  assert.equal(release.ok, true, 'Manifesto da identidade disponível');
  assert.equal((await release.json()).sha, expected, 'Identidade e site oficial usam a mesma revisão');
  const pages = [
    ['/', ['00 / Introdução', 'id="sistemas"']],
    ['/manual', ['LABMATTAR']], ['/motion', ['LABMATTAR']], ['/tipografia', ['LABMATTAR']],
    ['/cores', ['LABMATTAR']], ['/composicao', ['LABMATTAR']], ['/redes', ['LABMATTAR']],
    ['/laboratorio', ['class="lm-lab-tool-grid"', 'CARTÃO MATTAR']],
    ['/compor', ['id="labArtboard"', 'id="labAcervo"']],
    ['/assinatura-email', ['Cartão MATTAR', 'id="signatureForm"']],
    ['/motion/matriz/index.html', ['<html']]
  ];
  for (const [route, markers] of pages) {
    const response = await request(route + '?revision=' + expected);
    assert.equal(response.ok, true, 'Página da identidade: ' + route);
    assert.ok(response.headers.get('content-type')?.includes('text/html'), 'HTML da identidade: ' + route);
    const html = await response.text();
    for (const marker of markers) assert.ok(html.includes(marker), 'Conteúdo de ' + route + ': ' + marker);
    if (route === '/laboratorio') assert.equal(html.includes('id="labArtboard"'), false, 'Laboratório é o overview');
  }
  for (const route of ['/fonts/univers-lt-std-45-light.otf', '/identidade/M.svg', '/vendor/gifenc/gifenc-1.0.3.mjs', '/motion/videos/m-form.mp4']) {
    const response = await request(route, { headers: { Range: 'bytes=0-255' } });
    assert.ok(response.ok, 'Dependência da identidade: ' + route);
    await response.body?.cancel();
  }
  const status = await request('/api/acervo/status'); assert.ok(status.ok, 'API do acervo no novo domínio');
  const providers = await status.json(); assert.ok(providers.providers?.google && providers.providers?.dropbox, 'Contrato da API do acervo');
  return { origin, sha: expected, pages: pages.length, assets: 4, laboratory: 'overview' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const expected = process.env.EXPECTED_SHA;
  if (!/^[a-f0-9]{40}$/.test(expected || '')) throw Error('Revisão esperada ausente');
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(IDENTITY_ORIGIN + '/laboratorio-release.json?revision=' + expected + '&probe=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (response.ok && (await response.json()).sha === expected) { ready = true; break; }
    } catch { /* DNS and TLS may need time after the domain is attached. */ }
    if (attempt < 59) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (!ready) throw Error('O novo domínio ainda não confirmou DNS, HTTPS e a revisão publicada.');
  console.log(JSON.stringify(await verifyIdentityDomain({ expected })));
}
