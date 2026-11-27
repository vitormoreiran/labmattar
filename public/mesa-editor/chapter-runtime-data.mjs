import { r as interop } from '/assets/rolldown-runtime-S-ySWqyJ.js';
import { i as loadReact } from '/assets/framework-CXnKph_e.js';
import { getLanguage, setLanguage } from '/assets/i18n.js';

const React = interop(loadReact(),1);
const sectionIds = new Map([
  ['abertura', { page:'cap3-proposta', anchor:'proposta' }],
  ['obras-comissionadas', { page:'cap3-obras-comissionadas', anchor:'obras-comissionadas' }],
  ['processo-criativo', { page:'cap3-processo-criativo', anchor:'processo-criativo' }],
]);
const languages = new Set(['pt','en','es']);
const origin = location.origin;
const isEditorFrame = window.parent !== window && new URLSearchParams(location.search).get('mesa') === '1';

function chapterContent(sections,lang) {
  const pages = {};
  for (const section of sections) {
    const key = sectionIds.get(section.id)?.page, copy = section[lang];
    if (!key || typeof copy?.title !== 'string' || !Array.isArray(copy.body) || !copy.body.every(p => typeof p === 'string')) continue;
    pages[key] = { title:copy.title, summary:copy.body[0] || '', body:copy.body.slice(1) };
  }
  return { pages };
}

export function useChapterDraft() {
  const [content,setContent] = React.useState(null);
  React.useEffect(()=>{
    let active = true, last = '', pending = Promise.resolve();
    function apply(sections,lang) {
      if (!languages.has(lang) || !Array.isArray(sections)) return;
      pending = pending.catch(()=>{}).then(async()=>{
        if (!active) return;
        if (getLanguage() !== lang) await setLanguage(lang);
        if (!active) return;
        const next = chapterContent(sections,lang);
        const snapshot = JSON.stringify(next);
        if (snapshot !== last) {
          last = snapshot;
          setContent(next);
        }
      });
    }
    function message(event) {
      if (event.origin !== origin || event.source !== window.parent || !event.data) return;
      if (event.data.type === 'mesa:chapter-draft') apply(event.data.sections,event.data.language);
      if (event.data.type === 'mesa:chapter-seek') {
        const id = sectionIds.get(event.data.section)?.anchor;
        if (id) document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});
      }
    }
    function keepChapter(event) {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      const target = new URL(anchor.href,location.href);
      if (target.origin !== origin || !['/capitulo-3','/capitulo-3/'].includes(target.pathname)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    if (isEditorFrame) {
      window.addEventListener('message',message);
      document.addEventListener('click',keepChapter,true);
      window.parent.postMessage({type:'mesa:chapter-ready'},origin);
    } else {
      let saved;
      const syncLanguage = () => { if (saved) apply(saved,getLanguage()); };
      window.addEventListener('mattar:language-changed',syncLanguage);
      fetch('/mesa-api/chapter',{cache:'no-store'}).then(res => res.ok ? res.json() : null).then(value=>{
        if (!active || !value) return;
        saved = value.state;
        apply(saved,getLanguage());
      }).catch(()=>{});
      return ()=>{ active=false; window.removeEventListener('mattar:language-changed',syncLanguage); };
    }
    return ()=>{
      active=false;
      window.removeEventListener('message',message);
      document.removeEventListener('click',keepChapter,true);
    };
  },[]);
  return content;
}
