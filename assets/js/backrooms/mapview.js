import { layoutVisited } from './mapgen.js';
import { DIRS } from './graph.js';

// Build a node-link map element from `state`. Shared by the win screen and the debug minimap.
// opts: { reveal:Set<id>, width, height, pad, here:id|null, markEnds:bool }
//   reveal   — which rooms to lay out (visited set, or all rooms for the full/debug map)
//   here     — the room to highlight as the current position (or null)
//   markEnds — when true, draw the icon + label on spawn/exit (win screen); minimap keeps it terse
export function buildMapEl(state, { reveal, width, height, pad = 16, here = null, markEnds = false }) {
  const coords = layoutVisited(state.rooms, reveal, state.spawnId);

  const xs = [...coords.values()].map(c => c.x), ys = [...coords.values()].map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
  const px = c => pad + (width - 2 * pad) * ((c.x - minX) / spanX);
  const py = c => pad + (height - 2 * pad) * ((c.y - minY) / spanY);

  const map = document.createElement('div');
  map.className = 'br-map';
  map.style.width = width + 'px';
  map.style.height = height + 'px';

  // Edges between neighbours in the laid-out set (each undirected pair once).
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

  // Nodes — spawn/exit/here are landmarks; rooms never visited are dimmed when the map is revealed.
  for (const [id, c] of coords) {
    const isSpawn = id === state.spawnId, isExit = id === state.exitId, isHere = id === here;
    const unrevealed = !state.visited.has(id) && !isSpawn && !isExit && !isHere;
    const node = document.createElement('div');
    node.className = 'br-node'
      + (isSpawn ? ' br-node--spawn' : '')
      + (isExit ? ' br-node--exit' : '')
      + (isHere ? ' br-node--here' : '')
      + (unrevealed ? ' br-node--unrevealed' : '');
    node.style.left = px(c) + 'px'; node.style.top = py(c) + 'px';
    if (markEnds && (isSpawn || isExit)) {
      node.textContent = isSpawn ? '📍' : '🚪';
      const label = document.createElement('span');
      label.className = 'br-node__label';
      label.textContent = isSpawn ? 'início' : 'saída';
      node.append(label);
    } else if (isHere) {
      node.textContent = '◉';
    }
    node.title = (isHere ? 'você · ' : '') + `sala ${id}`;
    map.append(node);
  }
  return map;
}
