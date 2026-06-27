# Backrooms Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a procedurally-generated, point-and-click backrooms game that runs entirely in the browser as a standalone page on `luccaaugusto.xyz`.

**Architecture:** A pure, DOM-free game core (RNG, graph, map generation, entities, tick reducer) under `assets/js/backrooms/`, consumed by a thin DOM view layer (first-person CSS scene, shared message/dialog component, intro video, win screen) and a `main.js` controller. The game tick *is* the player's click: the player acts, then entities advance by their speed, then the game resolves catches/traps/cues. Native ES modules, no bundler, no build step.

**Tech Stack:** Vanilla ES modules (browser-native `<script type="module">`), CSS (perspective/gradients, no preprocessor of our own), Jekyll 4 static page, Node's built-in test runner (`node --test`) for the pure core. No third-party dependencies.

## Global Constraints

- **No bundler / no build step.** All JS is native ES modules with explicit `.js` extensions in import specifiers (browsers and node both require this). Loaded via `<script type="module">`.
- **Pure core never touches the DOM.** `rng.js`, `graph.js`, `mapgen.js`, `entities.js`, `game.js`, `content.js` import nothing from the browser. Only `render.js`, `messages.js`, `winscreen.js`, `intro.js`, `main.js` touch `document`/`window`.
- **Tests run on the HOST with `node --test`** (host has node v22.23.1; the site already runs host node for `scripts/*.mjs`). The Docker golden rule applies to the **Ruby/Jekyll build and the dev server** — browser/manual verification is done against the Dockerized dev server at **http://localhost:4004** (port 4004, not 4000).
- **`assets/js/backrooms/package.json`** must contain exactly `{"type":"module"}` so node loads the `.js` source files as ESM.
- **Language & tone:** in-game text is Portuguese (pt-BR), playful/irreverent, matching the site. CSS class prefix is `br-` (backrooms) to avoid clashing with the site's Portuguese class names.
- **Win** → redirect to `config.WIN_URL` (`/`) via the win screen's button. **Lose** (caught / trap / rigged prop) → redirect to `config.LOSE_URL` (`https://google.com`). Losing is terminal — no restart.
- **The user runs git commits themselves.** Commit steps below are the natural task boundaries, but do **not** run `git commit` on the user's behalf — stage the work and let the user commit.

---

## File Structure

All game files under `assets/js/backrooms/` unless noted.

| File | Kind | Responsibility |
|------|------|----------------|
| `package.json` | config | `{"type":"module"}` — makes node treat `.js` here as ESM. |
| `config.js` | data | All tunables. Single source of truth. |
| `rng.js` | pure | Seedable PRNG + `randInt`/`pick`/`shuffle`. |
| `graph.js` | pure | Direction constants, reciprocal/delta maps, BFS (`bfsDistances`, `shortestStep`, `shortestPath`), `neighborIds`. |
| `mapgen.js` | pure | `makeRoom`, `connect`, `buildGraph`, `generateMap`, `placeContent`, `chooseEntitySpawns`, `layoutVisited`. |
| `entities.js` | pure | `decide` (per-archetype brain) + `stepEntities` (advance by speed, detect catch). |
| `game.js` | pure | `createGame` + `tick(state, action) → {state, events}`. |
| `content.js` | data | pt-BR pools: props, hint templates, cues, taunts, trap deaths, win text + tiny selector helpers. |
| `messages.js` | DOM | `showCue()` (transient strip) + `showDialog()` (modal w/ optional image). |
| `render.js` | DOM | `renderRoom(state, onAction)` first-person scene; `resolveVisual()`. |
| `winscreen.js` | DOM | `showWinScreen(state)` — draws the visited-map. |
| `intro.js` | DOM | `playIntro(config) → Promise` — mood video, skippable, fallback. |
| `main.js` | DOM | Controller: intro → create game → render → click→tick→render loop → redirects. |
| `tests/*.test.mjs` | test | Node test files for the pure core. |
| `backrooms.html` | page | Standalone full-screen page (repo root). |
| `assets/css/backrooms.css` | css | Scene + UI styling. |
| `assets/backrooms/intro.mp4` | asset | Intro video (provided separately; game tolerates its absence). |

> **Note — `graph.js` is a small refinement of the spec's module table** (which folded BFS into `entities.js`). BFS is needed by `mapgen` (exit placement, true-path), `entities` (pathing), and `game` (cues), so it lives in one shared pure module for DRY.

---

## Data Shapes (authoritative — every task uses these)

```js
// Direction is one of: 'ahead' | 'back' | 'left' | 'right'

// Room (immutable map template; runtime 'visited' lives in game state, NOT here)
Room = {
  id: number,                                  // 0..ROOM_COUNT-1, also the index into rooms[]
  doors: { ahead?: number, back?: number, left?: number, right?: number }, // dir -> roomId
  props: Array<{ id: string, kind: string, rigged: boolean }>,
  hint:  { text: string, deceptive: boolean, targetDir: Direction } | null,
  trap:  { kind: string } | null,
  isExit: boolean,
}

Map = { rooms: Room[], spawnId: number, exitId: number }

Entity = { id: number, type: 'hunter'|'sprinter'|'wanderer'|'stalker', speed: number, roomId: number }

GameState = {
  config, rng,                 // rng: () => number in [0,1)
  rooms: Room[], spawnId, exitId,
  playerRoom: number,
  visited: Set<number>,
  entities: Entity[],
  status: 'playing'|'won'|'lost',
  loseReason: 'caught'|'trap'|'rigged'|null,
}

Action = { type:'move', dir:Direction } | { type:'interact', propId:string } | { type:'exit' }

Event =
  | { type:'move', toRoom:number }
  | { type:'flavor', text:string }
  | { type:'cue', text:string, intensity:'close'|'near'|'far' }
  | { type:'win', text:string }
  | { type:'lose', reason:'caught'|'trap'|'rigged', text:string, image:string|null }
```

---

## Task 1: Scaffold + config + seedable RNG

**Files:**
- Create: `assets/js/backrooms/package.json`
- Create: `assets/js/backrooms/config.js`
- Create: `assets/js/backrooms/rng.js`
- Create: `assets/js/backrooms/tests/rng.test.mjs`
- Modify: `_config.yml` (add `exclude` entries)

**Interfaces:**
- Produces: `makeRng(seed:number) → (() => number)`; `randInt(rng, minIncl, maxIncl) → number`; `pick(rng, arr) → element`; `shuffle(rng, arr) → newArray`; `config` (default export object).

- [ ] **Step 1: Create `assets/js/backrooms/package.json`**

```json
{ "type": "module" }
```

- [ ] **Step 2: Create `assets/js/backrooms/config.js`**

```js
export const config = {
  ROOM_COUNT: 25,
  MAX_DEGREE: 4,
  SPAWN_MAX_DOORS: 3,
  EXIT_MAX_DOORS: 3,
  EXTRA_EDGE_RATIO: 0.15,        // extra edges ≈ ROOM_COUNT * ratio
  entities: [
    { type: 'hunter',   count: 1, speed: 1 },
    { type: 'sprinter', count: 1, speed: 2 },
    { type: 'wanderer', count: 1, speed: 1 },
    { type: 'stalker',  count: 1, speed: 1 },
  ],
  STALKER_AMBUSH_RANGE: 3,       // stalker closes in when player within this many rooms
  TRAP_ROOM_COUNT: 3,
  RIGGED_PROP_CHANCE: 0.15,
  DECEPTIVE_HINT_RATIO: 0.4,
  HINT_ROOM_CHANCE: 0.5,         // fraction of rooms that carry a hint
  PROPS_PER_ROOM: [0, 3],        // inclusive range
  CUE_THRESHOLDS: { close: 1, near: 2, far: 3 },
  INTRO_VIDEO: '/assets/backrooms/intro.mp4',
  INTRO_SKIPPABLE: true,
  INTRO_FALLBACK_MS: 4000,
  WIN_URL: '/',
  LOSE_URL: 'https://google.com',
  SEED: null,                    // null → seed from time / ?seed=
};

export default config;
```

- [ ] **Step 3: Write the failing test `assets/js/backrooms/tests/rng.test.mjs`**

```js
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `node --test assets/js/backrooms/tests/rng.test.mjs`
Expected: FAIL — `Cannot find module '../rng.js'`.

- [ ] **Step 5: Create `assets/js/backrooms/rng.js`**

```js
// mulberry32 — small, fast, seedable PRNG.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, minIncl, maxIncl) {
  return minIncl + Math.floor(rng() * (maxIncl - minIncl + 1));
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test assets/js/backrooms/tests/rng.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 7: Exclude dev-only files from the Jekyll build**

