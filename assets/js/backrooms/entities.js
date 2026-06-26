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
