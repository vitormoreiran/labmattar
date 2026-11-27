const MEDIA = 'https://labmattar.com/assets/';
const videoSource = MEDIA + 'ambient-breeze.mp4';
const poster = MEDIA + 'casa-das-palmeiras.jpg';

function frameVideo(className) {
  const video = document.createElement('video');
  video.className = className;
  video.poster = poster;
  video.playsInline = video.muted = video.loop = true;
  video.setAttribute('aria-hidden', 'true');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.src = videoSource;
    video.autoplay = true;
    video.preload = 'metadata';
  }
  return video;
}

export function chapterCopy(content, opening) {
  const copy = document.createElement('div');
  copy.className = 'chapter-copy';
  const heading = document.createElement('h2');
  heading.className = 'chapter-heading';
  const words = content.title.trim().split(/\s+/);
  if (opening && words.length > 1) {
    const first = document.createElement('span');
    first.textContent = words.shift();
    const second = document.createElement('span');
    second.className = 'chapter-perpetua';
    second.textContent = words.join(' ');
    heading.append(first, second);
  } else {
    heading.textContent = content.title;
  }
  copy.append(heading);
  for (const text of content.body) {
    const p = document.createElement('p');
    p.textContent = text;
    copy.append(p);
  }
  return copy;
}

export function chapterVisual(section, lang) {
  const story = document.createElement('div');
  story.className = 'chapter-story';
  story.lang = lang;

  const scene = document.createElement('div');
  scene.className = 'chapter-scene';
  scene.setAttribute('aria-hidden', 'true');
  const masked = document.createElement('div');
  masked.className = 'chapter-m-frame';
  masked.append(frameVideo('chapter-film'));
  scene.append(frameVideo('chapter-ambient'), masked);

  const reading = document.createElement('div');
  reading.className = 'chapter-reading';
  const article = document.createElement('article');
  const opening = section.id === 'abertura';
  article.id = section.id;
  article.className = 'chapter-panel' + (opening ? ' chapter-opening' : '');
  article.append(chapterCopy(section[lang], opening));
  reading.append(article);
  story.append(scene, reading);
  return story;
}
