const expected = process.env.EXPECTED_SHA;
if (!/^[a-f0-9]{40}$/.test(expected || '')) throw Error('Revisão esperada ausente');
const origin = process.env.VERIFY_PREVIEW === '1' ? process.env.OFFICIAL_PREVIEW_URL : 'https://labmattar.com';
if (!origin || !/^https:\/\/(?:labmattar\.com|[a-f0-9]+-mattar-portfolio\.vitormoreiran\.workers\.dev)$/.test(origin)) throw Error('Origem de verificação inesperada');
// Deploying a version and propagating its domain route are separate events.
// Confirm the exact release before checking pages; an older response never passes.
let confirmed = false;
for (let attempt = 0; attempt < 18; attempt++) {
  try {
    const response = await fetch(origin + '/laboratorio-release.json?revision=' + expected + '&probe=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (response.ok && (await response.json()).sha === expected) { confirmed = true; break; }
  } catch (error) { console.log('Aguardando a revisão no domínio: ' + error.message); }
  if (attempt < 17) await new Promise(resolve => setTimeout(resolve, 3000));
}
if (!confirmed) throw Error('O domínio ainda não serve esta revisão');
for (const route of ['/', '/capitulo-4/sesc', '/capitulo-4/bradesco', '/capitulo-4/simposio/', '/compor.html', '/motion.html', '/laboratorio', '/laboratorio/', '/laboratorio.html', '/assinatura-email.html']) {
  const response = await fetch(origin + route + '?revision=' + expected, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw Error('Página indisponível: ' + route + ' (' + response.status + ')');
  const html = await response.text();
  if (html.length < 1000) throw Error('Página incompleta: ' + route);
  if (route.startsWith('/laboratorio')) {
    const tools = ['/motion/matriz/index.html', '/compor.html?studio=1#laboratorio', '/assinatura-email.html?origem=laboratorio'];
    if (!html.includes('class="lm-lab-tool-grid"') || html.includes('id="labArtboard"') || tools.some(href => !html.includes('href="' + href + '"'))) {
      throw Error('Laboratório deve abrir o overview das ferramentas: ' + route);
    }
  }
}
console.log(origin + ': revisão confirmada e páginas existentes disponíveis.');