In `_config.yml`, add (or extend) an `exclude:` key so node-only files never ship to `_site/`:

```yaml
exclude:
  - assets/js/backrooms/tests
  - assets/js/backrooms/package.json
```

Then restart the dev server (config is not hot-reloaded): `docker compose restart site`.

- [ ] **Step 8: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/package.json assets/js/backrooms/config.js assets/js/backrooms/rng.js assets/js/backrooms/tests/rng.test.mjs _config.yml
# leave the actual `git commit` to the user
```

---

## Task 2: Graph module (directions + BFS)

**Files:**
- Create: `assets/js/backrooms/graph.js`
- Create: `assets/js/backrooms/tests/graph.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `DIRS:string[]`, `RECIPROCAL:object`, `DELTA:object`; `neighborIds(room) → number[]`; `bfsDistances(rooms, fromId) → Map<id,dist>`; `shortestStep(rooms, fromId, toId) → number|null` (first room on the shortest path, or null if same/unreachable); `shortestPath(rooms, fromId, toId) → number[]|null` (inclusive of both ends).

- [ ] **Step 1: Write the failing test `assets/js/backrooms/tests/graph.test.mjs`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test assets/js/backrooms/tests/graph.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `assets/js/backrooms/graph.js`**

```js
export const DIRS = ['ahead', 'back', 'left', 'right'];
export const RECIPROCAL = { ahead: 'back', back: 'ahead', left: 'right', right: 'left' };
// Screen-ish deltas for the win-screen layout: ahead = up.
export const DELTA = { ahead: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] };

export function neighborIds(room) {
  const out = [];
  for (const d of DIRS) if (room.doors[d] !== undefined) out.push(room.doors[d]);
  return out;
}

export function bfsDistances(rooms, fromId) {
  const dist = new Map([[fromId, 0]]);
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of neighborIds(rooms[cur])) {
      if (!dist.has(nb)) { dist.set(nb, dist.get(cur) + 1); queue.push(nb); }
    }
  }
  return dist;
}

function bfsParents(rooms, fromId, toId) {
  const parent = new Map([[fromId, fromId]]);
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === toId) break;
    for (const nb of neighborIds(rooms[cur])) {
      if (!parent.has(nb)) { parent.set(nb, cur); queue.push(nb); }
    }
  }
  return parent;
}

export function shortestStep(rooms, fromId, toId) {
  if (fromId === toId) return null;
  const parent = bfsParents(rooms, fromId, toId);
  if (!parent.has(toId)) return null;
  let node = toId;
  while (parent.get(node) !== fromId) node = parent.get(node);
  return node;
}

export function shortestPath(rooms, fromId, toId) {
  const parent = bfsParents(rooms, fromId, toId);
  if (!parent.has(toId)) return null;
  const path = [toId];
  while (path[0] !== fromId) path.unshift(parent.get(path[0]));
  return path;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test assets/js/backrooms/tests/graph.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/graph.js assets/js/backrooms/tests/graph.test.mjs
```

---

## Task 3: Map generation — graph build + spawn/exit

**Files:**
- Create: `assets/js/backrooms/mapgen.js`
- Create: `assets/js/backrooms/tests/mapgen.test.mjs`

**Interfaces:**
- Consumes: `graph.js` (`DIRS`, `RECIPROCAL`, `bfsDistances`, `shortestPath`, `neighborIds`), `rng.js` (`randInt`, `pick`, `shuffle`).
- Produces: `makeRoom(id) → Room`; `degree(room) → number`; `canConnect(rooms, aId, bId, dir, maxDegree) → bool`; `connect(rooms, aId, bId, dir)`; `buildGraph(config, rng) → Room[]`; `generateMap(config, rng) → Map` (this task: build + spawn + exit; **Task 4 extends it to also call `placeContent`**).

- [ ] **Step 1: Write the failing test `assets/js/backrooms/tests/mapgen.test.mjs`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test assets/js/backrooms/tests/mapgen.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `assets/js/backrooms/mapgen.js`** (graph build + spawn/exit only; content added in Task 4)

```js
import { DIRS, RECIPROCAL, bfsDistances, shortestPath, neighborIds } from './graph.js';
import { randInt, pick, shuffle } from './rng.js';

export function makeRoom(id) {
  return { id, doors: {}, props: [], hint: null, trap: null, isExit: false };
}

export function degree(room) {
  let n = 0;
  for (const d of DIRS) if (room.doors[d] !== undefined) n++;
  return n;
}

export function connect(rooms, aId, bId, dir) {
  rooms[aId].doors[dir] = bId;
  rooms[bId].doors[RECIPROCAL[dir]] = aId;
}

export function canConnect(rooms, aId, bId, dir, maxDegree) {
  if (aId === bId) return false;
  if (rooms[aId].doors[dir] !== undefined) return false;
  if (rooms[bId].doors[RECIPROCAL[dir]] !== undefined) return false;
  if (degree(rooms[aId]) >= maxDegree || degree(rooms[bId]) >= maxDegree) return false;
  if (neighborIds(rooms[aId]).includes(bId)) return false; // no duplicate edge
  return true;
}

export function buildGraph(config, rng) {
  const { ROOM_COUNT, MAX_DEGREE, EXTRA_EDGE_RATIO } = config;
  const rooms = Array.from({ length: ROOM_COUNT }, (_, i) => makeRoom(i));

  // Spanning tree: attach each new room to a random already-placed room → guarantees connectivity.
  for (let i = 1; i < ROOM_COUNT; i++) {
    let done = false;
    for (const j of shuffle(rng, Array.from({ length: i }, (_, k) => k))) {
      for (const dir of shuffle(rng, DIRS)) {
        if (canConnect(rooms, i, j, dir, MAX_DEGREE)) { connect(rooms, i, j, dir); done = true; break; }
      }
      if (done) break;
    }
    if (!done) { // fallback: any earlier room with any free reciprocal slot
      outer: for (let j = 0; j < i; j++) for (const dir of DIRS) {
        if (canConnect(rooms, i, j, dir, MAX_DEGREE)) { connect(rooms, i, j, dir); done = true; break outer; }
      }
    }
  }

  // Extra edges → loops & dead-ends (meaningful choices).
  const target = Math.round(ROOM_COUNT * EXTRA_EDGE_RATIO);
  let added = 0, attempts = 0;
  while (added < target && attempts < target * 50 + 50) {
    attempts++;
    const a = randInt(rng, 0, ROOM_COUNT - 1);
    const b = randInt(rng, 0, ROOM_COUNT - 1);
    const dir = pick(rng, DIRS);
    if (canConnect(rooms, a, b, dir, MAX_DEGREE)) { connect(rooms, a, b, dir); added++; }
  }
  return rooms;
}

function isConnected(rooms) {
  return bfsDistances(rooms, 0).size === rooms.length;
}

function pickSpawn(rooms, config, rng) {
  const eligible = rooms.filter(r => degree(r) <= config.SPAWN_MAX_DOORS);
  return pick(rng, eligible.length ? eligible : rooms).id;
}

function pickExit(rooms, spawnId, config) {
  const dist = bfsDistances(rooms, spawnId);
  let best = spawnId, bestD = -1;
  for (const r of rooms) {
    if (r.id === spawnId || degree(r) > config.EXIT_MAX_DOORS) continue;
    const d = dist.get(r.id) ?? -1;
    if (d > bestD) { bestD = d; best = r.id; }
  }
  return best;
}

export function generateMap(config, rng) {
  let rooms, tries = 0;
  do { rooms = buildGraph(config, rng); tries++; } while (!isConnected(rooms) && tries < 20);
  if (!isConnected(rooms)) throw new Error('mapgen: failed to build a connected graph');

  const spawnId = pickSpawn(rooms, config, rng);
  const exitId = pickExit(rooms, spawnId, config);
  rooms[exitId].isExit = true;
  return { rooms, spawnId, exitId };
  // NOTE: Task 4 inserts placeContent(map, config, rng) before returning.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test assets/js/backrooms/tests/mapgen.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/mapgen.js assets/js/backrooms/tests/mapgen.test.mjs
```

---

## Task 4: Content pools, placement, entity spawns, and the win-screen layout

