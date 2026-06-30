import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.js';
import { makeRoom, connect } from '../mapgen.js';
import { createGame, tick } from '../game.js';
import { config } from '../config.js';
import * as C from '../content.js';

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
    entities: [], status: 'playing', loseReason: null, cluesUsed: 0,
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

test('examining a clue prop under budget emits a clue event and keeps playing', () => {
  const s = fixture();
  s.rooms[0].props = [{ id: '0-0', kind: 'quadro_1', clue: { dir: 'ahead', text: 'o caminho é a frente' } }];
  const { state, events } = tick(s, { type: 'interact', propId: '0-0' });
  assert.equal(state.status, 'playing');
  assert.equal(state.cluesUsed, 1);
  const clue = events.find(e => e.type === 'clue');
  assert.ok(clue, 'expected a clue event');
  assert.ok(clue.text.includes('o caminho é a frente'), 'the dialog text embeds the clue');
  assert.ok(clue.text.includes('o quadro'), 'the dialog names the prop readably');
  assert.ok(!clue.text.includes('quadro_1'), 'the internal kind slug must not leak into the copy');
  assert.ok(clue.image && clue.image.endsWith('.jpg'), 'the dialog shows the examined prop image');
});

test('the clue past the budget triggers the one-with-the-backrooms death', () => {
  const s = fixture({ cluesUsed: C.CLUE_DREAD.length }); // already at the limit
  s.rooms[0].props = [{ id: '0-0', kind: 'quadro_1', clue: { dir: 'ahead', text: 'x' } }];
  const { state, events } = tick(s, { type: 'interact', propId: '0-0' });
  assert.equal(state.status, 'lost');
  assert.equal(state.loseReason, 'one_with_the_backrooms');
  assert.ok(events.some(e => e.type === 'lose' && e.reason === 'one_with_the_backrooms'));
});

test('examining an empty prop emits flavor and does not spend the clue budget', () => {
  const s = fixture();
  s.rooms[0].props = [{ id: '0-0', kind: 'cadeira', clue: null }];
  const { state, events } = tick(s, { type: 'interact', propId: '0-0' });
  assert.equal(state.status, 'playing');
  assert.equal(state.cluesUsed, 0, 'empty props are free');
  const flavor = events.find(e => e.type === 'flavor');
  assert.ok(flavor, 'expected a flavor event');
  assert.ok(flavor.text.includes('a cadeira'), 'flavor names the prop readably');
});

test('clicking a lamp toggles its kind silently but still costs a turn', () => {
  // 7-room line; the wanderer at the far end (only neighbour: room 5) is forced
  // one step inward, so the turn advances it observably without a cue.
  const rooms = [0, 1, 2, 3, 4, 5, 6].map(makeRoom);
  for (let i = 0; i < 6; i++) connect(rooms, i, i + 1, 'ahead');
  const s = {
    config, rng: makeRng(1), rooms, spawnId: 0, exitId: 6,
    playerRoom: 0, visited: new Set([0]),
    entities: [{ id: 0, type: 'wanderer', speed: 1, roomId: 6 }],
    status: 'playing', loseReason: null, cluesUsed: 0,
  };
  s.rooms[0].props = [{ id: '0-0', kind: 'lampada_apagada', clue: null }];
  const { state, events } = tick(s, { type: 'interact', propId: '0-0' });
  assert.equal(state.status, 'playing');
  assert.equal(state.rooms[0].props[0].kind, 'lampada_acesa', 'lamp should flip to its on variant');
  assert.ok(!events.some(e => e.type === 'flavor'), 'a lamp toggle should not emit flavor text');
  assert.equal(state.entities[0].roomId, 5, 'the toggle should cost a turn — the wanderer advances');
  assert.equal(state.cluesUsed, 0, 'a lamp toggle never spends the clue budget');
});

test('talking to a person reveals their lore and keeps playing', () => {
  const s = fixture();
  s.rooms[0].person = { kind: 'davi-brito' };
  const { state, events } = tick(s, { type: 'talk' });
  assert.equal(state.status, 'playing');
  const talk = events.find(e => e.type === 'talk');
  assert.ok(talk, 'expected a talk event');
  assert.ok(talk.text.length > 0);
  assert.ok(talk.image && talk.image.endsWith('.png'));
});

test('talk action in a room with no person is a no-op', () => {
  const s = fixture();
  const { state, events } = tick(s, { type: 'talk' });
  assert.equal(state, s);
  assert.equal(events.length, 0);
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
  const s = fixture({ entities: [{ id: 0, type: 'wanderer', speed: 1, roomId: 1 }] });
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

test('after the player moves, entities advance and can catch', () => {
  // player 0->1; wanderer at 2 (only neighbour: room 1) is forced into the player's new room.
  const s = fixture({ entities: [{ id: 0, type: 'wanderer', speed: 1, roomId: 2 }] });
  const { state } = tick(s, { type: 'move', dir: 'ahead' }); // player 0->1, wanderer 2->1 => caught
  assert.equal(state.status, 'lost');
  assert.equal(state.loseReason, 'caught');
});

test('a distant entity does not catch but emits a cue', () => {
  // 5-room line; player far from entity
  const rooms = [0,1,2,3,4].map(makeRoom);
  for (let i = 0; i < 4; i++) connect(rooms, i, i + 1, 'ahead');
  const s = {
    config, rng: makeRng(1), rooms, spawnId: 0, exitId: 4,
    playerRoom: 0, visited: new Set([0]),
    entities: [{ id: 0, type: 'wanderer', speed: 1, roomId: 4 }],
    status: 'playing', loseReason: null, cluesUsed: 0,
  };
  const { state, events } = tick(s, { type: 'move', dir: 'ahead' }); // player->1, wanderer 4->3 (dist 2)
  assert.equal(state.status, 'playing');
  const cue = events.find(e => e.type === 'cue');
  assert.ok(cue && typeof cue.text === 'string');
  assert.ok(['close','near','far'].includes(cue.intensity));
});

test('no cue when the nearest entity is beyond the far threshold', () => {
  const rooms = [0,1,2,3,4,5,6].map(makeRoom);
  for (let i = 0; i < 6; i++) connect(rooms, i, i + 1, 'ahead');
  const s = {
    config, rng: makeRng(1), rooms, spawnId: 0, exitId: 6,
    playerRoom: 0, visited: new Set([0]),
    entities: [{ id: 0, type: 'wanderer', speed: 1, roomId: 6 }],
    status: 'playing', loseReason: null, cluesUsed: 0,
  };
  const { events } = tick(s, { type: 'move', dir: 'ahead' });
  const cue = events.find(e => e.type === 'cue');
  assert.ok(!cue, `expected no cue beyond far threshold but got ${cue?.intensity}`);
});
