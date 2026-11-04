/* Fit title lines within their own boxes without changing text nodes or animation state. */
const TITLE_SELECTOR = 'main h1,main h2,main h3,article h1,article h2,article h3,.section h1,.section h2,.section h3';
let timer;
const titleTimers = new WeakMap();
const observedParents = new WeakSet();
const parentObserver = 'ResizeObserver' in window ? new ResizeObserver(scheduleFit) : null;

function fitTitle(title) {
  if (!title.isConnected || !title.getClientRects().length) return;
  title.style.removeProperty('font-size');
  const baseline = parseFloat(getComputedStyle(title).fontSize);
  if (!Number.isFinite(baseline) || baseline < 30) return;
  const lines = [title, ...title.querySelectorAll('span,em,strong')].filter((node) => node.getClientRects().length);
  title.classList.remove('type-needs-wrap');
  if (lines.some((line) => line.clientWidth > 0 && line.scrollWidth > line.clientWidth + 2)) {
    title.classList.add('type-needs-wrap');
  }
  for (let pass = 0; pass < 5; pass += 1) {
    let ratio = 1;
    for (const line of lines) {
      if (line.clientWidth > 0 && line.scrollWidth > line.clientWidth + 2) {
        ratio = Math.min(ratio, (line.clientWidth - 3) / line.scrollWidth);
      }
    }
    if (ratio >= 1) break;
    const current = parseFloat(getComputedStyle(title).fontSize);
    title.style.setProperty('font-size', `${Math.max(20, current * ratio * 0.98)}px`, 'important');
  }
}

function fitAllTitles() {
  document.querySelectorAll(TITLE_SELECTOR).forEach((title) => {
    const parent = title.parentElement;
    if (parentObserver && parent && !observedParents.has(parent)) {
      observedParents.add(parent);
      parentObserver.observe(parent);
    }
    fitTitle(title);
  });
}

function scheduleFit() {
  if (timer) return;
  timer = setTimeout(() => { timer = 0; fitAllTitles(); }, 90);
}

addEventListener('resize', scheduleFit, { passive: true });
addEventListener('pageshow', scheduleFit);
addEventListener('popstate', scheduleFit);
addEventListener('mattar:hydrated', scheduleFit);
document.fonts?.ready.then(scheduleFit);
setTimeout(scheduleFit, 250);
setTimeout(scheduleFit, 750);
setTimeout(scheduleFit, 1200);
new MutationObserver((records) => {
  if (records.some((record) => record.type === 'childList')) scheduleFit();
  for (const record of records) {
    if (record.type !== 'characterData') continue;
    const title = record.target.parentElement?.closest(TITLE_SELECTOR);
    if (!title) continue;
    clearTimeout(titleTimers.get(title));
    titleTimers.set(title, setTimeout(() => fitTitle(title), 250));
  }
}).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleFit, { once: true });
else scheduleFit();