**Files:**
- Create: `assets/js/backrooms/content.js`
- Modify: `assets/js/backrooms/mapgen.js` (add `placeContent`, `chooseEntitySpawns`, `layoutVisited`; call `placeContent` from `generateMap`)
- Create: `assets/js/backrooms/tests/content.test.mjs`
- Modify: `assets/js/backrooms/tests/mapgen.test.mjs` (add placement + layout tests)

**Interfaces:**
- Consumes: `graph.js` (`DIRS`, `DELTA`, `shortestStep`, `shortestPath`, `bfsDistances`), `rng.js`, `content.js`.
- Produces (content.js): `DIR_PT`, `PROP_KINDS:string[]`, `PROP_EMOJI`, `ENTITY_EMOJI`, `HINT_TRUTHFUL:string[]`, `HINT_DECEPTIVE:string[]`, `fillHint(template,dir) → string`, `CUES`, `cueFor(type,intensity) → string`, `TAUNTS`, `tauntFor(type) → string`, `TRAP_DEATHS:Array<{text,image}>`, `RIGGED_DEATH:{text,image}`, `WIN_TEXT:string`.
- Produces (mapgen.js): `placeContent(map, config, rng) → map`; `chooseEntitySpawns(map, config, rng) → Entity[]`; `layoutVisited(rooms, visited:Set, spawnId) → Map<id,{x,y}>`.

- [ ] **Step 1: Create `assets/js/backrooms/content.js`**

```js
export const DIR_PT = { ahead: 'frente', back: 'tras', left: 'esquerda', right: 'direita' };

export const PROP_KINDS = ['quadro', 'lampada', 'cadeira', 'caixa', 'espelho', 'cano', 'tomada', 'mancha'];
export const PROP_EMOJI = {
  quadro: '🖼️', lampada: '💡', cadeira: '🪑', caixa: '📦',
  espelho: '🪞', cano: '🚰', tomada: '🔌', mancha: '🩸',
};
export const ENTITY_EMOJI = { hunter: '🫥', sprinter: '🏃', wanderer: '👁️', stalker: '🕴️' };

export const HINT_TRUTHFUL = [
  'a saida e pra {dir}.',
  'segue pra {dir}, eu vi a luz la.',
  'confia: {dir} te tira daqui.',
];
export const HINT_DECEPTIVE = [
  'a salvacao ta pra {dir}.',
  '{dir}... so {dir}. corre.',
  'eu sai por {dir}. juro.',
];
export function fillHint(template, dir) {
  return template.replaceAll('{dir}', DIR_PT[dir]);
}

export const CUES = {
  hunter:   { close: 'PASSOS pesados, do seu lado.', near: 'passos ecoando perto.', far: 'algo se arrasta longe.' },
  sprinter: { close: 'UM BAQUE correndo na sua direcao!', near: 'algo acelera no corredor.', far: 'um tropel distante.' },
  wanderer: { close: 'uma respiracao molhada por perto.', near: 'um murmurio vagando.', far: 'ecos sem rumo.' },
  stalker:  { close: 'voce sente que NAO esta sozinho.', near: 'cheiro de mofo se aproxima.', far: 'algo observa de longe.' },
};
export function cueFor(type, intensity) { return CUES[type][intensity]; }

export const TAUNTS = {
  hunter:   'ele te alcancou. as paredes amarelas sao a ultima coisa que voce ve.',
  sprinter: 'rapido demais. voce nem viu chegar.',
  wanderer: 'voce esbarrou nele no escuro. fim.',
  stalker:  'a dica era mentira. ele sorri.',
};
export function tauntFor(type) { return TAUNTS[type]; }

export const TRAP_DEATHS = [
  { text: 'o chao cede. voce cai pra dentro do nada amarelo.', image: null },
  { text: 'a sala se fecha. nao havia saida — so a sua pressa.', image: null },
];
export const RIGGED_DEATH = { text: 'voce nao devia ter tocado nisso.', image: null };

export const WIN_TEXT = 'voce achou a saida. as luzes fluorescentes apagam atras de voce.';
```

- [ ] **Step 2: Write the failing test `assets/js/backrooms/tests/content.test.mjs`**

```js
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
```

- [ ] **Step 3: Run content test to verify it passes** (content.js already written)

Run: `node --test assets/js/backrooms/tests/content.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 4: Add placement + layout tests to `assets/js/backrooms/tests/mapgen.test.mjs`**

Append:

```js
import { placeContent, chooseEntitySpawns, layoutVisited, makeRoom, connect } from '../mapgen.js';

test('placeContent never puts a deceptive hint on a true-path door', () => {
  for (let seed = 0; seed < 25; seed++) {
    const map = gen(seed);
    const { rooms, spawnId, exitId } = map;
    const path = shortestPath(rooms, spawnId, exitId);
    const trueDoors = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const dir = DIRS.find(d => rooms[a].doors[d] === b);
      trueDoors.add(`${a}:${dir}`);
    }
    for (const r of rooms) {
      if (r.hint && r.hint.deceptive) assert.ok(!trueDoors.has(`${r.id}:${r.hint.targetDir}`),
        `deceptive hint on true path at room ${r.id}`);
    }
  }
});

test('trap rooms avoid spawn, exit, and the true path', () => {
  const map = gen(7);
  const { rooms, spawnId, exitId } = map;
  const path = new Set(shortestPath(rooms, spawnId, exitId));
  for (const r of rooms) if (r.trap) {
    assert.notEqual(r.id, spawnId);
    assert.notEqual(r.id, exitId);
    assert.ok(!path.has(r.id));
  }
});

test('chooseEntitySpawns matches the roster and avoids spawn', () => {
  const map = gen(8);
  const ents = chooseEntitySpawns(map, config, makeRng(8));
  assert.equal(ents.length, config.entities.reduce((s, e) => s + e.count, 0));
  for (const e of ents) assert.notEqual(e.roomId, map.spawnId);
});

test('layoutVisited places spawn at origin and uses direction deltas', () => {
  // line of 3 visited rooms via ahead doors
  const rooms = [makeRoom(0), makeRoom(1), makeRoom(2)];
  connect(rooms, 0, 1, 'ahead'); // 0 ahead -> 1
  connect(rooms, 1, 2, 'ahead'); // 1 ahead -> 2
  const coords = layoutVisited(rooms, new Set([0, 1, 2]), 0);
  assert.deepEqual(coords.get(0), { x: 0, y: 0 });
  assert.deepEqual(coords.get(1), { x: 0, y: -1 });
  assert.deepEqual(coords.get(2), { x: 0, y: -2 });
});
```

- [ ] **Step 5: Run to verify the new mapgen tests FAIL**

Run: `node --test assets/js/backrooms/tests/mapgen.test.mjs`
Expected: FAIL — `placeContent`/`chooseEntitySpawns`/`layoutVisited` are not exported yet.

- [ ] **Step 6: Extend `assets/js/backrooms/mapgen.js`**

Update the import line at the top to add `DELTA` and `shortestStep`, and import content:

```js
import { DIRS, RECIPROCAL, DELTA, bfsDistances, shortestPath, shortestStep, neighborIds } from './graph.js';
import { randInt, pick, shuffle } from './rng.js';
import * as C from './content.js';
```

Change the end of `generateMap` to populate content before returning:

```js
  rooms[exitId].isExit = true;
  const map = { rooms, spawnId, exitId };
  placeContent(map, config, rng);
  return map;
```

Add these exported functions to the file:

```js
export function placeContent(map, config, rng) {
  const { rooms, spawnId, exitId } = map;
  const path = shortestPath(rooms, spawnId, exitId);
  const truePathSet = new Set(path);
  const trueDoors = new Set();           // `${roomId}:${dir}` of doors along spawn→exit
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dir = DIRS.find(d => rooms[a].doors[d] === b);
    trueDoors.add(`${a}:${dir}`);
  }

  // Props
  for (const room of rooms) {
    if (room.id === spawnId) continue;
    const n = randInt(rng, config.PROPS_PER_ROOM[0], config.PROPS_PER_ROOM[1]);
    for (let k = 0; k < n; k++) {
      const kind = pick(rng, C.PROP_KINDS);
      const rigged = room.id !== exitId && rng() < config.RIGGED_PROP_CHANCE;
      room.props.push({ id: `${room.id}-${k}`, kind, rigged });
    }
  }

  // Trap rooms: off the true path, never spawn/exit
  const offPath = rooms.filter(r => !truePathSet.has(r.id) && r.id !== spawnId && r.id !== exitId);
  for (const r of shuffle(rng, offPath).slice(0, config.TRAP_ROOM_COUNT)) r.trap = { kind: 'pit' };

  // Hints
  for (const room of rooms) {
    if (room.id === exitId) continue;
    if (rng() > config.HINT_ROOM_CHANCE) continue;
    const doorDirs = DIRS.filter(d => room.doors[d] !== undefined);
    if (!doorDirs.length) continue;
    if (rng() < config.DECEPTIVE_HINT_RATIO) {
      const lyingDirs = doorDirs.filter(d => !trueDoors.has(`${room.id}:${d}`));
      if (!lyingDirs.length) continue;                 // can't lie without hitting the true path → skip
      const dir = pick(rng, lyingDirs);
      room.hint = { text: C.fillHint(pick(rng, C.HINT_DECEPTIVE), dir), deceptive: true, targetDir: dir };
    } else {
      const stepTo = shortestStep(rooms, room.id, exitId);
      const dir = DIRS.find(d => room.doors[d] === stepTo) ?? pick(rng, doorDirs);
      room.hint = { text: C.fillHint(pick(rng, C.HINT_TRUTHFUL), dir), deceptive: false, targetDir: dir };
    }
  }
  return map;
}

