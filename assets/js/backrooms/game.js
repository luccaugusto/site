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
