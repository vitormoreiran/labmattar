import original from './index.js';

// Portfolio Worker: no Manual de Identidade, Laboratorio or identity editor.
// The historical portfolio continues to use its recovered Worker unchanged.
const IDENTITY_ROUTES = new Set([
  'inicio','manual','motion','tipografia','cores','composicao','laboratorio',
  'compor','identidade','redes','imagem','assinatura-email','montar',
  'aplicacoes-validadas','validacao-identidade'
]);
function isIdentityOnlyPath(pathname) {
  const slug=pathname.replace(/^\//,'').replace(/\.html$/,'').replace(/\/$/,'');
  return IDENTITY_ROUTES.has(slug)
    || /^\/motion\/(?:matriz|videos)(?:\/|$)/.test(pathname)
    || /^\/api\/acervo(?:\/|$)/.test(pathname)
    || /^\/identidade-kit(?:\/|$)/.test(pathname);
}
export default {
  fetch(request,env,ctx) {
    const url=new URL(request.url);
    // Also enforce isolation on Cloudflare version-preview URLs.
    if (isIdentityOnlyPath(url.pathname)) {
      return new Response('Not Found', {
        status:404,
        headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
      });
    }
    return original.fetch(request,env,ctx);
  }
};
