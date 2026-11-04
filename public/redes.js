/* Comparação editorial: a mesma coleção, duas sequências.
   Sem alterações nas imagens, SVGs ou regras de composição da identidade. */
(() => {
  'use strict';
  function init() {
    const grid = document.getElementById('lmSocialFeedGrid');
    const status = document.getElementById('lmSocialFeedStatus');
    const buttons = [...document.querySelectorAll('[data-feed-mode]')];
    if (!grid || !status || buttons.length !== 2) return;

    const pieces = new Map([...grid.children].map((element) => [element.dataset.tile, element]));
    const sequences = {
      alternado: ['a','b','c','d','e','f','g','h','i'],
      agrupado: ['a','c','d','e','g','h','b','f','i']
    };
    const descriptions = {
      alternado: 'ALTERNADO / INTERCALA REGISTROS, DETALHES E INFORMAÇÃO.',
      agrupado: 'AGRUPADO / APROXIMA OS REGISTROS E RESERVA O FINAL PARA INFORMAÇÃO.'
    };

    function show(mode) {
      if (!Object.hasOwn(sequences, mode)) return;
      for (const key of sequences[mode]) {
        const tile = pieces.get(key);
        if (tile) grid.appendChild(tile);
      }
      buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.feedMode === mode));
      });
      status.textContent = descriptions[mode];
      grid.dataset.mode = mode;
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => show(button.dataset.feedMode));
    });
    show('alternado');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
