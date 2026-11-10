// Switching tools opens a separate tab, preserving the current editor/draft.
export const LABORATORY_TOOLS = Object.freeze([
  { id: 'matrix', label: 'Matriz Vetorial', href: '/motion/matriz/index.html', description: 'Geometria e movimento' },
  { id: 'composition', label: 'Composição', href: '/compor.html?studio=1&workspace=pages#laboratorio', description: 'Páginas e apresentações' },
  { id: 'email', label: 'Cartão MATTAR', href: '/assinatura-email.html?origem=laboratorio', description: 'Assinatura de e-mail e contato' }
]);
let toolMenuCount = 0;

export function installToolNavigation(root = document) {
  if (typeof HTMLElement.prototype.showPopover !== 'function') return;
  for (const host of root.querySelectorAll('[data-lab-tools]')) {
    if (host.dataset.ready === 'true') continue;
    const current = host.dataset.currentTool;
    const id = 'lab-tools-' + current + '-' + (++toolMenuCount);
    const popup = document.createElement('nav');
    popup.id = id; popup.className = 'lab-tools-popover';
    popup.setAttribute('popover', 'auto'); popup.setAttribute('aria-label', 'Ferramentas do Laboratório');
    const heading = document.createElement('p'); heading.className = 'lab-tools-heading';
    heading.textContent = 'LABORATÓRIO / FERRAMENTAS'; popup.append(heading);
    for (const tool of LABORATORY_TOOLS) {
      const anchor = document.createElement('a'); anchor.href = tool.href;
      const title = document.createElement('span'); title.className = 'lab-tools-title'; title.textContent = tool.label;
      const detail = document.createElement('span'); detail.className = 'lab-tools-description'; detail.textContent = tool.description;
      anchor.append(title, detail);
      if (tool.id === current) {
        anchor.setAttribute('aria-current', 'page');
        anchor.addEventListener('click', event => { event.preventDefault(); popup.hidePopover(); button.focus(); });
      } else {
        anchor.target = '_blank'; anchor.rel = 'noopener';
        anchor.title = 'Abrir ' + tool.label + ' em outra aba';
        anchor.addEventListener('click', () => popup.hidePopover());
      }
      if (tool.status) {
        const status = document.createElement('span'); status.className = 'lab-tools-status'; status.textContent = tool.status;
        anchor.append(status);
      }
      popup.append(anchor);
    }
    const home = document.createElement('a'); home.className = 'lab-tools-home';
    home.href = '/laboratorio.html#ferramentas'; home.target = '_blank'; home.rel = 'noopener';
    home.textContent = 'VER TODAS AS FERRAMENTAS ↗'; home.addEventListener('click', () => popup.hidePopover());
    popup.append(home);
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('popovertarget', id); button.setAttribute('aria-controls', id);
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-label', 'Ferramentas do Laboratório');
    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h5v5H1zM10 1h5v5h-5zM1 10h5v5H1zM10 10h5v5h-5z" fill="none" stroke="currentColor"/></svg><span class="lab-tools-label">FERRAMENTAS</span>';
    function position() {
      const bounds = button.getBoundingClientRect();
      const width = Math.min(320, innerWidth - 24);
      const height = popup.matches(':popover-open') ? popup.getBoundingClientRect().height : Math.min(340, innerHeight - 80);
      const below = bounds.bottom + 8;
      const preferred = below + height <= innerHeight - 12 ? below : bounds.top - height - 8;
      popup.style.left = Math.max(12, Math.min(bounds.left, innerWidth - width - 12)) + 'px';
      popup.style.top = Math.max(12, Math.min(preferred, innerHeight - height - 12)) + 'px';
    }
    popup.addEventListener('beforetoggle', event => { if (event.newState === 'open') position(); });
    popup.addEventListener('toggle', event => {
      if (event.newState === 'open') position();
      button.setAttribute('aria-expanded', String(event.newState === 'open'));
    });
    window.addEventListener('resize', () => { if (popup.matches(':popover-open')) position(); }, { passive: true });
    document.body.append(popup); host.replaceChildren(button); host.dataset.ready = 'true';
  }
}

if (typeof document !== 'undefined') installToolNavigation();
