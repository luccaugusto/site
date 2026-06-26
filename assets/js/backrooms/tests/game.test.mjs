import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.js';
import { makeRoom, connect } from '../mapgen.js';
import { createGame, tick } from '../game.js';
import { config } from '../config.js';

// Hand-built 3-room line with NO entities, for deterministic action tests.
function fixture(overrides = {}) {
  const rooms = [0, 1, 2].map(makeRoom);
  connect(rooms, 0, 1, 'ahead');  // 0 ahead -> 1
  connect(rooms, 1, 2, 'ahead');  // 1 ahead -> 2
  rooms[2].isExit = true;
  return {
    config, rng: makeRng(1),
    rooms, spawnId: 0, exitId: 2,
    playerRoom: 0, visited: new Set([0]),
    entities: [], status: 'playing', loseReason: null,
    ...overrides,
  };
}

test('createGame starts the player at spawn, spawn visited, status playing', () => {
  const g = createGame(config, makeRng(2));
  assert.equal(g.playerRoom, g.spawnId);
  assert.ok(g.visited.has(g.spawnId));
  assert.equal(g.status, 'playing');
});

test('move through a valid door updates room + visited + emits move event', () => {
  const { state, events } = tick(fixture(), { type: 'move', dir: 'ahead' });
  assert.equal(state.playerRoom, 1);
  assert.ok(state.visited.has(1));
  assert.ok(events.some(e => e.type === 'move' && e.toRoom === 1));
});

test('move through a non-existent door is a no-op', () => {
  const s0 = fixture();
  const { state, events } = tick(s0, { type: 'move', dir: 'left' });
  assert.equal(state, s0);
  assert.equal(events.length, 0);
});

test('entering a trap room loses with a trap event', () => {
  const s = fixture();
  s.rooms[1].trap = { kind: 'pit' };
  const { state, events } = tick(s, { type: 'move', dir: 'ahead' });
  assert.equal(state.status, 'lost');
  assert.equal(state.loseReason, 'trap');
  assert.ok(events.some(e => e.type === 'lose' && e.reason === 'trap'));
});

test('interacting with a rigged prop loses', () => {
  const s = fixture();
  s.rooms[0].props = [{ id: '0-0', kind: 'lampada', rigged: true }];
  const { state, events } = tick(s, { type: 'interact', propId: '0-0' });
  assert.equal(state.status, 'lost');
  assert.equal(state.loseReason, 'rigged');
});

test('interacting with a safe prop emits flavor, keeps playing', () => {
  const s = fixture();
  s.rooms[0].props = [{ id: '0-0', kind: 'cadeira', rigged: false }];
  const { state, events } = tick(s, { type: 'interact', propId: '0-0' });
  assert.equal(state.status, 'playing');
  assert.ok(events.some(e => e.type === 'flavor'));
});

test('exit action in the exit room wins', () => {
  const s = fixture({ playerRoom: 2, visited: new Set([0, 1, 2]) });
  const { state, events } = tick(s, { type: 'exit' });
  assert.equal(state.status, 'won');
  assert.ok(events.some(e => e.type === 'win'));
});

test('exit action outside the exit room is a no-op', () => {
  const s = fixture();
  const { state } = tick(s, { type: 'exit' });
  assert.equal(state.status, 'playing');
});

test('walking into a room occupied by an entity loses (caught)', () => {
  const s = fixture({ entities: [{ id: 0, type: 'hunter', speed: 1, roomId: 1 }] });
  const { state, events } = tick(s, { type: 'move', dir: 'ahead' });
  assert.equal(state.status, 'lost');
  assert.equal(state.loseReason, 'caught');
  assert.ok(events.some(e => e.type === 'lose' && e.reason === 'caught'));
});

test('tick on a finished game is inert', () => {
  const s = fixture({ status: 'won' });
  const { state, events } = tick(s, { type: 'move', dir: 'ahead' });
  assert.equal(state, s);
  assert.equal(events.length, 0);
});
