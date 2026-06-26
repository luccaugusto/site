import { config } from './config.js';
import { makeRng } from './rng.js';
import { createGame } from './game.js';
import { renderRoom } from './render.js';

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '') return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

let game = createGame(config, makeRng(seedFromEnv()));
const root = document.getElementById('br-game');

function onAction(action) {
  console.log('action', action);     // wired to tick in Task 11
}

renderRoom(root, game, onAction);
