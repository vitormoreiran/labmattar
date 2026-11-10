import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('./verify-official.mjs', import.meta.url), 'utf8');
const sha = 'a'.repeat(40);
function execute({ readyAfter = 0, origin } = {}) {
  const requests = []; let releases = 0;
  const context = {
    process: { env: { EXPECTED_SHA: sha, ...(origin ? { VERIFY_PREVIEW: '1', OFFICIAL_PREVIEW_URL: origin } : {}) } },
    AbortSignal, Date, console: { log() {} }, setTimeout: callback => callback(),
    fetch: async url => {
      requests.push(url);
      if (url.includes('laboratorio-release.json')) return { ok: true, json: async () => ({ sha: releases++ < readyAfter ? 'b'.repeat(40) : sha }) };
      return { ok: true, status: 200, headers: new Headers({ 'content-type': 'text/html' }), text: async () => '<!doctype html>' + 'x'.repeat(1000) };
    }
  };
  return { promise: vm.runInNewContext('(async()=>{' + source + '})()', context), requests, releases: () => releases };
}
test('official verification waits for the exact revision and checks the new card route', async () => {
  const run = execute({ readyAfter: 2 }); await run.promise;
  assert.equal(run.releases(), 3);
  assert.ok(run.requests.some(url => url.includes('/assinatura-email.html?revision=' + sha)));
  assert.ok(run.requests.some(url => url.includes('/capitulo-4/sesc?revision=' + sha)));
});
test('an old release never passes and no routes are accepted before it is current', async () => {
  const run = execute({ readyAfter: 100 });
  await assert.rejects(run.promise, /ainda não serve esta revisão/);
  assert.equal(run.releases(), 18); assert.equal(run.requests.length, 18);
});
test('verification refuses an unrecognized preview origin', async () => {
  const run = execute({ origin: 'https://example.com' });
  await assert.rejects(run.promise, /Origem de verificação inesperada/); assert.equal(run.requests.length, 0);
});
