import { r as interop } from '/assets/rolldown-runtime-S-ySWqyJ.js';
import { i as loadReact } from '/assets/framework-CXnKph_e.js';
import { getLanguage, setLanguage } from '/assets/i18n.js';
import { languages, upgradeChapter } from './chapter-blocks.mjs';

const React = interop(loadReact(),1);
const sectionIds = new Map([
  ['abertura', { page:'cap3-proposta', anchor:'proposta' }],
  ['obras-comissionadas', { page:'cap3-obras-comissionadas', anchor:'obras-comissionadas' }],
  ['processo-criativo', { page:'cap3-processo-criativo', anchor:'processo-criativo' }],
]);
const editorIds = new Map([...sectionIds].map(([id,{anchor}]) => [anchor,id]));
const extraId = /^trecho-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const origin = location.origin;
const isEditorFrame = window.parent !== window && new URLSearchParams(location.search).get('mesa') === '1';

function chapterContent(sections,lang) {
  const pages = {}, order = [], extra = {};
  for (const section of sections) {
    const original = sectionIds.get(section.id), copy = section[lang];
    if (typeof copy?.title !== 'string' || !Array.isArray(copy.body) || !copy.body.every(p => typeof p === 'string')) continue;
    if (original) {
      pages[original.page] = { title:copy.title, summary:copy.body[0] ?? '', body:copy.body.slice(1) };
      order.push(original.anchor);
    } else if (extraId.test(section.id) && Array.isArray(section.blocks)) {
      const blocks = section.blocks.filter(block => isEditorFrame || (block.type === 'text' ? block.copy[lang].trim() : block.media)).map(block => ({
        id:block.id, type:block.type, space:block.space, media:block.media,
        text:block.copy[lang].trim() || (block.type === 'text' ? '' : Object.values(block.copy).find(value => value.trim())),
      }));
      if (isEditorFrame || (copy.title.trim() && blocks.length)) {
        extra[section.id] = { title:copy.title.trim() || 'Nova seção', spacing:section.spacing, blocks };
        order.push(section.id);
      }
    }
  }
  return { pages, order, extra };
}

function renderBlock(block) {
  const shared = { className:'chapter3-block', 'data-block-id':block.id, key:block.id, style:{'--block-gap':block.space+'px'} };
  if (block.type === 'text') return React.createElement('div',shared,
    React.createElement('p',{ key:block.text, className:block.text ? undefined : 'chapter3-text-empty' },block.text));
  const isImage = block.type === 'image';
  const name = isImage ? 'Editar imagem' : 'Editar vídeo';
  const src = block.media && '/mesa-media/'+block.media.key;
  const media = src && (isImage
    ? React.createElement('img',{src,alt:block.text || '',decoding:'async','data-edit-block':isEditorFrame ? name : undefined})
    : React.createElement('video',{src,controls:true,playsInline:true,preload:'metadata','aria-label':block.text || block.media.name}));
  return React.createElement('figure',{ ...shared, className:shared.className+' chapter3-media' },
    media || React.createElement('div',{ className:'chapter3-media-empty', 'data-placeholder':isImage ? 'Envie uma imagem' : 'Envie um vídeo' }),
    isEditorFrame && React.createElement('button',{ type:'button', className:'chapter3-edit-media', 'data-edit-block':name, 'aria-label':name, title:name }));
}

export function withChapterSections(content, originals) {
  if (!content?.order?.length) return originals;
  const original = new Map(originals.map(el => [el.props.id,el]));
  return content.order.map(id => {
    if (original.has(id)) return original.get(id);
    const { title, spacing, blocks } = content.extra[id];
    const style = {'--section-leading':spacing.before+'px','--section-trailing':spacing.after+'px'};
    return React.createElement('section',{ id, key:id, className:'story-panel chapter5-process chapter3-section', 'data-nav-title':title, style },
      React.createElement('div',{ className:'chapter5-copy chapter5-reading chapter3-scramble chapter3-composed' },
        React.createElement('h2',{key:title},title),blocks.map(renderBlock)));
  });
}

