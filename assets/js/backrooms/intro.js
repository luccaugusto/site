export function playIntro(config) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'br-intro';
    let done = false;
    const finish = () => { if (done) return; done = true; overlay.remove(); resolve(); };

    const video = document.createElement('video');
    video.src = config.INTRO_VIDEO;
    video.autoplay = true; video.muted = false; video.playsInline = true;
    video.addEventListener('ended', finish);
    video.addEventListener('error', () => setTimeout(finish, config.INTRO_FALLBACK_MS));
    overlay.append(video);

    if (config.INTRO_SKIPPABLE) {
      const skip = document.createElement('div');
      skip.className = 'br-intro__skip'; skip.textContent = 'clique para pular';
      overlay.append(skip);
      overlay.addEventListener('click', finish);
    }

    document.body.append(overlay);

    // Fallback: if the video never starts (missing file / autoplay blocked), hold black then continue.
    video.play?.().catch(() => setTimeout(finish, config.INTRO_FALLBACK_MS));
  });
}
