import { config } from './config.js';
import { makeRng } from './rng.js';
import { createGame, tick } from './game.js';
import { renderRoom } from './render.js';
import { showCue, showDialog } from './messages.js';
import { playIntro } from './intro.js';
import { showWinScreen } from './winscreen.js';

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '') return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

const root = document.getElementById('br-game');
let game = createGame(config, makeRng(seedFromEnv()));
let busy = false;

async function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'cue') showCue(ev.text, ev.intensity);
    else if (ev.type === 'flavor') showCue(ev.text, 'far');
    else if (ev.type === 'win') {
      onWin();                       // Task 13 replaces this with the win screen
      return true;
    } else if (ev.type === 'lose') {
      // Buttonless dialog never resolves — do NOT await it; schedule the redirect directly.
      showDialog({ text: ev.text, image: ev.image, button: null });
      setTimeout(() => { location.href = config.LOSE_URL; }, 2200);
      return true;
    }
  }
  return false;
}

function onWin() {
  showWinScreen(game, config);
}

async function onAction(action) {
  if (busy || game.status !== 'playing') return;
  busy = true;
  const { state, events } = tick(game, action);
  game = state;
  if (game.status === 'playing') renderRoom(root, game, onAction);
  const terminal = await handleEvents(events);
  if (!terminal) busy = false;       // stay locked once the game ends
}

(async () => {
  await playIntro(config);
  renderRoom(root, game, onAction);
})();
