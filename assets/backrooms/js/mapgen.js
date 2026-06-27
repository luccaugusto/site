import {
  DIRECTIONS,
  RECIPROCAL,
  DELTA,
  bfsDistances,
  shortestPath,
  shortestStep,
  neighborIds,
} from "./graph.js";
import { randInt, pick, shuffle } from "./rng.js";
import * as CONTENT from "./content.js";

export function makeRoom(id) {
  return {
    id,
    doors: {},
    props: [],
    hint: null,
    trap: null,
    person: null,
    isExit: false,
  };
}

export function degree(room) {
  let n = 0;
  for (const d of DIRECTIONS) if (room.doors[d] !== undefined) n++;
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
  if (degree(rooms[aId]) >= maxDegree || degree(rooms[bId]) >= maxDegree)
    return false;
  if (neighborIds(rooms[aId]).includes(bId)) return false; // no duplicate edge
  return true;
}

export function buildGraph(config, rng) {
  const { ROOM_COUNT, MAX_DEGREE, EXTRA_EDGE_RATIO } = config;
  const rooms = Array.from({ length: ROOM_COUNT }, (_, i) => makeRoom(i));

  // Spanning tree: attach each new room to a random already-placed room → guarantees connectivity.
  for (let i = 1; i < ROOM_COUNT; i++) {
    let done = false;
    for (const j of shuffle(
      rng,
      Array.from({ length: i }, (_, k) => k),
    )) {
      for (const dir of shuffle(rng, DIRECTIONS)) {
        if (canConnect(rooms, i, j, dir, MAX_DEGREE)) {
          connect(rooms, i, j, dir);
          done = true;
          break;
        }
      }
      if (done) break;
    }
    if (!done) {
      // fallback: any earlier room with any free reciprocal slot
      outer: for (let j = 0; j < i; j++)
        for (const dir of DIRECTIONS) {
          if (canConnect(rooms, i, j, dir, MAX_DEGREE)) {
            connect(rooms, i, j, dir);
            done = true;
            break outer;
          }
        }
    }
  }

  // Extra edges → loops & dead-ends (meaningful choices).
  const target = Math.round(ROOM_COUNT * EXTRA_EDGE_RATIO);
  let added = 0,
    attempts = 0;
  while (added < target && attempts < target * 50 + 50) {
    attempts++;
    const a = randInt(rng, 0, ROOM_COUNT - 1);
    const b = randInt(rng, 0, ROOM_COUNT - 1);
    const dir = pick(rng, DIRECTIONS);
    if (canConnect(rooms, a, b, dir, MAX_DEGREE)) {
      connect(rooms, a, b, dir);
      added++;
    }
  }
  return rooms;
}

function isConnected(rooms) {
  return bfsDistances(rooms, 0).size === rooms.length;
}

function pickSpawn(rooms, config, rng) {
  const eligible = rooms.filter((r) => degree(r) <= config.SPAWN_MAX_DOORS);
  return pick(rng, eligible.length ? eligible : rooms).id;
}

function pickExit(rooms, spawnId, config) {
  const dist = bfsDistances(rooms, spawnId);
  let best = spawnId,
    bestD = -1;
  for (const r of rooms) {
    if (r.id === spawnId || degree(r) > config.EXIT_MAX_DOORS) continue;
    const d = dist.get(r.id) ?? -1;
    if (d > bestD) {
      bestD = d;
      best = r.id;
    }
  }
  if (best === spawnId) {
    // No degree-eligible room found — fall back to the farthest room regardless of cap,
    // so the exit is never the spawn (a winnable map must have exit !== spawn).
    for (const r of rooms) {
      if (r.id === spawnId) continue;
      const d = dist.get(r.id) ?? -1;
      if (d > bestD) {
        bestD = d;
        best = r.id;
      }
    }
  }
  return best;
}

export function generateMap(config, rng) {
  let rooms,
    tries = 0;
  do {
    rooms = buildGraph(config, rng);
    tries++;
  } while (!isConnected(rooms) && tries < 20);

  if (!isConnected(rooms))
    throw new Error("mapgen: failed to build a connected graph");

  const spawnId = pickSpawn(rooms, config, rng);
  const exitId = pickExit(rooms, spawnId, config);
  rooms[exitId].isExit = true;
  const map = { rooms, spawnId, exitId };
  placeContent(map, config, rng);
  return map;
}

