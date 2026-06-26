import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.js';
import { bfsDistances, shortestPath, RECIPROCAL, DIRS } from '../graph.js';
import { generateMap, degree } from '../mapgen.js';
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
