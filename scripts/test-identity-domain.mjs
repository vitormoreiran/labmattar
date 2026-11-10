import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configureIdentityDomain } from './configure-identity-domain.mjs';
import { verifyIdentityDomain } from './verify-identity-domain.mjs';
import { IDENTITY_HOST } from '../site-oficial/worker/identity-domain.mjs';
const baseline = { accountId: 'a'.repeat(32), domain: 'labmattar.com', worker: 'mattar-portfolio' };
const settings = { token: 'unit-test-credential', accountId: baseline.accountId, baseline };
function cloudflare({ existing, dns = [], status = 200 } = {}) {
  const calls = [];
  return { calls, fetcher: async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('https://cloudflare-dns.com/')) {
      assert.equal(options.headers.Authorization, undefined, 'Credential never goes to DNS resolver');
      return Response.json({ Status: dns.length ? 0 : 3, Answer: dns });
    }
    assert.equal(options.headers.Authorization, 'Bearer unit-test-credential');
    if (status !== 200) return Response.json({ success: false, errors: [{ code: 10000, message: 'Permission denied' }] }, { status });
    if (options.method === 'PUT') return Response.json({ success: true, result: { ...JSON.parse(options.body), id: 'domain-id' } });
    return Response.json({ success: true, result: existing ? [existing] : [] });
  } };
}
test('read-only check does not create domains; apply targets only the requested hostname', async () => {
  const api = cloudflare();
  const checked = await configureIdentityDomain({ ...settings, fetcher: api.fetcher });
  assert.equal(checked.mode, 'read-only'); assert.equal(api.calls.some(call => call.options.method === 'PUT'), false);
  const applied = await configureIdentityDomain({ ...settings, fetcher: api.fetcher, apply: true });
  assert.equal(applied.changed, true);
  const writes = api.calls.filter(call => call.options.method === 'PUT'); assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].options.body), { hostname: IDENTITY_HOST, service: baseline.worker, zone_name: baseline.domain, enabled: true, previews_enabled: false });
});
test('existing correct binding is idempotent and an occupied hostname is preserved', async () => {
  const own = cloudflare({ existing: { hostname: IDENTITY_HOST, service: baseline.worker, zone_name: baseline.domain, enabled: true } });
  assert.equal((await configureIdentityDomain({ ...settings, fetcher: own.fetcher, apply: true })).changed, false);
  assert.equal(own.calls.length, 1);
  const other = cloudflare({ existing: { hostname: IDENTITY_HOST, service: 'another-worker', zone_name: baseline.domain, enabled: true } });
  await assert.rejects(configureIdentityDomain({ ...settings, fetcher: other.fetcher, apply: true }), /outro serviço/);
  assert.equal(other.calls.some(call => call.options.method === 'PUT'), false);
});
test('existing DNS, wrong account and unavailable permission prevent mutation', async () => {
  const dns = cloudflare({ dns: [{ name: IDENTITY_HOST, type: 1, data: '192.0.2.1' }] });
  await assert.rejects(configureIdentityDomain({ ...settings, fetcher: dns.fetcher, apply: true }), /registro DNS/);
  assert.equal(dns.calls.some(call => call.options.method === 'PUT'), false);
  await assert.rejects(configureIdentityDomain({ ...settings, accountId: 'different', fetcher: dns.fetcher }), /conta do serviço oficial/);
  await assert.rejects(configureIdentityDomain({ ...settings, fetcher: cloudflare({ status: 403 }).fetcher }), /HTTP 403/);
});
test('hosting sends the identity root through the Worker without changing its service or database', async () => {
  const config = JSON.parse(await readFile(new URL('../site-oficial/wrangler.jsonc', import.meta.url), 'utf8'));
  assert.ok(config.assets.run_worker_first.includes('/'));
  assert.equal(config.name, baseline.worker); assert.equal(config.keep_vars, true);
  assert.equal(config.d1_databases[0].binding, 'DB');
});
test('identity verification requires introduction, overview, tools, media and API on the same release', async () => {
  const expected = 'b'.repeat(40), visited = [];
  const fetcher = async (url, options = {}) => {
    visited.push(url); const route = new URL(url).pathname;
    if (route === '/laboratorio-release.json') return Response.json({ sha: expected });
    if (route === '/api/acervo/status') return Response.json({ providers: { google: {}, dropbox: {} } });
    if (options.headers?.Range) return new Response('asset');
    const specific = { '/': '00 / Introdução id="sistemas"', '/laboratorio': 'class="lm-lab-tool-grid" CARTÃO MATTAR', '/compor': 'id="labArtboard" id="labAcervo"', '/assinatura-email': 'Cartão MATTAR id="signatureForm"' };
    return new Response('<html>LABMATTAR ' + (specific[route] || '') + '</html>', { headers: { 'content-type': 'text/html' } });
  };
  const result = await verifyIdentityDomain({ expected, fetcher }); assert.equal(result.pages, 11); assert.equal(result.assets, 4);
  assert.ok(visited.every(url => url.startsWith('https://' + IDENTITY_HOST + '/')));
  await assert.rejects(verifyIdentityDomain({ expected, fetcher: async () => Response.json({ sha: 'c'.repeat(40) }) }), /mesma revisão/);
});