export function chooseEntitySpawns(map, config, rng) {
  const { rooms, spawnId } = map;
  const dist = bfsDistances(rooms, spawnId);
  const far = rooms.filter(r => r.id !== spawnId && (dist.get(r.id) ?? 0) >= 2).map(r => r.id);
  const trapIds = rooms.filter(r => r.trap).map(r => r.id);
  const all = rooms.map(r => r.id).filter(id => id !== spawnId);
  const spawns = [];
  let id = 0;
  for (const entry of config.entities) {
    for (let k = 0; k < entry.count; k++) {
      let roomId;
      if (entry.type === 'stalker' && trapIds.length) roomId = pick(rng, trapIds);
      else roomId = pick(rng, far.length ? far : all);
      spawns.push({ id: id++, type: entry.type, speed: entry.speed, roomId });
    }
  }
  return spawns;
}

export function layoutVisited(rooms, visited, spawnId) {
  const coords = new Map([[spawnId, { x: 0, y: 0 }]]);
  const queue = [spawnId];
  while (queue.length) {
    const cur = queue.shift();
    const { x, y } = coords.get(cur);
    for (const dir of DIRS) {
      const nb = rooms[cur].doors[dir];
      if (nb === undefined || !visited.has(nb) || coords.has(nb)) continue;
      const [dx, dy] = DELTA[dir];
      coords.set(nb, { x: x + dx, y: y + dy });
      queue.push(nb);
    }
  }
  return coords;
}
```

- [ ] **Step 7: Run to verify all mapgen tests pass**

Run: `node --test assets/js/backrooms/tests/mapgen.test.mjs`
Expected: PASS (10 tests: 6 from Task 3 + 4 new).

- [ ] **Step 8: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/content.js assets/js/backrooms/mapgen.js assets/js/backrooms/tests/content.test.mjs assets/js/backrooms/tests/mapgen.test.mjs
```

---

## Task 5: Entity brains + movement

**Files:**
- Create: `assets/js/backrooms/entities.js`
- Create: `assets/js/backrooms/tests/entities.test.mjs`

**Interfaces:**
- Consumes: `graph.js` (`neighborIds`, `shortestStep`, `bfsDistances`), `rng.js` (`pick`).
- Produces: `decide(state, entity, rng) → number|null` (one step's destination roomId); `stepEntities(state, rng) → { entities:Entity[], caught:bool, caughtBy:Entity|null }` (advances every entity by its `speed`, returns NEW entity array; stops at the first catch). `state` must carry `rooms`, `playerRoom`, `entities`, `config`.

- [ ] **Step 1: Write the failing test `assets/js/backrooms/tests/entities.test.mjs`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test assets/js/backrooms/tests/entities.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `assets/js/backrooms/entities.js`**

```js
import { neighborIds, shortestStep, bfsDistances } from './graph.js';
import { pick } from './rng.js';

export function decide(state, entity, rng) {
  const { rooms, playerRoom } = state;
  switch (entity.type) {
    case 'hunter':
    case 'sprinter':
      return shortestStep(rooms, entity.roomId, playerRoom);
    case 'wanderer': {
      const nbs = neighborIds(rooms[entity.roomId]);
      return nbs.length ? pick(rng, nbs) : null;
    }
    case 'stalker': {
      const dist = bfsDistances(rooms, entity.roomId).get(playerRoom) ?? Infinity;
      if (dist <= state.config.STALKER_AMBUSH_RANGE) return shortestStep(rooms, entity.roomId, playerRoom);
      const nbs = neighborIds(rooms[entity.roomId]);
      return nbs.length ? pick(rng, nbs) : null;
    }
    default:
      return null;
  }
}

export function stepEntities(state, rng) {
  const entities = state.entities.map(e => ({ ...e }));
  let caught = false, caughtBy = null;
  for (const e of entities) {
    for (let s = 0; s < e.speed; s++) {
      const target = decide({ ...state, entities }, e, rng);
      if (target === null) break;
      e.roomId = target;
      if (e.roomId === state.playerRoom) { caught = true; caughtBy = e; break; }
    }
    if (caught) break;
  }
  return { entities, caught, caughtBy };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test assets/js/backrooms/tests/entities.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/entities.js assets/js/backrooms/tests/entities.test.mjs
```

---

## Task 6: Game state + tick (player actions, win/lose)

**Files:**
- Create: `assets/js/backrooms/game.js`
- Create: `assets/js/backrooms/tests/game.test.mjs`

**Interfaces:**
- Consumes: `mapgen.js` (`generateMap`, `chooseEntitySpawns`), `entities.js` (`stepEntities`), `graph.js` (`bfsDistances`), `content.js` (`TRAP_DEATHS`, `RIGGED_DEATH`, `tauntFor`, `cueFor`, `WIN_TEXT`).
- Produces: `createGame(config, rng) → GameState`; `tick(state, action) → { state:GameState, events:Event[] }`. `tick` returns the original state unchanged for illegal/no-op actions. This task implements player-action resolution, traps, rigged props, walking-into-an-entity, and win; **Task 7 adds entity advancement + cues**.

- [ ] **Step 1: Write the failing test `assets/js/backrooms/tests/game.test.mjs`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test assets/js/backrooms/tests/game.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `assets/js/backrooms/game.js`** (Task 7 will extend `tick`)

```js
import { generateMap, chooseEntitySpawns } from './mapgen.js';
import { stepEntities } from './entities.js';
import { bfsDistances } from './graph.js';
import * as C from './content.js';

export function createGame(config, rng) {
  const map = generateMap(config, rng);
  return {
    config, rng,
    rooms: map.rooms, spawnId: map.spawnId, exitId: map.exitId,
    playerRoom: map.spawnId,
    visited: new Set([map.spawnId]),
    entities: chooseEntitySpawns(map, config, rng),
    status: 'playing',
    loseReason: null,
  };
}

function cloneState(state) {
  return { ...state, visited: new Set(state.visited), entities: state.entities.map(e => ({ ...e })) };
}

export function tick(state, action) {
  if (state.status !== 'playing') return { state, events: [] };
  const events = [];
  const next = cloneState(state);

  // 1. Resolve the player's action.
  if (action.type === 'move') {
    const dest = next.rooms[next.playerRoom].doors[action.dir];
    if (dest === undefined) return { state, events: [] };          // illegal → no-op
    next.playerRoom = dest;
    next.visited.add(dest);
    events.push({ type: 'move', toRoom: dest });
    const room = next.rooms[dest];
    if (room.trap) {
      const death = C.TRAP_DEATHS[Math.floor(next.rng() * C.TRAP_DEATHS.length)];
      next.status = 'lost'; next.loseReason = 'trap';
      events.push({ type: 'lose', reason: 'trap', text: death.text, image: death.image });
      return { state: next, events };
    }
  } else if (action.type === 'interact') {
    const prop = next.rooms[next.playerRoom].props.find(p => p.id === action.propId);
    if (!prop) return { state, events: [] };                       // unknown prop → no-op
    if (prop.rigged) {
      next.status = 'lost'; next.loseReason = 'rigged';
      events.push({ type: 'lose', reason: 'rigged', text: C.RIGGED_DEATH.text, image: C.RIGGED_DEATH.image });
      return { state: next, events };
    }
    events.push({ type: 'flavor', text: `voce examina o ${prop.kind}. nada.` });
  } else if (action.type === 'exit') {
    if (next.playerRoom !== next.exitId) return { state, events: [] };
    next.status = 'won';
    events.push({ type: 'win', text: C.WIN_TEXT });
    return { state: next, events };
  } else {
    return { state, events: [] };
  }

  // 2. Did the player walk into an entity?
  for (const e of next.entities) {
    if (e.roomId === next.playerRoom) {
      next.status = 'lost'; next.loseReason = 'caught';
      events.push({ type: 'lose', reason: 'caught', text: C.tauntFor(e.type), image: null });
      return { state: next, events };
    }
  }

  // 3 & 4 (entity advance + cues) are added in Task 7.
  return { state: next, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test assets/js/backrooms/tests/game.test.mjs`
Expected: PASS (10 tests).

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/game.js assets/js/backrooms/tests/game.test.mjs
```

---

## Task 7: Tick — entity advancement + cues

**Files:**
- Modify: `assets/js/backrooms/game.js` (insert entity advance + cue computation into `tick`)
- Modify: `assets/js/backrooms/tests/game.test.mjs` (add advancement + cue tests)

**Interfaces:**
- Consumes: same as Task 6.
- Produces: `tick` now advances entities by speed after the player acts, loses on catch (`caught`), and emits a `cue` event from the nearest entity (or no cue when all are beyond `CUE_THRESHOLDS.far`).

- [ ] **Step 1: Add failing tests to `assets/js/backrooms/tests/game.test.mjs`**

Append:

```js
test('after the player moves, entities advance and can catch', () => {
  // player at 0 moves to 1; sprinter at 2 (speed 2) reaches 0 then 1? It targets player's NEW room (1).
  const s = fixture({ entities: [{ id: 0, type: 'hunter', speed: 1, roomId: 2 }] });
  const { state } = tick(s, { type: 'move', dir: 'ahead' }); // player 0->1, hunter 2->1 => caught
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
    entities: [{ id: 0, type: 'hunter', speed: 1, roomId: 4 }],
    status: 'playing', loseReason: null,
  };
  const { state, events } = tick(s, { type: 'move', dir: 'ahead' }); // player->1, hunter 4->3 (dist 2)
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
    status: 'playing', loseReason: null,
  };
  const { events } = tick(s, { type: 'interact', propId: 'none' }); // no-op interact returns original; use move instead
  // Move ahead so the player is at 1; wanderer somewhere ≥ dist 4 → silence likely. Assert no throw + cue optional.
  const r2 = tick(s, { type: 'move', dir: 'ahead' });
  const cue = r2.events.find(e => e.type === 'cue');
  if (cue) assert.ok(['near','far'].includes(cue.intensity)); // never 'close' from that distance
});
```

- [ ] **Step 2: Run to verify the new tests FAIL**

Run: `node --test assets/js/backrooms/tests/game.test.mjs`
Expected: FAIL — entities don't advance yet (the "after the player moves, entities advance and can catch" test fails; no `cue` events emitted).

- [ ] **Step 3: Edit `tick` in `assets/js/backrooms/game.js`**

Replace the `// 3 & 4 ... return { state: next, events };` tail with:

