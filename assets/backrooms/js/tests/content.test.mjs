import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillHint, cueFor, tauntFor, DIR_PT, PROP_KINDS, PROP_EMOJI, LAMP_SPRITES, toggleLamp, PEOPLE, personById, PROP_STYLES, PROP_DEFAULT, resolvePropPlacement, CLUE_EXIT, CLUE_DREAD, fillClue, dreadFor } from '../content.js';

test('fillHint substitutes the pt-BR direction word', () => {
  assert.equal(fillHint('vai pra {dir}.', 'left'), 'vai pra esquerda.');
  assert.ok(!fillHint('{dir} {dir}', 'ahead').includes('{dir}'));
});

test('cueFor fills the direction word into a per-intensity template', () => {
  for (const intensity of ['close','near','far']) {
    for (const dir of ['ahead','back','left','right']) {
      const text = cueFor(intensity, dir);
      assert.ok(typeof text === 'string' && text.length > 0);
      assert.ok(!text.includes('{dir}'), `placeholder not filled for ${intensity}/${dir}`);
      assert.ok(text.includes(DIR_PT[dir]), `cue should mention ${DIR_PT[dir]}`);
    }
  }
});

test('tauntFor taunts the hunter; other entity types have none', () => {
  assert.ok(typeof tauntFor('hunter') === 'string' && tauntFor('hunter').length > 0);
  for (const t of ['sprinter','wanderer','stalker']) assert.equal(tauntFor(t), undefined);
});

test('every prop kind has an emoji', () => {
  for (const k of PROP_KINDS) assert.ok(PROP_EMOJI[k], `missing emoji for ${k}`);
});

test('toggleLamp flips a lamp to its opposite variant', () => {
  assert.equal(toggleLamp('lampada_acesa'), 'lampada_apagada');
  assert.equal(toggleLamp('lampada_apagada'), 'lampada_acesa');
});

test('toggleLamp returns null for kinds that are not lamps', () => {
  assert.equal(toggleLamp('cadeira'), null);
  assert.equal(toggleLamp('quadro_1'), null);
  assert.equal(toggleLamp('not-a-prop'), null);
});

test('LAMP_SPRITES maps each lamp kind to its on/off image', () => {
  assert.match(LAMP_SPRITES.lampada_acesa, /lamp-on\.png$/);
  assert.match(LAMP_SPRITES.lampada_apagada, /lamp-off\.png$/);
});

test('PEOPLE pool has the three celebrities, each fully described', () => {
  const ids = PEOPLE.map(p => p.id).sort();
  assert.deepEqual(ids, ['davi-brito', 'nicolas-cage', 'ronaldinho-gaucho']);
  for (const p of PEOPLE) {
    assert.ok(p.id && p.name && p.text, `incomplete person ${p.id}`);
    assert.ok(p.image && p.image.endsWith('.png'), `bad image for ${p.id}`);
  }
});

test('personById resolves a pool member and returns undefined otherwise', () => {
  assert.equal(personById('nicolas-cage').name, 'Nicolas Cage');
  assert.equal(personById('not-a-person'), undefined);
});

test('every prop kind has a placement style', () => {
  for (const k of PROP_KINDS) {
    const s = PROP_STYLES[k];
    assert.ok(s, `missing style for ${k}`);
    assert.ok(s.left && s.top && typeof s.transform === 'string', `incomplete style for ${k}`);
  }
});

test('resolvePropPlacement returns the base style for a lone prop', () => {
  assert.deepEqual(resolvePropPlacement('quadro_1', '3-0', 0, 1), PROP_STYLES.quadro_1);
});

test('resolvePropPlacement fans same-kind duplicates to distinct lefts', () => {
  const a = resolvePropPlacement('lampada_acesa', '3-0', 0, 2);
  const b = resolvePropPlacement('lampada_acesa', '3-1', 1, 2);
  assert.notEqual(a.left, b.left);
  // top + transform stay put — only horizontal placement changes
  assert.equal(a.top, PROP_STYLES.lampada_acesa.top);
  assert.equal(a.transform, PROP_STYLES.lampada_acesa.transform);
});

test('resolvePropPlacement is deterministic for the same prop', () => {
  assert.deepEqual(
    resolvePropPlacement('cadeira', '5-2', 1, 3),
    resolvePropPlacement('cadeira', '5-2', 1, 3),
  );
});

test('resolvePropPlacement falls back to PROP_DEFAULT for unknown kinds', () => {
  assert.deepEqual(resolvePropPlacement('not-a-prop', 'x', 0, 1), PROP_DEFAULT);
});

test('fillClue substitutes the pt-BR direction word', () => {
  assert.equal(fillClue('o caminho é a {dir}.', 'right'), 'o caminho é a direita.');
  assert.ok(!fillClue('{dir} {dir}', 'ahead').includes('{dir}'));
});

test('every clue template carries a {dir} placeholder', () => {
  for (const t of CLUE_EXIT) {
    assert.ok(t.includes('{dir}'), `template missing {dir}: ${t}`);
  }
  assert.ok(CLUE_EXIT.length > 0);
});

test('CLUE_DREAD ramps from a calm (empty) line up to a non-empty warning', () => {
  // the invariant dreadFor relies on: index 0 is calm/empty, the last is the loudest
  assert.equal(CLUE_DREAD[0], '', 'the first dread level is calm/empty');
  assert.ok(CLUE_DREAD.length >= 2, 'the ramp needs at least two levels');
  assert.ok(CLUE_DREAD[CLUE_DREAD.length - 1].length > 0, 'the final dread level must warn');
});

test('dreadFor escalates from calm to unbearable across the budget', () => {
  const N = 3;
  const first = dreadFor(1, N);
  const last = dreadFor(N, N);
  assert.equal(first.intensity, 'far');
  assert.equal(last.intensity, 'close');
  assert.ok(last.text.length > 0, 'the last safe clue must carry a warning');
  for (let k = 1; k <= N; k++) {
    const d = dreadFor(k, N);
    assert.ok(['far', 'near', 'close'].includes(d.intensity), `bad band at k=${k}`);
    assert.equal(typeof d.text, 'string');
  }
});

test('dreadFor handles a budget of 1 (single safe clue is the strongest warning)', () => {
  const d = dreadFor(1, 1);
  assert.equal(d.intensity, 'close');
  assert.ok(d.text.length > 0);
});
