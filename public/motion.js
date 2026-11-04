// Silent loops run independently; starting one preview never stops another.
document.querySelectorAll('.motion-card video, .motion-symbol-preview video').forEach(video=>{
  video.muted=true;
  video.defaultMuted=true;
  video.play().catch(()=>{});
});
