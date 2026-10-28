// Shared playback and transparent-canvas treatment for chapter handoffs.
export function attachSignatureHandoff(video, canvas, section) {
  if (!video || !canvas || !section) return;
  const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (!context) return;

  let visible = false;
  let frame = 0;
  let lastDraw = 0;
  let generation = 0;
  let revealTimer = 0;
  let revealScheduled = false;
  section.classList.add('signature-handoff-managed');

  function sizeCanvas() {
    if (!video.videoWidth || !video.videoHeight) return;
    const maxWidth = window.innerWidth <= 760 ? 720 : 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function draw() {
    if (video.readyState < 2 || !video.videoWidth) return false;
    sizeCanvas();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    let visiblePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = brightness <= 16 ? 0 : Math.round(255 * Math.pow((brightness - 16) / 239, 1.65));
      if (data[i + 3] > 80) visiblePixels++;
    }
    context.putImageData(image, 0, 0);
    return visiblePixels > 100;
  }

  function tick(now) {
    if (!visible) return;
    if (now - lastDraw >= 33) {
      lastDraw = now;
      if (draw() && !revealScheduled) {
        revealScheduled = true;
        const currentGeneration = generation;
        revealTimer = setTimeout(() => reveal(currentGeneration), 450);
      }
    }
    if (!video.ended) frame = requestAnimationFrame(tick);
  }

  function reveal(currentGeneration) {
    if (visible && currentGeneration === generation) section.classList.add('signature-handoff-active');
  }

  function enter() {
    if (visible) return;
    visible = true;
    generation++;
    section.classList.remove('signature-handoff-active');
    clearTimeout(revealTimer);
    revealScheduled = false;
    cancelAnimationFrame(frame);
    lastDraw = 0;
    try { video.currentTime = 0; } catch (_) {}
    const play = video.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
    frame = requestAnimationFrame(tick);
  }

  function leave() {
    if (!visible) return;
    visible = false;
    generation++;
    clearTimeout(revealTimer);
    revealScheduled = false;
    cancelAnimationFrame(frame);
    video.pause();
    section.classList.remove('signature-handoff-active');
  }

  function onEnded() {
    cancelAnimationFrame(frame);
    draw();
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) enter();
    else leave();
  }, { threshold: 0.15 });
  video.addEventListener('loadedmetadata', sizeCanvas);
  video.addEventListener('ended', onEnded);
  window.addEventListener('resize', sizeCanvas);
  observer.observe(section);
  if (video.readyState >= 1) sizeCanvas();

  return () => {
    observer.disconnect();
    leave();
    video.removeEventListener('loadedmetadata', sizeCanvas);
    video.removeEventListener('ended', onEnded);
    window.removeEventListener('resize', sizeCanvas);
    section.classList.remove('signature-handoff-managed');
  };
}