```js
  // 3. Advance entities by their speed.
  const res = stepEntities(next, next.rng);
  next.entities = res.entities;
  if (res.caught) {
    next.status = 'lost'; next.loseReason = 'caught';
    events.push({ type: 'lose', reason: 'caught', text: C.tauntFor(res.caughtBy.type), image: null });
    return { state: next, events };
  }

  // 4. Sensory cue from the nearest entity.
  const cue = computeCue(next);
  if (cue) events.push(cue);

  return { state: next, events };
}

function computeCue(state) {
  let nearestType = null, nearestDist = Infinity;
  for (const e of state.entities) {
    const d = bfsDistances(state.rooms, e.roomId).get(state.playerRoom) ?? Infinity;
    if (d < nearestDist) { nearestDist = d; nearestType = e.type; }
  }
  if (nearestType === null) return null;
  const t = state.config.CUE_THRESHOLDS;
  let intensity;
  if (nearestDist <= t.close) intensity = 'close';
  else if (nearestDist <= t.near) intensity = 'near';
  else if (nearestDist <= t.far) intensity = 'far';
  else return null;
  return { type: 'cue', text: C.cueFor(nearestType, intensity), intensity };
}
```

(Delete the now-duplicated closing `}` of the old `tick` — there must be exactly one. After editing, the file ends with `computeCue`.)

- [ ] **Step 4: Run to verify all game tests pass**

Run: `node --test assets/js/backrooms/tests/game.test.mjs`
Expected: PASS (13 tests).

- [ ] **Step 5: Run the entire pure-core suite**

Run: `node --test assets/js/backrooms/tests/`
Expected: PASS — all suites (rng, graph, mapgen, content, entities, game).

- [ ] **Step 6: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/game.js assets/js/backrooms/tests/game.test.mjs
```

---

## Task 8: Page shell + CSS skeleton + bootstrap

**Files:**
- Create: `backrooms.html` (repo root)
- Create: `assets/css/backrooms.css`
- Create: `assets/js/backrooms/main.js` (bootstrap only; the loop lands in Task 11)

**Interfaces:**
- Consumes: `config.js`, `game.js` (`createGame`).
- Produces: a live page at `/backrooms.html` that generates a game and shows a placeholder of the spawn room. Verified manually (no node test).

- [ ] **Step 1: Create `backrooms.html`** (standalone; front matter fence makes Jekyll process it but applies no layout)

```html
---
---
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>backrooms — luccaaugusto.xyz</title>
  <link rel="icon" href="/assets/icons/favicon.ico">
  <link rel="stylesheet" href="/assets/css/backrooms.css">
</head>
<body class="br-body">
  <main id="br-game" class="br-game"></main>
  <script type="module" src="/assets/js/backrooms/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `assets/css/backrooms.css`** (scene skeleton — perspective room with yellow wallpaper)

```css
:root {
  --br-wall: #c9b458;        /* backrooms yellow */
  --br-wall-dark: #a8923f;
  --br-ink: #1a1607;
  --br-buzz: #fff7c2;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
.br-body { background: #000; color: var(--br-ink); font-family: "Courier New", monospace; overflow: hidden; }
.br-game { position: fixed; inset: 0; }

/* First-person scene: a box with perspective; back wall + floor + ceiling. */
.br-scene { position: absolute; inset: 0; perspective: 700px; overflow: hidden;
  background: var(--br-wall-dark); }
.br-wall { position: absolute; inset: 8% 12%; background:
    repeating-linear-gradient(0deg, var(--br-wall) 0 38px, var(--br-wall-dark) 38px 40px),
    repeating-linear-gradient(90deg, var(--br-wall) 0 38px, var(--br-wall-dark) 38px 40px);
  box-shadow: inset 0 0 120px rgba(0,0,0,.55); }
.br-floor, .br-ceil { position: absolute; left: 0; right: 0; height: 50%;
  background: linear-gradient(var(--br-wall-dark), #5b4f22); }
.br-floor { bottom: 0; transform-origin: top; transform: rotateX(72deg); }
.br-ceil  { top: 0; transform-origin: bottom; transform: rotateX(-72deg);
  background: linear-gradient(#5b4f22, var(--br-wall-dark)); }

/* Doorways. */
.br-door { position: absolute; background: #0b0a04; border: 3px solid var(--br-ink);
  cursor: pointer; display: flex; align-items: flex-end; justify-content: center;
  color: var(--br-buzz); font-size: 12px; padding-bottom: 6px; letter-spacing: 2px; }
.br-door:hover { box-shadow: 0 0 24px var(--br-buzz); }
.br-door--ahead { width: 16%; height: 42%; left: 42%; top: 26%; }
.br-door--left  { width: 10%; height: 50%; left: 4%;  top: 24%; transform: perspective(400px) rotateY(38deg); }
.br-door--right { width: 10%; height: 50%; right: 4%; top: 24%; transform: perspective(400px) rotateY(-38deg); }
.br-door--back  { left: 50%; transform: translateX(-50%); bottom: 4%; width: 26%; height: 9%;
  border-radius: 6px; font-size: 14px; align-items: center; }
.br-door--exit  { background: #143d14; border-color: #6f6;
  box-shadow: 0 0 30px #6f6, inset 0 0 30px #2f2; }

/* Props + hint. */
.br-prop { position: absolute; font-size: 38px; cursor: pointer; filter: drop-shadow(0 2px 4px #000); }
.br-prop:hover { transform: scale(1.15); }
.br-hint { position: absolute; left: 50%; top: 16%; transform: translateX(-50%) rotate(-3deg);
  color: var(--br-ink); font-weight: bold; max-width: 40%; text-align: center;
  text-shadow: 0 1px 0 rgba(255,255,255,.25); }

/* Bootstrap placeholder (Task 8 only; removed once render.js lands). */
.br-debug { position: absolute; top: 8px; left: 8px; color: var(--br-buzz);
  font-size: 12px; white-space: pre; z-index: 10; }
```

