/* Original endpoints + native Bezier normalization. No polygon sampling or fetch race. */
(function () {
  'use strict';
  const root = document.querySelector('.state-explorer');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const group = $('#state-morph-paths');
  const path = group.querySelector('path');
  const svg = $('#state-morph-svg');
  const range = $('#state-progress');
  const output = $('#state-progress-value');
  const play = $('#state-play');
  const reset = $('#state-reset');
  const name = $('#state-name');
  const targetName = $('#state-target');
  const buttons = [...root.querySelectorAll('[data-state]')];
  const controls = [...root.querySelectorAll('button,input')];
  let selected = 0, progress = 0, frame = 0, playing = false;
  let engine, assets;
  const pairs = new Map();

  function asset(node) {
    if (!node) throw new Error('Official SVG missing');
    const box = (node.getAttribute('viewBox') || node.getAttribute('viewbox')).trim().split(/[ ,]+/).map(Number);
    const d = [...node.querySelectorAll('path')].map(p => p.getAttribute('d')).join(' ');
    if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0 || !d) throw new Error('Invalid official SVG');
    const scale = Math.min(500 / box[2], 380 / box[3]);
    const x = (600 - box[2] * scale) / 2 - box[0] * scale;
    const y = (460 - box[3] * scale) / 2 - box[1] * scale;
    const raw = engine.stringToRawPath(d);
    for (const contour of raw) for (let i = 0; i < contour.length; i += 2) {
      contour[i] = contour[i] * scale + x;
      contour[i + 1] = contour[i + 1] * scale + y;
    }
    return {d, transform: `translate(${x} ${y}) scale(${scale})`, normalized: engine.rawPathToString(raw)};
  }

  function pair(n) {
    if (pairs.has(n)) return pairs.get(n);
    const strings = engine.normalizeStrings(assets[0].normalized, assets[n].normalized, {shapeIndex: 'auto', map: 'size'});
    const a = engine.stringToRawPath(strings[0]), b = engine.stringToRawPath(strings[1]);
    if (a.length !== b.length || a.some((c, i) => c.length !== b[i].length)) throw new Error('Incompatible Bezier contours');
    const work = a.map(c => { const clone = c.slice(); clone.closed = c.closed; return clone; });
    const result = {a, b, work}; pairs.set(n, result); return result;
  }

  function draw(t) {
    progress = Math.max(0, Math.min(1, t));
    if (progress === 0 || progress === 1 || selected === 0) {
      const shape = assets[progress === 1 ? selected : 0];
      group.setAttribute('transform', shape.transform);
      path.setAttribute('d', shape.d);
    } else {
      const {a, b, work} = pair(selected);
      for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) work[i][j] = a[i][j] + (b[i][j] - a[i][j]) * progress;
      group.removeAttribute('transform');
      path.setAttribute('d', engine.rawPathToString(work));
    }
    const percent = Math.round(progress * 100);
    range.value = String(percent); output.value = percent + '%';
    range.setAttribute('aria-valuetext', percent + '% da transforma\u00e7\u00e3o');
    root.dataset.progress = String(percent);
  }

  function stop() {
    cancelAnimationFrame(frame); frame = 0; playing = false;
    play.textContent = 'Reproduzir'; play.setAttribute('aria-pressed', 'false');
  }

  function select(n, t = n ? 1 : 0) {
    stop();
    selected = n;
    if (n) pair(n);
    const label = n ? 'VASO ' + String(n).padStart(2, '0') : 'S\u00cdMBOLO MASTER';
    name.textContent = n ? 'M \u2192 ' + label : 'M / ' + label;
    targetName.textContent = n ? label : 'Escolha um vaso';
    svg.setAttribute('aria-label', n ? 'Transforma\u00e7\u00e3o entre M e ' + label : 'S\u00edmbolo master M');
    root.dataset.target = String(n);
    buttons.forEach(button => {
      const active = Number(button.dataset.state) === n;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    draw(t);
  }

  function fail(error) {
    stop(); root.dataset.ready = 'error';
    controls.forEach(control => { control.disabled = true; });
    $('#state-help').textContent = 'N\u00e3o foi poss\u00edvel iniciar a transforma\u00e7\u00e3o. Os vetores originais continuam dispon\u00edveis acima; a matriz vetorial est\u00e1 na se\u00e7\u00e3o Ferramenta.';
    console.error('LABMATTAR symbols:', error);
  }
  const safe = fn => (...args) => { try { fn(...args); } catch (error) { fail(error); } };

  try {
    engine = window.MorphSVGPlugin;
    if (!engine?.normalizeStrings) throw new Error('Native morph engine unavailable');
    assets = [document.querySelector('#estrutura .art-zone.m svg'), ...document.querySelectorAll('#vasos .vase .art svg')].map(asset);
    if (assets.length !== 10) throw new Error('Expected M and nine original vessels');
    buttons.forEach(button => button.addEventListener('click', safe(() => select(Number(button.dataset.state)))));
    range.addEventListener('input', safe(() => { const value = Number(range.value) / 100; stop(); if (!selected) select(1, 0); draw(value); }));
    reset.addEventListener('click', safe(() => { stop(); draw(0); }));
    play.addEventListener('click', safe(() => {
      if (playing) { stop(); return; }
      if (!selected) select(1, 0);
      if (progress >= 1) draw(0);
      playing = true; play.textContent = 'Pausar'; play.setAttribute('aria-pressed', 'true');
      const start = performance.now(), from = progress;
      function tick(now) {
        if (!playing) return;
        try { draw(from + (now - start) / 2600); if (progress >= 1) stop(); else frame = requestAnimationFrame(tick); }
        catch (error) { fail(error); }
      }
      frame = requestAnimationFrame(tick);
    }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    select(0); controls.forEach(control => { control.disabled = false; }); root.dataset.ready = 'true';
  } catch (error) { fail(error); }

  const nav = document.querySelector('.lm-site-nav'), header = document.querySelector('header.top');
  function fitLayout() {
    document.documentElement.style.setProperty('--manual-nav-height', (nav?.getBoundingClientRect().height || 0) + 'px');
    document.documentElement.style.setProperty('--manual-header-height', (header?.getBoundingClientRect().height || 0) + 'px');
    for (const title of document.querySelectorAll('.title')) {
      title.style.removeProperty('font-size');
      const width = title.getBoundingClientRect().width - 2;
      const size = parseFloat(getComputedStyle(title).fontSize);
      const measured = [...title.querySelectorAll('.line')].map(line => { const r = document.createRange(); r.selectNodeContents(line); return r.getBoundingClientRect().width; });
      const widest = Math.max(0, ...measured);
      if (widest > width && width > 0) title.style.fontSize = (size * width / widest) + 'px';
    }
  }
  let layoutFrame = 0;
  const scheduleLayout = () => { cancelAnimationFrame(layoutFrame); layoutFrame = requestAnimationFrame(fitLayout); };
  window.addEventListener('resize', scheduleLayout, {passive:true});
  document.fonts?.ready.then(scheduleLayout);
  const observer = new ResizeObserver(scheduleLayout);
  if (nav) observer.observe(nav); if (header) observer.observe(header);
  scheduleLayout();
})();
