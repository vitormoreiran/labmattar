// Public build used by /capitulo-3, pinned by the recovered official asset paths.
export const chapterPage = '/capitulo-3';
export const chapterPreviewAliases = ['/mesa-editor/chapter-preview','/mesa-editor/chapter-preview.html'];
export const chapterModule = '/assets/page-BwU9D39l.js';
export const chapterDataModule = '/assets/use-published-site-content-UMumlnTl.js';
export const chapterAssets = [
  chapterModule,
  chapterDataModule,
  '/assets/SiteChrome-1hjcrPSD.js',
  '/assets/layout-segment-context-C6qNGBcr.js',
  '/assets/index-DaKY3Ax1.css',
  '/assets/navigation-shared.css',
  '/assets/typography-system.css',
  '/assets/rolldown-runtime-S-ySWqyJ.js',
  '/assets/index-ks4uqjQo.js',
  '/assets/portfolio-defaults-CMjOQCY7.js',
  '/assets/framework-CXnKph_e.js',
  '/assets/chapter-text-motion-v1.js',
  '/assets/typography-fit.js',
  '/assets/navigation-shared.js',
  '/assets/i18n.js',
  '/assets/navigation-data.js',
  '/assets/i18n.css',
  '/assets/ScrollTrigger-DcsOpZjR.js',
  '/assets/gsap-BonqQ7nS.js',
  '/assets/casa-das-palmeiras.jpg',
  '/assets/m.svg',
  '/assets/mattar.svg',
  '/assets/vaso.svg',
  '/assets/ambient-breeze.mp4',
  '/fonts/perpetua-titling-light.ttf',
  '/fonts/univers-lt-std-45-light.otf',
  '/i18n/pt.json',
  '/i18n/en.json',
  '/i18n/es.json',
];

export const chapterAssetRoot = '/mesa-capitulo-3-runtime';
const assetPaths = new Set(chapterAssets);

export async function handleChapterRuntime(request, env) {
  const url = new URL(request.url);
  const isChapter = [chapterPage, chapterPage + '/'].includes(url.pathname);
  const isAlias = chapterPreviewAliases.includes(url.pathname);
  if (!isChapter && !isAlias && !assetPaths.has(url.pathname)) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status:405, headers:{ Allow:'GET, HEAD' } });
  if (isAlias) return Response.redirect(new URL(chapterPage,url),302);
  const path = isChapter ? chapterAssetRoot + '/capitulo-3.txt' : chapterAssetRoot + url.pathname;
  url.pathname = path;
  const response = await env.ASSETS.fetch(new Request(url, request));
  if (!isChapter || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Type','text/html; charset=utf-8');
  headers.set('X-Robots-Tag','noindex, nofollow');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");
  return new Response(response.body,{status:response.status,headers});
}
