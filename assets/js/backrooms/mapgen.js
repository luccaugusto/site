import { DIRS, RECIPROCAL, bfsDistances, shortestPath, neighborIds } from './graph.js';
import { randInt, pick, shuffle } from './rng.js';

export function makeRoom(id) {
  return { id, doors: {}, props: [], hint: null, trap: null, isExit: false };
}

export function degree(room) {
  let n = 0;
  for (const d of DIRS) if (room.doors[d] !== undefined) n++;
  return n;
}

export function connect(rooms, aId, bId, dir) {
  rooms[aId].doors[dir] = bId;
  rooms[bId].doors[RECIPROCAL[dir]] = aId;
}

export function canConnect(rooms, aId, bId, dir, maxDegree) {
  if (aId === bId) return false;
  if (rooms[aId].doors[dir] !== undefined) return false;
  if (rooms[bId].doors[RECIPROCAL[dir]] !== undefined) return false;
  if (degree(rooms[aId]) >= maxDegree || degree(rooms[bId]) >= maxDegree) return false;
  if (neighborIds(rooms[aId]).includes(bId)) return false; // no duplicate edge
  return true;
}

export function buildGraph(config, rng) {
  const { ROOM_COUNT, MAX_DEGREE, EXTRA_EDGE_RATIO } = config;
  const rooms = Array.from({ length: ROOM_COUNT }, (_, i) => makeRoom(i));

  // Spanning tree: attach each new room to a random already-placed room → guarantees connectivity.
  for (let i = 1; i < ROOM_COUNT; i++) {
    let done = false;
    for (const j of shuffle(rng, Array.from({ length: i }, (_, k) => k))) {
      for (const dir of shuffle(rng, DIRS)) {
        if (canConnect(rooms, i, j, dir, MAX_DEGREE)) { connect(rooms, i, j, dir); done = true; break; }
      }
      if (done) break;
    }
    if (!done) { // fallback: any earlier room with any free reciprocal slot
      outer: for (let j = 0; j < i; j++) for (const dir of DIRS) {
        if (canConnect(rooms, i, j, dir, MAX_DEGREE)) { connect(rooms, i, j, dir); done = true; break outer; }
      }
    }
  }

  // Extra edges → loops & dead-ends (meaningful choices).
  const target = Math.round(ROOM_COUNT * EXTRA_EDGE_RATIO);
  let added = 0, attempts = 0;
  while (added < target && attempts < target * 50 + 50) {
    attempts++;
    const a = randInt(rng, 0, ROOM_COUNT - 1);
    const b = randInt(rng, 0, ROOM_COUNT - 1);
    const dir = pick(rng, DIRS);
    if (canConnect(rooms, a, b, dir, MAX_DEGREE)) { connect(rooms, a, b, dir); added++; }
  }
  return rooms;
}

function isConnected(rooms) {
  return bfsDistances(rooms, 0).size === rooms.length;
}

function pickSpawn(rooms, config, rng) {
  const eligible = rooms.filter(r => degree(r) <= config.SPAWN_MAX_DOORS);
  return pick(rng, eligible.length ? eligible : rooms).id;
}

function pickExit(rooms, spawnId, config) {
  const dist = bfsDistances(rooms, spawnId);
  let best = spawnId, bestD = -1;
  for (const r of rooms) {
    if (r.id === spawnId || degree(r) > config.EXIT_MAX_DOORS) continue;
    const d = dist.get(r.id) ?? -1;
    if (d > bestD) { bestD = d; best = r.id; }
  }
  return best;
}

export function generateMap(config, rng) {
  let rooms, tries = 0;
  do { rooms = buildGraph(config, rng); tries++; } while (!isConnected(rooms) && tries < 20);
  if (!isConnected(rooms)) throw new Error('mapgen: failed to build a connected graph');

  const spawnId = pickSpawn(rooms, config, rng);
  const exitId = pickExit(rooms, spawnId, config);
  rooms[exitId].isExit = true;
  return { rooms, spawnId, exitId };
  // NOTE: Task 4 inserts placeContent(map, config, rng) before returning.
}
