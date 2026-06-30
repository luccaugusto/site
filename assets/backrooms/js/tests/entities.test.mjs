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
const cfg = {};

test('wanderer moves to an adjacent room', () => {
  const rooms = lineRooms();
  const e = { id: 0, type: 'wanderer', speed: 1, roomId: 2 };
  const dest = decide({ rooms, playerRoom: 0, config: cfg, entities: [e] }, e, makeRng(5));
  assert.ok([1, 3].includes(dest));
});

test('decide ignores non-wanderer entity types (they never move)', () => {
  const rooms = lineRooms();
  for (const type of ['hunter', 'sprinter', 'stalker']) {
    const e = { id: 0, type, speed: 1, roomId: 4 };
    assert.equal(decide({ rooms, playerRoom: 0, config: cfg, entities: [e] }, e, makeRng(1)), null);
  }
});

test('stepEntities flags a catch when a wanderer reaches the player room', () => {
  // 2-room line: a wanderer at 1 has only neighbour 0 (the player), so it must step in.
  const rooms = [0, 1].map(makeRoom);
  connect(rooms, 0, 1, 'ahead');
  const state = { rooms, playerRoom: 0, config: cfg, entities: [{ id: 0, type: 'wanderer', speed: 1, roomId: 1 }] };
  const { caught, caughtBy } = stepEntities(state, makeRng(1));
  assert.equal(caught, true);
  assert.equal(caughtBy.id, 0);
});

test('stepEntities does not mutate the input entities', () => {
  const rooms = lineRooms();
  const input = [{ id: 0, type: 'wanderer', speed: 1, roomId: 4 }];
  stepEntities({ rooms, playerRoom: 0, config: cfg, entities: input }, makeRng(1));
  assert.equal(input[0].roomId, 4);
});
