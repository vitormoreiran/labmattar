const icons = {
  play: '<path d="m6 3 12 7-12 7z"/>',
  pause: '<path d="M6 3v14M14 3v14"/>',
  start: '<path d="M4 3v14m12-14L5 10l11 7z"/>',
  end: '<path d="M16 3v14M4 3l11 7-11 7z"/>',
  undo: '<path d="m8 4-5 5 5 5M3 9h9a5 5 0 0 1 0 10"/>',
  close: '<path d="m4 4 12 12M16 4 4 16"/>',
  settings: '<path d="M4 5h12M4 10h12M4 15h12M7 3v4m6 1v4m-5 1v4"/>',
  eye: '<path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/>',
  download: '<path d="M10 2v11m-4-4 4 4 4-4M3 14v4h14v-4"/>',
  plus: '<path d="M10 3v14M3 10h14"/>',
};
export const icon = (name) =>
  `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ""}</svg>`;
