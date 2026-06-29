import { layoutVisited } from "./mapgen.js";
import { DIRECTIONS, DELTA } from "./graph.js";

// Build a grid map element from `state`. Shared by the win screen and the debug minimap.
// Each room is a SQUARE in its own grid cell (layoutVisited guarantees unique cells, so rooms
// never overlap). Doors are drawn as links between cell centres: a solid bar in the gap when the
// neighbour sits exactly where the door points (ideal grid adjacency), a dashed "loop" line when
// it had to be displaced (the part of the world that isn't a clean grid).
// opts: { reveal:Set<id>, width, height, pad, here:id|null, markEnds:bool }
//   reveal   — which rooms to lay out (visited set, or all rooms for the full/debug map)
//   here     — the room to highlight as the current position (or null)
//   markEnds — when true, draw the icon + label on spawn/exit (win screen); minimap keeps it terse
export function buildMapEl(
  state,
  { reveal, width, height, pad = 16, here = null, markEnds = false },
) {
  const coords = layoutVisited(state.rooms, reveal, state.spawnId);

  const xs = [...coords.values()].map((c) => c.x),
    ys = [...coords.values()].map((c) => c.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const cols = maxX - minX + 1,
    rows = maxY - minY + 1;

  // Cell size that fits the box; the square fills ~70% of its cell, leaving gaps for door links.
  const cell = Math.max(
    1,
    Math.floor(Math.min((width - 2 * pad) / cols, (height - 2 * pad) / rows)),
  );
  const sq = Math.max(4, Math.round(cell * 0.7));
  const offX = (width - cols * cell) / 2; // centre the grid in the box
  const offY = (height - rows * cell) / 2;
  const cx = (c) => offX + (c.x - minX) * cell + cell / 2; // cell-centre pixel
  const cy = (c) => offY + (c.y - minY) * cell + cell / 2;

  const map = document.createElement("div");
  map.className = "br-map";
  map.style.width = width + "px";
  map.style.height = height + "px";

  // Door links — appended FIRST so they sit behind the squares. Each undirected pair drawn once.
  for (const [id, c] of coords) {
    for (const dir of DIRECTIONS) {
      const nb = state.rooms[id].doors[dir];
      if (nb === undefined || !coords.has(nb) || nb < id) continue;
      const nc = coords.get(nb);
      const [dx, dy] = DELTA[dir];
      const exact = nc.x - c.x === dx && nc.y - c.y === dy;
      const a = { x: cx(c), y: cy(c) },
        b = { x: cx(nc), y: cy(nc) };
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const link = document.createElement("div");
      link.className = "br-link" + (exact ? "" : " br-link--loop");
      link.style.left = a.x + "px";
      link.style.top = a.y + "px";
      link.style.width = len + "px";
      link.style.transform = `rotate(${ang}deg)`;
      map.append(link);
    }
  }

  // Room squares — spawn/exit/here are landmarks; rooms never visited are dimmed when revealed.
  for (const [id, c] of coords) {
    const isSpawn = id === state.spawnId,
      isExit = id === state.exitId,
      isHere = id === here;
    const unrevealed = !state.visited.has(id) && !isSpawn && !isExit && !isHere;
    const node = document.createElement("div");
    node.className =
      "br-cell" +
      (isSpawn ? " br-cell--spawn" : "") +
      (isExit ? " br-cell--exit" : "") +
      (isHere ? " br-cell--here" : "") +
      (unrevealed ? " br-cell--unrevealed" : "");
    node.style.width = sq + "px";
    node.style.height = sq + "px";
    node.style.left = cx(c) - sq / 2 + "px";
    node.style.top = cy(c) - sq / 2 + "px";
    if (markEnds && (isSpawn || isExit)) {
      node.textContent = isSpawn ? "📍" : "🚪";
      const label = document.createElement("span");
      label.className = "br-cell__label";
      label.textContent = isSpawn ? "início" : "saída";
      node.append(label);
    } else if (isHere) {
      node.textContent = "◉";
    }
    node.title = (isHere ? "você · " : "") + `sala ${id}`;
    map.append(node);
  }
  return map;
}
