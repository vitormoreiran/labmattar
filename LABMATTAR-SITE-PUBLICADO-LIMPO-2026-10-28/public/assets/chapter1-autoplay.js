export function startChapter1Videos() {
  const videos = [...document.querySelectorAll('.site-shell > video.ambient-video, .site-shell .m-frame > .m-video')];
  const openingVideo = document.querySelector('.site-shell .m-frame > .m-video');
  const ambient = document.querySelector('.site-shell > .chapter1-ambient-opening');
  const canvas = ambient?.querySelector('.chapter1-ambient-canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  let frame = 0;
  let lastDraw = 0;
  if (canvas) canvas.width = canvas.height = 480;
  const drawAmbient = (now) => {
    if (context && openingVideo?.readyState >= 2 && !ambient.classList.contains('is-hidden') && now - lastDraw >= 80) {
      try {
        context.drawImage(openingVideo, 0, 0, canvas.width, canvas.height);
        canvas.classList.add('is-ready');
        lastDraw = now;
      } catch (_) {}
    }
    frame = requestAnimationFrame(drawAmbient);
  };
  if (context) frame = requestAnimationFrame(drawAmbient);
  const resume = () => {
    for (const video of videos) {
      if (!video.isConnected) continue;
      if (video.classList.contains('chapter1-ambient-base') && video.classList.contains('is-hidden')) {
        if (!video.paused) video.pause();
        continue;
      }
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      if (video.paused) video.play().catch(() => {});
    }
  };
  for (const video of videos) {
    video.addEventListener('loadedmetadata', resume);
    video.addEventListener('canplay', resume);
  }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  resume();
  return () => {
    cancelAnimationFrame(frame);
    for (const video of videos) {
      video.removeEventListener('loadedmetadata', resume);
      video.removeEventListener('canplay', resume);
    }
    document.removeEventListener('visibilitychange', resume);
    window.removeEventListener('pageshow', resume);
  };
}