- [ ] **Step 3: Create `assets/js/backrooms/main.js`** (bootstrap placeholder)

```js
import { config } from './config.js';
import { makeRng } from './rng.js';
import { createGame } from './game.js';

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '') return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

const game = createGame(config, makeRng(seedFromEnv()));
const root = document.getElementById('br-game');
const room = game.rooms[game.playerRoom];
root.innerHTML = `<pre class="br-debug">spawn=${game.spawnId} exit=${game.exitId} `
  + `rooms=${game.rooms.length}\nyou are in room ${room.id}\n`
  + `doors: ${Object.keys(room.doors).join(', ')}\n`
  + `entities: ${game.entities.map(e => e.type + '@' + e.roomId).join(', ')}</pre>`;
console.log('backrooms game state:', game);
```

- [ ] **Step 4: Manual verification**

Run: `docker compose up -d` then open `http://localhost:4004/backrooms.html`.
Expected:
- Page is black with yellow debug text top-left showing `spawn`, `exit`, `rooms=25`, the spawn room id, its door directions, and entity placements.
- DevTools console logs the full game-state object (inspect: `rooms` length 25, `visited` has the spawn).
- **View source** to confirm Jekyll output starts with `<!doctype html>` and there is **no** minima/magazine chrome. If a site-wide default layout wrapped the page, add `layout: none` between the `---` fences and re-check.

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add backrooms.html assets/css/backrooms.css assets/js/backrooms/main.js
```

---

## Task 9: Room renderer (first-person scene + clicks)

**Files:**
- Create: `assets/js/backrooms/render.js`
- Modify: `assets/js/backrooms/main.js` (use the renderer instead of the debug placeholder)

**Interfaces:**
- Consumes: `content.js` (`PROP_EMOJI`, `ENTITY_EMOJI`, `DIR_PT`), `graph.js` (`DIRS`).
- Produces: `resolveVisual(kind, map) → HTMLElement` (emoji span by default; swappable for `<img>` later); `renderRoom(root, state, onAction)` — draws the current room into `root` and calls `onAction(action)` on door/prop/exit clicks.

- [ ] **Step 1: Create `assets/js/backrooms/render.js`**

```js
import { DIRS } from './graph.js';
import { PROP_EMOJI, DIR_PT } from './content.js';

// Sprite registry seam: register a URL for a kind to swap the emoji for an <img>.
const SPRITES = Object.create(null); // e.g. SPRITES['prop:lampada'] = '/assets/backrooms/lamp.png'
export function registerSprite(key, url) { SPRITES[key] = url; }

export function resolveVisual(key, fallbackEmoji) {
  if (SPRITES[key]) {
    const img = document.createElement('img');
    img.src = SPRITES[key]; img.alt = key; img.className = 'br-sprite';
    return img;
  }
  const span = document.createElement('span');
  span.textContent = fallbackEmoji;
  return span;
}

// Hand-tuned prop anchor positions (cycled through as a room gets more props).
const PROP_SPOTS = [
  { left: '24%', top: '58%' }, { left: '68%', top: '60%' },
  { left: '14%', top: '40%' }, { left: '80%', top: '42%' },
];

export function renderRoom(root, state, onAction) {
  const room = state.rooms[state.playerRoom];
  root.innerHTML = '';

  const scene = document.createElement('div');
  scene.className = 'br-scene';
  scene.append(el('div', 'br-ceil'), el('div', 'br-floor'), el('div', 'br-wall'));

  // Doors
  for (const dir of DIRS) {
    if (room.doors[dir] === undefined) continue;
    const isExitDoor = state.rooms[room.doors[dir]].isExit;
    const door = el('button', `br-door br-door--${dir}` + (isExitDoor ? ' br-door--exit' : ''));
    door.textContent = isExitDoor ? 'SAÍDA' : DIR_PT[dir].toUpperCase();
    door.addEventListener('click', () => onAction({ type: 'move', dir }));
    scene.append(door);
  }

  // Exit door (special) when standing IN the exit room.
  if (room.isExit) {
    const ex = el('button', 'br-door br-door--ahead br-door--exit');
    ex.textContent = 'SAÍDA';
    ex.addEventListener('click', () => onAction({ type: 'exit' }));
    scene.append(ex);
  }

  // Props
  room.props.forEach((p, i) => {
    const spot = PROP_SPOTS[i % PROP_SPOTS.length];
    const node = resolveVisual(`prop:${p.kind}`, PROP_EMOJI[p.kind] || '❔');
    node.classList.add('br-prop');
    node.style.left = spot.left; node.style.top = spot.top;
    node.title = p.kind;
    node.addEventListener('click', () => onAction({ type: 'interact', propId: p.id }));
    scene.append(node);
  });

  // Hint
  if (room.hint) {
    const h = el('div', 'br-hint');
    h.textContent = room.hint.text;
    scene.append(h);
  }

  root.append(scene);
}

function el(tag, className) { const n = document.createElement(tag); n.className = className; return n; }
```

- [ ] **Step 2: Replace the placeholder body of `assets/js/backrooms/main.js`**

```js
import { config } from './config.js';
import { makeRng } from './rng.js';
import { createGame } from './game.js';
import { renderRoom } from './render.js';

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '') return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

let game = createGame(config, makeRng(seedFromEnv()));
const root = document.getElementById('br-game');

function onAction(action) {
  console.log('action', action);     // wired to tick in Task 11
}

