import { layoutVisited } from './mapgen.js';
import { DIRS } from './graph.js';
import { WIN_TEXT } from './content.js';

export function showWinScreen(state, config) {
  const coords = layoutVisited(state.rooms, state.visited, state.spawnId);

  // Normalize grid coords → pixels inside the map box.
  const xs = [...coords.values()].map(c => c.x), ys = [...coords.values()].map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const PAD = 28, W = 504, H = 404, STEP = 64;
  const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
  const px = c => PAD + (W - 2 * PAD) * ((c.x - minX) / spanX);
  const py = c => PAD + (H - 2 * PAD) * ((c.y - minY) / spanY);

  const overlay = document.createElement('div'); overlay.className = 'br-win';
  const h = document.createElement('h1'); h.textContent = 'VOCÊ ESCAPOU';
  const p = document.createElement('p'); p.textContent = WIN_TEXT;
  const map = document.createElement('div'); map.className = 'br-map';

  // Edges between visited neighbors (draw each undirected pair once).
  for (const [id, c] of coords) {
    for (const dir of DIRS) {
      const nb = state.rooms[id].doors[dir];
      if (nb === undefined || !coords.has(nb) || nb < id) continue;
      const a = { x: px(c), y: py(c) }, b = { x: px(coords.get(nb)), y: py(coords.get(nb)) };
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const edge = document.createElement('div'); edge.className = 'br-edge';
      edge.style.left = a.x + 'px'; edge.style.top = a.y + 'px';
      edge.style.width = len + 'px'; edge.style.transform = `rotate(${ang}deg)`;
      map.append(edge);
    }
  }
  // Nodes
  for (const [id, c] of coords) {
    const node = document.createElement('div');
    node.className = 'br-node' + (id === state.spawnId ? ' br-node--spawn' : '')
      + (id === state.exitId ? ' br-node--exit' : '');
    node.style.left = px(c) + 'px'; node.style.top = py(c) + 'px';
    node.title = `sala ${id}`;
    map.append(node);
  }

  const btn = document.createElement('button'); btn.textContent = 'voltar';
  btn.addEventListener('click', () => { location.href = config.WIN_URL; });

  overlay.append(h, p, map, btn);
  document.body.append(overlay);
}
