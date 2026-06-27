import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRS, RECIPROCAL, DELTA, neighborIds, bfsDistances, shortestStep, shortestPath } from '../graph.js';

// Build a 4-room line: 0 -ahead-> 1 -ahead-> 2 -ahead-> 3 (with reciprocal back doors)
function line() {
  const rooms = [0,1,2,3].map(id => ({ id, doors: {} }));
  rooms[0].doors.ahead = 1; rooms[1].doors.back = 0;
  rooms[1].doors.ahead = 2; rooms[2].doors.back = 1;
  rooms[2].doors.ahead = 3; rooms[3].doors.back = 2;
  return rooms;
}

test('constants are consistent', () => {
  assert.deepEqual([...DIRS].sort(), ['ahead','back','left','right']);
  assert.equal(RECIPROCAL.ahead, 'back');
  assert.equal(RECIPROCAL.left, 'right');
  assert.deepEqual(DELTA.ahead, [0, -1]);
});

test('neighborIds lists connected rooms', () => {
  const rooms = line();
  assert.deepEqual(neighborIds(rooms[1]).sort(), [0, 2]);
});

test('bfsDistances measures hops', () => {
  const d = bfsDistances(line(), 0);
  assert.equal(d.get(0), 0); assert.equal(d.get(3), 3);
});

test('shortestStep returns the first hop toward target', () => {
  const rooms = line();
  assert.equal(shortestStep(rooms, 0, 3), 1);
  assert.equal(shortestStep(rooms, 3, 0), 2);
  assert.equal(shortestStep(rooms, 2, 2), null);
});

test('shortestPath is inclusive of both ends', () => {
  assert.deepEqual(shortestPath(line(), 0, 3), [0, 1, 2, 3]);
});
