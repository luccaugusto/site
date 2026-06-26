import { config } from './config.js';
import { makeRng } from './rng.js';
import { createGame } from './game.js';

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '') return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

const game = createGame(config, makeRng(seedFromEnv()));
const root = document.getElementById('br-game');
const room = game.rooms[game.playerRoom];
root.innerHTML = `<pre class="br-debug">spawn=${game.spawnId} exit=${game.exitId} `
  + `rooms=${game.rooms.length}\nyou are in room ${room.id}\n`
  + `doors: ${Object.keys(room.doors).join(', ')}\n`
  + `entities: ${game.entities.map(e => e.type + '@' + e.roomId).join(', ')}</pre>`;
console.log('backrooms game state:', game);