renderRoom(root, game, onAction);
```

- [ ] **Step 3: Manual verification**

Open `http://localhost:4004/backrooms.html?seed=1`.
Expected:
- A yellow perspective room: ceiling, floor, papered back wall.
- Doorways appear only for directions the spawn room actually has (cross-check against the Task 8 debug output for `seed=1` if needed). Each door is labeled (FRENTE/ESQUERDA/DIREITA/TRÁS or SAÍDA).
- Props (if any) render as emoji at anchor spots; a hint (if any) shows as wall text.
- Clicking a door / prop logs the corresponding `action` in the console (no movement yet — that's Task 11).

- [ ] **Step 4: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/render.js assets/js/backrooms/main.js
```

---

## Task 10: Message component (cues + dialog)

**Files:**
- Create: `assets/js/backrooms/messages.js`
- Modify: `assets/css/backrooms.css` (cue strip + modal styles)

**Interfaces:**
- Consumes: nothing.
- Produces: `showCue(text, intensity)` — appends a transient, auto-fading line to a fixed strip; `showDialog({ text, image, onClose }) → Promise<void>` — full-screen modal; resolves (and runs `onClose`) when dismissed (or, for terminal screens, never auto-dismisses — caller drives the redirect).

- [ ] **Step 1: Add styles to `assets/css/backrooms.css`**

```css
.br-cues { position: fixed; left: 50%; bottom: 14%; transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 6px; align-items: center; z-index: 20; pointer-events: none; }
.br-cue { color: var(--br-buzz); background: rgba(0,0,0,.55); padding: 6px 14px; border-radius: 4px;
  font-size: 14px; letter-spacing: 1px; animation: br-fade 3.2s forwards; }
.br-cue--close { color: #ff5b5b; font-weight: bold; font-size: 17px; }
.br-cue--near  { color: #ffd35b; }
@keyframes br-fade { 0%{opacity:0} 12%{opacity:1} 78%{opacity:1} 100%{opacity:0} }

.br-modal { position: fixed; inset: 0; z-index: 30; background: rgba(0,0,0,.92);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
  color: var(--br-buzz); text-align: center; padding: 24px; }
.br-modal img { max-width: 70vw; max-height: 50vh; border: 3px solid var(--br-buzz); }
.br-modal p { font-size: 20px; max-width: 36ch; line-height: 1.5; }
.br-modal button { font: inherit; padding: 10px 22px; background: none; color: var(--br-buzz);
  border: 2px solid var(--br-buzz); cursor: pointer; letter-spacing: 2px; }
.br-modal button:hover { background: var(--br-buzz); color: #000; }
```

- [ ] **Step 2: Create `assets/js/backrooms/messages.js`**

```js
let cueStrip = null;
function ensureStrip() {
  if (!cueStrip) { cueStrip = document.createElement('div'); cueStrip.className = 'br-cues'; document.body.append(cueStrip); }
  return cueStrip;
}

export function showCue(text, intensity = 'far') {
  const strip = ensureStrip();
  const line = document.createElement('div');
  line.className = `br-cue br-cue--${intensity}`;
  line.textContent = text;
  strip.append(line);
  setTimeout(() => line.remove(), 3300);
}

// Resolves when the user dismisses it. If `button` is null the modal stays up (terminal screen).
export function showDialog({ text, image = null, button = 'continuar', onClose = null }) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'br-modal';
    if (image) { const img = document.createElement('img'); img.src = image; img.alt = ''; modal.append(img); }
    const p = document.createElement('p'); p.textContent = text; modal.append(p);
    if (button) {
      const b = document.createElement('button'); b.textContent = button;
      b.addEventListener('click', () => { modal.remove(); if (onClose) onClose(); resolve(); });
      modal.append(b);
    }
    document.body.append(modal);
  });
}
```

- [ ] **Step 3: Manual verification** (temporary console check)

Open `http://localhost:4004/backrooms.html`, then in DevTools console:

```js
const m = await import('/assets/js/backrooms/messages.js');
m.showCue('passos ecoando perto.', 'near');
m.showCue('UM BAQUE correndo na sua direcao!', 'close');
await m.showDialog({ text: 'teste de dialog', button: 'ok' });
```

Expected: two cue lines fade in/out near the bottom (the "close" one red & larger); the dialog appears centered over a dark overlay and dismisses on "ok".

- [ ] **Step 4: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/messages.js assets/css/backrooms.css
```

---

## Task 11: Wire the game loop (tick → render + messages → redirects)

**Files:**
- Modify: `assets/js/backrooms/main.js`

**Interfaces:**
- Consumes: `game.js` (`tick`), `render.js` (`renderRoom`), `messages.js` (`showCue`, `showDialog`), `content.js` (`ENTITY_EMOJI` for the scare — optional).
- Produces: the full click→tick→render loop; processes `events`; performs win/lose redirects.

- [ ] **Step 1: Rewrite `assets/js/backrooms/main.js`**

```js
import { config } from './config.js';
import { makeRng } from './rng.js';
import { createGame, tick } from './game.js';
import { renderRoom } from './render.js';
import { showCue, showDialog } from './messages.js';

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '') return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

const root = document.getElementById('br-game');
let game = createGame(config, makeRng(seedFromEnv()));
let busy = false;

async function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'cue') showCue(ev.text, ev.intensity);
    else if (ev.type === 'flavor') showCue(ev.text, 'far');
    else if (ev.type === 'win') {
      onWin();                       // Task 13 replaces this with the win screen
      return true;
    } else if (ev.type === 'lose') {
      // Buttonless dialog never resolves — do NOT await it; schedule the redirect directly.
      showDialog({ text: ev.text, image: ev.image, button: null });
      setTimeout(() => { location.href = config.LOSE_URL; }, 2200);
      return true;
    }
  }
  return false;
}

// Placeholder win until Task 13; redirects home after a beat.
function onWin() {
  showDialog({ text: 'VOCÊ ESCAPOU.', button: null });
  setTimeout(() => { location.href = config.WIN_URL; }, 2200);
}

async function onAction(action) {
  if (busy || game.status !== 'playing') return;
  busy = true;
  const { state, events } = tick(game, action);
  game = state;
  if (game.status === 'playing') renderRoom(root, game, onAction);
  const terminal = await handleEvents(events);
  if (!terminal) busy = false;       // stay locked once the game ends
}

renderRoom(root, game, onAction);
```

- [ ] **Step 2: Manual verification — navigation + win**

Open `http://localhost:4004/backrooms.html?seed=1`.
Expected:
- Clicking a doorway moves you to the next room (scene re-renders with that room's doors/props/hint). "TRÁS" returns you the way you came (reciprocal door).
- Cues appear at the bottom as entities close in (move several times).
- Navigate to the exit room (use `?seed=1` + the Task 8 debug, or just explore) and click the green **SAÍDA** door → "VOCÊ ESCAPOU." → redirect to `/`.

- [ ] **Step 3: Manual verification — lose paths**

- Walk into a trap room (or temporarily set `TRAP_ROOM_COUNT` high / use a known seed) → death dialog → redirect to google.com.
- Let a fast entity reach you (stand still by clicking a prop repeatedly) → "caught" dialog → redirect.
- Click a rigged prop (raise `RIGGED_PROP_CHANCE` to 1 temporarily to force it) → rigged death → redirect. **Revert the config change after.**

- [ ] **Step 4: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/main.js
```

---

## Task 12: Intro video

**Files:**
- Create: `assets/js/backrooms/intro.js`
- Modify: `assets/css/backrooms.css` (intro overlay)
- Modify: `assets/js/backrooms/main.js` (await `playIntro` before starting)
- Create (placeholder asset note): `assets/backrooms/` directory (the real `intro.mp4` is dropped in later)

**Interfaces:**
- Consumes: `config.js`.
- Produces: `playIntro(config) → Promise<void>` — shows a full-screen video; resolves when the video ends, on skip-click (if `INTRO_SKIPPABLE`), or after `INTRO_FALLBACK_MS` if the video errors/can't play.

- [ ] **Step 1: Add intro styles to `assets/css/backrooms.css`**

```css
.br-intro { position: fixed; inset: 0; z-index: 40; background: #000;
  display: flex; align-items: center; justify-content: center; cursor: pointer; }
.br-intro video { width: 100%; height: 100%; object-fit: cover; }
.br-intro__skip { position: absolute; bottom: 18px; right: 20px; color: var(--br-buzz);
  font-size: 13px; letter-spacing: 2px; opacity: .8; }
```

- [ ] **Step 2: Create `assets/js/backrooms/intro.js`**

```js
export function playIntro(config) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'br-intro';
    let done = false;
    const finish = () => { if (done) return; done = true; overlay.remove(); resolve(); };

    const video = document.createElement('video');
    video.src = config.INTRO_VIDEO;
    video.autoplay = true; video.muted = false; video.playsInline = true;
    video.addEventListener('ended', finish);
    video.addEventListener('error', () => setTimeout(finish, config.INTRO_FALLBACK_MS));
    overlay.append(video);

    if (config.INTRO_SKIPPABLE) {
      const skip = document.createElement('div');
      skip.className = 'br-intro__skip'; skip.textContent = 'clique para pular';
      overlay.append(skip);
      overlay.addEventListener('click', finish);
    }

    document.body.append(overlay);

    // Fallback: if the video never starts (missing file / autoplay blocked), hold black then continue.
    video.play?.().catch(() => setTimeout(finish, config.INTRO_FALLBACK_MS));
    setTimeout(() => { if (!video.duration) { /* no media loaded */ } }, config.INTRO_FALLBACK_MS + 200);
  });
}
```

- [ ] **Step 3: Start the game after the intro in `assets/js/backrooms/main.js`**

Wrap the bootstrap. Replace the final `renderRoom(root, game, onAction);` line with:

```js
import { playIntro } from './intro.js';   // add to the import block at the top

