import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const baseline=JSON.parse(await readFile('site-oficial/baseline.json','utf8'));
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||account!==baseline.accountId)throw Error('Credenciais ausentes ou conta diferente da base oficial.');
async function api(route){const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/mattar-portfolio'+route,{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Não foi possível conferir o serviço oficial: HTTP '+r.status);const j=await r.json();if(!j.success)throw Error('Consulta oficial recusada');return j.result;}
const deployment=(await api('/deployments')).deployments[0];
if(deployment.versions.length!==1||deployment.versions[0].percentage!==100)throw Error('Há uma distribuição de tráfego em andamento. Confira antes de publicar.');
const active=deployment.versions[0].version_id;
if(active!==baseline.version){const version=await api('/versions/'+active),tag=version.annotations?.['workers/tag']||'',match=tag.match(/^github-official-([a-f0-9]{40})$/);if(!match)throw Error('O domínio recebeu uma publicação fora deste fluxo. Recupere e confira essa versão antes de substituir.');execFileSync('git',['merge-base','--is-ancestor',match[1],process.env.GITHUB_SHA],{stdio:'ignore'});}
console.log('Serviço oficial conferido; versão atual: '+active);
