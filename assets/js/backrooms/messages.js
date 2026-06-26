let cueStrip = null;
function ensureStrip() {
  if (!cueStrip) { cueStrip = document.createElement('div'); cueStrip.className = 'br-cues'; document.body.append(cueStrip); }
  return cueStrip;
}

export function showCue(text, intensity = 'far') {
  const strip = ensureStrip();
  const line = document.createElement('div');
  line.className = `br-cue br-cue--${intensity}`;
  line.textContent = text;
  strip.append(line);
  setTimeout(() => line.remove(), 3300);
}

// Resolves when the user dismisses it. If `button` is null the modal stays up (terminal screen).
export function showDialog({ text, image = null, button = 'continuar', onClose = null }) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'br-modal';
    if (image) { const img = document.createElement('img'); img.src = image; img.alt = ''; modal.append(img); }
    const p = document.createElement('p'); p.textContent = text; modal.append(p);
    if (button) {
      const b = document.createElement('button'); b.textContent = button;
      b.addEventListener('click', () => { modal.remove(); if (onClose) onClose(); resolve(); });
      modal.append(b);
    }
    document.body.append(modal);
  });
}
