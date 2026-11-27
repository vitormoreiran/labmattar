const target = document.getElementById('gallery-preview');
const element = (tag, text) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};
const mediaURL = (folder, file) => '/mesa-media/' + [folder, ...file.split('/')].map(encodeURIComponent).join('/');

function image(project, slide) {
  const img = element('img');
  img.src = mediaURL(project.folder, slide.display_file || slide.file);
  img.alt = slide.alt || project.title;
  img.loading = 'lazy';
  return img;
}

function renderProject(project, index) {
  const article = element('article');
  const detail = element('p', [project.category, project.year].filter(Boolean).join(' · '));
  article.append(detail, element(index === 0 ? 'h1' : 'h2', project.title));
  const intro = element('div');
  intro.className = 'portfolio-intro';
  intro.append(element('p', project.summary), ...project.body.map(text => element('p', text)));
  article.append(intro);
  const slides = project.slides.filter(slide => slide.included);
  const cover = slides.find(slide => slide.type === 'image' && slide.file === project.cover);
  if (cover) {
    const img = image(project, cover);
    img.className = 'portfolio-cover';
    article.append(img);
  }
  const gallery = element('ul');
  for (const slide of slides) {
    const item = element('li'), figure = element('figure');
    if (slide.type === 'youtube') {
      const player = element('iframe');
      player.title = slide.alt || 'Vídeo do YouTube';
      player.src = 'https://www.youtube-nocookie.com/embed/' + slide.youtube_id;
      player.loading = 'lazy'; player.allowFullscreen = true;
      figure.append(player);
    } else {
      figure.append(image(project, slide));
    }
    figure.append(element('figcaption', slide.caption_official));
    item.append(figure); gallery.append(item);
  }
  article.append(gallery);
  return article;
}

try {
  const response = await fetch('/mesa-api/portfolio/state');
  const data = await response.json();
  if (!response.ok) throw Error(data.error);
  const projects = data.state.projects.filter(p => p.active !== false);
  target.replaceChildren(...projects.map(renderProject));
  if (!projects.length) target.append(element('p', 'Nenhuma obra ativa na prévia.'));
} catch (error) {
  document.getElementById('error').textContent = error.message || 'Prévia indisponível.';
}
