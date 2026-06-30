# Backrooms point-and-click game — design

A small, procedurally-generated, point-and-click **backrooms** game that runs
entirely in the browser as a standalone page on `luccaaugusto.xyz`. You spawn in
a room, navigate a graph of rooms looking for the exit, read hints on the walls
(some helpful, some left by entities to bait you into traps), and avoid the
entities that hunt you. The **game tick is the click** — entities only move when
you do.

- **Win:** find and take the exit → a **win screen** showing the portion of the
  map you actually visited, with a button back to the homepage (`/`).
- **Lose:** caught by an entity *or* killed by a trap → redirect to
  `https://google.com`. Losing is terminal — **there is no restart**.

This document is the validated design (the *what* and *why*). The implementation
plan (the *how*, step by step) is a separate document.

---

## Scope

**In scope**

- A standalone page (`backrooms.html`) + its CSS + a folder of JS modules.
- Procedural generation of a small room graph (default 25 rooms, configurable).
- First-person, CSS-rendered room scenes; click doors to move, click props to
  interact.
- Hints on walls (truthful and deceptive), traps, and four entity behaviors.
- A shared message/dialog component for sensory cues and transition dialog.
- A mood-setting **intro video** on page load, then auto-start; win screen
  (visited-map drawing); lose redirect.
- Headless unit tests for the pure game logic.

**Explicitly out of scope (for this plan)**

- **Linking the game from anywhere on the site** (homepage "Portais" panel or
  otherwise). The page exists but is not wired into navigation yet.
- A restart flow. Losing is terminal.
- Real sprite/art assets. The look is CSS-first; the rendering layer is written
  so a sprite can drop in later, but producing art is separate work. **The intro
  video file is the one exception** — it is a required asset; until it exists the
  game falls back to a black screen for the same duration (see *Screens*).
- In-game **sound**. The moment-to-moment cues are textual ("footsteps, close"),
  not audio. (The intro video may carry its own audio; other audio may be added
  later — the cue component is the seam for it.)
- Persistence, scoring, leaderboards, multiplayer.

---

## Page & integration

- New full-viewport page **`backrooms.html`** with its own
  **`assets/css/backrooms.css`**, loading **`assets/js/backrooms/main.js`** as
  `<script type="module">`. Native ES modules — **no build step / no bundler**,
  consistent with the site having none.
- Headings/overlays reuse the existing `Ethnocentric` heading font; the room
  scene is its own visual system.
- The page is reachable only by direct URL for now (not linked) — see Scope.

---

## Code structure — engine/view split

All modules live under **`assets/js/backrooms/`**. The **pure core** never
touches the DOM, so it can be unit-tested headlessly. The **view layer** owns all
DOM and click handling.

| File | Kind | Responsibility |
|------|------|----------------|
| `config.js` | data | All tunables (see *Configuration*). Single source of truth. |
| `rng.js` | pure | Seedable PRNG (e.g. mulberry32) → reproducible maps and deterministic tests. |
| `mapgen.js` | pure | Build the room graph from `(config, rng)` → `{ rooms, spawnId, exitId }`. Also exports `layoutVisited()` for the win screen. |
| `entities.js` | pure | Entity "brains": each archetype is a `decide(state, entity)` strategy; BFS pathing helpers; movement resolution. |
| `game.js` | pure | State model + `tick(state, action) → { state, events }`. The reducer. No DOM. |
| `content.js` | data | Prop / hint / entity / trap pools and pt-BR flavor text (truthful & deceptive hint templates, entity taunts, trap-death screens). |
| `messages.js` | DOM | Shared message component: `showCue()` (transient strip) + `showDialog({text, image?, onClose})` (modal). |
| `render.js` | DOM | Draw the first-person room scene; map clicks → actions; `resolveVisual()` asset abstraction. |
| `winscreen.js` | DOM | Render the visited-map drawing on win. |
| `intro.js` | DOM | Play the mood-setting intro video, then hand off to the game (skippable). |
| `main.js` | DOM | Controller: on page load run the intro, build the initial state (generated behind the video), render the spawn room, then own the click→tick→render loop and run redirects. |

Rationale: the game is far larger than any other page on the site (which are
each a single JS file). Splitting pure logic from rendering keeps every file
small and focused, and makes the generation/AI/win-lose logic testable without a
browser.

---

## Map model & generation

### Room model

```
Room {
  id,
  doors:   { ahead?, back?, left?, right? } → roomId   // only existing doors present
  props:   [ Prop, ... ]
  hint?:   Hint
  trap?:   Trap          // a room-level hazard (entering loses)
  visited: bool
}
```

### Directions are reciprocal

Edges are labeled with **reciprocal** directions: `ahead ↔ back`,
`left ↔ right`. Connecting room A → B via direction *d* also sets B's door in
`reciprocal(d)` back to A. There are **no global grid coordinates** — only this
*local* consistency, which is enough to make the four-direction framing feel
coherent (go *ahead*, then *back*, and you return) without forcing an arbitrary
graph onto a grid.

### Generation algorithm

Given `(config, rng)`:

