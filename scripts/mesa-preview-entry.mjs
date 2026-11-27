import identity from './worker-entry.js';
import { routeMesa } from './mesa-editor-worker.mjs';
import { handleChapterRuntime } from './mesa-capitulo-3-runtime.mjs';
export { MesaEditorSession } from './mesa-editor-worker.mjs';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/') return Response.redirect(new URL('/mesa-unificada', url), 302);
    return (await handleChapterRuntime(request, env)) ?? (await routeMesa(request, env)) ?? identity.fetch(request, env, ctx);
  },
};
