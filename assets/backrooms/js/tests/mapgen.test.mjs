import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.js';
import { bfsDistances, shortestPath, shortestStep, RECIPROCAL, DIRECTIONS as DIRS } from '../graph.js';
import { generateMap, degree, placeContent, chooseEntitySpawns, layoutVisited, makeRoom, connect } from '../mapgen.js';
import { PEOPLE } from '../content.js';
import { config } from '../config.js';

function gen(seed, overrides = {}) {
  return generateMap({ ...config, ...overrides }, makeRng(seed));
}

test('generates the configured number of rooms', () => {
  const { rooms } = gen(1, { ROOM_COUNT: 25 });
  assert.equal(rooms.length, 25);
});

test('graph is fully connected', () => {
  const { rooms } = gen(2);
  assert.equal(bfsDistances(rooms, 0).size, rooms.length);
});

test('doors are reciprocal', () => {
  const { rooms } = gen(3);
  for (const r of rooms) for (const d of DIRS) {
    const nb = r.doors[d];
    if (nb !== undefined) assert.equal(rooms[nb].doors[RECIPROCAL[d]], r.id);
  }
});

test('no room exceeds MAX_DEGREE; spawn/exit respect caps', () => {
  const { rooms, spawnId, exitId } = gen(4);
  for (const r of rooms) assert.ok(degree(r) <= config.MAX_DEGREE);
  assert.ok(degree(rooms[spawnId]) <= config.SPAWN_MAX_DOORS);
  assert.ok(degree(rooms[exitId]) <= config.EXIT_MAX_DOORS);
});

test('a spawn→exit path always exists and exit is not spawn', () => {
  for (let seed = 0; seed < 25; seed++) {
    const { rooms, spawnId, exitId } = gen(seed);
    assert.notEqual(spawnId, exitId);
    assert.ok(shortestPath(rooms, spawnId, exitId) !== null);
  }
});

test('exit is marked', () => {
  const { rooms, exitId } = gen(6);
  assert.equal(rooms[exitId].isExit, true);
});

test('placeContent never puts a deceptive hint on a true-path door', () => {
  for (let seed = 0; seed < 25; seed++) {
    const map = gen(seed);
    const { rooms, spawnId, exitId } = map;
    const path = shortestPath(rooms, spawnId, exitId);
    const trueDoors = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const dir = DIRS.find(d => rooms[a].doors[d] === b);
      trueDoors.add(`${a}:${dir}`);
    }
    for (const r of rooms) {
      if (r.hint && r.hint.deceptive) assert.ok(!trueDoors.has(`${r.id}:${r.hint.targetDir}`),
        `deceptive hint on true path at room ${r.id}`);
    }
  }
});

test('trap rooms avoid spawn, exit, and the true path', () => {
  const map = gen(7);
  const { rooms, spawnId, exitId } = map;
  const path = new Set(shortestPath(rooms, spawnId, exitId));
  for (const r of rooms) if (r.trap) {
    assert.notEqual(r.id, spawnId);
    assert.notEqual(r.id, exitId);
    assert.ok(!path.has(r.id));
  }
});

test('lamps never carry a clue, even when every prop is forced to clue', () => {
  for (let seed = 0; seed < 30; seed++) {
    const { rooms } = gen(seed, { CLUE_PROP_CHANCE: 1 });
    for (const r of rooms) for (const p of r.props) {
      if (p.kind === 'lampada_acesa' || p.kind === 'lampada_apagada')
        assert.equal(p.clue, null, `seed ${seed}: lamp ${p.id} carried a clue`);
    }
  }
});

test('every prop clue points one real step toward the exit', () => {
  for (let seed = 0; seed < 25; seed++) {
    const { rooms, exitId } = gen(seed, { CLUE_PROP_CHANCE: 1 });
    for (const r of rooms) for (const p of r.props) {
      if (!p.clue) continue;
      assert.equal(rooms[r.id].doors[p.clue.dir], shortestStep(rooms, r.id, exitId),
        `seed ${seed}: clue in room ${r.id} points the wrong way`);
    }
  }
});

test('chooseEntitySpawns matches the roster and avoids spawn', () => {
  const map = gen(8);
  const ents = chooseEntitySpawns(map, config, makeRng(8));
  assert.equal(ents.length, config.entities.reduce((s, e) => s + e.count, 0));
  for (const e of ents) assert.notEqual(e.roomId, map.spawnId);
});

test('every map places exactly one person in a safe room (not spawn/exit/trap)', () => {
  for (let seed = 0; seed < 25; seed++) {
    const { rooms, spawnId, exitId } = gen(seed);
    const withPerson = rooms.filter(r => r.person);
    assert.equal(withPerson.length, 1, `seed ${seed}: expected exactly one person`);
    const r = withPerson[0];
    assert.notEqual(r.id, spawnId, `seed ${seed}: person on spawn`);
    assert.notEqual(r.id, exitId, `seed ${seed}: person on exit`);
    assert.ok(!r.trap, `seed ${seed}: person sharing a trap room`);
  }
});

test('the placed person is one of the PEOPLE pool', () => {
  const ids = new Set(PEOPLE.map(p => p.id));
  for (let seed = 0; seed < 15; seed++) {
    const { rooms } = gen(seed);
    const r = rooms.find(x => x.person);
    assert.ok(ids.has(r.person.kind), `seed ${seed}: ${r.person.kind} not in pool`);
  }
});

test('layoutVisited places spawn at origin and uses direction deltas', () => {
  // line of 3 visited rooms via ahead doors
  const rooms = [makeRoom(0), makeRoom(1), makeRoom(2)];
  connect(rooms, 0, 1, 'ahead'); // 0 ahead -> 1
  connect(rooms, 1, 2, 'ahead'); // 1 ahead -> 2
  const coords = layoutVisited(rooms, new Set([0, 1, 2]), 0);
  assert.deepEqual(coords.get(0), { x: 0, y: 0 });
  assert.deepEqual(coords.get(1), { x: 0, y: -1 });
  assert.deepEqual(coords.get(2), { x: 0, y: -2 });
});

test('layoutVisited never assigns two rooms the same cell, even when doors collide', () => {
  // 3 and 4 both want cell (1,-1): 1's `ahead` and 2's `right` point there.
  const rooms = [makeRoom(0), makeRoom(1), makeRoom(2), makeRoom(3), makeRoom(4)];
  connect(rooms, 0, 1, 'right'); //  1 -> (1, 0)
  connect(rooms, 0, 2, 'ahead'); //  2 -> (0,-1)
  connect(rooms, 1, 3, 'ahead'); //  3 ideal (1,-1)
  connect(rooms, 2, 4, 'right'); //  4 ideal (1,-1) — collides, must be bumped
  const coords = layoutVisited(rooms, new Set([0, 1, 2, 3, 4]), 0);

  assert.equal(coords.size, 5, 'every revealed room is placed');
  const cells = [...coords.values()].map((c) => `${c.x},${c.y}`);
  assert.equal(new Set(cells).size, 5, 'all cells are unique (no overlap)');
});
