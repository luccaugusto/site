import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../rng.js';
import { makeRoom, connect } from '../mapgen.js';
import { decide, stepEntities } from '../entities.js';

// line: 0-1-2-3-4 via ahead doors
function lineRooms() {
  const rooms = [0,1,2,3,4].map(makeRoom);
  for (let i = 0; i < 4; i++) connect(rooms, i, i + 1, 'ahead');
  return rooms;
}
const cfg = { STALKER_AMBUSH_RANGE: 3 };

test('hunter steps one room toward the player', () => {
  const rooms = lineRooms();
  const state = { rooms, playerRoom: 0, config: cfg, entities: [] };
  const e = { id: 0, type: 'hunter', speed: 1, roomId: 4 };
  assert.equal(decide({ ...state, entities: [e] }, e, makeRng(1)), 3);
});

test('sprinter (speed 2) advances two rooms per tick', () => {
  const rooms = lineRooms();
  const state = { rooms, playerRoom: 0, config: cfg, entities: [{ id: 0, type: 'sprinter', speed: 2, roomId: 4 }] };
  const { entities, caught } = stepEntities(state, makeRng(1));
  assert.equal(entities[0].roomId, 2);
  assert.equal(caught, false);
});

test('wanderer moves to an adjacent room', () => {
  const rooms = lineRooms();
  const e = { id: 0, type: 'wanderer', speed: 1, roomId: 2 };
  const dest = decide({ rooms, playerRoom: 0, config: cfg, entities: [e] }, e, makeRng(5));
  assert.ok([1, 3].includes(dest));
});

test('stepEntities flags a catch when an entity reaches the player room', () => {
  const rooms = lineRooms();
  const state = { rooms, playerRoom: 0, config: cfg, entities: [{ id: 0, type: 'sprinter', speed: 2, roomId: 1 }] };
  const { caught, caughtBy } = stepEntities(state, makeRng(1));
  assert.equal(caught, true);
  assert.equal(caughtBy.id, 0);
});

test('stalker closes in only within ambush range', () => {
  const rooms = lineRooms();
  const near = { id: 0, type: 'stalker', speed: 1, roomId: 2 }; // dist 2 ≤ 3 → step toward player
  assert.equal(decide({ rooms, playerRoom: 0, config: cfg, entities: [near] }, near, makeRng(1)), 1);
});

test('stepEntities does not mutate the input entities', () => {
  const rooms = lineRooms();
  const input = [{ id: 0, type: 'hunter', speed: 1, roomId: 4 }];
  stepEntities({ rooms, playerRoom: 0, config: cfg, entities: input }, makeRng(1));
  assert.equal(input[0].roomId, 4);
});