export function placeContent(map, config, rng) {
  const { rooms, spawnId, exitId } = map;
  const path = shortestPath(rooms, spawnId, exitId);
  const truePathSet = new Set(path);
  const trueDoors = new Set(); // `${roomId}:${dir}` of doors along spawn→exit
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1];
    const dir = DIRECTIONS.find((d) => rooms[a].doors[d] === b);
    trueDoors.add(`${a}:${dir}`);
  }

  // Props
  for (const room of rooms) {
    if (room.id === spawnId) continue;
    const n = randInt(rng, config.PROPS_PER_ROOM[0], config.PROPS_PER_ROOM[1]);
    for (let k = 0; k < n; k++) {
      const kind = pick(rng, CONTENT.PROP_KINDS);
      const rigged = room.id !== exitId && rng() < config.RIGGED_PROP_CHANCE;
      room.props.push({ id: `${room.id}-${k}`, kind, rigged });
    }
  }

  // Trap rooms: off the true path, never spawn/exit
  const offPath = rooms.filter(
    (r) => !truePathSet.has(r.id) && r.id !== spawnId && r.id !== exitId,
  );
  for (const r of shuffle(rng, offPath).slice(0, config.TRAP_ROOM_COUNT))
    r.trap = { kind: "pit" };

  // Person entity: exactly one harmless celebrity per map, in a random room that
  // is reachable and safe (never spawn, exit, or a trap room).
  const personRooms = rooms.filter(
    (r) => r.id !== spawnId && r.id !== exitId && !r.trap,
  );
  if (personRooms.length) {
    pick(rng, personRooms).person = { kind: pick(rng, CONTENT.PEOPLE).id };
  }

  // Hints
  for (const room of rooms) {
    if (room.id === exitId) continue;
    if (rng() > config.HINT_ROOM_CHANCE) continue;
    const doorDirs = DIRECTIONS.filter((d) => room.doors[d] !== undefined);
    if (!doorDirs.length) continue;
    if (rng() < config.DECEPTIVE_HINT_RATIO) {
      const lyingDirs = doorDirs.filter(
        (d) => !trueDoors.has(`${room.id}:${d}`),
      );
      if (!lyingDirs.length) continue; // can't lie without hitting the true path → skip
      const dir = pick(rng, lyingDirs);
      room.hint = {
        text: CONTENT.fillHint(pick(rng, CONTENT.HINT_DECEPTIVE), dir),
        deceptive: true,
        targetDir: dir,
      };
    } else {
      const stepTo = shortestStep(rooms, room.id, exitId);
      const dir =
        DIRECTIONS.find((d) => room.doors[d] === stepTo) ?? pick(rng, doorDirs);
      room.hint = {
        text: CONTENT.fillHint(pick(rng, CONTENT.HINT_TRUTHFUL), dir),
        deceptive: false,
        targetDir: dir,
      };
    }
  }
  return map;
}

export function chooseEntitySpawns(map, config, rng) {
  const { rooms, spawnId } = map;
  const dist = bfsDistances(rooms, spawnId);
  const far = rooms
    .filter((r) => r.id !== spawnId && (dist.get(r.id) ?? 0) >= 2)
    .map((r) => r.id);
  const trapIds = rooms.filter((r) => r.trap).map((r) => r.id);
  const all = rooms.map((r) => r.id).filter((id) => id !== spawnId);
  const spawns = [];
  let id = 0;
  for (const entry of config.entities) {
    for (let k = 0; k < entry.count; k++) {
      let roomId;
      if (entry.type === "stalker" && trapIds.length)
        roomId = pick(rng, trapIds);
      else roomId = pick(rng, far.length ? far : all);
      spawns.push({ id: id++, type: entry.type, speed: entry.speed, roomId });
    }
  }
  return spawns;
}

export function layoutVisited(rooms, visited, spawnId) {
  const coords = new Map([[spawnId, { x: 0, y: 0 }]]);
  const queue = [spawnId];
  while (queue.length) {
    const cur = queue.shift();
    const { x, y } = coords.get(cur);
    for (const dir of DIRECTIONS) {
      const nb = rooms[cur].doors[dir];
      if (nb === undefined || !visited.has(nb) || coords.has(nb)) continue;
      const [dx, dy] = DELTA[dir];
      coords.set(nb, { x: x + dx, y: y + dy });
      queue.push(nb);
    }
  }
  return coords;
}
