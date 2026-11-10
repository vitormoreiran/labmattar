import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { IDENTITY_HOST } from '../site-oficial/worker/identity-domain.mjs';

export async function configureIdentityDomain({ token, accountId, baseline, apply = false, fetcher = fetch }) {
  if (!token || accountId !== baseline.accountId || baseline.worker !== 'mattar-portfolio' || baseline.domain !== 'labmattar.com') {
    throw Error('A configuração exige a credencial e a conta do serviço oficial LABMATTAR.');
  }
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/workers/domains';
  async function api(url, options = {}) {
    const response = await fetcher(url, { ...options, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
    const body = await response.json();
    if (!response.ok || !body.success) {
      const detail = (body.errors || []).map(error => error.code + ': ' + error.message).join('; ').slice(0, 300);
      throw Error('Cloudflare não autorizou a configuração do subdomínio (HTTP ' + response.status + '). ' + detail);
    }
    return body;
  }
  const domains = [];
  for (let page = 1; page <= 20; page++) {
    const result = await api(endpoint + '?per_page=100&page=' + page);
    domains.push(...result.result);
    if (page >= (result.result_info?.total_pages || 1)) break;
    if (page === 20) throw Error('A lista de domínios excede a conferência automática.');
  }
  const existing = domains.find(domain => domain.hostname.toLowerCase() === IDENTITY_HOST);
  if (existing && (existing.service !== baseline.worker || existing.zone_name !== baseline.domain)) {
    throw Error('O subdomínio já pertence a outro serviço. A configuração existente foi preservada.');
  }
  if (!existing) {
    const answers = await Promise.all(['A', 'AAAA', 'CNAME'].map(async type => {
      const response = await fetcher('https://cloudflare-dns.com/dns-query?name=' + IDENTITY_HOST + '&type=' + type, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Não foi possível conferir os registros DNS existentes.');
      const result = await response.json();
      if (![0, 3].includes(result.Status)) throw Error('A consulta DNS não confirmou se o endereço está disponível.');
      return result.Answer || [];
    }));
    if (answers.some(answer => answer.length)) throw Error('Já existe um registro DNS nesse endereço. Nenhum registro foi substituído.');
  }
  let changed = false;
  if (apply && (!existing || !existing.enabled)) {
    const result = await api(endpoint, { method: 'PUT', body: JSON.stringify({ hostname: IDENTITY_HOST, service: baseline.worker, zone_name: baseline.domain, enabled: true, previews_enabled: existing?.previews_enabled === true }) });
    if (result.result.hostname !== IDENTITY_HOST || result.result.service !== baseline.worker || !result.result.enabled) throw Error('A Cloudflare não confirmou o vínculo esperado.');
    changed = true;
  }
  return { hostname: IDENTITY_HOST, service: baseline.worker, zone: baseline.domain, mode: apply ? 'apply' : 'read-only', changed, alreadyActive: Boolean(existing?.enabled) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const baseline = JSON.parse(await readFile('site-oficial/baseline.json', 'utf8'));
  const result = await configureIdentityDomain({ token: process.env.CLOUDFLARE_API_TOKEN, accountId: process.env.CLOUDFLARE_ACCOUNT_ID, baseline, apply: process.argv.includes('--apply') });
  console.log(JSON.stringify(result));
  if (process.argv.includes('--apply')) {
    await mkdir('dist', { recursive: true });
    await writeFile('dist/identity-domain.json', JSON.stringify(result, null, 2));
  }
}
