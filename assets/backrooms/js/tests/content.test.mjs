import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillHint, cueFor, tauntFor, DIR_PT, PROP_KINDS, PROP_NAMES, propName, PROP_SPRITES, toggleLamp, placeRoomProps, PEOPLE, personById, PROP_STYLES, PROP_DEFAULT, resolvePropPlacement, CLUE_EXIT, CLUE_DREAD, fillClue, dreadFor } from '../content.js';

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

test('tauntFor taunts the wanderer; unknown entity types have none', () => {
  assert.ok(typeof tauntFor('wanderer') === 'string' && tauntFor('wanderer').length > 0);
  for (const t of ['hunter','sprinter','stalker']) assert.equal(tauntFor(t), undefined);
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

test('PROP_SPRITES backs every prop kind with an image; lamps map to on/off', () => {
  for (const k of PROP_KINDS) {
    assert.ok(PROP_SPRITES[k], `missing sprite for ${k}`);
    assert.match(PROP_SPRITES[k], /\.(png|jpg)$/, `bad sprite url for ${k}`);
  }
  assert.match(PROP_SPRITES.lampada_acesa, /lamp-on\.png$/);
  assert.match(PROP_SPRITES.lampada_apagada, /lamp-off\.png$/);
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

test('placeRoomProps fans out two lamps and keeps them put when one is toggled', () => {
  // Two lamps in a room → they must occupy distinct lanes, not stack.
  const off = [
    { id: '3-0', kind: 'lampada_apagada' },
    { id: '3-1', kind: 'lampada_apagada' },
  ];
  const before = placeRoomProps(off);
  assert.notEqual(before[0].left, before[1].left, 'two lamps should fan out');

  // Toggle the first lamp on — same physical objects, just different kinds.
  const toggled = [
    { id: '3-0', kind: 'lampada_acesa' },
    { id: '3-1', kind: 'lampada_apagada' },
  ];
  const after = placeRoomProps(toggled);
  assert.notEqual(after[0].left, after[1].left, 'toggling must NOT collapse them onto each other');
  assert.equal(after[0].left, before[0].left, 'the toggled lamp does not move');
  assert.equal(after[1].left, before[1].left, 'the other lamp does not move');
});

test('placeRoomProps still fans out same-kind non-lamp props', () => {
  const placed = placeRoomProps([
    { id: '4-0', kind: 'quadro_1' },
    { id: '4-1', kind: 'quadro_1' },
  ]);
  assert.notEqual(placed[0].left, placed[1].left);
});

test('propName gives a readable, slug-free label and a safe fallback', () => {
  assert.equal(propName('quadro_1'), 'o quadro');
  assert.equal(propName('cadeira'), 'a cadeira');
  assert.equal(propName('lixeira'), 'a lixeira');
  assert.equal(propName('not-a-prop'), 'o objeto');
  for (const k of Object.keys(PROP_NAMES)) assert.ok(!propName(k).includes('_'), `slug leaked for ${k}`);
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

test('CLUE_DREAD is a non-empty ramp of escalating warnings', () => {
  assert.ok(CLUE_DREAD.length >= 2, 'the ramp needs at least two levels');
  for (const line of CLUE_DREAD) assert.ok(line.length > 0, 'every dread line warns');
});

test('dreadFor returns the dread line at the given clue index', () => {
  for (let i = 0; i < CLUE_DREAD.length; i++) {
    assert.equal(dreadFor(i).text, CLUE_DREAD[i], `index ${i}`);
    assert.ok(dreadFor(i).text.length > 0, `line ${i} should warn`);
  }
});

test('across a run the dread walks the whole ramp in order, clue by clue', () => {
  // game.js shows dreadFor(cluesUsed - 1) for cluesUsed 1..length before the death fires,
  // so a full run reveals every CLUE_DREAD line in escalating order.
  const shown = [];
  for (let cluesUsed = 1; cluesUsed <= CLUE_DREAD.length; cluesUsed++) {
    shown.push(dreadFor(cluesUsed - 1).text);
  }
  assert.deepEqual(shown, CLUE_DREAD, 'each clue reveals the next dread line, in order');
});
