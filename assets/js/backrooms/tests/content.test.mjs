import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillHint, cueFor, tauntFor, PROP_KINDS, PROP_EMOJI } from '../content.js';

test('fillHint substitutes the pt-BR direction word', () => {
  assert.equal(fillHint('vai pra {dir}.', 'left'), 'vai pra esquerda.');
  assert.ok(!fillHint('{dir} {dir}', 'ahead').includes('{dir}'));
});

test('cueFor returns a non-empty string per type/intensity', () => {
  for (const t of ['hunter','sprinter','wanderer','stalker'])
    for (const i of ['close','near','far'])
      assert.ok(typeof cueFor(t, i) === 'string' && cueFor(t, i).length > 0);
});

test('tauntFor covers every entity type', () => {
  for (const t of ['hunter','sprinter','wanderer','stalker']) assert.ok(tauntFor(t).length > 0);
});

test('every prop kind has an emoji', () => {
  for (const k of PROP_KINDS) assert.ok(PROP_EMOJI[k], `missing emoji for ${k}`);
});
