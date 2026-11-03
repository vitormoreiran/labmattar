// Playback is deliberate; a new video pauses the previous one. There is no
// autoplay, including for visitors who request reduced motion.
document.querySelectorAll('.motion-card video').forEach(video=>{
  video.addEventListener('play',()=>{
    document.querySelectorAll('.motion-card video').forEach(other=>{
      if(other!==video)other.pause();
    });
  });
});