1. **Spanning tree.** Build a connected tree over `ROOM_COUNT` rooms. Each new
   room attaches to a random existing room via a free direction slot on **both**
   ends, respecting `MAX_DEGREE`. A spanning tree guarantees the graph is
   connected and therefore **solvable**.
2. **Extra edges.** Add a few loop/dead-end edges where free slots allow, up to
   `EXTRA_EDGE_RATIO`, to create meaningful choices and dead ends.
3. **Spawn & exit.** `spawn` = a node with ≤ `SPAWN_MAX_DOORS` (3) doors. `exit`
   = the node farthest from spawn by BFS, with ≤ `EXIT_MAX_DOORS` (3) doors — one
   slot is reserved for the special winning **exit door**.
4. **Traps.** Place `TRAP_ROOM_COUNT` trap rooms in off-path / dead-end rooms;
   mark some props rigged (`RIGGED_PROP_CHANCE`). Attach hints: **deceptive**
   hints point toward trap regions; **truthful** hints lie along the true path.
5. **Props.** Scatter `PROPS_PER_ROOM` (a range) props per room from the pool.
6. **Entities.** Place entities away from spawn and its neighbors; the Stalker
   starts near a trap region.

**Invariants** (asserted in tests):

- The graph is connected and a spawn→exit path exists.
- Every door is reciprocal; no room exceeds `MAX_DEGREE`; spawn/exit respect
  their door caps.
- **A deceptive hint never sits on a door that lies on the true spawn→exit
  path** (so following only truthful reasoning is always survivable).

---

## Hints & traps — one hazard model

A **trap** is modeled as *a trigger* + *an outcome*, not three separate systems:

- **Trigger:** `enter-room` (a trap room) or `click-prop` (a rigged prop).
- **Outcome:** lose, presented via the shared dialog component as a death
  message with an optional image, then the lose redirect.

**Hints** are just references to a door or prop, flagged truthful or deceptive:

