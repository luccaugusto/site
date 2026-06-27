import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, randInt, pick, shuffle } from '../rng.js';

test('makeRng is deterministic for a fixed seed', () => {
  const a = makeRng(42), b = makeRng(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test('makeRng returns floats in [0,1)', () => {
  const r = makeRng(7);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('different seeds differ', () => {
  assert.notEqual(makeRng(1)(), makeRng(2)());
});

test('randInt is within inclusive bounds', () => {
  const r = makeRng(3);
  for (let i = 0; i < 1000; i++) { const v = randInt(r, 2, 5); assert.ok(v >= 2 && v <= 5 && Number.isInteger(v)); }
});

test('pick returns an element of the array', () => {
  const r = makeRng(9); const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) assert.ok(arr.includes(pick(r, arr)));
});

test('shuffle preserves all elements and does not mutate input', () => {
  const r = makeRng(11); const input = [1, 2, 3, 4, 5];
  const out = shuffle(r, input);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});
