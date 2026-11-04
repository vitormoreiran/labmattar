export function startChapter1Videos() {
  const videos = [...document.querySelectorAll('.site-shell > video.ambient-video, .site-shell .m-frame > video')];
  const openingVideo = document.querySelector('.site-shell .m-frame > .m-video');
  const startupVideo = document.querySelector('.site-shell .m-frame > .m-startup-video');
  const ambient = document.querySelector('.site-shell > .chapter1-ambient-opening');
  const canvas = ambient?.querySelector('.chapter1-ambient-canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  let frame = 0;
  let lastDraw = 0;
  let startupFinished = false;
  let mainRequested = false;
  let mainSynced = false;
  let lastResync = 0;
  let pauseStartupTimer = 0;
  if (canvas) canvas.width = canvas.height = 480;
  const activeVideo = () => {
    if (startupFinished && openingVideo?.readyState >= 2 && !openingVideo.paused) return openingVideo;
    if (startupVideo?.readyState >= 2 && !startupVideo.paused) return startupVideo;
    if (openingVideo?.readyState >= 2 && !openingVideo.paused) return openingVideo;
    return null;
  };
  const revealMain = () => {
    if (startupFinished || !startupVideo || !mainSynced || openingVideo?.readyState < 2 || openingVideo.paused || startupVideo.currentTime >= 7) return;
    const difference = Math.abs(openingVideo.currentTime - startupVideo.currentTime);
    if (difference > 0.35) {
      const now = performance.now();
      if (!openingVideo.seeking && now - lastResync > 500) {
        lastResync = now;
        openingVideo.currentTime = startupVideo.currentTime;
      }
      return;
    }
    startupFinished = true;
    startupVideo.classList.add('is-finished');
    pauseStartupTimer = window.setTimeout(() => startupVideo.pause(), 650);
  };
  const drawAmbient = (now) => {
    const video = activeVideo();
    if (context && video && !ambient?.classList.contains('is-hidden') && now - lastDraw >= 80) {
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.classList.add('is-ready');
        lastDraw = now;
      } catch (_) {}
    }
    revealMain();
    frame = requestAnimationFrame(drawAmbient);
  };
  if (context) frame = requestAnimationFrame(drawAmbient);
  const startMain = () => {
    if (!openingVideo?.isConnected || mainRequested) return;
    mainRequested = true;
    openingVideo.load();
  };
  const syncMain = () => {
    if (!openingVideo || !startupVideo || startupFinished) return;
    const target = Math.min(startupVideo.currentTime, Math.max(0, openingVideo.duration - 0.1));
    if (Number.isFinite(target)) openingVideo.currentTime = target;
  };
  const playSyncedMain = () => {
    mainSynced = true;
    openingVideo?.play().catch(() => {});
  };
  startupVideo?.addEventListener('playing', startMain);
  openingVideo?.addEventListener('loadedmetadata', syncMain);
  openingVideo?.addEventListener('seeked', playSyncedMain);
  const resume = () => {
    for (const video of videos) {
      if (!video.isConnected) continue;
      if (video === openingVideo && startupVideo && !mainSynced) continue;
      if (video === startupVideo && startupFinished) {
        if (!video.paused) video.pause();
        continue;
      }
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
    revealMain();
  };
  for (const video of videos) {
    video.addEventListener('loadedmetadata', resume);
    video.addEventListener('loadeddata', resume);
    video.addEventListener('canplay', resume);
  }
  openingVideo?.addEventListener('playing', revealMain);
  openingVideo?.addEventListener('timeupdate', revealMain);
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  resume();
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(pauseStartupTimer);
    for (const video of videos) {
      video.removeEventListener('loadedmetadata', resume);
      video.removeEventListener('loadeddata', resume);
      video.removeEventListener('canplay', resume);
    }
    startupVideo?.removeEventListener('playing', startMain);
    openingVideo?.removeEventListener('loadedmetadata', syncMain);
    openingVideo?.removeEventListener('seeked', playSyncedMain);
    openingVideo?.removeEventListener('playing', revealMain);
    openingVideo?.removeEventListener('timeupdate', revealMain);
    document.removeEventListener('visibilitychange', resume);
    window.removeEventListener('pageshow', resume);
  };
}