- Truthful hints nudge toward the real exit path.
- Deceptive hints (the Stalker's lies) nudge toward a trap room / rigged prop.
- They look identical except for a subtle, configurable tell (e.g. color or
  "handwriting"); the player distinguishes them by reasoning and cues, not by an
  obvious label.

---

## The tick (= one player click)

A click resolves to one **action**: `MOVE(dir)`, `INTERACT(propId)`, or `EXIT`
(clicking the exit door in the exit room). `game.tick(state, action)` returns a
new state and an ordered **events** list for the view to render. Sequence:

1. **Resolve player action.**
   - `MOVE` → change current room, mark visited. Entering a **trap room** →
     lose.
   - `INTERACT` → a **rigged prop** loses; otherwise reveal a hint / flavor text.
   - `EXIT` → **win**.
2. **Advance entities** (only if still playing). Each entity moves by its
   **speed `S`**: `S` sub-steps of its brain's `decide()`. The Sprinter emits a
   loud cue the tick *before* it closes distance.
3. **Catch check.** Any entity ending in — or swapping through — the player's
   room → lose.
4. **Cues.** For each entity, compute graph distance to the player and emit a cue
   (e.g. "footsteps, close" / "a wet dragging, far" / silence), louder as it
   nears.
5. **Status.** `won` → win screen; `lost` → death dialog → lose redirect;
   else render the new room + cues.

Ordering note: the player always moves first, then entities; "caught" means an
entity lands on the player's room (or crosses through it) after the player's
move.

---

## Entities — shared "brain" interface

Each archetype implements a common interface so adding more later is trivial:
`decide(state, entity) → targetRoomId | null`, plus a declared `speed`.

| Archetype | Speed | Behavior |
|-----------|-------|----------|
| **Hunter** | 1 | Paths toward the player along the graph (BFS shortest path). Relentless, predictable. Strong cue as it nears. |
| **Sprinter** | 2–3 | Moves fast toward the player but **telegraphs hard** — a loud cue one tick before it closes, giving one chance to break line. |
| **Wanderer** | 1 | Random walk; not actively hunting. Caught only if you share its room. Ambient unpredictability. |
| **Stalker** | 1 | Leaves the **deceptive** wall hints; lurks near trap regions and may reposition to a room ahead of you to ambush; otherwise hangs back. The "mind-game" entity. |

The roster, per-type counts, and speeds are configured in `config.js`.

---

## Rendering — CSS-first first-person scene

`render.js` draws the current room as a faux-3D first-person view, entirely in
CSS by default:

- **Scene:** CSS `perspective`; floor and ceiling gradient planes (`rotateX`);
  back and side walls papered with the iconic **yellow backrooms wallpaper**
  (`repeating-linear-gradient`); fluorescent-buzz feel via filter/shadow.
- **Doorways:** dark trapezoid divs — *ahead* center (on the back wall),
  *left* / *right* on the side walls, *back* = a "turn around" control. Only
  doors that exist for the room are rendered. Clicking a doorway → `MOVE`.
- **Props:** absolutely positioned in the scene, rendered as emoji / CSS shapes
  by default. Clicking → `INTERACT`.
- **Hints:** text painted on a wall (graffiti style, slight rotation).
- **Entity:** its sprite/CSS shape appears on catch or a glimpse, with a brief
  "scare" beat before the lose dialog.
- **Asset abstraction:** `resolveVisual(def)` returns a CSS class *or* an
  `<img>`. Registering a sprite for any wall / prop / entity swaps it in with no
  other changes — the same seam the `gram` page uses with its TEST-DATA block.

---

## Messages / dialog component (shared)

`messages.js` is one component with two modes, reused everywhere (cues, taunts,
trap deaths, win/lose, title):

- `showCue(text, intensity)` — transient, **non-blocking** strip; stacks and
  auto-fades. Used for sensory cues and short transition narration.
- `showDialog({ text, image?, onClose })` — **modal** overlay for entity taunts
  and trap-death screens (with image). Styled in the synthwave/zine aesthetic.

---

## Screens

The non-gameplay screens are the **intro** (on load) and the **win** screen.
There is no title menu and no restart.

- **Intro / loading** (`intro.js`): on page load a full-screen **mood-setting
  video** plays. The map is **generated behind it** (generation is near-instant,
  so the video is the pacing, not a real load wait). The video plays once;
  when it ends — or when the player clicks to **skip** — it fades out and the
  spawn room renders. The game **auto-starts** straight from the intro: no menu,
  no "press start". If the video asset is missing/unplayable, fall back to a
  black screen held for `INTRO_FALLBACK_MS`, then start.
- **Win screen** (`winscreen.js`): draws the **portion of the map the player
  visited** as a hand-scrawled escape map.
  - `mapgen.layoutVisited(rooms, visitedSet, spawnId)` (pure) assigns grid
    coordinates to visited rooms by accumulating direction deltas from spawn
    (`ahead = +y`, `back = −y`, `left = −x`, `right = +x`).
  - Coordinate collisions (a room reachable two ways) render with a small offset
    — which reads as hand-drawn and suits the zine look.
  - Rendered as a node-link diagram: visited rooms as nodes, traversed doors as
    connecting lines, spawn and exit marked. A button returns to `/`.
- **Lose:** death dialog (entity taunt or trap message + optional image) →
  redirect to `https://google.com`.

---

## Testing & verification

- **TDD on the pure core** with **node + the built-in `assert` module** (no test
  framework — the site has none). Coverage:
  - `mapgen`: graph connected & spawn→exit solvable; degree/reciprocal
    invariants; deceptive-hint-never-on-true-path invariant; `layoutVisited`
    coordinate math.
  - `entities`: BFS pathing correctness; per-archetype `decide()` behavior; speed
    (sub-step) handling.
  - `game.tick`: move / interact / catch / trap-room / exit resolution; event
    ordering; cue distance thresholds.
- **View layer** (`render`, `messages`, `winscreen`, `main`) is verified
  **manually in the Docker container** at `http://localhost:4004`, per site
  convention (no automated DOM tests).
- **Determinism:** the seeded RNG enables reproducible test maps and a debug
  `?seed=` query param for manual repro.

---

## Configuration (`config.js`)

A single object of tunables so map size and difficulty are easy to experiment
with:

| Key | Default | Meaning |
|-----|---------|---------|
| `ROOM_COUNT` | 25 | Number of rooms in the graph. |
| `MAX_DEGREE` | 4 | Max doors per room. |
| `SPAWN_MAX_DOORS` | 3 | Spawn has no "back". |
| `EXIT_MAX_DOORS` | 3 | One slot reserved for the exit door. |
| `EXTRA_EDGE_RATIO` | 0.15 | Extra edges beyond the spanning tree, as a fraction of `ROOM_COUNT` (≈4 loops/dead-ends at 25 rooms). |
| `entities` | `[{Hunter,1,1}, {Sprinter,1,2}, {Wanderer,1,1}, {Stalker,1,1}]` | Roster as `{type, count, speed}`. Sprinter defaults to speed 2 (bump to 3 to harden). |
| `TRAP_ROOM_COUNT` | 3 | Number of trap rooms. |
| `RIGGED_PROP_CHANCE` | 0.15 | Probability a placed prop is rigged (lose-on-click). |
| `DECEPTIVE_HINT_RATIO` | 0.4 | Share of hints that are deceptive. |
| `PROPS_PER_ROOM` | `[0, 3]` | Inclusive range of props placed per room. |
| `CUE_THRESHOLDS` | `{close:1, near:2, far:3}` | Graph-distance bands → cue intensity text (≥`far` or unreachable = silence). |
| `INTRO_VIDEO` | `assets/backrooms/intro.<mp4/webm>` | Mood-setting intro video path. |
| `INTRO_SKIPPABLE` | `true` | Click during the intro to skip to the game. |
| `INTRO_FALLBACK_MS` | 4000 | Black-screen hold if the video is missing/unplayable. |
| `WIN_URL` | `/` | Win-screen "return" target. |
| `LOSE_URL` | `https://google.com` | Lose redirect. |
| `SEED` | optional | Fixed seed (else seeded from time / `?seed=`). |

---

## Open questions

None outstanding. Defaults above (route `backrooms.html`, no linking, intro
video on load → auto-start, no restart, win screen with visited map) reflect the
decisions made during design.
