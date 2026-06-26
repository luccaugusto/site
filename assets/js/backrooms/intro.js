export function playIntro(config) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'br-intro';
    overlay.style.backgroundImage = `url("${config.INTRO_GIF}")`;

    const audio = new Audio(config.INTRO_SOUND);
    let done = false;
    const finish = () => { if (done) return; done = true; audio.pause(); overlay.remove(); resolve(); };

    // Advance to the game when the sound stops playing.
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', () => setTimeout(finish, config.INTRO_FALLBACK_MS));

    if (config.INTRO_SKIPPABLE) {
      const skip = document.createElement('div');
      skip.className = 'br-intro__skip';
      skip.textContent = 'clique para pular';
      overlay.append(skip);
      overlay.addEventListener('click', finish);
    }

    document.body.append(overlay);

    // Audio autoplay may be blocked without a user gesture — fall back so the game never hangs.
    audio.play?.().catch(() => setTimeout(finish, config.INTRO_FALLBACK_MS));
  });
}