function linkEditor(apply) {
  const story = document.querySelector('.chapter3-shell .story');
  if (!story) return () => {};
  const editable = '.chapter5-copy > :is(h1,h2,p), .chapter3-block > p, [data-edit-block]';
  const report = (type,data) => window.parent.postMessage({type,...data},origin);
  const style = document.createElement('style');
  style.textContent = `
    .chapter3-shell :is(${editable}) { cursor:text; outline-offset:5px; }
    .chapter3-shell [data-edit-block] { cursor:pointer; }
    .chapter3-shell :is(${editable}):is(:hover,:focus-visible) { outline:1px dashed #fff9; }
  `;
  document.head.append(style);
  let visible, pendingSeek, pendingReveal, scheduled, settingLanguage = 0;

  function applyDraft(sections,language) {
    settingLanguage++;
    const settled = () => { settingLanguage--; };
    apply(sections,language).then(settled,settled);
  }

  function languageChanged(event) {
    if (!settingLanguage) report('mesa:chapter-language',{language:event.detail?.language});
  }

  function checkPosition() {
    scheduled = undefined;
    if (pendingSeek) {
      const { anchor, request } = pendingSeek;
      const section = document.getElementById(anchor);
      const copy = section?.querySelector('.chapter5-copy');
      if (!copy) return;
      pendingSeek = undefined;
      const top = scrollY + section.getBoundingClientRect().top + copy.offsetTop - innerHeight * .26;
      window.scrollTo({top,behavior:'instant'});
      report('mesa:chapter-positioned',{request});
    }
    const line = innerHeight * .42;
    const section = [...story.children].find(panel => {
      const rect = panel.getBoundingClientRect();
      return rect.top <= line && rect.bottom > line;
    });
    const id = editorIds.get(section?.id) ?? section?.id;
    if (id && id !== visible) {
      visible = id;
      report('mesa:chapter-visible',{section:id});
    }
  }

  function schedule() {
    if (scheduled === undefined) scheduled = requestAnimationFrame(checkPosition);
  }

  function refreshTargets() {
    for (const el of story.querySelectorAll(editable)) {
      if (!el.hasAttribute('tabindex') && !el.matches('button')) {
        el.tabIndex = 0;
        el.title = el.dataset.editBlock ?? (el.matches('p') ? 'Editar parágrafo' : 'Editar título');
      }
    }
    if (pendingReveal) {
      const { anchor, field } = pendingReveal;
      const panel = document.getElementById(anchor);
      const block = typeof field === 'string' ? [...(panel?.querySelectorAll('[data-block-id]') ?? [])].find(item => item.dataset.blockId === field) : panel?.querySelectorAll('.chapter5-copy > p')[field];
      if (block && (typeof field === 'string' || block.textContent.trim())) {
        pendingReveal = undefined;
        const rect = block.getBoundingClientRect();
        if (rect.top < innerHeight * .14 || rect.top > innerHeight * .63) {
          window.scrollTo({top:scrollY+rect.top-innerHeight*.29,behavior:'instant'});
        }
      }
    }
    schedule();
  }

  function receive(event) {
    if (event.origin !== origin || event.source !== window.parent || !event.data) return;
    if (event.data.type === 'mesa:chapter-draft') applyDraft(event.data.sections,event.data.language);
    if (['mesa:chapter-seek','mesa:chapter-reveal'].includes(event.data.type)) {
      const id = event.data.section;
      const anchor = sectionIds.get(id)?.anchor ?? (extraId.test(id) ? id : null);
      if (!anchor) return;
      if (event.data.type === 'mesa:chapter-reveal') { pendingReveal = {anchor,field:event.data.field}; refreshTargets(); }
      else { pendingReveal = undefined; pendingSeek = {anchor,request:event.data.request}; schedule(); }
    }
  }

  function activate(event) {
    if (event.key === 'Escape') report('mesa:chapter-dismiss');
    const keyboard = event.type === 'keydown';
    if (keyboard && !['Enter',' '].includes(event.key)) return;
    const target = event.target instanceof Element ? event.target : null;
    const copy = target?.closest(editable);
    if (copy && story.contains(copy) && (keyboard || !getSelection()?.toString())) {
      event.preventDefault();
      const anchor = copy.closest('.story-panel').id;
      const section = editorIds.get(anchor) ?? anchor;
      const block = copy.closest('[data-block-id]');
      const field = block?.dataset.blockId ?? (copy.matches('p') ? [...copy.parentElement.children].filter(el => el.matches('p')).indexOf(copy) : 'title');
      report('mesa:chapter-edit',{section,field});
      return;
    }
    const link = target?.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href,location.href);
    if (url.origin !== origin || !['/capitulo-3','/capitulo-3/'].includes(url.pathname)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  window.addEventListener('message',receive);
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('mattar:language-changed',languageChanged);
  document.addEventListener('click',activate,true);
  document.addEventListener('keydown',activate,true);
  const changes = new MutationObserver(refreshTargets);
  changes.observe(story,{childList:true,subtree:true});
  refreshTargets();
  report('mesa:chapter-ready');
  return () => {
    window.removeEventListener('message',receive);
    window.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',schedule);
    window.removeEventListener('mattar:language-changed',languageChanged);
    document.removeEventListener('click',activate,true);
    document.removeEventListener('keydown',activate,true);
    changes.disconnect();
    cancelAnimationFrame(scheduled);
    style.remove();
  };
}

export function useChapterDraft() {
  const [content,setContent] = React.useState(null);
  React.useEffect(() => {
    let active = true, last = '', pending = Promise.resolve();
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = '/mesa-editor/chapter-content.css';
    document.head.append(styles);
    const stop = () => { active = false; styles.remove(); };
    function apply(sections,lang) {
      if (!languages.includes(lang) || !Array.isArray(sections)) return Promise.resolve();
      pending = pending.catch(() => {}).then(async () => {
        if (!active) return;
        if (getLanguage() !== lang) await setLanguage(lang);
        if (!active) return;
        const next = chapterContent(upgradeChapter(sections),lang);
        const snapshot = JSON.stringify(next);
        if (snapshot !== last) {
          last = snapshot;
          setContent(next);
        }
      });
      return pending;
    }
    if (isEditorFrame) {
      const cleanup = linkEditor(apply);
      return () => { stop(); cleanup(); };
    }
    let saved;
    const syncLanguage = () => { if (saved) apply(saved,getLanguage()); };
    window.addEventListener('mattar:language-changed',syncLanguage);
    fetch('/mesa-api/chapter',{cache:'no-store'}).then(res => res.ok ? res.json() : null).then(value => {
      if (!active || !value) return;
      saved = value.state;
      apply(saved,getLanguage());
    }).catch(() => {});
    return () => { stop(); window.removeEventListener('mattar:language-changed',syncLanguage); };
  },[]);
  return content;
}