(async () => {
  await playIntro(config);
  renderRoom(root, game, onAction);
})();
```

(Move the `import { playIntro }` up with the other imports; the IIFE replaces the bare `renderRoom` call.)

- [ ] **Step 4: Manual verification**

- With **no** `intro.mp4` present: open `http://localhost:4004/backrooms.html`. Expected: a black screen for ~4s (`INTRO_FALLBACK_MS`), then the spawn room renders. The game never hangs.
- Drop any small `.mp4` at `assets/backrooms/intro.mp4`, reload. Expected: the video plays full-screen; "clique para pular" shows; clicking skips straight to the room; letting it end also starts the room.

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/intro.js assets/css/backrooms.css assets/js/backrooms/main.js
```

---

## Task 13: Win screen (visited-map drawing)

**Files:**
- Create: `assets/js/backrooms/winscreen.js`
- Modify: `assets/css/backrooms.css` (win-screen styles)
- Modify: `assets/js/backrooms/main.js` (call `showWinScreen` in `onWin`)

**Interfaces:**
- Consumes: `mapgen.js` (`layoutVisited`), `graph.js` (`DIRS`), `content.js` (`WIN_TEXT`), `config.js`.
- Produces: `showWinScreen(state, config)` — renders the visited subgraph as a hand-scrawled node-link map with a "voltar" button → `config.WIN_URL`.

- [ ] **Step 1: Add win-screen styles to `assets/css/backrooms.css`**

```css
.br-win { position: fixed; inset: 0; z-index: 35; background: #0c0b05; color: var(--br-buzz);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px; }
.br-win h1 { font-size: 22px; letter-spacing: 3px; margin: 0; }
.br-win p { max-width: 40ch; text-align: center; opacity: .85; margin: 0; }
.br-map { position: relative; width: min(80vw, 560px); height: min(56vh, 460px);
  border: 2px dashed rgba(255,247,194,.4); }
.br-node { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px;
  border: 2px solid var(--br-buzz); background: #1a1607; transform: rotate(-4deg); }
.br-node--spawn { background: #6f6; }
.br-node--exit  { background: #ff5b5b; }
.br-edge { position: absolute; height: 2px; background: rgba(255,247,194,.6); transform-origin: left center; }
.br-win button { font: inherit; padding: 10px 22px; background: none; color: var(--br-buzz);
  border: 2px solid var(--br-buzz); cursor: pointer; letter-spacing: 2px; }
.br-win button:hover { background: var(--br-buzz); color: #000; }
```

- [ ] **Step 2: Create `assets/js/backrooms/winscreen.js`**

```js
import { layoutVisited } from './mapgen.js';
import { DIRS } from './graph.js';
import { WIN_TEXT } from './content.js';

export function showWinScreen(state, config) {
  const coords = layoutVisited(state.rooms, state.visited, state.spawnId);

  // Normalize grid coords → pixels inside the map box.
  const xs = [...coords.values()].map(c => c.x), ys = [...coords.values()].map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const PAD = 28, W = 504, H = 404, STEP = 64;
  const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
  const px = c => PAD + (W - 2 * PAD) * ((c.x - minX) / spanX);
  const py = c => PAD + (H - 2 * PAD) * ((c.y - minY) / spanY);

  const overlay = document.createElement('div'); overlay.className = 'br-win';
  const h = document.createElement('h1'); h.textContent = 'VOCÊ ESCAPOU';
  const p = document.createElement('p'); p.textContent = WIN_TEXT;
  const map = document.createElement('div'); map.className = 'br-map';

  // Edges between visited neighbors (draw each undirected pair once).
  for (const [id, c] of coords) {
    for (const dir of DIRS) {
      const nb = state.rooms[id].doors[dir];
      if (nb === undefined || !coords.has(nb) || nb < id) continue;
      const a = { x: px(c), y: py(c) }, b = { x: px(coords.get(nb)), y: py(coords.get(nb)) };
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const edge = document.createElement('div'); edge.className = 'br-edge';
      edge.style.left = a.x + 'px'; edge.style.top = a.y + 'px';
      edge.style.width = len + 'px'; edge.style.transform = `rotate(${ang}deg)`;
      map.append(edge);
    }
  }
  // Nodes
  for (const [id, c] of coords) {
    const node = document.createElement('div');
    node.className = 'br-node' + (id === state.spawnId ? ' br-node--spawn' : '')
      + (id === state.exitId ? ' br-node--exit' : '');
    node.style.left = px(c) + 'px'; node.style.top = py(c) + 'px';
    node.title = `sala ${id}`;
    map.append(node);
  }

  const btn = document.createElement('button'); btn.textContent = 'voltar';
  btn.addEventListener('click', () => { location.href = config.WIN_URL; });

  overlay.append(h, p, map, btn);
  document.body.append(overlay);
}
```

- [ ] **Step 3: Use it in `assets/js/backrooms/main.js`**

Add `import { showWinScreen } from './winscreen.js';` to the imports, and replace the placeholder `onWin` with:

```js
function onWin() {
  showWinScreen(game, config);
}
```

- [ ] **Step 4: Manual verification**

Play to the exit (`?seed=1`, navigate, click SAÍDA). Expected:
- A "VOCÊ ESCAPOU" screen with the win text and a drawn map: nodes for every room you visited, edges between visited neighbors, **spawn green** and **exit red**.
- The map reflects only visited rooms (don't visit the whole map — confirm unvisited rooms are absent).
- "voltar" returns to `/`.

- [ ] **Step 5: Stage for commit** (user commits)

```bash
git add assets/js/backrooms/winscreen.js assets/css/backrooms.css assets/js/backrooms/main.js
```

---

## Task 14: Polish + full playthrough verification

**Files:**
- Modify: `assets/css/backrooms.css` (remove the `.br-debug` rule; minor scene polish)
- Modify: any module as needed for issues found during the full playthrough.

**Interfaces:** none new.

- [ ] **Step 1: Remove the bootstrap debug style**

Delete the `.br-debug { ... }` rule from `assets/css/backrooms.css` (the debug placeholder is gone since Task 9).

- [ ] **Step 2: Run the full pure-core suite one more time**

Run: `node --test assets/js/backrooms/tests/`
Expected: PASS — all suites green.

- [ ] **Step 3: Full manual playthrough (win)**

Open `http://localhost:4004/backrooms.html` (no seed → random). Verify end-to-end:
- Intro plays/falls back → spawn room renders.
- Navigation feels coherent (back returns you; doors match available directions).
- Cues escalate as entities approach; a fast entity can corner you.
- Reaching + taking the exit shows the visited-map win screen → "voltar" → `/`.

- [ ] **Step 4: Full manual playthrough (lose)**

- Confirm a trap room, a catch, and a rigged prop each produce the right death dialog and redirect to `https://google.com`. (Temporarily bump `TRAP_ROOM_COUNT`/`RIGGED_PROP_CHANCE` to force them, then revert.)

- [ ] **Step 5: Map-size sanity (the configurable goal)**

Set `config.ROOM_COUNT = 10`, reload — verify a small map generates and is solvable. Set `ROOM_COUNT = 60`, reload — verify it still generates and performs fine. Revert to 25.

- [ ] **Step 6: Stage for commit** (user commits)

```bash
git add assets/css/backrooms.css
# plus any files touched while fixing playthrough issues
```

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:

| Spec requirement | Task(s) |
|---|---|
| Standalone page `backrooms.html`, CSS, module dir, `type="module"`, no build | 1, 8 |
| Not linked anywhere (out of scope) | — (intentionally untouched) |
| Engine/view split module layout | 1–13 (all modules) |
| Seedable RNG + `?seed=` debug | 1, 8 |
| Reciprocal-direction graph, no global grid | 2, 3 |
| Spanning-tree solvability + extra edges + degree caps | 3 |
| Spawn ≤3 doors, exit = farthest ≤3 doors, special exit door | 3, 9, 6 |
| Hazard model: trap rooms, rigged props, truthful/deceptive hints | 4, 6 |
| Invariant: deceptive hint never on true path | 4 (test) |
| Tick = click; player action → entities by speed → catch/trap/cue/win | 6, 7 |
| Entities: Hunter / Sprinter / Wanderer / Stalker via shared brain | 5 |
| First-person CSS scene; doors/props/hints; `resolveVisual` sprite seam | 8, 9 |
| Shared message component (cues + dialog w/ image) | 10 |
| Auto-start, intro video (skippable, fallback) | 12 |
| Win screen drawing the visited map; lose redirect; no restart | 11, 13 |
| TDD pure core w/ node+assert; manual view verification at :4004 | 1–7 (tests), 8–14 (manual) |
| Config tunables incl. `ROOM_COUNT`, URLs, intro keys | 1, 14 |

No gaps.

**2. Placeholder scan** — no "TBD/TODO/implement later" steps; every code step shows complete code; manual-verification steps give explicit open/click/observe instructions.

**3. Type consistency** — checked across tasks: `makeRng`, `randInt/pick/shuffle`, `DIRS/RECIPROCAL/DELTA`, `bfsDistances/shortestStep/shortestPath/neighborIds`, `makeRoom/connect/degree/canConnect/buildGraph/generateMap/placeContent/chooseEntitySpawns/layoutVisited`, `decide/stepEntities`, `createGame/tick`, `renderRoom/resolveVisual`, `showCue/showDialog`, `playIntro`, `showWinScreen` — names and signatures match between their producing task and every consumer. `GameState`/`Event`/`Action` shapes are used consistently by `game.js`, `main.js`, `render.js`, and `messages.js`.
