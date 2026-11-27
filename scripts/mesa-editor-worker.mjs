import { DurableObject } from 'cloudflare:workers';
import { examples } from './mesa-editor-fixtures.mjs';

const COOKIE = '__Host-labmattar-mesa';
const MAX_JSON = 900_000;
const MEDIA_LIMIT = 12 * 1024 * 1024;
const SESSION_LIMIT = 36 * 1024 * 1024;
const CHAPTER_SESSION_LIMIT = 72 * 1024 * 1024;
const chapterLimits = { image:8 * 1024 * 1024, video:24 * 1024 * 1024 };
const videoTypes = new Map([['video/mp4','mp4'],['video/webm','webm']]);
const DAY = 86_400;
const imageTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif']]);
const seedMedia = new Map(examples.project.gallery.map(img => [`01-aleteia/${img.file}`, img.path]));
const error = (message, status = 400) => Object.assign(new Error(message), { status });
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const safeKey = key => typeof key === 'string' && /^[\w.-]+(?:\/[\w.-]+)*$/.test(key) && !key.split('/').some(part => part === '.' || part === '..');
const text = (value, max) => typeof value === 'string' && value.length <= max;
const chapterMediaKey = /^chapter\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif|mp4|webm)$/;
const blockId = /^bloco-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const chapterLanguages = ['pt','en','es'];
const gap = value => Number.isInteger(value) && value >= 0 && value <= 192;

function matchesMedia(bytes,mime) {
  const start = (...signature) => signature.every((value,index) => bytes[index] === value);
  const tag = (at,name) => [...name].every((char,index) => bytes[at+index] === char.charCodeAt(0));
  if (mime === 'image/jpeg') return start(255,216,255);
  if (mime === 'image/png') return start(137,80,78,71,13,10,26,10);
  if (mime === 'image/webp') return tag(0,'RIFF') && tag(8,'WEBP');
  if (mime === 'image/avif') return tag(4,'ftyp') && Array.from({length:12},(_,index)=>8+index*4).some(at=>tag(at,'avif') || tag(at,'avis'));
  if (mime === 'video/mp4') return tag(4,'ftyp');
  return mime === 'video/webm' && start(26,69,223,163);
}

function byteRange(range,size) {
  if (!range) return { start:0,end:size-1 };
  const parts = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!parts || (!parts[1] && !parts[2])) return null;
  if (!parts[1]) return Number(parts[2]) > 0 ? {start:Math.max(0,size-Number(parts[2])),end:size-1} : null;
  const start = Number(parts[1]), end = parts[2] ? Math.min(size-1,Number(parts[2])) : size-1;
  return start <= end ? {start,end} : null;
}

function seed(scope) {
  if (scope === 'chapter') return structuredClone(examples.chapter);
  const { gallery, ...info } = examples.project;
  const slides = gallery.map(img => ({
    id: `aleteia/${img.file}`, file: img.file, type: 'image', alt: img.alt,
    caption_official: img.caption, caption_initialized: true, included: true,
  }));
  const category = 'JANTARES IMERSIVOS';
  return { version: 1, project_categories: [category], projects: [{
    ...info, id: 'aleteia', folder: '01-aleteia', category, active: true, cover: slides[0].file, cover_mode: 'single', slides,
  }] };
}

async function readJSON(request) {
  const reader = request.body?.getReader();
  if (!reader) throw error('Conteúdo ausente.');
  const decoder = new TextDecoder();
  let buffer = '', length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_JSON) {
      await reader.cancel();
      throw error('O documento excede o limite da prévia.', 413);
    }
    buffer += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(buffer + decoder.decode()); }
  catch { throw error('Conteúdo inválido.'); }
}

export async function routeMesa(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/mesa-api/') && !url.pathname.startsWith('/mesa-media/')) return null;
  if (!env.MESA_EDITOR) return json({ error: 'Editor de prévia indisponível.' }, 503);
  const readOnly = ['GET', 'HEAD'].includes(request.method);
  if (!readOnly && request.headers.get('origin') !== url.origin) return json({ error: 'Origem inválida.' }, 403);
  let id = request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-labmattar-mesa=([0-9a-f-]{36})(?:;|$)/)?.[1];
  const fresh = !id;
  if (fresh && (!readOnly || !['/mesa-api/chapter', '/mesa-api/portfolio/state'].includes(url.pathname))) {
    return json({ error: 'Abra o Editor para iniciar a sessão de prévia.' }, 403);
  }
  if (fresh) id = crypto.randomUUID();
  const result = await env.MESA_EDITOR.get(env.MESA_EDITOR.idFromName(id)).fetch(request);
  if (!fresh || !result.ok) return result;
  const response = new Response(result.body, result);
  response.headers.set('set-cookie', `${COOKIE}=${id}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${14 * DAY}`);
  return response;
}

export class MesaEditorSession extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS revisions (scope TEXT, rev INTEGER, body TEXT NOT NULL, saved_at TEXT NOT NULL, PRIMARY KEY(scope, rev));
      CREATE TABLE IF NOT EXISTS uploads (key TEXT PRIMARY KEY, mime TEXT, bytes INTEGER);
      CREATE TABLE IF NOT EXISTS media_chunks (key TEXT, part INTEGER, data BLOB, PRIMARY KEY(key, part));`);
  }

  latest(scope) {
    const row = this.sql.exec('SELECT rev, body, saved_at FROM revisions WHERE scope=? ORDER BY rev DESC LIMIT 1', scope).toArray()[0];
    return row ? { state: JSON.parse(row.body), etag: String(row.rev), savedAt: row.saved_at } : { state: seed(scope), etag: '0', savedAt: null };
  }

  knownMedia(folder, path) {
    return safeKey(path) && (seedMedia.has(`${folder}/${path}`) || this.sql.exec('SELECT 1 FROM uploads WHERE key=?', `${folder}/${path}`).toArray().length > 0);
  }

  validatePortfolio(state, previous, removedId) {
    if (state?.version !== 1 || !Array.isArray(state.projects) || state.projects.length < 1 || state.projects.length > 30) throw error('Catálogo inválido.');
    const ids = new Set(), slides = new Set();
    for (const p of state.projects) {
      if (!p || !/^[a-z0-9][a-z0-9-]{0,110}$/.test(p.id) || ids.has(p.id) || !safeKey(p.folder) || p.folder.includes('/') ||
          !text(p.title, 120) || !p.title.trim() || !text(p.category, 120) || !p.category.trim() || !text(p.summary, 5000) || !text(p.year, 40) ||
          !Array.isArray(p.body) || p.body.some(t => !text(t, 50_000)) || p.body.join('\n').length > 50_000 || !Array.isArray(p.slides) || p.slides.length > 200) throw error('Projeto inválido.');
      ids.add(p.id);
      const old = previous.projects.find(x => x.id === p.id);
      if (old && p.folder !== old.folder) throw error('Pasta de projeto inválida.');
      for (const slide of p.slides) {
        if (!slide || !text(slide.id, 256) || slides.has(slide.id) || !safeKey(slide.file) || !['image', 'youtube'].includes(slide.type) ||
            !text(slide.caption_official, 20_000) || typeof slide.included !== 'boolean') throw error('Slide inválido.');
        slides.add(slide.id);
        const prior = old?.slides.find(x => x.id === slide.id);
        if (prior && (prior.file !== slide.file || prior.type !== slide.type)) throw error('Referência do slide foi alterada.');
        if (slide.type === 'youtube') {
          if (!/^[\w-]{11}$/.test(slide.youtube_id || '') || slide.file !== `youtube/${slide.youtube_id}` || slide.thumbnail || slide.display_file || slide.original_file) throw error('Vídeo inválido.');
        } else if (['file', 'thumbnail', 'display_file', 'original_file'].some(k => slide[k] && !this.knownMedia(p.folder, slide[k]))) {
          throw error('Imagem não encontrada.');
        }
      }
      if (p.cover && !p.slides.some(slide => slide.file === p.cover)) throw error('Capa não encontrada na galeria.');
      if (p.cover_mode === 'sequence' && (!Array.isArray(p.cover_sequence) || new Set(p.cover_sequence).size !== p.cover_sequence.length || p.cover_sequence.length < 2 ||
          p.cover_sequence.some(file => !p.slides.some(s => s.type === 'image' && s.file === file)) || !Number.isInteger(p.cover_interval) || p.cover_interval < 2 || p.cover_interval > 30)) throw error('Sequência de capa inválida.');
    }
    if (!previous.projects.every(p => ids.has(p.id) && p.slides.every(s => s.id === removedId || slides.has(s.id)))) throw error('Use a ação de exclusão da galeria.');
  }

  validateChapter(state) {
    const original = examples.chapter.map(section => section.id);
    if (!Array.isArray(state) || state.length < original.length || state.length > 12 || state[0]?.id !== original[0]) throw error('Sequência do capítulo inválida.');
    const ids = new Set(), kept = [];
    for (const section of state) {
      const id = section?.id;
      const fixed = original.includes(id);
      if ((!fixed && !/^trecho-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) || ids.has(id)) throw error('Seção inválida.');
      ids.add(id);
      if (fixed) kept.push(id);
      if (fixed && section.blocks !== undefined) throw error('A seção original usa a edição de parágrafos.');
      if (!fixed && section.blocks !== undefined) {
        this.validateComposedSection(section);
        continue;
      }
      let filled = false;
      for (const lang of chapterLanguages) {
        const entry = section[lang];
        if (!text(entry?.title, 140) || !Array.isArray(entry.body) || entry.body.length < 1 || entry.body.length > 12 || entry.body.some(p => !text(p, 4000))) throw error('Título ou parágrafo inválido.');
        if (!fixed && !entry.title.trim() && entry.body.every(p => !p.trim())) continue;
        if (!entry.title.trim() || entry.body.some(p => !p.trim())) throw error('Preencha o título e os parágrafos da seção.');
        filled = true;
      }
      if (!filled) throw error('Preencha uma versão da nova seção antes de salvar.');
    }
    if (original.some((id,index) => id !== kept[index])) throw error('Sequência do capítulo inválida.');
  }

  validateComposedSection(section) {
    const { blocks, spacing } = section;
    if (!gap(spacing?.before) || !gap(spacing.after) || !Array.isArray(blocks) || !blocks.length || blocks.length > 12 ||
        chapterLanguages.some(code => !text(section[code]?.title,140) || !Array.isArray(section[code].body) || section[code].body.length !== 1 || section[code].body[0] !== '')) {
      throw error('Composição da seção inválida.');
    }
    const ids = new Set();
    for (const block of blocks) {
      if (!blockId.test(block?.id) || ids.has(block.id) || !gap(block.space) || !['text','image','video'].includes(block.type) ||
          chapterLanguages.some(code => !text(block.copy?.[code],block.type === 'text' ? 4000 : 240))) throw error('Bloco de conteúdo inválido.');
      ids.add(block.id);
      if (block.type !== 'video' && !chapterLanguages.some(code => block.copy[code].trim())) throw error('Preencha o texto do bloco.');
      if (block.type === 'text') {
        if (block.media !== undefined) throw error('Bloco de texto inválido.');
        continue;
      }
      const { key, name } = block.media ?? {};
      if (!chapterMediaKey.test(key) || !text(name,180) || !name.trim()) throw error('Envie o arquivo do bloco.');
      const mime = this.sql.exec('SELECT mime FROM uploads WHERE key=?',key).toArray()[0]?.mime;
      const allowed = block.type === 'image' ? imageTypes : videoTypes;
      if (!allowed.has(mime)) throw error('Arquivo do bloco indisponível nesta sessão.');
    }
    if (!chapterLanguages.some(code => section[code].title.trim() && blocks.some(block => block.type !== 'text' || block.copy[code].trim()))) {
      throw error('Preencha o título e o conteúdo em pelo menos um idioma.');
    }
  }

  commit(scope, state, etag, removedId) {
    return this.ctx.storage.transactionSync(() => {
      const previous = this.latest(scope);
      if (previous.etag !== String(etag)) throw error('Uma versão mais recente já foi salva. Exporte suas alterações ou reabra o Editor.', 409);
      if (scope === 'portfolio') this.validatePortfolio(state, previous.state, removedId);
      else this.validateChapter(state);
      const rev = Number(etag) + 1, savedAt = new Date().toISOString();
      if (scope === 'portfolio') state = { ...state, revision: rev, updated_at: savedAt };
      if (rev === 1) this.sql.exec('INSERT INTO revisions VALUES (?,0,?,?)', scope, JSON.stringify(previous.state), savedAt);
      this.sql.exec('INSERT INTO revisions VALUES (?,?,?,?)', scope, rev, JSON.stringify(state), savedAt);
      this.sql.exec('DELETE FROM revisions WHERE scope=? AND rev<?', scope, rev - 20);
      return { state, etag: String(rev), savedAt };
    });
  }

  history(scope) {
    return this.sql.exec('SELECT rev AS revision, saved_at AS created_at FROM revisions WHERE scope=? AND rev<(SELECT MAX(rev) FROM revisions WHERE scope=?) ORDER BY rev DESC', scope, scope)
      .toArray().map(row => ({ ...row, created_by: 'Editor da prévia' }));
  }

  restore(scope, revision, etag) {
    const entry = this.sql.exec('SELECT body FROM revisions WHERE scope=? AND rev=?', scope, Number(revision)).toArray()[0];
    if (!entry) throw error('Versão não encontrada.', 404);
    const state = JSON.parse(entry.body);
    if (scope === 'portfolio') {
      for (const liveProject of this.latest(scope).state.projects) {
        const project = state.projects.find(item => item.id === liveProject.id);
        if (!project) state.projects.push(liveProject);
        else for (const slide of liveProject.slides) if (!project.slides.some(s => s.id === slide.id)) project.slides.push(slide);
      }
    }
    return this.commit(scope, state, etag);
  }

  async upload(request, projectId) {
    const p = this.latest('portfolio').state.projects.find(project => project.id === projectId);
    const size = Number(request.headers.get('content-length'));
    if (!p || size < 1 || size > MEDIA_LIMIT + 65_536) throw error('Escolha um projeto e uma imagem de até 12 MB na prévia.', 413);
    const data = await request.formData();
    const original = data.get('original'), optimized = data.get('optimized'), thumbnail = data.get('thumbnail');
    if (!(original instanceof File) || !imageTypes.has(original.type) || !(optimized instanceof File) || optimized.type !== 'image/webp' ||
      !(thumbnail instanceof File) || thumbnail.type !== 'image/webp' || !original.size || !optimized.size || !thumbnail.size ||
      original.size + optimized.size + thumbnail.size > MEDIA_LIMIT) throw error('Envie uma imagem JPG, PNG, WebP ou AVIF de até 12 MB com as variantes.');
    const id = crypto.randomUUID();
    const file = `adicionadas/${id}.webp`, mini = `adicionadas/${id}-mini.webp`, source = `adicionadas/${id}.${imageTypes.get(original.type)}`;
    const files = [[file, optimized], [mini, thumbnail], [`originais/${source}`, original]];
    const buffers = await Promise.all(files.map(async ([path, blob]) => ({ path, mime: blob.type, bytes: await blob.arrayBuffer() })));
    this.storeMedia(buffers.map(item => ({...item,key:`${p.folder}/${item.path}`})),false);
    return json({ slide: { id: `${p.id}/${file}`, type: 'image', file, thumbnail: mini, original_file: `originais/${source}`,
      original_name: original.name, width: Number(data.get('width')), height: Number(data.get('height')), bytes_original: original.size, bytes_optimized: optimized.size,
      caption_official: '', caption_initialized: true, included: true, alt: '' }, duplicate: false });
  }

  storeMedia(files,chapter) {
    this.ctx.storage.transactionSync(() => {
      const limit = chapter ? CHAPTER_SESSION_LIMIT : SESSION_LIMIT;
      const used = this.sql.exec('SELECT coalesce(SUM(bytes),0) AS total FROM uploads WHERE (key LIKE ?) = ?', 'chapter/%', Number(chapter)).toArray()[0].total;
      if (used + files.reduce((sum, file) => sum + file.bytes.byteLength,0) > limit) throw error(chapter ? 'Esta sessão atingiu o limite de mídia do capítulo (72 MB).' : 'Esta sessão atingiu o limite de imagens.',413);
      for (const { key, mime, bytes } of files) {
        this.sql.exec('INSERT INTO uploads VALUES (?,?,?)',key,mime,bytes.byteLength);
        for (let offset = 0; offset < bytes.byteLength; offset += 400_000) this.sql.exec('INSERT INTO media_chunks VALUES (?,?,?)',key,offset,bytes.slice(offset,offset+400_000));
      }
    });
  }

  async uploadChapter(request,type) {
    const mime = request.headers.get('content-type');
    const extension = type === 'image' ? imageTypes.get(mime) : type === 'video' ? videoTypes.get(mime) : null;
    if (!extension) throw error('Formato de mídia inválido.',415);
    const limit = chapterLimits[type], size = Number(request.headers.get('content-length'));
    if (!Number.isSafeInteger(size) || size < 1 || size > limit) throw error('O arquivo está vazio ou excede o limite do bloco.',413);
    const reader = request.body?.getReader();
    if (!reader) throw error('Arquivo ausente.');
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > bytes.length) {
        await reader.cancel();
        throw error('Tamanho do arquivo inválido.',413);
      }
      bytes.set(value,offset);
      offset += value.byteLength;
    }
    if (offset !== bytes.length || !matchesMedia(bytes,mime)) throw error('O arquivo não corresponde ao formato selecionado.',415);
    const key = 'chapter/'+crypto.randomUUID()+'.'+extension;
    this.storeMedia([{key,mime,bytes:bytes.buffer}],true);
    return json({key},201);
  }

  async media(request, key) {
    if (!safeKey(key)) throw error('Arquivo inválido.');
    const publicPath = seedMedia.get(key);
    const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    if (publicPath) {
      const response = await fetch(new URL(publicPath, 'https://labmattar.com'), { method: request.method, redirect: 'follow' });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw error('Imagem pública indisponível.', 404);
      headers.set('Content-Type', response.headers.get('content-type'));
      return new Response(response.body, { headers });
    }
    const item = this.sql.exec('SELECT mime, bytes FROM uploads WHERE key=?', key).toArray()[0];
    if (!item) throw error('Arquivo não encontrado.', 404);
    headers.set('Content-Type', item.mime);
    const seekable = chapterMediaKey.test(key);
    const range = seekable ? request.headers.get('range') : null;
    const position = byteRange(range,item.bytes);
    if (seekable) headers.set('Accept-Ranges','bytes');
    if (!position) {
      headers.set('Content-Range',`bytes */${item.bytes}`);
      return new Response(null,{status:416,headers});
    }
    if (range) headers.set('Content-Range',`bytes ${position.start}-${position.end}/${item.bytes}`);
    headers.set('Content-Length',String(position.end-position.start+1));
    const sql = this.sql;
    let offset = position.start;
    const body = request.method === 'HEAD' ? null : new ReadableStream({ pull(controller) {
      if (offset > position.end) { controller.close(); return; }
      const chunk = sql.exec('SELECT part, data FROM media_chunks WHERE key=? AND part<=? ORDER BY part DESC LIMIT 1',key,offset).toArray()[0];
      if (!chunk) { controller.close(); return; }
      const bytes = new Uint8Array(chunk.data).subarray(offset-chunk.part,position.end-chunk.part+1);
      controller.enqueue(bytes);
      offset += bytes.length;
    } });
    return new Response(body,{status:range ? 206 : 200,headers});
  }

  async fetch(request) {
    const url = new URL(request.url), path = url.pathname, method = request.method;
    try {
      if (path.startsWith('/mesa-media/') && ['GET', 'HEAD'].includes(method)) return await this.media(request, decodeURIComponent(path.slice('/mesa-media/'.length)));
      if (path === '/mesa-api/chapter' && method === 'GET') return json(this.latest('chapter'));
      if (path === '/mesa-api/chapter/upload' && method === 'POST') return await this.uploadChapter(request,url.searchParams.get('type'));
      if (path === '/mesa-api/chapter' && method === 'POST') {
        const { state, etag } = await readJSON(request);
        return json(this.commit('chapter', state, etag));
      }
      if (!path.startsWith('/mesa-api/portfolio/')) throw error('Rota não encontrada.', 404);
      const action = path.slice('/mesa-api/portfolio/'.length), scope = 'portfolio';
      if (action === 'state' && method === 'GET') return json(this.latest(scope));
      if (action === 'me' && method === 'GET') return json({ role: 'editor', email: 'Sessão de teste' });
      if (action === 'history' && method === 'GET') return json({ versions: this.history(scope) });
      if (action === 'backup' && method === 'GET') return json({ ...this.latest(scope), history: this.history(scope) });
      if (action === 'upload' && method === 'POST') return await this.upload(request, url.searchParams.get('project'));
      if (method !== 'POST') throw error('Rota não encontrada.', 404);
      const body = await readJSON(request);
      if (action === 'state') return json(this.commit(scope, body.state, body.etag));
      if (action === 'history/restore') return json(this.restore(scope, body.revision, body.etag));
      if (action === 'projects') {
        const title = String(body.title || '').trim(), category = String(body.category || '');
        if (!text(title, 120) || !title || !body.state?.projects?.some(p => p.category === category)) throw error('Informe o nome e a categoria.');
        if (body.state.projects.some(p => p.title.toLowerCase() === title.toLowerCase())) throw error('Já existe um projeto com esse nome.');
        const id = `projeto-${crypto.randomUUID()}`;
        const project = { id, title, category, folder: id, cover: '', summary: '', body: [], year: '', slides: [], active: true };
        body.state.projects.splice(body.state.projects.findLastIndex(p => p.category === category) + 1, 0, project);
        return json({ ...this.commit(scope, body.state, body.etag), project });
      }
      if (action === 'slides/delete') {
        const p = body.state?.projects?.find(project => project.id === body.projectId);
        const slide = p?.slides?.find(item => item.id === body.slideId);
        if (!slide) throw error('Item não encontrado.', 404);
        p.slides = p.slides.filter(item => item !== slide);
        if (p.cover === slide.file) p.cover = '';
        p.cover_sequence = p.cover_sequence?.filter(file => file !== slide.file);
        if (p.cover_mode === 'sequence' && p.cover_sequence?.length < 2) p.cover_mode = 'single';
        if (p.cover_mode === 'sequence') p.cover = p.cover_sequence[0];
        return json(this.commit(scope, body.state, body.etag, slide.id));
      }
      throw error('Rota não encontrada.', 404);
    } catch (exception) {
      return json({ error: exception.status ? exception.message : 'Não foi possível concluir a operação na prévia.' }, exception.status || 500);
    }
  }
}
